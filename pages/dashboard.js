import { useState, useEffect } from "react"
import ReactDOM from 'react-dom'
import Head from "next/head"
import { supabase } from '../lib/initSupabase'
import Layout from "../components/layout/Layout"
import { useRouter } from 'next/router'
import Link from 'next/link'
import PullToRefresh from 'react-simple-pull-to-refresh'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { useSubscription } from '../context/SubscriptionContext'
import {
  FaGavel,
  FaCheckCircle,
  FaCalendarAlt,
  FaSearch,
  FaFolder,
  FaChevronLeft,
  FaChevronRight,
  FaUser,
  FaUsers,
  FaUpload,
  FaComment,
  FaSignInAlt,
  FaBalanceScale,
  FaFile,
  FaDollarSign,
  FaChartLine,
  FaTasks,
  FaClock,
  FaExclamationTriangle,
  FaBook,
  FaBell,
  FaHistory,
  FaSync,
} from "react-icons/fa"
import { FiPlus, FiChevronDown, FiChevronUp, FiTrendingUp, FiTrendingDown } from "react-icons/fi"
import { HiOutlineDocumentText } from "react-icons/hi"
import { Plus, UserPlus, Scale, FileText, Briefcase, Calendar, AlertCircle, Clock as ClockIcon, BarChart3, DollarSign } from "lucide-react"
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

function Dashboard() {
  const router = useRouter()
  const { isReadOnly, loading: subLoading } = useSubscription()
  const [isClient, setIsClient] = useState(false)
  const [userId, setUserId] = useState(null)
  const [casesData, setCasesData] = useState([])
  const [sessionsData, setSessionsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCalendarLoading, setIsCalendarLoading] = useState(false)
  const [minLoadFinished, setMinLoadFinished] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState({
    cases: [],
    clients: [],
    sessions: [],
    tasks: []
  })
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchType, setSearchType] = useState('رقم الملف')
  const [calendarViewStart, setCalendarViewStart] = useState(new Date())
  const [calendarViewMode, setCalendarViewMode] = useState('week') // 'week' or 'month'
  const [weekViewStart, setWeekViewStart] = useState(new Date())
  const [casesFinancialData, setCasesFinancialData] = useState([])
  const [tasks, setTasks] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [reminders, setReminders] = useState([]) // New state for reminders
  const [clientPortalInteractions, setClientPortalInteractions] = useState([])
  const [expenseSummary, setExpenseSummary] = useState({
    totalThisMonth: 0,
    topCategories: []
  })
  const [allCaseTypes, setAllCaseTypes] = useState([])
  const [allCaseStates, setAllCaseStates] = useState([])
  const [stats, setStats] = useState({
    totalCases: 0,
    activeCases: 0,
    completedCases: 0,
    pendingCases: 0,
    overdueCases: 0,
    todaySessions: 0,
    upcomingSessions: 0,
  })
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false)
  const [taskFormData, setTaskFormData] = useState({
    task_title: '',
    task_type: 'مهمة عامة',
    task_deadline: '',
    task_priority: 'متوسطة',
    task_details: ''
  })
  const [selectedLawyer, setSelectedLawyer] = useState('')
  const [lawyerNames, setLawyerNames] = useState([])
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const [toastType, setToastType] = useState('success') // 'success' or 'error'
  const [mobileStatsTab, setMobileStatsTab] = useState('status')
  const [mobileSelectedDate, setMobileSelectedDate] = useState(new Date())
  const [isMobileDashboard, setIsMobileDashboard] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const sessionUser = supabase.auth.user()
    if (sessionUser) {
      setUserId(sessionUser.id)
      fetchCasesData(sessionUser.id)
      fetchSessionsData(sessionUser.id, calendarViewStart)
      fetchCasesFinancialData(sessionUser.id)
      fetchTasks(sessionUser.id)
      fetchReminders(sessionUser.id)
      fetchRecentActivity(sessionUser.id)
      fetchClientPortalInteractions(sessionUser.id)
      fetchExpenseSummary(sessionUser.id)
      fetchAllCaseTypes()
      fetchAllCaseStates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle calendar navigation separately to avoid full page reloads
  useEffect(() => {
    const sessionUser = supabase.auth.user()
    // Skip during initial mount and if user not yet set
    if (sessionUser && userId && minLoadFinished) {
      fetchSessionsData(userId, calendarViewStart, true) // Pass true to show local loading
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarViewStart])

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadFinished(true);
    }, 2000); // Ensure at least 2 seconds of loading screen
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const detectMobileDashboard = () => {
      // Use screen width only, not platform detection
      // Include iPad portrait modes (768px-1024px) in mobile layout for better UX
      // This matches Android tablet behavior in portrait mode
      setIsMobileDashboard(window.innerWidth <= 1024);
    };

    detectMobileDashboard();
    window.addEventListener('resize', detectMobileDashboard);
    return () => window.removeEventListener('resize', detectMobileDashboard);
  }, []);

  const handleRefresh = async () => {
    try {
      if (typeof window !== 'undefined' && window.Capacitor) {
        await Haptics.impact({ style: ImpactStyle.Medium })
      }
    } catch (e) {}
    
    const currentUser = supabase.auth.user()
    if (currentUser) {
      await Promise.all([
        fetchCasesData(currentUser.id),
        fetchSessionsData(currentUser.id, calendarViewStart),
        fetchCasesFinancialData(currentUser.id),
        fetchTasks(currentUser.id),
        fetchReminders(currentUser.id),
        fetchRecentActivity(currentUser.id),
        fetchClientPortalInteractions(currentUser.id),
        fetchExpenseSummary(currentUser.id)
      ])
    }
  }

  // Task status toggling removed as per user request. Status managed in tasks page.


  const getFirmContext = async (uid) => {
    try {
      const { data: myMeta, error: myMetaError } = await supabase
        .from('user_metadata')
        .select('admin_user_id, new_lawyer_id, user_id, role')
        .or(`new_lawyer_id.eq.${uid},user_id.eq.${uid}`)

      if (myMetaError) throw myMetaError

      let isAdmin = false;
      let firmAdminId = null;
      let firmUserIds = [uid];

      if (myMeta && myMeta.length > 0) {
        const myRow = myMeta.find(m => m.new_lawyer_id === uid) || myMeta.find(m => m.user_id === uid);
        if (myRow) {
          isAdmin = myRow.role === 'Admin' || myRow.admin_user_id === uid;
          firmAdminId = isAdmin ? uid : myRow.admin_user_id;
        }
      }

      if (firmAdminId) {
        const { data: firmUsers } = await supabase
          .from('user_metadata')
          .select('new_lawyer_id, user_id')
          .or(`admin_user_id.eq.${firmAdminId},user_id.eq.${firmAdminId}`);

        if (firmUsers) {
          const lIds = firmUsers.map(u => u.new_lawyer_id).filter(Boolean);
          const uIds = firmUsers.map(u => u.user_id).filter(Boolean);
          firmUserIds = [...new Set([firmAdminId, uid, ...lIds, ...uIds].filter(Boolean))];
        }
      }

      return { isAdmin, firmUserIds: firmUserIds.filter(Boolean), firmAdminId };
    } catch (err) {
      console.error('Error in getFirmContext:', err);
      return { isAdmin: false, firmUserIds: [uid].filter(Boolean), firmAdminId: uid };
    }
  }

  const fetchAllCaseTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('case_options')
        .select('case_type')
        .not('case_type', 'is', null)

      if (error) {
        console.error('Error fetching case types:', error)
        return
      }

      // Get unique case types
      const uniqueTypes = [...new Set(data.map(item => item.case_type).filter(Boolean))]
      setAllCaseTypes(uniqueTypes)
    } catch (error) {
      console.error('Error fetching case types:', error)
    }
  }

  const fetchAllCaseStates = async () => {
    try {
      const { data, error } = await supabase
        .from('case_options')
        .select('case_state')
        .not('case_state', 'is', null)

      if (error) {
        console.error('Error fetching case states:', error)
        return
      }

      // Get unique case states, trim whitespace
      const uniqueStates = [...new Set(data.map(item => (item.case_state || '').trim()).filter(Boolean))]
      setAllCaseStates(uniqueStates)
    } catch (error) {
      console.error('Error fetching case states:', error)
    }
  }

  const fetchCasesData = async (uid) => {
    try {
      setLoading(true)
      const { isAdmin, firmUserIds } = await getFirmContext(uid);

      let cases = []
      let caseOrQuery = isAdmin
        ? `admin_id.in.(${firmUserIds.join(',')}),lawyer_id.in.(${firmUserIds.join(',')}),caseLawyerId.in.(${firmUserIds.join(',')})`
        : `lawyer_id.eq.${uid},caseLawyerId.eq.${uid},admin_id.eq.${uid}`;

      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .or(caseOrQuery)

      if (error) throw new Error('Error fetching cases')
      cases = data || []

      setCasesData(cases)

      // Calculate statistics
      const activeCases = cases.filter(c => {
        const status = c.caseState?.toLowerCase() || ''
        return !status.includes('مكتملة') && !status.includes('مغلقة') && !status.includes('منتهية')
      })
      const completedCases = cases.filter(c => {
        const status = c.caseState?.toLowerCase() || ''
        return status.includes('مكتملة') || status.includes('مغلقة') || status.includes('منتهية')
      })
      const pendingCases = cases.filter(c => {
        const status = c.caseState?.toLowerCase() || ''
        return status.includes('قيد النظر') || status.includes('قيد العمل')
      })
      const overdueCases = cases.filter(c => {
        const status = c.caseState?.toLowerCase() || ''
        return status.includes('متأخرة') || status.includes('متعثرة')
      })

      setStats({
        totalCases: cases.length,
        activeCases: activeCases.length,
        completedCases: completedCases.length,
        pendingCases: pendingCases.length,
        overdueCases: overdueCases.length,
        todaySessions: stats.todaySessions,
        upcomingSessions: stats.upcomingSessions,
      })
    } catch (error) {
      console.error('Error fetching cases:', error.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch sessions for the specific date range and associated users
  const fetchSessionsData = async (uid, targetDate = new Date(), isNavigationFetch = false) => {
    let allSessions = [];
    try {
      if (isNavigationFetch) setIsCalendarLoading(true)
      const referenceDate = new Date(targetDate)
      referenceDate.setHours(0, 0, 0, 0)

      // Calculate range: Start from 1 week before the reference date, cover 6 weeks total
      const day = referenceDate.getDay() // 0 = Sunday
      const diff = referenceDate.getDate() - day

      const rangeStart = new Date(referenceDate)
      rangeStart.setDate(diff - 7) // Buffer: 1 week before
      rangeStart.setHours(0, 0, 0, 0)

      const rangeEnd = new Date(rangeStart)
      rangeEnd.setDate(rangeStart.getDate() + 45) // ~6 weeks coverage
      rangeEnd.setHours(23, 59, 59, 999)


      let firmCtx;
      try {
        firmCtx = await getFirmContext(uid);
      } catch (ctxErr) {
        console.error('[Dashboard] getFirmContext failed in fetchSessionsData:', ctxErr);
        firmCtx = { isAdmin: false, firmUserIds: [uid].filter(Boolean), firmAdminId: uid };
      }
      const { isAdmin, firmUserIds } = firmCtx;


      // 2. Fetch all unique case numbers accessible to this user
      // (This helps narrow down relevant sessions, but we MUST also filter sessions by user_id)
      let caseOrQuery = isAdmin
        ? `admin_id.in.(${firmUserIds.join(',')}),lawyer_id.in.(${firmUserIds.join(',')}),caseLawyerId.in.(${firmUserIds.join(',')})`
        : `lawyer_id.eq.${uid},caseLawyerId.eq.${uid},admin_id.eq.${uid}`;

      const { data: userCases, error: casesError } = await supabase
        .from('cases')
        .select('case_number')
        .or(caseOrQuery);

      if (casesError) {
        console.error('[Dashboard] Error fetching case numbers for sessions:', casesError);
      }

      const allowedCaseNumbers = userCases ? [...new Set(userCases.map(c => c.case_number).filter(Boolean))] : [];

      if (allowedCaseNumbers.length === 0) {
        console.warn('[Dashboard] No case numbers found — setting sessionsData to []');
        setSessionsData([]);
        setStats(prev => ({ ...prev, todaySessions: 0, upcomingSessions: 0 }));
        return;
      }

      // 3. Fetch Sessions - SCOPED BY FIRM USER IDs
      // Use "in" for case numbers AND "in" for user_id to ensure we only get OUR sessions
      // even if another firm uses the same case number.
      // Note: Splitting queries might be needed if URL length exceeds limits, but for now filtering is key.

      const firmUserIdsStr = firmUserIds.join(',');

      // Query A: Standard Sessions
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .in('case_number', allowedCaseNumbers) // Must belong to one of our cases
          .in('user_id', firmUserIds)          // AND must be created by one of our team
          .gte('sessiondate', rangeStart.toISOString())
          .lte('sessiondate', rangeEnd.toISOString())
          .order('sessiondate', { ascending: true });

        if (!sessionError && sessionData) {
          allSessions = [...sessionData];
        } else if (sessionError) {
          console.error('[Dashboard] Error in session Query A:', sessionError);
        }
      } catch (qErr) {
        console.error('[Dashboard] Exception in session Query A:', qErr);
      }

      // Query B: Next Session Dates (often stored as separate field)
      try {
        const { data: nextSessionData, error: nextSessionError } = await supabase
          .from('sessions')
          .select('*')
          .in('case_number', allowedCaseNumbers)
          .in('user_id', firmUserIds)
          .gte('next_session_date', rangeStart.toISOString())
          .lte('next_session_date', rangeEnd.toISOString())
          .order('next_session_date', { ascending: true });

        if (!nextSessionError && nextSessionData) {
          // Merge properly, avoiding duplicates
          const existingIds = new Set(allSessions.map(s => s.id));
          const newSessions = nextSessionData.filter(s => !existingIds.has(s.id));
          allSessions = [...allSessions, ...newSessions];
        } else if (nextSessionError) {
          console.error('[Dashboard] Error in session Query B:', nextSessionError);
        }
      } catch (qErr) {
        console.error('[Dashboard] Exception in session Query B:', qErr);
      }


    } catch (error) {
      console.error('[Dashboard] Error fetching sessions (outer):', error)
    } finally {
      // ALWAYS set sessions data — partial data is better than no data
      setSessionsData(allSessions);

      // Update Stats
      const realToday = new Date()
      realToday.setHours(0, 0, 0, 0)

      const todaySessions = allSessions.filter(s => {
        if (!s.sessiondate) return false
        const sessionDate = new Date(s.sessiondate)
        sessionDate.setHours(0, 0, 0, 0)
        return sessionDate.getTime() === realToday.getTime()
      })

      setStats(prev => ({
        ...prev,
        todaySessions: todaySessions.length,
        upcomingSessions: (allSessions || []).length - todaySessions.length,
      }))

      setIsCalendarLoading(false)
    }
  }

  const fetchCasesFinancialData = async (uid) => {
    try {
      const { isAdmin, firmUserIds } = await getFirmContext(uid);

      let caseOrQuery = isAdmin
        ? `admin_id.in.(${firmUserIds.join(',')}),lawyer_id.in.(${firmUserIds.join(',')}),caseLawyerId.in.(${firmUserIds.join(',')})`
        : `lawyer_id.eq.${uid},caseLawyerId.eq.${uid},admin_id.eq.${uid}`;

      // Fetch all cases belonging to this scope
      const { data: cases, error } = await supabase
        .from('cases')
        .select('id, case_number, client_name, totalAmount, currency')
        .or(caseOrQuery)

      if (error) {
        console.error('Error fetching cases for financials:', error)
        setCasesFinancialData([])
        return
      }

      console.log(`Found ${cases.length} cases for financial data`)

      // For each case, fetch paid amounts (only from lawyer_fees, matching CaseDetailsPage.js logic)
      const casesWithFinancials = await Promise.all(
        (cases || []).map(async (caseItem) => {
          // أتعاب الدعوى (Attorney Fees) = totalAmount from cases table
          let caseValue = parseFloat(caseItem.totalAmount) || 0

          // المبالغ المستلمة (Paid Amounts) = sum of payment_amount from lawyer_fees ONLY
          const { data: lawyerFees, error: paymentsError } = await supabase
            .from('lawyer_fees')
            .select('payment_amount')
            .eq('case_id', caseItem.id)

          if (paymentsError) {
            console.error(`Error fetching lawyer fees for case ${caseItem.id} (${caseItem.case_number}):`, paymentsError)
          }

          // Calculate total paid amounts from lawyer_fees only (matching CaseDetailsPage.js)
          const totalPaid = (lawyerFees || []).reduce(
            (sum, payment) => {
              const amount = parseFloat(payment.payment_amount) || 0
              return sum + amount
            },
            0
          )

          // If totalAmount is 0 but there are payments, use paidAmount as the case value
          // This handles cases where totalAmount wasn't set but payments were made
          if (caseValue === 0 && totalPaid > 0) {
            caseValue = totalPaid
          }

          // المتبقي من الاتعاب (Remaining Fees) = caseValue - totalPaid
          const outstandingAmount = caseValue - totalPaid

          // Debug log for cases with financial data
          if (caseValue > 0 || totalPaid > 0) {
            console.log(`Case ${caseItem.case_number}: value=${caseValue}, paid=${totalPaid}, outstanding=${outstandingAmount}, fees count=${lawyerFees?.length || 0}, originalTotalAmount=${caseItem.totalAmount}`)
          }

          return {
            id: caseItem.id,
            caseNumber: caseItem.case_number,
            clientName: caseItem.client_name,
            caseValue: caseValue, // أتعاب الدعوى (uses paidAmount if totalAmount = 0)
            paidAmount: totalPaid, // المبالغ المستلمة
            outstandingAmount: outstandingAmount, // المتبقي من الاتعاب
            currency: caseItem.currency || 'IQD',
          }
        })
      )

      // Include ALL cases in the financial data collection
      // (Even those with no totalAmount or payments yet, to ensure counts match)
      const filteredCases = casesWithFinancials
        .sort((a, b) => {
          // Sort by total financial activity (value + paid) descending
          const totalA = a.caseValue + a.paidAmount
          const totalB = b.caseValue + b.paidAmount
          return totalB - totalA
        })

      console.log(`Financial data for ${filteredCases.length} cases with financial activity`)
      console.log('Sample financial data:', filteredCases.slice(0, 3).map(c => ({
        caseNumber: c.caseNumber,
        caseValue: c.caseValue,
        paidAmount: c.paidAmount,
        outstandingAmount: c.outstandingAmount
      })))
      setCasesFinancialData(filteredCases)
    } catch (error) {
      console.error('Error fetching cases financial data:', error)
      setCasesFinancialData([])
    }
  }

  const fetchTasks = async (uid) => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)

      // Format dates as YYYY-MM-DD for comparison with task_deadline
      const todayStr = today.toISOString().split('T')[0]
      const nextWeekStr = nextWeek.toISOString().split('T')[0]

      const { isAdmin, firmUserIds } = await getFirmContext(uid);

      let taskOrQuery = isAdmin
        ? `admin_id.in.(${firmUserIds.join(',')}),lawyer_id.in.(${firmUserIds.join(',')})`
        : `lawyer_id.eq.${uid},admin_id.eq.${uid}`;

      // 2. Fetch Tasks SCOPED BY USER
      const { data, error } = await supabase
        .from('tasks')
        .select('id, task_title, task_details, task_deadline, task_status, task_case, lawyer_id, admin_id, case_id, task_priority')
        .or(taskOrQuery)
        .order('task_deadline', { ascending: true })

      if (error) {
        console.error('[Dashboard] Error fetching tasks:', error)
        throw error
      }

      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
      setTasks([])
    }
  }

  const fetchReminders = async (uid) => {
    try {
      let firmCtx;
      try {
        firmCtx = await getFirmContext(uid);
      } catch (ctxErr) {
        console.error('[Dashboard] getFirmContext failed in fetchReminders:', ctxErr);
        firmCtx = { isAdmin: false, firmUserIds: [uid].filter(Boolean), firmAdminId: uid };
      }
      const { isAdmin, firmUserIds, firmAdminId } = firmCtx;

      let reminderOrQuery = isAdmin
        ? `admin_id.in.(${firmUserIds.join(',')}),user_id.in.(${firmUserIds.join(',')})`
        : `user_id.eq.${uid}`;

      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .or(reminderOrQuery)
        .or('status.is.null,status.neq.ended')
        .order('reminder_date', { ascending: true })

      if (error) {
        console.error('[Dashboard] Error fetching reminders:', error)
      }

      setReminders(data || [])
    } catch (error) {
      console.error('[Dashboard] Error in fetchReminders:', error)
      setReminders([])
    }
  }

  const fetchRecentActivity = async (uid) => {
    try {
      const { isAdmin, firmUserIds, firmAdminId } = await getFirmContext(uid);

      const activities = []
      const allowUserIdsStr = isAdmin ? firmUserIds.join(',') : uid;

      // Fetch recent actions SCOPED BY USER
      const { data: actions } = await supabase
        .from('actions')
        .select('id, actiondate, actiontype, actiondetails, case_number, created_at')
        .or(`user_id.in.(${isAdmin ? firmUserIds.join(',') : uid})`)
        .order('actiondate', { ascending: false })
        .limit(3)

      if (actions) {
        actions.forEach(action => {
          activities.push({
            id: action.id,
            type: 'action',
            title: action.actiontype || 'إجراء',
            details: action.actiondetails || '',
            caseNumber: action.case_number,
            date: action.actiondate || action.created_at,
          })
        })
      }

      // Fetch recent case updates SCOPED BY USER
      const { data: updates } = await supabase
        .from('case_update')
        .select('id, update_date, update_details, case_number, created_at')
        .or(`user_id.in.(${isAdmin ? firmUserIds.join(',') : uid})`)
        .order('update_date', { ascending: false })
        .limit(3)

      if (updates) {
        updates.forEach(update => {
          activities.push({
            id: update.id,
            type: 'update',
            title: 'تحديث حالة',
            details: update.update_details || '',
            caseNumber: update.case_number,
            date: update.update_date || update.created_at,
          })
        })
      }

      // Fetch recent payments SCOPED BY USER
      let paymentOrQuery = isAdmin
        ? `lawyer_id.in.(${firmUserIds.join(',')}),admin_id.in.(${firmUserIds.join(',')})`
        : `lawyer_id.eq.${uid},admin_id.eq.${uid}`;

      const { data: payments } = await supabase
        .from('lawyer_fees')
        .select('id, payment_date, payment_amount, case_number, created_at')
        .or(paymentOrQuery)
        .order('payment_date', { ascending: false })
        .limit(2)

      if (payments) {
        payments.forEach(payment => {
          activities.push({
            id: payment.id,
            type: 'payment',
            title: 'دفعة مالية',
            details: `مبلغ: ${payment.payment_amount || 0}`,
            caseNumber: payment.case_number,
            date: payment.payment_date || payment.created_at,
          })
        })
      }

      // Sort by date and limit to 5 most recent
      activities.sort((a, b) => new Date(b.date) - new Date(a.date))
      setRecentActivity(activities.slice(0, 5))
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    }
  }

  // Fetch client portal interactions
  const fetchClientPortalInteractions = async (uid) => {
    try {
      const { isAdmin, firmUserIds, firmAdminId } = await getFirmContext(uid);
      const adminIds = isAdmin ? firmUserIds : [uid];

      const interactions = [];

      // 1. Fetch recent client document uploads
      const { data: docUploads } = await supabase
        .from('client_shared_documents')
        .select('*, clients_data(client_name)')
        .eq('uploaded_by_client', true)
        .in('admin_id', adminIds)
        .order('created_at', { ascending: false })
        .limit(5);

      if (docUploads) {
        docUploads.forEach(doc => {
          interactions.push({
            id: doc.id,
            type: 'document_upload',
            title: 'رفع مستند',
            clientName: doc.clients_data?.client_name || 'موكل',
            details: doc.document_name,
            date: doc.created_at,
            caseId: doc.case_id
          });
        });
      }

      // 2. Fetch recent client messages
      const { data: clientMessages } = await supabase
        .from('client_messages')
        .select('*, clients_data(client_name)')
        .eq('sender_type', 'client')
        .in('admin_id', adminIds)
        .order('created_at', { ascending: false })
        .limit(5);

      if (clientMessages) {
        clientMessages.forEach(msg => {
          interactions.push({
            id: msg.id,
            type: 'message',
            title: 'رسالة جديدة',
            clientName: msg.clients_data?.client_name || 'موكل',
            details: msg.message_text?.substring(0, 50) + '...',
            date: msg.created_at,
            clientDataId: msg.client_data_id
          });
        });
      }

      // 3. Fetch recent client logins
      const { data: logins } = await supabase
        .from('client_accounts')
        .select('*, clients_data(client_name)')
        .in('admin_id', adminIds)
        .not('last_login', 'is', null)
        .order('last_login', { ascending: false })
        .limit(5);

      if (logins) {
        logins.forEach(login => {
          interactions.push({
            id: login.id,
            type: 'login',
            title: 'تسجيل دخول',
            clientName: login.clients_data?.client_name || 'موكل',
            details: 'دخول إلى البوابة',
            date: login.last_login
          });
        });
      }

      // Sort by date and limit to 5 most recent
      interactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      setClientPortalInteractions(interactions.slice(0, 5));
    } catch (error) {
      console.error('Error fetching client portal interactions:', error);
    }
  }

  // Fetch expense summary
  const fetchExpenseSummary = async (uid) => {
    try {
      const { isAdmin, firmUserIds, firmAdminId } = await getFirmContext(uid);
      const adminIds = isAdmin ? firmUserIds : [uid];

      // Get current month start and end
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // 1. Fetch expenses for current month with currency
      const { data: monthlyExpenses, error: expenseError } = await supabase
        .from('office_expenses')
        .select('amount, expenses_category, date, currency')
        .in('admin_id', adminIds)
        .gte('date', firstDay.toISOString())
        .lte('date', lastDay.toISOString());

      console.log('Expense Summary Debug:', {
        adminIds,
        firstDay: firstDay.toISOString(),
        lastDay: lastDay.toISOString(),
        monthlyExpenses,
        expenseError
      });

      if (monthlyExpenses) {
        // Group by currency
        const currencyTotals = {};
        monthlyExpenses.forEach(exp => {
          const currency = exp.currency || 'IQD';
          currencyTotals[currency] = (currencyTotals[currency] || 0) + (parseFloat(exp.amount) || 0);
        });

        // 2. Group by category
        const categoryMap = {};
        monthlyExpenses.forEach(exp => {
          const category = exp.expenses_category || 'غير مصنف';
          categoryMap[category] = (categoryMap[category] || 0) + (parseFloat(exp.amount) || 0);
        });

        const topCategories = Object.entries(categoryMap)
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);

        setExpenseSummary({
          totalThisMonth: monthlyExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0),
          currencyTotals,
          topCategories
        });
      }
    } catch (error) {
      console.error('Error fetching expense summary:', error);
    }
  }

  // Get case type distribution
  const getCaseTypeDistribution = () => {
    const distribution = {}
    casesData.forEach(caseItem => {
      const type = caseItem.caseType || caseItem.caseType2 || 'غير محدد'
      distribution[type] = (distribution[type] || 0) + 1
    })
    return distribution
  }

  // Get week dates - starting from Sunday to match Arabic weekDays array
  const getWeekDates = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const day = today.getDay() // 0 = Sunday, 6 = Saturday
    const diff = today.getDate() - day // Get Sunday of current week
    const start = new Date(today)
    start.setDate(diff)

    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const weekDates = getWeekDates()
  const weekDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) {
      setSearchResults({ cases: [], clients: [], sessions: [], tasks: [] })
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    setShowSearchResults(true)

    try {
      const currentUser = supabase.auth.user()
      if (!currentUser) return

      // Parallel search across different tables
      const [casesRes, clientsRes, sessionsRes, tasksRes] = await Promise.all([
        supabase.from('cases').select('id, case_number, client_name, caseType').or(`case_number.ilike.%${query}%,client_name.ilike.%${query}%,caseType.ilike.%${query}%`).limit(5),
        supabase.from('clients_data').select('id, client_name, legal_form').or(`client_name.ilike.%${query}%,legal_form.ilike.%${query}%`).limit(5),
        supabase.from('sessions').select('id, sessionname, case_number, sessiondate').or(`sessionname.ilike.%${query}%,case_number.ilike.%${query}%,sessiondetails.ilike.%${query}%`).limit(5),
        supabase.from('tasks').select('id, task_title, task_case, task_status').or(`task_title.ilike.%${query}%,task_details.ilike.%${query}%,task_case.ilike.%${query}%`).limit(5)
      ])

      setSearchResults({
        cases: casesRes.data || [],
        clients: clientsRes.data || [],
        sessions: sessionsRes.data || [],
        tasks: tasksRes.data || []
      })
    } catch (error) {
      console.error('Global search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery)
      } else {
        setShowSearchResults(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.quick-actions-search-wrapper')) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const navigateWeek = (direction) => {
    const newDate = new Date(weekViewStart)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    setWeekViewStart(newDate)

    // Check if the new week is outside the current session fetch range.
    // fetchSessionsData covers calendarViewStart ± ~3 weeks (rangeStart = weekStart-7, rangeEnd = rangeStart+45).
    // If the new week date drifts beyond that window, update calendarViewStart to trigger a re-fetch.
    const ref = new Date(calendarViewStart)
    ref.setHours(0, 0, 0, 0)
    const refDay = ref.getDay()
    const refDiff = ref.getDate() - refDay
    const fetchStart = new Date(ref)
    fetchStart.setDate(refDiff - 7)
    const fetchEnd = new Date(fetchStart)
    fetchEnd.setDate(fetchStart.getDate() + 45)

    const target = new Date(newDate)
    target.setHours(0, 0, 0, 0)
    if (target < fetchStart || target > fetchEnd) {
      setCalendarViewStart(new Date(newDate))
    }
  }

  const getCurrentWeekDays = () => {
    const start = new Date(weekViewStart)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    const weekStart = new Date(start.setDate(diff))
    weekStart.setHours(0, 0, 0, 0)
    
    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      weekDates.push(date)
    }
    
    return weekDates
  }

  const getCurrentWeekRange = () => {
    const weekDates = getCurrentWeekDays()
    const weekStart = new Date(weekDates[0])
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekDates[6])
    weekEnd.setHours(23, 59, 59, 999)
    return { weekStart, weekEnd }
  }

  const isDateWithinCurrentWeek = (dateValue) => {
    if (!dateValue) return false
    const { weekStart, weekEnd } = getCurrentWeekRange()
    const normalizedDate = new Date(dateValue)
    normalizedDate.setHours(0, 0, 0, 0)
    return normalizedDate >= weekStart && normalizedDate <= weekEnd
  }

  const navigateCalendar = (direction) => {
    const newDate = new Date(calendarViewStart)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    setCalendarViewStart(newDate)
  }

  const navigateCalendarMonth = (direction) => {
    const newDate = new Date(calendarViewStart)
    newDate.setHours(0, 0, 0, 0)
    newDate.setDate(1)
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    setCalendarViewStart(newDate)
  }

  // Navigate to current week
  const navigateToCurrentWeek = () => {
    setCalendarViewStart(new Date())
  }

  // Fetch lawyers for task assignment
  useEffect(() => {
    const fetchLawyers = async () => {
      try {
        const currentUser = supabase.auth.user()
        if (!currentUser) return

        const { data: userMetadata, error: metadataError } = await supabase
          .from('user_metadata')
          .select('admin_user_id, new_lawyer_id, role')
          .or(`admin_user_id.eq.${currentUser.id},new_lawyer_id.eq.${currentUser.id}`)
          .limit(1)
          .maybeSingle()

        if (metadataError) {
          console.error('Error fetching user metadata:', metadataError)
          return
        }

        if (userMetadata) {
          if (userMetadata.admin_user_id === currentUser.id) {
            const { data: lawyersData, error: lawyersError } = await supabase
              .from('user_metadata')
              .select('username')
              .eq('admin_user_id', currentUser.id)
              .not('new_lawyer_id', 'is', null)

            if (!lawyersError && lawyersData) {
              setLawyerNames(lawyersData.map(l => l.username).filter(Boolean))
            }
          } else if (userMetadata.new_lawyer_id === currentUser.id) {
            const adminId = userMetadata.admin_user_id
            if (adminId) {
              const { data: lawyersData, error: lawyersError } = await supabase
                .from('user_metadata')
                .select('username')
                .or(`admin_user_id.eq.${adminId},new_lawyer_id.eq.${adminId}`)
                .not('username', 'is', null)

              if (!lawyersError && lawyersData) {
                const uniqueNames = [...new Set(lawyersData.map(l => l.username).filter(Boolean))]
                setLawyerNames(uniqueNames)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching lawyers:', error)
      }
    }

    fetchLawyers()
  }, [])

  const handleOpenAddTaskModal = () => {
    setIsAddTaskModalOpen(true)
  }

  const handleCloseAddTaskModal = () => {
    setIsAddTaskModalOpen(false)
    setTaskFormData({
      task_title: '',
      task_type: 'مهمة عامة',
      task_deadline: '',
      task_priority: 'متوسطة',
      task_details: ''
    })
    setSelectedLawyer('')
    setSelectedCaseId('')
  }

  const handleTaskInputChange = (e) => {
    const { name, value } = e.target
    setTaskFormData(prevData => ({
      ...prevData,
      [name]: value
    }))
  }

  const handleTaskSubmit = async (e) => {
    e.preventDefault()

    if (!selectedLawyer) {
      alert('يرجى اختيار مستخدم من قائمة "تذكير مستخدم آخر"')
      return
    }

    setIsSubmittingTask(true)

    try {
      const currentUser = supabase.auth.user()
      if (!currentUser) {
        alert('لم يتم العثور على مستخدم مسجل دخول')
        setIsSubmittingTask(false)
        return
      }

      const { data: currentUserMeta, error: currentUserMetaError } = await supabase
        .from('user_metadata')
        .select('admin_user_id, new_lawyer_id, role')
        .or(`admin_user_id.eq.${currentUser.id},new_lawyer_id.eq.${currentUser.id}`)
        .limit(1)
        .maybeSingle()

      if (currentUserMetaError) {
        console.error('Error fetching current user metadata:', currentUserMetaError)
        alert('حدث خطأ أثناء جلب بيانات المستخدم')
        setIsSubmittingTask(false)
        return
      }

      let userData, userError

      if (currentUserMeta?.admin_user_id === currentUser.id) {
        const result = await supabase
          .from('user_metadata')
          .select('admin_user_id, email, role, username, new_lawyer_id')
          .eq('admin_user_id', currentUser.id)
          .eq('username', selectedLawyer)
          .maybeSingle()
        userData = result.data
        userError = result.error
      } else if (currentUserMeta?.new_lawyer_id === currentUser.id) {
        const adminId = currentUserMeta.admin_user_id
        const result = await supabase
          .from('user_metadata')
          .select('admin_user_id, email, role, username, new_lawyer_id')
          .eq('username', selectedLawyer)
          .or(`admin_user_id.eq.${adminId},new_lawyer_id.eq.${adminId}`)
          .maybeSingle()
        userData = result.data
        userError = result.error
      } else {
        const result = await supabase
          .from('user_metadata')
          .select('admin_user_id, email, role, username, new_lawyer_id')
          .eq('username', selectedLawyer)
          .maybeSingle()
        userData = result.data
        userError = result.error
      }

      if (userError) {
        console.error('Error fetching user data:', userError.message)
        alert(`حدث خطأ أثناء جلب بيانات المستخدم المختار: ${userError.message}`)
        setIsSubmittingTask(false)
        return
      }

      if (!userData) {
        alert('لم يتم العثور على بيانات المستخدم المختار')
        setIsSubmittingTask(false)
        return
      }

      const currentDate = new Date().toISOString().split('T')[0]

      const { data: currentUserData } = await supabase
        .from('user_metadata')
        .select('username, admin_user_id, new_lawyer_id')
        .or(`admin_user_id.eq."${currentUser.id}",new_lawyer_id.eq."${currentUser.id}",user_id.eq."${currentUser.id}"`)
        .limit(1)
        .maybeSingle()

      const creatorUsername = currentUserData?.username || currentUser.email || 'مستخدم'

      // Get case data if case is selected
      let caseNumber = null
      let caseId = null
      if (selectedCaseId) {
        const selectedCase = casesData.find(c => c.id === selectedCaseId)
        if (selectedCase) {
          caseNumber = selectedCase.case_number
          caseId = selectedCase.id
        }
      }

      const taskDataToInsert = {
        case_id: caseId || null,
        task_case: caseNumber || null,
        task_title: taskFormData.task_title,
        task_type: taskFormData.task_type,
        task_deadline: taskFormData.task_deadline || null,
        task_priority: taskFormData.task_priority,
        task_details: taskFormData.task_details,
        task_date: currentDate,
        admin_id: userData.admin_user_id,
        lawyer_id: userData.new_lawyer_id,
        lawyer_related: userData.username,
        created_by_username: creatorUsername,
        task_status: 'pending'
      }

      const { data: insertedData, error: insertError } = await supabase
        .from('tasks')
        .insert([taskDataToInsert])
        .select()

      if (insertError) {
        throw new Error(`فشل في حفظ المهمة: ${insertError.message}`)
      }

      // Create notifications
      if (insertedData && insertedData.length > 0) {
        try {
          const notificationUserIds = []

          if (taskDataToInsert.admin_id) {
            const { data: adminMetadata } = await supabase
              .from('user_metadata')
              .select('user_id')
              .eq('admin_user_id', taskDataToInsert.admin_id)
              .is('new_lawyer_id', null)
              .limit(1)
              .maybeSingle()

            if (adminMetadata && adminMetadata.user_id) {
              notificationUserIds.push(adminMetadata.user_id)
            } else {
              notificationUserIds.push(taskDataToInsert.admin_id)
            }
          }

          if (taskDataToInsert.lawyer_id) {
            const { data: lawyerMetadata } = await supabase
              .from('user_metadata')
              .select('user_id')
              .eq('new_lawyer_id', taskDataToInsert.lawyer_id)
              .limit(1)
              .maybeSingle()

            if (lawyerMetadata && lawyerMetadata.user_id) {
              notificationUserIds.push(lawyerMetadata.user_id)
            } else {
              notificationUserIds.push(taskDataToInsert.lawyer_id)
            }
          }

          const uniqueUserIds = [...new Set(notificationUserIds)]

          if (uniqueUserIds.length > 0) {
            const { createNotificationsForUsers } = await import('../lib/notifications')
            const taskDeadline = taskDataToInsert.task_deadline
              ? new Date(taskDataToInsert.task_deadline).toLocaleDateString('ar-EG')
              : 'غير محدد'

            await createNotificationsForUsers(uniqueUserIds, {
              title: 'لديك تكليف جديد',
              message: `تم إنشاء مهمة جديدة: ${taskDataToInsert.task_title}${taskDeadline !== 'غير محدد' ? ` - الموعد النهائي: ${taskDeadline}` : ''}`,
              notification_type: 'task',
              icon_type: 'bell',
              related_entity_type: 'task',
              related_entity_id: insertedData[0].id?.toString(),
              case_number: taskDataToInsert.task_case || null,
            })
          }
        } catch (notifError) {
          console.error('Error creating notifications:', notifError)
        }
      }

      // Show success toast message
      try { if (typeof window !== 'undefined' && window.Capacitor) Haptics.impact({ style: ImpactStyle.Heavy }); } catch(e){}
      setToastMessage('تم إضافة المهمة بنجاح')
      setToastType('success')
      handleCloseAddTaskModal()

      // Refresh tasks
      if (userId) {
        fetchTasks(userId)
      }

      // Hide toast after 3 seconds
      setTimeout(() => {
        setToastMessage(null)
      }, 3000)
    } catch (error) {
      console.error('Error submitting task:', error)
      setToastMessage(`حدث خطأ: ${error.message}`)
      setToastType('error')
      setTimeout(() => {
        setToastMessage(null)
      }, 4000)
    } finally {
      setIsSubmittingTask(false)
    }
  }

  // Get calendar view dates (extended view for agenda)
  // Skip the first week since it's shown in the weekly sessions summary
  const getCalendarViewDates = () => {
    const start = new Date(calendarViewStart)
    start.setHours(0, 0, 0, 0)
    const day = start.getDay()
    const diff = start.getDate() - day
    const weekStart = new Date(start)
    weekStart.setDate(diff)

    const dates = []
    // Start from day 7 (second week) to avoid duplicating the first week shown in summary
    // Show 2-3 weeks (14-21 days) starting from the second week
    for (let i = 7; i < 28; i++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  // Get sessions count for a specific date
  const getSessionsForDate = (date) => {
    if (!date) return 0
    const count = sessionsData.filter(s => {
      if (!s.sessiondate) return false
      try {
        const sessionDate = new Date(s.sessiondate)
        sessionDate.setHours(0, 0, 0, 0)
        const dateToCompare = new Date(date)
        dateToCompare.setHours(0, 0, 0, 0)
        let match = sessionDate.getTime() === dateToCompare.getTime()

        if (!match && s.next_session_date) {
          const nextSessionDate = new Date(s.next_session_date)
          nextSessionDate.setHours(0, 0, 0, 0)
          match = nextSessionDate.getTime() === dateToCompare.getTime()
        }

        // Debug for today (omitted)

        return match
      } catch (e) {
        console.error('Error comparing dates:', e, s)
        return false
      }
    }).length

    // Debug for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateToCompare = new Date(date)
    dateToCompare.setHours(0, 0, 0, 0)
    if (dateToCompare.getTime() === today.getTime()) {
      // Intentionally left blank to avoid console spam
    }

    return count
  }

  // Calculate total sessions for the week
  const totalWeekSessions = weekDates.reduce((total, date) => {
    return total + getSessionsForDate(date)
  }, 0)

  // Get all sessions for the week with details
  const getWeekSessionsWithDetails = () => {
    const weekSessions = []
    weekDates.forEach(date => {
      const sessionsForDay = sessionsData.filter(s => {
        if (!s.sessiondate) return false
        const sessionDate = new Date(s.sessiondate)
        sessionDate.setHours(0, 0, 0, 0)
        const dateToCompare = new Date(date)
        dateToCompare.setHours(0, 0, 0, 0)
        return sessionDate.getTime() === dateToCompare.getTime()
      })
      weekSessions.push(...sessionsForDay)
    })
    return weekSessions.sort((a, b) => new Date(a.sessiondate) - new Date(b.sessiondate))
  }

  const toDayStart = (dateValue, forceDateOnly = false) => {
    if (!dateValue) return null

    if (typeof dateValue === 'string' && (forceDateOnly || /^\d{4}-\d{2}-\d{2}$/.test(dateValue))) {
      const [year, month, day] = dateValue.split('-').map(Number)
      if (!year || !month || !day) return null
      return new Date(year, month - 1, day)
    }

    const parsed = new Date(dateValue)
    if (Number.isNaN(parsed.getTime())) return null
    parsed.setHours(0, 0, 0, 0)
    return parsed
  }

  // Get all items (sessions, tasks, reminders) for a specific date
  const getDayItems = (date) => {
    const dateToCompare = toDayStart(date)
    if (!dateToCompare) return []

    // Using a Map to avoid duplicates by ID if necessary, but array is fine for simple aggregation
    const items = []

    // Sessions (including next_session_date)
    sessionsData.forEach(s => {
      // Regular session date
      if (s.sessiondate) {
        const d = toDayStart(s.sessiondate)
        if (d && d.getTime() === dateToCompare.getTime()) {
          items.push({ type: 'session', data: s })
        }
      }
      // Next session date (if different)
      if (s.next_session_date) {
        const d = toDayStart(s.next_session_date)
        // Check if we haven't already added this session for this date (though rare to be same day)
        if (d && d.getTime() === dateToCompare.getTime()) {
          // Ensure not adding duplicate if sessiondate == next_session_date
          const sessionDateOnly = toDayStart(s.sessiondate)
          const isSameDay = sessionDateOnly && sessionDateOnly.getTime() === d.getTime()
          if (!isSameDay) {
            items.push({ type: 'session-next', data: s })
          }
        }
      }
    })

    // Tasks
    tasks.forEach(t => {
      if (t.task_deadline) {
        const d = toDayStart(t.task_deadline, true)
        if (d && d.getTime() === dateToCompare.getTime() && t.task_status !== 'completed' && t.task_status !== 'مكتملة') {
          items.push({ type: 'task', data: t })
        }
      }
    })

    // Reminders
    reminders.forEach(r => {
      if (r.reminder_date) {
        const d = toDayStart(r.reminder_date)
        if (d && d.getTime() === dateToCompare.getTime()) {
          items.push({ type: 'reminder', data: r })
        }
      }
    })

    return items
  }

  const getItemDateValue = (item) => {
    if (!item || !item.data) return null
    if (item.type === 'task') return item.data.task_deadline ? `${item.data.task_deadline}T00:00:00` : null
    if (item.type === 'reminder') return item.data.reminder_date || null
    if (item.type === 'session-next') return item.data.next_session_date || null
    return item.data.sessiondate || null
  }

  const getCurrentWeekItemsForDate = (date) => {
    const dedupe = new Set()
    return getDayItems(date)
      .filter(item => {
        const itemDate = toDayStart(getItemDateValue(item))
        const itemDateKey = itemDate ? itemDate.toDateString() : 'no-date'
        const id = item.data?.id || item.data?.case_number || item.data?.task_title || item.data?.reminder_title || 'unknown'
        const key = `${item.type}-${id}-${itemDateKey}`
        if (dedupe.has(key)) return false
        dedupe.add(key)
        return true
      })
  }

  // Navigate to sessions page
  const handleSessionsLinkClick = () => {
    router.push('/cases/sessions')
  }

  // Get case type distribution from actual caseType field
  const getFileDistributionData = () => {
    const distribution = {}

    // Initialize all case types with 0
    if (allCaseTypes.length > 0) {
      allCaseTypes.forEach(type => {
        distribution[type] = 0
      })
    }

    // Count cases by type
    casesData.forEach(caseItem => {
      const type = caseItem.caseType || caseItem.caseType2
      if (type) {
        distribution[type] = (distribution[type] || 0) + 1
      }
    })

    // If no case types from database, use the old method
    if (allCaseTypes.length === 0) {
      casesData.forEach(caseItem => {
        const type = caseItem.caseType || caseItem.caseType2 || 'غير محدد'
        distribution[type] = (distribution[type] || 0) + 1
      })
    }

    return distribution
  }

  const fileDistributionData = getFileDistributionData()
  const totalCasesForChart = Object.values(fileDistributionData).reduce((sum, count) => sum + count, 0)

  // Generate colors for case types - matching design colors
  const getCaseTypeColors = () => {
    // Use a consistent color palette matching the design
    const colorPalette = [
      '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#06B6D4',
      '#EC4899', '#F97316', '#84CC16', '#6366F1', '#14B8A6',
      '#EF4444', '#A78BFA', '#34D399', '#FBBF24', '#FB7185'
    ]
    const colorMap = {}
    allCaseTypes.forEach((type, index) => {
      colorMap[type] = colorPalette[index % colorPalette.length]
    })
    return colorMap
  }

  const caseTypeColors = getCaseTypeColors()

  // Get case status distribution for donut chart - count from cases table caseState field
  // matching case_state values from case_options table
  const getCaseStatusDistribution = () => {
    // Initialize status counts for all case_state values from case_options table
    const statusCounts = {}

    // Initialize all case_state values with 0
    allCaseStates.forEach(state => {
      statusCounts[state] = 0
    })

    // Count cases by their exact caseState field values from cases table
    // Match against case_state values from case_options table
    casesData.forEach(caseItem => {
      // Check both caseState and case_state fields, trim whitespace
      const status = (caseItem.caseState || caseItem.case_state || '').trim()

      // Only count if the status exactly matches one of the case_state values from case_options
      if (status && allCaseStates.includes(status)) {
        statusCounts[status] = (statusCounts[status] || 0) + 1
      }
    })

    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0)

    return {
      statusCounts: statusCounts,
      total: total
    }
  }

  const caseStatusData = getCaseStatusDistribution()

  // Generate unique colors for case states - each state gets a unique, consistent color
  const getCaseStateColors = () => {
    // Extended color palette with highly distinct, unique colors
    // Each color is visually distinct from others
    const uniqueColorPalette = [
      '#10B981', // Green
      '#3B82F6', // Blue
      '#F59E0B', // Orange
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#EF4444', // Red
      '#EC4899', // Pink
      '#F97316', // Orange-red
      '#84CC16', // Lime green
      '#6366F1', // Indigo
      '#14B8A6', // Teal
      '#FBBF24', // Amber/Yellow
      '#FB7185', // Rose
      '#A78BFA', // Light violet
      '#34D399', // Emerald
      '#60A5FA', // Light blue
      '#FCD34D', // Yellow
      '#22D3EE', // Sky blue
      '#A855F7', // Deep purple
      '#0EA5E9', // Bright sky blue
      '#F43F5E', // Rose red
      '#7C3AED', // Deep violet
      '#059669', // Dark green
      '#DC2626', // Dark red
      '#16A34A', // Medium green
      '#CA8A04', // Dark yellow/amber
      '#BE185D', // Deep pink
      '#0891B2', // Dark cyan
      '#9333EA', // Medium purple
      '#1D4ED8', // Dark blue
      '#B91C1C', // Crimson
      '#7C2D12', // Brown
      '#1E40AF', // Navy blue
      '#065F46', // Forest green
      '#701A75', // Dark purple
      '#C2410C', // Dark orange
      '#7E22CE', // Purple
      '#0C4A6E', // Dark blue
      '#164E63', // Dark cyan
      '#831843'  // Dark pink
    ]

    const colorMap = {}
    // Sort states alphabetically to ensure consistent color assignment
    // This ensures the same state always gets the same color
    const sortedStates = [...allCaseStates].sort((a, b) => a.localeCompare(b, 'ar'))

    // Assign unique color to each case state based on sorted alphabetical order
    // This ensures consistent colors even if states are added/removed
    sortedStates.forEach((state, index) => {
      colorMap[state] = uniqueColorPalette[index % uniqueColorPalette.length]
    })

    return colorMap
  }

  const caseStateColors = getCaseStateColors()

  // Function to generate donut chart gradient - each state gets its unique color
  // Fixed to prevent color mixing at edges using explicit hard stops
  const getDonutChartGradient = (statusCounts, colors) => {
    const total = Object.values(statusCounts).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0)
    if (total === 0) return 'conic-gradient(#E2E8F0 0deg 360deg)'

    let currentAngle = 0
    const segments = []

    // Get entries with count > 0 and ensure each has a unique color
    const entries = Object.entries(statusCounts)
      .filter(([key, value]) => value > 0)
      .sort(([, a], [, b]) => b - a) // Sort by count descending for visual clarity

    // Build segments with explicit hard stops to prevent color mixing
    entries.forEach(([key, value], index) => {
      const percentage = (value / total) * 100
      let angle = (percentage / 100) * 360

      // Get the unique color for this state from the colorMap
      let color = colors[key]
      if (!color) {
        // Fallback: generate a deterministic color based on state name hash
        const hash = key.split('').reduce((acc, char) => {
          return char.charCodeAt(0) + ((acc << 5) - acc)
        }, 0)
        const hue = Math.abs(hash) % 360
        color = `hsl(${hue}, 70%, 50%)`
      }

      // Calculate precise angles
      const startAngle = currentAngle
      let endAngle = currentAngle + angle

      // For the last segment, ensure we close exactly at 360deg
      if (index === entries.length - 1) {
        endAngle = 360
      }

      // Create hard stop by repeating the color at the boundary angle
      // This ensures no color mixing/blending at edges
      if (index === 0) {
        // First segment: start from 0deg with hard stop
        segments.push(`${color} 0deg ${endAngle}deg`)
      } else {
        // Subsequent segments: create hard stop by repeating boundary angle
        // Previous color ends at startAngle, new color starts at startAngle (hard stop)
        // Use same angle twice to create hard stop
        segments.push(`${color} ${startAngle}deg ${endAngle}deg`)
      }

      currentAngle = endAngle
    })

    // Return conic-gradient with hard stops to prevent color mixing
    return `conic-gradient(${segments.join(', ')})`
  }

  // Prepare financial chart data
  const getFinancialChartData = () => {
    if (!casesFinancialData || casesFinancialData.length === 0) return null

    // Limit to top 8 cases for better visualization
    const topCases = casesFinancialData.slice(0, 8)

    const labels = topCases.map(c => {
      const caseNum = c.caseNumber || 'غير محدد'
      // Truncate long case numbers
      return caseNum.length > 15 ? caseNum.substring(0, 12) + '...' : caseNum
    })
    const caseValues = topCases.map(c => c.caseValue)
    const paidAmounts = topCases.map(c => c.paidAmount)
    const outstandingAmounts = topCases.map(c => c.outstandingAmount)

    return {
      labels,
      casesData: topCases, // Store full case data for tooltips
      datasets: [
        {
          label: 'أتعاب الدعوى',
          data: caseValues,
          backgroundColor: '#8B5CF6',
          borderColor: '#7C3AED',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'المبالغ المستلمة',
          data: paidAmounts,
          backgroundColor: '#10B981',
          borderColor: '#059669',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'المتبقي',
          data: outstandingAmounts,
          backgroundColor: '#F59E0B',
          borderColor: '#D97706',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    }
  }

  const financialChartData = getFinancialChartData()

  const financialChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 5,
        bottom: 0,
        left: 5,
        right: 5,
      },
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'center',
        labels: {
          font: {
            family: "'Cairo', 'Almarai', sans-serif",
            size: 12,
            weight: '600',
          },
          padding: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 10,
          boxHeight: 10,
          color: '#1E293B',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        padding: 12,
        titleFont: {
          family: "'Cairo', 'Almarai', sans-serif",
          size: 13,
          weight: '700',
        },
        bodyFont: {
          family: "'Cairo', 'Almarai', sans-serif",
          size: 12,
          weight: '500',
        },
        borderColor: '#E2E8F0',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: function (context) {
            const caseData = financialChartData.casesData?.[context[0].dataIndex]
            const clientName = caseData?.clientName || 'غير محدد'
            return [
              `رقم الدعوى: ${context[0].label}`,
              `اسم الموكل: ${clientName}`
            ]
          },
          label: function (context) {
            const value = context.parsed.y
            const total = financialChartData.datasets[0].data[context.dataIndex]
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0
            return `${context.dataset.label}: ${value.toLocaleString('ar-EG')} د.ع (${percentage}%)`
          },
          labelColor: function (context) {
            return {
              borderColor: context.dataset.borderColor,
              backgroundColor: context.dataset.backgroundColor,
              borderWidth: 2,
              borderRadius: 4,
            }
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            family: "'Cairo', 'Almarai', sans-serif",
            size: 11,
            weight: '500',
          },
          color: '#475569',
          maxRotation: 0,
          minRotation: 0,
          padding: 8,
        },
        grid: {
          display: false,
        },
        border: {
          display: true,
          color: '#E2E8F0',
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            family: "'Cairo', 'Almarai', sans-serif",
            size: 11,
            weight: '500',
          },
          color: '#64748B',
          padding: 10,
          callback: function (value) {
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + 'M'
            } else if (value >= 1000) {
              return (value / 1000).toFixed(0) + 'K'
            }
            return value.toLocaleString('ar-EG')
          }
        },
        grid: {
          color: '#F1F5F9',
          lineWidth: 1,
          drawBorder: false,
        },
        border: {
          display: true,
          color: '#E2E8F0',
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  }

  if (loading || !minLoadFinished) {
    return (
      <div className="loading-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '800px', margin: '0 auto', direction: 'rtl' }}>
        <div className="skeleton" style={{ height: '60px', width: '100%', borderRadius: '12px' }}></div>
        <div className="skeleton" style={{ height: '100px', width: '100%', borderRadius: '16px' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="skeleton" style={{ height: '80px', borderRadius: '16px' }}></div>
          <div className="skeleton" style={{ height: '80px', borderRadius: '16px' }}></div>
          <div className="skeleton" style={{ height: '80px', borderRadius: '16px' }}></div>
          <div className="skeleton" style={{ height: '80px', borderRadius: '16px' }}></div>
        </div>
        <div className="skeleton" style={{ height: '200px', width: '100%', borderRadius: '16px' }}></div>
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} pullingContent={<div style={{textAlign: 'center', padding: '10px'}}><div className="spinner" style={{width: '24px', height: '24px', margin: '0 auto', border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div></div>}>
    <div className="dashboard">
      <Head>
        <title>لوحة التحكم - نظام إدارة القضايا</title>
      </Head>


      {/* Mobile-Only Dashboard Layout */}
      {isClient && isMobileDashboard && (
      <div className="mobile-dashboard-layout" style={{ marginTop: '0px', marginBottom: '0px', paddingTop: '0px', paddingBottom: '0px', display: 'flex', flexDirection: 'column' }}>

        {/* Current Week Calendar - Mobile Only */}
        <div className="mobile-current-week-calendar" style={{ marginTop: '0px', marginBottom: '8px', order: 1, width: '100%', alignSelf: 'stretch' }}>
          <div className="section-header-mobile" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '8px', padding: '10px 12px', background: '#DBEAFE', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
            <div className="section-title-mobile" style={{ color: '#1E3A8A', fontWeight: '700', fontSize: '15px', fontFamily: 'Cairo, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="mobile-title-icon-badge"><FaCalendarAlt color="#3B82F6" size={16} /></span>
              <span className="mobile-gradient-title">تقويم الأسبوع</span>
            </div>
            <div className="mobile-agenda-nav" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
              <button onClick={() => navigateWeek('prev')} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6', flexShrink: 0, cursor: 'pointer', transition: 'all 0.2s' }}>
                <FaChevronRight size={14} />
              </button>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#1E3A8A', fontFamily: 'Cairo, sans-serif', padding: '0 4px' }}>
                {new Date(weekViewStart).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => navigateWeek('next')} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6', flexShrink: 0, cursor: 'pointer', transition: 'all 0.2s' }}>
                <FaChevronLeft size={14} />
              </button>
            </div>
          </div>
          <div className="mobile-calendar-list" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', borderRadius: '0', overflow: 'visible', background: '#FFFFFF', marginTop: '0px', padding: '4px 2px', border: 'none', width: '100%' }}>
            {(() => {
              const weekDates = getCurrentWeekDays();
              const today = new Date();
              today.setHours(0, 0, 0, 0);

              return weekDates.map((date, idx) => {
                const isToday = date.getTime() === today.getTime();
                const dateStr = date.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
                const allItems = getCurrentWeekItemsForDate(date);

                return (
                  <div
                    key={idx}
                    className={`calendar-grid-cell-modern ${isToday ? 'today-cell' : ''} ${allItems.length > 0 ? 'has-sessions-cell' : ''}`}
                    style={{
                      minHeight: '108px',
                      borderRadius: '8px',
                      background: '#FFFFFF',
                      opacity: 1,
                      boxShadow: 'none',
                      border: isToday ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                      width: '100%'
                    }}
                  >
                    <div className="calendar-cell-header-modern">
                      <div className="calendar-cell-weekday" style={{ fontSize: '13px' }}>{dateStr}</div>
                      {isToday && <div className="calendar-cell-date-value" style={{ color: '#2563EB', fontSize: '11px' }}>اليوم</div>}
                    </div>
                    
                    <div className="calendar-cell-items-modern">
                      {allItems.length > 0 ? (
                        allItems.map((item, itemIdx) => {
                          if (item.type === 'session') {
                            const session = item.data;
                            return (
                              <div
                                key={`session-${itemIdx}`}
                                className="calendar-item-modern calendar-item-session-modern"
                                onClick={() => {
                                  if (session.case_number) {
                                    router.push(`/cases/CaseDetailsPage?caseNumber=${session.case_number}&tab=sessions&highlightType=session&highlightId=${session.id}`);
                                  }
                                }}
                              >
                                <div className="pill-dot"></div>
                                <span className="calendar-item-text-modern">
                                  {session.sessionname || session.sessiondetails || `جلسة ${session.case_number}`}
                                </span>
                              </div>
                            );
                          } else if (item.type === 'session-next') {
                            const session = item.data;
                            return (
                              <div
                                key={`session-next-${itemIdx}`}
                                className="calendar-item-modern calendar-item-session-modern"
                                style={{ background: '#ECFDF5', color: '#10B981' }}
                                onClick={() => {
                                  if (session.case_number) {
                                    router.push(`/cases/CaseDetailsPage?caseNumber=${session.case_number}&tab=sessions&highlightType=session&highlightId=${session.id}`);
                                  }
                                }}
                              >
                                <div className="pill-dot"></div>
                                <span className="calendar-item-text-modern">
                                  {session.next_session_req || `موعد قادم ${session.case_number}`}
                                </span>
                              </div>
                            );
                          } else if (item.type === 'task') {
                            const task = item.data;
                            return (
                              <div
                                key={`task-${itemIdx}`}
                                className="calendar-item-modern calendar-item-task-modern"
                                onClick={() => {
                                  if (task.task_case) {
                                    router.push(`/cases/CaseDetailsPage?caseNumber=${task.task_case}&tab=jobTasks&highlightType=task&highlightId=${task.id}`);
                                  } else {
                                    router.push('/tasks');
                                  }
                                }}
                              >
                                <div className="pill-dot"></div>
                                <span className="calendar-item-text-modern">
                                  {task.task_title || `مهمة ${task.task_case}`}
                                </span>
                              </div>
                            );
                          } else if (item.type === 'reminder') {
                            const reminder = item.data;
                            return (
                              <div
                                key={`reminder-${itemIdx}`}
                                className="calendar-item-modern calendar-item-reminder-modern"
                                onClick={() => {
                                  if (reminder.case_number) {
                                    router.push(`/cases/CaseDetailsPage?caseNumber=${reminder.case_number}`);
                                  }
                                }}
                              >
                                <div className="pill-dot"></div>
                                <span className="calendar-item-text-modern">
                                  {reminder.reminder_title || `تذكير ${reminder.case_number}`}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })
                      ) : (
                        <div className="calendar-cell-empty-modern" style={{ padding: '4px', fontSize: '11px' }}>لا توجد مواعيد</div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <div className="mobile-bento-financial-grid" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '10px 2px',
          marginBottom: '-8px',
          marginTop: '8px',
          order: 5
        }}>
          <div className="mobile-title-bar mobile-title-bar-blue" style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="mobile-title-icon-badge"><FaChartLine color="#3B82F6" /></span>
            <span className="mobile-gradient-title">الملخص المالي</span>
          </div>
          <div className="mobile-bento-card" style={{ background: '#F0F7FF', borderRadius: '14px', padding: '10px 6px', border: 'none', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="card-icon-mobile" style={{ background: '#DBEAFE', borderRadius: '10px', padding: '6px', width: '32px', height: '32px', flexShrink: 0 }}><FaFolder color="#2563EB" size={14} /></div>
              <div className="card-label-mobile" style={{ fontSize: '13px', color: '#0F172A', fontWeight: '700' }}>إجمالي الدعاوى</div>
            </div>
            <div className="card-value-mobile" style={{ fontSize: '22px', fontWeight: '800', color: '#1E293B' }}>{casesFinancialData.length}</div>
          </div>
          <div className="mobile-bento-card" style={{ background: '#ECFDF5', borderRadius: '14px', padding: '10px 6px', border: 'none', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="card-icon-mobile" style={{ background: '#D1FAE5', borderRadius: '10px', padding: '6px', width: '32px', height: '32px', flexShrink: 0 }}><FaDollarSign color="#059669" size={14} /></div>
              <div className="card-label-mobile" style={{ fontSize: '13px', color: '#0F172A', fontWeight: '700' }}>إجمالي الأتعاب</div>
            </div>
            <div className="card-value-mobile" style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', display: 'flex', flexDirection: 'column', gap: '0px', alignItems: 'flex-end' }}>
              <span>{casesFinancialData.filter(c => c.currency !== 'USD').reduce((s, c) => s + (c.caseValue || 0), 0).toLocaleString()} د.ع</span>
              {casesFinancialData.some(c => c.currency === 'USD') && <span style={{ fontSize: '14px', color: '#475569', fontWeight: '600' }}>${casesFinancialData.filter(c => c.currency === 'USD').reduce((s, c) => s + (c.caseValue || 0), 0).toLocaleString()}</span>}
            </div>
          </div>
          <div className="mobile-bento-card" style={{ background: '#F5F3FF', borderRadius: '14px', padding: '10px 6px', border: 'none', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="card-icon-mobile" style={{ background: '#EDE9FE', borderRadius: '10px', padding: '6px', width: '32px', height: '32px', flexShrink: 0 }}><FaCheckCircle color="#7C3AED" size={14} /></div>
              <div className="card-label-mobile" style={{ fontSize: '13px', color: '#0F172A', fontWeight: '700' }}>المحصلة</div>
            </div>
            <div className="card-value-mobile" style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', display: 'flex', flexDirection: 'column', gap: '0px', alignItems: 'flex-end' }}>
              <span>{casesFinancialData.filter(c => c.currency !== 'USD').reduce((s, c) => s + (c.paidAmount || 0), 0).toLocaleString()} د.ع</span>
              {casesFinancialData.some(c => c.currency === 'USD') && <span style={{ fontSize: '14px', color: '#475569', fontWeight: '600' }}>${casesFinancialData.filter(c => c.currency === 'USD').reduce((s, c) => s + (c.paidAmount || 0), 0).toLocaleString()}</span>}
            </div>
          </div>
          <div className="mobile-bento-card" style={{ background: '#FFFBEB', borderRadius: '14px', padding: '10px 6px', border: 'none', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="card-icon-mobile" style={{ background: '#FEF3C7', borderRadius: '10px', padding: '6px', width: '32px', height: '32px', flexShrink: 0 }}><FaClock color="#D97706" size={14} /></div>
              <div className="card-label-mobile" style={{ fontSize: '13px', color: '#0F172A', fontWeight: '700' }}>المعلقة</div>
            </div>
            <div className="card-value-mobile" style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B', display: 'flex', flexDirection: 'column', gap: '0px', alignItems: 'flex-end' }}>
              <span>{casesFinancialData.filter(c => c.currency !== 'USD').reduce((s, c) => s + (c.outstandingAmount || 0), 0).toLocaleString()} د.ع</span>
              {casesFinancialData.some(c => c.currency === 'USD') && <span style={{ fontSize: '13px', color: '#64748B' }}>${casesFinancialData.filter(c => c.currency === 'USD').reduce((s, c) => s + (c.outstandingAmount || 0), 0).toLocaleString()}</span>}
            </div>
          </div>
        </div>

        {/* Dynamic Work Schedule (Interactive) - Mobile Redesign */}
        <div className={`mobile-work-schedule-section ${isCalendarLoading ? 'calendar-loading' : ''}`} style={{ marginTop: '8px', order: 4 }}>
          <div className="section-header-mobile" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '8px', gap: '0px', padding: '10px 12px', margin: '0px', background: '#F3E8FF', borderRadius: '12px', border: '1px solid #DDD6FE' }}>
            <div className="section-title-mobile" style={{ color: '#6B21A8', fontWeight: '700', fontSize: '15px', fontFamily: 'Cairo, sans-serif', display: 'flex', alignItems: 'center', gap: '6px', margin: '0px', padding: '0px' }}><span className="mobile-title-icon-badge"><FaCalendarAlt color="#A855F7" size={16} /></span> <span className="mobile-gradient-title">التقويم الشهري</span></div>
            <div className="mobile-agenda-nav" style={{  padding: '0px', margin: '0px', borderRadius: '12px', border: 'none', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0px' }}>
              <button className="mobile-agenda-nav-btn" onClick={() => navigateCalendarMonth('prev')} style={{ width: '24px', height: '24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, padding: '0px' }}><FaChevronRight size={12} /></button>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#6B21A8', margin: '0px', padding: '0px', whiteSpace: 'nowrap' }}>
                {new Date(calendarViewStart).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
              </span>
              <button className="mobile-agenda-nav-btn" onClick={() => navigateCalendarMonth('next')} style={{ width: '24px', height: '24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, margin: '0px', padding: '0px' }}><FaChevronLeft size={12} /></button>
            </div>
          </div>

          <div
            className="mobile-calendar-list"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0px',
              borderRadius: '16px',
              overflow: 'hidden',
              background: '#FFFFFF',
              marginTop: '8px'
            }}
          >
            {(() => {
              const monthStart = new Date(calendarViewStart);
              monthStart.setHours(0, 0, 0, 0);
              monthStart.setDate(1);
              const day = monthStart.getDay();
              const gridStart = new Date(monthStart);
              gridStart.setDate(monthStart.getDate() - day);

              const mobileDates = [];
              for (let i = 0; i < 42; i++) {
                const date = new Date(gridStart);
                date.setDate(gridStart.getDate() + i);
                mobileDates.push(date);
              }

              const today = new Date();
              today.setHours(0, 0, 0, 0);

              return mobileDates.map((date, idx) => {
                const isToday = date.getTime() === today.getTime();
                const dateStr = date.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
                const isOutsideMonth = date.getMonth() !== monthStart.getMonth();
                
                // Get items for this date using existing logic
                // We need to replicate the logic from the web view or use getDayItems but adapted
                // The web view logic is more comprehensive (checks sessionsData, tasks, reminders)
                
                // Get sessions
                const sessionsForDay = [];
                sessionsData.forEach(s => {
                  if (s.sessiondate) {
                    const sessionDate = new Date(s.sessiondate);
                    sessionDate.setHours(0, 0, 0, 0);
                    if (sessionDate.getTime() === date.getTime()) {
                      sessionsForDay.push({ type: 'session', data: s });
                    }
                  }
                  if (s.next_session_date) {
                    const nextSessionDate = new Date(s.next_session_date);
                    nextSessionDate.setHours(0, 0, 0, 0);
                    if (nextSessionDate.getTime() === date.getTime()) {
                      sessionsForDay.push({ type: 'session-next', data: s });
                    }
                  }
                });

                // Get tasks
                const tasksForDay = tasks.filter(task => {
                  if (!task.task_deadline) return false;
                  const taskDate = new Date(task.task_deadline + 'T00:00:00');
                  taskDate.setHours(0, 0, 0, 0);
                  return taskDate.getTime() === date.getTime() &&
                    task.task_status !== 'completed' &&
                    task.task_status !== 'مكتملة';
                });

                // Get reminders
                const remindersForDay = reminders.filter(r => {
                  if (!r.reminder_date) return false;
                  const rDate = new Date(r.reminder_date);
                  rDate.setHours(0, 0, 0, 0);
                  return rDate.getTime() === date.getTime();
                });

                // Ended sessions
                const endedSessionsWithoutUpdate = sessionsData.filter(s => {
                  if (!s.sessiondate || s.status !== 'ended') return false;
                  const sessionDate = new Date(s.sessiondate);
                  sessionDate.setHours(0, 0, 0, 0);
                  return sessionDate.getTime() <= date.getTime(); // This logic from web seems to show ended sessions on *every* subsequent day? 
                  // Wait, looking at web code: return sessionDate.getTime() <= dateToCompare.getTime()
                  // This seems to show it repeatedly? No, usually 'ended-session' logic might be different.
                  // Let's stick to showing it if it matches the date or is specifically 'overdue' logic?
                  // The web code uses <= dateToCompare. That implies it shows up in future dates too?
                  // Let's re-read web code.
                  // Web code: 2404: return sessionDate.getTime() <= dateToCompare.getTime()
                  // This is inside `endedSessionsWithoutUpdate`. 
                  // If status is 'ended', it probably shouldn't be shown unless it needs update.
                  // Let's check if we really want this behavior in mobile. It might clutter.
                  // I'll skip "ended sessions without update" for now to keep it clean, or just use exact match.
                  return false; 
                });

                const allItems = [
                  ...sessionsForDay,
                  ...tasksForDay.map(t => ({ type: 'task', data: t })),
                  ...remindersForDay.map(r => ({ type: 'reminder', data: r }))
                ];

                // If no items and not today, maybe skip rendering to save space? 
                // Or render empty cell? Web renders empty cells.
                // Mobile list is better if we only show days with events OR just show all days.
                // Let's show all days to be a real calendar.

                return (
                  <div 
                    key={idx} 
                    className={`calendar-grid-cell-modern ${isToday ? 'today-cell' : ''} ${allItems.length > 0 ? 'has-sessions-cell' : ''}`}
                    style={{
                      minHeight: '96px',
                      borderRadius: 0,
                      opacity: isOutsideMonth ? 0.45 : 1,
                      background: '#FFFFFF'
                    }}
                  >
                    <div className="calendar-cell-header-modern">
                      <div className="calendar-cell-weekday" style={{ fontSize: '13px' }}>{dateStr}</div>
                      {isToday && <div className="calendar-cell-date-value" style={{ color: '#2563EB', fontSize: '11px' }}>اليوم</div>}
                    </div>
                    
                    <div className="calendar-cell-items-modern">
                      {allItems.length > 0 ? (
                        allItems.map((item, itemIdx) => {
                          if (item.type === 'session') {
                            const session = item.data;
                            return (
                              <div
                                key={`session-${itemIdx}`}
                                className="calendar-item-modern calendar-item-session-modern"
                                onClick={() => {
                                  if (session.case_number) {
                                    router.push(`/cases/CaseDetailsPage?caseNumber=${session.case_number}&tab=sessions&highlightType=session&highlightId=${session.id}`);
                                  }
                                }}
                              >
                                <div className="pill-dot"></div>
                                <span className="calendar-item-text-modern">
                                  {session.sessionname || session.sessiondetails || `جلسة ${session.case_number}`}
                                </span>
                              </div>
                            );
                          } else if (item.type === 'session-next') {
                            const session = item.data;
                            return (
                              <div
                                key={`session-next-${itemIdx}`}
                                className="calendar-item-modern calendar-item-session-modern"
                                style={{ background: '#ECFDF5', color: '#10B981' }}
                                onClick={() => {
                                  if (session.case_number) {
                                    router.push(`/cases/CaseDetailsPage?caseNumber=${session.case_number}&tab=sessions&highlightType=session&highlightId=${session.id}`);
                                  }
                                }}
                              >
                                <div className="pill-dot"></div>
                                <span className="calendar-item-text-modern">
                                  {session.next_session_req || `موعد قادم ${session.case_number}`}
                                </span>
                              </div>
                            );
                          } else if (item.type === 'task') {
                            const task = item.data;
                            return (
                              <div
                                key={`task-${itemIdx}`}
                                className="calendar-item-modern calendar-item-task-modern"
                                onClick={() => {
                                  if (task.task_case) {
                                    router.push(`/cases/CaseDetailsPage?caseNumber=${task.task_case}&tab=jobTasks&highlightType=task&highlightId=${task.id}`);
                                  } else {
                                    router.push('/tasks');
                                  }
                                }}
                              >
                                <div className="pill-dot"></div>
                                <span className="calendar-item-text-modern">
                                  {task.task_title || 'مهمة'}
                                </span>
                              </div>
                            );
                          } else if (item.type === 'reminder') {
                            const reminder = item.data;
                            return (
                              <div
                                key={`reminder-${itemIdx}`}
                                className="calendar-item-modern calendar-item-task-modern"
                                style={{ background: '#f5f3ff', color: '#8b5cf6' }}
                                onClick={() => {
                                  if (reminder.case_number) {
                                    // Find case ID if possible
                                    const linkedCase = casesData.find(c => c.case_number === reminder.case_number);
                                    const targetCaseId = linkedCase?.id;

                                    if (targetCaseId) {
                                      router.push(`/cases/CaseDetailsPage?caseId=${targetCaseId}&tab=reminders&reminderId=${reminder.id}`)
                                    } else {
                                      router.push(`/cases/CaseDetailsPage?caseNumber=${reminder.case_number}&tab=reminders&reminderId=${reminder.id}`)
                                    }
                                  } else if (reminder.case_id) {
                                    router.push(`/cases/CaseDetailsPage?caseId=${reminder.case_id}&tab=reminders&reminderId=${reminder.id}`)
                                  }
                                }}
                              >
                                <div className="pill-dot"></div>
                                <span className="calendar-item-text-modern">
                                  {reminder.title || 'تذكير'}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })
                      ) : (
                        <div className="calendar-cell-empty-modern" style={{ padding: '4px', fontSize: '11px' }}>لا توجد مواعيد</div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Dynamic Area Stats (Status vs Distribution) */}
        {/* Dynamic Area Stats (Status vs Distribution) - Separated Containers */}
        <div className="mobile-stats-section" style={{ order: 4 }}>
          {/* Case Status Card */}
          <div className="mobile-bento-card" style={{ marginBottom: '12px', padding: '16px 0' }}>
            <div className="section-header-mobile" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: '#DBEAFE', borderRadius: '12px', padding: '8px 12px', border: '1px solid #BFDBFE' }}>
              <div className="section-title-mobile" style={{ color: '#000000', fontWeight: '800' }}><span className="mobile-title-icon-badge"><FaFolder color="#3B82F6" /></span> <span className="mobile-gradient-title">مراحل الدعاوى</span></div>
            </div>
            <div className="mobile-chart-container" style={{ border: 'none', padding: '0', boxShadow: 'none', marginTop: '14px' }}>
              <div className="case-status-content-redesigned" style={{ padding: 0 }}>
                <div className="donut-chart-wrapper-redesigned" style={{ width: '160px', height: '160px', margin: '0 auto 16px', position: 'relative' }}>
                  <div
                    className="donut-chart-redesigned"
                    style={{
                      background: getDonutChartGradient(caseStatusData.statusCounts || {}, caseStateColors),
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      position: 'relative'
                    }}
                  >
                    <div className="donut-center-redesigned" style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '85%',
                      height: '85%',
                      background: 'white',
                      borderRadius: '50%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                      <div className="donut-number-redesigned" style={{ fontSize: '24px', fontWeight: '800', color: '#1E293B', lineHeight: '1' }}>{caseStatusData.total || 0}</div>
                      <div className="donut-label-redesigned" style={{ fontSize: '10px', color: '#64748B', marginTop: '4px' }}>إجمالي</div>
                    </div>
                  </div>
                </div>
                <div className="case-status-list-redesigned" style={{ maxHeight: 'none', gap: '8px' }}>
                  {allCaseStates
                    .sort((a, b) => (caseStatusData.statusCounts?.[b] || 0) - (caseStatusData.statusCounts?.[a] || 0))
                    .map(state => (
                      <div key={state} className="case-status-item-redesigned" style={{ padding: '8px 4px' }}>
                        <div className="item-dot-redesigned" style={{ backgroundColor: caseStateColors[state] || '#ccc' }}></div>
                        <span className="item-label-redesigned" style={{ fontSize: '11px' }}>{state}</span>
                        <span className="item-value-redesigned" style={{ fontSize: '12px' }}>{caseStatusData.statusCounts?.[state] || 0}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Expense Summary Card */}
          <div className="mobile-bento-card" style={{ marginBottom: '12px', padding: '16px 0' }}>
            <div className="section-header-mobile" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: '#EDE9FE', borderRadius: '12px', padding: '8px 12px', border: '1px solid #DDD6FE' }}>
              <div className="section-title-mobile" style={{ color: '#000000', fontWeight: '800' }}><span className="mobile-title-icon-badge"><FaDollarSign color="#8B5CF6" /></span> <span className="mobile-gradient-title">ملخص المصروفات</span></div>
            </div>
            <div className="mobile-expense-summary" style={{ padding: '0px' }}>
              {expenseSummary.totalThisMonth > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                  {/* Total This Month by Currency */}
                  {expenseSummary.currencyTotals && Object.keys(expenseSummary.currencyTotals).length > 0 ? (
                    Object.entries(expenseSummary.currencyTotals).map(([currency, amount]) => (
                      <div key={currency} style={{ background: '#F3E8FF', padding: '8px 12px', borderRadius: '8px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#000000' }}>مصاريف هذا الشهر ({currency === 'IQD' ? 'د.ع' : '$'})</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#6B21A8' }}>{amount.toLocaleString(currency === 'IQD' ? 'ar-EG' : 'en-US')} {currency === 'IQD' ? 'د.ع' : '$'}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ background: '#F3E8FF', padding: '8px 12px', borderRadius: '8px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#000000' }}>مصاريف هذا الشهر</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#6B21A8' }}>{expenseSummary.totalThisMonth.toLocaleString('ar-EG')} د.ع</div>
                    </div>
                  )}

                  {/* Top Categories */}
                  {expenseSummary.topCategories && expenseSummary.topCategories.length > 0 && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#1E293B', marginBottom: '6px' }}>أهم الفئات</div>
                      {expenseSummary.topCategories.slice(0, 1).map((cat, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#F8FAFC', borderRadius: '6px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#475569' }}>{cat.category}</span>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: '#1E293B' }}>{cat.amount.toLocaleString('ar-EG')} د.ع</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: '#94A3B8' }}>لا توجد مصروفات هذا الشهر</div>
              )}
            </div>
          </div>

          {/* File Distribution Card */}
          <div className="mobile-bento-card" style={{ padding: '16px 0' }}>
            <div className="section-header-mobile" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: '#F1F5F9', borderRadius: '12px', padding: '8px 12px', border: '1px solid #E2E8F0' }}>
              <div className="section-title-mobile" style={{ color: '#000000', fontWeight: '800' }}><span className="mobile-title-icon-badge"><FaChartLine color="#8B5CF6" /></span> <span className="mobile-gradient-title">أنواع الدعاوى</span></div>
            </div>
            <div className="mobile-chart-container" style={{ border: 'none', padding: '0', boxShadow: 'none', marginTop: '14px' }}>
              <div className="case-distribution-content" style={{ padding: 0 }}>
                <div className="donut-chart-container-medium" style={{ width: '160px', height: '160px', margin: '0 auto 16px', position: 'relative' }}>
                  <div
                    className="donut-chart-medium"
                    style={{
                      background: getDonutChartGradient(fileDistributionData, caseTypeColors),
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      position: 'relative'
                    }}
                  >
                    <div className="donut-chart-center-medium" style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '85%',
                      height: '85%',
                      background: 'white',
                      borderRadius: '50%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                      <div className="donut-center-value-medium" style={{ fontSize: '24px', fontWeight: '800', color: '#1E293B', lineHeight: '1' }}>{totalCasesForChart}</div>
                      <div className="donut-center-label-medium" style={{ fontSize: '10px', color: '#64748B', marginTop: '4px' }}>إجمالي</div>
                    </div>
                  </div>
                </div>
                <div className="case-distribution-legend" style={{ gap: '8px' }}>
                  {Object.entries(fileDistributionData)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([type, count]) => (
                      <div key={type} className="distribution-legend-item" style={{ padding: '8px 4px' }}>
                        <div className="legend-dot" style={{ backgroundColor: caseTypeColors[type] || '#ccc' }}></div>
                        <span className="legend-label" style={{ fontSize: '11px' }}>{type}</span>
                        <span className="legend-count" style={{ fontSize: '12px' }}>{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Tasks Preview */}
        <div className="mobile-bento-card" style={{ padding: '16px 0', marginBottom: '12px', order: 2, width: '100%', alignSelf: 'stretch', boxSizing: 'border-box' }}>
          <div className="section-header-mobile mobile-title-bar mobile-title-bar-purple" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: '#DDD6FE', borderRadius: '12px', padding: '8px 8px', border: '1px solid #C4B5FD' }}>
            <div className="section-title-mobile" style={{ fontWeight: '800' }}><span className="mobile-title-icon-badge"><FaTasks color="#EF4444" /></span> <span className="mobile-gradient-title">المهام اليومية</span></div>
            <button onClick={() => setIsAddTaskModalOpen(true)} style={{ background: '#3B82F6', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={16} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 12px', marginTop: '14px' }}>
            {tasks.length > 0 ? tasks.slice(0, 3).map(task => {
              const isCompleted = task.task_status === 'completed' || task.task_status === 'مكتملة';
              const taskDate = task.task_deadline ? new Date(task.task_deadline + 'T00:00:00') : null;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isOverdue = !isCompleted && taskDate && taskDate.getTime() < today.getTime();
              
              let priorityColor = task.task_priority === 'عالية' ? '#EF4444' : '#3B82F6';
              if (isOverdue) priorityColor = '#DC2626'; // Strong red for overdue
              
              const titleColor = isOverdue ? '#DC2626' : '#000000';
              const dateColor = isOverdue ? '#EF4444' : '#64748B';

              return (
              <div key={task.id} className="mobile-item-card" style={{ background: isOverdue ? '#FEF2F2' : '#F8FAFC', border: isOverdue ? '1px solid #FECACA' : 'none', padding: '10px 12px', borderRadius: '12px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '4px', minHeight: '32px', alignSelf: 'stretch', background: priorityColor, borderRadius: '2px', flexShrink: 0 }}></div>
                <div style={{ padding: '4px' }}>
                  {isCompleted ? (
                    <FaCheckCircle color="#10B981" size={18} />
                  ) : (
                    <div style={{
                      width: 18, 
                      height: 18, 
                      borderRadius: '50%', 
                      border: `2px solid ${isOverdue ? '#DC2626' : (task.task_status === 'in-progress' || task.task_status === 'قيد التنفيذ' || task.task_status === 'قيد العمل' ? '#3B82F6' : '#CBD5E1')}`, 
                      background: isOverdue ? '#FEE2E2' : (task.task_status === 'in-progress' || task.task_status === 'قيد التنفيذ' || task.task_status === 'قيد العمل' ? '#EFF6FF' : 'transparent')
                    }}></div>
                  )}
                </div>
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: titleColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.task_title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px', background: task.task_status === 'completed' || task.task_status === 'مكتملة' ? '#D1FAE5' : task.task_status === 'in-progress' || task.task_status === 'قيد التنفيذ' ? '#FEF3C7' : task.task_status === 'قيد العمل' ? '#E0F2FE' : task.task_status === 'متأخرة' ? '#FEE2E2' : '#E0E7FF', color: task.task_status === 'completed' || task.task_status === 'مكتملة' ? '#059669' : task.task_status === 'in-progress' || task.task_status === 'قيد التنفيذ' ? '#D97706' : task.task_status === 'قيد العمل' ? '#0284C7' : task.task_status === 'متأخرة' ? '#DC2626' : '#4338CA', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                          {task.task_status === 'completed' || task.task_status === 'مكتملة' ? 'مكتملة' : task.task_status === 'in-progress' || task.task_status === 'قيد التنفيذ' ? 'قيد التنفيذ' : task.task_status === 'قيد العمل' ? 'قيد العمل' : task.task_status === 'متأخرة' ? 'متأخرة' : 'قيد الانتظار'}
                        </span>
                        {isOverdue && (
                          <span style={{ fontSize: '9px', background: '#DC2626', color: 'white', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>متأخرة</span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '10px', color: dateColor, fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {task.task_deadline ? new Date(task.task_deadline).toLocaleDateString('ar-EG') : 'بدون موعد'}
                    </div>
                  </div>
                </div>
              </div>
              );
            }) : <div style={{ textAlign: 'center', fontSize: '13px', color: '#94A3B8', padding: '10px' }}>لا توجد مهام</div>}
          </div>
        </div>

        {/* جدول اليوم Preview */}
        <div className="mobile-bento-card" style={{ padding: '16px 0', marginBottom: '12px', order: 3, width: '100%', alignSelf: 'stretch', boxSizing: 'border-box' }}>
          <div className="section-header-mobile mobile-title-bar mobile-title-bar-amber" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: '#FEF3C7', borderRadius: '12px', padding: '8px 8px', border: '1px solid #FDE68A' }}>
            <div className="section-title-mobile" style={{ fontWeight: '800' }}>
              <span className="mobile-title-icon-badge" style={{ background: '#FEF3C7' }}>
                <FaClock color="#D97706" size={12} />
              </span>
              <span className="mobile-gradient-title">جدول اليوم</span>
            </div>
          </div>
          <div className="appointments-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', padding: '0 12px' }}>
            {(() => {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                
                // 1. Today's Sessions
                const todaySessions = []

                sessionsData.forEach(s => {
                  let aptDate = null
                  if (s.sessiondate) {
                    const sd = new Date(s.sessiondate)
                    sd.setHours(0, 0, 0, 0)
                    if (sd.getTime() === today.getTime()) aptDate = sd
                  }
                  if (!aptDate && s.next_session_date) {
                    const nd = new Date(s.next_session_date)
                    nd.setHours(0, 0, 0, 0)
                    if (nd.getTime() === today.getTime()) aptDate = nd
                  }

                  if (aptDate) {
                    todaySessions.push({ ...s, _matchedDate: aptDate })
                  }
                })

                todaySessions.sort((a, b) => a._matchedDate - b._matchedDate)
                const imminentSessions = todaySessions

                // 2. Today's Tasks
                const todayTasks = tasks
                  .filter(t => {
                    if (!t.task_deadline) return false
                    const taskDate = new Date(t.task_deadline + 'T00:00:00')
                    taskDate.setHours(0, 0, 0, 0)

                    const isNotCompleted = t.task_status !== 'completed' && t.task_status !== 'مكتملة'
                    return isNotCompleted && taskDate.getTime() === today.getTime()
                  })
                  .sort((a, b) => new Date(a.task_deadline) - new Date(b.task_deadline))

                const appointments = [
                  ...imminentSessions.map(s => ({
                    type: 'session',
                    title: s.case_number ? `جلسة محكمة لدعوى رقم ${s.case_number}` : 'جلسة محكمة',
                    date: s._matchedDate,
                    urgency: 'high',
                    data: s
                  })),
                  ...todayTasks.map(t => ({
                    type: 'task',
                    title: t.task_title || `مهمة عالية الأولوية - ${t.task_case || ''}`,
                    date: new Date(t.task_deadline + 'T00:00:00'),
                    urgency: 'high',
                    data: t
                  }))
                ].sort((a, b) => a.date - b.date).slice(0, 6)

                if (appointments.length === 0) {
                  return (
                    <div className="appointments-empty-state" style={{ background: '#F8FAFC', border: 'none', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                      <FaCheckCircle className="appointments-empty-icon" style={{ color: '#10B981', fontSize: '24px', marginBottom: '8px', opacity: 0.5 }} />
                      <div className="appointments-empty-text" style={{ fontSize: '13px', color: '#94A3B8', fontWeight: '500' }}>لا توجد مواعيد اليوم</div>
                    </div>
                  )
                }

                return appointments.map((apt, idx) => {
                  const aptDate = apt.date
                  aptDate.setHours(0, 0, 0, 0)
                  const dateLabel = `اليوم - ${aptDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                  const iconColor = '#3B82F6'
                  const Icon = apt.type === 'session' ? FaGavel : FaCheckCircle
                  const urgencyBg = apt.type === 'session' ? '#FEE2E2' : '#EFF6FF';
                  const urgencyBorder = apt.type === 'session' ? '#EF4444' : '#3B82F6';

                  return (
                    <div
                      key={idx}
                      className="mobile-item-card appointment-mobile"
                      style={{
                        background: '#F8FAFC', 
                        border: 'none', 
                        borderRight: `4px solid ${urgencyBorder}`,
                        padding: '10px 12px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        if (apt.type === 'session' && apt.data.case_id) {
                          router.push(`/cases/CaseDetailsPage?caseId=${apt.data.case_id}&tab=sessions&highlightType=session&highlightId=${apt.data.id}`)
                        } else if (apt.type === 'session' && apt.data.case_number) {
                          router.push(`/cases/CaseDetailsPage?caseNumber=${apt.data.case_number}&tab=sessions&highlightType=session&highlightId=${apt.data.id}`)
                        } else if (apt.type === 'task' && apt.data.case_id) {
                          router.push(`/cases/CaseDetailsPage?caseId=${apt.data.case_id}&tab=jobTasks&highlightType=task&highlightId=${apt.data.id}`)
                        } else if (apt.type === 'task' && apt.data.task_case) {
                          router.push(`/cases/CaseDetailsPage?caseNumber=${apt.data.task_case}&tab=jobTasks&highlightType=task&highlightId=${apt.data.id}`)
                        }
                      }}
                    >
                      <div style={{ background: urgencyBg, borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={16} style={{ color: iconColor }} />
                      </div>
                      <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{apt.title}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0 }}>{dateLabel}</div>
                      </div>
                    </div>
                  )
                })
              })()}
          </div>
        </div>
      </div>
      )}

      {/* Main 3-Column Dashboard Layout (12-column grid: 3-6-3) */}
      {isClient && !isMobileDashboard && (
      <div className="dashboard-main-grid">
        {/* Left Sidebar - 3 columns */}
        < div className="dashboard-column dashboard-column-left" >
          {/* توزيع الدعاوي (Case Distribution) */}
          <div className="dashboard-card case-distribution-card" style={{ flex: 'none' }}>
            <div className="card-header-modern">
              <div className="card-header-icon-box" style={{ background: '#ede9fe' }}>
                <FaChartLine style={{ color: '#8b5cf6', fontSize: '14px' }} />
              </div>
              <h2 className="card-title-modern">أنواع الدعاوى</h2>
            </div>
            <div className="case-distribution-content">
              <div className="donut-chart-container-medium">
                <div
                  className="donut-chart-medium"
                  style={{
                    background: getDonutChartGradient(
                      fileDistributionData,
                      caseTypeColors
                    )
                  }}
                >
                  <div className="donut-chart-center-medium">
                    <div className="donut-center-value-medium">{totalCasesForChart}</div>
                    <div className="donut-center-label-medium">إجمالي الملفات</div>
                  </div>
                </div>
              </div>
              <div className="case-distribution-legend">
                {Object.entries(fileDistributionData)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([type, count]) => (
                    <div key={type} className="distribution-legend-item">
                      <div className="legend-dot" style={{ backgroundColor: caseTypeColors[type] || '#E2E8F0' }}></div>
                      <span className="legend-label">{type}</span>
                      <span className="legend-count">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* حالة الدعاوي (Case Status) */}
          < div className="dashboard-card case-status-card-modern" >
            <div className="card-header-modern">
              <div className="card-header-icon-box" style={{ background: '#d1fae5' }}>
                <FaGavel style={{ color: '#059669', fontSize: '14px' }} />
              </div>
              <h2 className="card-title-modern">مراحل الدعاوى</h2>
            </div>
            <div className="case-status-content-redesigned">
              <div className="donut-chart-wrapper-redesigned">
                <div
                  className="donut-chart-redesigned"
                  style={{
                    background: getDonutChartGradient(
                      caseStatusData.statusCounts || {},
                      caseStateColors
                    )
                  }}
                >
                  <div className="donut-center-redesigned">
                    <div className="donut-number-redesigned">{caseStatusData.total || 0}</div>
                    <div className="donut-label-redesigned">إجمالي الملفات</div>
                  </div>
                </div>
              </div>
              <div className="case-status-list-redesigned">
                {allCaseStates
                  .sort((a, b) => {
                    // Sort by count (descending), then alphabetically
                    const countA = caseStatusData.statusCounts?.[a] || 0
                    const countB = caseStatusData.statusCounts?.[b] || 0
                    if (countB !== countA) {
                      return countB - countA
                    }
                    return a.localeCompare(b, 'ar')
                  })
                  .map((state) => {
                    const count = caseStatusData.statusCounts?.[state] || 0
                    return (
                      <div key={state} className={`case-status-item-redesigned ${count === 0 ? 'item-zero' : ''}`}>
                        <div className="item-dot-redesigned" style={{ backgroundColor: caseStateColors[state] || '#E2E8F0' }}></div>
                        <span className="item-label-redesigned">{state}</span>
                        <span className="item-value-redesigned">{count}</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div >

          {/* Expense Summary Card */}
          <div className="dashboard-card expense-summary-card" style={{ flex: 'none', marginBottom: '20px' }}>
            <div className="card-header-modern" style={{ paddingBottom: '12px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
              <div className="card-header-icon-box" style={{ background: '#f3e8ff' }}>
                <FaDollarSign style={{ color: '#8B5CF6', fontSize: '14px' }} />
              </div>
              <h2 className="card-title-modern">ملخص المصروفات</h2>
            </div>
            <div className="expense-summary-modern">
              {expenseSummary.totalThisMonth > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Total This Month by Currency */}
                  {expenseSummary.currencyTotals && Object.keys(expenseSummary.currencyTotals).length > 0 ? (
                    Object.entries(expenseSummary.currencyTotals).map(([currency, amount]) => (
                      <div key={currency} style={{ background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)', padding: '10px 16px', borderRadius: '12px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', border: '2px solid #8B5CF6' }}>
                        <div style={{ fontSize: '12px', color: '#000000', fontWeight: '600' }}>مصاريف هذا الشهر ({currency === 'IQD' ? 'د.ع' : '$'})</div>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#6B21A8' }}>{amount.toLocaleString(currency === 'IQD' ? 'ar-EG' : 'en-US')} {currency === 'IQD' ? 'د.ع' : '$'}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)', padding: '10px 16px', borderRadius: '12px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', border: '2px solid #8B5CF6' }}>
                      <div style={{ fontSize: '12px', color: '#000000', fontWeight: '600' }}>مصاريف هذا الشهر</div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#6B21A8' }}>{expenseSummary.totalThisMonth.toLocaleString('ar-EG')} د.ع</div>
                    </div>
                  )}

                  {/* Top Categories */}
                  {expenseSummary.topCategories && expenseSummary.topCategories.length > 0 && (
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B', marginBottom: '12px' }}>أهم الفئات</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {expenseSummary.topCategories.slice(0, 1).map((cat, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ 
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][idx % 5]
                              }}></div>
                              <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>{cat.category}</span>
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>{cat.amount.toLocaleString('ar-EG')} د.ع</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94A3B8', fontSize: '13px' }}>
                  <FaDollarSign style={{ opacity: 0.2, fontSize: '28px', marginBottom: '10px' }} />
                  <div>لا توجد مصروفات هذا الشهر</div>
                </div>
              )}
            </div>
          </div>






        </div >

        {/* Center Panel - 6 columns */}
        < div className="dashboard-column dashboard-column-center" >
          {/* جدول الأعمال والمتابعة (Work and Follow-up Schedule) with Integrated Weekly Sessions */}
          < div className="dashboard-card work-schedule-card" >
            <div className="calendar-hero-header">
              <div className="calendar-hero-right">
                <div className="calendar-hero-icon">
                  <FaCalendarAlt />
                </div>
                <div className="calendar-hero-text">
                  <h2>التقويم الشهري</h2>
                  <span>
                    {(() => {
                      const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
                      const ws = weekDates[0]
                      const we = weekDates[weekDates.length - 1]
                      return `الأسبوع الحالي: ${ws.getDate()} - ${we.getDate()} ${monthNames[ws.getMonth()]}`
                    })()}
                  </span>
                </div>
              </div>
              <div className="calendar-hero-center">
                <div className="calendar-legend">
                  <span className="legend-item"><span className="legend-dot" style={{ background: '#3B82F6' }}></span>جلسة</span>
                  <span className="legend-item"><span className="legend-dot" style={{ background: '#10B981' }}></span>موعد قادم</span>
                  <span className="legend-item"><span className="legend-dot" style={{ background: '#F59E0B' }}></span>مهمة</span>
                  <span className="legend-item"><span className="legend-dot" style={{ background: '#8b5cf6' }}></span>تذكير</span>
                  <span className="legend-item"><span className="legend-dot" style={{ background: '#EF4444' }}></span>مهمة متأخرة</span>
                </div>
              </div>
              <div className="calendar-hero-left">
                <div className="agenda-nav-buttons">
                  <button className="agenda-nav-btn" onClick={() => navigateCalendar('prev')}>
                    <FaChevronRight />
                  </button>
                  <div className="agenda-date-range-modern">
                    {(() => {
                      const calendarDates = getCalendarViewDates()
                      const startDate = calendarDates[0]
                      const endDate = calendarDates[calendarDates.length - 1]
                      const formatDate = (d) => {
                        const day = String(d.getDate()).padStart(2, '0')
                        const month = String(d.getMonth() + 1).padStart(2, '0')
                        const year = d.getFullYear()
                        return `${day}-${month}-${year}`
                      }
                      return `${formatDate(startDate)} / ${formatDate(endDate)}`
                    })()}
                  </div>
                  <button className="agenda-nav-btn" onClick={() => navigateCalendar('next')}>
                    <FaChevronLeft />
                  </button>
                </div>
              </div>
            </div>

            <div className={`weekly-sessions-summary-integrated ${isCalendarLoading ? 'calendar-loading' : ''}`}>

              <div className="weekly-sessions-grid-integrated">
                {weekDates.map((date, idx) => {
                  const dayName = weekDays[idx]
                  const sessionCount = getSessionsForDate(date)
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const dateToCompare = new Date(date)
                  dateToCompare.setHours(0, 0, 0, 0)
                  const isToday = dateToCompare.getTime() === today.getTime()
                  const day = date.getDate()
                  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
                  const monthName = monthNames[date.getMonth()]
                  const dateStr = `${day} ${monthName}`
                  return (
                    <div
                      key={idx}
                      className={`weekly-day-card-integrated ${isToday ? 'today-integrated' : ''} ${sessionCount > 0 ? 'has-sessions' : ''}`}
                      style={{ cursor: sessionCount > 0 ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (sessionCount > 0) {
                          const dateToCompare = new Date(date)
                          dateToCompare.setHours(0, 0, 0, 0)

                          const daySessions = sessionsData.filter(s => {
                            let isMatch = false;
                            if (s.sessiondate) {
                              const sd = new Date(s.sessiondate);
                              sd.setHours(0, 0, 0, 0);
                              if (sd.getTime() === dateToCompare.getTime()) isMatch = true;
                            }
                            if (s.next_session_date) {
                              const nd = new Date(s.next_session_date);
                              nd.setHours(0, 0, 0, 0);
                              if (nd.getTime() === dateToCompare.getTime()) isMatch = true;
                            }
                            return isMatch;
                          });

                          if (daySessions.length > 0) {
                            const session = daySessions[0];
                            const linkedCase = casesData.find(c => c.case_number === session.case_number);
                            const targetCaseId = linkedCase?.id || session.case_id;

                            if (targetCaseId) {
                              router.push(`/cases/CaseDetailsPage?caseId=${targetCaseId}&tab=sessions&highlightType=session&highlightId=${session.id}`)
                            } else if (session.case_number) {
                              router.push(`/cases/CaseDetailsPage?caseNumber=${session.case_number}&tab=sessions&highlightType=session&highlightId=${session.id}`)
                            } else {
                              router.push('/cases/sessions');
                            }
                          }
                        }
                      }}
                    >
                      <div className="weekly-day-name-integrated">{dayName}</div>
                      <div className="weekly-day-date-integrated">{dateStr}</div>
                      <div className={`weekly-day-count-integrated ${sessionCount > 0 ? 'has-sessions-count' : ''}`}>
                        {sessionCount > 0 ? `${sessionCount} جلسة` : 'لا توجد جلسات'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Calendar Grid */}
            <div className={`calendar-grid-container-modern ${isCalendarLoading ? 'calendar-loading' : ''}`}>
              <div className="calendar-grid-body-modern">
                {(() => {
                  const calendarDates = getCalendarViewDates()
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)

                  // Split all dates directly into rows of 4 days
                  const rows = []
                  for (let i = 0; i < calendarDates.length; i += 4) {
                    const rowDates = calendarDates.slice(i, i + 4)
                    // Pad with null if less than 4 days to ensure always 4 cells
                    while (rowDates.length < 4) {
                      rowDates.push(null)
                    }
                    rows.push(rowDates)
                  }

                  return rows.map((rowDates, rowIdx) => {
                    // Check if any date in this row is in the current week
                    const isCurrentWeek = rowDates.some(date => {
                      const dateToCompare = new Date(date)
                      dateToCompare.setHours(0, 0, 0, 0)
                      const weekStart = new Date(dateToCompare)
                      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
                      weekStart.setHours(0, 0, 0, 0)
                      const weekEnd = new Date(weekStart)
                      weekEnd.setDate(weekEnd.getDate() + 6)
                      weekEnd.setHours(23, 59, 59, 999)
                      return today >= weekStart && today <= weekEnd
                    })

                    return (
                      <div key={rowIdx} className={`calendar-week-row-modern calendar-week-row-4 ${isCurrentWeek ? 'current-week-highlight' : ''}`}>
                        {rowDates.map((date, dayIdx) => {
                          // Skip rendering if date is null (padding)
                          if (!date) {
                            return <div key={dayIdx} className="calendar-grid-cell-modern calendar-cell-empty-placeholder"></div>
                          }

                          const dayName = weekDays[date.getDay()]
                          const dateStr = date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })

                          // Check if this date is today
                          const dateToCompare = new Date(date)
                          dateToCompare.setHours(0, 0, 0, 0)
                          const isToday = dateToCompare.getTime() === today.getTime()

                          // Get sessions for this date
                          // Get sessions for this date
                          const sessionsForDay = []
                          sessionsData.forEach(s => {
                            if (s.sessiondate) {
                              const sessionDate = new Date(s.sessiondate)
                              sessionDate.setHours(0, 0, 0, 0)
                              if (sessionDate.getTime() === dateToCompare.getTime()) {
                                sessionsForDay.push({ type: 'session', data: s })
                              }
                            }
                            if (s.next_session_date) {
                              const nextSessionDate = new Date(s.next_session_date)
                              nextSessionDate.setHours(0, 0, 0, 0)
                              if (nextSessionDate.getTime() === dateToCompare.getTime()) {
                                sessionsForDay.push({ type: 'session-next', data: s })
                              }
                            }
                          })

                          const sessionCount = sessionsForDay.length

                          // Get tasks for this date
                          const tasksForDay = tasks.filter(task => {
                            if (!task.task_deadline) return false
                            const taskDate = new Date(task.task_deadline + 'T00:00:00')
                            taskDate.setHours(0, 0, 0, 0)
                            const dateToCompare = new Date(date)
                            dateToCompare.setHours(0, 0, 0, 0)
                            return taskDate.getTime() === dateToCompare.getTime() &&
                              task.task_status !== 'completed' &&
                              task.task_status !== 'مكتملة'
                          })

                          // Check for ended sessions without updates
                          const endedSessionsWithoutUpdate = sessionsData.filter(s => {
                            if (!s.sessiondate || s.status !== 'ended') return false
                            const sessionDate = new Date(s.sessiondate)
                            sessionDate.setHours(0, 0, 0, 0)
                            const dateToCompare = new Date(date)
                            dateToCompare.setHours(0, 0, 0, 0)
                            return sessionDate.getTime() <= dateToCompare.getTime()
                          })

                          const allItems = [
                            ...sessionsForDay,
                            ...tasksForDay.map(t => ({ type: 'task', data: t })),
                            ...reminders.filter(r => {
                              if (!r.reminder_date) return false
                              const rDate = new Date(r.reminder_date)
                              rDate.setHours(0, 0, 0, 0)
                              const dateToCompare = new Date(date)
                              dateToCompare.setHours(0, 0, 0, 0)
                              return rDate.getTime() === dateToCompare.getTime()
                            }).map(r => ({ type: 'reminder', data: r })),
                            ...endedSessionsWithoutUpdate.map(s => ({ type: 'ended-session', data: s }))
                          ]

                          return (
                            <div key={dayIdx} className={`calendar-grid-cell-modern ${isToday ? 'today-cell' : ''} ${sessionCount > 0 ? 'has-sessions-cell' : ''}`}>
                              <div className="calendar-cell-header-modern">
                                <div className="calendar-cell-weekday">{dayName}</div>
                                <div className="calendar-cell-date-value">{dateStr}</div>
                              </div>
                              <div className="calendar-cell-items-modern">
                                {allItems.length > 0 ? (
                                  allItems.map((item, itemIdx) => {
                                    if (item.type === 'session') {
                                      const session = item.data
                                      return (
                                        <div
                                          key={`session-${itemIdx}`}
                                          className="calendar-item-modern calendar-item-session-modern"
                                          onClick={() => {
                                            const linkedCase = casesData.find(c => c.case_number === session.case_number);
                                            const targetCaseId = linkedCase?.id || session.case_id;

                                            if (targetCaseId) {
                                              router.push(`/cases/CaseDetailsPage?caseId=${targetCaseId}&tab=sessions&highlightType=session&highlightId=${session.id}`)
                                            } else if (session.case_number) {
                                              router.push(`/cases/CaseDetailsPage?caseNumber=${session.case_number}&tab=sessions&highlightType=session&highlightId=${session.id}`)
                                            }
                                          }}
                                        >
                                          <div className="pill-dot"></div>
                                          <span className="calendar-item-text-modern">
                                            {session.sessionname ? `${session.sessionname} (دعوى ${session.case_number})` :
                                              session.case_number ? `جلسة لدعوى رقم ${session.case_number}` :
                                                session.sessiondetails || 'جلسة'}
                                          </span>
                                        </div>
                                      )
                                    } else if (item.type === 'session-next') {
                                      const session = item.data
                                      return (
                                        <div
                                          key={`session-next-${itemIdx}`}
                                          className="calendar-item-modern calendar-item-session-modern"
                                          style={{ background: '#ECFDF5', color: '#10B981' }}
                                          onClick={() => {
                                            const linkedCase = casesData.find(c => c.case_number === session.case_number);
                                            const targetCaseId = linkedCase?.id || session.case_id;

                                            if (targetCaseId) {
                                              router.push(`/cases/CaseDetailsPage?caseId=${targetCaseId}&tab=sessions&highlightType=session&highlightId=${session.id}`)
                                            } else if (session.case_number) {
                                              router.push(`/cases/CaseDetailsPage?caseNumber=${session.case_number}&tab=sessions&highlightType=session&highlightId=${session.id}`)
                                            }
                                          }}
                                        >
                                          <div className="pill-dot"></div>
                                          <span className="calendar-item-text-modern">
                                            {session.next_session_req ? `${session.next_session_req} (دعوى ${session.case_number})` :
                                              session.case_number ? `موعد الجلسة القادمة للدعوى ${session.case_number}` :
                                                'موعد جلسة قادمة'}
                                          </span>
                                        </div>
                                      )
                                    } else if (item.type === 'ended-session') {
                                      const session = item.data
                                      return (
                                        <div
                                          key={`ended-${itemIdx}`}
                                          className="calendar-item-modern calendar-item-ended-modern"
                                          onClick={() => {
                                            const linkedCase = casesData.find(c => c.case_number === session.case_number);
                                            const targetCaseId = linkedCase?.id || session.case_id;

                                            if (targetCaseId) {
                                              router.push(`/cases/CaseDetailsPage?caseId=${targetCaseId}&tab=sessions&highlightType=session&highlightId=${session.id}`)
                                            } else if (session.case_number) {
                                              router.push(`/cases/CaseDetailsPage?caseNumber=${session.case_number}&tab=sessions&highlightType=session&highlightId=${session.id}`)
                                            }
                                          }}
                                        >
                                          <div className="pill-dot"></div>
                                          <span className="calendar-item-text-modern">
                                            {session.case_number ? `الجلسة القادمة انتهت دون تحديث لدعوى رقم ${session.case_number}` :
                                              'الجلسة القادمة انتهت دون تحديث'}
                                          </span>
                                        </div>
                                      )
                                    } else if (item.type === 'reminder') {
                                      const reminder = item.data
                                      return (
                                        <div
                                          key={`reminder-${itemIdx}`}
                                          className="calendar-item-modern calendar-item-task-modern" // Reusing task styling for consistency
                                          style={{ background: '#f5f3ff', color: '#8b5cf6' }} // Purple for reminders
                                          onClick={() => {
                                            if (reminder.case_number) {
                                              // Find case ID if possible
                                              const linkedCase = casesData.find(c => c.case_number === reminder.case_number);
                                              const targetCaseId = linkedCase?.id;

                                              if (targetCaseId) {
                                                router.push(`/cases/CaseDetailsPage?caseId=${targetCaseId}&tab=reminders&reminderId=${reminder.id}`)
                                              } else {
                                                router.push(`/cases/CaseDetailsPage?caseNumber=${reminder.case_number}&tab=reminders&reminderId=${reminder.id}`)
                                              }
                                            } else {
                                              // General reminder? Navigate to where? 
                                              // For now, maybe just show alert or if it has case_id use that
                                              if (reminder.case_id) {
                                                router.push(`/cases/CaseDetailsPage?caseId=${reminder.case_id}&tab=reminders&reminderId=${reminder.id}`)
                                              }
                                            }
                                          }}
                                        >
                                          <div className="pill-dot"></div>
                                          <span className="calendar-item-text-modern">
                                            {reminder.title || reminder.reminder_title || 'تذكير'}
                                            {(() => {
                                              if (!reminder.case_number) return null;
                                              const linkedCase = casesData.find(c => c.case_number === reminder.case_number);
                                              return ` - دعوى ${linkedCase?.client_case_no || reminder.case_number}`;
                                            })()}
                                          </span>
                                        </div>
                                      )
                                    } else {
                                      const task = item.data
                                      const taskDate = task.task_deadline ? new Date(task.task_deadline + 'T00:00:00') : null
                                      const today = new Date()
                                      today.setHours(0, 0, 0, 0)
                                      const isOverdue = taskDate && taskDate < today

                                      return (
                                        <div
                                          key={`task-${itemIdx}`}
                                          className={`calendar-item-modern calendar-item-task-modern ${isOverdue ? 'overdue' : ''}`}
                                          onClick={() => {
                                            const linkedCase = casesData.find(c => c.case_number === task.task_case);
                                            const targetCaseId = linkedCase?.id || task.case_id;

                                            if (targetCaseId) {
                                              router.push(`/cases/CaseDetailsPage?caseId=${targetCaseId}&tab=jobTasks&highlightType=task&highlightId=${task.id}`)
                                            } else if (task.task_case) {
                                              router.push(`/cases/CaseDetailsPage?caseNumber=${task.task_case}&tab=jobTasks&highlightType=task&highlightId=${task.id}`)
                                            } else {
                                              // Navigate to tasks page for general tasks
                                              router.push('/tasks')
                                            }
                                          }}
                                        >
                                          <div className="pill-dot"></div>
                                          <span className="calendar-item-text-modern">
                                            {task.task_title ? task.task_title : 'مهمة بدون عنوان'}
                                            {task.task_case && ` (دعوى ${task.task_case})`}
                                            {isOverdue && (
                                              <span style={{ color: '#EF4444', fontSize: '9px', fontWeight: 'bold', marginRight: '5px' }}>
                                                [متأخرة]
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                      )
                                    }
                                  })
                                ) : (
                                  <div className="calendar-cell-empty-modern">-</div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          </div >
        </div >

        {/* Right Sidebar - 3 columns */}
        < div className="dashboard-column dashboard-column-right" >
          {/* الوضع المالي للدعاوي (Financial Status) */}
          < div className="dashboard-card financial-status-card-modern" >
            <div className="card-header-modern">
              <div className="card-header-icon-box" style={{ background: '#dbeafe' }}>
                <FaDollarSign style={{ color: '#2563eb', fontSize: '14px' }} />
              </div>
              <h2 className="card-title-modern">الملخص المالي</h2>
            </div>
            <div className="financial-status-content">
              {(() => {
                const totalCases = casesFinancialData.length

                // IQD calculations
                const totalValueIQD = casesFinancialData.filter(c => c.currency !== 'USD').reduce((sum, c) => sum + (c.caseValue || 0), 0)
                const paidAmountIQD = casesFinancialData.filter(c => c.currency !== 'USD').reduce((sum, c) => sum + (c.paidAmount || 0), 0)
                const outstandingAmountIQD = casesFinancialData.filter(c => c.currency !== 'USD').reduce((sum, c) => sum + (c.outstandingAmount || 0), 0)

                // USD calculations
                const hasUSD = casesFinancialData.some(c => c.currency === 'USD')
                const totalValueUSD = casesFinancialData.filter(c => c.currency === 'USD').reduce((sum, c) => sum + (c.caseValue || 0), 0)
                const paidAmountUSD = casesFinancialData.filter(c => c.currency === 'USD').reduce((sum, c) => sum + (c.paidAmount || 0), 0)
                const outstandingAmountUSD = casesFinancialData.filter(c => c.currency === 'USD').reduce((sum, c) => sum + (c.outstandingAmount || 0), 0)

                const totalVal = totalValueIQD + totalValueUSD;
                const paidVal = paidAmountIQD + paidAmountUSD;
                const collectionPct = totalVal > 0 ? Math.round((paidVal / totalVal) * 100) : 0;

                return (
                  <div className="fin-rows">
                    <div className="fin-row fin-row-total">
                      <div className="fin-row-right">
                        <span className="fin-row-label">إجمالي الأتعاب</span>
                      </div>
                      <div className="fin-row-left" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span className="fin-row-value-big">{totalValueIQD.toLocaleString('ar-EG')} د.ع</span>
                        {hasUSD && <span className="fin-row-value-usd">${totalValueUSD.toLocaleString('en-US')}</span>}
                      </div>
                    </div>

                    <div className="fin-row fin-row-collected">
                      <div className="fin-row-accent" style={{ background: '#22c55e' }}></div>
                      <div className="fin-row-body">
                        <div className="fin-row-right">
                          <span className="fin-row-label">الأتعاب المحصلة</span>
                        </div>
                        <div className="fin-row-left" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="fin-row-value-big" style={{ color: '#16a34a' }}>{paidAmountIQD.toLocaleString('ar-EG')} د.ع</span>
                            <FiChevronUp style={{ color: '#16a34a', fontSize: '12px' }} />
                          </div>
                          {hasUSD && <span className="fin-row-value-usd">${paidAmountUSD.toLocaleString('en-US')}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="fin-row fin-row-pending">
                      <div className="fin-row-accent" style={{ background: '#f59e0b' }}></div>
                      <div className="fin-row-body">
                        <div className="fin-row-right">
                          <span className="fin-row-label">المبالغ المعلقة</span>
                        </div>
                        <div className="fin-row-left" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="fin-row-value-big" style={{ color: '#d97706' }}>{outstandingAmountIQD.toLocaleString('ar-EG')} د.ع</span>
                            <FiChevronDown style={{ color: '#d97706', fontSize: '12px' }} />
                          </div>
                          {hasUSD && <span className="fin-row-value-usd">${outstandingAmountUSD.toLocaleString('en-US')}</span>}
                        </div>
                      </div>
                                          </div>
                  </div>
                )
              })()}
            </div>
          </div >

          {/* المهام اليومية (Daily Tasks) */}
          < div className="dashboard-card daily-tasks-card-modern" >
            <div className="card-header-modern">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="card-header-icon-box" style={{ background: '#fee2e2' }}>
                  <FaTasks style={{ color: '#dc2626', fontSize: '14px' }} />
                </div>
                <h2 className="card-title-modern">المهام اليومية</h2>
              </div>
              <button
                className="tasks-add-button"
                onClick={handleOpenAddTaskModal}
                title="إضافة مهمة جديدة"
                aria-label="إضافة مهمة جديدة"
                type="button"
                disabled={isReadOnly || subLoading}
                style={{
                  opacity: isReadOnly || subLoading ? 0.5 : 1,
                  cursor: isReadOnly || subLoading ? 'not-allowed' : 'pointer'
                }}
              >
                <Plus className="tasks-add-icon" size={16} />
              </button>
            </div>
            <div className="daily-tasks-content">
              {tasks.length > 0 ? (
                <div className="daily-tasks-list">
                  {tasks.slice(0, 4).map((task) => {
                    const taskDate = task.task_deadline ? new Date(task.task_deadline + 'T00:00:00') : null
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const isCompleted = task.task_status === 'completed' || task.task_status === 'مكتملة'
                    const isToday = taskDate && taskDate.toDateString() === today.toDateString()
                    const isOverdue = !isCompleted && taskDate && taskDate.getTime() < today.getTime()
                    const timeStr = taskDate ? taskDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''

                    return (
                      <div
                        key={task.id}
                        className={`daily-task-item ${isCompleted ? 'completed' : ''}`}
                        style={isOverdue ? { background: '#FEF2F2', border: '1px solid #FECACA' } : {}}
                        onClick={() => {
                          if (task.case_id) {
                            router.push(`/cases/CaseDetailsPage?caseId=${task.case_id}&tab=jobTasks&highlightType=task&highlightId=${task.id}`)
                          } else if (task.task_case) {
                            router.push(`/cases/CaseDetailsPage?caseNumber=${task.task_case}&tab=jobTasks&highlightType=task&highlightId=${task.id}`)
                          } else {
                            // Navigate to tasks page for general tasks
                            router.push('/tasks')
                          }
                        }}
                      >
                        {isCompleted ? (
                          <FaCheckCircle 
                            className="task-status-icon task-completed-icon" 
                          />
                        ) : (
                          <div 
                            className="task-status-icon task-pending-icon" 
                            style={{ 
                              borderColor: isOverdue ? '#DC2626' : (task.task_status === 'in-progress' || task.task_status === 'قيد التنفيذ' || task.task_status === 'قيد العمل' ? '#3B82F6' : '#CBD5E1'), 
                              background: isOverdue ? '#FEE2E2' : (task.task_status === 'in-progress' || task.task_status === 'قيد التنفيذ' || task.task_status === 'قيد العمل' ? '#EFF6FF' : 'transparent') 
                            }}
                          ></div>
                        )}
                        <div className="task-content-wrapper">
                          <span className="task-title-modern" style={isOverdue ? { color: '#DC2626' } : {}}>
                            {task.task_title || 'مهمة بدون عنوان'}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '10px', background: task.task_status === 'completed' || task.task_status === 'مكتملة' ? '#D1FAE5' : task.task_status === 'in-progress' || task.task_status === 'قيد التنفيذ' ? '#FEF3C7' : task.task_status === 'قيد العمل' ? '#E0F2FE' : task.task_status === 'متأخرة' ? '#FEE2E2' : '#E0E7FF', color: task.task_status === 'completed' || task.task_status === 'مكتملة' ? '#059669' : task.task_status === 'in-progress' || task.task_status === 'قيد التنفيذ' ? '#D97706' : task.task_status === 'قيد العمل' ? '#0284C7' : task.task_status === 'متأخرة' ? '#DC2626' : '#4338CA', padding: '2px 6px', borderRadius: '4px', marginRight: '8px', verticalAlign: 'middle', fontWeight: 'bold' }}>
                                {task.task_status === 'completed' || task.task_status === 'مكتملة' ? 'مكتملة' : task.task_status === 'in-progress' || task.task_status === 'قيد التنفيذ' ? 'قيد التنفيذ' : task.task_status === 'قيد العمل' ? 'قيد العمل' : task.task_status === 'متأخرة' ? 'متأخرة' : 'قيد الانتظار'}
                              </span>
                              {isOverdue && (
                                <span style={{ fontSize: '9px', background: '#DC2626', color: 'white', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold', verticalAlign: 'middle' }}>متأخرة</span>
                              )}
                            </div>
                          </span>
                          {taskDate && (
                            <span className="task-time-modern" style={isOverdue ? { color: '#EF4444' } : {}}>
                              {isToday ? 'اليوم' : taskDate.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })} {timeStr && `- ${timeStr}`}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="tasks-empty-state-modern">
                  <FaTasks className="tasks-empty-icon-modern" />
                  <div className="tasks-empty-text-modern">لا يوجد مهام</div>
                </div>
              )}
            </div>
          </div >

          {/* مواعيد مهمة (Critical Legal Deadlines) - Refactored */}
          < div className="dashboard-card important-appointments-card" >
            <div className="card-header-modern">
              <div className="card-header-icon-box" style={{ background: '#fef3c7' }}>
                <FaExclamationTriangle style={{ color: '#d97706', fontSize: '14px' }} />
              </div>
              <h2 className="card-title-modern">جدول اليوم</h2>
            </div>
            <div className="appointments-content">
              {(() => {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const tomorrow = new Date(today)
                tomorrow.setDate(tomorrow.getDate() + 1)

                // 1. Today's Sessions
                const todaySessions = []

                sessionsData.forEach(s => {
                  let aptDate = null
                  if (s.sessiondate) {
                    const sd = new Date(s.sessiondate)
                    sd.setHours(0, 0, 0, 0)
                    if (sd.getTime() === today.getTime()) aptDate = sd
                  }
                  if (!aptDate && s.next_session_date) {
                    const nd = new Date(s.next_session_date)
                    nd.setHours(0, 0, 0, 0)
                    if (nd.getTime() === today.getTime()) aptDate = nd
                  }

                  if (aptDate) {
                    todaySessions.push({ ...s, _matchedDate: aptDate })
                  }
                })

                todaySessions.sort((a, b) => a._matchedDate - b._matchedDate)
                const imminentSessions = todaySessions

                // 2. Today's Tasks
                const todayTasks = tasks
                  .filter(t => {
                    if (!t.task_deadline) return false
                    const taskDate = new Date(t.task_deadline + 'T00:00:00')
                    taskDate.setHours(0, 0, 0, 0)

                    const isNotCompleted = t.task_status !== 'completed' && t.task_status !== 'مكتملة'

                    // Include any uncompleted tasks due today (or overdue if we want? Let's stick strictly to today as requested)
                    return isNotCompleted && taskDate.getTime() === today.getTime()
                  })
                  .sort((a, b) => new Date(a.task_deadline) - new Date(b.task_deadline))

                const appointments = [
                  ...imminentSessions.map(s => ({
                    type: 'session',
                    title: s.case_number ? `جلسة محكمة لدعوى رقم ${s.case_number}` : 'جلسة محكمة',
                    date: s._matchedDate,
                    urgency: 'high', // All imminent sessions are high urgency
                    data: s
                  })),
                  ...todayTasks.map(t => ({
                    type: 'task',
                    title: t.task_title || `مهمة عالية الأولوية - ${t.task_case || ''}`,
                    date: new Date(t.task_deadline + 'T00:00:00'),
                    urgency: 'high', // High priority tasks are high urgency
                    data: t
                  }))
                ].sort((a, b) => a.date - b.date).slice(0, 6) // Show top 6 critical items

                if (appointments.length === 0) {
                  return (
                    <div className="appointments-empty-state">
                      <FaCheckCircle className="appointments-empty-icon" style={{ color: '#10B981' }} />
                      <div className="appointments-empty-text">لا توجد مواعيد اليوم</div>
                    </div>
                  )
                }

                return appointments.map((apt, idx) => {
                  const aptDate = apt.date
                  aptDate.setHours(0, 0, 0, 0)

                  const dateLabel = `اليوم - ${aptDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}`

                  // Force color for all items today
                  const iconColor = '#3B82F6' // Use primary blue instead of red for standard today items
                  const Icon = apt.type === 'session' ? FaGavel : FaCheckCircle // Use check circle for tasks

                  return (
                    <div
                      key={idx}
                      className={`appointment-item ${apt.type === 'session' ? 'appointment-high' : 'appointment-medium'}`}
                      onClick={() => {
                        if (apt.type === 'session' && apt.data.case_id) {
                          router.push(`/cases/CaseDetailsPage?caseId=${apt.data.case_id}&tab=sessions&highlightType=session&highlightId=${apt.data.id}`)
                        } else if (apt.type === 'session' && apt.data.case_number) {
                          router.push(`/cases/CaseDetailsPage?caseNumber=${apt.data.case_number}&tab=sessions&highlightType=session&highlightId=${apt.data.id}`)
                        } else if (apt.type === 'task' && apt.data.case_id) {
                          router.push(`/cases/CaseDetailsPage?caseId=${apt.data.case_id}&tab=jobTasks&highlightType=task&highlightId=${apt.data.id}`)
                        } else if (apt.type === 'task' && apt.data.task_case) {
                          router.push(`/cases/CaseDetailsPage?caseNumber=${apt.data.task_case}&tab=jobTasks&highlightType=task&highlightId=${apt.data.id}`)
                        }
                      }}
                      style={{ borderRightColor: iconColor }}
                    >
                      <Icon className="appointment-icon" style={{ color: iconColor }} />
                      <div className="appointment-content">
                        <div className="appointment-title">{apt.title}</div>
                        <div className="appointment-date" style={{ color: '#4B5563' }}>{dateLabel}</div>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div >
        </div >
      </div >
      )}

      {/* Add Task Modal - Rendered as popup overlay using Portal */}
      {
        typeof window !== 'undefined' && isAddTaskModalOpen && ReactDOM.createPortal(
          <div className="popup-overlay-reminder">
            <div className="reminder-popup-container">
              <div className="reminder-popup-header">
                <div className="reminder-header-content">
                  <div className="reminder-header-icon-wrapper">
                    <span className="reminder-header-icon">📋</span>
                  </div>
                  <h2>إضافة مهمة وظيفية</h2>
                </div>
                <button
                  type="button"
                  className="reminder-close-btn-right"
                  onClick={handleCloseAddTaskModal}
                  aria-label="إغلاق"
                >
                  ×
                </button>
              </div>
              <div className="reminder-popup-content" style={{ padding: '12px 16px' }}>
                <form onSubmit={handleTaskSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="task_title" style={{ fontSize: '12px', marginBottom: '3px' }}>
                      عنوان المُهمة <span className="required-asterisk">*</span>
                    </label>
                    <input
                      className="reminder-form-input"
                      type="text"
                      id="task_title"
                      name="task_title"
                      value={taskFormData.task_title}
                      onChange={handleTaskInputChange}
                      placeholder="مثال: مراجعة العقد وتقديم الملاحظات"
                      required
                      style={{ padding: '6px 10px', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="task_type" style={{ fontSize: '12px', marginBottom: '3px' }}>
                        نوع المُهمة <span className="required-asterisk">*</span>
                      </label>
                      <select
                        className="reminder-form-input reminder-form-select"
                        id="task_type"
                        name="task_type"
                        value={taskFormData.task_type}
                        onChange={handleTaskInputChange}
                        required
                        style={{ padding: '6px 10px', fontSize: '13px' }}
                      >
                        <option value="مهمة عامة">مهمة عامة</option>
                        <option value="مراجعة مستندات">مراجعة مستندات</option>
                        <option value="حضور جلسة">حضور جلسة</option>
                        <option value="تواصل مع الخصم">تواصل مع الخصم</option>
                        <option value="بحث قانوني">بحث قانوني</option>
                      </select>
                    </div>

                    <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="task_priority" style={{ fontSize: '12px', marginBottom: '3px' }}>
                        الأولوية <span className="required-asterisk">*</span>
                      </label>
                      <select
                        className="reminder-form-input reminder-form-select"
                        id="task_priority"
                        name="task_priority"
                        value={taskFormData.task_priority}
                        onChange={handleTaskInputChange}
                        required
                        style={{ padding: '6px 10px', fontSize: '13px' }}
                      >
                        <option value="عالية">عالية</option>
                        <option value="متوسطة">متوسطة</option>
                        <option value="منخفضة">منخفضة</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="task_deadline" style={{ fontSize: '12px', marginBottom: '3px' }}>الموعد النهائي</label>
                      <input
                        className="reminder-form-input reminder-date-input"
                        type="date"
                        id="task_deadline"
                        name="task_deadline"
                        value={taskFormData.task_deadline}
                        onChange={handleTaskInputChange}
                        onClick={(e) => {
                          e.target.showPicker?.();
                        }}
                        style={{ padding: '6px 10px', fontSize: '13px' }}
                      />
                    </div>

                    <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="lawyerDropdown" style={{ fontSize: '12px', marginBottom: '3px' }}>تذكير مستخدم آخر <span className="required-asterisk">*</span></label>
                      <select
                        className="reminder-form-input reminder-form-select"
                        id="lawyerDropdown"
                        name="lawyerDropdown"
                        value={selectedLawyer}
                        onChange={(e) => setSelectedLawyer(e.target.value)}
                        required
                        style={{ padding: '6px 10px', fontSize: '13px' }}
                      >
                        <option value="">اختر مستخدم</option>
                        {lawyerNames.map((name, index) => (
                          <option key={index} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="caseSelect" style={{ fontSize: '12px', marginBottom: '3px' }}>ربط بقضية (اختياري)</label>
                    <select
                      className="reminder-form-input reminder-form-select"
                      id="caseSelect"
                      name="caseSelect"
                      value={selectedCaseId}
                      onChange={(e) => setSelectedCaseId(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '13px' }}
                    >
                      <option value="">مهمة عامة (غير مرتبطة بقضية)</option>
                      {casesData.map((caseItem) => (
                        <option key={caseItem.id} value={caseItem.id}>
                          {caseItem.case_number} - {caseItem.client_name || 'غير محدد'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="task_details" style={{ fontSize: '12px', marginBottom: '3px' }}>التفاصيل</label>
                    <textarea
                      className="reminder-form-textarea"
                      id="task_details"
                      name="task_details"
                      value={taskFormData.task_details}
                      onChange={handleTaskInputChange}
                      rows="2"
                      placeholder="أضف أي تفاصيل أو تعليمات إضافية بخصوص هذه المهمة"
                      style={{ padding: '6px 10px', fontSize: '13px', minHeight: '50px', maxHeight: '50px' }}
                    ></textarea>
                  </div>

                  <div className="reminder-button-container" style={{ marginTop: '6px', paddingTop: '10px' }}>
                    <button
                      type="button"
                      className="reminder-cancel-button"
                      onClick={handleCloseAddTaskModal}
                      disabled={isSubmittingTask}
                      style={{ padding: '7px 16px', fontSize: '13px' }}
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="reminder-add-button"
                      disabled={isSubmittingTask}
                      style={{
                        padding: '7px 16px',
                        fontSize: '13px',
                        pointerEvents: 'auto',
                        transition: 'none',
                        cursor: isSubmittingTask ? 'not-allowed' : 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSubmittingTask) {
                          e.target.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                          e.target.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
                          e.target.style.transform = 'none';
                        }
                      }}
                    >
                      {isSubmittingTask ? 'جاري الإضافة...' : 'إضافة المهمة'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* Toast Notification */}
      {
        toastMessage && (
          <div className={`toast-notification toast-${toastType}`}>
            <div className="toast-content">
              {toastType === 'success' ? (
                <FaCheckCircle className="toast-icon" />
              ) : (
                <FaExclamationTriangle className="toast-icon" />
              )}
              <span className="toast-message">{toastMessage}</span>
            </div>
          </div>
        )
      }

      {/* Global styles for modal - must be separate to ensure they apply */}
      <style jsx global>{`
        .popup-overlay-reminder {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          background-color: rgba(0, 0, 0, 0.6) !important;
          z-index: 99999 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: auto !important;
        }

        .reminder-popup-container {
          background: #ffffff !important;
          width: 90% !important;
          max-width: 600px !important;
          border-radius: 16px !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
          direction: rtl !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          border: 1px solid #e5e7eb !important;
          position: relative !important;
          z-index: 100000 !important;
          margin: auto !important;
        }

        .reminder-popup-header {
          background: linear-gradient(135deg, #0F172A 0%, #2563EB 100%) !important;
          padding: 10px 20px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          position: relative !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        .reminder-header-content {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          flex: 1 !important;
          justify-content: flex-start !important;
        }

        .reminder-header-icon-wrapper {
          width: 40px !important;
          height: 40px !important;
          background: rgba(255, 255, 255, 0.2) !important;
          border-radius: 10px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .reminder-header-icon {
          font-size: 24px !important;
        }

        .reminder-popup-header h2 {
          color: #ffffff !important;
          font-size: 18px !important;
          font-weight: 700 !important;
          margin: 0 !important;
          text-align: right !important;
          background: none !important;
          padding: 0 !important;
          font-family: 'Cairo', 'Almarai', sans-serif !important;
          letter-spacing: -0.01em !important;
        }

        .reminder-close-btn-right {
          background: none !important;
          border: none !important;
          font-size: 28px !important;
          width: 36px !important;
          height: 36px !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s ease !important;
          line-height: 1 !important;
          padding: 0 !important;
          color: #ffffff !important;
        }

        .reminder-close-btn-right:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          transform: scale(1.1) !important;
        }

        .reminder-popup-content {
          padding: 12px 16px !important;
          overflow-y: visible !important;
          overflow: hidden !important;
        }

        .reminder-form-group {
          display: flex !important;
          flex-direction: column !important;
          margin-bottom: 0 !important;
          gap: 3px !important;
        }

        .reminder-form-group label {
          color: #1f2937 !important;
          font-weight: 700 !important;
          font-size: 12px !important;
          text-align: right !important;
          display: block !important;
          width: 100% !important;
          direction: rtl !important;
          letter-spacing: -0.01em !important;
          line-height: 1.3 !important;
        }

        .required-asterisk {
          color: #e11d48 !important;
          font-weight: 700 !important;
          margin-right: 4px !important;
        }

        .reminder-form-input {
          width: 100% !important;
          padding: 6px 10px !important;
          border: 1.5px solid #e5e7eb !important;
          border-radius: 8px !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          font-family: 'Cairo', 'Almarai', sans-serif !important;
          color: #1f2937 !important;
          background: #ffffff !important;
          transition: all 0.2s ease !important;
          direction: rtl !important;
          height: 36px !important;
          box-sizing: border-box !important;
        }

        .reminder-form-input:focus {
          outline: none !important;
          border-color: #2563EB !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1) !important;
        }

        .reminder-form-select {
          cursor: pointer !important;
        }

        .reminder-form-textarea {
          width: 100% !important;
          padding: 6px 10px !important;
          border: 1.5px solid #e5e7eb !important;
          border-radius: 8px !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          font-family: 'Cairo', 'Almarai', sans-serif !important;
          color: #1f2937 !important;
          background: #ffffff !important;
          transition: all 0.2s ease !important;
          direction: rtl !important;
          resize: none !important;
          min-height: 50px !important;
          max-height: 50px !important;
          overflow-y: auto !important;
          line-height: 1.4 !important;
        }

        .reminder-form-textarea:focus {
          outline: none !important;
          border-color: #2563EB !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1) !important;
        }

        .reminder-date-input {
          cursor: pointer !important;
        }

        .reminder-button-container {
          display: flex !important;
          gap: 10px !important;
          justify-content: flex-end !important;
          margin-top: 6px !important;
          padding-top: 10px !important;
          border-top: 1px solid #e5e7eb !important;
        }

        .reminder-cancel-button {
          padding: 7px 16px !important;
          border: 1.5px solid #e5e7eb !important;
          border-radius: 8px !important;
          background: #ffffff !important;
          color: #64748B !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          font-family: 'Cairo', 'Almarai', sans-serif !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          height: 34px !important;
          box-sizing: border-box !important;
        }

        .reminder-cancel-button:hover {
          background: #F1F5F9 !important;
          border-color: #CBD5E1 !important;
          color: #475569 !important;
        }

        .reminder-add-button {
          padding: 7px 16px !important;
          border: none !important;
          border-radius: 8px !important;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%) !important;
          color: #ffffff !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          font-family: 'Cairo', 'Almarai', sans-serif !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2) !important;
          height: 34px !important;
          box-sizing: border-box !important;
        }

        .reminder-add-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%) !important;
          box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3) !important;
          transform: translateY(-1px) !important;
        }

        .reminder-add-button:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }
      `}</style>

      <style jsx>{`
        .dashboard {
          width: 100%;
          margin: 0;
          padding: 0;
          background: #F4F7FE;
          min-height: calc(100vh - 84px);
          direction: rtl;
          font-family: 'Cairo', sans-serif;
          box-sizing: border-box;
          color: #1E293B;
        }

        /* Large screens (27-inch+ monitors) */
        @media (min-width: 1600px) {
          .dashboard {
            max-width: 1800px;
            margin: 0 auto;
          }
        }

        @media (min-width: 1920px) {
          .dashboard {
            max-width: 2000px;
            margin: 0 auto;
          }
        }

        @media (min-width: 2560px) {
          .dashboard {
            max-width: 2200px;
            margin: 0 auto;
          }
        }

        /* Quick Actions Bar - Integrated Toolbar */
        .quick-actions-bar {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          margin-bottom: 0;
          width: 100%;
          direction: rtl;
          background: #ffffff;
          padding: 10px 16px;
          border-radius: 12px 12px 0 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          box-sizing: border-box;
        }
        
        .quick-actions-search-wrapper {
          display: flex;
          align-items: center;
          gap: 0;
          background: #F4F7FE;
          border: none;
          border-radius: 10px;
          overflow: visible;
          flex: 0 1 500px;
          max-width: 600px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          height: 38px;
          position: relative;
          box-shadow: none;
        }

        /* Large screens (27-inch+ monitors) */
        @media (min-width: 1600px) {
          .quick-actions-search-wrapper {
            flex: 0 1 400px;
            max-width: 450px;
          }
        }

        @media (min-width: 1920px) {
          .quick-actions-search-wrapper {
            flex: 0 1 350px;
            max-width: 400px;
          }
        }

        @media (min-width: 2560px) {
          .quick-actions-search-wrapper {
            flex: 0 1 300px;
            max-width: 350px;
          }
        }
        
        .quick-actions-search-wrapper:focus-within {
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
        }
        
        .quick-actions-search-icon {
          color: #2563EB;
          font-size: 16px;
          margin-left: 14px;
          flex-shrink: 0;
          transition: transform 0.3s ease;
        }

        .quick-actions-search-wrapper:focus-within .quick-actions-search-icon {
          transform: scale(1.1);
        }
        
        .quick-actions-search {
          flex: 1;
          padding: 0 16px;
          border: none;
          background: transparent;
          font-size: 15px;
          font-family: 'Cairo', sans-serif;
          color: #1E293B;
          outline: none;
          text-align: right;
          height: 100%;
        }
        
        .quick-actions-search::placeholder {
          color: #94A3B8;
          font-weight: 400;
        }

        /* Search Results Dropdown */
        .search-results-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          left: 0;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border: 1px solid #E2E8F0;
          z-index: 1000;
          max-height: 450px;
          overflow-y: auto;
          padding: 8px 0;
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .search-loading, .no-results {
          padding: 20px;
          text-align: center;
          color: #64748B;
          font-size: 14px;
        }

        .search-category {
          margin-bottom: 8px;
        }

        .category-title {
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 700;
          color: #64748B;
          background: #F8FAFC;
          display: flex;
          align-items: center;
          gap: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .search-item {
          padding: 10px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 1px solid #F1F5F9;
        }

        .search-item:last-child {
          border-bottom: none;
        }

        .search-item:hover {
          background: #F1F5F9;
        }

        .item-main {
          font-size: 14px;
          font-weight: 600;
          color: #1E293B;
          margin-bottom: 2px;
        }

        .item-sub {
          font-size: 12px;
          color: #64748B;
        }

        .search-view-all {
          padding: 12px;
          text-align: center;
          color: #2563EB;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          background: #EFF6FF;
          margin: 8px 12px 4px 12px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .search-view-all:hover {
          background: #DBEAFE;
          text-decoration: underline;
        }
        
        .quick-actions-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: nowrap;
          align-items: center;
        }
        
        .quick-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 4px 10px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-family: 'Cairo', sans-serif;
          font-size: 15px;
          font-weight: 600;
          height: 28px;
          white-space: nowrap;
          background: #ffffff;
          transition: none !important;
          box-shadow: none !important;
        }
        .quick-action-btn:hover,
        .quick-action-btn:active {
          transform: none !important;
          background-color: inherit !important;
          opacity: 1 !important;
          filter: none !important;
          box-shadow: none !important;
        }

        .quick-action-btn span {
          font-size: 14px;
        }
        
        .quick-action-icon {
          flex-shrink: 0;
        }
        
        /* محامي جديد - Purple/Indigo button */
        .quick-action-btn-lawyer {
          background: #6366F1;
          color: white;
        }
        

        
        /* قرارات تمييزية - Rose button */
        .quick-action-btn-decisions {
          background: #E11D48;
          color: white;
        }
        

        
        /* طلب جديد - Orange button */
        .quick-action-btn-request {
          background: #F59E0B;
          color: white;
        }
        

        
        /* القوانين العراقية - Teal button */
        .quick-action-btn-laws {
          background: #14B8A6;
          color: white;
        }
        

        
        /* موكل جديد - Green button */
        .quick-action-btn-client {
          background: #10B981;
          color: white;
        }
        

        
        /* قضية جديدة - Blue button */
        .quick-action-btn-case {
          background: #2563EB;
          color: white;
          box-shadow: none;
        }
        




        .quick-actions-search-wrapper {
          position: relative;
          min-width: 280px;
          flex-shrink: 0;
        }

        .quick-create-search-wrapper {
          display: flex;
          align-items: center;
          gap: 0;
          background: #ffffff;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 3px rgba(0, 0, 0, 0.04);
          transition: all 0.3s ease;
          flex: 1;
          min-width: 350px;
          max-width: 600px;
          height: 40px;
        }

        /* Large screens (27-inch+ monitors) */
        @media (min-width: 1600px) {
          .quick-create-search-wrapper {
            max-width: 450px;
            min-width: 300px;
          }
        }

        @media (min-width: 1920px) {
          .quick-create-search-wrapper {
            max-width: 400px;
            min-width: 280px;
          }
        }

        @media (min-width: 2560px) {
          .quick-create-search-wrapper {
            max-width: 350px;
            min-width: 250px;
          }
        }

        .quick-create-search-wrapper:focus-within {
          border-color: #2563EB;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
        }

        .quick-create-search {
          flex: 1;
          padding: 0 14px;
          border: none;
          border-radius: 0;
          height: 40px;
          font-size: 14px;
          font-family: 'Cairo', 'Almarai', sans-serif;
          color: #1e293b;
          background: transparent;
          outline: none;
          text-align: right;
        }

        .quick-create-search:focus {
          outline: none;
        }

        .quick-create-search::placeholder {
          color: #94A3B8;
          font-weight: 400;
        }

        .quick-create-search-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background: linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%);
          color: #ffffff;
          border: none;
          border-radius: 0;
          cursor: pointer;
          font-size: 15px;
          width: 40px;
          height: 32px;
          box-shadow: none !important;
          transition: none !important;
        }
        .quick-create-search-btn:hover,
        .quick-create-search-btn:active {
          transform: none !important;
          filter: none !important;
          box-shadow: none !important;
        }

        .quick-create-btn {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 14px;
          border: none;
          border-radius: 12px;
          height: 32px;
          cursor: pointer;
          font-family: 'Cairo', 'Almarai', sans-serif;
          font-size: 15px;
          font-weight: 700;
          min-width: 120px;
          white-space: nowrap;
          box-shadow: none !important;
          transition: none !important;
          position: relative;
          overflow: hidden;
        }

        .quick-create-btn:hover,
        .quick-create-btn:active {
          transform: none !important;
          box-shadow: none !important;
          filter: none !important;
        }

        .quick-create-btn span {
          flex: 1;
          text-align: center;
          position: relative;
          z-index: 1;
        }

        /* محامي جديد - Light blue */
        .quick-create-btn-lawyer {
          background: linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%);
          color: #FFFFFF;
        }

        /* طلب جديد - Orange */
        .quick-create-btn-request {
          background: linear-gradient(135deg, #FB923C 0%, #F97316 100%);
          color: #FFFFFF;
        }

        /* القوانين العراقية - Teal */
        .quick-create-btn-laws {
          background: linear-gradient(135deg, #34D399 0%, #10B981 100%);
          color: #FFFFFF;
        }

        /* موكل جديد - Emerald */
        .quick-create-btn-client {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          color: #FFFFFF;
        }

        /* قضية جديدة - Dark blue/Indigo */
        .quick-create-btn-case {
          background: linear-gradient(135deg, #4F46E5 0%, #3730A3 100%);
          color: #FFFFFF;
        }

        /* قرارات تمييزية - Rose */
        .quick-create-btn-decisions {
          background: linear-gradient(135deg, #F43F5E 0%, #E11D48 100%);
          color: #FFFFFF;
        }


        .quick-create-icon {
          font-size: 20px;
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
        }

        /* Main 3-Column Grid Layout (Custom ratios: 2 - 7.5 - 2.5) */
        .dashboard-main-grid {
          display: grid;
          grid-template-columns: 2fr 7.5fr 2.5fr;
          gap: 12px;
          width: 100%;
          max-width: 100%;
          margin: 0;
        }
        
        .dashboard-column-left {
          grid-column: auto;
        }
        
        .dashboard-column-center {
          grid-column: auto;
        }
        
        .dashboard-column-right {
          grid-column: auto;
          gap: 6px !important;
        }
        
        @media (max-width: 1024px) {
          .dashboard-main-grid {
            grid-template-columns: 1fr;
          }
        }

        .dashboard-column {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .dashboard-column-left {
          gap: 6px !important;
        }

        .dashboard-column-2 {
          gap: 10px;
        }

        .dashboard-column-1 {
          /* Left column - Case Status & Distribution */
        }

        .dashboard-column-2 {
          /* Middle column - Sessions & Work Schedule */
        }

        .dashboard-column-3 {
          /* Right column - Financial, Tasks & Appointments */
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 12px;
          width: 100%;
          margin: 0;
        }

        .dashboard-grid-weekly-sessions {
          grid-template-columns: 2fr 1fr;
          margin-bottom: 12px;
        }

        .dashboard-column-full-width {
          grid-column: 1 / -1;
        }

        .dashboard-grid-second-row {
          margin-top: 12px;
          grid-template-columns: repeat(3, 1fr);
        }

        .dashboard-tasks-section {
          margin-top: 12px;
          width: 100%;
          padding: 0;
        }

        .dashboard-tasks-section .tasks-card-compact {
          width: 100%;
          margin: 0;
        }

        .dashboard-column {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .dashboard-column-first {
          border-right: 1px solid #E2E8F0;
          padding-right: 12px;
        }

        .dashboard-column-second {
          border-right: 1px solid #E2E8F0;
          padding-right: 12px;
        }

        .dashboard-column-third {
          /* No border on last column */
        }

        .dashboard-column-wider {
          flex: 1.5;
        }

        .dashboard-financial-section {
          margin-top: 12px;
          width: 100%;
        }

        .dashboard-card {
          background: #ffffff;
          border-radius: 12px;
          padding: 0;
          border: none;
          margin-bottom: 0;
          flex: 1;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          transition: box-shadow 0.2s ease, transform 0.2s ease;
          overflow: hidden;
        }
        
        .daily-tasks-content,
        .appointments-content,
        .weekly-sessions-summary-integrated {
          padding: 16px;
        }

        .calendar-grid-container-modern {
          margin-top: 0;
          padding: 0 16px 16px 16px;
        }

        .dashboard-card:hover {
          /* box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); */
          /* border-color: #CBD5E1; */
        }

        .modern-chart-card {
          background: #ffffff;
          border: 1px solid #E2E8F0;
          padding: 8px 10px !important;
        }
        
        .cases-financial-chart-card {
          margin-bottom: 0;
          flex: 0 0 auto;
        }

        .modern-chart-card {
          padding: 24px;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0;
        }

        .card-title {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: 'Cairo', 'Almarai', sans-serif;
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .card-title-icon {
          color: #3b82f6;
          font-size: 24px;
          filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3));
        }

        .card-action-btn {
          background: none;
          border: none;
          color: #64748B;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Modern Chart Card Style */
        .modern-chart-card {
          display: flex;
          flex-direction: column;
          height: fit-content;
          min-height: auto;
          background: #ffffff;
        }

        .card-header-modern {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          margin-bottom: 0;
          padding: 6px 14px;
          background: transparent;
          border-bottom: 1px solid #F1F5F9;
          border-radius: 12px 12px 0 0;
          gap: 10px;
          margin: -12px -12px 0 -12px;
          padding-left: 26px;
          padding-right: 26px;
          flex-direction: row;
        }

        .card-header-icon-box {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .case-status-card-modern .card-header-modern {
          background: linear-gradient(to left, #86efac 0%, #bbf7d0 40%, #f0fdf4 100%);
          border-bottom: 1px solid #bbf7d0;
        }

        .case-distribution-card .card-header-modern {
          background: linear-gradient(to left, #e8edf2 0%, #f1f5f9 40%, #f8fafc 100%);
          border-bottom: 1px solid #e2e8f0;
        }

        .daily-tasks-card-modern .card-header-modern {
          background: linear-gradient(to left, #c4b5fd 0%, #ddd6fe 40%, #ede9fe 100%);
          border-bottom: 1px solid #ddd6fe;
        }

        

        .important-appointments-card .card-header-modern {
          background: linear-gradient(to left, #fcd34d 0%, #fef3c7 40%, #fffbeb 100%);
          border-bottom: 1px solid #fef3c7;
        }

        .calendar-hero-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: linear-gradient(to left, #dbeafe 0%, #eff6ff 40%, #f8fafc 100%);
          direction: rtl;
          gap: 16px;
          margin: -12px -12px 0 -12px;
          border-radius: 12px 12px 0 0;
        }

        .work-schedule-card {
          border-radius: 12px;
          overflow: hidden;
        }

        .calendar-hero-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .calendar-hero-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #dbeafe;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #3b82f6;
        }

        .calendar-hero-text h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: #1e3a5f;
          font-family: 'Cairo', sans-serif;
          line-height: 1.3;
        }

        .calendar-hero-text span {
          font-size: 12px;
          font-weight: 500;
          color: #64748b;
          font-family: 'Cairo', sans-serif;
        }

        .calendar-hero-center {
          flex: 1;
          display: flex;
          justify-content: center;
        }

        .calendar-legend {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          font-family: 'Cairo', sans-serif;
        }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .calendar-hero-left {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .calendar-hero-left .agenda-nav-buttons {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .calendar-hero-left .agenda-nav-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          transition: background 0.2s;
        }

        .calendar-hero-left .agenda-nav-btn:hover {
          background: #f1f5f9;
        }

        .calendar-hero-left .agenda-date-range-modern {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          background: #ffffff;
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          font-family: 'Cairo', sans-serif;
          white-space: nowrap;
        }

        .card-title-modern {
          font-size: 15px;
          font-weight: 800;
          color: #000000;
          margin: 0;
          font-family: 'Cairo', sans-serif;
          letter-spacing: -0.01em;
          display: flex;
          align-items: center;
          gap: 8px;
          text-align: right;
        }


        .card-header-icon {
          color: #64748B;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 4px;
          border-radius: 4px;
        }

        .card-header-icon:hover {
          color: hsl(217, 91%, 55%);
          background-color: hsl(217, 91%, 55% / 0.1);
        }

        .card-header-icon-left {
          color: hsl(217, 91%, 55%);
          font-size: 18px;
          margin-left: 8px;
        }

        /* New 3-Column Layout Widgets */
        
        /* File Status Card (Left Sidebar) */
        .case-status-card-modern {
          background: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          transition: none;
          overflow: hidden;
        }

        .case-status-card-modern:hover {
          /* box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); */
          /* border-color: #CBD5E1; */
        }

        /* حالة الدعاوي - Redesigned from scratch */
        .case-status-content-redesigned {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 4px 16px 12px 16px;
        }

        .donut-chart-wrapper-redesigned {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-shrink: 0;
          margin-top: -2px;
        }

        .donut-chart-redesigned {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background-clip: border-box;
          transform: translateZ(0);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          box-shadow: none;
          isolation: isolate;
          will-change: transform;
          overflow: hidden;
        }

        .donut-chart-redesigned::before {
          content: '';
          position: absolute;
          width: 116px;
          height: 116px;
          border-radius: 50%;
          background: #ffffff;
          z-index: 1;
        }

        .donut-center-redesigned {
          position: relative;
          z-index: 2;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .donut-number-redesigned {
          font-size: 32px;
          font-weight: 700;
          color: #1E293B;
          font-family: 'Cairo', sans-serif;
          line-height: 1;
        }

        .donut-label-redesigned {
          font-size: 12px;
          font-weight: 500;
          color: #64748B;
          font-family: 'Cairo', sans-serif;
          line-height: 1;
        }


        .case-status-list-redesigned {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 5px 10px;
          width: 100%;
          padding: 0;
        }

        .case-status-item-redesigned {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0;
          background: transparent;
          border-radius: 0;
          transition: none;
        }

        .item-dot-redesigned {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: none;
        }

        .item-label-redesigned {
          flex: 1;
          font-size: 12px;
          font-weight: 500;
          color: #000000;
          font-family: 'Cairo', sans-serif;
          text-align: right;
          line-height: 1.3;
          white-space: nowrap;
        }

        .item-value-redesigned {
          font-size: 13px;
          font-weight: 600;
          color: #000000;
          font-family: 'Cairo', sans-serif;
          min-width: auto;
          text-align: left;
          background: transparent;
          padding: 0;
          border-radius: 0;
        }

        .case-status-item-redesigned.item-zero {
          opacity: 1;
        }

        .case-status-item-redesigned.item-zero .item-label-redesigned {
          color: #000000;
        }

        .case-status-item-redesigned.item-zero .item-value-redesigned {
          color: #000000;
          font-weight: 600;
        }

        /* Case Distribution Card */
        .case-distribution-card {
          background: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          transition: none;
          overflow: hidden;
        }

        .case-distribution-card:hover {
          /* box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); */
        }

        .case-distribution-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 4px 16px 12px 16px;
        }

        .donut-chart-container-medium {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-shrink: 0;
        }

        .donut-chart-medium {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background-clip: border-box;
          transform: translateZ(0);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          box-shadow: none;
          isolation: isolate;
          will-change: transform;
          overflow: hidden;
        }

        .donut-chart-medium::before {
          content: '';
          position: absolute;
          width: 116px;
          height: 116px;
          border-radius: 50%;
          background: #ffffff;
          z-index: 1;
        }

        .donut-chart-center-medium {
          position: relative;
          z-index: 2;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .donut-center-value-medium {
          font-size: 32px;
          font-weight: 700;
          color: #1E293B;
          font-family: 'Cairo', sans-serif;
          line-height: 1;
        }

        .donut-center-label-medium {
          font-size: 12px;
          font-weight: 500;
          color: #64748B;
          font-family: 'Cairo', sans-serif;
          line-height: 1;
        }

        .case-distribution-legend {
          display: flex;
          flex-direction: row;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          width: 100%;
          padding: 0;
        }

        .distribution-legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0;
          background: transparent;
          border-radius: 0;
          transition: none;
        }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: none;
        }

        .legend-label {
          font-size: 13px;
          font-weight: 500;
          color: #334155;
          font-family: 'Cairo', sans-serif;
          text-align: right;
          line-height: 1.4;
          white-space: nowrap;
        }

        .legend-count {
          font-size: 13px;
          font-weight: 600;
          color: #1E293B;
          font-family: 'Cairo', sans-serif;
          min-width: auto;
          text-align: left;
          background: transparent;
          padding: 0;
          border-radius: 0;
        }

        /* Weekly Sessions - Redesigned with Fixed Height */
        .weekly-sessions-container-fixed {
          background: #ffffff;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 14px 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          height: 140px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .weekly-sessions-header-fixed {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          height: 28px;
          flex-shrink: 0;
        }

        .weekly-sessions-title-section {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .weekly-sessions-icon-fixed {
          color: #2563EB;
          font-size: 18px;
        }

        .weekly-sessions-title-fixed {
          font-size: 15px;
          font-weight: 700;
          color: #1E293B;
          margin: 0;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .weekly-sessions-nav-fixed {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .weekly-nav-btn-fixed {
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
          color: #475569;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          width: 24px;
          height: 24px;
        }

        .weekly-nav-btn-fixed:hover {
          background: #E2E8F0;
          color: #1E293B;
        }

        .weekly-date-range-fixed {
          font-size: 11px;
          color: #64748B;
          font-weight: 500;
          font-family: 'Cairo', 'Almarai', sans-serif;
          white-space: nowrap;
        }

        .weekly-sessions-grid-fixed {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          height: 88px;
          flex-shrink: 0;
        }

        .weekly-day-card-fixed {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6px 4px;
          background: #FFFFFF;
          border-radius: 8px;
          border: 0.5px solid #E2E8F0;
          height: 88px;
          transition: all 0.2s ease;
        }

        .weekly-day-card-fixed.today-fixed {
          background: #EFF6FF;
          border: 2px solid #2563EB;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
        }

        .weekly-day-name-fixed {
          font-size: 11px;
          font-weight: 600;
          color: #475569;
          font-family: 'Cairo', 'Almarai', sans-serif;
          margin-bottom: 4px;
          line-height: 1.2;
        }

        .weekly-day-date-fixed {
          font-size: 10px;
          color: #64748B;
          font-family: 'Cairo', 'Almarai', sans-serif;
          margin-bottom: 6px;
          line-height: 1.2;
        }

        .weekly-day-count-fixed {
          font-size: 12px;
          font-weight: 700;
          color: #1E293B;
          font-family: 'Cairo', 'Almarai', sans-serif;
          line-height: 1.2;
        }

        .weekly-day-card-fixed.today-fixed .weekly-day-count-fixed {
          color: #2563EB;
        }

        /* Work Schedule Card */
        .work-schedule-card {
          background: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          overflow: hidden;
        }

        .agenda-nav-buttons {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .agenda-nav-btn {
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 8px 12px;
          cursor: pointer;
          color: #475569;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .agenda-nav-btn:hover {
          background: #E2E8F0;
          color: #1E293B;
          border-color: hsl(217, 91%, 55%);
        }

        .agenda-nav-btn-current {
          background: hsl(217, 91%, 55%);
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          cursor: pointer;
          color: white;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
          font-family: 'Cairo', sans-serif;
          box-shadow: 0 0 20px hsl(217, 91%, 55% / 0.3);
        }

        .agenda-nav-btn-current:hover {
          background: hsl(217, 91%, 45%);
          box-shadow: 0 0 20px hsl(217, 91%, 55% / 0.4);
          transform: translateY(-1px);
        }

        .agenda-date-range-modern {
          font-size: 13px;
          color: #64748B;
          font-weight: 500;
          font-family: 'Cairo', sans-serif;
          padding: 0 12px;
        }

        /* Integrated Weekly Sessions Summary */
        .weekly-sessions-summary-integrated {
          background: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 10px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }

        .weekly-sessions-summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #F1F5F9;
        }

        .weekly-sessions-summary-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 700;
          color: #1E293B;
          font-family: 'Cairo', sans-serif;
        }

        .weekly-sessions-icon-summary {
          color: hsl(217, 91%, 55%);
          font-size: 18px;
        }

        .weekly-sessions-summary-date {
          font-size: 13px;
          color: #64748B;
          font-weight: 500;
          font-family: 'Cairo', sans-serif;
        }

        .weekly-sessions-grid-integrated {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }

        .weekly-day-card-integrated {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px 8px;
          background: #FFFFFF;
          border: 0.5px solid #E2E8F0;
          border-radius: 10px;
          transition: all 0.2s ease;
          text-align: center;
          min-height: 100px;
          width: 100%;
        }

        .weekly-day-card-integrated:hover {
          /* background: #F1F5F9; */
          /* border-color: hsl(217, 91%, 55%); */
          /* transform: translateY(-2px); */
          /* box-shadow: 0 2px 8px hsl(217, 91%, 55% / 0.2); */
        }

        .weekly-day-card-integrated.today-integrated {
          background: hsl(217, 91%, 55% / 0.1);
          border: 2px solid hsl(217, 91%, 55%);
          box-shadow: 0 0 20px hsl(217, 91%, 55% / 0.3);
        }

        .weekly-day-card-integrated.has-sessions {
          border-color: hsl(217, 91%, 55%);
          background: hsl(217, 91%, 55% / 0.05);
        }

        .weekly-day-name-integrated {
          font-size: 13px;
          font-weight: 700;
          color: #475569;
          font-family: 'Cairo', sans-serif;
          margin-bottom: 6px;
        }

        .weekly-day-card-integrated.today-integrated .weekly-day-name-integrated {
          color: hsl(217, 91%, 55%);
        }

        .weekly-day-date-integrated {
          font-size: 12px;
          color: #64748B;
          font-weight: 500;
          font-family: 'Cairo', sans-serif;
          margin-bottom: 8px;
        }

        .weekly-day-count-integrated {
          font-size: 12px;
          color: #94A3B8;
          font-weight: 500;
          font-family: 'Cairo', sans-serif;
        }

        .weekly-day-count-integrated.has-sessions-count {
          color: hsl(217, 91%, 55%);
          font-weight: 700;
          background: hsl(217, 91%, 55% / 0.15);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
        }

        .calendar-grid-container-modern {
          margin-top: 16px;
        }

        .calendar-grid-header-modern {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 8px;
        }

        .calendar-grid-header-cell-modern {
          text-align: center;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          font-family: 'Cairo', sans-serif;
          padding: 10px 4px;
        }

        .calendar-grid-body-modern {
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: #FFFFFF;
          width: 100%;
        }

        .calendar-week-row-modern {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px;
          background: #FFFFFF;
          width: 100%;
        }

        .calendar-grid-cell-modern {
          min-height: 110px;
          padding: 6px;
          background: #FFFFFF;
          border: 0.5px solid #E2E8F0;
          border-radius: 12px;
          transition: all 0.2s ease;
        }
        
        .calendar-grid-cell-modern.calendar-cell-empty-placeholder {
          background: transparent;
          border: none;
          min-height: 0;
          padding: 0;
        }

        .calendar-grid-cell-modern.current-week-cell {
          background: hsl(217, 91%, 55% / 0.05);
          border-color: hsl(217, 91%, 55% / 0.2);
        }

        .calendar-grid-cell-modern.today-cell {
          background: #3B82F6;
          border: 2px solid #2563EB;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
        }

        .calendar-grid-cell-modern.has-sessions-cell {
          border-right: 3px solid hsl(217, 91%, 55%);
        }

        .calendar-week-row-modern.current-week-highlight {
          background: none;
          border-radius: 8px;
          padding: 2px;
        }

        .calendar-cell-header-modern {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          width: 100%;
        }

        .calendar-cell-weekday {
          font-size: 12px;
          font-weight: 700;
          color: #1E293B;
          font-family: 'Cairo', sans-serif;
        }
        
        .calendar-cell-date-value {
          font-size: 12px;
          font-weight: 500;
          color: #64748B;
          font-family: 'Cairo', sans-serif;
        }

        .calendar-grid-cell-modern.today-cell .calendar-cell-weekday {
          color: #FFFFFF;
        }

        .calendar-grid-cell-modern.today-cell .calendar-cell-date-value {
          color: #FFFFFF;
          font-weight: 700;
        }

        .calendar-cell-session-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: #ffffff;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 700;
          font-family: 'Cairo', 'Almarai', sans-serif;
          box-shadow: 0 1px 3px rgba(59, 130, 246, 0.3);
          white-space: nowrap;
        }

        .session-badge-icon {
          font-size: 9px;
        }

        .calendar-cell-items-modern {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .calendar-item-modern {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 50px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Cairo', 'Almarai', sans-serif;
          white-space: nowrap;
          overflow: hidden;
        }

        .pill-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: currentColor;
          flex-shrink: 0;
        }

        .calendar-item-session-modern {
          background: #DBEAFE; /* Light blue pastel */
          color: #1E40AF;
        }

        .calendar-item-task-modern {
          background: #ffffff;
          border: 1px solid #FDE68A;
          color: #B45309;
          border-right: 4px solid #F59E0B;
        }

        .calendar-item-ended-modern {
          background: #FEE2E2; /* Light red pastel */
          color: #991B1B;
        }

        .calendar-item-reminder-modern {
          background: #FEF3C7; /* Light yellow pastel */
          color: #92400E;
          border-right: 4px solid #F59E0B;
        }

        .calendar-item-modern:hover {
          /* opacity: 0.8; */
          /* transform: translateX(-2px); */
        }

        .calendar-item-icon-modern {
          font-size: 12px;
          flex-shrink: 0;
        }

        .calendar-item-text-modern {
          flex: 1;
          font-weight: 500;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .calendar-cell-empty-modern {
          text-align: center;
          color: #CBD5E1;
          font-size: 12px;
          padding: 8px;
        }

        /* Financial Summary Card */
        .financial-status-card-modern {
          background: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          overflow: hidden;
        }

        .financial-status-card-modern .card-header-modern {
          background: linear-gradient(to left, #93c5fd 0%, #bfdbfe 40%, #eff6ff 100%);
          border-bottom: 1px solid #bfdbfe;
        }

        .financial-status-content {
          padding: 0;
        }

        .fin-rows {
          display: flex;
          flex-direction: column;
        }

        .fin-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 14px;
          border-bottom: 1px solid #f1f5f9;
          direction: rtl;
          gap: 10px;
        }

        .fin-row:last-child {
          border-bottom: none;
        }

        .fin-row-cases {
          background: #f8fafc;
        }

        .fin-row-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .fin-row-left {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .fin-row-label {
          font-size: 13px;
          font-weight: 700;
          color: #475569;
          font-family: 'Cairo', sans-serif;
          white-space: nowrap;
        }

        .fin-row-value-big {
          font-size: 16px;
          font-weight: 800;
          color: #1e293b;
          font-family: 'Cairo', sans-serif;
          line-height: 1.2;
          white-space: nowrap;
        }

        .fin-row-value-usd {
          font-size: 13px;
          font-weight: 500;
          color: #94a3b8;
          font-family: 'Cairo', sans-serif;
        }

        .fin-row-collected,
        .fin-row-pending {
          padding: 0;
          position: relative;
          display: flex;
          align-items: center;
        }

        .fin-row-accent {
          width: 4px;
          align-self: stretch;
          border-radius: 0 4px 4px 0;
          flex-shrink: 0;
        }

        .fin-row-body {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px 6px 0;
          direction: rtl;
        }

        .fin-row-badge {
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 8px;
          font-family: 'Cairo', sans-serif;
          white-space: nowrap;
          flex-shrink: 0;
          margin-left: 14px;
        }

        .fin-badge-green {
          background: #dcfce7;
          color: #16a34a;
        }

        .fin-badge-amber {
          background: #fef3c7;
          color: #d97706;
        }

        .financial-progress-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .financial-progress-bar {
          flex: 1;
          height: 10px;
          background: #E2E8F0;
          border-radius: 5px;
          overflow: hidden;
        }

        .financial-progress-fill {
          height: 100%;
          background: hsl(217, 91%, 55%);
          border-radius: 5px;
          transition: width 0.3s ease;
        }

        .financial-rate-value {
          font-size: 18px;
          font-weight: 700;
          color: hsl(217, 91%, 55%);
          font-family: 'Cairo', sans-serif;
          min-width: 50px;
        }

        /* Daily Tasks Card */
        .daily-tasks-card-modern {
          background: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          overflow: hidden;
        }

        .tasks-completion-badge {
          background: hsl(152, 76%, 40% / 0.15);
          color: hsl(152, 76%, 40%);
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          font-family: 'Cairo', sans-serif;
        }

        .daily-tasks-content {
          padding: 8px;
        }

        .daily-tasks-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .daily-task-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 10px;
          background: #F8FAFC;
          border-radius: 6px;
          border-right: 3px solid hsl(217, 91%, 55%);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .daily-task-item:hover {
          /* background: #F1F5F9; */
        }

        .daily-task-item.completed {
          opacity: 0.6;
        }

        .daily-task-item.completed .task-title-modern {
          text-decoration: line-through;
        }

        .task-status-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        .task-completed-icon {
          color: hsl(152, 76%, 40%);
          font-size: 18px;
        }

        .task-pending-icon {
          width: 14px;
          height: 14px;
          border: 2px solid #CBD5E1;
          border-radius: 50%;
          background: #ffffff;
        }

        .task-content-wrapper {
          flex: 1;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          min-width: 0;
        }

        .task-title-modern {
          font-size: 13px;
          font-weight: 600;
          color: #1E293B;
          font-family: 'Cairo', sans-serif;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }

        .task-time-modern {
          font-size: 11px;
          color: #64748B;
          font-family: 'Cairo', sans-serif;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .tasks-empty-state-modern {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
        }

        .tasks-empty-icon-modern {
          font-size: 48px;
          color: #CBD5E1;
          margin-bottom: 12px;
        }

        .tasks-empty-text-modern {
          font-size: 14px;
          color: #94A3B8;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        /* Important Dates Card */
        .important-appointments-card {
          background: #ffffff;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }

        .appointments-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 12px;
        }

        .appointment-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px;
          background: #F8FAFC;
          border-radius: 8px;
          border-right: 3px solid hsl(217, 91%, 55%);
          border: 1px solid #E2E8F0;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .appointment-item:hover {
          /* background: #F1F5F9; */
          /* border-color: #CBD5E1; */
        }

        .appointment-item.appointment-high {
          border-right-color: hsl(0, 84%, 60%);
          background: hsl(0, 84%, 60% / 0.1);
        }

        .appointment-item.appointment-medium {
          border-right-color: hsl(38, 92%, 50%);
          background: hsl(38, 92%, 50% / 0.1);
        }

        .appointment-icon {
          font-size: 18px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .appointment-content {
          flex: 1;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .appointment-title {
          font-size: 14px;
          font-weight: 600;
          color: #1E293B;
          font-family: 'Cairo', sans-serif;
        }

        .appointment-date {
          font-size: 13px;
          color: #64748B;
          font-family: 'Cairo', sans-serif;
        }

        .appointments-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
        }

        .appointments-empty-icon {
          font-size: 48px;
          color: #CBD5E1;
          margin-bottom: 12px;
        }

        .appointments-empty-text {
          font-size: 14px;
          color: #94A3B8;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        /* Compact Chart Content Wrapper - Horizontal (old) */
        .chart-content-wrapper {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 8px 0;
          min-height: 120px;
        }

        /* Horizontal Chart Content Wrapper - Legend left, Chart right */
        .chart-content-wrapper-horizontal {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          gap: 12px;
          padding: 4px 0;
          min-height: auto;
        }

        /* Vertical Chart Content Wrapper - Chart above legend */
        .chart-content-wrapper-vertical {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 0;
          min-height: auto;
        }

        /* Compact Donut Chart */
        .donut-chart-container-compact {
          flex-shrink: 0;
          display: flex;
          justify-content: center;
          width: 100%;
          margin-bottom: 0;
          margin-top: 0;
        }

        .donut-chart-compact {
          width: 110px;
          height: 110px;
          border-radius: 50%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 4px solid transparent;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: transform 0.2s ease;
          margin-top: 0;
        }

        .donut-chart-compact:hover {
          /* transform: scale(1.02); */
        }

        .donut-chart-compact::before {
          content: '';
          position: absolute;
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: #FFFFFF;
          z-index: 1;
        }

        .donut-chart-center-compact {
          position: relative;
          z-index: 2;
          text-align: center;
        }

        .donut-center-value-compact {
          font-size: 18px;
          font-weight: 700;
          color: #1E293B;
          font-family: 'Cairo', 'Almarai', sans-serif;
          line-height: 1.2;
        }

        .donut-center-label-compact {
          font-size: 10px;
          font-weight: 500;
          color: #64748B;
          font-family: 'Cairo', 'Almarai', sans-serif;
          margin-top: 2px;
        }

        /* Compact Legend */
        .chart-legend-compact {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          width: 100%;
          padding: 0 2px;
          max-height: 180px;
          overflow-y: auto;
        }

        .chart-legend-single-column {
          grid-template-columns: repeat(3, 1fr);
          overflow-y: visible;
          max-height: none;
          gap: 4px;
        }

        .chart-content-wrapper-horizontal .chart-legend-compact {
          flex: 1;
          max-width: none;
          min-width: 0;
        }

        .chart-content-wrapper-horizontal .donut-chart-container-compact {
          flex: 0 0 auto;
          width: auto;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chart-legend-compact::-webkit-scrollbar {
          width: 4px;
        }

        .chart-legend-compact::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 2px;
        }

        .chart-legend-compact::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }

        .chart-legend-compact::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .legend-item-compact {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 5px;
          border-radius: 4px;
          transition: background-color 0.2s ease;
        }

        .legend-item-compact:hover {
          /* background-color: #f8fafc; */
        }

        .legend-color-swatch {
          width: 10px;
          height: 10px;
          border-radius: 3px;
          flex-shrink: 0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .legend-text-compact {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex: 1;
          gap: 6px;
          min-width: 0;
        }

        .legend-label-compact {
          font-size: 11px;
          color: #475569;
          font-weight: 500;
          font-family: 'Cairo', 'Almarai', sans-serif;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .legend-percentage-compact {
          font-size: 12px;
          color: #1E293B;
          font-weight: 700;
          font-family: 'Cairo', 'Almarai', sans-serif;
          white-space: nowrap;
        }

        /* File Distribution */
        .file-distribution-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 16px;
        }

        .distribution-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0;
          position: relative;
        }

        .distribution-item-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          position: relative;
          min-height: 32px;
        }

        .distribution-bar {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          height: 24px;
          border-radius: 6px;
          min-width: 40px;
          transition: width 0.3s ease;
          opacity: 0.8;
        }

        .distribution-name {
          font-size: 13px;
          color: #1E293B;
          font-weight: 500;
          position: relative;
          z-index: 2;
          padding-right: 12px;
          padding-left: 12px;
          white-space: nowrap;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .distribution-count {
          font-size: 13px;
          font-weight: 600;
          color: #1E293B;
          position: relative;
          z-index: 2;
          background: #FFFFFF;
          padding-left: 8px;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .distribution-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid #E2E8F0;
          margin-top: 8px;
        }

        .distribution-total-label {
          font-size: 13px;
          color: #64748B;
          font-weight: 500;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .distribution-total-value {
          font-size: 14px;
          font-weight: 700;
          color: #1E293B;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        /* Weekly Sessions */
        .sessions-card {
          position: relative;
          padding: 10px 14px 8px 14px !important;
          display: flex;
          flex-direction: column;
        }

        .sessions-card .card-header {
          margin-bottom: 6px !important;
          min-height: 24px;
        }

        .card-title-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sessions-header-separator {
          height: 2px;
          background: linear-gradient(90deg, #2563EB 0%, #3B82F6 100%);
          border-radius: 2px;
          margin: 0 0 12px 0;
        }

        .card-title-icon-wrapper {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .weekly-sessions-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 0;
          padding: 2px 0 0 0;
          align-items: stretch;
        }

        .session-day-card {
          text-align: center;
          padding: 10px 6px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: 4px;
          position: relative;
          overflow: hidden;
        }

        .session-day-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: transparent;
          transition: all 0.3s ease;
        }

        .session-day-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(37, 99, 235, 0.02) 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }


        .session-day-card:hover::after {
          opacity: 1;
        }

        .session-day-card.active {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-color: #3b82f6;
        }

        .session-day-card.active::before {
          background: linear-gradient(90deg, #2563EB 0%, #3B82F6 100%);
        }

        .session-day-card.active::after {
          opacity: 1;
        }

        .session-day-card.today {
          border-color: #2563EB;
          background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
        }

        .session-day-card.today::before {
          background: linear-gradient(90deg, #2563EB 0%, #3B82F6 100%);
        }

        .session-day-card.today::after {
          opacity: 1;
        }

        .session-day-card.today.active {
          background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
          border-color: #2563EB;
        }

        .session-day-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          position: relative;
          z-index: 1;
        }

        .session-day-name {
          font-weight: 600;
          color: #1E293B;
          font-size: 13px;
          font-family: 'Cairo', 'Almarai', sans-serif;
          line-height: 1.2;
        }

        .session-day-card.active .session-day-name {
          color: #2563EB;
        }

        .today-badge {
          background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%);
          color: #FFFFFF;
          font-size: 9px;
          font-weight: 700;
          padding: 3px 7px;
          border-radius: 4px;
          font-family: 'Cairo', 'Almarai', sans-serif;
          white-space: nowrap;
        }

        .session-day-date {
          font-size: 12px;
          color: #64748B;
          margin-bottom: 0;
          line-height: 1.2;
          font-weight: 500;
          font-family: 'Cairo', 'Almarai', sans-serif;
          position: relative;
          z-index: 1;
        }

        .session-day-card.active .session-day-date {
          color: #2563EB;
          font-weight: 600;
        }

        .session-day-card.today .session-day-date {
          color: #2563EB;
          font-weight: 600;
        }

        .session-count-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          margin-top: auto;
          padding-top: 2px;
          position: relative;
          z-index: 1;
        }

        .session-day-count {
          font-size: 22px;
          font-weight: 700;
          color: #64748B;
          line-height: 1;
          font-family: 'Cairo', 'Almarai', sans-serif;
          transition: all 0.3s ease;
        }

        .session-day-card.active .session-day-count {
          color: #2563EB;
          font-size: 24px;
        }

        .session-day-card.today .session-day-count {
          color: #2563EB;
          font-size: 24px;
        }

        .session-day-card.today.active .session-day-count {
          color: #2563EB;
          font-size: 24px;
        }

        .session-day-label {
          font-size: 11px;
          color: #94A3B8;
          font-weight: 500;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .session-day-card.active .session-day-label {
          color: #2563EB;
          font-weight: 600;
        }

        /* Week Sessions Info Section */
        .week-sessions-info-section {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 2px solid #E2E8F0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .week-session-info-item {
          padding: 10px 14px;
          background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
          border: 1px solid #BFDBFE;
          border-radius: 8px;
          color: #1E40AF;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Cairo', 'Almarai', sans-serif;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: right;
        }

        .week-total {
          display: flex;
          justify-content: center;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid #E2E8F0;
          margin-top: 2px;
        }

        .week-total-content {
          display: flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid #E2E8F0;
        }

        .week-total-label {
          font-size: 13px;
          color: #64748B;
          font-weight: 500;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .week-total-value {
          font-size: 16px;
          font-weight: 700;
          color: #2563EB;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        /* Cases List */
        .cases-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .case-item-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.2s ease;
        }


        .case-item-icon {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
          flex-shrink: 0;
        }

        .case-item-content {
          flex: 1;
        }

        .case-item-title {
          font-size: 14px;
          font-weight: 600;
          color: #1E293B;
          margin-bottom: 4px;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .case-item-subtitle {
          font-size: 13px;
          color: #64748B;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .case-item-check {
          color: #22C55E;
          font-size: 20px;
        }

        /* Empty and Loading States */
        .empty-state,
        .loading-state {
          text-align: center;
          padding: 32px;
          color: #64748B;
          font-size: 13px;
        }

        /* Integrated Calendar Design */
        .integrated-calendar-card {
          position: relative;
          padding: 16px;
          margin-bottom: 20px;
          flex: 0 0 auto;
        }

        .calendar-header-section {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid #E2E8F0;
        }

        .calendar-title-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
        }

        .calendar-title-icon {
          font-size: 20px;
          color: #2563EB;
          flex-shrink: 0;
        }

        .calendar-title {
          font-size: 18px;
          font-weight: 700;
          color: #1E293B;
          margin: 0;
          font-family: 'Cairo', 'Almarai', sans-serif;
          white-space: nowrap;
        }

        .calendar-date-range {
          font-size: 13px;
          color: #64748B;
          font-family: 'Cairo', 'Almarai', sans-serif;
          margin-right: auto;
          white-space: nowrap;
        }

        .week-summary-cards {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          margin-bottom: 0;
        }

        .week-day-card {
          padding: 12px 10px;
          border-radius: 10px;
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          text-align: center;
          transition: all 0.2s ease;
          min-height: 95px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        .week-day-card.active {
          background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
          border-color: #3B82F6;
          border-width: 2px;
        }

        .week-day-card.today {
          background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%);
          border-color: #2563EB;
          border-width: 2px;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
        }

        .week-day-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .week-day-name {
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          font-family: 'Cairo', 'Almarai', sans-serif;
          margin-bottom: 4px;
        }

        .week-day-card.active .week-day-name {
          color: #2563EB;
        }

        .week-today-badge {
          font-size: 8px;
          padding: 2px 5px;
          background: #2563EB;
          color: #FFFFFF;
          border-radius: 3px;
          font-weight: 600;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .week-day-date {
          font-size: 10px;
          color: #64748B;
          margin-bottom: 6px;
          font-family: 'Cairo', 'Almarai', sans-serif;
          font-weight: 500;
        }

        .week-day-count {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          margin-top: auto;
        }

        .week-day-count-number {
          font-size: 18px;
          font-weight: 700;
          color: #1E293B;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .week-day-card.active .week-day-count-number {
          color: #2563EB;
        }

        .week-day-count-label {
          font-size: 9px;
          color: #94A3B8;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        /* Weekly Sessions Summary Card */
        .weekly-sessions-summary-card {
          padding: 16px;
        }

        /* Agenda Calendar Card */
        .agenda-calendar-card {
          padding: 16px;
        }

        .agenda-header-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #E2E8F0;
        }

        .agenda-title-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .agenda-title-icon {
          font-size: 20px;
          color: #2563EB;
        }

        .agenda-title {
          font-size: 18px;
          font-weight: 700;
          color: #1E293B;
          margin: 0;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .agenda-nav-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .agenda-date-range {
          font-size: 12px;
          color: #64748B;
          font-family: 'Cairo', 'Almarai', sans-serif;
          padding: 0 8px;
        }

        .calendar-tasks-section {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #E2E8F0;
        }

        .calendar-tasks-header {
          margin-bottom: 12px;
        }

        .calendar-tasks-title-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .calendar-tasks-icon {
          font-size: 18px;
        }

        .calendar-tasks-title {
          font-size: 16px;
          font-weight: 700;
          color: #1E293B;
          margin: 0;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .calendar-grid-container {
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          overflow: hidden;
        }

        .calendar-grid-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
          border-bottom: 2px solid #E2E8F0;
        }

        .calendar-grid-header-cell {
          padding: 10px 8px;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          color: #1E293B;
          font-family: 'Cairo', 'Almarai', sans-serif;
          border-right: 1px solid #E2E8F0;
        }

        .calendar-grid-header-cell:last-child {
          border-right: none;
        }

        .calendar-grid-body {
          display: flex;
          flex-direction: column;
        }

        .calendar-week-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
        }

        .calendar-grid-cell {
          min-height: 150px;
          padding: 10px 8px;
          border-right: 1px solid #E2E8F0;
          border-bottom: 1px solid #E2E8F0;
          background: #FFFFFF;
          position: relative;
        }

        .calendar-week-row .calendar-grid-cell:last-child {
          border-right: none;
        }

        .calendar-cell-date {
          font-size: 11px;
          font-weight: 600;
          color: #64748B;
          margin-bottom: 8px;
          font-family: 'Cairo', 'Almarai', sans-serif;
          padding-bottom: 6px;
          border-bottom: 1px solid #F1F5F9;
        }

        .calendar-cell-items {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .calendar-cell-empty {
          font-size: 11px;
          color: #CBD5E1;
          text-align: center;
          padding: 8px 0;
        }

        .calendar-item {
          padding: 8px 10px;
          border-radius: 6px;
          font-size: 11px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Cairo', 'Almarai', sans-serif;
          margin-bottom: 6px;
          line-height: 1.4;
        }

        .calendar-item:last-child {
          margin-bottom: 0;
        }

        .calendar-item-session {
          background: #FFFFFF;
          border: 1px solid #BFDBFE;
          color: #1E40AF;
        }

        .calendar-item-session:hover {
          background: #EFF6FF;
          border-color: #93C5FD;
        }

        .calendar-item-task {
          background: #FFFBEB;
          border: 1px solid #FDE68A;
          color: #92400E;
        }

        .calendar-item-task:hover {
          background: #FEF3C7;
          border-color: #FCD34D;
        }

        .calendar-item-task.overdue {
          background: #FEE2E2;
          border-color: #FCA5A5;
          color: #991B1B;
        }

        .calendar-item-task.overdue:hover {
          background: #FECACA;
          border-color: #F87171;
        }

        .calendar-item-ended {
          background: #FEE2E2;
          border-color: #FCA5A5;
          color: #991B1B;
        }

        .calendar-item-ended:hover {
          background: #FECACA;
          border-color: #F87171;
        }

        .calendar-item-icon {
          font-size: 14px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .calendar-item-text {
          flex: 1;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          font-weight: 500;
        }

        .weekly-session-day-card {
          text-align: center;
          padding: 12px 8px;
          border-radius: 12px;
          border: 1.5px solid #e2e8f0;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
          position: relative;
          overflow: hidden;
          min-height: 100px;
        }

        .weekly-session-day-card.active {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-color: #3b82f6;
        }

        .weekly-session-day-card.today {
          border-color: #2563EB;
          border-width: 2px;
        }

        .weekly-session-day-card.active::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #2563EB 0%, #3B82F6 100%);
        }

        .weekly-session-day-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          width: 100%;
          position: relative;
          z-index: 1;
        }

        .weekly-session-day-name {
          font-size: 13px;
          font-weight: 700;
          color: #64748B;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .weekly-session-day-card.active .weekly-session-day-name {
          color: #2563EB;
        }

        .weekly-today-badge {
          background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%);
          color: #FFFFFF;
          font-size: 9px;
          font-weight: 700;
          padding: 3px 6px;
          border-radius: 4px;
          font-family: 'Cairo', 'Almarai', sans-serif;
          white-space: nowrap;
        }

        .weekly-session-day-date {
          font-size: 12px;
          color: #64748B;
          margin-bottom: 0;
          line-height: 1.2;
          font-weight: 600;
          font-family: 'Cairo', 'Almarai', sans-serif;
          position: relative;
          z-index: 1;
        }

        .weekly-session-day-card.active .weekly-session-day-date {
          color: #2563EB;
          font-weight: 600;
        }

        .weekly-session-count-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
          margin-top: auto;
          padding-top: 2px;
          position: relative;
          z-index: 1;
        }

        .weekly-session-day-count {
          font-size: 24px;
          font-weight: 700;
          color: #64748B;
          line-height: 1;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .weekly-session-day-card.active .weekly-session-day-count {
          color: #2563EB;
          font-size: 26px;
        }

        .weekly-session-day-label {
          font-size: 9px;
          color: #94A3B8;
          font-weight: 500;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .weekly-session-day-card.active .weekly-session-day-label {
          color: #2563EB;
          font-weight: 600;
        }

        .weekly-sessions-list-section {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 2px solid #E2E8F0;
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 200px;
          overflow: hidden;
        }

        .weekly-session-list-item {
          padding: 10px 14px;
          background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
          border: 1px solid #BFDBFE;
          border-radius: 10px;
          color: #1E40AF;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Cairo', 'Almarai', sans-serif;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: right;
          transition: all 0.2s ease;
        }

        .weekly-session-list-item:hover {
          background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%);
          transform: translateX(-2px);
        }

        /* Cases Financial Bar Chart */
        .cases-financial-chart-card {
          position: relative;
          padding: 16px 16px 4px 16px;
          margin-top: 0;
        }

        .financial-chart-container {
          margin-top: 8px;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        
        .financial-chart-container canvas {
          display: block;
          max-height: 100%;
        }

        .financial-empty-template {
          opacity: 0.6;
        }

        .financial-empty-chart {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
        }

        .financial-empty-chart .empty-state {
          color: #94A3B8;
          font-size: 14px;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        /* Improved Financial Overview */
        .financial-overview-improved {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 12px;
        }

        /* Compact Financial Overview - Single Column */
        .financial-overview-compact {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 0;
        }

        .overview-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 14px;
          padding: 18px;
          border: 2px solid #e2e8f0;
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .overview-card-compact {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 8px;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .overview-card-primary {
          border-color: #C4B5FD;
          background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%);
        }

        .overview-card-success {
          border-color: #6EE7B7;
          background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
        }

        .overview-card-warning {
          border-color: #FCD34D;
          background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
        }

        .overview-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .overview-icon-wrapper-compact {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .overview-card-primary .overview-icon-wrapper {
          background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
        }

        .overview-card-success .overview-icon-wrapper {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
        }

        .overview-card-warning .overview-icon-wrapper {
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
        }

        .overview-card-primary .overview-icon-wrapper-compact {
          background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
        }

        .overview-card-success .overview-icon-wrapper-compact {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
        }

        .overview-card-warning .overview-icon-wrapper-compact {
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
        }

        .overview-icon {
          font-size: 22px;
          color: #FFFFFF;
        }

        .overview-icon-compact {
          font-size: 14px;
          color: #FFFFFF;
        }

        .overview-content {
          flex: 1;
          min-width: 0;
        }

        .overview-content-compact {
          flex: 1;
          min-width: 0;
        }

        .overview-label-improved {
          font-size: 12px;
          color: #64748B;
          font-weight: 600;
          font-family: 'Cairo', 'Almarai', sans-serif;
          margin-bottom: 6px;
          line-height: 1.3;
        }

        .overview-label-compact {
          font-size: 10px;
          color: #64748B;
          font-weight: 600;
          font-family: 'Cairo', 'Almarai', sans-serif;
          margin-bottom: 3px;
          line-height: 1.2;
        }

        .overview-value-improved {
          font-size: 20px;
          font-weight: 700;
          font-family: 'Cairo', 'Almarai', sans-serif;
          line-height: 1.2;
          margin-bottom: 3px;
          word-break: break-word;
        }

        .overview-value-compact {
          font-size: 14px;
          font-weight: 700;
          font-family: 'Cairo', 'Almarai', sans-serif;
          line-height: 1.2;
          margin-bottom: 2px;
          word-break: break-word;
        }

        .overview-value-improved.overview-value-primary {
          color: #7C3AED;
        }

        .overview-value-improved.overview-value-success {
          color: #059669;
        }

        .overview-value-improved.overview-value-warning {
          color: #D97706;
        }

        .overview-value-compact.overview-value-primary {
          color: #7C3AED;
        }

        .overview-value-compact.overview-value-success {
          color: #059669;
        }

        .overview-value-compact.overview-value-warning {
          color: #D97706;
        }

        .overview-percentage {
          font-size: 10px;
          color: #94A3B8;
          font-weight: 500;
          font-family: 'Cairo', 'Almarai', sans-serif;
          margin-top: 2px;
        }

        .overview-percentage-compact {
          font-size: 9px;
          color: #94A3B8;
          font-weight: 500;
          font-family: 'Cairo', 'Almarai', sans-serif;
          margin-top: 1px;
        }

        /* Improved Chart Section */
        .financial-chart-section {
          margin-top: 0;
          margin-bottom: 0;
        }

        .financial-bar-chart-wrapper-improved {
          padding: 12px 12px 4px 12px;
          background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%);
          border-radius: 10px;
          border: 1.5px solid #E2E8F0;
          height: 360px;
          position: relative;
        }


        /* Professional Financial Table */
        .financial-table-container {
          margin-top: 12px;
          background: #FFFFFF;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          overflow: hidden;
        }

        .financial-table-header {
          display: grid;
          grid-template-columns: 120px 1fr 140px 140px 140px 120px;
          gap: 12px;
          padding: 14px 16px;
          background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
          border-bottom: 2px solid #E2E8F0;
        }

        .table-header-cell {
          font-size: 12px;
          font-weight: 700;
          color: #1E293B;
          font-family: 'Cairo', 'Almarai', sans-serif;
          text-align: right;
          letter-spacing: -0.01em;
        }

        .financial-table-body {
          max-height: 400px;
          overflow-y: auto;
          overflow-x: visible;
        }

        .financial-table-body::-webkit-scrollbar {
          width: 6px;
        }

        .financial-table-body::-webkit-scrollbar-track {
          background: #F8FAFC;
        }

        .financial-table-body::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 3px;
        }

        .financial-table-body::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }

        .financial-table-row {
          display: grid;
          grid-template-columns: 120px 1fr 140px 140px 140px 120px;
          gap: 12px;
          padding: 14px 16px;
          border-bottom: 1px solid #F1F5F9;
          cursor: pointer;
          transition: all 0.2s ease;
          align-items: center;
        }

        .financial-table-row:hover {
          background: #F8FAFC;
          border-color: #E2E8F0;
        }

        .financial-table-row:last-child {
          border-bottom: none;
        }

        .table-cell {
          display: flex;
          align-items: center;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .case-number-badge {
          display: inline-block;
          padding: 6px 10px;
          background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
          color: #2563EB;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid #BFDBFE;
        }

        .client-name-text {
          font-size: 13px;
          color: #1E293B;
          font-weight: 600;
          line-height: 1.4;
        }

        .amount-value {
          font-size: 14px;
          font-weight: 700;
          font-family: 'Cairo', 'Almarai', sans-serif;
          letter-spacing: -0.01em;
        }

        .amount-primary {
          color: #8B5CF6;
        }

        .amount-success {
          color: #10B981;
        }

        .amount-warning {
          color: #F59E0B;
        }

        .amount-neutral {
          color: #64748B;
        }

        .progress-bar-container {
          position: relative;
          width: 100%;
          height: 24px;
          background: #F1F5F9;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          align-items: center;
        }

        .progress-bar-fill {
          position: absolute;
          right: 0;
          top: 0;
          height: 100%;
          border-radius: 12px;
          transition: width 0.3s ease;
          min-width: 4px;
        }

        .progress-percentage {
          position: relative;
          z-index: 2;
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          font-family: 'Cairo', 'Almarai', sans-serif;
          padding: 0 8px;
          width: 100%;
          text-align: center;
        }

        /* Tasks Card - Improved Compact */
        .tasks-card-improved {
          margin-bottom: 20px;
        }

        .tasks-header-modern {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .tasks-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .tasks-header-icon {
          font-size: 24px;
          color: #1E293B;
        }

        .tasks-header-title {
          font-size: 20px;
          font-weight: 700;
          color: #1E293B;
          margin: 0;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .tasks-header-link {
          font-size: 15px;
          color: #2563EB;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Cairo', 'Almarai', sans-serif;
          transition: all 0.2s ease;
        }

        .tasks-header-link:hover {
          color: #1D4ED8;
        }

        .tasks-summary-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        .task-summary-card {
          padding: 18px 20px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 2px solid transparent;
        }

        .task-summary-today {
          background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
        }

        .task-summary-upcoming {
          background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%);
        }

        .task-summary-overdue {
          background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%);
        }

        .summary-card-number {
          font-size: 32px;
          font-weight: 700;
          font-family: 'Cairo', 'Almarai', sans-serif;
          line-height: 1;
        }

        .task-summary-today .summary-card-number {
          color: #2563EB;
        }

        .task-summary-upcoming .summary-card-number {
          color: #8B5CF6;
        }

        .task-summary-overdue .summary-card-number {
          color: #DC2626;
        }

        .summary-card-content {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .summary-card-label {
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .summary-card-icon {
          font-size: 18px;
          color: #64748B;
        }

        .task-summary-today .summary-card-icon {
          color: #2563EB;
        }

        .task-summary-upcoming .summary-card-icon {
          color: #8B5CF6;
        }

        .task-summary-overdue .summary-card-icon {
          color: #DC2626;
        }

        .task-summary-card {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }

        .tasks-content-improved {
          margin-top: 0;
        }

        .tasks-list-improved {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .task-item-improved {
          padding: 14px 16px;
          background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          cursor: pointer;
          position: relative;
        }

        .task-item-improved::before {
          content: '';
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: transparent;
          border-radius: 8px 0 0 8px;
        }

        .task-item-improved.overdue {
          border-color: #FCA5A5;
          background: #FEF2F2;
        }

        .task-item-improved.overdue::before {
          background: #DC2626;
        }

        .task-item-improved.today {
          border-color: #FCD34D;
          background: #FFFBEB;
        }

        .task-item-improved.today::before {
          background: #F59E0B;
        }

        .task-item-improved.upcoming {
          border-color: #BFDBFE;
          background: #EFF6FF;
        }

        .task-item-improved.upcoming::before {
          background: #3B82F6;
        }

        .task-content-improved {
          flex: 1;
          min-width: 0;
        }

        .task-row-content {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: nowrap;
          overflow: hidden;
          width: 100%;
        }

        .task-title-improved {
          font-size: 16px;
          font-weight: 600;
          color: #1E293B;
          font-family: 'Cairo', 'Almarai', sans-serif;
          line-height: 1.3;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .task-separator {
          color: #CBD5E1;
          font-size: 12px;
          flex-shrink: 0;
        }

        .task-date-text {
          font-weight: 500;
          font-family: 'Arial', sans-serif;
          font-size: 14px;
          color: #64748B;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .task-details-text {
          font-size: 14px;
          color: #64748B;
          font-family: 'Cairo', 'Almarai', sans-serif;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          min-width: 0;
        }

        .task-priority-badge {
          font-weight: 600;
          font-size: 14px;
          white-space: nowrap;
          flex-shrink: 0;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .task-case-badge {
          background: #E0F2FE;
          color: #0369A1;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 12px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .task-status-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 8px;
          height: 8px;
          flex-shrink: 0;
        }

        .overdue-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #DC2626;
        }

        .today-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #F59E0B;
        }

        .upcoming-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #3B82F6;
        }

        .empty-section-improved {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: #94A3B8;
          font-size: 13px;
          font-family: 'Cairo', 'Almarai', sans-serif;
          gap: 8px;
        }

        .empty-icon {
          font-size: 24px;
          color: #CBD5E1;
          opacity: 0.5;
        }

        /* Recent Activity Feed */
        .recent-activity-card {
          margin-bottom: 20px;
        }

        .activity-feed {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 12px;
        }

        .activity-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px;
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          border-radius: 12px;
          border: 2px solid #e2e8f0;
        }

        .activity-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 20px;
          border: 2px solid #e2e8f0;
        }

        .activity-content {
          flex: 1;
        }

        .activity-title {
          font-size: 14px;
          font-weight: 600;
          color: #1E293B;
          font-family: 'Cairo', 'Almarai', sans-serif;
          margin-bottom: 4px;
        }

        .activity-details {
          font-size: 13px;
          color: #64748B;
          font-family: 'Cairo', 'Almarai', sans-serif;
          margin-bottom: 6px;
        }

        .activity-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 11px;
          color: #94A3B8;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .activity-case {
          background: #E0F2FE;
          color: #0369A1;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }

        .activity-date {
          color: #94A3B8;
        }

        /* Client Portal Interactions Card */
        .client-interactions-card {
          margin-bottom: 20px;
        }

        .client-interactions-modern {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 12px;
        }

        .interaction-item-refined {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px;
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          border-radius: 12px;
          border: 2px solid #e2e8f0;
        }

        .interaction-icon-box {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .interaction-content {
          flex: 1;
        }

        /* Expense Summary Card */
        .expense-summary-card {
          margin-bottom: 20px;
        }

        .expense-summary-card .card-header-modern {
          background: linear-gradient(to left, #f3e8ff 0%, #faf5ff 40%, #fdf4ff 100%);
          border-bottom: 1px solid #f3e8ff;
        }

        .expense-summary-modern {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 12px;
        }

        /* Compact Tasks Design */
        .tasks-card-compact {
          padding: 12px;
          background: #FFFFFF;
          border-radius: 10px;
          border: 1px solid #E2E8F0;
        }

        .tasks-header-compact {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .tasks-add-button {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 2px dashed #CBD5E1;
          background: #F8FAFC;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tasks-add-button:hover {
          border-color: #2563EB;
          background: #EFF6FF;
        }

        .tasks-add-icon {
          font-size: 18px;
          color: #64748B;
        }

        .tasks-add-button:hover .tasks-add-icon {
          color: #2563EB;
        }

        .tasks-title-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tasks-title-compact {
          font-size: 16px;
          font-weight: 700;
          color: #1E293B;
          margin: 0;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .tasks-calendar-icon {
          font-size: 18px;
          color: #2563EB;
          background: #EFF6FF;
          padding: 6px;
          border-radius: 6px;
        }

        .tasks-content-compact {
          min-height: 200px;
        }

        .tasks-list-compact {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .task-item-compact {
          padding: 10px 12px;
          background: #F8FAFC;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .task-item-compact:hover {
          background: #F1F5F9;
          border-color: #CBD5E1;
        }

        .task-item-compact.overdue {
          border-color: #FEE2E2;
          background: #FEF2F2;
        }

        .task-item-compact.today {
          border-color: #DBEAFE;
          background: #EFF6FF;
        }

        .task-item-compact-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .task-title-compact {
          font-size: 13px;
          font-weight: 600;
          color: #1E293B;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .task-date-compact {
          font-size: 11px;
          color: #64748B;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .tasks-empty-state-compact {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
        }

        .tasks-empty-icon-wrapper {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          background: #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .tasks-empty-icon {
          font-size: 28px;
          color: #94A3B8;
        }

        .tasks-empty-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tasks-empty-title {
          font-size: 14px;
          font-weight: 600;
          color: #475569;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .tasks-empty-subtitle {
          font-size: 12px;
          color: #94A3B8;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        /* Compact Financial Overview */
        .financial-overview-compact {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .overview-card-compact {
          padding: 10px 12px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .overview-icon-wrapper-compact {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .overview-icon-compact {
          font-size: 14px;
          color: #FFFFFF;
        }

        .overview-content-compact {
          flex: 1;
          min-width: 0;
        }

        .overview-label-compact {
          font-size: 10px;
          color: #64748B;
          font-weight: 600;
          font-family: 'Cairo', 'Almarai', sans-serif;
          margin-bottom: 3px;
          line-height: 1.2;
        }

        .overview-value-compact {
          font-size: 14px;
          font-weight: 700;
          font-family: 'Cairo', 'Almarai', sans-serif;
          line-height: 1.2;
          word-break: break-word;
        }

        /* Mobile App Dashboard Styling */
        .mobile-app-quick-section {
          display: block;
        }

        /* Responsive */
        @media (max-width: 1400px) {
          .dashboard {
            padding: 10px;
          }
          .dashboard-main-grid {
            grid-template-columns: 1.0fr 2.6fr 1.0fr;
            gap: 14px;
          }
          .dashboard-grid {
            grid-template-columns: 260px 1fr;
            gap: 10px;
          }
          .dashboard-financial-section {
            margin-top: 10px;
          }
          .dashboard-column-first,
          .dashboard-column-second {
            padding-right: 10px;
          }
        }

        /* Tablet Landscape (iPad 11" / Tab S8) — 1025–1280px */
        @media (min-width: 1025px) and (max-width: 1280px) {
          .dashboard {
            padding: 8px 10px;
          }
          .dashboard-main-grid {
            grid-template-columns: 0.8fr 2.4fr 0.8fr !important;
            gap: 8px;
          }
          .dashboard-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .dashboard-card {
            width: 100%;
            min-width: 0;
            padding: 12px !important;
          }
          .dashboard-column-left,
          .dashboard-column-center,
          .dashboard-column-right {
            min-width: 0;
            overflow: visible;
          }
          .calendar-container {
            width: 100%;
            max-width: 100%;
            overflow-x: auto;
          }

          /* Donut charts - properly sized for sidebar */
          .donut-chart-container-medium {
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .donut-chart-medium {
            width: 130px;
            height: 130px;
          }
          .donut-chart-medium::before {
            width: 100px;
            height: 100px;
          }
          .donut-chart-center-medium {
            width: 90px;
            height: 90px;
          }
          .donut-center-value-medium {
            font-size: 18px !important;
          }
          .donut-center-label-medium {
            font-size: 9px !important;
          }
          .donut-chart-redesigned {
            width: 130px;
            height: 130px;
          }
          .donut-chart-redesigned::before {
            width: 100px;
            height: 100px;
          }
          .donut-number-redesigned {
            font-size: 22px;
          }

          /* Card content adjustments */
          .daily-tasks-card-modern,
          .appointments-card-modern,
          .expense-summary-modern {
            width: 100%;
          }
          .card-header-modern {
            padding: 10px 12px;
          }
          .card-title-modern {
            font-size: 13px;
          }
          .case-distribution-legend {
            font-size: 11px;
            gap: 4px;
          }
          .distribution-legend-item {
            font-size: 11px;
            gap: 6px;
          }
          .case-distribution-content {
            gap: 10px;
          }

          /* Financial summary card */
          .financial-summary-card {
            padding: 12px !important;
          }

          /* Calendar header compact */
          .calendar-hero-header {
            padding: 8px 8px;
            gap: 4px;
            flex-wrap: nowrap;
          }
          .calendar-hero-right {
            gap: 6px;
            flex-shrink: 1;
            min-width: 0;
          }
          .calendar-hero-icon {
            width: 28px;
            height: 28px;
            min-width: 28px;
            font-size: 12px;
          }
          .calendar-hero-text h2 {
            font-size: 12px;
          }
          .calendar-hero-text span {
            font-size: 10px;
          }
          .calendar-hero-center {
            flex: 1;
            min-width: 0;
          }
          .calendar-legend {
            font-size: 9px;
            gap: 4px;
            flex-wrap: nowrap;
          }
          .legend-item {
            white-space: nowrap;
            font-size: 9px;
          }
          .calendar-hero-left {
            flex-shrink: 0;
          }
          .calendar-hero-left .agenda-nav-buttons {
            gap: 3px;
          }
          .calendar-hero-left .agenda-nav-btn {
            width: 24px;
            height: 24px;
            font-size: 10px;
          }
          .calendar-hero-left .agenda-date-range-modern {
            font-size: 10px;
            white-space: nowrap;
          }
          .agenda-date-range-modern {
            font-size: 10px !important;
          }
          .agenda-nav-buttons {
            gap: 4px;
          }
          .agenda-nav-btn {
            width: 26px;
            height: 26px;
            padding: 0;
          }

          /* Weekly sessions grid */
          .weekly-sessions-summary-integrated {
            font-size: 11px;
          }
        }

        @media (max-width: 1024px) {
          .dashboard {
            padding: 10px;
          }
          /* Mobile-only dashboard: no horizontal gutter so title strips span full width */
          .dashboard:has(.mobile-dashboard-layout) {
            padding-left: 0 !important;
            padding-right: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 16px !important;
          }
          .dashboard-main-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .dashboard-column-1,
          .dashboard-column-2,
          .dashboard-column-3 {
            width: 100%;
          }
          .dashboard-grid {
            grid-template-columns: 320px 1fr;
            gap: 10px;
          }
          .dashboard-column-first {
            border-right: 1px solid #E2E8F0;
            padding-right: 10px;
          }
          .dashboard-column-second {
            border-right: none;
            padding-right: 0;
          }
          .dashboard-column-third {
            grid-column: 1 / -1;
            border-top: 1px solid #E2E8F0;
            padding-top: 12px;
            margin-top: 12px;
          }
          .chart-legend-compact {
            grid-template-columns: 1fr;
          }
          }
          .quick-create-buttons-row {
            gap: 8px;
            margin-bottom: 16px;
          }
          .quick-create-search-wrapper {
            min-width: 200px;
            max-width: 400px;
            flex: 0 1 auto;
          }
          .quick-create-btn {
            min-width: 100px;
            padding: 8px 12px;
            font-size: 13px;
          }
          .quick-create-icon {
            font-size: 14px;
            width: 14px;
            height: 14px;
          }
          .quick-create-search {
            padding: 8px 12px;
            font-size: 13px;
          }
          .quick-create-search-btn {
            padding: 8px 12px;
            font-size: 14px;
            min-width: 40px;
          }
          .dashboard-card {
            padding: 10px;
            margin-bottom: 12px;
          }
          .card-header-modern {
            margin: -10px -10px 0 -10px;
            padding-left: 20px;
            padding-right: 20px;
          }
          .weekly-sessions-container-fixed {
            height: 140px;
            padding: 12px 14px;
          }
          .financial-overview-improved {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .overview-value-improved {
            font-size: 16px;
          }
          .financial-bar-chart-wrapper-improved {
            height: 340px;
            padding: 12px;
          }
        }

        @media (max-width: 1024px) {
          .dashboard {
            padding: 8px;
          }
          .dashboard-main-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .donut-chart-redesigned {
            width: 140px;
            height: 140px;
          }
          .donut-chart-redesigned::before {
            width: 108px;
            height: 108px;
          }
          .donut-number-redesigned {
            font-size: 28px;
          }
          .weekly-sessions-container-fixed {
            height: 140px;
            padding: 12px 14px;
          }
          .weekly-sessions-grid-fixed {
            grid-template-columns: repeat(4, 1fr);
            gap: 4px;
            height: 88px;
          }
          .weekly-sessions-grid-fixed > div:nth-child(n+5) {
            display: none;
          }
          .weekly-day-card-fixed {
            height: 88px;
            padding: 4px 3px;
          }
          .dashboard-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .dashboard-column-first,
          .dashboard-column-second,
          .dashboard-column-third {
            border-right: none;
            border-top: 1px solid #E2E8F0;
            padding-right: 0;
            padding-top: 12px;
            margin-top: 12px;
          }
          .dashboard-column-first {
            border-top: none;
            margin-top: 0;
            padding-top: 0;
          }
          .quick-create-buttons {
            justify-content: center;
          }
          .weekly-sessions-grid {
            grid-template-columns: repeat(4, 1fr);
          }
          .weekly-sessions-grid > div:nth-child(n+5) {
            display: none;
          }
          .weekly-sessions-view-grid {
            grid-template-columns: repeat(4, 1fr);
          }
          .chart-legend-single-column {
            grid-template-columns: repeat(2, 1fr);
          }
          .weekly-sessions-view-grid > div:nth-child(n+5) {
            display: none;
          }
        }

        /* iPad Portrait Mode (768px-1024px) - Reduce card widths */
        @media (min-width: 768px) and (max-width: 1024px) {
          /* Constrain parent layout */
          .mobile-dashboard-layout {
            max-width: 85% !important;
            margin: 0 auto !important;
            padding: 0 12px !important;
          }

          /* Reduce calendar grid cell widths */
          .calendar-grid-cell-modern {
            padding: 8px !important;
            min-height: 90px !important;
            max-width: 100% !important;
            margin: 0 !important;
          }

          /* Reduce weekly day card widths */
          .week-day-card {
            padding: 8px 6px !important;
            max-width: 100% !important;
            margin: 0 !important;
          }

          /* Reduce weekly sessions grid gap */
          .weekly-sessions-grid-integrated {
            gap: 8px !important;
            max-width: 100% !important;
            margin: 0 !important;
          }

          /* Reduce mobile bento card widths */
          .mobile-bento-card {
            padding: 12px !important;
            max-width: 100% !important;
            margin: 0 !important;
            width: 100% !important;
          }

          /* Reduce mobile bento financial grid widths */
          .mobile-bento-financial-grid {
            gap: 8px !important;
            max-width: 100% !important;
            margin: 0 !important;
          }

          /* Reduce section header padding */
          .section-header-mobile,
          .mobile-title-bar {
            padding-left: 8px !important;
            padding-right: 8px !important;
            max-width: 100% !important;
            margin: 0 !important;
          }

          /* Reduce calendar list padding */
          .mobile-calendar-list {
            padding: 0 4px !important;
            max-width: 100% !important;
            margin: 0 !important;
          }

          /* Reduce stats section padding */
          .mobile-stats-section {
            padding: 0 4px !important;
            max-width: 100% !important;
            margin: 0 !important;
          }

          /* Reduce chart container padding */
          .mobile-chart-container {
            padding: 0 4px !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
        }

        /* REMOVED: Tablets/iPad in Portrait Mode 2-column layout
           Now using mobile dashboard layout for all devices <= 1024px width
           to match Android tablet behavior and prevent crowded UI on iPad portrait */

        @media (min-width: 1025px) {
          .mobile-current-week-calendar {
            display: none;
          }
          .mobile-dashboard-layout {
            display: none;
          }
        }

        @media (max-width: 1024px) {
          .dashboard-main-grid {
            display: none !important;
          }

          .dashboard {
            padding: 0px 8px 16px 8px; /* Extra bottom padding for mobile */
          }
          .dashboard:has(.mobile-dashboard-layout) {
            padding-left: 0 !important;
            padding-right: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 16px !important;
          }

          .standard-quick-actions {
            display: none !important;
          }

          .mobile-app-quick-section {
            display: block;
            margin: -8px -16px 0px -16px;
            padding: 16px 8px;
            background: #ffffff;
            border-bottom: 1px solid #E2E8F0;
          }
          
          .mobile-search-bar-wrapper {
            position: static;
            margin-bottom: 0px;
          }

          .mobile-search-input {
            width: 100%;
            padding: 16px 16px;
            padding-right: 44px;
            border-radius: 12px;
            border: 1px solid #E2E8F0;
            background: #F8FAFC;
            font-family: 'Cairo', sans-serif;
            font-size: 15px;
            outline: none;
            transition: all 0.2s;
          }
          
          .mobile-search-input:focus {
            border-color: #3B82F6;
            background: #ffffff;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
          
          .mobile-search-icon {
            position: absolute;
            right: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #64748B;
            font-size: 16px;
          }
          
          .mobile-actions-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
          
          .mobile-action-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 12px 4px;
            background: transparent;
            border: none;
            cursor: pointer;
            transition: none;
          }

          .mobile-action-card:active,
          .mobile-action-card:hover {
            transform: none !important;
            box-shadow: none !important;
            opacity: 1 !important;
          }

          .mobile-action-icon-bg {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            box-shadow: none !important;
          }

          .icon-bg-blue { background: linear-gradient(135deg, #3B82F6, #2563EB); }
          .icon-bg-cyan { background: linear-gradient(135deg, #06B6D4, #0891B2); }
          .icon-bg-indigo { background: linear-gradient(135deg, #6366F1, #4F46E5); }
          .icon-bg-purple { background: linear-gradient(135deg, #A855F7, #9333EA); }
          .icon-bg-slate { background: linear-gradient(135deg, #64748B, #475569); }
          .icon-bg-amber { background: linear-gradient(135deg, #F59E0B, #D97706); }

          .mobile-action-card span {
            font-family: 'Cairo', sans-serif;
            font-size: 15px;
            font-weight: 700;
            color: #1E293B;
            line-height: 1.2;
            text-align: center;
          }

          .quick-actions-bar {
            display: none !important;
          }
          .quick-action-btn {
            padding: 8px;
            font-size: 13px;
            justify-content: center;
          }
          .dashboard-main-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .dashboard-column {
            padding: 0;
          }
          .donut-chart-redesigned {
            width: 100%;
            max-width: 180px;
            height: 180px;
            margin: 0 auto;
          }
          .donut-chart-redesigned::before {
            width: 76%;
            height: 76%;
          }
          .donut-number-redesigned {
            font-size: 28px;
          }
          .donut-text-redesigned {
            font-size: 11px;
          }
          .donut-center-label-large {
            font-size: 13px;
          }
          .donut-chart-medium {
            width: 100%;
            max-width: 160px;
            height: 160px;
             margin: 0 auto;
          }
          .donut-chart-medium::before {
            width: 76%;
            height: 76%;
          }
          .donut-center-value-medium {
             font-size: 26px;
          }
          .case-status-card-modern,
          .case-distribution-card {
            width: 100%;
          }
          .case-status-content-redesigned,
          .case-distribution-content {
             display: flex;
             flex-direction: column;
             align-items: center;
          }

          .weekly-sessions-container-fixed {
            height: auto;
            padding: 10px 12px;
          }
          .weekly-sessions-header-fixed {
            height: auto;
            margin-bottom: 8px;
          }
          .weekly-sessions-grid-fixed {
            grid-template-columns: repeat(2, 1fr);
            gap: 4px;
            height: auto;
          }
          .weekly-day-card-fixed {
            height: 80px;
            padding: 8px 4px;
          }
          .weekly-day-name-fixed {
            font-size: 11px;
            margin-bottom: 3px;
          }
          .weekly-day-date-fixed {
            font-size: 10px;
            margin-bottom: 4px;
          }
          .weekly-day-count-fixed {
            font-size: 13px;
          }
          
          /* Weekly Sessions Integrated Grid - Mobile */
          .weekly-sessions-grid-integrated {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px;
          }
          .weekly-day-card-integrated {
            min-height: 100px;
            padding: 12px 8px;
          }
          .weekly-day-name-integrated {
            font-size: 14px;
          }
          .weekly-day-date-integrated {
            font-size: 12px;
          }
          .weekly-day-count-integrated {
            font-size: 12px;
            padding: 4px 10px;
          }

          /* Calendar Grid - Mobile */
          .calendar-grid-header-modern,
          .calendar-week-row-modern {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .calendar-grid-cell-modern {
            min-height: auto;
            padding: 12px;
            border-left: none;
            border-bottom: 1px solid #E2E8F0;
          }
           /* Ensure borders are consistent for 2-column layout */
          .calendar-grid-cell-modern:nth-child(odd) {
            border-left: 1px solid #E2E8F0;
          }
          .calendar-grid-cell-modern:nth-child(even) {
            border-left: none;
          }
          /* Remove left border for the very first item if needed, but nth-child handles it */

          .calendar-cell-weekday {
            font-size: 13px;
          }
          .calendar-cell-date-value {
            font-size: 14px;
          }
          .calendar-item-modern {
            padding: 8px 10px;
            font-size: 12px;
          }

          .quick-create-section {
            padding: 12px;
          }
          .quick-create-buttons {
            gap: 6px;
            flex-direction: column;
          }
          .quick-create-search-wrapper {
            width: 100%;
            min-width: 100%;
            margin-right: 0;
          }
          .quick-create-search {
            padding: 8px 12px;
            font-size: 13px;
          }
          .quick-create-search-btn {
            padding: 8px 12px;
            font-size: 13px;
            min-width: 40px;
          }
          .quick-create-btn {
            width: 100%;
            min-width: 100%;
            padding: 8px 12px;
            font-size: 13px;
          }
          .quick-create-icon {
            font-size: 15px;
            width: 15px;
            height: 15px;
          }
          .dashboard-card {
            padding: 12px 14px;
            margin-bottom: 16px;
          }
          .card-header-modern {
            margin: -12px -14px 0 -14px;
            padding-left: 24px;
            padding-right: 24px;
          }
          .modern-chart-card {
            padding: 12px 14px !important;
          }
          
          .financial-summary-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .financial-summary-card {
            padding: 10px;
          }

          .tasks-summary-cards {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .summary-card-number {
            font-size: 24px;
          }
          .summary-card-label {
            font-size: 11px;
          }
          .summary-card-icon {
            font-size: 16px;
          }
          .summary-card-content {
            gap: 6px;
          }
          .chart-legend-single-column {
            grid-template-columns: 1fr;
          }

          .agenda-nav-buttons {
            gap: 4px;
          }
          .agenda-date-range-modern {
            font-size: 11px;
            padding: 4px 8px;
          }
        }

        /* Toast Notification Styles */
        .toast-notification {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100001;
          animation: slideDown 0.3s ease-out;
          direction: rtl;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .toast-content {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          font-family: 'Cairo', sans-serif;
          font-weight: 600;
          font-size: 14px;
          min-width: 300px;
          max-width: 500px;
        }

        .toast-success .toast-content {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          color: #ffffff;
          border: 1px solid #34D399;
        }

        .toast-error .toast-content {
          background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
          color: #ffffff;
          border: 1px solid #F87171;
        }

        .toast-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .toast-message {
          flex: 1;
          text-align: right;
        }

        /* Integrated Weekly Schedule & Calendar Styles - Redesigned */
        .weekly-sessions-grid-integrated {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 12px;
          margin-top: 16px;
          margin-bottom: 24px;
        }
        
        .weekly-day-card-integrated {
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          text-align: center;
          min-height: 150px; /* Increased Height */
          transition: all 0.2s ease;
          position: relative;
        }
        
        .weekly-day-card-integrated:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.05);
          border-color: #cbd5e1;
          z-index: 2;
        }
        
        .weekly-day-card-integrated.today-integrated {
          background: linear-gradient(180deg, #EFF6FF 0%, #DBEAFE 100%);
          border-color: #3b82f6;
          border-width: 2px;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }
        
        .weekly-day-card-integrated.has-sessions {
          border-bottom: 4px solid #3b82f6;
        }
        
        .weekly-day-name-integrated {
          font-weight: 700;
          color: #64748B;
          font-size: 16px; /* Increased Font Size */
          font-family: 'Cairo', sans-serif;
          margin-bottom: 8px;
        }
        
        .weekly-day-date-integrated {
           font-size: 14px;
           color: #94A3B8;
           font-weight: 600;
           font-family: 'Cairo', sans-serif;
        }
        
        .weekly-day-count-integrated {
          margin-top: auto;
          font-size: 14px;
          font-weight: 600;
          color: #64748B;
          background: #F1F5F9;
          padding: 6px 16px;
          border-radius: 20px;
          transition: all 0.2s;
        }
        
        .weekly-day-count-integrated.has-sessions-count {
           background: #DBEAFE;
           color: #1E40AF;
        }
        
        /* Modern Calendar Styles with increased size */
        .calendar-grid-container-modern {
           border: 1px solid #E2E8F0;
           border-radius: 16px;
           overflow: hidden;
           margin-top: 24px;
           box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
           background: #ffffff;
        }
        
        .calendar-week-row-modern {
           display: grid;
           grid-template-columns: repeat(5, 1fr); /* 5 columns */
           border-bottom: 1px solid #E2E8F0;
        }
        
        .calendar-week-row-modern:last-child {
           border-bottom: none;
        }
        
        .calendar-grid-cell-modern {
           min-height: 200px; /* Increased Height significantly */
           padding: 16px;
           background: #ffffff;
           border-left: 1px solid #E2E8F0;
           position: relative;
           display: flex;
           flex-direction: column;
           gap: 12px;
           transition: background-color 0.2s;
        }
        
        .calendar-grid-cell-modern:hover {
           background-color: #fafbfc;
        }

        .calendar-grid-cell-modern:last-child {
           border-left: none;
        }
        
        .calendar-grid-cell-modern.today-cell {
           background-color: #F8FAFC;
        }
        
        .calendar-cell-header-modern {
           display: flex;
           justify-content: space-between;
           align-items: flex-start;
           margin-bottom: 4px;
        }
        
        .calendar-cell-date-modern {
           text-align: right;
           width: 100%;
        }
        
        .calendar-cell-weekday {
           font-size: 14px;
           font-weight: 700;
           color: #94A3B8;
           margin-bottom: 4px;
           display: block;
        }
        
        .calendar-cell-date-value {
           font-size: 15px;
           font-weight: 700;
           color: #1E293B;
        }
        
        .calendar-cell-items-modern {
           display: flex;
           flex-direction: column;
           gap: 8px;
           flex: 1;
        }
        
        .calendar-item-modern {
           display: flex;
           align-items: center;
           gap: 10px;
           padding: 10px 12px;
           border-radius: 8px;
           font-size: 13px;
           font-weight: 600;
           cursor: pointer;
           transition: all 0.2s;
           box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        .calendar-item-modern:hover {
           transform: translateY(-1px);
           box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .calendar-item-session-modern {
           background: #ffffff;
           border: 1px solid #BFDBFE;
           color: #1E40AF;
           border-right: 4px solid #3B82F6;
        }
        
        .calendar-item-task-modern {
           background: #ffffff;
           border: 1px solid #FDE68A;
           color: #B45309;
           border-right: 4px solid #F59E0B;
        }
        
        .calendar-item-task-modern.overdue {
           background: #FEF2F2;
           border: 1px solid #FECACA;
           color: #B91C1C;
           border-right: 4px solid #EF4444;
        }

        .calendar-item-ended-modern {
           background: #F3F4F6;
           border: 1px solid #E5E7EB;
           color: #4B5563;
           border-right: 4px solid #9CA3AF;
        }

        .calendar-item-reminder-modern {
           background: #FEF3C7;
           border: 1px solid #FDE68A;
           color: #92400E;
           border-right: 4px solid #F59E0B;
        }
        
        .calendar-item-icon-modern {
           font-size: 16px;
           flex-shrink: 0;
        }
        
        .calendar-item-text-modern {
           white-space: nowrap;
           overflow: hidden;
           text-overflow: ellipsis;
           flex: 1;
        }

        .mobile-gradient-title {
          background: linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #06B6D4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: inline-block;
          font-weight: 800;
        }

        .mobile-dashboard-layout .section-title-mobile {
          background: linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #06B6D4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .mobile-title-bar {
          border-radius: 12px;
          padding: 8px 12px !important;
          margin-bottom: 10px;
        }

        .mobile-title-bar-blue {
          background: #dbeafe;
        }

        .mobile-title-bar-slate {
          background: #e2e8f0;
        }

        .mobile-title-bar-purple {
          background: #ddd6fe;
        }

        .mobile-title-bar-amber {
          background: #fef3c7;
        }

        .mobile-title-icon-badge {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          background: #eff6ff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-left: 6px;
          box-shadow: 0 1px 6px rgba(15, 23, 42, 0.08);
          flex-shrink: 0;
        }
        
        .calendar-cell-empty-modern {
           display: flex;
           align-items: center;
           justify-content: center;
           height: 100%;
           color: #E2E8F0;
           font-size: 24px;
           opacity: 0.5;
        }
        
        /* Responsive Calendar */
        @media (max-width: 1199px) {
           .weekly-sessions-grid-integrated {
              grid-template-columns: repeat(4, 1fr);
           }
           .weekly-sessions-grid-integrated > div:nth-child(n+5) {
              display: none;
           }
           .calendar-week-row-4 {
              display: grid;
              grid-template-columns: repeat(4, 1fr) !important;
           }
           .calendar-week-row-modern {
              grid-template-columns: repeat(4, 1fr);
           }
           .calendar-grid-cell-modern:nth-child(n+5) {
              border-left: none; /* Adjust borders for 4 columns if possible, but grid handles layout */
           }
        @media (max-width: 1024px) {
          .mobile-dashboard-layout {
            padding: 0;
            background: #FFFFFF;
            min-height: 100vh;
            direction: rtl; /* Ensure RTL for mobile layout */
            width: 100%;
            box-sizing: border-box;
          }

          /* New Bento Header */
          .mobile-welcome-header {
            margin-bottom: 24px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            text-align: right;
          }
          .mobile-welcome-title {
            font-size: 24px;
            font-weight: 800;
            color: #000000;
            font-family: 'Cairo', sans-serif;
            margin: 0;
          }
          .mobile-welcome-date {
            font-size: 14px;
            color: #64748B;
            font-weight: 600;
          }

          /* Bento Grid for Financials */
          .mobile-bento-financial-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 24px;
          }

          .mobile-dashboard-layout .mobile-bento-financial-grid > .mobile-bento-card {
            margin-left: 0;
            margin-right: 0;
            width: 100%;
            max-width: 100%;
            align-self: center;
            box-sizing: border-box;
          }
          .mobile-bento-card {
            background: #FFFFFF;
            border-radius: 16px;
            padding: 16px 0;
            border: none;
            box-shadow: none;
            display: flex;
            flex-direction: column;
            gap: 8px;
            text-align: right;
            width: 100%;
            box-sizing: border-box;
          }

          .calendar-loading {
            opacity: 0.6;
            pointer-events: none;
            filter: grayscale(0.2);
            transition: all 0.3s ease;
          }
          .mobile-current-week-calendar {
            margin: 0px 0;
          }
          .card-icon-mobile {
            width: 32px;
            height: 32px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 4px;
          }
          .card-label-mobile {
            font-size: 11px;
            font-weight: 700;
            color: #64748B;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .card-value-mobile {
            font-size: 18px;
            font-weight: 800;
            color: #1E293B;
          }

          /* Work Schedule Section */
          .mobile-work-schedule-section {
            background: #FFFFFF;
            border-radius: 16px;
            padding: 16px 0;
            margin-bottom: 0px;
            margin-top: 8px;
            border: none;
            box-shadow: none;
            width: 100%;
            box-sizing: border-box;
          }
          .mobile-work-schedule-section .mobile-calendar-list {
            margin-top: 8px !important;
          }
          .section-header-mobile {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0px;
            margin-top: 0px;
            padding: 0 !important;
            gap: 0 !important;
            direction: rtl;
            width: 100%;
          }

          /* Title highlight bars: edge-to-edge (dashboard + main gutters removed on this layout) */
          .mobile-dashboard-layout {
            width: 100% !important;
            max-width: 100% !important;
            align-self: stretch !important;
            box-sizing: border-box !important;
          }

          .mobile-dashboard-layout .section-header-mobile,
          .mobile-dashboard-layout .mobile-title-bar {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            align-self: stretch !important;
            border-radius: 0 !important;
            box-sizing: border-box !important;
            margin-bottom: 14px !important;
            padding-top: 10px !important;
            padding-bottom: 10px !important;
            padding-left: max(12px, env(safe-area-inset-left, 0px)) !important;
            padding-right: max(12px, env(safe-area-inset-right, 0px)) !important;
          }

          .mobile-dashboard-layout .mobile-current-week-calendar > .section-header-mobile {
            margin-top: 0 !important;
          }

          .mobile-work-schedule-section .mobile-calendar-list {
            margin-top: 6px !important;
          }

          .mobile-dashboard-layout .mobile-bento-financial-grid > .mobile-title-bar {
            margin-top: 0 !important;
          }

          .mobile-dashboard-layout .mobile-bento-card > .section-header-mobile:first-child,
          .mobile-dashboard-layout .mobile-bento-card > .mobile-title-bar:first-child {
            margin-top: 0 !important;
          }

          .mobile-dashboard-layout .section-title-mobile {
            width: 100%;
            justify-content: flex-start;
            text-align: right;
            direction: rtl;
          }

          .mobile-dashboard-layout .mobile-title-icon-badge {
            margin-left: 0;
            margin-right: 6px;
          }
          .section-title-mobile {
            font-size: 18px;
            margin: 0 !important;
            padding: 0 !important;
            font-weight: 800;
            color: #000000;
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: 'Cairo', sans-serif;
          }
          .mobile-week-scroll {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            padding-bottom: 12px;
            margin-bottom: 16px;
            scrollbar-width: none;
            direction: rtl;
          }
          .mobile-week-scroll::-webkit-scrollbar { display: none; }
          .mobile-day-pill {
            flex-shrink: 0;
            width: 50px;
            height: 70px;
            border-radius: 16px;
            border: 1px solid #E2E8F0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            transition: all 0.2s;
            background: #F8FAFC;
          }
          .mobile-day-pill.active {
            background: #3B82F6;
            border-color: #3B82F6;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }
          .mobile-day-pill.active .pill-day-name, 
          .mobile-day-pill.active .pill-day-num { color: #FFFFFF; }
          .pill-day-name { font-size: 10px; font-weight: 700; color: #94A3B8; }
          .pill-day-num { font-size: 16px; font-weight: 800; color: #1E293B; }
          .mobile-session-indicator {
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: #3B82F6;
          }
          .mobile-day-pill.active .mobile-session-indicator { background: #FFFFFF; }

          /* Selected Day Items */
          .mobile-selected-day-items {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .mobile-item-card {
            padding: 12px 14px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            border: none;
            background: #F8FAFC;
            text-align: right;
          }
          .mobile-item-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .mobile-item-content { flex: 1; min-width: 0; }
          .mobile-item-title { font-size: 13px; font-weight: 800; color: #000000; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .mobile-item-sub { font-size: 11px; color: #64748B; font-weight: 500; }

          /* Stats Section (Tabs) */
          .mobile-stats-section {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 24px;
          }
          .stats-tab-buttons {
            display: flex;
            background: #E2E8F0;
            padding: 4px;
            border-radius: 12px;
            gap: 4px;
            direction: rtl;
          }
          .stats-tab-btn {
            flex: 1;
            padding: 10px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 700;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            background: transparent;
            color: #64748B;
            font-family: 'Cairo', sans-serif;
          }
          .stats-tab-btn.active {
            background: #FFFFFF;
            color: #1E293B;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }

          /* Chart Styling for Mobile */
          .mobile-chart-container {
            background: #FFFFFF;
            border-radius: 16px;
            padding: 16px 12px;
            border: none;
            width: 100%;
            box-sizing: border-box;
          }

          /* Hide original elements that we're replacing or that would clutter */
          .quick-actions-pills { 
             display: flex;
             gap: 10px;
             overflow-x: auto; 
             flex-wrap: nowrap; 
             scrollbar-width: none; 
             margin-bottom: 24px; 
             padding-bottom: 4px;
             direction: rtl;
          }
          .quick-actions-pills::-webkit-scrollbar { display: none; }
          
          /* Navigation Buttons for Agenda */
          .mobile-agenda-nav {
             display: flex;
             align-items: center;
             gap: 0 !important;
             padding: 0 !important;
             margin: 0 !important;
             border-radius: 12px;
             border: none;
          }
          .mobile-agenda-nav-btn {
             width: 24px !important;
             height: 24px !important;
             border-radius: 12px !important;
             border: none !important;
             background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%) !important;
             display: flex !important;
             margin: 0 !important;
             align-items: center !important;
             justify-content: center !important;
             color: white !important;
             transition: all 0.2s;
          }
          .mobile-agenda-nav-btn:active {
             background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%) !important;
             transform: scale(0.95);
             box-shadow: 0 2px 12px rgba(59, 130, 246, 0.4) !important;
          }

          /* Existing mobile classes to hide or adapt */
          .financial-summary-card, .status-card-mobile, .file-dist-row, .tasks-card-mobile, .sessions-section-mobile {
             display: none !important;
          }

          /* ── Wider mobile cards: eliminate all horizontal gutters ── */
          .dashboard:has(.mobile-dashboard-layout) {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          .mobile-dashboard-layout {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          .mobile-dashboard-layout .mobile-bento-financial-grid > .mobile-bento-card {
            margin-left: 0 !important;
            margin-right: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding-left: 4px !important;
            padding-right: 4px !important;
          }

          .mobile-dashboard-layout .mobile-current-week-calendar {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          .mobile-dashboard-layout .mobile-calendar-list {
            padding: 0 !important;
          }

          .mobile-dashboard-layout .calendar-grid-cell-modern {
            width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            border-radius: 6px !important;
          }

          .mobile-dashboard-layout .mobile-work-schedule-section {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          .mobile-dashboard-layout .mobile-stats-section {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          .mobile-dashboard-layout .mobile-chart-container {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          .mobile-dashboard-layout .mobile-bento-financial-grid {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          .mobile-dashboard-layout .section-header-mobile,
          .mobile-dashboard-layout .mobile-title-bar {
            padding-left: env(safe-area-inset-left, 0px) !important;
            padding-right: env(safe-area-inset-right, 0px) !important;
          }

          .mobile-dashboard-layout .mobile-item-card {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
        }

        /* >>> WAYFLYER INSPIRED UI OVERRIDES <<< */
        /* Global dashboard background */
        .dashboard {
          background-color: #FFFFFF !important;
          font-family: 'Inter', 'Cairo', sans-serif !important;
          min-height: 100vh;
        }

        /* Base Card Styling (Wayflyer Style) */
        .dashboard-card, 
        .financial-summary-card,
        .quick-create-section {
          background-color: #FFFFFF !important;
          border-radius: 16px !important;
          border: 1px solid #E2E8F0 !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02) !important;
          transition: all 0.2s ease-in-out !important;
        }

        /* Mobile containers: flat white, no borders/shadows */
        .mobile-bento-card, 
        .mobile-work-schedule-section,
        .mobile-chart-container {
          background-color: #FFFFFF !important;
          border-radius: 16px !important;
          border: none !important;
          box-shadow: none !important;
          transition: none !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        .mobile-work-schedule-section {
          margin-top: 8px !important;
        }

        /* Hover effects - desktop cards only */
        .dashboard-card:hover {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025) !important;
          border-color: #CBD5E1 !important;
        }

        .weekly-day-card-integrated:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05) !important;
          border-color: #CBD5E1 !important;
        }

        /* Card Header Settings */
        .card-header-modern {
          border-bottom: 1px solid #F1F5F9 !important;
          padding-bottom: 16px !important;
          margin-bottom: 20px !important;
        }

        .section-header-mobile {
          border-bottom: none !important;
          padding-bottom: 0px !important;
          margin-bottom: 0px !important;
          display: flex !important;
          flex-direction: row !important;
          justify-content: space-between !important;
          align-items: center !important;
        }

        /* Typography Overrides */
        .card-title-modern, .section-title-mobile {
          font-size: 18px !important;
          font-weight: 800 !important;
          color: #000000 !important;
          letter-spacing: -0.01em !important;
        }

        /* Modern Card Icons */
        .card-header-icon-box {
          width: 36px !important;
          height: 36px !important;
          border-radius: 10px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        /* Pill buttons (Action Buttons) */
        .action-pill {
          border-radius: 12px !important;
          font-weight: 600 !important;
          box-shadow: none !important;
          border: 1px solid transparent !important;
          padding: 8px 14px !important;
          transition: none !important;
        }
        .action-pill:hover {
          transform: none !important;
          background-color: inherit !important;
          opacity: 1 !important;
          filter: none !important;
        }
        .pill-blue { background: #EEF2FF !important; color: #4338CA !important; }
        .pill-green { background: #ECFDF5 !important; color: #047857 !important; }
        .pill-cyan { background: #ECFEFF !important; color: #0369A1 !important; }
        .pill-orange { background: #FFF7ED !important; color: #C2410C !important; }
        .pill-red { background: #FEF2F2 !important; color: #DC2626 !important; }
        .pill-gray { background: #F1F5F9 !important; color: #475569 !important; }

        /* Dashboard Financial Number Stats */
        .financial-card-value {
          color: #0F172A !important;
          font-size: 26px !important;
          font-weight: 800 !important;
          letter-spacing: -0.02em !important;
        }

        .financial-card-label {
          color: #64748B !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          margin-bottom: 8px !important;
        }

        /* Search bar and modern components */
        .search-wrapper-modern, .mobile-search-bar-wrapper {
          background-color: #FFFFFF !important;
          border: 1px solid #E2E8F0 !important;
          border-radius: 12px !important;
          box-shadow: 0 2px 4px -2px rgba(0, 0, 0, 0.02) !important;
        }

        .search-input-modern {
          font-family: 'Inter', 'Cairo', sans-serif !important;
          font-weight: 500 !important;
          color: #0F172A !important;
        }

        /* Calendar Day Styles */
        .calendar-item-modern {
          border-radius: 8px !important;
          border-width: 0 !important;
          border-right: 4px solid !important;
          box-shadow: none !important;
          background-color: #F8FAFC !important;
        }

        .calendar-grid-cell-modern {
          background-color: #FFFFFF !important;
          border-color: #F1F5F9 !important;
        }

        .calendar-grid-container-modern {
          border: 1px solid #F1F5F9 !important;
          border-radius: 16px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02) !important;
        }

        /* Agenda / Weekly Cards */
        .weekly-day-card-integrated {
          background: #FFFFFF !important;
          border-radius: 12px !important;
          border: 1px solid #E2E8F0 !important;
        }

        .weekly-day-card-integrated.today-integrated {
          background: #F8FAFC !important;
          border-color: #3B82F6 !important;
          box-shadow: 0 4px 12px -2px rgba(59, 130, 246, 0.15) !important;
        }
      `}</style>
    </div >
    </PullToRefresh>
  )
}

export default function DashboardPage() {
  return (
    <Layout>
      <Dashboard />
    </Layout>
  )
}


