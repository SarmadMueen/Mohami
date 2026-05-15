import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/initSupabase";
import { useRouter } from "next/router";
import Link from "next/link";
import { FiFileText, FiSearch } from "react-icons/fi";

const CasesReport = () => {
  const [casesData, setCasesData] = useState([]);
  const [allCasesData, setAllCasesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [lawyerName, setLawyerName] = useState("مكتب المحاماة");
  const [searchQuery, setSearchQuery] = useState("");
  const [clientIdsMap, setClientIdsMap] = useState({});
  const router = useRouter();

  useEffect(() => {
    const fetchUserDetails = async () => {
      const user = supabase.auth.user();
      if (user) {
        let actualUserId = user.id;

        // Fetch admin_user_id from user_metadata
        try {
          const { data: myMeta, error: metaError } = await supabase
            .from("user_metadata")
            .select("admin_user_id, new_lawyer_id, user_id, role, username")
            .or(`user_id.eq.${user.id},new_lawyer_id.eq.${user.id}`)
            .limit(1);

          if (!metaError && myMeta && myMeta.length > 0) {
            const row = myMeta.find(m => m.new_lawyer_id === user.id) || myMeta[0];
            if (row.admin_user_id) {
              actualUserId = row.admin_user_id;
            }
            if (row.username) {
              setLawyerName(`مكتب المحامي ${row.username}`);
            }
          } else {
            // Fallback to fetch username by email
            const { data: fallback } = await supabase
              .from("user_metadata")
              .select("username")
              .eq("email", user.email)
              .single();
            if (fallback && fallback.username) {
              setLawyerName(`مكتب المحامي ${fallback.username}`);
            }
          }
        } catch (e) {
          console.error("Error fetching user metadata:", e);
        }

        setUserId(actualUserId);
      } else {
        router.push("/login");
      }
    };
    fetchUserDetails();
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const fetchCasesReport = async () => {
      try {
        setLoading(true);

        // Fetch cases for the logged-in user
        const { data: cases, error: casesError } = await supabase
          .from("cases")
          .select(
            "id, case_number, client_name, opponentName, totalAmount, currency, total_expenses, expenses_counter, payment_count",
          )
          .or(`admin_id.eq.${userId},lawyer_id.eq.${userId}`);

        if (casesError) {
          console.error("Error fetching cases:", casesError);
          setLoading(false);
          return;
        }

        // For each case, fetch paid amounts
        const casesWithFinancials = await Promise.all(
          (cases || []).map(async (caseItem) => {
            // Get attorney fees from totalAmount (أتعاب محاماة)
            const totalAttorneyFees = parseFloat(caseItem.totalAmount) || 0;

            // Fetch paid amounts (المبالغ المُسددة) from lawyer_fees
            const { data: lawyerFees, error: paymentsError } = await supabase
              .from("lawyer_fees")
              .select("payment_amount")
              .eq("case_id", caseItem.id);

            if (paymentsError) {
              console.error("Error fetching lawyer fees:", paymentsError);
            }

            // Fetch attorney fees payments (fee_amount) from attorneyFees table
            const { data: attorneyFees, error: attorneyFeesError } =
              await supabase
                .from("attorneyFees")
                .select("fee_amount")
                .eq("case_id", caseItem.id);

            if (attorneyFeesError) {
              console.error("Error fetching attorney fees:", attorneyFeesError);
            }

            // Calculate total paid amounts from lawyer_fees
            const totalPaidFromLawyerFees = (lawyerFees || []).reduce(
              (sum, payment) => sum + (parseFloat(payment.payment_amount) || 0),
              0,
            );

            // Calculate total paid amounts from attorneyFees (fee_amount)
            const totalPaidFromAttorneyFees = (attorneyFees || []).reduce(
              (sum, fee) => sum + (parseFloat(fee.fee_amount) || 0),
              0,
            );

            // Total paid amounts = payments from lawyer_fees + fee_amount from attorneyFees
            const totalPaid =
              totalPaidFromLawyerFees + totalPaidFromAttorneyFees;

            // Calculate outstanding amount (المبلغ المُترصد)
            const outstanding = totalAttorneyFees - totalPaid;

            return {
              ...caseItem,
              attorneyFees: totalAttorneyFees,
              paidAmount: totalPaid,
              outstandingAmount: outstanding,
              currency: caseItem.currency || "IQD",
              expensesCounter: caseItem.expenses_counter || 0,
              paymentCount: caseItem.payment_count || 0,
              totalExpensesBalance: parseFloat(caseItem.total_expenses) || 0,
            };
          }),
        );

        setCasesData(casesWithFinancials);
        setAllCasesData(casesWithFinancials);

        // Fetch client IDs for all unique client names
        const uniqueClientNames = [
          ...new Set(
            casesWithFinancials.map((c) => c.client_name).filter(Boolean),
          ),
        ];
        if (uniqueClientNames.length > 0) {
          const { data: clientsData, error: clientsError } = await supabase
            .from("clients_data")
            .select("id, client_name")
            .in("client_name", uniqueClientNames);

          if (!clientsError && clientsData) {
            const idsMap = {};
            clientsData.forEach((client) => {
              idsMap[client.client_name] = client.id;
            });
            setClientIdsMap(idsMap);
          }
        }
      } catch (error) {
        console.error("Error fetching cases report:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCasesReport();
  }, [userId]);

  // Filter cases based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setCasesData(allCasesData);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = allCasesData.filter((caseItem) => {
      const fileId = String(caseItem.id || "").toLowerCase();
      const caseNumber = String(caseItem.case_number || "").toLowerCase();
      const clientName = String(caseItem.client_name || "").toLowerCase();
      const opponent = String(caseItem.opponentName || "").toLowerCase();

      return (
        fileId.includes(query) ||
        caseNumber.includes(query) ||
        clientName.includes(query) ||
        opponent.includes(query)
      );
    });

    setCasesData(filtered);
  }, [searchQuery, allCasesData]);

  const getCurrencyText = (currency) => {
    if (currency === "IQD") return "دينار";
    if (currency === "USD") return "دولار";
    if (currency === "SAR") return "ريال";
    return "دينار"; // Default
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Search is handled by useEffect
  };

  const handlePrint = () => {
    // Ensure data is loaded before printing
    console.log('Print clicked - loading:', loading, 'casesData.length:', casesData.length);
    console.log('Cases data:', casesData);

    if (loading || casesData.length === 0) {
      alert('الرجاء انتظار تحميل البيانات قبل الطباعة');
      return;
    }

    console.log('Proceeding to print with', casesData.length, 'cases');

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
        <title>التقرير المالي للقضايا</title>
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
          <h2>التقرير المالي للقضايا</h2>
          <p>${lawyerName}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>الملف</th>
              <th>رقم الدعوى</th>
              <th>الموكل</th>
              <th>الخصم</th>
              <th>أتعاب الدعوى</th>
              <th>إجمالي المُسدد</th>
              <th>عدد الدُفعات</th>
              <th>عدد الرسوم</th>
              <th>رصيد المصروفات</th>
              <th>متبقي الأتعاب</th>
            </tr>
          </thead>
          <tbody>
            ${casesData.map(caseItem => `
              <tr>
                <td>#${caseItem.id}</td>
                <td>${caseItem.case_number || 'N/A'}</td>
                <td>${caseItem.client_name || 'N/A'}</td>
                <td>${caseItem.opponentName || 'غير محدد'}</td>
                <td>${caseItem.attorneyFees.toFixed(2)} ${getCurrencyText(caseItem.currency)}</td>
                <td>${caseItem.paidAmount.toFixed(2)} ${getCurrencyText(caseItem.currency)}</td>
                <td>${caseItem.paymentCount}</td>
                <td>${caseItem.expensesCounter}</td>
                <td>${caseItem.totalExpensesBalance.toFixed(2)} ${getCurrencyText(caseItem.currency)}</td>
                <td>${caseItem.outstandingAmount.toFixed(2)} ${getCurrencyText(caseItem.currency)}</td>
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

  const todayStr = new Date().toLocaleDateString("en-GB").replace(/\//g, "-");

  return (
    <div className="cases-report-container">
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
            <strong>التقرير المالي للقضايا</strong>
          </div>
        </div>
      </div>

      <div className="tab-header-actions no-print">
        {/* Search Bar Container */}
        <form className="search-bar-container" onSubmit={handleSearch}>
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="البحث برقم الملف، رقم الدعوى، الموكل، الخصم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>
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
        ) : casesData.length === 0 ? (
          <div className="empty-state">
            <FiFileText className="empty-icon" />
            <p>لا توجد بيانات متاحة</p>
          </div>
        ) : (
          <>
            <table className="cases-report-table" data-print-visible="true">
            <thead>
              <tr>
                <th>الملف</th>
                <th>رقم الدعوى</th>
                <th>الموكل</th>
                <th>الخصم</th>
                <th>أتعاب الدعوى</th>
                <th>إجمالي المُسدد</th>
                <th>عدد الدُفعات</th>
                <th>عدد الرسوم</th>
                <th>رصيد المصروفات</th>
                <th>متبقي الأتعاب</th>
              </tr>
            </thead>
            <tbody>
              {casesData.map((caseItem) => (
                <tr key={caseItem.id}>
                  <td data-label="الملف">
                    <span className="file-id">#{caseItem.id}</span>
                  </td>
                  <td data-label="رقم الدعوى">
                    <Link href={`/cases/CaseDetailsPage?caseId=${caseItem.id}`}>
                      <a className="case-number-link">
                        {caseItem.case_number || "N/A"}
                      </a>
                    </Link>
                  </td>
                  <td data-label="الموكل">
                    {caseItem.client_name &&
                    clientIdsMap[caseItem.client_name] ? (
                      <Link
                        href={`/client/view-client?id=${clientIdsMap[caseItem.client_name]}`}
                      >
                        <a className="client-link">{caseItem.client_name}</a>
                      </Link>
                    ) : (
                      <div className="client-cell">
                        {caseItem.client_name || "N/A"}
                      </div>
                    )}
                  </td>
                  <td data-label="الخصم">
                    <div className="opponent-cell">
                      {caseItem.opponentName || "غير محدد"}
                    </div>
                  </td>
                  <td data-label="أتعاب الدعوى">
                    <div className="amount-cell attorney-fees">
                      {caseItem.attorneyFees.toFixed(2)}{" "}
                      {getCurrencyText(caseItem.currency)}
                    </div>
                  </td>
                  <td data-label="إجمالي المُسدد">
                    <div className="amount-cell paid">
                      {caseItem.paidAmount.toFixed(2)}{" "}
                      {getCurrencyText(caseItem.currency)}
                    </div>
                  </td>
                  <td data-label="عدد الدُفعات">
                    <div
                      className="amount-cell count-cell"
                      style={{
                        textAlign: "center",
                        color: "#4b5563",
                        fontWeight: "bold",
                      }}
                    >
                      {caseItem.paymentCount}
                    </div>
                  </td>
                  <td data-label="عدد الرسوم">
                    <div
                      className="amount-cell count-cell"
                      style={{
                        textAlign: "center",
                        color: "#4b5563",
                        fontWeight: "bold",
                      }}
                    >
                      {caseItem.expensesCounter}
                    </div>
                  </td>
                  <td data-label="رصيد المصروفات">
                    <div
                      className="amount-cell expenses-balance"
                      style={{ color: "#dc2626", fontWeight: "bold" }}
                    >
                      {caseItem.totalExpensesBalance.toFixed(2)}{" "}
                      {getCurrencyText(caseItem.currency)}
                    </div>
                  </td>
                  <td data-label="متبقي الأتعاب">
                    <div
                      className={`amount-cell outstanding ${caseItem.outstandingAmount > 0 ? "positive" : "zero"}`}
                    >
                      {caseItem.outstandingAmount.toFixed(2)}{" "}
                      {getCurrencyText(caseItem.currency)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>

      <style jsx>{`
        .cases-report-container {
          width: 100%;
          overflow: hidden;
          direction: rtl;
          font-family:
            "Almarai",
            "Cairo",
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
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
          flex-wrap: wrap;
        }

        /* Search Bar Container */
        .search-bar-container {
          flex: 1;
          max-width: 600px;
          margin: 0;
          min-width: 200px;
        }

        .print-button {
          padding: 12px 24px;
          background: #2563eb;
          color: white;
          border: none;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: "Cairo", "Almarai", sans-serif;
          border-radius: 4px;
          flex-shrink: 0;
          white-space: nowrap;
          margin-left: 16px;
        }

        .print-button:hover {
          background: #1e40af;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
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
          font-family: "Almarai", "Cairo", sans-serif;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .search-input:focus {
          border-color: #2563eb;
          box-shadow:
            0 0 0 3px rgba(37, 99, 235, 0.1),
            0 2px 4px rgba(0, 0, 0, 0.08);
        }

        .search-input::placeholder {
          color: #9ca3af;
        }

        /* Table Container */
        .table-container {
          background: #ffffff;
          border-radius: 16px;
          box-shadow:
            0 4px 12px rgba(0, 0, 0, 0.08),
            0 2px 4px rgba(0, 0, 0, 0.04);
          border: 1px solid #e5e7eb;
          overflow: hidden;
          width: 100%;
          display: block;
        }

        .cases-report-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
        }

        .cases-report-table thead {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-bottom: 2px solid #e5e7eb;
        }

        .cases-report-table th {
          padding: 12px 8px;
          text-align: right;
          font-weight: 700;
          color: #1f2937;
          font-size: 0.8125rem;
          white-space: nowrap;
          letter-spacing: -0.01em;
          font-family: "Almarai", "Cairo", sans-serif;
        }

        .cases-report-table td {
          padding: 10px 8px;
          text-align: right;
          border-bottom: 1px solid #f3f4f6;
          color: #374151;
          font-size: 0.8125rem;
          line-height: 1.4;
          font-weight: 400;
          white-space: nowrap;
          font-family: "Almarai", "Cairo", sans-serif;
        }

        .cases-report-table tbody tr {
          background-color: #ffffff;
          transition: background-color 0.15s ease;
        }

        .cases-report-table tbody tr:hover {
          background-color: #f9fafb;
        }

        .cases-report-table tbody tr:nth-child(even) {
          background-color: #fafbfc;
        }

        .cases-report-table tbody tr:nth-child(even):hover {
          background-color: #f3f4f6;
        }

        .cases-report-table tbody tr:last-child td {
          border-bottom: none;
        }

        .file-id {
          font-weight: 600;
          color: #2563eb;
          font-size: 0.875rem;
        }

        .case-number-link {
          color: #2563eb;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.15s ease;
          font-size: 0.875rem;
        }

        .case-number-link:hover {
          color: #1e40af;
          text-decoration: underline;
        }

        .client-cell,
        .opponent-cell {
          font-weight: 500;
          color: #1f2937;
        }

        .client-link {
          color: #2563eb;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.15s ease;
          font-size: 0.9375rem;
          cursor: pointer;
        }

        .client-link:hover {
          color: #1e40af;
          text-decoration: underline;
        }

        .amount-cell {
          font-weight: 600;
          font-size: 0.875rem;
        }

        .amount-cell.attorney-fees {
          color: #2563eb;
        }

        .amount-cell.paid {
          color: #10b981;
        }

        .amount-cell.outstanding.positive {
          color: #ef4444;
        }

        .amount-cell.outstanding.zero {
          color: #6b7280;
        }

        /* Loading & Empty States */
        .loading-state,
        .empty-state {
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
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .empty-icon {
          width: 48px;
          height: 48px;
          color: #cbd5e1;
          opacity: 0.5;
        }

        .loading-state p,
        .empty-state p {
          margin: 0;
          font-size: 1rem;
          font-weight: 500;
          color: #6b7280;
          font-family: "Almarai", "Cairo", sans-serif;
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

          .cases-report-table {
            display: block;
          }

          .cases-report-table thead {
            display: none;
          }

          .cases-report-table tbody {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .cases-report-table tr {
            display: flex;
            flex-direction: column;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          }

          .cases-report-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 7px 0;
            border-bottom: 1px solid #f3f4f6;
            font-size: 14px;
            white-space: normal;
          }

          .cases-report-table td:last-child {
            border-bottom: none;
          }

          .cases-report-table td::before {
            content: attr(data-label);
            font-size: 13px;
            font-weight: 700;
            color: #6b7280;
            flex-shrink: 0;
            margin-left: 12px;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .file-id {
            font-size: 15px;
            font-weight: 700;
          }

          .case-number-link {
            font-size: 14px;
          }

          .client-link {
            font-size: 14px;
          }

          .amount-cell {
            font-size: 14px;
          }

          .print-button {
            width: 100%;
            justify-content: center;
            border-radius: 10px;
          }
        }

        @media print {
          /* Hide specific layout elements during print */
          :global(.mobile-bottom-nav),
          :global(.layout-sidebar),
          :global(.mobile-app-header),
          :global(.mobile-menu-toggle),
          :global(.mobile-tab-nav) {
            display: none !important;
          }

          /* Ensure main content overrides layout padding and scrolling that causes extra blank pages */
          :global(html),
          :global(body) {
            height: auto !important;
            width: 100% !important;
            overflow: visible !important;
            min-height: auto !important;
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }

          :global(#__next),
          :global(.layout-container) {
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

          :global(.tabs-table-container) {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            height: auto !important;
            min-height: auto !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          :global(.accounting-page) {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            height: auto !important;
            min-height: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            position: relative !important;
            z-index: 1 !important;
          }

          :global(.main-container) {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            height: auto !important;
            min-height: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            position: relative !important;
            z-index: 1 !important;
            flex-direction: column !important;
          }

          .cases-report-container {
            display: block !important;
            padding: 20px !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
            direction: rtl;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            position: relative !important;
            z-index: 10 !important;
            overflow: visible !important;
          }

          .table-container {
            display: block !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            position: relative !important;
            z-index: 10 !important;
            overflow: visible !important;
          }

          .loading-state,
          .empty-state {
            display: none !important;
          }

          /* Force table to be visible even if data is empty during print */
          .table-container > :not(table) {
            display: none !important;
          }

          .table-container > table,
          .table-container .cases-report-table {
            display: table !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 100% !important;
          }

          /* Ensure all table elements are visible */
          .cases-report-table thead,
          .cases-report-table tbody,
          .cases-report-table tr,
          .cases-report-table th,
          .cases-report-table td {
            display: table-header-group !important;
            visibility: visible !important;
            opacity: 1 !important;
          }

          .cases-report-table tbody {
            display: table-row-group !important;
          }

          .cases-report-table tr {
            display: table-row !important;
          }

          .cases-report-table th,
          .cases-report-table td {
            display: table-cell !important;
          }

          .client-link,
          .case-number-link {
            text-decoration: none !important;
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
            font-family: "Cairo", "Almarai", sans-serif !important;
            color: #000 !important;
            page-break-inside: avoid !important;
            width: 100% !important;
            position: relative !important;
            z-index: 5 !important;
          }

          .print-header-top,
          .print-header-middle {
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

          .print-left,
          .print-right {
            font-weight: bold;
          }
          .print-left {
            text-align: left;
          }
          .print-right {
            text-align: right;
          }

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

          .cases-report-table,
          table {
            display: table !important;
            border-collapse: collapse !important;
            width: 100% !important;
            max-width: 100% !important;
            margin-top: 15px !important;
            page-break-inside: auto !important;
          }

          th,
          td {
            border: 1px solid #000 !important;
            color: black !important;
            padding: 10px !important;
            text-align: center !important;
            font-size: 13px !important;
          }

          tr {
            display: table-row !important;
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

export default CasesReport;
