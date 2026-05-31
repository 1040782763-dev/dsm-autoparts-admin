import { getDb, run, insert, queryAll } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read xlsx manually (xlsx package may not be in ESM)
// We'll use the already-extracted JSON or read from desktop
async function main() {
  await getDb();

  // Try to find the Excel via pre-extracted JSON first
  const jsonPath = path.join(__dirname, 'data', 'parts_import.json');
  let parts;

  if (fs.existsSync(jsonPath)) {
    parts = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log(`Loaded ${parts.length} parts from JSON`);
  } else {
    // Try to read Excel directly
    try {
      const XLSX = await import('xlsx');
      const desktopPath = path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop', '1_9月3号库存cimq40013-08-52.xlsx');
      const wb = XLSX.readFile(desktopPath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      parts = data.slice(1).filter(r => r[0] && r[4]).map(r => ({
        part_number: String(r[0]).trim(),
        name_en: String(r[4] || '').trim(),
        name_sw: String(r[2] || '').trim(),
        category: extractCategory(r[8]),
        wholesale_cost: Math.round(parseFloat(r[9]) || 0),
        selling_price: Math.round((parseFloat(r[9]) || 0) * 1.25),
        retail_market_price: Math.round((parseFloat(r[9]) || 0) * 1.75),
        unit: 'piece',
        stock_quantity: Math.round(parseFloat(r[3]) || 0),
        description: String(r[8] || '').trim().substring(0, 500),
      }));

      // Save as JSON for future use
      fs.writeFileSync(jsonPath, JSON.stringify(parts, null, 2), 'utf-8');
      console.log(`Extracted ${parts.length} parts from Excel, saved to JSON`);
    } catch (e) {
      console.error('Failed to read Excel:', e.message);
      console.log('Run: node -e "const X=require(\'xlsx\');const w=X.readFile(\'Desktop/1_9月3号库存cimq40013-08-52.xlsx\');const d=X.utils.sheet_to_json(w.Sheets[w.SheetNames[0]],{header:1});require(\'fs\').writeFileSync(\'server/data/parts_import.json\',JSON.stringify(d.slice(1).filter(r=>r[0]&&r[4]).map(r=>({part_number:String(r[0]).trim(),name_en:String(r[4]).trim(),name_sw:String(r[2]).trim(),category:r[8]?r[8].split(\' \')[0]:\'other\',wholesale_cost:Math.round(parseFloat(r[9])||0),selling_price:Math.round((parseFloat(r[9])||0)*1.25),retail_market_price:Math.round((parseFloat(r[9])||0)*1.75),unit:\'piece\',stock_quantity:Math.round(parseFloat(r[3])||0),description:String(r[8]||\'\').trim().substring(0,500)}))))')
      process.exit(1);
    }
  }

  // Clear existing parts
  const existing = queryAll('SELECT COUNT(*) as c FROM parts');
  console.log(`Existing parts in DB: ${existing[0]?.c || 0}`);

  // Import
  let imported = 0, skipped = 0;
  const stmt = 'INSERT OR IGNORE INTO parts (part_number, name_en, name_sw, category, wholesale_cost, selling_price, retail_market_price, unit, stock_quantity, description) VALUES (?,?,?,?,?,?,?,?,?,?)';

  for (const p of parts) {
    try {
      run(stmt, [
        p.part_number, p.name_en, p.name_sw, p.category,
        p.wholesale_cost, p.selling_price, p.retail_market_price,
        p.unit, p.stock_quantity, p.description
      ]);
      imported++;
    } catch (e) {
      if (e.message?.includes('UNIQUE')) {
        skipped++;
      } else {
        console.error('Error:', e.message, p.part_number);
      }
    }
  }

  const after = queryAll('SELECT COUNT(*) as c FROM parts');
  console.log(`\nImport complete!`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped (duplicate): ${skipped}`);
  console.log(`  Total in DB: ${after[0]?.c}`);
}

function extractCategory(desc) {
  if (!desc) return 'other';
  const word = desc.split(' ')[0].toLowerCase();
  const map = {
    'brake': 'brakes',
    'clutch': 'clutch',
    'shock': 'suspension',
    'stabilizer': 'suspension',
    'spring': 'suspension',
    'wheel': 'bearings',
    'bearing': 'bearings',
    'engine': 'engine',
    'head': 'engine',
    'piston': 'engine',
    'valve': 'engine',
    'gasket': 'engine',
    'oil': 'filters',
    'filter': 'filters',
    'fan': 'cooling',
    'radiator': 'cooling',
    'water': 'cooling',
    'tie': 'steering',
    'steering': 'steering',
    'arm': 'suspension',
    'bush': 'suspension',
    'mounting': 'engine',
    'lamp': 'electrical',
    'light': 'electrical',
    'alternator': 'electrical',
    'starter': 'electrical',
    'sensor': 'electrical',
    'switch': 'electrical',
    'belt': 'belts',
    'pump': 'engine',
    'cylinder': 'engine',
    'cable': 'electrical',
    'joint': 'suspension',
    'link': 'suspension',
    'rod': 'steering',
    'rack': 'steering',
  };
  return map[word] || word;
}

main().catch(console.error);
