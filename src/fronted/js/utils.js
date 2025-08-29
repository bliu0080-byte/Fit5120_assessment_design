/**
 * Utility Functions
 * ScamSafe - Common utility functions and helpers
 */

const Utils = {
    /**
     * DOM Manipulation Utilities
     */
    dom: {
        /**
         * Query selector wrapper
         * @param {string} selector - CSS selector
         * @param {Element} context - Context element
         * @returns {Element|null}
         */
        select(selector, context = document) {
            return context.querySelector(selector);
        },

        /**
         * Query selector all wrapper
         * @param {string} selector - CSS selector
         * @param {Element} context - Context element
         * @returns {NodeList}
         */
        selectAll(selector, context = document) {
            return context.querySelectorAll(selector);
        },

        /**
         * Create element with attributes
         * @param {string} tag - HTML tag name
         * @param {Object} attributes - Element attributes
         * @param {string} content - Inner content
         * @returns {Element}
         */
        create(tag, attributes = {}, content = '') {
            const element = document.createElement(tag);

            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'dataset') {
                    Object.entries(value).forEach(([dataKey, dataValue]) => {
                        element.dataset[dataKey] = dataValue;
                    });
                } else if (key === 'style' && typeof value === 'object') {
                    Object.entries(value).forEach(([styleKey, styleValue]) => {
                        element.style[styleKey] = styleValue;
                    });
                } else {
                    element.setAttribute(key, value);
                }
            });

            if (content) {
                element.innerHTML = content;
            }

            return element;
        },

        /**
         * Add event listener
         * @param {Element} element - Target element
         * @param {string} event - Event type
         * @param {Function} handler - Event handler
         * @param {Object} options - Event options
         */
        on(element, event, handler, options = false) {
            if (element && element.addEventListener) {
                element.addEventListener(event, handler, options);
            }
        },

        /**
         * Remove event listener
         * @param {Element} element - Target element
         * @param {string} event - Event type
         * @param {Function} handler - Event handler
         */
        off(element, event, handler) {
            if (element && element.removeEventListener) {
                element.removeEventListener(event, handler);
            }
        },

        /**
         * Toggle class
         * @param {Element} element - Target element
         * @param {string} className - Class name
         * @param {boolean} force - Force add/remove
         */
        toggleClass(element, className, force) {
            if (element && element.classList) {
                element.classList.toggle(className, force);
            }
        },

        /**
         * Check if element has class
         * @param {Element} element - Target element
         * @param {string} className - Class name
         * @returns {boolean}
         */
        hasClass(element, className) {
            return element && element.classList && element.classList.contains(className);
        },

        /**
         * Get element position
         * @param {Element} element - Target element
         * @returns {Object} Position object
         */
        getPosition(element) {
            const rect = element.getBoundingClientRect();
            return {
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
                height: rect.height
            };
        }
    },

    /**
     * Storage Utilities
     */
    storage: {
        /**
         * Get item from localStorage
         * @param {string} key - Storage key
         * @param {*} defaultValue - Default value if not found
         * @returns {*} Stored value or default
         */
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Storage get error:', error);
                return defaultValue;
            }
        },

        /**
         * Set item in localStorage
         * @param {string} key - Storage key
         * @param {*} value - Value to store
         * @returns {boolean} Success status
         */
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Storage set error:', error);
                return false;
            }
        },

        /**
         * Remove item from localStorage
         * @param {string} key - Storage key
         * @returns {boolean} Success status
         */
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Storage remove error:', error);
                return false;
            }
        },

        /**
         * Clear all localStorage
         * @returns {boolean} Success status
         */
        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('Storage clear error:', error);
                return false;
            }
        }
    },

    /**
     * Date/Time Utilities
     */
    date: {
        /**
         * Get current ISO timestamp
         * @returns {string} ISO timestamp
         */
        now() {
            return new Date().toISOString();
        },

        /**
         * Format date
         * @param {string|Date} date - Date to format
         * @param {Object} options - Intl.DateTimeFormat options
         * @returns {string} Formatted date
         */
        format(date, options = {}) {
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            return new Intl.DateTimeFormat('en-US', options).format(dateObj);
        },

        /**
         * Get relative time (e.g., "2 hours ago")
         * @param {string|Date} date - Date to compare
         * @returns {string} Relative time string
         */
        timeAgo(date) {
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            const seconds = Math.floor((new Date() - dateObj) / 1000);

            const intervals = {
                year: 31536000,
                month: 2592000,
                week: 604800,
                day: 86400,
                hour: 3600,
                minute: 60
            };

            for (const [unit, value] of Object.entries(intervals)) {
                const interval = Math.floor(seconds / value);
                if (interval >= 1) {
                    return interval === 1
                        ? `1 ${unit} ago`
                        : `${interval} ${unit}s ago`;
                }
            }

            return 'Just now';
        }
    },

    /**
     * String Utilities
     */
    string: {
        /**
         * Generate random string
         * @param {number} length - String length
         * @returns {string} Random string
         */
        random(length = 8) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        },

        /**
         * Truncate string
         * @param {string} str - String to truncate
         * @param {number} length - Max length
         * @param {string} suffix - Suffix to add
         * @returns {string} Truncated string
         */
        truncate(str, length = 50, suffix = '...') {
            if (str.length <= length) return str;
            return str.substring(0, length - suffix.length) + suffix;
        },

        /**
         * Capitalize first letter
         * @param {string} str - String to capitalize
         * @returns {string} Capitalized string
         */
        capitalize(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        },

        /**
         * Convert to slug
         * @param {string} str - String to convert
         * @returns {string} Slugified string
         */
        slugify(str) {
            return str
                .toLowerCase()
                .replace(/[^\w ]+/g, '')
                .replace(/ +/g, '-');
        }
    },

    /**
     * Network Utilities
     */
    network: {
        /**
         * Check if online
         * @returns {boolean} Online status
         */
        isOnline() {
            return navigator.onLine;
        },

        /**
         * Make HTTP request
         * @param {string} url - Request URL
         * @param {Object} options - Fetch options
         * @returns {Promise} Fetch promise
         */
        async request(url, options = {}) {
            const defaultOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const finalOptions = { ...defaultOptions, ...options };

            try {
                const response = await fetch(url, finalOptions);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response;
            } catch (error) {
                console.error('Request error:', error);
                throw error;
            }
        },

        /**
         * Add delay
         * @param {number} ms - Milliseconds to delay
         * @returns {Promise} Delay promise
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    },

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in ms
     * @returns {Function} Throttled function
     */
    throttle(func, limit = 300) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Deep clone object
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));

        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = this.deepClone(obj[key]);
            }
        }
        return clonedObj;
    },

    /**
     * Check if mobile device
     * @returns {boolean} Is mobile
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    /**
     * Get viewport dimensions
     * @returns {Object} Viewport dimensions
     */
    getViewport() {
        return {
            width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
            height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
        };
    }
};

// Freeze utilities to prevent modifications
Object.freeze(Utils);

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}

// Global availability for browser environments
if (typeof window !== 'undefined') {
    window.ScamSafeUtils = Utils;
}

console.log('ScamSafe Utilities loaded');