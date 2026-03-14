const pg = require('pg');
const fs = require('fs');
const path = require('path');

async function runUpdate() {
  const connectionString = 'postgresql://postgres:microphonemobiles123&@db.gylekyesvfqwbzyqmswh.supabase.co:5432/postgres';
  const client = new pg.Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    const sql = fs.readFileSync(path.join(__dirname, 'update_uniqueness_v2.sql'), 'utf8');
    await client.query(sql);
    console.log('SUCCESS: Uniqueness constraint applied.');

  } catch (err) {
    console.error('ERROR (Could be existing duplicates):', err.message);
  } finally {
    await client.end();
  }
}

runUpdate();
