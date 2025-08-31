/**
 * Insights Page Controller
 * - Loads static insights JSON for guaranteed content
 * - Attempts live threat feed from open APIs (CORS permitting)
 * - Caches responses in localStorage with TTL
 */
(function () {
  const CONFIG = window.SCAMSAFE_CONFIG || window.CONFIG || {};
  const Utils = window.ScamSafeUtils || window.Utils;

  const STATE = {
    data: null,
    containers: {},
  };

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheContainers();
    renderSkeleton();

    try {
      await loadStaticInsights();
      renderInsights(STATE.data);
    } catch (e) {
      console.error('Failed to load static insights:', e);
      showInlineError('insights', 'Unable to load insights data');
    }
  }

  function cacheContainers() {
    STATE.containers.metrics = document.getElementById('insight-metrics');
    STATE.containers.topScams = document.getElementById('insight-top-scams');
    STATE.containers.trends = document.getElementById('insight-trends');
  }

  function renderSkeleton() {
    const { metrics, topScams, trends } = STATE.containers;
    if (metrics) metrics.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Loading insights...</p></div>';
    if (topScams) topScams.innerHTML = '';
    if (trends) trends.innerHTML = '';
  }

  async function loadStaticInsights() {
    const res = await Utils.network.request('./assets/data/insights.json');
    const data = await res.json();
    STATE.data = data;
    return data;
  }

  async function loadLiveFeedWithCache() {
    const cached = Utils.storage.get(FEED_CACHE_KEY, null);
    const now = Date.now();
    if (cached && cached.expires > now) {
      return cached.data;
    }

    // Try PhishStats (no key). Note: may be blocked by CORS.
    const url = 'https://phishstats.info:2096/api/phishing?_sort=-date&_page=1&limit=10';
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('Feed HTTP error ' + res.status);
    const list = await res.json();

    const normalized = list.map((item) => ({
      id: item._id || item.id || Utils.string.random(8),
      date: item.date || item.created || new Date().toISOString(),
      target: item.target || item.brand || 'Unknown target',
      url: item.url || item.hostname || '',
      type: 'phishing',
      risk: 'high'
    }));

    Utils.storage.set(FEED_CACHE_KEY, { data: normalized, expires: now + FEED_CACHE_TTL });
    return normalized;
  }

  function renderInsights(data) {
    if (!data) return;
    renderMetrics(data.metrics, data.lastUpdated, data);
    renderTopScamTypes(data.topScamTypes);
    renderMonthlyTrends(data.monthly);
  }

  function formatNumber(n) {
    try { return new Intl.NumberFormat('en-US').format(n); } catch { return String(n); }
  }

  function renderMetrics(metrics = {}, lastUpdated, fullData = {}) {
    const el = STATE.containers.metrics;
    if (!el) return;
    const periodLabel = getPeriodLabel(fullData);
    const fx = getCurrency(fullData);

    const lossesAUD = toAUD(metrics.lossesUSD, fx);
    const avgLossAUD = toAUD(metrics.avgLossPerVictimUSD, fx);

    const items = [
      { label: 'Global Victims (est.)', value: formatNumber(metrics.globalVictims), icon: 'fa-users', badge: 'warning' },
      { label: 'Economic Losses (AUD)', value: formatCurrency(avgOr(lossesAUD, 0), fx.target), icon: 'fa-sack-dollar', badge: 'critical' },
      { label: 'YoY Growth', value: Math.round((metrics.yoyGrowth || 0) * 100) + '%', icon: 'fa-chart-line', badge: 'danger' },
      { label: 'Avg Loss per Victim (AUD)', value: formatCurrency(avgOr(avgLossAUD, 0), fx.target), icon: 'fa-triangle-exclamation', badge: 'high' }
    ];

    const updated = lastUpdated ? `Last updated ${Utils.date.timeAgo(lastUpdated)}` : '';
    const conversionNote = fx.rate ? `1 ${fx.base} = ${fx.rate} ${fx.target}` : '';

    el.innerHTML = `
      <div class="section-header">
        <h2 class="section-title"><i class="fa-solid fa-bolt"></i> Key Impact Metrics</h2>
        <div class="last-updated">
          <i class="fas fa-clock"></i><span>${updated}</span>
          ${periodLabel ? `<span style="margin-left:12px"><i class=\"fa-regular fa-calendar\"></i> ${periodLabel}</span>` : ''}
          ${conversionNote ? `<span style="margin-left:12px; color: var(--text-muted);"><i class=\"fa-solid fa-arrow-right-arrow-left\"></i> ${conversionNote}</span>` : ''}
        </div>
      </div>
      <div class="alerts-grid">
        ${items.map(m => `
          <div class="card">
            <div class="card-content">
              <div class="card-title"><i class="fa-solid ${m.icon}"></i> ${m.value}</div>
              <div class="card-description">${m.label}</div>
              ${periodLabel ? `<div style="color: var(--text-muted); font-size: .8rem; margin-top: 6px;"><i class=\"fa-regular fa-calendar\"></i> Period: ${periodLabel}</div>` : ''}
              <span class="badge badge-${m.badge}">${m.label.includes('Loss') ? 'Losses' : 'Risk'}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function getPeriodLabel(data) {
    if (!data) return '';
    if (data.period && data.period.label) return data.period.label;
    const series = Array.isArray(data.monthly) ? data.monthly : [];
    if (!series.length) return '';
    const first = series[0]?.month;
    const last = series[series.length - 1]?.month;
    if (!first || !last) return '';
    const [fy, fm] = first.split('-').map(Number);
    const [ly, lm] = last.split('-').map(Number);
    const fDate = new Date(fy, (fm || 1) - 1, 1);
    const lDate = new Date(ly, (lm || 1) - 1, 1);
    const fMon = fDate.toLocaleString('en-US', { month: 'short' });
    const lMon = lDate.toLocaleString('en-US', { month: 'short' });
    if (fy === ly) return `${fMon}–${lMon} ${fy}`;
    return `${fMon} ${fy} – ${lMon} ${ly}`;
  }

  function getCurrency(data) {
    const defaultFx = { base: 'USD', target: 'AUD', rate: 1, asOf: '' };
    if (!data || !data.currency) return defaultFx;
    const c = data.currency;
    return {
      base: c.base || 'USD',
      target: c.target || 'AUD',
      rate: typeof c.rate === 'number' && c.rate > 0 ? c.rate : 1,
      asOf: c.asOf || ''
    };
  }

  function toAUD(valueUSD, fx) {
    if (typeof valueUSD !== 'number') return null;
    const rate = fx && typeof fx.rate === 'number' ? fx.rate : 1;
    return valueUSD * rate;
  }

  function formatCurrency(amount, code = 'AUD') {
    try {
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: code,
        maximumFractionDigits: amount >= 1000 ? 0 : 2
      }).format(amount);
    } catch {
      return `${code} ${formatNumber(Math.round(amount))}`;
    }
  }

  function avgOr(value, fallback) {
    return typeof value === 'number' && !Number.isNaN(value) ? value : fallback;
  }

  function renderTopScamTypes(items = []) {
    const el = STATE.containers.topScams;
    if (!el) return;
    const max = Math.max(1, ...items.map(i => i.count || 0));

    el.innerHTML = `
      <div class="section-header">
        <h2 class="section-title"><i class="fa-solid fa-skull-crossbones"></i> Top Scam Types</h2>
      </div>
      <div class="card">
        <div class="card-content">
          ${items.map(i => `
            <div class="bar-row" style="margin: 10px 0;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px; color: var(--text-secondary); font-size: .9rem;">
                <span>${i.label}</span>
                <span>${formatNumber(i.count)}</span>
              </div>
              <div style="background: rgba(59,130,246,.15); border-radius: 10px; overflow: hidden; height: 12px;">
                <div style="width: ${(i.count / max) * 100}%; height: 100%; background: var(--secondary-blue);"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderMonthlyTrends(series = []) {
    const el = STATE.containers.trends;
    if (!el || !series.length) return;

    // Build a tiny sparkline-like chart using CSS grid
    const months = series.map(s => s.month.slice(5));
    const totals = series.map(s => (s.investment + s.sms + s.email + s.phone + (s.social || 0)));
    const max = Math.max(...totals);

    const bars = totals.map(v => `<div title="${v}" style="height:${Math.max(6, Math.round((v / max) * 80))}px; background: var(--warning); border-radius: 4px 4px 0 0;"></div>`).join('');

    el.innerHTML = `
      <div class="section-header">
        <h2 class="section-title"><i class="fa-solid fa-wave-square"></i> Monthly Incident Trend</h2>
      </div>
      <div class="card">
        <div class="card-content">
          <div style="display:grid; grid-template-columns: repeat(${months.length}, 1fr); align-items:end; gap:8px; height: 120px;">${bars}</div>
          <div style="display:grid; grid-template-columns: repeat(${months.length}, 1fr); gap:8px; margin-top:8px; color: var(--text-muted); font-size:.8rem;">
            ${months.map(m => `<div style="text-align:center">${m}</div>`).join('')}
          </div>
          <p class="card-description" style="margin-top:12px;">
            Tip: Spikes often coincide with salary days and weekends. Be extra cautious during these windows.
          </p>
        </div>
      </div>
    `;
  }

  // Live feed and sources have been removed per requirements.

  function showInlineError(section, message) {
    const el = STATE.containers[section];
    if (!el) return;
    el.innerHTML = `<div class="error-container"><div class="error-message"><i class="fas fa-exclamation-triangle"></i><p>${message}</p></div></div>`;
  }
})();
