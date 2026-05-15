// pages/api/admin/approve-trial.js
// Server-side API to approve trial requests and create users
// Uses Supabase v1 admin API via REST calls
import nodemailer from 'nodemailer';

// Generate a random secure password
function generatePassword(length = 12) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { requestId, adminUserId } = req.body;

    if (!requestId || !adminUserId) {
        return res.status(400).json({ error: 'Missing required fields: requestId or adminUserId' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
        console.error('SUPABASE_SERVICE_ROLE_KEY is not set!');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    // Helper function for Supabase REST API calls
    const supabaseRest = async (table, method, options = {}) => {
        let url = `${supabaseUrl}/rest/v1/${table}`;
        const headers = {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            'Prefer': method === 'POST' ? 'return=representation' : 'return=representation',
        };

        if (options.query) {
            url += `?${options.query}`;
        }

        const fetchOptions = { method, headers };
        if (options.body) {
            fetchOptions.body = JSON.stringify(options.body);
        }

        const response = await fetch(url, fetchOptions);
        const data = await response.json();
        return { data, error: response.ok ? null : data };
    };

    try {
        console.log('Approve trial request:', { requestId, adminUserId });

        // 1. Verify the admin user exists and has super_admin role
        const adminResult = await supabaseRest('user_metadata', 'GET', {
            query: `user_id=eq.${adminUserId}&select=user_id,role`
        });

        if (adminResult.error || !adminResult.data || adminResult.data.length === 0) {
            return res.status(403).json({ error: 'Unauthorized: Admin not found' });
        }

        if (adminResult.data[0].role !== 'super_admin') {
            return res.status(403).json({ error: 'Unauthorized: Only admins can approve requests' });
        }

        // 2. Get the trial request
        const requestResult = await supabaseRest('trial_requests', 'GET', {
            query: `id=eq.${requestId}&select=*`
        });

        if (requestResult.error || !requestResult.data || requestResult.data.length === 0) {
            return res.status(404).json({ error: 'Trial request not found' });
        }

        const trialRequest = requestResult.data[0];

        if (trialRequest.status !== 'pending') {
            return res.status(400).json({ error: `Request already ${trialRequest.status}` });
        }

        // 3. Generate password and create auth user via Supabase Auth Admin API
        const tempPassword = generatePassword();

        const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
            method: 'POST',
            headers: {
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: trialRequest.email,
                password: tempPassword,
                email_confirm: true,
                user_metadata: {
                    username: trialRequest.full_name_en,
                    arabic_name: trialRequest.full_name_ar,
                    role: 'الفئة 1',
                }
            })
        });

        const createUserData = await createUserResponse.json();

        let newUserId = null;

        if (!createUserResponse.ok) {
            console.log('Create user error:', createUserData);

            // Handle specific Supabase Auth errors, try to rescue orphaned accounts first
            if (createUserData.error_code === 'email_exists' ||
                (createUserData.msg && createUserData.msg.includes('already been registered'))) {

                // Fetch the existing user ID to rescue them into full users
                const fetchUser = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
                    method: 'GET',
                    headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' }
                });

                if (fetchUser.ok) {
                    const allUsersData = await fetchUser.json();
                    const usersList = Array.isArray(allUsersData) ? allUsersData : (allUsersData.users || []);
                    const existingUser = usersList.find(u => u.email === trialRequest.email.trim() || u.email === trialRequest.email);

                    if (existingUser && existingUser.id) {
                        console.log("Rescuing Orphaned Auth Account:", existingUser.id);
                        newUserId = existingUser.id;
                    }
                }

                // If we STILL couldn't rescue the ID, throw the user-friendly error
                if (!newUserId) {
                    return res.status(400).json({
                        error: 'هذا البريد الإلكتروني مسجل بالفعل كمستخدم في النظام مسبقاً، وفشلت محاولة استعادته.',
                        details: 'User already exist'
                    });
                }
            } else {
                return res.status(500).json({
                    error: 'فشل في إنشاء حساب المستخدم',
                    details: createUserData.msg || createUserData.message || JSON.stringify(createUserData)
                });
            }
        } else {
            newUserId = createUserData.id;
        }

        console.log('Targeting user ID for Trial:', newUserId);

        // 4. Insert user_metadata record
        const metadataResult = await supabaseRest('user_metadata', 'POST', {
            body: {
                user_id: newUserId,
                username: trialRequest.full_name_en,
                arabic_name: trialRequest.full_name_ar,
                email: trialRequest.email,
                phone_number: trialRequest.phone,
                role: 'الفئة 1',
                admin_user_id: newUserId,
                office_name_ar: trialRequest.office_name || null,
                new_lawyer_id: null,
                entity_type: null,
                office_address_ar: null,
                office_name_en: null,
                office_address_en: null,
                office_email: null,
                office_logo_url: null,
                signature_url: null,
                job_title: 'مدير مكتب محاماة',
            }
        });

        if (metadataResult.error) {
            console.error('Metadata insert error:', metadataResult.error);
            // Try to clean up the created user
            await fetch(`${supabaseUrl}/auth/v1/admin/users/${newUserId}`, {
                method: 'DELETE',
                headers: {
                    'apikey': serviceRoleKey,
                    'Authorization': `Bearer ${serviceRoleKey}`,
                }
            });
            return res.status(500).json({
                error: 'Failed to create user metadata',
                details: JSON.stringify(metadataResult.error)
            });
        }
        console.log('Created user metadata:', metadataResult.data);

        // 5. Create initial subscription (14 days trial)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 14);

        const subscriptionResult = await supabaseRest('subscriptions', 'POST', {
            body: {
                user_id: newUserId,
                plan_id: 'trial_14d',
                status: 'active',
                current_period_end: expiryDate.toISOString(),
            }
        });

        if (subscriptionResult.error) {
            console.error('Subscription insert error:', subscriptionResult.error);
        }

        // 6. Update trial request status
        const updateResult = await supabaseRest('trial_requests', 'PATCH', {
            query: `id=eq.${requestId}`,
            body: {
                status: 'approved',
                reviewed_at: new Date().toISOString(),
                reviewed_by: adminUserId
            }
        });

        if (updateResult.error) {
            console.error('Failed to update trial_request status:', updateResult.error);
        }

        // 7. Send email with credentials using nodemailer directly
        try {
            const loginUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://mohamipro.com') + '/login';

            const emailHtml = `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563EB;">مرحباً بك في محامي برو!</h1>
          <p>تمت الموافقة على طلبك للحصول على تجربة مجانية.</p>
          <p>يمكنك الآن تسجيل الدخول باستخدام البيانات التالية:</p>
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>البريد الإلكتروني:</strong> ${trialRequest.email}</p>
            <p><strong>كلمة المرور المؤقتة:</strong> ${tempPassword}</p>
          </div>
          <p style="color: #dc2626;"><strong>مهم:</strong> يرجى تغيير كلمة المرور فور تسجيل الدخول.</p>
          <a href="${loginUrl}" 
             style="display: inline-block; background: #2563EB; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
            تسجيل الدخول
          </a>
          <p style="margin-top: 32px; color: #64748b; font-size: 14px;">مع أطيب التحيات،<br>فريق محامي برو</p>
        </div>
      `;

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD,
                },
            });

            const info = await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: trialRequest.email,
                subject: 'تمت الموافقة على طلبك - محامي برو',
                html: emailHtml,
            });

            console.log('Email sent successfully to:', trialRequest.email, 'MessageId:', info.messageId);
        } catch (emailError) {
            console.error('Failed to send email via nodemailer:', emailError);
            // Don't fail the whole user creation request if email fails
        }

        return res.status(200).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: newUserId,
                email: trialRequest.email,
                name: trialRequest.full_name_ar
            },
            tempPassword
        });

    } catch (error) {
        console.error('Approve trial error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
