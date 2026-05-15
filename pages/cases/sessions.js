import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/initSupabase';
import Layout from '../../components/layout/Layout';
import withAuth from '../../lib/withAuth';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useSubscription } from '../../context/SubscriptionContext';
import {
  FaCalendarAlt,
  FaClock,
  FaCalendarWeek,
  FaList,
  FaDownload,
  FaFileDownload,
  FaSearch,
  FaGavel,
  FaUser,
  FaMapMarkerAlt,
  FaFileAlt,
  FaEye,
  FaFilePdf,
  FaBell,
  FaExclamationCircle,
  FaChevronLeft,
} from 'react-icons/fa';

const SessionsTable = () => {
  const router = useRouter();
  const { isReadOnly, loading: subLoading } = useSubscription();
  const [sessionsData, setSessionsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today'); // Changed default to 'today' to match initial active state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('file_number');
  const [stats, setStats] = useState({
    today: 0,
    upcoming: 0,
    thisWeek: 0,
    total: 0,
  });
  const [activeRowId, setActiveRowId] = useState(null);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        // Get current user
        const user = supabase.auth.user();
        if (!user) {
          throw new Error('User not logged in');
        }
        const userId = user.id;

        // Fetch user metadata to determine role
        const { data: userMetadata, error: userMetadataError } = await supabase
          .from('user_metadata')
          .select('admin_user_id, new_lawyer_id')
          .or(`new_lawyer_id.eq.${userId}, admin_user_id.eq.${userId}`);

        if (userMetadataError) {
          throw new Error('Error fetching user metadata');
        }

        const isAdmin = userMetadata.some(meta => meta.admin_user_id === userId);
        const lawyerIds = userMetadata
          .filter(meta => meta.admin_user_id === userId)
          .map(meta => meta.new_lawyer_id)
          .filter(Boolean);

        // Fetch cases based on user role
        let casesQuery = supabase
          .from('cases')
          .select('id, case_number, caseType2, courtAddress, client_name, opponentName, case_number_in_court, admin_id, lawyer_id, caseLawyerId, caseState');

        if (isAdmin) {
          // Admin: Show cases created by admin OR assigned to them OR their lawyers
          if (lawyerIds.length > 0) {
            casesQuery = casesQuery.or(`admin_id.eq.${userId},lawyer_id.eq.${userId},caseLawyerId.eq.${userId},lawyer_id.in.(${lawyerIds.join(',')}),caseLawyerId.in.(${lawyerIds.join(',')})`);
          } else {
            casesQuery = casesQuery.or(`admin_id.eq.${userId},lawyer_id.eq.${userId},caseLawyerId.eq.${userId}`);
          }
        } else {
          // Lawyer: Show cases assigned to lawyer by admin AND cases created by lawyer
          casesQuery = casesQuery.or(`lawyer_id.eq.${userId},caseLawyerId.eq.${userId}`);
        }

        const { data: cases, error: casesError } = await casesQuery;

        if (casesError) {
          throw new Error('Error fetching case data');
        }

        // Get case numbers from filtered cases
        const caseNumbers = cases.map(c => c.case_number).filter(Boolean);

        if (caseNumbers.length === 0) {
          setSessionsData([]);
          setStats({ today: 0, upcoming: 0, thisWeek: 0, total: 0 });
          setLoading(false);
          return;
        }

        // 3. Fetch all user IDs belonging to this firm's workspace
        // If current user is Admin, they look for themselves + their lawyers
        // If current user is Lawyer, they look for their admin + all fellow lawyers
        const currentAdminId = isAdmin ? userId : userMetadata.find(m => m.new_lawyer_id === userId)?.admin_user_id;

        let firmUserIds = [userId];
        if (currentAdminId) {
          const { data: firmMembers } = await supabase
            .from('user_metadata')
            .select('user_id, admin_user_id, new_lawyer_id')
            .or(`admin_user_id.eq.${currentAdminId},user_id.eq.${currentAdminId}`);

          if (firmMembers) {
            firmUserIds = [...new Set(firmMembers.map(m => m.user_id).filter(Boolean))];
          }
        }

        // Fetch sessions only for the filtered cases AND created by firm members
        const { data: sessions, error: sessionsError } = await supabase
          .from('sessions')
          .select('id, case_number, sessiondate, sessiontime, sessiondetails, user_id, next_session_date, next_session_time, next_session_req')
          .in('case_number', caseNumbers)
          .in('user_id', firmUserIds);

        if (sessionsError) {
          throw new Error('Error fetching session data');
        }

        // Fetch Creator Metadata (Usernames)
        const creatorIds = [...new Set(sessions.map(s => s.user_id).filter(Boolean))];
        let usernamesMap = {};
        if (creatorIds.length > 0) {
          const { data: userData } = await supabase
            .from('user_metadata')
            .select('user_id, username')
            .in('user_id', creatorIds);

          if (userData) {
            userData.forEach(u => {
              usernamesMap[u.user_id] = u.username;
            });
          }
        }

        // Map caseType2, courtAddress, client_name, opponentName, and case_number_in_court to corresponding case_number
        const caseMap = cases.reduce((acc, curr) => {
          acc[curr.case_number] = {
            caseType2: curr.caseType2 || 'Unknown',
            courtAddress: curr.courtAddress || 'Unknown',
            clientName: curr.client_name || 'N/A',
            opponentName: curr.opponentName || 'غير محدد',
            case_number_in_court: curr.case_number_in_court || '-',
            caseState: curr.caseState || 'غير محدد',
            case_id: curr.id
          };
          return acc;
        }, {});

        // Attach details to each session
        const enrichedSessions = sessions.map(session => ({
          ...session,
          caseType2: caseMap[session.case_number]?.caseType2 || 'Unknown',
          courtAddress: caseMap[session.case_number]?.courtAddress || 'Unknown',
          clientName: caseMap[session.case_number]?.clientName || 'N/A',
          opponentName: caseMap[session.case_number]?.opponentName || 'غير محدد',
          case_number_in_court: caseMap[session.case_number]?.case_number_in_court || '-',
          caseState: caseMap[session.case_number]?.caseState || 'غير محدد',
          case_id: caseMap[session.case_number]?.case_id,
          addedBy: usernamesMap[session.user_id] || 'مستخدم'
        }));

        setSessionsData(enrichedSessions);

        // Calculate statistics
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const todayStr = today.toISOString().split('T')[0];

        const todayCount = enrichedSessions.filter(s => {
          const sDate = s.sessiondate ? new Date(s.sessiondate) : null;
          const nDate = s.next_session_date ? new Date(s.next_session_date) : null;
          if (sDate) sDate.setHours(0, 0, 0, 0);
          if (nDate) nDate.setHours(0, 0, 0, 0);

          const isToday = (sDate && sDate.toISOString().split('T')[0] === todayStr) ||
            (nDate && nDate.toISOString().split('T')[0] === todayStr);
          return isToday;
        }).length;

        const upcomingCount = enrichedSessions.filter(s => {
          const sDate = s.sessiondate ? new Date(s.sessiondate) : null;
          const nDate = s.next_session_date ? new Date(s.next_session_date) : null;
          if (sDate) sDate.setHours(0, 0, 0, 0);
          if (nDate) nDate.setHours(0, 0, 0, 0);

          return (sDate && sDate > today) || (nDate && nDate > today);
        }).length;

        const thisWeekCount = enrichedSessions.filter(s => {
          const sDate = s.sessiondate ? new Date(s.sessiondate) : null;
          const nDate = s.next_session_date ? new Date(s.next_session_date) : null;
          if (sDate) sDate.setHours(0, 0, 0, 0);
          if (nDate) nDate.setHours(0, 0, 0, 0);

          return (sDate && sDate >= weekStart && sDate <= weekEnd) ||
            (nDate && nDate >= weekStart && nDate <= weekEnd);
        }).length;

        setStats({
          today: todayCount,
          upcoming: upcomingCount,
          thisWeek: thisWeekCount,
          total: enrichedSessions.length,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, []);
  const filteredSessions = sessionsData.filter(session => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const sDate = session.sessiondate ? new Date(session.sessiondate) : null;
    if (sDate) sDate.setHours(0, 0, 0, 0);
    const sDateStr = sDate ? sDate.toISOString().split('T')[0] : null;

    const nDate = session.next_session_date ? new Date(session.next_session_date) : null;
    if (nDate) nDate.setHours(0, 0, 0, 0);
    const nDateStr = nDate ? nDate.toISOString().split('T')[0] : null;

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Apply date filter
    let matchesFilter = false;
    if (filter === 'today') {
      matchesFilter = (sDateStr === todayStr) || (nDateStr === todayStr);
    } else if (filter === 'upcoming') {
      matchesFilter = (sDate > today) || (nDate && nDate > today);
    } else if (filter === 'thisWeek') {
      matchesFilter = (sDate >= weekStart && sDate <= weekEnd) ||
        (nDate && nDate >= weekStart && nDate <= weekEnd);
    } else if (filter === 'all') {
      matchesFilter = true;
    } else {
      matchesFilter = true;
    }

    // Apply search filter
    if (searchQuery && matchesFilter) {
      const query = searchQuery.toLowerCase();
      if (searchType === 'file_number' && session.case_number) {
        return session.case_number.toLowerCase().includes(query);
      } else if (searchType === 'case_number' && session.case_number) {
        return session.case_number.toLowerCase().includes(query);
      } else if (searchType === 'client_name' && session.clientName) {
        return session.clientName.toLowerCase().includes(query);
      } else {
        // Search in all fields
        const searchableText = [
          session.case_number,
          session.clientName,
          session.sessiondetails,
          session.courtAddress,
          session.caseType2
        ].filter(Boolean).join(' ').toLowerCase();
        return searchableText.includes(query);
      }
    }

    return matchesFilter;
  });

  const handleNavClick = (navType) => {
    setFilter(navType);
  };

  const handleRowClick = (session) => {
    setActiveRowId(session.id);
    const targetUrl = session.case_id 
      ? `/cases/CaseDetailsPage?caseId=${session.case_id}&tab=sessions&highlightType=session&highlightId=${session.id}`
      : `/cases/CaseDetailsPage?caseNumber=${session.case_number}&tab=sessions&highlightType=session&highlightId=${session.id}`;
    router.push(targetUrl);
  };

  const handleGenerateCurrentViewPDF = async () => {
    try {
      // Use the currently filtered sessions (filteredSessions)
      const currentSessions = filteredSessions;

      if (currentSessions.length === 0) {
        alert('لا توجد جلسات في العرض الحالي');
        return;
      }

      // Create PDF document
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation

      // Load Arabic Font (Amiri) for proper Arabic text rendering
      try {
        const fontUrl = '/templates/Amiri/Amiri-Regular.ttf';
        const fontResponse = await fetch(fontUrl);
        if (fontResponse.ok) {
          const fontBlob = await fontResponse.blob();
          const reader = new FileReader();
          reader.readAsDataURL(fontBlob);
          await new Promise((resolve, reject) => {
            reader.onloadend = () => {
              try {
                const base64data = reader.result.split(',')[1];
                doc.addFileToVFS('Amiri-Regular.ttf', base64data);
                doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
                doc.setFont('Amiri');
                resolve();
              } catch (err) {
                console.warn('Could not load Arabic font, using default:', err);
                resolve(); // Continue with default font
              }
            };
            reader.onerror = reject;
          });
        }
      } catch (fontError) {
        console.warn('Could not load Arabic font, using default:', fontError);
        // Continue with default font
      }

      // Add title based on current filter
      doc.setFontSize(18);
      doc.setTextColor(37, 99, 235);
      let title = 'تقرير الجلسات';
      if (filter === 'today') {
        title = 'تقرير جلسات اليوم';
      } else if (filter === 'upcoming') {
        title = 'تقرير الجلسات القادمة';
      } else if (filter === 'thisWeek') {
        title = 'تقرير جلسات هذا الأسبوع';
      } else if (filter === 'all') {
        title = 'تقرير جميع الجلسات';
      }
      doc.text(title, 280, 15, { align: 'right' });

      // Add search query if exists
      let startY = 30;
      if (searchQuery) {
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`نتائج البحث: ${searchQuery}`, 280, 25, { align: 'right' });
        startY = 35;
      }

      // Prepare table data
      const tableData = currentSessions.map(session => {
        const sessionDate = new Date(session.sessiondate);
        const formattedDate = sessionDate.toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          weekday: 'short'
        });

        // Format next session info
        let nextSessionInfo = '-';
        if (session.next_session_date) {
          nextSessionInfo = session.next_session_date;
          if (session.next_session_time) {
            nextSessionInfo += ` - ${session.next_session_time}`;
          }
        }

        return [
          `${formattedDate}${session.sessiontime ? ` (${session.sessiontime})` : ''}` || '-',
          session.case_number || '-',
          session.case_number_in_court || '-',
          session.clientName || '-',
          session.opponentName || 'غير محدد',
          session.courtAddress || '-',
          session.sessiondetails || '-',
          nextSessionInfo
        ];
      });

      // Add table using autoTable with Arabic font support
      doc.autoTable({
        head: [['التاريخ', 'رقم الملف', 'رقم الدعوى', 'الموكل', 'الخصم', 'المحكمة/الدائرة', 'تفاصيل الجلسة', 'الجلسة القادمة']],
        body: tableData,
        startY: startY,
        styles: {
          font: doc.getFont().fontName === 'Amiri' ? 'Amiri' : 'Arial',
          fontSize: 9,
          halign: 'right',
          textColor: [30, 30, 30]
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'right',
          font: doc.getFont().fontName === 'Amiri' ? 'Amiri' : 'Arial'
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        margin: { top: startY, right: 10, bottom: 20, left: 10 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 30 },
          4: { cellWidth: 30 },
          5: { cellWidth: 30 },
          6: { cellWidth: 40 },
          7: { cellWidth: 40 }
        }
      });

      // Add footer with print date (English format)
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        const printDate = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        doc.text(`تاريخ الطباعة: ${printDate}`, 280, 200, { align: 'right' });
        doc.text(`صفحة ${i} من ${pageCount}`, 10, 200, { align: 'left' });
      }

      // Save PDF
      const fileName = `جدول_الجلسات_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF: ' + error.message);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Search is handled in filteredSessions
  };

  const handleGenerateWeeklyPDF = async () => {
    try {
      // Calculate current week dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Filter sessions for current week
      const weeklySessions = sessionsData.filter(session => {
        if (!session.sessiondate) return false;
        const sessionDate = new Date(session.sessiondate);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate >= weekStart && sessionDate <= weekEnd;
      });

      if (weeklySessions.length === 0) {
        alert('لا توجد جلسات لهذا الأسبوع');
        return;
      }

      // Create PDF document
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation

      // Load Arabic Font (Amiri) for proper Arabic text rendering
      try {
        const fontUrl = '/templates/Amiri/Amiri-Regular.ttf';
        const fontResponse = await fetch(fontUrl);
        if (fontResponse.ok) {
          const fontBlob = await fontResponse.blob();
          const reader = new FileReader();
          reader.readAsDataURL(fontBlob);
          await new Promise((resolve, reject) => {
            reader.onloadend = () => {
              try {
                const base64data = reader.result.split(',')[1];
                doc.addFileToVFS('Amiri-Regular.ttf', base64data);
                doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
                doc.setFont('Amiri');
                resolve();
              } catch (err) {
                console.warn('Could not load Arabic font, using default:', err);
                resolve(); // Continue with default font
              }
            };
            reader.onerror = reject;
          });
        }
      } catch (fontError) {
        console.warn('Could not load Arabic font, using default:', fontError);
        // Continue with default font
      }

      // Add title
      doc.setFontSize(18);
      doc.setTextColor(37, 99, 235);
      doc.text('تقرير جلسات الأسبوع', 280, 15, { align: 'right' });

      // Add date range
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      const weekStartStr = weekStart.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const weekEndStr = weekEnd.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`من ${weekStartStr} إلى ${weekEndStr}`, 280, 25, { align: 'right' });

      // Prepare table data
      const tableData = weeklySessions.map(session => {
        const sessionDate = new Date(session.sessiondate);
        const formattedDate = sessionDate.toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          weekday: 'short'
        });

        // Format next session info
        let nextSessionInfo = '-';
        if (session.next_session_date) {
          nextSessionInfo = session.next_session_date;
          if (session.next_session_time) {
            nextSessionInfo += ` - ${session.next_session_time}`;
          }
        }

        return [
          `${formattedDate}${session.sessiontime ? ` (${session.sessiontime})` : ''}` || '-',
          session.case_number || '-',
          session.case_number_in_court || '-',
          session.clientName || '-',
          session.opponentName || 'غير محدد',
          session.courtAddress || '-',
          session.sessiondetails || '-',
          nextSessionInfo
        ];
      });

      // Add table using autoTable with Arabic font support
      doc.autoTable({
        head: [['التاريخ', 'رقم الملف', 'رقم الدعوى', 'الموكل', 'الخصم', 'المحكمة/الدائرة', 'تفاصيل الجلسة', 'الجلسة القادمة']],
        body: tableData,
        startY: 35,
        styles: {
          font: doc.getFont().fontName === 'Amiri' ? 'Amiri' : 'Arial',
          fontSize: 9,
          halign: 'right',
          textColor: [30, 30, 30]
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'right',
          font: doc.getFont().fontName === 'Amiri' ? 'Amiri' : 'Arial'
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        margin: { top: 35, right: 10, bottom: 20, left: 10 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 30 },
          4: { cellWidth: 30 },
          5: { cellWidth: 30 },
          6: { cellWidth: 40 },
          7: { cellWidth: 40 }
        }
      });

      // Add footer with print date (English format)
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        const printDate = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        doc.text(`تاريخ الطباعة: ${printDate}`, 280, 200, { align: 'right' });
        doc.text(`صفحة ${i} من ${pageCount}`, 10, 200, { align: 'left' });
      }

      // Save PDF
      const fileName = `جلسات_الأسبوع_${weekStart.toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF: ' + error.message);
    }
  };

  const handleGenerateNextWeekPDF = async () => {
    try {
      // Calculate next week dates
      // "Next week" means the next 7 days starting from tomorrow
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Next week starts tomorrow
      const nextWeekStart = new Date(today);
      nextWeekStart.setDate(today.getDate() + 1);
      nextWeekStart.setHours(0, 0, 0, 0);

      // Next week ends 7 days from tomorrow (8 days from today)
      const nextWeekEnd = new Date(today);
      nextWeekEnd.setDate(today.getDate() + 7);
      nextWeekEnd.setHours(23, 59, 59, 999);

      // Debug: Log the date range
      console.log('Next week range:', {
        start: nextWeekStart.toISOString(),
        startFormatted: nextWeekStart.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        end: nextWeekEnd.toISOString(),
        endFormatted: nextWeekEnd.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        today: today.toISOString(),
        todayFormatted: today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      });

      // Filter sessions for next week
      const nextWeekSessions = sessionsData.filter(session => {
        if (!session.sessiondate) return false;

        // Parse session date - handle different date formats
        let sessionDate;
        if (typeof session.sessiondate === 'string') {
          // Handle date strings - try parsing as ISO or other formats
          sessionDate = new Date(session.sessiondate);
          // If date string doesn't have time, set to start of day
          if (!session.sessiondate.includes('T') && !session.sessiondate.includes(' ')) {
            sessionDate.setHours(0, 0, 0, 0);
          }
        } else {
          sessionDate = new Date(session.sessiondate);
        }

        // Check if date is valid
        if (isNaN(sessionDate.getTime())) {
          console.warn('Invalid session date:', session.sessiondate);
          return false;
        }

        sessionDate.setHours(0, 0, 0, 0);
        const isInRange = sessionDate >= nextWeekStart && sessionDate <= nextWeekEnd;

        // Debug log for sessions near the range
        const daysDiff = Math.floor((sessionDate - today) / (1000 * 60 * 60 * 24));
        if (Math.abs(daysDiff) <= 10) {
          console.log('Session check:', {
            sessionDate: sessionDate.toISOString(),
            sessionDateFormatted: sessionDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            nextWeekStart: nextWeekStart.toISOString(),
            nextWeekEnd: nextWeekEnd.toISOString(),
            daysFromToday: daysDiff,
            isInRange
          });
        }

        return isInRange;
      });

      console.log('Next week sessions found:', nextWeekSessions.length, 'out of', sessionsData.length);

      if (nextWeekSessions.length === 0) {
        alert(`لا توجد جلسات للأسبوع القادم (${nextWeekStart.toLocaleDateString('ar-EG')} - ${nextWeekEnd.toLocaleDateString('ar-EG')})`);
        return;
      }

      // Create PDF document
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation

      // Load Arabic Font (Amiri) for proper Arabic text rendering
      try {
        const fontUrl = '/templates/Amiri/Amiri-Regular.ttf';
        const fontResponse = await fetch(fontUrl);
        if (fontResponse.ok) {
          const fontBlob = await fontResponse.blob();
          const reader = new FileReader();
          reader.readAsDataURL(fontBlob);
          await new Promise((resolve, reject) => {
            reader.onloadend = () => {
              try {
                const base64data = reader.result.split(',')[1];
                doc.addFileToVFS('Amiri-Regular.ttf', base64data);
                doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
                doc.setFont('Amiri');
                resolve();
              } catch (err) {
                console.warn('Could not load Arabic font, using default:', err);
                resolve(); // Continue with default font
              }
            };
            reader.onerror = reject;
          });
        }
      } catch (fontError) {
        console.warn('Could not load Arabic font, using default:', fontError);
        // Continue with default font
      }

      // Add title
      doc.setFontSize(18);
      doc.setTextColor(37, 99, 235);
      doc.text('تقرير جلسات الأسبوع القادم', 280, 15, { align: 'right' });

      // Add date range
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      const weekStartStr = nextWeekStart.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const weekEndStr = nextWeekEnd.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`من ${weekStartStr} إلى ${weekEndStr}`, 280, 25, { align: 'right' });

      // Prepare table data
      const tableData = nextWeekSessions.map(session => {
        const sessionDate = new Date(session.sessiondate);
        const formattedDate = sessionDate.toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          weekday: 'short'
        });

        // Format next session info
        let nextSessionInfo = '-';
        if (session.next_session_date) {
          nextSessionInfo = session.next_session_date;
          if (session.next_session_time) {
            nextSessionInfo += ` - ${session.next_session_time}`;
          }
        }

        return [
          `${formattedDate}${session.sessiontime ? ` (${session.sessiontime})` : ''}` || '-',
          session.case_number || '-',
          session.case_number_in_court || '-',
          session.clientName || '-',
          session.opponentName || 'غير محدد',
          session.courtAddress || '-',
          session.sessiondetails || '-',
          nextSessionInfo
        ];
      });

      // Add table using autoTable with Arabic font support
      doc.autoTable({
        head: [['التاريخ', 'رقم الملف', 'رقم الدعوى', 'الموكل', 'الخصم', 'المحكمة/الدائرة', 'تفاصيل الجلسة', 'الجلسة القادمة']],
        body: tableData,
        startY: 35,
        styles: {
          font: doc.getFont().fontName === 'Amiri' ? 'Amiri' : 'Arial',
          fontSize: 9,
          halign: 'right',
          textColor: [30, 30, 30]
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'right',
          font: doc.getFont().fontName === 'Amiri' ? 'Amiri' : 'Arial'
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        margin: { top: 35, right: 10, bottom: 20, left: 10 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 30 },
          4: { cellWidth: 30 },
          5: { cellWidth: 30 },
          6: { cellWidth: 40 },
          7: { cellWidth: 40 }
        }
      });

      // Add footer with print date (English format)
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        const printDate = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        doc.text(`تاريخ الطباعة: ${printDate}`, 280, 200, { align: 'right' });
        doc.text(`صفحة ${i} من ${pageCount}`, 10, 200, { align: 'left' });
      }

      // Save PDF
      const fileName = `جلسات_الأسبوع_القادم_${nextWeekStart.toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF: ' + error.message);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
        case 'قيد الاجراء': return 'status-orange';
        case 'متوقفة': return 'status-pink';
        case 'مكتملة': return 'status-green';
        case 'في الانتظار': return 'status-yellow';
        case 'مسودة': return 'status-gray';
        default: return 'status-default';
    }
  };

  return (
    <Layout>
      <div className="sessions-page">
        <div className="page-container">
          {/* Breadcrumb Navigation */}
          <div className="breadcrumb-nav">
            <Link href="/dashboard">
              <a className="breadcrumb-link">الرئيسية</a>
            </Link>
            <FaChevronLeft className="breadcrumb-separator" />
            <Link href="/cases/CasesTable">
              <a className="breadcrumb-link">قسم الدعاوي</a>
            </Link>
            <FaChevronLeft className="breadcrumb-separator" />
            <Link href="/cases/sessions">
              <a className="breadcrumb-link">الجلسات</a>
            </Link>
            <FaChevronLeft className="breadcrumb-separator" />
            <span className="breadcrumb-item active">جميع الجلسات</span>
          </div>

          {/* Quick Options Bar */}
          <div className="quick-options-bar">
            <div className="quick-options-label">خيارات سريعة</div>
            <div className="quick-options-buttons">
              <button
                className={`quick-option-btn ${filter === 'today' ? 'active' : ''}`}
                onClick={() => handleNavClick('today')}
              >
                <FaCalendarAlt className="quick-option-icon" />
                <FaBell className="quick-option-icon" />
                <span>جلسات اليوم</span>
              </button>
              <button
                className={`quick-option-btn ${filter === 'upcoming' ? 'active' : ''}`}
                onClick={() => handleNavClick('upcoming')}
              >
                <FaList className="quick-option-icon" />
                <span>الجلسات القادمة</span>
              </button>
              <button
                className={`quick-option-btn ${filter === 'thisWeek' ? 'active' : ''}`}
                onClick={() => handleNavClick('thisWeek')}
              >
                <FaList className="quick-option-icon" />
                <FaCalendarAlt className="quick-option-icon" />
                <span>جلسات هذا الاسبوع</span>
              </button>
              <button
                className={`quick-option-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => handleNavClick('all')}
              >
                <FaCalendarAlt className="quick-option-icon" />
                <FaExclamationCircle className="quick-option-icon" />
                <span>جميع الجلسات</span>
              </button>
            </div>
          </div>

          {/* Search Bar Section */}
          <div className="search-section">
            <div className="search-section-row">
              <form className="search-form" onSubmit={handleSearch}>
                <div className="search-input-wrapper">
                  <FaSearch className="search-input-icon" />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="البحث عن رقم الملف رقم الدعوى اسم الموكل ...."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  className="search-dropdown"
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                >
                  <option value="file_number">رقم الملف</option>
                  <option value="case_number">رقم الدعوى</option>
                  <option value="client_name">اسم الموكل</option>
                  <option value="all">الكل</option>
                </select>
                <button type="submit" className="search-button">
                  بحث
                </button>
              </form>
              <div className="search-pdf-buttons">
                <button
                  className="search-pdf-btn"
                  onClick={() => handleGenerateWeeklyPDF()}
                >
                  <FaFilePdf className="search-pdf-icon" />
                  <span>حفظ جلسات الاسبوع</span>
                </button>
                <button
                  className="search-pdf-btn"
                  onClick={() => handleGenerateNextWeekPDF()}
                >
                  <FaFilePdf className="search-pdf-icon" />
                  <span>حفظ جلسات الاسبوع القادم</span>
                </button>
                <button
                  className="search-pdf-btn"
                  onClick={() => handleGenerateCurrentViewPDF()}
                >
                  <FaFilePdf className="search-pdf-icon" />
                  <span>حفظ الجدول الحالي</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="sessions-container">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>جاري التحميل...</p>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="empty-state">
                <FaCalendarAlt className="empty-icon" />
                <p>
                  {filter === "today"
                    ? "لا يوجد جلسات لليوم"
                    : filter === "upcoming"
                      ? "لا يوجد جلسات قادمة"
                      : filter === "thisWeek"
                        ? "لا يوجد جلسات هذا الاسبوع"
                        : "لا توجد جلسات"}
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="sessions-table">
                  <thead>
                    <tr>
                      <th>
                        <div className="th-content">
                          <FaFileAlt className="th-icon" />
                          <span>رقم الملف</span>
                        </div>
                      </th>
                      <th>
                        <div className="th-content">
                          <FaFileAlt className="th-icon" />
                          <span>رقم الدعوى</span>
                        </div>
                      </th>
                      <th>
                        <div className="th-content">
                          <FaUser className="th-icon" />
                          <span>بواسطة</span>
                        </div>
                      </th>
                      <th>
                        <div className="th-content">
                          <FaExclamationCircle className="th-icon" />
                          <span>الحالة</span>
                        </div>
                      </th>
                      <th>
                        <div className="th-content">
                          <FaClock className="th-icon" />
                          <span>موعد الجلسة</span>
                        </div>
                      </th>
                      <th>
                        <div className="th-content">
                          <FaFileAlt className="th-icon" />
                          <span>تفاصيل الجلسة</span>
                        </div>
                      </th>
                      <th>
                        <div className="th-content">
                          <FaCalendarAlt className="th-icon" />
                          <span>الجلسة القادمة</span>
                        </div>
                      </th>
                      <th>
                        <div className="th-content">
                          <FaUser className="th-icon" />
                          <span>الموكل</span>
                        </div>
                      </th>
                      <th>
                        <div className="th-content">
                          <FaMapMarkerAlt className="th-icon" />
                          <span>المحكمة/الدائرة</span>
                        </div>
                      </th>
                      <th>
                        <div className="th-content">
                          <FaEye className="th-icon" />
                          <span>الإجراءات</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((session) => (
                      <tr
                        key={session.id}
                        onClick={() => handleRowClick(session)}
                        className={`session-row ${activeRowId === session.id ? 'row-active' : ''}`}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <div className="case-cell">
                            <Link href={`/cases/CaseDetailsPage?caseNumber=${session.case_number}`}>
                              <a className="case-number-link">{session.case_number || "-"}</a>
                            </Link>
                          </div>
                        </td>
                        <td>
                          <div className="case-cell">
                            <span className="case-number-court">{session.case_number_in_court || "-"}</span>
                          </div>
                        </td>
                        <td>
                          <div className="creator-cell">
                            <span className="creator-name">{session.addedBy}</span>
                          </div>
                        </td>
                        <td>
                          <div className="status-cell">
                             <span className={`status-badge ${getStatusClass(session.caseState)}`}>
                               {session.caseState || 'غير محدد'}
                             </span>
                          </div>
                        </td>
                        <td>
                          <div className="date-cell">
                            <FaCalendarAlt className="date-icon" />
                            <span>
                              {new Date(session.sessiondate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="details-cell">
                            {session.sessiondetails || "لا توجد تفاصيل"}
                          </div>
                        </td>
                        <td>
                          <div className="next-session-cell">
                            {session.next_session_date ? (
                              <>
                                <div className="next-date">
                                  <FaCalendarAlt className="inline-icon" />
                                  <span>{session.next_session_date}</span>
                                  {session.next_session_time && (
                                    <span className="next-time"> - {session.next_session_time}</span>
                                  )}
                                </div>
                                {session.next_session_req && (
                                  <div className="next-req" title={session.next_session_req}>
                                    <FaFileAlt className="inline-icon" />
                                    <span>{session.next_session_req}</span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="no-data">-</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="client-cell">
                            <FaUser className="client-icon" />
                            <span>{session.clientName || "N/A"}</span>
                          </div>
                        </td>
                        <td>
                          <div className="court-cell">
                            <FaMapMarkerAlt className="court-icon" />
                            <span>{session.courtAddress || "غير محدد"}</span>
                          </div>
                        </td>
                        <td>
                          <Link href={`/cases/CaseDetailsPage?caseNumber=${session.case_number}&tab=sessions`}>
                            <a className="details-link">
                              <FaEye className="details-link-icon" />
                              <span>عرض التفاصيل</span>
                            </a>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>


      <style jsx>{`
        .sessions-page {
          direction: rtl;
          min-height: auto;
          background: transparent;
          font-family: 'Cairo', 'Almarai', sans-serif;
          padding: 12px 24px 24px 24px;
        }

        .page-container {
          max-width: 1600px;
          margin: 0 auto;
        }

        /* Breadcrumb Navigation */
        .breadcrumb-nav {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          font-size: 14px;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .breadcrumb-link {
          color: #64748B;
          text-decoration: none;
          transition: color 0.2s;
          cursor: pointer;
        }

        .breadcrumb-link:hover {
          color: #2563EB;
          text-decoration: underline;
        }

        .breadcrumb-separator {
          font-size: 12px;
          color: #94A3B8;
        }

        .breadcrumb-item {
          color: #64748B;
        }

        .breadcrumb-item.active {
          color: #2563EB;
          font-weight: 600;
        }


        /* Quick Options Bar */
        .quick-options-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #FFFFFF;
          border-radius: 12px;
          padding: 12px 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          border: 1px solid #E2E8F0;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .quick-options-label {
          font-size: 14px;
          font-weight: 600;
          color: #2563EB;
          font-family: 'Cairo', 'Almarai', sans-serif;
          white-space: nowrap;
        }

        .quick-options-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          flex: 1;
        }

        .quick-option-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 14px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #1E293B;
          cursor: pointer;
          font-family: 'Cairo', 'Almarai', sans-serif;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .quick-option-btn:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
        }

        .quick-option-btn.active {
          background: #2563EB;
          border-color: #2563EB;
          color: #FFFFFF;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
        }

        .quick-option-icon {
          font-size: 14px;
        }

        .quick-option-btn.active .quick-option-icon {
          color: #FFFFFF;
        }

        .quick-option-btn.pdf-btn .pdf-icon {
          color: #DC2626;
        }

        .quick-option-btn.pdf-btn.active .pdf-icon {
          color: #FFFFFF;
        }

        /* Search Section */
        .search-section {
          background: #FFFFFF;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          border: 1px solid #E2E8F0;
          margin-bottom: 20px;
        }

        .search-section-row {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .search-form {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          flex: 1;
          min-width: 400px;
        }

        .search-input-wrapper {
          flex: 1;
          min-width: 300px;
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-input-icon {
          position: absolute;
          right: 12px;
          font-size: 16px;
          color: #94A3B8;
          z-index: 1;
        }

        .search-input {
          width: 100%;
          padding: 10px 40px 10px 14px;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-size: 14px;
          font-family: 'Cairo', 'Almarai', sans-serif;
          color: #1E293B;
          background: #FFFFFF;
          outline: none;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .search-input::placeholder {
          color: #94A3B8;
        }

        .search-dropdown {
          padding: 10px 32px 10px 12px;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-size: 14px;
          font-family: 'Cairo', 'Almarai', sans-serif;
          color: #1E293B;
          background: #FFFFFF;
          cursor: pointer;
          outline: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: left 12px center;
          background-size: 12px;
          padding-left: 36px;
          transition: border-color 0.2s;
        }

        .search-dropdown:focus {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .search-button {
          padding: 10px 24px;
          background: linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%);
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #FFFFFF;
          cursor: pointer;
          font-family: 'Cairo', 'Almarai', sans-serif;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .search-button:hover {
          background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
          box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
        }

        .search-button:active {
          transform: translateY(1px);
        }

        .search-pdf-buttons {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .search-pdf-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 14px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #1E293B;
          cursor: pointer;
          font-family: 'Cairo', 'Almarai', sans-serif;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .search-pdf-btn:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
        }

        .search-pdf-icon {
          font-size: 14px;
          color: #DC2626;
        }

        /* Sessions Container */
        .sessions-container {
          background: #FFFFFF;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: 1px solid #E2E8F0;
          overflow: hidden;
        }

        .table-wrapper {
          overflow-x: auto;
          overflow-y: hidden;
      }

      .sessions-table {
        width: 100%;
        border-collapse: collapse;
          font-size: 14px;
      }

        .sessions-table thead {
          background: linear-gradient(135deg, #1E40AF 0%, #2563EB 100%);
          border-bottom: 2px solid #1E40AF;
          position: sticky;
          top: 0;
          z-index: 10;
      }

      .sessions-table th {
          padding: 18px 20px;
          text-align: right;
          font-weight: 700;
          color: #FFFFFF;
          font-size: 14px;
          white-space: nowrap;
          letter-spacing: 0.02em;
          font-family: 'Cairo', 'Almarai', sans-serif;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .th-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .th-icon {
          font-size: 14px;
          color: #DBEAFE;
        }

        .sessions-table td {
          padding: 16px 20px;
          text-align: right;
          border-bottom: 1px solid #F1F5F9;
          color: #475569;
          line-height: 1.6;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .sessions-table tbody tr {
          background-color: #FFFFFF;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .sessions-table tbody tr:hover {
          background-color: #EFF6FF;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
        }

        .sessions-table tbody tr.row-active {
          background-color: #DBEAFE;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
          border-right: 3px solid #2563EB;
        }

        .sessions-table tbody tr.row-active:hover {
          background-color: #BFDBFE;
        }

        .sessions-table tbody tr:last-child td {
          border-bottom: none;
        }

        /* Table Cell Styles */
        .session-id {
          display: inline-block;
          padding: 4px 10px;
          background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
          color: #2563EB;
          font-weight: 700;
          font-size: 13px;
          border-radius: 6px;
          border: 1px solid #BFDBFE;
        }

        .date-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #1E293B;
        }

        .date-icon {
          font-size: 14px;
          color: #64748B;
        }

        .details-cell {
          max-width: 300px;
          color: #475569;
          line-height: 1.6;
          font-size: 13px;
        }

        .client-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #1E293B;
        }

        .client-icon {
          font-size: 14px;
          color: #64748B;
        }

        .court-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #475569;
        }

        .court-icon {
          font-size: 14px;
          color: #64748B;
        }

        .case-cell {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .case-number-link {
          color: #2563EB;
          font-weight: 700;
        text-decoration: none;
          font-size: 14px;
          display: inline-block;
      }

        .case-number-court {
          font-size: 14px;
          color: #1E293B;
          font-weight: 600;
        }

      .case-type {
          font-size: 12px;
          color: #94A3B8;
          font-weight: 500;
        }

        .status-badge {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 8px;
            font-size: 0.75rem;
            font-weight: 600;
            white-space: nowrap;
            border: 1px solid transparent;
            transition: all 0.2s ease;
        }

        .status-orange {
            background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
            color: #ea580c;
            border-color: #fb923c;
        }

        .status-pink {
            background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
            color: #ec4899;
            border-color: #f472b6;
        }

        .status-green {
            background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
            color: #059669;
            border-color: #34d399;
        }

        .status-yellow {
            background: linear-gradient(135deg, #fef9c3 0%, #fef08a 100%);
            color: #ca8a04;
            border-color: #facc15;
        }

        .status-gray {
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
            color: #4b5563;
            border-color: #d1d5db;
        }

        .status-default {
            background: linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%);
            color: #6b7280;
            border-color: #d4d4d4;
        }

        .creator-cell {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .creator-name {
          font-size: 13px;
          color: #2563EB;
          font-weight: 700;
          background: #EFF6FF;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .next-session-cell {
          font-size: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: 200px;
        }

        .next-date {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 700;
          color: #1E293B;
        }

        .next-time {
          color: #2563EB;
        }

        .next-req {
          color: #64748B;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .inline-icon {
          font-size: 10px;
          color: #94A3B8;
        }

        .no-data {
          color: #CBD5E1;
        }

        .details-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #2563EB;
          font-weight: 600;
          text-decoration: none;
          font-size: 13px;
          padding: 6px 12px;
          background: #EFF6FF;
          border-radius: 6px;
          border: 1px solid #DBEAFE;
        }


        .details-link-icon {
          font-size: 12px;
        }

        /* Loading State */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          gap: 16px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #E2E8F0;
          border-top-color: #2563EB;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-state p {
          margin: 0;
          font-size: 14px;
          font-weight: 500;
          color: #64748B;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        /* Empty State */
        .empty-state {
        display: flex;
          flex-direction: column;
        align-items: center;
          justify-content: center;
          padding: 80px 20px;
          gap: 16px;
        }

        .empty-icon {
          font-size: 64px;
          color: #CBD5E1;
          opacity: 0.5;
          margin-bottom: 8px;
        }

        .empty-state p {
          margin: 0;
          font-size: 15px;
          font-weight: 500;
          color: #94A3B8;
          font-family: 'Cairo', 'Almarai', sans-serif;
      }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .sessions-page {
            padding: 16px;
          }

          .quick-options-bar {
            flex-direction: column;
            align-items: flex-start;
          }

          .quick-options-buttons {
            width: 100%;
          }

          .search-section-row {
            flex-direction: column;
            align-items: stretch;
          }

          .search-form {
            flex-direction: column;
            min-width: 100%;
          }

          .search-input-wrapper {
            width: 100%;
            min-width: 100%;
          }

          .search-dropdown,
          .search-button {
            width: 100%;
          }

          .search-pdf-buttons {
            width: 100%;
            gap: 8px;
            justify-content: flex-start;
          }

          .search-pdf-btn {
            padding: 6px 10px;
            font-size: 12px;
            flex: 1;
            min-width: 0;
          }
        }

        @media (max-width: 768px) {
          .sessions-page {
            padding: 12px 12px 0 12px;
          }

          .breadcrumb-nav {
            font-size: 12px;
            flex-wrap: wrap;
          }

          .quick-options-bar {
            padding: 10px 12px;
          }

          .quick-options-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .quick-option-btn {
            padding: 8px 10px;
            font-size: 12px;
            flex: 1 1 calc(50% - 8px);
            justify-content: center;
          }

          .search-section {
            padding: 12px;
          }

          .search-input {
            font-size: 13px;
            padding: 8px 36px 8px 12px;
          }

          .search-dropdown {
            font-size: 13px;
            padding: 8px 32px 8px 36px;
            width: 100%;
            margin-top: 8px;
          }

          .search-button {
            padding: 10px 20px;
            font-size: 14px;
            width: 100%;
            margin-top: 8px;
          }

          .search-pdf-buttons {
            flex-direction: column;
            width: 100%;
          }

          .search-pdf-btn {
            width: 100%;
          }

          .sessions-container {
             border: none;
             box-shadow: none;
             background: transparent;
             padding: 0;
          }

          .table-wrapper {
             background: transparent;
          }

          .sessions-table, 
          .sessions-table thead, 
          .sessions-table tbody, 
          .sessions-table th, 
          .sessions-table td, 
          .sessions-table tr { 
            display: block; 
          }
          
          .sessions-table thead tr { 
            position: absolute;
            top: -9999px;
            right: -9999px;
            display: none;
          }

          .sessions-table tr { 
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            margin-bottom: 16px;
            padding: 16px;
            background: #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          }

          .sessions-table td { 
            border: none !important;
            border-bottom: 1px dashed #E2E8F0 !important; 
            padding: 12px 0 !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            font-size: 13px !important;
            gap: 12px !important;
          }
          
          .sessions-table td:last-child {
            border-bottom: 0 !important;
            justify-content: center !important;
            padding-top: 16px !important;
            padding-bottom: 4px !important;
          }
          
          .sessions-table td::before { 
            font-weight: 700;
            color: #64748B;
            font-size: 13px;
            white-space: nowrap;
          }

          .sessions-table td:nth-child(1)::before { content: "رقم الملف:"; }
          .sessions-table td:nth-child(2)::before { content: "رقم الدعوى:"; }
          .sessions-table td:nth-child(3)::before { content: "بواسطة:"; }
          .sessions-table td:nth-child(4)::before { content: "الحالة:"; }
          .sessions-table td:nth-child(5)::before { content: "موعد الجلسة:"; }
          .sessions-table td:nth-child(6)::before { content: "تفاصيل الجلسة:"; }
          .sessions-table td:nth-child(7)::before { content: "الجلسة القادمة:"; }
          .sessions-table td:nth-child(8)::before { content: "الموكل:"; }
          .sessions-table td:nth-child(9)::before { content: "المحكمة:"; }

          .case-cell, .creator-cell, .status-cell, .date-cell, .details-cell, .next-session-cell, .client-cell, .court-cell {
            text-align: left;
            align-items: flex-end;
            justify-content: flex-end;
          }
          
          .details-cell {
             max-width: 60%;
             text-align: left;
          }

          .details-link {
            width: 100%;
            justify-content: center;
            padding: 12px;
          }
        }
      `}</style>
    </Layout>
  );
};

export default withAuth(SessionsTable, ['can_view_cases']);