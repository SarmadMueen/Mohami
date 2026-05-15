import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/initSupabase'; // Ensure the correct path
import withAuth from '../../lib/withAuth';
import { FiCreditCard } from 'react-icons/fi';

const Payments = () => {
  const [userId, setUserId] = useState(null);
  const [paymentsData, setPaymentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for the current user
    const fetchUserDetails = () => {
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

    // Fetch payments data
    const fetchPaymentsData = async () => {
      try {
        const { data: expenses, error: expensesError } = await supabase
          .from('expenses')
          .select('id, payment_date, case_number, case_id, expenses_type, paid_amount, admin_id, lawyer_id, currency')
          .or(`admin_id.eq.${userId},lawyer_id.eq.${userId}`);

        if (expensesError) {
          console.error('Error fetching expenses:', expensesError);
          return;
        }

        // Filter out expenses with zero paid amount
        const filteredExpenses = expenses.filter(expense => parseFloat(expense.paid_amount) > 0);

        const paymentsWithUsernames = await Promise.all(
          filteredExpenses.map(async (expense) => {
            let username = "Unknown";
            let currency = expense.currency;

            // Try to get username from lawyer_id first
            if (expense.lawyer_id) {
              const { data: userMetadata, error: metadataError } = await supabase
                .from('user_metadata')
                .select('username, arabic_name')
                .eq('new_lawyer_id', expense.lawyer_id)
                .single();

              if (!metadataError && userMetadata) {
                username = userMetadata.username || userMetadata.arabic_name || "Unknown";
              }
            }

            // If still unknown, try to get username from admin_id
            if (username === "Unknown" && expense.admin_id) {
              const { data: adminMetadata, error: adminError } = await supabase
                .from('user_metadata')
                .select('username, arabic_name')
                .eq('user_id', expense.admin_id)
                .single();

              if (!adminError && adminMetadata) {
                username = adminMetadata.username || adminMetadata.arabic_name || "Unknown";
              }
            }

            // If currency not in expense, fetch from case
            if (!currency && expense.case_id) {
              const { data: caseData } = await supabase
                .from('cases')
                .select('currency')
                .eq('id', expense.case_id)
                .single();
              currency = caseData?.currency || 'IQD';
            }

            return { ...expense, username: username, currency: currency || 'IQD' };
          })
        );

        setPaymentsData(paymentsWithUsernames);
      } catch (error) {
        console.error('Error fetching payments data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentsData();
  }, [userId]);

  const getCurrencyText = (currency) => {
    if (currency === 'IQD') return 'دينار';
    if (currency === 'USD') return 'دولار';
    if (currency === 'SAR') return 'ريال';
    return 'دينار'; // Default
  };

  const handlePrint = () => {
    console.log('Print clicked - loading:', loading, 'paymentsData.length:', paymentsData.length);

    if (loading || paymentsData.length === 0) {
      alert('الرجاء انتظار تحميل البيانات قبل الطباعة');
      return;
    }

    console.log('Proceeding to print with', paymentsData.length, 'payments');

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
        <title>تقرير الدفعات</title>
        <style>
          body {
            font-family: 'Cairo', 'Almarai', sans-serif;
            direction: rtl;
            margin: 20px;
            padding: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #000;
            padding: 10px;
            text-align: center;
            font-size: 12px;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .header h2 {
            margin: 0;
            font-size: 18px;
          }
          .date {
            text-align: left;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="date">${todayStr}</div>
        <div class="header">
          <h2>تقرير الدفعات</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>الملف</th>
              <th>رقم الدعوى</th>
              <th>نوع الدُفعة</th>
              <th>قيمة الدُفعة</th>
              <th>المستخدم</th>
            </tr>
          </thead>
          <tbody>
            ${paymentsData.map((payment) => {
              const currency = payment.currency || 'IQD';
              const currencyText = getCurrencyText(currency);
              return `
                <tr>
                  <td>${new Date(payment.payment_date).toLocaleDateString('en-US')}</td>
                  <td>${payment.case_id || '-'}</td>
                  <td>${payment.case_number || '-'}</td>
                  <td>${payment.expenses_type || '-'}</td>
                  <td>${payment.paid_amount ? parseFloat(payment.paid_amount).toFixed(2) : '0.00'} ${currencyText}</td>
                  <td>${payment.username || '-'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="payments-tab-container">
      <div className="payments-header">
        <h2>الدفعات</h2>
        <button onClick={handlePrint} className="print-button">طباعة التقرير</button>
      </div>

      {/* Table Container */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>جاري التحميل...</p>
          </div>
        ) : paymentsData.length === 0 ? (
          <div className="empty-state">
            <FiCreditCard className="empty-icon" />
            <p>لا توجد بيانات</p>
          </div>
        ) : (
          <table className="payments-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الملف</th>
                <th>رقم الدعوى</th>
                <th>نوع الدُفعة</th>
                <th>قيمة الدُفعة</th>
                <th>المستخدم</th>
              </tr>
            </thead>
            <tbody>
              {paymentsData.map((payment, index) => {
                const currency = payment.currency || 'IQD';
                const currencyText = getCurrencyText(currency);
                return (
                  <tr key={index}>
                    <td data-label="التاريخ">{new Date(payment.payment_date).toLocaleDateString('en-US')}</td>
                    <td data-label="الملف">{payment.case_id || '-'}</td>
                    <td data-label="رقم الدعوى">{payment.case_number || '-'}</td>
                    <td data-label="نوع الدُفعة">{payment.expenses_type || '-'}</td>
                    <td data-label="قيمة الدُفعة" className="amount-cell">{payment.paid_amount ? parseFloat(payment.paid_amount).toFixed(2) : '0.00'} {currencyText}</td>
                    <td data-label="المستخدم">{payment.username || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        .payments-tab-container {
          width: 100%;
          direction: rtl;
          font-family: 'Almarai', 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .payments-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 20px 24px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
          border: 1px solid #e5e7eb;
        }

        .payments-header h2 {
          margin: 0;
          font-size: 1.5rem;
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

        /* Table Container */
        .table-container {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }

        .payments-table {
          width: 100%;
          border-collapse: collapse;
        }

        .payments-table thead {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-bottom: 2px solid #e5e7eb;
        }

        .payments-table th {
          padding: 18px 24px;
          text-align: right;
          font-weight: 700;
          color: #1f2937;
          font-size: 0.9375rem;
          white-space: nowrap;
          letter-spacing: -0.01em;
          font-family: 'Almarai', 'Cairo', sans-serif;
        }

        .payments-table td {
          padding: 16px 24px;
          text-align: right;
          border-bottom: 1px solid #f3f4f6;
          color: #374151;
          font-size: 0.9375rem;
          line-height: 1.6;
          font-weight: 400;
          font-family: 'Almarai', 'Cairo', sans-serif;
        }

        .payments-table tbody tr {
          background-color: #ffffff;
          transition: background-color 0.15s ease;
        }

        .payments-table tbody tr:hover {
          background-color: #f9fafb;
        }

        .payments-table tbody tr:nth-child(even) {
          background-color: #fafbfc;
        }

        .payments-table tbody tr:nth-child(even):hover {
          background-color: #f3f4f6;
        }

        .payments-table tbody tr:last-child td {
          border-bottom: none;
        }

        .amount-cell {
          font-weight: 600;
          color: #1f2937;
        }

        /* Loading & Empty States */
        .loading-state, .empty-state {
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

        .empty-icon {
          width: 48px;
          height: 48px;
          color: #cbd5e1;
          opacity: 0.5;
        }

        .loading-state p, .empty-state p {
          margin: 0;
          font-size: 1rem;
          font-weight: 500;
          color: #6b7280;
          font-family: 'Almarai', 'Cairo', sans-serif;
        }

        @media (max-width: 768px) {
          .table-container {
            border-radius: 0;
            box-shadow: none;
            border: none;
            overflow: visible;
            background: transparent;
          }

          .payments-table {
            display: block;
          }

          .payments-table thead {
            display: none;
          }

          .payments-table tbody {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .payments-table tr {
            display: flex;
            flex-direction: column;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          }

          .payments-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 7px 0;
            border-bottom: 1px solid #f3f4f6;
            font-size: 14px;
            white-space: normal;
          }

          .payments-table td:last-child {
            border-bottom: none;
          }

          .payments-table td::before {
            content: attr(data-label);
            font-size: 13px;
            font-weight: 700;
            color: #6b7280;
            flex-shrink: 0;
            margin-left: 12px;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }
        }
      `}</style>
    </div>
  );
};

export default withAuth(Payments, ['can_add_fees'], true);
