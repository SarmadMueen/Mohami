import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import withClientAuth from '../../lib/withClientAuth';
import { ClientPortalProvider, useClientPortal } from '../../context/ClientPortalContext';
import ClientLayout from '../../components/client-portal/ClientLayout';
import { supabase } from '../../lib/initSupabase';
import { getApiUrl } from '../../lib/api';
import { User, Mail, Phone, MapPin, Lock, Save, CheckCircle, AlertCircle, LogOut } from 'lucide-react';

const ProfileContent = () => {
  const router = useRouter();
  const { clientInfo, authUserId } = useClientPortal();
  const [activeSection, setActiveSection] = useState('info');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { setMessage({ type: 'error', text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }); return; }
    if (newPassword !== confirmPassword) { setMessage({ type: 'error', text: 'كلمات المرور غير متطابقة' }); return; }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(getApiUrl('/api/client-portal/update-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'حدث خطأ' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/client-portal/login');
  };

  const infoFields = [
    { icon: User, label: 'الاسم', value: clientInfo?.client_name },
    { icon: Mail, label: 'البريد الإلكتروني', value: clientInfo?.email },
    { icon: Phone, label: 'الهاتف', value: clientInfo?.phone },
    { icon: MapPin, label: 'العنوان', value: clientInfo?.address },
  ];

  return (
    <>
      <Head><title>ملفي - بوابة الموكل | محامي برو</title></Head>
      <div className="cp-profile">
        <div className="page-header"><h1><User size={24} /> ملفي الشخصي</h1></div>

        {/* Profile Card */}
        <div className="profile-card">
          <div className="avatar-section">
            <div className="avatar-large">{clientInfo?.client_name?.charAt(0) || 'م'}</div>
            <div className="avatar-info">
              <h2>{clientInfo?.client_name || 'الموكل'}</h2>
              <p>{clientInfo?.email || ''}</p>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="section-tabs">
          <button className={activeSection === 'info' ? 'active' : ''} onClick={() => setActiveSection('info')}>
            <User size={16} /> المعلومات الشخصية
          </button>
          <button className={activeSection === 'password' ? 'active' : ''} onClick={() => setActiveSection('password')}>
            <Lock size={16} /> تغيير كلمة المرور
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`msg ${message.type}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Info Section */}
        {activeSection === 'info' && (
          <div className="info-card">
            {infoFields.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="info-row">
                  <div className="info-icon"><Icon size={18} /></div>
                  <div className="info-content">
                    <span className="info-label">{f.label}</span>
                    <span className="info-value">{f.value || '-'}</span>
                  </div>
                </div>
              );
            })}
            <p className="info-note">لتحديث معلوماتك الشخصية، يرجى التواصل مع المحامي</p>
          </div>
        )}

        {/* Password Section */}
        {activeSection === 'password' && (
          <div className="password-card">
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>كلمة المرور الجديدة</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="6 أحرف على الأقل" dir="ltr" />
              </div>
              <div className="form-group">
                <label>تأكيد كلمة المرور</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="أعد إدخال كلمة المرور" dir="ltr" />
              </div>
              <button type="submit" className="save-btn" disabled={saving}>
                {saving ? 'جاري الحفظ...' : <><Save size={18} /> حفظ كلمة المرور</>}
              </button>
            </form>
          </div>
        )}

        {/* Logout */}
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>تسجيل الخروج</span>
        </button>
      </div>

      <style jsx>{`
        .cp-profile { animation: fadeIn 0.3s ease; max-width: 600px; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .page-header h1 { display: flex; align-items: center; gap: 10px; font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 24px; }
        
        @media (max-width: 768px) {
          .page-header h1 {
            font-size: 20px;
            margin-bottom: 20px;
          }
        }

        .profile-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03); width: 100%; }
        .avatar-section { display: flex; align-items: center; gap: 16px; }
        .avatar-large { width: 64px; height: 64px; border-radius: 16px; background: linear-gradient(135deg, #3B82F6, #1E3A8A); color: white; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; flex-shrink: 0; }
        .avatar-info h2 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
        .avatar-info p { font-size: 14px; color: #64748b; margin: 0; }
        
        @media (max-width: 768px) {
          .profile-card {
            padding: 20px 16px;
            border-radius: 8px;
            margin-bottom: 16px;
            margin: 0 -4px 16px -4px;
            width: 100vw;
          }
          .avatar-section {
            flex-direction: column;
            text-align: center;
            gap: 12px;
          }
          .avatar-large {
            width: 56px;
            height: 56px;
            font-size: 24px;
          }
          .avatar-info h2 {
            font-size: 18px;
          }
          .avatar-info p {
            font-size: 13px;
          }
        }

        .section-tabs { display: flex; gap: 4px; background: white; padding: 4px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
        .section-tabs button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px 16px; border: none; background: none; border-radius: 8px; font-size: 14px; font-weight: 500; color: #64748b; cursor: pointer; font-family: inherit; transition: all 0.2s; min-height: 44px; }
        .section-tabs button:hover { background: #f1f5f9; }
        .section-tabs button.active { background: #3B82F6; color: white; }
        
        @media (max-width: 768px) {
          .section-tabs {
            gap: 2px;
            margin-bottom: 16px;
          }
          .section-tabs button {
            padding: 10px 12px;
            font-size: 13px;
            gap: 4px;
          }
        }

        .msg { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-radius: 10px; margin-bottom: 16px; font-size: 14px; }
        .msg.success { background: #ECFDF5; color: #059669; border: 1px solid #D1FAE5; }
        .msg.error { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
        
        @media (max-width: 768px) {
          .msg {
            padding: 12px 14px;
            font-size: 13px;
            margin-bottom: 12px;
          }
        }

        .info-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 8px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03); width: 100%; }
        .info-row { display: flex; align-items: center; gap: 14px; padding: 16px; border-bottom: 1px solid #f8fafc; }
        .info-row:last-of-type { border-bottom: none; }
        .info-icon { width: 38px; height: 38px; border-radius: 10px; background: #EFF6FF; color: #3B82F6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .info-label { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 2px; }
        .info-value { display: block; font-size: 15px; font-weight: 600; color: #1e293b; }
        .info-note { text-align: center; font-size: 12px; color: #94a3b8; padding: 12px; margin: 0; }
        
        @media (max-width: 768px) {
          .info-card {
            padding: 4px;
            border-radius: 8px;
            margin: 0 -4px;
            width: 100vw;
          }
          .info-row {
            padding: 14px;
            gap: 12px;
          }
          .info-icon {
            width: 36px;
            height: 36px;
          }
          .info-label {
            font-size: 11px;
          }
          .info-value {
            font-size: 14px;
          }
          .info-note {
            font-size: 11px;
            padding: 10px;
          }
        }

        .password-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03); width: 100%; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 8px; }
        .form-group input { width: 100%; padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 16px; font-family: inherit; outline: none; transition: border-color 0.2s; min-height: 48px; }
        .form-group input:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .form-group input::placeholder { color: #94a3b8; }
        .save-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; background: linear-gradient(135deg, #3B82F6, #1E3A8A); color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; min-height: 48px; }
        .save-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(59,130,246,0.3); }
        .save-btn:disabled { opacity: 0.6; }
        
        @media (max-width: 768px) {
          .password-card {
            padding: 20px 16px;
            border-radius: 8px;
            margin: 0 -4px;
            width: 100vw;
          }
          .form-group {
            margin-bottom: 16px;
          }
          .form-group label {
            font-size: 13px;
            margin-bottom: 6px;
          }
          .form-group input {
            padding: 12px 14px;
            font-size: 16px; /* Prevent iOS zoom */
          }
          .save-btn {
            padding: 12px;
            font-size: 14px;
          }
        }

        .logout-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; background: white; color: #EF4444; border: 1px solid #FECACA; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; margin-top: 20px; min-height: 48px; }
        .logout-btn:hover { background: #FEF2F2; border-color: #EF4444; }
        
        @media (max-width: 768px) {
          .logout-btn {
            padding: 12px;
            font-size: 14px;
            margin-top: 16px;
          }
        }

        @media (max-width: 768px) { 
          .page-header h1 { font-size: 20px; }
          .avatar-section { flex-direction: column; text-align: center; }
          .section-tabs button { font-size: 13px; }
        } `}</style>
    </>
  );
};

const ClientProfilePage = ({ clientAccount }) => (
  <ClientPortalProvider clientAccount={clientAccount}><ClientLayout><ProfileContent /></ClientLayout></ClientPortalProvider>
);
export default withClientAuth(ClientProfilePage);
