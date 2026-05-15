const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function verifyEmail(email) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: email,
            password: "TestPassword123#",
            email_confirm: true,
        })
    });
    console.log("Checking User:", email);
    console.log("API Status:", res.status);
    console.log("Response:", await res.json());
}
verifyEmail("sarmad.mueen84@outlook.com");
