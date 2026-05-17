import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /api/streaks
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM streaks WHERE user_id=$1 ORDER BY category',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch streaks' });
  }
});

// GET /api/streaks/:category
router.get('/:category', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM streaks WHERE user_id=$1 AND category=$2',
      [req.userId, req.params.category]
    );
    if (!result.rows.length) {
      res.status(404).json({ error: 'Streak not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch streak' });
  }
});

export default router;
