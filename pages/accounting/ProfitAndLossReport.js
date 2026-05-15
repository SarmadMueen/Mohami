import React, { useState, useEffect } from 'react';
import withAuth from '../../lib/withAuth';
import { supabase } from '../../lib/initSupabase';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiActivity, FiBriefcase } from 'react-icons/fi';
import { FaMoneyCheckAlt, FaFileInvoiceDollar, FaHandHoldingUsd, FaChartBar } from 'react-icons/fa';
import { useRouter } from 'next/router';

const ProfitAndLossReport = () => {
  const [userId, setUserId] = useState(null);
  const [reportData, setReportData] = useState({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserDetails = async () => {
      const user = supabase.auth.user();
      if (user) {
        let actualUserId = user.id;

        // Determine if there is an admin_user_id
        try {
          const { data: myMeta, error: metaError } = await supabase
            .from('user_metadata')
            .select('admin_user_id, new_lawyer_id, user_id, role')
            .or(`user_id.eq.${user.id},new_lawyer_id.eq.${user.id}`)
            .limit(1);

          if (!metaError && myMeta && myMeta.length > 0) {
            const row = myMeta.find(m => m.new_lawyer_id === user.id) || myMeta[0];
            if (row.admin_user_id) {
              actualUserId = row.admin_user_id;
            }
          }
        } catch (err) {
          console.error(err);
        }

        setUserId(actualUserId);
      } else {
        router.push('/login');
      }
    };
    fetchUserDetails();
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const fetchPnLData = async () => {
      try {
        // Fetch from expenses (Case Income and Case Expenses)
        // Using or logic to get any associated to this admin
        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('expenses_amount, paid_amount, currency')
          .eq('admin_id', userId);

        if (expensesError) throw expensesError;

        const grouped = {
          'IQD': { totalIncome: 0, totalCaseExpenses: 0, totalOfficeExpenses: 0, netProfit: 0 },
          'USD': { totalIncome: 0, totalCaseExpenses: 0, totalOfficeExpenses: 0, netProfit: 0 },
          'SAR': { totalIncome: 0, totalCaseExpenses: 0, totalOfficeExpenses: 0, netProfit: 0 }
        };

        if (expensesData) {
          expensesData.forEach(exp => {
            const cur = exp.currency || 'IQD';
            if (grouped[cur]) {
              grouped[cur].totalIncome += parseFloat(exp.paid_amount || 0);
              grouped[cur].totalCaseExpenses += parseFloat(exp.expenses_amount || 0);
            }
          });
        }

        // Fetch from office_expenses (General Office Expenses)
        const { data: officeExpensesData, error: officeError } = await supabase
          .from('office_expenses')
          .select('amount')
          .eq('admin_id', userId);

        if (!officeError && officeExpensesData) {
          officeExpensesData.forEach(exp => {
            // We'll default office expenses to IQD since they lack currency field
            const cur = 'IQD';
            if (grouped[cur]) {
              grouped[cur].totalOfficeExpenses += parseFloat(exp.amount || 0);
            }
          });
        }

        // Net Profit Calculation and active currencies filter
        const activeCurrencies = {};
        Object.keys(grouped).forEach(cur => {
          const d = grouped[cur];
          d.netProfit = d.totalIncome - (d.totalCaseExpenses + d.totalOfficeExpenses);

          if (d.totalIncome > 0 || d.totalCaseExpenses > 0 || d.totalOfficeExpenses > 0 || d.netProfit !== 0) {
            activeCurrencies[cur] = d;
          }
        });

        // Default if none
        if (Object.keys(activeCurrencies).length === 0) {
          activeCurrencies['IQD'] = grouped['IQD'];
        }

        setReportData(activeCurrencies);

      } catch (error) {
        console.error('Error fetching P&L data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPnLData();
  }, [userId]);

  const getCurrencyText = (currency) => {
    if (currency === 'IQD') return 'دينار';
    if (currency === 'USD') return 'دولار';
    if (currency === 'SAR') return 'ريال';
    return 'دينار';
  };

  const handlePrint = () => {
    console.log('Print clicked - loading:', loading, 'reportData:', reportData);

    if (loading || Object.keys(reportData).length === 0) {
      alert('الرجاء انتظار تحميل البيانات قبل الطباعة');
      return;
    }

    console.log('Proceeding to print P&L report');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for printing');
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>تقرير الأرباح والخسائر الشامل</title>
        <style>
          body {
            font-family: 'Cairo', 'Almarai', sans-serif;
            direction: rtl;
            margin: 20px;
            padding: 0;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h2 {
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
            border: 1px solid #000;
            padding: 20px;
          }
          .currency-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .net-profit {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f9f9f9;
            border: 1px solid #000;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
          }
          .profit {
            color: green;
          }
          .loss {
            color: red;
          }
          .breakdown {
            margin-top: 20px;
          }
          .breakdown-item {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            border-bottom: 1px solid #ddd;
          }
          .breakdown-item:last-child {
            border-bottom: none;
          }
        </style>
      </head>
      <body>
        <div class="date">${todayStr}</div>
        <div class="header">
          <h2>تقرير الأرباح والخسائر الشامل</h2>
          <p>ملخص الدخل والمصاريف ورسوم القضايا لتحديد صافي الربح</p>
        </div>
        ${Object.entries(reportData).map(([currency, data]) => {
          const isProfitable = data.netProfit >= 0;
          const currencyText = getCurrencyText(currency);
          return `
            <div class="currency-section">
              <div class="currency-title">ملخص عملة: ${currencyText} (${currency})</div>
              <div class="net-profit ${isProfitable ? 'profit' : 'loss'}">
                صافي الربح / الخسارة: ${Math.abs(data.netProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyText} ${isProfitable ? '(أرباح إيجابية)' : '(خسارة)'}
              </div>
              <div class="breakdown">
                <div class="breakdown-item">
                  <span>الدخل الإجمالي (الدفعات المستلمة للقضايا)</span>
                  <span>${data.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyText}</span>
                </div>
                <div class="breakdown-item">
                  <span>مجموع الرسوم (رسوم القضايا)</span>
                  <span>${data.totalCaseExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyText}</span>
                </div>
                <div class="breakdown-item">
                  <span>المصاريف العامة للمكتب</span>
                  <span>${data.totalOfficeExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyText}</span>
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
    <div className="pnl-container">
      <div className="section-header">
        <h2 className="section-title">
          <FiActivity className="section-icon" />
          تقرير الأرباح والخسائر الشامل
        </h2>
        <button onClick={handlePrint} className="print-button">طباعة التقرير</button>
      </div>
      <p className="section-subtitle">ملخص الدخل والمصاريف ورسوم القضايا لتحديد صافي الربح</p>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>جاري التحميل...</p>
        </div>
      ) : (
        <div className="reports-wrapper">
          {Object.entries(reportData).map(([currency, data]) => {
            const isProfitable = data.netProfit >= 0;
            const currencyText = getCurrencyText(currency);

            return (
              <div key={currency} className="currency-report-section">
                <h3 className="currency-report-title">
                  ملخص عملة: <span className="highlight-cur">{currencyText}</span> ({currency})
                </h3>

                {/* Main Profit/Loss Card */}
                <div className={`net-profit-card ${isProfitable ? 'profitable' : 'loss'}`}>
                  <div className="net-profit-content">
                    <h3>صافي الربح / الخسارة</h3>
                    <div className="amount-wrapper">
                      <span className="amount">
                        {Math.abs(data.netProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="currency">{currencyText}</span>
                    </div>
                    <p className="status-badge">
                      {isProfitable ? (
                        <><FiTrendingUp /> أرباح إيجابية</>
                      ) : (
                        <><FiTrendingDown /> خسارة</>
                      )}
                    </p>
                  </div>
                  <div className="net-profit-icon">
                    {isProfitable ? <FiTrendingUp /> : <FiTrendingDown />}
                  </div>
                </div>

                {/* Breakdown Cards */}
                <div className="breakdown-cards">
                  {/* Income */}
                  <div className="b-card income">
                    <div className="b-card-icon">
                      <FaHandHoldingUsd />
                    </div>
                    <div className="b-card-details">
                      <h4>الدخل الإجمالي (الدفعات المستلمة للقضايا)</h4>
                      <p>{data.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencyText}</p>
                    </div>
                  </div>

                  {/* Case Expenses */}
                  <div className="b-card expense case">
                    <div className="b-card-icon">
                      <FaFileInvoiceDollar />
                    </div>
                    <div className="b-card-details">
                      <h4>مجموع الرسوم (رسوم القضايا)</h4>
                      <p>{data.totalCaseExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencyText}</p>
                    </div>
                  </div>

                  {/* Office Expenses */}
                  <div className="b-card expense office">
                    <div className="b-card-icon">
                      <FiBriefcase />
                    </div>
                    <div className="b-card-details">
                      <h4>مجموع المصاريف (مصاريف عامة للمكتب)</h4>
                      <p>{data.totalOfficeExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencyText}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .pnl-container {
          width: 100%;
          direction: rtl;
          font-family: 'Almarai', 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .section-header {
          margin-bottom: 24px;
          padding: 24px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.02);
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
          color: #1e293b;
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

        .section-icon {
          color: #3b82f6;
          width: 24px;
          height: 24px;
        }

        .section-subtitle {
          color: #64748b;
          margin: 0;
          font-size: 1rem;
        }

        .reports-wrapper {
          display: flex;
          flex-direction: column;
          gap: 48px;
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
          margin: 0 0 24px 0;
          padding-bottom: 12px;
          border-bottom: 2px solid #e2e8f0;
          display: inline-block;
        }

        .highlight-cur {
          color: #2563eb;
          font-weight: 800;
        }

        /* Hero Net Profit Card */
        .net-profit-card {
          border-radius: 20px;
          padding: 32px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: white;
          margin-bottom: 32px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
        }

        .net-profit-card::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%);
          pointer-events: none;
        }

        .net-profit-card.profitable {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        }

        .net-profit-card.loss {
          background: linear-gradient(135deg, #e11d48 0%, #f43f5e 100%);
        }

        .net-profit-content h3 {
          margin: 0 0 12px 0;
          font-size: 1.125rem;
          font-weight: 500;
          opacity: 0.9;
        }

        .amount-wrapper {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 16px;
        }

        .amount {
          font-size: 3.5rem;
          font-weight: 800;
          letter-spacing: -1px;
        }

        .currency {
          font-size: 1.25rem;
          font-weight: 600;
          opacity: 0.9;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(4px);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
          margin: 0;
        }

        .net-profit-icon {
          font-size: 120px;
          opacity: 0.15;
          position: absolute;
          left: -10px;
          bottom: -20px;
          transform: rotate(-10deg);
        }

        /* Breakdown Cards */
        .breakdown-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }

        .b-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: flex-start;
          gap: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
          border: 1px solid #e5e7eb;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .b-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px rgba(0, 0, 0, 0.08);
        }

        .b-card-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
        }

        .b-card.income .b-card-icon {
          background: #d1fae5;
          color: #059669;
        }

        .b-card.expense.case .b-card-icon {
          background: #fee2e2;
          color: #dc2626;
        }

        .b-card.expense.office .b-card-icon {
          background: #ffedd5;
          color: #ea580c;
        }

        .b-card-details h4 {
          margin: 0 0 8px 0;
          font-size: 0.9375rem;
          color: #64748b;
          font-weight: 600;
        }

        .b-card-details p {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
        }

        /* Loading State */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          color: #9ca3af;
          gap: 16px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .net-profit-card {
            flex-direction: column;
            align-items: flex-start;
            padding: 24px;
            gap: 20px;
          }

          .net-profit-icon {
            font-size: 80px;
            bottom: unset;
            top: -10px;
          }

          .amount {
            font-size: 2.5rem;
          }

          .breakdown-cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ProfitAndLossReport;
