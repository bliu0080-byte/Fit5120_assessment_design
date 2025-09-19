/**
 * Insights Page Renderer
 * Loads JSON data from assets/data/insights and renders KPIs and breakdowns.
 * Map visuals intentionally omitted per scope; focuses on data views only.
 */
(function () {
  const utils = window.ScamSafeUtils || window.Utils || {
    dom: {
      select: (s, c = document) => c.querySelector(s),
      create(tag, attrs = {}, html = '') {
        const el = document.createElement(tag);
        Object.entries(attrs).forEach(([k, v]) => {
          if (k === 'className') el.className = v;
          else if (k === 'dataset') Object.entries(v).forEach(([dk, dv]) => (el.dataset[dk] = dv));
          else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
          else el.setAttribute(k, v);
        });
        if (html) el.innerHTML = html;
        return el;
      },
    },
  };

  const numberFmt = new Intl.NumberFormat('en-US');
  const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const compactFmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
  const Y_SCALE_DEFAULT = 0.001; // compress by 1000x (thousands)
  const FIXED_SCALES = {
    monthly: { min: 0, max: 150, step: 25 },      // values are in thousands
    age:     { min: 0, max: 2000, step: 500 },    // values are in thousands
    cat:     { min: 0, max: 2000, step: 500 },    // values are in thousands
  };
  // Raw-value fixed scales (for Millions display)
  const FIXED_SCALES_RAW = {
    monthly: { min: 0, max: 200000, step: 50000 },   // raw counts: 0..200k
    age:     { min: 0, max: 2500000, step: 500000 }, // raw counts: 0..2.5M
    cat:     { min: 0, max: 2500000, step: 500000 }, // raw counts: 0..2.5M
  };
  let SCALE_MODE = 'k'; // 'k' or 'pct'
  let DATA = null; // cache datasets for re-render

  // Fixed chart pixel sizes to prevent stretching
  const CHART_SIZES = {
    line: { w: 900, h: 320 },
    bar:  { w: 900, h: 360 },
    pie:  { w: 520, h: 360 },
    lineS: { w: 440, h: 260 },
    barS:  { w: 440, h: 300 },
    pieS:  { w: 440, h: 300 },
  };

  // Color helpers (use darker/primary text color for better contrast)
  function getVar(name, fallback) {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (_) { return fallback; }
  }
  const GRAPH_TEXT_COLOR = getVar('--text-primary', '#e2e8f0');
  const GRID_COLOR = 'rgba(148,163,184,.15)';

  function createChartCanvas(kind = 'bar') {
    const size = CHART_SIZES[kind] || CHART_SIZES.bar;
    return utils.dom.create('canvas', { className: 'ins-chart', width: String(size.w), height: String(size.h) });
  }

  function renderTrackerGrid(root, monthly, modes, level2, ageGroups) {
    const sec = section('Scam Tracker', 'Key charts overview');
    const grid = utils.dom.create('div', { className: 'ins-tracker-grid' });

    // Helper to add a cell with a chart
    function cell(title, kind, build) {
      const c = utils.dom.create('div', { className: 'ins-grid-cell' });
      c.appendChild(utils.dom.create('h3', { className: 'ins-subtitle' }, title));
      const wrap = utils.dom.create('div', { className: 'ins-chart-wrap' });
      const canvas = createChartCanvas(kind);
      wrap.appendChild(canvas);
      c.appendChild(wrap);
      grid.appendChild(c);
      build(canvas.getContext('2d'));
    }

    // Monthly Reports (line)
    cell('Monthly Reports', 'lineS', (ctx) => {
      const sorted = monthly.slice().sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
      const last = sorted.slice(-24);
      const labels = last.map((d) => monthLabel(d.month));
      const raw = last.map((d) => d.reports);

      let data = [];
      let axis = {};
      if (SCALE_MODE === 'pct') {
        const max = Math.max(...raw) || 1;
        data = raw.map((v) => Math.round((v / max) * 100));
        axis = { min: 0, max: 100, step: 20, label: scaleTitle(), tickCb: (v) => `${v}%` };
      } else if (SCALE_MODE === 'm') {
        data = raw;
        const maxRaw = Math.max(...raw) || 1;
        const yMaxRaw = Math.ceil((maxRaw * 1.15) / 50_000) * 50_000;
        const step = Math.max(10_000, Math.round(yMaxRaw / 5));
        axis = { min: 0, max: yMaxRaw, step, label: scaleTitle(), tickCb: (v) => `${(v / 1_000_000).toFixed(2)}M` };
      } else {
        data = scaleValues(raw);
        const maxScaled = Math.max(...data) || 1;
        const yMaxK = Math.ceil((maxScaled * 1.15) / 10) * 10;
        const step = Math.max(1, Math.round(yMaxK / 5));
        axis = { min: 0, max: yMaxK, step, label: scaleTitle(), tickCb: (v) => `${numberFmt.format(Math.round(v))}k` };
      }

      new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Reports', data, borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,.25)', tension: 0.25, pointRadius: 2, pointHoverRadius: 6, pointHitRadius: 10, pointHoverBackgroundColor: '#60a5fa', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2, fill: true }] },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          animation: { duration: 0 },
          plugins: { legend: { display: true, labels: { color: GRAPH_TEXT_COLOR } }, tooltip: { mode: 'index', intersect: false, callbacks: { label: (ctx) => formatTooltipValue(ctx.raw) } } },
          scales: {
            x: { ticks: { color: GRAPH_TEXT_COLOR }, grid: { color: GRID_COLOR } },
            y: { type: 'linear', beginAtZero: true, min: axis.min, max: axis.max, bounds: 'ticks', grace: 0, ticks: { color: GRAPH_TEXT_COLOR, stepSize: axis.step, count: 6, precision: 0, maxTicksLimit: 6, callback: axis.tickCb }, grid: { color: GRID_COLOR }, title: { display: true, text: axis.label, color: GRAPH_TEXT_COLOR } },
          },
        },
      });
    });

    // Reports by Contact Mode (pie)
    cell('Reports by Contact Mode', 'pieS', (ctx) => {
      const sorted = modes.slice().sort((a, b) => b.reports - a.reports);
      const top = sorted.slice(0, 7);
      const others = sorted.slice(7);
      const othersSum = others.reduce((s, d) => s + d.reports, 0);
      if (othersSum > 0) top.push({ mode: 'Others', reports: othersSum });
      const labels = top.map((d) => d.mode);
      const values = top.map((d) => d.reports);
      const colors = ['#60a5fa','#c084fc','#34d399','#f472b6','#f59e0b','#38bdf8','#a3e635','#fb7185','#22d3ee','#fbbf24'];
      new Chart(ctx, {
        type: 'pie',
        data: { labels, datasets: [{ data: values, backgroundColor: colors.slice(0, values.length), hoverOffset: 10 }] },
        options: { responsive: false, maintainAspectRatio: true, plugins: { legend: { position: 'right', labels: { color: GRAPH_TEXT_COLOR } }, tooltip: { callbacks: { label: (c) => `${c.label}: ${numberFmt.format(c.parsed)} (${(c.parsed / values.reduce((s,x)=>s+x,0) * 100).toFixed(1)}%)` } } } },
      });
    });

    // Top Categories (bar)
    cell('Top Categories', 'barS', (ctx) => {
      const top = level2.slice().sort((a, b) => b.reports - a.reports).slice(0, 10);
      const labels = top.map((d) => d.category);
      const raw = top.map((d) => d.reports);
      let values = [];
      let axis = {};
      if (SCALE_MODE === 'pct') {
        const max = Math.max(...raw) || 1;
        values = raw.map((v) => Math.round((v / max) * 100));
        axis = { min: 0, max: 100, step: 20, label: scaleTitle(), tickCb: (v) => `${v}%` };
      } else if (SCALE_MODE === 'm') {
        values = raw;
        const max = Math.max(...raw) || 1;
        const yMax = Math.ceil((max * 1.15) / 500_000) * 500_000;
        const step = Math.max(100_000, Math.round(yMax / 5));
        axis = { min: 0, max: yMax, step, label: scaleTitle(), tickCb: (v) => `${(v / 1_000_000).toFixed(1)}M` };
      } else {
        values = scaleValues(raw);
        const max = Math.max(...values) || 1;
        const yMax = Math.ceil((max * 1.15) / 100) * 100;
        const step = Math.max(10, Math.round(yMax / 5));
        axis = { min: 0, max: yMax, step, label: scaleTitle(), tickCb: (v) => `${numberFmt.format(Math.round(v))}k` };
      }

      new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Reports', data: values, backgroundColor: '#60a5fa', hoverBackgroundColor: '#93c5fd', hoverBorderColor: '#ffffff55', hoverBorderWidth: 1 }] },
        options: { responsive: false, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: GRAPH_TEXT_COLOR }, grid: { display: false } }, y: { type: 'linear', beginAtZero: true, min: axis.min, max: axis.max, bounds: 'ticks', ticks: { color: GRAPH_TEXT_COLOR, stepSize: axis.step, callback: axis.tickCb }, grid: { color: GRID_COLOR }, title: { display: true, text: axis.label, color: GRAPH_TEXT_COLOR } } } },
      });
    });

    // Reports by Age Group (bar)
    cell('Reports by Age Group', 'barS', (ctx) => {
      const labels = ageGroups.map((d) => d.age);
      const raw = ageGroups.map((d) => d.reports);
      let values = [];
      let axis = {};
      if (SCALE_MODE === 'pct') {
        const max = Math.max(...raw) || 1;
        values = raw.map((v) => Math.round((v / max) * 100));
        axis = { min: 0, max: 100, step: 20, label: scaleTitle(), tickCb: (v) => `${v}%` };
      } else if (SCALE_MODE === 'm') {
        values = raw;
        const max = Math.max(...raw) || 1;
        const yMax = Math.ceil((max * 1.15) / 500_000) * 500_000;
        const step = Math.max(100_000, Math.round(yMax / 5));
        axis = { min: 0, max: yMax, step, label: scaleTitle(), tickCb: (v) => `${(v / 1_000_000).toFixed(1)}M` };
      } else {
        values = scaleValues(raw);
        const max = Math.max(...values) || 1;
        const yMax = Math.ceil((max * 1.15) / 100) * 100;
        const step = Math.max(10, Math.round(yMax / 5));
        axis = { min: 0, max: yMax, step, label: scaleTitle(), tickCb: (v) => `${numberFmt.format(Math.round(v))}k` };
      }

      new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Reports', data: values, backgroundColor: '#3b82f6', hoverBackgroundColor: '#60a5fa', hoverBorderColor: '#ffffff55', hoverBorderWidth: 1 }] },
        options: { responsive: false, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: GRAPH_TEXT_COLOR }, grid: { display: false } }, y: { type: 'linear', beginAtZero: true, min: axis.min, max: axis.max, bounds: 'ticks', ticks: { color: GRAPH_TEXT_COLOR, stepSize: axis.step, callback: axis.tickCb }, grid: { color: GRID_COLOR }, title: { display: true, text: axis.label, color: GRAPH_TEXT_COLOR } } } },
      });
    });

    sec.appendChild(grid);
    root.appendChild(sec);
  }

  async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
  }

  function section(titleText, subtitleText) {
    const sectionEl = utils.dom.create('section', { className: 'ins-section' });
    const header = utils.dom.create('div', { className: 'ins-section-header' });
    header.appendChild(utils.dom.create('h2', { className: 'section-title' }, titleText));
    if (subtitleText) header.appendChild(utils.dom.create('p', { className: 'section-subtitle' }, subtitleText));
    sectionEl.appendChild(header);
    return sectionEl;
  }

  function kpiCard(label, value, accent = '') {
    const card = utils.dom.create('div', { className: 'ins-kpi-card' });
    const val = utils.dom.create('div', { className: `ins-kpi-value ${accent}` }, value);
    const lab = utils.dom.create('div', { className: 'ins-kpi-label' }, label);
    card.appendChild(val);
    card.appendChild(lab);
    return card;
  }

  function barList(items, opts = {}) {
    const { labelKey = 'label', valueKey = 'value', maxValue, showPercent = false } = opts;
    const container = utils.dom.create('div', { className: 'ins-bar-list' });
    const max = maxValue ?? Math.max(...items.map((d) => d[valueKey] || 0), 1);
    const total = items.reduce((s, d) => s + (d[valueKey] || 0), 0) || 1;

    items.forEach((d) => {
      const row = utils.dom.create('div', { className: 'ins-bar-row' });
      const label = utils.dom.create('div', { className: 'ins-bar-label', title: d[labelKey] }, d[labelKey]);
      const barWrap = utils.dom.create('div', { className: 'ins-bar-wrap', role: 'img', 'aria-label': `${d[labelKey]}: ${numberFmt.format(d[valueKey] || 0)}` });
      const widthPct = ((d[valueKey] || 0) / max) * 100;
      const bar = utils.dom.create('div', { className: 'ins-bar', style: { width: `${widthPct}%` } });
      barWrap.appendChild(bar);
      const value = utils.dom.create('div', { className: 'ins-bar-value' }, showPercent ? `${((d[valueKey] || 0) / total * 100).toFixed(1)}%` : numberFmt.format(d[valueKey] || 0));
      row.appendChild(label);
      row.appendChild(barWrap);
      row.appendChild(value);
      container.appendChild(row);
    });
    return container;
  }

  function monthLabel(iso) {
    const [y, m] = iso.split('-').map((x) => parseInt(x, 10));
    const dt = new Date(y, m - 1, 1);
    return dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }

  // Removed log scale toggle for simplicity and consistency

  // Axis helpers to keep stable ranges (avoid auto-rescaling each update)
  function pow10Floor(n) {
    if (n <= 1) return 1;
    const p = Math.floor(Math.log10(n));
    return 10 ** p;
  }

  function pow10Ceil(n) {
    if (n <= 1) return 10;
    const p = Math.ceil(Math.log10(n));
    return 10 ** p;
  }

  function roundNice(n) {
    // Round to a nice number for linear max
    const magn = 10 ** Math.floor(Math.log10(n));
    const norm = n / magn;
    let nice;
    if (norm <= 1) nice = 1;
    else if (norm <= 2) nice = 2;
    else if (norm <= 5) nice = 5;
    else nice = 10;
    return nice * magn;
  }

  function niceStep(maxValue, targetTicks = 5) {
    if (maxValue <= 0) return 1;
    const rough = maxValue / targetTicks;
    const magn = 10 ** Math.floor(Math.log10(rough));
    const norm = rough / magn;
    let step;
    if (norm <= 1) step = 1;
    else if (norm <= 2) step = 2;
    else if (norm <= 5) step = 5;
    else step = 10;
    return step * magn;
  }

  function scaleValues(arr, factor = Y_SCALE_DEFAULT) {
    return arr.map((v) => (typeof v === 'number' ? v * factor : v));
  }

  function scaleUnit() {
    const denom = Math.round(1 / Y_SCALE_DEFAULT);
    if (denom === 1000) return 'k';
    if (denom === 1000000) return 'M';
    return `÷${denom}`;
  }

  function scaleTitle() {
    if (SCALE_MODE === 'pct') return 'Reports (% of peak)';
    if (SCALE_MODE === 'm') return 'Reports (millions)';
    const denom = Math.round(1 / Y_SCALE_DEFAULT);
    if (denom === 1000) return 'Reports (thousands)';
    if (denom === 1000000) return 'Reports (millions)';
    return `Reports (÷${denom})`;
  }

  function formatTooltipValue(val) {
    if (SCALE_MODE === 'pct') {
      return `${val}%`;
    }
    if (SCALE_MODE === 'm') {
      return `Reports: ${numberFmt.format(val)} (${(val / 1_000_000).toFixed(2)}M)`;
    }
    // Thousands mode (scaled data)
    const original = Math.round(val / Y_SCALE_DEFAULT);
    const scaled = Math.round(val);
    const unit = scaleUnit();
    const scaledText = unit.startsWith('÷') ? compactFmt.format(scaled) : `${numberFmt.format(scaled)}${unit}`;
    return `Reports: ${numberFmt.format(original)} (${scaledText})`;
  }

  function alignMax(maxValue, step) {
    if (!step || step <= 0) return maxValue;
    return Math.ceil(maxValue / step) * step;
  }

  // Helpers to compute deltas for monthly series
  function getLatestMonthly(series) {
    const sorted = series.slice().sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const priorYear = sorted.find((x) => x.month === addYears(last.month, -1));
    return { last, prev, priorYear };
  }

  function addYears(isoYYYYMM, deltaYears) {
    const [y, m] = isoYYYYMM.split('-').map((x) => parseInt(x, 10));
    return `${y + deltaYears}-${String(m).padStart(2, '0')}`;
  }

  function pctChange(newVal, oldVal) {
    if (!oldVal || oldVal === 0) return null;
    return ((newVal - oldVal) / oldVal) * 100;
  }

  function renderSummary(root, kpis, monthly, states, level3) {
    const { last, prev, priorYear } = getLatestMonthly(monthly);
    const lastMonthLabel = monthLabel(last.month);
    const momLoss = pctChange(last.loss, prev && prev.loss);
    const yoyLoss = pctChange(last.loss, priorYear && priorYear.loss);
    const momRep = pctChange(last.reports, prev && prev.reports);
    const yoyRep = pctChange(last.reports, priorYear && priorYear.reports);

    const topState = states.slice().sort((a, b) => b.reports - a.reports)[0];
    const topType = level3.slice().sort((a, b) => b.reports - a.reports)[0];

    const sec = section('Latest Alert', `Last Update: ${kpis?.period_end || last.month}`);
    const grid = utils.dom.create('div', { className: 'ins-summary-grid' });

    // High Risk State
    const stateCard = utils.dom.create('div', { className: 'ins-card' });
    stateCard.appendChild(utils.dom.create('div', { className: 'ins-card-title' }, 'High Risk State'));
    stateCard.appendChild(utils.dom.create('div', { className: 'ins-card-main' }, topState ? topState.state : '—'));
    stateCard.appendChild(utils.dom.create('div', { className: 'ins-card-sub' }, topState ? `${numberFmt.format(topState.reports)} reports` : 'No data'));

    // High Risk Scam Type
    const typeCard = utils.dom.create('div', { className: 'ins-card' });
    typeCard.appendChild(utils.dom.create('div', { className: 'ins-card-title' }, 'High Risk Scam Type'));
    typeCard.appendChild(utils.dom.create('div', { className: 'ins-card-main' }, topType ? topType.category : '—'));
    typeCard.appendChild(utils.dom.create('div', { className: 'ins-card-sub' }, topType ? `${numberFmt.format(topType.reports)} reports` : 'No data'));

    // Monthly Scam Lost
    const lossCard = utils.dom.create('div', { className: 'ins-card' });
    lossCard.appendChild(utils.dom.create('div', { className: 'ins-card-title' }, `Monthly Scam Lost (${lastMonthLabel})`));
    lossCard.appendChild(utils.dom.create('div', { className: 'ins-card-main' }, currencyFmt.format(last.loss)));
    const lossDelta = utils.dom.create('div', { className: 'ins-card-sub' });
    const momTxt = momLoss == null ? 'MoM: n/a' : `MoM: ${(momLoss >= 0 ? '+' : '') + momLoss.toFixed(1)}%`;
    const yoyTxt = yoyLoss == null ? 'YoY: n/a' : `YoY: ${(yoyLoss >= 0 ? '+' : '') + yoyLoss.toFixed(1)}%`;
    lossDelta.textContent = `${momTxt} • ${yoyTxt}`;
    lossCard.appendChild(lossDelta);

    // Number of Report
    const repCard = utils.dom.create('div', { className: 'ins-card' });
    repCard.appendChild(utils.dom.create('div', { className: 'ins-card-title' }, `Number of Report (${lastMonthLabel})`));
    repCard.appendChild(utils.dom.create('div', { className: 'ins-card-main' }, numberFmt.format(last.reports)));
    const repDelta = utils.dom.create('div', { className: 'ins-card-sub' });
    const momTxtR = momRep == null ? 'MoM: n/a' : `MoM: ${(momRep >= 0 ? '+' : '') + momRep.toFixed(1)}%`;
    const yoyTxtR = yoyRep == null ? 'YoY: n/a' : `YoY: ${(yoyRep >= 0 ? '+' : '') + yoyRep.toFixed(1)}%`;
    repDelta.textContent = `${momTxtR} • ${yoyTxtR}`;
    repCard.appendChild(repDelta);

    grid.appendChild(stateCard);
    grid.appendChild(typeCard);
    grid.appendChild(lossCard);
    grid.appendChild(repCard);

    sec.appendChild(grid);
    root.appendChild(sec);
  }

  function renderMonthly(root, monthly) {
    const sec = section('Monthly Reports', 'Reports over time (last 24 months)');
    const sorted = monthly
      .slice()
      .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
    const last = sorted.slice(-24);

    const labels = last.map((d) => monthLabel(d.month));
    const dataRaw = last.map((d) => d.reports);
    let data = [];
    let axis = {};
    if (SCALE_MODE === 'pct') {
      const max = Math.max(...dataRaw) || 1;
      data = dataRaw.map((v) => Math.round((v / max) * 100));
      axis = { min: 0, max: 100, step: 20, label: scaleTitle(), tickCb: (v) => `${v}%` };
    } else if (SCALE_MODE === 'm') {
      data = dataRaw;
      const maxRaw = Math.max(...dataRaw) || 1;
      const yMaxRaw = Math.ceil((maxRaw * 1.15) / 50_000) * 50_000; // round to nearest 50k above 115%
      const step = Math.max(10_000, Math.round(yMaxRaw / 5));
      axis = { min: 0, max: yMaxRaw, step, label: scaleTitle(), tickCb: (v) => `${(v / 1_000_000).toFixed(2)}M` };
    } else {
      data = scaleValues(dataRaw);
      const maxScaled = Math.max(...data) || 1; // thousands
      const yMaxK = Math.ceil((maxScaled * 1.15) / 10) * 10; // nearest 10k in thousands units
      const step = Math.max(1, Math.round(yMaxK / 5));
      axis = { min: 0, max: yMaxK, step, label: scaleTitle(), tickCb: (v) => `${numberFmt.format(Math.round(v))}k` };
    }

    const wrap = utils.dom.create('div', { className: 'ins-chart-wrap' });
    const canvas = createChartCanvas('line');
    wrap.appendChild(canvas);
    sec.appendChild(wrap);
    root.appendChild(sec);

    if (window.Chart) {
      const ctx = canvas.getContext('2d');
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Reports',
            data,
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96,165,250,.25)',
            tension: 0.25,
            pointRadius: 2,
            fill: true,
          }],
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          aspectRatio: 2.2,
          animation: { duration: 0 },
          plugins: {
            legend: { display: true, labels: { color: GRAPH_TEXT_COLOR } },
            tooltip: { mode: 'index', intersect: false, callbacks: { label: (ctx) => formatTooltipValue(ctx.raw) } },
          },
          scales: {
            x: { ticks: { color: GRAPH_TEXT_COLOR }, grid: { color: GRID_COLOR } },
            y: {
              type: 'linear',
              beginAtZero: true,
              min: axis.min,
              max: axis.max,
              bounds: 'ticks',
              grace: 0,
              ticks: {
                color: '#94a3b8',
                stepSize: axis.step,
                count: 6,
                precision: 0,
                maxTicksLimit: 6,
                callback: axis.tickCb,
              },
              grid: { color: GRID_COLOR },
              title: { display: true, text: axis.label, color: GRAPH_TEXT_COLOR },
            },
          },
        },
      });
      // no log-scale controls
    } else {
      // Fallback simple list if Chart.js not available
      const items = last.map((d) => ({ label: monthLabel(d.month), value: d.reports }));
      sec.appendChild(barList(items, { labelKey: 'label', valueKey: 'value' }));
    }
  }

  function renderAgeGroups(root, data) {
    const sec = section('Reports by Age Group');
    const labels = data.map((d) => d.age);
    const valuesRaw = data.map((d) => d.reports);
    let values = [];
    let axis = {};
    if (SCALE_MODE === 'pct') {
      const max = Math.max(...valuesRaw) || 1;
      values = valuesRaw.map((v) => Math.round((v / max) * 100));
      axis = { min: 0, max: 100, step: 20, label: scaleTitle(), tickCb: (v) => `${v}%` };
    } else if (SCALE_MODE === 'm') {
      values = valuesRaw;
      const { min, max, step } = FIXED_SCALES_RAW.age;
      axis = { min, max, step, label: scaleTitle(), tickCb: (v) => `${(v / 1_000_000).toFixed(1)}M` };
    } else {
      values = scaleValues(valuesRaw);
      const { min, max, step } = FIXED_SCALES.age;
      axis = { min, max, step, label: scaleTitle(), tickCb: (v) => {
        const unit = scaleUnit();
        return unit.startsWith('÷') ? compactFmt.format(Math.round(v / Y_SCALE_DEFAULT)) : `${numberFmt.format(v)}${unit}`;
      }};
    }
    const wrap = utils.dom.create('div', { className: 'ins-chart-wrap' });
    const canvas = createChartCanvas('bar');
    wrap.appendChild(canvas);
    sec.appendChild(wrap);
    root.appendChild(sec);

    if (window.Chart) {
      const chart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Reports',
            data: values,
            backgroundColor: '#3b82f6',
          }],
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          aspectRatio: 2,
          animation: { duration: 0 },
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: GRAPH_TEXT_COLOR }, grid: { display: false } },
            y: { type: 'linear', beginAtZero: true, min: axis.min, max: axis.max, bounds: 'ticks', grace: 0, ticks: { color: GRAPH_TEXT_COLOR, stepSize: axis.step, callback: axis.tickCb }, grid: { color: GRID_COLOR }, title: { display: true, text: axis.label, color: GRAPH_TEXT_COLOR } },
          },
        },
      });
      chart.options.plugins.tooltip = { callbacks: { label: (ctx) => formatTooltipValue(ctx.raw) } };
    } else {
      const items = data.map((d) => ({ label: d.age, value: d.reports }));
      sec.appendChild(barList(items, { labelKey: 'label', valueKey: 'value' }));
    }
  }

  function renderModes(root, data) {
    const sec = section('Reports by Contact Mode');
    // top 7 + Others to avoid tiny slices
    const sorted = data.slice().sort((a, b) => b.reports - a.reports);
    const top = sorted.slice(0, 7);
    const others = sorted.slice(7);
    const othersSum = others.reduce((s, d) => s + d.reports, 0);
    if (othersSum > 0) top.push({ mode: 'Others', reports: othersSum });

    const labels = top.map((d) => d.mode);
    const values = top.map((d) => d.reports);
    const colors = [
      '#60a5fa','#c084fc','#34d399','#f472b6','#f59e0b',
      '#38bdf8','#a3e635','#fb7185','#22d3ee','#fbbf24'
    ];
    const wrap = utils.dom.create('div', { className: 'ins-chart-wrap' });
    const canvas = createChartCanvas('pie');
    wrap.appendChild(canvas);
    sec.appendChild(wrap);
    root.appendChild(sec);

    if (window.Chart) {
      new Chart(canvas.getContext('2d'), {
        type: 'pie',
        data: {
          labels,
          datasets: [{ data: values, backgroundColor: colors.slice(0, values.length) }],
        },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          aspectRatio: 2,
          plugins: { legend: { position: 'right', labels: { color: GRAPH_TEXT_COLOR } }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${numberFmt.format(ctx.parsed)} (${(ctx.parsed / values.reduce((s,x)=>s+x,0) * 100).toFixed(1)}%)` } } },
        },
      });
    } else {
      const items = data.map((d) => ({ label: d.mode, value: d.reports }));
      sec.appendChild(barList(items, { labelKey: 'label', valueKey: 'value', showPercent: true }));
    }
  }

  function renderCategories(root, level2) {
    const sec = section('Top Categories', 'Level 2');
    const top = level2.slice().sort((a, b) => b.reports - a.reports).slice(0, 10);
    const labels = top.map((d) => d.category);
    const valuesRaw = top.map((d) => d.reports);
    let values = [];
    let axis = {};
    if (SCALE_MODE === 'pct') {
      const max = Math.max(...valuesRaw) || 1;
      values = valuesRaw.map((v) => Math.round((v / max) * 100));
      axis = { min: 0, max: 100, step: 20, label: scaleTitle(), tickCb: (v) => `${v}%` };
    } else if (SCALE_MODE === 'm') {
      values = valuesRaw;
      const { min, max, step } = FIXED_SCALES_RAW.cat;
      axis = { min, max, step, label: scaleTitle(), tickCb: (v) => `${(v / 1_000_000).toFixed(1)}M` };
    } else {
      values = scaleValues(valuesRaw);
      const { min, max, step } = FIXED_SCALES.cat;
      axis = { min, max, step, label: scaleTitle(), tickCb: (v) => {
        const unit = scaleUnit();
        return unit.startsWith('÷') ? compactFmt.format(Math.round(v / Y_SCALE_DEFAULT)) : `${numberFmt.format(v)}${unit}`;
      }};
    }

    const wrap = utils.dom.create('div', { className: 'ins-chart-wrap' });
    const canvas = createChartCanvas('bar');
    wrap.appendChild(canvas);
    sec.appendChild(wrap);
    root.appendChild(sec);

    if (window.Chart) {
      const chart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Reports', data: values, backgroundColor: '#60a5fa' }] },
        options: {
          responsive: false,
          maintainAspectRatio: true,
          aspectRatio: 2.4,
          animation: { duration: 0 },
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: GRAPH_TEXT_COLOR }, grid: { display: false } },
            y: { type: 'linear', beginAtZero: true, min: axis.min, max: axis.max, bounds: 'ticks', grace: 0, ticks: { color: GRAPH_TEXT_COLOR, stepSize: axis.step, callback: axis.tickCb }, grid: { color: GRID_COLOR }, title: { display: true, text: axis.label, color: GRAPH_TEXT_COLOR } },
          },
        },
      });
      chart.options.plugins.tooltip = { callbacks: { label: (ctx) => formatTooltipValue(ctx.raw) } };
    } else {
      const items = top.map((d) => ({ label: d.category, value: d.reports }));
      sec.appendChild(barList(items, { labelKey: 'label', valueKey: 'value' }));
    }
  }

  // State chart intentionally omitted per current scope

  function renderTracker(root, states, ageGroups, modes, level2) {
    const sec = section('Scam Tracker', 'Quick view of leading segments');
    const wrap = utils.dom.create('div', { className: 'ins-tracker' });

    const topAge = ageGroups.slice().sort((a, b) => b.reports - a.reports)[0];
    const topState = states.slice().sort((a, b) => b.reports - a.reports)[0];
    const topMode = modes.slice().sort((a, b) => b.reports - a.reports)[0];
    const topCat2 = level2.slice().sort((a, b) => b.reports - a.reports)[0];

    function pill(title, name, value) {
      const p = utils.dom.create('div', { className: 'ins-pill' });
      p.appendChild(utils.dom.create('div', { className: 'ins-pill-title' }, title));
      p.appendChild(utils.dom.create('div', { className: 'ins-pill-main' }, name || '—'));
      p.appendChild(utils.dom.create('div', { className: 'ins-pill-sub' }, value != null ? `${numberFmt.format(value)} reports` : 'No data'));
      return p;
    }

    wrap.appendChild(pill('Top State', topState?.state, topState?.reports));
    wrap.appendChild(pill('Top Age Group', topAge?.age, topAge?.reports));
    wrap.appendChild(pill('Top Contact Mode', topMode?.mode, topMode?.reports));
    wrap.appendChild(pill('Top Category (L2)', topCat2?.category, topCat2?.reports));

    sec.appendChild(wrap);
    root.appendChild(sec);
  }

  async function init() {
    const host = utils.dom.select('#insights-root');
    const status = utils.dom.select('#insights-status');
    const scaleSelect = document.getElementById('ins-scale-select');
    if (!host) return;

    try {
      if (status) status.textContent = 'Loading insights…';

      const base = './assets/data/insights';
      const [kpis, monthly, ageGroups, modes, level2, level3, states] = await Promise.all([
        loadJSON(`${base}/kpis.json`),
        loadJSON(`${base}/monthly.json`),
        loadJSON(`${base}/age_groups.json`),
        loadJSON(`${base}/modes.json`),
        loadJSON(`${base}/cat_level2.json`),
        loadJSON(`${base}/cat_level3.json`),
        loadJSON(`${base}/states.json`),
      ]);

      DATA = { kpis, monthly, ageGroups, modes, level2, level3, states };

      const renderAll = () => {
        host.innerHTML = '';
        renderSummary(host, DATA.kpis, DATA.monthly, DATA.states, DATA.level3);
        renderTrackerGrid(host, DATA.monthly, DATA.modes, DATA.level2, DATA.ageGroups);
      };

      if (scaleSelect) {
        scaleSelect.addEventListener('change', () => {
          SCALE_MODE = scaleSelect.value;
          renderAll();
        });
      }

      renderAll();

      if (status) status.textContent = '';
    } catch (err) {
      console.error(err);
      if (status) status.textContent = 'Failed to load insights data.';
      host.appendChild(utils.dom.create('p', { className: 'ins-error' }, 'Unable to load insights data. Please try again later.'));
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
