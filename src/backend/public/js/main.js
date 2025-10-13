/**
 * Main Application Controller (Unified)
 * ScamSafe - Application initialization and component orchestration
 */

class ScamSafeApp {
    constructor() {
        // Configuration and tool peddling
        this.config = (window.SCAMSAFE_CONFIG || window.CONFIG || {
            app: { name: 'ScamSafe', version: 'dev' },
            analytics: { enabled: false },
            features: {}
        });
        this.utils = window.ScamSafeUtils || window.Utils || {
            // Minimalist DOM/tools under the hood to avoid errors caused by unloaded third-party tools
            dom: {
                select: (s, r = document) => r.querySelector(s),
                selectAll: (s, r = document) => Array.from(r.querySelectorAll(s)),
                on: (el, ev, fn, opts) => el && el.addEventListener && el.addEventListener(ev, fn, opts),
                create: (tag, props = {}, text = '') => {
                    const el = document.createElement(tag);
                    Object.assign(el, props);
                    if (text) el.textContent = text;
                    return el;
                },
            },
            debounce(fn, delay = 250) {
                let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), delay); };
            },
            date: { now: () => Date.now() }
        };

        // Components and State
        this.fontController = null;
        this.filterController = null;
        this.alertManager = null;

        this.isInitialized = false;
        this.components = new Map();
        this.eventListeners = new Map();

        this.init();
    }

    async init() {
        try {
            const appName = (this.config.app && this.config.app.name) || 'ScamSafe';
            const appVer  = (this.config.app && this.config.app.version) || 'dev';
            console.log(`${appName} v${appVer} - Initializing...`);

            if (!this.checkBrowserCompatibility()) {
                this.showBrowserCompatibilityWarning();
                return;
            }

            await this.initializeComponents();
            this.setupGlobalEventHandlers();
            this.setupNavigation();
            this.handleInitialHash();

            this.isInitialized = true;
            this.dispatchInitEvent();

            console.log(`${appName} - Initialization complete`);
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showInitializationError(error);
        }
    }

    checkBrowserCompatibility() {
        const required = ['fetch','Promise','localStorage','addEventListener','querySelector','classList'];
        return required.every((f) => {
            const ok = (f in window) || (f in document) || (f in document.documentElement);
            if (!ok) console.warn(`Browser missing required feature: ${f}`);
            return ok;
        });
    }

    async initializeComponents() {
        // ✅ Determine if Alerts UI is needed based on DOM (Home only)
        const hasAlertsUI = !!document.getElementById('news-grid');

        // 1)AlertManager (home page only)
        if (hasAlertsUI && window.AlertManager) {
            this.alertManager = new window.AlertManager();
            this.components.set('alertManager', this.alertManager);
            window.__alertManager = this.alertManager; // 方便调试
        } else if (hasAlertsUI && !window.AlertManager) {
            console.warn('AlertManager script not loaded but alerts UI is present.');
        }

        // 2) FilterController（
        const hasFilterTabs = !!document.getElementById('filter-tabs');
        if (hasAlertsUI && hasFilterTabs && window.FilterController && this.alertManager) {
            this.filterController = new window.FilterController(this.alertManager);
            this.components.set('filterController', this.filterController);
        } else if (hasFilterTabs && !window.FilterController) {
            console.warn('FilterController script not loaded.');
        }

        // 3) FontController
        if (window.scamSafeFontController) {
            this.fontController = window.scamSafeFontController;
        } else if (window.FontController) {
            this.fontController = new window.FontController();
        }
        if (this.fontController) {
            this.components.set('fontController', this.fontController);
        }

        // 4) Data loading
        if (this.alertManager) {
            if (typeof this.alertManager.init === 'function') {
                await this.alertManager.init();
            }
            if (typeof this.alertManager.refreshAlerts === 'function') {
                await this.alertManager.refreshAlerts(true);
            } else if (typeof this.alertManager.loadAlerts === 'function') {
                await this.alertManager.loadAlerts();
            }
            await this.waitForAlertsReady();
        }

        console.log('All components initialized successfully');
    }

    waitForAlertsReady() {
        if (!this.alertManager) return Promise.resolve(); // 非首页，直接返回
        return new Promise((resolve) => {
            if (this.alertManager?.isReady?.()) return resolve();
            const handler = () => { document.removeEventListener('alertsLoaded', handler); resolve(); };
            document.addEventListener('alertsLoaded', handler, { once: true });

            const poll = setInterval(() => {
                if (this.alertManager?.getStatistics?.()) {
                    clearInterval(poll);
                    resolve();
                }
            }, 150);
        });
    }

    setupGlobalEventHandlers() {
        // Data loading
        this.addEventListener('alertsLoaded', (e) => {
            console.log(`Loaded ${e.detail.count} alerts`);
            this.updateGlobalStats(e.detail);
        });
        this.addEventListener('filterChanged', (e) => {
            console.log(`Filter changed to: ${e.detail.filter}`);
            this.trackAnalyticsEvent('filter_used', { filter: e.detail.filter });
        });
        this.addEventListener('fontSizeChanged', (e) => {
            console.log(`Font size changed to: ${e.detail.name}`);
            this.trackAnalyticsEvent('font_changed', { size: e.detail.size });
        });
        this.addEventListener('alertAction', (e) => {
            console.log(`Alert action: ${e.detail.action.label} on ${e.detail.alert.id}`);
            this.handleAlertAction(e.detail.alert, e.detail.action);
        });

        // Page visibility and network state
        this.addEventListener('visibilitychange', () => {
            document.hidden ? this.handlePageHidden() : this.handlePageVisible();
        });
        this.addEventListener('online',  () => this.handleOnline());
        this.addEventListener('offline', () => this.handleOffline());

        // Resize（
        const onResize = this.utils.debounce(() => this.handleResize(), 250);
        this.addEventListener('resize', onResize, window);

        // global error
        this.addEventListener('error', (e) => this.handleGlobalError(e.error || e));
        this.addEventListener('unhandledrejection', (e) => {
            this.handleGlobalError(e.reason); e.preventDefault();
        }, window);
    }

    setupNavigation() {
        const navLinks = this.utils.dom.selectAll('.nav-link');
        navLinks.forEach((link) => {
            this.utils.dom.on(link, 'click', (ev) => {
                const href = link.getAttribute('href') || '';

                if (href.startsWith('#')) {
                    ev.preventDefault();
                    const id = href.slice(1);
                    this.navigateToSection(id);
                    this.updateActiveNavLink(link);
                }

            });
        });

        //Address bar hash change
        this.addEventListener('hashchange', () => this.handleHashChange(), window);

        // For all a[href^="#"] smooth scrolling
        this.utils.dom.selectAll('a[href^="#"]').forEach((a) => {
            this.utils.dom.on(a, 'click', (ev) => {
                ev.preventDefault();
                const target = document.querySelector(a.getAttribute('href'));
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    handleInitialHash() {
        const hash = window.location.hash;
        if (!hash) return;
        if (hash.includes('filter=')) {
            const filter = hash.split('filter=')[1];
            if (this.filterController?.isValidFilter?.(filter)) {
                setTimeout(() => this.filterController.setActiveFilter(filter), 500);
            }
        } else {
            this.navigateToSection(hash.replace('#', ''));
        }
    }

    handleHashChange() {
        const hash = window.location.hash;
        if (!hash) return;
        if (hash.includes('filter=')) {
            const filter = hash.split('filter=')[1];
            if (this.filterController?.isValidFilter?.(filter)) {
                this.filterController.setActiveFilter(filter);
            }
        } else {
            this.navigateToSection(hash.replace('#', ''));
        }
    }

    navigateToSection(section) {
        const el = this.utils.dom.select(`#${section}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    updateActiveNavLink(active) {
        this.utils.dom.selectAll('.nav-link').forEach(l => l.classList.remove('active'));
        active.classList.add('active');
    }

    handleAlertAction(alert, action) {
        switch (action.type) {
            case 'primary':   this.showAlertDetails(alert); break;
            case 'secondary': this.showAlertEducation(alert, action); break;
            default: console.log(`Unhandled action type: ${action.type}`);
        }
    }

    showAlertDetails(alert) {
        console.log('Showing details for alert:', alert?.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.showNotification(`Viewing details for: ${alert?.title || alert?.id}`, 'info');
    }

    showAlertEducation(alert, action) {
        console.log(`Showing ${action?.label} for alert:`, alert?.id);
        this.showNotification(`${action?.label} for ${alert?.type || 'unknown'} threats`, 'info');
    }

    updateGlobalStats() {

        const stats = this.alertManager?.getStatistics?.();
        if (!stats) return;
        // const nodes = this.utils.dom.selectAll('.stat-number');

    }

    handlePageVisible() {
        this.alertManager?.resumeAutoRefresh?.();
        this.alertManager?.updateTimestamps?.();
    }
    handlePageHidden()  { this.alertManager?.pauseAutoRefresh?.(); }

    handleOnline()  { this.showNotification('Connection restored', 'success'); this.alertManager?.refreshAlerts?.(true); }
    handleOffline() { this.showNotification('You are currently offline', 'warning'); }

    handleResize() {
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth <= 1024 && !isMobile;
        document.body.classList.toggle('mobile-layout', isMobile);
        document.body.classList.toggle('tablet-layout', isTablet);
    }

    handleGlobalError(error) {
        console.error('Global error:', error);
        this.trackAnalyticsEvent('error', {
            message: error?.message || String(error) || 'Unknown error',
            stack: error?.stack || 'No stack trace'
        });
        this.showNotification('An unexpected error occurred', 'error');
    }

    showNotification(message, type = 'info', duration = 5000) {
        const styles = { info: 'color: blue', success: 'color: green', warning: 'color: orange', error: 'color: red' };
        console.log(`%c${type.toUpperCase()}: ${message}`, styles[type] || '');

        const n = this.utils.dom.create('div', {
            className: `notification notification-${type}`,
            style: `
        position: fixed; top: 20px; right: 20px; padding: 12px 20px;
        background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 8px; color: var(--text-primary, #111); z-index: 9999;
        box-shadow: 0 6px 18px rgba(0,0,0,.08); animation: slideIn .3s ease-out;
      `
        }, message);
        document.body.appendChild(n);
        setTimeout(() => { n.style.animation = 'slideOut .3s ease-out'; setTimeout(() => n.remove(), 300); }, duration);
    }

    trackAnalyticsEvent(event, data = {}) {
        if (!this.config?.analytics?.enabled) return;
        console.log(`Analytics: ${event}`, data);
        // TODO: send to analytics endpoint
    }

    showBrowserCompatibilityWarning() {
        const w = this.utils.dom.create('div', {
            style: `
        position: fixed; top: 0; left: 0; right: 0; background: #dc2626; color: #fff;
        padding: 16px; text-align: center; z-index: 99999;
      `
        }, 'Browser may not support all features. Please update for the best experience.');
        document.body.insertBefore(w, document.body.firstChild);
    }

    showInitializationError() {
        const el = this.utils.dom.create('div', {
            style: `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: var(--card-bg, #fff); border: 1px solid var(--danger, #ef4444);
        border-radius: 12px; padding: 24px; max-width: 420px; text-align: center; z-index: 99999;
      `
        });
        el.innerHTML = `
      <div style="color: var(--danger, #ef4444); font-size: 40px; margin-bottom: 12px;">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <h3 style="margin-bottom: 10px;">Initialization Failed</h3>
      <p style="color:#6b7280; margin-bottom: 18px;">Please refresh the page to try again.</p>
      <button onclick="window.location.reload()" style="
        background: var(--secondary-blue, #3b82f6); color: #fff; border: none;
        padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 600;
      ">Refresh Page</button>`;
        document.body.appendChild(el);
    }

    dispatchInitEvent() {
        const event = new CustomEvent('appInitialized', {
            detail: {
                app: (this.config.app && this.config.app.name) || 'ScamSafe',
                version: (this.config.app && this.config.app.version) || 'dev',
                components: Array.from(this.components.keys()),
                timestamp: this.utils.date.now()
            }
        });
        document.dispatchEvent(event);
    }

    addEventListener(event, handler, target = document) {
        target.addEventListener(event, handler);
        if (!this.eventListeners.has(target)) this.eventListeners.set(target, []);
        this.eventListeners.get(target).push({ event, handler });
    }

    getComponent(name) { return this.components.get(name) || null; }
    isReady() { return this.isInitialized; }
    getInfo() {
        return {
            name: (this.config.app && this.config.app.name) || 'ScamSafe',
            version: (this.config.app && this.config.app.version) || 'dev',
            initialized: this.isInitialized,
            components: Array.from(this.components.keys()),
            features: this.config.features || {}
        };
    }

    destroy() {
        console.log('Destroying application...');
        this.components.forEach((c, name) => {
            if (c?.destroy && typeof c.destroy === 'function') c.destroy();
            console.log(`Component ${name} destroyed`);
        });
        this.eventListeners.forEach((list, target) => {
            list.forEach(({ event, handler }) => target.removeEventListener(event, handler));
        });
        this.components.clear();
        this.eventListeners.clear();
        this.isInitialized = false;
        console.log('Application destroyed');
    }
}

// Initialize application when DOM is ready
function initializeApp() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { window.scamSafeApp = new ScamSafeApp(); });
    } else {
        window.scamSafeApp = new ScamSafeApp();
    }
}
initializeApp();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.scamSafeApp) window.scamSafeApp.destroy();
});

// CommonJS export (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScamSafeApp;
}