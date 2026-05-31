import { Router } from 'express';
import { queryAll, queryOne, run, insert } from '../db.js';
import { authRequired, staffOnly } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, (req, res) => {
  let sql = `SELECT i.*, c.garage_name as customer_name, o.order_number,
    p.name_en as part_name, u1.full_name as reported_by_name
    FROM issues i
    JOIN customers c ON i.customer_id = c.id
    LEFT JOIN orders o ON i.order_id = o.id
    LEFT JOIN parts p ON i.part_id = p.id
    LEFT JOIN users u1 ON i.reported_by_user_id = u1.id WHERE 1=1`;
  const params = [];
  if (req.user.role === 'customer') {
    const cust = queryOne('SELECT id FROM customers WHERE user_id = ?', [req.user.id]);
    if (cust) { sql += ' AND i.customer_id = ?'; params.push(cust.id); }
    else return res.json([]);
  }
  if (req.user.role === 'salesperson') {
    sql += ' AND c.assigned_salesperson_id = ?'; params.push(req.user.id);
  }
  if (req.query.status) { sql += ' AND i.status = ?'; params.push(req.query.status); }
  sql += ' ORDER BY i.created_at DESC LIMIT 100';
  res.json(queryAll(sql, params));
});

router.post('/', authRequired, (req, res) => {
  const { order_id, customer_id, part_id, issue_type, description } = req.body;
  if (!customer_id || !description) return res.status(400).json({ error: 'customer_id and description required' });
  const id = insert(
    'INSERT INTO issues (order_id, customer_id, part_id, issue_type, description, reported_by_user_id) VALUES (?,?,?,?,?,?)',
    [order_id || null, customer_id, part_id || null, issue_type || 'other', description, req.user.id]
  );
  res.json({ id });
});

router.put('/:id', authRequired, staffOnly, (req, res) => {
  const { status, resolution } = req.body;
  if (status === 'resolved' || status === 'closed') {
    run('UPDATE issues SET status = ?, resolution = ?, resolved_by_user_id = ?, resolved_at = datetime("now"), updated_at = datetime("now") WHERE id = ?',
      [status, resolution || null, req.user.id, req.params.id]);
  } else {
    run('UPDATE issues SET status = ?, updated_at = datetime("now") WHERE id = ?', [status, req.params.id]);
  }
  res.json({ ok: true });
});

export default router;
