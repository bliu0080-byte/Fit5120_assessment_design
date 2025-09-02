/*
 * Scamwatch TXT parser
 * Parses text exported from Scamwatch PDF/page into structured yearly data.
 * Usage (browser): parseScamwatchText(text) -> { years: [...], byYear: { [year]: {...} } }
 */
(function () {
  function toNumber(x) {
    if (typeof x === 'number') return x;
    if (!x) return 0;
    const s = String(x).replace(/[^0-9.\-]/g, '');
    const n = parseFloat(s);
    return Number.isNaN(n) ? 0 : n;
  }

  function parseCurrency(str) {
    if (!str) return 0;
    return toNumber(str);
  }

  function cleanWhitespace(s) {
    return s.replace(/\s+/g, ' ').trim();
  }

  function findFirst(re, text) {
    const m = re.exec(text);
    return m ? m[1] || m[0] : '';
  }

  function findAllPairsCurrency(text) {
    // Matches label $ amount (labels may contain spaces and slashes)
    const pairs = [];
    const re = /([A-Za-z][A-Za-z\s/()'-]{1,40}?)\s*\$\s*([0-9,\s\.]+)/g;
    let m;
    while ((m = re.exec(text))) {
      const label = cleanWhitespace(m[1]);
      const amount = parseCurrency(m[2]);
      if (label && amount > 0) pairs.push({ label, amount });
    }
    return pairs;
  }

  function findAllPairsCount(text) {
    // Matches label number (with commas)
    const pairs = [];
    const re = /([A-Za-z][A-Za-z\s/()'-]{1,40}?)\s+([0-9][0-9,]{2,})/g;
    let m;
    while ((m = re.exec(text))) {
      const label = cleanWhitespace(m[1]);
      const count = toNumber(m[2]);
      if (label && count > 0) pairs.push({ label, count });
    }
    return pairs;
  }

  function parseSection(sectionText) {
    // Year
    let year = 0;
    let ym = sectionText.match(/Month\/\s*Year\s*\n\s*(\d{4})/);
    if (ym) year = parseInt(ym[1], 10);
    if (!year) {
      const fromHeader = sectionText.match(/Scamwatch(\d{4})/);
      if (fromHeader) year = parseInt(fromHeader[1], 10);
    }

    // Reported losses (AUD)
    const lossesStr = findFirst(/Reported\s+losses\s*\n?\s*\$\s*([0-9,\s\.]+)/, sectionText);
    const reportedLosses = parseCurrency(lossesStr);

    // Reported scams count
    const scamsStr = findFirst(/Reported\s+scams\s*\n\s*([0-9,\s]+)/, sectionText);
    const reportedScams = toNumber(scamsStr);

    // Top scams by loss — grab the block after the heading up to next heading
    let topScamsByLoss = [];
    const lossBlock = sectionText.split(/Top\s+scams\s+by\s+loss/i)[1];
    if (lossBlock) {
      // limit until next known header
      const clipped = lossBlock.split(/Top\s+contact|Top\s+ten|Top\s+scams\s+by\s+gender|Gender\s+Breakdown/i)[0] || lossBlock;
      topScamsByLoss = findAllPairsCurrency(clipped).slice(0, 10);
    }

    // Top contact methods by amount lost
    let topContactsByLoss = [];
    const tcb = sectionText.split(/Top\s+contact\s+method\s*s?\s+by\s+amount\s+lost/i)[1];
    if (tcb) {
      const clipped = tcb.split(/Top\s+contact\s+method\s*s(?!\s+by)|Top\s+ten|Top\s+scams\s+by\s+gender|Gender\s+Breakdown/i)[0] || tcb;
      topContactsByLoss = findAllPairsCurrency(clipped).slice(0, 5);
    }

    // Top contact methods by count
    let topContactsByCount = [];
    const tcm = sectionText.split(/Top\s+contact\s+method\s*s(?!\s+by)/i)[1];
    if (tcm) {
      const clipped = tcm.split(/Top\s+scams\s+by|Gender\s+Breakdown|Amount\s+lost\s+and\s+number\s+of\s+reports/i)[0] || tcm;
      topContactsByCount = findAllPairsCount(clipped).slice(0, 5);
    }

    return {
      year,
      metrics: {
        reports: reportedScams,
        lossesAUD: reportedLosses,
        avgLossAUD: reportedScams ? reportedLosses / reportedScams : 0
      },
      topScamTypes: topScamsByLoss.map(p => ({ label: p.label, amountAUD: p.amount })),
      contact: {
        byLoss: topContactsByLoss.map(p => ({ method: p.label, amountAUD: p.amount })),
        byCount: topContactsByCount.map(p => ({ method: p.label, count: p.count }))
      }
    };
  }

  function parseScamwatchText(text) {
    if (!text) return { years: [], byYear: {} };
    // Split on separator lines between PDFs
    const parts = text.split(/==================\s*Scam statistics _ Scamwatch/i).filter(Boolean);
    const byYear = {};
    const years = [];
    parts.forEach(p => {
      const sec = parseSection(p);
      if (sec.year) {
        byYear[sec.year] = sec;
        years.push(sec.year);
      }
    });
    years.sort((a, b) => a - b);
    return { years, byYear };
  }

  if (typeof window !== 'undefined') {
    window.ScamwatchParser = { parseScamwatchText };
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseScamwatchText };
  }
})();

