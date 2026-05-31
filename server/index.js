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

app.use(cors({ origin: true, credentials: true, exposedHeaders: ['Authorization'] }));
app.use(express.json({ limit: '10mb' }));

// Health check (no auth)
app.get('/api/health', (req, res) => {
  const users = queryAll('SELECT id, username, role FROM users');
  const parts = queryAll('SELECT COUNT(*) as c FROM parts');
  res.json({ ok: true, users: users.length, parts: parts[0]?.c || 0 });
});

// One-time setup endpoint (no auth, call once after deployment)
app.get('/api/setup', async (req, res) => {
  const result = { users: 0, garages: 0, parts: 0 };

  // 1. Create users
  const ADMIN_HASH = '$2a$08$9d6axGSYzqAFuU9PUET7fOSmEXDRfWAeBi/9CssqFv0A6G0HJGFNO';
  const SALES_HASH = '$2a$08$SZTNb6v3P/apByfn2NpSvuD1TEqwmhZi5Pl5NUn9.Fp0Fgj12xwVu';
  const CUST_HASH  = '$2a$08$YEgBojVioP6ebpnuA2zbmunWKCt/iwdigdoSHgAZyy7FIMwgoaMFO';

  if (queryAll("SELECT id FROM users WHERE username = 'admin'").length === 0) {
    run("INSERT INTO users (username, password, role, full_name, phone) VALUES ('admin',?,'admin','Admin','+255000000000')", [ADMIN_HASH]);
  }
  if (queryAll("SELECT id FROM users WHERE username = 'sales1'").length === 0) {
    run("INSERT INTO users (username, password, role, full_name, phone, whatsapp) VALUES ('sales1',?,'salesperson','Juma Mwangi','+255710000001','+255710000001')", [SALES_HASH]);
  }
  if (queryAll("SELECT id FROM users WHERE username = 'garage1'").length === 0) {
    run("INSERT INTO users (username, password, role, full_name, phone) VALUES ('garage1',?,'customer','Test Garage','+255710000002')", [CUST_HASH]);
  }
  result.users = queryAll('SELECT COUNT(*) as c FROM users')[0].c;

  // 2. Import garages from seed-data (NOT data - PVC overmounts data/)
  const gPath = path.join(__dirname, 'seed-data', 'garages_import.json');
  if (fs.existsSync(gPath)) {
    for (const g of garages) {
      if (!g.name || g.status === 'flagged') continue;
      if (queryAll('SELECT id FROM customers WHERE garage_name = ?', [g.name]).length > 0) continue;
      let lat = null, lng = null;
      const m = (g.mapsUrl || '').match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (m) { lat = parseFloat(m[1]); lng = parseFloat(m[2]); }
      run('INSERT INTO customers (garage_name, address, latitude, longitude, tier, phone, maps_url, source) VALUES (?,?,?,?,?,?,?,?)',
        [g.name, g.address || 'Dar es Salaam', lat, lng, 'C', g.phone || null, g.mapsUrl || null, 'scraped']);
    }
    result.garages = queryAll('SELECT COUNT(*) as c FROM customers')[0].c;
  }

  // 3. Import parts from seed-data
  const pPath = path.join(__dirname, 'seed-data', 'parts_import.json');
  if (fs.existsSync(pPath)) {
    const parts = JSON.parse(fs.readFileSync(pPath, 'utf-8'));
    const db = await getDb();
    const stmt = db.prepare('INSERT OR IGNORE INTO parts (part_number, name_en, name_sw, category, wholesale_cost, selling_price, retail_market_price, unit, stock_quantity, description) VALUES (?,?,?,?,?,?,?,?,?,?)');
    for (const p of parts) {
      stmt.run([p.part_number, p.name_en, p.name_sw, p.category, p.wholesale_cost, p.selling_price, p.retail_market_price, p.unit, p.stock_quantity, p.description]);
    }
    stmt.free();
    saveDb();
    result.parts = queryAll('SELECT COUNT(*) as c FROM parts')[0].c;
  }

  res.json({ ok: true, ...result });
});

// API routes
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

// Serve React build
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDist, 'index.html'));
  }
});

function ensureUsers() {
  // Pre-computed bcrypt hashes (cost 8)
  const ADMIN_HASH = '$2a$08$9d6axGSYzqAFuU9PUET7fOSmEXDRfWAeBi/9CssqFv0A6G0HJGFNO';
  const SALES_HASH = '$2a$08$SZTNb6v3P/apByfn2NpSvuD1TEqwmhZi5Pl5NUn9.Fp0Fgj12xwVu';
  const CUST_HASH  = '$2a$08$YEgBojVioP6ebpnuA2zbmunWKCt/iwdigdoSHgAZyy7FIMwgoaMFO';

  const adminExists = queryAll("SELECT id FROM users WHERE username = 'admin'");
  if (adminExists.length === 0) {
    run("INSERT INTO users (username, password, role, full_name, phone) VALUES ('admin',?,'admin','Admin','+255000000000')", [ADMIN_HASH]);
    console.log('Created admin');
  }
  const spExists = queryAll("SELECT id FROM users WHERE username = 'sales1'");
  if (spExists.length === 0) {
    run("INSERT INTO users (username, password, role, full_name, phone, whatsapp) VALUES ('sales1',?,'salesperson','Juma Mwangi','+255710000001','+255710000001')", [SALES_HASH]);
    console.log('Created salesperson');
  }
  const custExists = queryAll("SELECT id FROM users WHERE username = 'garage1'");
  if (custExists.length === 0) {
    run("INSERT INTO users (username, password, role, full_name, phone) VALUES ('garage1',?,'customer','Test Garage','+255710000002')", [CUST_HASH]);
    console.log('Created customer');
  }
  console.log('Users ready');
}

async function importPartsFromJson() {
  try {
    const jsonPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'seed-data', 'parts_import.json');
    if (!fs.existsSync(jsonPath)) { console.log('No parts JSON found, skipping'); return; }

    // Check if already imported
    const existing = queryAll('SELECT COUNT(*) as c FROM parts WHERE part_number LIKE ?', ['%']);
    if (existing[0]?.c > 100) { console.log(`Parts already loaded: ${existing[0].c}`); return; }

    console.log('Importing parts from JSON...');
    const partsData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const db = await getDb();
    const stmt = db.prepare('INSERT OR IGNORE INTO parts (part_number, name_en, name_sw, category, wholesale_cost, selling_price, retail_market_price, unit, stock_quantity, description) VALUES (?,?,?,?,?,?,?,?,?,?)');

    let added = 0;
    for (const p of partsData) {
      stmt.run([p.part_number, p.name_en, p.name_sw, p.category, p.wholesale_cost, p.selling_price, p.retail_market_price, p.unit, p.stock_quantity, p.description]);
      added++;
      if (added % 1000 === 0) console.log(`  ${added}/${partsData.length} parts imported...`);
    }
    stmt.free();
    saveDb();
    console.log(`Parts import done: ${added} parts`);
  } catch (e) {
    console.error('Parts import error:', e.message);
  }
}

async function start() {
  await getDb();
  ensureUsers();               // Fast: create users (synchronous)
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  // Slow: import parts in background (server already accepting requests)
  importPartsFromJson();
}

start();
