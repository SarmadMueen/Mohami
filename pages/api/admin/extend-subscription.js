
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { adminUserId, targetUserId, days, subscriptionId } = req.body;

    console.log('Extend subscription request:', { adminUserId, targetUserId, days, subscriptionId });

    if (!adminUserId || !targetUserId || !days) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing Supabase configuration');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    try {
        // 1. Verify admin
        const { data: adminData, error: adminError } = await supabaseAdmin
            .from('user_metadata')
            .select('role')
            .eq('user_id', adminUserId)
            .single();

        if (adminError) {
            console.error('Admin verification error:', adminError);
            return res.status(500).json({ error: 'Database error verifying admin', details: adminError.message });
        }

        if (!adminData || adminData.role !== 'super_admin') {
            console.error('Unauthorized admin:', adminData);
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // 2. Calculate new expiry
        let currentExpiry = new Date();

        // If we have an existing subscription, potentially start from its end date
        if (subscriptionId) {
            const { data: sub, error: subError } = await supabaseAdmin
                .from('subscriptions')
                .select('current_period_end')
                .eq('id', subscriptionId)
                .single();

            if (subError) {
                console.error('Error fetching subscription:', subError);
                return res.status(500).json({ error: 'Failed to fetch subscription', details: subError.message });
            }

            if (sub && new Date(sub.current_period_end) > new Date()) {
                currentExpiry = new Date(sub.current_period_end);
            }
        }

        currentExpiry.setDate(currentExpiry.getDate() + parseInt(days));
        console.log('New expiry date:', currentExpiry.toISOString());

        // 3. Update or Insert
        let result;
        if (subscriptionId) {
            result = await supabaseAdmin
                .from('subscriptions')
                .update({
                    current_period_end: currentExpiry.toISOString(),
                    status: 'active',
                    updated_at: new Date().toISOString()
                })
                .eq('id', subscriptionId);
        } else {
            result = await supabaseAdmin
                .from('subscriptions')
                .insert({
                    user_id: targetUserId,
                    plan_id: 'extended_trial',
                    status: 'active',
                    current_period_end: currentExpiry.toISOString()
                });
        }

        if (result.error) {
            console.error('Subscription operation error:', result.error);
            throw result.error;
        }

        console.log('Subscription extended successfully for user:', targetUserId);
        return res.status(200).json({ success: true, newExpiry: currentExpiry.toISOString() });

    } catch (error) {
        console.error('Extend subscription internal error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
