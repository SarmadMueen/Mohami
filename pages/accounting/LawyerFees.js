import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';
import { FiDollarSign, FiSearch } from 'react-icons/fi';
import Link from 'next/link';

const LawyerFees = () => {
  const [userId, setUserId] = useState(null);
  const [feesData, setFeesData] = useState([]);
  const [filteredFees, setFilteredFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lawyerName, setLawyerName] = useState('مكتب المحاماة');
  const router = useRouter();

  useEffect(() => {
    const fetchUserDetails = async () => {
      const user = supabase.auth.user();
      if (user) {
        setUserId(user.id);
        try {
          const { data } = await supabase
            .from('user_metadata')
            .select('username')
            .eq('email', user.email)
            .single();

          if (data && data.username) {
            setLawyerName(`مكتب المحامي ${data.username}`);
          } else {
            const { data: fallback } = await supabase
              .from('user_metadata')
              .select('username')
              .or(`admin_user_id.eq.${user.id},new_lawyer_id.eq.${user.id},user_id.eq.${user.id}`)
              .limit(1);
            if (fallback && fallback.length > 0 && fallback[0].username) {
              setLawyerName(`مكتب المحامي ${fallback[0].username}`);
            }
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        router.push('/login');
      }
    };
    fetchUserDetails();
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const fetchLawyerFees = async () => {
      try {
        setLoading(true);
        // Fetch lawyer fees data
        const { data: fees, error: feesError } = await supabase
          .from('lawyer_fees')
          .select('id, payment_date, payment_details, payment_amount, case_id, admin_id, lawyer_id, currency, created_at')
          .eq('admin_id', userId)
          .order('payment_date', { ascending: false });

        if (feesError) {
          console.error('Error fetching lawyer fees:', feesError);
          return;
        }

        const feesWithDetails = await Promise.all(
          fees.map(async (fee) => {
            // Get user metadata for the name
            let fetchedUsername = 'Unknown';

            if (fee.lawyer_id) {
              const { data: userMetadata } = await supabase
                .from('user_metadata')
                .select('username')
                .eq('new_lawyer_id', fee.lawyer_id)
                .single();
              if (userMetadata?.username) {
                fetchedUsername = userMetadata.username;
              }
            }

            // If it wasn't a lawyer (lawyer_id is null/invalid), it was the admin
            if (fetchedUsername === 'Unknown' && fee.admin_id) {
              const { data: userMetadata } = await supabase
                .from('user_metadata')
                .select('username')
                .eq('user_id', fee.admin_id)
                .single();
              if (userMetadata?.username) {
                fetchedUsername = userMetadata.username;
              } else {
                const { data: fallbackMetadata } = await supabase
                  .from('user_metadata')
                  .select('username')
                  .eq('admin_user_id', fee.admin_id)
                  .limit(1);
                if (fallbackMetadata && fallbackMetadata.length > 0) {
                  fetchedUsername = fallbackMetadata[0].username;
                }
              }
            }

            // Get case details for case number and client name
            let caseNumber = '-';
            let clientName = '-';
            let currency = fee.currency;

            if (fee.case_id) {
              const { data: caseData } = await supabase
                .from('cases')
                .select('case_number, client_name, currency')
                .eq('id', fee.case_id)
                .single();

              if (caseData) {
                caseNumber = caseData.case_number;
                clientName = caseData.client_name;
                if (!currency) currency = caseData.currency;
              }
            }

            return {
              ...fee,
              username: fetchedUsername,
              case_number: caseNumber,
              client_name: clientName,
              currency: currency || 'IQD'
            };
          })
        );

        setFeesData(feesWithDetails);
        setFilteredFees(feesWithDetails);
      } catch (error) {
        console.error('Error fetching fees records:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLawyerFees();
  }, [userId]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFees(feesData);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = feesData.filter((fee) => {
      const caseNum = String(fee.case_number || '').toLowerCase();
      const client = String(fee.client_name || '').toLowerCase();
      const user = String(fee.username || '').toLowerCase();
      const details = String(fee.payment_details || '').toLowerCase();

      return caseNum.includes(query) || client.includes(query) || user.includes(query) || details.includes(query);
    });

    setFilteredFees(filtered);
  }, [searchQuery, feesData]);

  const getCurrencyText = (currency) => {
    if (currency === 'IQD') return 'دينار';
    if (currency === 'USD') return 'دولار';
    if (currency === 'SAR') return 'ريال';
    return 'دينار';
  };

  const handlePrint = () => {
    console.log('Print clicked - loading:', loading, 'filteredFees.length:', filteredFees.length);
    console.log('Fees data:', filteredFees);

    if (loading || filteredFees.length === 0) {
      alert('الرجاء انتظار تحميل البيانات قبل الطباعة');
      return;
    }

    console.log('Proceeding to print with', filteredFees.length, 'fees');

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
        <title>أتعاب الدعوى (أتعاب المحاماة)</title>
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
          <h2>أتعاب الدعوى (أتعاب المحاماة)</h2>
          <p>${lawyerName}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>رقم الدعوى</th>
              <th>الموكل</th>
              <th>التفاصيل</th>
              <th>قيمة المُسدد</th>
              <th>المستخدم</th>
            </tr>
          </thead>
          <tbody>
            ${filteredFees.map((fee) => {
              const currency = fee.currency || 'IQD';
              const currencyText = getCurrencyText(currency);
              return `
                <tr>
                  <td>${new Date(fee.payment_date).toLocaleDateString('en-US')}</td>
                  <td>${fee.case_number || '-'}</td>
                  <td>${fee.client_name || '-'}</td>
                  <td>${fee.payment_details || '-'}</td>
                  <td>${fee.payment_amount ? parseFloat(fee.payment_amount).toFixed(2) : '0.00'} ${currencyText}</td>
                  <td>${fee.username || '-'}</td>
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
    <div className="lawyer-fees-container">
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
            <strong>أتعاب الدعوى (أتعاب المحاماة)</strong>
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
              placeholder="البحث برقم الدعوى، الموكل، المستخدم، التفاصيل..."
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
            <p>جاري التحميل...</p>
          </div>
        ) : filteredFees.length === 0 ? (
          <div className="empty-state">
            <FiDollarSign className="empty-icon" />
            <p>لا توجد بيانات متاحة</p>
          </div>
        ) : (
          <table className="lawyer-fees-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>رقم الدعوى</th>
                <th>الموكل</th>
                <th>التفاصيل</th>
                <th>قيمة المُسدد</th>
                <th>المستخدم</th>
              </tr>
            </thead>
            <tbody>
              {filteredFees.map((fee, index) => {
                const currency = fee.currency || 'IQD';
                const currencyText = getCurrencyText(currency);
                return (
                  <tr key={index}>
                    <td data-label="التاريخ">{new Date(fee.payment_date).toLocaleDateString('en-US')}</td>
                    <td data-label="رقم الدعوى">
                      <Link href={`/cases/CaseDetailsPage?caseId=${fee.case_id}`}>
                        <a className="case-number-link">{fee.case_number || '-'}</a>
                      </Link>
                    </td>
                    <td data-label="الموكل">{fee.client_name || '-'}</td>
                    <td data-label="التفاصيل">{fee.payment_details || '-'}</td>
                    <td data-label="قيمة المُسدد" className="amount-cell">{fee.payment_amount ? parseFloat(fee.payment_amount).toFixed(2) : '0.00'} {currencyText}</td>
                    <td data-label="المستخدم">{fee.username || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        .lawyer-fees-container {
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

        .lawyer-fees-table {
          width: 100%;
          border-collapse: collapse;
        }

        .lawyer-fees-table thead {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-bottom: 2px solid #e5e7eb;
        }

        .lawyer-fees-table th {
          padding: 18px 24px;
          text-align: right;
          font-weight: 700;
          color: #1f2937;
          font-size: 0.9375rem;
          white-space: nowrap;
          letter-spacing: -0.01em;
          font-family: 'Almarai', 'Cairo', sans-serif;
        }

        .lawyer-fees-table td {
          padding: 16px 24px;
          text-align: right;
          border-bottom: 1px solid #f3f4f6;
          color: #374151;
          font-size: 0.9375rem;
          line-height: 1.6;
          font-weight: 400;
          font-family: 'Almarai', 'Cairo', sans-serif;
        }

        .lawyer-fees-table tbody tr {
          background-color: #ffffff;
          transition: background-color 0.15s ease;
        }

        .lawyer-fees-table tbody tr:hover {
          background-color: #f9fafb;
        }

        .lawyer-fees-table tbody tr:nth-child(even) {
          background-color: #fafbfc;
        }

        .lawyer-fees-table tbody tr:nth-child(even):hover {
          background-color: #f3f4f6;
        }

        .lawyer-fees-table tbody tr:last-child td {
          border-bottom: none;
        }

        .amount-cell {
          font-weight: 600;
          color: #1f2937;
        }

        .case-number-link {
          color: #2563EB;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .case-number-link:hover {
          text-decoration: underline;
          color: #1e40af;
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

          .lawyer-fees-table {
            display: block;
          }

          .lawyer-fees-table thead {
            display: none;
          }

          .lawyer-fees-table tbody {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .lawyer-fees-table tr {
            display: flex;
            flex-direction: column;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          }

          .lawyer-fees-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 7px 0;
            border-bottom: 1px solid #f3f4f6;
            font-size: 14px;
            white-space: normal;
          }

          .lawyer-fees-table td:last-child {
            border-bottom: none;
          }

          .lawyer-fees-table td::before {
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

          .lawyer-fees-container {
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
          
          .print-header-top {
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

export default LawyerFees;
