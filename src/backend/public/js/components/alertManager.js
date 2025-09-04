class AlertManager {
    constructor() {
        const cfg = window.SCAMSAFE_CONFIG || window.CONFIG || {};
        this.api = (cfg.apiBackend && cfg.apiBackend.baseUrl) || `http://${location.hostname}:3001/api`;

        // Status: activeFilter added
        this.state = {
            loading: false,
            data: [],
            page: 1,
            pageSize: 5,     // Fixed 5 items per page
            activeFilter: 'all'
        };

        // paging element
        this.$grid  = document.getElementById('news-grid');
        this.$pager = document.getElementById('news-pager');
        this.$prev  = document.getElementById('prev-page');
        this.$next  = document.getElementById('next-page');
        this.$info  = document.getElementById('page-info');

        // event
        this.$prev?.addEventListener('click', () => this.toPage(this.state.page - 1));
        this.$next?.addEventListener('click', () => this.toPage(this.state.page + 1));
    }

    /* ========== Data loading ========== */
    async loadAlerts() {
        this.state.loading = true;
        try {
            const res = await fetch(`${this.api}/news`, { cache: 'no-store' });
            const { items = [] } = await res.json();
            this.state.data = items || [];
            this.state.page = 1;
            this.renderPage();

            document.dispatchEvent(new CustomEvent('alertsLoaded', {
                detail: { count: items.length, ts: Date.now() }
            }));
        } catch (e) {
            console.error('Failed to load alerts:', e);
        } finally {
            this.state.loading = false;
        }
    }

    /* ========== Filtration Related ========== */
    // Harmonized format: space removal/lowercase/space to hyphen (use this rule on both sides of the button and data)
    normalize(val) {
        return String(val || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-');
    }

    // Setting up filters (for FilterController to call)
    setFilter(val) {
        const next = this.normalize(val || 'all');
        if (this.state.activeFilter !== next) {
            this.state.activeFilter = next;
            this.state.page = 1; // Toggle filter to return to the first page
            this.renderPage();
        }
    }

    // Get filtered array (supports category/type/tags)
    getFilteredData() {
        const { data, activeFilter } = this.state;
        if (!Array.isArray(data) || !data.length) return [];
        if (activeFilter === 'all') return data;

        return data.filter(item => {
            const buckets = []
                .concat(item.category ?? [])
                .concat(item.type ?? [])
                .concat(item.tags ?? []);
            const norms = buckets
                .flatMap(v => Array.isArray(v) ? v : [v])
                .map(v => this.normalize(v));
            return norms.includes(activeFilter);
        });
    }

    /* ========== Get filtered array (supports category/type/tags) ========== */
    pageCount() {
        const { pageSize } = this.state;
        const total = this.getFilteredData().length;   // 基于过滤后的数据
        return Math.max(1, Math.ceil(total / pageSize));
    }

    toPage(n) {
        const max = this.pageCount();
        this.state.page = Math.min(Math.max(1, n), max);
        this.renderPage();
    }

    /* ========== rendering page ========== */
    renderPage() {
        if (!this.$grid) return;

        const { page, pageSize } = this.state;
        const all = this.getFilteredData();           // 使用过滤后的数据
        const start = (page - 1) * pageSize;
        const slice = all.slice(start, start + pageSize);

        this.$grid.innerHTML = '';


        const slots = ['feature', 'tall', 'standard', 'standard', 'wide'];

        slice.forEach((item, i) => {
            const slot = slots[i] || 'standard';
            const card = this.buildCard(item, slot, i);
            this.$grid.appendChild(card);
        });

        // conditional statement
        const totalPages = this.pageCount();
        if (this.$pager) {
            this.$pager.hidden = totalPages <= 1;
            if (this.$info) this.$info.textContent = `${page} / ${totalPages}`;
            if (this.$prev) this.$prev.disabled = page <= 1;
            if (this.$next) this.$next.disabled = page >= totalPages;
        }
    }

    /* ========== Building Cards ========== */
    buildCard(item, slot, idx) {
        const hasImg = Boolean(item.image && String(item.image).trim());
        const card = document.createElement('article');
        card.className = `news-card slot-${slot} ${hasImg ? '' : 'text-only'}`;
        card.dataset.type = item.type || item.category || 'general';

        const title = `<h3 class="news-title">${item.title || ''}</h3>`;
        const desc  = item.description ? `<p class="news-desc">${item.description}</p>` : '';
        const meta  = `
      <div class="news-meta">
        <span>${this.formatDate(item.timestamp)}</span>
        ${(item.category || item.type) ? `<span class="news-category">${item.category || item.type}</span>` : ''}
      </div>
    `;

        const ar = '16/9';
        const img = hasImg
            ? `<div class="news-media" data-ar="${ar}">
           <img class="news-img"
                src="${item.image}"
                loading="lazy"
                alt="${(item.title || '').replace(/"/g,'&quot;')}"
                onerror="this.closest('.news-card')?.classList.add('text-only'); this.remove();">
         </div>`
            : '';


        if (slot === 'feature' || slot === 'wide') {
            card.innerHTML = hasImg
                ? `${img}<div class="news-body">${title}${desc}${meta}</div>`
                : `<div class="news-body">${title}${desc}${meta}</div>`;
        } else {
            card.innerHTML = hasImg
                ? `${img}<div class="news-body">${title}${desc}${meta}</div>`
                : `<div class="news-body">${title}${desc}${meta}</div>`;

            if (slot === 'standard' && idx === 2) card.classList.add('std-1'); // 第二行第2列
            if (slot === 'standard' && idx === 3) card.classList.add('std-2'); // 第二行第3列
        }

        // Click on the whole card to jump
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            const id = encodeURIComponent(item.id ?? '');
            if (id) location.href = `news.html?id=${id}`;
        });

        return card;
    }

    /* ========== artifact ========== */
    formatDate(ts) {
        try {
            if (!ts) return '';
            const d = new Date(ts);
            if (Number.isNaN(+d)) return '';
            return d.toLocaleDateString();
        } catch {
            return '';
        }
    }
}

// Explicitly hook into the global
window.AlertManager = window.AlertManager || AlertManager;