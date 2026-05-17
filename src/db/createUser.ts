import { pool } from './index';
import bcrypt from 'bcryptjs';

async function createUser() {
  const email = 'tandemodson41@gmail.com';
  const name = 'Tandem';
  const password = 'Mymoney12@';

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length > 0) {
      console.log('User already exists:', email);
      await pool.end();
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1,$2,$3) RETURNING id, email, name',
      [email, name, passwordHash]
    );
    const user = userResult.rows[0];

    // Copy default templates
    const copyResult = await pool.query(
      `INSERT INTO schedule_templates
         (user_id, day_of_week, category, title, scheduled_start, scheduled_end, is_fixed, sort_order)
       SELECT $1, day_of_week, category, title, scheduled_start, scheduled_end, is_fixed, sort_order
       FROM schedule_templates WHERE user_id IS NULL`,
      [user.id]
    );
    console.log(`Copied ${copyResult.rowCount} templates for user`);

    // Create initial streaks
    await pool.query(
      `INSERT INTO streaks (user_id, category) VALUES
       ($1,'gym'),($1,'bilingual'),($1,'reading'),($1,'skill')`,
      [user.id]
    );

    console.log('Account created successfully!');
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  ID:', user.id);
  } catch (err) {
    console.error('Failed to create user:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createUser();
