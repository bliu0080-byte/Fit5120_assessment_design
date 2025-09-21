// routes/stories.js
import express from 'express';
import { pool } from '../db.js';
const router = express.Router();

// Get Story List
router.get('/stories', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT s.id, s.text, s.type, s.state, s.likes, s.created_at AS "createdAt",
                   COALESCE(c.cnt, 0) AS "commentCount"
            FROM stories s
                     LEFT JOIN (
                SELECT story_id, COUNT(*)::int AS cnt
                FROM story_comments
                GROUP BY story_id
            ) c ON s.id = c.story_id
            ORDER BY s.created_at DESC
                LIMIT 100
        `);
        res.json({ items: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB query failed' });
    }
});

//New Stories
router.post('/stories', async (req, res) => {
    const { text, type, state } = req.body;
    if (!text || !type) return res.status(400).json({ error: 'Missing fields' });
    try {
        const { rows } = await pool.query(`
      INSERT INTO stories (text, type, state)
      VALUES ($1, $2, $3)
      RETURNING id, text, type, state, likes, created_at AS "createdAt"
    `, [text, type, state]);
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Insert failed' });
    }
});

// LIKE STORY
router.post('/stories/:id/like', async (req, res) => {
    try {
        const { rows } = await pool.query(`
      UPDATE stories SET likes = likes + 1
      WHERE id = $1
      RETURNING id, likes
    `, [req.params.id]);
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Like failed' });
    }
});
// Unlike a story
router.post('/stories/:id/unlike', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `UPDATE stories
             SET likes = GREATEST(COALESCE(likes, 0) - 1, 0)
             WHERE id = $1
             RETURNING id, likes`,
            [id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('UNLIKE error:', err);
        res.status(500).json({ error: 'DB error', detail: err.message });
    }
});

// GET /stories/:id/comments
router.get('/stories/:id/comments', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, text, author, created_at AS "createdAt"
             FROM story_comments
             WHERE story_id = $1
             ORDER BY created_at ASC`,
            [req.params.id]
        );
        res.json(rows); // 注意：直接返回数组，不是 {items: rows}
    } catch (e) {
        console.error('GET comments error:', e);
        res.status(500).json({ error: 'DB query failed' });
    }
});

// POST /stories/:id/comments
router.post('/stories/:id/comments', express.json(), async (req, res) => {
    const { text, author } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text required' });
    try {
        const { rows } = await pool.query(
            `INSERT INTO story_comments (story_id, text, author)
       VALUES ($1, $2, $3)
       RETURNING id, text, author, created_at AS "createdAt"`,
            [req.params.id, text, author || null]
        );
        res.status(201).json(rows[0]);
    } catch (e) {
        console.error('POST comment error:', e);
        res.status(500).json({ error: 'DB insert failed' });
    }
});

// DELETE /stories/:id  -> hard delete a story and its comments
router.delete('/stories/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // If you have FK with ON DELETE CASCADE on story_comments.story_id, you can skip this explicit delete
        await client.query('DELETE FROM story_comments WHERE story_id = $1', [id]);

        const del = await client.query('DELETE FROM stories WHERE id = $1 RETURNING id', [id]);

        await client.query('COMMIT');

        if (del.rowCount === 0) return res.status(404).json({ error: 'Not found' });

        // 204 No Content is idiomatic for successful delete
        return res.status(204).end();
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('DELETE story error:', err);
        return res.status(500).json({ error: 'Delete failed', detail: err.message });
    } finally {
        client.release();
    }
});
export default router;