const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function testCreateUser() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log("URL:", supabaseUrl);
    console.log("Key:", serviceRoleKey ? "Found" : "Missing");

    const tempPassword = "TestPassword123#";

    const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: 'test_admin_user_284728@example.com',
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
                username: 'Test User',
                arabic_name: 'تجربة',
                role: 'الفئة 1',
            }
        })
    });

    const createUserData = await createUserResponse.json();
    console.log("Status:", createUserResponse.status);
    console.log("Data:", createUserData);
}

testCreateUser();
