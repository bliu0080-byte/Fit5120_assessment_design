// =============================
// ScamSafe - Dynamic Stats Updater
// =============================

// 起始日期：2025年9月1日 00:00:00
const START_DATE = new Date("2025-09-01T00:00:00Z");

// 初始基数（9月1日的起点数值）
const AU_LOSS_BASE = 238_000_000;      // AU$ 损失基数
const WORLD_VICTIMS_BASE = 405_333_336; // 全球受害人数基数

// 增长速率
const AU_LOSS_RATE = 12;      // 每秒增加12澳元
const WORLD_VICTIMS_RATE = 19; // 每秒增加19人

// 格式化（带千分位分隔符）
const nf = new Intl.NumberFormat("en-US");

function updateStats() {
    const now = Date.now();
    const elapsedSeconds = (now - START_DATE.getTime()) / 1000;

    const currentLoss = Math.floor(AU_LOSS_BASE + AU_LOSS_RATE * elapsedSeconds);
    const currentVictims = Math.floor(WORLD_VICTIMS_BASE + WORLD_VICTIMS_RATE * elapsedSeconds);

    // 更新页面元素
    const auElement = document.getElementById("au-amount");
    const worldElement = document.getElementById("world-victims");

    if (auElement) auElement.innerHTML = nf.format(currentLoss);
    if (worldElement) worldElement.innerHTML = nf.format(currentVictims);

    requestAnimationFrame(updateStats);
}

// 启动
document.addEventListener("DOMContentLoaded", updateStats);
