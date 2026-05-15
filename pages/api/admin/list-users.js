
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { adminUserId } = req.query;
    if (!adminUserId) {
        return res.status(400).json({ error: 'Missing adminUserId' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: 'Server configuration error: Env variables missing' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    try {
        // 1. Verify admin
        const { data: adminData, error: adminError } = await supabaseAdmin
            .from('user_metadata')
            .select('role')
            .eq('user_id', adminUserId)
            .single();

        if (adminError || !adminData || adminData.role !== 'super_admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // 2. Fetch all user metadata (removed order by created_at as it doesn't exist)
        const { data: users, error: usersError } = await supabaseAdmin
            .from('user_metadata')
            .select('*');

        if (usersError) {
            return res.status(500).json({ error: 'Failed to fetch user metadata', details: usersError.message });
        }

        // 2.5. Fetch auth users to get last_sign_in_at using GoTrue admin API
        let lastLoginMap = {};
        try {
            console.log('Fetching auth users via GoTrue admin API...');
            const authUrl = `${supabaseUrl}/auth/v1/admin/users`;
            const response = await fetch(authUrl, {
                headers: {
                    'apikey': serviceRoleKey,
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('GoTrue admin API error:', response.status, errorText);
            } else {
                const authData = await response.json();
                console.log('Found', authData.users?.length || 0, 'auth users via GoTrue API');
                
                if (authData.users) {
                    let usersWithLastLogin = 0;
                    authData.users.forEach(authUser => {
                        if (authUser.id && authUser.last_sign_in_at) {
                            lastLoginMap[authUser.id] = authUser.last_sign_in_at;
                            usersWithLastLogin++;
                        }
                    });
                    console.log('Successfully mapped', usersWithLastLogin, 'users with last_sign_in_at');
                }
            }
        } catch (authFetchError) {
            console.error('Exception fetching auth users via GoTrue API:', authFetchError);
        }

        // 3. Fetch all active subscriptions to manually merge
        const { data: subs, error: subsError } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('status', 'active');

        // 4. Fetch lawyer counts for each admin
        const { data: lawyerUsers, error: lawyerError } = await supabaseAdmin
            .from('lawyer_users')
            .select('admin_user_id');

        const lawyerCounts = {};
        if (!lawyerError && lawyerUsers) {
            lawyerUsers.forEach(lawyer => {
                lawyerCounts[lawyer.admin_user_id] = (lawyerCounts[lawyer.admin_user_id] || 0) + 1;
            });
        }

        // Merge subscriptions, lawyer counts, and last login into users
        const usersWithSubs = users.map(user => {
            // Try to find last_login by matching against multiple possible ID fields
            const lastLogin = lastLoginMap[user.user_id] || 
                             lastLoginMap[user.admin_user_id] || 
                             lastLoginMap[user.new_lawyer_id] || null;
            
            const result = {
                ...user,
                subscriptions: subs ? subs.filter(s => s.user_id === user.user_id) : [],
                lawyer_count: lawyerCounts[user.user_id] || 0,
                last_login: lastLogin
            };
            
            // Log for debugging first few users
            if (users.indexOf(user) < 3) {
                console.log('User:', user.arabic_name, 'user_id:', user.user_id, 'last_login:', lastLogin);
            }
            
            return result;
        });

        return res.status(200).json(usersWithSubs);

    } catch (error) {
        console.error('List users internal error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
