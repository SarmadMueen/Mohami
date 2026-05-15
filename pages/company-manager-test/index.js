import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/initSupabase';
import Head from 'next/head';
import Link from 'next/link';
import {
  Briefcase,
  Users,
  BarChart3,
  MessageSquare,
  Settings,
  Plus,
  X,
  UserPlus,
  RefreshCw
} from 'lucide-react';

export default function CompanyManagerTestDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState(null);
  const [showCustomization, setShowCustomization] = useState(false);
  const [preferences, setPreferences] = useState(null);
  const [showAddLawyerForm, setShowAddLawyerForm] = useState(false);
  const [lawyerFormData, setLawyerFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: ''
  });
  const [stats, setStats] = useState({
    lawyersCount: 0,
    assignedCases: 0,
    activeCases: 0,
    completionRate: 0
  });

  const TEST_EMAILS = ['dr.abd256@gmail.com', 'test.manager@example.com', 'tester@kk.com'];

  useEffect(() => {
    checkAuthorization();
  }, []);

  const checkAuthorization = async () => {
    try {
      // For Supabase v1, use session() method
      const session = supabase.auth.session();
      
      if (!session || !session.user) {
        router.push('/login');
        return;
      }

      const currentUser = session.user;

      // Check if email matches test emails
      if (!TEST_EMAILS.includes(currentUser.email)) {
        router.push('/dashboard');
        return;
      }

      setUser(currentUser);
      setAuthorized(true);

      // Check if preferences exist
      const { data: prefs } = await supabase
        .from('company_manager_preferences')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (!prefs) {
        setShowCustomization(true);
      } else {
        setPreferences(prefs);
      }

      setLoading(false);
      
      // Fetch stats
      await fetchStats();
    } catch (error) {
      console.error('Authorization check failed:', error);
      router.push('/login');
    }
  };

  const fetchStats = async () => {
    try {
      const session = supabase.auth.session();
      if (!session) return;

      // Fetch lawyers count
      const { data: lawyers } = await supabase
        .from('user_metadata')
        .select('user_id')
        .eq('created_by_manager_id', session.user.id);

      // Fetch assigned cases
      const { data: cases } = await supabase
        .from('cases')
        .select('id, status')
        .eq('assigned_by_manager_id', session.user.id);

      setStats({
        lawyersCount: lawyers?.length || 0,
        assignedCases: cases?.length || 0,
        activeCases: cases?.filter(c => c.status === 'active').length || 0,
        completionRate: cases?.length > 0 
          ? Math.round((cases?.filter(c => c.status === 'completed').length / cases.length) * 100) 
          : 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleAddLawyer = async (e) => {
    e.preventDefault();
    
    const session = supabase.auth.session();
    const tempPassword = Math.random().toString(36).slice(-8);
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: lawyerFormData.email,
      password: tempPassword,
      options: {
        data: {
          name: lawyerFormData.name,
          role: 'محامي',
          admin_user_id: session.user.id,
        }
      }
    });

    if (authError) {
      alert('فشل في إنشاء حساب المحامي: ' + authError.message);
      return;
    }

    // In Supabase v1.x, the response structure might be different
    const userId = authData?.user?.id || authData?.id;
    
    if (!userId) {
      alert('فشل في إنشاء حساب المحامي: لم يتم إنشاء المستخدم');
      return;
    }

    const { error: metadataError } = await supabase
      .from('user_metadata')
      .insert({
        user_id: userId,
        email: lawyerFormData.email,
        name: lawyerFormData.name,
        role: 'محامي',
        admin_user_id: session.user.id,
        created_by_manager_id: session.user.id,
        phone: lawyerFormData.phone,
        specialization: lawyerFormData.specialization,
      });

    if (metadataError) {
      alert('فشل في إنشاء بيانات المحامي: ' + metadataError.message);
      return;
    }

    alert(`تم إنشاء حساب المحامي لـ ${lawyerFormData.email}. كلمة المرور المؤقتة: ${tempPassword}`);
    
    setLawyerFormData({ name: '', email: '', phone: '', specialization: '' });
    setShowAddLawyerForm(false);
    await fetchStats();
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

  if (!authorized) {
    return null;
  }

  if (showCustomization) {
    return <CustomizationModal user={user} onSave={(prefs) => {
      setPreferences(prefs);
      setShowCustomization(false);
    }} />;
  }

  return (
    <>
      <Head>
        <title>لوحة مدير الشركة - محامي برو</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <div className="dashboard-container" dir="rtl">
        {/* Warning Banner */}
        <div className="warning-banner">
          ⚠️ بيئة اختبار - مخصص فقط للتجربة
        </div>

        {/* Header */}
        <header className="dashboard-header">
          <div className="header-content">
            <div className="header-left">
              <Briefcase size={32} />
              <div>
                <h1>لوحة مدير الشركة</h1>
                <p>مرحباً، {user?.email?.split('@')[0] || 'المدير'}</p>
              </div>
            </div>
            <Link href="/dashboard">
              <a className="back-to-main-btn">العودة للوحة الرئيسية</a>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="dashboard-main">
          {/* Stats Section */}
          <div className="stats-grid">
            <div className="stat-card lawyers">
              <div className="stat-icon">
                <Users size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.lawyersCount}</span>
                <span className="stat-label">المحامين</span>
              </div>
            </div>
            <div className="stat-card cases">
              <div className="stat-icon">
                <Briefcase size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.assignedCases}</span>
                <span className="stat-label">القضايا المعينة</span>
              </div>
            </div>
            <div className="stat-card active">
              <div className="stat-icon">
                <BarChart3 size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.activeCases}</span>
                <span className="stat-label">قضايا نشطة</span>
              </div>
            </div>
            <div className="stat-card completion">
              <div className="stat-icon">
                <RefreshCw size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.completionRate}%</span>
                <span className="stat-label">معدل الإنجاز</span>
              </div>
            </div>
          </div>

          {/* Add Lawyer Form */}
          {showAddLawyerForm && (
            <div className="add-lawyer-card">
              <div className="card-header">
                <UserPlus size={24} />
                <h2>إضافة محامي جديد</h2>
                <button onClick={() => setShowAddLawyerForm(false)} className="close-btn">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddLawyer}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>الاسم</label>
                    <input
                      type="text"
                      required
                      value={lawyerFormData.name}
                      onChange={(e) => setLawyerFormData({ ...lawyerFormData, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>البريد الإلكتروني</label>
                    <input
                      type="email"
                      required
                      value={lawyerFormData.email}
                      onChange={(e) => setLawyerFormData({ ...lawyerFormData, email: e.target.value })}
                      dir="ltr"
                    />
                  </div>
                  <div className="form-group">
                    <label>رقم الهاتف</label>
                    <input
                      type="tel"
                      value={lawyerFormData.phone}
                      onChange={(e) => setLawyerFormData({ ...lawyerFormData, phone: e.target.value })}
                      dir="ltr"
                    />
                  </div>
                  <div className="form-group">
                    <label>التخصص</label>
                    <input
                      type="text"
                      value={lawyerFormData.specialization}
                      onChange={(e) => setLawyerFormData({ ...lawyerFormData, specialization: e.target.value })}
                    />
                  </div>
                </div>
                <button type="submit" className="submit-btn">
                  <UserPlus size={18} />
                  إنشاء حساب المحامي
                </button>
              </form>
            </div>
          )}

          {/* Quick Links Section */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>الإجراءات السريعة</h2>
              <button onClick={() => setShowAddLawyerForm(!showAddLawyerForm)} className="add-lawyer-btn">
                {showAddLawyerForm ? <X size={18} /> : <Plus size={18} />}
                {showAddLawyerForm ? 'إلغاء' : 'إضافة محامي جديد'}
              </button>
            </div>
            <div className="links-grid">
              <Link href="/company-manager-test/manage-lawyers">
                <a className="link-card">
                  <Users size={28} />
                  <span>إدارة المحامين</span>
                </a>
              </Link>
              <Link href="/company-manager-test/assign-case">
                <a className="link-card">
                  <Briefcase size={28} />
                  <span>تعيين قضية</span>
                </a>
              </Link>
              {preferences?.selected_features?.includes('progress_tracking') && (
                <Link href="/company-manager-test/progress">
                  <a className="link-card">
                    <BarChart3 size={28} />
                    <span>تتبع التقدم</span>
                  </a>
                </Link>
              )}
              {preferences?.selected_features?.includes('activity_metrics') && (
                <Link href="/company-manager-test/lawyer-activity">
                  <a className="link-card">
                    <RefreshCw size={28} />
                    <span>نشاط المحامين</span>
                  </a>
                </Link>
              )}
              <Link href="/company-manager-test/messages">
                <a className="link-card">
                  <MessageSquare size={28} />
                  <span>الرسائل</span>
                </a>
              </Link>
              <Link href="/company-manager-test/settings">
                <a className="link-card">
                  <Settings size={28} />
                  <span>الإعدادات</span>
                </a>
              </Link>
            </div>
          </div>
        </main>

        <style jsx>{`
          .dashboard-container { min-height: 100vh; background: #f5f5f5; font-family: 'Cairo', sans-serif; }
          .warning-banner { background: #dc2626; color: white; text-align: center; padding: 12px; font-size: 14px; font-weight: 600; }
          .dashboard-header { background: white; color: #333; padding: 20px 40px; border-bottom: 1px solid #e5e5e5; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
          .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
          .header-left { display: flex; align-items: center; gap: 15px; }
          .header-left h1 { font-size: 20px; font-weight: 700; margin: 0; color: #333; }
          .header-left p { font-size: 14px; margin: 0; color: #666; }
          .back-to-main-btn { background: #2563eb; color: white; padding: 8px 16px; border-radius: 5px; text-decoration: none; font-size: 14px; font-weight: 600; }
          .back-to-main-btn:hover { background: #1d4ed8; }
          
          .dashboard-main { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
          
          .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px; }
          .stat-card { background: white; padding: 25px; border-radius: 12px; display: flex; align-items: center; gap: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.08); border: 1px solid #e5e5e5; }
          .stat-icon { width: 50px; height: 50px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
          .lawyers .stat-icon { background: #e0f2fe; color: #0284c7; }
          .cases .stat-icon { background: #dcfce7; color: #16a34a; }
          .active .stat-icon { background: #fef3c7; color: #d97706; }
          .completion .stat-icon { background: #f3e8ff; color: #9333ea; }
          .stat-value { font-size: 28px; font-weight: 800; display: block; color: #333; }
          .stat-label { color: #666; font-size: 14px; }

          .add-lawyer-card { background: white; border-radius: 12px; border: 1px solid #e5e5e5; padding: 30px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
          .card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 25px; justify-content: space-between; }
          .card-header h2 { font-size: 18px; font-weight: 700; color: #333; margin: 0; flex: 1; }
          .close-btn { background: none; border: none; cursor: pointer; color: #666; padding: 5px; border-radius: 5px; }
          .close-btn:hover { background: #f5f5f5; }
          .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .form-group { display: flex; flex-direction: column; gap: 8px; }
          .form-group label { font-weight: 600; color: #333; font-size: 14px; }
          .form-group input { padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; font-family: inherit; }
          .form-group input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
          .submit-btn { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; }
          .submit-btn:hover { background: #1d4ed8; }

          .dashboard-section { margin-bottom: 30px; }
          .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .section-header h2 { font-size: 18px; font-weight: 700; color: #333; margin: 0; }
          .add-lawyer-btn { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px; }
          .add-lawyer-btn:hover { background: #1d4ed8; }
          
          .links-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
          .link-card { background: white; padding: 20px; border-radius: 10px; text-decoration: none; color: #333; display: flex; flex-direction: column; align-items: center; gap: 10px; border: 1px solid #e5e5e5; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
          .link-card:hover { transform: translateY(-3px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-color: #2563eb; color: #2563eb; }
          .link-card span { font-weight: 700; font-size: 15px; }
        `}</style>
      </div>
    </>
  );
}

function CustomizationModal({ user, onSave }) {
  const [features, setFeatures] = useState({
    progress_tracking: true,
    activity_metrics: true,
    financial_info: false,
    client_info: true,
  });

  const handleSave = async () => {
    const selectedFeatures = Object.keys(features).filter(key => features[key]);
    
    const { data, error } = await supabase
      .from('company_manager_preferences')
      .insert({
        user_id: user.id,
        selected_features: selectedFeatures,
        default_view: 'dashboard',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving preferences:', error);
      alert('فشل في حفظ التفضيلات');
      return;
    }

    onSave(data);
  };

  return (
    <div className="customization-container" dir="rtl">
      <Head>
        <title>تخصيص لوحة التحكم - محامي برو</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <div className="customization-card">
        <div className="customization-header">
          <Settings size={48} />
          <h2>تخصيص لوحة التحكم</h2>
          <p>اختر الميزات التي تريد عرضها:</p>
        </div>
        
        <div className="features-list">
          <label className="feature-item">
            <input
              type="checkbox"
              checked={features.progress_tracking}
              onChange={(e) => setFeatures({ ...features, progress_tracking: e.target.checked })}
              className="feature-checkbox"
            />
            <span className="feature-label">تتبع التقدم</span>
          </label>

          <label className="feature-item">
            <input
              type="checkbox"
              checked={features.activity_metrics}
              onChange={(e) => setFeatures({ ...features, activity_metrics: e.target.checked })}
              className="feature-checkbox"
            />
            <span className="feature-label">مقاييس نشاط المحامين</span>
          </label>

          <label className="feature-item">
            <input
              type="checkbox"
              checked={features.financial_info}
              onChange={(e) => setFeatures({ ...features, financial_info: e.target.checked })}
              className="feature-checkbox"
            />
            <span className="feature-label">المعلومات المالية</span>
          </label>

          <label className="feature-item">
            <input
              type="checkbox"
              checked={features.client_info}
              onChange={(e) => setFeatures({ ...features, client_info: e.target.checked })}
              className="feature-checkbox"
            />
            <span className="feature-label">معلومات العملاء</span>
          </label>
        </div>

        <button
          onClick={handleSave}
          className="save-btn"
        >
          حفظ التفضيلات
        </button>
      </div>
      <style jsx>{`
        .customization-container { min-height: 100vh; background: #f8fafc; display: flex; align-items: center; justify-content: center; font-family: 'Cairo', sans-serif; }
        .customization-card { background: white; border-radius: 16px; padding: 40px; width: 100%; max-width: 500px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
        .customization-header { text-align: center; margin-bottom: 30px; color: #dc2626; }
        .customization-header h2 { font-size: 24px; color: #0f172a; margin: 15px 0 5px 0; }
        .customization-header p { color: #64748b; font-size: 14px; margin: 0; }
        .features-list { display: flex; flex-direction: column; gap: 15px; margin-bottom: 30px; }
        .feature-item { display: flex; align-items: center; gap: 12px; padding: 15px; background: #f8fafc; border-radius: 8px; cursor: pointer; transition: background 0.2s; }
        .feature-item:hover { background: #f1f5f9; }
        .feature-checkbox { width: 20px; height: 20px; cursor: pointer; }
        .feature-label { font-weight: 600; color: #1e293b; font-size: 15px; }
        .save-btn { width: 100%; padding: 14px; background: #dc2626; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 16px; transition: background 0.2s; }
        .save-btn:hover { background: #b91c1c; }
      `}</style>
    </div>
  );
}
