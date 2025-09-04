/**
 * Font Controller Component
 * ScamSafe - Manages font size accessibility features
 */

class FontController {
    constructor() {
        this.config = window.SCAMSAFE_CONFIG || window.CONFIG || {};
        this.utils = window.ScamSafeUtils || Utils;
        this.currentSize = 'normal';
        this.root = document.documentElement;

        this.init();
    }

    /**
     * Initialize font controller
     */
    init() {
        this.bindElements();
        this.loadSavedFontSize();
        this.attachEventListeners();
        this.setupKeyboardNavigation();
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        this.fontButtons = this.utils.dom.selectAll('.font-btn');
        this.fontControls = this.utils.dom.select('.font-controls');

        if (!this.fontButtons.length) {
            console.warn('FontController: No font control buttons found');
            return;
        }
    }

    /**
     * Load saved font size from localStorage
     */
    loadSavedFontSize() {
        if (!this.config.features.fontSizeMemory) return;

        const savedSize = this.utils.storage.get(this.config.storage.fontSize, 'normal');

        if (this.config.fontSizes[savedSize]) {
            this.setFontSize(savedSize, false);
        }
    }

    /**
     * Attach event listeners to font control buttons
     */
    attachEventListeners() {
        this.fontButtons.forEach(button => {
            // Click event
            this.utils.dom.on(button, 'click', (event) => {
                event.preventDefault();
                const size = button.dataset.size;
                if (size && this.config.fontSizes[size]) {
                    this.setFontSize(size);
                }
            });

            // Hover effects
            this.utils.dom.on(button, 'mouseenter', () => {
                if (!button.classList.contains('active')) {
                    this.previewFontSize(button.dataset.size);
                }
            });

            this.utils.dom.on(button, 'mouseleave', () => {
                if (!button.classList.contains('active')) {
                    this.cancelPreview();
                }
            });
        });

        // Keyboard shortcuts
        this.utils.dom.on(document, 'keydown', (event) => {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case '-':
                    case '_':
                        event.preventDefault();
                        this.decreaseFontSize();
                        break;
                    case '+':
                    case '=':
                        event.preventDefault();
                        this.increaseFontSize();
                        break;
                    case '0':
                        event.preventDefault();
                        this.resetFontSize();
                        break;
                }
            }
        });
    }

    /**
     * Setup keyboard navigation for font controls
     */
    setupKeyboardNavigation() {
        this.fontButtons.forEach((button, index) => {
            this.utils.dom.on(button, 'keydown', (event) => {
                let targetIndex = index;

                switch (event.key) {
                    case 'ArrowLeft':
                    case 'ArrowUp':
                        event.preventDefault();
                        targetIndex = index > 0 ? index - 1 : this.fontButtons.length - 1;
                        break;
                    case 'ArrowRight':
                    case 'ArrowDown':
                        event.preventDefault();
                        targetIndex = index < this.fontButtons.length - 1 ? index + 1 : 0;
                        break;
                    case 'Home':
                        event.preventDefault();
                        targetIndex = 0;
                        break;
                    case 'End':
                        event.preventDefault();
                        targetIndex = this.fontButtons.length - 1;
                        break;
                    case 'Enter':
                    case ' ':
                        event.preventDefault();
                        button.click();
                        return;
                }

                if (targetIndex !== index) {
                    this.fontButtons[targetIndex].focus();
                }
            });
        });
    }

    /**
     * Set font size
     * @param {string} size - Font size key
     * @param {boolean} save - Whether to save to localStorage
     */
    setFontSize(size, save = true) {
        const sizeConfig = this.config.fontSizes[size];
        if (!sizeConfig) {
            console.warn(`FontController: Invalid font size "${size}"`);
            return;
        }

        // Update CSS custom property
        this.root.style.setProperty('--current-font-scale', sizeConfig.scale);

        // Update active state
        this.updateActiveState(size);

        // Save to localStorage if enabled
        if (save && this.config.features.fontSizeMemory) {
            this.utils.storage.set(this.config.storage.fontSize, size);
        }

        // Update current size
        this.currentSize = size;

        // Dispatch custom event
        this.dispatchFontChangeEvent(size, sizeConfig);

        // Announce to screen readers
        this.announceChange(sizeConfig.name);

        // Add visual feedback
        this.addVisualFeedback(size);
    }

    /**
     * Preview font size on hover
     * @param {string} size - Font size key
     */
    previewFontSize(size) {
        const sizeConfig = this.config.fontSizes[size];
        if (!sizeConfig) return;

        this.root.style.setProperty('--current-font-scale', sizeConfig.scale);
        this.root.classList.add('font-preview');

        this.previewTimeout = setTimeout(() => {
            this.cancelPreview();
        }, 2000); // Cancel preview after 2 seconds
    }

    /**
     * Cancel font size preview
     */
    cancelPreview() {
        if (this.previewTimeout) {
            clearTimeout(this.previewTimeout);
            this.previewTimeout = null;
        }

        this.root.classList.remove('font-preview');
        const currentConfig = this.config.fontSizes[this.currentSize];
        this.root.style.setProperty('--current-font-scale', currentConfig.scale);
    }

    /**
     * Update active state of font buttons
     * @param {string} activeSize - Active font size key
     */
    updateActiveState(activeSize) {
        this.fontButtons.forEach(button => {
            const isActive = button.dataset.size === activeSize;
            this.utils.dom.toggleClass(button, 'active', isActive);
            button.setAttribute('aria-pressed', isActive);
        });
    }

    /**
     * Increase font size to next level
     */
    increaseFontSize() {
        const sizes = Object.keys(this.config.fontSizes);
        const currentIndex = sizes.indexOf(this.currentSize);
        const nextIndex = Math.min(currentIndex + 1, sizes.length - 1);

        if (nextIndex !== currentIndex) {
            this.setFontSize(sizes[nextIndex]);
        }
    }

    /**
     * Decrease font size to previous level
     */
    decreaseFontSize() {
        const sizes = Object.keys(this.config.fontSizes);
        const currentIndex = sizes.indexOf(this.currentSize);
        const prevIndex = Math.max(currentIndex - 1, 0);

        if (prevIndex !== currentIndex) {
            this.setFontSize(sizes[prevIndex]);
        }
    }

    /**
     * Reset font size to normal
     */
    resetFontSize() {
        this.setFontSize('normal');
    }

    /**
     * Dispatch font change event
     * @param {string} size - New font size
     * @param {Object} sizeConfig - Size configuration
     */
    dispatchFontChangeEvent(size, sizeConfig) {
        const event = new CustomEvent('fontSizeChanged', {
            detail: {
                size,
                scale: sizeConfig.scale,
                name: sizeConfig.name
            }
        });

        document.dispatchEvent(event);
    }

    /**
     * Announce font change to screen readers
     * @param {string} sizeName - Font size name
     */
    announceChange(sizeName) {
        const announcement = `Font size changed to ${sizeName}`;

        // Create or update live region
        let liveRegion = this.utils.dom.select('#font-announcement');
        if (!liveRegion) {
            liveRegion = this.utils.dom.create('div', {
                id: 'font-announcement',
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
     * Add visual feedback for font size change
     * @param {string} size - Font size key
     */
    addVisualFeedback(size) {
        const activeButton = this.utils.dom.select(`.font-btn[data-size="${size}"]`);
        if (!activeButton) return;

        // Add scale animation
        activeButton.style.transform = 'scale(0.9)';

        setTimeout(() => {
            activeButton.style.transform = '';
        }, 150);

        // Flash effect
        activeButton.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.3)';

        setTimeout(() => {
            activeButton.style.boxShadow = '';
        }, 300);
    }

    /**
     * Get current font size information
     * @returns {Object} Current font size info
     */
    getCurrentSize() {
        return {
            size: this.currentSize,
            scale: this.config.fontSizes[this.currentSize].scale,
            name: this.config.fontSizes[this.currentSize].name
        };
    }

    /**
     * Check if font size is supported
     * @param {string} size - Font size to check
     * @returns {boolean} True if supported
     */
    isSizeSupported(size) {
        return Boolean(this.config.fontSizes[size]);
    }

    /**
     * Destroy font controller
     */
    destroy() {
        if (this.previewTimeout) {
            clearTimeout(this.previewTimeout);
        }

        this.root.classList.remove('font-preview');
        this.root.style.removeProperty('--current-font-scale');

        // Remove announcement element
        const liveRegion = this.utils.dom.select('#font-announcement');
        if (liveRegion) {
            liveRegion.remove();
        }
    }
}

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.scamSafeFontController = new FontController();
    });
} else {
    window.scamSafeFontController = new FontController();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FontController;
}