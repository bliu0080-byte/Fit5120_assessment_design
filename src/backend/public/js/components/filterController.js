/**
 * Filter Controller Component (updated)
 * Driving AlertManager's filtering; not directly hiding the DOM
 */

class FilterController {
    constructor(alertManager) {
        this.am = alertManager;
        this.config = (window.SCAMSAFE_CONFIG || window.CONFIG || {});
        this.utils  = (window.ScamSafeUtils || window.Utils || null);


        this.normalize = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, '-');

        this.active = 'all';
        this.history = [];

        this.bindElements();
        this.attach();
        this.restoreFromStorage();
        this.updateFilterCount();

        // Update count after data refresh
        document.addEventListener('alertsLoaded', () => this.updateFilterCount());
    }

    /* ---------- Element binding (utils if you have utils, native if you don't) ---------- */
    q(sel, root=document){ return (this.utils?.dom?.select?.(sel) ?? root.querySelector(sel)); }
    qa(sel, root=document){ return Array.from(this.utils?.dom?.selectAll?.(sel) ?? root.querySelectorAll(sel)); }
    on(el, ev, cb){ (this.utils?.dom?.on ? this.utils.dom.on(el, ev, cb) : el.addEventListener(ev, cb)); }
    toggleClass(el, c, v){ el.classList.toggle(c, !!v); }

    bindElements() {
        this.$tabs = this.qa('.filter-tab');
        this.$container = this.q('#filter-tabs') || document;
        // Uniformly use your current raster container ids
        this.$grid = this.q('#news-grid');

        if (!this.$tabs.length) {
            console.warn('FilterController: No .filter-tab found');
        }
    }

    /* ---------- Events and Initialization ---------- */
    attach() {
        // starting (point) active
        const first = this.$tabs.find(b => b.classList.contains('active')) || this.$tabs[0];
        if (first) {
            this.setActive(first);
            this.apply(first.dataset.filter || 'all', false);
        }

        // strike (on the keyboard)
        this.$tabs.forEach(btn => {
            this.on(btn, 'click', (e) => {
                e.preventDefault();
                this.setActive(btn);
                this.apply(btn.dataset.filter || 'all', true);
            });
        });

        // Keyboard Navigation
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

        // Shortcut Alt+Number
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

    /* ---------- gestion ---------- */
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

        // Call AlertManager's filtering + re-rendering (core)
        if (this.am?.setFilter) {
            this.am.setFilter(slug);
        } else {
            console.warn('FilterController: AlertManager.setFilter unavailable');
        }

        // Update Count/Disable
        this.updateFilterCount();

        // Optional: Save
        if (saveToStorage && this.config?.features?.filterPersistence && this.config?.storage?.selectedFilter) {
            try { (this.utils?.storage?.set ?? ((k,v)=>localStorage.setItem(k,v)))(this.config.storage.selectedFilter, slug); } catch {}
        }

        // ARIA state of affairs
        this.$tabs.forEach(tab => {
            const isActive = this.normalize(tab.dataset.filter) === slug;
            tab.setAttribute('aria-pressed', isActive);
            tab.setAttribute('aria-selected', isActive);
        });


        if (slug === 'all') {
            if (location.hash) history.replaceState(null, '', location.pathname + location.search);
        } else {
            const h = `#filter=${slug}`;
            if (location.hash !== h) history.replaceState(null, '', h);
        }


        this.announce(`Filter changed to ${slug.replace(/-/g,' ')}`);
    }

    // Statistics: based on AlertManager.state.data
    updateFilterCount() {
        if (!this.am?.state?.data) return;
        const data = this.am.state.data;

        // polymerization category/type/tags
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

        // Update Button Logo and Disable
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
        // Simplified: no event unbinding here (page closure releases it)
    }
}

/* Key: hook to global, ensure main.js can be instantiated */
window.FilterController = window.FilterController || FilterController;