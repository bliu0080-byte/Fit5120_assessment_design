// js/news-ticker.js
(function () {
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

    // B) Under the hood: go directly to your backend API (the path comes from the global configuration and is consistent with your original logic)
    async function fetchFromAPI() {
        const url = (window.SCAMSAFE_CONFIG?.api?.news) || '/api/news?limit=20';
        const res = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), {
            headers: {'Cache-Control': 'no-cache'}
        });
        if (!res.ok) throw new Error('News API error: ' + res.status);
        return await res.json();
    }

    // C) Unified mapping: put backend field names → roll card fields (keep readability, don't change backend)
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

    // D) Generating Cards
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
      </div>
    </article>
  `;
    }

    // E) Rendering + seamless looping (copying a list)
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

        // 4) Click on the card to open the details (if there is a url on the back end)
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

    if (document.readyState !== 'loading') init();
    else document.addEventListener('DOMContentLoaded', init);
    document.addEventListener('alertsLoaded', init, {once: true});
})();