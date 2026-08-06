/**
 * Geocode lead addresses using OpenStreetMap Nominatim (free, no API key).
 * Two-pass strategy: (1) cleaned full address, (2) pin code + city fallback.
 * Run: node scripts/geocode-leads.js
 */

const { Client } = require('/Users/vaishnav19naik/Developer/idda-crm/node_modules/pg');
const https = require('https');

const DB_URL = 'postgres://postgres:postgres@localhost:5432/default';
const SCHEMA = 'workspace_1wgvd1injqtife6y4rvfbu3h5';

function cleanAddress(addr) {
  return addr
    .replace(/\n/g, ' ')
    .replace(/\b(opposite|opp\.?|near|beside|behind|inside|above|below|next to)\s+[^,]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function pinCityFallback(addr) {
  const pin = addr.match(/\b\d{6}\b/)?.[0];
  const city = addr.match(
    /\b(Gurugram|Gurgaon|Delhi|New Delhi|Mumbai|Bangalore|Bengaluru|Hyderabad|Chennai|Pune|Kolkata|Jaipur|Lucknow|Noida|Faridabad|Ahmedabad|Surat|Indore|Bhopal|Nagpur|Chandigarh)\b/i
  )?.[0];
  if (pin && city) return `${city} ${pin} India`;
  if (pin) return `${pin} India`;
  if (city) return `${city} India`;
  return null;
}

function nominatim(query) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`;
    const options = { headers: { 'User-Agent': 'IDDA-CRM-Geocoder/1.0 (vaishnav19naik@gmail.com)' } };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const results = JSON.parse(data);
          resolve(results[0] ? { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) } : null);
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function geocode(address) {
  const queries = [cleanAddress(address), pinCityFallback(address)].filter(Boolean);
  for (let i = 0; i < queries.length; i++) {
    if (i > 0) await sleep(1100);
    const coords = await nominatim(queries[i]);
    if (coords) return { coords, pass: i + 1 };
  }
  return null;
}

async function run() {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  console.log('✓ Connected to database');

  const { rows } = await db.query(
    `SELECT id, "clinicName", address FROM "${SCHEMA}".lead
     WHERE (latitude IS NULL OR longitude IS NULL)
       AND address IS NOT NULL AND trim(address) != ''
     ORDER BY id`
  );

  console.log(`Found ${rows.length} leads to geocode\n`);

  let updated = 0, failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const lead = rows[i];
    const label = `[${i + 1}/${rows.length}] ${(lead.clinicName || 'Unnamed').slice(0, 50)}`;

    const result = await geocode(lead.address);

    if (result) {
      await db.query(
        `UPDATE "${SCHEMA}".lead SET latitude = $1, longitude = $2, "updatedAt" = now() WHERE id = $3`,
        [result.coords.lat, result.coords.lon, lead.id]
      );
      const pass = result.pass === 1 ? 'full addr' : 'pin+city';
      console.log(`✓ ${label} → ${result.coords.lat.toFixed(5)}, ${result.coords.lon.toFixed(5)} (${pass})`);
      updated++;
    } else {
      console.log(`✗ ${label} → no result`);
      failed++;
    }

    // Nominatim requires ≥1s between requests
    if (i < rows.length - 1) await sleep(1100);
  }

  await db.end();
  console.log(`\n✅ Done — ${updated} updated, ${failed} could not be geocoded`);
}

run().catch((e) => { console.error('❌', e.message); process.exit(1); });
