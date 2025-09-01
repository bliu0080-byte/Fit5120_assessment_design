/**
 * Filter Controller Component (updated)
 * 驱动 AlertManager 的过滤；不直接隐藏 DOM
 */

class FilterController {
    constructor(alertManager) {
        this.am = alertManager;
        this.config = (window.SCAMSAFE_CONFIG || window.CONFIG || {});
        this.utils  = (window.ScamSafeUtils || window.Utils || null);

        // 归一化：'SMS Fraud' -> 'sms-fraud'
        this.normalize = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, '-');

        this.active = 'all';
        this.history = [];

        this.bindElements();
        this.attach();
        this.restoreFromStorage();
        this.updateFilterCount();

        // 数据刷新后，更新计数
        document.addEventListener('alertsLoaded', () => this.updateFilterCount());
    }

    /* ---------- 元素绑定（有 utils 用 utils，没 utils 用原生） ---------- */
    q(sel, root=document){ return (this.utils?.dom?.select?.(sel) ?? root.querySelector(sel)); }
    qa(sel, root=document){ return Array.from(this.utils?.dom?.selectAll?.(sel) ?? root.querySelectorAll(sel)); }
    on(el, ev, cb){ (this.utils?.dom?.on ? this.utils.dom.on(el, ev, cb) : el.addEventListener(ev, cb)); }
    toggleClass(el, c, v){ el.classList.toggle(c, !!v); }

    bindElements() {
        this.$tabs = this.qa('.filter-tab');
        this.$container = this.q('#filter-tabs') || document;
        // 统一用你现在的栅格容器 id
        this.$grid = this.q('#news-grid');

        if (!this.$tabs.length) {
            console.warn('FilterController: No .filter-tab found');
        }
    }

    /* ---------- 事件与初始化 ---------- */
    attach() {
        // 初始 active
        const first = this.$tabs.find(b => b.classList.contains('active')) || this.$tabs[0];
        if (first) {
            this.setActive(first);
            this.apply(first.dataset.filter || 'all', false);
        }

        // 点击
        this.$tabs.forEach(btn => {
            this.on(btn, 'click', (e) => {
                e.preventDefault();
                this.setActive(btn);
                this.apply(btn.dataset.filter || 'all', true);
            });
        });

        // 键盘导航
        this.$tabs.forEach((tab, idx) => {
            tab.setAttribute('tabindex', idx === 0 ? '0' : '-1');
            tab.setAttribute('role', 'tab');
            this.on(tab, 'keydown', (ev) => {
                let t = idx;
                if (ev.key === 'ArrowLeft') { ev.preventDefault(); t = idx > 0 ? idx - 1 : this.$tabs.length - 1; }
                if (ev.key === 'ArrowRight'){ ev.preventDefault(); t = idx < this.$tabs.length - 1 ? idx + 1 : 0; }
                if (ev.key === 'Home')     { ev.preventDefault(); t = 0; }
                if (ev.key === 'End')      { ev.preventDefault(); t = this.$tabs.length - 1; }
                if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); tab.click(); return; }
                if (t !== idx) { this.$tabs.forEach((b,i)=>b.setAttribute('tabindex', i===t?'0':'-1')); this.$tabs[t].focus(); }
            });
        });

        // 快捷键 Alt+数字
        this.on(document, 'keydown', (ev) => {
            if (!ev.altKey) return;
            const map = { '1':'all','2':'sms','3':'phone','4':'email','5':'investment' };
            const want = map[ev.key];
            if (!want) return;
            ev.preventDefault();
            const btn = this.$tabs.find(b => this.normalize(b.dataset.filter) === want);
            if (btn) btn.click();
        });
    }

    restoreFromStorage() {
        const enabled = !!this.config?.features?.filterPersistence;
        const key = this.config?.storage?.selectedFilter;
        if (!enabled || !key) return;
        try {
            const saved = (this.utils?.storage?.get?.(key, 'all')) ?? 'all';
            const btn = this.$tabs.find(b => this.normalize(b.dataset.filter) === this.normalize(saved));
            if (btn) { this.setActive(btn); this.apply(saved, false); }
        } catch {}
    }

    /* ---------- 行为 ---------- */
    setActive(btn) {
        this.$tabs.forEach(b => b.classList.remove('active'));
        btn?.classList.add('active');
    }

    apply(filterValue, saveToStorage) {
        const slug = this.normalize(filterValue || 'all');
        if (this.active !== slug) {
            this.history.push(this.active);
            if (this.history.length > 10) this.history.shift();
        }
        this.active = slug;

        // 调用 AlertManager 的过滤 + 重渲染（核心）
        if (this.am?.setFilter) {
            this.am.setFilter(slug);
        } else {
            console.warn('FilterController: AlertManager.setFilter unavailable');
        }

        // 更新计数/禁用
        this.updateFilterCount();

        // 可选：保存
        if (saveToStorage && this.config?.features?.filterPersistence && this.config?.storage?.selectedFilter) {
            try { (this.utils?.storage?.set ?? ((k,v)=>localStorage.setItem(k,v)))(this.config.storage.selectedFilter, slug); } catch {}
        }

        // ARIA 状态
        this.$tabs.forEach(tab => {
            const isActive = this.normalize(tab.dataset.filter) === slug;
            tab.setAttribute('aria-pressed', isActive);
            tab.setAttribute('aria-selected', isActive);
        });

        // 可选：更新 URL hash
        if (slug === 'all') {
            if (location.hash) history.replaceState(null, '', location.pathname + location.search);
        } else {
            const h = `#filter=${slug}`;
            if (location.hash !== h) history.replaceState(null, '', h);
        }

        // 可选：宣告
        this.announce(`Filter changed to ${slug.replace(/-/g,' ')}`);
    }

    // 统计：基于 AlertManager.state.data，而不是查 DOM
    updateFilterCount() {
        if (!this.am?.state?.data) return;
        const data = this.am.state.data;

        // 聚合 category/type/tags
        const counts = {};
        data.forEach(item => {
            const buckets = []
                .concat(item.category ?? [])
                .concat(item.type ?? [])
                .concat(item.tags ?? []);
            const norms = buckets.flatMap(v => Array.isArray(v) ? v : [v]).map(this.normalize);
            norms.forEach(k => { counts[k] = (counts[k] || 0) + 1; });
        });
        counts.all = data.length;

        // 更新按钮徽标与禁用
        this.$tabs.forEach(tab => {
            const slug = this.normalize(tab.dataset.filter || 'all');
            const n = counts[slug] || 0;

            let badge = tab.querySelector('.filter-count');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'filter-count';
                tab.appendChild(badge);
            }
            badge.textContent = n;
            badge.style.display = n > 0 ? 'inline' : (slug==='all' ? 'inline' : 'none');

            tab.disabled = (slug !== 'all' && n === 0);
            this.toggleClass(tab, 'disabled', tab.disabled);
        });
    }

    announce(text){
        let live = document.getElementById('filter-announcement');
        if (!live) {
            live = document.createElement('div');
            live.id = 'filter-announcement';
            live.setAttribute('aria-live','polite');
            live.className = 'sr-only';
            document.body.appendChild(live);
        }
        live.textContent = text;
        setTimeout(()=>{ live.textContent=''; }, 800);
    }

    destroy(){
        // 简化：此处不做事件解绑（页面关闭即可释放）
    }
}

/* 关键：挂到全局，确保 main.js 能实例化 */
window.FilterController = window.FilterController || FilterController;