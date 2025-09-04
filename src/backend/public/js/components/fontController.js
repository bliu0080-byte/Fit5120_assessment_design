// js/components/fontController.js
(() => {
    // --- constants ---
    const LS_KEY = 'scamsafe_font_scale';
    const SCALES = { small: 1.0, normal: 1.2, large: 1.3 }; // 你可微调

    // --- helpers ---
    function applyScale(scale) {
        // Use CSS variables to control root font size (more stable, affects rem)
        document.documentElement.style.setProperty('--fs-scale', String(scale || 1));
        // High contrast or extreme browser pockets
        document.documentElement.style.fontSize = `calc(16px * var(--fs-scale, 1))`;
    }

    function saveScale(scale) {
        try { localStorage.setItem(LS_KEY, String(scale)); } catch {}
    }

    function loadScale() {
        const v = Number(localStorage.getItem(LS_KEY));
        return Number.isFinite(v) && v > 0 ? v : 1;
    }

    function setActive(btns, key) {
        btns.forEach(b => b.classList.toggle('active', b.dataset.size === key));
    }

    // --- init when DOM ready ---
    document.addEventListener('DOMContentLoaded', () => {
        const container = document.querySelector('.font-controls');
        if (!container) return;

        const btns = Array.from(container.querySelectorAll('.font-btn'));
        if (!btns.length) return;

        // 读取与应用上次选择
        const lastScale = loadScale();
        applyScale(lastScale);
// Setting the button activation state
        const currentKey =
            Object.entries(SCALES).find(([, v]) => Math.abs(v - lastScale) < 0.001)?.[0] || 'normal';
        setActive(btns, currentKey);

        // Binding Click
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.size; // 'small' | 'normal' | 'large'
                const scale = SCALES[key] ?? 1;
                applyScale(scale);
                saveScale(scale);
                setActive(btns, key);
            });
        });
    });
})();