import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import withClientAuth from '../../lib/withClientAuth';
import { ClientPortalProvider, useClientPortal } from '../../context/ClientPortalContext';
import ClientLayout from '../../components/client-portal/ClientLayout';
import { supabase } from '../../lib/initSupabase';
import {
  Briefcase,
  Calendar,
  DollarSign,
  MessageCircle,
  TrendingUp,
  Clock,
  FileText,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  Activity
} from 'lucide-react';

const DashboardContent = () => {
  const {
    clientInfo,
    clientDataId,
    adminId,
    cases,
    sessions,
    unreadMessages,
    loading
  } = useClientPortal();

  const [updates, setUpdates] = useState([]);
  const [financialSummaries, setFinancialSummaries] = useState({});

  // Calculate stats
  const activeCases = cases.filter(c => {
    const status = (c.caseState || '').toLowerCase();
    return !status.includes('مكتملة') && !status.includes('مغلقة') && !status.includes('منتهية');
  });

  const upcomingSessions = sessions.filter(s => {
    if (!s.sessiondate) return false;
    return new Date(s.sessiondate) >= new Date();
  }).sort((a, b) => new Date(a.sessiondate) - new Date(b.sessiondate));

  const nextSession = upcomingSessions[0];

  // Fetch case updates
  useEffect(() => {
    const fetchUpdates = async () => {
      if (!cases || cases.length === 0) return;

      const caseNumbers = cases.map(c => c.case_number).filter(Boolean);
      if (caseNumbers.length === 0) return;

      try {
        const { data, error } = await supabase
          .from('case_update')
          .select('*')
          .in('case_number', caseNumbers)
          .order('update_date', { ascending: false })
          .limit(5);

        if (!error && data) {
          setUpdates(data);
        }
      } catch (err) {
        console.error('Error fetching case updates:', err);
      }
    };

    fetchUpdates();
  }, [cases]);

  // Calculate financial summary grouped by currency
  useEffect(() => {
    const calcFinancialsGrouped = async () => {
      if (!cases || cases.length === 0) {
        setFinancialSummaries({});
        return;
      }

      const summaries = {};

      for (const c of cases) {
        const curr = c.currency || 'IQD';
        if (!summaries[curr]) {
          summaries[curr] = { totalFees: 0, totalPaid: 0, remaining: 0 };
        }

        const fee = parseFloat(c.totalAmount) || 0;
        summaries[curr].totalFees += fee;

        // Fetch payments from both tables
        const [lawyerFeesRes, attorneyFeesRes] = await Promise.all([
          supabase.from('lawyer_fees').select('payment_amount').eq('case_id', c.id),
          supabase.from('attorneyFees').select('fee_amount').eq('case_id', c.id)
        ]);

        let casePaid = 0;
        if (lawyerFeesRes.data) {
          casePaid += lawyerFeesRes.data.reduce((sum, p) => sum + (parseFloat(p.payment_amount) || 0), 0);
        }
        if (attorneyFeesRes.data) {
          casePaid += attorneyFeesRes.data.reduce((sum, p) => sum + (parseFloat(p.fee_amount) || 0), 0);
        }

        summaries[curr].totalPaid += casePaid;
      }

      // Calculate remaining for each currency
      Object.keys(summaries).forEach(curr => {
        summaries[curr].remaining = summaries[curr].totalFees - summaries[curr].totalPaid;
      });

      setFinancialSummaries(summaries);
    };

    calcFinancialsGrouped();
  }, [cases]);

  const formatCurrency = (amount, currency = 'IQD') => {
    if (amount === 0) return '0';
    
    // For large IQD amounts (Millions)
    if (currency === 'IQD' && amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M ${currency}`;
    }
    
    // For USD, usually full numbers are preferred unless very large
    if (currency === 'USD' && amount >= 100000) {
       return `${(amount / 1000).toFixed(1)}K ${currency}`;
    }

    // Default: use grouped thousands separator
    return `${amount.toLocaleString('ar-IQ')} ${currency}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('ar-IQ', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `منذ ${days} يوم`;
    return formatDate(dateStr);
  };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 17) return 'طاب مساؤك';
    return 'مساء الخير';
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner" />
        <p>جاري تحميل البيانات...</p>
        <style jsx>{`
          .dashboard-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            gap: 16px;
            color: #64748b;
            font-family: 'Cairo', sans-serif;
          }
          .loading-spinner {
            width: 36px;
            height: 36px;
            border: 3px solid #e2e8f0;
            border-top: 3px solid #3B82F6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>الرئيسية - بوابة الموكل | محامي برو</title>
      </Head>

      <div className="cp-dashboard">
        {/* Welcome Header */}
        <div className="welcome-banner animate-slide-down">
          <div className="welcome-banner-content">
            <div className="welcome-text-area" style={{ width: '100%', maxWidth: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <h1 className="welcome-title" style={{ fontWeight: '800', flex: '1 1 auto', minWidth: 'min-content' }}>
                {getTimeBasedGreeting()}، {clientInfo?.client_name || 'موكلنا العزيز'}
              </h1>
              <div className="welcome-date-inline" style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#475569', fontWeight: '600', whiteSpace: 'nowrap' }}>
                <Clock size={14} style={{ marginLeft: '6px', color: '#3B82F6' }} />
                {new Date().toLocaleDateString('ar-IQ', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
          {/* Decorative shapes */}
          <div className="banner-shape shape-1" />
          <div className="banner-shape shape-2" />
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          {/* Mobile Unified Stats Card */}
          <div className="mobile-stats-card">
            <div className="mobile-stats-header">
              <h3 className="mobile-stats-title">نظرة عامة</h3>
              <span className="mobile-stat-icon cases">
                <Activity size={12} />
              </span>
            </div>
            <div className="mobile-stats-grid">
              <div className="mobile-stat-item">
                <div className="mobile-stat-label">
                  <span className="mobile-stat-icon cases">
                    <Briefcase size={12} />
                  </span>
                  <span>القضايا النشطة</span>
                </div>
                <div className="mobile-stat-value">{activeCases.length}</div>
                <div className="mobile-stat-total">{cases.length} إجمالي القضايا</div>
              </div>
              
              <div className="mobile-stat-item">
                <div className="mobile-stat-label">
                  <span className="mobile-stat-icon sessions">
                    <Calendar size={12} />
                  </span>
                  <span>الجلسة القادمة</span>
                </div>
                <div className="mobile-stat-value highlight">
                  {nextSession ? formatDate(nextSession.sessiondate) : 'none'}
                </div>
                <div className="mobile-stat-total">{upcomingSessions.length} جلسة مجدولة</div>
              </div>
              
              {Object.entries(financialSummaries).length > 0 ? (
                Object.entries(financialSummaries).map(([curr, summary], index) => (
                  <React.Fragment key={curr}>
                    <div className="mobile-stat-item">
                      <div className="mobile-stat-label">
                        <span className="mobile-stat-icon financial">
                          <DollarSign size={12} />
                        </span>
                        <span>الرسوم ({curr})</span>
                      </div>
                      <div className="mobile-stat-value">
                        {formatCurrency(summary.totalFees, curr)}
                      </div>
                      <div className="mobile-stat-total">
                        المتبقي {formatCurrency(summary.remaining, curr)}
                      </div>
                    </div>
                    
                    <div className="mobile-stat-item">
                      <div className="mobile-stat-label">
                        <span className="mobile-stat-icon paid">
                          <CheckCircle size={12} />
                        </span>
                        <span>المدفوع ({curr})</span>
                      </div>
                      <div className="mobile-stat-value success">
                        {formatCurrency(summary.totalPaid, curr)}
                      </div>
                      <div className="mobile-stat-total">إجمالي المدفوعات</div>
                    </div>
                  </React.Fragment>
                ))
              ) : (
                <>
                  <div className="mobile-stat-item">
                    <div className="mobile-stat-label">
                      <span className="mobile-stat-icon financial">
                        <DollarSign size={12} />
                      </span>
                      <span>الرسوم</span>
                    </div>
                    <div className="mobile-stat-value">0</div>
                    <div className="mobile-stat-total">المتبقي 0</div>
                  </div>
                  <div className="mobile-stat-item">
                    <div className="mobile-stat-label">
                      <span className="mobile-stat-icon paid">
                        <CheckCircle size={12} />
                      </span>
                      <span>المدفوع</span>
                    </div>
                    <div className="mobile-stat-value success">0</div>
                    <div className="mobile-stat-total">لا توجد مدفوعات</div>
                  </div>
                </>
              )}
              
              <div className="mobile-stat-item">
                <div className="mobile-stat-label">
                  <span className="mobile-stat-icon messages">
                    <MessageCircle size={12} />
                  </span>
                  <span>الرسائل غير المقروءة</span>
                </div>
                <div className="mobile-stat-value warning">{unreadMessages}</div>
                <div className="mobile-stat-total">التواصل المباشر</div>
              </div>
            </div>
          </div>
          
          {/* Desktop Stats Cards */}
          <Link href="/client-portal/cases">
            <a className="stat-card glass-card stat-cases animate-card-1">
              <div className="stat-card-header">
                <div className="stat-icon-wrap">
                  <Briefcase size={20} />
                </div>
                <span className="stat-label">القضايا النشطة</span>
              </div>
              <div className="stat-content">
                <span className="stat-value">{activeCases.length}</span>
              </div>
              <div className="stat-progress-bar">
                <div className="progress-fill" style={{ width: `${(activeCases.length / (cases.length || 1)) * 100}%` }} />
              </div>
              <div className="stat-total">إجمالي {cases.length} قضايا</div>
            </a>
          </Link>

          <Link href="/client-portal/sessions">
            <a className="stat-card glass-card stat-sessions animate-card-2">
              <div className="stat-card-header">
                <div className="stat-icon-wrap">
                  <Calendar size={20} />
                </div>
                <span className="stat-label">الجلسة القادمة</span>
              </div>
              <div className="stat-content">
                <span className="stat-value highlight">
                  {nextSession ? formatDate(nextSession.sessiondate) : 'لا يوجد'}
                </span>
              </div>
              <div className="stat-total">{upcomingSessions.length} جلسة مجدولة</div>
            </a>
          </Link>

          {Object.entries(financialSummaries).length > 0 ? (
            Object.entries(financialSummaries).map(([curr, summary], index) => (
              <React.Fragment key={curr}>
                <Link href="/client-portal/financials">
                  <a className={`stat-card glass-card stat-financial animate-card-${3 + index}`}>
                    <div className="stat-card-header">
                      <div className="stat-icon-wrap">
                        <DollarSign size={20} />
                      </div>
                      <span className="stat-label">الرسوم ({curr})</span>
                    </div>
                    <div className="stat-content">
                      <span className="stat-value">
                        {formatCurrency(summary.totalFees, curr)}
                      </span>
                    </div>
                    <div className="stat-total">
                      المتبقي {formatCurrency(summary.remaining, curr)}
                    </div>
                  </a>
                </Link>

                <Link href="/client-portal/financials">
                  <a className={`stat-card glass-card stat-paid animate-card-${3 + index}`}>
                    <div className="stat-card-header">
                      <div className="stat-icon-wrap">
                        <CheckCircle size={20} />
                      </div>
                      <span className="stat-label">المدفوع ({curr})</span>
                    </div>
                    <div className="stat-content">
                      <span className="stat-value text-success">
                        {formatCurrency(summary.totalPaid, curr)}
                      </span>
                    </div>
                    <div className="stat-total">
                      إجمالي المدفوعات
                    </div>
                  </a>
                </Link>
              </React.Fragment>
            ))
          ) : (
            <>
              <div className="stat-card glass-card stat-financial animate-card-3">
                <div className="stat-card-header">
                  <div className="stat-icon-wrap">
                    <DollarSign size={20} />
                  </div>
                  <span className="stat-label">الرسوم</span>
                </div>
                <div className="stat-content">
                  <span className="stat-value">0</span>
                </div>
                <div className="stat-total">المتبقي 0</div>
              </div>
              <div className="stat-card glass-card stat-paid animate-card-3">
                <div className="stat-card-header">
                  <div className="stat-icon-wrap">
                    <CheckCircle size={20} />
                  </div>
                  <span className="stat-label">المدفوع</span>
                </div>
                <div className="stat-content">
                  <span className="stat-value text-success">0</span>
                </div>
                <div className="stat-total">لا توجد مدفوعات</div>
              </div>
            </>
          )}

          <Link href="/client-portal/messages">
            <a className="stat-card glass-card stat-messages animate-card-4">
              <div className="stat-card-header">
                <div className="stat-icon-wrap">
                  <MessageCircle size={20} />
                  {unreadMessages > 0 && <span className="notification-dot" />}
                </div>
                <span className="stat-label">رسائل غير مقروءة</span>
              </div>
              <div className="stat-content">
                <span className="stat-value">{unreadMessages}</span>
              </div>
              <div className="stat-total">تواصل مباشر مع المحامي</div>
            </a>
          </Link>
        </div>

        {/* Content Sections */}
        <div className="content-grid">
          {/* Latest Updates */}
          <div className="section-card glass-card animate-slide-up-1">
            <div className="section-header">
              <div className="section-title-wrap">
                <div className="section-icon-box updates">
                   <Clock size={18} />
                </div>
                <h2>آخر التحديثات</h2>
              </div>
              <Link href="/client-portal/cases">
                <a className="see-all-btn">
                  عرض الكل
                  <ChevronLeft size={16} />
                </a>
              </Link>
            </div>
            <div className="section-body">
              {updates.length === 0 ? (
                <div className="empty-section">
                  <div className="empty-illustration">
                    <AlertCircle size={32} opacity={0.3} />
                  </div>
                  <p>لا توجد تحديثات جديدة حالياً</p>
                </div>
              ) : (
                <div className="updates-list">
                  {updates.map((update, i) => (
                    <Link href={update.case_id ? `/client-portal/case-details?id=${update.case_id}` : '/client-portal/cases'} key={update.id || i}>
                      <a className="update-item">
                        <div className="update-timeline">
                           <div className="update-dot" />
                           <div className="update-line" />
                        </div>
                        <div className="update-content">
                          <p className="update-text">{update.update_details || 'تحديث حالة القضية'}</p>
                          <div className="update-meta">
                            <span className="update-case-tag">قضية #{update.case_number}</span>
                            <span className="update-time-tag">{formatTimeAgo(update.update_date)}</span>
                          </div>
                        </div>
                        <ChevronLeft size={16} className="item-arrow" />
                      </a>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Sessions */}
          <div className="section-card glass-card animate-slide-up-2">
            <div className="section-header">
              <div className="section-title-wrap">
                <div className="section-icon-box sessions">
                   <Calendar size={18} />
                </div>
                <h2>جلسات المحكمة</h2>
              </div>
              <Link href="/client-portal/sessions">
                <a className="see-all-btn">
                  عرض الكل
                  <ChevronLeft size={16} />
                </a>
              </Link>
            </div>
            <div className="section-body">
              {upcomingSessions.length === 0 ? (
                <div className="empty-section">
                   <Calendar size={32} opacity={0.3} />
                  <p>لا توجد جلسات مجدولة حالياً</p>
                </div>
              ) : (
                <div className="sessions-list">
                  {upcomingSessions.slice(0, 4).map((session, i) => (
                    <Link href={session.case_id ? `/client-portal/case-details?id=${session.case_id}` : '/client-portal/sessions'} key={session.id || i}>
                      <a className="session-item-v2">
                        <div className="session-day-card">
                          <span className="sd-day">{new Date(session.sessiondate).getDate()}</span>
                          <span className="sd-month">
                            {new Date(session.sessiondate).toLocaleDateString('ar-IQ', { month: 'short' })}
                          </span>
                        </div>
                        <div className="session-details">
                          <p className="session-title">{session.sessionname || `جلسة استماع - #${session.case_number}`}</p>
                          <div className="session-info-row">
                            <span className="session-case">قضية #{session.case_number}</span>
                            {session.court && <span className="session-court">• {session.court}</span>}
                          </div>
                        </div>
                        <ChevronLeft size={16} className="item-arrow" />
                      </a>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cases Overview */}
        {cases.length > 0 && (
          <div className="section-card cases-full-card glass-card animate-slide-up-3">
            <div className="section-header">
              <div className="section-title-wrap">
                <div className="section-icon-box cases">
                   <Briefcase size={18} />
                </div>
                <h2>القضايا القانونية</h2>
              </div>
              <Link href="/client-portal/cases">
                <a className="see-all-btn">
                   عرض التفاصيل
                  <ChevronLeft size={16} />
                </a>
              </Link>
            </div>
            <div className="section-body">
              <div className="cases-modern-grid">
                {cases.slice(0, 4).map((c, i) => {
                  const isCompleted = (c.caseState || '').includes('مكتملة') || (c.caseState || '').includes('مغلقة');
                  return (
                    <Link href={`/client-portal/case-details?id=${c.id}`} key={c.id || i}>
                      <a className="case-modern-card row-layout">
                        <div className="cmc-header">
                          <span className="cmc-id">#{c.case_number}</span>
                          <span className={`status-pill ${isCompleted ? 'closed' : 'active'}`}>
                            {isCompleted ? 'مغلقة' : 'قيد المتابعة'}
                          </span>
                        </div>
                        <div className="cmc-body">
                           <div className="info-row">
                             <span className="info-label">نوع القضية</span>
                             <span className="info-value">{c.caseType || c.caseType2 || 'قضية قانونية'}</span>
                           </div>
                           {c.caseSubject && (
                             <div className="info-row">
                               <span className="info-label">موضوع القضية</span>
                               <span className="info-value">{c.caseSubject}</span>
                             </div>
                           )}
                           <div className="info-row">
                             <span className="info-label">تاريخ التكليف</span>
                             <span className="info-value">{formatDate(c.caseDate)}</span>
                           </div>
                           {(c.totalAmount || c.totalAmount === 0) && (
                             <div className="info-row">
                               <span className="info-label">قيمة الدعوى</span>
                               <span className="info-value">{formatCurrency(parseFloat(c.totalAmount), c.currency || 'IQD')}</span>
                             </div>
                           )}
                           <div className="info-row">
                             <span className="info-label">حالة الدعوى</span>
                             <span className="info-value">{c.caseState || 'جارية'}</span>
                           </div>
                        </div>
                      </a>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .cp-dashboard {
          animation: fadeIn 0.6s ease-out;
          font-family: 'Cairo', sans-serif;
          background: transparent;
          padding: 24px 32px;
          max-width: 1800px;
          margin: 0 auto;
        }

        /* Extra Large Screens - 27-inch+ monitors (> 1600px) */
        @media (min-width: 1600px) {
          .cp-dashboard {
            padding: 32px 48px;
            max-width: 1800px;
          }

          .welcome-title {
            font-size: 32px;
          }

          .stats-grid {
            gap: 16px;
          }

          .stat-card {
            padding: 24px 28px;
          }

          .section-card {
            border-radius: 12px;
          }

          .section-header {
            padding: 28px 28px 16px;
          }

          .section-body {
            padding: 12px 28px 28px;
          }
        }

        /* Large Screens - Large laptops (1440px - 1600px) */
        @media (min-width: 1440px) and (max-width: 1599px) {
          .cp-dashboard {
            padding: 24px 40px;
            max-width: 1600px;
          }

          .welcome-title {
            font-size: 28px;
          }

          .stats-grid {
            gap: 14px;
          }

          .stat-card {
            padding: 22px 26px;
          }
        }

        /* Laptop Screens (1024px - 1439px) */
        @media (min-width: 1024px) and (max-width: 1439px) {
          .cp-dashboard {
            padding: 20px 32px;
            max-width: 1400px;
          }

          .welcome-title {
            font-size: 26px;
          }

          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
          }

          .stat-card {
            padding: 18px 22px;
          }
        }

        /* Tablet Screens (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .cp-dashboard {
            padding: 18px 24px;
            max-width: 100%;
          }

          .welcome-title {
            font-size: 24px;
          }

          .welcome-text-area {
            max-width: 100%;
          }

          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }

          .stat-card {
            padding: 16px 18px;
          }

          .stat-label {
            font-size: 13px;
          }

          .stat-value {
            font-size: 18px;
          }

          .content-grid {
            grid-template-columns: 1fr;
          }

          .section-header {
            padding: 20px 20px 12px;
          }

          .section-body {
            padding: 8px 20px 20px;
          }

          .cases-modern-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Mobile Landscape (480px - 767px) */
        @media (min-width: 480px) and (max-width: 767px) {
          .cp-dashboard {
            padding: 16px 20px;
          }

          .welcome-title {
            font-size: 22px;
          }

          .welcome-banner {
            padding: 16px 20px;
          }

          .welcome-text-area {
            max-width: 100%;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }

          .content-grid {
            grid-template-columns: 1fr;
          }

          .section-header {
            padding: 18px 18px 12px;
          }

          .section-body {
            padding: 8px 18px 18px;
          }

          .cases-modern-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Mobile Portrait (< 480px) */
        @media (max-width: 479px) {
          .cp-dashboard {
            padding: 12px calc(16px + env(safe-area-inset-right, 0px)) 12px calc(16px + env(safe-area-inset-left, 0px));
            overflow-x: hidden;
            max-width: 100%;
            width: 100%;
            box-sizing: border-box;
          }

          .welcome-title {
            font-size: 20px;
          }

          .welcome-banner {
            padding: 14px calc(16px + env(safe-area-inset-right, 0px)) 14px calc(16px + env(safe-area-inset-left, 0px));
            border-radius: 16px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            margin: 0;
          }

          /* Hide all desktop cards on mobile */
          .stat-card {
            display: none !important;
          }

          .content-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            margin: 0;
          }

          .section-card {
            border-radius: 12px;
            margin: 0;
          }

          .section-header {
            padding: 16px 16px 12px;
          }

          .section-body {
            padding: 8px 16px 16px;
          }

          .cases-modern-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .case-modern-card {
            padding: 14px;
            border-radius: 14px;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .animate-slide-down { animation: slideDown 0.5s ease-out forwards; }
        .animate-card-1 { animation: scaleIn 0.4s ease-out 0.1s both; }
        .animate-card-2 { animation: scaleIn 0.4s ease-out 0.2s both; }
        .animate-card-3 { animation: scaleIn 0.4s ease-out 0.3s both; }
        .animate-card-4 { animation: scaleIn 0.4s ease-out 0.4s both; }
        .animate-slide-up-1 { animation: slideUp 0.5s ease-out 0.3s both; }
        .animate-slide-up-2 { animation: slideUp 0.5s ease-out 0.4s both; }
        .animate-slide-up-3 { animation: slideUp 0.5s ease-out 0.5s both; }

        /* ===== UTILS ===== */
        .glass-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        /* ===== WELCOME BANNER ===== */
        .welcome-banner {
          position: relative;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 24px 32px;
          margin-bottom: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
        }

        /* Extra Large Screens - 27-inch+ monitors (> 1600px) */
        @media (min-width: 1600px) {
          .welcome-banner {
            padding: 28px 36px;
            margin-bottom: 20px;
            border-radius: 28px;
          }
        }

        /* Large Screens - Large laptops (1440px - 1600px) */
        @media (min-width: 1440px) and (max-width: 1599px) {
          .welcome-banner {
            padding: 24px 32px;
            margin-bottom: 18px;
          }
        }

        /* Laptop Screens (1024px - 1439px) */
        @media (min-width: 1024px) and (max-width: 1439px) {
          .welcome-banner {
            padding: 20px 28px;
            margin-bottom: 16px;
          }
        }

        /* Tablet Screens (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .welcome-banner {
            padding: 18px 24px;
            margin-bottom: 14px;
            border-radius: 20px;
          }
        }

        /* Mobile Landscape (480px - 767px) */
        @media (min-width: 480px) and (max-width: 767px) {
          .welcome-banner {
            padding: 16px 20px;
            margin-bottom: 12px;
            border-radius: 18px;
          }
        }

        /* Mobile Portrait (< 480px) */
        @media (max-width: 479px) {
          .welcome-banner {
            padding: 14px 16px;
            margin-bottom: 12px;
            border-radius: 16px;
          }
        }

        .welcome-banner-content {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .welcome-text-area {
          max-width: 60%;
        }

        .welcome-title {
          font-size: 26px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.5px;
        }
        
        @media (max-width: 768px) {
          .welcome-title {
            font-size: 22px;
          }
        }
        
        @media (max-width: 480px) {
          .welcome-title {
            font-size: 20px;
          }
        }

        .glass-tag {
          font-size: 13px;
          color: #334155;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          padding: 12px 24px;
          border-radius: 14px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
        }
        
        @media (max-width: 768px) {
          .glass-tag {
            padding: 10px 20px;
            font-size: 12px;
          }
        }
        
        @media (max-width: 480px) {
          .glass-tag {
            padding: 8px 16px;
            font-size: 11px;
            width: 100%;
            justify-content: center;
          }
        }

        .banner-shape {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          z-index: 1;
        }

        .shape-1 {
          width: 300px;
          height: 300px;
          background: rgba(59, 130, 246, 0.3);
          top: -100px;
          right: -50px;
        }

        .shape-2 {
          width: 250px;
          height: 250px;
          background: rgba(124, 58, 237, 0.2);
          bottom: -80px;
          left: 50px;
        }

        /* ===== STATS GRID ===== */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin-bottom: 16px;
          width: 100%;
        }

        /* Extra Large Screens - 27-inch+ monitors (> 1600px) */
        @media (min-width: 1600px) {
          .stats-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: 16px;
          }
        }

        /* Large Screens - Large laptops (1440px - 1600px) */
        @media (min-width: 1440px) and (max-width: 1599px) {
          .stats-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: 14px;
          }
        }

        /* Laptop Screens (1024px - 1439px) */
        @media (min-width: 1024px) and (max-width: 1439px) {
          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
          }
        }

        /* Tablet Screens (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }
        }

        /* Mobile Landscape (480px - 767px) */
        @media (min-width: 480px) and (max-width: 767px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
        }

        /* Mobile Portrait (< 480px) */
        @media (max-width: 479px) {
          .stats-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            margin: 0;
          }
          
          /* Hide all desktop cards on mobile */
          .stat-card {
            display: none !important;
          }
          
          /* Unified Mobile Stats Card - Centered Full Width */
          .mobile-stats-card {
            display: block !important;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            padding: 20px calc(16px + env(safe-area-inset-right, 0px)) 20px calc(16px + env(safe-area-inset-left, 0px));
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
            position: relative;
            overflow: hidden;
            width: 100%;
            margin: 0 auto;
            max-width: 95%;
          }
          
          .mobile-stats-card::before {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(to bottom, #3B82F6, #7c3aed, #059669, #d97706);
            border-radius: 0 16px 16px 0;
          }
          
          .mobile-stats-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #f1f5f9;
          }
          
          .mobile-stats-title {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
          }
          
          .mobile-stats-grid {
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: 100%;
          }
          
          .mobile-stat-item {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding-bottom: 12px;
            border-bottom: 1px solid #f1f5f9;
          }

          .mobile-stat-item:last-child {
            border-bottom: none;
            padding-bottom: 0;
          }
          
          .mobile-stat-label {
            font-size: 15px;
            color: #1e293b;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .mobile-stat-value {
            font-size: 20px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.2px;
          }
          
          .mobile-stat-value.highlight { color: #7c3aed; }
          .mobile-stat-value.success { color: #059669; }
          .mobile-stat-value.warning { color: #d97706; }
          
          .mobile-stat-icon {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            flex-shrink: 0;
          }
          
          .mobile-stat-icon.cases { background: linear-gradient(135deg, #EFF6FF, #e0eeff); color: #2563eb; }
          .mobile-stat-icon.sessions { background: linear-gradient(135deg, #F5F3FF, #ede9fe); color: #7c3aed; }
          .mobile-stat-icon.financial { background: linear-gradient(135deg, #F8FAFC, #f1f5f9); color: #475569; }
          .mobile-stat-icon.paid { background: linear-gradient(135deg, #ECFDF5, #d1fae5); color: #059669; }
          .mobile-stat-icon.messages { background: linear-gradient(135deg, #FFFBEB, #fef3c7); color: #d97706; }
          
          .mobile-stat-total {
            display: none;
          }
          
          .mobile-progress-bar {
            height: 6px;
            background: #f1f5f9;
            border-radius: 10px;
            overflow: hidden;
            margin-top: 4px;
          }
          
          .mobile-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #60a5fa);
            border-radius: 10px;
            transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
          }
        }
        
        /* Hide mobile stats card on desktop */
        .mobile-stats-card {
          display: none;
        }

        .stat-card {
          border-radius: 12px;
          padding: 20px 24px;
          text-decoration: none;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
          overflow: hidden;
          width: 100%;
          max-width: none;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(to bottom, #3B82F6, #1E3A8A);
          border-radius: 0 16px 16px 0;
        }

        .stat-cases::before { background: linear-gradient(to bottom, #3B82F6, #1E3A8A); }
        .stat-sessions::before { background: linear-gradient(to bottom, #7c3aed, #5b21b6); }
        .stat-financial::before { background: linear-gradient(to bottom, #475569, #1e293b); }
        .stat-paid::before { background: linear-gradient(to bottom, #059669, #047857); }
        .stat-messages::before { background: linear-gradient(to bottom, #d97706, #b45309); }

        .stat-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
        }

        .stat-card:active {
          transform: translateY(0);
        }

        .stat-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .stat-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        @media (max-width: 480px) {
          .stat-icon-wrap {
            width: 32px;
            height: 32px;
          }
        }

        .notification-dot {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 10px;
          height: 10px;
          background: #ef4444;
          border-radius: 50%;
          border: 2px solid white;
        }

        .stat-cases .stat-icon-wrap { background: linear-gradient(135deg, #EFF6FF, #e0eeff); color: #2563eb; }
        .stat-sessions .stat-icon-wrap { background: linear-gradient(135deg, #F5F3FF, #ede9fe); color: #7c3aed; }
        .stat-financial .stat-icon-wrap { background: linear-gradient(135deg, #F8FAFC, #f1f5f9); color: #475569; }
        .stat-paid .stat-icon-wrap { background: linear-gradient(135deg, #ECFDF5, #d1fae5); color: #059669; }
        .stat-messages .stat-icon-wrap { background: linear-gradient(135deg, #FFFBEB, #fef3c7); color: #d97706; }

        .stat-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: #64748b;
          font-weight: 700;
        }
        
        @media (max-width: 480px) {
          .stat-label {
            font-size: 13px;
          }
        }

        .stat-value {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.3px;
        }
        
        @media (max-width: 480px) {
          .stat-value {
            font-size: 18px;
          }
        }
        
        .stat-value.highlight { color: #7c3aed; font-size: 20px; }
        
        @media (max-width: 480px) {
          .stat-value.highlight {
            font-size: 18px;
          }
        }

        .stat-progress-bar {
          height: 6px;
          background: #f1f5f9;
          border-radius: 10px;
          overflow: hidden;
          margin-top: 4px;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          border-radius: 10px;
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @media (max-width: 480px) {
          .progress-fill {
            height: 8px;
          }
        }

        .stat-total {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 600;
        }
        
        @media (max-width: 480px) {
          .stat-total {
            font-size: 11px;
          }
        }
        
        .text-success { color: #059669; }

        /* ===== CONTENT GRID ===== */
        .content-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        /* Extra Large Screens - 27-inch+ monitors (> 1600px) */
        @media (min-width: 1600px) {
          .content-grid {
            gap: 16px;
            margin-bottom: 20px;
          }
        }

        /* Large Screens - Large laptops (1440px - 1600px) */
        @media (min-width: 1440px) and (max-width: 1599px) {
          .content-grid {
            gap: 14px;
            margin-bottom: 18px;
          }
        }

        /* Laptop Screens (1024px - 1439px) */
        @media (min-width: 1024px) and (max-width: 1439px) {
          .content-grid {
            gap: 12px;
            margin-bottom: 16px;
          }
        }

        /* Tablet Screens (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .content-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 14px;
          }
        }

        /* Mobile Landscape (480px - 767px) */
        @media (min-width: 480px) and (max-width: 767px) {
          .content-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 12px;
          }
        }

        /* Mobile Portrait (< 480px) */
        @media (max-width: 479px) {
          .content-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            margin: 0;
          }
        }

        .section-card {
          border-radius: 8px;
          overflow: hidden;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
          width: 100%;
        }
        
        @media (max-width: 768px) {
          .section-card {
            border-radius: 8px;
            margin: 0;
            width: 100%;
          }
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 24px 12px;
        }

        .section-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .section-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .section-icon-box.updates { background: #f8fafc; color: #334155; }
        .section-icon-box.sessions { background: #fdf4ff; color: #d946ef; }
        .section-icon-box.cases { background: #eff6ff; color: #3b82f6; }

        .section-title-wrap h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          color: #1e293b;
        }

        .see-all-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          color: #3B82F6;
          text-decoration: none;
          padding: 8px 16px;
          background: #3b82f60a;
          border-radius: 10px;
          transition: all 0.2s;
        }

        .see-all-btn:hover { background: #3b82f615; color: #1e3a8a; }

        .section-body { padding: 8px 24px 24px; }

        /* ===== UPDATES LIST ===== */
        .updates-list { display: flex; flex-direction: column; position: relative; gap: 8px; }
        
        .update-item {
          display: flex;
          gap: 12px;
          padding: 10px 14px;
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
          transition: all 0.2s ease;
          text-decoration: none;
          cursor: pointer;
        }

        .update-item:hover {
          border-color: #bfdbfe;
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.06);
          transform: translateY(-2px);
        }

        .update-timeline {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 6px;
          flex-shrink: 0;
        }
        
        .update-dot { width: 10px; height: 10px; border-radius: 50%; background: #3B82F6; border: 2px solid white; box-shadow: 0 0 0 3px #3b82f620; z-index: 1; }
        .update-line { width: 2px; flex: 1; background: #f1f5f9; margin-top: 4px; }
        .update-item:last-child .update-line { display: none; }

        .update-content { flex: 1; }
        .update-text { margin: 0 0 6px; font-size: 14px; font-weight: 600; color: #1e293b; line-height: 1.4; }

        .update-meta { display: flex; gap: 16px; align-items: center; }
        .update-case-tag { font-size: 11px; font-weight: 700; color: #3b82f6; background: #eff6ff; padding: 3px 8px; border-radius: 6px; }
        .update-time-tag { font-size: 12px; color: #94a3b8; font-weight: 500; }

        /* ===== SESSIONS V2 ===== */
        .sessions-list { display: flex; flex-direction: column; gap: 8px; }
        
        .session-item-v2 {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
          transition: all 0.2s ease;
          text-decoration: none;
          cursor: pointer;
        }
        
        .session-item-v2:hover {
          border-color: #c7d2fe;
          box-shadow: 0 6px 16px rgba(79, 70, 229, 0.06);
          transform: translateY(-2px);
        }
        
        .session-day-card {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid #eef2ff;
          flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(79, 70, 229, 0.05);
        }

        .sd-day { font-size: 22px; font-weight: 900; color: #4f46e5; line-height: 1; }
        .sd-month { font-size: 11px; font-weight: 700; color: #94a3b8; margin-top: 2px; }

        .session-details { flex: 1; min-width: 0; }
        .session-title { margin: 0 0 6px; font-size: 15px; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .session-info-row { display: flex; gap: 10px; font-size: 12px; color: #64748b; font-weight: 500; }
        .item-arrow { color: #cbd5e1; flex-shrink: 0; }

        /* ===== MODERN CASES GRID ===== */
        .cases-modern-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        /* Extra Large Screens - 27-inch+ monitors (> 1600px) */
        @media (min-width: 1600px) {
          .cases-modern-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
          }
        }

        /* Large Screens - Large laptops (1440px - 1600px) */
        @media (min-width: 1440px) and (max-width: 1599px) {
          .cases-modern-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 18px;
          }
        }

        /* Laptop Screens (1024px - 1439px) */
        @media (min-width: 1024px) and (max-width: 1439px) {
          .cases-modern-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
        }

        /* Tablet Screens (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .cases-modern-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
          }
        }

        /* Mobile Landscape (480px - 767px) */
        @media (min-width: 480px) and (max-width: 767px) {
          .cases-modern-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }

        /* Mobile Portrait (< 480px) */
        @media (max-width: 479px) {
          .cases-modern-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }

        .case-modern-card {
          padding: 20px;
          background: #ffffff;
          border-radius: 18px;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        .cmc-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .cmc-id { font-size: 14px; font-weight: 800; color: #3b82f6; }
        .status-pill { font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; }
        .status-pill.active { background: #dcfce7; color: #15803d; }
        .status-pill.closed { background: #f1f5f9; color: #475569; }

        .cmc-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 8px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 8px;
          border-bottom: 1px solid #f8fafc;
        }

        .info-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .info-label {
          font-size: 14px;
          color: #475569;
          font-weight: 700;
        }

        .info-value {
          font-size: 15px;
          color: #0f172a;
          font-weight: 800;
          text-align: left;
        }

        .empty-section { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; color: #94a3b8; gap: 12px; }
        .empty-section p { margin: 0; font-size: 15px; font-weight: 500; }

        /* ===== SECTION CARDS RESPONSIVE ===== */
        /* Extra Large Screens - 27-inch+ monitors (> 1600px) */
        @media (min-width: 1600px) {
          .section-card {
            border-radius: 12px;
          }

          .section-header {
            padding: 28px 28px 16px;
          }

          .section-body {
            padding: 12px 28px 28px;
          }

          .section-title-wrap h2 {
            font-size: 20px;
          }

          .update-item,
          .session-item-v2 {
            padding: 14px 18px;
          }

          .case-modern-card {
            padding: 24px;
            border-radius: 20px;
          }
        }

        /* Large Screens - Large laptops (1440px - 1600px) */
        @media (min-width: 1440px) and (max-width: 1599px) {
          .section-header {
            padding: 24px 24px 14px;
          }

          .section-body {
            padding: 10px 24px 24px;
          }

          .section-title-wrap h2 {
            font-size: 19px;
          }

          .update-item,
          .session-item-v2 {
            padding: 12px 16px;
          }

          .case-modern-card {
            padding: 22px;
            border-radius: 18px;
          }
        }

        /* Laptop Screens (1024px - 1439px) */
        @media (min-width: 1024px) and (max-width: 1439px) {
          .section-header {
            padding: 22px 22px 12px;
          }

          .section-body {
            padding: 8px 22px 22px;
          }

          .section-title-wrap h2 {
            font-size: 18px;
          }
        }

        /* Tablet Screens (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .section-card {
            border-radius: 10px;
          }

          .section-header {
            padding: 20px 20px 12px;
          }

          .section-body {
            padding: 8px 20px 20px;
          }

          .section-title-wrap h2 {
            font-size: 17px;
          }

          .update-item,
          .session-item-v2 {
            padding: 10px 14px;
          }

          .case-modern-card {
            padding: 18px;
            border-radius: 16px;
          }

          .info-label {
            font-size: 13px;
          }

          .info-value {
            font-size: 14px;
          }
        }

        /* Mobile Landscape (480px - 767px) */
        @media (min-width: 480px) and (max-width: 767px) {
          .section-card {
            border-radius: 10px;
          }

          .section-header {
            padding: 18px 18px 12px;
          }

          .section-body {
            padding: 8px 18px 18px;
          }

          .section-title-wrap h2 {
            font-size: 16px;
          }

          .update-item,
          .session-item-v2 {
            padding: 10px 12px;
          }

          .case-modern-card {
            padding: 16px;
            border-radius: 14px;
          }

          .info-label {
            font-size: 13px;
          }

          .info-value {
            font-size: 14px;
          }

          .update-meta {
            gap: 10px;
          }

          .update-time-tag {
            font-size: 11px;
          }

          .see-all-btn {
            padding: 6px 12px;
            font-size: 12px;
          }
        }

        /* Mobile Portrait (< 480px) */
        @media (max-width: 479px) {
          .section-card {
            border-radius: 12px;
          }

          .section-header {
            padding: 16px calc(16px + env(safe-area-inset-right, 0px)) 12px calc(16px + env(safe-area-inset-left, 0px));
          }

          .section-body {
            padding: 8px calc(16px + env(safe-area-inset-right, 0px)) 16px calc(16px + env(safe-area-inset-left, 0px));
          }

          .section-title-wrap h2 {
            font-size: 16px;
          }

          .update-item,
          .session-item-v2 {
            padding: 10px;
          }

          .case-modern-card {
            padding: 14px;
            border-radius: 14px;
          }

          .update-meta {
            gap: 8px;
          }

          .update-time-tag {
            font-size: 11px;
          }

          .see-all-btn {
            padding: 6px 12px;
            font-size: 12px;
          }

          .session-day-card {
            width: 42px;
            height: 42px;
          }

          .sd-day {
            font-size: 20px;
          }

          .sd-month {
            font-size: 10px;
          }

          .session-title {
            font-size: 14px;
          }

          .session-info-row {
            font-size: 11px;
          }
        }
      `}</style>
    </>
  );
};

const DashboardPage = ({ clientAccount }) => (
  <ClientPortalProvider clientAccount={clientAccount}>
    <ClientLayout>
      <DashboardContent />
    </ClientLayout>
  </ClientPortalProvider>
);

export default withClientAuth(DashboardPage);
