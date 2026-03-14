const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gylekyesvfqwbzyqmswh.supabase.co';
const supabaseAnonKey = 'sb_publishable_0jNEOPBInxlG4D-4ZWMPMg_lBkj-mOC';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
  console.log("Attempting verification as Admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@micro.com',
    password: 'admin123'
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }

  console.log("Login successful. testing branch creation...");
  
  const { data: company } = await supabase.from('companies').select('id').limit(1).single();
  const testBranchName = 'Test Branch ' + Date.now();

  const { data: branch, error: branchError } = await supabase
    .from('branches')
    .insert([{ name: testBranchName, location: 'Automation Test', company_id: company.id }])
    .select()
    .single();

  if (branchError) {
    console.error("Branch creation failed:", branchError.message);
  } else {
    console.log("SUCCESS: Branch created!", branch.name);
    
    console.log("Testing assignment...");
    const { error: asgnError } = await supabase
      .from('user_branches')
      .insert([{ user_id: authData.user.id, branch_id: branch.id }]);

    if (asgnError) {
      console.error("Assignment failed:", asgnError.message);
    } else {
      console.log("SUCCESS: Assignment created!");
      
      // Cleanup
      await supabase.from('user_branches').delete().eq('branch_id', branch.id);
      await supabase.from('branches').delete().eq('id', branch.id);
      console.log("Cleanup complete.");
    }
  }
}

verify();
