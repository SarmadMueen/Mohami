const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function diagnose() {
    const adminB_ID = '066ec082-041d-48bf-ab25-c2827e481c5b';
    const { data: metaB } = await supabase.from('user_metadata').select('*').or(`user_id.eq.${adminB_ID},new_lawyer_id.eq.${adminB_ID}`);
    console.log('USER B METADATA:', metaB.map(m => ({ user_id: m.user_id, admin_id: m.admin_user_id, role: m.role })));

    const { data: cases } = await supabase.from('cases').select('case_number, admin_id').order('created_at', { ascending: false });
    const counts = {};
    cases.forEach(c => counts[c.admin_id] = (counts[c.admin_id] || 0) + 1);
    console.log('COUNTS BY ADMIN:', counts);

    const b_cases = cases.filter(c => c.admin_id === adminB_ID);
    console.log('CASES FOR ADMIN B:', b_cases.map(c => c.case_number));
}
diagnose();
