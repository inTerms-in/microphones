const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyReactivationFix() {
  const sqlPath = path.join(__dirname, 'src', 'db', 'admin_reactivation.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying User Reactivation SQL...');
  const { error } = await supabase.rpc('admin_exec_sql', { sql_query: sql });

  if (error) {
    if (error.message.includes('function admin_exec_sql(text) does not exist')) {
        console.error('Error: admin_exec_sql not found. You must run the initial setup first or use a different method to apply SQL.');
    } else {
        console.error('Error applying SQL:', error.message);
    }
    process.exit(1);
  }

  console.log('User Reactivation SQL applied successfully!');
}

applyReactivationFix();
