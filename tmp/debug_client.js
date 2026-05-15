const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Env Vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser(email) {
  console.log(`Checking for user: ${email}...`);
  
  // 1. Check Auth Users
  const { data: { users }, error: authError } = await supabase.auth.api.listUsers();
  if (authError) {
    console.error('Error listing auth users:', authError);
  } else {
    const user = users.find(u => u.email === email);
    if (user) {
      console.log('✅ Auth user found:', { id: user.id, email: user.email, confirmed_at: user.confirmed_at });
      
      // 2. Check client_accounts table
      const { data: clientAccount, error: clientError } = await supabase
        .from('client_accounts')
        .select('*')
        .eq('auth_user_id', user.id);
        
      if (clientError) {
        console.error('Error fetching client_accounts:', clientError);
      } else if (clientAccount && clientAccount.length > 0) {
        console.log('✅ client_accounts record found:', clientAccount[0]);
      } else {
        console.log('❌ No client_accounts record found for this auth user.');
      }
    } else {
      console.log('❌ Auth user not found in Supabase Auth.');
    }
  }
}

checkUser('testclient@test.com');
