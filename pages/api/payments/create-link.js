import { createClient } from '@supabase/supabase-js';

// Use service role key on the server side to bypass RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { plan_id, amount, currency } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Verify user session using admin client (Supabase v1)
        const { user, error: authError } = await supabaseAdmin.auth.api.getUser(token);

        if (authError || !user) {
            console.error('Auth error:', authError);
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Create payment order in DB using admin client (bypasses RLS)
        const { data: orderData, error: dbError } = await supabaseAdmin
            .from('payment_orders')
            .insert([
                {
                    user_id: user.id,
                    amount,
                    currency,
                    status: 'created'
                }
            ]);

        if (dbError) {
            console.error('DB Insert Error:', dbError);
            throw dbError;
        }

        // For supabase-js v1, insert returns the inserted rows directly
        const insertedRow = Array.isArray(orderData) ? orderData[0] : orderData;
        const referenceId = insertedRow?.id;

        if (!referenceId) {
            console.error('No referenceId returned from insert. orderData:', orderData);
            throw new Error('Failed to get order ID from database');
        }

        // Try to construct a robust appUrl, prioritizing the explicitly set Env, then falling back to Vercel's auto-generated URL
        let appUrl = process.env.NEXT_PUBLIC_APP_URL;
        if (!appUrl) {
            if (process.env.VERCEL_URL) {
                appUrl = `https://${process.env.VERCEL_URL}`;
            } else if (req.headers.host) {
                const protocol = req.headers['x-forwarded-proto'] || 'http';
                appUrl = `${protocol}://${req.headers.host}`;
            } else {
                appUrl = 'http://localhost:3000';
            }
        }

        // Strip trailing slash if present to avoid malformed URLs
        appUrl = appUrl.replace(/\/$/, "");

        const webhookUrl = `${appUrl}/api/webhooks/wayl`;
        const redirectionUrl = `${appUrl}/billing?payment=success`;

        // TODO: Change back to 'live' after testing is done
        const environment = 'live';

        // Call Wayl API to create Link
        const waylPayload = {
            env: environment,
            referenceId: String(referenceId),
            total: amount,
            currency: currency,
            customParameter: plan_id,
            lineItem: [
                {
                    label: `Subscription: ${plan_id}`,
                    amount: amount,
                    type: "increase"
                }
            ],
            webhookUrl: webhookUrl,
            webhookSecret: process.env.WAYL_WEBHOOK_SECRET || "1234567890",
            redirectionUrl: redirectionUrl
        };

        console.log('Wayl Request Payload:', JSON.stringify(waylPayload, null, 2));
        console.log('Wayl API URL:', `${process.env.WAYL_API_URL}/links`);

        const waylRes = await fetch(`${process.env.WAYL_API_URL}/links`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': '*/*',
                'X-WAYL-AUTHENTICATION': process.env.WAYL_API_KEY
            },
            body: JSON.stringify(waylPayload)
        });

        const waylText = await waylRes.text();
        console.log('Wayl Response Status:', waylRes.status);
        console.log('Wayl Response Body:', waylText);

        let waylResult;
        try {
            waylResult = JSON.parse(waylText);
        } catch (e) {
            console.error('Failed to parse Wayl response:', waylText);
            await supabaseAdmin.from('payment_orders').update({ status: 'failed' }).eq('id', referenceId);
            return res.status(500).json({ error: 'Invalid response from payment provider' });
        }

        if (!waylRes.ok || !waylResult.success) {
            console.error('Wayl API Error:', waylResult);
            await supabaseAdmin.from('payment_orders').update({ status: 'failed' }).eq('id', referenceId);
            return res.status(500).json({ error: 'Failed to create payment link', details: waylResult });
        }

        // Success - Update order with wayl_order_id
        await supabaseAdmin.from('payment_orders').update({ wayl_order_id: waylResult.data.id }).eq('id', referenceId);

        // Return the URL for redirect
        return res.status(200).json({ url: waylResult.data.url });

    } catch (error) {
        console.error('Create Link Error:', error?.message || error);
        return res.status(500).json({ error: 'Internal Server Error', details: error?.message });
    }
}
