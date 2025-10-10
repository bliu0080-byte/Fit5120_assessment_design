// =================== 防重复 + 防抖 ===================
let navResizeBound = false;
let resizeTimeout;

window.addEventListener("load", () => {
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
    const nav = document.querySelector(".nav-links");
    if (!nav) return;

    const alwaysVisibleCount = 4;
    const items = Array.from(nav.querySelectorAll("li:not(.dropdown)"));
    const dropdown = nav.querySelector(".dropdown");
    const menu = dropdown?.querySelector(".dropdown-menu");
    if (!dropdown || !menu) return;

    dropdown.style.display = "inline-block";
    menu.innerHTML = "";

    items.forEach((item, i) => {
        if (i < alwaysVisibleCount) {
            item.style.display = "inline-block";
        } else {
            item.style.display = "none";
            const clone = item.cloneNode(true);
            clone.style.display = "block";
            menu.appendChild(clone);
        }
    });

    const toggle = dropdown.querySelector(".dropdown-toggle");
    if (menu.children.length === 0) {
        toggle.textContent = "More";
        toggle.style.opacity = 0.6;
    } else {
        toggle.textContent = "More ▾";
        toggle.style.opacity = 1;
    }

    console.log("✅ More items generated:", menu.children.length);
}