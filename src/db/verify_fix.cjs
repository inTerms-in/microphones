const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gylekyesvfqwbzyqmswh.supabase.co';
const supabaseAnonKey = 'sb_publishable_0jNEOPBInxlG4D-4ZWMPMg_lBkj-mOC';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
  console.log("Attempting verification login...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@micro.com',
    password: 'admin123'
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }

  console.log("Login successful. Checking profiles...");
  
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id);

  if (profileError) {
    console.error("Profile query failed (500 check):", profileError);
  } else {
    console.log("SUCCESS: Profile queried successfully!", profileData);
  }
}

verify();
