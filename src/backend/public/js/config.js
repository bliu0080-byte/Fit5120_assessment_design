/**
 * Application Configuration
 * ScamSafe - Global configuration constants and settings
 */
(function () {
    // --- Detect environment ---
    const host = (typeof location !== "undefined" && location.hostname) || "";
    const isLocal = /^(localhost|127\.0\.0\.1)$/.test(host);
    const isRender = /onrender\.com$/.test(host);
    const isPages = /\.github\.io$/.test(host);

    // --- Backend base URL ---
    // 1. Local开发时: http://localhost:3001/api
    // 2. Render同一服务部署: /api (同源)
    // 3. GitHub Pages: 指向你的Render后端地址
    const BACKEND_BASE = isLocal
        ? "http://localhost:3001/api"
        : isRender
            ? "/api"
            : "https://scamsafe.onrender.com/api"; // 修改为你的Render后端地址

    const CONFIG = {
        app: {
            name: "ScamSafe",
            version: "1.0.0",
            description: "Cybersecurity Fraud Protection Platform",
            author: "ScamSafe Team",
        },

        // Main API (for alerts, statistics, etc.)
        api: {
            baseUrl: BACKEND_BASE.replace(/\/api$/, ""),
            endpoints: {
                alerts: "/api/alerts",
                threatTypes: "/api/threat-types",
                statistics: "/api/statistics",
                sources: "/api/sources",
            },
            timeout: 10000,
            retryAttempts: 3,
            retryDelay: 1000,
        },

        // Backend API (news, admin, etc.)
        apiBackend: { baseUrl: BACKEND_BASE },

        features: {
            realTimeUpdates: true,
            filterPersistence: true,
            fontSizeMemory: true,
            analytics: false,
            notifications: true,
        },

        ui: {
            themes: {
                dark: {
                    name: "Professional Dark",
                    primary: "#1e40af",
                    secondary: "#3b82f6",
                    background: "#0f172a",
                },
            },
            animations: {
                enabled:
                    !(
                        typeof window !== "undefined" &&
                        window.matchMedia &&
                        window.matchMedia("(prefers-reduced-motion: reduce)").matches
                    ),
                duration: { fast: 150, normal: 200, slow: 300 },
            },
            pagination: { itemsPerPage: 12, maxPages: 10 },
        },

        fontSizes: {
            small: { scale: 1.0, name: "Small" },
            normal: { scale: 1.2, name: "Normal" },
            large: { scale: 1.3, name: "Large" },
        },

        storage: {
            fontSize: "scamsafe_font_size",
            selectedFilter: "scamsafe_filter",
            lastVisit: "scamsafe_last_visit",
            dismissedAlerts: "scamsafe_dismissed_alerts",
        },

        intervals: {
            autoRefresh: 5 * 60 * 1000,
            timestampUpdate: 60 * 1000,
            connectionCheck: 30 * 1000,
        },
    };

    // Freeze to prevent accidental changes
    Object.freeze(CONFIG);

    // Expose globally
    if (typeof window !== "undefined") {
        window.CONFIG = CONFIG;
        window.SCAMSAFE_CONFIG = CONFIG;
    }

    console.log(
        `${CONFIG.app.name} v${CONFIG.app.version} - Config loaded, backend=${BACKEND_BASE}`
    );
})();