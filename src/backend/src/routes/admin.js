// routes/admin.js
import express from 'express';
import { pool } from '../db.js';

const admin = express.Router();

// List pending stories
admin.get('/moderation/pending', async (req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT id, text, type, state, moderation_score, moderation_reasons, created_at
      FROM stories
      WHERE moderation_status = 'pending'
      ORDER BY created_at ASC
      LIMIT 200
    `);
        res.json({ items: rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB query failed' });
    }
});

// Approve a story
admin.post('/moderation/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const r = await pool.query(
            `UPDATE stories SET moderation_status='approved' WHERE id=$1 RETURNING id`,
            [id]
        );
        if (!r.rowCount) return res.status(404).json({ error: 'Not found' });
        res.json({ ok: true, id });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB update failed' });
    }
});

// Reject a story
admin.post('/moderation/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const r = await pool.query(
            `UPDATE stories SET moderation_status='rejected' WHERE id=$1 RETURNING id`,
            [id]
        );
        if (!r.rowCount) return res.status(404).json({ error: 'Not found' });
        res.json({ ok: true, id });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB update failed' });
    }
});

export default admin;