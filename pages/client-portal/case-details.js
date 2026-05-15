import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import withClientAuth from '../../lib/withClientAuth';
import { ClientPortalProvider, useClientPortal } from '../../context/ClientPortalContext';
import ClientLayout from '../../components/client-portal/ClientLayout';
import { supabase } from '../../lib/initSupabase';
import {
  Briefcase, Calendar, DollarSign, FileText, Clock,
  ChevronRight, Upload, Download, CheckCircle, TrendingUp, AlertCircle
} from 'lucide-react';

const CaseDetailsContent = () => {
  const router = useRouter();
  const { id } = router.query;
  const { cases, adminId, clientDataId } = useClientPortal();

  const [caseData, setCaseData] = useState(null);
  const [caseSessions, setCaseSessions] = useState([]);
  const [caseUpdates, setCaseUpdates] = useState([]);
  const [casePayments, setCasePayments] = useState([]);
  const [sharedDocs, setSharedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!id || !cases || cases.length === 0) return;

    const foundCase = cases.find(c => String(c.id) === String(id));
    if (!foundCase) {
      setLoading(false);
      return;
    }

    setCaseData(foundCase);
    fetchCaseDetails(foundCase);
  }, [id, cases]);

  const fetchCaseDetails = async (c) => {
    setLoading(true);
    try {
      // Sessions
      const { data: sessData } = await supabase
        .from('sessions')
        .select('*')
        .eq('case_number', c.case_number)
        .eq('user_id', adminId)
        .order('sessiondate', { ascending: false });
      setCaseSessions(sessData || []);

      // Updates
      const { data: updData } = await supabase
        .from('case_update')
        .select('*')
        .eq('case_number', c.case_number)
        .order('update_date', { ascending: false });
      setCaseUpdates(updData || []);

      // Payments from lawyer_fees
      const [lawyerFeesRes, attorneyFeesRes] = await Promise.all([
        supabase.from('lawyer_fees').select('*').eq('case_id', c.id).order('payment_date', { ascending: false }),
        supabase.from('attorneyFees').select('*').eq('case_id', c.id).order('fee_date', { ascending: false })
      ]);

      const combinedPayments = [
        ...(lawyerFeesRes.data || []).map(p => ({
          ...p,
          amount: parseFloat(p.payment_amount) || 0,
          date: p.payment_date,
          details: p.payment_details || 'دفعة أتعاب'
        })),
        ...(attorneyFeesRes.data || []).map(p => ({
          ...p,
          amount: parseFloat(p.fee_amount) || 0,
          date: p.fee_date,
          details: p.fee_details || 'أتعاب محاماة'
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      setCasePayments(combinedPayments);

      // Shared documents
      const { data: docsData } = await supabase
        .from('client_shared_documents')
        .select('*')
        .eq('client_data_id', clientDataId)
        .eq('case_id', c.id)
        .order('created_at', { ascending: false });
      setSharedDocs(docsData || []);

    } catch (err) {
      console.error('Error fetching case details:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d; }
  };

  const formatCurrency = (amount) => {
    const n = parseFloat(amount) || 0;
    return n.toLocaleString('ar-IQ');
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>جاري التحميل...</div>;

  if (!caseData) return (
    <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
      <AlertCircle size={32} />
      <p style={{ marginTop: 12 }}>لم يتم العثور على القضية</p>
    </div>
  );

  const totalFees = parseFloat(caseData.totalAmount) || 0;
  const totalPaid = casePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remaining = totalFees - totalPaid;
  const isCompleted = (caseData.caseState || '').includes('مكتملة') || (caseData.caseState || '').includes('مغلقة');

  const tabs = [
    { key: 'overview', label: 'نظرة عامة', icon: Briefcase },
    { key: 'sessions', label: 'الجلسات', icon: Calendar, count: caseSessions.length },
    { key: 'financial', label: 'المالية', icon: DollarSign },
    { key: 'documents', label: 'المستندات', icon: FileText, count: sharedDocs.length },
  ];

  return (
    <>
      <Head><title>قضية #{caseData.case_number} - بوابة الموكل | محامي برو</title></Head>
      <div className="case-details-page">
        {/* Back link */}
        <button className="back-link" onClick={() => router.push('/client-portal/cases')}>
          <ChevronRight size={18} />
          <span>العودة للقضايا</span>
        </button>

        {/* Case Header Card */}
        <div className="case-header-card">
          <div className="case-header-top">
            <div>
              <h1>قضية #{caseData.case_number}</h1>
              <p className="case-type-text">{caseData.caseType || caseData.caseType2 || 'غير محدد'}</p>
            </div>
            <span className={`status-badge ${isCompleted ? 'completed' : 'active'}`}>
              {isCompleted ? <><CheckCircle size={14} /> مكتملة</> : <><TrendingUp size={14} /> {caseData.caseState || 'نشطة'}</>}
            </span>
          </div>
          <div className="case-info-row">
            {caseData.caseSubject && <div className="info-chip" title="موضوع القضية">📄 {caseData.caseSubject}</div>}
            {(caseData.totalAmount || caseData.totalAmount === 0) && (
              <div className="info-chip" title="قيمة الدعوى">
                💰 {parseFloat(caseData.totalAmount).toLocaleString('ar-IQ')} {caseData.currency === 'USD' ? 'دولار أمريكي' : (caseData.currency || 'دينار عراقي')}
              </div>
            )}
            {caseData.court && <div className="info-chip" title="المحكمة">🏛 {caseData.court}</div>}
            {caseData.caseLawyerName && <div className="info-chip" title="المحامي">👤 {caseData.caseLawyerName}</div>}
            <div className="info-chip" title="تاريخ الإضافة">📅 {formatDate(caseData.created_at)}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-bar">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
                <Icon size={16} />
                <span>{t.label}</span>
                {t.count > 0 && <span className="tab-count">{t.count}</span>}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="overview-grid">
              {/* Financial Summary */}
              <div className="mini-card">
                <h3><DollarSign size={18} /> الملخص المالي</h3>
                <div className="fin-row"><span>أتعاب القضية</span><span className="fin-val">{formatCurrency(totalFees)} {caseData.currency || 'IQD'}</span></div>
                <div className="fin-row"><span>المدفوع</span><span className="fin-val" style={{ color: '#10B981' }}>{formatCurrency(totalPaid)}</span></div>
                <div className="fin-row fin-total"><span>المتبقي</span><span className="fin-val">{formatCurrency(remaining)}</span></div>
              </div>

              {/* Latest Updates */}
              <div className="mini-card">
                <h3><Clock size={18} /> آخر التحديثات</h3>
                {caseUpdates.length === 0 ? (
                  <p className="empty-text">لا توجد تحديثات</p>
                ) : (
                  caseUpdates.slice(0, 3).map((u, i) => (
                    <div key={i} className="update-row">
                      <span className="update-dot" />
                      <div>
                        <p className="update-text">{u.update_details}</p>
                        <span className="update-date">{formatDate(u.update_date)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="sessions-tab">
              {caseSessions.length === 0 ? (
                <div className="empty-tab"><Calendar size={24} /><p>لا توجد جلسات</p></div>
              ) : (
                caseSessions.map((s, i) => (
                  <div key={i} className="session-row">
                    <div className="session-date-box">
                      <span className="s-day">{new Date(s.sessiondate).getDate()}</span>
                      <span className="s-month">{new Date(s.sessiondate).toLocaleDateString('ar-IQ', { month: 'short' })}</span>
                      <span className="s-year">{new Date(s.sessiondate).getFullYear()}</span>
                    </div>
                    <div className="session-details">
                      <p className="s-name">{s.sessionname || 'جلسة'}</p>
                      <p className="s-detail">{s.sessiondetails || '-'}</p>
                      {s.next_session_date && (
                        <p className="s-next">الجلسة القادمة: {formatDate(s.next_session_date)}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="financial-tab">
              <div className="fin-summary-cards">
                <div className="fin-card"><span className="fin-label">أتعاب القضية</span><span className="fin-amount">{formatCurrency(totalFees)}</span></div>
                <div className="fin-card green"><span className="fin-label">المدفوع</span><span className="fin-amount">{formatCurrency(totalPaid)}</span></div>
                <div className="fin-card blue"><span className="fin-label">المتبقي</span><span className="fin-amount">{formatCurrency(remaining)}</span></div>
              </div>
              <h3 style={{ margin: '24px 0 12px', fontSize: 16, color: '#1e293b' }}>سجل المدفوعات</h3>
              {casePayments.length === 0 ? (
                <p className="empty-text">لا توجد مدفوعات مسجلة</p>
              ) : (
                <div className="payments-list">
                  {casePayments.map((p, i) => (
                    <div key={i} className="payment-row">
                      <div>
                        <span className="payment-amount">{formatCurrency(p.amount)}</span>
                        <span className="payment-method">{p.details}</span>
                      </div>
                      <span className="payment-date">{formatDate(p.date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="documents-tab">
              {sharedDocs.length === 0 ? (
                <div className="empty-tab"><FileText size={24} /><p>لا توجد مستندات مشاركة لهذه القضية</p></div>
              ) : (
                sharedDocs.map((d, i) => (
                  <div key={i} className="doc-row">
                    <FileText size={18} />
                    <div className="doc-info">
                      <span className="doc-name">{d.document_name}</span>
                      <span className="doc-date">{formatDate(d.created_at)}</span>
                    </div>
                    {d.document_url && (
                      <a href={d.document_url} target="_blank" rel="noopener noreferrer" className="doc-download"><Download size={16} /></a>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .case-details-page { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .back-link { display: flex; align-items: center; gap: 6px; background: none; border: none; color: #3B82F6; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; padding: 8px 12px; margin-bottom: 16px; border-radius: 8px; transition: all 0.2s ease; min-height: 44px; }
        .back-link:hover { background: #f1f5f9; color: #1E3A8A; }
        .back-link:active { transform: scale(0.98); }
        
        @media (max-width: 768px) {
          .back-link {
            padding: 10px 16px;
            font-size: 15px;
          }
        }

        .case-header-card { background: white; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
        .case-header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 16px; }
        .case-header-top h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
        .case-type-text { font-size: 15px; color: #64748b; margin: 0; }
        
        @media (max-width: 768px) {
          .case-header-card {
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 16px;
          }
          .case-header-top {
            flex-direction: column;
            gap: 12px;
          }
          .case-header-top h1 {
            font-size: 20px;
          }
          .case-type-text {
            font-size: 14px;
          }
        }

        .status-badge { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; transition: all 0.2s ease; }
        .status-badge.active { background: #EFF6FF; color: #3B82F6; }
        .status-badge.completed { background: #ECFDF5; color: #10B981; }
        
        @media (max-width: 768px) {
          .status-badge {
            padding: 6px 12px;
            font-size: 12px;
          }
        }

        .case-info-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .info-chip { font-size: 13px; color: #64748b; background: #f8fafc; padding: 6px 12px; border-radius: 6px; border: 1px solid #f1f5f9; white-space: nowrap; }
        
        @media (max-width: 768px) {
          .case-info-row {
            gap: 8px;
          }
          .info-chip {
            font-size: 12px;
            padding: 4px 10px;
          }
        }

        .tabs-bar { display: flex; gap: 4px; background: white; padding: 4px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .tab { display: flex; align-items: center; gap: 6px; padding: 12px 20px; border: none; background: none; border-radius: 8px; font-size: 14px; font-weight: 500; color: #64748b; cursor: pointer; font-family: inherit; transition: all 0.2s; white-space: nowrap; min-height: 44px; }
        .tab:hover { background: #f1f5f9; }
        .tab.active { background: #3B82F6; color: white; }
        .tab-count { font-size: 11px; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px; }
        .tab.active .tab-count { background: rgba(255,255,255,0.25); }
        
        @media (max-width: 768px) {
          .tabs-bar {
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE/Edge */
          }
          .tabs-bar::-webkit-scrollbar {
            display: none; /* Chrome/Safari */
          }
          .tab {
            padding: 10px 16px;
            font-size: 13px;
          }
          .tab-count {
            font-size: 10px;
            padding: 1px 4px;
          }
        }

        .tab-content { background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; }

        .overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .mini-card { padding: 20px; border: 1px solid #f1f5f9; border-radius: 12px; }
        .mini-card h3 { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 16px; }
        
        @media (max-width: 768px) {
          .overview-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .mini-card {
            padding: 16px;
            border-radius: 10px;
          }
          .mini-card h3 {
            font-size: 14px;
            margin-bottom: 12px;
          }
        }

        .fin-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f8fafc; font-size: 14px; color: #64748b; }
        .fin-val { font-weight: 700; color: #1e293b; }
        .fin-total { border-top: 2px solid #e2e8f0; border-bottom: none; font-weight: 700; color: #0f172a; margin-top: 4px; padding-top: 12px; }
        
        @media (max-width: 768px) {
          .fin-row {
            padding: 8px 0;
            font-size: 13px;
          }
          .fin-total {
            padding-top: 10px;
          }
        }

        .update-row { display: flex; gap: 12px; padding: 10px 0; }
        .update-dot { width: 8px; height: 8px; border-radius: 50%; background: #3B82F6; margin-top: 8px; flex-shrink: 0; }
        .update-text { margin: 0; font-size: 13px; color: #1e293b; line-height: 1.4; }
        .update-date { font-size: 11px; color: #94a3b8; }
        
        @media (max-width: 768px) {
          .update-row {
            padding: 8px 0;
            gap: 10px;
          }
          .update-text {
            font-size: 12px;
          }
        }

        .empty-text { color: #94a3b8; font-size: 14px; text-align: center; padding: 20px; }
        .empty-tab { text-align: center; padding: 40px; color: #94a3b8; }
        .empty-tab p { margin: 8px 0 0; }

        .session-row { display: flex; gap: 16px; padding: 16px 0; border-bottom: 1px solid #f8fafc; }
        .session-date-box { min-width: 64px; text-align: center; background: #EFF6FF; border-radius: 12px; padding: 12px 8px; border: 1px solid #BFDBFE; }
        .s-day { display: block; font-size: 24px; font-weight: 800; color: #1E3A8A; line-height: 1; }
        .s-month { display: block; font-size: 12px; font-weight: 600; color: #3B82F6; margin-top: 2px; }
        .s-year { display: block; font-size: 10px; color: #94a3b8; margin-top: 1px; }
        .s-name { font-size: 15px; font-weight: 600; color: #1e293b; margin: 0 0 6px; }
        .s-detail { font-size: 13px; color: #64748b; margin: 0 0 6px; }
        .s-next { font-size: 12px; color: #F59E0B; font-weight: 600; margin: 0; }
        
        @media (max-width: 768px) {
          .session-row {
            padding: 12px 0;
            gap: 12px;
          }
          .session-date-box {
            min-width: 56px;
            padding: 10px 6px;
          }
          .s-day {
            font-size: 20px;
          }
          .s-month {
            font-size: 11px;
          }
          .s-name {
            font-size: 14px;
          }
          .s-detail {
            font-size: 12px;
          }
        }

        .fin-summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .fin-card { background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #e2e8f0; }
        .fin-card.green { background: #ECFDF5; border-color: #D1FAE5; }
        .fin-card.blue { background: #EFF6FF; border-color: #BFDBFE; }
        .fin-label { display: block; font-size: 12px; color: #64748b; margin-bottom: 6px; }
        .fin-amount { display: block; font-size: 20px; font-weight: 800; color: #0f172a; }
        
        @media (max-width: 768px) {
          .fin-summary-cards {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .fin-card {
            padding: 14px;
          }
          .fin-label {
            font-size: 11px;
          }
          .fin-amount {
            font-size: 18px;
          }
        }

        .payments-list { display: flex; flex-direction: column; }
        .payment-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid #f8fafc; }
        .payment-amount { font-size: 15px; font-weight: 700; color: #10B981; }
        .payment-method { font-size: 12px; color: #94a3b8; margin-right: 8px; }
        .payment-date { font-size: 13px; color: #64748b; }
        
        @media (max-width: 768px) {
          .payment-row {
            padding: 12px 0;
          }
          .payment-amount {
            font-size: 14px;
          }
          .payment-method {
            font-size: 11px;
          }
          .payment-date {
            font-size: 12px;
          }
        }

        .doc-row { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 10px; border: 1px solid #f1f5f9; margin-bottom: 8px; transition: all 0.2s ease; }
        .doc-row:hover { background: #f8fafc; }
        .doc-info { flex: 1; }
        .doc-name { display: block; font-size: 14px; font-weight: 600; color: #1e293b; }
        .doc-date { display: block; font-size: 12px; color: #94a3b8; }
        .doc-download { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #EFF6FF; color: #3B82F6; border-radius: 8px; transition: all 0.2s; }
        .doc-download:hover { background: #3B82F6; color: white; }
        
        @media (max-width: 768px) {
          .doc-row {
            padding: 12px;
            gap: 10px;
          }
          .doc-name {
            font-size: 13px;
          }
          .doc-date {
            font-size: 11px;
          }
          .doc-download {
            width: 36px;
            height: 36px;
          }
        }

        @media (max-width: 768px) {
          .overview-grid { grid-template-columns: 1fr; }
          .fin-summary-cards { grid-template-columns: 1fr; }
          .case-header-top { flex-direction: column; gap: 12px; }
          .tabs-bar { -webkit-overflow-scrolling: touch; }
        }
      `}</style>
    </>
  );
};

const ClientCaseDetailsPage = ({ clientAccount }) => (
  <ClientPortalProvider clientAccount={clientAccount}>
    <ClientLayout><CaseDetailsContent /></ClientLayout>
  </ClientPortalProvider>
);

export default withClientAuth(ClientCaseDetailsPage);
