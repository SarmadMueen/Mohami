import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '../lib/initSupabase';
import Logo from '../components/Logo';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);

    // Step 1: Check if the URL hash contains recovery tokens.
    // Because next.config.js has trailingSlash: true, Next.js redirects
    // /reset-password#hash to /reset-password/ which STRIPS the hash fragment.
    // So we save the tokens to sessionStorage before the redirect happens,
    // and retrieve them after the redirect.
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (accessToken && type === 'recovery') {
        // Save tokens to sessionStorage so they survive the trailing slash redirect
        sessionStorage.setItem('sb_recovery_access_token', accessToken);
        sessionStorage.setItem('sb_recovery_refresh_token', refreshToken || '');
        sessionStorage.setItem('sb_recovery_type', type);
      }
    }

    // Step 2: Try to recover the session from hash or sessionStorage
    const tryRecoverSession = async () => {
      let accessToken = null;
      let refreshToken = null;

      // First, try from current URL hash
      if (hash && hash.length > 1) {
        const hashParams = new URLSearchParams(hash.substring(1));
        accessToken = hashParams.get('access_token');
        refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        if (type !== 'recovery') {
          accessToken = null;
        }
      }

      // If not found in hash, try from sessionStorage (post trailing-slash redirect)
      if (!accessToken) {
        accessToken = sessionStorage.getItem('sb_recovery_access_token');
        refreshToken = sessionStorage.getItem('sb_recovery_refresh_token');
        const type = sessionStorage.getItem('sb_recovery_type');
        if (type !== 'recovery') {
          accessToken = null;
        }
      }

      if (!accessToken) {
        setErrorMessage('رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية.');
        setCheckingToken(false);
        return;
      }

      try {
        // For Supabase v1: use setAuth to set the access token in the session
        // This allows supabase.auth.update() to work with the recovery token
        supabase.auth.setAuth(accessToken);
        
        // If we have a refresh token, also try to set a full session
        if (refreshToken) {
          try {
            await supabase.auth.setSession(refreshToken);
          } catch (e) {
            // Ignore - setAuth with access_token is sufficient for password update
            console.log('setSession with refresh_token failed, using setAuth instead');
          }
        }
        
        setIsRecoveryReady(true);
      } catch (err) {
        console.error('Error during recovery session setup:', err);
        setErrorMessage('رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية.');
      }
      setCheckingToken(false);
    };

    // Also listen for PASSWORD_RECOVERY event from Supabase's auto-detection
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryReady(true);
        setCheckingToken(false);
        setErrorMessage('');
      }
    });

    // Small delay to let Supabase auto-detect hash tokens first
    const timer = setTimeout(() => {
      if (!isRecoveryReady) {
        tryRecoverSession();
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      if (authListener && authListener.unsubscribe) {
        authListener.unsubscribe();
      }
    };
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('كلمات المرور غير متطابقة.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
      setLoading(false);
      return;
    }

    try {
      // For Supabase v1, use update method
      const { error } = await supabase.auth.update({
        password: password,
      });

      if (error) {
        setErrorMessage(error.message || 'حدث خطأ في إعادة تعيين كلمة المرور.');
        console.error('Reset password error:', error.message);
      } else {
        setSuccessMessage('تم إعادة تعيين كلمة المرور بنجاح. سيتم توجيهك إلى صفحة تسجيل الدخول.');
        // Clean up sessionStorage
        sessionStorage.removeItem('sb_recovery_access_token');
        sessionStorage.removeItem('sb_recovery_refresh_token');
        sessionStorage.removeItem('sb_recovery_type');
        // Sign out then redirect to login
        await supabase.auth.signOut();
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (error) {
      setErrorMessage('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
      console.error('Reset password error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <>
        <Head>
          <title>إعادة تعيين كلمة المرور - Smart Law</title>
        </Head>
        <div className="reset-password-container">
          <div className="loading-spinner">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>إعادة تعيين كلمة المرور - Smart Law</title>
        <meta name="description" content="إعادة تعيين كلمة المرور لنظام Smart Law" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fustat:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="reset-password-page" dir="rtl">
        <div className="reset-password-container">
          <div className="reset-password-header">
            <Link href="/">
              <a style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', width: '100%', marginBottom: '24px' }}>
                <Logo height="47px" />
              </a>
            </Link>
            <h1>إعادة تعيين كلمة المرور</h1>
            <p>أدخل كلمة المرور الجديدة</p>
          </div>
          <div className="reset-password-form">
            {checkingToken && (
              <div className="info-message">
                جاري التحقق من رابط إعادة التعيين...
              </div>
            )}
            {errorMessage && (
              <div className="error-message">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="success-message">
                {successMessage}
              </div>
            )}
            
            {(isRecoveryReady || checkingToken) && !errorMessage && (
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label htmlFor="password">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">تأكيد كلمة المرور</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور"
                  required
                  minLength={6}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading || checkingToken || !isRecoveryReady}>
                {loading ? 'جاري الحفظ...' : 'إعادة تعيين كلمة المرور'}
              </button>
            </form>
            )}
          </div>
          <div className="login-link">
            <p>
              تذكرت كلمة المرور؟{' '}
              <Link href="/login">سجل الدخول</Link>
            </p>
          </div>
        </div>

        <style jsx>{`
          .reset-password-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #e5f4ff 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .reset-password-container {
            width: 100%;
            max-width: 450px;
            text-align: center;
          }

          .reset-password-header {
            margin-bottom: 32px;
          }

          .reset-password-header h1 {
            font-size: 32px;
            font-weight: 700;
            color: #0F172A;
            margin-bottom: 8px;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .reset-password-header p {
            font-size: 16px;
            color: #64748b;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .reset-password-form {
            background: #fff;
            padding: 32px;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            margin-bottom: 24px;
          }

          .info-message {
            background-color: #eff6ff;
            color: #2563eb;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 24px;
            text-align: center;
            font-size: 14px;
            border: 1px solid #bfdbfe;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .error-message {
            background-color: #fef2f2;
            color: #dc2626;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 24px;
            text-align: right;
            font-size: 14px;
            border: 1px solid #fecaca;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .success-message {
            background-color: #f0fdf4;
            color: #16a34a;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 24px;
            text-align: right;
            font-size: 14px;
            border: 1px solid #bbf7d0;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .form-group {
            margin-bottom: 24px;
            text-align: right;
          }

          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #1f2937;
            font-size: 14px;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .form-group input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .form-group input:focus {
            outline: none;
            border-color: #2563EB;
          }

          .btn-primary {
            background: linear-gradient(135deg, #0F172A 0%, #2563EB 100%);
            color: #fff;
            padding: 14px 32px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: transform 0.2s, box-shadow 0.2s;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .btn-primary:disabled {
            background: #94a3b8;
            cursor: not-allowed;
            transform: none;
          }

          .btn-primary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4);
          }

          .login-link {
            text-align: center;
          }

          .login-link p {
            color: #64748b;
            font-size: 14px;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .login-link a {
            color: #2563EB;
            text-decoration: none;
            font-weight: 600;
          }

          .login-link a:hover {
            text-decoration: underline;
          }
          
          .loading-spinner {
            margin: 40px 0;
            font-size: 18px;
            color: #2563EB;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }
        `}</style>
      </div>
    </>
  );
};

export default ResetPassword;







