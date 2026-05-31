import { Router } from 'express';
import { queryAll, queryOne, run, insert } from '../db.js';
import { authRequired, staffOnly } from '../middleware/auth.js';

const router = Router();

// List customers
router.get('/', authRequired, (req, res) => {
  let sql = `SELECT c.*, u.full_name as salesperson_name, u.phone as salesperson_phone
    FROM customers c LEFT JOIN users u ON c.assigned_salesperson_id = u.id WHERE 1=1`;
  const params = [];

  if (req.user.role === 'salesperson') {
    sql += ' AND c.assigned_salesperson_id = ?';
    params.push(req.user.id);
  }

  const { search, tier, active, assigned_salesperson_id } = req.query;
  if (search) { sql += ' AND (c.garage_name LIKE ? OR c.address LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (tier) { sql += ' AND c.tier = ?'; params.push(tier); }
  if (active !== undefined) { sql += ' AND c.active = ?'; params.push(parseInt(active)); }
  if (assigned_salesperson_id && req.user.role === 'admin') {
    sql += ' AND c.assigned_salesperson_id = ?'; params.push(assigned_salesperson_id);
  }

  sql += ' ORDER BY c.tier, c.garage_name';
  res.json(queryAll(sql, params));
});

// Map endpoint — all customers with coordinates
router.get('/map', authRequired, (req, res) => {
  let sql = `SELECT c.id, c.garage_name, c.address, c.latitude, c.longitude, c.tier, c.phone,
    c.total_orders, c.total_spent, c.last_order_date,
    u.full_name as salesperson_name
    FROM customers c LEFT JOIN users u ON c.assigned_salesperson_id = u.id
    WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL AND c.active = 1`;
  if (req.user.role === 'salesperson') {
    sql += ' AND c.assigned_salesperson_id = ?';
    return res.json(queryAll(sql, [req.user.id]));
  }
  res.json(queryAll(sql));
});

// Single customer
router.get('/:id', authRequired, (req, res) => {
  const c = queryOne(`SELECT c.*, u.full_name as salesperson_name
    FROM customers c LEFT JOIN users u ON c.assigned_salesperson_id = u.id WHERE c.id = ?`, [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'salesperson' && c.assigned_salesperson_id !== req.user.id) {
    return res.status(403).json({ error: 'Not your customer' });
  }
  // Get stats
  c.recentOrders = queryAll('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10', [c.id]);
  c.visits = queryAll('SELECT v.*, u.full_name as salesperson_name FROM customer_visits v LEFT JOIN users u ON v.salesperson_id = u.id WHERE v.customer_id = ? ORDER BY v.visit_date DESC LIMIT 10', [c.id]);
  c.issues = queryAll('SELECT * FROM issues WHERE customer_id = ? ORDER BY created_at DESC', [c.id]);
  res.json(c);
});

// Create customer
router.post('/', authRequired, staffOnly, (req, res) => {
  const { garage_name, address, latitude, longitude, tier, assigned_salesperson_id, phone, notes, maps_url, source } = req.body;
  if (!garage_name) return res.status(400).json({ error: 'Garage name required' });
  const salesId = req.user.role === 'salesperson' ? req.user.id : (assigned_salesperson_id || null);
  const id = insert(
    `INSERT INTO customers (garage_name, address, latitude, longitude, tier, assigned_salesperson_id, phone, notes, maps_url, source)
    VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [garage_name, address, latitude || null, longitude || null, tier || 'C', salesId, phone || null, notes || null, maps_url || null, source || 'manual']
  );
  run('INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)',
    [req.user.id, 'create_customer', 'customer', id, JSON.stringify({ garage_name })]);
  res.json({ id });
});

// Update customer
router.put('/:id', authRequired, staffOnly, (req, res) => {
  const c = queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'salesperson' && c.assigned_salesperson_id !== req.user.id) {
    return res.status(403).json({ error: 'Not your customer' });
  }
  const fields = ['garage_name', 'address', 'latitude', 'longitude', 'tier', 'assigned_salesperson_id', 'phone', 'notes', 'credit_eligible', 'active'];
  const sets = [];
  const vals = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(req.body[f]); }
  }
  if (sets.length === 0) return res.json({ ok: true });
  vals.push(req.params.id);
  run(`UPDATE customers SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`, vals);
  run('INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)',
    [req.user.id, 'update_customer', 'customer', req.params.id, JSON.stringify(req.body)]);
  res.json({ ok: true });
});

// Churn risk — no orders in N days
router.get('/report/churn-risk', authRequired, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const days = req.query.days || queryOne("SELECT value FROM settings WHERE key = 'churn_warning_days'")?.value || 14;
  const rows = queryAll(
    `SELECT c.*, MAX(o.order_date) as last_order
     FROM customers c LEFT JOIN orders o ON c.id = o.customer_id
     WHERE c.active = 1
     GROUP BY c.id
     HAVING last_order IS NULL OR last_order < date('now', '-' || ? || ' days')
     ORDER BY last_order ASC`, [days]);
  res.json(rows);
});

export default router;
