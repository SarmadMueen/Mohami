const fetch = require('node-fetch');

async function debugBackend() {
    // Valid request for Noor's email logic to hit the exact codepath
    const adminUser = '13cc9ce8-1154-44e6-9566-0c98d707e630'; // MUSTAFA ID

    // I need a pending trial request ID
    require('dotenv').config({ path: '.env.local' });
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const trialRes = await fetch(`${supabaseUrl}/rest/v1/trial_requests?status=eq.pending`, {
        headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
    });
    const trials = await trialRes.json();

    if (trials && trials.length > 0) {
        const reqId = trials[0].id;
        console.log("Triggering on request ID:", reqId);

        const res = await fetch("http://localhost:3000/api/admin/approve-trial", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId: reqId, adminUserId: adminUser })
        });

        console.log("Status:", res.status);
        console.log("Response Text:", await res.text());
    } else {
        console.log("No pending trials to test with.");
    }
}
debugBackend();
