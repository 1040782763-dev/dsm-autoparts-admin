import { Router } from 'express';
import { queryAll, queryOne, run, insert } from '../db.js';
import { authRequired, staffOnly } from '../middleware/auth.js';
import { v4 as uuid } from 'uuid';

const router = Router();

function generateOrderNumber() {
  const now = new Date();
  const d = now.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = uuid().slice(0, 4).toUpperCase();
  return `AP-${d}-${seq}`;
}

// List orders
router.get('/', authRequired, (req, res) => {
  let sql = `SELECT o.*, c.garage_name as customer_name, c.phone as customer_phone,
    u.full_name as created_by_name
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.created_by_user_id = u.id
    WHERE 1=1`;
  const params = [];

  if (req.user.role === 'customer') {
    const cust = queryOne('SELECT id FROM customers WHERE user_id = ?', [req.user.id]);
    if (cust) { sql += ' AND o.customer_id = ?'; params.push(cust.id); }
    else return res.json([]);
  }
  if (req.user.role === 'salesperson') {
    sql += ' AND c.assigned_salesperson_id = ?';
    params.push(req.user.id);
  }

  const { status, customer_id, order_date, delivery_batch, payment_status } = req.query;
  if (status) { sql += ' AND o.status = ?'; params.push(status); }
  if (customer_id && req.user.role === 'admin') { sql += ' AND o.customer_id = ?'; params.push(customer_id); }
  if (order_date) { sql += ' AND o.order_date = ?'; params.push(order_date); }
  if (delivery_batch) { sql += ' AND o.delivery_batch = ?'; params.push(delivery_batch); }
  if (payment_status) { sql += ' AND o.payment_status = ?'; params.push(payment_status); }

  sql += ' ORDER BY o.created_at DESC LIMIT 200';
  res.json(queryAll(sql, params));
});

// Daily orders summary
router.get('/daily', authRequired, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  let sql = `SELECT o.*, c.garage_name as customer_name, c.tier as customer_tier
    FROM orders o JOIN customers c ON o.customer_id = c.id
    WHERE o.order_date = ?`;
  const params = [date];
  if (req.user.role === 'salesperson') {
    sql += ' AND c.assigned_salesperson_id = ?';
    params.push(req.user.id);
  }
  sql += ' ORDER BY o.delivery_batch, o.created_at';
  res.json(queryAll(sql, params));
});

// Single order with items
router.get('/:id', authRequired, (req, res) => {
  const o = queryOne(`SELECT o.*, c.garage_name as customer_name, c.phone as customer_phone, c.address as customer_address,
    u.full_name as created_by_name
    FROM orders o JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.created_by_user_id = u.id WHERE o.id = ?`, [req.params.id]);
  if (!o) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'salesperson') {
    const c = queryOne('SELECT assigned_salesperson_id FROM customers WHERE id = ?', [o.customer_id]);
    if (c && c.assigned_salesperson_id !== req.user.id) return res.status(403).json({ error: 'Not your order' });
  }
  o.items = queryAll('SELECT oi.*, p.part_number, p.name_en, p.name_sw FROM order_items oi LEFT JOIN parts p ON oi.part_id = p.id WHERE oi.order_id = ?', [o.id]);
  o.payments = queryAll('SELECT pm.*, u.full_name as collector_name FROM payments pm LEFT JOIN users u ON pm.collected_by_user_id = u.id WHERE pm.order_id = ?', [o.id]);
  res.json(o);
});

// Create order
router.post('/', authRequired, (req, res) => {
  const { customer_id, items, delivery_batch, notes } = req.body;
  if (!customer_id || !items || !items.length) return res.status(400).json({ error: 'customer_id and items required' });

  const cust = queryOne('SELECT * FROM customers WHERE id = ? AND active = 1', [customer_id]);
  if (!cust) return res.status(404).json({ error: 'Customer not found' });
  if (req.user.role === 'salesperson' && cust.assigned_salesperson_id !== req.user.id) {
    return res.status(403).json({ error: 'Not your customer' });
  }

  const orderNumber = generateOrderNumber();
  const today = new Date().toISOString().slice(0, 10);
  const batch = delivery_batch || 'next_day';

  let total = 0;
  const orderId = insert(
    `INSERT INTO orders (order_number, customer_id, created_by_user_id, status, order_date, delivery_batch, notes, total_amount)
    VALUES (?,?,?,?,?,?,?,?)`,
    [orderNumber, customer_id, req.user.id, 'pending', today, batch, notes || null, 0]
  );

  for (const item of items) {
    const part = queryOne('SELECT * FROM parts WHERE id = ? AND active = 1', [item.part_id]);
    if (!part) continue;
    const qty = parseInt(item.quantity) || 1;
    const price = part.selling_price;
    const sub = qty * price;
    total += sub;
    run(
      'INSERT INTO order_items (order_id, part_id, part_name, quantity, unit_price, subtotal) VALUES (?,?,?,?,?,?)',
      [orderId, part.id, part.name_en, qty, price, sub]
    );
  }

  run('UPDATE orders SET total_amount = ?, updated_at = datetime("now") WHERE id = ?', [total, orderId]);
  run('UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ?, last_order_date = ?, updated_at = datetime("now") WHERE id = ?',
    [total, today, customer_id]);
  run('INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)',
    [req.user.id, 'create_order', 'order', orderId, JSON.stringify({ order_number: orderNumber, total, customer_id })]);

  res.json({ id: orderId, order_number: orderNumber, total_amount: total });
});

// Quick order (WhatsApp style)
router.post('/quick', authRequired, staffOnly, (req, res) => {
  const { customer_id, text, delivery_batch } = req.body;
  if (!customer_id || !text) return res.status(400).json({ error: 'customer_id and text required' });

  // Parse text like "BRK-001 x2, OIL-045 x5" or "brake pads toyota 2, filter 5"
  const lines = text.split(/[,;\n]+/);
  const items = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try to match "PART-NUMBER xQTY" pattern
    const qtyMatch = trimmed.match(/x\s*(\d+)\s*$/i) || trimmed.match(/(\d+)\s*$/);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
    const search = qtyMatch ? trimmed.replace(qtyMatch[0], '').trim() : trimmed;

    // Search part by number, English name, or Swahili name
    const part = queryOne(
      'SELECT * FROM parts WHERE (part_number LIKE ? OR name_en LIKE ? OR name_sw LIKE ?) AND active = 1 LIMIT 1',
      [`%${search}%`, `%${search}%`, `%${search}%`]
    );
    if (part) {
      items.push({ part_id: part.id, quantity: qty });
    }
  }

  if (items.length === 0) return res.status(400).json({ error: 'No matching parts found' });

  // Delegate to standard order creation via request body
  req.body = { customer_id, items, delivery_batch, notes: `Quick order: ${text}` };

  // Inline the order creation logic
  const cust = queryOne('SELECT * FROM customers WHERE id = ? AND active = 1', [customer_id]);
  const today = new Date().toISOString().slice(0, 10);
  const orderNumber = generateOrderNumber();

  let total = 0;
  const orderId = insert(
    `INSERT INTO orders (order_number, customer_id, created_by_user_id, status, order_date, delivery_batch, notes, total_amount)
    VALUES (?,?,?,?,?,?,?,?)`,
    [orderNumber, customer_id, req.user.id, 'pending', today, delivery_batch || 'next_day', `Quick: ${text}`, 0]
  );

  for (const item of items) {
    const part = queryOne('SELECT * FROM parts WHERE id = ?', [item.part_id]);
    if (!part) continue;
    const sub = item.quantity * part.selling_price;
    total += sub;
    run('INSERT INTO order_items (order_id, part_id, part_name, quantity, unit_price, subtotal) VALUES (?,?,?,?,?,?)',
      [orderId, part.id, part.name_en, item.quantity, part.selling_price, sub]);
  }

  run('UPDATE orders SET total_amount = ? WHERE id = ?', [total, orderId]);
  run('UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ?, last_order_date = ?, updated_at = datetime("now") WHERE id = ?', [total, today, customer_id]);

  res.json({ id: orderId, order_number: orderNumber, total_amount: total, items_matched: items.length });
});

// Update order status
router.patch('/:id/status', authRequired, staffOnly, (req, res) => {
  const { status } = req.body;
  const validTransitions = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['picked_up', 'cancelled'],
    'picked_up': ['out_for_delivery', 'cancelled'],
    'out_for_delivery': ['delivered', 'cancelled'],
    'delivered': ['paid'],
    'paid': [],
    'cancelled': [],
  };
  const o = queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!o) return res.status(404).json({ error: 'Not found' });
  if (!validTransitions[o.status]?.includes(status)) {
    return res.status(400).json({ error: `Cannot transition from ${o.status} to ${status}` });
  }
  const updates = ['status = ?'];
  const params = [status];
  if (status === 'paid') {
    updates.push('payment_status = ?');
    params.push('paid');
    updates.push('delivery_date = ?');
    params.push(new Date().toISOString().slice(0, 10));
  }
  params.push(req.params.id);
  run(`UPDATE orders SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`, params);
  run('INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)',
    [req.user.id, 'update_order_status', 'order', req.params.id, JSON.stringify({ from: o.status, to: status })]);
  res.json({ ok: true });
});

// Cancel order
router.patch('/:id/cancel', authRequired, staffOnly, (req, res) => {
  const o = queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!o) return res.status(404).json({ error: 'Not found' });
  if (['paid', 'cancelled'].includes(o.status)) return res.status(400).json({ error: 'Cannot cancel' });
  run("UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

export default router;
