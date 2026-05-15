
import { supabase } from './lib/initSupabase';

async function checkSchema() {
    const { data, error } = await supabase.from('case_update').select('*').limit(1);
    if (error) {
        console.error('Error fetching schema:', error);
    } else {
        console.log('Columns in case_update:', Object.keys(data[0] || {}));
    }
}

checkSchema();
