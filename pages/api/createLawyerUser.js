// pages/api/registerUser.js
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/initSupabase';

// Plan-based max lawyers map
function getMaxLawyers(planId) {
  if (!planId) return 2; // legacy trial (no subscription record) gets 2
  const id = planId.toLowerCase();
  if (id.includes('basic')) return 0;
  if (id.includes('advanced')) return 2;
  if (id.includes('extended_trial')) return 2;
  if (id.includes('test')) return 2;
  if (id.includes('trial')) return 2;
  return 0; // unknown plan defaults to 0
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { email, password, adminUserId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }

    if (!adminUserId) {
      return res.status(400).json({ error: 'معرف المدير مطلوب' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: 'خطأ في تكوين الخادم' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    try {
      // 1. Get admin's active subscription
      const { data: subData } = await supabaseAdmin
        .from('subscriptions')
        .select('plan_id, current_period_end, status')
        .eq('user_id', adminUserId)
        .order('current_period_end', { ascending: false })
        .limit(1);

      let planId = null;
      let isActive = false;

      if (subData && subData.length > 0) {
        const sub = subData[0];
        const expiry = new Date(sub.current_period_end?.replace(' ', 'T') || sub.current_period_end);
        isActive = expiry > new Date();
        if (isActive) {
          planId = sub.plan_id;
        }
      } else {
        // No subscription record — check legacy 14-day trial from auth user creation
        const { data: adminAuth } = await supabaseAdmin.auth.api.getUserById(adminUserId);
        if (adminAuth) {
          const createdAt = new Date(adminAuth.created_at);
          const trialEnd = new Date(createdAt);
          trialEnd.setDate(trialEnd.getDate() + 14);
          isActive = trialEnd > new Date();
          if (isActive) planId = 'trial_14d';
        }
      }

      if (!isActive) {
        return res.status(403).json({
          error: 'الاشتراك غير فعال. يرجى تجديد الاشتراك أولاً.',
          code: 'SUBSCRIPTION_INACTIVE'
        });
      }

      // 2. Check for custom lawyer limit first
      let maxLawyers = getMaxLawyers(planId);
      const { data: adminMetadata, error: metaError } = await supabaseAdmin
        .from('user_metadata')
        .select('custom_lawyer_limit')
        .eq('user_id', adminUserId)
        .single();

      if (!metaError && adminMetadata && adminMetadata.custom_lawyer_limit !== null && adminMetadata.custom_lawyer_limit !== undefined) {
        maxLawyers = adminMetadata.custom_lawyer_limit;
        console.log('Using custom lawyer limit:', maxLawyers, 'for admin:', adminUserId);
      }

      if (maxLawyers === 0) {
        return res.status(403).json({
          error: 'الباقة الأساسية لا تتيح إضافة محامين. يرجى الترقية إلى الباقة المتقدمة.',
          code: 'PLAN_NO_LAWYERS'
        });
      }

      // 3. Count existing lawyers under this admin
      const { data: existingLawyers, error: countError } = await supabaseAdmin
        .from('lawyer_users')
        .select('id')
        .eq('admin_user_id', adminUserId);

      if (countError) {
        console.error('Error counting lawyers:', countError);
        return res.status(500).json({ error: 'خطأ في التحقق من عدد المحامين' });
      }

      const currentCount = existingLawyers ? existingLawyers.length : 0;

      if (currentCount >= maxLawyers) {
        return res.status(403).json({
          error: `لقد وصلت إلى الحد الأقصى لعدد المحامين (${maxLawyers}). يرجى ترقية باقتك لإضافة المزيد.`,
          code: 'LAWYER_LIMIT_REACHED',
          currentCount,
          maxLawyers
        });
      }

      // 4. Create the user
      const { user, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      res.status(200).json({ user });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
