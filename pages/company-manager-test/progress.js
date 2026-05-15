import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/initSupabase';
import Head from 'next/head';
import Link from 'next/link';
import {
  BarChart3,
  ArrowRight,
  RefreshCw,
  LogOut,
  Calendar,
  Clock,
  Briefcase,
  User,
  AlertCircle
} from 'lucide-react';

export default function ProgressTracking() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [sessions, setSessions] = useState([]);

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

      await loadCases();
      setLoading(false);
    } catch (error) {
      console.error('Authorization check failed:', error);
      router.push('/company-manager-test');
    }
  };

  const loadCases = async () => {
    const session = supabase.auth.session();
    
    const { data, error } = await supabase
      .from('cases')
      .select('*, user_metadata!inner(name)')
      .eq('assigned_by_manager_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading cases:', error);
    } else {
      setCases(data || []);
    }
  };

  const loadSessions = async (caseNumber) => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('case_number', caseNumber)
      .order('sessiondate', { ascending: true });

    if (error) {
      console.error('Error loading sessions:', error);
    } else {
      setSessions(data || []);
    }
  };

  const handleCaseSelect = (caseItem) => {
    setSelectedCase(caseItem);
    loadSessions(caseItem.case_number);
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
        <title>تتبع التقدم - محامي برو</title>
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
              <BarChart3 size={32} />
              <div>
                <h1>تتبع التقدم</h1>
                <p>مراقبة تقدم القضايا المعينة</p>
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
            {/* Case List */}
            <div className="cases-panel">
              <div className="section-header">
                <h2>القضايا المعينة</h2>
                <span className="count-badge">{cases.length}</span>
              </div>
              <div className="cases-list">
                {cases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    onClick={() => handleCaseSelect(caseItem)}
                    className={`case-item ${selectedCase?.id === caseItem.id ? 'active' : ''}`}
                  >
                    <div className="case-item-header">
                      <h3>{caseItem.case_name}</h3>
                      <span className={`status-badge ${caseItem.status}`}>
                        {caseItem.status === 'open' ? 'مفتوحة' :
                         caseItem.status === 'in_progress' ? 'قيد العمل' :
                         caseItem.status === 'closed' ? 'مغلقة' : 'مفتوحة'}
                      </span>
                    </div>
                    <p className="case-item-desc">{caseItem.description}</p>
                    <div className="case-item-meta">
                      <User size={14} />
                      <span>{caseItem.user_metadata?.name}</span>
                    </div>
                  </div>
                ))}
                {cases.length === 0 && (
                  <div className="empty-state">
                    <AlertCircle size={48} />
                    <p>لا توجد قضايا معينة بعد</p>
                  </div>
                )}
              </div>
            </div>

            {/* Case Details */}
            {selectedCase && (
              <div className="details-panel">
                <div className="section-header">
                  <h2>تفاصيل القضية</h2>
                  <Briefcase size={24} />
                </div>
                <div className="details-content">
                  <div className="detail-row">
                    <label>عنوان القضية</label>
                    <p>{selectedCase.case_name}</p>
                  </div>
                  <div className="detail-row">
                    <label>الوصف</label>
                    <p>{selectedCase.description}</p>
                  </div>
                  <div className="detail-row">
                    <label>الحالة</label>
                    <span className={`status-badge ${selectedCase.status}`}>
                      {selectedCase.status === 'open' ? 'مفتوحة' :
                       selectedCase.status === 'in_progress' ? 'قيد العمل' :
                       selectedCase.status === 'closed' ? 'مغلقة' : 'مفتوحة'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <label>المحامي المعين</label>
                    <p>{selectedCase.user_metadata?.name}</p>
                  </div>
                  <div className="detail-row">
                    <label>تاريخ الإنشاء</label>
                    <p>{new Date(selectedCase.created_at).toLocaleDateString('ar-IQ')}</p>
                  </div>

                  {/* Sessions Timeline */}
                  <div className="timeline-section">
                    <div className="timeline-header">
                      <Calendar size={20} />
                      <h3>الجلسات</h3>
                    </div>
                    {sessions.length > 0 ? (
                      <div className="timeline">
                        {sessions.map((session) => (
                          <div key={session.id} className="timeline-item">
                            <div className="timeline-dot"></div>
                            <div className="timeline-content">
                              <div className="timeline-date">
                                <Clock size={14} />
                                <span>{session.sessiondate}</span>
                              </div>
                              <p className="timeline-notes">{session.notes || 'لا توجد ملاحظات'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-timeline">
                        <Calendar size={32} />
                        <p>لا توجد جلسات مجدولة بعد</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
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
          
          .cases-panel { background: white; border-radius: 12px; border: 1px solid #e5e5e5; padding: 30px; max-height: calc(100vh - 300px); overflow-y: auto; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
          .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
          .section-header h2 { font-size: 18px; font-weight: 700; color: #333; margin: 0; }
          .count-badge { background: #2563eb; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
          
          .cases-list { display: flex; flex-direction: column; gap: 12px; }
          .case-item { background: #f9fafb; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; cursor: pointer; transition: all 0.2s; }
          .case-item:hover { border-color: #2563eb; background: #eff6ff; }
          .case-item.active { border-color: #2563eb; background: #eff6ff; }
          .case-item-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; }
          .case-item-header h3 { font-size: 16px; font-weight: 700; color: #333; margin: 0; }
          .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
          .status-badge.open { background: #dbeafe; color: #1e40af; }
          .status-badge.in_progress { background: #fef3c7; color: #d97706; }
          .status-badge.closed { background: #dcfce7; color: #15803d; }
          .case-item-desc { color: #666; font-size: 14px; margin-bottom: 12px; line-height: 1.5; }
          .case-item-meta { display: flex; align-items: center; gap: 6px; color: #666; font-size: 12px; }
          
          .details-panel { background: white; border-radius: 12px; border: 1px solid #e5e5e5; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
          .details-content { display: flex; flex-direction: column; gap: 20px; }
          .detail-row { display: flex; flex-direction: column; gap: 8px; }
          .detail-row label { font-weight: 600; color: #666; font-size: 13px; }
          .detail-row p { color: #333; font-size: 15px; line-height: 1.5; }
          
          .timeline-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e5e5; }
          .timeline-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
          .timeline-header h3 { font-size: 16px; font-weight: 700; color: #333; margin: 0; }
          .timeline { display: flex; flex-direction: column; gap: 20px; }
          .timeline-item { display: flex; gap: 15px; }
          .timeline-dot { width: 12px; height: 12px; background: #2563eb; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
          .timeline-content { flex: 1; }
          .timeline-date { display: flex; align-items: center; gap: 6px; color: #666; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
          .timeline-notes { color: #666; font-size: 14px; line-height: 1.5; }
          .empty-timeline { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: #666; gap: 10px; }
          
          .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: #666; gap: 15px; }
        `}</style>
      </div>
    </>
  );
}
