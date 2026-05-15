const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const filename = '1770809790165-4zpco89jhks.jpg';

async function checkBucket(bucketName) {
    console.log(`Checking bucket: ${bucketName}`);

    // Check root
    const { data: rootData, error: rootError } = await supabase.storage.from(bucketName).list('', {
        search: filename
    });

    if (rootData && rootData.length > 0) {
        console.log(`FOUND in ${bucketName} (root):`, rootData);
    } else {
        console.log(`Not found in ${bucketName} (root)`);
    }

    // Check subfolder bar-ids/
    const { data: subData, error: subError } = await supabase.storage.from(bucketName).list('bar-ids', {
        search: filename
    });

    if (subData && subData.length > 0) {
        console.log(`FOUND in ${bucketName} (bar-ids/):`, subData);
    } else {
        console.log(`Not found in ${bucketName} (bar-ids/)`);
    }
}

async function run() {
    await checkBucket('bar-ids');
    await checkBucket('images');
}

run();
