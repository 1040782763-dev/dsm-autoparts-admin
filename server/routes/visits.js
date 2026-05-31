import { Router } from 'express';
import { queryAll, queryOne, run, insert } from '../db.js';
import { authRequired, staffOnly } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, (req, res) => {
  let sql = `SELECT v.*, c.garage_name as customer_name, u.full_name as salesperson_name
    FROM customer_visits v
    JOIN customers c ON v.customer_id = c.id
    JOIN users u ON v.salesperson_id = u.id WHERE 1=1`;
  const params = [];
  if (req.user.role === 'salesperson') {
    sql += ' AND v.salesperson_id = ?'; params.push(req.user.id);
  }
  if (req.query.customer_id) { sql += ' AND v.customer_id = ?'; params.push(req.query.customer_id); }
  if (req.query.visit_date) { sql += ' AND v.visit_date = ?'; params.push(req.query.visit_date); }
  sql += ' ORDER BY v.visit_date DESC LIMIT 100';
  res.json(queryAll(sql, params));
});

router.post('/', authRequired, staffOnly, (req, res) => {
  const { customer_id, notes, latitude, longitude, outcome, next_follow_up_date } = req.body;
  if (!customer_id) return res.status(400).json({ error: 'customer_id required' });
  const today = new Date().toISOString().slice(0, 10);
  const id = insert(
    'INSERT INTO customer_visits (customer_id, salesperson_id, visit_date, latitude, longitude, notes, outcome, next_follow_up_date) VALUES (?,?,?,?,?,?,?,?)',
    [customer_id, req.user.id, today, latitude || null, longitude || null, notes || null, outcome || 'follow_up', next_follow_up_date || null]
  );
  res.json({ id });
});

export default router;
