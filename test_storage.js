const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testStorageSum() {
    try {
        const { data, error } = await supabaseAdmin
            .storage
            .from('images') // Let's just try to query the table directly first
            .list('images', {
                limit: 10,
                offset: 0,
            });

        console.log("Bucket list:", data);

        // Alternatively query the underlying table, which requires admin privileges
        // but 'storage.objects' is usually exposed in the `storage` schema.
        // On Supabase API, it's typically exposed via RPC or direct SQL if using postgres client,
        // but rest API can access it via `/rest/v1/objects?schema=storage` but standard `from` targets `public`.

        // With service role, we might not be able to do .from('storage.objects') directly if it's not in public schema.
        // Wait, supabase-js v2 allows `supabase.schema('storage').from('objects')`. Let's check local version.
        const pgData = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/objects?select=id,name,owner,metadata`,
            {
                headers: {
                    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                    'Accept-Profile': 'storage' // To query the storage schema via PostgREST
                }
            }
        ).then(res => res.json());

        console.log("Storage objects via REST:", pgData.slice(0, 3));

    } catch (e) {
        console.error(e);
    }
}
testStorageSum();
