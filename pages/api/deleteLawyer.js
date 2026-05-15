import { createClient } from '@supabase/supabase-js';
import { checkSubscription } from '../../lib/checkSubscription';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lawyerUserId, adminUserId } = req.body;

  if (!lawyerUserId || !adminUserId) {
    return res.status(400).json({ error: 'الحقول المطلوبة مفقودة: lawyerUserId, adminUserId' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('[deleteLawyer] Missing Supabase environment variables');
    return res.status(500).json({ error: 'حدث خطأ في تكوين الخادم' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  try {
    // 0. Check subscription status
    const { isReadOnly } = await checkSubscription(adminUserId, supabaseUrl, serviceKey);
    if (isReadOnly) {
      return res.status(403).json({
        error: 'الاشتراك غير فعال. يرجى تجديد الاشتراك أولاً.',
        code: 'SUBSCRIPTION_INACTIVE'
      });
    }

    // 1. Verify the caller is admin (الفئة 1)
    const { data: adminMeta, error: adminError } = await supabaseAdmin
      .from('user_metadata')
      .select('role, admin_user_id')
      .eq('admin_user_id', adminUserId)
      .neq('role', 'client_portal')
      .limit(1);

    if (adminError || !adminMeta || adminMeta.length === 0) {
      console.error('[deleteLawyer] Admin verification failed:', adminError);
      return res.status(403).json({ error: 'ليس لديك صلاحية لحذف المحامين' });
    }

    const adminRole = adminMeta[0].role;
    if (adminRole !== 'الفئة 1') {
      return res.status(403).json({ error: 'فقط المسؤول (الفئة 1) يمكنه حذف المحامين' });
    }

    // 2. Get the lawyer record from lawyer_users
    const { data: lawyerRecord, error: lawyerError } = await supabaseAdmin
      .from('lawyer_users')
      .select('*')
      .eq('id', lawyerUserId)
      .single();

    if (lawyerError || !lawyerRecord) {
      console.error('[deleteLawyer] Lawyer not found:', lawyerError);
      return res.status(404).json({ error: 'لم يتم العثور على المحامي' });
    }

    const lawyerEmail = lawyerRecord.email;

    // 3. Find the lawyer's auth user ID from user_metadata
    let authUserId = null;
    if (lawyerEmail) {
      const { data: metaRecords } = await supabaseAdmin
        .from('user_metadata')
        .select('new_lawyer_id, user_id')
        .eq('email', lawyerEmail)
        .neq('role', 'client_portal');

      if (metaRecords && metaRecords.length > 0) {
        authUserId = metaRecords[0].new_lawyer_id || metaRecords[0].user_id;
      }
    }

    // Also try to find auth user directly by email
    if (!authUserId && lawyerEmail) {
      const { data: authUsers } = await supabaseAdmin.auth.api.listUsers();
      if (authUsers) {
        const found = authUsers.find(u => u.email === lawyerEmail);
        if (found) authUserId = found.id;
      }
    }

    console.log(`[deleteLawyer] Deleting lawyer: ${lawyerRecord.lawyer_name}, email: ${lawyerEmail}, authUserId: ${authUserId}`);

    // 4. Clean up related tables (in FK order)
    const errors = [];

    if (authUserId) {
      // 4a. Delete task_replies
      try {
        await supabaseAdmin
          .from('task_replies')
          .delete()
          .eq('reply_by_user_id', authUserId);
      } catch (e) { errors.push('task_replies: ' + e.message); }

      // 4b. Delete notifications
      try {
        await supabaseAdmin
          .from('notifications')
          .delete()
          .or(`user_id.eq.${authUserId},created_by_user_id.eq.${authUserId}`);
      } catch (e) { errors.push('notifications: ' + e.message); }

      // 4c. Delete tasks assigned to this lawyer
      try {
        await supabaseAdmin
          .from('tasks')
          .delete()
          .eq('assigned_to', authUserId);
      } catch (e) { errors.push('tasks: ' + e.message); }

      // 4d. Nullify sessions lawyer_id
      try {
        await supabaseAdmin
          .from('sessions')
          .update({ lawyer_id: null })
          .eq('lawyer_id', authUserId);
      } catch (e) { errors.push('sessions: ' + e.message); }

      // 4e. Nullify cases lawyer references (don't delete cases)
      try {
        await supabaseAdmin
          .from('cases')
          .update({ lawyer_id: null })
          .eq('lawyer_id', authUserId);
      } catch (e) { errors.push('cases lawyer_id: ' + e.message); }

      try {
        await supabaseAdmin
          .from('cases')
          .update({ caseLawyerId: null })
          .eq('caseLawyerId', authUserId);
      } catch (e) { errors.push('cases caseLawyerId: ' + e.message); }

      // 4f. Delete consultations
      try {
        await supabaseAdmin
          .from('consultations')
          .delete()
          .eq('lawyer_id', authUserId);
      } catch (e) { errors.push('consultations: ' + e.message); }

      // 4g. Delete document_reviews
      try {
        await supabaseAdmin
          .from('document_reviews')
          .delete()
          .eq('lawyer_id', authUserId);
      } catch (e) { errors.push('document_reviews: ' + e.message); }

      // 4h. Delete contract_reviews
      try {
        await supabaseAdmin
          .from('contract_reviews')
          .delete()
          .eq('lawyer_id', authUserId);
      } catch (e) { errors.push('contract_reviews: ' + e.message); }

      // 4i. Delete office_expenses
      try {
        await supabaseAdmin
          .from('office_expenses')
          .delete()
          .eq('lawyer_id', authUserId);
      } catch (e) { errors.push('office_expenses: ' + e.message); }

      // 4j. Delete user_metadata
      try {
        await supabaseAdmin
          .from('user_metadata')
          .delete()
          .eq('new_lawyer_id', authUserId);
      } catch (e) { errors.push('user_metadata: ' + e.message); }
    }

    // 5. Delete from lawyer_users
    const { error: deleteLawyerError } = await supabaseAdmin
      .from('lawyer_users')
      .delete()
      .eq('id', lawyerUserId);

    if (deleteLawyerError) {
      console.error('[deleteLawyer] Error deleting from lawyer_users:', deleteLawyerError);
      errors.push('lawyer_users: ' + deleteLawyerError.message);
    }

    // 6. Delete auth user
    if (authUserId) {
      try {
        const { error: authDeleteError } = await supabaseAdmin.auth.api.deleteUser(authUserId);
        if (authDeleteError) {
          console.error('[deleteLawyer] Error deleting auth user:', authDeleteError);
          errors.push('auth.users: ' + authDeleteError.message);
        }
      } catch (e) {
        errors.push('auth.users: ' + e.message);
      }
    }

    if (errors.length > 0) {
      console.warn('[deleteLawyer] Partial errors during deletion:', errors);
    }

    return res.status(200).json({
      success: true,
      message: 'تم حذف حساب المحامي بنجاح',
      warnings: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('[deleteLawyer] Critical failure:', error);
    return res.status(500).json({ error: error.message || 'حدث خطأ أثناء حذف المحامي' });
  }
}
