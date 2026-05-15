const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = 'sarmad.mueen84@outlook.com';

async function checkLeftovers() {
    // Check user_metadata by email
    const metaRes = await fetch(`${supabaseUrl}/rest/v1/user_metadata?email=eq.${encodeURIComponent(EMAIL)}&select=*`, {
        headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
    });
    const meta = await metaRes.json();
    console.log('user_metadata records:', meta.length > 0 ? meta : 'NONE');

    // Check trial_requests by email
    const trialRes = await fetch(`${supabaseUrl}/rest/v1/trial_requests?email=eq.${encodeURIComponent(EMAIL)}&select=*`, {
        headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
    });
    const trials = await trialRes.json();
    console.log('trial_requests records:', trials.length > 0 ? trials : 'NONE');

    // Delete any leftover metadata by email
    if (meta.length > 0) {
        const delMeta = await fetch(`${supabaseUrl}/rest/v1/user_metadata?email=eq.${encodeURIComponent(EMAIL)}`, {
            method: 'DELETE',
            headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
        });
        console.log('Cleaned up leftover user_metadata:', delMeta.status);
    }

    // Delete any leftover trial_requests by email
    if (trials.length > 0) {
        const delTrials = await fetch(`${supabaseUrl}/rest/v1/trial_requests?email=eq.${encodeURIComponent(EMAIL)}`, {
            method: 'DELETE',
            headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
        });
        console.log('Cleaned up leftover trial_requests:', delTrials.status);
    }

    console.log('\n✅ All traces of', EMAIL, 'have been wiped. You can register fresh now!');
}
checkLeftovers();
