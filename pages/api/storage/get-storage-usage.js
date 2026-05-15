import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const PLAN_STORAGE_MAP = {
    'trial_14d': 2,
    'extended_trial': 10,
    'extended_trial_10gb': 10,
    'extended_trial_25gb': 25,
    'test_1m': 10,
    'test_2m': 10,
    'basic_1m': 10,
    'basic_6m': 10,
    'basic_12m': 10,
    'advanced_1m': 25,
    'advanced_6m': 25,
    'advanced_12m': 25,
};

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
                // Fallback for session_id mismatch
                try {
                    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                    if (payload && payload.sub) {
                        userPayload = { id: payload.sub, email: payload.email };
                    }
                } catch (decodeErr) {
                    console.error('JWT decode failure:', decodeErr);
                }
            } else if (authError) {
                console.error('get-storage-usage auth error:', authError);
            }
        } catch (verifyErr) {
            console.error('Auth verification unexpected error:', verifyErr);
        }

        if (!userPayload) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // We optionally accept an adminUserId to check a specific admin's storage (useful if the requester is their lawyer)
        const requestAdminId = req.query.adminUserId || userPayload.id;

        // 2. Identify the firm's Admin and all associated Lawyer IDs
        const { data: teamMembers, error: teamError } = await supabaseAdmin
            .from('user_metadata')
            .select('user_id')
            .eq('admin_user_id', requestAdminId);

        if (teamError) {
            throw new Error('Failed to fetch team members');
        }

        const firmUserIds = teamMembers.map(m => m.user_id);
        if (!firmUserIds.includes(requestAdminId)) {
            firmUserIds.push(requestAdminId);
        }

        // 3. Find the active subscription for the Admin to determine the limit
        const { data: subListData, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .select('plan_id')
            .eq('user_id', requestAdminId)
            .eq('status', 'active')
            .order('current_period_end', { ascending: false })
            .limit(1);

        if (subError) {
            console.error('Subscription query error in get-storage-usage:', subError);
        }

        const subData = subListData && subListData.length > 0 ? subListData[0] : null;
        let planId = subData ? subData.plan_id : 'trial_14d';
        
        // Final mapping based on user confirmation: Extended Trial Basic is 10GB, Pro is 25GB
        let limitGB = 2;
        if (PLAN_STORAGE_MAP[planId]) {
            limitGB = PLAN_STORAGE_MAP[planId];
        } else if (planId.toLowerCase().includes('extended_trial')) {
            // Default to 10GB for extended trials, but 25GB if it's explicitly a pro version or check elsewhere
            limitGB = 10;
        } else if (planId.includes('advanced')) {
            limitGB = 25;
        } else if (planId.includes('basic')) {
            limitGB = 10;
        }
        
        const limitBytes = limitGB * 1024 * 1024 * 1024;

        // 4. Query the storage.objects table to sum up the sizes of files owned by the firm
        // The storage schema is not exposed to the standard PostgREST by default from the JS client `.from()`.
        // We need to fetch directly against the REST endpoint using the 'storage' schema profile.
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/objects?owner=in.(${firmUserIds.join(',')})&select=metadata`;
        const storageRes = await fetch(url, {
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Accept-Profile': 'storage'
            }
        });

        if (!storageRes.ok) {
            console.error('Storage query failed:', await storageRes.text());
            throw new Error('Failed to fetch storage objects');
        }

        const objects = await storageRes.json();

        const usedBytes = objects.reduce((acc, curr) => {
            return acc + (curr.metadata?.size || 0);
        }, 0);

        const usedGB = (usedBytes / (1024 * 1024 * 1024)).toFixed(3);
        const percentUsed = Math.min(100, ((usedBytes / limitBytes) * 100).toFixed(1));
        const isAllowed = usedBytes < limitBytes;

        return res.status(200).json({
            allowed: isAllowed,
            usedBytes,
            usedGB: parseFloat(usedGB),
            limitGB,
            percentUsed: parseFloat(percentUsed),
            userCount: firmUserIds.length,
            planId
        });

    } catch (error) {
        console.error('Storage Usage Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
