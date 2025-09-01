/* Simple extractor UI for Scamwatch text */
(function () {
  const { parseScamwatchText } = window.ScamwatchParser || {};

  async function init() {
    const out = document.getElementById('extract-output');
    try {
      const res = await fetch('./assets/data/scamwatch.txt');
      if (!res.ok) throw new Error('Failed to load scamwatch.txt');
      const text = await res.text();
      const parsed = parseScamwatchText(text);
      render(parsed, out);
    } catch (e) {
      out.textContent = 'Error: ' + e.message;
    }
  }

  function render(model, container) {
    const years = model.years || [];
    if (!years.length) {
      container.textContent = 'No data found in scamwatch.txt';
      return;
    }

    const sections = years.map(y => {
      const d = model.byYear[y];
      const metrics = `Reports: ${nf(d.metrics.reports)} | Losses (AUD): ${cf(d.metrics.lossesAUD)} | Avg/Report: ${cf(d.metrics.avgLossAUD)}`;
      const topTypes = (d.topScamTypes || []).slice(0, 5).map(t => `${esc(t.label)} — ${cf(t.amountAUD)}`).join('<br>');
      const contactsLoss = (d.contact?.byLoss || []).map(t => `${esc(t.method)} — ${cf(t.amountAUD)}`).join('<br>');
      const contactsCount = (d.contact?.byCount || []).map(t => `${esc(t.method)} — ${nf(t.count)}`).join('<br>');
      return `
        <section class="card" style="margin-bottom:16px;">
          <div class="card-content">
            <div class="card-title">Year ${y}</div>
            <div class="card-description">${metrics}</div>
            <div style="display:grid; grid-template-columns: repeat(3,1fr); gap:12px;">
              <div><strong>Top Scams by Loss</strong><br>${topTypes}</div>
              <div><strong>Top Contact Methods (Loss)</strong><br>${contactsLoss}</div>
              <div><strong>Top Contact Methods (Count)</strong><br>${contactsCount}</div>
            </div>
          </div>
        </section>`;
    }).join('');

    const jsonBlob = JSON.stringify(model, null, 2);
    const dl = `<a id="download-json" class="btn btn-primary" href="data:application/json;charset=utf-8,${encodeURIComponent(jsonBlob)}" download="scamwatch_extracted.json">Download JSON</a>`;

    container.innerHTML = dl + sections + `<pre style="margin-top:16px;">${esc(jsonBlob)}</pre>`;
  }

  function cf(n) { try { return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: n >= 1000 ? 0 : 2 }).format(n); } catch { return '$' + nf(n); } }
  function nf(n) { try { return new Intl.NumberFormat('en-AU').format(Math.round(n)); } catch { return String(Math.round(n)); } }
  function esc(s) { return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

  document.addEventListener('DOMContentLoaded', init);
})();

