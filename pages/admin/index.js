import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../lib/initSupabase';
import {
  ShieldCheck,
  Users,
  LogOut,
  Eye,
  Settings,
  BarChart3,
  RefreshCw,
  FileText,
  Activity,
  Calendar,
  ChevronRight,
  Camera,
  Download,
  Smartphone,
  Monitor,
  Tablet,
  HelpCircle
} from 'lucide-react';
import { getApiUrl } from '../../lib/api';

const AdminDashboard = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    activeAccounts: 0,
    totalRegistered: 0
  });
  const [activeUsersList, setActiveUsersList] = useState([]);

  // Screenshot generator state
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [screenshotError, setScreenshotError] = useState('');
  const [screenshotForm, setScreenshotForm] = useState({
    url: '',
    actions: '',
    viewport: 'desktop',
    fullPage: true
  });

  // Simple admin credentials check
  const [showLogin, setShowLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    setLoading(true);

    // Check if user is logged in
    const session = supabase.auth.session();
    if (!session) {
      setShowLogin(true);
      setLoading(false);
      return;
    }

    // Check if user is super_admin
    const { data: metadata, error } = await supabase
      .from('user_metadata')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error || !metadata || metadata.role !== 'super_admin') {
      setShowLogin(true);
      setLoading(false);
      return;
    }

    setAdminUser(metadata);
    setIsAuthorized(true);
    await fetchStats();
    setLoading(false);
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      await supabase.auth.signOut();
      const { data, error } = await supabase.auth.signIn({
        email: adminEmail,
        password: adminPassword
      });

      if (error) {
        setLoginError('بيانات الدخول غير صحيحة');
        setLoginLoading(false);
        return;
      }

      const { data: metadata, error: metaError } = await supabase
        .from('user_metadata')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (metaError || !metadata || metadata.role !== 'super_admin') {
        await supabase.auth.signOut();
        setLoginError('هذا الحساب ليس لديه صلاحيات المدير');
        setLoginLoading(false);
        return;
      }

      setAdminUser(metadata);
      setIsAuthorized(true);
      setShowLogin(false);
      await fetchStats();

    } catch (err) {
      setLoginError('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const session = supabase.auth.session();
      if (!session) return;

      // 1. Fetch Trial Requests
      const { data: requests } = await supabase
        .from('trial_requests')
        .select('status');

      // 2. Fetch User Metadata and Subscriptions via secure API
      const response = await fetch(getApiUrl(`/api/admin/list-users?adminUserId=${session.user.id}`));
      const usersData = await response.json();

      if (Array.isArray(usersData)) {
        const now = new Date();

        const activeUnits = usersData.filter(user => {
          const activeSub = (user.subscriptions || []).find(s => s.status === 'active');
          if (!activeSub) return false;
          return new Date(activeSub.current_period_end) > now;
        });

        setActiveUsersList(activeUnits);

        setStats({
          pending: requests?.filter(r => r.status === 'pending').length || 0,
          approved: requests?.filter(r => r.status === 'approved').length || 0,
          rejected: requests?.filter(r => r.status === 'rejected').length || 0,
          activeAccounts: activeUnits.length,
          totalRegistered: usersData.length
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthorized(false);
    setShowLogin(true);
    setAdminUser(null);
  };

  const handleGenerateScreenshot = async () => {
    setScreenshotLoading(true);
    setScreenshotError('');
    setScreenshotUrl('');

    try {
      // Get session token
      const session = supabase.auth.session();
      if (!session) {
        setScreenshotError('يجب تسجيل الدخول لاستخدام هذه الميزة');
        setScreenshotLoading(false);
        return;
      }

      // Parse viewport
      let viewport = { width: 1920, height: 1080 };
      switch (screenshotForm.viewport) {
        case 'mobile':
          viewport = { width: 375, height: 667 };
          break;
        case 'tablet':
          viewport = { width: 768, height: 1024 };
          break;
        case 'desktop':
        default:
          viewport = { width: 1920, height: 1080 };
          break;
      }

      // Parse actions JSON
      let actions = [];
      if (screenshotForm.actions.trim()) {
        try {
          actions = JSON.parse(screenshotForm.actions);
        } catch (e) {
          setScreenshotError('خطأ في تنسيق JSON للإجراءات');
          setScreenshotLoading(false);
          return;
        }
      }

      // Prepare session data for Playwright to inject into browser localStorage
      const sessionData = {
        currentSession: session,
        expiresAt: session.expires_at || (Math.floor(Date.now() / 1000) + 3600)
      };

      const response = await fetch('/api/admin/screenshot-generator/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          url: screenshotForm.url,
          actions,
          viewport,
          fullPage: screenshotForm.fullPage,
          sessionData
        })
      });

      const data = await response.json();

      if (data.success) {
        setScreenshotUrl(data.screenshotUrl);
      } else {
        setScreenshotError(data.error || 'فشل في إنشاء لقطة الشاشة');
      }
    } catch (err) {
      setScreenshotError('حدث خطأ أثناء الاتصال بالخادم');
      console.error(err);
    } finally {
      setScreenshotLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <RefreshCw className="spin" size={32} />
        <p>جاري التحميل...</p>
        <style jsx>{`
          .loading-screen {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #94a3b8;
            font-family: 'Cairo', sans-serif;
          }
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (showLogin) {
    return (
      <div className="login-container" dir="rtl">
        <Head>
          <title>تسجيل دخول المدير - محامي برو</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        </Head>
        <div className="login-card">
          <div className="login-header">
            <ShieldCheck size={48} />
            <h1>لوحة تحكم المدير</h1>
            <p>محامي برو - إدارة النظام</p>
          </div>
          <form onSubmit={handleAdminLogin}>
            {loginError && <div className="error-message">{loginError}</div>}
            <div className="form-group">
              <label>البريد الإلكتروني</label>
              <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required dir="ltr" />
            </div>
            <div className="form-group">
              <label>كلمة المرور</label>
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />
            </div>
            <button type="submit" className="login-btn" disabled={loginLoading}>
              {loginLoading ? 'جاري الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>
          <Link href="/"><a className="back-link">العودة للموقع الرئيسي</a></Link>
        </div>
        <style jsx>{`
          .login-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f172a; font-family: 'Cairo', sans-serif; }
          .login-card { background: white; border-radius: 16px; padding: 40px; width: 100%; max-width: 400px; }
          .login-header { text-align: center; margin-bottom: 30px; color: #dc2626; }
          .login-header h1 { font-size: 24px; color: #0f172a; margin-top: 10px; }
          .error-message { background: #fee2e2; color: #dc2626; padding: 10px; border-radius: 8px; margin-bottom: 15px; text-align: center; }
          .form-group { margin-bottom: 20px; }
          .form-group label { display: block; margin-bottom: 8px; font-weight: 600; }
          .form-group input { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; }
          .login-btn { width: 100%; padding: 12px; background: #dc2626; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; }
          .back-link { display: block; text-align: center; margin-top: 20px; color: #64748b; font-size: 14px; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-container" dir="rtl">
      <Head>
        <title>لوحة تحكم المدير - محامي برو</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <header className="admin-header">
        <div className="header-content">
          <div className="header-left">
            <ShieldCheck size={32} />
            <div>
              <h1>لوحة تحكم المدير</h1>
              <p>مرحباً، {adminUser?.username || 'المدير'}</p>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}><LogOut size={18} /> خروج</button>
        </div>
      </header>

      <main className="admin-main">
        {/* Stats Section */}
        <div className="stats-grid">
          <div className="stat-card pending">
            <div className="stat-icon"><Users size={24} /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.pending}</span>
              <span className="stat-label">طلبات معلقة</span>
            </div>
          </div>
          <div className="stat-card active-accounts">
            <div className="stat-icon"><Activity size={24} /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.activeAccounts}</span>
              <span className="stat-label">حسابات نشطة</span>
            </div>
          </div>
          <div className="stat-card total">
            <div className="stat-icon"><ShieldCheck size={24} /></div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalRegistered}</span>
              <span className="stat-label">إجمالي المشتركين</span>
            </div>
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="dashboard-section">
          <h2>الإجراءات السريعة</h2>
          <div className="links-grid">
            <Link href="/admin/user-requests">
              <a className="link-card">
                <Users size={28} />
                <span>طلبات الاشتراك</span>
              </a>
            </Link>
            <Link href="/admin/users">
              <a className="link-card">
                <ShieldCheck size={28} />
                <span>إدارة الصلاحيات</span>
              </a>
            </Link>
            <Link href="/admin/templates">
              <a className="link-card">
                <FileText size={28} />
                <span>إدارة القوالب</span>
              </a>
            </Link>
            <Link href="/admin/decisions">
              <a className="link-card">
                <RefreshCw size={28} />
                <span>إدارة القرارات</span>
              </a>
            </Link>
            <Link href="/help">
              <a className="link-card" style={{ borderColor: '#2563eb', background: '#eff6ff' }}>
                <HelpCircle size={28} color="#2563eb" />
                <span style={{ color: '#2563eb' }}>تعديل صفحة المساعدة</span>
              </a>
            </Link>
          </div>
        </div>

        {/* Screenshot Generator Section */}
        <div className="dashboard-section">
          <h2>مولد لقطات الشاشة للتوثيق</h2>
          <div className="screenshot-generator-card">
            <div className="screenshot-form">
              <div className="form-row">
                <div className="form-group">
                  <label>رابط الصفحة</label>
                  <input
                    type="url"
                    placeholder="http://localhost:3000/dashboard"
                    value={screenshotForm.url}
                    onChange={(e) => setScreenshotForm({ ...screenshotForm, url: e.target.value })}
                    dir="ltr"
                  />
                </div>
                <div className="form-group">
                  <label>حجم الشاشة</label>
                  <select
                    value={screenshotForm.viewport}
                    onChange={(e) => setScreenshotForm({ ...screenshotForm, viewport: e.target.value })}
                  >
                    <option value="desktop">سطح المكتب (1920x1080)</option>
                    <option value="tablet">جهاز لوحي (768x1024)</option>
                    <option value="mobile">جوال (375x667)</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>الإجراءات التلقائية (JSON - اختياري)</label>
                <textarea
                  placeholder='[{"type": "click", "selector": "#button-id"}, {"type": "fill", "selector": "#input-id", "value": "text"}]'
                  value={screenshotForm.actions}
                  onChange={(e) => setScreenshotForm({ ...screenshotForm, actions: e.target.value })}
                  dir="ltr"
                  rows={4}
                />
                <small className="help-text">
                  أنواع الإجراءات المتاحة: click, fill, wait, scroll, waitForSelector
                </small>
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={screenshotForm.fullPage}
                    onChange={(e) => setScreenshotForm({ ...screenshotForm, fullPage: e.target.checked })}
                  />
                  التقاط الصفحة الكاملة
                </label>
              </div>
              <button
                className="generate-btn"
                onClick={handleGenerateScreenshot}
                disabled={screenshotLoading || !screenshotForm.url}
              >
                {screenshotLoading ? (
                  <>
                    <RefreshCw className="spin" size={18} />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <Camera size={18} />
                    إنشاء لقطة الشاشة
                  </>
                )}
              </button>
              {screenshotError && <div className="error-message">{screenshotError}</div>}
            </div>
            {screenshotUrl && (
              <div className="screenshot-result">
                <h3>تم إنشاء لقطة الشاشة</h3>
                <img src={screenshotUrl} alt="Generated Screenshot" />
                <a href={screenshotUrl} download className="download-btn">
                  <Download size={18} />
                  تحميل الصورة
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Active Accounts Highlight */}
        <div className="dashboard-section table-section">
          <div className="section-header">
            <h2>المشتركين النشطين (آخر التحديثات)</h2>
            <Link href="/admin/users"><a className="view-all">عرض الكل <ChevronRight size={16} /></a></Link>
          </div>
          <div className="table-wrapper">
            <table className="summary-table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>الحالة</th>
                  <th>تاريخ الانتهاء</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {activeUsersList.length === 0 ? (
                  <tr><td colSpan="4" className="empty-state">لا يوجد مستخدمين نشطين حالياً</td></tr>
                ) : (
                  activeUsersList.slice(0, 5).map(user => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-info">
                          <span className="name">{user.arabic_name || user.username}</span>
                          <span className="email">{user.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${user.subscriptions[0].plan_id.includes('trial') ? 'trial' : 'pro'}`}>
                          {user.subscriptions[0].plan_id.includes('trial') ? 'تجريبي' : 'مشترك'}
                        </span>
                      </td>
                      <td>{new Date(user.subscriptions[0].current_period_end).toLocaleDateString('ar-IQ')}</td>
                      <td><Link href="/admin/users"><a className="manage-btn">إدارة</a></Link></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <style jsx>{`
        .admin-container { min-height: 100vh; background: #f8fafc; font-family: 'Cairo', sans-serif; }
        .admin-header { background: #0f172a; color: white; padding: 20px 40px; }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .header-left { display: flex; align-items: center; gap: 15px; }
        .header-left h1 { font-size: 20px; font-weight: 700; margin: 0; }
        .logout-btn { background: rgba(255,255,255,0.1); border: none; color: white; padding: 8px 16px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        
        .admin-main { max-width: 1200px; margin: 0 auto; padding: 40px; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .stat-card { background: white; padding: 25px; border-radius: 12px; display: flex; align-items: center; gap: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .stat-icon { width: 50px; height: 50px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .pending .stat-icon { background: #fef3c7; color: #d97706; }
        .active-accounts .stat-icon { background: #dcfce7; color: #16a34a; }
        .total .stat-icon { background: #f1f5f9; color: #475569; }
        .stat-value { font-size: 28px; font-weight: 800; display: block; color: #0f172a; }
        .stat-label { color: #64748b; font-size: 14px; }

        .dashboard-section { margin-bottom: 40px; }
        .dashboard-section h2 { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 20px; }
        
        .links-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .link-card { background: white; padding: 20px; border-radius: 10px; text-decoration: none; color: #0f172a; display: flex; flex-direction: column; align-items: center; gap: 10px; border: 1px solid #e2e8f0; transition: all 0.2s; }
        .link-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-color: #2563eb; color: #2563eb; }
        .link-card span { font-weight: 700; font-size: 15px; }

        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .view-all { color: #2563eb; text-decoration: none; font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 5px; }
        
        .table-wrapper { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
        .summary-table { width: 100%; border-collapse: collapse; text-align: right; }
        .summary-table th { background: #f8fafc; padding: 15px; font-size: 12px; color: #64748b; }
        .summary-table td { padding: 15px; border-top: 1px solid #f1f5f9; }
        .user-info { display: flex; flex-direction: column; }
        .name { font-weight: 700; color: #0f172a; font-size: 14px; }
        .email { font-size: 12px; color: #64748b; }
        
        .badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
        .badge.trial { background: #eff6ff; color: #1e40af; }
        .badge.pro { background: #dcfce7; color: #15803d; }
        
        .manage-btn { padding: 5px 12px; color: #2563eb; background: #eff6ff; border-radius: 5px; text-decoration: none; font-size: 13px; font-weight: 700; }
        .empty-state { padding: 40px; text-align: center; color: #94a3b8; }

        /* Screenshot Generator Styles */
        .screenshot-generator-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 30px; }
        .screenshot-form { display: flex; flex-direction: column; gap: 20px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group label { font-weight: 600; color: #1e293b; font-size: 14px; }
        .form-group input, .form-group select, .form-group textarea {
          padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: inherit;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .form-group textarea { resize: vertical; min-height: 100px; }
        .help-text { color: #64748b; font-size: 12px; }
        .checkbox-group label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .checkbox-group input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }
        .generate-btn {
          background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px;
          cursor: pointer; font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px;
          justify-content: center; transition: background 0.2s;
        }
        .generate-btn:hover:not(:disabled) { background: #1d4ed8; }
        .generate-btn:disabled { background: #94a3b8; cursor: not-allowed; }
        .error-message { background: #fee2e2; color: #dc2626; padding: 12px; border-radius: 8px; font-size: 14px; }
        .screenshot-result { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        .screenshot-result h3 { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 15px; }
        .screenshot-result img {
          width: 100%; max-height: 600px; object-fit: contain; border: 1px solid #e2e8f0;
          border-radius: 8px; margin-bottom: 15px;
        }
        .download-btn {
          display: inline-flex; align-items: center; gap: 8px; background: #16a34a; color: white;
          padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;
        }
        .download-btn:hover { background: #15803d; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
