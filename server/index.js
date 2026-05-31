import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, run, queryAll, saveDb } from './db.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
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

async function ensureDefaults() {
  // Create admin if not exists
  const adminExists = queryAll("SELECT id FROM users WHERE username = 'admin'");
  if (adminExists.length === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    run("INSERT INTO users (username, password, role, full_name, phone) VALUES ('admin',?,'admin','Admin','+255000000000')", [hash]);
    console.log('Created default admin user');
  }

  // Create salesperson
  const spExists = queryAll("SELECT id FROM users WHERE username = 'sales1'");
  if (spExists.length === 0) {
    const hash = await bcrypt.hash('sales123', 10);
    run("INSERT INTO users (username, password, role, full_name, phone, whatsapp) VALUES ('sales1',?,'salesperson','Juma Mwangi','+255710000001','+255710000001')", [hash]);
    console.log('Created default salesperson');
  }

  // Create customer test account
  const custExists = queryAll("SELECT id FROM users WHERE username = 'garage1'");
  if (custExists.length === 0) {
    const hash = await bcrypt.hash('cust123', 10);
    run("INSERT INTO users (username, password, role, full_name, phone) VALUES ('garage1',?,'customer','Test Garage','+255710000002')", [hash]);
    console.log('Created default customer');
  }

  // Seed sample parts if empty
  const partCount = queryAll("SELECT COUNT(*) as c FROM parts");
  if (partCount[0]?.c === 0) {
    const parts = [
      ['BRK-TY-001','Brake Pads - Toyota Hiace','breki pedi - Toyota Hiace','brakes',28000,36000,50000,'set'],
      ['BRK-CR-001','Brake Pads - Corolla','breki pedi - Corolla','brakes',25000,33000,48000,'set'],
      ['OIL-FL-001','Oil Filter - Toyota','chujio mafuta - Toyota','filters',8000,12000,18000,'piece'],
      ['OIL-FL-002','Oil Filter - Nissan','chujio mafuta - Nissan','filters',7000,11000,17000,'piece'],
      ['CLT-HI-001','Clutch Kit - Hiace','clutch - Hiace','clutch',120000,160000,230000,'set'],
      ['BRG-FR-001','Front Wheel Bearing - Toyota','bearing mbele - Toyota','bearings',45000,60000,85000,'piece'],
      ['SUS-SH-001','Shock Absorber Front - Hiace','shock absorber mbele - Hiace','suspension',65000,85000,120000,'piece'],
      ['SPK-NG-001','Spark Plug - NGK','spark plug - NGK','electrical',5000,7500,12000,'piece'],
      ['BELT-TY-001','Fan Belt - Toyota','fan belt - Toyota','belts',15000,20000,30000,'piece'],
      ['ALT-TY-001','Alternator - Toyota Hiace','alternator - Toyota Hiace','electrical',180000,230000,320000,'piece'],
    ];
    for (const [pn,en,sw,cat,wc,sp,rp,unit] of parts) {
      run("INSERT INTO parts (part_number,name_en,name_sw,category,wholesale_cost,selling_price,retail_market_price,unit) VALUES (?,?,?,?,?,?,?,?)", [pn,en,sw,cat,wc,sp,rp,unit]);
    }
    console.log(`Added ${parts.length} sample parts`);
  } else {
    console.log(`Parts already exist: ${partCount[0]?.c || 0}`);
  }

  // Import parts from JSON if available (batch insert, save once at end)
  try {
    const jsonPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'parts_import.json');
    if (fs.existsSync(jsonPath)) {
      const partsData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const db = await getDb();
      // Use raw db.run for speed (avoid saveDb on each insert)
      const stmt = db.prepare('INSERT OR IGNORE INTO parts (part_number, name_en, name_sw, category, wholesale_cost, selling_price, retail_market_price, unit, stock_quantity, description) VALUES (?,?,?,?,?,?,?,?,?,?)');
      let added = 0;
      for (const p of partsData) {
        stmt.run([p.part_number, p.name_en, p.name_sw, p.category, p.wholesale_cost, p.selling_price, p.retail_market_price, p.unit, p.stock_quantity, p.description]);
        added++;
      }
      stmt.free();
      // Save once
      saveDb();
      const total = queryAll('SELECT COUNT(*) as c FROM parts');
      console.log(`Imported ${added} parts from JSON. Total: ${total[0]?.c}`);
    }
  } catch (e) {
    console.log('Parts JSON import skipped:', e.message);
  }

  console.log('Defaults check complete');
}

async function start() {
  await getDb();
  await ensureDefaults();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
