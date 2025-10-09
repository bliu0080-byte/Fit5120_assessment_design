// routes/game.js
import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

/**
 * @route   GET /api/game-data
 * @desc    Get game mail data, settings, tips
 * @access  Public
 */
router.get('/game-data', async (req, res) => {
    try {
        // 1️ Get all emails
        const emailsRes = await pool.query(`
      SELECT email_id AS id,
             text,
             type,
             emoji,
             aria
      FROM game_emails
      ORDER BY id;
    `);

        // 2 Get game settings (only one)
        const settingsRes = await pool.query(`
      SELECT initial_time AS "initialTime",
             correct_points AS "correctPoints",
             incorrect_penalty AS "incorrectPenalty",
             streak_bonus AS "streakBonus"
      FROM game_settings
      LIMIT 1;
    `);

        // 3 Get Game Tips
        const tipsRes = await pool.query(`
      SELECT tip
      FROM game_tips
      ORDER BY id;
    `);

        // 4 Return Unified JSON
        res.json({
            emails: emailsRes.rows,
            gameSettings: settingsRes.rows[0] || {},
            gameTips: tipsRes.rows.map(t => t.tip)
        });
    } catch (err) {
        console.error('❌ [GET /game-data] Database error:', err);
        res.status(500).json({ error: 'Database query failed' });
    }
});

export default router;