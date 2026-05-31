import { Router } from 'express';
import { queryAll, queryOne, run, insert } from '../db.js';
import { authRequired, staffOnly } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, (req, res) => {
  let sql = `SELECT p.*, o.order_number, c.garage_name as customer_name,
    u.full_name as collector_name
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON p.collected_by_user_id = u.id
    WHERE 1=1`;
  const params = [];
  if (req.user.role === 'salesperson') {
    sql += ' AND p.collected_by_user_id = ?';
    params.push(req.user.id);
  }
  const { order_id, payment_date } = req.query;
  if (order_id) { sql += ' AND p.order_id = ?'; params.push(order_id); }
  if (payment_date) { sql += ' AND p.payment_date = ?'; params.push(payment_date); }
  sql += ' ORDER BY p.created_at DESC LIMIT 200';
  res.json(queryAll(sql, params));
});

router.post('/', authRequired, staffOnly, (req, res) => {
  const { order_id, amount, payment_method, receipt_number, notes } = req.body;
  if (!order_id || !amount) return res.status(400).json({ error: 'order_id and amount required' });
  const today = new Date().toISOString().slice(0, 10);

  const id = insert(
    'INSERT INTO payments (order_id, amount, payment_method, collected_by_user_id, payment_date, receipt_number, notes) VALUES (?,?,?,?,?,?,?)',
    [order_id, amount, payment_method || 'cash', req.user.id, today, receipt_number || null, notes || null]
  );

  // Update order payment status
  const o = queryOne('SELECT * FROM orders WHERE id = ?', [order_id]);
  if (o) {
    const totalPaid = queryOne('SELECT SUM(amount) as total FROM payments WHERE order_id = ?', [order_id])?.total || 0;
    const newStatus = totalPaid >= o.total_amount ? 'paid' : 'partial';
    run('UPDATE orders SET payment_status = ?, updated_at = datetime("now") WHERE id = ?', [newStatus, order_id]);
  }

  res.json({ id });
});

router.get('/daily-summary', authRequired, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  let sql = `SELECT u.id, u.full_name, SUM(p.amount) as total_collected, COUNT(p.id) as payment_count
    FROM payments p JOIN users u ON p.collected_by_user_id = u.id
    WHERE p.payment_date = ?`;
  const params = [date];
  if (req.user.role === 'salesperson') {
    sql += ' AND p.collected_by_user_id = ?';
    params.push(req.user.id);
  }
  sql += ' GROUP BY u.id ORDER BY total_collected DESC';
  res.json(queryAll(sql, params));
});

export default router;
