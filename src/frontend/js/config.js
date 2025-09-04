/**
 * Application Configuration
 * ScamSafe - Global configuration constants and settings
 * (Browser-safe: no direct process.env usage)
 */
(function () {
    // --- Env detection (safe in browser) ---
    const NODE_ENV =
        (typeof window !== 'undefined' && window.__ENV__) ||
        (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) ||
        'production';

    const isDev =
        NODE_ENV === 'development' ||
        (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)/.test(location.hostname));

    const CONFIG = {
        // Application Information
        app: {
            name: 'ScamSafe',
            version: '1.0.0',
            description: 'Cybersecurity Fraud Protection Platform',
            author: 'ScamSafe Team'
        },

        // API Configuration
        api: {
            baseUrl: isDev ? 'http://localhost:3000' : 'https://api.scamsafe.org',
            endpoints: {
                alerts: '/api/alerts',
                threatTypes: '/api/threat-types',
                statistics: '/api/statistics',
                sources: '/api/sources'
            },
            timeout: 10000,
            retryAttempts: 3,
            retryDelay: 1000
        },

        // Feature Flags
        features: {
            realTimeUpdates: true,
            filterPersistence: true,
            fontSizeMemory: true,
            analytics: false,
            notifications: true
        },

        // UI Configuration
        ui: {
            themes: {
                dark: {
                    name: 'Professional Dark',
                    primary: '#1e40af',
                    secondary: '#3b82f6',
                    background: '#0f172a'
                }
            },
            animations: {
                enabled: !(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
                duration: { fast: 150, normal: 200, slow: 300 }
            },
            pagination: { itemsPerPage: 12, maxPages: 10 }
        },

        // Threat Type Configuration
        threatTypes: {
            all: { id: 'all', name: 'All Threats', icon: 'fas fa-list', color: '#3b82f6' },
            sms: { id: 'sms', name: 'SMS Fraud', icon: 'fas fa-mobile-alt', color: '#dc2626' },
            phone:{ id: 'phone', name: 'Voice Fraud', icon: 'fas fa-phone', color: '#991b1b' },
            email:{ id: 'email', name: 'Email Phishing', icon: 'fas fa-envelope', color: '#3b82f6' },
            investment:{ id: 'investment', name: 'Financial Fraud', icon: 'fas fa-chart-line', color: '#d97706' },
            social:{ id: 'social', name: 'Social Media', icon: 'fab fa-facebook', color: '#8b5cf6' },
            shopping:{ id: 'shopping', name: 'E-commerce', icon: 'fas fa-shopping-cart', color: '#059669' }
        },

        // Severity Levels
        severityLevels: {
            critical:{ id:'critical', name:'Critical', class:'badge-critical', color:'#991b1b', weight:4 },
            high:{ id:'high', name:'High', class:'badge-high', color:'#dc2626', weight:3 },
            medium:{ id:'medium', name:'Medium', class:'badge-medium', color:'#d97706', weight:2 },
            low:{ id:'low', name:'Low', class:'badge-low', color:'#059669', weight:1 }
        },

        // Font Size Configuration
        fontSizes: {
            small:  { scale: 1.0, name: 'Small' },
            normal: { scale: 1.2, name: 'Normal' },
            large:  { scale: 1.3, name: 'Large' }
        },

        // Local Storage Keys
        storage: {
            fontSize: 'scamsafe_font_size',
            selectedFilter: 'scamsafe_filter',
            lastVisit: 'scamsafe_last_visit',
            dismissedAlerts: 'scamsafe_dismissed_alerts'
        },

        // Update Intervals (ms)
        intervals: {
            autoRefresh: 5 * 60 * 1000,
            timestampUpdate: 60 * 1000,
            connectionCheck: 30 * 1000
        },

        // Messages
        messages: {
            errors: {
                networkError: 'Unable to connect to the server. Please check your internet connection.',
                loadError: 'Failed to load threat data. Please try again later.',
                timeoutError: 'Request timed out. Please try again.',
                unknownError: 'An unexpected error occurred. Please refresh the page.'
            },
            success: {
                dataLoaded: 'Threat data updated successfully',
                filterApplied: 'Filter applied',
                fontChanged: 'Font size updated'
            },
            info: {
                noResults: 'No threats found matching your criteria',
                loading: 'Loading threat intelligence data...'
            }
        },

        // Analytics
        analytics: {
            enabled: false,
            trackingId: '',
            events: {
                pageView: 'page_view',
                filterUsed: 'filter_used',
                alertViewed: 'alert_viewed',
                fontChanged: 'font_changed',
                refreshClicked: 'refresh_clicked'
            }
        },

        // Security
        security: {
            contentSecurityPolicy: {
                'default-src': ["'self'"],
                'script-src': ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
                'style-src': ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
                'font-src': ["'self'", 'cdnjs.cloudflare.com'],
                'img-src': ["'self'", 'data:', 'https:']
            },
            allowedOrigins: ['https://scamsafe.org', 'https://api.scamsafe.org']
        },

        // Development Configuration (browser-safe)
        development: {
            debug: isDev,
            mockData: isDev,
            logLevel: isDev ? 'debug' : 'error'
        }
    };

    // Freeze to avoid accidental mutation
    Object.freeze(CONFIG);
    Object.freeze(CONFIG.api);
    Object.freeze(CONFIG.threatTypes);
    Object.freeze(CONFIG.severityLevels);
    Object.freeze(CONFIG.fontSizes);

    // Node/CommonJS export (optional)
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CONFIG;
    }

    // Expose to browser globals
    if (typeof window !== 'undefined') {
        window.CONFIG = CONFIG;
        window.SCAMSAFE_CONFIG = CONFIG;
    }

    console.log(`${CONFIG.app.name} v${CONFIG.app.version} - Configuration loaded (env=${NODE_ENV})`);
    // In CONFIG add.
    apiBackend: {
        baseUrl: 'http://localhost:3001/api'
    }
})();

