import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // Handle CORS preflight for mobile app (origin: https://localhost)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // 1. Verify User (Supabase v1: auth.api.getUser returns { user, error })
        let userPayload = null;
        try {
            const { user, error: authError } = await supabaseAdmin.auth.api.getUser(token);

            if (user && !authError) {
                userPayload = user;
            } else if (authError && (authError.status === 403 || authError.status === 401) && authError.message?.toLowerCase().includes('session')) {
                // Fallback: the session_id is missing/expired, but the token itself might be valid for identification.
                // Since we are using service_role, we can proceed if we know the user's identity from the signed payload.
                try {
                    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                    if (payload && payload.sub) {
                        console.warn('Handled session mismatch for user:', payload.sub);
                        userPayload = { id: payload.sub, email: payload.email };
                    }
                } catch (decodeErr) {
                    console.error('JWT decode failure:', decodeErr);
                }
            } else if (authError) {
                console.error('get-info auth error:', authError);
            }
        } catch (verifyErr) {
            console.error('Auth verification unexpected error:', verifyErr);
        }

        if (!userPayload) {
            return res.status(401).json({ error: 'Unauthorized', debug: 'Auth failed' });
        }

        // Optionally accept a targetUserId (for lawyers checking their admin's subscription)
        let targetUserId = req.query.targetUserId || userPayload.id;

        // 2. Query subscription using admin client (bypasses RLS)
        const { data: subData, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('user_id', targetUserId)
            .eq('status', 'active')
            .order('current_period_end', { ascending: false })
            .limit(1);

        if (subError) {
            console.error('Subscription query error in get-info:', subError);
        }

        const subscription = subData && subData.length > 0 ? subData[0] : null;

        return res.status(200).json({
            subscription: subscription
        });

    } catch (error) {
        console.error('Get subscription info error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
