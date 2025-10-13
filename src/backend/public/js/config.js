// js/components/alertManager.js
class AlertManager {
    constructor() {
        const cfg = window.SCAMSAFE_CONFIG || window.CONFIG || {};

        // === Backend API selection (backend only, no local touting) ===
        // If the frontend is deployed in Render, same service: directly same source '/api'.
        // If the frontend is in GitHub Pages: change the RENDER_API below to your backend's domain name.
        const RENDER_API = 'https://scamsafe.onrender.com/api';

        if (location.hostname.endsWith('onrender.com')) {
            this.api = '/api';
        } else if (location.hostname.endsWith('github.io')) {
            this.api = RENDER_API;
        } else {
            // local development
            this.api = (cfg.apiBackend && cfg.apiBackend.baseUrl) || `http://${location.hostname}:3001/api`;
        }

        this.state = {
            loading: false,
            data: [],
            page: 1,
            pageSize: 5,
            activeFilter: 'all'
        };

        this.$grid  = document.getElementById('news-grid');
        this.$pager = document.getElementById('news-pager');
        this.$prev  = document.getElementById('prev-page');
        this.$next  = document.getElementById('next-page');
        this.$info  = document.getElementById('page-info');

        this.$prev?.addEventListener('click', () => this.toPage(this.state.page - 1));
        this.$next?.addEventListener('click', () => this.toPage(this.state.page + 1));

        console.log('[AlertManager] API =', this.api);
    }

    // ============== Request back-end only ==============
    async loadAlerts() {
        this.state.loading = true;
        try {
            const res = await fetch(`${this.api}/news`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { items = [] } = await res.json();

            this.state.data = Array.isArray(items) ? items : [];
            this.state.page = 1;
            this.renderPage();

            document.dispatchEvent(new CustomEvent('alertsLoaded', {
                detail: { count: this.state.data.length, ts: Date.now() }
            }));
        } catch (err) {
            console.error('[AlertManager] Failed to fetch /api/news:', err);
            this.renderError(
                'Failed to load news from the backend. Please check the API URL/CORS and try again.'
            );
        } finally {
            this.state.loading = false;
        }
    }

    // ============== filtration ==============
    normalize(v) {
        return String(v || '').trim().toLowerCase().replace(/\s+/g, '-');
    }

    setFilter(val) {
        const next = this.normalize(val || 'all');
        if (this.state.activeFilter !== next) {
            this.state.activeFilter = next;
            this.state.page = 1;
            this.renderPage();
        }
    }

    getFilteredData() {
        const { data, activeFilter } = this.state;
        if (!data.length) return [];
        if (activeFilter === 'all') return data;

        return data.filter(item => {
            const buckets = []
                .concat(item.category ?? [])
                .concat(item.type ?? [])
                .concat(item.tags ?? []);
            const norms = buckets.flat().map(v => this.normalize(v));
            return norms.includes(activeFilter);
        });
    }

    // ============== subdivision ==============
    pageCount() {
        const total = this.getFilteredData().length;
        return Math.max(1, Math.ceil(total / this.state.pageSize));
    }

    toPage(n) {
        const max = this.pageCount();
        this.state.page = Math.min(Math.max(1, n), max);
        this.renderPage();
    }

    // ============== add washes of ink or colour to a drawing (Chinese painting) ==============
    renderError(msg) {
        if (!this.$grid) return;
        this.$grid.innerHTML = `
      <div class="alert error" style="padding:16px;border-radius:12px;background:#fee2e2;color:#991b1b;">
        ${msg}<br>
        <small>API tried: <code>${this.api}/news</code></small>
      </div>
    `;
        if (this.$pager) this.$pager.hidden = true;
    }

    renderPage() {
        if (!this.$grid) return;

        const { page, pageSize } = this.state;
        const list = this.getFilteredData();
        const start = (page - 1) * pageSize;
        const slice = list.slice(start, start + pageSize);

        this.$grid.innerHTML = '';

        const slots = ['feature', 'tall', 'standard', 'standard', 'wide'];
        slice.forEach((item, i) => {
            const slot = slots[i] || 'standard';
            const card = this.buildCard(item, slot, i);
            this.$grid.appendChild(card);
        });

        const totalPages = this.pageCount();
        if (this.$pager) {
            this.$pager.hidden = totalPages <= 1;
            if (this.$info) this.$info.textContent = `${page} / ${totalPages}`;
            if (this.$prev) this.$prev.disabled = page <= 1;
            if (this.$next) this.$next.disabled = page >= totalPages;
        }
    }

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

        const img = hasImg
            ? `<div class="news-media" data-ar="16/9">
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
            if (slot === 'standard' && idx === 2) card.classList.add('std-1');
            if (slot === 'standard' && idx === 3) card.classList.add('std-2');
        }

        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            const id = encodeURIComponent(item.id ?? '');
            if (id) location.href = `news.html?id=${id}`;
        });

        return card;
    }

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

// Export to window
window.AlertManager = window.AlertManager || AlertManager;