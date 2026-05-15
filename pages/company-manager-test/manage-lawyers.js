import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/initSupabase';
import Head from 'next/head';
import Link from 'next/link';
import {
  Users,
  Plus,
  ArrowRight,
  RefreshCw,
  LogOut,
  X,
  UserMinus,
  Briefcase
} from 'lucide-react';

export default function ManageLawyers() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lawyers, setLawyers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
  });

  const TEST_EMAILS = ['dr.abd256@gmail.com', 'test.manager@example.com', 'tester@kk.com'];

  useEffect(() => {
    checkAuthorizationAndLoadLawyers();
  }, []);

  const checkAuthorizationAndLoadLawyers = async () => {
    try {
      const session = supabase.auth.session();
      
      if (!session || !session.user || !TEST_EMAILS.includes(session.user.email)) {
        router.push('/company-manager-test');
        return;
      }

      await loadLawyers();
      setLoading(false);
    } catch (error) {
      console.error('Authorization check failed:', error);
      router.push('/company-manager-test');
    }
  };

  const loadLawyers = async () => {
    const session = supabase.auth.session();
    console.log('Loading lawyers for manager:', session?.user?.id);
    
    const { data, error } = await supabase
      .from('user_metadata')
      .select('*')
      .eq('created_by_manager_id', session.user.id)
      .eq('role', 'محامي');

    console.log('Lawyers query result:', { data, error });

    if (error) {
      console.error('Error loading lawyers:', error);
    } else {
      console.log('Setting lawyers:', data || []);
      setLawyers(data || []);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const session = supabase.auth.session();
    
    // Create Supabase auth user
    const tempPassword = Math.random().toString(36).slice(-8);
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: tempPassword,
      options: {
        data: {
          name: formData.name,
          role: 'محامي',
          admin_user_id: session.user.id,
        }
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      alert('فشل في إنشاء حساب المحامي: ' + authError.message);
      return;
    }

    // In Supabase v1.x, the response structure might be different
    const userId = authData?.user?.id || authData?.id;
    
    if (!userId) {
      alert('فشل في إنشاء حساب المحامي: لم يتم إنشاء المستخدم');
      return;
    }

    // Create user metadata entry
    const { error: metadataError } = await supabase
      .from('user_metadata')
      .insert({
        user_id: userId,
        email: formData.email,
        name: formData.name,
        role: 'محامي',
        admin_user_id: session.user.id,
        created_by_manager_id: session.user.id,
        phone: formData.phone,
        specialization: formData.specialization,
      });

    if (metadataError) {
      console.error('Error creating metadata:', metadataError);
      alert('فشل في إنشاء بيانات المحامي: ' + metadataError.message);
      return;
    }

    alert(`تم إنشاء حساب المحامي لـ ${formData.email}. كلمة المرور المؤقتة: ${tempPassword}`);
    
    setFormData({ name: '', email: '', phone: '', specialization: '' });
    setShowAddForm(false);
    loadLawyers();
  };

  const handleDeactivate = async (lawyerId) => {
    if (!confirm('هل أنت متأكد من حذف هذا المحامي؟')) {
      return;
    }

    const { error } = await supabase
      .from('user_metadata')
      .delete()
      .eq('user_id', lawyerId);

    if (error) {
      console.error('Error deleting lawyer:', error);
      alert('فشل في حذف المحامي');
    } else {
      loadLawyers();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
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

  return (
    <>
      <Head>
        <title>إدارة المحامين - محامي برو</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <div className="admin-container" dir="rtl">
        {/* Warning Banner */}
        <div className="warning-banner">
          ⚠️ بيئة اختبار - مخصص فقط للتجربة
        </div>

        {/* Header */}
        <header className="admin-header">
          <div className="header-content">
            <div className="header-left">
              <Users size={32} />
              <div>
                <h1>إدارة المحامين</h1>
                <p>إضافة وإدارة المحامين في شركتك</p>
              </div>
            </div>
            <div className="header-right">
              <Link href="/company-manager-test">
                <a className="back-btn">
                  <ArrowRight size={18} /> العودة للوحة التحكم
                </a>
              </Link>
              <button className="logout-btn" onClick={handleLogout}>
                <LogOut size={18} /> خروج
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="admin-main">
          <div className="section-header">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="add-btn"
            >
              {showAddForm ? <X size={18} /> : <Plus size={18} />}
              {showAddForm ? 'إلغاء' : 'إضافة محامي جديد'}
            </button>
          </div>

          {showAddForm && (
            <div className="form-card">
              <div className="form-header">
                <h2>إضافة محامي جديد</h2>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>الاسم</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>البريد الإلكتروني</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      dir="ltr"
                    />
                  </div>
                  <div className="form-group">
                    <label>رقم الهاتف</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      dir="ltr"
                    />
                  </div>
                  <div className="form-group">
                    <label>التخصص</label>
                    <input
                      type="text"
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="submit-btn">
                    <Briefcase size={18} />
                    إنشاء حساب المحامي
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="table-section">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>البريد الإلكتروني</th>
                    <th>رقم الهاتف</th>
                    <th>التخصص</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {lawyers.map((lawyer) => (
                    <tr key={lawyer.user_id}>
                      <td>{lawyer.name}</td>
                      <td dir="ltr">{lawyer.email}</td>
                      <td dir="ltr">{lawyer.phone || '-'}</td>
                      <td>{lawyer.specialization || '-'}</td>
                      <td>
                        <span className="badge active">
                          نشط
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDeactivate(lawyer.user_id)}
                          className="deactivate-btn"
                        >
                          <UserMinus size={16} />
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                  {lawyers.length === 0 && (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        لا يوجد محامين. أضف محاميك الأول للبدء.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
          .header-right { display: flex; align-items: center; gap: 15px; }
          .back-btn { background: #2563eb; color: white; padding: 8px 16px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 8px; text-decoration: none; font-size: 14px; font-weight: 600; }
          .back-btn:hover { background: #1d4ed8; }
          .logout-btn { background: #64748b; color: white; padding: 8px 16px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
          .logout-btn:hover { background: #475569; }
          
          .admin-main { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
          
          .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
          .add-btn { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px; }
          .add-btn:hover { background: #1d4ed8; }
          
          .form-card { background: white; border-radius: 12px; border: 1px solid #e5e5e5; padding: 30px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
          .form-header h2 { font-size: 18px; font-weight: 700; color: #333; margin: 0 0 20px 0; }
          .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .form-group { display: flex; flex-direction: column; gap: 8px; }
          .form-group label { font-weight: 600; color: #333; font-size: 14px; }
          .form-group input { padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; font-family: inherit; }
          .form-group input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
          .form-actions { margin-top: 20px; }
          .submit-btn { background: #16a34a; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px; }
          .submit-btn:hover { background: #15803d; }
          
          .table-section { background: white; border-radius: 12px; border: 1px solid #e5e5e5; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
          .table-wrapper { overflow-x: auto; }
          .data-table { width: 100%; border-collapse: collapse; text-align: right; }
          .data-table th { background: #f9fafb; padding: 15px; font-size: 12px; color: #666; font-weight: 700; }
          .data-table td { padding: 15px; border-top: 1px solid #e5e5e5; }
          .badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
          .badge.active { background: #dcfce7; color: #15803d; }
          .badge.inactive { background: #fee2e2; color: #dc2626; }
          .deactivate-btn { padding: 6px 12px; color: #dc2626; background: #fee2e2; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px; }
          .deactivate-btn:hover { background: #fecaca; }
          .empty-state { padding: 40px; text-align: center; color: #666; }
        `}</style>
      </div>
    </>
  );
}
