import React, { useState, useEffect } from "react";
import Layout from "../../components/layout/Layout";
import withAuth from "../../lib/withAuth";
import { supabase } from "../../lib/initSupabase";
import {
  FaBalanceScale,
  FaMoneyBillWave,
  FaUserFriends,
  FaFileInvoiceDollar,
  FaChartPie,
  FaClock,
  FaFileAlt,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { FiDollarSign, FiSearch } from "react-icons/fi";
import ClientsReport from "./ClientsReport";
import AccountingSummary from "./accounting_summary";
import AddExpenses from "../accounting/AddExpenses";
import Payments from "../accounting/add_payments";
import CasesReport from "./CasesReport";
import LegalServicesFees from "./LegalServicesFees";
import LawyerFees from "./LawyerFees";
import ProfitAndLossReport from "./ProfitAndLossReport";
import { useRouter } from "next/router";

const FeesTab = ({ caseId }) => {
  const [userId, setUserId] = useState(null);
  const [feesData, setFeesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserDetails = async () => {
      const user = supabase.auth.user();
      if (user) {
        setUserId(user.id);
      } else {
        router.push("/login");
      }
    };
    fetchUserDetails();
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const fetchFeesData = async () => {
      try {
        let query = supabase
          .from("expenses")
          .select(
            "created_at, expenses_type, expenses_info, case_id,case_number, expenses_amount, lawyer_id, admin_id, currency",
          )
          .or(`admin_id.eq.${userId},lawyer_id.eq.${userId}`);

        // Filter by case_id if provided
        if (caseId) {
          query = query.eq("case_id", caseId);
        }

        const { data: expensesData, error } = await query;

        if (error) {
          console.error("Error fetching expenses:", error);
          setLoading(false);
          return;
        }

        const feesWithLawyerNames = await Promise.all(
          expensesData.map(async (expense) => {
            let username = "Unknown";
            let currency = expense.currency;
            let caseNumber = expense.case_number;

            // Try to get username from lawyer_id first
            if (expense.lawyer_id) {
              const { data: userMetadata, error: userMetadataError } =
                await supabase
                  .from("user_metadata")
                  .select("username, arabic_name")
                  .eq("new_lawyer_id", expense.lawyer_id)
                  .single();

              if (!userMetadataError && userMetadata) {
                username = userMetadata.username || userMetadata.arabic_name || "Unknown";
              }
            }

            // If still unknown, try to get username from admin_id
            if (username === "Unknown" && expense.admin_id) {
              const { data: adminMetadata, error: adminError } =
                await supabase
                  .from("user_metadata")
                  .select("username, arabic_name")
                  .eq("user_id", expense.admin_id)
                  .single();

              if (!adminError && adminMetadata) {
                username = adminMetadata.username || adminMetadata.arabic_name || "Unknown";
              }
            }

            // If currency not in expense, fetch from case
            if (!currency && expense.case_id) {
              const { data: caseData } = await supabase
                .from("cases")
                .select("currency, case_number")
                .eq("id", expense.case_id)
                .single();
              currency = caseData?.currency || "IQD";
              if (!caseNumber && caseData?.case_number) {
                caseNumber = caseData.case_number;
              }
            }

            // If case_number still missing but case_id exists, fetch it
            if (!caseNumber && expense.case_id) {
              const { data: caseData } = await supabase
                .from("cases")
                .select("case_number")
                .eq("id", expense.case_id)
                .single();
              caseNumber = caseData?.case_number || "-";
            }

            return {
              ...expense,
              username: username,
              currency: currency || "IQD",
              case_number: caseNumber || "-",
            };
          }),
        );

        setFeesData(feesWithLawyerNames);
      } catch (error) {
        console.error("Error fetching fees data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeesData();
  }, [userId, caseId]);

  const getCurrencyText = (currency) => {
    if (currency === "IQD") return "دينار";
    if (currency === "USD") return "دولار";
    if (currency === "SAR") return "ريال";
    return "دينار"; // Default
  };

  const handlePrint = () => {
    console.log('Print clicked - loading:', loading, 'feesData.length:', feesData.length);

    if (loading || feesData.length === 0) {
      alert('الرجاء انتظار تحميل البيانات قبل الطباعة');
      return;
    }

    console.log('Proceeding to print with', feesData.length, 'fees');

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
        <title>تقرير الرسوم</title>
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
          <h2>تقرير الرسوم</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>الملف</th>
              <th>رقم الدعوى</th>
              <th>تفاصيل</th>
              <th>نوع الرسوم</th>
              <th>قيمة الرسوم</th>
              <th>المستخدم</th>
            </tr>
          </thead>
          <tbody>
            ${feesData.map((fee) => {
              const currency = fee.currency || 'IQD';
              const currencyText = getCurrencyText(currency);
              return `
                <tr>
                  <td>${new Date(fee.created_at).toLocaleDateString('en-US')}</td>
                  <td>${fee.case_id || '-'}</td>
                  <td>${fee.case_number || '-'}</td>
                  <td>${fee.expenses_info || '-'}</td>
                  <td>${fee.expenses_type || '-'}</td>
                  <td>${fee.expenses_amount ? parseFloat(fee.expenses_amount).toFixed(2) : '0.00'} ${currencyText}</td>
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

  return (
    <div className="fees-tab-container">
      <div className="fees-header">
        <h2>الرسوم</h2>
        <button onClick={handlePrint} className="print-button">معاينة الطباعة</button>
      </div>
      {/* Table Container */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>جاري التحميل...</p>
          </div>
        ) : feesData.length === 0 ? (
          <div className="empty-state">
            <FiDollarSign className="empty-icon" />
            <p>لا توجد بيانات متاحة</p>
          </div>
        ) : (
          <>
          <table className="fees-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الملف</th>
                <th>رقم الدعوى</th>
                <th>تفاصيل</th>
                <th>نوع الرسوم</th>
                <th>قيمة الرسوم</th>
                <th>المستخدم</th>
              </tr>
            </thead>
            <tbody>
              {feesData.map((fee, index) => {
                const currency = fee.currency || "IQD";
                const currencyText = getCurrencyText(currency);
                return (
                  <tr key={index}>
                    <td>
                      {new Date(fee.created_at).toLocaleDateString("en-US")}
                    </td>
                    <td>{fee.case_id || "-"}</td>
                    <td>{fee.case_number || "-"}</td>
                    <td>{fee.expenses_info || "-"}</td>
                    <td>{fee.expenses_type || "-"}</td>
                    <td className="amount-cell">
                      {fee.expenses_amount
                        ? parseFloat(fee.expenses_amount).toFixed(2)
                        : "0.00"}{" "}
                      {currencyText}
                    </td>
                    <td>{fee.username || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mobile-fee-cards">
            {feesData.map((fee, index) => {
              const currency = fee.currency || "IQD";
              const currencyText = getCurrencyText(currency);
              return (
                <div key={index} className="mobile-fee-card">
                  <div className="fee-card-header">
                    <span className="fee-card-type">{fee.expenses_type || "-"}</span>
                    <span className="fee-card-amount">
                      {fee.expenses_amount ? parseFloat(fee.expenses_amount).toFixed(2) : "0.00"} {currencyText}
                    </span>
                  </div>
                  <div className="fee-card-row">
                    <span className="fee-card-label">التاريخ</span>
                    <span className="fee-card-value">{new Date(fee.created_at).toLocaleDateString("en-US")}</span>
                  </div>
                  <div className="fee-card-row">
                    <span className="fee-card-label">الملف</span>
                    <span className="fee-card-value">{fee.case_id || "-"}</span>
                  </div>
                  {fee.case_number && (
                    <div className="fee-card-row">
                      <span className="fee-card-label">رقم الدعوى</span>
                      <span className="fee-card-value">{fee.case_number}</span>
                    </div>
                  )}
                  {fee.expenses_info && (
                    <div className="fee-card-row">
                      <span className="fee-card-label">تفاصيل</span>
                      <span className="fee-card-value">{fee.expenses_info}</span>
                    </div>
                  )}
                  <div className="fee-card-row">
                    <span className="fee-card-label">المستخدم</span>
                    <span className="fee-card-value">{fee.username || "-"}</span>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      <style jsx>{`
        .fees-tab-container {
          width: 100%;
          direction: rtl;
          font-family:
            "Almarai",
            "Cairo",
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .fees-header {
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

        .fees-header h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .print-button {
          padding: 12px 24px;
          background: #3b82f6;
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
          background: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
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
        }

        .fees-table {
          width: 100%;
          border-collapse: collapse;
        }

        .fees-table thead {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-bottom: 2px solid #e5e7eb;
        }

        .fees-table th {
          padding: 18px 24px;
          text-align: right;
          font-weight: 700;
          color: #1f2937;
          font-size: 0.9375rem;
          white-space: nowrap;
          letter-spacing: -0.01em;
          font-family: "Almarai", "Cairo", sans-serif;
        }

        .fees-table td {
          padding: 16px 24px;
          text-align: right;
          border-bottom: 1px solid #f3f4f6;
          color: #374151;
          font-size: 0.9375rem;
          line-height: 1.6;
          font-weight: 400;
          font-family: "Almarai", "Cairo", sans-serif;
        }

        .fees-table tbody tr {
          background-color: #ffffff;
          transition: background-color 0.15s ease;
        }

        .fees-table tbody tr:hover {
          background-color: #f9fafb;
        }

        .fees-table tbody tr:nth-child(even) {
          background-color: #fafbfc;
        }

        .fees-table tbody tr:nth-child(even):hover {
          background-color: #f3f4f6;
        }

        .fees-table tbody tr:last-child td {
          border-bottom: none;
        }

        .amount-cell {
          font-weight: 600;
          color: #1f2937;
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

        /* Mobile fee cards - hidden on desktop */
        .mobile-fee-cards {
          display: none;
        }

        @media (max-width: 768px) {
          .section-title {
            font-size: 1.25rem;
          }

          .fees-table {
            display: none;
          }

          .mobile-fee-cards {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 10px;
          }

          .mobile-fee-card {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .fee-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 8px;
            border-bottom: 1px solid #f3f4f6;
          }

          .fee-card-type {
            font-size: 14px;
            font-weight: 600;
            color: #1e293b;
            background: #f1f5f9;
            padding: 3px 10px;
            border-radius: 6px;
          }

          .fee-card-amount {
            font-size: 14px;
            font-weight: 700;
            color: #059669;
          }

          .fee-card-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            color: #374151;
          }

          .fee-card-label {
            font-weight: 600;
            color: #6b7280;
          }

          .fee-card-value {
            font-weight: 500;
          }

          .table-container {
            border-radius: 12px;
            box-shadow: none;
            border: none;
          }
        }
      `}</style>
    </div>
  );
};

const Accounting = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("cases-report");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleMobileTabClick = (tab) => {
    setActiveTab(prev => prev === tab ? null : tab);
  };

  // Handle query parameters for tab and case_id
  useEffect(() => {
    if (router.isReady) {
      const { tab, case_id } = router.query;
      if (tab) {
        setActiveTab(tab);
      }
    }
  }, [router.isReady, router.query]);

  const renderContent = () => {
    switch (activeTab) {
      case "fees":
        return (
          <FeesTab
            caseId={
              router.query.case_id ? parseInt(router.query.case_id) : null
            }
          />
        );
      case "clients-report":
        return <ClientsReport />;
      case "expenses-report":
        return <AccountingSummary />;
      case "payments":
        return <AddExpenses />;
      case "add_payments":
        return <Payments />;
      case "cases-report":
        return <CasesReport />;
      case "legal-services-fees":
        return <LegalServicesFees />;
      case "lawyer-fees":
        return <LawyerFees />;
      case "profit-loss":
        return <ProfitAndLossReport />;
      default:
        return (
          <div className="default-message">
            <p>اختر فئة من الأعلى لإدارة السجلات المالية</p>
          </div>
        );
    }
  };

  return (
    <Layout>
      <div className="accounting-page">
        {/* Mobile Menu Button */}
        <div className="mobile-menu-wrapper">
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        <div className="main-container">
          {/* Sidebar Menu */}
          <div className={`sidebar-menu ${sidebarOpen ? "open" : ""}`}>
            <button
              className="sidebar-close-btn"
              onClick={() => setSidebarOpen(false)}
            >
              <FaTimes />
            </button>
            <nav>
              <div className="menu-section">
                <h3 className="menu-section-title">القائمة الرئيسية</h3>
                <div className="menu-items-container">
                  <button
                    className={`menu-item ${activeTab === "cases-report" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("cases-report");
                      setSidebarOpen(false);
                    }}
                  >
                    <div className="menu-item-content">
                      <FaFileAlt className="menu-item-icon" size={24} />
                      <span>التقرير المالي للقضايا</span>
                    </div>
                  </button>
                  <button
                    className={`menu-item ${activeTab === "clients-report" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("clients-report");
                      setSidebarOpen(false);
                    }}
                  >
                    <div className="menu-item-content">
                      <FaUserFriends className="menu-item-icon" size={24} />
                      <span>الموكلين</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="menu-section">
                <h3 className="menu-section-title">الحسابات والرسوم</h3>
                <div className="menu-items-container">
                  <button
                    className={`menu-item ${activeTab === "fees" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("fees");
                      setSidebarOpen(false);
                    }}
                  >
                    <div className="menu-item-content">
                      <FaMoneyBillWave className="menu-item-icon" size={24} />
                      <span>الرسوم</span>
                    </div>
                  </button>
                  <button
                    className={`menu-item ${activeTab === "add_payments" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("add_payments");
                      setSidebarOpen(false);
                    }}
                  >
                    <div className="menu-item-content">
                      <FaMoneyBillWave className="menu-item-icon" size={24} />
                      <span>الدفعات</span>
                    </div>
                  </button>
                  <button
                    className={`menu-item ${activeTab === "payments" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("payments");
                      setSidebarOpen(false);
                    }}
                  >
                    <div className="menu-item-content">
                      <FaClock className="menu-item-icon" size={24} />
                      <span>المصاريف</span>
                    </div>
                  </button>
                  <button
                    className={`menu-item ${activeTab === "legal-services-fees" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("legal-services-fees");
                      setSidebarOpen(false);
                    }}
                  >
                    <div className="menu-item-content">
                      <FaFileInvoiceDollar
                        className="menu-item-icon"
                        size={24}
                      />
                      <span>رسوم الخدمات القانونية</span>
                    </div>
                  </button>
                  <button
                    className={`menu-item ${activeTab === "lawyer-fees" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("lawyer-fees");
                      setSidebarOpen(false);
                    }}
                  >
                    <div className="menu-item-content">
                      <FiDollarSign className="menu-item-icon" size={24} />
                      <span>أتعاب المحاماة</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="menu-section">
                <h3 className="menu-section-title">التقارير</h3>
                <div className="menu-items-container">
                  <button
                    className={`menu-item ${activeTab === "expenses-report" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("expenses-report");
                      setSidebarOpen(false);
                    }}
                  >
                    <div className="menu-item-content">
                      <FaChartPie className="menu-item-icon" size={24} />
                      <span>تقرير المحاسبة</span>
                    </div>
                  </button>
                  <button
                    className={`menu-item ${activeTab === "profit-loss" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("profit-loss");
                      setSidebarOpen(false);
                    }}
                  >
                    <div className="menu-item-content">
                      <FaChartPie className="menu-item-icon" size={24} />
                      <span>الأرباح والخسائر</span>
                    </div>
                  </button>
                </div>
              </div>
            </nav>
          </div>

          {/* Mobile Accordion Tab Navigation */}
          <div className="mobile-tab-nav">
            <div className="mobile-tab-scroll">
              {[
                { id: 'cases-report', label: 'التقرير المالي للقضايا' },
                { id: 'clients-report', label: 'الموكلين' },
                { id: 'fees', label: 'الرسوم' },
                { id: 'add_payments', label: 'الدفعات' },
                { id: 'payments', label: 'المصاريف' },
                { id: 'legal-services-fees', label: 'رسوم الخدمات القانونية' },
                { id: 'lawyer-fees', label: 'أتعاب المحاماة' },
                { id: 'expenses-report', label: 'تقرير المحاسبة' },
                { id: 'profit-loss', label: 'الأرباح والخسائر' },
              ].map((tab) => (
                <React.Fragment key={tab.id}>
                  <button
                    className={`mobile-tab ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => handleMobileTabClick(tab.id)}
                  >
                    <span>{tab.label}</span>
                    <span className={`mobile-tab-chevron ${activeTab === tab.id ? 'open' : ''}`}>▾</span>
                  </button>
                  {activeTab === tab.id && (
                    <div className="mobile-tab-content">
                      {renderContent()}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content Area - desktop only */}
          <div className="tabs-table-container">{renderContent()}</div>
        </div>
      </div>

      <style jsx>{`
        .accounting-page {
          direction: rtl;
          min-height: auto;
          background: transparent;
          padding: 0;
          font-family:
            "Cairo",
            "Almarai",
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        @media print {
          .accounting-page {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }

          .main-container {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .sidebar-menu {
            display: none !important;
          }

          .mobile-tab-nav {
            display: none !important;
          }

          .tabs-table-container {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
        }

        /* Mobile Menu Wrapper */
        .mobile-menu-wrapper {
          display: none;
          padding: 16px 20px;
        }

        .mobile-menu-btn {
          background: none;
          border: none;
          font-size: 22px;
          color: #3b82f6;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Mobile Tab Nav - hidden on desktop */
        .mobile-tab-nav {
          display: none;
        }

        /* Main Container - matches CaseDetailsPage */
        .main-container {
          display: flex;
          direction: rtl;
          font-family:
            "Cairo",
            "Almarai",
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          background: #ffffff;
          min-height: auto;
          height: auto;
          margin-top: 0;
          margin-bottom: 0;
          align-items: flex-start;
          overflow: visible;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);
          border-radius: 0;
        }

        /* Unified Sidebar and Content Design */
        .main-container > :first-child {
          border-right: 1px solid #e5e7eb;
          background: #ffffff;
        }

        .main-container > :first-child:hover {
          background: #ffffff;
        }

        /* Sidebar Menu - matches SidebarMenu component */
        .sidebar-menu {
          position: relative;
          direction: rtl;
          width: 300px;
          background: #ffffff;
          border-right: 1px solid #e5e7eb;
          padding: 24px 0 24px 0;
          flex-shrink: 0;
          z-index: 10;
          overflow-y: auto;
          box-sizing: border-box;
          font-family: "Cairo", "Almarai", sans-serif;
          height: 100%;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e0 #f1f5f9;
        }

        .sidebar-menu::-webkit-scrollbar {
          width: 6px;
        }

        .sidebar-menu::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .sidebar-menu::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 3px;
        }

        .sidebar-menu::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .sidebar-menu::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }

        .sidebar-menu nav {
          display: flex;
          flex-direction: column;
          gap: 0;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        .sidebar-menu nav::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }

        .sidebar-menu * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        .sidebar-menu *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }

        .sidebar-close-btn {
          display: none;
          position: absolute;
          top: 16px;
          left: 16px;
          background: none;
          border: none;
          font-size: 20px;
          color: #64748b;
          cursor: pointer;
          padding: 8px;
          z-index: 1001;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .sidebar-close-btn:hover {
          background: #f1f5f9;
        }

        .menu-section {
          display: flex;
          flex-direction: column;
          margin-bottom: 20px;
          padding: 0 12px;
        }

        .menu-section:first-child {
          margin-top: 0;
          border-radius: 0;
          overflow: visible;
          background: #ffffff;
        }

        .menu-section-title {
          padding: 12px 16px 10px 16px;
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 6px;
          text-align: right;
          font-family: "Cairo", "Almarai", sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e2e8f0;
          background: transparent;
        }

        /* Make القائمة الرئيسية text stand out */
        .menu-section:first-child .menu-section-title {
          color: #1e293b;
          font-weight: 700;
          font-size: 20px;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 10px;
          padding-top: 10px;
          margin-top: -12px;
          margin-bottom: 10px;
          background: #ffffff;
          border-radius: 0;
        }

        .menu-items-container {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .menu-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 11px 16px;
          margin: 0 0 4px 0;
          text-align: right;
          border-radius: 10px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          background: transparent;
          border: none;
          border-right: 3px solid transparent;
          cursor: pointer;
          text-decoration: none;
          color: #475569;
          position: relative;
        }

        .menu-section:first-child .menu-item {
          margin: 2px 0;
          padding: 12px 16px;
        }

        .menu-item-content {
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: 14px;
          font-weight: 500;
          font-family: "Cairo", "Almarai", sans-serif;
          flex: 1;
          color: inherit;
        }

        .menu-section:first-child .menu-item-content {
          font-weight: 500;
        }

        /* Menu item text color */
        .menu-item span {
          color: inherit;
        }

        .menu-item-icon {
          width: 22px;
          height: 22px;
          flex-shrink: 0;
          transition: color 0.15s ease;
          stroke-width: 2;
          color: #64748b;
        }

        .menu-section:first-child .menu-item-icon {
          width: 24px;
          height: 24px;
        }

        /* --- States --- */
        .menu-item.active {
          background: linear-gradient(
            135deg,
            #eff6ff 0%,
            #dbeafe 100%
          ) !important;
          color: #1e40af !important;
          font-weight: 600;
          border-right: 3px solid #3b82f6 !important;
          box-shadow:
            0 2px 8px rgba(59, 130, 246, 0.15),
            0 1px 3px rgba(59, 130, 246, 0.1);
          transform: translateX(-2px);
        }

        .menu-section:first-child .menu-item.active {
          background: linear-gradient(
            135deg,
            #dbeafe 0%,
            #eff6ff 100%
          ) !important;
          font-weight: 600;
        }

        .menu-item.active:focus {
          background: #eff6ff !important;
          color: #1e40af !important;
          outline: none;
        }

        .menu-item.active:active {
          background: #dbeafe !important;
          color: #1e40af !important;
        }

        .menu-item:not(.active) {
          color: #475569;
        }

        .menu-item.active .menu-item-icon {
          color: #3b82f6;
        }

        /* Content Area - matches tabs-table-container */
        .tabs-table-container {
          flex: 1;
          margin: 0;
          padding: 24px 32px;
          background-color: #ffffff;
          min-height: 100%;
          height: auto;
          direction: rtl;
          font-family:
            "Cairo",
            "Almarai",
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          box-sizing: border-box;
          overflow: visible;
          display: flex;
          flex-direction: column;
          gap: 0;
          border-left: 1px solid #e5e7eb;
        }

        @media (min-width: 769px) {
          .tabs-table-container {
            overflow: hidden;
            padding: 24px 32px;
          }
        }

        .tabs-table-container > * {
          flex-shrink: 0;
        }

        .tabs-table-container > div {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .default-message {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 120px 20px;
          text-align: center;
          gap: 12px;
          color: #9ca3af;
        }

        .default-message::before {
          content: "📋";
          font-size: 48px;
          opacity: 0.2;
          margin-bottom: 4px;
        }

        .default-message p {
          margin: 0;
          font-size: 1rem;
          font-weight: 400;
          color: #6b7280;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .accounting-page {
            min-height: auto;
            padding-bottom: 0;
          }

          .mobile-menu-wrapper {
            display: none !important;
          }

          .sidebar-menu {
            display: none !important;
          }

          .main-container {
            flex-direction: column;
            min-height: auto;
            box-shadow: none;
          }

          .main-container > :first-child {
            border-right: none;
          }

          .mobile-tab-nav {
            display: block;
            width: 100%;
            direction: rtl;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            padding: 0;
            margin-bottom: 12px;
          }

          .mobile-tab-scroll {
            display: flex;
            flex-direction: column;
            gap: 0;
          }

          .mobile-tab {
            display: flex;
            align-items: center;
            justify-content: space-between;
            text-align: right;
            width: 100%;
            padding: 14px 20px;
            border: none;
            border-bottom: 1px solid #e5e7eb;
            background: #ffffff;
            color: #000000;
            font-size: 15px;
            font-weight: 700;
            font-family: 'Cairo', 'Almarai', sans-serif;
            border-radius: 0;
            cursor: pointer;
            transition: background 0.15s ease;
          }

          .mobile-tab.active {
            background: #eff6ff;
            color: #1e40af;
            font-weight: 700;
            border-bottom: 1px solid #dbeafe;
          }

          .mobile-tab-chevron {
            font-size: 14px;
            transition: transform 0.2s ease;
            color: #94a3b8;
          }

          .mobile-tab-chevron.open {
            transform: rotate(180deg);
            color: #2563eb;
          }

          .mobile-tab-content {
            padding: 8px 10px;
            background: #ffffff;
            border-bottom: 2px solid #dbeafe;
            animation: slideDown 0.25s ease;
          }

          @keyframes slideDown {
            from { opacity: 0; max-height: 0; }
            to { opacity: 1; max-height: 2000px; }
          }

          /* Hide desktop content area on mobile */
          .tabs-table-container {
            display: none !important;
          }
        }
      `}</style>
    </Layout>
  );
};

export default withAuth(Accounting, ['can_view_accounts_schedule']);
