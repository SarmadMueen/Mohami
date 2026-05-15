import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';

const AccountingReport = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [summary, setSummary] = useState({
    totalCases: 0,
    totalPayments: 0,
    totalExpenses: 0,
  });

  const fetchAccountingData = async () => {
    try {
      setLoading(true);

      // Get the logged-in user's ID
      const user = supabase.auth.user();
      if (!user) throw new Error('User not logged in');

      const userId = user.id;

      // Fetch relevant expenses data for the admin user
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('case_id, paid_amount, expenses_amount, admin_id')
        .eq('admin_id', userId);

      if (expensesError) throw new Error(expensesError.message);

      // Calculate the total payments and expenses
      const totalsByCase = expensesData.reduce((acc, expense) => {
        const { case_id, paid_amount, expenses_amount } = expense;

        if (!acc[case_id]) {
          acc[case_id] = {
            totalPaid: 0,
            totalExpenses: 0,
          };
        }

        acc[case_id].totalPaid += parseFloat(paid_amount) || 0;
        acc[case_id].totalExpenses += parseFloat(expenses_amount) || 0;

        return acc;
      }, {});

      // Fetch case details for these case IDs
      const caseIds = Object.keys(totalsByCase);
      const { data: casesData, error: casesError } = await supabase
        .from('cases')
        .select('id, client_name, case_number, caseLawyerId')
        .in('id', caseIds)
        .eq('caseLawyerId', userId);

      if (casesError) throw new Error(casesError.message);

      // Prepare reports data and calculate summary
      const reportsData = casesData.map((caseData) => {
        const caseTotals = totalsByCase[caseData.id];
        return {
          clientName: caseData.client_name,
          caseNumber: caseData.case_number,
          totalPayments: caseTotals ? caseTotals.totalPaid : 0,
          totalExpenses: caseTotals ? caseTotals.totalExpenses : 0,
          balance: caseTotals ? caseTotals.totalPaid - caseTotals.totalExpenses : 0,
        };
      });

      const totalPayments = reportsData.reduce((sum, report) => sum + report.totalPayments, 0);
      const totalExpenses = reportsData.reduce((sum, report) => sum + report.totalExpenses, 0);

      setSummary({
        totalCases: reportsData.length,
        totalPayments,
        totalExpenses,
      });

      setReports(reportsData);
    } catch (error) {
      console.error('Error fetching accounting data:', error.message);
      setMessage('حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountingData();
  }, []);

  const handlePrint = () => {
    console.log('Print clicked - loading:', loading, 'reports.length:', reports.length);

    if (loading || reports.length === 0) {
      alert('الرجاء انتظار تحميل البيانات قبل الطباعة');
      return;
    }

    console.log('Proceeding to print with', reports.length, 'reports');

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
        <title>تقرير المحاسبة</title>
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
          .summary {
            margin-bottom: 30px;
            padding: 20px;
            background-color: #f9f9f9;
            border: 1px solid #000;
          }
          .summary p {
            margin: 5px 0;
            font-size: 14px;
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
          <h2>تقرير المحاسبة</h2>
        </div>
        <div class="summary">
          <p>إجمالي القضايا: ${summary.totalCases}</p>
          <p>إجمالي الدُفعات: ${summary.totalPayments.toFixed(2)}</p>
          <p>إجمالي الرسوم: ${summary.totalExpenses.toFixed(2)}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>اسم الموكل</th>
              <th>رقم القضية</th>
              <th>مجموع الدُفعات</th>
              <th>مجموع الرسوم</th>
              <th>كشف الحساب</th>
            </tr>
          </thead>
          <tbody>
            ${reports.map((report) => `
              <tr>
                <td>${report.clientName}</td>
                <td>${report.caseNumber}</td>
                <td>${report.totalPayments.toFixed(2)}</td>
                <td>${report.totalExpenses.toFixed(2)}</td>
                <td>${report.balance.toFixed(2)}</td>
              </tr>
            `).join('')}
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
    <div className="accounting-report-content">
      <div className="report-header">
        <h1>تقرير المحاسبة</h1>
        <button onClick={handlePrint} className="print-button">طباعة التقرير</button>
      </div>
      {loading && <p>جار التحميل...</p>}
      {message && <p>{message}</p>}

      <div className="summary-section">
        <p>إجمالي القضايا: {summary.totalCases}</p>
        <p>إجمالي الدُفعات: {summary.totalPayments.toFixed(2)}</p>
        <p>إجمالي الرسوم: {summary.totalExpenses.toFixed(2)}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>اسم الموكل</th>
            <th>رقم القضية</th>
            <th>مجموع الدُفعات</th>
            <th>مجموع الرسوم</th>
            <th>كشف الحساب</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report, index) => (
            <tr key={index}>
              <td>{report.clientName}</td>
              <td>{report.caseNumber}</td>
              <td>{report.totalPayments.toFixed(2)}</td>
              <td>{report.totalExpenses.toFixed(2)}</td>
              <td>{report.balance.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <style jsx>{`
        .accounting-report-content {
          padding: 20px;
          border: 1px solid #ccc;
          border-radius: 5px;
          background-color: #fff;
          box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
          margin-top: 10px;
          max-width: 1370px;
          margin-left: auto;
          margin-right: auto;
          text-align: right;
        }

        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .report-header h1 {
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

        .summary-section {
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          max-width: 500px;
          margin: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        th, td {
          padding: 12px;
          text-align: right;
          border-bottom: 1px solid #ddd;
        }

        th {
          background-color: #f2f2f2;
        }

        tr:hover {
          background-color: #f9f9f9;
        }

        tr:nth-child(even) {
          background-color: #f2f2f2;
        }
      `}</style>
    </div>
  );
};

export default withAuth(AccountingReport, ['can_extract_fees_report']);
