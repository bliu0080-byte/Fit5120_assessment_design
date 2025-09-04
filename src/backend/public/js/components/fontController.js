// js/components/fontController.js
(() => {
    const LS_KEY = 'scamsafe_font_scale';
    const SCALES = { small: 1.0, normal: 1.2, large: 1.3 }; // you can tweak

    function applyScale(scale) {
        document.documentElement.style.setProperty('--fs-scale', String(scale || 1));
        document.documentElement.style.fontSize = `calc(16px * var(--fs-scale, 1))`;
    }
    function saveScale(scale) {
        try { localStorage.setItem(LS_KEY, String(scale)); } catch {}
    }
    function loadScale() {
        const v = Number(localStorage.getItem(LS_KEY));
        return Number.isFinite(v) && v > 0 ? v : null; // null means "not set yet"
    }
    function setActive(btns, key) {
        btns.forEach(b => b.classList.toggle('active', b.dataset.size === key));
    }

    document.addEventListener('DOMContentLoaded', () => {
        const container = document.querySelector('.font-controls');
        if (!container) { console.warn('[font] .font-controls not found'); return; }

        const btns = Array.from(container.querySelectorAll('.font-btn'));
        if (!btns.length) { console.warn('[font] .font-btn not found'); return; }

        // default to SCALES.normal on first load
        const stored = loadScale();
        const initialScale = stored ?? SCALES.normal;
        applyScale(initialScale);

        const initialKey =
            Object.entries(SCALES).find(([, v]) => Math.abs(v - initialScale) < 0.001)?.[0] || 'normal';
        setActive(btns, initialKey);

        console.log('[font] init scale =', initialScale, 'key =', initialKey);

        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.size; // 'small' | 'normal' | 'large'
                const scale = SCALES[key] ?? SCALES.normal;
                applyScale(scale);
                saveScale(scale);
                setActive(btns, key);
                console.log('[font] set', key, scale);
            });
        });
    });
})();