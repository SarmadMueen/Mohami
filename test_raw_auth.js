const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function findUser(email) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Direct REST query into auth users using API trick or custom RPC (or just listing metadata)
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'GET',
        headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json'
        }
    });

    const usersData = await res.json();
    const users = Array.isArray(usersData) ? usersData : usersData.users;

    if (users) {
        const found = users.find(u => u.email === email);
        console.log("Raw Auth Table Data for Email:", found || "NOT FOUND");
    } else {
        console.log("Failed to load users list", usersData);
    }
}
findUser("sarmad.mueen84@outlook.com");
