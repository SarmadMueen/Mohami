import { createClient } from '@supabase/supabase-js';
import { checkSubscription } from '../../../lib/checkSubscription';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { user, error: authError } = await supabaseAdmin.auth.api.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check subscription status
    const { isReadOnly } = await checkSubscription(
      user.id,
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    if (isReadOnly) {
      return res.status(403).json({
        error: 'الاشتراك غير فعال. يرجى تجديد الاشتراك أولاً.',
        code: 'SUBSCRIPTION_INACTIVE'
      });
    }

    const { notifications } = req.body;

    if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({ error: 'No notifications provided' });
    }

    // Insert notifications using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert(notifications);

    if (error) {
      console.error('Error creating notifications:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Notification API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
