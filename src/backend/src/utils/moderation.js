// utils/moderation.js
// Text moderation utility for scam stories

// Profanity words (expand as needed)
const PROFANITY = [
    'fuck','shit','bitch','asshole','dick','bastard','cunt','motherfucker'
];

// Scam-related keywords by category
const SCAM_KEYWORDS = {
    sms: ['sms','text message','otp','verify code'],
    phone: ['call','voicemail','customer service','caller id'],
    web: ['website','link','login page','http://','https://'],
    email: ['email','inbox','attachment','phishing'],
    other: ['crypto','bitcoin','gift card','itunes','western union','investment']
};

// Regex patterns for suspicious content
const URL_RE   = /https?:\/\/[^\s)]+/ig;
const PHONE_RE = /(\+?\d[\s-]?){6,}/ig;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/ig;

const MONEY_RE   = /\b(AU\$|\$)?\s?\d{2,}(,\d{3})*(\.\d{1,2})?\b/ig;
const URGENCY_RE = /\b(urgent|immediately|verify now|act now|suspend|locked|overdue)\b/i;
const THREAT_RE  = /\b(fine|police|arrest|penalty)\b/i;

// Normalize text: trim spaces and unify quotes
export function normalize(text = '') {
    return text.replace(/\s+/g, ' ').replace(/[“”‘’]/g, '"').trim();
}

// Detect profanity
export function detectProfanity(text) {
    const low = text.toLowerCase();
    const hits = PROFANITY.filter(w => low.includes(w));
    return { hasProfanity: hits.length > 0, hits };
}

// Detect Personally Identifiable Information (PII)
export function detectPII(text) {
    const urls = text.match(URL_RE) || [];
    const phones = text.match(PHONE_RE) || [];
    const emails = text.match(EMAIL_RE) || [];
    return { urls, phones, emails };
}

// Detect multiple types of low-quality / gibberish content
function detectLowQuality(text) {
    const raw = (text || '').trim();
    const lower = raw.toLowerCase();
    const reasons = [];

    // Very short content
    if (raw.length < 30) reasons.push('too_short');

    // Long string with no spaces
    if (raw.length > 40 && !/\s/.test(raw)) reasons.push('no_spaces');

    // Repeated sequence (e.g., "dasdasa" repeated many times)
    const chunks = {};
    for (let i = 0; i < lower.length - 4; i++) {
        const chunk = lower.slice(i, i + 4);
        chunks[chunk] = (chunks[chunk] || 0) + 1;
    }
    const repeats = Object.values(chunks).filter(v => v > 3).length;
    if (repeats > 2) reasons.push('repetitive_pattern');

    // Unique character ratio very low
    const uniqueChars = new Set(lower.replace(/\s/g, '').split(''));
    const ratio = uniqueChars.size / raw.length;
    if (ratio < 0.25) reasons.push('low_diversity');

    // Missing common words (if long but no typical English words)
    const commonWords = ['the','and','is','to','of','in','my','i','me'];
    const hasCommon = commonWords.some(w => lower.includes(w));
    if (!hasCommon && raw.length > 50) reasons.push('unnatural_language');

    return reasons;
}

// Guess scam category
export function guessScamCategory(text) {
    const low = text.toLowerCase();
    const counts = Object.fromEntries(Object.keys(SCAM_KEYWORDS).map(k => [k, 0]));
    for (const [cat, words] of Object.entries(SCAM_KEYWORDS)) {
        for (const w of words) if (low.includes(w)) counts[cat]++;
    }
    if (URL_RE.test(text)) counts.web += 2;
    if (EMAIL_RE.test(text)) counts.email += 2;
    if (PHONE_RE.test(text)) counts.phone += 2;
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const [category, score] = entries[0];
    return { category: score > 0 ? category : 'other', scores: counts, topScore: score };
}

// Compute overall scam score (0–10)
export function scamScore(text) {
    let score = 0;
    if (URL_RE.test(text))   score += 2;
    if (EMAIL_RE.test(text)) score += 2;
    if (PHONE_RE.test(text)) score += 2;
    if (MONEY_RE.test(text)) score += 1;
    if (URGENCY_RE.test(text)) score += 1.5;
    if (THREAT_RE.test(text))  score += 1.5;
    const { topScore } = guessScamCategory(text);
    score += Math.min(topScore, 3) * 0.8;
    return Math.min(10, Number(score.toFixed(2)));
}

// Main moderation function
export function moderateStory(rawText) {
    const text = normalize(rawText || '');
    let reasons = [];

    // Low-quality detection
    const lowReasons = detectLowQuality(text);
    if (lowReasons.length > 0) {
        return {
            action: 'reject',
            reasons: lowReasons,
            score: 0,
            categoryGuess: 'other',
            pii: { urls: [], phones: [], emails: [] },
            cleanText: text
        };
    }

    // Profanity check
    const { hasProfanity } = detectProfanity(text);
    if (hasProfanity) reasons.push('profanity');

    // PII detection
    const pii = detectPII(text);
    if (pii.urls.length > 0) reasons.push('links_detected');
    if (pii.phones.length > 0) reasons.push('phone_detected');

    // Scam score
    const score = scamScore(text);
    const { category } = guessScamCategory(text);

    // Decision logic
    let action = 'allow';
    if (hasProfanity) action = 'reject';
    else if (score >= 3.5) action = 'approved';
    else if (score >= 2.0) action = 'review';
    else action = 'review';

    return {
        action,
        reasons,
        score,
        categoryGuess: category,
        pii,
        cleanText: text
    };
}