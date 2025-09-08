// js/news-ticker.js
(function () {
    // A) 优先复用你项目中已拉取的数据（AlertManager）
    function getFromAlertManager() {
        const am = window.alertManager || window.AlertManagerInstance;
        if (!am) return null;
        try {
            if (Array.isArray(am.state?.data) && am.state.data.length) return am.state.data;
            if (typeof am.getAlerts === 'function') return am.getAlerts();
        } catch (e) {
        }
        return null;
    }

    // B) 兜底：直接走你后端 API（路径来自全局配置，与你原逻辑一致）
    async function fetchFromAPI() {
        const url = (window.SCAMSAFE_CONFIG?.api?.news) || '/api/news?limit=20';
        const res = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), {
            headers: {'Cache-Control': 'no-cache'}
        });
        if (!res.ok) throw new Error('News API error: ' + res.status);
        return await res.json();
    }

    // C) 统一映射：把后端字段名 → 滚动卡片字段（保持可读性，不改后端）
    function normalizeItems(raw) {
        const arr = (raw?.items || raw?.data || raw) || [];
        return arr.map(x => ({
            id: x.id || x._id || '',
            title: x.title || '',
            description: x.description || '',   // ✅ 使用后端“简介”
            image: x.image || '',               // ✅ 使用后端“图片”
            url: x.url || x.link || '',         // 可选：后端若有外链
            category: x.category || x.type || 'ALERT',
            urgent: Boolean(x.urgent || x.priority === 'high' || x.is_urgent),
            date: x.relativeTime || x.publishedAt || x.createdAt || x.date || '',
            amount: x.amount || x.loss || ''
        })).filter(it => it.title);
    }

    // D) 生成卡片
    function itemHTML(n){
        const imgHtml = n.image ? `
    <div class="sc-thumb-wrap" aria-hidden="true">
      <img class="sc-thumb" src="${n.image}" alt="" loading="lazy"
           onerror="this.closest('.sc-item')?.classList.add('no-thumb'); this.remove();">
    </div>` : '';

        return `
    <article class="sc-item ${n.image ? '' : 'no-thumb'}" role="link" tabindex="0"
             data-id="${n.id || ''}" data-url="${n.url || ''}">
      ${imgHtml}
      <div class="sc-content">
        <span class="sc-cat ${n.urgent ? 'sc-cat--urgent' : ''}">${n.category}</span>
        <h3 class="sc-title">${n.title}</h3>
        <p class="sc-desc">${n.description || ''}</p>
        <div class="sc-meta">
          <span>⏰ ${n.date}</span>
          <span class="sc-loss">${n.amount || ''}</span>
        </div>
      </div>
    </article>
  `;
    }

    // E) 渲染 + 无缝循环（复制一份列表）
    function render(listEl, items) {
        const html = [...items, ...items].map(itemHTML).join('');
        listEl.innerHTML = html;

        // 条目越多滚动越久，避免过快
        const perItemSec = 4.5;
        const duration = Math.max(30, Math.round(items.length * perItemSec));
        listEl.style.animationDuration = `${duration}s`;
    }

    async function init() {
        const listEl = document.getElementById('news-ticker-list');
        if (!listEl) return;

        // 1) 先拿你现有的前端缓存/状态
        let items = normalizeItems(getFromAlertManager());

        // 2) 如果还没有就打后端（与原来一样从后端获取）
        if (!items || !items.length) {
            try {
                const data = await fetchFromAPI();
                items = normalizeItems(data);
            } catch (e) {
                console.warn('news ticker API error:', e);
                items = [{
                    category: 'SYSTEM', title: 'No live news available', content: 'Backend returned no items.',
                    date: new Date().toLocaleString(), amount: ''
                }];
            }
        }
        render(listEl, items);

        // 3) 每 60s 轻量刷新（删除/新增能及时体现在前端）
        setInterval(async () => {
            try {
                const preferAM = normalizeItems(getFromAlertManager());
                if (preferAM && preferAM.length) return render(listEl, preferAM);

                const data = await fetchFromAPI();
                const fresh = normalizeItems(data);
                if (fresh && fresh.length) render(listEl, fresh);
            } catch (e) {
            }
        }, 60000);

        // 4) 点击卡片打开详情（如果后端有 url）
        document.getElementById('news-ticker').addEventListener('click', e=>{
            const card = e.target.closest('.sc-item');
            if(!card) return;
            const url = card.dataset.url && card.dataset.url.trim();
            const id  = card.dataset.id && card.dataset.id.trim();

            if (url) {
                window.open(url, '_blank', 'noopener');   // ✅ 后端给了外链就开外链
            } else if (id) {
                location.href = `news.html?id=${encodeURIComponent(id)}`; // ✅ 沿用你原站内详情
            }
        });
    }

    // DOM 就绪即跑；若你有 “alertsLoaded” 事件，这里也监听一次
    if (document.readyState !== 'loading') init();
    else document.addEventListener('DOMContentLoaded', init);
    document.addEventListener('alertsLoaded', init, {once: true});
})();