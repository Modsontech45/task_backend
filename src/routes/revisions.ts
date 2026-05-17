import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /api/revisions/sessions?days=14
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 14;

    const result = await pool.query(
      `SELECT
         ab.id            AS block_id,
         ab.date          AS course_date,
         ab.title         AS course_name,
         ab.scheduled_start,
         ab.scheduled_end,
         COUNT(r.id)      AS revision_count,
         MAX(r.revised_on) AS last_revised,
         MAX(r.understanding_score) AS best_score,
         ARRAY_AGG(
           json_build_object(
             'id',          r.id,
             'revised_on',  r.revised_on,
             'duration_min',r.duration_min,
             'understanding_score', r.understanding_score,
             'notes',       r.notes
           ) ORDER BY r.revised_on DESC
         ) FILTER (WHERE r.id IS NOT NULL) AS revision_history
       FROM activity_blocks ab
       LEFT JOIN revisions r ON r.activity_block_id = ab.id
       WHERE ab.user_id=$1
         AND ab.category='school'
         AND ab.date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
         AND ab.date < CURRENT_DATE
       GROUP BY ab.id, ab.date, ab.title, ab.scheduled_start, ab.scheduled_end
       ORDER BY ab.date DESC, ab.scheduled_start`,
      [req.userId, days]
    );

    const byDate: Record<string, typeof result.rows> = {};
    for (const row of result.rows) {
      const d = row.course_date instanceof Date
        ? row.course_date.toISOString().split('T')[0]
        : String(row.course_date).split('T')[0];
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push({
        ...row,
        revision_count: parseInt(row.revision_count),
        revision_history: row.revision_history || [],
      });
    }

    res.json(byDate);
  } catch (err) {
    console.error('revisions/sessions error:', err);
    res.status(503).json({ error: 'Database unavailable, please retry.' });
  }
});

// GET /api/revisions/pending
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT ab.id AS block_id, ab.date AS course_date, ab.title AS course_name,
              ab.scheduled_start, ab.scheduled_end
       FROM activity_blocks ab
       WHERE ab.user_id=$1
         AND ab.category='school'
         AND ab.date >= CURRENT_DATE - INTERVAL '14 days'
         AND ab.date < CURRENT_DATE
         AND NOT EXISTS (SELECT 1 FROM revisions r WHERE r.activity_block_id=ab.id)
       ORDER BY ab.date DESC, ab.scheduled_start`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(503).json({ error: 'Database unavailable, please retry.' });
  }
});

// POST /api/revisions
router.post('/', async (req: Request, res: Response) => {
  try {
    const { activity_block_id, course_name, course_date, revised_on, duration_min, understanding_score, notes } = req.body;

    if (!activity_block_id || !course_name || !course_date) {
      res.status(400).json({ error: 'activity_block_id, course_name, course_date are required' });
      return;
    }

    // Verify the activity block belongs to this user
    const check = await pool.query(
      'SELECT id FROM activity_blocks WHERE id=$1 AND user_id=$2',
      [activity_block_id, req.userId]
    );
    if (!check.rows.length) {
      res.status(403).json({ error: 'Activity block not found' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO revisions
         (activity_block_id, course_name, course_date, revised_on, duration_min, understanding_score, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        activity_block_id,
        course_name,
        course_date,
        revised_on || new Date().toISOString().split('T')[0],
        duration_min || 30,
        understanding_score || null,
        notes || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('revisions POST error:', err);
    res.status(503).json({ error: 'Database unavailable, please retry.' });
  }
});

// DELETE /api/revisions/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Only allow deleting revisions linked to the user's own activity blocks
    await pool.query(
      `DELETE FROM revisions r
       USING activity_blocks ab
       WHERE r.id=$1 AND r.activity_block_id=ab.id AND ab.user_id=$2`,
      [req.params.id, req.userId]
    );
    res.json({ deleted: req.params.id });
  } catch (err) {
    res.status(503).json({ error: 'Database unavailable, please retry.' });
  }
});

export default router;
