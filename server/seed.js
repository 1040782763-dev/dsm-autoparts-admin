import bcrypt from 'bcryptjs';
import { getDb, run, insert, queryAll } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seed() {
  await getDb();
  console.log('Seeding database...');

  // Create admin
  const adminHash = await bcrypt.hash('admin123', 10);
  const adminExists = queryAll('SELECT id FROM users WHERE username = ?', ['admin']);
  if (adminExists.length === 0) {
    run('INSERT INTO users (username, password, role, full_name, phone) VALUES (?,?,?,?,?)',
      ['admin', adminHash, 'admin', 'Admin', '+255000000000']);
    console.log('  Created admin (admin / admin123)');
  }

  // Create salesperson
  const spHash = await bcrypt.hash('sales123', 10);
  const spExists = queryAll('SELECT id FROM users WHERE username = ?', ['sales1']);
  if (spExists.length === 0) {
    run('INSERT INTO users (username, password, role, full_name, phone, whatsapp) VALUES (?,?,?,?,?,?)',
      ['sales1', spHash, 'salesperson', 'Juma Mwangi', '+255710000001', '+255710000001']);
    console.log('  Created salesperson (sales1 / sales123)');
  }

  // Create customer test account
  const custHash = await bcrypt.hash('cust123', 10);
  const custExists = queryAll('SELECT id FROM users WHERE username = ?', ['garage1']);
  if (custExists.length === 0) {
    run('INSERT INTO users (username, password, role, full_name, phone) VALUES (?,?,?,?,?)',
      ['garage1', custHash, 'customer', 'Test Garage', '+255710000002']);
    console.log('  Created customer (garage1 / cust123)');
  }

  // Import garages from scraper
  const scraperPath = path.join(__dirname, '..', '..', 'dsm-garage-scraper', 'dsm_garages_clean.json');
  if (fs.existsSync(scraperPath)) {
    try {
      const garages = JSON.parse(fs.readFileSync(scraperPath, 'utf-8'));
      let imported = 0;
      for (const g of garages) {
        if (!g.name || g.status === 'flagged') continue;
        const exists = queryAll('SELECT id FROM customers WHERE garage_name = ?', [g.name]);
        if (exists.length > 0) continue;

        // Extract coordinates from maps URL
        let lat = null, lng = null;
        const url = g.mapsUrl || g.address || '';
        // Format: !3d-6.7838081!4d39.2688542
        const coordMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        if (coordMatch) {
          lat = parseFloat(coordMatch[1]);
          lng = parseFloat(coordMatch[2]);
        }
        // Also try @lat,lng format
        if (!lat && g.address) {
          const atMatch = g.address.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
          if (atMatch) {
            lat = parseFloat(atMatch[1]);
            lng = parseFloat(atMatch[2]);
          }
        }

        run(
          `INSERT INTO customers (garage_name, address, latitude, longitude, tier, phone, maps_url, source, notes)
          VALUES (?,?,?,?,?,?,?,?,?)`,
          [g.name, g.address || 'Dar es Salaam', lat, lng, 'C', g.phone || null, g.mapsUrl || null, 'scraped', `Google Maps scrape. Go to: ${g.mapsUrl || ''}`]
        );
        imported++;
      }
      console.log(`  Imported ${imported} garages from scraper data`);
    } catch (e) {
      console.log(`  Scraper data import failed: ${e.message}`);
    }
  } else {
    console.log('  No scraper data found, adding sample garages');
    const samples = [
      ['Copro Auto Tech Garage', 'Bahari Beach, Dar es Salaam', '0653271318'],
      ['Wilbrage Auto Garage', 'Mungure Street, Dar es Salaam', '0762691069'],
      ['0-60 Auto Garage', 'Mt Atlas Rd, Dar es Salaam', '0763432008'],
      ['Evolution Garage', 'Gerezani St, Dar es Salaam', '0715667733'],
      ['Dallas Autopoint', 'Mori Road, Dar es Salaam', '0787838888'],
      ['Gajjar Auto Works Ltd', '3 Lugoda St, Dar es Salaam', '0713573333'],
      ['Nzowah Auto Garage', 'Lindi St, Dar es Salaam', '0762888777'],
      ['Auto Beirut', 'Dar es Salaam', '0768750950'],
      ['At The Wheel Kawe', 'Kawe/Mbezi Beach Area, Dar es Salaam', '0652919413'],
      ['Fuji Heavy Garages', 'Msisiri B, Sotiwota Rd, Dar es Salaam', '0713028741'],
    ];
    for (const [name, addr, phone] of samples) {
      run('INSERT INTO customers (garage_name, address, phone, tier, source) VALUES (?,?,?,?,?)',
        [name, addr, phone, 'C', 'sample']);
    }
    console.log(`  Added ${samples.length} sample garages`);
  }

  // Seed sample parts
  const partsExist = queryAll('SELECT COUNT(*) as c FROM parts');
  if (partsExist[0]?.c === 0) {
    const sampleParts = [
      ['BRK-TY-001', 'Brake Pads - Toyota Hiace', 'breki pedi - Toyota Hiace', 'brakes', 28000, 36000, 50000, 'set'],
      ['BRK-CR-001', 'Brake Pads - Corolla', 'breki pedi - Corolla', 'brakes', 25000, 33000, 48000, 'set'],
      ['OIL-FL-001', 'Oil Filter - Toyota', 'chujio mafuta - Toyota', 'filters', 8000, 12000, 18000, 'piece'],
      ['OIL-FL-002', 'Oil Filter - Nissan', 'chujio mafuta - Nissan', 'filters', 7000, 11000, 17000, 'piece'],
      ['CLT-HI-001', 'Clutch Kit - Hiace', 'clutch - Hiace', 'clutch', 120000, 160000, 230000, 'set'],
      ['BRG-FR-001', 'Front Wheel Bearing - Toyota', 'bearing mbele - Toyota', 'bearings', 45000, 60000, 85000, 'piece'],
      ['SUS-SH-001', 'Shock Absorber Front - Hiace', 'shock absorber mbele - Hiace', 'suspension', 65000, 85000, 120000, 'piece'],
      ['SPK-NG-001', 'Spark Plug - NGK', 'spark plug - NGK', 'electrical', 5000, 7500, 12000, 'piece'],
      ['BELT-TY-001', 'Fan Belt - Toyota', 'fan belt - Toyota', 'belts', 15000, 20000, 30000, 'piece'],
      ['ALT-TY-001', 'Alternator - Toyota Hiace', 'alternator - Toyota Hiace', 'electrical', 180000, 230000, 320000, 'piece'],
    ];
    for (const [pn, en, sw, cat, wc, sp, rp, unit] of sampleParts) {
      run(`INSERT INTO parts (part_number, name_en, name_sw, category, wholesale_cost, selling_price, retail_market_price, unit)
        VALUES (?,?,?,?,?,?,?,?)`, [pn, en, sw, cat, wc, sp, rp, unit]);
    }
    console.log(`  Added ${sampleParts.length} sample parts`);
  }

  // Update credit eligibility for garages with 3+ orders
  run(`UPDATE customers SET credit_eligible = 1 WHERE total_orders >= (
    SELECT value FROM settings WHERE key = 'credit_threshold_orders'
  )`);

  console.log('Seed complete!');
}

seed().catch(e => { console.error(e); process.exit(1); });
