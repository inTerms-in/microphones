const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:microphonemobiles123&@db.gylekyesvfqwbzyqmswh.supabase.co:5432/postgres';
const sqlPath = path.join(__dirname, 'src/db/service_v5_updates.sql');

async function run() {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to Supabase DB.');
        await client.query(sql);
        console.log('Successfully applied service_v5_updates.');
    } catch (err) {
        console.error('Error applying SQL:', err);
    } finally {
        await client.end();
    }
}

run();
