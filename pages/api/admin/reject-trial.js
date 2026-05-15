// pages/api/admin/reject-trial.js
// Server-side API to reject trial requests
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { requestId, adminUserId, notes } = req.body;

    if (!requestId || !adminUserId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Verify admin
        const { data: adminData, error: adminError } = await supabaseAdmin
            .from('user_metadata')
            .select('user_id, role')
            .eq('user_id', adminUserId)
            .single();

        if (adminError || !adminData || adminData.role !== 'super_admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Update trial request status
        const { error: updateError } = await supabaseAdmin
            .from('trial_requests')
            .update({
                status: 'rejected',
                notes: notes || null,
                reviewed_at: new Date().toISOString(),
                reviewed_by: adminUserId
            })
            .eq('id', requestId);

        if (updateError) {
            return res.status(500).json({ error: 'Failed to update request', details: updateError.message });
        }

        return res.status(200).json({ success: true, message: 'Request rejected' });

    } catch (error) {
        console.error('Reject trial error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
