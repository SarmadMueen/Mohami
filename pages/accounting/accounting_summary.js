import React, { useState, useEffect } from 'react';
import withAuth from '../../lib/withAuth';
import { supabase } from '../../lib/initSupabase';
import { FaChartBar, FaMoneyCheckAlt, FaFileInvoiceDollar, FaHandHoldingUsd } from 'react-icons/fa';
import { FiBarChart2 } from 'react-icons/fi';
import { useRouter } from 'next/router';

const AccountingSummary = () => {
  const [userId, setUserId] = useState(null);
  const [summaryData, setSummaryData] = useState({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserDetails = async () => {
      const user = supabase.auth.user();
      if (user) {
        setUserId(user.id);
      } else {
        router.push('/login');
      }
    };
    fetchUserDetails();
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const fetchSummaryData = async () => {
      try {
        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('expenses_amount, expenses_type, paid_amount, case_id, currency')
          .or(`admin_id.eq.${userId},lawyer_id.eq.${userId}`);

        if (expensesError) {
          console.error('Error fetching expenses:', expensesError);
          setLoading(false);
          return;
        }

        const grouped = {
          'IQD': { totalFees: 0, externalPaidFees: 0, totalPayments: 0 },
          'USD': { totalFees: 0, externalPaidFees: 0, totalPayments: 0 },
          'SAR': { totalFees: 0, externalPaidFees: 0, totalPayments: 0 }
        };

        if (expensesData) {
          expensesData.forEach(exp => {
            const cur = exp.currency || 'IQD';
            if (grouped[cur]) {
              grouped[cur].totalFees += parseFloat(exp.expenses_amount || 0);
              if (exp.expenses_type === 'External Payment') {
                grouped[cur].externalPaidFees += parseFloat(exp.expenses_amount || 0);
              }
              grouped[cur].totalPayments += parseFloat(exp.paid_amount || 0);
            }
          });
        }

        // Calculate totalExpenses and setup active currencies
        const activeCurrencies = {};
        Object.keys(grouped).forEach(cur => {
          const d = grouped[cur];
          d.totalExpenses = d.totalFees + d.externalPaidFees;

          if (d.totalFees > 0 || d.externalPaidFees > 0 || d.totalPayments > 0 || d.totalExpenses > 0) {
            activeCurrencies[cur] = d;
          }
        });

        if (Object.keys(activeCurrencies).length === 0) {
          activeCurrencies['IQD'] = grouped['IQD'];
        }

        setSummaryData(activeCurrencies);
      } catch (error) {
        console.error('Error fetching summary data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryData();
  }, [userId]);

  const getCurrencyText = (currency) => {
    if (currency === 'IQD') return 'دينار';
    if (currency === 'USD') return 'دولار';
    if (currency === 'SAR') return 'ريال';
    return 'دينار'; // Default
  };

  const handlePrint = () => {
    console.log('Print clicked - loading:', loading, 'summaryData:', summaryData);

    if (loading || Object.keys(summaryData).length === 0) {
      alert('الرجاء انتظار تحميل البيانات قبل الطباعة');
      return;
    }

    console.log('Proceeding to print summary');

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for printing');
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');

    // Generate print content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>تقرير المحاسبة</title>
        <style>
          body {
            font-family: 'Cairo', 'Almarai', sans-serif;
            direction: rtl;
            margin: 20px;
            padding: 0;
          }
          .section-header {
            text-align: center;
            margin-bottom: 30px;
          }
          .section-header h2 {
            margin: 0;
            font-size: 18px;
          }
          .date {
            text-align: left;
            margin-bottom: 10px;
          }
          .currency-section {
            margin-bottom: 40px;
            page-break-inside: avoid;
          }
          .currency-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
          }
          .card {
            border: 1px solid #000;
            padding: 20px;
            border-radius: 8px;
            background-color: #f9f9f9;
          }
          .card h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #333;
          }
          .card-value {
            font-size: 20px;
            font-weight: bold;
            color: #1e293b;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="date">${todayStr}</div>
        <div class="section-header">
          <h2>تقرير المحاسبة</h2>
        </div>
        ${Object.entries(summaryData).map(([currency, data]) => {
          const currencyText = getCurrencyText(currency);
          return `
            <div class="currency-section">
              <div class="currency-title">ملخص عملة: ${currencyText} (${currency})</div>
              <div class="cards-grid">
                <div class="card">
                  <h3>مجموع الرسوم</h3>
                  <p class="card-value">${data.totalFees ? data.totalFees.toFixed(2) : '0.00'} ${currencyText}</p>
                </div>
                <div class="card">
                  <h3>الرسوم التي تم دفعُها لجهات خارجية</h3>
                  <p class="card-value">${data.externalPaidFees ? data.externalPaidFees.toFixed(2) : '0.00'} ${currencyText}</p>
                </div>
                <div class="card">
                  <h3>الدُفعات المستلمة</h3>
                  <p class="card-value">${data.totalPayments ? data.totalPayments.toFixed(2) : '0.00'} ${currencyText}</p>
                </div>
                <div class="card">
                  <h3>إجمالي المصروفات</h3>
                  <p class="card-value">${data.totalExpenses ? data.totalExpenses.toFixed(2) : '0.00'} ${currencyText}</p>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };



  return (
    <div className="accounting-summary-container">
      {/* Section Header */}
      <div className="section-header">
        <h2 className="section-title">
          <FiBarChart2 className="section-icon" />
          تقرير المحاسبة
        </h2>
        <button onClick={handlePrint} className="print-button">
          طباعة التقرير
        </button>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>جاري التحميل...</p>
        </div>
      ) : (
        <div className="reports-wrapper">
          {Object.entries(summaryData).map(([currency, data]) => {
            const currencyText = getCurrencyText(currency);
            return (
              <div key={currency} className="currency-report-section">
                <h3 className="currency-report-title">
                  ملخص عملة: <span className="highlight-cur">{currencyText}</span> ({currency})
                </h3>

                <div className="summary-cards">
                  <div className="summary-card">
                    <div className="card-icon-wrapper" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' }}>
                      <FaMoneyCheckAlt className="card-icon" style={{ color: '#2563EB' }} />
                    </div>
                    <div className="card-content">
                      <h3>مجموع الرسوم</h3>
                      <p className="card-value">{data.totalFees ? data.totalFees.toFixed(2) : '0.00'} {currencyText}</p>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="card-icon-wrapper" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}>
                      <FaFileInvoiceDollar className="card-icon" style={{ color: '#f59e0b' }} />
                    </div>
                    <div className="card-content">
                      <h3>الرسوم التي تم دفعُها لجهات خارجية</h3>
                      <p className="card-value">{data.externalPaidFees ? data.externalPaidFees.toFixed(2) : '0.00'} {currencyText}</p>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="card-icon-wrapper" style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' }}>
                      <FaHandHoldingUsd className="card-icon" style={{ color: '#10b981' }} />
                    </div>
                    <div className="card-content">
                      <h3>الدُفعات المستلمة</h3>
                      <p className="card-value">{data.totalPayments ? data.totalPayments.toFixed(2) : '0.00'} {currencyText}</p>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="card-icon-wrapper" style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)' }}>
                      <FaChartBar className="card-icon" style={{ color: '#8b5cf6' }} />
                    </div>
                    <div className="card-content">
                      <h3>مجموع المصاريف</h3>
                      <p className="card-value">{data.totalExpenses ? data.totalExpenses.toFixed(2) : '0.00'} {currencyText}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .accounting-summary-container {
          width: 100%;
          direction: rtl;
          font-family: 'Almarai', 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        /* Section Header */
        .section-header {
          margin-bottom: 24px;
          padding: 20px 24px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
          border: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.5rem;
          font-weight: 700;
          color: #0F172A !important;
          margin: 0;
        }

        .print-button {
          padding: 12px 24px;
          background: #10b981;
          color: white;
          border: none;
          font-size: 0.9375rem;
          cursor: pointer;
          border-radius: 4px;
          font-family: 'Cairo', 'Almarai', sans-serif;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .print-button:hover {
          background: #059669;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }

        .accounting-summary-container h2.section-title,
        .accounting-summary-container .section-title,
        h2.section-title,
        .section-title {
          color: #1e40af !important;
        }

        .accounting-summary-container .section-title *:not(.section-icon),
        .section-title *:not(.section-icon) {
          color: #1e40af !important;
        }

        .section-icon {
          color: #2563EB !important;
          width: 24px;
          height: 24px;
        }

        .reports-wrapper {
          display: flex;
          flex-direction: column;
          gap: 40px;
          margin-top: 24px;
        }

        .currency-report-section {
          background: #f8fafc;
          border-radius: 20px;
          padding: 24px;
          border: 1px dashed #cbd5e1;
        }

        .currency-report-title {
          font-size: 1.25rem;
          color: #334155;
          margin: 0 0 16px 0;
          padding-bottom: 12px;
          border-bottom: 2px solid #e2e8f0;
          display: inline-block;
        }

        .highlight-cur {
          color: #2563eb;
          font-weight: 800;
        }

        /* Summary Cards */
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }

        .summary-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
          border: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08);
        }

        .card-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .card-icon {
          width: 24px;
          height: 24px;
        }

        .card-content {
          flex: 1;
        }

        .card-content h3 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
          margin: 0 0 8px 0;
          font-family: 'Almarai', 'Cairo', sans-serif;
        }

        .card-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
          font-family: 'Almarai', 'Cairo', sans-serif;
        }

        /* Loading State */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          text-align: center;
          gap: 16px;
          color: #9ca3af;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e8eaed;
          border-top-color: #2563EB;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-state p {
          margin: 0;
          font-size: 1rem;
          font-weight: 500;
          color: #6b7280;
          font-family: 'Almarai', 'Cairo', sans-serif;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .summary-cards {
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 20px;
          }
        }

        @media (max-width: 768px) {
          .section-title {
            font-size: 1.25rem;
          }

          .summary-cards {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .summary-card {
            padding: 20px;
          }

          .card-value {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
};

export default AccountingSummary;
