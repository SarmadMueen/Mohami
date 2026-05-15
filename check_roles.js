
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoles() {
    const { data, error } = await supabase
        .from('user_metadata')
        .select('role')

    if (error) {
        console.error('Error:', error);
        return;
    }

    const uniqueRoles = [...new Set(data.map(item => item.role).filter(r => r))];
    console.log('Distinct Roles Found:', uniqueRoles);

    // Also getting a sample row to see structure
    const { data: sample } = await supabase.from('user_metadata').select('*').limit(1);
    console.log('Sample Row:', sample);
}

checkRoles();
