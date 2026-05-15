const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function checkPendingRequests() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Fetch pending trial requests
    const trialRes = await fetch(`${supabaseUrl}/rest/v1/trial_requests?status=eq.pending`, {
        headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json'
        }
    }
    );
    const trials = await trialRes.json();
    console.log("Pending trials:", trials.map(t => t.email));

    // Try creating the first one exactly as the backend does, just without email sending
    if (trials.length > 0) {
        const t = trials[0];
        console.log(`Trying to parse and test email: "${t.email}"`);

        const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
            method: 'POST',
            headers: {
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: t.email.trim(), // Notice we don't trim in the main code!
                password: "TestPassword123#",
                email_confirm: true,
            })
        });
        console.log("Create using trim() ->", res.status, await res.json());
    }
}
checkPendingRequests();
