import { createClient } from '@supabase/supabase-js';

/**
 * Check if a user's subscription is active (not in read-only mode)
 * @param {string} userId - The user ID to check
 * @param {string} supabaseUrl - Supabase URL from environment
 * @param {string} serviceKey - Supabase service role key from environment
 * @returns {Promise<{isReadOnly: boolean, subscription: object|null}>}
 */
export async function checkSubscription(userId, supabaseUrl, serviceKey) {
  if (!userId || !supabaseUrl || !serviceKey) {
    return { isReadOnly: false, subscription: null };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  try {
    // Get the latest active subscription
    const { data: subData, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('current_period_end', { ascending: false })
      .limit(1)
      .single();

    if (error || !subData) {
      // No subscription record - check legacy 14-day trial
      const { data: authUser } = await supabaseAdmin.auth.api.getUserById(userId);
      if (authUser) {
        const createdAt = new Date(authUser.created_at);
        const trialEnd = new Date(createdAt);
        trialEnd.setDate(trialEnd.getDate() + 14);
        const now = new Date();
        const isReadOnly = trialEnd < now;
        return { isReadOnly, subscription: null };
      }
      return { isReadOnly: false, subscription: null };
    }

    // Check if subscription is expired
    const expiryStr = subData.current_period_end?.replace(' ', 'T') || subData.current_period_end;
    const expiryDate = new Date(expiryStr);
    const now = new Date();
    const isReadOnly = expiryDate < now;

    return { isReadOnly, subscription: subData };
  } catch (error) {
    console.error('Error checking subscription:', error);
    return { isReadOnly: false, subscription: null };
  }
}
