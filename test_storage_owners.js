const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function checkStorageOwners() {
    try {
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/objects?bucket_id=eq.images&select=id,name,owner,metadata`;

        const pgData = await fetch(url, {
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Accept-Profile': 'storage' // To query the storage schema via PostgREST
            }
        }
        ).then(res => res.json());

        // Summarize
        const owners = {};
        for (let obj of pgData) {
            const ownerId = obj.owner || 'NULL';
            owners[ownerId] = (owners[ownerId] || 0) + (obj.metadata?.size || 0);
        }

        console.log("Bucket 'images' owners distribution:");
        console.table(Object.entries(owners).map(([owner, size]) => ({ owner, size })));

    } catch (e) {
        console.error(e);
    }
}
checkStorageOwners();
