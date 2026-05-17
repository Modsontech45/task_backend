import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /api/templates — grouped by day_of_week
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM schedule_templates WHERE user_id=$1 ORDER BY day_of_week, sort_order',
      [req.userId]
    );
    const grouped: Record<number, typeof result.rows> = {};
    for (const row of result.rows) {
      if (!grouped[row.day_of_week]) grouped[row.day_of_week] = [];
      grouped[row.day_of_week].push(row);
    }
    res.json(grouped);
  } catch (err) {
    console.error('templates GET error:', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// GET /api/templates/flat
router.get('/flat', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM schedule_templates WHERE user_id=$1 ORDER BY day_of_week, sort_order',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST /api/templates
router.post('/', async (req: Request, res: Response) => {
  try {
    const { day_of_week, category, title, scheduled_start, scheduled_end, is_fixed } = req.body;
    if (day_of_week == null || !category || !title || !scheduled_start || !scheduled_end) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const maxRes = await pool.query(
      'SELECT COALESCE(MAX(sort_order),0)+1 AS next FROM schedule_templates WHERE user_id=$1 AND day_of_week=$2',
      [req.userId, day_of_week]
    );
    const sort_order = maxRes.rows[0].next;

    const result = await pool.query(
      `INSERT INTO schedule_templates
         (user_id, day_of_week, category, title, scheduled_start, scheduled_end, is_fixed, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.userId, day_of_week, category, title, scheduled_start, scheduled_end, is_fixed ?? false, sort_order]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('templates POST error:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// PUT /api/templates/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category, title, scheduled_start, scheduled_end, is_fixed, sort_order } = req.body;

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (category !== undefined)        { fields.push(`category=$${idx++}`);        values.push(category); }
    if (title !== undefined)           { fields.push(`title=$${idx++}`);           values.push(title); }
    if (scheduled_start !== undefined) { fields.push(`scheduled_start=$${idx++}`); values.push(scheduled_start); }
    if (scheduled_end !== undefined)   { fields.push(`scheduled_end=$${idx++}`);   values.push(scheduled_end); }
    if (is_fixed !== undefined)        { fields.push(`is_fixed=$${idx++}`);        values.push(is_fixed); }
    if (sort_order !== undefined)      { fields.push(`sort_order=$${idx++}`);      values.push(sort_order); }

    if (!fields.length) { res.status(400).json({ error: 'Nothing to update' }); return; }

    values.push(req.userId, id);
    const result = await pool.query(
      `UPDATE schedule_templates SET ${fields.join(',')} WHERE user_id=$${idx} AND id=$${idx + 1} RETURNING *`,
      values
    );
    if (!result.rows.length) { res.status(404).json({ error: 'Template not found' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('templates PUT error:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /api/templates/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'DELETE FROM schedule_templates WHERE user_id=$1 AND id=$2 RETURNING id',
      [req.userId, req.params.id]
    );
    if (!result.rows.length) { res.status(404).json({ error: 'Template not found' }); return; }
    res.json({ deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;
