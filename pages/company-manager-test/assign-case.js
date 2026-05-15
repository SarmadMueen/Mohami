import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/initSupabase';
import Head from 'next/head';
import Link from 'next/link';
import {
  Briefcase,
  ArrowRight,
  RefreshCw,
  LogOut,
  Plus,
  AlertCircle,
  Calendar,
  Clock,
  User
} from 'lucide-react';

export default function AssignCase() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lawyers, setLawyers] = useState([]);
  const [assignedCases, setAssignedCases] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    case_type: '',
    priority: 'medium',
    deadline: '',
    lawyer_id: '',
  });

  const TEST_EMAILS = ['dr.abd256@gmail.com', 'test.manager@example.com', 'tester@kk.com'];

  useEffect(() => {
    checkAuthorizationAndLoadData();
  }, []);

  const checkAuthorizationAndLoadData = async () => {
    try {
      const session = supabase.auth.session();
      
      if (!session || !session.user || !TEST_EMAILS.includes(session.user.email)) {
        router.push('/company-manager-test');
        return;
      }

      await loadLawyers();
      await loadAssignedCases();
      setLoading(false);
    } catch (error) {
      console.error('Authorization check failed:', error);
      router.push('/company-manager-test');
    }
  };

  const loadLawyers = async () => {
    const session = supabase.auth.session();
    
    const { data, error } = await supabase
      .from('user_metadata')
      .select('*')
      .eq('created_by_manager_id', session.user.id)
      .eq('role', 'محامي');

    if (error) {
      console.error('Error loading lawyers:', error);
    } else {
      setLawyers(data || []);
    }
  };

  const loadAssignedCases = async () => {
    const session = supabase.auth.session();
    
    const { data, error } = await supabase
      .from('cases')
      .select('*, user_metadata!inner(name)')
      .eq('assigned_by_manager_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading cases:', error);
    } else {
      setAssignedCases(data || []);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const session = supabase.auth.session();

    const caseNumber = `CM-${Date.now()}`;

    const { data, error } = await supabase
      .from('cases')
      .insert({
        case_number: caseNumber,
        case_name: formData.title,
        description: formData.description,
        case_type: formData.case_type,
        priority: formData.priority,
        deadline: formData.deadline,
        user_id: formData.lawyer_id,
        assigned_by_manager_id: session.user.id,
        admin_id: session.user.id,
        status: 'open',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating case:', error);
      alert('فشل في إنشاء القضية: ' + error.message);
      return;
    }

    alert('تم تعيين القضية بنجاح!');
    
    setFormData({
      title: '',
      description: '',
      case_type: '',
      priority: 'medium',
      deadline: '',
      lawyer_id: '',
    });

    await loadAssignedCases();
  };

  const handleReassign = async (caseId, newLawyerId) => {
    const { error } = await supabase
      .from('cases')
      .update({ user_id: newLawyerId })
      .eq('id', caseId);

    if (error) {
      console.error('Error reassigning case:', error);
      alert('فشل في إعادة تعيين القضية');
    } else {
      alert('تم إعادة تعيين القضية بنجاح');
      loadAssignedCases();
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
        <title>تعيين القضايا - محامي برو</title>
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
              <Briefcase size={32} />
              <div>
                <h1>تعيين القضايا</h1>
                <p>تعيين القضايا للمحامين في شركتك</p>
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
          <div className="grid-layout">
            {/* Case Assignment Form */}
            <div className="form-card">
              <div className="form-header">
                <Plus size={24} />
                <h2>تعيين قضية جديدة</h2>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>عنوان القضية</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="أدخل عنوان القضية"
                  />
                </div>

                <div className="form-group">
                  <label>الوصف</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="4"
                    placeholder="أدخل وصف القضية"
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>نوع القضية</label>
                    <select
                      required
                      value={formData.case_type}
                      onChange={(e) => setFormData({ ...formData, case_type: e.target.value })}
                    >
                      <option value="">اختر نوع القضية</option>
                      <option value="civil">مدني</option>
                      <option value="criminal">جزائي</option>
                      <option value="personal_status">أحوال شخصية</option>
                      <option value="sharia">شرعي</option>
                      <option value="commercial">تجاري</option>
                      <option value="labor">عمالي</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>الأولوية</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="low">منخفضة</option>
                      <option value="medium">متوسطة</option>
                      <option value="high">عالية</option>
                      <option value="urgent">عاجلة</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>الموعد النهائي</label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>تعيين للمحامي</label>
                    <select
                      required
                      value={formData.lawyer_id}
                      onChange={(e) => setFormData({ ...formData, lawyer_id: e.target.value })}
                    >
                      <option value="">اختر المحامي</option>
                      {lawyers.map((lawyer) => (
                        <option key={lawyer.user_id} value={lawyer.user_id}>
                          {lawyer.name} ({lawyer.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" className="submit-btn">
                  <Briefcase size={18} />
                  تعيين القضية
                </button>
              </form>
            </div>

            {/* Assigned Cases List */}
            <div className="cases-list">
              <div className="section-header">
                <h2>القضايا المعينة</h2>
                <span className="count-badge">{assignedCases.length}</span>
              </div>
              <div className="cases-container">
                {assignedCases.map((caseItem) => (
                  <div key={caseItem.id} className="case-card">
                    <div className="case-header">
                      <h3>{caseItem.case_name}</h3>
                      <span className={`status-badge ${caseItem.status}`}>
                        {caseItem.status === 'open' ? 'مفتوحة' :
                         caseItem.status === 'in_progress' ? 'قيد العمل' :
                         caseItem.status === 'closed' ? 'مغلقة' : 'مفتوحة'}
                      </span>
                    </div>
                    <p className="case-description">{caseItem.description}</p>
                    <div className="case-meta">
                      <div className="meta-item">
                        <User size={14} />
                        <span>المحامي: {caseItem.user_metadata?.name || 'غير معروف'}</span>
                      </div>
                      <div className="meta-item">
                        <Calendar size={14} />
                        <span>{new Date(caseItem.created_at).toLocaleDateString('ar-IQ')}</span>
                      </div>
                    </div>
                    <div className="case-actions">
                      <select
                        onChange={(e) => handleReassign(caseItem.id, e.target.value)}
                        className="reassign-select"
                        defaultValue=""
                      >
                        <option value="">إعادة تعيين...</option>
                        {lawyers.map((lawyer) => (
                          <option key={lawyer.user_id} value={lawyer.user_id}>
                            {lawyer.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                {assignedCases.length === 0 && (
                  <div className="empty-state">
                    <AlertCircle size={48} />
                    <p>لا توجد قضايا معينة بعد</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <style jsx>{`
          .admin-container { min-height: 100vh; background: #f5f5f5; font-family: 'Cairo', sans-serif; }
          .warning-banner { background: #dc2626; color: white; text-align: center; padding: 12px; font-size: 14px; font-weight: 600; }
          .admin-header { background: white; color: #333; padding: 20px 40px; border-bottom: 1px solid #e5e5e5; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
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
          
          .grid-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
          @media (max-width: 1024px) {
            .grid-layout { grid-template-columns: 1fr; }
          }
          
          .form-card { background: white; border-radius: 12px; border: 1px solid #e5e5e5; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
          .form-header { display: flex; align-items: center; gap: 10px; margin-bottom: 25px; }
          .form-header h2 { font-size: 18px; font-weight: 700; color: #333; margin: 0; }
          .form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
          .form-group label { font-weight: 600; color: #333; font-size: 14px; }
          .form-group input, .form-group select, .form-group textarea {
            padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; font-family: inherit;
          }
          .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
            outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          }
          .form-group textarea { resize: vertical; min-height: 100px; }
          .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .submit-btn { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; }
          .submit-btn:hover { background: #1d4ed8; }
          
          .cases-list { background: white; border-radius: 12px; border: 1px solid #e5e5e5; padding: 30px; max-height: calc(100vh - 300px); overflow-y: auto; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
          .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
          .section-header h2 { font-size: 18px; font-weight: 700; color: #333; margin: 0; }
          .count-badge { background: #2563eb; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
          
          .cases-container { display: flex; flex-direction: column; gap: 15px; }
          .case-card { background: #f9fafb; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; }
          .case-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; }
          .case-header h3 { font-size: 16px; font-weight: 700; color: #333; margin: 0; }
          .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
          .status-badge.open { background: #dbeafe; color: #1e40af; }
          .status-badge.in_progress { background: #fef3c7; color: #d97706; }
          .status-badge.closed { background: #dcfce7; color: #15803d; }
          .case-description { color: #666; font-size: 14px; margin-bottom: 15px; line-height: 1.5; }
          .case-meta { display: flex; gap: 20px; margin-bottom: 15px; }
          .meta-item { display: flex; align-items: center; gap: 6px; color: #666; font-size: 12px; }
          .case-actions { display: flex; justify-content: flex-end; }
          .reassign-select { padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; background: white; }
          .reassign-select:focus { outline: none; border-color: #2563eb; }
          
          .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: #666; gap: 15px; }
        `}</style>
      </div>
    </>
  );
}
