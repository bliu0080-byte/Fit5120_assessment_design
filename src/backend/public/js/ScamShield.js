// =================== API BASE CONFIG ===================
const API_BASE =
    (window.SCAMSAFE_CONFIG?.apiBackend?.baseUrl) ||
    ((location.hostname.includes('localhost') || location.hostname === '127.0.0.1')
        ? 'http://localhost:3000/api'
        : 'https://scamsafe.onrender.com/api');

// =================== Example Messages ===================
const exampleMessages = [
    {
        label: '🚨 Scam Example',
        text: 'URGENT! Your bank account has been locked. Click here immediately to verify your identity: http://bit.ly/verify-account or your account will be suspended within 24 hours. Enter your password and PIN to restore access.',
    },
    {
        label: '✅ Safe Example',
        text: 'Hi! This is a reminder about our team meeting tomorrow at 2 PM. Please bring your project updates. See you there!',
    },
    {
        label: '💰 Prize Scam',
        text: 'Congratulations! You won $1,000,000 in the lottery! Click here to claim your reward now: http://claim-prize.com Limited time offer!',
    },
];

// =================== DOM Elements ===================
const messageInput = document.getElementById('messageInput');
const checkBtn = document.getElementById('checkBtn');
const clearBtn = document.getElementById('clearBtn');
const checkBtnText = document.getElementById('checkBtnText');
const resultCard = document.getElementById('resultCard');
const infoCard = document.getElementById('infoCard');
const examplesSection = document.getElementById('examplesSection');
const resultTitle = document.getElementById('resultTitle');
const resultBadge = document.getElementById('resultBadge');
const resultIcon = document.getElementById('resultIcon');
const riskCount = document.getElementById('riskCount');
const educationalTip = document.getElementById('educationalTip');

let currentResult = null;
let isAnalyzing = false;

// =================== Event Listeners ===================
messageInput.addEventListener('input', handleInputChange);
checkBtn.addEventListener('click', handleCheck);
clearBtn.addEventListener('click', handleReset);
document.querySelectorAll('.btn-example').forEach((btn, index) => {
    btn.addEventListener('click', () => loadExample(index));
});

// =================== Handlers ===================
function handleInputChange() {
    const hasText = messageInput.value.trim().length > 0;
    checkBtn.disabled = !hasText || isAnalyzing;
    clearBtn.style.display = hasText ? 'inline-flex' : 'none';
}

function loadExample(index) {
    messageInput.value = exampleMessages[index].text;
    currentResult = null;
    resultCard.style.display = 'none';
    infoCard.style.display = 'flex';
    examplesSection.style.display = 'block';
    handleInputChange();
}

// =================== Main Detection Function ===================
async function handleCheck() {
    const text = messageInput.value.trim();
    if (!text || isAnalyzing) return;

    isAnalyzing = true;
    checkBtn.disabled = true;
    checkBtnText.textContent = 'Analyzing...';
    checkBtn.classList.add('analyzing');

    try {
        // === 调用后端 AI 模型 ===
        const res = await fetch(`${API_BASE}/analyze-scam`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        let label = "unknown";
        let modelScore = 0;

        // === 解析返回结果（兼容嵌套结构） ===
        try {
            let flat = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : data;
            const phishing = flat.find(e => e.label?.toLowerCase().includes('phish'));
            const benign = flat.find(e => e.label?.toLowerCase().includes('benign'));
            modelScore = phishing ? phishing.score : benign ? (1 - benign.score) : 0;
            label = phishing ? 'phishing' : 'benign';
        } catch (e) {
            console.warn("⚠️ Unexpected model response:", data);
        }

        // === 本地启发式检测 ===
        const heuristic = detectScam(text);
        const heuristicScore = heuristic.score / 100; // normalize 0–1

        // === 融合得分（70%模型 + 30%启发式） ===
        const finalScore = (0.7 * modelScore) + (0.3 * heuristicScore);

        // === 判断风险等级 ===
        let riskLevel, tip, color;
        if (finalScore >= 0.9) {
            riskLevel = '🚨 High Risk';
            color = 'red';
            tip = 'Highly likely phishing. Do NOT click any links or provide information.';
        } else if (finalScore >= 0.6) {
            riskLevel = '⚠️ Suspicious';
            color = 'orange';
            tip = 'Message appears risky. Verify sender identity through official channels.';
        } else if (finalScore >= 0.4) {
            riskLevel = '⚖️ Uncertain';
            color = 'gold';
            tip = 'Some warning signals found. Review carefully before taking action.';
        } else {
            riskLevel = '✅ Safe';
            color = 'green';
            tip = 'No phishing indicators detected, but always stay cautious.';
        }

        currentResult = {
            isScam: finalScore >= 0.6,
            confidence: `${(finalScore * 100).toFixed(1)}% (${riskLevel})`,
            educationalTip: tip,
            heuristic,
        };

        displayResult();
    } catch (err) {
        console.error('❌ Phishing API error:', err);
        alert('AI model service unavailable. Please try again later.');
    } finally {
        isAnalyzing = false;
        checkBtn.disabled = false;
        checkBtnText.textContent = 'Check Message';
        checkBtn.classList.remove('analyzing');
        handleInputChange();
    }
}

// =================== 启发式规则（原 detectScam 简化版） ===================
function detectScam(text) {
    const riskyElements = [];
    let scamScore = 0;

    const urlPattern = /(https?:\/\/[^\s]+)/gi;
    const urls = text.match(urlPattern) || [];
    urls.forEach(url => {
        if (url.includes('bit.ly') || url.includes('tinyurl') || !url.includes('https')) scamScore += 25;
    });

    const urgentWords = ['urgent', 'immediately', 'act now', 'limited time', 'verify now'];
    urgentWords.forEach(word => { if (text.toLowerCase().includes(word)) scamScore += 15; });

    const personalWords = ['password', 'pin', 'bank', 'account', 'verify identity'];
    personalWords.forEach(word => { if (text.toLowerCase().includes(word)) scamScore += 20; });

    const moneyWords = ['won', 'prize', 'reward', 'claim', 'gift card'];
    moneyWords.forEach(word => { if (text.toLowerCase().includes(word)) scamScore += 15; });

    scamScore = Math.min(scamScore, 100);
    return { score: scamScore };
}

// =================== Display Result ===================
function displayResult() {
    if (!currentResult) return;

    infoCard.style.display = 'none';
    examplesSection.style.display = 'none';

    resultCard.className = 'result-card ' + (currentResult.isScam ? 'scam' : 'safe');
    resultCard.style.display = 'block';

    resultTitle.textContent = currentResult.isScam ? 'Scam Detected' : 'Appears Safe';
    resultBadge.textContent = currentResult.confidence;
    resultBadge.className = 'badge ' + (currentResult.isScam ? 'scam' : 'safe');

    resultIcon.innerHTML = currentResult.isScam
        ? `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>`
        : `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`;

    educationalTip.textContent = currentResult.educationalTip;
    riskCount.textContent = `Heuristic Score: ${currentResult.confidence}`;
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// =================== Reset ===================
function handleReset() {
    messageInput.value = '';
    currentResult = null;
    resultCard.style.display = 'none';
    infoCard.style.display = 'flex';
    examplesSection.style.display = 'block';
    handleInputChange();
}

// =================== Init ===================
handleInputChange();
console.log('✅ ScamShield.js connected to', API_BASE);