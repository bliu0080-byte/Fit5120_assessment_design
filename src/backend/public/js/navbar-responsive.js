// =================== Navbar Responsive (Final Stable Version) ===================

// 防抖 + 初始化锁
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
    if (now - lastAdjustTime < 400) return; // 防短时间内重复调用
    lastAdjustTime = now;

    const nav = document.querySelector(".nav-links");
    if (!nav) return;

    const alwaysVisibleCount = 4;
    const items = Array.from(nav.querySelectorAll("li:not(.dropdown)"));
    const dropdown = nav.querySelector(".dropdown");
    const menu = dropdown?.querySelector(".dropdown-menu");
    const toggle = dropdown?.querySelector(".dropdown-toggle");
    if (!dropdown || !menu || !toggle) return;

    // ✅ Step 1: 清空 More 菜单
    menu.innerHTML = "";

    // ✅ Step 2: 恢复所有 li 的可见状态
    items.forEach(item => item.style.display = "inline-block");

    // ✅ Step 3: 只保留前 4 个，隐藏多余项
    const overflowItems = items.slice(alwaysVisibleCount);

    // ✅ Step 4: 防止重复克隆 (仅当 clone 尚未存在时添加)
    overflowItems.forEach((item, index) => {
        item.style.display = "none";
        const id = item.textContent.trim();

        if (![...menu.children].some(c => c.textContent.trim() === id)) {
            const clone = item.cloneNode(true);
            clone.style.display = "block";
            clone.dataset.cloneSource = id; // 添加标记
            menu.appendChild(clone);
        }
    });

    // ✅ Step 5: 更新按钮文字与透明度
    const count = menu.children.length;
    toggle.textContent = count === 0 ? "More" : "More ▾";
    toggle.style.opacity = count === 0 ? 0.6 : 1;

    // ✅ Step 6: 控制台打印（仅首次）
    if (!window.__navLoggedOnce) {
        console.log("✅ Navbar initialized (overflow:", count, ")");
        window.__navLoggedOnce = true;
    }
}