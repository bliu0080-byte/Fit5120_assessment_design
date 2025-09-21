// utils/moderation.js
// Text moderation utility for scam stories (lenient but strong on obvious gibberish)

// ---------------- Dictionaries ----------------

// Profanity words (expand as needed)
const PROFANITY = [
    'fuck','shit','bitch','asshole','dick','bastard','cunt','motherfucker'
];

// Scam-related keywords by category (for metadata only)
const SCAM_KEYWORDS = {
    sms:   ['sms','text message','otp','verify code'],
    phone: ['call','voicemail','customer service','caller id'],
    web:   ['website','link','login page','http://','https://'],
    email: ['email','inbox','attachment','phishing'],
    other: ['crypto','bitcoin','gift card','itunes','western union','investment']
};

// ---------------- Regex patterns ----------------
const URL_RE   = /https?:\/\/[^\s)]+/ig;
const PHONE_RE = /(\+?\d[\s-]?){6,}/ig;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/ig;

const MONEY_RE   = /\b(AU\$|\$)?\s?\d{2,}(,\d{3})*(\.\d{1,2})?\b/ig;
const URGENCY_RE = /\b(urgent|immediately|verify now|act now|suspend|locked|overdue)\b/i;
const THREAT_RE  = /\b(fine|police|arrest|penalty)\b/i;

// ---------------- Small helpers ----------------

/** Normalize whitespace and quotes */
export function normalize(text = '') {
    return String(text).replace(/\s+/g, ' ').replace(/[“”‘’]/g, '"').trim();
}

/** Simple profanity detection */
export function detectProfanity(text) {
    const low = text.toLowerCase();
    const hits = PROFANITY.filter(w => low.includes(w));
    return { hasProfanity: hits.length > 0, hits };
}

/** PII detection (URLs / phones / emails) */
export function detectPII(text) {
    const urls = text.match(URL_RE) || [];
    const phones = text.match(PHONE_RE) || [];
    const emails = text.match(EMAIL_RE) || [];
    return { urls, phones, emails };
}

/** Shannon entropy (rough proxy for randomness) */
function shannonEntropy(str) {
    if (!str) return 0;
    const freq = {};
    for (const ch of str) freq[ch] = (freq[ch] || 0) + 1;
    const n = str.length;
    let H = 0;
    for (const c of Object.values(freq)) {
        const p = c / n;
        H -= p * Math.log2(p);
    }
    return H;
}

/** Rough word counter */
function wordCount(text) {
    return (String(text).trim().match(/\b[\w'-]{1,}\b/g) || []).length;
}

/**
 * Lenient "looks like a human-written story" detector.
 * If this returns true, we prefer allowing submission unless there is profanity or very strong gibberish signals.
 */
function looksLikeStory(text) {
    const raw = (text || '').trim();
    const low = raw.toLowerCase();
    const spaces = (raw.match(/\s/g) || []).length;
    const wc = wordCount(raw);

    // 1) 2+ sentence marks and reasonable length
    const sentenceMarks = (raw.match(/[.!?]/g) || []).length >= 2;
    if (sentenceMarks && wc >= 8) return true;

    // 2) Enough words + spacing
    if (wc >= 10 && spaces >= 3) return true;

    // 3) Everyday verbs / event words (two hits)
    const verbs = [
        'got','received','called','texted','emailed','messaged','asked','told','said',
        'click','clicked','link','pay','paid','send','sent','buy','bought','login','log in',
        'scam','fraud','gift card','bank','account','email','phone','sms','website','page',
        'looked','seemed','appeared','checked','verified'
    ];
    let verbHit = 0;
    for (const v of verbs) { if (low.includes(v)) { verbHit++; if (verbHit >= 2) return true; } }

    return false;
}

// ---------------- Low-quality detector (tuned) ----------------

/**
 * Detect low-quality / gibberish reasons.
 * Returns an array of reason codes. Reasons are signals only; decisions are made in moderateStory().
 */
function detectLowQuality(text) {
    const raw = (text || '').trim();
    const lower = raw.toLowerCase();
    const reasons = [];

    // too_short: below 15 chars is almost never a story
    if (raw.length < 15) reasons.push('too_short');

    // long no-space chain (e.g., "dasdsadasdsadasd...")
    const spaceCount = (raw.match(/\s/g) || []).length;
    if (raw.length >= 48 && spaceCount < 2) reasons.push('no_spaces');

    // repetitive 4-char chunk frequency
    let repetitive = false;
    {
        const chunks = {};
        for (let i = 0; i < lower.length - 4; i++) {
            const chunk = lower.slice(i, i + 4);
            chunks[chunk] = (chunks[chunk] || 0) + 1;
        }
        const highFreq = Object.values(chunks).some(v => v >= 8);          // same 4-chunk >= 8x
        const repeatKinds = Object.values(chunks).filter(v => v >= 5).length; // >=4 distinct chunks repeated
        if (highFreq || repeatKinds >= 4) {
            repetitive = true;
            reasons.push('repetitive_pattern');
        }
    }

    // low_diversity: only for very long letter-only text AND combined with strong signals
    {
        const alpha = lower.replace(/[^a-z]/g, '');
        const alphaLen = alpha.length;
        const uniq = new Set(alpha).size;
        const ratio = alphaLen ? (uniq / alphaLen) : 1;
        if (alphaLen >= 120 && ratio < 0.16 && (repetitive || (raw.length >= 48 && spaceCount < 2))) {
            reasons.push('low_diversity');
        }
    }

    // low_entropy: long alphabetic strings with low randomness
    {
        const alpha = lower.replace(/[^a-z]/g, '');
        if (alpha.length >= 40) {
            const H = shannonEntropy(alpha);
            if (H < 2.2) reasons.push('low_entropy');
        }
    }

    // gibberish: long text but almost no spaces
    if (raw.length >= 25 && spaceCount <= 1) {
        reasons.push('gibberish');
    }

    return Array.from(new Set(reasons));
}

// ---------------- Scam metadata ----------------

/** Guess scam category (metadata) */
export function guessScamCategory(text) {
    const low = text.toLowerCase();
    const counts = Object.fromEntries(Object.keys(SCAM_KEYWORDS).map(k => [k, 0]));
    for (const [cat, words] of Object.entries(SCAM_KEYWORDS)) {
        for (const w of words) if (low.includes(w)) counts[cat]++;
    }
    if (URL_RE.test(text))   counts.web   += 2;
    if (EMAIL_RE.test(text)) counts.email += 2;
    if (PHONE_RE.test(text)) counts.phone += 2;
    const [category, top] = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    return { category: top > 0 ? category : 'other', scores: counts, topScore: top };
}

/** Scam score (for analytics; NOT used to block) */
export function scamScore(text) {
    let score = 0;
    if (URL_RE.test(text))    score += 2;
    if (EMAIL_RE.test(text))  score += 2;
    if (PHONE_RE.test(text))  score += 2;
    if (MONEY_RE.test(text))  score += 1;
    if (URGENCY_RE.test(text))score += 1.5;
    if (THREAT_RE.test(text)) score += 1.5;
    const { topScore } = guessScamCategory(text);
    score += Math.min(topScore, 3) * 0.8;
    return Math.min(10, Number(score.toFixed(2)));
}

// ---------------- Main decision ----------------

/**
 * moderateStory(rawText) -> { action, reasons, score, categoryGuess, pii, cleanText }
 * actions:
 *  - 'reject'  : hard block (profanity; obvious gibberish)
 *  - 'allow'   : accept immediately (backend can mark as "approved")
 *
 * We intentionally do NOT auto-'review' to avoid blocking simple but valid stories.
 * If you want a middle tier, you can add 'review' where commented.
 */
export function moderateStory(rawText) {
    const text = normalize(rawText || '');
    const reasons = [];

    // A) Profanity → hard reject
    const { hasProfanity } = detectProfanity(text);
    if (hasProfanity) {
        reasons.push('profanity');
        return {
            action: 'reject',
            reasons,
            score: 0,
            categoryGuess: 'other',
            pii: detectPII(text),
            cleanText: text
        };
    }

    // B) Low-quality checks (strong signals reject; weak signals ignored if it looks like a story)
    const lowReasons = detectLowQuality(text);
    const storyLike = looksLikeStory(text);

    if (lowReasons.length > 0) {
        const strongSignals = ['no_spaces','repetitive_pattern','low_diversity','low_entropy','gibberish'];
        const hasStrong = lowReasons.some(r => strongSignals.includes(r));
        const onlyTooShort = lowReasons.length === 1 && lowReasons[0] === 'too_short';

        if (onlyTooShort) {
            // Too short to be a story
            return {
                action: 'reject',
                reasons: lowReasons,
                score: 0,
                categoryGuess: 'other',
                pii: detectPII(text),
                cleanText: text
            };
        }

        if (hasStrong && !storyLike) {
            // Strong gibberish signals and not story-like → reject
            return {
                action: 'reject',
                reasons: lowReasons,
                score: 0,
                categoryGuess: 'other',
                pii: detectPII(text),
                cleanText: text
            };
        }

        // Otherwise: keep reasons as metadata but do not block.
        reasons.push(...lowReasons);

        // If you want a middle tier:
        // return { action: 'review', reasons: lowReasons, score: 0, categoryGuess: 'other', pii: detectPII(text), cleanText: text };
    }

    // C) PII (record only; do not block)
    const pii = detectPII(text);
    if (pii.urls.length   > 0) reasons.push('links_detected');
    if (pii.phones.length > 0) reasons.push('phone_detected');
    if (pii.emails?.length> 0) reasons.push('email_detected');

    // D) Scam metadata (category + score) — analytics only
    const score = scamScore(text);
    const { category } = guessScamCategory(text);

    // ✅ Default allow: we aim to avoid false rejections for simple/elderly-written stories
    return {
        action: 'allow',
        reasons,
        score,
        categoryGuess: category,
        pii,
        cleanText: text
    };
}