import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';
import { sendPasswordReset } from '../utils/email';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mydayai-dev-secret-change-in-prod';

function makeToken(userId: string, email: string, name: string): string {
  return jwt.sign({ userId, email, name }, JWT_SECRET, { expiresIn: '30d' });
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      res.status(400).json({ error: 'email, name and password are required' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'This email is already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1,$2,$3) RETURNING id, email, name',
      [email.toLowerCase().trim(), name.trim(), passwordHash]
    );
    const user = userResult.rows[0];

    // Copy default templates (user_id IS NULL) for the new user
    await pool.query(
      `INSERT INTO schedule_templates
         (user_id, day_of_week, category, title, scheduled_start, scheduled_end, is_fixed, sort_order)
       SELECT $1, day_of_week, category, title, scheduled_start, scheduled_end, is_fixed, sort_order
       FROM schedule_templates WHERE user_id IS NULL`,
      [user.id]
    );

    // Create initial streaks
    await pool.query(
      `INSERT INTO streaks (user_id, category) VALUES
       ($1,'gym'),($1,'bilingual'),($1,'reading'),($1,'skill')`,
      [user.id]
    );

    const token = makeToken(user.id, user.email, user.name);
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }

    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = makeToken(user.id, user.email, user.name);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, created_at FROM users WHERE id=$1',
      [req.userId]
    );
    if (!result.rows.length) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'email is required' });
      return;
    }

    const result = await pool.query(
      'SELECT id, email, name FROM users WHERE email=$1',
      [email.toLowerCase().trim()]
    );

    // Always respond OK to avoid email enumeration
    if (result.rows.length === 0) {
      res.json({ message: 'If that email exists, a reset link has been generated.' });
      return;
    }

    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate old tokens for this user
    await pool.query(
      'UPDATE password_reset_tokens SET used=TRUE WHERE user_id=$1 AND used=FALSE',
      [user.id]
    );

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)',
      [user.id, token, expiresAt]
    );

    await sendPasswordReset(user.email, user.name, token);

    res.json({ message: 'Reset email sent. Check your inbox.' });
  } catch (err) {
    console.error('forgot-password error:', err);
    res.status(500).json({ error: 'Failed to generate reset link' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      res.status(400).json({ error: 'token and new_password are required' });
      return;
    }
    if (new_password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const result = await pool.query(
      `SELECT prt.id, prt.user_id FROM password_reset_tokens prt
       WHERE prt.token=$1 AND prt.used=FALSE AND prt.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Reset link is invalid or has expired' });
      return;
    }

    const { id: tokenId, user_id } = result.rows[0];
    const passwordHash = await bcrypt.hash(new_password, 10);

    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [passwordHash, user_id]);
    await pool.query('UPDATE password_reset_tokens SET used=TRUE WHERE id=$1', [tokenId]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('reset-password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
