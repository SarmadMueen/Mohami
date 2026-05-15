/**
 * Setup Script for Company Manager Test Account
 * This script creates the test account for dr.abd256@gmail.com
 * 
 * Run with: node scripts/setup-company-manager-test.js
 * 
 * IMPORTANT: This is for test environment only
 * 
 * NOTE: If this script fails, you can manually create the account:
 * 1. Go to Supabase Dashboard > Authentication > Users
 * 2. Create a new user with email: dr.abd256@gmail.com
 * 3. Set password: Test@123456
 * 4. Then run the SQL commands in Supabase SQL Editor to add metadata
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_EMAIL = 'test.manager@example.com';
const TEST_PASSWORD = 'Test@123456';

async function setupCompanyManagerTestAccount() {
  console.log('Setting up company manager test account...');
  console.log('Email:', TEST_EMAIL);
  console.log('---');

  try {
    // Step 1: Check if user already exists in user_metadata
    console.log('Checking if user exists...');
    const { data: existingMetadata } = await supabase
      .from('user_metadata')
      .select('user_id')
      .eq('email', TEST_EMAIL)
      .maybeSingle();

    let userId = existingMetadata?.user_id;

    if (userId) {
      console.log('User already exists in user_metadata');
      console.log('User ID:', userId);
    } else {
      console.log('User not found in user_metadata');
      console.log('---');
      console.log('⚠️  AUTOMATED USER CREATION FAILED');
      console.log('---');
      console.log('Please create the user manually in Supabase Dashboard:');
      console.log('1. Go to Supabase Dashboard > Authentication > Users');
      console.log('2. Click "Add user"');
      console.log('3. Email:', TEST_EMAIL);
      console.log('4. Password:', TEST_PASSWORD);
      console.log('5. Auto-confirm user: Yes');
      console.log('---');
      console.log('After creating the user, run these SQL commands in Supabase SQL Editor:');
      console.log('');
      console.log('-- Get the user ID (replace with actual email):');
      console.log('SELECT id FROM auth.users WHERE email = \'' + TEST_EMAIL + '\';');
      console.log('');
      console.log('-- Then insert into user_metadata (replace USER_ID with the actual ID):');
      console.log('INSERT INTO user_metadata (user_id, email, name, role, admin_user_id)');
      console.log('VALUES (\'USER_ID\', \'' + TEST_EMAIL + '\', \'Company Manager Test\', \'مدير\', \'USER_ID\');');
      console.log('');
      console.log('-- Insert into company_manager_preferences:');
      console.log('INSERT INTO company_manager_preferences (user_id, selected_features, default_view)');
      console.log('VALUES (\'USER_ID\', \'["progress_tracking", "activity_metrics", "client_info"]\', \'dashboard\');');
      console.log('---');
      return;
    }

    // Step 2: Create or update user_metadata
    const { data: metadataData, error: metadataCheckError } = await supabase
      .from('user_metadata')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (metadataCheckError) {
      console.error('Error checking metadata:', metadataCheckError);
    }

    if (metadataData) {
      console.log('Updating existing metadata...');
      await supabase
        .from('user_metadata')
        .update({
          role: 'مدير',
          email: TEST_EMAIL,
          name: 'Company Manager Test',
          admin_user_id: userId, // Self as admin
        })
        .eq('user_id', userId);
      console.log('Metadata updated');
    } else {
      console.log('Creating new metadata...');
      const { error: metadataError } = await supabase
        .from('user_metadata')
        .insert({
          user_id: userId,
          email: TEST_EMAIL,
          name: 'Company Manager Test',
          role: 'مدير',
          admin_user_id: userId, // Self as admin
        });

      if (metadataError) {
        console.error('Error creating metadata:', metadataError);
        throw metadataError;
      }
      console.log('Metadata created');
    }

    // Step 3: Create company_manager_preferences
    const { data: existingPrefs, error: prefsCheckError } = await supabase
      .from('company_manager_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (prefsCheckError) {
      console.error('Error checking preferences:', prefsCheckError);
    }

    if (!existingPrefs) {
      console.log('Creating default preferences...');
      const { error: prefsError } = await supabase
        .from('company_manager_preferences')
        .insert({
          user_id: userId,
          selected_features: ['progress_tracking', 'activity_metrics', 'client_info'],
          default_view: 'dashboard',
        });

      if (prefsError) {
        console.error('Error creating preferences:', prefsError);
        // Non-critical, continue
      } else {
        console.log('Preferences created');
      }
    }

    console.log('---');
    console.log('✅ Setup completed successfully!');
    console.log('---');
    console.log('Login credentials:');
    console.log('Email:', TEST_EMAIL);
    console.log('Password:', TEST_PASSWORD);
    console.log('---');
    console.log('Access URL: /company-manager-test');
    console.log('---');
    console.log('⚠️ IMPORTANT: This is a test environment only.');
    console.log('⚠️ Do not use this in production.');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupCompanyManagerTestAccount();
