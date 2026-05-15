import { createClient } from '@supabase/supabase-js';
import { checkSubscription } from '../../../lib/checkSubscription';

export default async function handler(req, res) {
  // Ensure we always have JSON headers even on early exits
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, clientDataId, adminId, createdBy } = req.body;

  if (!email || !password || !clientDataId || !adminId) {
    return res.status(400).json({ error: 'Missing required fields: email, password, clientDataId, adminId' });
  }

  // Check for environment variables inside the handler to prevent module-level crashes
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('[API] Missing Supabase environment variables');
    return res.status(500).json({ error: 'حدث خطأ في تكوين الخادم. الرجاء التأكد من وجود مفاتيح Supabase.' });
  }

  // Setup Supabase Admin client
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  console.log(`[API] Processing portal account for: ${email}, Client ID: ${clientDataId}`);

  try {
    // 0. Check subscription status
    const { isReadOnly } = await checkSubscription(adminId, supabaseUrl, serviceKey);
    if (isReadOnly) {
      return res.status(403).json({
        error: 'الاشتراك غير فعال. يرجى تجديد الاشتراك أولاً.',
        code: 'SUBSCRIPTION_INACTIVE'
      });
    }

    // 1. Create the auth user via Supabase Admin API
    const { data: user, error: signUpError } = await supabaseAdmin.auth.api.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { role: 'client_portal' }
    });

    if (signUpError) {
      console.error('[API] Auth Error:', signUpError);
      if (signUpError.message.includes('already exists')) {
        return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً لمستخدم آخر. يرجى استخدام بريد مختلف.' });
      }
      return res.status(400).json({ error: signUpError.message });
    }

    if (!user) {
      throw new Error('Failed to create user account record');
    }

    console.log(`[API] Auth user created: ${user.id}`);

    // 2. Link to client_accounts table
    const { data: clientAccount, error: insertError } = await supabaseAdmin
      .from('client_accounts')
      .upsert([{
        client_data_id: clientDataId,
        auth_user_id: user.id,
        admin_id: adminId,
        email: email.trim(),
        is_portal_enabled: true,
        created_by: createdBy || adminId,
      }], { onConflict: 'client_data_id' })
      .select()
      .single();

    if (insertError) {
      console.error('[API] DB Error (client_accounts):', insertError);
      return res.status(500).json({ error: 'فشل ربط الحساب ببيانات الموكل: ' + insertError.message });
    }

    // 3. Optional: Sync to user_metadata table (Legacy support)
    try {
      await supabaseAdmin
        .from('user_metadata')
        .insert([{
          user_id: user.id,
          email: email.trim(),
          role: 'client_portal',
          admin_user_id: adminId,
          new_lawyer_id: user.id,
        }]);
    } catch (metaErr) {
      console.warn('[API] Metadata Sync failed (non-critical):', metaErr.message);
    }

    return res.status(200).json({
      success: true,
      user_id: user.id,
      clientAccount,
      message: 'تم إنشاء حساب البوابة بنجاح'
    });

  } catch (error) {
    console.error('[API] Critical failure:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
