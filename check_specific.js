const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const adminA = 'ef27ecac-4557-4350-aec0-e52490529a59';
    const adminB = '066ec082-041d-48bf-ab25-c2827e481c5b';

    const { data: aCases } = await supabase.from('cases').select('case_number').eq('admin_id', adminA);
    const { data: bCases } = await supabase.from('cases').select('case_number').eq('admin_id', adminB);

    console.log(`FIRM A (${adminA}) cases:`, aCases.map(c => c.case_number));
    console.log(`FIRM B (${adminB}) cases:`, bCases.map(c => c.case_number));

    const { data: nullCases } = await supabase.from('cases').select('case_number').is('admin_id', null);
    console.log(`NULL ADMIN cases:`, nullCases.map(c => c.case_number));
}
check();
