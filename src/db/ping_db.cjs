const { Client } = require('pg');
const connectionString = 'postgresql://postgres:microphonemobiles123&@db.gylekyesvfqwbzyqmswh.supabase.co:5432/postgres';

async function ping() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Pinging database...");
    await client.connect();
    const res = await client.query('SELECT NOW(), current_database(), current_user');
    console.log("SUCCESS: Database is reachable.");
    console.log("Database Info:", res.rows[0]);
  } catch (err) {
    console.error("CONNECTION FAILED:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

ping();
