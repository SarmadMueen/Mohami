import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { adminUserId, targetUserId, isDisabled } = req.body;

    if (!adminUserId || !targetUserId || isDisabled === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: 'Server configuration error: Env variables missing' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    try {
        // 1. Verify admin is super_admin
        const { data: adminData, error: adminError } = await supabaseAdmin
            .from('user_metadata')
            .select('role')
            .eq('user_id', adminUserId)
            .single();

        if (adminError || !adminData || adminData.role !== 'super_admin') {
            return res.status(403).json({ error: 'Unauthorized: Only super_admin can disable accounts' });
        }

        // 2. Prevent disabling super_admin accounts
        const { data: targetUserData, error: targetUserError } = await supabaseAdmin
            .from('user_metadata')
            .select('role')
            .eq('user_id', targetUserId)
            .single();

        if (targetUserError) {
            return res.status(404).json({ error: 'Target user not found' });
        }

        if (targetUserData.role === 'super_admin') {
            return res.status(403).json({ error: 'Cannot disable super_admin accounts' });
        }

        // 3. Update is_disabled status
        const { error: updateError } = await supabaseAdmin
            .from('user_metadata')
            .update({ is_disabled: isDisabled })
            .eq('user_id', targetUserId);

        if (updateError) {
            console.error('Update error:', updateError);
            // Check if error is due to missing column
            if (updateError.message && updateError.message.includes('column') && updateError.message.includes('does not exist')) {
                return res.status(500).json({ 
                    error: 'Database migration required: is_disabled column does not exist. Please run the migration: database/migrations/add_is_disabled_to_user_metadata.sql',
                    details: updateError.message 
                });
            }
            return res.status(500).json({ error: 'Failed to update account status', details: updateError.message });
        }

        return res.status(200).json({ 
            success: true,
            message: isDisabled ? 'Account disabled successfully' : 'Account enabled successfully'
        });

    } catch (error) {
        console.error('Toggle user disable error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
