import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/initSupabase';
import Head from 'next/head';
import Link from 'next/link';
import {
  RefreshCw,
  ArrowRight,
  LogOut,
  Users,
  Briefcase,
  Calendar,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export default function LawyerActivity() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lawyers, setLawyers] = useState([]);
  const [metrics, setMetrics] = useState({});

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

      await loadLawyersAndMetrics();
      setLoading(false);
    } catch (error) {
      console.error('Authorization check failed:', error);
      router.push('/company-manager-test');
    }
  };

  const loadLawyersAndMetrics = async () => {
    const session = supabase.auth.session();
    
    const { data: lawyers, error } = await supabase
      .from('user_metadata')
      .select('*')
      .eq('created_by_manager_id', session.user.id)
      .eq('role', 'محامي');

    if (error) {
      console.error('Error loading lawyers:', error);
    } else {
      setLawyers(lawyers || []);
      calculateMetrics(lawyers || []);
    }
  };

  const calculateLawyerMetrics = async (lawyerId) => {
    // Count assigned cases
    const { count: casesCount } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', lawyerId);

    // Count sessions attended
    const { count: sessionsCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', lawyerId);

    // Count completed cases
    const { count: completedCount } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', lawyerId)
      .eq('status', 'closed');

    // Calculate completion rate
    const completionRate = casesCount > 0 ? Math.round((completedCount / casesCount) * 100) : 0;

    return {
      casesAssigned: casesCount || 0,
      sessionsAttended: sessionsCount || 0,
      casesCompleted: completedCount || 0,
      completionRate,
    };
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

  const totalCases = Object.values(metrics).reduce((sum, m) => sum + m.casesAssigned, 0);
  const totalCompleted = Object.values(metrics).reduce((sum, m) => sum + m.casesCompleted, 0);
  const avgCompletionRate = lawyers.length > 0 
    ? Math.round(Object.values(metrics).reduce((sum, m) => sum + m.completionRate, 0) / lawyers.length)
    : 0;

  return (
    <>
      <Head>
        <title>نشاط المحامين - محامي برو</title>
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
              <TrendingUp size={32} />
              <div>
                <h1>نشاط المحامين</h1>
                <p>مراقبة أداء المحامين في شركتك</p>
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
          {/* Overall Summary Stats */}
          {lawyers.length > 0 && (
            <div className="stats-grid">
              <div className="stat-card lawyers">
                <div className="stat-icon">
                  <Users size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{lawyers.length}</span>
                  <span className="stat-label">إجمالي المحامين</span>
                </div>
              </div>
              <div className="stat-card cases">
                <div className="stat-icon">
                  <Briefcase size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{totalCases}</span>
                  <span className="stat-label">إجمالي القضايا</span>
                </div>
              </div>
              <div className="stat-card completed">
                <div className="stat-icon">
                  <TrendingUp size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{totalCompleted}</span>
                  <span className="stat-label">القضايا المكتملة</span>
                </div>
              </div>
              <div className="stat-card rate">
                <div className="stat-icon">
                  <Calendar size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{avgCompletionRate}%</span>
                  <span className="stat-label">معدل الإنجاز</span>
                </div>
              </div>
            </div>
          )}

          {/* Lawyer Cards */}
          <div className="lawyers-grid">
            {lawyers.map((lawyer) => {
              const lawyerMetrics = metrics[lawyer.user_id] || {
                casesAssigned: 0,
                sessionsAttended: 0,
                casesCompleted: 0,
                completionRate: 0,
              };

              return (
                <div key={lawyer.user_id} className="lawyer-card">
                  <div className="lawyer-header">
                    <h3>{lawyer.name}</h3>
                    <span className="lawyer-email">{lawyer.email}</span>
                  </div>
                  
                  <div className="metrics-grid">
                    <div className="metric-item">
                      <Briefcase size={16} />
                      <span className="metric-label">القضايا المعينة</span>
                      <span className="metric-value">{lawyerMetrics.casesAssigned}</span>
                    </div>
                    
                    <div className="metric-item">
                      <Calendar size={16} />
                      <span className="metric-label">الجلسات</span>
                      <span className="metric-value">{lawyerMetrics.sessionsAttended}</span>
                    </div>
                    
                    <div className="metric-item">
                      <TrendingUp size={16} />
                      <span className="metric-label">المكتملة</span>
                      <span className="metric-value">{lawyerMetrics.casesCompleted}</span>
                    </div>
                  </div>
                  
                  <div className="completion-section">
                    <div className="completion-header">
                      <span className="completion-label">معدل الإنجاز</span>
                      <span className="completion-value">{lawyerMetrics.completionRate}%</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${lawyerMetrics.completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {lawyers.length === 0 && (
              <div className="empty-state">
                <AlertCircle size={48} />
                <p>لا يوجد محامين. أضف محامين لبدء مراقبة نشاطهم.</p>
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
          
          .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 40px; }
          .stat-card { background: white; padding: 25px; border-radius: 12px; display: flex; align-items: center; gap: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.08); border: 1px solid #e5e5e5; }
          .stat-icon { width: 50px; height: 50px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
          .lawyers .stat-icon { background: #fef3c7; color: #d97706; }
          .cases .stat-icon { background: #dcfce7; color: #16a34a; }
          .completed .stat-icon { background: #dbeafe; color: #2563eb; }
          .rate .stat-icon { background: #f3e8ff; color: #9333ea; }
          .stat-value { font-size: 28px; font-weight: 800; display: block; color: #333; }
          .stat-label { color: #666; font-size: 14px; }
          
          .lawyers-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
          .lawyer-card { background: white; border-radius: 12px; border: 1px solid #e5e5e5; padding: 25px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
          .lawyer-card:hover { box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-color: #2563eb; }
          .lawyer-header { margin-bottom: 20px; }
          .lawyer-header h3 { font-size: 18px; font-weight: 700; color: #333; margin: 0 0 8px 0; }
          .lawyer-email { color: #666; font-size: 13px; }
          
          .metrics-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .metric-item { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 15px; background: #f9fafb; border-radius: 8px; }
          .metric-label { color: #666; font-size: 12px; }
          .metric-value { font-size: 24px; font-weight: 800; color: #333; }
          
          .completion-section { padding-top: 20px; border-top: 1px solid #e5e5e5; }
          .completion-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
          .completion-label { color: #666; font-size: 13px; font-weight: 600; }
          .completion-value { font-size: 18px; font-weight: 800; color: #2563eb; }
          .progress-bar { width: 100%; background: #e5e5e5; border-radius: 8px; height: 8px; overflow: hidden; }
          .progress-fill { background: linear-gradient(90deg, #2563eb 0%, #3b82f6 100%); height: 100%; border-radius: 8px; transition: width 0.3s ease; }
          
          .empty-state { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #666; gap: 15px; }
        `}</style>
      </div>
    </>
  );
}
