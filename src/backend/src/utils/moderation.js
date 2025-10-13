// utils/moderation.js
import axios from "axios";
import nspell from "nspell";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let spell = null;


try {
    // Calculating node_modules absolute paths
    const affPath = path.resolve(__dirname, "../../node_modules/dictionary-en-us/index.aff");
    const dicPath = path.resolve(__dirname, "../../node_modules/dictionary-en-us/index.dic");

    const aff = fs.readFileSync(affPath, "utf8");
    const dic = fs.readFileSync(dicPath, "utf8");

    spell = nspell(aff, dic);
    console.log("✅ English dictionary loaded (en-us)");
} catch (err) {
    console.error("⚠️ Dictionary load failed:", err.message);
}

// ---------------- Config ----------------
const PERSPECTIVE_KEY = process.env.PERSPECTIVE_KEY;
const PERSPECTIVE_URL = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${PERSPECTIVE_KEY}`;

// ---------------- Check if sentence is valid English ----------------
function isSentenceWithDictionary(text) {
    const clean = String(text || "").trim();

    // 基础句子结构判断
    const words = (clean.match(/\b[a-zA-Z]{2,}\b/g) || []);
    if (clean.length < 10 || words.length < 3 || !clean.includes(" ")) return false;

    // Default release when dictionary is not loaded (to avoid blocking)
    if (!spell) return true;

    // Check that the words are in real English
    let valid = 0;
    for (const w of words) {
        if (spell.correct(w.toLowerCase())) valid++;
    }

    const ratio = valid / words.length;
    return ratio >= 0.6; // 至少 60% 单词真实
}

// ---------------- Perspective API ----------------
async function checkPerspective(text) {
    if (!PERSPECTIVE_KEY) {
        console.error("❌ Missing Perspective API Key!");
        return null;
    }

    const clean = String(text || "").trim();

    // Skip empty, too short, or spammy text
    if (!clean || clean.length < 5 || /(.)\1{4,}/.test(clean)) {
        console.warn("⚠️ Skipping Perspective check: invalid or repetitive text");
        return null;
    }

    try {
        const res = await axios.post(
            PERSPECTIVE_URL,
            {
                comment: { text: clean },
                languages: ["en"],
                requestedAttributes: {
                    TOXICITY: {},
                    INSULT: {},
                    PROFANITY: {},
                    THREAT: {}
                }
            },
            { headers: { "Content-Type": "application/json" } }
        );
        return res.data?.attributeScores;
    } catch (err) {
        console.error(
            "Perspective API error:",
            err.response?.data?.error?.message || err.message
        );
        return null;
    }
}

// ---------------- Main moderation function ----------------
export async function moderateStory(rawText) {
    const text = String(rawText || "").trim();
    const reasons = [];

    // Step 1️⃣: Sentence checking
    if (!isSentenceWithDictionary(text)) {
        reasons.push("not_sentence");
        return {
            action: "reject",
            reasons,
            cleanText: text
        };
    }

    // Step 2️⃣: Calling the Perspective API to detect inappropriate content
    const perspective = await checkPerspective(text);
    if (perspective) {
        const scores = [
            perspective.TOXICITY?.summaryScore?.value || 0,
            perspective.INSULT?.summaryScore?.value || 0,
            perspective.PROFANITY?.summaryScore?.value || 0,
            perspective.THREAT?.summaryScore?.value || 0
        ];
        const maxScore = Math.max(...scores);

        if (maxScore > 0.8) {
            reasons.push("toxic_content");
            return {
                action: "reject",
                reasons,
                cleanText: text
            };
        }
    }

    // Step 3️⃣: All passed
    return {
        action: "allow",
        reasons,
        cleanText: text
    };
}