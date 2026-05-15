const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupTestClient() {
  const email = 'testclient@test.com';
  const password = 'Test123456';

  console.log(`Setting up test client: ${email}`);

  // 1. Create Auth User
  const { data: user, error: authError } = await supabase.auth.api.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError) {
    if (authError.message.includes('already exists')) {
      console.log('User already exists in Auth.');
      // Get the existing user
      const { data: users } = await supabase.auth.api.listUsers();
      const existingUser = users.find(u => u.email === email);
      
      if (existingUser) {
        console.log('Updating password for existing user...');
        await supabase.auth.api.updateUserById(existingUser.id, { password });
        await linkAccount(existingUser.id);
      }
    } else {
      console.error('Error creating auth user:', authError);
    }
  } else {
    console.log('✅ Auth user created:', user.id);
    await linkAccount(user.id);
  }
}

async function linkAccount(authUserId) {
  // Find a client to link to
  const { data: clients } = await supabase.from('clients_data').select('id, admin_id').limit(1);
  
  if (!clients || clients.length === 0) {
    console.error('❌ No clients found in clients_data. Please create a client first.');
    return;
  }

  const client = clients[0];
  console.log(`Linking to client ID: ${client.id}, admin ID: ${client.admin_id}`);

  const { data, error } = await supabase.from('client_accounts').upsert({
    auth_user_id: authUserId,
    client_data_id: client.id,
    admin_id: client.admin_id,
    is_portal_enabled: true
  }, { onConflict: 'auth_user_id' });

  if (error) {
    console.error('Error linking account:', error);
  } else {
    console.log('✅ client_accounts record linked/updated.');
  }
}

setupTestClient();
