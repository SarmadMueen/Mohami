const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function listAll() {
    const { data: cases } = await supabase.from('cases').select('case_number, admin_id, caseLawyerId').order('case_number', { ascending: true });
    console.log('ALL CASES IN DB:');
    cases.forEach(c => {
        console.log(`Num: ${c.case_number} | Admin: ${c.admin_id} | Lawyer: ${c.caseLawyerId}`);
    });
}
listAll();
