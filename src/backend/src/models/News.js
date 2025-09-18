// src/routes/News.js
import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

router.get('/news', async (_req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT id, title, description, content, "type", severity,
                   url, image, "source", "timestamp"
            FROM news
            ORDER BY "timestamp" DESC, id DESC
                LIMIT 50
        `);
        res.json({ items: rows }); // 返回 items，方便前端和拦截器处理
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB query failed' });
    }
});

export default router;