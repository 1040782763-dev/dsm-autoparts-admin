import { Router } from 'express';
import { queryAll, queryOne, run, insert } from '../db.js';
import { authRequired, adminOnly } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, (req, res) => {
  let sql = 'SELECT * FROM parts WHERE 1=1';
  const params = [];
  const { search, category, active } = req.query;
  if (search) { sql += ' AND (name_en LIKE ? OR name_sw LIKE ? OR part_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (active !== undefined) { sql += ' AND active = ?'; params.push(parseInt(active)); }
  sql += ' ORDER BY category, name_en';
  res.json(queryAll(sql, params));
});

router.get('/categories', authRequired, (req, res) => {
  res.json(queryAll('SELECT DISTINCT category FROM parts WHERE active = 1 ORDER BY category'));
});

router.get('/:id', authRequired, (req, res) => {
  const p = queryOne('SELECT * FROM parts WHERE id = ?', [req.params.id]);
  if (!p) return res.status(404).json({ error: 'Not found' });
  // Profit margin
  p.profit_margin_pct = p.selling_price > 0 ? Math.round((1 - p.wholesale_cost / p.selling_price) * 100) : 0;
  p.savings_vs_retail = p.retail_market_price ? Math.round((1 - p.selling_price / p.retail_market_price) * 100) : 0;
  res.json(p);
});

router.post('/', authRequired, adminOnly, (req, res) => {
  const { part_number, name_en, name_sw, category, wholesale_cost, selling_price, retail_market_price, unit, description } = req.body;
  if (!part_number || !name_en || !wholesale_cost || !selling_price) return res.status(400).json({ error: 'Missing required fields' });
  const id = insert(
    `INSERT INTO parts (part_number, name_en, name_sw, category, wholesale_cost, selling_price, retail_market_price, unit, description)
    VALUES (?,?,?,?,?,?,?,?,?)`,
    [part_number, name_en, name_sw || null, category || null, wholesale_cost, selling_price, retail_market_price || null, unit || 'piece', description || null]
  );
  run('INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)',
    [req.user.id, 'create_part', 'part', id, JSON.stringify({ part_number, name_en })]);
  res.json({ id });
});

router.put('/:id', authRequired, adminOnly, (req, res) => {
  const fields = ['part_number', 'name_en', 'name_sw', 'category', 'wholesale_cost', 'selling_price', 'retail_market_price', 'unit', 'description', 'stock_quantity', 'active'];
  const sets = [];
  const vals = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(req.body[f]); }
  }
  if (sets.length === 0) return res.json({ ok: true });
  vals.push(req.params.id);
  run(`UPDATE parts SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`, vals);
  res.json({ ok: true });
});

router.delete('/:id', authRequired, adminOnly, (req, res) => {
  run('UPDATE parts SET active = 0, updated_at = datetime("now") WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

router.get('/report/low-stock', authRequired, (req, res) => {
  res.json(queryAll('SELECT * FROM parts WHERE stock_quantity <= low_stock_threshold AND active = 1 ORDER BY stock_quantity ASC'));
});

export default router;
