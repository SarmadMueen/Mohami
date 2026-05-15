import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/initSupabase';
import Logo from '../../components/Logo';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

const ClientPortalResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (accessToken && type === 'recovery') {
        sessionStorage.setItem('sb_cp_recovery_access_token', accessToken);
        sessionStorage.setItem('sb_cp_recovery_refresh_token', refreshToken || '');
        sessionStorage.setItem('sb_cp_recovery_type', type);
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
        accessToken = sessionStorage.getItem('sb_cp_recovery_access_token');
        refreshToken = sessionStorage.getItem('sb_cp_recovery_refresh_token');
        const type = sessionStorage.getItem('sb_cp_recovery_type');
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
        supabase.auth.setAuth(accessToken);
        
        if (refreshToken) {
          try {
            await supabase.auth.setSession(refreshToken);
          } catch (e) {
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
      const { error } = await supabase.auth.update({
        password: password,
      });

      if (error) {
        setErrorMessage(error.message || 'حدث خطأ في إعادة تعيين كلمة المرور.');
        console.error('Reset password error:', error.message);
      } else {
        setSuccessMessage('تم إعادة تعيين كلمة المرور بنجاح. سيتم توجيهك إلى صفحة تسجيل الدخول.');
        sessionStorage.removeItem('sb_cp_recovery_access_token');
        sessionStorage.removeItem('sb_cp_recovery_refresh_token');
        sessionStorage.removeItem('sb_cp_recovery_type');
        await supabase.auth.signOut();
        setTimeout(() => {
          router.push('/client-portal/login');
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
          <title>إعادة تعيين كلمة المرور - بوابة الموكل</title>
        </Head>
        <div className="reset-password-page">
          <div className="loading-spinner">جاري التحميل...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>إعادة تعيين كلمة المرور - بوابة الموكل | محامي برو</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Almarai:wght@300;400;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/logo.png" />
      </Head>
      <div className="reset-password-page" dir="rtl">
        {/* Background decoration */}
        <div className="bg-pattern" />
        <div className="bg-gradient-orb bg-orb-1" />
        <div className="bg-gradient-orb bg-orb-2" />

        <div className="reset-password-container">
          {/* Brand Section */}
          <div className="brand-section">
            <div className="brand-logo">
              <Logo height="60px" iconOnly={true} />
            </div>
            <h1 className="brand-title">إعادة تعيين كلمة المرور</h1>
            <div className="brand-divider" />
            <p className="brand-desc">
              أدخل كلمة المرور الجديدة لحسابك
            </p>
          </div>

          {/* Reset Password Form */}
          <form className="reset-password-form" onSubmit={handleResetPassword}>
            {checkingToken && (
              <div className="info-message">
                جاري التحقق من رابط إعادة التعيين...
              </div>
            )}
            {errorMessage && (
              <div className="error-message">
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="success-message">
                <CheckCircle size={18} />
                <span>{successMessage}</span>
              </div>
            )}
            
            {(isRecoveryReady || checkingToken) && !errorMessage && (
              <>
                <div className="form-group">
                  <label>كلمة المرور الجديدة</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading || checkingToken || !isRecoveryReady}
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

                <div className="form-group">
                  <label>تأكيد كلمة المرور</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading || checkingToken || !isRecoveryReady}
                      dir="ltr"
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="reset-button"
                  disabled={loading || checkingToken || !isRecoveryReady}
                >
                  {loading ? (
                    <div className="spinner" />
                  ) : (
                    'إعادة تعيين كلمة المرور'
                  )}
                </button>
              </>
            )}
          </form>

          {errorMessage && !isRecoveryReady && !checkingToken && (
            <div className="back-to-login">
              <button
                type="button"
                onClick={() => router.push('/client-portal/login')}
                className="back-link"
              >
                العودة إلى تسجيل الدخول
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .reset-password-page {
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

        .reset-password-container {
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

        .reset-password-form {
          margin-bottom: 20px;
        }

        .info-message {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 14px;
          background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.2);
          border-radius: 10px;
          color: #3B82F6;
          font-size: 13px;
          margin-bottom: 20px;
          text-align: center;
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

        .reset-button {
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
          transition: all 0.3s ease;
          margin-top: 8px;
        }

        .reset-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(59,130,246,0.3);
        }

        .reset-button:disabled {
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
          margin: 0 auto;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .back-to-login {
          text-align: center;
        }

        .back-link {
          background: none;
          border: none;
          color: #3B82F6;
          font-size: 14px;
          cursor: pointer;
          padding: 0;
          font-family: inherit;
          text-decoration: none;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        .loading-spinner {
          text-align: center;
          color: #64748b;
          font-size: 16px;
        }

        @media (max-width: 480px) {
          .reset-password-container {
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

export default ClientPortalResetPassword;
