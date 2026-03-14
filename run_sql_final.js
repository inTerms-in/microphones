import pg from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = 'postgresql://postgres:[microphonemobiles123&]@db.gylekyesvfqwbzyqmswh.supabase.co:5432/postgres';
const sqlPath = './src/db/fix_rpc_v4.sql';

async function run() {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    const client = new pg.Client({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to database.');
        await client.query(sql);
        console.log('Successfully executed SQL script.');
    } catch (err) {
        if (err.message.includes('password authentication failed')) {
            console.log('Retrying without brackets in password...');
            const match = connectionString.match(/postgres:(.*)@/);
            if (match) {
                const fullPass = match[1];
                const cleanPass = fullPass.startsWith('[') && fullPass.endsWith(']') ? fullPass.slice(1, -1) : fullPass;
                const altConnectionString = connectionString.replace(fullPass, cleanPass);
                
                const altClient = new pg.Client({
                    connectionString: altConnectionString,
                    ssl: {
                        rejectUnauthorized: false
                    }
                });
                try {
                    await altClient.connect();
                    console.log('Connected to database (without brackets).');
                    await altClient.query(sql);
                    console.log('Successfully executed SQL script (without brackets).');
                } catch (altErr) {
                    console.error('Error on second attempt:', altErr);
                } finally {
                    await altClient.end();
                }
            }
        } else {
            console.error('Error executing SQL script:', err);
        }
    } finally {
        await client.end();
    }
}

run();
