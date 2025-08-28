/**
 * Filter Controller Component
 * ScamSafe - Manages threat type filtering functionality
 */

class FilterController {
    constructor(alertManager) {
        this.config = window.SCAMSAFE_CONFIG || CONFIG;
        this.utils = window.ScamSafeUtils || Utils;
        this.alertManager = alertManager;
        this.activeFilter = 'all';
        this.filterHistory = [];

        this.init();
    }

    /**
     * Initialize filter controller
     */
    init() {
        this.bindElements();
        this.loadSavedFilter();
        this.attachEventListeners();
        this.setupKeyboardNavigation();
        this.updateFilterCount();
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        this.filterTabs = this.utils.dom.selectAll('.filter-tab');
        this.filterContainer = this.utils.dom.select('#filter-tabs');
        this.alertsGrid = this.utils.dom.select('#alerts-grid');

        if (!this.filterTabs.length) {
            console.warn('FilterController: No filter tabs found');
            return;
        }
    }

    /**
     * Load saved filter from localStorage
     */
    loadSavedFilter() {
        if (!this.config.features.filterPersistence) return;

        const savedFilter = this.utils.storage.get(this.config.storage.selectedFilter, 'all');

        if (this.isValidFilter(savedFilter)) {
            this.setActiveFilter(savedFilter, false);
        }
    }

    /**
     * Attach event listeners to filter tabs
     */
    attachEventListeners() {
        this.filterTabs.forEach(tab => {
            // Click event
            this.utils.dom.on(tab, 'click', (event) => {
                event.preventDefault();
                const filter = tab.dataset.filter;
                if (filter && this.isValidFilter(filter)) {
                    this.setActiveFilter(filter);
                }
            });

            // Hover events for preview
            this.utils.dom.on(tab, 'mouseenter', () => {
                if (!tab.classList.contains('active')) {
                    this.previewFilter(tab.dataset.filter);
                }
            });

            this.utils.dom.on(tab, 'mouseleave', () => {
                if (!tab.classList.contains('active')) {
                    this.cancelPreview();
                }
            });
        });

        // Listen for alert data updates
        document.addEventListener('alertsLoaded', () => {
            this.updateFilterCount();
        });

        // Listen for custom filter events
        document.addEventListener('applyFilter', (event) => {
            const { filter } = event.detail;
            if (this.isValidFilter(filter)) {
                this.setActiveFilter(filter);
            }
        });
    }

    /**
     * Setup keyboard navigation for filter tabs
     */
    setupKeyboardNavigation() {
        this.filterTabs.forEach((tab, index) => {
            // Make tabs focusable
            tab.setAttribute('tabindex', index === 0 ? '0' : '-1');
            tab.setAttribute('role', 'tab');

            this.utils.dom.on(tab, 'keydown', (event) => {
                let targetIndex = index;

                switch (event.key) {
                    case 'ArrowLeft':
                        event.preventDefault();
                        targetIndex = index > 0 ? index - 1 : this.filterTabs.length - 1;
                        break;
                    case 'ArrowRight':
                        event.preventDefault();
                        targetIndex = index < this.filterTabs.length - 1 ? index + 1 : 0;
                        break;
                    case 'Home':
                        event.preventDefault();
                        targetIndex = 0;
                        break;
                    case 'End':
                        event.preventDefault();
                        targetIndex = this.filterTabs.length - 1;
                        break;
                    case 'Enter':
                    case ' ':
                        event.preventDefault();
                        tab.click();
                        return;
                }

                if (targetIndex !== index) {
                    this.focusTab(targetIndex);
                }
            });
        });

        // Keyboard shortcuts for common filters
        this.utils.dom.on(document, 'keydown', (event) => {
            if (event.altKey) {
                let targetFilter = null;

                switch (event.key) {
                    case '1':
                        targetFilter = 'all';
                        break;
                    case '2':
                        targetFilter = 'sms';
                        break;
                    case '3':
                        targetFilter = 'phone';
                        break;
                    case '4':
                        targetFilter = 'email';
                        break;
                    case '5':
                        targetFilter = 'investment';
                        break;
                }

                if (targetFilter && this.isValidFilter(targetFilter)) {
                    event.preventDefault();
                    this.setActiveFilter(targetFilter);
                }
            }
        });
    }

    /**
     * Focus specific filter tab
     * @param {number} index - Tab index
     */
    focusTab(index) {
        this.filterTabs.forEach((tab, i) => {
            tab.setAttribute('tabindex', i === index ? '0' : '-1');
        });

        this.filterTabs[index].focus();
    }

    /**
     * Set active filter
     * @param {string} filter - Filter type
     * @param {boolean} save - Whether to save to localStorage
     */
    setActiveFilter(filter, save = true) {
        if (!this.isValidFilter(filter)) {
            console.warn(`FilterController: Invalid filter "${filter}"`);
            return;
        }

        // Add to history
        if (filter !== this.activeFilter) {
            this.filterHistory.push(this.activeFilter);
            if (this.filterHistory.length > 10) {
                this.filterHistory.shift();
            }
        }

        // Update active filter
        this.activeFilter = filter;

        // Update UI
        this.updateActiveState(filter);
        this.applyFilter(filter);

        // Save to localStorage if enabled
        if (save && this.config.features.filterPersistence) {
            this.utils.storage.set(this.config.storage.selectedFilter, filter);
        }

        // Dispatch custom event
        this.dispatchFilterChangeEvent(filter);

        // Announce to screen readers
        this.announceFilterChange(filter);

        // Update URL hash
        this.updateURLHash(filter);
    }

    /**
     * Preview filter without applying
     * @param {string} filter - Filter type
     */
    previewFilter(filter) {
        if (!this.isValidFilter(filter) || filter === this.activeFilter) return;

        const filterConfig = this.config.threatTypes[filter];

        // Add preview styling
        const tab = this.utils.dom.select(`[data-filter="${filter}"]`);
        if (tab) {
            tab.style.backgroundColor = `${filterConfig.color}20`;
            tab.style.borderColor = filterConfig.color;
        }

        // Show preview count
        this.showPreviewCount(filter);

        this.previewTimeout = setTimeout(() => {
            this.cancelPreview();
        }, 1500);
    }

    /**
     * Cancel filter preview
     */
    cancelPreview() {
        if (this.previewTimeout) {
            clearTimeout(this.previewTimeout);
            this.previewTimeout = null;
        }

        // Remove preview styling
        this.filterTabs.forEach(tab => {
            if (!tab.classList.contains('active')) {
                tab.style.backgroundColor = '';
                tab.style.borderColor = '';
            }
        });

        // Hide preview count
        this.hidePreviewCount();
    }

    /**
     * Apply filter to alerts
     * @param {string} filter - Filter type
     */
    applyFilter(filter) {
        if (!this.alertManager) {
            console.warn('FilterController: AlertManager not available');
            return;
        }

        // Show loading state
        this.showFilteringState();

        // Use requestAnimationFrame for smooth animation
        requestAnimationFrame(() => {
            const alerts = this.utils.dom.selectAll('.alert-card');
            let visibleCount = 0;

            alerts.forEach((card, index) => {
                const cardType = card.dataset.type;
                const shouldShow = filter === 'all' || cardType === filter;

                if (shouldShow) {
                    card.style.display = 'block';
                    card.style.animationDelay = `${index * 100}ms`;
                    card.classList.add('filter-enter');
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                    card.classList.remove('filter-enter');
                }
            });

            // Update result count
            this.updateResultCount(visibleCount, filter);

            // Hide loading state
            this.hideFilteringState();

            // Scroll to top of results
            this.scrollToResults();
        });
    }

    /**
     * Update active state of filter tabs
     * @param {string} activeFilter - Active filter type
     */
    updateActiveState(activeFilter) {
        this.filterTabs.forEach(tab => {
            const isActive = tab.dataset.filter === activeFilter;
            this.utils.dom.toggleClass(tab, 'active', isActive);
            tab.setAttribute('aria-pressed', isActive);
            tab.setAttribute('aria-selected', isActive);
        });
    }

    /**
     * Update filter counts based on available alerts
     */
    updateFilterCount() {
        if (!this.alertManager) return;

        const alerts = this.utils.dom.selectAll('.alert-card');
        const counts = {};

        // Count alerts by type
        alerts.forEach(card => {
            const type = card.dataset.type;
            counts[type] = (counts[type] || 0) + 1;
        });

        // Calculate total
        counts.all = alerts.length;

        // Update tab counts
        this.filterTabs.forEach(tab => {
            const filter = tab.dataset.filter;
            const count = counts[filter] || 0;

            // Update or create count badge
            let badge = tab.querySelector('.filter-count');
            if (!badge && count > 0) {
                badge = this.utils.dom.create('span', {
                    className: 'filter-count'
                });
                tab.appendChild(badge);
            }

            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline' : 'none';
            }

            // Disable tabs with no results
            tab.disabled = count === 0 && filter !== 'all';
            this.utils.dom.toggleClass(tab, 'disabled', count === 0 && filter !== 'all');
        });
    }

    /**
     * Show preview count for filter
     * @param {string} filter - Filter type
     */
    showPreviewCount(filter) {
        const alerts = this.utils.dom.selectAll('.alert-card');
        const count = filter === 'all'
            ? alerts.length
            : alerts.filter(card => card.dataset.type === filter).length;

        // Create preview tooltip
        const tab = this.utils.dom.select(`[data-filter="${filter}"]`);
        if (tab && !tab.querySelector('.filter-preview')) {
            const preview = this.utils.dom.create('div', {
                className: 'filter-preview'
            }, `${count} alerts`);

            tab.appendChild(preview);
        }
    }

    /**
     * Hide preview count
     */
    hidePreviewCount() {
        const previews = this.utils.dom.selectAll('.filter-preview');
        previews.forEach(preview => preview.remove());
    }

    /**
     * Show filtering loading state
     */
    showFilteringState() {
        const grid = this.alertsGrid;
        if (grid) {
            grid.classList.add('filtering');

            // Add loading overlay
            if (!grid.querySelector('.filter-loading')) {
                const loader = this.utils.dom.create('div', {
                    className: 'filter-loading'
                });

                const spinner = this.utils.dom.create('div', {
                    className: 'spinner'
                });

                loader.appendChild(spinner);
                grid.appendChild(loader);
            }
        }
    }

    /**
     * Hide filtering loading state
     */
    hideFilteringState() {
        const grid = this.alertsGrid;
        if (grid) {
            grid.classList.remove('filtering');

            const loader = grid.querySelector('.filter-loading');
            if (loader) {
                loader.remove();
            }
        }
    }

    /**
     * Update result count display
     * @param {number} count - Number of visible results
     * @param {string} filter - Active filter
     */
    updateResultCount(count, filter) {
        const filterConfig = this.config.threatTypes[filter];
        const message = filter === 'all'
            ? `Showing all ${count} threats`
            : `Showing ${count} ${filterConfig.name.toLowerCase()} threats`;

        // Update or create result count element
        let countElement = this.utils.dom.select('.result-count');
        if (!countElement) {
            countElement = this.utils.dom.create('div', {
                className: 'result-count'
            });

            const header = this.utils.dom.select('.section-header');
            if (header) {
                header.appendChild(countElement);
            }
        }

        countElement.textContent = message;
        countElement.className = `result-count ${count === 0 ? 'no-results' : ''}`;
    }

    /**
     * Scroll to results section
     */
    scrollToResults() {
        const grid = this.alertsGrid;
        if (grid) {
            const rect = grid.getBoundingClientRect();
            const isVisible = rect.top >= 0 && rect.top <= window.innerHeight;

            if (!isVisible) {
                grid.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    }

    /**
     * Dispatch filter change event
     * @param {string} filter - New active filter
     */
    dispatchFilterChangeEvent(filter) {
        const filterConfig = this.config.threatTypes[filter];

        const event = new CustomEvent('filterChanged', {
            detail: {
                filter,
                name: filterConfig.name,
                icon: filterConfig.icon,
                previousFilter: this.filterHistory[this.filterHistory.length - 1]
            }
        });

        document.dispatchEvent(event);
    }

    /**
     * Announce filter change to screen readers
     * @param {string} filter - New active filter
     */
    announceFilterChange(filter) {
        const filterConfig = this.config.threatTypes[filter];
        const announcement = `Filter changed to ${filterConfig.name}`;

        // Create or update live region
        let liveRegion = this.utils.dom.select('#filter-announcement');
        if (!liveRegion) {
            liveRegion = this.utils.dom.create('div', {
                id: 'filter-announcement',
                'aria-live': 'polite',
                className: 'sr-only'
            });
            document.body.appendChild(liveRegion);
        }

        liveRegion.textContent = announcement;

        // Clear after announcement
        setTimeout(() => {
            liveRegion.textContent = '';
        }, 1000);
    }

    /**
     * Update URL hash based on active filter
     * @param {string} filter - Active filter
     */
    updateURLHash(filter) {
        if (filter === 'all') {
            // Remove hash for 'all' filter
            if (window.location.hash) {
                history.replaceState(null, null, window.location.pathname);
            }
        } else {
            // Set hash for specific filters
            const newHash = `#filter=${filter}`;
            if (window.location.hash !== newHash) {
                history.replaceState(null, null, newHash);
            }
        }
    }

    /**
     * Go back to previous filter
     */
    goBackToPreviousFilter() {
        if (this.filterHistory.length > 0) {
            const previousFilter = this.filterHistory.pop();
            this.activeFilter = previousFilter; // Don't add to history again
            this.setActiveFilter(previousFilter, false);
        }
    }

    /**
     * Clear all filters (show all)
     */
    clearFilter() {
        this.setActiveFilter('all');
    }

    /**
     * Check if filter is valid
     * @param {string} filter - Filter to validate
     * @returns {boolean} True if valid
     */
    isValidFilter(filter) {
        return Boolean(this.config.threatTypes[filter]);
    }

    /**
     * Get current active filter
     * @returns {string} Active filter
     */
    getActiveFilter() {
        return this.activeFilter;
    }

    /**
     * Get filter statistics
     * @returns {Object} Filter stats
     */
    getFilterStats() {
        const alerts = this.utils.dom.selectAll('.alert-card');
        const stats = {};

        Object.keys(this.config.threatTypes).forEach(filter => {
            if (filter === 'all') {
                stats[filter] = alerts.length;
            } else {
                stats[filter] = alerts.filter(card => card.dataset.type === filter).length;
            }
        });

        return stats;
    }

    /**
     * Destroy filter controller
     */
    destroy() {
        if (this.previewTimeout) {
            clearTimeout(this.previewTimeout);
        }

        // Remove announcement element
        const liveRegion = this.utils.dom.select('#filter-announcement');
        if (liveRegion) {
            liveRegion.remove();
        }

        // Remove result count
        const countElement = this.utils.dom.select('.result-count');
        if (countElement) {
            countElement.remove();
        }

        // Clean up preview elements
        this.hidePreviewCount();
        this.hideFilteringState();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterController;
}