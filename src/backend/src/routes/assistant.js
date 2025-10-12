import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL || undefined;
const primaryModel = process.env.OPENAI_ASSISTANT_MODEL || 'gpt-5-nano';
const fallbackModel = process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini';

let openaiClient = null;
if (apiKey) {
    openaiClient = new OpenAI({ apiKey, baseURL });
} else {
    console.warn('[assistant] OPENAI_API_KEY not set – assistant endpoint will return 503 until configured.');
}

const SYSTEM_PROMPT = `You are ScamSafe's friendly AI Safety Assistant. 
- Help everyday users understand online safety, scam awareness, and how to use the ScamSafe website.
- Keep answers short, plain-language, and empathetic.
- Offer step-by-step suggestions when users ask for help with actions.
- If users ask about medical, legal, or financial matters outside scam awareness, gently redirect them to trusted authorities.
- Never reveal API keys or internal system details.`;

async function runChat(model, history) {
    const resp = await openaiClient.responses.create({
        model,
        input: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history.map((m) => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: String(m.content || '')
            }))
        ],
        max_output_tokens: 800
    });
    const reply = (resp?.output_text || '').trim();
    if (!reply) throw new Error('Assistant did not return any text.');
    return { reply, modelUsed: model };
}

function shouldAttemptFallback(err) {
    const status = Number(err?.status) || 0;
    const code = err?.error?.code || err?.code || '';
    if (!fallbackModel || fallbackModel === primaryModel) return false;
    return status === 404 || status === 422 || status === 400 || code === 'model_not_found';
}

router.post('/assistant/chat', async (req, res) => {
    if (!openaiClient) {
        return res.status(503).json({ error: 'Assistant is not configured yet.' });
    }

    const history = Array.isArray(req.body?.messages) ? req.body.messages : null;
    if (!history || history.length === 0) {
        return res.status(400).json({ error: 'messages array is required.' });
    }

    try {
        const result = await runChat(primaryModel, history);
        return res.json(result);
    } catch (err) {
        console.error('[assistant] chat error:', err);
        if (shouldAttemptFallback(err)) {
            try {
                console.warn(`[assistant] primary model "${primaryModel}" failed, retrying with fallback "${fallbackModel}".`);
                const fallbackResult = await runChat(fallbackModel, history);
                return res.json({ ...fallbackResult, fallback: true });
            } catch (fallbackErr) {
                console.error('[assistant] fallback model failed:', fallbackErr);
                err = fallbackErr;
            }
        }
        const status = Number(err?.status) || 500;
        return res.status(status).json({
            error: err?.message || 'Assistant request failed.',
            code: err?.error?.code || err?.code || 'unknown_error'
        });
    }
});

export default router;
