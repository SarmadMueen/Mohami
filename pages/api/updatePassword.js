// pages/api/updatePassword.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, newPassword, email } = req.body;

  if (!userId && !email) {
    return res.status(400).json({ error: 'معرف المستخدم أو البريد الإلكتروني مطلوب' });
  }

  if (!newPassword) {
    return res.status(400).json({ error: 'كلمة المرور الجديدة مطلوبة' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseServiceKey || supabaseServiceKey === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return res.status(500).json({
        error: 'Service role key not configured. Please set SUPABASE_SERVICE_ROLE_KEY in environment variables.'
      });
    }

    // Create admin client with service role key (Supabase v1)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let targetUserId = userId;

    // If userId is not provided, fallback to finding by email (legacy support)
    if (!targetUserId && email) {
      const { data: usersData, error: userError } = await supabaseAdmin.auth.api.listUsers();

      if (userError) {
        throw new Error(userError.message);
      }

      const targetUser = usersData.users?.find(user => user.email === email);

      if (!targetUser) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      targetUserId = targetUser.id;
    }

    // Update the user's password using Supabase v1 API
    const { data, error } = await supabaseAdmin.auth.api.updateUserById(
      targetUserId,
      { password: newPassword }
    );

    if (error) {
      throw new Error(error.message);
    }

    res.status(200).json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح',
      user: data?.user || data
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({
      error: error.message || 'حدث خطأ أثناء تغيير كلمة المرور'
    });
  }
}

