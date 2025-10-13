// routes/stories.js
import express from 'express';
import { pool } from '../db.js';
import { moderateStory } from '../utils/moderation.js';

const router = express.Router();


// routes/stories.js
// GET /stories?sort=popular&page=1&limit=9&search=...
router.get('/stories', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 9;
        const offset = (page - 1) * limit;
        const search = (req.query.search || '').trim();
        const sort = (req.query.sort || 'recent').toLowerCase(); // 'recent' or 'popular'

        // --- Search terms ---
        let whereClause = `WHERE s.moderation_status = 'approved'`;
        const params = [];

        if (search) {
            params.push(`%${search}%`);
            whereClause += ` AND (s.text ILIKE $${params.length} OR s.type ILIKE $${params.length})`;
        }

        // --- Sorting logic ---
        // 🔹 Sort globally by creation time or number of likes
        let orderClause = 'ORDER BY s.created_at DESC';
        if (sort === 'popular') {
            orderClause = `
        ORDER BY (COALESCE(s.likes, 0) * 2 + COALESCE(c.cnt, 0)) DESC,
                 s.created_at DESC
      `;
        }

        // --- 主查询 ---
        const query = `
      SELECT s.id,
             s.text,
             s.type,
             s.state,
             COALESCE(s.likes, 0) AS likes,
             s.created_at AS "createdAt",
             COALESCE(c.cnt, 0) AS "commentCount"
      FROM stories s
      LEFT JOIN (
        SELECT story_id, COUNT(*)::int AS cnt
        FROM story_comments
        GROUP BY story_id
      ) c ON s.id = c.story_id
      ${whereClause}
      ${orderClause}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

        params.push(limit, offset);

        const { rows } = await pool.query(query, params);

        // --- 统计总数 ---
        const countQuery = `SELECT COUNT(*)::int AS total FROM stories s ${whereClause}`;
        const { rows: countRows } = await pool.query(countQuery, params.slice(0, params.length - 2));
        const total = countRows[0]?.total || 0;

        res.json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            sort,
            items: rows,
        });
    } catch (err) {
        console.error('GET /stories error:', err);
        res.status(500).json({ error: 'DB query failed' });
    }
});

// Create story (with moderation)
router.post('/stories', async (req, res) => {
    try {
        const { text, type, state } = req.body || {};
        if (!text) return res.status(400).json({ error: 'Missing text' });

        // Run moderation
        const mod = await moderateStory(text);

        // Immediate reject path (e.g., profanity)
        if (mod.action === 'reject') {
            return res.status(400).json({
                error: 'Content violates our rules.',
                details: mod
            });
        }

        // Decide final type (fallback to guessed category if not provided)
        const finalType = type || mod.categoryGuess || 'other';
        const moderationStatus = mod.action === 'allow' ? 'approved' : 'pending';

        const { rows } = await pool.query(
            `INSERT INTO stories (text, type, state, likes, moderation_status, moderation_score, moderation_reasons, created_at)
       VALUES ($1,$2,$3,0,$4,$5,$6,NOW())
       RETURNING id, moderation_status`,
            [mod.cleanText, finalType, state || null, moderationStatus, mod.score, JSON.stringify(mod.reasons)]
        );

        return res.json({
            id: rows[0].id,
            moderationStatus: rows[0].moderation_status,
            moderation: mod
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB insert failed' });
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
        res.json(rows);
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