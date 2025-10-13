// =================== Navbar Responsive (Final Stable Version) ===================

// Anti-Shake + Initialisation Lock
let navInitialized = false;
let navResizeBound = false;
let resizeTimeout;
let lastAdjustTime = 0;

window.addEventListener("load", () => {
    if (navInitialized) return;
    navInitialized = true;

    adjustNav();

    if (!navResizeBound) {
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(adjustNav, 200);
        });
        navResizeBound = true;
    }
});

function adjustNav() {
    const now = Date.now();
    if (now - lastAdjustTime < 400) return; // Prevention of repeated calls within a short period of time
    lastAdjustTime = now;

    const nav = document.querySelector(".nav-links");
    if (!nav) return;

    const alwaysVisibleCount = 4;
    const items = Array.from(nav.querySelectorAll("li:not(.dropdown)"));
    const dropdown = nav.querySelector(".dropdown");
    const menu = dropdown?.querySelector(".dropdown-menu");
    const toggle = dropdown?.querySelector(".dropdown-toggle");
    if (!dropdown || !menu || !toggle) return;

    // ✅ Step 1: Clear the More menu
    menu.innerHTML = "";

    // ✅ Step 2: Restore all li's visibility
    items.forEach(item => item.style.display = "inline-block");

    // ✅ Step 3: Keep only the first 4, hide redundant items
    const overflowItems = items.slice(alwaysVisibleCount);

    // ✅ Step 4: Prevent duplicate clones (add only if clone does not already exist)
    overflowItems.forEach((item, index) => {
        item.style.display = "none";
        const id = item.textContent.trim();

        if (![...menu.children].some(c => c.textContent.trim() === id)) {
            const clone = item.cloneNode(true);
            clone.style.display = "block";
            clone.dataset.cloneSource = id; // Add Marker
            menu.appendChild(clone);
        }
    });

    // ✅ Step 5: Update button text and transparency
    const count = menu.children.length;
    toggle.textContent = count === 0 ? "More" : "More ▾";
    toggle.style.opacity = count === 0 ? 0.6 : 1;

    // ✅ Step 6: Console Printing
    if (!window.__navLoggedOnce) {
        console.log("✅ Navbar initialized (overflow:", count, ")");
        window.__navLoggedOnce = true;
    }
}