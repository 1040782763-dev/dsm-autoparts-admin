import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, run, queryAll, saveDb } from './db.js';
import fs from 'fs';
import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customers.js';
import partRoutes from './routes/parts.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import visitRoutes from './routes/visits.js';
import issueRoutes from './routes/issues.js';
import analyticsRoutes from './routes/analytics.js';
import reminderRoutes from './routes/reminders.js';
import settingsRoutes from './routes/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// === Health (no auth) ===
app.get('/api/health', (req, res) => {
  try {
    const users = queryAll('SELECT id, username, role FROM users');
    const parts = queryAll('SELECT COUNT(*) as c FROM parts');
    const custs = queryAll('SELECT COUNT(*) as c FROM customers');
    res.json({ ok: true, users: users.length, parts: parts[0]?.c || 0, customers: custs[0]?.c || 0 });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// === HASHES ===
const ADMIN_HASH = '$2a$08$9d6axGSYzqAFuU9PUET7fOSmEXDRfWAeBi/9CssqFv0A6G0HJGFNO';
const SALES_HASH = '$2a$08$SZTNb6v3P/apByfn2NpSvuD1TEqwmhZi5Pl5NUn9.Fp0Fgj12xwVu';
const CUST_HASH  = '$2a$08$YEgBojVioP6ebpnuA2zbmunWKCt/iwdigdoSHgAZyy7FIMwgoaMFO';

function createUsers() {
  if (queryAll("SELECT id FROM users WHERE username = 'admin'").length === 0)
    run("INSERT INTO users (username,password,role,full_name,phone) VALUES ('admin',?,'admin','Admin','+255000000000')", [ADMIN_HASH]);
  if (queryAll("SELECT id FROM users WHERE username = 'sales1'").length === 0)
    run("INSERT INTO users (username,password,role,full_name,phone,whatsapp) VALUES ('sales1',?,'salesperson','Juma Mwangi','+255710000001','+255710000001')", [SALES_HASH]);
  if (queryAll("SELECT id FROM users WHERE username = 'garage1'").length === 0)
    run("INSERT INTO users (username,password,role,full_name,phone) VALUES ('garage1',?,'customer','Test Garage','+255710000002')", [CUST_HASH]);
}

function importGarages() {
  try {
    if (queryAll('SELECT COUNT(*) as c FROM customers')[0].c > 0) return;
    const gPath = path.join(__dirname, 'seed-data', 'garages_import.json');
    if (!fs.existsSync(gPath)) { console.log('No garage JSON at', gPath); return; }
    const garages = JSON.parse(fs.readFileSync(gPath, 'utf-8'));
    let n = 0;
    for (const g of garages) {
      if (!g.name || g.status === 'flagged') continue;
      let lat = null, lng = null;
      const m = (g.mapsUrl || '').match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (m) { lat = parseFloat(m[1]); lng = parseFloat(m[2]); }
      run('INSERT INTO customers (garage_name,address,latitude,longitude,tier,phone,maps_url,source) VALUES (?,?,?,?,?,?,?,?)',
        [g.name, g.address || 'Dar es Salaam', lat, lng, 'C', g.phone || null, g.mapsUrl || null, 'scraped']);
      n++;
    }
    console.log(`Imported ${n} garages`);
  } catch (e) { console.log('Garage import:', e.message); }
}

async function importParts() {
  try {
    if (queryAll('SELECT COUNT(*) as c FROM parts')[0].c > 100) { console.log('Parts already exist'); return; }
    const pPath = path.join(__dirname, 'seed-data', 'parts_import.json');
    if (!fs.existsSync(pPath)) { console.log('No parts JSON at', pPath); return; }
    console.log('Importing parts...');
    const parts = JSON.parse(fs.readFileSync(pPath, 'utf-8'));
    const db = await getDb();
    const stmt = db.prepare('INSERT OR IGNORE INTO parts (part_number,name_en,name_sw,category,wholesale_cost,selling_price,retail_market_price,unit,stock_quantity,description) VALUES (?,?,?,?,?,?,?,?,?,?)');
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      stmt.run([p.part_number, p.name_en, p.name_sw, p.category, p.wholesale_cost, p.selling_price, p.retail_market_price, p.unit, p.stock_quantity, p.description]);
      if ((i + 1) % 1000 === 0) console.log(`  ${i + 1}/${parts.length}`);
    }
    stmt.free();
    saveDb();
    console.log(`Imported ${parts.length} parts`);
  } catch (e) { console.log('Parts import:', e.message); }
}

// === Setup (no auth, fast - just users + garages) ===
app.get('/api/setup', (req, res) => {
  createUsers();
  importGarages();
  res.json({
    ok: true,
    users: queryAll('SELECT COUNT(*) as c FROM users')[0].c,
    garages: queryAll('SELECT COUNT(*) as c FROM customers')[0].c,
    parts: queryAll('SELECT COUNT(*) as c FROM parts')[0].c,
  });
});

// === Parts import (no auth, chunked, call after server is stable) ===
app.get('/api/setup/parts', (req, res) => {
  res.json({ status: 'use POST /api/setup/parts with parts JSON body in batches of 500' });
});

app.post('/api/setup/parts', async (req, res) => {
  try {
    const parts = req.body;
    if (!Array.isArray(parts) || parts.length === 0) return res.status(400).json({ error: 'Array required' });
    const db = await getDb();
    const stmt = db.prepare('INSERT OR IGNORE INTO parts (part_number,name_en,name_sw,category,wholesale_cost,selling_price,retail_market_price,unit,stock_quantity,description) VALUES (?,?,?,?,?,?,?,?,?,?)');
    for (const p of parts) {
      stmt.run([p.part_number, p.name_en, p.name_sw, p.category, p.wholesale_cost, p.selling_price, p.retail_market_price, p.unit, p.stock_quantity, p.description]);
    }
    stmt.free();
    saveDb();
    res.json({ ok: true, imported: parts.length, total: queryAll('SELECT COUNT(*) as c FROM parts')[0].c });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// === API routes ===
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/settings', settingsRoutes);

// === Serve React build ===
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api'))
    res.sendFile(path.join(clientDist, 'index.html'));
});

// === Start ===
async function start() {
  await getDb();
  createUsers();
  importGarages();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start();
