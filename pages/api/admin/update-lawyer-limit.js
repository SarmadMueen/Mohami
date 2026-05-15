import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { adminUserId, targetUserId, customLimit } = req.body;

    if (!adminUserId || !targetUserId) {
        return res.status(400).json({ error: 'Missing required fields: adminUserId, targetUserId' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    try {
        // 1. Verify admin is super_admin
        const { data: adminData } = await supabaseAdmin
            .from('user_metadata')
            .select('role')
            .eq('user_id', adminUserId)
            .single();

        if (!adminData || adminData.role !== 'super_admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // 2. Update custom_lawyer_limit for target user
        const { error: updateError } = await supabaseAdmin
            .from('user_metadata')
            .update({ custom_lawyer_limit: customLimit })
            .eq('user_id', targetUserId);

        if (updateError) {
            console.error('Update lawyer limit error:', updateError);
            return res.status(500).json({ error: 'Failed to update lawyer limit', details: updateError.message });
        }

        console.log(`Updated lawyer limit for user ${targetUserId} to ${customLimit}`);
        return res.status(200).json({ success: true, customLimit });

    } catch (error) {
        console.error('Update lawyer limit internal error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
