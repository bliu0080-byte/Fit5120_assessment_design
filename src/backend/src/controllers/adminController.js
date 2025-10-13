// src/controllers/adminController.js
import { pool } from '../db.js';

// Admin gets news (returns { items })
export const getNews = async (_req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT id, title, summary, image_url, link, source, published_at
            FROM news
            ORDER BY published_at DESC, id DESC
                LIMIT 200
        `);
        res.json({ items: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
};

export const createNews = async (req, res) => {
    try {
        const a = req.body || {};
        const title = a.title || 'Untitled';
        const summary = a.description ?? a.summary ?? '';
        const image_url = a.image ?? a.image_url ?? '';
        const link = a.url ?? a.link ?? '';
        const source = a.source || 'admin';
        const published_at = a.timestamp ? new Date(a.timestamp) : new Date();

        const { rows } = await pool.query(
            `INSERT INTO news (title, summary, image_url, link, source, published_at)
             VALUES ($1,$2,$3,$4,$5,$6)
                 RETURNING id, title, summary, image_url, link, source, published_at`,
            [title, summary, image_url, link, source, published_at]
        );
        res.json({ ok: true, news: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create news' });
    }
};

export const deleteNews = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
        await pool.query(`DELETE FROM news WHERE id = $1`, [id]);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete news' });
    }
};