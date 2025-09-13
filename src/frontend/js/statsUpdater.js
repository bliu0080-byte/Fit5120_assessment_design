// statsUpdater.js —— 基于绝对时间（从 2025-09-01 开始累积）

// 基准值（2025-09-01 00:00:00 的数据）
const AU_LOSS_BASE = 238_000_000;
const WORLD_VICTIMS_BASE = 405_333_336;

// 每秒增长速率
const AU_LOSS_RATE = 12;    // 每秒 +12 澳元
const WORLD_VICTIMS_RATE = 19; // 每秒 +19 人

// 固定起始时间（UTC 时间，注意时区问题）
const BASE_DATE = new Date("2025-09-01T00:00:00Z").getTime();

// 千分位格式化
const nf = new Intl.NumberFormat('en-US');

// Update function
function updateStats() {
    const now = Date.now();
    const elapsedSeconds = (now - BASE_DATE) / 1000; // 距离基准时间的秒数

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

// activate
requestAnimationFrame(updateStats);
