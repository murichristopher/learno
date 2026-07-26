// Single place that decides where the routes' data lives.
//
//   LEARNO_MODE=sandbox  → in-memory store seeded from sandbox/fixtures/seed.json
//   anything else        → the real MongoDB pointed at by MONGODB_URI
//
// Routes just `require('../db').getDb()` and are otherwise unaware of the mode,
// so the sandbox exercises their real logic (SM-2 scheduling included).

const fs   = require('fs');
const path = require('path');

const SANDBOX = process.env.LEARNO_MODE === 'sandbox';

let _db;

// Fixture dates are written as { "$daysFromNow": -3 } rather than fixed
// timestamps, so a seeded review stays "due today" no matter when the sandbox
// is run — otherwise every fixture rots and the dashboard's pending-review
// section silently empties out.
function resolveDates(value) {
  if (Array.isArray(value)) return value.map(resolveDates);
  if (value && typeof value === 'object') {
    if (typeof value.$daysFromNow === 'number') {
      const d = new Date();
      d.setDate(d.getDate() + value.$daysFromNow);
      return d;
    }
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, resolveDates(v)])
    );
  }
  return value;
}

function loadSeed() {
  const seedPath = process.env.LEARNO_SEED
    || path.join(__dirname, '..', 'sandbox', 'fixtures', 'seed.json');

  if (!fs.existsSync(seedPath)) {
    console.warn(`sandbox: no seed file at ${seedPath} — starting empty`);
    return {};
  }

  try {
    return resolveDates(JSON.parse(fs.readFileSync(seedPath, 'utf8')));
  } catch (err) {
    console.error(`sandbox: could not parse ${seedPath} — starting empty\n  ${err.message}`);
    return {};
  }
}

async function getDb() {
  if (_db) return _db;

  if (SANDBOX) {
    const { MemoryDb } = require('./memdb');
    _db = new MemoryDb(loadSeed());
    console.log('sandbox: using in-memory store (state resets on restart)');
    return _db;
  }

  const { MongoClient } = require('mongodb');
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set (use LEARNO_MODE=sandbox to run without a database)');
  }
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  _db = client.db(process.env.MONGODB_DB || 'system_design_learn');
  console.log('MongoDB connected');
  return _db;
}

module.exports = { getDb, SANDBOX };
