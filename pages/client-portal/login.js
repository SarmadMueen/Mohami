import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/initSupabase';
import Logo from '../../components/Logo';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

const ClientPortalLogin = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setMounted(true);
    // If already logged in as client, redirect
    const checkExisting = async () => {
      const user = supabase.auth.user();
      if (user) {
        const { data } = await supabase
          .from('client_accounts')
          .select('id')
          .eq('auth_user_id', user.id)
          .eq('is_portal_enabled', true)
          .single();

        if (data) {
          router.replace('/client-portal/dashboard');
        }
      }
    };
    checkExisting();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { user, error: authError } = await supabase.auth.signIn({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login')) {
          setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        } else {
          setError(authError.message);
        }
        return;
      }

      if (!user) {
        setError('فشل تسجيل الدخول');
        return;
      }

      // Verify this user is a client portal user
      const { data: clientAccount, error: clientError } = await supabase
        .from('client_accounts')
        .select('id, is_portal_enabled')
        .eq('auth_user_id', user.id)
        .single();

      if (clientError || !clientAccount) {
        await supabase.auth.signOut();
        setError('هذا الحساب غير مسجل في بوابة الموكل. يرجى التواصل مع المحامي.');
        return;
      }

      if (!clientAccount.is_portal_enabled) {
        await supabase.auth.signOut();
        setError('تم تعطيل الوصول إلى بوابة الموكل. يرجى التواصل مع المحامي.');
        return;
      }

      // Update last login
      await supabase
        .from('client_accounts')
        .update({ last_login: new Date().toISOString() })
        .eq('id', clientAccount.id);

      router.replace('/client-portal/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { error } = await supabase.auth.api.resetPasswordForEmail(
        forgotPasswordEmail,
        {
          redirectTo: `${window.location.origin}/client-portal/reset-password`,
        }
      );

      if (error) {
        setError(error.message || 'حدث خطأ في إرسال رابط إعادة تعيين كلمة المرور.');
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
      setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
      console.error('Forgot password error:', error);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
      <Head>
        <title>تسجيل الدخول - بوابة الموكل | محامي برو</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Almarai:wght@300;400;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/logo.png" />
      </Head>

      <div className="login-page" dir="rtl">
        {/* Background decoration */}
        <div className="bg-pattern" />
        <div className="bg-gradient-orb bg-orb-1" />
        <div className="bg-gradient-orb bg-orb-2" />

        <div className="login-container">
          {/* Brand Section */}
          <div className="brand-section">
            <div className="brand-logo">
              <Logo height="60px" iconOnly={true} />
            </div>
            <h1 className="brand-title">بوابة الموكل</h1>
            <div className="brand-divider" />
            <p className="brand-desc">
              تابع قضاياك وجلساتك ومستنداتك المالية من مكان واحد
            </p>
          </div>

          {/* Login Form */}
          <form className="login-form" onSubmit={showForgotPassword ? handleForgotPassword : handleLogin}>
            {error && (
              <div className="error-message">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="success-message">
                <span>{successMessage}</span>
              </div>
            )}

            {!showForgotPassword ? (
              <>
                <div className="form-group">
                  <label>البريد الإلكتروني</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      autoComplete="email"
                      disabled={loading}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>كلمة المرور</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={loading}
                      dir="ltr"
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="forgot-password-link">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setError('');
                      setSuccessMessage('');
                    }}
                    className="forgot-password-btn"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>

                <div className="privacy-policy-link">
                  <Link href="/privacy_policy.html">
                    <a className="privacy-policy-btn">سياسة الخصوصية</a>
                  </Link>
                </div>

                <button
                  type="submit"
                  className="login-button"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="spinner" />
                  ) : (
                    <>
                      <LogIn size={20} />
                      <span>تسجيل الدخول</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="forgot-password-header">
                  <h3>إعادة تعيين كلمة المرور</h3>
                  <p>أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين</p>
                </div>

                <div className="form-group">
                  <label>البريد الإلكتروني</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input
                      type="email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      placeholder="example@email.com"
                      autoComplete="email"
                      disabled={forgotPasswordLoading}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="forgot-password-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordEmail('');
                      setError('');
                      setSuccessMessage('');
                    }}
                    className="btn-secondary"
                    disabled={forgotPasswordLoading}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={forgotPasswordLoading}
                  >
                    {forgotPasswordLoading ? (
                      <div className="spinner" />
                    ) : (
                      'إرسال رابط إعادة التعيين'
                    )}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="help-text">
            للحصول على بيانات الدخول، يرجى التواصل مع المحامي أو المكتب القانوني
          </p>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          position: relative;
          overflow: hidden;
          font-family: 'Cairo', 'Almarai', sans-serif;
          padding: 20px;
        }

        .bg-pattern {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(59,130,246,0.08) 1px, transparent 1px);
          background-size: 32px 32px;
        }

        .bg-gradient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.15;
        }

        .bg-orb-1 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #3B82F6, transparent);
          top: -100px;
          right: -100px;
        }

        .bg-orb-2 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, #1E3A8A, transparent);
          bottom: -80px;
          left: -60px;
        }

        .login-container {
          position: relative;
          width: 100%;
          max-width: 420px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 20px 40px rgba(0,0,0,0.05);
          border-radius: 24px;
          padding: 40px 36px;
          animation: fadeInUp 0.6s ease;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .brand-section {
          text-align: center;
          margin-bottom: 32px;
        }

        .brand-logo {
          margin-bottom: 16px;
        }

        .brand-title {
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          line-height: 1.2;
        }

        .brand-subtitle {
          font-size: 13px;
          color: #60a5fa;
          margin: 4px 0 0;
          letter-spacing: 1px;
          font-weight: 500;
        }

        .brand-divider {
          width: 48px;
          height: 3px;
          background: linear-gradient(90deg, #3B82F6, #1E3A8A);
          border-radius: 2px;
          margin: 16px auto;
        }

        .brand-desc {
          font-size: 14px;
          color: #64748b;
          margin: 0;
          line-height: 1.6;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px;
          color: #ef4444;
          font-size: 13px;
          margin-bottom: 20px;
          animation: shake 0.3s ease;
        }

        .success-message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.2);
          border-radius: 10px;
          color: #22c55e;
          font-size: 13px;
          margin-bottom: 20px;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 8px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-wrapper input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          color: #1e293b;
          font-size: 15px;
          font-family: inherit;
          transition: all 0.2s ease;
          outline: none;
        }

        .input-wrapper input::placeholder {
          color: #94a3b8;
        }

        .input-wrapper input:focus {
          border-color: #3B82F6;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
        }

        .input-wrapper input:disabled {
          opacity: 0.5;
        }

        :global(.input-icon) {
          position: absolute;
          right: 14px;
          color: #94a3b8;
          pointer-events: none;
        }

        .toggle-password {
          position: absolute;
          left: 12px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .toggle-password:hover {
          color: #475569;
        }

        .forgot-password-link {
          text-align: left;
          margin-bottom: 8px;
        }

        .forgot-password-btn {
          background: none;
          border: none;
          color: #3B82F6;
          font-size: 13px;
          cursor: pointer;
          padding: 0;
          font-family: inherit;
          text-decoration: none;
        }

        .forgot-password-btn:hover {
          text-decoration: underline;
        }

        .privacy-policy-link {
          text-align: center;
          margin-top: 12px;
        }

        .privacy-policy-btn {
          background: none;
          border: none;
          color: #64748b;
          font-size: 12px;
          cursor: pointer;
          padding: 0;
          font-family: inherit;
          text-decoration: none;
        }

        .privacy-policy-btn:hover {
          text-decoration: underline;
          color: #3B82F6;
        }

        .forgot-password-header {
          text-align: center;
          margin-bottom: 20px;
        }

        .forgot-password-header h3 {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px 0;
        }

        .forgot-password-header p {
          font-size: 13px;
          color: #64748b;
          margin: 0;
        }

        .forgot-password-actions {
          display: flex;
          gap: 12px;
          flex-direction: row-reverse;
          margin-top: 8px;
        }

        .btn-primary {
          flex: 1;
          padding: 12px;
          background: linear-gradient(135deg, #3B82F6, #1E3A8A);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s ease;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(59,130,246,0.3);
        }

        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-secondary {
          flex: 1;
          padding: 12px;
          background: #f3f4f6;
          color: #374151;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .login-button {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #3B82F6, #1E3A8A);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s ease;
          margin-top: 8px;
          position: relative;
          overflow: hidden;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(59,130,246,0.3);
        }

        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 22px;
          height: 22px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top: 2.5px solid white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .help-text {
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          margin-top: 24px;
          line-height: 1.6;
        }

        @media (max-width: 480px) {
          .login-container {
            padding: 32px 24px;
            border-radius: 20px;
          }

          .brand-title {
            font-size: 24px;
          }
        }
      `}</style>
    </>
  );
};

export default ClientPortalLogin;
