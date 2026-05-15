import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';
import { FiUsers, FiSearch } from 'react-icons/fi';

const ClientsReport = () => {
  const [reports, setReports] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [lawyerName, setLawyerName] = useState('مكتب المحاماة');

  const fetchReports = async () => {
    try {
      setLoading(true);

      // Get the logged-in user's ID
      const user = supabase.auth.user();
      if (!user) throw new Error('User not logged in');

      const userId = user.id;
      let actualAdminId = userId;

      // Fetch user metadata to get admin_user_id
      try {
        const { data: myMeta, error: metaError } = await supabase
          .from('user_metadata')
          .select('admin_user_id, new_lawyer_id, user_id, role, username')
          .or(`user_id.eq.${userId},new_lawyer_id.eq.${userId}`)
          .limit(1);

        if (!metaError && myMeta && myMeta.length > 0) {
          const row = myMeta.find(m => m.new_lawyer_id === userId) || myMeta[0];

          if (row.admin_user_id) {
            actualAdminId = row.admin_user_id;
          }

          if (row.username) {
            setLawyerName(`مكتب المحامي ${row.username}`);
          }
        } else {
          // Fallback to fetch username by email
          const { data: fallback } = await supabase
            .from('user_metadata')
            .select('username')
            .eq('email', user.email)
            .single();
          if (fallback && fallback.username) {
            setLawyerName(`مكتب المحامي ${fallback.username}`);
          }
        }
      } catch (e) {
        console.error('Error fetching user metadata:', e);
      }

      // 1. Fetch ALL cases for the user to ensure accurate client case counts
      const { data: casesData, error: casesError } = await supabase
        .from('cases')
        .select('id, client_name, currency')
        .eq('admin_id', actualAdminId);

      if (casesError) throw new Error(casesError.message);

      if (!casesData || casesData.length === 0) {
        setMessage('لا توجد قضايا للموكلين');
        return;
      }

      // 1.5. Fetch clients_data to filter by admin_id
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients_data')
        .select('client_name, admin_id')
        .eq('admin_id', actualAdminId);

      if (clientsError) {
        console.error('Error fetching clients_data:', clientsError);
      }

      // Create a set of valid client names for this admin
      const validClientNames = new Set();
      if (clientsData) {
        clientsData.forEach(client => {
          if (client.client_name) {
            validClientNames.add(client.client_name.trim());
          }
        });
      }

      console.log('Admin ID:', actualAdminId);
      console.log('Valid client names:', Array.from(validClientNames));
      console.log('Cases before filter:', casesData.map(c => ({ id: c.id, client_name: c.client_name, admin_id: 'from cases table' })));

      // Filter cases to only include those with valid client names
      const filteredCasesData = casesData.filter(caseData => {
        const clientName = caseData.client_name?.trim();
        const isValid = clientName && validClientNames.has(clientName);
        if (!isValid && clientName) {
          console.log('Filtering out case:', { id: caseData.id, client_name: caseData.client_name });
        }
        return isValid;
      });

      console.log('Cases after filter:', filteredCasesData.map(c => ({ id: c.id, client_name: c.client_name })));

      if (filteredCasesData.length === 0) {
        setMessage('لا توجد قضايا للموكلين');
        return;
      }

      // 2. Fetch expenses to get payments (paid_amount) and expenses (expenses_amount)
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('case_id, paid_amount, expenses_amount')
        .eq('admin_id', actualAdminId);

      if (expensesError) throw new Error(expensesError.message);

      // 3. Calculate total payments and expenses for each case_id
      const totalsByCase = (expensesData || []).reduce((acc, expense) => {
        const { case_id, paid_amount, expenses_amount } = expense;

        if (!acc[case_id]) {
          acc[case_id] = { totalPaid: 0, totalExpenses: 0 };
        }

        acc[case_id].totalPaid += parseFloat(paid_amount) || 0;
        acc[case_id].totalExpenses += parseFloat(expenses_amount) || 0;

        return acc;
      }, {});

      // 4. Group by client, then by currency inside
      const clientDataMap = {};
      filteredCasesData.forEach((caseData) => {
        const clientName = caseData.client_name;
        // Skip records where the client name is missing or effectively empty
        if (!clientName || !clientName.trim()) return;

        const currency = caseData.currency || 'IQD';

        if (!clientDataMap[clientName]) {
          clientDataMap[clientName] = {
            clientName: clientName,
            totalCases: 0,
            financials: {}
          };
        }

        if (!clientDataMap[clientName].financials[currency]) {
          clientDataMap[clientName].financials[currency] = {
            casesCount: 0,
            totalPayments: 0,
            totalExpenses: 0,
          };
        }

        const caseTotals = totalsByCase[caseData.id] || { totalPaid: 0, totalExpenses: 0 };
        clientDataMap[clientName].totalCases += 1;
        clientDataMap[clientName].financials[currency].casesCount += 1;
        clientDataMap[clientName].financials[currency].totalPayments += caseTotals.totalPaid;
        clientDataMap[clientName].financials[currency].totalExpenses += caseTotals.totalExpenses;
      });

      // 5. Convert to array
      const reportsData = Object.values(clientDataMap);

      // Sort with highest total cases first
      reportsData.sort((a, b) => b.totalCases - a.totalCases);

      setAllReports(reportsData);
      setReports(reportsData);
    } catch (error) {
      console.error('Error fetching reports data:', error.message);
      setMessage('حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filter cases based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setReports(allReports);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = allReports.filter((report) => {
      const clientName = String(report.clientName || '').toLowerCase();
      return clientName.includes(query);
    });

    setReports(filtered);
  }, [searchQuery, allReports]);

  const getCurrencyText = (currency) => {
    if (currency === 'IQD') return 'دينار';
    if (currency === 'USD') return 'دولار';
    if (currency === 'SAR') return 'ريال';
    return 'دينار'; // Default
  };

  const handlePrint = () => {
    console.log('Print clicked - loading:', loading, 'reports.length:', reports.length);
    console.log('Reports data:', reports);

    if (loading || reports.length === 0) {
      alert('الرجاء انتظار تحميل البيانات قبل الطباعة');
      return;
    }

    console.log('Proceeding to print with', reports.length, 'clients');

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for printing');
      return;
    }

    // Generate print content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>قائمة الموكلين المعاملات المالية</title>
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
          .financial-row {
            margin: 2px 0;
          }
          .positive {
            color: green;
          }
          .negative {
            color: red;
          }
        </style>
      </head>
      <body>
        <div class="date">${todayStr}</div>
        <div class="header">
          <h2>قائمة الموكلين المعاملات المالية</h2>
          <p>${lawyerName}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>اسم الموكل</th>
              <th>مجموع القضايا</th>
              <th>إجمالي المُسدد</th>
              <th>مجموع الرسوم</th>
              <th>كشف الحساب</th>
            </tr>
          </thead>
          <tbody>
            ${reports.map((report) => {
              const hasFinancials = Object.keys(report.financials).length > 0;
              return `
                <tr>
                  <td>${report.clientName || '-'}</td>
                  <td>
                    ${hasFinancials ? Object.entries(report.financials).map(([curr, data]) => `
                      <div class="financial-row">${data.casesCount} (${getCurrencyText(curr)})</div>
                    `).join('') : `<div class="financial-row">${report.totalCases || 0} (دينار)</div>`}
                  </td>
                  <td>
                    ${hasFinancials ? Object.entries(report.financials).map(([curr, data]) => `
                      <div class="financial-row">${data.totalPayments ? data.totalPayments.toFixed(2) : '0.00'} ${getCurrencyText(curr)}</div>
                    `).join('') : '<div class="financial-row">0.00 دينار</div>'}
                  </td>
                  <td>
                    ${hasFinancials ? Object.entries(report.financials).map(([curr, data]) => `
                      <div class="financial-row">${data.totalExpenses ? data.totalExpenses.toFixed(2) : '0.00'} ${getCurrencyText(curr)}</div>
                    `).join('') : '<div class="financial-row">0.00 دينار</div>'}
                  </td>
                  <td>
                    ${hasFinancials ? Object.entries(report.financials).map(([curr, data]) => {
                      const balance = data.totalPayments - data.totalExpenses;
                      return `
                        <div class="financial-row ${balance >= 0 ? 'positive' : 'negative'}">${balance ? balance.toFixed(2) : '0.00'} ${getCurrencyText(curr)}</div>
                      `;
                    }).join('') : '<div class="financial-row">0.00 دينار</div>'}
                  </td>
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

  const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');

  return (
    <div className="clients-report-container">
      {/* Printable Invoice Header */}
      <div className="print-header-container">
        <div className="print-header-top">
          <div className="print-left">
            <span>{todayStr}</span>
          </div>
          <div className="print-right">
            <strong>{lawyerName}</strong>
          </div>
        </div>
        <div className="print-divider"></div>

        <div className="print-title-box">
          <div className="print-title-left">
            <span>({todayStr})</span>
          </div>
          <div className="print-title-right">
            <strong>قائمة الموكلين المعاملات المالية</strong>
          </div>
        </div>
      </div>

      <div className="tab-header-actions no-print">
        {/* Search Bar Container */}
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="البحث باسم الموكل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <button onClick={handlePrint} className="print-button no-print">
          طباعة التقرير
        </button>
      </div>

      {/* Table Container */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>جار التحميل...</p>
          </div>
        ) : message ? (
          <div className="empty-state">
            <FiUsers className="empty-icon" />
            <p>{message}</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="empty-state">
            <FiUsers className="empty-icon" />
            <p>لا توجد بيانات متاحة</p>
          </div>
        ) : (
          <table className="clients-table">
            <thead>
              <tr>
                <th>اسم الموكل</th>
                <th>مجموع القضايا</th>
                <th>إجمالي المُسدد</th>
                <th>مجموع الرسوم</th>
                <th>كشف الحساب</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report, index) => {
                const hasFinancials = Object.keys(report.financials).length > 0;
                return (
                  <tr key={index}>
                    <td data-label="اسم الموكل">{report.clientName || '-'}</td>
                    <td data-label="مجموع القضايا">
                      {hasFinancials ? (
                        Object.entries(report.financials).map(([curr, data], i) => (
                          <div key={i} className="financial-row">
                            {data.casesCount} ({getCurrencyText(curr)})
                          </div>
                        ))
                      ) : (
                        <div className="financial-row">{report.totalCases || 0} (دينار)</div>
                      )}
                    </td>
                    <td data-label="إجمالي المُسدد" className="amount-cell">
                      {hasFinancials ? (
                        Object.entries(report.financials).map(([curr, data], i) => (
                          <div key={i} className="financial-row">
                            {data.totalPayments ? data.totalPayments.toFixed(2) : '0.00'} {getCurrencyText(curr)}
                          </div>
                        ))
                      ) : (
                        <div className="financial-row">0.00 دينار</div>
                      )}
                    </td>
                    <td data-label="مجموع الرسوم" className="amount-cell">
                      {hasFinancials ? (
                        Object.entries(report.financials).map(([curr, data], i) => (
                          <div key={i} className="financial-row">
                            {data.totalExpenses ? data.totalExpenses.toFixed(2) : '0.00'} {getCurrencyText(curr)}
                          </div>
                        ))
                      ) : (
                        <div className="financial-row">0.00 دينار</div>
                      )}
                    </td>
                    <td data-label="كشف الحساب" className="balance-cell">
                      {hasFinancials ? (
                        Object.entries(report.financials).map(([curr, data], i) => {
                          const balance = data.totalPayments - data.totalExpenses;
                          return (
                            <div key={i} className={`financial-row ${balance >= 0 ? 'positive' : 'negative'}`}>
                              {balance ? balance.toFixed(2) : '0.00'} {getCurrencyText(curr)}
                            </div>
                          );
                        })
                      ) : (
                        <div className="financial-row">0.00 دينار</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        .clients-report-container {
          width: 100%;
          direction: rtl;
          font-family: 'Almarai', 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .print-header-container {
          display: none;
        }

        .tab-header-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          gap: 16px;
        }

        /* Search Bar Container */
        .search-bar-container {
          flex: 1;
          max-width: 600px;
          margin: 0;
        }

        .print-button {
          padding: 12px 24px;
          background: #10b981;
          color: white;
          border: none;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Cairo', 'Almarai', sans-serif;
          border-radius: 4px;
        }

        .print-button:hover {
          background: #059669;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          right: 16px;
          width: 18px;
          height: 18px;
          color: #9ca3af;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 12px 48px 12px 20px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 0.9375rem;
          background: #ffffff;
          color: #1f2937;
          outline: none;
          transition: all 0.2s ease;
          font-family: 'Almarai', 'Cairo', sans-serif;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .search-input:focus {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1), 0 2px 4px rgba(0, 0, 0, 0.08);
        }

        .search-input::placeholder {
          color: #9ca3af;
        }

        /* Table Container */
        .table-container {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }

        .clients-table {
          width: 100%;
          border-collapse: collapse;
        }

        .clients-table thead {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-bottom: 2px solid #e5e7eb;
        }

        .clients-table th {
          padding: 18px 24px;
          text-align: right;
          font-weight: 700;
          color: #1f2937;
          font-size: 0.9375rem;
          white-space: nowrap;
          letter-spacing: -0.01em;
          font-family: 'Almarai', 'Cairo', sans-serif;
        }

        .clients-table td {
          padding: 16px 24px;
          text-align: right;
          border-bottom: 1px solid #f3f4f6;
          color: #374151;
          font-size: 0.9375rem;
          line-height: 1.6;
          font-weight: 400;
          font-family: 'Almarai', 'Cairo', sans-serif;
        }

        .clients-table tbody tr {
          background-color: #ffffff;
          transition: background-color 0.15s ease;
        }

        .clients-table tbody tr:hover {
          background-color: #f9fafb;
        }

        .clients-table tbody tr:nth-child(even) {
          background-color: #fafbfc;
        }

        .clients-table tbody tr:nth-child(even):hover {
          background-color: #f3f4f6;
        }

        .clients-table tbody tr:last-child td {
          border-bottom: none;
        }

        .amount-cell {
          font-weight: 600;
          color: #1f2937;
        }

        .balance-cell {
          font-weight: 600;
        }

        .financial-row {
          padding: 2px 0;
          white-space: nowrap;
        }

        .financial-row:not(:last-child) {
          border-bottom: 1px dotted #e5e7eb;
          margin-bottom: 2px;
        }

        .positive {
          color: #10b981;
        }

        .negative {
          color: #ef4444;
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
          .tab-header-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .search-bar-container {
            max-width: 100%;
            width: 100%;
          }

          .table-container {
            border-radius: 0;
            box-shadow: none;
            border: none;
            overflow: visible;
            background: transparent;
          }

          .clients-table {
            display: block;
          }

          .clients-table thead {
            display: none;
          }

          .clients-table tbody {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .clients-table tr {
            display: flex;
            flex-direction: column;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          }

          .clients-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 7px 0;
            border-bottom: 1px solid #f3f4f6;
            font-size: 14px;
            white-space: normal;
          }

          .clients-table td:last-child {
            border-bottom: none;
          }

          .clients-table td::before {
            content: attr(data-label);
            font-size: 13px;
            font-weight: 700;
            color: #6b7280;
            flex-shrink: 0;
            margin-left: 12px;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .print-button {
            width: 100%;
            justify-content: center;
            border-radius: 10px;
          }
        }

        @media print {
          /* Aggressively hide all layout (header, footer, nav) from print flow entirely 
             using high specificity to override Layout.js global !important styles */
          :global(header), 
          :global(.header), 
          :global(nav), 
          :global(.mobile-bottom-nav), 
          :global(.layout-sidebar), 
          :global(.mobile-app-header), 
          :global(.header-action-bar), 
          :global(.mobile-menu-toggle),
          :global(.nav-notification-btn),
          :global(footer) {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            opacity: 0 !important;
            position: absolute !important;
            z-index: -9999 !important;
          }

          /* Ensure main content overrides layout padding and scrolling that causes extra blank pages */
          :global(html), :global(body) {
            height: auto !important;
            width: 100% !important;
            overflow: visible !important;
            min-height: auto !important;
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }

          :global(#__next), :global(.layout-container) {
            height: auto !important;
            min-height: auto !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }

          :global(.main-content) {
            padding: 0 !important;
            margin: 0 !important;
            margin-right: 0 !important; /* Eliminate right dent from sidebar */
            margin-left: 0 !important;
            height: auto !important;
            min-height: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
          }

          .clients-report-container {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
            direction: rtl; 
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: auto !important;
          }

          .table-container {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* General Print Settings */
          @page {
            size: auto;
            margin: 1cm;
          }

          /* Print Header Styles */
          .print-header-container {
            display: block !important;
            margin-bottom: 20px !important;
            font-family: 'Cairo', 'Almarai', sans-serif !important;
            color: #000 !important;
            page-break-inside: avoid !important;
            width: 100% !important;
          }
          
          .print-header-top, .print-header-middle {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            font-size: 14px;
            direction: ltr; /* Keeping the English parts on the left visually */
          }
          
          .print-divider {
            border-bottom: 1px solid #000;
            width: 100%;
          }
          
          .print-left, .print-right {
            font-weight: bold;
          }
          .print-left { text-align: left; }
          .print-right { text-align: right; }

          .print-title-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #f1f5f9; /* Note: browsers often omit bg colors unless forced */
            padding: 15px 20px;
            margin-top: 15px;
            border-right: 6px solid #1d4ed8;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            direction: ltr;
          }

          .print-title-right strong {
            font-size: 20px;
            color: #1e293b;
          }

          .print-title-left {
            color: #64748b;
            font-size: 14px;
          }

          /* Table print fixes to prevent trailing pages and extra space */
          .no-print {
            display: none !important;
          }
          
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            max-width: 100% !important;
            margin-top: 15px !important;
            page-break-inside: auto !important;
          }
          
          th, td {
            border: 1px solid #000 !important;
            color: black !important;
            padding: 10px !important;
            text-align: center !important;
            font-size: 13px !important;
          }
          
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          
          thead {
            display: table-header-group !important;
          }
          
          tbody {
            display: table-row-group !important;
          }
        }
      `}</style>
    </div>
  );
};

export default withAuth(ClientsReport, ['can_extract_fees_report']);
