import express from 'express';
import { dbPing } from '../db.js';

const router = express.Router();

router.get('/health/db', async (req, res) => {
    try {
        const now = await dbPing();
        res.json({ ok: true, now });
    } catch (e) {
        console.error('DB error:', e);
        res.status(500).json({ ok: false, error: e.message });
    }
});

export default router;