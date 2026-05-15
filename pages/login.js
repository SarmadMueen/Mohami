import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '../lib/initSupabase';
import Logo from '../components/Logo';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isNativeApp, setIsNativeApp] = useState(false);
  const router = useRouter();

  // Check user role and redirect
  const checkUserAndRedirect = async (userId) => {
    try {
      // Support redirect query parameter (e.g. from billing portal)
      const redirectUrl = router.query.redirect;
      if (redirectUrl && redirectUrl.startsWith('/')) {
        router.push(redirectUrl);
        return;
      }

      const { data: clientData } = await supabase
        .from('client_accounts')
        .select('id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (clientData) {
        router.push('/client-portal/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      router.push('/dashboard');
    }
  };

  // Detect if running in native app (Capacitor)
  useEffect(() => {
    const capacitor = typeof window !== 'undefined' ? window.Capacitor : null;
    const platform = capacitor?.getPlatform?.();
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isAndroidWebView = /Android/i.test(ua) && (/wv/i.test(ua) || /Version\/[\d.]+/i.test(ua));
    const isNativeCapacitor = platform === 'android' || platform === 'ios';
    setIsNativeApp(isNativeCapacitor || isAndroidWebView);
  }, []);

  // Check if already logged in - compatible with Supabase v1.x
  useEffect(() => {
    console.log('[Login] Checking auth status');
    // For Supabase v1, use session() method
    const session = supabase.auth.session();

    if (session && session.user) {
      console.log('[Login] User already logged in, redirecting');
      // Check for redirect parameter first
      const redirectUrl = router.query.redirect;
      if (redirectUrl && redirectUrl.startsWith('/')) {
        router.push(redirectUrl);
      } else {
        checkUserAndRedirect(session.user.id);
      }
    } else {
      console.log('[Login] No active session, showing login form');
    }

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session && session.user) {
          checkUserAndRedirect(session.user.id);
        }
      }
    );

    setMounted(true);

    // Clean up subscription
    return () => {
      if (authListener && authListener.unsubscribe) {
        authListener.unsubscribe();
      }
    };
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // For Supabase v1, use signIn method
      const { error, user } = await supabase.auth.signIn({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message || 'Failed to login. Please check your credentials.');
        console.error('Login error:', error.message);
        setLoading(false);
      } else {
        console.log('Login successful', user);
        if (user) {
          checkUserAndRedirect(user.id);
        }
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred. Please try again.');
      console.error('Login error:', error);
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // For Supabase v1, use resetPasswordForEmail method
      const { error } = await supabase.auth.api.resetPasswordForEmail(
        forgotPasswordEmail,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        setErrorMessage(error.message || 'حدث خطأ في إرسال رابط إعادة تعيين كلمة المرور.');
        console.error('Forgot password error:', error.message);
      } else {
        setSuccessMessage('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد.');
        setForgotPasswordEmail('');
        setTimeout(() => {
          setShowForgotPassword(false);
          setSuccessMessage('');
        }, 5000);
      }
    } catch (error) {
      setErrorMessage('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
      console.error('Forgot password error:', error);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  if (!mounted) {
    return (
      <>
        <Head>
          <title>تسجيل الدخول | محامي برو</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="login-container">
          <div className="loading-spinner">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>تسجيل الدخول | محامي برو - منصة إدارة المحاماة</title>
        <meta name="description" content="قم بتسجيل الدخول إلى حسابك في محامي برو للوصول إلى قضاياك، موكليك، وتقاريرك المالية." />
        <link rel="canonical" href="https://mohamipro.com/login" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fustat:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/logo.png" />
      </Head>
      <div className="login-page" dir="rtl">
        <div className="login-container" style={{ height: '100vh' }}>
          <div className="login-form">
            <div className="login-header">
              <Link href="/">
                <a style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', width: '100%', marginBottom: '12px' }}>
                  <Logo height="32px" />
                </a>
              </Link>
              <h1>تسجيل دخول</h1>
              <p>يرجى تسجيل الدخول إلى حسابك في برنامج محامي برو في حال كنت تملك حساباً مُسبقاً.</p>
            </div>
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

            {!showForgotPassword ? (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label htmlFor="email">البريد الإلكتروني</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="أدخل بريدك الإلكتروني"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">كلمة المرور</label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    required
                  />
                </div>
                <div className="forgot-password-link">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="forgot-password-btn"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'جاري تسجيل الدخول' : 'تسجيل الدخول'}
                </button>
                <div className="privacy-policy-link">
                  <Link href="/privacy_policy.html">
                    <a className="privacy-policy-btn">سياسة الخصوصية</a>
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <div className="form-group">
                  <label htmlFor="forgot-email">البريد الإلكتروني</label>
                  <input
                    type="email"
                    id="forgot-email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    placeholder="أدخل بريدك الإلكتروني"
                    required
                  />
                </div>
                <div className="forgot-password-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordEmail('');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="btn-secondary"
                  >
                    إلغاء
                  </button>
                  <button type="submit" className="btn-primary" disabled={forgotPasswordLoading}>
                    {forgotPasswordLoading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
                  </button>
                </div>
              </form>
            )}
          </div>
          {!isNativeApp && (
          <div className="register-link">
            <p>
              ليس لديك حساب؟{' '}
              <Link href="/register">سجل هنا</Link>
            </p>
          </div>
          )}
          <div className="copyright-footer">
            <p>محامي برو .جميع الحقوق محفوظة. 2026</p>
          </div>
        </div>

        <style jsx>{`
          .login-page {
            height: 100vh;
            background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #e5f4ff 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: calc(20px + env(safe-area-inset-top, 0px)) 20px 20px 20px;
            overflow: hidden;
          }

          .login-page::-webkit-scrollbar {
            display: none;
          }

          .login-page {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .login-container {
            width: 100%;
            max-width: 380px;
            text-align: center;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .login-header {
            margin-bottom: 20px;
            text-align: center;
          }


          .login-header h1 {
            font-size: 26px;
            font-weight: 700;
            color: #0F172A;
            margin-bottom: 6px;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .login-header p {
            font-size: 13px;
            color: #64748b;
            font-family: 'Cairo', 'Almarai', sans-serif;
            line-height: 1.4;
          }

          .login-form {
            background: white;
            padding: 24px 22px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            margin-bottom: 10px;
          }

          .error-message {
            background-color: #fef2f2;
            color: #dc2626;
            padding: 6px 10px;
            border-radius: 4px;
            margin-bottom: 10px;
            text-align: right;
            font-size: 12px;
            border: 1px solid #fecaca;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .success-message {
            background-color: #f0fdf4;
            color: #16a34a;
            padding: 6px 10px;
            border-radius: 4px;
            margin-bottom: 10px;
            text-align: right;
            font-size: 12px;
            border: 1px solid #bbf7d0;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .form-group {
            margin-bottom: 10px;
            text-align: right;
          }

          .form-group label {
            display: block;
            margin-bottom: 2px;
            font-weight: 600;
            color: #1f2937;
            font-size: 11px;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .form-group label[for="email"],
          .form-group label[for="password"] {
            font-size: 13px;
            color: #2563EB;
          }

          .form-group input {
            width: 100%;
            padding: 7px 10px;
            border: 2px solid #e5e7eb;
            border-radius: 4px;
            font-size: 13px;
            transition: border-color 0.3s;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .form-group input:focus {
            outline: none;
            border-color: #2563EB;
          }

          .btn-primary {
            background: #2563EB;
            color: #fff;
            padding: 9px 14px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: none;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .btn-primary:disabled {
            background: #94a3b8;
            cursor: not-allowed;
          }

          .btn-primary:hover:not(:disabled) {
            background: #1d4ed8;
          }

          .register-link {
            text-align: center;
          }

          .register-link p {
            color: #64748b;
            font-size: 12px;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .register-link a {
            color: #2563EB;
            text-decoration: none;
            font-weight: 600;
          }

          .register-link a:hover {
            text-decoration: underline;
          }

          .forgot-password-link {
            text-align: left;
            margin-bottom: 8px;
          }

          .forgot-password-btn {
            background: none;
            border: none;
            color: #2563EB;
            font-size: 12px;
            cursor: pointer;
            padding: 0;
            font-family: 'Cairo', 'Almarai', sans-serif;
            text-decoration: none;
          }

          .forgot-password-btn:hover {
            text-decoration: underline;
          }

          .privacy-policy-link {
            text-align: center;
            margin-bottom: 0;
            margin-top: 8px;
          }

          .privacy-policy-btn {
            background: none;
            border: none;
            color: #64748b;
            font-size: 11px;
            cursor: pointer;
            padding: 0;
            font-family: 'Cairo', 'Almarai', sans-serif;
            text-decoration: none;
          }

          .privacy-policy-btn:hover {
            text-decoration: underline;
            color: #2563EB;
          }

          .copyright-footer {
            text-align: center;
            margin-top: 8px;
          }

          .copyright-footer p {
            color: #94a3b8;
            font-size: 10px;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .forgot-password-actions {
            display: flex;
            gap: 12px;
            flex-direction: row-reverse;
          }

          .btn-secondary {
            background: #f3f4f6;
            color: #374151;
            padding: 12px 20px;
            border: none;
            border-radius: 0;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            flex: 1;
            transition: background-color 0.2s;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .btn-secondary:hover {
            background: #e5e7eb;
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

export default Login;



