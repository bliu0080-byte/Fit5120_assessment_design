// =============================
// ScamSafe - Dynamic Stats Updater
// =============================

// Start date: 1 September 2025 00:00:00
const START_DATE = new Date("2025-09-01T00:00:00Z");

// Initial base figure (starting value as at 1 September)
const AU_LOSS_BASE = 238_000_000;      // AU$ loss base
const WORLD_VICTIMS_BASE = 405_333_336; // 全Base number of ball victims

// 增长速率
const AU_LOSS_RATE = 12;      // A$12 per second increase
const WORLD_VICTIMS_RATE = 19; // 19 per second

// Formatting (with thousandths separator)
const nf = new Intl.NumberFormat("en-US");

function updateStats() {
    const now = Date.now();
    const elapsedSeconds = (now - START_DATE.getTime()) / 1000;

    const currentLoss = Math.floor(AU_LOSS_BASE + AU_LOSS_RATE * elapsedSeconds);
    const currentVictims = Math.floor(WORLD_VICTIMS_BASE + WORLD_VICTIMS_RATE * elapsedSeconds);

    // Update page elements
    const auElement = document.getElementById("au-amount");
    const worldElement = document.getElementById("world-victims");

    if (auElement) auElement.innerHTML = nf.format(currentLoss);
    if (worldElement) worldElement.innerHTML = nf.format(currentVictims);

    requestAnimationFrame(updateStats);
}

// activate (a plan)
document.addEventListener("DOMContentLoaded", updateStats);
