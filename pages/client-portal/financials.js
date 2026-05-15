import { useState, useEffect } from 'react';
import Head from 'next/head';
import withClientAuth from '../../lib/withClientAuth';
import { ClientPortalProvider, useClientPortal } from '../../context/ClientPortalContext';
import ClientLayout from '../../components/client-portal/ClientLayout';
import { supabase } from '../../lib/initSupabase';
import { DollarSign, TrendingUp, CheckCircle, Briefcase } from 'lucide-react';

const FinancialsContent = () => {
  const { cases, loading } = useClientPortal();
  const [casesFinancial, setCasesFinancial] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [currencySummaries, setCurrencySummaries] = useState({});
  
  useEffect(() => {
    const fetchFinancials = async () => {
      if (!cases || cases.length === 0) {
        setDataLoading(false);
        setCurrencySummaries({});
        return;
      }
      setDataLoading(true);
      const results = [];
      const summaries = {};

      for (const c of cases) {
        const curr = c.currency || 'IQD';
        if (!summaries[curr]) {
          summaries[curr] = { totalFees: 0, totalPaid: 0, remaining: 0 };
        }

        const totalFees = parseFloat(c.totalAmount) || 0;
        summaries[curr].totalFees += totalFees;

        const [lawyerFeesRes, attorneyFeesRes] = await Promise.all([
          supabase.from('lawyer_fees').select('payment_amount, payment_date, payment_details').eq('case_id', c.id).order('payment_date', { ascending: false }),
          supabase.from('attorneyFees').select('fee_amount, fee_date, fee_details').eq('case_id', c.id).order('fee_date', { ascending: false })
        ]);

        const combinedPayments = [
          ...(lawyerFeesRes.data || []).map(p => ({ amount: parseFloat(p.payment_amount) || 0, date: p.payment_date, method: p.payment_details || 'دفعة أتعاب' })),
          ...(attorneyFeesRes.data || []).map(p => ({ amount: parseFloat(p.fee_amount) || 0, date: p.fee_date, method: p.fee_details || 'أتعاب محاماة' }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        const totalPaid = combinedPayments.reduce((s, p) => s + p.amount, 0);
        summaries[curr].totalPaid += totalPaid;

        results.push({
          ...c,
          totalFees,
          totalPaid,
          remaining: totalFees - totalPaid,
          payments: combinedPayments
        });
      }

      Object.keys(summaries).forEach(curr => {
        summaries[curr].remaining = summaries[curr].totalFees - summaries[curr].totalPaid;
      });

      setCasesFinancial(results);
      setCurrencySummaries(summaries);
      setDataLoading(false);
    };
    fetchFinancials();
  }, [cases]);

  const fmt = (n) => (parseFloat(n) || 0).toLocaleString('ar-IQ');
  const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d || '-'; } };

  const isLoading = loading || dataLoading;
  if (isLoading) return <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>جاري التحميل...</div>;

  return (
    <>
      <Head><title>الحسابات - بوابة الموكل | محامي برو</title></Head>
      <div className="cp-financials">
        <div className="page-header"><h1><DollarSign size={24} /> الحسابات المالية</h1></div>

        {/* Summary Cards per Currency */}
        {Object.entries(currencySummaries).map(([curr, summary]) => (
          <div key={curr} className="summary-grid">
            <div className="summary-card">
              <div className="sc-icon blue"><DollarSign size={22} /></div>
              <div className="sc-content">
                <span className="sc-label">إجمالي الأتعاب ({curr})</span>
                <span className="sc-value">{fmt(summary.totalFees)} <small>{curr}</small></span>
              </div>
            </div>
            <div className="summary-card">
              <div className="sc-icon green"><CheckCircle size={22} /></div>
              <div className="sc-content">
                <span className="sc-label">إجمالي المدفوع ({curr})</span>
                <span className="sc-value green-text">{fmt(summary.totalPaid)} <small>{curr}</small></span>
              </div>
            </div>
            <div className="summary-card">
              <div className="sc-icon orange"><TrendingUp size={22} /></div>
              <div className="sc-content">
                <span className="sc-label">المتبقي ({curr})</span>
                <span className="sc-value orange-text">{fmt(summary.remaining)} <small>{curr}</small></span>
              </div>
            </div>
          </div>
        ))}

        {/* Per-case breakdown */}
        <div className="section-card">
          <h2><Briefcase size={20} /> تفصيل حسب القضية</h2>
          {casesFinancial.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>لا توجد بيانات مالية</p>
          ) : (
            <div className="case-fin-list">
              {casesFinancial.map((c, i) => (
                <div key={i} className="case-fin-card">
                  <div className="cfc-header">
                    <span className="cfc-number">#{c.case_number}</span>
                    <span className="cfc-type">{c.caseType || 'غير محدد'}</span>
                  </div>
                  <div className="cfc-bars">
                    <div className="cfc-row"><span>الأتعاب</span><span className="cfc-val">{fmt(c.totalFees)}</span></div>
                    <div className="cfc-row"><span>المدفوع</span><span className="cfc-val" style={{ color: '#10B981' }}>{fmt(c.totalPaid)}</span></div>
                    <div className="cfc-row bold"><span>المتبقي</span><span className="cfc-val">{fmt(c.remaining)}</span></div>
                  </div>
                  {c.totalFees > 0 && (
                    <div className="progress-bar-wrap">
                      <div className="progress-bar" style={{ width: `${Math.min((c.totalPaid / c.totalFees) * 100, 100)}%` }} />
                    </div>
                  )}
                  {c.payments.length > 0 && (
                    <div className="cfc-payments">
                      <h4>سجل المدفوعات</h4>
                      {c.payments.slice(0, 3).map((p, j) => (
                        <div key={j} className="cfc-pay-row">
                          <span className="cfc-pay-amount">{fmt(p.amount)}</span>
                          <span className="cfc-pay-date">{fmtDate(p.date)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .cp-financials { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .page-header { margin-bottom: 24px; }
        .page-header h1 { display: flex; align-items: center; gap: 10px; font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
        
        @media (max-width: 768px) {
          .page-header h1 {
            font-size: 20px;
          }
        }

        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
        .summary-card { display: flex; align-items: center; gap: 16px; background: white; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; transition: all 0.2s ease; position: relative; overflow: hidden; width: 100%; }
        .summary-card::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 3px;
          height: 100%;
          border-radius: 0 12px 12px 0;
        }
        .summary-card:nth-child(1)::before { background: linear-gradient(to bottom, #3B82F6, #1E3A8A); }
        .summary-card:nth-child(2)::before { background: linear-gradient(to bottom, #059669, #047857); }
        .summary-card:nth-child(3)::before { background: linear-gradient(to bottom, #F59E0B, #d97706); }
        .summary-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
        }
        .summary-card:active {
          transform: translateY(0);
        }
        
        @media (max-width: 768px) {
          .summary-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .summary-card {
            padding: 20px 16px;
            border-radius: 8px;
            width: 100%;
          }
        }
        .sc-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sc-icon.blue { background: #EFF6FF; color: #3B82F6; }
        .sc-icon.green { background: #ECFDF5; color: #10B981; }
        .sc-icon.orange { background: #FFF7ED; color: #F59E0B; }
        
        @media (max-width: 768px) {
          .sc-icon {
            width: 44px;
            height: 44px;
          }
        }
        .sc-label { display: block; font-size: 13px; color: #64748b; margin-bottom: 2px; }
        .sc-value { font-size: 22px; font-weight: 800; color: #0f172a; }
        .sc-value small { font-size: 13px; font-weight: 500; color: #94a3b8; }
        
        @media (max-width: 768px) {
          .sc-label {
            font-size: 12px;
          }
          .sc-value {
            font-size: 20px;
          }
          .sc-value small {
            font-size: 12px;
          }
        }
        .green-text { color: #10B981 !important; }
        .orange-text { color: #F59E0B !important; }

        .section-card { background: white; border-radius: 8px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03); width: 100%; }
        .section-card h2 { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 700; color: #0f172a; margin: 0 0 20px; }
        
        @media (max-width: 768px) {
          .section-card {
            padding: 20px;
            border-radius: 12px;
          }
          .section-card h2 {
            font-size: 16px;
            margin-bottom: 16px;
          }
        }

        .case-fin-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }
        .case-fin-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; transition: all 0.2s ease; position: relative; overflow: hidden; width: 100%; }
        .case-fin-card::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 3px;
          height: 100%;
          background: linear-gradient(to bottom, #3B82F6, #1E3A8A);
          border-radius: 0 12px 12px 0;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .case-fin-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
          transform: translateY(-1px);
        }
        .case-fin-card:hover::before {
          opacity: 1;
        }
        
        @media (max-width: 768px) {
          .case-fin-list {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .case-fin-card {
            padding: 16px;
            border-radius: 8px;
            width: 100%;
          }
        }
        .cfc-header { display: flex; justify-content: space-between; margin-bottom: 14px; gap: 8px; }
        .cfc-number { font-size: 16px; font-weight: 700; color: #1E3A8A; }
        .cfc-type { font-size: 12px; color: #64748b; }
        
        @media (max-width: 768px) {
          .cfc-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
          .cfc-number {
            font-size: 15px;
          }
          .cfc-type {
            font-size: 11px;
          }
        }
        .cfc-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #64748b; }
        .cfc-row.bold { border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 4px; font-weight: 700; color: #0f172a; }
        .cfc-val { font-weight: 700; color: #1e293b; }
        
        @media (max-width: 768px) {
          .cfc-row {
            padding: 6px 0;
            font-size: 13px;
          }
          .cfc-row.bold {
            padding-top: 8px;
          }
        }
        .progress-bar-wrap { height: 8px; background: #f1f5f9; border-radius: 4px; margin-top: 12px; overflow: hidden; }
        .progress-bar { height: 100%; background: linear-gradient(90deg, #10B981, #34d399); border-radius: 4px; transition: width 0.5s ease; }
        
        @media (max-width: 768px) {
          .progress-bar-wrap {
            height: 6px;
          }
        }
        .cfc-payments { margin-top: 14px; padding-top: 12px; border-top: 1px solid #f1f5f9; }
        .cfc-payments h4 { font-size: 12px; font-weight: 600; color: #64748b; margin: 0 0 8px; }
        .cfc-pay-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
        .cfc-pay-amount { font-weight: 600; color: #10B981; }
        .cfc-pay-date { color: #94a3b8; }
        
        @media (max-width: 768px) {
          .cfc-payments {
            margin-top: 12px;
            padding-top: 10px;
          }
          .cfc-payments h4 {
            font-size: 11px;
          }
          .cfc-pay-row {
            font-size: 12px;
            padding: 4px 0;
          }
        }

        @media (max-width: 768px) {
          .summary-grid { grid-template-columns: 1fr; }
          .case-fin-list { grid-template-columns: 1fr; }
          .page-header h1 { font-size: 20px; }
        }
      `}</style>
    </>
  );
};

const ClientFinancialsPage = ({ clientAccount }) => (
  <ClientPortalProvider clientAccount={clientAccount}><ClientLayout><FinancialsContent /></ClientLayout></ClientPortalProvider>
);
export default withClientAuth(ClientFinancialsPage);
