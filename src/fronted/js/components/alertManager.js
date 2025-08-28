/**
 * Alert Manager Component
 * ScamSafe - Manages threat alert data and display
 */

class AlertManager {
    constructor() {
        this.config = window.SCAMSAFE_CONFIG || CONFIG;
        this.utils = window.ScamSafeUtils || Utils;
        this.alerts = [];
        this.isLoading = false;
        this.lastUpdate = null;
        this.autoRefreshTimer = null;

        this.init();
    }

    /**
     * Initialize alert manager
     */
    init() {
        this.bindElements();
        this.setupAutoRefresh();
        this.loadInitialData();
        this.attachEventListeners();
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        this.alertsGrid = this.utils.dom.select('#alerts-grid');
        this.loadingContainer = this.utils.dom.select('#loading-container');
        this.errorContainer = this.utils.dom.select('#error-container');
        this.refreshBtn = this.utils.dom.select('#refresh-btn');
        this.retryBtn = this.utils.dom.select('#retry-btn');
        this.lastUpdateElement = this.utils.dom.select('#last-update-time');

        if (!this.alertsGrid) {
            console.error('AlertManager: Alerts grid container not found');
            return;
        }
    }

    /**
     * Setup auto-refresh functionality
     */
    setupAutoRefresh() {
        if (!this.config.features.realTimeUpdates) return;

        this.autoRefreshTimer = setInterval(() => {
            if (!document.hidden && this.utils.network.isOnline()) {
                this.refreshAlerts(true); // Silent refresh
            }
        }, this.config.intervals.autoRefresh);

        // Pause auto-refresh when page is hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAutoRefresh();
            } else {
                this.resumeAutoRefresh();
            }
        });

        // Handle online/offline events
        window.addEventListener('online', () => {
            this.resumeAutoRefresh();
            this.refreshAlerts();
        });

        window.addEventListener('offline', () => {
            this.pauseAutoRefresh();
            this.showOfflineMessage();
        });
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        // Check if we have cached data
        const cachedAlerts = this.loadFromCache();
        if (cachedAlerts && cachedAlerts.length > 0) {
            this.alerts = cachedAlerts;
            this.renderAlerts();
            this.updateLastUpdateTime(this.utils.storage.get('scamsafe_last_update'));

            // Load fresh data in background
            this.refreshAlerts(true);
        } else {
            // No cached data, show loading and fetch
            this.refreshAlerts();
        }
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Refresh button
        if (this.refreshBtn) {
            this.utils.dom.on(this.refreshBtn, 'click', () => {
                this.refreshAlerts();
            });
        }

        // Retry button
        if (this.retryBtn) {
            this.utils.dom.on(this.retryBtn, 'click', () => {
                this.refreshAlerts();
            });
        }

        // Listen for custom refresh events
        document.addEventListener('requestRefresh', () => {
            this.refreshAlerts();
        });

        // Handle visibility changes for timestamp updates
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateTimestamps();
            }
        });

        // Update relative timestamps periodically
        setInterval(() => {
            this.updateTimestamps();
        }, this.config.intervals.timestampUpdate);
    }

    /**
     * Refresh alerts data
     * @param {boolean} silent - Whether to show loading state
     */
    async refreshAlerts(silent = false) {
        if (this.isLoading) return;

        this.isLoading = true;

        if (!silent) {
            this.showLoadingState();
        } else {
            this.showRefreshIndicator();
        }

        try {
            // In development, use mock data
            let alertsData;
            if (this.config.development.mockData) {
                alertsData = await this.loadMockData();
            } else {
                alertsData = await this.fetchAlertsFromAPI();
            }

            this.alerts = this.processAlertsData(alertsData);
            this.renderAlerts();
            this.saveToCache();
            this.updateLastUpdateTime();

            this.dispatchAlertsLoadedEvent();

            if (!silent) {
                this.showSuccessMessage();
            }

        } catch (error) {
            console.error('Failed to refresh alerts:', error);

            if (!silent) {
                this.showErrorState(error);
            } else {
                this.showErrorNotification(error);
            }
        } finally {
            this.isLoading = false;
            this.hideLoadingState();
            this.hideRefreshIndicator();
        }
    }

    /**
     * Load mock data for development
     * @returns {Array} Mock alerts data
     */
    async loadMockData() {
        // Simulate network delay
        await this.utils.network.delay(1000 + Math.random() * 2000);

        return [
            {
                id: 'alert-001',
                type: 'sms',
                title: 'Banking Verification SMS Fraud Campaign',
                description: 'Large-scale SMS campaign impersonating major banks requesting urgent account verification. Messages contain malicious links leading to credential harvesting sites with sophisticated bank branding.',
                preview: 'URGENT: Your account has been temporarily locked due to suspicious activity. Verify your identity immediately: secure-verify-bank[.]com/urgent-action',
                severity: 'critical',
                source: 'Financial Crimes Unit',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                actions: [
                    { type: 'primary', label: 'Learn More', icon: 'fas fa-info-circle' },
                    { type: 'secondary', label: 'Prevention Tips', icon: 'fas fa-shield-alt' }
                ]
            },
            {
                id: 'alert-002',
                type: 'investment',
                title: 'High-Yield Investment Phone Scam Network',
                description: 'Organized network targeting retirees with high-pressure sales tactics promising unrealistic returns. Operators use sophisticated scripts and fake regulatory credentials to appear legitimate.',
                preview: 'Congratulations! You\'ve been selected for our exclusive investment program. Guaranteed 250% returns in 60 days. Limited spots available - act now!',
                severity: 'critical',
                source: 'Securities Commission',
                timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
                actions: [
                    { type: 'primary', label: 'Learn More', icon: 'fas fa-info-circle' },
                    { type: 'secondary', label: 'Educational Guide', icon: 'fas fa-graduation-cap' }
                ]
            },
            {
                id: 'alert-003',
                type: 'email',
                title: 'Business Email Compromise Campaign',
                description: 'Sophisticated email attacks targeting businesses with fake invoice requests and urgent payment demands. Attackers research target companies to create convincing impersonation attempts.',
                preview: 'URGENT: Invoice #2025-INV-4729 overdue $8,947. Please process wire transfer immediately to avoid service disruption. Payment details attached.',
                severity: 'critical',
                source: 'Cybersecurity Division',
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
                actions: [
                    { type: 'primary', label: 'Learn More', icon: 'fas fa-info-circle' },
                    { type: 'secondary', label: 'Case Studies', icon: 'fas fa-book-open' }
                ]
            },
            {
                id: 'alert-004',
                type: 'phone',
                title: 'Technology Support Impersonation Calls',
                description: 'Persistent phone campaign impersonating major technology companies claiming computer infections. Requests remote access and payment for unnecessary services or software.',
                preview: 'This is Microsoft Technical Support. We\'ve detected 23 critical errors on your computer. Allow remote access immediately or risk complete system failure.',
                severity: 'medium',
                source: 'Consumer Protection',
                timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
                actions: [
                    { type: 'primary', label: 'Learn More', icon: 'fas fa-info-circle' },
                    { type: 'secondary', label: 'Protection Guide', icon: 'fas fa-user-shield' }
                ]
            },
            {
                id: 'alert-005',
                type: 'social',
                title: 'Social Platform Prize Notification Fraud',
                description: 'Fake prize winner notifications distributed through compromised social media accounts. Requests personal information and upfront fees to claim non-existent winnings.',
                preview: '🎉 WINNER! Facebook 20th Anniversary Lottery: $75,000 prize awarded. Claim within 48 hours: fb-winner-claim[.]net/verify',
                severity: 'medium',
                source: 'Digital Safety Unit',
                timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
                actions: [
                    { type: 'primary', label: 'Learn More', icon: 'fas fa-info-circle' },
                    { type: 'secondary', label: 'Awareness Tips', icon: 'fas fa-lightbulb' }
                ]
            },
            {
                id: 'alert-006',
                type: 'shopping',
                title: 'Counterfeit Online Store Network',
                description: 'Network of professional-appearing e-commerce sites selling counterfeit goods or collecting payment without delivery. Sites use stolen branding and fake customer reviews.',
                preview: 'MEGA SALE: 85% off designer products! Free shipping worldwide. Pay now - limited quantities available. No returns policy applies.',
                severity: 'medium',
                source: 'Commerce Division',
                timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
                actions: [
                    { type: 'primary', label: 'Learn More', icon: 'fas fa-info-circle' },
                    { type: 'secondary', label: 'Spot Fakes', icon: 'fas fa-eye' }
                ]
            }
        ];
    }

    /**
     * Fetch alerts from API
     * @returns {Array} Alerts data
     */
    async fetchAlertsFromAPI() {
        const url = `${this.config.api.baseUrl}${this.config.api.endpoints.alerts}`;
        const response = await this.utils.network.request(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        return await response.json();
    }

    /**
     * Process raw alerts data
     * @param {Array} rawData - Raw alerts data
     * @returns {Array} Processed alerts
     */
    processAlertsData(rawData) {
        return rawData.map(alert => ({
            ...alert,
            id: alert.id || this.utils.string.random(8),
            timestamp: alert.timestamp || this.utils.date.now(),
            severity: alert.severity || 'medium',
            type: alert.type || 'email'
        })).sort((a, b) => {
            // Sort by severity first, then by timestamp
            const severityWeights = this.config.severityLevels;
            const severityDiff = (severityWeights[b.severity]?.weight || 0) - (severityWeights[a.severity]?.weight || 0);

            if (severityDiff !== 0) return severityDiff;

            return new Date(b.timestamp) - new Date(a.timestamp);
        });
    }

    /**
     * Render alerts to DOM
     */
    renderAlerts() {
        if (!this.alertsGrid) return;

        // Clear existing alerts
        this.alertsGrid.innerHTML = '';

        if (this.alerts.length === 0) {
            this.renderEmptyState();
            return;
        }

        // Create document fragment for better performance
        const fragment = document.createDocumentFragment();

        this.alerts.forEach((alert, index) => {
            const alertElement = this.createAlertElement(alert, index);
            fragment.appendChild(alertElement);
        });

        this.alertsGrid.appendChild(fragment);

        // Trigger staggered animations
        this.animateAlerts();
    }

    /**
     * Create alert element
     * @param {Object} alert - Alert data
     * @param {number} index - Alert index
     * @returns {Element} Alert element
     */
    createAlertElement(alert, index) {
        const severityConfig = this.config.severityLevels[alert.severity];
        const typeConfig = this.config.threatTypes[alert.type];

        const alertCard = this.utils.dom.create('div', {
            className: 'alert-card',
            dataset: { type: alert.type, severity: alert.severity, id: alert.id }
        });

        // Alert Header
        const alertHeader = this.utils.dom.create('div', { className: 'alert-header' });

        const alertInfo = this.utils.dom.create('div', { className: 'alert-info' });

        const threatIcon = this.utils.dom.create('div', {
            className: `threat-icon ${alert.type}`
        });
        threatIcon.innerHTML = `<i class="${typeConfig.icon}"></i>`;

        const alertType = this.utils.dom.create('div', {
            className: 'alert-type'
        }, typeConfig.name);

        alertInfo.appendChild(threatIcon);
        alertInfo.appendChild(alertType);

        const severityBadge = this.utils.dom.create('div', {
            className: `severity-badge ${severityConfig.class}`
        }, severityConfig.name);

        alertHeader.appendChild(alertInfo);
        alertHeader.appendChild(severityBadge);

        // Alert Content
        const alertContent = this.utils.dom.create('div', { className: 'alert-content' });

        const alertTitle = this.utils.dom.create('h3', {
            className: 'alert-title'
        }, alert.title);

        const alertDescription = this.utils.dom.create('p', {
            className: 'alert-description'
        }, alert.description);

        const alertPreview = this.utils.dom.create('div', {
            className: 'alert-preview'
        }, `"${alert.preview}"`);

        const alertMeta = this.utils.dom.create('div', { className: 'alert-meta' });

        const sourceItem = this.utils.dom.create('div', { className: 'meta-item' });
        sourceItem.innerHTML = `<i class="fas fa-building"></i><span>${alert.source}</span>`;

        const timeItem = this.utils.dom.create('div', { className: 'meta-item' });
        timeItem.innerHTML = `<i class="fas fa-calendar"></i><span class="timestamp" data-timestamp="${alert.timestamp}">${this.utils.date.timeAgo(alert.timestamp)}</span>`;

        alertMeta.appendChild(sourceItem);
        alertMeta.appendChild(timeItem);

        // Alert Actions
        const alertActions = this.utils.dom.create('div', { className: 'alert-actions' });

        alert.actions.forEach(action => {
            const actionBtn = this.utils.dom.create('button', {
                className: `action-btn btn-${action.type}`,
                title: action.label
            });
            actionBtn.innerHTML = `<i class="${action.icon}"></i>${action.label}`;

            // Add click handler
            this.utils.dom.on(actionBtn, 'click', () => {
                this.handleActionClick(alert, action);
            });

            alertActions.appendChild(actionBtn);
        });

        // Assemble card
        alertContent.appendChild(alertTitle);
        alertContent.appendChild(alertDescription);
        alertContent.appendChild(alertPreview);
        alertContent.appendChild(alertMeta);
        alertContent.appendChild(alertActions);

        alertCard.appendChild(alertHeader);
        alertCard.appendChild(alertContent);

        // Add hover effects
        this.addCardInteractions(alertCard, alert);

        return alertCard;
    }

    /**
     * Add interactive behaviors to alert card
     * @param {Element} card - Alert card element
     * @param {Object} alert - Alert data
     */
    addCardInteractions(card, alert) {
        // Hover effects
        this.utils.dom.on(card, 'mouseenter', () => {
            card.style.transform = 'translateY(-4px)';
        });

        this.utils.dom.on(card, 'mouseleave', () => {
            card.style.transform = '';
        });

        // Click to expand/collapse (for mobile)
        this.utils.dom.on(card, 'click', (event) => {
            if (window.innerWidth <= 768 && !event.target.closest('.action-btn')) {
                card.classList.toggle('expanded');
            }
        });

        // Keyboard navigation
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'article');
        card.setAttribute('aria-label', `${alert.title} - ${alert.severity} severity threat`);

        this.utils.dom.on(card, 'keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                const firstAction = card.querySelector('.action-btn');
                if (firstAction) firstAction.click();
            }
        });
    }

    /**
     * Handle action button clicks
     * @param {Object} alert - Alert data
     * @param {Object} action - Action data
     */
    handleActionClick(alert, action) {
        console.log(`Action "${action.label}" clicked for alert:`, alert.id);

        // Dispatch custom event
        const event = new CustomEvent('alertAction', {
            detail: { alert, action }
        });
        document.dispatchEvent(event);

        // Add visual feedback
        const button = event.target;
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }

    /**
     * Animate alerts entrance
     */
    animateAlerts() {
        const cards = this.utils.dom.selectAll('.alert-card');

        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';

            setTimeout(() => {
                card.style.transition = 'all 0.4s ease-out';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        const emptyState = this.utils.dom.create('div', {
            className: 'empty-state'
        });

        emptyState.innerHTML = `
      <div class="empty-icon">
        <i class="fas fa-shield-alt"></i>
      </div>
      <h3>No Threats Detected</h3>
      <p>No active threat alerts to display at this time.</p>
      <button class="btn btn-primary" onclick="window.scamSafeApp?.alertManager?.refreshAlerts()">
        <i class="fas fa-sync-alt"></i>
        Check for Updates
      </button>
    `;

        this.alertsGrid.appendChild(emptyState);
    }

    /**
     * Update relative timestamps
     */
    updateTimestamps() {
        const timestamps = this.utils.dom.selectAll('.timestamp[data-timestamp]');

        timestamps.forEach(element => {
            const timestamp = element.dataset.timestamp;
            element.textContent = this.utils.date.timeAgo(timestamp);
        });
    }

    /**
     * Update last update time display
     * @param {string} timestamp - Update timestamp
     */
    updateLastUpdateTime(timestamp = null) {
        const updateTime = timestamp || this.utils.date.now();
        this.lastUpdate = updateTime;

        if (this.lastUpdateElement) {
            this.lastUpdateElement.textContent = `Last Updated: ${this.utils.date.format(updateTime, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'UTC',
                timeZoneName: 'short'
            })}`;
        }

        // Save update time
        this.utils.storage.set('scamsafe_last_update', updateTime);
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        if (this.loadingContainer) {
            this.loadingContainer.style.display = 'flex';
        }

        if (this.alertsGrid) {
            this.alertsGrid.style.display = 'none';
        }

        if (this.errorContainer) {
            this.errorContainer.style.display = 'none';
        }
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        if (this.loadingContainer) {
            this.loadingContainer.style.display = 'none';
        }

        if (this.alertsGrid) {
            this.alertsGrid.style.display = 'grid';
        }
    }

    /**
     * Show error state
     * @param {Error} error - Error object
     */
    showErrorState(error) {
        if (this.errorContainer) {
            this.errorContainer.style.display = 'flex';

            const errorMessage = this.errorContainer.querySelector('.error-message p');
            if (errorMessage) {
                errorMessage.textContent = this.getErrorMessage(error);
            }
        }

        if (this.alertsGrid) {
            this.alertsGrid.style.display = 'none';
        }

        if (this.loadingContainer) {
            this.loadingContainer.style.display = 'none';
        }
    }

    /**
     * Show refresh indicator
     */
    showRefreshIndicator() {
        if (this.refreshBtn) {
            const icon = this.refreshBtn.querySelector('i');
            if (icon) {
                icon.style.animation = 'spin 1s linear infinite';
            }
            this.refreshBtn.disabled = true;
        }
    }

    /**
     * Hide refresh indicator
     */
    hideRefreshIndicator() {
        if (this.refreshBtn) {
            const icon = this.refreshBtn.querySelector('i');
            if (icon) {
                icon.style.animation = '';
            }
            this.refreshBtn.disabled = false;
        }
    }

    /**
     * Get user-friendly error message
     * @param {Error} error - Error object
     * @returns {string} Error message
     */
    getErrorMessage(error) {
        if (!this.utils.network.isOnline()) {
            return this.config.messages.errors.networkError;
        }

        if (error.name === 'AbortError') {
            return this.config.messages.errors.timeoutError;
        }

        if (error.message.includes('Failed to fetch')) {
            return this.config.messages.errors.networkError;
        }

        return this.config.messages.errors.unknownError;
    }

    /**
     * Show success message
     */
    showSuccessMessage() {
        // Could implement toast notification here
        console.log(this.config.messages.success.dataLoaded);
    }

    /**
     * Show error notification
     * @param {Error} error - Error object
     */
    showErrorNotification(error) {
        // Could implement toast notification here
        console.error('Silent refresh failed:', this.getErrorMessage(error));
    }

    /**
     * Show offline message
     */
    showOfflineMessage() {
        // Could implement toast notification here
        console.log('Application is offline');
    }

    /**
     * Save alerts to cache
     */
    saveToCache() {
        this.utils.storage.set('scamsafe_alerts_cache', this.alerts);
    }

    /**
     * Load alerts from cache
     * @returns {Array|null} Cached alerts or null
     */
    loadFromCache() {
        return this.utils.storage.get('scamsafe_alerts_cache');
    }

    /**
     * Dispatch alerts loaded event
     */
    dispatchAlertsLoadedEvent() {
        const event = new CustomEvent('alertsLoaded', {
            detail: {
                alerts: this.alerts,
                count: this.alerts.length,
                timestamp: this.lastUpdate
            }
        });

        document.dispatchEvent(event);
    }

    /**
     * Pause auto-refresh
     */
    pauseAutoRefresh() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.autoRefreshTimer = null;
        }
    }

    /**
     * Resume auto-refresh
     */
    resumeAutoRefresh() {
        if (!this.autoRefreshTimer && this.config.features.realTimeUpdates) {
            this.setupAutoRefresh();
        }
    }

    /**
     * Get alerts by type
     * @param {string} type - Alert type
     * @returns {Array} Filtered alerts
     */
    getAlertsByType(type) {
        return this.alerts.filter(alert => alert.type === type);
    }

    /**
     * Get alerts by severity
     * @param {string} severity - Alert severity
     * @returns {Array} Filtered alerts
     */
    getAlertsBySeverity(severity) {
        return this.alerts.filter(alert => alert.severity === severity);
    }

    /**
     * Get alert statistics
     * @returns {Object} Alert statistics
     */
    getStatistics() {
        const stats = {
            total: this.alerts.length,
            byType: {},
            bySeverity: {},
            lastUpdate: this.lastUpdate
        };

        // Count by type
        Object.keys(this.config.threatTypes).forEach(type => {
            if (type !== 'all') {
                stats.byType[type] = this.getAlertsByType(type).length;
            }
        });

        // Count by severity
        Object.keys(this.config.severityLevels).forEach(severity => {
            stats.bySeverity[severity] = this.getAlertsBySeverity(severity).length;
        });

        return stats;
    }

    /**
     * Destroy alert manager
     */
    destroy() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlertManager;
}