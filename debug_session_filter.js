require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function diagnose() {
    const caseAdminId = "5e2238fa-37e7-4501-bd71-f17adeafdc2c";
    const sessionCreatorId = "ef27ecac-4557-4350-aec0-e52490529a59";

    console.log("--- DIAGNOSIS START ---");
    console.log(`Case Admin ID: ${caseAdminId}`);
    console.log(`Session Creator ID: ${sessionCreatorId}`);

    // 1. Fetch Case Admin Metadata
    const { data: adminMeta, error: err1 } = await supabase
        .from('user_metadata')
        .select('*')
        .eq('user_id', caseAdminId)
        .single();

    if (err1) console.error("Error fetching admin meta:", err1.message);
    else console.log("Case Admin Metadata:", adminMeta);

    // 2. Fetch Session Creator Metadata
    const { data: creatorMeta, error: err2 } = await supabase
        .from('user_metadata')
        .select('*')
        .eq('user_id', sessionCreatorId)
        .single();

    if (err2) console.error("Error fetching creator meta:", err2.message);
    else console.log("Session Creator Metadata:", creatorMeta);

    // 3. Simulate the Check Logic
    if (creatorMeta) {
        const isExactMatch = creatorMeta.user_id === caseAdminId;
        const isAdminMatch = creatorMeta.admin_user_id === caseAdminId; // Note: admin_user_id might be null if they are an admin

        console.log(`\nCheck Results:`);
        console.log(`Creator User ID == Case Admin ID? ${isExactMatch}`);
        console.log(`Creator Admin User ID == Case Admin ID? ${isAdminMatch}`);
        console.log(`Creator Admin User ID Value: ${creatorMeta.admin_user_id}`);

        // Check previous "Category 1" logic assumption
        console.log(`Creator Role: ${creatorMeta.role}`);
    }

    console.log("--- DIAGNOSIS END ---");
}

diagnose();
