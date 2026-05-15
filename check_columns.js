
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://niwtiaalvvivyjqtgznw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pd3RpYWFsdnZpdnlqcXRnem53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTAzODE4OTYsImV4cCI6MjAwNTk1Nzg5Nn0.bE3Tp7NyY8rYu_Wg0LYzdT5DADYAsxU2dIag6FOq4A4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        if (data.length > 0) {
            console.log('Sessions Columns:', Object.keys(data[0]));
        } else {
            console.log('No sessions found to check columns');
        }
    }
}

checkColumns();
