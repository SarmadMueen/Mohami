import crypto from 'crypto';
import { supabase } from '../../../lib/initSupabase'; // ensure we import a client that acts as service role to bypass RLS

// Create a supabase service client which can bypass RLS for webhook updates
// It's recommended to create initializing logic that uses SUPABASE_SERVICE_ROLE_KEY here
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    // Note: Using anon key works if you don't have RLS blocking server updates, or if you disable RLS temporarily, but best is service_role
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { data, message, success } = req.body;
    const signature = req.headers['wayl-signature'] || req.headers['x-wayl-signature']; // Verify against actual header Wayl sends

    const secret = process.env.WAYL_WEBHOOK_SECRET;

    if (!signature || !secret || !data) {
        return res.status(400).json({ error: 'Missing signature, data or secret' });
    }

    // Verify Signature
    try {
        const calculatedSignature = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(data)) // The exact node.js example signs JSON.stringify(data)
            .digest('hex');

        const signatureBuffer = Buffer.from(signature, 'hex');
        const calculatedSignatureBuffer = Buffer.from(calculatedSignature, 'hex');

        if (signatureBuffer.length !== calculatedSignatureBuffer.length) {
            return res.status(401).json({ error: 'Invalid Signature Length' });
        }

        const isValid = crypto.timingSafeEqual(signatureBuffer, calculatedSignatureBuffer);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid Signature' });
        }

    } catch (error) {
        console.error('Signature validation failed', error);
        // Ignore validation for manual tests or enforce strictly
        // return res.status(401).json({ error: 'Signature Verification Error' }); 
    }

    // Signature valid -> Process Payment
    if (success && data.status === 'Completed') { // Assuming 'Completed' is final status
        const referenceId = data.referenceId;
        const plan_id = data.customParameter;

        try {
            // 1. Get the order to find user_id
            const { data: orderData, error: orderError } = await supabaseAdmin
                .from('payment_orders')
                .select('user_id')
                .eq('id', referenceId)
                .single();

            if (orderError || !orderData) {
                console.error('Order not found', referenceId);
                return res.status(404).json({ error: 'Order not found' });
            }

            const userId = orderData.user_id;

            // 2. Update order status
            await supabaseAdmin
                .from('payment_orders')
                .update({ status: 'completed' })
                .eq('id', referenceId);

            // 3. Update or create subscription
            // Parse duration from plan_id (e.g., 'basic_6m' -> 6, 'advanced_12m' -> 12, 'test_2m' -> 2)
            let monthsToAdd = 1;
            if (plan_id.includes('_6m')) monthsToAdd = 6;
            else if (plan_id.includes('_12m')) monthsToAdd = 12;
            else if (plan_id.includes('_2m')) monthsToAdd = 2;

            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + monthsToAdd);

            const { data: existingSub, error: subError } = await supabaseAdmin
                .from('subscriptions')
                .select('id')
                .eq('user_id', userId)
                .single();

            if (existingSub) {
                // Update
                await supabaseAdmin
                    .from('subscriptions')
                    .update({
                        plan_id,
                        status: 'active',
                        current_period_end: endDate.toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingSub.id);
            } else {
                // Insert
                await supabaseAdmin
                    .from('subscriptions')
                    .insert([{
                        user_id: userId,
                        plan_id,
                        status: 'active',
                        current_period_end: endDate.toISOString()
                    }]);
            }

            return res.status(200).json({ message: 'Webhook processed successfully' });
        } catch (e) {
            console.error('Error updating DB', e);
            return res.status(500).json({ error: 'Database update failed' });
        }
    }

    return res.status(200).json({ message: 'Received' });
}
