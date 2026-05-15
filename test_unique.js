const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testUnique() {
    console.log('Testing if case_number has a unique constraint...');
    const testNum = '001'; // Known to exist for Admin A
    const fakeAdmin = '00000000-0000-0000-0000-000000000000';

    const { error } = await supabase.from('cases').insert([{
        case_number: testNum,
        admin_id: fakeAdmin,
        client_name: 'TEST DELETE ME',
        caseType: 'المدنية',
        client_type: 'منفذ',
        client_adult_child: 'حدث'
    }]);

    if (error) {
        console.log('Error received:', error.message);
        if (error.message.includes('unique constraint') || error.code === '23505') {
            console.log('RESULT: YES, a unique constraint exists on case_number.');
        } else {
            console.log('RESULT: Received an error, but might not be a unique constraint.');
        }
    } else {
        console.log('RESULT: NO unique constraint detected (inserted successfully).');
        // Cleanup
        await supabase.from('cases').delete().eq('admin_id', fakeAdmin);
    }
}
testUnique();
