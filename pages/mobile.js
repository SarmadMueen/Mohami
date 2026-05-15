import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/initSupabase';
import Logo from '../components/Logo';

const Mobile = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  // Check user role and redirect
  const checkUserAndRedirect = async (userId) => {
    try {
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

  // Set up auth state change listener
  useEffect(() => {
    setMounted(true);

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session && session.user) {
          checkUserAndRedirect(session.user.id);
        }
      }
    );

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
        <link rel="icon" href="/logo.png" />
      </Head>
      <div className="login-page" dir="rtl">
        <div className="login-container">
          <div className="login-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', width: '100%', marginBottom: '24px' }}>
              <Logo height="47px" />
            </div>
            <h1>مرحباً بك</h1>
            <p>سجل الدخول إلى حسابك</p>
          </div>
          <div className="login-form">
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

          {/* Disclaimer for App Store compliance */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: '#F8FAFC',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            fontSize: '12px',
            color: '#64748B',
            lineHeight: '1.6',
            fontFamily: "'Cairo', 'Almarai', sans-serif",
            textAlign: 'center'
          }}>
            <div style={{ fontWeight: '700', marginBottom: '8px', color: '#475569' }}>إخلاء مسؤولية:</div>
            <div style={{ marginBottom: '4px' }}>لا يدعم التطبيق التسجيل المباشر.</div>
            <div style={{ marginBottom: '4px' }}>التطبيق متاح فقط لعملاء محامي برو الحاليين.</div>
            <div>للحصول على حساب جديد، يرجى التواصل مع فريق الإدارة.</div>
          </div>
        </div>

        <style jsx>{`
          .login-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #e5f4ff 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: calc(20px + env(safe-area-inset-top, 0px)) 20px 20px 20px;
          }

          .login-container {
            width: 100%;
            max-width: 450px;
            text-align: center;
          }

          .login-header {
            margin-bottom: 20px;
          }

          .login-header h1 {
            font-size: 32px;
            font-weight: 700;
            color: #0F172A;
            margin-bottom: 8px;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .login-header p {
            font-size: 16px;
            color: #64748b;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .login-form {
            background: transparent;
            padding: 0;
            border-radius: 0;
            box-shadow: none;
            margin-bottom: 16px;
          }

          .error-message {
            background-color: #fef2f2;
            color: #dc2626;
            padding: 10px 14px;
            border-radius: 0;
            margin-bottom: 16px;
            text-align: right;
            font-size: 14px;
            border: 1px solid #fecaca;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .success-message {
            background-color: #f0fdf4;
            color: #16a34a;
            padding: 10px 14px;
            border-radius: 0;
            margin-bottom: 16px;
            text-align: right;
            font-size: 14px;
            border: 1px solid #bbf7d0;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .form-group {
            margin-bottom: 16px;
            text-align: right;
          }

          .form-group label {
            display: block;
            margin-bottom: 4px;
            font-weight: 600;
            color: #1f2937;
            font-size: 13px;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .form-group input {
            width: 100%;
            padding: 10px 14px;
            border: 2px solid #e5e7eb;
            border-radius: 0;
            font-size: 15px;
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
            padding: 12px 20px;
            border: none;
            border-radius: 0;
            font-size: 16px;
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

          .forgot-password-link {
            text-align: left;
            margin-bottom: 16px;
          }

          .forgot-password-btn {
            background: none;
            border: none;
            color: #2563EB;
            font-size: 14px;
            cursor: pointer;
            padding: 0;
            font-family: 'Cairo', 'Almarai', sans-serif;
            text-decoration: none;
          }

          .forgot-password-btn:hover {
            text-decoration: underline;
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

export default Mobile;
