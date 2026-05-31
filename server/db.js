import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'app.db');
const SQL_WASM = path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

let db;

export async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs({ locateFile: () => SQL_WASM });

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA foreign_keys=ON');
  initSchema();
  seedDefaults();
  return db;
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','salesperson','customer')),
      full_name TEXT NOT NULL,
      phone TEXT,
      whatsapp TEXT,
      language_pref TEXT DEFAULT 'en',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      garage_name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      latitude REAL,
      longitude REAL,
      tier TEXT DEFAULT 'C' CHECK(tier IN ('A','B','C')),
      assigned_salesperson_id INTEGER REFERENCES users(id),
      credit_eligible INTEGER DEFAULT 0,
      total_orders INTEGER DEFAULT 0,
      total_spent REAL DEFAULT 0,
      last_order_date TEXT,
      source TEXT DEFAULT 'manual',
      maps_url TEXT,
      notes TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_number TEXT UNIQUE NOT NULL,
      name_en TEXT NOT NULL,
      name_sw TEXT,
      category TEXT,
      wholesale_cost REAL NOT NULL,
      selling_price REAL NOT NULL,
      retail_market_price REAL,
      unit TEXT DEFAULT 'piece',
      stock_quantity INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 5,
      description TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      created_by_user_id INTEGER REFERENCES users(id),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','picked_up','out_for_delivery','delivered','paid','cancelled')),
      payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','partial','paid')),
      order_date TEXT NOT NULL,
      delivery_date TEXT,
      delivery_batch TEXT CHECK(delivery_batch IN ('morning','afternoon','next_day')),
      total_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      part_id INTEGER REFERENCES parts(id),
      part_name TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER REFERENCES orders(id),
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash','mpesa','bank_transfer')),
      collected_by_user_id INTEGER REFERENCES users(id),
      payment_date TEXT NOT NULL,
      receipt_number TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS customer_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id),
      salesperson_id INTEGER REFERENCES users(id),
      visit_date TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      notes TEXT,
      outcome TEXT CHECK(outcome IN ('ordered','no_order','closed_deal','follow_up','new_customer')),
      next_follow_up_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER REFERENCES orders(id),
      customer_id INTEGER REFERENCES customers(id),
      part_id INTEGER REFERENCES parts(id),
      issue_type TEXT CHECK(issue_type IN ('wrong_part','defective','damaged_in_transit','quality','other')),
      description TEXT NOT NULL,
      status TEXT DEFAULT 'open' CHECK(status IN ('open','investigating','resolved','closed')),
      resolution TEXT,
      reported_by_user_id INTEGER REFERENCES users(id),
      resolved_by_user_id INTEGER REFERENCES users(id),
      resolved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id),
      reminder_type TEXT CHECK(reminder_type IN ('follow_up','payment_due','reorder','churn_risk','visit_scheduled')),
      message TEXT,
      whatsapp_number TEXT,
      scheduled_date TEXT NOT NULL,
      sent INTEGER DEFAULT 0,
      sent_date TEXT,
      created_by_user_id INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

function seedDefaults() {
  const defaults = [
    ['morning_cutoff', '10:00'],
    ['afternoon_cutoff', '15:00'],
    ['credit_threshold_orders', '3'],
    ['churn_warning_days', '14'],
    ['profit_margin_target', '25'],
    ['currency', 'TZS'],
    ['company_name', 'Dar Auto Parts'],
  ];
  const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of defaults) {
    stmt.run([k, v]);
  }
  stmt.free();
}

export function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export function query(sql, params = []) {
  return db.prepare(sql).bind(params);
}

export function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

export function insert(sql, params = []) {
  db.run(sql, params);
  saveDb();
  const r = queryOne('SELECT last_insert_rowid() as id');
  return r ? r.id : null;
}
