const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
    console.log('--- DIAGNOSTIC START ---');

    // 1. Fetch metadata for the two users mentioned
    const adminA_ID = 'ef27ecac-4557-4350-aec0-e52490529a59';
    const adminB_ID = '066ec082-041d-48bf-ab25-c2827e481c5b';

    const { data: metaA } = await supabase.from('user_metadata').select('*').or(`user_id.eq.${adminA_ID},new_lawyer_id.eq.${adminA_ID}`);
    const { data: metaB } = await supabase.from('user_metadata').select('*').or(`user_id.eq.${adminB_ID},new_lawyer_id.eq.${adminB_ID}`);

    console.log('User A (Firm A) Metadata:', JSON.stringify(metaA, null, 2));
    console.log('User B (Firm B) Metadata:', JSON.stringify(metaB, null, 2));

    // 2. Count cases for each admin_id
    const { data: counts, error: countError } = await supabase
        .from('cases')
        .select('admin_id, case_number')
        .order('created_at', { ascending: false });

    if (countError) {
        console.error('Error fetching counts:', countError);
        return;
    }

    const adminCounts = {};
    counts.forEach(c => {
        adminCounts[c.admin_id] = (adminCounts[c.admin_id] || 0) + 1;
    });

    console.log('Case Counts by admin_id:', adminCounts);

    // 3. Find specifically cases with admin_id of User B
    const firmB_Cases = counts.filter(c => c.admin_id === adminB_ID);
    console.log(`Cases found for Admin B (${adminB_ID}):`, firmB_Cases.map(c => c.case_number));

    // 4. Check for ANY cases with case_number "001", "002", "003", "004" and their admin_ids
    const lowNums = ["001", "002", "003", "004", "005"];
    const lowCases = counts.filter(c => lowNums.includes(c.case_number));
    console.log('Specific Low-Number Cases details:', lowCases.map(c => ({ num: c.case_number, admin: c.admin_id })));

    console.log('--- DIAGNOSTIC END ---');
}

diagnose();
