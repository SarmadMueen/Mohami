import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSubscription } from '../../context/SubscriptionContext';

import {
  AiOutlineUser,
  AiOutlineGlobal,
  AiOutlineMail,
  AiOutlineIdcard,
  AiOutlineFile,
  AiOutlineEnvironment,
  AiOutlinePrinter,
  AiOutlineEdit,
  AiOutlineHistory,
  AiOutlineSync,
  AiOutlinePhone,
  AiOutlineCalendar,
  AiOutlineCheckCircle,
  AiOutlineDown,
  AiOutlineLock,
  AiOutlineSetting,
  AiOutlineCloseCircle
} from 'react-icons/ai';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ViewClient = () => {
  const router = useRouter();
  const { isReadOnly, loading: subLoading } = useSubscription();
  const [clientInfo, setClientInfo] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientCases, setClientCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("الحسابات");
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [message, setMessage] = useState('');
  const [summary, setSummary] = useState({
    totalCases: 0,
    totalPayments: 0,
    totalExpenses: 0,
  });
  const [accountingInfo, setAccountingInfo] = useState([]);

  const [accountingData, setAccountingData] = useState([]);
  const [activeFinancialTab, setActiveFinancialTab] = useState("fees"); // 'fees' or 'expenses'
  const [feesData, setFeesData] = useState([]);
  const [expensesData, setExpensesData] = useState([]);

  const [chartData, setChartData] = useState(null);
  
  // Portal Messaging State
  const [hasPortalAccount, setHasPortalAccount] = useState(false);
  const [portalMessages, setPortalMessages] = useState([]);
  const [newPortalMessage, setNewPortalMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [portalAccountId, setPortalAccountId] = useState(null);
  const [adminName, setAdminName] = useState('');
  const messagesEndRef = React.useRef(null);

  // Account Management State
  const [accountDetails, setAccountDetails] = useState(null);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordMessage, setResetPasswordMessage] = useState(null);
  const [togglePortalLoading, setTogglePortalLoading] = useState(false);

  // Account Creation State
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [createAccountEmail, setCreateAccountEmail] = useState('');
  const [createAccountPassword, setCreateAccountPassword] = useState('');
  const [createAccountLoading, setCreateAccountLoading] = useState(false);
  const [createAccountMessage, setCreateAccountMessage] = useState(null);

  // Accordion State for Mobile
  const [openAccordion, setOpenAccordion] = useState('identity');

  const toggleAccordion = (accordionName) => {
    setOpenAccordion(openAccordion === accordionName ? null : accordionName);
  };

  /* PDF Generation using jsPDF with Custom Font for Arabic Support */
  const generateClientReport = async () => {
    try {
      setLoadingReports(true);

      const doc = new jsPDF('p', 'mm', 'a4');

      // 1. Load Arabic Font (Amiri)
      const fontUrl = '/templates/Amiri/Amiri-Regular.ttf';
      const fontResponse = await fetch(fontUrl);
      if (!fontResponse.ok) throw new Error("Could not fetch font");
      const fontBlob = await fontResponse.blob();

      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(fontBlob);
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1];

        // 2. Add Font to jsPDF
        doc.addFileToVFS('Amiri-Regular.ttf', base64data);
        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
        doc.setFont('Amiri'); // Set default font

        // 3. Build the PDF Content using Vector Text

        // -- Header --
        doc.setFontSize(22);
        doc.setTextColor(30, 64, 175); // Dark Blue
        doc.text("تقرير العميل", 200, 20, { align: "right" });
        doc.setFontSize(14);
        doc.setTextColor(100);
        doc.text("Client Report", 200, 28, { align: "right" });

        doc.setFontSize(10);
        doc.setTextColor(100);
        
        const formatDateSimple = (d) => {
          if (!d) return '-';
          const date = new Date(d);
          if (isNaN(date.getTime())) return '-';
          return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        };

        const today = new Date();
        const dateStr = formatDateSimple(today);
        doc.text(`التاريخ: ${dateStr}`, 20, 20, { align: "left" });

        doc.setDrawColor(226, 232, 240);
        doc.line(10, 35, 200, 35);

        // -- Client Info Section --
        let startY = 45;
        doc.setFontSize(16);
        doc.setTextColor(30, 64, 175);
        doc.text("معلومات العميل", 200, startY, { align: "right" });

        startY += 10;
        doc.setFontSize(12);
        doc.setTextColor(0);

        const rightColX = 200;
        doc.text(`الاسم: ${clientInfo.client_name || '-'}`, rightColX, startY, { align: "right" });
        doc.text(`الهاتف: ${clientInfo.phone || '-'}`, rightColX - 60, startY, { align: "right" });

        startY += 10;
        doc.text(`البريد: ${clientInfo.email || '-'}`, rightColX, startY, { align: "right" });
        doc.text(`العنوان: ${clientInfo.address || '-'}`, rightColX - 60, startY, { align: "right" });

        startY += 15;

        // -- Financial Summary --
        doc.setFontSize(16);
        doc.setTextColor(30, 64, 175);
        doc.text("الملخص المالي", 200, startY, { align: "right" });
        startY += 10;

        const totalFees = feesData.reduce((acc, item) => acc + (parseFloat(item.fee_amount) || 0), 0);
        const totalExpenses = expensesData.reduce((acc, item) => acc + (parseFloat(item.expenses_amount) || 0), 0);
        const totalPaid = expensesData.reduce((acc, item) => acc + (parseFloat(item.paid_amount) || 0), 0);
        const balance = totalExpenses - totalPaid;

        const headFinancials = [['رصيد الرسوم', 'المدفوع', 'إجمالي الرسوم', 'إجمالي الأتعاب']];
        const bodyFinancials = [[
          balance.toLocaleString(),
          totalPaid.toLocaleString(),
          totalExpenses.toLocaleString(),
          totalFees.toLocaleString(),
        ]];

        doc.autoTable({
          startY: startY,
          head: headFinancials,
          body: bodyFinancials,
          theme: 'grid',
          styles: {
            font: 'Amiri',
            halign: 'center',
            cellPadding: 4,
            fontSize: 12
          },
          headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
          columnStyles: {
            0: { textColor: [220, 38, 38], fontStyle: 'bold' } // Balance in red
          }
        });

        startY = doc.lastAutoTable.finalY + 20;

        // -- Cases Details --
        doc.setFontSize(16);
        doc.setTextColor(30, 64, 175);
        doc.text("تفاصيل القضايا", 200, startY, { align: "right" });
        startY += 10;

        const casesHead = [['المبلغ المتفق عليه', 'التاريخ', 'نوع القضية', 'رقم القضية']];
        const casesBody = feesData.map(item => [
          parseFloat(item.fee_amount || 0).toLocaleString(),
          formatDateSimple(item.case_date),
          item.case_type || '-',
          item.case_number || '-'
        ]);

        doc.autoTable({
          startY: startY,
          head: casesHead,
          body: casesBody,
          theme: 'striped',
          styles: {
            font: 'Amiri',
            halign: 'right',
            cellPadding: 3,
            fontSize: 11
          },
          headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [255, 255, 255] },
        });

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(10);
          doc.setTextColor(150);
          doc.text(`صفحة ${i} من ${pageCount}`, 105, 290, { align: "center" });
          doc.text("تم إصدار التقرير بواسطة نظام إدارة ملفات المحاماة", 105, 285, { align: "center" });
        }

        doc.save(`${clientInfo.client_name}_Report.pdf`);
        setLoadingReports(false);
      };

    } catch (err) {
      console.error("PDF Generate Error:", err);
      alert("فشل إنشاء التقرير. يرجى التأكد من توفر خطوط الطباعة.");
      setLoadingReports(false);
    }
  };

  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [selectedRangeOption, setSelectedRangeOption] = useState('هذه السنة');
  const [customRange, setCustomRange] = useState({ start: null, end: null });
  const [rangeText, setRangeText] = useState('');

  const calculateDateRange = (option) => {
    const today = new Date();
    const end = new Date(today);
    let start = new Date(today);

    switch (option) {
      case 'هذا الشهر':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'الشهر الماضي':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end.setDate(0);
        break;
      case 'اخر 3 أشهر':
        start.setMonth(today.getMonth() - 2);
        start.setDate(1);
        break;
      case 'اخر 6 أشهر':
        start.setMonth(today.getMonth() - 5);
        start.setDate(1);
        break;
      case 'هذه السنة':
        start = new Date(today.getFullYear(), 0, 1);
        break;
      case 'السنة الماضية':
        start = new Date(today.getFullYear() - 1, 0, 1);
        end.setFullYear(today.getFullYear() - 1, 11, 31);
        break;
      case 'نطاق مخصص':
        return customRange;
      default:
        start = new Date(today.getFullYear(), 0, 1);
    }
    return { start, end };
  };

  const formatDate = (date) => {
    if (!date) return '';
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const handleRangeSelect = (option) => {
    setSelectedRangeOption(option);
    const { start, end } = calculateDateRange(option);
    if (start && end) {
      setRangeText(`${formatDate(end)} - ${formatDate(start)}`);
      prepareChartData(clientCases, start, end);
      setDateRangeOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateRangeOpen && !event.target.closest('.date-range-container')) {
        setDateRangeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dateRangeOpen]);


  const fetchAccountingData = async (clientName) => {
    try {
      const { data, error } = await supabase
        .from("accounting_data")
        .select("*")
        .eq("client_name", clientName);

      if (error) throw error;
      setAccountingData(data || []);
      processAccountingData(data || []);
    } catch (error) {
      console.error("Error fetching accounting data:", error.message);
    }
  };

  const processAccountingData = (data) => {
    const totalPayments = data.reduce((acc, item) => acc + parseFloat(item.paid_amount || 0), 0);
    const totalExpenses = data.reduce((acc, item) => acc + parseFloat(item.expenses_amount || 0), 0);
    setAccountingData({
      totalPayments,
      totalExpenses,
      cases: data,
    });
  };


  const prepareChartData = (cases, startDate = null, endDate = null) => {
    if (!startDate || !endDate) {
      const { start, end } = calculateDateRange('هذه السنة');
      startDate = start;
      endDate = end;
      setRangeText(`${formatDate(end)} - ${formatDate(start)}`);
    }

    const arabicMonths = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
    ];

    let labels = [];
    let current = new Date(startDate);
    current.setDate(1);

    while (current <= endDate) {
      labels.push(`${current.getMonth() + 1}-${current.getFullYear()}`);
      current.setMonth(current.getMonth() + 1);
    }

    if (labels.length === 0) {
      labels.push(`${endDate.getMonth() + 1}-${endDate.getFullYear()}`);
    }

    const types = [...new Set(cases.map((c) => c.caseType))];

    const data = labels.reduce((acc, label) => {
      types.forEach((type) => {
        acc[`${type}-${label}`] = 0;
      });
      return acc;
    }, {});

    cases.forEach((curr) => {
      const date = new Date(curr.caseDate);
      if (isNaN(date.getTime())) return;
      if (date < startDate || date > endDate) return;

      const monthYear = `${date.getMonth() + 1}-${date.getFullYear()}`;
      const key = `${curr.caseType}-${monthYear}`;
      if (data[key] !== undefined) {
        data[key] = (data[key] || 0) + 1;
      }
    });

    const datasets = types.map((type) => ({
      label: type,
      data: labels.map((monthYear) => data[`${type}-${monthYear}`] || 0),
      backgroundColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(
        Math.random() * 255
      )}, ${Math.floor(Math.random() * 255)}, 0.5)`,
      barPercentage: 0.5,
      categoryPercentage: 0.8,
    }));

    setChartData({
      labels: labels.map((label) => {
        const [month, year] = label.split('-');
        const monthName = arabicMonths[Number(month) - 1];
        return `${monthName} ${year}`;
      }),
      datasets,
    });
  };

  useEffect(() => {
    const fetchClientInfo = async () => {
      try {
        const clientId = router.query.id;
        if (!clientId) return;

        const { data, error } = await supabase
          .from("clients_data")
          .select("*")
          .eq("id", clientId);

        if (error) throw error;
        if (data && data.length > 0) {
          const clientData = data[0];
          setClientInfo(clientData);
          fetchClientCases(clientData);
          checkPortalAccount(clientId);
        }
      } catch (error) {
        console.error("Error fetching client info:", error.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchAdminName = async () => {
      const user = supabase.auth.user();
      if (!user) return;
      const { data } = await supabase
        .from('user_metadata')
        .select('arabic_name')
        .eq('user_id', user.id)
        .single();
      if (data?.arabic_name) setAdminName(data.arabic_name);
    };



    async function checkPortalAccount(clientId) {
      try {
        const { data, error } = await supabase
          .from('client_accounts')
          .select('id, auth_user_id')
          .eq('client_data_id', clientId)
          .single();
        
        if (!error && data) {
          setHasPortalAccount(true);
          setPortalAccountId(data.id);
          fetchPortalMessages(clientId);
          subscribePortalMessages(clientId);
        } else {
          setHasPortalAccount(false);
        }
      } catch (err) {
        console.error('Error checking portal account:', err);
      }
    };

    const fetchPortalMessages = async (clientId) => {
      const { data, error } = await supabase
        .from('client_messages')
        .select('*')
        .eq('client_data_id', clientId)
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        setPortalMessages(data);
        markMessagesAsRead(clientId);
      }
    };

    const markMessagesAsRead = async (clientId) => {
      await supabase
        .from('client_messages')
        .update({ is_read: true })
        .eq('client_data_id', clientId)
        .eq('sender_type', 'client')
        .eq('is_read', false);
    };

    const subscribePortalMessages = (clientId) => {
      const channel = supabase
        .channel(`public:client_messages:client_data_id=eq.${clientId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'client_messages',
          filter: `client_data_id=eq.${clientId}`
        }, (payload) => {
          setPortalMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          if (payload.new.sender_type === 'client') markMessagesAsRead(clientId);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const fetchClientCases = async (clientData) => {
      try {
        const clientName = clientData.client_name;
        const user = supabase.auth.user();
        if (!user) return;

        const firmAdminId = await (async () => {
           const { data } = await supabase.from('user_metadata').select('admin_user_id').eq('user_id', user.id).single();
           return data?.admin_user_id || user.id;
        })();
        const effectiveAdminId = firmAdminId || user.id;

        let query = supabase
          .from("cases")
          .select("*")
          .eq("client_name", clientName);

        const queryCondition = `admin_id.eq.${effectiveAdminId},lawyer_id.eq.${effectiveAdminId},admin_id.eq.${user.id},lawyer_id.eq.${user.id}`;

        let extendedCondition = queryCondition;
        if (clientData.admin_id) extendedCondition += `,admin_id.eq.${clientData.admin_id}`;
        if (clientData.lawyer_id) extendedCondition += `,lawyer_id.eq.${clientData.lawyer_id}`;

        query = query.or(extendedCondition);

        const { data, error } = await query;
        if (error) throw error;
        setClientCases(data || []);

        fetchFinancials(data);
        prepareChartData(data);
      } catch (error) {
        console.error("Error fetching client cases:", error.message);
      }
    };

    const fetchFinancials = async (casesData) => {
      try {
        if (!casesData || casesData.length === 0) return;
        const caseIds = casesData.map((caseItem) => caseItem.id);

        const { data: expensesData, error: expensesError } = await supabase
          .from("expenses")
          .select("*")
          .in("case_id", caseIds)
          .order('payment_date', { ascending: false });

        if (expensesError) throw new Error(expensesError.message);
        setExpensesData(expensesData || []);

        const totalsByCase = (expensesData || []).reduce((acc, expense) => {
          const { case_id, paid_amount, expenses_amount } = expense;
          if (!acc[case_id]) {
            acc[case_id] = { totalPaid: 0, totalExpenses: 0 };
          }
          acc[case_id].totalPaid += parseFloat(paid_amount) || 0;
          acc[case_id].totalExpenses += parseFloat(expenses_amount) || 0;
          return acc;
        }, {});

        const updatedClientCases = casesData.map((caseItem) => ({
          ...caseItem,
          total_payments: totalsByCase[caseItem.id]?.totalPaid ?? 0,
          total_expenses: totalsByCase[caseItem.id]?.totalExpenses ?? 0,
          balance: (totalsByCase[caseItem.id]?.totalPaid ?? 0) -
            (totalsByCase[caseItem.id]?.totalExpenses ?? 0),
        }));

        setClientCases(updatedClientCases);

        const feesSummary = casesData.map(c => ({
          id: c.id,
          case_number: c.case_number,
          case_type: c.caseType,
          fee_amount: c.totalAmount || 0,
          case_date: c.caseDate
        }));
        setFeesData(feesSummary);

      } catch (error) {
        console.error("Error fetching financials:", error.message);
      }
    };

    fetchClientInfo();
    fetchAdminName();
  }, [router.query.id]);

  useEffect(() => {
    if (activeTab === "الحسابات") {
      fetchAccountingData();
    }
  }, [activeTab]);


  const handleTabChange = (tab) => {
    const scrollPosition = window.scrollY || window.pageYOffset;
    setActiveTab(tab);
    setTimeout(() => {
      window.scrollTo({
        top: scrollPosition,
        behavior: 'instant'
      });
    }, 0);
  };

  useEffect(() => {
    const preventSelection = (e) => {
      let target = e.target;
      if (target.nodeType === 3) target = target.parentNode;
      if (target && target.closest && (target.closest('.custom-tabs-list') || target.closest('.custom-tab-btn'))) {
        e.preventDefault();
      }
    };
    document.addEventListener('selectstart', preventSelection);
    return () => document.removeEventListener('selectstart', preventSelection);
  }, []);

  useEffect(() => {
    if (activeTab === "المراسلات") {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, portalMessages]);

  useEffect(() => {
    if (activeTab === "إدارة حساب الموكل" && hasPortalAccount) {
      fetchAccountDetails();
    }
  }, [activeTab, hasPortalAccount, portalAccountId]);

  const handleSendPortalMessage = async (e) => {
    e.preventDefault();
    if (!newPortalMessage.trim() || sendingMessage || !clientInfo) return;

    setSendingMessage(true);
    try {
      const user = supabase.auth.user();
      const adminId = await (async () => {
        const { data } = await supabase.from('user_metadata').select('admin_user_id').eq('user_id', user.id).single();
        return data?.admin_user_id || user.id;
      })();

      const messageText = newPortalMessage.trim();
      const { data, error } = await supabase.from('client_messages').insert([{
        client_data_id: clientInfo.id,
        admin_id: adminId,
        sender_type: 'lawyer',
        sender_id: user.id,
        message_text: messageText,
      }]).single();

      if (error) throw error;
      // Optimistic update: add sent message to state immediately
      if (data) {
        setPortalMessages(prev => {
          if (prev.find(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
      } else {
        // Fallback if no data returned
        setPortalMessages(prev => [...prev, {
          id: `temp-${Date.now()}`,
          client_data_id: clientInfo.id,
          admin_id: adminId,
          sender_type: 'lawyer',
          sender_id: user.id,
          message_text: messageText,
          is_read: false,
          created_at: new Date().toISOString(),
        }]);
      }
      setNewPortalMessage('');
    } catch (err) {
      console.error('Send error:', err);
      alert('فشل إرسال الرسالة');
    } finally {
      setSendingMessage(false);
    }
  };

  const fetchAccountDetails = async () => {
    if (!hasPortalAccount || !portalAccountId) return;

    try {
      // Get client account details including email
      const { data: clientAccount, error: accountError } = await supabase
        .from('client_accounts')
        .select('*')
        .eq('id', portalAccountId)
        .single();

      if (accountError) throw accountError;

      // Use email from client_accounts table if available, otherwise try auth API
      let email = clientAccount.email;

      if (!email) {
        // Fallback: try to get email from auth API
        try {
          const { data: userData, error: userError } = await supabase.auth.api.getUserById(clientAccount.auth_user_id);
          if (!userError && userData?.email) {
            email = userData.email;
          }
        } catch (authError) {
          console.warn('Could not fetch auth user by ID:', authError);
        }
      }

      setAccountDetails({
        email: email || 'غير متوفر',
        created_at: clientAccount.created_at,
        last_login: clientAccount.last_login,
        is_portal_enabled: clientAccount.is_portal_enabled,
        auth_user_id: clientAccount.auth_user_id
      });
    } catch (error) {
      console.error('Error fetching account details:', error);
      // Set empty account details on error to avoid infinite loading
      setAccountDetails({
        email: 'غير متوفر',
        created_at: null,
        last_login: null,
        is_portal_enabled: false,
        auth_user_id: null
      });
    }
  };

  const handleTogglePortal = async () => {
    if (!accountDetails || togglePortalLoading) return;

    setTogglePortalLoading(true);
    try {
      const { error } = await supabase
        .from('client_accounts')
        .update({ is_portal_enabled: !accountDetails.is_portal_enabled })
        .eq('id', portalAccountId);

      if (error) throw error;

      // Update local state
      setAccountDetails(prev => ({
        ...prev,
        is_portal_enabled: !prev.is_portal_enabled
      }));
    } catch (error) {
      console.error('Error toggling portal access:', error);
      alert('فشل تحديث حالة البوابة');
    } finally {
      setTogglePortalLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setResetPasswordMessage({ type: 'error', text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
      return;
    }

    setResetPasswordLoading(true);
    setResetPasswordMessage(null);

    try {
      // Use auth_user_id directly instead of email to avoid issues with email lookup
      const response = await fetch('/api/updatePassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: accountDetails.auth_user_id,
          newPassword: newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل تحديث كلمة المرور');
      }

      setResetPasswordMessage({ type: 'success', text: 'تم تحديث كلمة المرور بنجاح' });
      setNewPassword('');
      setTimeout(() => {
        setShowPasswordResetModal(false);
        setResetPasswordMessage(null);
      }, 2000);
    } catch (error) {
      console.error('Password reset error:', error);
      setResetPasswordMessage({ type: 'error', text: error.message || 'فشل تحديث كلمة المرور' });
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!createAccountEmail || !createAccountPassword) {
      setCreateAccountMessage({ type: 'error', text: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
      return;
    }
    if (createAccountPassword.length < 6) {
      setCreateAccountMessage({ type: 'error', text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
      return;
    }

    setCreateAccountLoading(true);
    setCreateAccountMessage(null);

    try {
      const user = supabase.auth.user();
      const adminId = await (async () => {
        const { data } = await supabase.from('user_metadata').select('admin_user_id').eq('user_id', user.id).single();
        return data?.admin_user_id || user.id;
      })();

      const response = await fetch('/api/client-portal/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createAccountEmail,
          password: createAccountPassword,
          clientDataId: clientInfo.id,
          adminId: adminId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل إنشاء الحساب');
      }

      setCreateAccountMessage({ type: 'success', text: 'تم إنشاء الحساب بنجاح' });
      setCreateAccountEmail('');
      setCreateAccountPassword('');

      // Refresh portal account status
      setTimeout(() => {
        checkPortalAccount(clientInfo.id);
        setShowCreateAccountModal(false);
        setCreateAccountMessage(null);
      }, 1500);
    } catch (error) {
      console.error('Create account error:', error);
      setCreateAccountMessage({ type: 'error', text: error.message || 'فشل إنشاء الحساب' });
    } finally {
      setCreateAccountLoading(false);
    }
  };

  if (loading) return <div className="loading-state"><div className="spinner"></div><p>جاري التحميل...</p></div>;
  if (!clientInfo) return <div className="loading-state"><p>لم يتم العثور على الموكل.</p></div>;

  return (
    <Layout>
      <div className="dashboard-container">
        {/* --- Top Actions / Breadcrumbs --- */}
        <div className="dashboard-top-bar">
          <div className="breadcrumb">
            <Link href="/client/all_clients/"><a>الموكلين</a></Link>
            <span className="separator">/</span>
            <span className="current">تفاصيل الموكل</span>
          </div>
          <div className="top-actions">
            <button className="secondary-btn" onClick={generateClientReport} disabled={loadingReports}>
              <AiOutlinePrinter /> {loadingReports ? 'جاري التحميل...' : 'طباعة التقرير'}
            </button>
            {isReadOnly || subLoading ? (
              <a className="primary-btn" style={{
                opacity: 0.5,
                cursor: 'not-allowed',
                pointerEvents: 'none'
              }}>
                <AiOutlineEdit /> تعديل الملف
              </a>
            ) : (
              <Link href={`/client/edit_client?id=${clientInfo.id}`}>
                <a className="primary-btn">
                  <AiOutlineEdit /> تعديل الملف
                </a>
              </Link>
            )}
          </div>
        </div>

        {/* --- Profile Hero Section --- */}
        <div className="profile-hero-card">
          <div className="hero-content">
            <div className="avatar-section">
              {clientInfo.image_url ? (
                <img src={clientInfo.image_url} alt="" className="client-avatar" onClick={() => setIsModalOpen(true)} />
              ) : (
                <div className="avatar-placeholder"><AiOutlineUser size={40} /></div>
              )}
            </div>
            <div className="hero-text-section">
              <div className="hero-identity-row">
                <h1>{clientInfo.client_name}</h1>
                <span className="client-type-badge">{clientInfo.legal_form}</span>
                <div className="hero-meta-inline">
                  <span className="meta-item"><AiOutlineIdcard /> {clientInfo.id_number || '---'}</span>
                  <span className="meta-item"><AiOutlinePhone /> {clientInfo.phone || '---'}</span>
                  <span className="meta-item"><AiOutlineMail /> {clientInfo.email || '---'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="hero-stats">
            <div className="hero-stat-card">
              <label>إجمالي الأتعاب</label>
              <div className="stat-value indigo">{feesData.reduce((acc, item) => acc + (parseFloat(item.fee_amount) || 0), 0).toLocaleString()}</div>
            </div>
            <div className="hero-stat-card">
              <label>المبلغ المدفوع</label>
              <div className="stat-value green">{expensesData.reduce((acc, item) => acc + (parseFloat(item.paid_amount) || 0), 0).toLocaleString()}</div>
            </div>
            <div className="hero-stat-card">
              <label>الرصيد المتبقي</label>
              <div className="stat-value red">
                {((feesData.reduce((acc, item) => acc + (parseFloat(item.fee_amount) || 0), 0)) - 
                  (expensesData.reduce((acc, item) => acc + (parseFloat(item.paid_amount) || 0), 0))).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* --- Main Dashboard Content --- */}
        <div className="dashboard-grid">
          {/* Sidebar: Details & Contact */}
          <div className="dashboard-sidebar">
            <div className="info-card">
              <div className="sidebar-tabs-container">
                {/* Identity Tab */}
                <button
                  className={`sidebar-tab ${openAccordion === 'identity' ? 'active' : ''}`}
                  onClick={() => toggleAccordion('identity')}
                >
                  <div className="tab-title-wrap">
                    <span>معلومات الهوية</span>
                    <AiOutlineDown className={`mobile-chevron ${openAccordion === 'identity' ? 'rotated' : ''}`} />
                  </div>
                </button>
                {openAccordion === 'identity' && (
                  <div className="sidebar-tab-content">
                    <div className="info-list">
                      <div className="info-item">
                        <label>المحافظة</label>
                        <span>{clientInfo.governorate_id || '---'}</span>
                      </div>
                      <div className="info-item">
                        <label>العنوان الكامل</label>
                        <span>{clientInfo.address || '---'}</span>
                      </div>
                      <div className="info-item">
                        <label>نوع الموكل</label>
                        <span>{clientInfo.type || '---'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact Tab */}
                <button
                  className={`sidebar-tab ${openAccordion === 'contact' ? 'active' : ''}`}
                  onClick={() => toggleAccordion('contact')}
                >
                  <div className="tab-title-wrap">
                    <span>جهة الاتصال</span>
                    <AiOutlineDown className={`mobile-chevron ${openAccordion === 'contact' ? 'rotated' : ''}`} />
                  </div>
                </button>
                {openAccordion === 'contact' && (
                  <div className="sidebar-tab-content">
                    <div className="info-list">
                      <div className="info-item">
                        <label>الاسم</label>
                        <span>{clientInfo.connection_name || '---'}</span>
                      </div>
                      <div className="info-item">
                        <label>رقم الهاتف</label>
                        <span>{clientInfo.connection_mobile || '---'}</span>
                      </div>
                      <div className="info-item">
                        <label>البريد الإلكتروني</label>
                        <span>{clientInfo.conn_email || '---'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes Tab */}
                <button
                  className={`sidebar-tab ${openAccordion === 'notes' ? 'active' : ''}`}
                  onClick={() => toggleAccordion('notes')}
                >
                  <div className="tab-title-wrap">
                    <span>ملاحظات إضافية</span>
                    <AiOutlineDown className={`mobile-chevron ${openAccordion === 'notes' ? 'rotated' : ''}`} />
                  </div>
                </button>
                {openAccordion === 'notes' && (
                  <div className="sidebar-tab-content">
                    <p className="notes-text">{clientInfo.notes || 'لا توجد ملاحظات مسجلة لهذا الموكل.'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="dashboard-main-content">
            <div className="tab-control-card">
              <div className="custom-tabs-list">
                {/* الحسابات */}
                <button
                  className={`custom-tab-btn ${activeTab === "الحسابات" ? "active" : ""}`}
                  onClick={() => handleTabChange("الحسابات")}
                >
                  <div className="tab-title-wrap">
                    <span>الحسابات</span>
                    <AiOutlineDown className={`mobile-chevron ${activeTab === "الحسابات" ? "rotated" : ""}`} />
                  </div>
                </button>
                {activeTab === "الحسابات" && (
                  <div className="tab-render-area custom-tab-content">
                  <div className="tab-animation-wrap">
                    <div className="financial-sub-tabs">
                      <button className={`sub-tab ${activeFinancialTab === 'fees' ? 'active' : ''}`} onClick={() => setActiveFinancialTab('fees')}>الأتعاب</button>
                      <button className={`sub-tab ${activeFinancialTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveFinancialTab('expenses')}>الرسوم</button>
                    </div>

                    <div className="table-responsive">
                      {activeFinancialTab === 'fees' ? (
                        <table className="modern-table">
                          <thead>
                            <tr>
                              <th>رقم القضية</th>
                              <th>نوع القضية</th>
                              <th>التاريخ</th>
                              <th>الأتعاب</th>
                            </tr>
                          </thead>
                          <tbody>
                            {feesData.length > 0 ? feesData.map((item, idx) => (
                              <tr key={idx} className="clickable-row" onClick={() => router.push(`/cases/CaseDetailsPage?caseId=${item.id}`)}>
                                <td data-label="رقم القضية">{item.case_number}</td>
                                <td data-label="نوع القضية"><span className="type-tag">{item.case_type}</span></td>
                                <td data-label="التاريخ" className="date-cell">{item.case_date ? new Date(item.case_date).toLocaleDateString('ar-EG') : '-'}</td>
                                <td data-label="الأتعاب" className="amount-cell indigo">{parseFloat(item.fee_amount || 0).toLocaleString()}</td>
                              </tr>
                            )) : <tr><td colSpan="4" className="empty-row text-center">لا توجد بيانات</td></tr>}
                          </tbody>
                        </table>
                      ) : (
                        <table className="modern-table">
                          <thead>
                            <tr>
                              <th>رقم القضية</th>
                              <th>التاريخ</th>
                              <th>نوع البند</th>
                              <th>القيمة</th>
                              <th>المدفوع</th>
                              <th>الرصيد</th>
                            </tr>
                          </thead>
                          <tbody>
                             {expensesData.length > 0 ? expensesData.map((item, idx) => {
                              const bal = (parseFloat(item.expenses_amount) || 0) - (parseFloat(item.paid_amount) || 0);
                              return (
                                <tr key={idx} className="clickable-row" onClick={() => router.push(`/cases/CaseDetailsPage?caseId=${item.case_id}`)}>
                                  <td data-label="رقم القضية">{item.case_number || '-'}</td>
                                  <td data-label="التاريخ" className="date-cell">{item.payment_date ? new Date(item.payment_date).toLocaleDateString('ar-IQ') : '-'}</td>
                                  <td data-label="نوع البند">{item.expenses_type}</td>
                                  <td data-label="القيمة" className="amount-cell">{parseFloat(item.expenses_amount || 0).toLocaleString()}</td>
                                  <td data-label="المدفوع" className="amount-cell green">{parseFloat(item.paid_amount || 0).toLocaleString()}</td>
                                  <td data-label="الرصيد" className={`amount-cell ${bal > 0 ? 'red' : 'green'}`}>{bal.toLocaleString()}</td>
                                </tr>
                              );
                            }) : <tr><td colSpan="6" className="empty-row text-center">لا توجد بيانات</td></tr>}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                  </div>
                )}

                {/* القضايا */}
                <button
                  className={`custom-tab-btn ${activeTab === "القضايا" ? "active" : ""}`}
                  onClick={() => handleTabChange("القضايا")}
                >
                  <div className="tab-title-wrap">
                    <span>القضايا</span>
                    <AiOutlineDown className={`mobile-chevron ${activeTab === "القضايا" ? "rotated" : ""}`} />
                  </div>
                </button>
                {activeTab === "القضايا" && (
                  <div className="tab-render-area custom-tab-content">
                  <div className="tab-animation-wrap">
                    <div className="table-responsive">
                      {clientCases.length === 0 ? (
                        <div className="empty-dashboard-state">
                          <AiOutlineFile size={40} />
                          <p>لا توجد قضايا مسجلة</p>
                        </div>
                      ) : (
                        <table className="modern-table">
                          <thead>
                            <tr>
                              <th>رقم القضية</th>
                              <th>المحامي</th>
                              <th>الخصم</th>
                              <th>التاريخ</th>
                              <th>الإجراء</th>
                            </tr>
                          </thead>
                          <tbody>
                            {clientCases.map((c) => (
                              <tr key={c.id} className="clickable-row" onClick={() => router.push(`/cases/CaseDetailsPage?caseId=${c.id}`)}>
                                <td data-label="رقم القضية"><span className="case-id-tag">{c.case_number}</span></td>
                                <td data-label="المحامي">{c.lawyer_name}</td>
                                <td data-label="الخصم">{c.opponentName}</td>
                                <td data-label="التاريخ" className="date-cell">{c.caseDate}</td>
                                <td data-label="الإجراء">
                                  <span className="table-action-link">التفاصيل</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                  </div>
                )}

                {/* المراسلات */}
                {hasPortalAccount && (
                  <>
                    <button
                      className={`custom-tab-btn ${activeTab === "المراسلات" ? "active" : ""}`}
                      onClick={() => handleTabChange("المراسلات")}
                    >
                      <div className="tab-title-wrap">
                        <span>المراسلات</span>
                        <AiOutlineDown className={`mobile-chevron ${activeTab === "المراسلات" ? "rotated" : ""}`} />
                      </div>
                    </button>
                    {activeTab === "المراسلات" && (
                  <div className="tab-render-area custom-tab-content">
                  <div className="tab-animation-wrap chat-integration">
                    <div className="modern-chat-container">
                      <div className="chat-history">
                        {portalMessages.length === 0 ? (
                          <div className="chat-empty">ابدأ المحادثة مع الموكل هنا. الرسائل تظهر فوراً لدى الموكل.</div>
                        ) : (
                          portalMessages.map((msg, i) => {
                            const isLawyer = msg.sender_type === 'lawyer';
                            const senderLabel = isLawyer ? (adminName || 'الأدمن') : (clientInfo.client_name || 'الموكل');
                            return (
                              <div key={msg.id || i} className={`chat-bubble-wrap ${isLawyer ? 'me' : 'them'}`}>
                                <div className="chat-bubble">
                                  <div className="chat-sender-label">{senderLabel}</div>
                                  <p>{msg.message_text}</p>
                                  <span className="chat-time">
                                    {new Date(msg.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                                    {isLawyer && (msg.is_read ? ' • تم القراءة' : ' • مستلم')}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                      <form className="chat-input-bar" onSubmit={handleSendPortalMessage}>
                        <input
                          type="text"
                          placeholder="اكتب رسالتك هنا..."
                          value={newPortalMessage}
                          onChange={(e) => setNewPortalMessage(e.target.value)}
                          disabled={sendingMessage}
                        />
                        <button type="submit" disabled={sendingMessage || !newPortalMessage.trim()}>
                          {sendingMessage ? '...' : 'إرسال'}
                        </button>
                      </form>
                    </div>
                  </div>
                  </div>
                    )}
                  </>
                )}

                {/* إدارة حساب الموكل */}
                <button
                  className={`custom-tab-btn ${activeTab === "إدارة حساب الموكل" ? "active" : ""}`}
                  onClick={() => handleTabChange("إدارة حساب الموكل")}
                >
                  <div className="tab-title-wrap">
                    <span>إدارة حساب الموكل</span>
                    <AiOutlineDown className={`mobile-chevron ${activeTab === "إدارة حساب الموكل" ? "rotated" : ""}`} />
                  </div>
                </button>
                {activeTab === "إدارة حساب الموكل" && (
                  <div className="tab-render-area custom-tab-content">
                  <div className="tab-animation-wrap">
                    {!hasPortalAccount ? (
                      <div className="account-management-container">
                        <div className="info-card">
                          <h3 className="card-title">حساب البوابة</h3>
                          <p className="no-account-text">هذا الموكل ليس لديه حساب بوابة حالياً</p>
                          <button
                            className="primary-btn create-account-btn"
                            onClick={() => setShowCreateAccountModal(true)}
                          >
                            <AiOutlineSetting /> إنشاء حساب بوابة
                          </button>
                        </div>
                      </div>
                    ) : !accountDetails ? (
                      <div className="loading-state">
                        <div className="spinner"></div>
                        <p>جاري تحميل بيانات الحساب...</p>
                      </div>
                    ) : (
                      <div className="account-management-container">
                        {/* Account Details Card */}
                        <div className="info-card">
                          <h3 className="card-title">معلومات الحساب</h3>
                          <div className="info-list">
                            <div className="info-item">
                              <label>البريد الإلكتروني</label>
                              <span>{accountDetails.email || '---'}</span>
                            </div>
                            <div className="info-item">
                              <label>تاريخ إنشاء الحساب</label>
                              <span>{accountDetails.created_at ? new Date(accountDetails.created_at).toLocaleDateString('ar-IQ') : '---'}</span>
                            </div>
                            <div className="info-item">
                              <label>آخر تسجيل دخول</label>
                              <span>{accountDetails.last_login ? new Date(accountDetails.last_login).toLocaleString('ar-IQ') : 'لم يسجل دخوله بعد'}</span>
                            </div>
                            <div className="info-item">
                              <label>حالة البوابة</label>
                              <span className={`status-badge ${accountDetails.is_portal_enabled ? 'enabled' : 'disabled'}`}>
                                {accountDetails.is_portal_enabled ? (
                                  <><AiOutlineCheckCircle /> مفعلة</>
                                ) : (
                                  <><AiOutlineCloseCircle /> معطلة</>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Portal Access Toggle */}
                        <div className="info-card">
                          <h3 className="card-title">الوصول للبوابة</h3>
                          <div className="toggle-container">
                            <span className="toggle-label">
                              {accountDetails.is_portal_enabled ? 'البوابة مفعلة' : 'البوابة معطلة'}
                            </span>
                            <button
                              className={`toggle-switch ${accountDetails.is_portal_enabled ? 'active' : ''}`}
                              onClick={handleTogglePortal}
                              disabled={togglePortalLoading}
                            >
                              <span className="toggle-slider"></span>
                            </button>
                          </div>
                          {togglePortalLoading && <p className="toggle-loading">جاري التحديث...</p>}
                        </div>

                        {/* Password Reset */}
                        <div className="info-card">
                          <h3 className="card-title">إعادة تعيين كلمة المرور</h3>
                          <button
                            className="secondary-btn password-reset-btn"
                            onClick={() => setShowPasswordResetModal(true)}
                          >
                            <AiOutlineLock /> تغيير كلمة المرور
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                )}
              </div>
            </div>

            <div className="dashboard-chart-card">
              <div className="chart-header-row">
                <div className="header-text">
                  <h3>تقرير نشاط الموكل</h3>
                  <p>توزيع القضايا حسب النوع والفترة الزمنية</p>
                </div>
                <div className="chart-filter">
                  <div className="range-selector" onClick={() => setDateRangeOpen(!dateRangeOpen)}>
                    <span>{rangeText}</span>
                    <AiOutlineDown size={10} />
                    {dateRangeOpen && (
                      <div className="range-dropdown">
                        {['هذا الشهر', 'اخر 3 أشهر', 'اخر 6 أشهر', 'هذه السنة'].map(opt => (
                          <div key={opt} className="range-opt" onClick={() => handleRangeSelect(opt)}>{opt}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="chart-content">
                {chartData ? (
                   <div className="chart-scroll-wrapper">
                      <div className="chart-wrapper">
                        <Bar data={chartData} options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          plugins: { legend: { position: 'bottom', labels: { font: { family: 'Cairo' } } } },
                          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                        }} />
                      </div>
                   </div>
                ) : <div className="loading-chart">جاري تحميل البيانات...</div>}
              </div>
            </div>
          </div>
        </div>

        {isModalOpen && (
          <div className="modern-modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="modern-modal-body" onClick={e => e.stopPropagation()}>
              <img src={clientInfo.image_url} alt="" />
              <button className="modal-close-icon" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
          </div>
        )}

        {showPasswordResetModal && (
          <div className="modern-modal-overlay" onClick={() => setShowPasswordResetModal(false)}>
            <div className="modern-modal-body password-modal" onClick={e => e.stopPropagation()}>
              <h3>تغيير كلمة المرور</h3>
              <p className="modal-subtitle">للمستخدم: {accountDetails?.email}</p>
              <form onSubmit={handlePasswordReset}>
                <div className="form-group">
                  <label>كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="6 أحرف على الأقل"
                    dir="ltr"
                  />
                </div>
                {resetPasswordMessage && (
                  <div className={`message-box ${resetPasswordMessage.type}`}>
                    {resetPasswordMessage.text}
                  </div>
                )}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      setShowPasswordResetModal(false);
                      setNewPassword('');
                      setResetPasswordMessage(null);
                    }}
                    disabled={resetPasswordLoading}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={resetPasswordLoading}
                  >
                    {resetPasswordLoading ? 'جاري التحديث...' : 'تحديث'}
                  </button>
                </div>
              </form>
              <button className="modal-close-icon" onClick={() => setShowPasswordResetModal(false)}>&times;</button>
            </div>
          </div>
        )}

        {showCreateAccountModal && (
          <div className="modern-modal-overlay" onClick={() => setShowCreateAccountModal(false)}>
            <div className="modern-modal-body password-modal" onClick={e => e.stopPropagation()}>
              <h3>إنشاء حساب بوابة</h3>
              <p className="modal-subtitle">للموكل: {clientInfo?.client_name}</p>
              <form onSubmit={handleCreateAccount}>
                <div className="form-group">
                  <label>البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={createAccountEmail}
                    onChange={(e) => setCreateAccountEmail(e.target.value)}
                    placeholder="example@email.com"
                    dir="ltr"
                  />
                </div>
                <div className="form-group">
                  <label>كلمة المرور</label>
                  <input
                    type="password"
                    value={createAccountPassword}
                    onChange={(e) => setCreateAccountPassword(e.target.value)}
                    placeholder="6 أحرف على الأقل"
                    dir="ltr"
                  />
                </div>
                {createAccountMessage && (
                  <div className={`message-box ${createAccountMessage.type}`}>
                    {createAccountMessage.text}
                  </div>
                )}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      setShowCreateAccountModal(false);
                      setCreateAccountEmail('');
                      setCreateAccountPassword('');
                      setCreateAccountMessage(null);
                    }}
                    disabled={createAccountLoading}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={createAccountLoading}
                  >
                    {createAccountLoading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
                  </button>
                </div>
              </form>
              <button className="modal-close-icon" onClick={() => setShowCreateAccountModal(false)}>&times;</button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');

        .dashboard-container {
          padding: 1.5rem;
          background: #f8fafc;
          min-height: 100vh;
          font-family: 'Cairo', sans-serif;
          direction: rtl;
          color: #000000;
        }

        .dashboard-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .breadcrumb {
          display: flex;
          gap: 0.5rem;
          color: #64748b;
          font-size: 0.95rem;
        }
        .breadcrumb .separator { opacity: 0.5; }
        .breadcrumb .current { color: #000000; font-weight: 700; }
        .top-actions { display: flex; gap: 0.75rem; }
        
        .primary-btn, .secondary-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .primary-btn { background: #4f46e5; color: white; border: none; }
        .primary-btn:hover { background: #4338ca; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2); }
        .secondary-btn { background: white; color: #1e1b4b; border: 1px solid #e2e8f0; }
        .secondary-btn:hover { background: #f1f5f9; }

        .profile-hero-card {
          background: white;
          border-radius: 12px;
          padding: 0.75rem 1.5rem;
          margin-bottom: 1rem;
          border: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .hero-content { display: flex; gap: 1rem; align-items: center; }
        .avatar-section { width: 60px; height: 60px; border-radius: 50%; overflow: hidden; background: #eef2ff; display: flex; align-items: center; justify-content: center; }
        .client-avatar { width: 100%; height: 100%; object-fit: cover; cursor: pointer; }
        .avatar-placeholder { color: #4f46e5; }
        
        .hero-identity-row { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
        .hero-identity-row h1 { font-size: 1.8rem; font-weight: 800; color: #000000; margin: 0; }
        .hero-meta-inline { display: flex; align-items: center; gap: 1.25rem; }
        .meta-item { display: flex; align-items: center; gap: 0.4rem; color: #000000; font-size: 1.1rem; font-weight: 700; }
        .meta-item svg { color: #4f46e5; font-size: 1.2rem; }
        .client-type-badge { background: #eef2ff; color: #4f46e5; padding: 0.25rem 0.75rem; border-radius: 99px; font-size: 0.85rem; font-weight: 700; }

        .hero-stats { display: flex; gap: 1.5rem; }
        .hero-stat-card { text-align: center; min-width: 110px; }
        .hero-stat-card label { display: block; font-size: 0.8rem; color: #000000; margin-bottom: 0.15rem; font-weight: 600; }
        .stat-value { font-size: 1.25rem; font-weight: 700; }
        .stat-value.indigo { color: #4f46e5; }
        .stat-value.green { color: #10b981; }
        .stat-value.red { color: #ef4444; }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 2rem;
        }

        .info-card {
          background: white;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          margin-bottom: 1rem;
          border: 1px solid #e2e8f0;
        }

        /* Sidebar Tabs Container */
        .sidebar-tabs-container {
          display: flex;
          flex-wrap: wrap;
          padding-bottom: 4px;
          margin-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
        }

        .sidebar-tab {
          padding: 6px 10px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 4px;
          order: 1; /* Keep tabs at the top on desktop */
        }
        
        .tab-title-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        
        .mobile-chevron {
          display: none;
          transition: transform 0.2s;
        }
        .mobile-chevron.rotated {
          transform: rotate(180deg);
        }

        .sidebar-tab:hover {
          background: #f1f5f9;
          color: #4f46e5;
        }
        .sidebar-tab.active {
          background: #eef2ff;
          color: #4f46e5;
        }

        .sidebar-tab-content {
          padding-top: 12px;
          animation: fadeIn 0.3s ease-out;
          order: 2; /* Keep content below all tabs on desktop */
          width: 100%; /* Force content to take full width and break to next line */
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .card-title { font-size: 1rem; color: #000000; font-weight: 800; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem; margin-bottom: 0.75rem; }
        
        .info-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .info-item { display: flex; flex-direction: column; }
        .info-item label { font-size: 0.75rem; color: #000000; font-weight: 700; opacity: 0.6; }
        .info-item span { color: #000000; font-weight: 700; font-size: 0.9rem; }
        .notes-text { color: #000000; line-height: 1.5; font-size: 0.85rem; }

        .tab-control-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          margin-bottom: 1.5rem;
        }
        .custom-tabs-list {
          display: flex;
          flex-wrap: wrap;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 0.5rem;
          gap: 0.5rem;
        }
        .custom-tab-btn {
          padding: 0.5rem 1.25rem;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.9rem;
          border: none;
          background: transparent;
          color: #000000;
          opacity: 0.6;
          cursor: pointer;
          transition: all 0.2s;
          order: 1; /* Keep tabs at the top on desktop */
        }
        .custom-tab-btn .mobile-chevron {
          display: none;
          transition: transform 0.2s;
        }
        .custom-tab-btn .mobile-chevron.rotated {
          transform: rotate(180deg);
        }
        .custom-tab-btn.active { background: white; color: #4f46e5; opacity: 1; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .custom-tab-btn:hover:not(.active) { color: #000000; opacity: 1; background: #eef2ff; }

        .tab-render-area { 
          padding: 1.5rem; 
          min-height: 400px; 
        }
        .custom-tab-content {
          order: 2; /* Keep content below all tabs on desktop */
          width: 100%; /* Force content to take full width and break to next line */
        }

        .financial-sub-tabs { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
        .sub-tab { background: #f1f5f9; border: none; padding: 0.4rem 1rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.2s; }
        .sub-tab.active { background: #4f46e5; color: white; }

        .table-responsive { overflow-x: auto; }
        .modern-table { width: 100%; border-collapse: collapse; min-width: 600px; }
        .modern-table th { background: #f8fafc; color: #000000; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 1rem; text-align: right; border-bottom: 1px solid #e2e8f0; }
        .modern-table td { padding: 1rem; border-bottom: 1px solid #f1f5f9; color: #000000; font-size: 0.95rem; font-weight: 600; }
        .clickable-row { cursor: pointer; transition: background 0.2s; }
        .clickable-row:hover { background: #f1f5f9 !important; }
        .modern-table tbody tr:last-child td { border-bottom: none; }
        
        .type-tag { background: #eef2ff; color: #4f46e5; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
        .amount-cell { font-family: 'Inter', sans-serif; font-weight: 700; color: #000000; }
        .amount-cell.indigo { color: #4f46e5; }
        .amount-cell.green { color: #10b981; }
        .amount-cell.red { color: #ef4444; }
        .date-cell { color: #000000; opacity: 0.7; font-size: 0.85rem; }

        .modern-chat-container { display: flex; flex-direction: column; background: #f8fafc; border-radius: 12px; height: 500px; border: 1px solid #e2e8f0; }
        .chat-history { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .chat-bubble-wrap { display: flex; max-width: 80%; }
        .chat-bubble-wrap.me { align-self: flex-end; }
        .chat-bubble-wrap.them { align-self: flex-start; }
        
        .chat-bubble { padding: 0.7rem 1.1rem; border-radius: 18px; font-size: 0.9rem; font-weight: 700; line-height: 1.5; box-shadow: 0 1px 2px rgba(0,0,0,0.05); position: relative; }
        .chat-sender-label { font-size: 0.65rem; font-weight: 800; margin-bottom: 0.25rem; opacity: 1; color: #000000; }
        .chat-bubble-wrap.me .chat-bubble { background: #eef2ff; color: #000000; border-bottom-left-radius: 4px; border: 1px solid #c7d2fe; }
        .chat-bubble-wrap.them .chat-bubble { background: white; color: #000000; border-bottom-right-radius: 4px; border: 1px solid #e2e8f0; }
        
        .chat-time { display: block; font-size: 0.65rem; margin-top: 0.35rem; opacity: 0.8; font-weight: 700; color: #000000; }
        .chat-input-bar { padding: 0.8rem 1rem; background: white; border-top: 1px solid #e2e8f0; display: flex; gap: 0.75rem; }
        .chat-input-bar input { flex: 1; border: 1px solid #e2e8f0; padding: 0.65rem 1rem; border-radius: 10px; outline: none; transition: border 0.2s; color: #000000; font-weight: 700; }
        .chat-input-bar input:focus { border-color: #4f46e5; }
        .chat-input-bar button { background: #4f46e5; color: white; border: none; padding: 0 1.25rem; border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .chat-input-bar button:hover { background: #4338ca; }
        .chat-empty { color: #000000; opacity: 0.8; text-align: center; font-style: italic; margin-top: 4rem; font-weight: 700; }

        .dashboard-chart-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1rem 1.5rem; margin-top: 1rem; }
        .chart-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
        .header-text h3 { margin: 0; color: #000000; font-size: 1.1rem; font-weight: 800; }
        .header-text p { margin: 0.2rem 0 0; color: #000000; opacity: 0.7; font-size: 0.85rem; font-weight: 700; }
        
        .range-selector { display: flex; align-items: center; gap: 0.5rem; background: #f8fafc; padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid #e2e8f0; cursor: pointer; position: relative; font-size: 0.85rem; font-weight: 600; color: #1e1b4b; }
        .range-dropdown { position: absolute; top: calc(100% + 5px); left: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); z-index: 50; min-width: 150px; overflow: hidden; }
        .range-opt { padding: 0.6rem 1rem; transition: background 0.2s; }
        .range-opt:hover { background: #f1f5f9; color: #4f46e5; }

        .chart-wrapper { height: 350px; position: relative; }

        .modern-modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(15, 23, 42, 0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
        .modern-modal-body { padding: 1rem; background: white; border-radius: 16px; position: relative; max-width: 80vw; max-height: 80vh; }
        .modern-modal-body img { max-width: 100%; max-height: 75vh; border-radius: 8px; }
        .modal-close-icon { position: absolute; top: -15px; right: -15px; width: 35px; height: 35px; background: white; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }

        /* Account Management Styles */
        .account-management-container { display: flex; flex-direction: column; gap: 1rem; }
        .no-account-text { color: #64748b; font-size: 0.95rem; font-weight: 600; margin-bottom: 1rem; }
        .create-account-btn { width: 100%; justify-content: center; }
        .status-badge { display: flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: 700; }
        .status-badge.enabled { background: #dcfce7; color: #166534; }
        .status-badge.disabled { background: #fee2e2; color: #991b1b; }

        /* Toggle Switch */
        .toggle-container { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; }
        .toggle-label { font-size: 0.95rem; font-weight: 700; color: #000000; }
        .toggle-switch { position: relative; width: 50px; height: 26px; background: #cbd5e1; border-radius: 13px; border: none; cursor: pointer; transition: background 0.3s; }
        .toggle-switch.active { background: #4f46e5; }
        .toggle-switch:disabled { opacity: 0.5; cursor: not-allowed; }
        .toggle-slider { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: transform 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .toggle-switch.active .toggle-slider { transform: translateX(24px); }
        .toggle-loading { font-size: 0.8rem; color: #64748b; margin-top: 0.5rem; font-weight: 600; }

        /* Password Reset Button */
        .password-reset-btn { width: 100%; justify-content: center; margin-top: 0.5rem; }

        /* Password Modal */
        .password-modal { padding: 2rem; max-width: 400px; width: 90%; }
        .password-modal h3 { margin: 0 0 0.5rem 0; font-size: 1.3rem; font-weight: 800; color: #000000; }
        .modal-subtitle { margin: 0 0 1.5rem 0; color: #64748b; font-size: 0.9rem; font-weight: 600; }
        .password-modal .form-group { margin-bottom: 1rem; }
        .password-modal .form-group label { display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 700; color: #000000; }
        .password-modal .form-group input { width: 100%; padding: 0.7rem 1rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 1rem; font-weight: 600; outline: none; transition: border 0.2s; }
        .password-modal .form-group input:focus { border-color: #4f46e5; }
        .message-box { padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem; font-weight: 700; }
        .message-box.error { background: #fee2e2; color: #991b1b; }
        .message-box.success { background: #dcfce7; color: #166534; }
        .modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem; }
        .modal-actions button { flex: 1; }

        .loading-state { text-align: center; padding: 4rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; min-height: 400px; }
        .spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top: 3px solid #4f46e5; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        @media (max-width: 1024px) {
          .dashboard-grid { 
            grid-template-columns: 1fr; 
            min-width: 0;
          }
          .dashboard-sidebar, .dashboard-main-content {
            min-width: 0;
            width: 100%;
          }
          .profile-hero-card { flex-direction: column; text-align: center; gap: 2rem; }
          .hero-content { flex-direction: column; }
          .hero-meta { justify-content: center; flex-wrap: wrap; }
          .hero-stats { width: 100%; justify-content: space-around; border-top: 1px solid #f1f5f9; padding-top: 1.5rem; }
        }

        @media (max-width: 768px) {
          .dashboard-container { padding: 1rem; }
          .dashboard-top-bar { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .top-actions { width: 100%; justify-content: flex-start; }
          .primary-btn, .secondary-btn { padding: 0.5rem 1rem; font-size: 0.85rem; }
          .profile-hero-card {
            padding: 1rem;
            box-sizing: border-box;
            width: 100%;
            overflow: hidden;
          }
          .hero-content { gap: 0.75rem; }
          .avatar-section { width: 50px; height: 50px; }
          .hero-identity-row {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 0.5rem;
          }
          .hero-identity-row h1 { font-size: 1.4rem; }
          .hero-meta-inline { flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
          .meta-item { font-size: 0.85rem; }
          .hero-stats {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 0.5rem;
            justify-content: space-around;
            width: 100%;
          }
          .hero-stat-card {
            min-width: auto;
            flex: 1;
            text-align: center;
            min-width: 80px;
          }
          .hero-stat-card label { font-size: 0.7rem; }
          .stat-value { font-size: 1rem; }

          .financial-sub-tabs {
            flex-direction: row;
            gap: 0.5rem;
            width: 100%;
          }
          .sub-tab {
            flex: 1;
            text-align: center;
            padding: 0.4rem 0.75rem;
            font-size: 0.8rem;
            white-space: nowrap;
          }
          .dashboard-sidebar { width: 100%; }
          .info-card {
            padding: 0.75rem 1rem;
            width: 100%;
            box-sizing: border-box;
            max-width: 100%;
          }
          .card-title { font-size: 0.9rem; }
          .sidebar-tabs-container {
            display: flex;
            flex-direction: column;
            flex-wrap: nowrap;
            border-bottom: none;
            gap: 8px;
            margin-bottom: 0;
          }
          .sidebar-tab {
            order: 0; /* Let natural DOM order apply */
            width: 100%;
            padding: 14px 16px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            text-align: right;
            box-sizing: border-box;
          }
          .sidebar-tab.active {
            border: 2px solid #3b82f6 !important;
            border-radius: 12px 12px 0 0 !important;
            background: linear-gradient(to left, #dbeafe 0%, #eff6ff 100%) !important;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15) !important;
          }
          .tab-title-wrap {
            justify-content: space-between;
            font-size: 0.95rem;
          }
          .mobile-chevron {
            display: block;
            color: #64748b;
          }
          .sidebar-tab.active .mobile-chevron {
            color: #3b82f6;
          }
          .sidebar-tab-content {
            order: 0; /* Let natural DOM order apply */
            width: 100%;
            border: 2px solid #3b82f6;
            border-top: none;
            border-radius: 0 0 12px 12px;
            background: #ffffff;
            margin-top: -8px; /* Offset the container gap so it connects to the tab */
            padding: 16px;
            box-sizing: border-box;
          }
          .tab-control-card {
            overflow: visible;
            max-width: 100%;
            box-sizing: border-box;
            border: none;
            background: transparent;
          }
          .custom-tabs-list {
            display: flex;
            flex-direction: column;
            flex-wrap: nowrap;
            border-bottom: none;
            gap: 8px;
            padding: 0;
            background: transparent;
          }
          .custom-tab-btn {
            order: 0;
            width: 100%;
            padding: 14px 16px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            text-align: right;
            box-sizing: border-box;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .custom-tab-btn.active {
            border: 2px solid #3b82f6 !important;
            border-radius: 12px 12px 0 0 !important;
            background: linear-gradient(to left, #dbeafe 0%, #eff6ff 100%) !important;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15) !important;
          }
          .custom-tab-btn .mobile-chevron {
            display: block;
            color: #64748b;
          }
          .custom-tab-btn.active .mobile-chevron {
            color: #3b82f6;
          }
          .custom-tab-content {
            order: 0;
            width: 100%;
            border: 2px solid #3b82f6;
            border-top: none;
            border-radius: 0 0 12px 12px;
            background: #ffffff;
            margin-top: -8px;
            padding: 16px;
            box-sizing: border-box;
          }
          .tab-render-area { padding: 0; }
          .modern-table { font-size: 0.85rem; min-width: 0; }
          .modern-table th, .modern-table td { padding: 0.75rem 0.5rem; }
          .table-responsive { min-width: 0; max-width: 100%; }

          /* Card-based table view for mobile */
          .modern-table thead { display: none; }
          .modern-table, .modern-table tbody, .modern-table tr, .modern-table td {
            display: block;
            width: 100%;
          }
          .modern-table tr {
            margin-bottom: 1rem;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1rem;
            max-width: 100%;
            box-sizing: border-box;
          }
          .modern-table td {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid #f1f5f9;
            text-align: right;
          }
          .modern-table td:last-child { border-bottom: none; }
          .modern-table td::before {
            content: attr(data-label);
            font-weight: 700;
            color: #64748b;
            font-size: 0.8rem;
          }
          .empty-row { display: none; }
        }

        @media (max-width: 480px) {
          .dashboard-container { padding: 0.5rem; }
          .breadcrumb { font-size: 0.85rem; }
          .top-actions { gap: 0.5rem; }
          .primary-btn, .secondary-btn { padding: 0.4rem 0.75rem; font-size: 0.8rem; }
          .hero-identity-row h1 { font-size: 1.2rem; }
          .hero-meta-inline { font-size: 0.85rem; }
          .meta-item { font-size: 0.8rem; }
          .stat-value { font-size: 1rem; }
          .hero-stat-card label { font-size: 0.65rem; }
          .custom-tab-btn { padding: 6px 10px; font-size: 0.78rem; }
          .sidebar-tab { padding: 6px 10px; font-size: 0.78rem; }
          .info-item label { font-size: 0.7rem; }
          .info-item span { font-size: 0.8rem; }
          .modern-chat-container { height: 400px; }
          .chat-bubble { font-size: 0.85rem; }
          .modern-modal-body { max-width: 95vw; max-height: 90vh; }
          .password-modal { max-width: 95vw; max-height: 90vh; }
          .dashboard-chart-card { padding: 0.75rem 1rem; }
          .chart-scroll-wrapper { overflow-x: auto; max-width: 100%; }
        }
      `}</style>
    </Layout>
  );
};

export default withAuth(ViewClient, ['can_view_clients']);
