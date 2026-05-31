import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read xlsx using simple approach — parse the previously extracted JSON
async function importParts() {
  // We'll read from a pre-converted JSON file
  const jsonPath = path.join(__dirname, 'data', 'parts_import.json');

  if (!fs.existsSync(jsonPath)) {
    console.log('No parts_import.json found. Run the extraction script first.');
    console.log('Place the Excel file and run: node extract-parts.js');
    return;
  }

  const parts = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`Loaded ${parts.length} parts from ${jsonPath}`);

  // Import via API
  const BASE = process.env.API_URL || 'http://localhost:3000';

  // Login first
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const { token } = await loginRes.json();
  console.log('Logged in, got token');

  let imported = 0;
  let errors = 0;
  const batchSize = 50;

  for (let i = 0; i < parts.length; i += batchSize) {
    const batch = parts.slice(i, i + batchSize);

    for (const part of batch) {
      try {
        const res = await fetch(`${BASE}/api/parts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(part),
        });

        if (res.ok) {
          imported++;
        } else {
          const err = await res.json();
          if (err.error && !err.error.includes('UNIQUE')) {
            errors++;
            if (errors <= 5) console.log('  Error:', err.error, '-', part.part_number);
          }
        }
      } catch (e) {
        errors++;
        if (errors <= 3) console.log('  Network error:', e.message);
      }
    }

    if ((i / batchSize) % 10 === 0) {
      console.log(`  Progress: ${imported}/${parts.length} imported`);
    }
  }

  console.log(`\nDone! Imported: ${imported}, Errors: ${errors}, Total: ${parts.length}`);
}

importParts().catch(console.error);
