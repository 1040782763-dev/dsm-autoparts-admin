import { Router } from 'express';
import { queryAll, queryOne, run, insert } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, (req, res) => {
  let sql = `SELECT r.*, c.garage_name as customer_name
    FROM reminders r JOIN customers c ON r.customer_id = c.id WHERE 1=1`;
  const params = [];
  if (req.user.role === 'salesperson') {
    sql += ' AND r.created_by_user_id = ?'; params.push(req.user.id);
  }
  if (req.query.status === 'pending') { sql += ' AND r.sent = 0'; }
  if (req.query.customer_id) { sql += ' AND r.customer_id = ?'; params.push(req.query.customer_id); }
  sql += ' ORDER BY r.scheduled_date ASC LIMIT 100';
  res.json(queryAll(sql, params));
});

router.post('/', authRequired, (req, res) => {
  const { customer_id, reminder_type, message, scheduled_date, whatsapp_number } = req.body;
  if (!customer_id || !scheduled_date) return res.status(400).json({ error: 'customer_id and scheduled_date required' });
  const id = insert(
    'INSERT INTO reminders (customer_id, reminder_type, message, scheduled_date, whatsapp_number, created_by_user_id) VALUES (?,?,?,?,?,?)',
    [customer_id, reminder_type || 'follow_up', message || null, scheduled_date, whatsapp_number || null, req.user.id]
  );
  res.json({ id });
});

router.patch('/:id/sent', authRequired, (req, res) => {
  run("UPDATE reminders SET sent = 1, sent_date = datetime('now') WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

router.delete('/:id', authRequired, (req, res) => {
  run('DELETE FROM reminders WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
