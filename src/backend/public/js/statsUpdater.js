// statsUpdater.js —— 平滑动画版（金额 + 人数）

// 初始基数
const AU_LOSS_BASE = 238_000_000;
const WORLD_VICTIMS_BASE = 405_333_336;

// 每秒增长速率
const AU_LOSS_RATE = 12;    // 每秒 +12 澳元
const WORLD_VICTIMS_RATE = 19; // 每秒 +19 人

// 记录页面加载时间
const startTime = Date.now();

// 千分位格式化（不带 AU$，前缀在 HTML 写死）
const nf = new Intl.NumberFormat('en-US');

// Update function (smoothed version)
function updateStats() {
    const now = Date.now();
    const elapsedSeconds = (now - startTime) / 1000; // 精确到小数秒

    // real time value
    const currentLoss = Math.floor(AU_LOSS_BASE + AU_LOSS_RATE * elapsedSeconds);
    const currentVictims = Math.floor(WORLD_VICTIMS_BASE + WORLD_VICTIMS_RATE * elapsedSeconds);

    // Updating the DOM
    const auEl = document.getElementById("au-amount");
    const victimsEl = document.getElementById("world-victims");

    if (auEl) auEl.innerHTML = nf.format(currentLoss);
    if (victimsEl) victimsEl.innerHTML = nf.format(currentVictims);

    requestAnimationFrame(updateStats); // 持续更新
}

//activate (a plan)
requestAnimationFrame(updateStats);