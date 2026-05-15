/**
 * Create a demo user for Google Play review
 * Run with: node create-demo-user.js
 *
 * Make sure to set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Missing environment variables');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createDemoUser() {
  const demoEmail = 'demo@mohami.pro';
  const demoPassword = 'DemoReview123!';

  console.log('Creating demo user...');
  console.log(`Email: ${demoEmail}`);
  console.log(`Password: ${demoPassword}`);
  console.log('');

  try {
    // Create the user using the auth admin API
    const { data, error } = await supabase.auth.signUp({
      email: demoEmail,
      password: demoPassword,
      options: {
        emailRedirectTo: undefined,
        data: {
          is_demo_account: true,
          lawyerName: 'Demo Lawyer',
          role: 'demo'
        }
      }
    });

    if (error) {
      console.error('Error creating user:', error.message);
      process.exit(1);
    }

    console.log('✅ Demo user created successfully!');
    console.log('');
    console.log('Add these credentials to Google Play Console:');
    console.log(`Email: ${demoEmail}`);
    console.log(`Password: ${demoPassword}`);
    console.log('');
    console.log('Note: You may need to manually confirm this user in Supabase Dashboard if email confirmation is required.');
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

createDemoUser();
