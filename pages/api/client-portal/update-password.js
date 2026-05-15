import { supabase } from '../../../lib/initSupabase';
import { createClient } from '@supabase/supabase-js';
import { checkSubscription } from '../../../lib/checkSubscription';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Get current user to check subscription
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check subscription status
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { isReadOnly } = await checkSubscription(user.id, supabaseUrl, serviceKey);
    if (isReadOnly) {
      return res.status(403).json({
        error: 'الاشتراك غير فعال. يرجى تجديد الاشتراك أولاً.',
        code: 'SUBSCRIPTION_INACTIVE'
      });
    }

    const { error } = await supabase.auth.update({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
