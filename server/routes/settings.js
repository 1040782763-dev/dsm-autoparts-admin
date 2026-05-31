import { Router } from 'express';
import { queryAll, queryOne, run } from '../db.js';
import { authRequired, adminOnly } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, (req, res) => {
  const rows = queryAll('SELECT * FROM settings ORDER BY key');
  const obj = {};
  rows.forEach(r => obj[r.key] = r.value);
  res.json(obj);
});

router.put('/', authRequired, adminOnly, (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    run('INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)', [key, String(value)]);
  }
  res.json({ ok: true });
});

export default router;
