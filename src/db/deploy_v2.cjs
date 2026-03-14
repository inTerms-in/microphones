const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:microphonemobiles123&@db.gylekyesvfqwbzyqmswh.supabase.co:5432/postgres';

async function deploySchema() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("--- DEPLOYING v2.0 SCHEMA ---");
    
    const sqlPath = path.join(__dirname, 'schema_v2.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    
    console.log("SUCCESS: Schema v2.0 deployed.");

    // Inject Initial Owner
    console.log("Injecting Master Owner...");
    const res = await client.query("SELECT id FROM public.companies LIMIT 1");
    const companyId = res.rows[0].id;
    
    await client.query(`SELECT public.admin_create_user_instant('admin@micro.com', 'admin123', 'Master Owner', 'owner', '${companyId}')`);
    
    console.log("SUCCESS: Master Owner 'admin@micro.com' injected.");
  } catch (err) {
    console.error('DEPLOYMENT FAILED:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

deploySchema();
