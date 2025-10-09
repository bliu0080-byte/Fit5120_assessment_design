import express from "express";
import { pool } from '../db.js';

const router = express.Router();

// Get all quiz data
router.get("/quiz-data", async (req, res) => {
    try {
        const modulesRes = await pool.query(`
      SELECT module_id, title FROM quiz_modules ORDER BY id
    `);
        const questionsRes = await pool.query(`
      SELECT module_id, scenario, question, options, correct_answer AS "correctAnswer", explanation
      FROM quiz_questions ORDER BY id
    `);
        const statsRes = await pool.query(`
      SELECT module_id, duration, participants FROM quiz_stats
    `);

        // Constructing the JSON format needed by the front-end
        const quizData = {};
        modulesRes.rows.forEach(m => {
            quizData[m.module_id] = {
                title: m.title,
                questions: questionsRes.rows.filter(q => q.module_id === m.module_id),
                stats: statsRes.rows.find(s => s.module_id === m.module_id) || {}
            };
        });

        res.json(quizData);
    } catch (err) {
        console.error("❌ [GET /quiz-data] Database error:", err);
        res.status(500).json({ error: "Database query failed" });
    }
});
router.post('/quiz-complete/:moduleId', async (req, res) => {
    try {
        const { moduleId } = req.params;
        await pool.query(
            `UPDATE quiz_stats
       SET participants = participants + 1
       WHERE module_id = $1`,
            [moduleId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('❌ [POST /quiz-complete] error:', err);
        res.status(500).json({ error: 'Database update failed' });
    }
});

export default router;