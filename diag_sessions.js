const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diag() {
    console.log('--- Sessions Diagnostic ---');

    // 1. Fetch some sessions
    const { data: sessions, error: sError } = await supabase
        .from('sessions')
        .select('*')
        .limit(10);

    if (sError) {
        console.error('Error fetching sessions:', sError);
    } else {
        console.log('Sample Sessions (found ' + sessions.length + '):');
        sessions.forEach(s => {
            console.log(`ID: ${s.id}, Case: ${s.case_number}, Date: ${s.sessiondate}, Next Date: ${s.next_session_date}, User: ${s.user_id}`);
        });
    }

    // 2. Check user_metadata for a specific user to see firm structure
    // (Assuming there's at least one user)
    const { data: meta, error: mError } = await supabase
        .from('user_metadata')
        .select('*')
        .limit(5);

    if (mError) {
        console.error('Error fetching metadata:', mError);
    } else {
        console.log('\nSample User Metadata:');
        meta.forEach(m => {
            console.log(`User: ${m.user_id}, Admin: ${m.admin_user_id}, Lawyer: ${m.new_lawyer_id}, Role: ${m.role}`);
        });
    }
}

diag();
