import { Router } from 'express';
import { queryAll, queryOne } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', authRequired, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  res.json({
    todayRevenue: queryOne("SELECT COALESCE(SUM(total_amount), 0) as val FROM orders WHERE order_date = ? AND status != 'cancelled'", [today])?.val || 0,
    todayOrders: queryOne("SELECT COUNT(*) as val FROM orders WHERE order_date = ? AND status != 'cancelled'", [today])?.val || 0,
    monthRevenue: queryOne("SELECT COALESCE(SUM(total_amount), 0) as val FROM orders WHERE order_date LIKE ? AND status != 'cancelled'", [`${thisMonth}%`])?.val || 0,
    monthOrders: queryOne("SELECT COUNT(*) as val FROM orders WHERE order_date LIKE ? AND status != 'cancelled'", [`${thisMonth}%`])?.val || 0,
    totalCustomers: queryOne('SELECT COUNT(*) as val FROM customers WHERE active = 1')?.val || 0,
    pendingOrders: queryOne("SELECT COUNT(*) as val FROM orders WHERE status IN ('pending','confirmed','picked_up','out_for_delivery')")?.val || 0,
    lowStock: queryOne('SELECT COUNT(*) as val FROM parts WHERE stock_quantity <= low_stock_threshold AND active = 1')?.val || 0,
    todayCollections: queryOne("SELECT COALESCE(SUM(amount), 0) as val FROM payments WHERE payment_date = ?", [today])?.val || 0,
  });
});

router.get('/revenue', authRequired, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { period, from, to } = req.query;
  let sql;
  if (period === 'daily') {
    sql = `SELECT order_date as label, SUM(total_amount) as revenue, COUNT(*) as orders
      FROM orders WHERE status != 'cancelled'`;
    const params = [];
    if (from) { sql += ' AND order_date >= ?'; params.push(from); }
    if (to) { sql += ' AND order_date <= ?'; params.push(to); }
    sql += ' GROUP BY order_date ORDER BY order_date LIMIT 60';
    res.json(queryAll(sql, params));
  } else if (period === 'monthly') {
    sql = `SELECT strftime('%Y-%m', order_date) as label, SUM(total_amount) as revenue, COUNT(*) as orders
      FROM orders WHERE status != 'cancelled' GROUP BY label ORDER BY label LIMIT 24`;
    res.json(queryAll(sql));
  } else {
    res.json(queryAll("SELECT strftime('%Y-%W', order_date) as label, SUM(total_amount) as revenue FROM orders WHERE status != 'cancelled' GROUP BY label ORDER BY label DESC LIMIT 12"));
  }
});

router.get('/salesperson-rankings', authRequired, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  res.json(queryAll(
    `SELECT u.id, u.full_name,
      COUNT(o.id) as total_orders,
      COALESCE(SUM(o.total_amount), 0) as total_revenue,
      COALESCE(SUM(p.amount), 0) as total_collected,
      COUNT(DISTINCT o.customer_id) as customers_served
    FROM users u
    LEFT JOIN orders o ON o.created_by_user_id = u.id AND o.status != 'cancelled'
    LEFT JOIN payments p ON p.collected_by_user_id = u.id
    WHERE u.role = 'salesperson' AND u.active = 1
    GROUP BY u.id ORDER BY total_revenue DESC`
  ));
});

router.get('/profit-margin', authRequired, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  res.json(queryAll(
    `SELECT strftime('%Y-%m', o.order_date) as month,
      COUNT(oi.id) as items_sold,
      SUM(oi.subtotal) as revenue,
      SUM(p.wholesale_cost * oi.quantity) as cost,
      SUM(oi.subtotal) - SUM(p.wholesale_cost * oi.quantity) as gross_profit
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN parts p ON oi.part_id = p.id
    WHERE o.status != 'cancelled'
    GROUP BY month ORDER BY month DESC LIMIT 12`
  ));
});

router.get('/customer/:id', authRequired, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const stats = queryOne(
    `SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue,
      MAX(order_date) as last_order_date
    FROM orders WHERE customer_id = ? AND status != 'cancelled'`, [req.params.id]);
  const monthly = queryAll(
    `SELECT strftime('%Y-%m', order_date) as month, COUNT(*) as orders, SUM(total_amount) as revenue
    FROM orders WHERE customer_id = ? AND status != 'cancelled'
    GROUP BY month ORDER BY month DESC LIMIT 12`, [req.params.id]);
  res.json({ ...stats, monthly });
});

export default router;
