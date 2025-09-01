/**
 * Main Application Controller
 * ScamSafe - Application initialization and component orchestration
 */

class ScamSafeApp {
    constructor() {
        this.config = window.SCAMSAFE_CONFIG || window.CONFIG || {};
        this.utils = window.ScamSafeUtils || Utils;

        // Component instances
        this.fontController = null;
        this.filterController = null;
        this.alertManager = null;

        // Application state
        this.isInitialized = false;
        this.components = new Map();
        this.eventListeners = new Map();

        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            console.log(`${this.config.app.name} v${this.config.app.version} - Initializing...`);

            // Check browser compatibility
            if (!this.checkBrowserCompatibility()) {
                this.showBrowserCompatibilityWarning();
                return;
            }

            // Initialize components in order
            await this.initializeComponents();

            // Setup global event handlers
            this.setupGlobalEventHandlers();

            // Setup navigation
            this.setupNavigation();

            // Handle URL hash on load
            this.handleInitialHash();

            // Mark as initialized
            this.isInitialized = true;

            // Dispatch initialization complete event
            this.dispatchInitEvent();

            console.log(`${this.config.app.name} - Initialization complete`);

        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showInitializationError(error);
        }
    }

    /**
     * Check browser compatibility
     * @returns {boolean} True if compatible
     */
    checkBrowserCompatibility() {
        const requiredFeatures = [
            'fetch',
            'Promise',
            'localStorage',
            'addEventListener',
            'querySelector',
            'classList'
        ];

        return requiredFeatures.every(feature => {
            const isSupported = feature in window || feature in document || feature in document.documentElement;
            if (!isSupported) {
                console.warn(`Browser missing required feature: ${feature}`);
            }
            return isSupported;
        });
    }

    /**
     * Initialize all components
     */
    async initializeComponents() {
        try {
            // 1) 保证类已加载到全局（避免 ReferenceError）
            if (!window.AlertManager) {
                throw new Error('AlertManager script not loaded');
            }

            // 2) 初始化各组件（带守护）
            this.alertManager = new window.AlertManager();
            this.components.set('alertManager', this.alertManager);
            window.__alertManager = this.alertManager; // 可选：方便在控制台调试

            if (window.FilterController) {
                this.filterController = new window.FilterController(this.alertManager);
                this.components.set('filterController', this.filterController);
            } else {
                console.warn('FilterController script not loaded.');
            }

            if (window.scamSafeFontController) {
                this.fontController = window.scamSafeFontController;
            } else if (window.FontController) {
                this.fontController = new window.FontController();
            }
            if (this.fontController) {
                this.components.set('fontController', this.fontController);
            }

            // 3) 触发数据加载：优先 init → refreshAlerts → loadAlerts
            if (typeof this.alertManager.init === 'function') {
                await this.alertManager.init();
            } else if (typeof this.alertManager.refreshAlerts === 'function') {
                await this.alertManager.refreshAlerts(true);
            } else if (typeof this.alertManager.loadAlerts === 'function') {
                await this.alertManager.loadAlerts();
            }

            // 4) 等待数据/事件就绪（若无，则快速返回）
            if (typeof this.waitForAlertsReady === 'function') {
                await this.waitForAlertsReady();
            } else {
                await new Promise(r => setTimeout(r, 0));
            }

            console.log('All components initialized successfully');
        } catch (err) {
            console.error('Failed to initialize application:', err);
            const grid = document.getElementById('news-grid');
            if (grid) {
                grid.insertAdjacentHTML(
                    'beforeend',
                    '<p style="padding:12px;color:#64748b">News module failed to initialize.</p>'
                );
            }
        }
    }
    /**
     * Wait for initial data to load
     * @returns {Promise} Promise that resolves when data is loaded
     */
    waitForAlertsReady() {
        return new Promise((resolve) => {
            if (this.alertManager?.isReady?.()) {
                resolve();
                return;
            }
            const handler = () => {
                document.removeEventListener('alertsLoaded', handler);
                resolve();
            };
            document.addEventListener('alertsLoaded', handler, { once: true });

            const poll = setInterval(() => {
                if (this.alertManager?.getStatistics?.()) {
                    clearInterval(poll);
                    resolve();
                }
            }, 150);
        });
    }

    /**
     * Setup global event handlers
     */
    setupGlobalEventHandlers() {
        // Handle component communication
        this.addEventListener('alertsLoaded', (event) => {
            console.log(`Loaded ${event.detail.count} alerts`);
            this.updateGlobalStats(event.detail);
        });

        this.addEventListener('filterChanged', (event) => {
            console.log(`Filter changed to: ${event.detail.filter}`);
            this.trackAnalyticsEvent('filter_used', { filter: event.detail.filter });
        });

        this.addEventListener('fontSizeChanged', (event) => {
            console.log(`Font size changed to: ${event.detail.name}`);
            this.trackAnalyticsEvent('font_changed', { size: event.detail.size });
        });

        this.addEventListener('alertAction', (event) => {
            console.log(`Alert action: ${event.detail.action.label} on ${event.detail.alert.id}`);
            this.handleAlertAction(event.detail.alert, event.detail.action);
        });

        // Handle visibility changes
        this.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.handlePageVisible();
            } else {
                this.handlePageHidden();
            }
        });

        // Handle online/offline status
        this.addEventListener('online', () => {
            this.handleOnline();
        });

        this.addEventListener('offline', () => {
            this.handleOffline();
        });

        // Handle resize for responsive adjustments
        const debouncedResize = this.utils.debounce(() => {
            this.handleResize();
        }, 250);

        this.addEventListener('resize', debouncedResize);

        // Handle errors
        this.addEventListener('error', (event) => {
            this.handleGlobalError(event.error || event);
        });

        // Handle unhandled promise rejections
        this.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError(event.reason);
            event.preventDefault(); // Prevent console error
        });
    }

    /**
     * Setup navigation functionality
     */
    setupNavigation() {
        const navLinks = this.utils.dom.selectAll('.nav-link');

        navLinks.forEach(link => {
            this.utils.dom.on(link, 'click', (event) => {
                const href = link.getAttribute('href') || '';

                // 只处理内部锚点（#home、#education…）
                if (href.startsWith('#')) {
                    event.preventDefault();
                    const sectionId = href.slice(1); // 去掉 '#'
                    this.navigateToSection(sectionId);
                    this.updateActiveNavLink(link);
                } else {
                    // 外部/其它页面（insights.html、/pages/xxx.html…）不拦截
                    // 不要 preventDefault，交给浏览器跳转
                }
            });
        });

        // 处理地址栏 hash 变化（保留内部锚点滚动）
        this.addEventListener('hashchange', () => {
            this.handleHashChange();
        });

        // 仅对 a[href^="#"] 做平滑滚动（保留你原来的逻辑）
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            this.utils.dom.on(anchor, 'click', (event) => {
                event.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    /**
     * Handle initial URL hash
     */
    handleInitialHash() {
        const hash = window.location.hash;

        if (hash) {
            if (hash.includes('filter=')) {
                // Handle filter hash
                const filter = hash.split('filter=')[1];
                if (this.filterController?.isValidFilter(filter)) {
                    setTimeout(() => {
                        this.filterController.setActiveFilter(filter);
                    }, 500);
                }
            } else {
                // Handle section hash
                const section = hash.replace('#', '');
                this.navigateToSection(section);
            }
        }
    }

    /**
     * Handle hash changes
     */
    handleHashChange() {
        const hash = window.location.hash;

        if (hash.includes('filter=')) {
            const filter = hash.split('filter=')[1];
            if (this.filterController?.isValidFilter(filter)) {
                this.filterController.setActiveFilter(filter);
            }
        } else if (hash) {
            const section = hash.replace('#', '');
            this.navigateToSection(section);
        }
    }

    /**
     * Navigate to section
     * @param {string} section - Section ID
     */
    navigateToSection(section) {
        const sectionElement = this.utils.dom.select(`#${section}`);

        if (sectionElement) {
            sectionElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    /**
     * Update active navigation link
     * @param {Element} activeLink - Active link element
     */
    updateActiveNavLink(activeLink) {
        const navLinks = this.utils.dom.selectAll('.nav-link');

        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        activeLink.classList.add('active');
    }

    /**
     * Handle alert action
     * @param {Object} alert - Alert data
     * @param {Object} action - Action data
     */
    handleAlertAction(alert, action) {
        switch (action.type) {
            case 'primary':
                this.showAlertDetails(alert);
                break;
            case 'secondary':
                this.showAlertEducation(alert, action);
                break;
            default:
                console.log(`Unhandled action type: ${action.type}`);
        }
    }

    /**
     * Show alert details modal/page
     * @param {Object} alert - Alert data
     */
    showAlertDetails(alert) {
        // Implementation would show detailed view
        console.log('Showing details for alert:', alert.id);

        // For now, just scroll to top and highlight
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Could implement modal or dedicated page here
        this.showNotification(`Viewing details for: ${alert.title}`, 'info');
    }

    /**
     * Show alert education content
     * @param {Object} alert - Alert data
     * @param {Object} action - Action data
     */
    showAlertEducation(alert, action) {
        console.log(`Showing ${action.label} for alert:`, alert.id);

        // Implementation would show educational content
        this.showNotification(`${action.label} for ${alert.type} threats`, 'info');
    }

    /**
     * Update global statistics
     * @param {Object} data - Alert data
     */
    updateGlobalStats(data) {
        // Update hero stats if needed
        const stats = this.alertManager?.getStatistics();
        if (stats) {
            this.updateHeroStats(stats);
        }
    }

    /**
     * Update hero section statistics
     * @param {Object} stats - Statistics data
     */
    updateHeroStats(stats) {
        const statNumbers = this.utils.dom.selectAll('.stat-number');

        if (statNumbers.length >= 3) {
            // Update with real data if available
            // For now, keep the static values
        }
    }

    /**
     * Handle page becoming visible
     */
    handlePageVisible() {
        console.log('Page became visible');

        // Resume auto-refresh if enabled
        this.alertManager?.resumeAutoRefresh();

        // Update timestamps
        this.alertManager?.updateTimestamps();
    }

    /**
     * Handle page becoming hidden
     */
    handlePageHidden() {
        console.log('Page became hidden');

        // Pause auto-refresh to save resources
        this.alertManager?.pauseAutoRefresh();
    }

    /**
     * Handle online status
     */
    handleOnline() {
        console.log('Connection restored');
        this.showNotification('Connection restored', 'success');

        // Refresh data when coming back online
        this.alertManager?.refreshAlerts(true);
    }

    /**
     * Handle offline status
     */
    handleOffline() {
        console.log('Connection lost');
        this.showNotification('You are currently offline', 'warning');
    }

    /**
     * Handle window resize
     */
    handleResize() {
        console.log('Window resized:', window.innerWidth, window.innerHeight);

        // Could trigger responsive adjustments here
        this.updateLayoutForViewport();
    }

    /**
     * Update layout based on viewport
     */
    updateLayoutForViewport() {
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth <= 1024;

        document.body.classList.toggle('mobile-layout', isMobile);
        document.body.classList.toggle('tablet-layout', isTablet && !isMobile);
    }

    /**
     * Handle global errors
     * @param {Error} error - Error object
     */
    handleGlobalError(error) {
        console.error('Global error:', error);

        // Track error for analytics
        this.trackAnalyticsEvent('error', {
            message: error.message || 'Unknown error',
            stack: error.stack || 'No stack trace'
        });

        // Show user-friendly error message
        this.showNotification('An unexpected error occurred', 'error');
    }

    /**
     * Show notification to user
     * @param {string} message - Notification message
     * @param {string} type - Notification type (info, success, warning, error)
     * @param {number} duration - Display duration in ms
     */
    showNotification(message, type = 'info', duration = 5000) {
        // Simple console notification for now
        // Could be enhanced with toast notifications
        const styles = {
            info: 'color: blue',
            success: 'color: green',
            warning: 'color: orange',
            error: 'color: red'
        };

        console.log(`%c${type.toUpperCase()}: ${message}`, styles[type]);

        // Create temporary visual notification
        const notification = this.utils.dom.create('div', {
            className: `notification notification-${type}`,
            style: `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: var(--text-primary);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
      `
        }, message);

        document.body.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    /**
     * Track analytics event
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    trackAnalyticsEvent(event, data = {}) {
        if (!this.config.analytics.enabled) return;

        console.log(`Analytics: ${event}`, data);

        // Implementation would send to analytics service
        // For now, just log to console
    }

    /**
     * Show browser compatibility warning
     */
    showBrowserCompatibilityWarning() {
        const warning = this.utils.dom.create('div', {
            style: `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #dc2626;
        color: white;
        padding: 16px;
        text-align: center;
        z-index: 99999;
      `
        }, `
      <strong>Browser Compatibility Warning:</strong>
      Your browser may not support all features of this application.
      Please update to a modern browser for the best experience.
    `);

        document.body.insertBefore(warning, document.body.firstChild);
    }

    /**
     * Show initialization error
     * @param {Error} error - Error object
     */
    showInitializationError(error) {
        const errorElement = this.utils.dom.create('div', {
            style: `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--card-bg);
        border: 1px solid var(--danger);
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        text-align: center;
        z-index: 99999;
      `
        });

        errorElement.innerHTML = `
      <div style="color: var(--danger); font-size: 48px; margin-bottom: 16px;">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <h3 style="color: var(--text-primary); margin-bottom: 16px;">
        Initialization Failed
      </h3>
      <p style="color: var(--text-secondary); margin-bottom: 20px;">
        The application failed to start properly. Please refresh the page to try again.
      </p>
      <button onclick="window.location.reload()" style="
        background: var(--secondary-blue);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
      ">
        Refresh Page
      </button>
    `;

        document.body.appendChild(errorElement);
    }

    /**
     * Dispatch initialization complete event
     */
    dispatchInitEvent() {
        const event = new CustomEvent('appInitialized', {
            detail: {
                app: this.config.app.name,
                version: this.config.app.version,
                components: Array.from(this.components.keys()),
                timestamp: this.utils.date.now()
            }
        });

        document.dispatchEvent(event);
    }

    /**
     * Add event listener with cleanup tracking
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {Element} target - Target element (defaults to document)
     */
    addEventListener(event, handler, target = document) {
        target.addEventListener(event, handler);

        // Track for cleanup
        if (!this.eventListeners.has(target)) {
            this.eventListeners.set(target, []);
        }
        this.eventListeners.get(target).push({ event, handler });
    }

    /**
     * Get component instance
     * @param {string} name - Component name
     * @returns {Object|null} Component instance
     */
    getComponent(name) {
        return this.components.get(name) || null;
    }

    /**
     * Check if application is initialized
     * @returns {boolean} Initialization status
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * Get application info
     * @returns {Object} Application information
     */
    getInfo() {
        return {
            name: this.config.app.name,
            version: this.config.app.version,
            initialized: this.isInitialized,
            components: Array.from(this.components.keys()),
            features: this.config.features
        };
    }

    /**
     * Destroy application and cleanup
     */
    destroy() {
        console.log('Destroying application...');

        // Destroy components
        this.components.forEach((component, name) => {
            if (component.destroy && typeof component.destroy === 'function') {
                component.destroy();
                console.log(`Component ${name} destroyed`);
            }
        });

        // Cleanup event listeners
        this.eventListeners.forEach((listeners, target) => {
            listeners.forEach(({ event, handler }) => {
                target.removeEventListener(event, handler);
            });
        });

        // Clear references
        this.components.clear();
        this.eventListeners.clear();
        this.isInitialized = false;

        console.log('Application destroyed');
    }
}

// Initialize application when DOM is ready
function initializeApp() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.scamSafeApp = new ScamSafeApp();
        });
    } else {
        window.scamSafeApp = new ScamSafeApp();
    }
}

// Auto-initialize
initializeApp();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.scamSafeApp) {
        window.scamSafeApp.destroy();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScamSafeApp;
}