import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { queryOne, run, insert } from '../db.js';
import { generateToken, authRequired } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = queryOne('SELECT * FROM users WHERE username = ? AND active = 1', [username]);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = generateToken(user);
  const { password: _, ...safe } = user;
  run('INSERT INTO activity_log (user_id, action, entity_type, details) VALUES (?,?,?,?)',
    [user.id, 'login', 'user', JSON.stringify({ username })]);
  res.json({ token, user: safe });
});

router.get('/me', authRequired, (req, res) => {
  const user = queryOne('SELECT id, username, role, full_name, phone, whatsapp, language_pref, active FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Role-specific extra stats
  let extra = {};
  if (user.role === 'salesperson') {
    extra.customers = queryOne('SELECT COUNT(*) as count FROM customers WHERE assigned_salesperson_id = ? AND active = 1', [user.id]);
    extra.todayOrders = queryOne("SELECT COUNT(*) as count FROM orders WHERE created_by_user_id = ? AND order_date = date('now')", [user.id]);
  }
  if (user.role === 'customer') {
    const c = queryOne('SELECT id FROM customers WHERE user_id = ?', [user.id]);
    if (c) extra.customerId = c.id;
  }
  res.json({ user: { ...user, ...extra } });
});

router.post('/change-password', authRequired, async (req, res) => {
  const { current, newPassword } = req.body;
  const user = queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
  const valid = await bcrypt.compare(current, user.password);
  if (!valid) return res.status(400).json({ error: 'Current password wrong' });
  const hash = await bcrypt.hash(newPassword, 10);
  run('UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?', [hash, req.user.id]);
  res.json({ ok: true });
});

// Admin creates user account
router.post('/register', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { username, password, role, full_name, phone, whatsapp } = req.body;
  if (!username || !password || !role || !full_name) return res.status(400).json({ error: 'Missing fields' });
  const hash = await bcrypt.hash(password, 10);
  const id = insert(
    'INSERT INTO users (username, password, role, full_name, phone, whatsapp) VALUES (?,?,?,?,?,?)',
    [username, hash, role, full_name, phone || null, whatsapp || null]
  );
  run('INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)',
    [req.user.id, 'create_user', 'user', id, JSON.stringify({ role, full_name })]);
  res.json({ id });
});

// List users (admin only)
router.get('/users', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { role } = req.query;
  let sql = 'SELECT id, username, role, full_name, phone, whatsapp, active, created_at FROM users WHERE 1=1';
  const params = [];
  if (role) { sql += ' AND role = ?'; params.push(role); }
  sql += ' ORDER BY role, full_name';
  const rows = queryOne ? (await import('../db.js')).queryAll(sql, params) : [];
  const { queryAll } = await import('../db.js');
  res.json(queryAll(sql, params));
});

router.put('/users/:id', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { active, full_name, phone, whatsapp } = req.body;
  run('UPDATE users SET active = COALESCE(?, active), full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), whatsapp = COALESCE(?, whatsapp), updated_at = datetime("now") WHERE id = ?',
    [active, full_name, phone, whatsapp, req.params.id]);
  res.json({ ok: true });
});

export default router;
