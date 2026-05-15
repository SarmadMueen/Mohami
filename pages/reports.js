import { useState, useEffect } from "react"
import Head from "next/head"
import { supabase } from '../lib/initSupabase'
import Layout from "../components/layout/Layout"
import withAuth from '../lib/withAuth'
import { useRouter } from 'next/router'
import {
  FaGavel,
  FaCheckCircle,
  FaCalendarAlt,
  FaDollarSign,
  FaChartLine,
  FaTasks,
  FaFileAlt,
  FaPrint,
  FaDownload,
  FaUsers,
  FaCalendarCheck,
  FaChartBar,
  FaCog,
  FaBell,
  FaClipboardList,
  FaStickyNote,
  FaPaperclip,
} from "react-icons/fa"
import { FiTrendingUp, FiTrendingDown, FiRefreshCw, FiFilter, FiPlus, FiTrash2, FiEdit, FiClock } from "react-icons/fi"
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import html2canvas from 'html2canvas'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement)

function Reports() {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)
  const [userId, setUserId] = useState(null)
  const [casesData, setCasesData] = useState([])
  const [sessionsData, setSessionsData] = useState([])
  const [casesFinancialData, setCasesFinancialData] = useState([])
  const [actionsData, setActionsData] = useState([])
  const [tasksData, setTasksData] = useState([])
  const [clientsData, setClientsData] = useState([])
  const [lawyerPerformanceData, setLawyerPerformanceData] = useState([])
  const [scheduledReports, setScheduledReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [lastUpdated, setLastUpdated] = useState(null)
  
  // Custom Report Builder State
  const [customReportFields, setCustomReportFields] = useState([])
  const [customReportData, setCustomReportData] = useState([])
  const [showCustomBuilder, setShowCustomBuilder] = useState(false)
  
  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
    caseType: '',
    lawyer: '',
    actionType: '',
    taskStatus: '',
    taskPriority: '',
  })
  const [availableLawyers, setAvailableLawyers] = useState([])

  // Lawyer Performance Filters
  const [selectedLawyer, setSelectedLawyer] = useState('')
  const [lawyerDateRange, setLawyerDateRange] = useState({ from: '', to: '' })
  const [selectedWorkReport, setSelectedWorkReport] = useState('')
  const [lawyerHighlights, setLawyerHighlights] = useState(null)
  const [selectedDateRangeType, setSelectedDateRangeType] = useState('')
  const [showCustomDateModal, setShowCustomDateModal] = useState(false)
  const [customDateInputs, setCustomDateInputs] = useState({ from: '', to: '' })
  const [financialChartCurrency, setFinancialChartCurrency] = useState('IQD')
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Overview Stats
  const [overviewStats, setOverviewStats] = useState({
    totalCases: 0,
    activeCases: 0,
    completedCases: 0,
    pendingCases: 0,
    overdueCases: 0,
    todaySessions: 0,
    upcomingSessions: 0,
    totalRevenue: 0,
    totalRevenueUSD: 0,
    totalPayments: 0,
    totalPaymentsUSD: 0,
    totalExpenses: 0,
    totalExpensesUSD: 0,
    outstandingBalance: 0,
    outstandingBalanceUSD: 0,
  })

  useEffect(() => {
    setIsClient(true)
    const sessionUser = supabase.auth.user()
    if (sessionUser) {
      setUserId(sessionUser.id)
      fetchAllData(sessionUser.id)
    }
  }, [])

  const fetchAllData = async (uid) => {
    try {
      setLoading(true)
      await Promise.all([
        fetchCasesData(uid),
        fetchSessionsData(uid),
        fetchCasesFinancialData(uid),
        fetchActionsData(uid),
        fetchTasksData(uid),
        fetchClientsData(uid),
        fetchLawyers(uid),
        fetchLawyerPerformanceData(uid)
      ])
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching reports data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCasesData = async (uid) => {
    try {
      const { data: userMetadata, error: userMetadataError } = await supabase
        .from('user_metadata')
        .select('admin_user_id, new_lawyer_id')
        .or(`new_lawyer_id.eq.${uid}, admin_user_id.eq.${uid}`)

      if (userMetadataError) throw new Error('Error fetching user metadata')

      const isAdmin = userMetadata.some(meta => meta.admin_user_id === uid)
      const lawyerIds = userMetadata
        .filter(meta => meta.admin_user_id === uid)
        .map(meta => meta.new_lawyer_id)

      let cases = []
      
      if (isAdmin) {
        const { data, error } = await supabase
          .from('cases')
          .select('*')
          .or(`admin_id.eq.${uid}, lawyer_id.in.(${lawyerIds.join(',')},${uid}), caseLawyerId.in.(${lawyerIds.join(',')},${uid})`)
        if (error) throw new Error('Error fetching admin cases')
        cases = data || []
      } else {
        const { data, error } = await supabase
          .from('cases')
          .select('*')
          .or(`lawyer_id.eq.${uid}, caseLawyerId.eq.${uid}`)
        if (error) throw new Error('Error fetching lawyer cases')
        cases = data || []
      }

      setCasesData(cases)
      calculateCaseStats(cases)
    } catch (error) {
      console.error('Error fetching cases:', error)
      setCasesData([])
    }
  }

  const fetchSessionsData = async (uid) => {
    try {
      const { data: userMetadata } = await supabase
        .from('user_metadata')
        .select('admin_user_id, new_lawyer_id')
        .or(`new_lawyer_id.eq.${uid}, admin_user_id.eq.${uid}`)

      if (!userMetadata || userMetadata.length === 0) return

      const isAdmin = userMetadata.some(meta => meta.admin_user_id === uid)
      const lawyerIds = userMetadata
        .filter(meta => meta.admin_user_id === uid)
        .map(meta => meta.new_lawyer_id)

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      let sessions = []
      
      const sessionQuery = supabase
        .from('sessions')
        .select('*')
        .order('sessiondate', { ascending: true })

      if (isAdmin) {
        if (lawyerIds.length > 0) {
          const userIds = [...lawyerIds, uid]
          const { data, error } = await sessionQuery.in('user_id', userIds)
          if (error) throw error
          sessions = data || []
        } else {
          const { data, error } = await sessionQuery.eq('user_id', uid)
          if (error) throw error
          sessions = data || []
        }
      } else {
        const { data, error } = await sessionQuery.eq('user_id', uid)
        if (error) throw error
        sessions = data || []
      }

      const todaySessions = sessions.filter(s => {
        if (!s.sessiondate) return false
        const sessionDate = new Date(s.sessiondate)
        return sessionDate.toDateString() === today.toDateString()
      })

      const upcomingSessions = sessions.filter(s => {
        if (!s.sessiondate) return false
        const sessionDate = new Date(s.sessiondate)
        sessionDate.setHours(0, 0, 0, 0)
        return sessionDate > today
      })

      setSessionsData(sessions)
      
      setOverviewStats(prev => ({
        ...prev,
        todaySessions: todaySessions.length,
        upcomingSessions: upcomingSessions.length,
      }))
    } catch (error) {
      console.error('Error fetching sessions:', error)
      setSessionsData([])
    }
  }

  const fetchCasesFinancialData = async (uid) => {
    try {
      const { data: userMetadata } = await supabase
        .from('user_metadata')
        .select('admin_user_id, new_lawyer_id')
        .or(`new_lawyer_id.eq.${uid}, admin_user_id.eq.${uid}`)

      if (!userMetadata || userMetadata.length === 0) return

      const isAdmin = userMetadata.some(meta => meta.admin_user_id === uid)
      const lawyerIds = userMetadata
        .filter(meta => meta.admin_user_id === uid)
        .map(meta => meta.new_lawyer_id)

      let cases = []
      
      if (isAdmin) {
        const { data, error } = await supabase
          .from('cases')
          .select('id, case_number, client_name, totalAmount, currency')
          .or(`admin_id.eq.${uid}, lawyer_id.in.(${lawyerIds.join(',')},${uid}), caseLawyerId.in.(${lawyerIds.join(',')},${uid})`)
        if (error) throw error
        cases = data || []
      } else {
        const { data, error } = await supabase
          .from('cases')
          .select('id, case_number, client_name, totalAmount, currency')
          .or(`lawyer_id.eq.${uid}, caseLawyerId.eq.${uid}`)
        if (error) throw error
        cases = data || []
      }

      const financialData = await Promise.all(
        (cases || []).map(async (caseItem) => {
          const totalAttorneyFees = parseFloat(caseItem.totalAmount) || 0

          const { data: lawyerFees } = await supabase
            .from('lawyer_fees')
            .select('payment_amount')
            .eq('case_id', caseItem.id)

          const { data: attorneyFees } = await supabase
            .from('attorneyFees')
            .select('fee_amount')
            .eq('case_id', caseItem.id)

          const totalPaidFromLawyerFees = (lawyerFees || []).reduce(
            (sum, payment) => sum + (parseFloat(payment.payment_amount) || 0),
            0
          )

          const totalPaidFromAttorneyFees = (attorneyFees || []).reduce(
            (sum, fee) => sum + (parseFloat(fee.fee_amount) || 0),
            0
          )

          const totalPaid = totalPaidFromLawyerFees + totalPaidFromAttorneyFees
          const outstanding = totalAttorneyFees - totalPaid

          return {
            ...caseItem,
            caseValue: totalAttorneyFees,
            paidAmount: totalPaid,
            outstandingAmount: outstanding,
          }
        })
      )

      setCasesFinancialData(financialData)

      // Calculate financial totals
      const iqdCases = financialData.filter(c => c.currency !== 'USD')
      const usdCases = financialData.filter(c => c.currency === 'USD')

      const totalRevenue = iqdCases.reduce((sum, c) => sum + c.caseValue, 0)
      const totalPayments = iqdCases.reduce((sum, c) => sum + c.paidAmount, 0)
      const totalOutstanding = iqdCases.reduce((sum, c) => sum + c.outstandingAmount, 0)

      const totalRevenueUSD = usdCases.reduce((sum, c) => sum + c.caseValue, 0)
      const totalPaymentsUSD = usdCases.reduce((sum, c) => sum + c.paidAmount, 0)
      const totalOutstandingUSD = usdCases.reduce((sum, c) => sum + c.outstandingAmount, 0)

      // Fetch expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('expenses_amount, currency')
        .or(`admin_id.eq.${uid}, lawyer_id.eq.${uid}`)

      const totalExpenses = (expensesData || []).filter(e => e.currency !== 'USD').reduce(
        (sum, exp) => sum + (parseFloat(exp.expenses_amount) || 0),
        0
      )
      const totalExpensesUSD = (expensesData || []).filter(e => e.currency === 'USD').reduce(
        (sum, exp) => sum + (parseFloat(exp.expenses_amount) || 0),
        0
      )

      setOverviewStats(prev => ({
        ...prev,
        totalRevenue,
        totalRevenueUSD,
        totalPayments,
        totalPaymentsUSD,
        totalExpenses,
        totalExpensesUSD,
        outstandingBalance: totalOutstanding,
        outstandingBalanceUSD: totalOutstandingUSD,
      }))
    } catch (error) {
      console.error('Error fetching financial data:', error)
      setCasesFinancialData([])
    }
  }

  const fetchActionsData = async (uid) => {
    try {
      const { data: userMetadata } = await supabase
        .from('user_metadata')
        .select('admin_user_id, new_lawyer_id')
        .or(`new_lawyer_id.eq.${uid}, admin_user_id.eq.${uid}`)

      if (!userMetadata || userMetadata.length === 0) return

      const isAdmin = userMetadata.some(meta => meta.admin_user_id === uid)
      const lawyerIds = userMetadata
        .filter(meta => meta.admin_user_id === uid)
        .map(meta => meta.new_lawyer_id)

      let actions = []
      
      if (isAdmin) {
        if (lawyerIds.length > 0) {
          const userIds = [...lawyerIds, uid]
          const { data, error } = await supabase
            .from('actions')
            .select('*')
            .in('user_id', userIds)
            .order('actiondate', { ascending: false })
          if (error) throw error
          actions = data || []
        } else {
          const { data, error } = await supabase
            .from('actions')
            .select('*')
            .eq('user_id', uid)
            .order('actiondate', { ascending: false })
          if (error) throw error
          actions = data || []
        }
      } else {
        const { data, error } = await supabase
          .from('actions')
          .select('*')
          .eq('user_id', uid)
          .order('actiondate', { ascending: false })
        if (error) throw error
        actions = data || []
      }

      setActionsData(actions)
    } catch (error) {
      console.error('Error fetching actions:', error)
      setActionsData([])
    }
  }

  const fetchTasksData = async (uid) => {
    try {
      const { data: userMetadata } = await supabase
        .from('user_metadata')
        .select('admin_user_id, new_lawyer_id')
        .or(`new_lawyer_id.eq.${uid}, admin_user_id.eq.${uid}`)

      if (!userMetadata || userMetadata.length === 0) return

      const isAdmin = userMetadata.some(meta => meta.admin_user_id === uid)
      const lawyerIds = userMetadata
        .filter(meta => meta.admin_user_id === uid)
        .map(meta => meta.new_lawyer_id)

      let tasks = []
      
      if (isAdmin) {
        if (lawyerIds.length > 0) {
          const conditions = [`admin_id.eq.${uid}`]
          lawyerIds.forEach(lawyerId => {
            conditions.push(`lawyer_id.eq.${lawyerId}`)
          })
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .or(conditions.join(','))
            .order('task_deadline', { ascending: true })
          if (error) throw error
          tasks = data || []
        } else {
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('admin_id', uid)
            .order('task_deadline', { ascending: true })
          if (error) throw error
          tasks = data || []
        }
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('lawyer_id', uid)
          .order('task_deadline', { ascending: true })
        if (error) throw error
        tasks = data || []
      }

      setTasksData(tasks)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      setTasksData([])
    }
  }

  const fetchClientsData = async (uid) => {
    try {
      const { data: userMetadata } = await supabase
        .from('user_metadata')
        .select('admin_user_id, new_lawyer_id')
        .or(`new_lawyer_id.eq.${uid}, admin_user_id.eq.${uid}`)

      if (!userMetadata || userMetadata.length === 0) return

      const isAdmin = userMetadata.some(meta => meta.admin_user_id === uid)
      const lawyerIds = userMetadata
        .filter(meta => meta.admin_user_id === uid)
        .map(meta => meta.new_lawyer_id)

      let cases = []
      
      if (isAdmin) {
        const { data, error } = await supabase
          .from('cases')
          .select('id, client_name, case_number, totalAmount')
          .or(`admin_id.eq.${uid}, lawyer_id.in.(${lawyerIds.join(',')},${uid}), caseLawyerId.in.(${lawyerIds.join(',')},${uid})`)
        if (error) throw error
        cases = data || []
      } else {
        const { data, error } = await supabase
          .from('cases')
          .select('id, client_name, case_number, totalAmount')
          .or(`lawyer_id.eq.${uid}, caseLawyerId.eq.${uid}`)
        if (error) throw error
        cases = data || []
      }

      // Aggregate by client
      const clientsMap = {}
      
      for (const caseItem of cases) {
        const clientName = caseItem.client_name || 'غير محدد'
        if (!clientsMap[clientName]) {
          clientsMap[clientName] = {
            clientName,
            totalCases: 0,
            totalAmount: 0,
            caseNumbers: []
          }
        }
        clientsMap[clientName].totalCases++
        clientsMap[clientName].totalAmount += parseFloat(caseItem.totalAmount || 0)
        clientsMap[clientName].caseNumbers.push(caseItem.case_number)
      }

      // Calculate payments and expenses for each client
      const clientsArray = await Promise.all(
        Object.values(clientsMap).map(async (client) => {
          const clientCases = cases.filter(c => c.client_name === client.clientName)
          const caseIds = clientCases.map(c => c.id)

          const { data: lawyerFees } = await supabase
            .from('lawyer_fees')
            .select('payment_amount')
            .in('case_id', caseIds)

          const { data: expenses } = await supabase
            .from('expenses')
            .select('paid_amount, expenses_amount')
            .in('case_id', caseIds)

          const totalPayments = (lawyerFees || []).reduce((sum, fee) => sum + (parseFloat(fee.payment_amount) || 0), 0) +
            (expenses || []).reduce((sum, exp) => sum + (parseFloat(exp.paid_amount) || 0), 0)
          
          const totalExpenses = (expenses || []).reduce((sum, exp) => sum + (parseFloat(exp.expenses_amount) || 0), 0)

          return {
            ...client,
            totalPayments,
            totalExpenses,
            balance: totalPayments - totalExpenses
          }
        })
      )

      setClientsData(clientsArray)
    } catch (error) {
      console.error('Error fetching clients data:', error)
      setClientsData([])
    }
  }

  const fetchLawyerPerformanceData = async (uid) => {
    try {
      const { data: userMetadata } = await supabase
        .from('user_metadata')
        .select('admin_user_id, new_lawyer_id, username')
        .or(`new_lawyer_id.eq.${uid}, admin_user_id.eq.${uid}`)

      if (!userMetadata || userMetadata.length === 0) return

      const isAdmin = userMetadata.some(meta => meta.admin_user_id === uid)
      const lawyerIds = userMetadata
        .filter(meta => meta.admin_user_id === uid)
        .map(meta => meta.new_lawyer_id)

      if (!isAdmin) return // Only admins can see lawyer performance

      // Get all lawyers
      const { data: allLawyers } = await supabase
        .from('user_metadata')
        .select('username, new_lawyer_id')
        .in('new_lawyer_id', lawyerIds)
        .not('username', 'is', null)

      if (!allLawyers || allLawyers.length === 0) {
        setLawyerPerformanceData([])
        return
      }

      // Calculate performance for each lawyer
      const performanceData = await Promise.all(
        allLawyers.map(async (lawyer) => {
          const lawyerId = lawyer.new_lawyer_id

          // Get cases for this lawyer
          const { data: lawyerCases } = await supabase
            .from('cases')
            .select('id, case_number, caseState, totalAmount, caseDate')
            .or(`lawyer_id.eq.${lawyerId}, caseLawyerId.eq.${lawyerId}`)

          // Get actions
          const { data: lawyerActions } = await supabase
            .from('actions')
            .select('id')
            .eq('user_id', lawyerId)

          // Get tasks
          const { data: lawyerTasks } = await supabase
            .from('tasks')
            .select('id, task_status, task_deadline')
            .eq('lawyer_id', lawyerId)

          // Get payments
          const lawyerCaseIds = (lawyerCases || []).map(c => c.id)
          const { data: payments } = await supabase
            .from('lawyer_fees')
            .select('payment_amount')
            .in('case_id', lawyerCaseIds)

          const totalCases = (lawyerCases || []).length
          const completedCases = (lawyerCases || []).filter(c => {
            const status = (c.caseState || '').toLowerCase()
            return status.includes('مكتملة') || status.includes('مغلقة') || status.includes('منتهية')
          }).length

          const totalRevenue = (lawyerCases || []).reduce((sum, c) => sum + (parseFloat(c.totalAmount) || 0), 0)
          const totalPayments = (payments || []).reduce((sum, p) => sum + (parseFloat(p.payment_amount) || 0), 0)
          const totalActions = (lawyerActions || []).length
          const totalTasks = (lawyerTasks || []).length
          const completedTasks = (lawyerTasks || []).filter(t => t.task_status === 'completed').length
          
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const overdueTasks = (lawyerTasks || []).filter(t => {
            if (!t.task_deadline || t.task_status === 'completed') return false
            return new Date(t.task_deadline) < today
          }).length

          const completionRate = totalCases > 0 ? (completedCases / totalCases) * 100 : 0
          const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
          const collectionRate = totalRevenue > 0 ? (totalPayments / totalRevenue) * 100 : 0
          const avgRevenuePerCase = totalCases > 0 ? totalRevenue / totalCases : 0

          return {
            lawyerName: lawyer.username,
            lawyerId: lawyerId,
            totalCases,
            completedCases,
            activeCases: totalCases - completedCases,
            completionRate: completionRate.toFixed(1),
            totalRevenue,
            totalPayments,
            outstandingBalance: totalRevenue - totalPayments,
            collectionRate: collectionRate.toFixed(1),
            avgRevenuePerCase: avgRevenuePerCase.toFixed(2),
            totalActions,
            totalTasks,
            completedTasks,
            overdueTasks,
            taskCompletionRate: taskCompletionRate.toFixed(1),
            performanceScore: ((completionRate * 0.4) + (collectionRate * 0.3) + (taskCompletionRate * 0.3)).toFixed(1)
          }
        })
      )

      // Sort by performance score
      performanceData.sort((a, b) => parseFloat(b.performanceScore) - parseFloat(a.performanceScore))
      setLawyerPerformanceData(performanceData)
    } catch (error) {
      console.error('Error fetching lawyer performance:', error)
      setLawyerPerformanceData([])
    }
  }

  const fetchLawyers = async (uid) => {
    try {
      const { data: userMetadata } = await supabase
        .from('user_metadata')
        .select('admin_user_id, new_lawyer_id, username')
        .or(`new_lawyer_id.eq.${uid}, admin_user_id.eq.${uid}`)

      if (!userMetadata || userMetadata.length === 0) return

      const isAdmin = userMetadata.some(meta => meta.admin_user_id === uid)
      
      if (isAdmin) {
        const lawyerIds = userMetadata
          .filter(meta => meta.admin_user_id === uid)
          .map(meta => meta.new_lawyer_id)
        
        const { data } = await supabase
          .from('user_metadata')
          .select('username')
          .in('new_lawyer_id', lawyerIds)
        
        const lawyers = (data || []).map(l => l.username).filter(Boolean)
        setAvailableLawyers(lawyers)
      } else {
        const { data } = await supabase
          .from('user_metadata')
          .select('username')
          .eq('new_lawyer_id', uid)
          .limit(1)
        
        if (data && data[0]) {
          setAvailableLawyers([data[0].username])
        }
      }
    } catch (error) {
      console.error('Error fetching lawyers:', error)
    }
  }

  // Helper function to convert DD/MM/YYYY to Date object
  const parseDate = (dateStr) => {
    if (!dateStr) return null
    const parts = dateStr.split('/')
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
    }
    return null
  }

  // Helper function to format date for Supabase query (YYYY-MM-DD)
  const formatDateForQuery = (date) => {
    if (!date) return null
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Fetch lawyer highlights when a lawyer is selected
  const fetchLawyerHighlights = async (lawyerName, dateRange = null) => {
    if (!lawyerName || !userId) {
      setLawyerHighlights(null)
      return
    }

    try {
      // Get lawyer ID from username
      const { data: lawyerMeta } = await supabase
        .from('user_metadata')
        .select('new_lawyer_id')
        .eq('username', lawyerName)
        .limit(1)

      if (!lawyerMeta || lawyerMeta.length === 0) {
        setLawyerHighlights(null)
        return
      }

      const lawyerId = lawyerMeta[0].new_lawyer_id

      // Parse date range if provided
      let fromDate = null
      let toDate = null
      if (dateRange && dateRange.from && dateRange.to) {
        fromDate = parseDate(dateRange.from)
        toDate = parseDate(dateRange.to)
        if (toDate) {
          toDate.setHours(23, 59, 59, 999) // Include full end date
        }
      }

      // Build date filter for queries
      const buildDateFilter = (dateField) => {
        if (!fromDate || !toDate) return {}
        const fromStr = formatDateForQuery(fromDate)
        const toStr = formatDateForQuery(toDate)
        return { gte: fromStr, lte: toStr }
      }

      // Fetch all data in parallel with date filtering
      const [casesResult, updatesResult, sessionsResult, actionsResult, attachmentsResult, remindersResult, notesResult, tasksResult, financialResult] = await Promise.all([
        // Cases added by lawyer (with more fields for metrics)
        (async () => {
          let query = supabase
            .from('cases')
            .select('id, case_number, created_at, updated_at, caseState, totalAmount, client_name')
            .or(`lawyer_id.eq.${lawyerId}, caseLawyerId.eq.${lawyerId}`)
          
          if (fromDate && toDate) {
            const fromStr = formatDateForQuery(fromDate)
            const toStr = formatDateForQuery(toDate)
            query = query.gte('created_at', fromStr).lte('created_at', toStr)
          }
          
          return query
        })(),
        
        // Updates (case_update table)
        (async () => {
          let query = supabase
            .from('case_update')
            .select('id, created_at')
            .eq('user_id', lawyerId)
          
          if (fromDate && toDate) {
            const fromStr = formatDateForQuery(fromDate)
            const toStr = formatDateForQuery(toDate)
            query = query.gte('created_at', fromStr).lte('created_at', toStr)
          }
          
          return query
        })(),
        
        // Sessions
        (async () => {
          let query = supabase
            .from('sessions')
            .select('id, sessiondate, case_number')
            .eq('user_id', lawyerId)
          
          if (fromDate && toDate) {
            const fromStr = formatDateForQuery(fromDate)
            const toStr = formatDateForQuery(toDate)
            query = query.gte('sessiondate', fromStr).lte('sessiondate', toStr)
          }
          
          return query
        })(),
        
        // Actions
        (async () => {
          let query = supabase
            .from('actions')
            .select('id, actiondate, case_number, created_at')
            .eq('user_id', lawyerId)
          
          if (fromDate && toDate) {
            const fromStr = formatDateForQuery(fromDate)
            const toStr = formatDateForQuery(toDate)
            query = query.gte('actiondate', fromStr).lte('actiondate', toStr)
          }
          
          return query
        })(),
        
        // Attachments (get case numbers first, then attachments)
        (async () => {
          const { data: lawyerCases } = await supabase
            .from('cases')
            .select('case_number, created_at')
            .or(`lawyer_id.eq.${lawyerId}, caseLawyerId.eq.${lawyerId}`)
          
          // Filter cases by date if date range is provided
          let filteredCases = lawyerCases || []
          if (fromDate && toDate) {
            filteredCases = filteredCases.filter(c => {
              if (!c.created_at) return false
              const caseDate = new Date(c.created_at)
              return caseDate >= fromDate && caseDate <= toDate
            })
          }
          
          const caseNumbers = filteredCases.map(c => c.case_number).filter(Boolean)
          if (caseNumbers.length === 0) return { data: [], error: null }
          
          return supabase
            .from('attachments')
            .select('id')
            .in('case_number', caseNumbers)
        })(),
        
        // Reminders
        (async () => {
          let query = supabase
            .from('reminders')
            .select('id, reminder_date')
            .eq('user_id', lawyerId)
          
          if (fromDate && toDate) {
            const fromStr = formatDateForQuery(fromDate)
            const toStr = formatDateForQuery(toDate)
            query = query.gte('reminder_date', fromStr).lte('reminder_date', toStr)
          }
          
          return query
        })(),
        
        // Notes
        (async () => {
          let query = supabase
            .from('notes')
            .select('id, created_at')
            .eq('user_id', lawyerId)
          
          if (fromDate && toDate) {
            const fromStr = formatDateForQuery(fromDate)
            const toStr = formatDateForQuery(toDate)
            query = query.gte('created_at', fromStr).lte('created_at', toStr)
          }
          
          return query
        })(),
        
        // Tasks
        (async () => {
          let query = supabase
            .from('tasks')
            .select('id, task_status, task_deadline, created_at, updated_at')
            .eq('lawyer_id', lawyerId)
          
          if (fromDate && toDate) {
            const fromStr = formatDateForQuery(fromDate)
            const toStr = formatDateForQuery(toDate)
            query = query.gte('created_at', fromStr).lte('created_at', toStr)
          }
          
          return query
        })(),
        
        // Financial data (payments)
        (async () => {
          const { data: lawyerCases } = await supabase
            .from('cases')
            .select('id, created_at')
            .or(`lawyer_id.eq.${lawyerId}, caseLawyerId.eq.${lawyerId}`)
          
          let filteredCases = lawyerCases || []
          if (fromDate && toDate) {
            filteredCases = filteredCases.filter(c => {
              if (!c.created_at) return false
              const caseDate = new Date(c.created_at)
              return caseDate >= fromDate && caseDate <= toDate
            })
          }
          
          const caseIds = filteredCases.map(c => c.id).filter(Boolean)
          if (caseIds.length === 0) return { data: [], error: null }
          
          return supabase
            .from('lawyer_fees')
            .select('payment_amount, payment_date')
            .in('case_id', caseIds)
        })(),
      ])

      // Calculate additional performance metrics
      const cases = casesResult.data || []
      const sessions = sessionsResult.data || []
      const actions = actionsResult.data || []
      const tasks = tasksResult.data || []
      const payments = financialResult.data || []
      
      // Case metrics
      const completedCases = cases.filter(c => {
        const status = (c.caseState || '').toLowerCase()
        return status.includes('مكتملة') || status.includes('مغلقة') || status.includes('منتهية')
      })
      
      const activeCases = cases.filter(c => {
        const status = (c.caseState || '').toLowerCase()
        return !status.includes('مكتملة') && !status.includes('مغلقة') && !status.includes('منتهية')
      })
      
      const caseCompletionRate = cases.length > 0 ? Math.round((completedCases.length / cases.length) * 100) : 0
      
      // Average case resolution time (for completed cases)
      let totalResolutionDays = 0
      let resolutionCount = 0
      completedCases.forEach(c => {
        if (c.created_at && c.updated_at) {
          const created = new Date(c.created_at)
          const updated = new Date(c.updated_at)
          const days = Math.floor((updated - created) / (1000 * 60 * 60 * 24))
          if (days > 0) {
            totalResolutionDays += days
            resolutionCount++
          }
        }
      })
      const avgCaseResolutionTime = resolutionCount > 0 ? Math.round(totalResolutionDays / resolutionCount) : 0
      
      // Average sessions per case
      const caseNumbers = cases.map(c => c.case_number).filter(Boolean)
      const sessionsByCase = {}
      sessions.forEach(s => {
        if (s.case_number) {
          sessionsByCase[s.case_number] = (sessionsByCase[s.case_number] || 0) + 1
        }
      })
      const avgSessionsPerCase = caseNumbers.length > 0 
        ? (sessions.length / caseNumbers.length).toFixed(1) 
        : 0
      
      // Average actions per case
      const actionsByCase = {}
      actions.forEach(a => {
        if (a.case_number) {
          actionsByCase[a.case_number] = (actionsByCase[a.case_number] || 0) + 1
        }
      })
      const avgActionsPerCase = caseNumbers.length > 0 
        ? (actions.length / caseNumbers.length).toFixed(1) 
        : 0
      
      // Response time (average days to first action after case creation)
      let totalResponseDays = 0
      let responseCount = 0
      cases.forEach(c => {
        if (c.created_at) {
          const caseCreated = new Date(c.created_at)
          const firstAction = actions
            .filter(a => a.case_number === c.case_number)
            .sort((a, b) => {
              const dateA = new Date(a.actiondate || a.created_at || 0)
              const dateB = new Date(b.actiondate || b.created_at || 0)
              return dateA - dateB
            })[0]
          
          if (firstAction && (firstAction.actiondate || firstAction.created_at)) {
            const actionDate = new Date(firstAction.actiondate || firstAction.created_at)
            const days = Math.floor((actionDate - caseCreated) / (1000 * 60 * 60 * 24))
            if (days >= 0) {
              totalResponseDays += days
              responseCount++
            }
          }
        }
      })
      const avgResponseTime = responseCount > 0 ? Math.round(totalResponseDays / responseCount) : 0
      
      // Task metrics
      const completedTasks = tasks.filter(t => t.task_status === 'completed')
      const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const overdueTasks = tasks.filter(t => {
        if (!t.task_deadline || t.task_status === 'completed') return false
        return new Date(t.task_deadline) < today
      }).length
      
      // Average task completion time
      let totalTaskDays = 0
      let taskCount = 0
      completedTasks.forEach(t => {
        if (t.created_at && t.updated_at) {
          const created = new Date(t.created_at)
          const updated = new Date(t.updated_at)
          const days = Math.floor((updated - created) / (1000 * 60 * 60 * 24))
          if (days > 0) {
            totalTaskDays += days
            taskCount++
          }
        }
      })
      const avgTaskCompletionTime = taskCount > 0 ? Math.round(totalTaskDays / taskCount) : 0
      
      // Financial metrics
      const totalRevenue = cases.reduce((sum, c) => sum + (parseFloat(c.totalAmount) || 0), 0)
      const totalPaymentsAmount = payments.reduce((sum, p) => sum + (parseFloat(p.payment_amount) || 0), 0)
      const collectionRate = totalRevenue > 0 ? Math.round((totalPaymentsAmount / totalRevenue) * 100) : 0
      const avgRevenuePerCase = cases.length > 0 ? Math.round(totalRevenue / cases.length) : 0
      
      // Client metrics
      const uniqueClients = new Set(cases.map(c => c.client_name).filter(Boolean))
      const totalClients = uniqueClients.size
      const activeClients = new Set(activeCases.map(c => c.client_name).filter(Boolean)).size
      
      // Productivity score (weighted combination)
      const productivityScore = Math.round(
        (caseCompletionRate * 0.3) +
        (taskCompletionRate * 0.25) +
        (collectionRate * 0.25) +
        (Math.min(100, (100 - (avgCaseResolutionTime / 365 * 100))) * 0.2)
      )

      setLawyerHighlights({
        addedCases: cases.length,
        updates: (updatesResult.data || []).length,
        sessions: sessions.length,
        actions: actions.length,
        attachments: (attachmentsResult.data || []).length,
        reminders: (remindersResult.data || []).length,
        notes: (notesResult.data || []).length,
        movements: (updatesResult.data || []).length + actions.length,
        // New performance metrics
        completedCases: completedCases.length,
        activeCases: activeCases.length,
        caseCompletionRate,
        avgCaseResolutionTime,
        avgSessionsPerCase: parseFloat(avgSessionsPerCase),
        avgActionsPerCase: parseFloat(avgActionsPerCase),
        avgResponseTime,
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        overdueTasks,
        taskCompletionRate,
        avgTaskCompletionTime,
        totalRevenue,
        totalPayments: totalPaymentsAmount,
        collectionRate,
        avgRevenuePerCase,
        totalClients,
        activeClients,
        productivityScore,
      })
    } catch (error) {
      console.error('Error fetching lawyer highlights:', error)
      setLawyerHighlights(null)
    }
  }

  // Calculate date range based on selection type
  const calculateDateRange = (rangeType) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let fromDate = new Date()
    let toDate = new Date()
    
    switch(rangeType) {
      case 'اليوم':
        fromDate = new Date(today)
        toDate = new Date(today)
        break
      case 'هذا الاسبوع': {
        const dayOfWeek = today.getDay()
        fromDate = new Date(today)
        fromDate.setDate(today.getDate() - dayOfWeek)
        toDate = new Date(fromDate)
        toDate.setDate(fromDate.getDate() + 6)
        break
      }
      case 'الاسبوع الماضي': {
        const lastWeekDay = today.getDay()
        fromDate = new Date(today)
        fromDate.setDate(today.getDate() - lastWeekDay - 7)
        toDate = new Date(fromDate)
        toDate.setDate(fromDate.getDate() + 6)
        break
      }
      case 'هذا الشهر':
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1)
        toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        break
      case 'الشهر الماضي':
        fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        toDate = new Date(today.getFullYear(), today.getMonth(), 0)
        break
      case 'اخر 3 أشهر':
        fromDate = new Date(today)
        fromDate.setMonth(today.getMonth() - 3)
        fromDate.setDate(1)
        toDate = new Date(today)
        break
      case 'اخر 6 أشهر':
        fromDate = new Date(today)
        fromDate.setMonth(today.getMonth() - 6)
        fromDate.setDate(1)
        toDate = new Date(today)
        break
      case 'هذه السنة':
        fromDate = new Date(today.getFullYear(), 0, 1)
        toDate = new Date(today.getFullYear(), 11, 31)
        break
      case 'السنة الماضية':
        fromDate = new Date(today.getFullYear() - 1, 0, 1)
        toDate = new Date(today.getFullYear() - 1, 11, 31)
        break
      case 'كل التواريخ':
        fromDate = new Date(2000, 0, 1)
        toDate = new Date(today)
        toDate.setFullYear(today.getFullYear() + 10)
        break
      default:
        return null
    }
    
    const formatDate = (date) => {
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    }
    
    return {
      from: formatDate(fromDate),
      to: formatDate(toDate)
    }
  }

  // useEffect to fetch highlights when selectedLawyer or date range changes
  useEffect(() => {
    if (selectedLawyer) {
      fetchLawyerHighlights(selectedLawyer, lawyerDateRange.from && lawyerDateRange.to ? lawyerDateRange : null)
    } else {
      setLawyerHighlights(null)
    }
  }, [selectedLawyer, userId, lawyerDateRange])

  // Don't initialize date range on mount - wait for user selection

  // Handle date range type change
  const handleDateRangeTypeChange = (rangeType) => {
    setSelectedDateRangeType(rangeType)
    
    if (!rangeType || rangeType === '') {
      setLawyerDateRange({ from: '', to: '' })
      // Refetch data without date filter
      if (selectedLawyer) {
        fetchLawyerHighlights(selectedLawyer, null)
      }
      return
    }
    
    if (rangeType === 'نطاق مخصص') {
      setShowCustomDateModal(true)
    } else {
      const dateRange = calculateDateRange(rangeType)
      if (dateRange) {
        setLawyerDateRange(dateRange)
        // Refetch data with new date range
        if (selectedLawyer) {
          fetchLawyerHighlights(selectedLawyer, dateRange)
        }
      }
    }
  }

  // Handle custom date range update
  const handleCustomDateUpdate = () => {
    if (customDateInputs.from && customDateInputs.to) {
      // Format dates from YYYY-MM-DD to DD/MM/YYYY
      const formatDate = (dateStr) => {
        if (!dateStr) return ''
        if (dateStr.includes('-')) {
          const parts = dateStr.split('-')
          return `${parts[2]}/${parts[1]}/${parts[0]}`
        }
        return dateStr
      }
      const dateRange = {
        from: formatDate(customDateInputs.from),
        to: formatDate(customDateInputs.to)
      }
      setLawyerDateRange(dateRange)
      setShowCustomDateModal(false)
      setSelectedDateRangeType('نطاق مخصص')
      // Refetch data with custom date range
      if (selectedLawyer) {
        fetchLawyerHighlights(selectedLawyer, dateRange)
      }
    }
  }

  const calculateCaseStats = (cases) => {
    const statusCounts = {
      active: 0,
      completed: 0,
      ended: 0,
      pending: 0,
      overdue: 0
    }

    const dynamicStatusCounts = {}

    cases.forEach(caseItem => {
      const status = caseItem.caseState || 'غير محدد'
      dynamicStatusCounts[status] = (dynamicStatusCounts[status] || 0) + 1

      const lowerStatus = status.toLowerCase()
      if (lowerStatus.includes('مكتملة') || lowerStatus.includes('مغلقة')) {
        statusCounts.completed++
      } else if (lowerStatus.includes('منتهية')) {
        statusCounts.ended++
      } else if (lowerStatus.includes('قيد النظر') || lowerStatus.includes('قيد العمل')) {
        statusCounts.pending++
      } else if (lowerStatus.includes('متأخرة') || lowerStatus.includes('متعثرة')) {
        statusCounts.overdue++
      } else if (status) { // Default to قيد التداول
        statusCounts.active++
      }
    })

    setOverviewStats(prev => ({
      ...prev,
      totalCases: cases.length,
      activeCases: statusCounts.active,
      completedCases: statusCounts.completed,
      endedCases: statusCounts.ended,
      pendingCases: statusCounts.pending,
      overdueCases: statusCounts.overdue,
      dynamicStatusCounts
    }))
  }

  // Case Status Distribution Chart Data
  const getCaseStatusChartData = () => {
    const dynamicCounts = overviewStats.dynamicStatusCounts || {}
    const labels = Object.keys(dynamicCounts)
    const data = Object.values(dynamicCounts)
    
    // Provide a beautiful palette for dynamic statuses
    const colors = [
      '#2563EB', '#10B981', '#F59E0B', '#EF4444', 
      '#8B5CF6', '#06B6D4', '#F97316', '#64748B', 
      '#EC4899', '#14B8A6', '#3B82F6', '#84CC16'
    ]

    return {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: Array(labels.length).fill('#ffffff'),
        borderWidth: 2,
        hoverOffset: 4
      }]
    }
  }

  // Case Type Distribution Chart Data
  const getCaseTypeChartData = () => {
    const typeCounts = {}
    
    casesData.forEach(caseItem => {
      const type = caseItem.caseType || caseItem.caseType2 || 'غير محدد'
      typeCounts[type] = (typeCounts[type] || 0) + 1
    })

    const sortedTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8) // Top 8 types

    const colors = ['#2563EB', '#22C55E', '#F97316', '#A855F7', '#0EA5E9', '#F43F5E', '#14B8A6', '#7C3AED']

    return {
      labels: sortedTypes.map(([type]) => type),
      datasets: [{
        label: 'عدد القضايا',
        data: sortedTypes.map(([, count]) => count),
        backgroundColor: colors.slice(0, sortedTypes.length),
        borderColor: colors.slice(0, sortedTypes.length).map(c => c),
        borderWidth: 2,
        borderRadius: 6
      }]
    }
  }

  // Financial Summary Chart Data
  const getFinancialChartData = () => {
    const filteredCases = casesFinancialData
      .filter(c => c.currency === financialChartCurrency || (financialChartCurrency === 'IQD' && !c.currency))
      .sort((a, b) => b.caseValue - a.caseValue)
      .slice(0, 10)

    const labels = filteredCases.map(c => {
      const clientName = c.client_name || 'موكل غير محدد'
      const caseNum = c.case_number || 'بدون رقم'
      const truncatedClient = clientName.length > 20 ? clientName.substring(0, 18) + '...' : clientName
      const truncatedCase = caseNum.length > 15 ? caseNum.substring(0, 12) + '...' : caseNum
      return `${truncatedClient} - ${truncatedCase}`
    })

    return {
      labels,
      datasets: [
        {
          label: 'المبالغ المستلمة',
          data: filteredCases.map(c => c.paidAmount),
          backgroundColor: '#10B981', // Emerald Green
          borderColor: '#059669',
          borderWidth: 1,
          borderRadius: 4,
          stack: 'combined',
        },
        {
          label: 'المتبقي',
          data: filteredCases.map(c => c.outstandingAmount),
          backgroundColor: '#F59E0B', // Amber Orange
          borderColor: '#D97706',
          borderWidth: 1,
          borderRadius: 4,
          stack: 'combined',
        },
      ],
    }
  }

  // Actions Summary Chart Data
  const getActionsChartData = () => {
    const typeCounts = {}
    
    actionsData.forEach(action => {
      const type = action.actiontype || 'غير محدد'
      typeCounts[type] = (typeCounts[type] || 0) + 1
    })

    const sortedTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)

    const colors = ['#2563EB', '#22C55E', '#F97316', '#A855F7', '#0EA5E9', '#F43F5E', '#14B8A6', '#7C3AED']

    return {
      labels: sortedTypes.map(([type]) => type),
      datasets: [{
        label: 'عدد الإجراءات',
        data: sortedTypes.map(([, count]) => count),
        backgroundColor: colors.slice(0, sortedTypes.length),
        borderColor: colors.slice(0, sortedTypes.length),
        borderWidth: 2,
        borderRadius: 6
      }]
    }
  }

  const getActionsTimelineChartData = () => {
    const monthlyCounts = {}
    
    actionsData.forEach(action => {
      if (action.actiondate) {
        const date = new Date(action.actiondate)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1
      }
    })

    const sortedMonths = Object.keys(monthlyCounts)
      .sort()
      .slice(-6)

    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ]

    return {
      labels: sortedMonths.map(monthKey => {
        const [, month] = monthKey.split('-')
        return arabicMonths[parseInt(month) - 1]
      }),
      datasets: [{
        label: 'عدد الإجراءات',
        data: sortedMonths.map(monthKey => monthlyCounts[monthKey]),
        backgroundColor: '#2563EB',
        borderColor: '#1e40af',
        borderWidth: 2,
        tension: 0.4
      }]
    }
  }

  // Tasks Overview Chart Data
  const getTasksStatusChartData = () => {
    const statusCounts = {
      pending: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    tasksData.forEach(task => {
      const status = task.task_status || 'pending'
      const deadline = task.task_deadline ? new Date(task.task_deadline) : null

      if (status === 'completed') {
        statusCounts.completed++
      } else if (deadline && deadline < today) {
        statusCounts.overdue++
      } else if (status === 'in_progress') {
        statusCounts.inProgress++
      } else {
        statusCounts.pending++
      }
    })

    return {
      labels: ['قيد الانتظار', 'قيد التنفيذ', 'مكتملة', 'متأخرة'],
      datasets: [{
        data: [
          statusCounts.pending,
          statusCounts.inProgress,
          statusCounts.completed,
          statusCounts.overdue
        ],
        backgroundColor: ['#F59E0B', '#2563EB', '#10B981', '#EF4444'],
        borderColor: ['#d97706', '#1e40af', '#059669', '#dc2626'],
        borderWidth: 2
      }]
    }
  }

  const getTasksPriorityChartData = () => {
    const priorityCounts = {}
    
    tasksData.forEach(task => {
      const priority = task.task_priority || 'medium'
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1
    })

    return {
      labels: ['عاجلة', 'متوسطة', 'منخفضة'],
      datasets: [{
        label: 'عدد المهام',
        data: [
          priorityCounts.high || 0,
          priorityCounts.medium || 0,
          priorityCounts.low || 0
        ],
        backgroundColor: ['#EF4444', '#F59E0B', '#10B981'],
        borderColor: ['#dc2626', '#d97706', '#059669'],
        borderWidth: 2,
        borderRadius: 6
      }]
    }
  }

  // Lawyer Performance Chart Data
  const getLawyerPerformanceChartData = () => {
    const topLawyers = lawyerPerformanceData.slice(0, 10)

    return {
      labels: topLawyers.map(l => l.lawyerName),
      datasets: [
        {
          label: 'معدل الإنجاز (%)',
          data: topLawyers.map(l => parseFloat(l.completionRate)),
          backgroundColor: '#2563EB',
          borderColor: '#1e40af',
          borderWidth: 2,
          borderRadius: 6,
          yAxisID: 'y',
        },
        {
          label: 'معدل التحصيل (%)',
          data: topLawyers.map(l => parseFloat(l.collectionRate)),
          backgroundColor: '#10B981',
          borderColor: '#059669',
          borderWidth: 2,
          borderRadius: 6,
          yAxisID: 'y',
        }
      ]
    }
  }

  const getLawyerCasesChartData = () => {
    const sortedLawyers = [...lawyerPerformanceData]
      .sort((a, b) => b.totalCases - a.totalCases)
      .slice(0, 10)

    return {
      labels: sortedLawyers.map(l => l.lawyerName),
      datasets: [{
        label: 'عدد القضايا',
        data: sortedLawyers.map(l => l.totalCases),
        backgroundColor: '#2563EB',
        borderColor: '#1e40af',
        borderWidth: 2,
        borderRadius: 6
      }]
    }
  }

  const getLawyerRevenueChartData = () => {
    const sortedLawyers = [...lawyerPerformanceData]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10)

    return {
      labels: sortedLawyers.map(l => l.lawyerName),
      datasets: [
        {
          label: 'إجمالي الإيرادات',
          data: sortedLawyers.map(l => l.totalRevenue),
          backgroundColor: '#0F172A',
          borderColor: '#0F172A',
          borderWidth: 2,
          borderRadius: 6
        },
        {
          label: 'المدفوع',
          data: sortedLawyers.map(l => l.totalPayments),
          backgroundColor: '#2563EB',
          borderColor: '#2563EB',
          borderWidth: 2,
          borderRadius: 6
        }
      ]
    }
  }

  // Advanced Analytics - Trends
  const getMonthlyTrendData = () => {
    const monthlyData = {}
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    casesData.forEach(caseItem => {
      if (caseItem.caseDate) {
        const date = new Date(caseItem.caseDate)
        if (date >= sixMonthsAgo) {
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { cases: 0, revenue: 0 }
          }
          monthlyData[monthKey].cases++
          monthlyData[monthKey].revenue += parseFloat(caseItem.totalAmount || 0)
        }
      }
    })

    const sortedMonths = Object.keys(monthlyData).sort()
    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ]

    return {
      labels: sortedMonths.map(monthKey => {
        const [, month] = monthKey.split('-')
        return arabicMonths[parseInt(month) - 1]
      }),
      datasets: [
        {
          label: 'عدد القضايا الجديدة',
          data: sortedMonths.map(monthKey => monthlyData[monthKey].cases),
          borderColor: '#2563EB',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'الإيرادات (ألف د.ع)',
          data: sortedMonths.map(monthKey => monthlyData[monthKey].revenue / 1000),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          yAxisID: 'y1'
        }
      ]
    }
  }

  const getComparisonData = () => {
    const currentMonth = new Date()
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    const currentMonthCases = casesData.filter(c => {
      if (!c.caseDate) return false
      const date = new Date(c.caseDate)
      return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear()
    }).length

    const lastMonthCases = casesData.filter(c => {
      if (!c.caseDate) return false
      const date = new Date(c.caseDate)
      return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear()
    }).length

    const currentMonthRevenue = casesFinancialData
      .filter(c => {
        const caseItem = casesData.find(cs => cs.id === c.id)
        if (!caseItem?.caseDate) return false
        const date = new Date(caseItem.caseDate)
        return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear()
      })
      .reduce((sum, c) => sum + c.caseValue, 0)

    const lastMonthRevenue = casesFinancialData
      .filter(c => {
        const caseItem = casesData.find(cs => cs.id === c.id)
        if (!caseItem?.caseDate) return false
        const date = new Date(caseItem.caseDate)
        return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear()
      })
      .reduce((sum, c) => sum + c.caseValue, 0)

    const casesChange = lastMonthCases > 0 ? ((currentMonthCases - lastMonthCases) / lastMonthCases * 100).toFixed(1) : 0
    const revenueChange = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : 0

    return {
      cases: {
        current: currentMonthCases,
        last: lastMonthCases,
        change: parseFloat(casesChange),
        isPositive: parseFloat(casesChange) >= 0
      },
      revenue: {
        current: currentMonthRevenue,
        last: lastMonthRevenue,
        change: parseFloat(revenueChange),
        isPositive: parseFloat(revenueChange) >= 0
      }
    }
  }

  // Clients Chart Data
  const getClientsChartData = () => {
    const topClients = [...clientsData]
      .sort((a, b) => b.totalCases - a.totalCases)
      .slice(0, 10)

    const colors = ['#2563EB', '#22C55E', '#F97316', '#A855F7', '#0EA5E9', '#F43F5E', '#14B8A6', '#7C3AED', '#8B5CF6', '#EC4899']

    return {
      labels: topClients.map(c => c.clientName),
      datasets: [{
        label: 'عدد القضايا',
        data: topClients.map(c => c.totalCases),
        backgroundColor: colors.slice(0, topClients.length),
        borderColor: colors.slice(0, topClients.length),
        borderWidth: 2,
        borderRadius: 6
      }]
    }
  }

  // Export Functions
  const exportToPDF = async (title, tableData, columns) => {
    // 1) Create a hidden container for rendering the HTML table
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.top = '0'
    container.style.width = '297mm' // A4 landscape width
    container.style.padding = '20mm'
    container.style.backgroundColor = 'white'
    container.style.fontFamily = "'Cairo', 'Almarai', sans-serif"
    container.style.direction = 'rtl'
    container.style.color = '#1e293b'

    // 2) Content Construction (Header + Table)
    container.innerHTML = `
      <div style="margin-bottom: 25px; border-bottom: 3px solid #2563EB; padding-bottom: 15px;">
        <h1 style="font-size: 28px; margin: 0; color: #2563EB;">${title}</h1>
        <p style="font-size: 14px; margin: 10px 0 0 0; color: #64748B;">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background-color: #2563EB; color: white;">
            ${columns.map(col => `<th style="padding: 12px; text-align: right; border: 1px solid #1e40af; font-size: 14px;">${col.header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${tableData.map((row, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              ${columns.map(col => {
                const value = row[col.key]
                const displayValue = (value === null || value === undefined) ? '-' : String(value)
                return `<td style="padding: 10px; text-align: right; border: 1px solid #e2e8f0; font-size: 12px; color: #334155;">${displayValue}</td>`
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 30px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        <p style="font-size: 12px; color: #94a3b8;">تم إنشاء هذا التقرير آلياً بواسطة نظام إدارة القضايا</p>
      </div>
    `
    document.body.appendChild(container)

    try {
      // 3) Use html2canvas to render to a high-res image
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })
      
      const imgData = canvas.toDataURL('image/png')
      const doc = new jsPDF('l', 'mm', 'a4')
      
      const pdfWidth = doc.internal.pageSize.getWidth()
      const pdfHeight = doc.internal.pageSize.getHeight()
      const imgProps = doc.getImageProperties(imgData)
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width
      
      let heightLeft = imgHeight
      let position = 0
      
      // Handle multi-page reports
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
      heightLeft -= pdfHeight
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        doc.addPage()
        doc.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
        heightLeft -= pdfHeight
      }
      
      doc.save(`${title}-${Date.now()}.pdf`)
    } catch (err) {
      console.error('PDF Generation Error:', err)
      alert('حدث خطأ أثناء إنشاء ملف PDF. يرجى محاولة التصدير بصيغة CSV.')
    } finally {
      document.body.removeChild(container)
    }
  }

  // Export lawyer performance report as HTML/PDF
  const exportLawyerPerformanceReport = async (lawyerName, format = 'PDF') => {
    if (!lawyerName || !lawyerHighlights) {
      alert('يرجى اختيار محامي أولاً')
      return
    }

    const selectedLawyerData = lawyerPerformanceData.find(l => l.lawyerName === lawyerName)
    if (!selectedLawyerData) {
      alert('لا توجد بيانات للمحامي المحدد')
      return
    }

    const printDate = new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Create professional HTML report
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير أداء المحامي - ${lawyerName}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Cairo', sans-serif;
            direction: rtl;
            background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
            padding: 30px 20px;
            color: #1e293b;
            line-height: 1.6;
          }
          .report-container {
            max-width: 210mm;
            margin: 0 auto;
            background: #ffffff;
            padding: 40px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            border-radius: 16px;
          }
          .report-header {
            background: linear-gradient(135deg, #2563EB 0%, #1e40af 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 40px;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
          }
          .report-header h1 {
            font-size: 32px;
            font-weight: 800;
            margin-bottom: 15px;
            letter-spacing: -0.5px;
          }
          .report-header .lawyer-name {
            font-size: 26px;
            font-weight: 700;
            margin-bottom: 12px;
            opacity: 0.95;
          }
          .report-header .print-date {
            font-size: 15px;
            opacity: 0.9;
            font-weight: 500;
            margin-top: 8px;
          }
          .report-header .date-range-info {
            font-size: 16px;
            opacity: 0.95;
            font-weight: 600;
            margin-top: 8px;
            padding: 8px 16px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            display: inline-block;
          }
          .section {
            margin-bottom: 40px;
          }
          .section-title {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 25px;
            padding-bottom: 12px;
            border-bottom: 3px solid #e2e8f0;
            position: relative;
          }
          .section-title::after {
            content: '';
            position: absolute;
            bottom: -3px;
            right: 0;
            width: 80px;
            height: 3px;
            background: linear-gradient(90deg, #2563EB 0%, #3b82f6 100%);
            border-radius: 2px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          .stat-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            transition: transform 0.2s, box-shadow 0.2s;
            position: relative;
            overflow: hidden;
          }
          .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(180deg, #2563EB 0%, #3b82f6 100%);
          }
          .stat-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
          }
          .stat-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 700;
            background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
            color: #2563EB;
          }
          .stat-label {
            font-size: 14px;
            color: #64748b;
            font-weight: 600;
            margin-bottom: 8px;
            line-height: 1.4;
          }
          .stat-label-bold {
            font-size: 16px;
            color: #0f172a;
            font-weight: 700;
            margin-bottom: 8px;
            line-height: 1.6;
          }
          .stat-value-inline {
            font-size: 18px;
            font-weight: 800;
            color: #2563EB;
            margin-right: 4px;
          }
          .stat-value {
            font-size: 32px;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.2;
            letter-spacing: -1px;
          }
          .stat-value.large-stat {
            font-size: 42px;
            color: #2563EB;
          }
          .stat-description {
            font-size: 12px;
            color: #94a3b8;
            margin-top: 8px;
            line-height: 1.5;
          }
          .stat-card.highlight-stat {
            border: 2px solid #2563EB;
            background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
            grid-column: span 1;
          }
          .progress-bar {
            width: 100%;
            height: 12px;
            background: #f1f5f9;
            border-radius: 999px;
            overflow: hidden;
            margin-top: 12px;
          }
          .progress-fill {
            height: 100%;
            border-radius: 999px;
            transition: width 0.3s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .detail-card.warning-card {
            background: #FEF2F2;
            border-color: #FEE2E2;
          }
          .detail-card.warning-card .detail-value {
            color: #EF4444;
          }
          .details-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-top: 20px;
          }
          .detail-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.2s;
          }
          .detail-card:hover {
            background: #f1f5f9;
            border-color: #cbd5e1;
            transform: translateX(-2px);
          }
          .detail-label {
            font-size: 15px;
            color: #475569;
            font-weight: 600;
          }
          .detail-value {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
          }
          .performance-summary {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 30px;
            margin-top: 30px;
          }
          .summary-title {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
          }
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .report-container {
              box-shadow: none;
              padding: 20px;
              border-radius: 0;
              max-width: 100%;
            }
            .report-header {
              box-shadow: none;
              padding: 25px;
              margin-bottom: 30px;
            }
            .section {
              margin-bottom: 30px;
            }
            .stats-grid {
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
            }
            .stat-card {
              page-break-inside: avoid;
              padding: 20px;
            }
            .details-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
              page-break-inside: avoid;
            }
            .performance-summary {
              padding: 25px;
            }
            .section-title {
              font-size: 20px;
              margin-bottom: 20px;
            }
          }
          @page {
            margin: 1cm;
            size: A4;
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="report-header">
            <h1>📊 تقرير أداء المحامي</h1>
            <div class="lawyer-name">${lawyerName}</div>
            ${lawyerDateRange.from && lawyerDateRange.to ? `
              <div class="date-range-info">📅 الفترة الزمنية: ${lawyerDateRange.from} - ${lawyerDateRange.to}</div>
            ` : ''}
            <div class="print-date">📅 تاريخ الطباعة: ${printDate}</div>
          </div>

          <div class="section">
            <div class="section-title">📊 إحصائيات الأداء الرئيسية</div>
            <div class="stats-grid">
              <div class="stat-card highlight-stat">
                <div class="stat-card-header">
                  <div class="stat-icon">⭐</div>
                </div>
                <div class="stat-label-bold">معدل الإنتاجية : <span class="stat-value-inline">${lawyerHighlights.productivityScore || 0}%</span></div>
                <div class="stat-description">نقاط الأداء الشاملة</div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${lawyerHighlights.productivityScore || 0}%; background: ${(lawyerHighlights.productivityScore || 0) >= 80 ? '#10B981' : (lawyerHighlights.productivityScore || 0) >= 60 ? '#F59E0B' : '#EF4444'}"></div>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-card-header">
                  <div class="stat-icon">📁</div>
                </div>
                <div class="stat-label-bold">عدد القضايا : <span class="stat-value-inline">${lawyerHighlights.addedCases || 0}</span></div>
                <div class="stat-description">${lawyerHighlights.completedCases || 0} مكتملة • ${lawyerHighlights.activeCases || 0} نشطة</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-header">
                  <div class="stat-icon">✅</div>
                </div>
                <div class="stat-label-bold">معدل إتمام القضايا : <span class="stat-value-inline">${lawyerHighlights.caseCompletionRate || 0}%</span></div>
                <div class="stat-description">${lawyerHighlights.completedCases || 0} من ${lawyerHighlights.addedCases || 0} قضية</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-header">
                  <div class="stat-icon">💰</div>
                </div>
                <div class="stat-label-bold">إجمالي الإيرادات : <span class="stat-value-inline">${formatNumber(lawyerHighlights.totalRevenue || 0)} د.ع</span></div>
                <div class="stat-description">إجمالي قيمة القضايا</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-header">
                  <div class="stat-icon">💳</div>
                </div>
                <div class="stat-label-bold">المبالغ المدفوعة : <span class="stat-value-inline">${formatNumber(lawyerHighlights.totalPayments || 0)} د.ع</span></div>
                <div class="stat-description">المدفوع من الإيرادات</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-header">
                  <div class="stat-icon">📊</div>
                </div>
                <div class="stat-label-bold">معدل التحصيل : <span class="stat-value-inline">${lawyerHighlights.collectionRate || 0}%</span></div>
                <div class="stat-description">نسبة التحصيل من الإيرادات</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">⏱️ مؤشرات الوقت والأداء</div>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-card-header">
                  <div class="stat-icon">⏰</div>
                </div>
                <div class="stat-label-bold">متوسط وقت الحل : <span class="stat-value-inline">${lawyerHighlights.avgCaseResolutionTime || 0} يوم</span></div>
                <div class="stat-description">متوسط الوقت لحل القضايا المكتملة</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-header">
                  <div class="stat-icon">⚡</div>
                </div>
                <div class="stat-label-bold">متوسط وقت الاستجابة : <span class="stat-value-inline">${lawyerHighlights.avgResponseTime || 0} يوم</span></div>
                <div class="stat-description">متوسط الوقت لأول إجراء بعد إنشاء القضية</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-header">
                  <div class="stat-icon">📅</div>
                </div>
                <div class="stat-label-bold">متوسط الجلسات للقضية : <span class="stat-value-inline">${lawyerHighlights.avgSessionsPerCase || 0}</span></div>
                <div class="stat-description">عدد الجلسات لكل قضية</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-header">
                  <div class="stat-icon">⚖️</div>
                </div>
                <div class="stat-label-bold">متوسط الإجراءات للقضية : <span class="stat-value-inline">${lawyerHighlights.avgActionsPerCase || 0}</span></div>
                <div class="stat-description">عدد الإجراءات لكل قضية</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-header">
                  <div class="stat-icon">✅</div>
                </div>
                <div class="stat-label-bold">متوسط وقت إتمام المهام : <span class="stat-value-inline">${lawyerHighlights.avgTaskCompletionTime || 0} يوم</span></div>
                <div class="stat-description">متوسط الوقت لإتمام المهام</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-header">
                  <div class="stat-icon">📈</div>
                </div>
                <div class="stat-label-bold">معدل إتمام المهام : <span class="stat-value-inline">${lawyerHighlights.taskCompletionRate || 0}%</span></div>
                <div class="stat-description">${lawyerHighlights.completedTasks || 0} من ${lawyerHighlights.totalTasks || 0} مهام</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">📋 تفاصيل النشاطات</div>
            <div class="performance-summary">
              <div class="summary-title">نظرة شاملة على النشاطات</div>
              <div class="details-grid">
                <div class="detail-card">
                  <div class="detail-label">📁 الدعاوى المُضافة</div>
                  <div class="detail-value">${lawyerHighlights.addedCases || 0}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-label">🔄 التحديثات</div>
                  <div class="detail-value">${lawyerHighlights.updates || 0}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-label">📅 الجلسات</div>
                  <div class="detail-value">${lawyerHighlights.sessions || 0}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-label">⚖️ الإجراءات</div>
                  <div class="detail-value">${lawyerHighlights.actions || 0}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-label">📎 المرفقات</div>
                  <div class="detail-value">${lawyerHighlights.attachments || 0}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-label">🔔 التذكيرات</div>
                  <div class="detail-value">${lawyerHighlights.reminders || 0}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-label">📝 الملاحظات</div>
                  <div class="detail-value">${lawyerHighlights.notes || 0}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-label">⚡ التحركات</div>
                  <div class="detail-value">${lawyerHighlights.movements || 0}</div>
                </div>
                <div class="detail-card">
                  <div class="detail-label">📋 إجمالي المهام</div>
                  <div class="detail-value">${lawyerHighlights.totalTasks || 0}</div>
                </div>
                <div class="detail-card warning-card">
                  <div class="detail-label">⚠️ المهام المتأخرة</div>
                  <div class="detail-value">${lawyerHighlights.overdueTasks || 0}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">💼 المؤشرات المالية والموكلين</div>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-card-header">
                  <div class="stat-icon">💵</div>
                </div>
                <div class="stat-label-bold">متوسط الإيراد للقضية : <span class="stat-value-inline">${formatNumber(lawyerHighlights.avgRevenuePerCase || 0)} د.ع</span></div>
                <div class="stat-description">متوسط قيمة القضية</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-header">
                  <div class="stat-icon">👥</div>
                </div>
                <div class="stat-label-bold">إجمالي الموكلين : <span class="stat-value-inline">${lawyerHighlights.totalClients || 0}</span></div>
                <div class="stat-description">عدد الموكلين الكلي</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-header">
                  <div class="stat-icon">✅</div>
                </div>
                <div class="stat-label-bold">الموكلين النشطين : <span class="stat-value-inline">${lawyerHighlights.activeClients || 0}</span></div>
                <div class="stat-description">الموكلين ذوي القضايا النشطة</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    if (format === 'PDF') {
      // Open in new window for printing
      const printWindow = window.open('', '_blank')
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      
      // Wait for content to load then print
      setTimeout(() => {
        printWindow.print()
      }, 250)
    } else {
      // For CSV, export the data
      const csvColumns = [
        { key: 'lawyerName', header: 'اسم المحامي' },
        { key: 'totalCases', header: 'عدد القضايا' },
        { key: 'completedCases', header: 'القضايا المكتملة' },
        { key: 'activeCases', header: 'القضايا النشطة' },
        { key: 'completionRate', header: 'معدل الإنجاز (%)' },
        { key: 'totalRevenue', header: 'إجمالي الإيرادات' },
        { key: 'totalPayments', header: 'المدفوع' },
        { key: 'collectionRate', header: 'معدل التحصيل (%)' },
        { key: 'totalActions', header: 'عدد الإجراءات' },
        { key: 'totalTasks', header: 'عدد المهام' },
        { key: 'taskCompletionRate', header: 'معدل إتمام المهام (%)' },
        { key: 'performanceScore', header: 'نقاط الأداء' }
      ]
      exportToCSV(`تقرير أداء المحامي - ${lawyerName}`, [selectedLawyerData], csvColumns)
    }
  }

  const exportToCSV = (title, tableData, columns) => {
    const headers = columns.map(col => col.header).join(',')
    const rows = tableData.map(row => 
      columns.map(col => `"${(row[col.key] || '').toString().replace(/"/g, '""')}"`).join(',')
    )
    
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `${title}-${Date.now()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Sessions Overview Chart Data
  const getSessionsChartData = () => {
    const monthlyCounts = {}
    
    sessionsData.forEach(session => {
      if (session.sessiondate) {
        const date = new Date(session.sessiondate)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1
      }
    })

    const sortedMonths = Object.keys(monthlyCounts)
      .sort()
      .slice(-6) // Last 6 months

    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ]

    return {
      labels: sortedMonths.map(monthKey => {
        const [, month] = monthKey.split('-')
        return arabicMonths[parseInt(month) - 1]
      }),
      datasets: [{
        label: 'عدد الجلسات',
        data: sortedMonths.map(monthKey => monthlyCounts[monthKey]),
        backgroundColor: '#2563EB',
        borderColor: '#1e40af',
        borderWidth: 2,
        borderRadius: 6,
      }]
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            family: "'Cairo', 'Almarai', sans-serif",
            size: 12,
            weight: '600',
          },
          padding: 12,
          usePointStyle: true,
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
      },
    },
  }

  const chartJsDataLabelsPlugin = {
    id: 'customDataLabels',
    afterDatasetsDraw(chart, args, pluginOptions) {
      const { ctx } = chart;
      ctx.save();
      ctx.font = 'bold 18px "Cairo", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      chart.data.datasets.forEach((dataset, i) => {
        const meta = chart.getDatasetMeta(i);
        meta.data.forEach((element, index) => {
          const data = dataset.data[index];
          if (data > 0) {
            ctx.fillStyle = '#ffffff';
            if (chart.config.type === 'doughnut') {
               const { x, y } = element.tooltipPosition();
               ctx.shadowColor = 'rgba(0,0,0,0.6)';
               ctx.shadowBlur = 4;
               ctx.fillText(data, x, y);
            } else if (chart.config.type === 'bar') {
               if (chart.options.indexAxis === 'y') {
                  const xPos = element.x - 14; 
                  if (element.width < 25) {
                     ctx.fillStyle = '#475569';
                     ctx.shadowBlur = 0;
                     ctx.fillText(data, element.x + 14, element.y);
                  } else {
                     ctx.shadowColor = 'rgba(0,0,0,0.3)';
                     ctx.shadowBlur = 2;
                     ctx.fillText(data, xPos, element.y);
                  }
               }
            }
          }
        });
      });
      ctx.restore();
    }
  }

  const doughnutOptions = {
    ...chartOptions,
    cutout: '55%',  // Reduced cutout to make donut appear slightly thicker
    layout: {
      padding: 10   // Added padding to give more breathing room
    },
    plugins: {
      ...chartOptions.plugins,
      legend: {
        ...chartOptions.plugins.legend,
        position: 'bottom',
        labels: {
          ...chartOptions.plugins.legend.labels,
          padding: 20,
          font: {
            ...chartOptions.plugins.legend?.labels?.font,
            family: "'Cairo', 'Almarai', sans-serif",
            size: 16,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        ...chartOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
              label += ` (${percentage}%)`;
            }
            return label;
          }
        }
      }
    },
  }

  const horizontalBarOptions = {
    ...chartOptions,
    indexAxis: 'y',
    maxBarThickness: 45,
    barPercentage: 0.7,
    categoryPercentage: 0.8,
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          stepSize: 1, // Ensures only integers
          precision: 0, // No decimals (like 3.5)
          font: {
            family: "'Cairo', 'Almarai', sans-serif",
            size: 18,
            weight: 'bold'
          },
          color: '#64748B',
        },
        grid: {
          color: '#F1F5F9',
        },
      },
      y: {
        ticks: {
          font: {
            family: "'Cairo', 'Almarai', sans-serif",
            size: 18,
            weight: 'bold'
          },
          color: '#475569',
          autoSkip: false,
        },
        grid: {
          display: false,
        },
      },
    },
  }

  const barOptions = {
    ...chartOptions,
    maxBarThickness: 50,
    barPercentage: 0.6,
    categoryPercentage: 0.8,
    scales: {
      x: {
        ticks: {
          font: {
            family: "'Cairo', 'Almarai', sans-serif",
            size: 11,
          },
          color: '#475569',
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1, // Ensures only integers
          precision: 0, // No decimals (like 3.5)
          font: {
            family: "'Cairo', 'Almarai', sans-serif",
            size: 11,
          },
          color: '#64748B',
        },
        grid: {
          color: '#F1F5F9',
        },
      },
    },
  }

  const financialBarOptions = {
    ...barOptions,
    indexAxis: 'y', // Unified horizontal layout for all devices
    barPercentage: 0.8,
    categoryPercentage: 0.9,
    plugins: {
      ...chartOptions.plugins,
      legend: {
        ...chartOptions.plugins.legend,
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            const index = context[0].dataIndex;
            const filteredCases = casesFinancialData
              .filter(c => c.currency === financialChartCurrency || (financialChartCurrency === 'IQD' && !c.currency))
              .sort((a, b) => b.caseValue - a.caseValue)
              .slice(0, 10);
            const c = filteredCases[index];
            return `الموكل: ${c.client_name || 'غير محدد'}\nرقم الدعوى: ${c.case_number || 'غير محدد'}`;
          },
          label: (context) => {
            const label = context.dataset.label || '';
            const val = context.parsed.x;
            const formatted = new Intl.NumberFormat('ar-EG').format(val);
            return `${label}: ${formatted} ${financialChartCurrency === 'USD' ? 'دولار' : 'د.ع'}`;
          },
          footer: (context) => {
            const index = context[0].dataIndex;
            const filteredCases = casesFinancialData
              .filter(c => c.currency === financialChartCurrency || (financialChartCurrency === 'IQD' && !c.currency))
              .sort((a, b) => b.caseValue - a.caseValue)
              .slice(0, 10);
            const c = filteredCases[index];
            const percent = ((c.paidAmount / c.caseValue) * 100).toFixed(1);
            return `إجمالي الأتعاب: ${new Intl.NumberFormat('ar-EG').format(c.caseValue)} ${financialChartCurrency === 'USD' ? 'دولار' : 'د.ع'}\nنسبة السداد: ${percent}%`;
          }
        }
      }
    },
    scales: {
      x: {
        ...barOptions.scales.x,
        stacked: true,
        display: true,
        title: {
          display: true,
          text: `المبالغ (${financialChartCurrency === 'USD' ? 'بالدولار' : 'بالدينار العراقي'})`,
          font: { family: "'Cairo', 'Almarai', sans-serif", size: 13, weight: 'bold' },
          color: '#1e293b'
        },
        ticks: {
          ...barOptions.scales.x.ticks,
          font: { family: "'Cairo', 'Almarai', sans-serif", size: 12, weight: '700' },
          callback: function(value) {
            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
            if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
            return value;
          }
        }
      },
      y: {
        ...barOptions.scales.y,
        stacked: true,
        display: true,
        title: {
          display: true,
          text: 'القضايا والموكلين',
          font: { family: "'Cairo', 'Almarai', sans-serif", size: 13, weight: 'bold' },
          color: '#1e293b'
        },
        ticks: {
          ...barOptions.scales.y.ticks,
          font: { family: "'Cairo', 'Almarai', sans-serif", size: 11, weight: '700' },
          color: '#0f172a'
        }
      }
    }
  }

  const lineOptions = {
    ...chartOptions,
    scales: {
      x: {
        ticks: {
          font: {
            family: "'Cairo', 'Almarai', sans-serif",
            size: 11,
          },
          color: '#475569',
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            family: "'Cairo', 'Almarai', sans-serif",
            size: 11,
          },
          color: '#64748B',
        },
        grid: {
          color: '#F1F5F9',
        },
      },
    },
  }

  const formatNumber = (num) => {
    return new Intl.NumberFormat('ar-EG').format(num.toFixed(2))
  }

  const handleRefresh = () => {
    if (userId) {
      fetchAllData(userId)
    }
  }

  // Custom Report Builder Functions
  const generateCustomReport = () => {
    // Get selected fields from checkboxes
    const checkboxes = document.querySelectorAll('.builder-sidebar input[type="checkbox"]:checked')
    const selectedFields = Array.from(checkboxes).map(cb => cb.parentElement.textContent.trim())
    
    if (selectedFields.length === 0) {
      alert('يرجى اختيار حقل واحد على الأقل')
      return
    }

    setCustomReportFields(selectedFields)

    // Generate report data based on selected fields
    const reportData = casesFinancialData.map(caseItem => {
      const fullCase = casesData.find(c => c.id === caseItem.id) || {}
      const row = {}
      
      selectedFields.forEach(field => {
        switch(field) {
          case 'رقم القضية':
            row['رقم القضية'] = fullCase.case_number || '-'
            break
          case 'اسم الموكل':
            row['اسم الموكل'] = fullCase.client_name || '-'
            break
          case 'نوع القضية':
            row['نوع القضية'] = fullCase.caseType || fullCase.caseType2 || '-'
            break
          case 'حالة القضية':
            row['حالة القضية'] = fullCase.caseState || '-'
            break
          case 'تاريخ القضية':
            row['تاريخ القضية'] = fullCase.caseDate ? new Date(fullCase.caseDate).toLocaleDateString('ar-EG') : '-'
            break
          case 'قيمة القضية':
            row['قيمة القضية'] = formatNumber(caseItem.caseValue) + ' د.ع'
            break
          case 'المحامي المسؤول':
            row['المحامي المسؤول'] = fullCase.caseLawyer || '-'
            break
          case 'أتعاب المحاماة':
            row['أتعاب المحاماة'] = formatNumber(caseItem.caseValue) + ' د.ع'
            break
          case 'المبالغ المستلمة':
            row['المبالغ المستلمة'] = formatNumber(caseItem.paidAmount) + ' د.ع'
            break
          case 'المتبقي':
            row['المتبقي'] = formatNumber(caseItem.outstandingAmount) + ' د.ع'
            break
          default:
            row[field] = '-'
        }
      })
      
      return row
    })

    setCustomReportData(reportData)
    setShowCustomBuilder(true)
  }

  const resetCustomBuilder = () => {
    const checkboxes = document.querySelectorAll('.builder-sidebar input[type="checkbox"]')
    checkboxes.forEach(cb => cb.checked = false)
    setCustomReportFields([])
    setCustomReportData([])
  }

  const exportCustomReport = (format) => {
    if (format === 'PDF') {
      exportToPDF('تقرير مخصص', customReportData, customReportFields.map(f => ({ key: f, header: f })))
    } else {
      exportToCSV('تقرير مخصص', customReportData, customReportFields.map(f => ({ key: f, header: f })))
    }
  }

  if (!isClient || loading) {
    return (
      <>
        <div className="reports-loading-container">
          <div className="reports-loading-card">
            <div className="loading-icon-wrapper">
              <FaGavel className="loading-icon" />
            </div>
            <p className="loading-text">الرجاء الانتظار. يتم تحميل البيانات ...</p>
          </div>
        </div>
        <style jsx>{`
          .reports-loading-container {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100vw;
            height: 100vh;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.95);
            z-index: 99999;
            margin: 0;
          }
          .reports-loading-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            background: #ffffff;
            border-radius: 16px;
            padding: 4rem 3rem;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            max-width: 500px;
            width: 100%;
          }
          .loading-icon-wrapper {
            margin-bottom: 2rem;
          }
          .loading-icon-wrapper :global(.loading-icon) {
            width: 64px;
            height: 64px;
            color: #2563EB;
            animation: pulse 1.5s ease-in-out infinite;
          }
          .loading-text {
            font-size: 1.1rem;
            font-weight: 600;
            color: #334155;
            font-family: 'Cairo', 'Almarai', sans-serif;
            direction: rtl;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.95); }
          }
        `}</style>
      </>
    )
  }

  return (
    <Layout>
      <div className="reports-page">
        <Head>
          <title>التقارير - نظام إدارة القضايا</title>
        </Head>

        {/* Tabs Navigation */}
        <div className="reports-tabs">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            نظرة عامة
          </button>
          <button
            className={`tab-btn ${activeTab === 'cases' ? 'active' : ''}`}
            onClick={() => setActiveTab('cases')}
          >
            تقارير القضايا
          </button>
          <button
            className={`tab-btn ${activeTab === 'financial' ? 'active' : ''}`}
            onClick={() => setActiveTab('financial')}
          >
            التقارير المالية
          </button>
          <button
            className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            تقارير الجلسات
          </button>
          <button
            className={`tab-btn ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions')}
          >
            تقارير الإجراءات
          </button>
          <button
            className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            تقارير المهام
          </button>
          <button
            className={`tab-btn ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => setActiveTab('clients')}
          >
            تقارير الموكلين
          </button>
          <button
            className={`tab-btn ${activeTab === 'lawyers' ? 'active' : ''}`}
            onClick={() => setActiveTab('lawyers')}
          >
            أداء المحامين
          </button>
          <button
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            التحليلات المتقدمة
          </button>
          <button
            className={`tab-btn ${activeTab === 'scheduled' ? 'active' : ''}`}
            onClick={() => setActiveTab('scheduled')}
          >
            التقارير المجدولة
          </button>
          <button
            className={`tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            منشئ التقارير
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="reports-content">
            {/* Summary Cards */}
            <div className="overview-cards-grid">
              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-header-row">
                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1e40af 100%)' }}>
                      <FaGavel />
                    </div>
                    <div className="stat-card-label">إجمالي القضايا</div>
                  </div>
                  <div className="stat-card-value">{overviewStats.totalCases}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-header-row">
                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                      <FaCheckCircle />
                    </div>
                    <div className="stat-card-label">القضايا النشطة</div>
                  </div>
                  <div className="stat-card-value">{overviewStats.activeCases}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-header-row">
                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #d97706 100%)' }}>
                      <FaCalendarAlt />
                    </div>
                    <div className="stat-card-label">جلسات اليوم</div>
                  </div>
                  <div className="stat-card-value">{overviewStats.todaySessions}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-header-row">
                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #2563EB 100%)' }}>
                      <FaDollarSign />
                    </div>
                    <div className="stat-card-label">إجمالي الإيرادات</div>
                  </div>
                  <div className="stat-card-value">
                    <div>{formatNumber(overviewStats.totalRevenue)} د.ع</div>
                    {overviewStats.totalRevenueUSD > 0 && (
                      <div style={{ fontSize: '0.65em', color: '#10B981', marginTop: '4px' }}>{formatNumber(overviewStats.totalRevenueUSD)} دولار</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-header-row">
                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #22D3EE 0%, #06b6d4 100%)' }}>
                      <FaDollarSign />
                    </div>
                    <div className="stat-card-label">المبالغ المستلمة</div>
                  </div>
                  <div className="stat-card-value">
                    <div>{formatNumber(overviewStats.totalPayments)} د.ع</div>
                    {overviewStats.totalPaymentsUSD > 0 && (
                      <div style={{ fontSize: '0.65em', color: '#10B981', marginTop: '4px' }}>{formatNumber(overviewStats.totalPaymentsUSD)} دولار</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-header-row">
                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #dc2626 100%)' }}>
                      <FaDollarSign />
                    </div>
                    <div className="stat-card-label">المتبقي</div>
                  </div>
                  <div className="stat-card-value">
                    <div>{formatNumber(overviewStats.outstandingBalance)} د.ع</div>
                    {overviewStats.outstandingBalanceUSD > 0 && (
                      <div style={{ fontSize: '0.65em', color: '#10B981', marginTop: '4px' }}>{formatNumber(overviewStats.outstandingBalanceUSD)} دولار</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="charts-grid">
              <div className="chart-card donut-chart">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">حالة الدعاوي</h3>
                </div>
                <div className="chart-card-content" style={{ minHeight: '350px' }}>
                  <Doughnut data={getCaseStatusChartData()} options={doughnutOptions} plugins={[chartJsDataLabelsPlugin]} />
                </div>
              </div>

              <div className="chart-card bar-chart">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">توزيع أنواع القضايا</h3>
                </div>
                <div className="chart-card-content" style={{ minHeight: '350px' }}>
                  <Bar data={getCaseTypeChartData()} options={horizontalBarOptions} plugins={[chartJsDataLabelsPlugin]} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cases Reports Tab */}
        {activeTab === 'cases' && (
          <div className="reports-content">
            <div className="charts-grid">
              <div className="chart-card donut-chart">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">توزيع حالة الدعاوي</h3>
                </div>
                <div className="chart-card-content" style={{ minHeight: '350px' }}>
                  <Doughnut data={getCaseStatusChartData()} options={doughnutOptions} plugins={[chartJsDataLabelsPlugin]} />
                </div>
              </div>

              <div className="chart-card bar-chart">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">توزيع أنواع القضايا</h3>
                </div>
                <div className="chart-card-content" style={{ minHeight: '350px' }}>
                  <Bar data={getCaseTypeChartData()} options={horizontalBarOptions} plugins={[chartJsDataLabelsPlugin]} />
                </div>
              </div>
            </div>

            {/* Cases Summary Table */}
            <div className="table-card">
              <div className="table-card-header">
                <h3 className="table-card-title">ملخص القضايا</h3>
              </div>
              <div className="table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>الحالة</th>
                      <th>العدد</th>
                      <th>النسبة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewStats.dynamicStatusCounts && Object.keys(overviewStats.dynamicStatusCounts).length > 0 ? (
                      Object.entries(overviewStats.dynamicStatusCounts)
                        .sort((a, b) => b[1] - a[1]) // Sort by count descending
                        .map(([statusName, count], idx) => (
                          <tr key={idx}>
                            <td>{statusName}</td>
                            <td>{count}</td>
                            <td>{overviewStats.totalCases > 0 ? ((count / overviewStats.totalCases) * 100).toFixed(1) : 0}%</td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center' }}>لا توجد بيانات</td>
                      </tr>
                    )}
                    <tr className="table-total-row">
                      <td><strong>الإجمالي</strong></td>
                      <td><strong>{overviewStats.totalCases}</strong></td>
                      <td><strong>100%</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Financial Reports Tab */}
        {activeTab === 'financial' && (
          <div className="reports-content">
            {/* Financial Summary Cards */}
            <div className="overview-cards-grid financial-overview-grid">
              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-header-row">
                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #2563EB 100%)' }}>
                      <FaDollarSign />
                    </div>
                    <div className="stat-card-label">إجمالي أتعاب المحاماة</div>
                  </div>
                  <div className="stat-card-value">
                    <div>{formatNumber(overviewStats.totalRevenue)} د.ع</div>
                    {overviewStats.totalRevenueUSD > 0 && (
                      <div style={{ fontSize: '0.65em', color: '#10B981', marginTop: '4px' }}>{formatNumber(overviewStats.totalRevenueUSD)} دولار</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-header-row">
                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #22D3EE 0%, #06b6d4 100%)' }}>
                      <FaDollarSign />
                    </div>
                    <div className="stat-card-label">المبالغ المستلمة</div>
                  </div>
                  <div className="stat-card-value">
                    <div>{formatNumber(overviewStats.totalPayments)} د.ع</div>
                    {overviewStats.totalPaymentsUSD > 0 && (
                      <div style={{ fontSize: '0.65em', color: '#10B981', marginTop: '4px' }}>{formatNumber(overviewStats.totalPaymentsUSD)} دولار</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-header-row">
                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #dc2626 100%)' }}>
                      <FaDollarSign />
                    </div>
                    <div className="stat-card-label">المتبقي</div>
                  </div>
                  <div className="stat-card-value">
                    <div>{formatNumber(overviewStats.outstandingBalance)} د.ع</div>
                    {overviewStats.outstandingBalanceUSD > 0 && (
                      <div style={{ fontSize: '0.65em', color: '#10B981', marginTop: '4px' }}>{formatNumber(overviewStats.outstandingBalanceUSD)} دولار</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-header-row">
                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #d97706 100%)' }}>
                      <FaDollarSign />
                    </div>
                    <div className="stat-card-label">إجمالي الرسوم</div>
                  </div>
                  <div className="stat-card-value">
                    <div>{formatNumber(overviewStats.totalExpenses)} د.ع</div>
                    {overviewStats.totalExpensesUSD > 0 && (
                      <div style={{ fontSize: '0.65em', color: '#10B981', marginTop: '4px' }}>{formatNumber(overviewStats.totalExpensesUSD)} دولار</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Chart */}
            <div className="chart-card full-width bar-chart financial-reports-chart-card">
              <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h3 className="chart-card-title" style={{ margin: 0 }}>الملخص المالي للقضايا</h3>
                
                <div className="currency-toggle" style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                  <button 
                    onClick={() => setFinancialChartCurrency('IQD')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      background: financialChartCurrency === 'IQD' ? '#ffffff' : 'transparent',
                      color: financialChartCurrency === 'IQD' ? '#2563EB' : '#64748B',
                      boxShadow: financialChartCurrency === 'IQD' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    دينار (د.ع)
                  </button>
                  <button 
                    onClick={() => setFinancialChartCurrency('USD')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      background: financialChartCurrency === 'USD' ? '#ffffff' : 'transparent',
                      color: financialChartCurrency === 'USD' ? '#2563EB' : '#64748B',
                      boxShadow: financialChartCurrency === 'USD' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    دولار ($)
                  </button>
                </div>
              </div>
              <div className="chart-card-content">
                <Bar data={getFinancialChartData()} options={financialBarOptions} />
              </div>
            </div>

            {/* Financial Details Table */}
            <div className="table-card">
              <div className="table-card-header">
                <h3 className="table-card-title">تفاصيل مالية القضايا</h3>
              </div>
              <div className="table-wrapper">
                <table className="reports-table financial-table mobile-cards-table">
                  <thead>
                    <tr>
                      <th>رقم الدعوى</th>
                      <th>اسم الموكل</th>
                      <th className="text-right">أتعاب الدعوى</th>
                      <th className="text-right">المبالغ المستلمة</th>
                      <th className="text-right">المتبقي</th>
                      <th>نسبة السداد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {casesFinancialData
                      .sort((a, b) => b.caseValue - a.caseValue)
                      .slice(0, 20)
                      .map((caseItem, index) => (
                        <tr key={index}>
                          <td data-label="رقم الدعوى">
                            <a 
                              href={`/cases/CaseDetailsPage?caseId=${caseItem.id}`}
                              className="case-link"
                            >
                              {caseItem.case_number}
                            </a>
                          </td>
                          <td data-label="اسم الموكل">{caseItem.client_name || 'غير محدد'}</td>
                          <td className="text-right" data-label="أتعاب الدعوى">{formatNumber(caseItem.caseValue)} {caseItem.currency === 'USD' ? 'دولار' : 'د.ع'}</td>
                          <td className="text-right" data-label="المبالغ المستلمة">{formatNumber(caseItem.paidAmount)} {caseItem.currency === 'USD' ? 'دولار' : 'د.ع'}</td>
                          <td className={`text-right ${caseItem.outstandingAmount > 0 ? 'outstanding-positive' : 'outstanding-zero'}`} data-label="المتبقي">
                            {formatNumber(caseItem.outstandingAmount)} {caseItem.currency === 'USD' ? 'دولار' : 'د.ع'}
                          </td>
                          <td data-label="نسبة السداد">
                            {caseItem.caseValue > 0 
                              ? ((caseItem.paidAmount / caseItem.caseValue) * 100).toFixed(1)
                              : 0}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Sessions Reports Tab */}
        {activeTab === 'sessions' && (
          <div className="reports-content">
            {/* Sessions Summary Cards */}
            <div className="overview-cards-grid">


              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-header-row">
                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                      <FaCalendarAlt />
                    </div>
                    <div className="stat-card-label">جلسات اليوم</div>
                  </div>
                  <div className="stat-card-value">{overviewStats.todaySessions}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-header-row">
                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #d97706 100%)' }}>
                      <FaCalendarAlt />
                    </div>
                    <div className="stat-card-label">جلسات قادمة</div>
                  </div>
                  <div className="stat-card-value">{overviewStats.upcomingSessions}</div>
                </div>
              </div>
            </div>

            {/* Sessions Chart */}
            <div className="chart-card full-width bar-chart">
              <div className="chart-card-header">
                <h3 className="chart-card-title">توزيع الجلسات الشهري</h3>
              </div>
              <div className="chart-card-content">
                <Bar data={getSessionsChartData()} options={barOptions} />
              </div>
            </div>
          </div>
        )}

        {/* Actions Reports Tab */}
        {activeTab === 'actions' && (
          <div className="reports-content">
            <div className="section-header">
              <div className="export-buttons">
                <button 
                  className="export-btn"
                  onClick={() => exportToPDF('تقارير الإجراءات', actionsData.slice(0, 100), [
                    { key: 'actiontype', header: 'نوع الإجراء' },
                    { key: 'case_number', header: 'رقم القضية' },
                    { key: 'actiondate', header: 'التاريخ' },
                    { key: 'actionstatus', header: 'الحالة' }
                  ])}
                >
                  <FaPrint /> تصدير PDF
                </button>
                <button 
                  className="export-btn"
                  onClick={() => exportToCSV('تقارير الإجراءات', actionsData, [
                    { key: 'actiontype', header: 'نوع الإجراء' },
                    { key: 'case_number', header: 'رقم القضية' },
                    { key: 'actiondate', header: 'التاريخ' },
                    { key: 'actionstatus', header: 'الحالة' },
                    { key: 'actiondetails', header: 'التفاصيل' }
                  ])}
                >
                  <FaDownload /> تصدير CSV
                </button>
              </div>
            </div>

            {/* Actions Summary Cards */}
            <div className="overview-cards-grid">
              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-header-row">
                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1e40af 100%)' }}>
                      <FaGavel />
                    </div>
                    <div className="stat-card-label">إجمالي الإجراءات</div>
                  </div>
                  <div className="stat-card-value">{actionsData.length}</div>
                </div>
              </div>
            </div>

            {/* Actions Charts */}
            <div className="charts-grid">
              <div className="chart-card bar-chart">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">توزيع أنواع الإجراءات</h3>
                </div>
                <div className="chart-card-content">
                  <Bar data={getActionsChartData()} options={barOptions} />
                </div>
              </div>

              <div className="chart-card line-chart">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">الإجراءات الشهرية</h3>
                </div>
                <div className="chart-card-content">
                  <Line data={getActionsTimelineChartData()} options={lineOptions} />
                </div>
              </div>
            </div>

            {/* Actions Table */}
            <div className="table-card">
              <div className="table-card-header">
                <h3 className="table-card-title">قائمة الإجراءات</h3>
              </div>
              <div className="table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>نوع الإجراء</th>
                      <th>رقم القضية</th>
                      <th>التاريخ</th>
                      <th>الحالة</th>
                      <th>التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionsData.slice(0, 50).map((action, index) => (
                      <tr key={index}>
                        <td>{action.actiontype || 'غير محدد'}</td>
                        <td>
                          <a 
                            href={`/cases/CaseDetailsPage?caseNumber=${encodeURIComponent(action.case_number)}`}
                            className="case-link"
                          >
                            {action.case_number}
                          </a>
                        </td>
                        <td>{action.actiondate ? new Date(action.actiondate).toLocaleDateString('ar-EG') : '-'}</td>
                        <td>{action.actionstatus || '-'}</td>
                        <td className="truncate-cell">{action.actiondetails || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tasks Reports Tab */}
        {activeTab === 'tasks' && (
          <div className="reports-content">
            <div className="section-header">
              <div className="export-buttons">
                <button 
                  className="export-btn"
                  onClick={() => exportToPDF('تقارير المهام', tasksData.slice(0, 100), [
                    { key: 'task_title', header: 'عنوان المهمة' },
                    { key: 'task_case', header: 'رقم القضية' },
                    { key: 'task_status', header: 'الحالة' },
                    { key: 'task_priority', header: 'الأولوية' },
                    { key: 'task_deadline', header: 'الموعد النهائي' }
                  ])}
                >
                  <FaPrint /> تصدير PDF
                </button>
                <button 
                  className="export-btn"
                  onClick={() => exportToCSV('تقارير المهام', tasksData, [
                    { key: 'task_title', header: 'عنوان المهمة' },
                    { key: 'task_case', header: 'رقم القضية' },
                    { key: 'task_status', header: 'الحالة' },
                    { key: 'task_priority', header: 'الأولوية' },
                    { key: 'task_deadline', header: 'الموعد النهائي' },
                    { key: 'task_details', header: 'التفاصيل' }
                  ])}
                >
                  <FaDownload /> تصدير CSV
                </button>
              </div>
            </div>

            {/* Tasks Summary Cards */}
            <div className="overview-cards-grid">
              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-header-row">
                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1e40af 100%)' }}>
                      <FaTasks />
                    </div>
                    <div className="stat-card-label">إجمالي المهام</div>
                  </div>
                  <div className="stat-card-value">{tasksData.length}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-header-row">
                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #dc2626 100%)' }}>
                      <FaTasks />
                    </div>
                    <div className="stat-card-label">المهام المتأخرة</div>
                  </div>
                  <div className="stat-card-value">
                    {tasksData.filter(t => {
                      const deadline = t.task_deadline ? new Date(t.task_deadline) : null
                      return deadline && deadline < new Date() && t.task_status !== 'completed'
                    }).length}
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks Charts */}
            <div className="charts-grid">
              <div className="chart-card donut-chart">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">حالة المهام</h3>
                </div>
                <div className="chart-card-content">
                  <Doughnut data={getTasksStatusChartData()} options={doughnutOptions} />
                </div>
              </div>

              <div className="chart-card bar-chart">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">أولوية المهام</h3>
                </div>
                <div className="chart-card-content">
                  <Bar data={getTasksPriorityChartData()} options={barOptions} />
                </div>
              </div>
            </div>

            {/* Tasks Table */}
            <div className="table-card">
              <div className="table-card-header">
                <h3 className="table-card-title">قائمة المهام</h3>
              </div>
              <div className="table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>عنوان المهمة</th>
                      <th>رقم القضية</th>
                      <th>الحالة</th>
                      <th>الأولوية</th>
                      <th>الموعد النهائي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasksData.slice(0, 50).map((task, index) => {
                      const deadline = task.task_deadline ? new Date(task.task_deadline) : null
                      const isOverdue = deadline && deadline < new Date() && task.task_status !== 'completed'
                      
                      return (
                        <tr key={index} className={isOverdue ? 'overdue-row' : ''}>
                          <td>{task.task_title || '-'}</td>
                          <td>
                            {task.task_case ? (
                              <a 
                                href={`/cases/CaseDetailsPage?caseNumber=${encodeURIComponent(task.task_case)}`}
                                className="case-link"
                              >
                                {task.task_case}
                              </a>
                            ) : '-'}
                          </td>
                          <td>
                            <span className={`status-badge status-${task.task_status || 'pending'}`}>
                              {task.task_status === 'completed' ? 'مكتملة' : 
                               task.task_status === 'in_progress' ? 'قيد التنفيذ' : 'قيد الانتظار'}
                            </span>
                          </td>
                          <td>
                            <span className={`priority-badge priority-${task.task_priority || 'medium'}`}>
                              {task.task_priority === 'high' ? 'عاجلة' :
                               task.task_priority === 'low' ? 'منخفضة' : 'متوسطة'}
                            </span>
                          </td>
                          <td className={isOverdue ? 'overdue-date' : ''}>
                            {deadline ? deadline.toLocaleDateString('ar-EG') : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Clients Reports Tab */}
        {activeTab === 'clients' && (
          <div className="reports-content">
            <div className="section-header">
              <div className="export-buttons">
                <button 
                  className="export-btn"
                  onClick={() => exportToPDF('تقارير الموكلين', clientsData, [
                    { key: 'clientName', header: 'اسم الموكل' },
                    { key: 'totalCases', header: 'عدد القضايا' },
                    { key: 'totalAmount', header: 'إجمالي المبلغ' },
                    { key: 'totalPayments', header: 'المدفوع' },
                    { key: 'balance', header: 'الرصيد' }
                  ])}
                >
                  <FaPrint /> تصدير PDF
                </button>
                <button 
                  className="export-btn"
                  onClick={() => exportToCSV('تقارير الموكلين', clientsData, [
                    { key: 'clientName', header: 'اسم الموكل' },
                    { key: 'totalCases', header: 'عدد القضايا' },
                    { key: 'totalAmount', header: 'إجمالي المبلغ' },
                    { key: 'totalPayments', header: 'المدفوع' },
                    { key: 'totalExpenses', header: 'المصروفات' },
                    { key: 'balance', header: 'الرصيد' }
                  ])}
                >
                  <FaDownload /> تصدير CSV
                </button>
              </div>
            </div>

            {/* Clients Summary Cards */}
            <div className="overview-cards-grid">
              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-header-row">
                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1e40af 100%)' }}>
                      <FaUsers />
                    </div>
                    <div className="stat-card-label">إجمالي الموكلين</div>
                  </div>
                  <div className="stat-card-value">{clientsData.length}</div>
                </div>
              </div>
            </div>

            {/* Clients Chart */}
            <div className="chart-card full-width bar-chart">
              <div className="chart-card-header">
                <h3 className="chart-card-title">أفضل الموكلين (حسب عدد القضايا)</h3>
              </div>
              <div className="chart-card-content">
                <Bar data={getClientsChartData()} options={barOptions} />
              </div>
            </div>

            {/* Clients Table */}
            <div className="table-card">
              <div className="table-card-header">
                <h3 className="table-card-title">قائمة الموكلين</h3>
              </div>
              <div className="table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>اسم الموكل</th>
                      <th>عدد القضايا</th>
                      <th>إجمالي المبلغ</th>
                      <th>المدفوع</th>
                      <th>المصروفات</th>
                      <th>الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientsData
                      .sort((a, b) => b.totalCases - a.totalCases)
                      .map((client, index) => (
                        <tr key={index}>
                          <td><strong>{client.clientName}</strong></td>
                          <td>{client.totalCases}</td>
                          <td>{formatNumber(client.totalAmount)} د.ع</td>
                          <td>{formatNumber(client.totalPayments)} د.ع</td>
                          <td>{formatNumber(client.totalExpenses)} د.ع</td>
                          <td className={client.balance >= 0 ? 'positive-balance' : 'negative-balance'}>
                            {formatNumber(client.balance)} د.ع
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Lawyer Performance Tab */}
        {activeTab === 'lawyers' && (
          <div className="reports-content">
            {/* Filter Bar */}
            <div className="lawyer-performance-filters">
              <div className="filter-group">
                <div className="filter-label">
                  <FaUsers className="filter-icon" />
                  <span>عرض أداء المحامي</span>
                </div>
                <select 
                  className="filter-select"
                  value={selectedLawyer}
                  onChange={(e) => setSelectedLawyer(e.target.value)}
                >
                  <option value="">اختر المحامي</option>
                  {availableLawyers.map((lawyer, index) => (
                    <option key={index} value={lawyer}>{lawyer}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <div className="filter-label">
                  <FaCalendarAlt className="filter-icon" />
                  <span>حدد التاريخ الزمني</span>
                </div>
                <div className="date-range-select-container">
                  <select
                    className="filter-select date-range-select"
                    value={selectedDateRangeType || ''}
                    onChange={(e) => handleDateRangeTypeChange(e.target.value)}
                  >
                    <option value="">حدد التاريخ الزمني</option>
                    <option value="اليوم">اليوم</option>
                    <option value="هذا الاسبوع">هذا الاسبوع</option>
                    <option value="الاسبوع الماضي">الاسبوع الماضي</option>
                    <option value="هذا الشهر">هذا الشهر</option>
                    <option value="الشهر الماضي">الشهر الماضي</option>
                    <option value="اخر 3 أشهر">اخر 3 أشهر</option>
                    <option value="اخر 6 أشهر">اخر 6 أشهر</option>
                    <option value="هذه السنة">هذه السنة</option>
                    <option value="السنة الماضية">السنة الماضية</option>
                    <option value="كل التواريخ">كل التواريخ</option>
                    <option value="نطاق مخصص">نطاق مخصص</option>
                  </select>
                  {lawyerDateRange.from && lawyerDateRange.to && selectedDateRangeType && (
                    <div className="date-range-display-inline">
                      {lawyerDateRange.from} - {lawyerDateRange.to}
                    </div>
                  )}
                </div>
              </div>

              <div className="filter-group">
                <div className="filter-label">
                  <FaFileAlt className="filter-icon" />
                  <span>تقرير العمل</span>
                </div>
                <select 
                  className="filter-select"
                  value={selectedWorkReport}
                  onChange={(e) => setSelectedWorkReport(e.target.value)}
                >
                  <option value="">اختر نوع التقرير</option>
                  <option value="تقرير الأعمال">تقرير الأعمال</option>
                  <option value="تقرير الأداء">تقرير الأداء</option>
                  <option value="تقرير القضايا">تقرير القضايا</option>
                  <option value="تقرير المهام">تقرير المهام</option>
                </select>
              </div>

              <div className="filter-bar-actions">
                <button 
                  className="export-btn-small"
                  onClick={() => {
                    if (selectedLawyer) {
                      exportLawyerPerformanceReport(selectedLawyer, 'PDF')
                    } else {
                      alert('يرجى اختيار محامي أولاً')
                    }
                  }}
                  disabled={!selectedLawyer}
                >
                  <FaPrint /> PDF
                </button>
                <button 
                  className="export-btn-small"
                  onClick={() => {
                    if (selectedLawyer) {
                      exportLawyerPerformanceReport(selectedLawyer, 'CSV')
                    } else {
                      alert('يرجى اختيار محامي أولاً')
                    }
                  }}
                  disabled={!selectedLawyer}
                >
                  <FaDownload /> CSV
                </button>
              </div>
            </div>

            {/* Lawyer Highlights Cards */}
            {lawyerHighlights && selectedLawyer && (
              <div className="lawyer-highlights-section">
                <h2 className="section-title">الأعمال على الدعاوى والملفات</h2>
                {(!selectedWorkReport || selectedWorkReport === '' || selectedWorkReport === 'تقرير الأعمال') && (
                <div className="overview-cards-grid">
                  {/* الدعاوى المُضافة */}
                  <div className="stat-card">
                    <div className="stat-card-content">
                      <div className="stat-card-header-row">
                        <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #8B4513 0%, #654321 100%)' }}>
                          <FaGavel />
                        </div>
                        <div className="stat-card-label">الدعاوى المُضافة</div>
                      </div>
                      <div className="stat-card-value">{lawyerHighlights.addedCases}</div>
                      <div className="stat-card-description">الدعاوى أو الملفات التي قام المحامي بإضافتها</div>
                    </div>
                  </div>

                  {/* التحديثات */}
                  <div className="stat-card">
                    <div className="stat-card-content">
                      <div className="stat-card-header-row">
                        <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #d97706 100%)' }}>
                          <FaChartLine />
                        </div>
                        <div className="stat-card-label">التحديثات</div>
                      </div>
                      <div className="stat-card-value">{lawyerHighlights.updates}</div>
                      <div className="stat-card-description">التعديلات أو الإضافات على جميع ملفات الدعاوى وملفات الموكلين والاستشارات</div>
                    </div>
                  </div>

                  {/* الجلسات */}
                  <div className="stat-card">
                    <div className="stat-card-content">
                      <div className="stat-card-header-row">
                        <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #d97706 100%)' }}>
                          <FaCalendarAlt />
                        </div>
                        <div className="stat-card-label">الجلسات</div>
                      </div>
                      <div className="stat-card-value">{lawyerHighlights.sessions}</div>
                      <div className="stat-card-description">جميع الجلسات التي قام المستخدم بإضافتها</div>
                    </div>
                  </div>

                  {/* الإجراءات */}
                  <div className="stat-card">
                    <div className="stat-card-content">
                      <div className="stat-card-header-row">
                        <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>
                          <FaClipboardList />
                        </div>
                        <div className="stat-card-label">الإجراءات</div>
                      </div>
                      <div className="stat-card-value">{lawyerHighlights.actions}</div>
                      <div className="stat-card-description">جميع الإجراءات على ملفات الدعاوى التي قام المستخدم بإضافتها</div>
                    </div>
                  </div>

                  {/* المرفقات */}
                  <div className="stat-card">
                    <div className="stat-card-content">
                      <div className="stat-card-header-row">
                        <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #8B4513 0%, #654321 100%)' }}>
                          <FaPaperclip />
                        </div>
                        <div className="stat-card-label">المرفقات</div>
                      </div>
                      <div className="stat-card-value">{lawyerHighlights.attachments}</div>
                      <div className="stat-card-description">عدد المرفقات التي قام المحامي برفعها على البرنامج</div>
                    </div>
                  </div>

                  {/* التذكيرات */}
                  <div className="stat-card">
                    <div className="stat-card-content">
                      <div className="stat-card-header-row">
                        <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #FCD34D 0%, #FBBF24 100%)' }}>
                          <FaBell />
                        </div>
                        <div className="stat-card-label">التذكيرات</div>
                      </div>
                      <div className="stat-card-value">{lawyerHighlights.reminders}</div>
                      <div className="stat-card-description">جميع التذكيرات التي قام المستخدم بإضافتها</div>
                    </div>
                  </div>

                  {/* الملاحظات */}
                  <div className="stat-card">
                    <div className="stat-card-content">
                      <div className="stat-card-header-row">
                        <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                          <FaStickyNote />
                        </div>
                        <div className="stat-card-label">الملاحظات</div>
                      </div>
                      <div className="stat-card-value">{lawyerHighlights.notes}</div>
                      <div className="stat-card-description">جميع الملاحظات التي قام المستخدم بإضافتها</div>
                    </div>
                  </div>

                  {/* التحركات */}
                  <div className="stat-card">
                    <div className="stat-card-content">
                      <div className="stat-card-header-row">
                        <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>
                          <FaChartBar />
                        </div>
                        <div className="stat-card-label">التحركات</div>
                      </div>
                      <div className="stat-card-value">{lawyerHighlights.movements}</div>
                      <div className="stat-card-description">التعديلات أو الإضافات على جميع ملفات الدعاوى وملفات الموكلين والاستشارات</div>
                    </div>
                  </div>
                </div>
                )}

                {/* Performance Metrics Section */}
                {(!selectedWorkReport || selectedWorkReport === '' || selectedWorkReport === 'تقرير الأداء') && (
                <div className="performance-metrics-section">
                  <h2 className="section-title">{selectedWorkReport === 'تقرير الأداء' ? 'تقرير الأداء' : 'مؤشرات الأداء المتقدمة'}</h2>
                  <div className="overview-cards-grid">
                    {/* معدل إتمام القضايا */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                            <FaCheckCircle />
                          </div>
                          <div className="stat-card-label">معدل إتمام القضايا</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.caseCompletionRate || 0}%</div>
                        <div className="stat-card-description">{lawyerHighlights.completedCases || 0} من {lawyerHighlights.addedCases || 0} قضية</div>
                      </div>
                    </div>

                    {/* متوسط وقت الحل */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>
                            <FiClock />
                          </div>
                          <div className="stat-card-label">متوسط وقت الحل</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.avgCaseResolutionTime || 0} يوم</div>
                        <div className="stat-card-description">متوسط الوقت لحل القضايا المكتملة</div>
                      </div>
                    </div>

                    {/* متوسط وقت الاستجابة */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #d97706 100%)' }}>
                            <FiClock />
                          </div>
                          <div className="stat-card-label">متوسط وقت الاستجابة</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.avgResponseTime || 0} يوم</div>
                        <div className="stat-card-description">متوسط الوقت لأول إجراء بعد إنشاء القضية</div>
                      </div>
                    </div>

                    {/* متوسط الجلسات للقضية */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)' }}>
                            <FaCalendarCheck />
                          </div>
                          <div className="stat-card-label">متوسط الجلسات للقضية</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.avgSessionsPerCase || 0}</div>
                        <div className="stat-card-description">عدد الجلسات لكل قضية</div>
                      </div>
                    </div>

                    {/* متوسط الإجراءات للقضية */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)' }}>
                            <FaClipboardList />
                          </div>
                          <div className="stat-card-label">متوسط الإجراءات للقضية</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.avgActionsPerCase || 0}</div>
                        <div className="stat-card-description">عدد الإجراءات لكل قضية</div>
                      </div>
                    </div>

                    {/* معدل إتمام المهام */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' }}>
                            <FaTasks />
                          </div>
                          <div className="stat-card-label">معدل إتمام المهام</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.taskCompletionRate || 0}%</div>
                        <div className="stat-card-description">{lawyerHighlights.completedTasks || 0} من {lawyerHighlights.totalTasks || 0} مهام</div>
                      </div>
                    </div>

                    {/* متوسط وقت إتمام المهام */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}>
                            <FiClock />
                          </div>
                          <div className="stat-card-label">متوسط وقت إتمام المهام</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.avgTaskCompletionTime || 0} يوم</div>
                        <div className="stat-card-description">متوسط الوقت لإتمام المهام</div>
                      </div>
                    </div>

                    {/* المهام المتأخرة */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #dc2626 100%)' }}>
                            <FaTasks />
                          </div>
                          <div className="stat-card-label">المهام المتأخرة</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.overdueTasks || 0}</div>
                        <div className="stat-card-description">عدد المهام التي تجاوزت الموعد النهائي</div>
                      </div>
                    </div>

                    {/* متوسط الإيراد للقضية */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #d97706 100%)' }}>
                            <FaDollarSign />
                          </div>
                          <div className="stat-card-label">متوسط الإيراد للقضية</div>
                        </div>
                        <div className="stat-card-value">{formatNumber(lawyerHighlights.avgRevenuePerCase || 0)} د.ع</div>
                        <div className="stat-card-description">متوسط قيمة القضية</div>
                      </div>
                    </div>

                    {/* معدل التحصيل */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #22D3EE 0%, #06b6d4 100%)' }}>
                            <FaDollarSign />
                          </div>
                          <div className="stat-card-label">معدل التحصيل</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.collectionRate || 0}%</div>
                        <div className="stat-card-description">{formatNumber(lawyerHighlights.totalPayments || 0)} د.ع من {formatNumber(lawyerHighlights.totalRevenue || 0)} د.ع</div>
                      </div>
                    </div>

                    {/* الموكلين النشطين */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}>
                            <FaUsers />
                          </div>
                          <div className="stat-card-label">الموكلين النشطين</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.activeClients || 0}</div>
                        <div className="stat-card-description">من إجمالي {lawyerHighlights.totalClients || 0} موكل</div>
                      </div>
                    </div>

                    {/* معدل الإنتاجية */}
                    <div className="stat-card highlight-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                            <FaChartLine />
                          </div>
                          <div className="stat-card-label">معدل الإنتاجية</div>
                        </div>
                        <div className="stat-card-value large-value">{lawyerHighlights.productivityScore || 0}%</div>
                        <div className="stat-card-description">نقاط الأداء الشاملة</div>
                        <div className="productivity-bar">
                          <div 
                            className="productivity-bar-fill" 
                            style={{ 
                              width: `${lawyerHighlights.productivityScore || 0}%`, 
                              background: (lawyerHighlights.productivityScore || 0) >= 80 ? '#10B981' : (lawyerHighlights.productivityScore || 0) >= 60 ? '#F59E0B' : '#EF4444' 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {/* Cases Report Section */}
                {selectedWorkReport === 'تقرير القضايا' && (
                <div className="performance-metrics-section">
                  <h2 className="section-title">تقرير القضايا</h2>
                  <div className="overview-cards-grid">
                    {/* معدل إتمام القضايا */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                            <FaCheckCircle />
                          </div>
                          <div className="stat-card-label">معدل إتمام القضايا</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.caseCompletionRate || 0}%</div>
                        <div className="stat-card-description">{lawyerHighlights.completedCases || 0} من {lawyerHighlights.addedCases || 0} قضية</div>
                      </div>
                    </div>

                    {/* متوسط وقت الحل */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>
                            <FiClock />
                          </div>
                          <div className="stat-card-label">متوسط وقت الحل</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.avgCaseResolutionTime || 0} يوم</div>
                        <div className="stat-card-description">متوسط الوقت لحل القضايا المكتملة</div>
                      </div>
                    </div>

                    {/* متوسط وقت الاستجابة */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #d97706 100%)' }}>
                            <FiClock />
                          </div>
                          <div className="stat-card-label">متوسط وقت الاستجابة</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.avgResponseTime || 0} يوم</div>
                        <div className="stat-card-description">متوسط الوقت لأول إجراء بعد إنشاء القضية</div>
                      </div>
                    </div>

                    {/* متوسط الجلسات للقضية */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)' }}>
                            <FaCalendarCheck />
                          </div>
                          <div className="stat-card-label">متوسط الجلسات للقضية</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.avgSessionsPerCase || 0}</div>
                        <div className="stat-card-description">عدد الجلسات لكل قضية</div>
                      </div>
                    </div>

                    {/* متوسط الإجراءات للقضية */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)' }}>
                            <FaClipboardList />
                          </div>
                          <div className="stat-card-label">متوسط الإجراءات للقضية</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.avgActionsPerCase || 0}</div>
                        <div className="stat-card-description">عدد الإجراءات لكل قضية</div>
                      </div>
                    </div>

                    {/* متوسط الإيراد للقضية */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #d97706 100%)' }}>
                            <FaDollarSign />
                          </div>
                          <div className="stat-card-label">متوسط الإيراد للقضية</div>
                        </div>
                        <div className="stat-card-value">{formatNumber(lawyerHighlights.avgRevenuePerCase || 0)} د.ع</div>
                        <div className="stat-card-description">متوسط قيمة القضية</div>
                      </div>
                    </div>

                    {/* الموكلين النشطين */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}>
                            <FaUsers />
                          </div>
                          <div className="stat-card-label">الموكلين النشطين</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.activeClients || 0}</div>
                        <div className="stat-card-description">من إجمالي {lawyerHighlights.totalClients || 0} موكل</div>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {/* Tasks Report Section */}
                {selectedWorkReport === 'تقرير المهام' && (
                <div className="performance-metrics-section">
                  <h2 className="section-title">تقرير المهام</h2>
                  <div className="overview-cards-grid">
                    {/* معدل إتمام المهام */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' }}>
                            <FaTasks />
                          </div>
                          <div className="stat-card-label">معدل إتمام المهام</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.taskCompletionRate || 0}%</div>
                        <div className="stat-card-description">{lawyerHighlights.completedTasks || 0} من {lawyerHighlights.totalTasks || 0} مهام</div>
                      </div>
                    </div>

                    {/* متوسط وقت إتمام المهام */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}>
                            <FiClock />
                          </div>
                          <div className="stat-card-label">متوسط وقت إتمام المهام</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.avgTaskCompletionTime || 0} يوم</div>
                        <div className="stat-card-description">متوسط الوقت لإتمام المهام</div>
                      </div>
                    </div>

                    {/* المهام المتأخرة */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #dc2626 100%)' }}>
                            <FaTasks />
                          </div>
                          <div className="stat-card-label">المهام المتأخرة</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.overdueTasks || 0}</div>
                        <div className="stat-card-description">عدد المهام التي تجاوزت الموعد النهائي</div>
                      </div>
                    </div>

                    {/* إجمالي المهام */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>
                            <FaTasks />
                          </div>
                          <div className="stat-card-label">إجمالي المهام</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.totalTasks || 0}</div>
                        <div className="stat-card-description">إجمالي عدد المهام</div>
                      </div>
                    </div>

                    {/* المهام المكتملة */}
                    <div className="stat-card">
                      <div className="stat-card-content">
                        <div className="stat-card-header-row">
                          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                            <FaCheckCircle />
                          </div>
                          <div className="stat-card-label">المهام المكتملة</div>
                        </div>
                        <div className="stat-card-value">{lawyerHighlights.completedTasks || 0}</div>
                        <div className="stat-card-description">عدد المهام المكتملة</div>
                      </div>
                    </div>
                  </div>
                </div>
                )}
              </div>
            )}

            {/* Custom Date Range Modal */}
            {showCustomDateModal && (
              <div className="date-modal-overlay" onClick={() => setShowCustomDateModal(false)}>
                <div className="date-modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="date-modal-header">
                    <h3>اختر النطاق المخصص</h3>
                  </div>
                  <div className="date-modal-body">
                    <div className="date-input-group">
                      <label>من تاريخ:</label>
                      <input
                        type="date"
                        value={customDateInputs.from}
                        onChange={(e) => setCustomDateInputs({ ...customDateInputs, from: e.target.value })}
                      />
                    </div>
                    <div className="date-input-group">
                      <label>إلى تاريخ:</label>
                      <input
                        type="date"
                        value={customDateInputs.to}
                        onChange={(e) => setCustomDateInputs({ ...customDateInputs, to: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="date-modal-footer">
                    <button
                      className="date-modal-btn cancel-btn"
                      onClick={() => {
                        setShowCustomDateModal(false)
                        setSelectedDateRangeType('')
                        setLawyerDateRange({ from: '', to: '' })
                      }}
                    >
                      إلغاء
                    </button>
                    <button
                      className="date-modal-btn update-btn"
                      onClick={handleCustomDateUpdate}
                    >
                      تحديث
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Charts */}
            <div className="charts-grid">
              <div className="chart-card bar-chart">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">معدلات الأداء للمحامين</h3>
                </div>
                <div className="chart-card-content">
                  <Bar data={getLawyerPerformanceChartData()} options={barOptions} />
                </div>
              </div>

              <div className="chart-card bar-chart">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">توزيع القضايا على المحامين</h3>
                </div>
                <div className="chart-card-content">
                  <Bar data={getLawyerCasesChartData()} options={barOptions} />
                </div>
              </div>

              <div className="chart-card bar-chart">
                <div className="chart-card-header">
                  <h3 className="chart-card-title">الإيرادات حسب المحامي</h3>
                </div>
                <div className="chart-card-content">
                  <Bar data={getLawyerRevenueChartData()} options={barOptions} />
                </div>
              </div>
            </div>

            {/* Performance Table */}
            <div className="table-card">
              <div className="table-card-header">
                <h3 className="table-card-title">جدول أداء المحامين</h3>
              </div>
              <div className="table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>المحامي</th>
                      <th>عدد القضايا</th>
                      <th>مكتملة</th>
                      <th>نشطة</th>
                      <th>معدل الإنجاز</th>
                      <th>إجمالي الإيرادات</th>
                      <th>المدفوع</th>
                      <th>معدل التحصيل</th>
                      <th>عدد الإجراءات</th>
                      <th>عدد المهام</th>
                      <th>نقاط الأداء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lawyerPerformanceData.map((lawyer, index) => (
                      <tr key={index}>
                        <td><strong>{lawyer.lawyerName}</strong></td>
                        <td>{lawyer.totalCases}</td>
                        <td>{lawyer.completedCases}</td>
                        <td>{lawyer.activeCases}</td>
                        <td>
                          <span className={`performance-badge ${parseFloat(lawyer.completionRate) >= 70 ? 'high' : parseFloat(lawyer.completionRate) >= 50 ? 'medium' : 'low'}`}>
                            {lawyer.completionRate}%
                          </span>
                        </td>
                        <td>{formatNumber(lawyer.totalRevenue)} د.ع</td>
                        <td>{formatNumber(lawyer.totalPayments)} د.ع</td>
                        <td>
                          <span className={`performance-badge ${parseFloat(lawyer.collectionRate) >= 70 ? 'high' : parseFloat(lawyer.collectionRate) >= 50 ? 'medium' : 'low'}`}>
                            {lawyer.collectionRate}%
                          </span>
                        </td>
                        <td>{lawyer.totalActions}</td>
                        <td>{lawyer.totalTasks}</td>
                        <td>
                          <span className={`performance-score ${parseFloat(lawyer.performanceScore) >= 70 ? 'high' : parseFloat(lawyer.performanceScore) >= 50 ? 'medium' : 'low'}`}>
                            {lawyer.performanceScore}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="reports-content">
            {/* Comparison Cards */}
            {(() => {
              const comparison = getComparisonData()
              return (
                <div className="overview-cards-grid">
                  <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1e40af 100%)' }}>
                      <FaChartLine />
                    </div>
                    <div className="stat-card-content">
                      <div className="stat-card-label">القضايا هذا الشهر</div>
                      <div className="stat-card-value">{comparison.cases.current}</div>
                      <div className={`stat-card-change ${comparison.cases.isPositive ? 'positive' : 'negative'}`}>
                        {comparison.cases.isPositive ? <FiTrendingUp /> : <FiTrendingDown />}
                        {Math.abs(comparison.cases.change)}% عن الشهر الماضي
                      </div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                      <FaDollarSign />
                    </div>
                    <div className="stat-card-content">
                      <div className="stat-card-label">الإيرادات هذا الشهر</div>
                      <div className="stat-card-value">{formatNumber(comparison.revenue.current)} د.ع</div>
                      <div className={`stat-card-change ${comparison.revenue.isPositive ? 'positive' : 'negative'}`}>
                        {comparison.revenue.isPositive ? <FiTrendingUp /> : <FiTrendingDown />}
                        {Math.abs(comparison.revenue.change)}% عن الشهر الماضي
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Trends Chart */}
            <div className="chart-card full-width line-chart">
              <div className="chart-card-header">
                <h3 className="chart-card-title">الاتجاهات الشهرية (آخر 6 أشهر)</h3>
              </div>
              <div className="chart-card-content">
                <Line 
                  data={getMonthlyTrendData()} 
                  options={{
                    ...lineOptions,
                    scales: {
                      ...lineOptions.scales,
                      y: {
                        ...lineOptions.scales.y,
                        position: 'right',
                        title: {
                          display: true,
                          text: 'عدد القضايا',
                          font: { family: "'Cairo', 'Almarai', sans-serif", size: 12 }
                        }
                      },
                      y1: {
                        type: 'linear',
                        position: 'left',
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'الإيرادات (ألف د.ع)',
                          font: { family: "'Cairo', 'Almarai', sans-serif", size: 12 }
                        },
                        grid: {
                          drawOnChartArea: false
                        }
                      }
                    }
                  }} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Scheduled Reports Tab */}
        {activeTab === 'scheduled' && (
          <div className="reports-content">
            <div className="section-header">
              <button className="export-btn" onClick={() => setShowFilters(!showFilters)}>
                <FiPlus /> جدولة تقرير جديد
              </button>
            </div>

            {scheduledReports.length === 0 ? (
              <div className="empty-state-card">
                <FaCalendarCheck className="empty-state-icon" />
                <h3>لا توجد تقارير مجدولة</h3>
                <p>قم بجدولة تقرير جديد للحصول على تقارير تلقائية منتظمة</p>
                <button className="primary-btn" onClick={() => setShowFilters(!showFilters)}>
                  <FiPlus /> جدولة تقرير جديد
                </button>
              </div>
            ) : (
              <div className="table-card">
                <div className="table-card-header">
                  <h3 className="table-card-title">قائمة التقارير المجدولة</h3>
                </div>
                <div className="table-wrapper">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>اسم التقرير</th>
                        <th>النوع</th>
                        <th>التكرار</th>
                        <th>الموعد القادم</th>
                        <th>المستلمون</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduledReports.map((report, index) => (
                        <tr key={index}>
                          <td>{report.name}</td>
                          <td>{report.type}</td>
                          <td>{report.frequency}</td>
                          <td>{report.nextRun}</td>
                          <td>{report.recipients}</td>
                          <td>
                            <span className={`status-badge status-${report.status}`}>
                              {report.status === 'active' ? 'نشط' : 'معطل'}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button className="icon-btn" title="تحرير">
                                <FiEdit />
                              </button>
                              <button className="icon-btn" title="حذف">
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Schedule Report Form */}
            {showFilters && (
              <div className="schedule-form-card">
                <div className="schedule-form-header">
                  <h3>جدولة تقرير جديد</h3>
                  <button className="close-btn" onClick={() => setShowFilters(false)}>×</button>
                </div>
                <div className="schedule-form-content">
                  <div className="form-group">
                    <label>اسم التقرير</label>
                    <input type="text" placeholder="مثال: تقرير أسبوعي للقضايا" />
                  </div>
                  <div className="form-group">
                    <label>نوع التقرير</label>
                    <select>
                      <option>تقارير القضايا</option>
                      <option>التقارير المالية</option>
                      <option>تقارير الجلسات</option>
                      <option>تقارير الإجراءات</option>
                      <option>تقارير المهام</option>
                      <option>تقارير الموكلين</option>
                      <option>أداء المحامين</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>التكرار</label>
                      <select>
                        <option>يومي</option>
                        <option>أسبوعي</option>
                        <option>شهري</option>
                        <option>ربع سنوي</option>
                        <option>سنوي</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>الوقت</label>
                      <input type="time" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>المستلمون (البريد الإلكتروني)</label>
                    <input type="email" placeholder="email@example.com" multiple />
                  </div>
                  <div className="form-actions">
                    <button className="primary-btn">حفظ الجدولة</button>
                    <button className="secondary-btn" onClick={() => setShowFilters(false)}>إلغاء</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Report Builder Tab */}
        {activeTab === 'custom' && (
          <div className="reports-content">
            <div className="builder-container">
              <div className="builder-sidebar">
                <h3>الحقول المتاحة</h3>
                <div className="field-categories">
                  <div className="category-section">
                    <h4>معلومات القضايا</h4>
                    <label><input type="checkbox" /> رقم القضية</label>
                    <label><input type="checkbox" /> اسم الموكل</label>
                    <label><input type="checkbox" /> نوع القضية</label>
                    <label><input type="checkbox" /> حالة القضية</label>
                    <label><input type="checkbox" /> تاريخ القضية</label>
                    <label><input type="checkbox" /> قيمة القضية</label>
                    <label><input type="checkbox" /> المحامي المسؤول</label>
                  </div>
                  <div className="category-section">
                    <h4>المعلومات المالية</h4>
                    <label><input type="checkbox" /> أتعاب المحاماة</label>
                    <label><input type="checkbox" /> المبالغ المستلمة</label>
                    <label><input type="checkbox" /> المتبقي</label>
                    <label><input type="checkbox" /> المصروفات</label>
                  </div>
                  <div className="category-section">
                    <h4>الجلسات والإجراءات</h4>
                    <label><input type="checkbox" /> عدد الجلسات</label>
                    <label><input type="checkbox" /> عدد الإجراءات</label>
                    <label><input type="checkbox" /> عدد المهام</label>
                  </div>
                </div>
                <div className="builder-actions">
                  <button className="primary-btn" onClick={() => generateCustomReport()}>
                    <FaChartBar /> إنشاء التقرير
                  </button>
                  <button className="secondary-btn" onClick={() => resetCustomBuilder()}>
                    إعادة تعيين
                  </button>
                </div>
              </div>

              <div className="builder-main">
                {customReportData.length > 0 ? (
                  <>
                    <div className="builder-header">
                      <h3>معاينة التقرير</h3>
                      <div className="export-buttons">
                        <button className="export-btn" onClick={() => exportCustomReport('PDF')}>
                          <FaPrint /> تصدير PDF
                        </button>
                        <button className="export-btn" onClick={() => exportCustomReport('CSV')}>
                          <FaDownload /> تصدير CSV
                        </button>
                      </div>
                    </div>
                    <div className="table-card">
                      <div className="table-wrapper">
                        <table className="reports-table">
                          <thead>
                            <tr>
                              {customReportFields.map((field, idx) => (
                                <th key={idx}>{field}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {customReportData.slice(0, 100).map((row, idx) => (
                              <tr key={idx}>
                                {customReportFields.map((field, fIdx) => (
                                  <td key={fIdx}>{row[field] || '-'}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="empty-state-card">
                    <FaCog className="empty-state-icon" />
                    <h3>ابدأ بإنشاء تقرير مخصص</h3>
                    <p>اختر الحقول من القائمة الجانبية وقم بإنشاء التقرير</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .reports-page {
            padding: 1.5rem;
            max-width: 100%;
            margin: 0 auto;
            direction: rtl;
            overflow-x: hidden;
            width: 100%;
            background: transparent;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .reports-page * {
            box-sizing: border-box;
          }

          .reports-page::-webkit-scrollbar,
          .reports-page *::-webkit-scrollbar {
            display: none;
            width: 0;
            height: 0;
          }

          .reports-page {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .reports-page * {
            -ms-overflow-style: none;
          }

          .reports-loading-container {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100vw;
            height: 100vh;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.95);
            z-index: 9999;
            margin: 0;
          }

          .reports-loading-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            background: #ffffff;
            border-radius: 16px;
            padding: 4rem 3rem;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            max-width: 500px;
            width: 100%;
          }

          .loading-icon-wrapper {
            margin-bottom: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .loading-icon {
            width: 80px;
            height: 80px;
            color: #2563EB;
            animation: pulse 2s ease-in-out infinite;
          }

          .loading-text {
            font-size: 1.125rem;
            font-weight: 600;
            color: #2563EB;
            font-family: 'Cairo', 'Almarai', sans-serif;
            margin: 0;
            line-height: 1.6;
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.7;
              transform: scale(1.05);
            }
          }

          .reports-header {
            display: none;
          }

          .reports-actions {
            display: flex;
            gap: 0.75rem;
          }

          .refresh-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.625rem 1.25rem;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            color: #475569;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .refresh-btn:hover {
            background: #f9fafb;
            border-color: #2563EB;
            color: #2563EB;
          }

          .reports-tabs {
            display: flex;
            gap: 0.375rem;
            margin-bottom: 0.5rem;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            overflow-x: auto;
            flex-wrap: nowrap;
            width: 100%;
            padding: 0.375rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          }

          .reports-tabs::-webkit-scrollbar {
            height: 0;
            display: none;
          }

          .reports-tabs {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .tab-btn {
            padding: 0.625rem 1.125rem;
            background: transparent;
            border: none;
            border-radius: 10px;
            color: #475569;
            font-weight: 600;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            white-space: nowrap;
            font-family: 'Cairo', 'Almarai', sans-serif;
            flex-shrink: 0;
          }

          .tab-btn.active {
            color: #ffffff;
            background: linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%);
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
          }

          .reports-content {
            animation: fadeIn 0.3s ease;
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
            background: transparent;
            padding: 1.5rem 0 1.5rem 0;
          }

          .reports-content::-webkit-scrollbar {
            display: none;
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

          .overview-cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
            width: 100%;
          }

          .stat-card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 1.25rem;
            display: flex;
            align-items: stretch;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
            width: 100%;
            min-width: 0;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }

          .stat-card-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 0.35rem;
          }

          .stat-card-header-row {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 0.75rem;
            min-width: 0;
          }

          .stat-card-icon {
            width: 32px;
            height: 32px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 1.1rem;
            flex-shrink: 0;
          }

          .stat-card-value {
            font-size: 1.4rem;
            font-weight: 700;
            color: #0f172a;
            font-family: 'Cairo', 'Almarai', sans-serif;
            line-height: 1.1;
            margin: 0.75rem 0;
          }

          .stat-card-label {
            font-size: 0.8rem;
            color: #000000;
            font-weight: 700;
            line-height: 1.5;
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
          }

          .stat-card-description {
            font-size: 0.75rem;
            color: #64748b;
            font-weight: 400;
            line-height: 1.4;
            margin-top: 0.5rem;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .lawyer-highlights-section {
            margin-bottom: 2rem;
          }

          .lawyer-highlights-section .section-title {
            margin-bottom: 2rem;
          }

          .performance-metrics-section {
            margin-top: 3rem;
            margin-bottom: 2rem;
          }

          .performance-metrics-section .section-title {
            font-size: 1.5rem;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 1.5rem 0;
            font-family: 'Cairo', 'Almarai', sans-serif;
            padding-bottom: 1rem;
            border-bottom: 2px solid #e5e7eb;
          }

          .stat-card.highlight-card {
            border: 2px solid #2563EB;
            background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
          }

          .stat-card .large-value {
            font-size: 2.5rem;
            font-weight: 800;
            line-height: 1;
          }

          .productivity-bar {
            width: 100%;
            height: 10px;
            background: #f1f5f9;
            border-radius: 999px;
            overflow: hidden;
            margin-top: 1rem;
          }

          .productivity-bar-fill {
            height: 100%;
            border-radius: 999px;
            transition: width 0.5s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          .section-title {
            font-size: 1.5rem;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 1.5rem 0;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
            width: 100%;
          }

          .chart-card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 1.75rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
            width: 100%;
            min-width: 0;
            transition: box-shadow 0.2s ease;
          }

          .chart-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .chart-card.full-width {
            grid-column: 1 / -1;
          }

          .chart-card-header {
            margin-bottom: 1rem;
            padding-bottom: 0.875rem;
            border-bottom: 1px solid #f1f3f4;
          }

          .chart-card-title {
            font-size: 1.125rem;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .chart-card-content {
            height: 200px;
            position: relative;
            width: 100%;
          }

          /* Bar charts and line charts slightly taller */
          .chart-card.bar-chart .chart-card-content,
          .chart-card.line-chart .chart-card-content {
            height: 220px;
          }

          /* Line charts */
          .chart-card.line-chart .chart-card-content {
            height: 220px;
          }

          .section-header {
            margin-bottom: 1.5rem;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
          }

          .lawyer-performance-filters {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            padding: 1.5rem;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            margin-bottom: 2rem;
            flex-wrap: wrap;
            direction: rtl;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          }

          .filter-bar-title-section {
            display: flex;
            align-items: center;
            flex-shrink: 0;
          }

          .filter-bar-title {
            font-size: 1.5rem;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
            padding: 0;
            font-family: 'Cairo', 'Almarai', sans-serif;
            letter-spacing: -0.02em;
            white-space: nowrap;
          }

          .filter-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            flex: 0 1 auto;
            min-width: 200px;
            max-width: 280px;
          }

          .filter-bar-actions {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex-shrink: 0;
            margin-right: auto;
          }

          .export-btn-small {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: #2563EB;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            font-weight: 500;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: 'Cairo', 'Almarai', sans-serif;
            white-space: nowrap;
          }

          .export-btn-small:hover:not(:disabled) {
            background: #1e40af;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
          }

          .export-btn-small:disabled {
            background: #cbd5e1;
            color: #94a3b8;
            cursor: not-allowed;
            opacity: 0.6;
          }

          .filter-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            font-weight: 700;
            color: #000000;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .filter-label span {
            font-weight: 700;
            color: #000000;
          }

          .filter-icon {
            width: 18px;
            height: 18px;
            color: #3b82f6;
          }

          .filter-select {
            padding: 0.625rem 0.875rem;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: #ffffff;
            font-size: 0.875rem;
            color: #1a1a1a;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: 'Cairo', 'Almarai', sans-serif;
            width: 100%;
          }

          .filter-select:hover {
            border-color: #cbd5e1;
          }

          .filter-select:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .date-range-input-group {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .date-range-input {
            flex: 1;
            padding: 0.625rem 0.875rem;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: #ffffff;
            font-size: 0.875rem;
            color: #1a1a1a;
            font-family: 'Cairo', 'Almarai', sans-serif;
            cursor: pointer;
          }

          .date-range-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .change-date-btn {
            padding: 0.625rem 1rem;
            background: #3b82f6;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: 'Cairo', 'Almarai', sans-serif;
            white-space: nowrap;
          }

          .change-date-btn:hover {
            background: #2563eb;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
          }

          .change-date-btn:active {
            transform: translateY(0);
          }

          .date-range-select-container {
            position: relative;
            width: 100%;
          }

          .date-range-select {
            width: 100%;
            position: relative;
          }

          .date-range-select:not([value=""]) {
            color: transparent;
          }

          .date-range-select option {
            color: #1e293b;
          }

          .date-range-display-inline {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 0.875rem;
            color: #1e293b;
            font-weight: 500;
            font-family: 'Cairo', 'Almarai', sans-serif;
            pointer-events: none;
            white-space: nowrap;
            z-index: 1;
            background: transparent;
          }

          .date-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .date-modal-content {
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            width: 90%;
            max-width: 450px;
            direction: rtl;
          }

          .date-modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid #e5e7eb;
          }

          .date-modal-header h3 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 700;
            color: #0f172a;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .date-modal-body {
            padding: 1.5rem;
          }

          .date-input-group {
            margin-bottom: 1rem;
          }

          .date-input-group:last-child {
            margin-bottom: 0;
          }

          .date-input-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
            font-weight: 600;
            color: #374151;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .date-input-group input[type="date"] {
            width: 100%;
            padding: 0.625rem 0.875rem;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            font-size: 0.875rem;
            font-family: 'Cairo', 'Almarai', sans-serif;
            color: #1a1a1a;
          }

          .date-input-group input[type="date"]:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .date-modal-footer {
            padding: 1.5rem;
            border-top: 1px solid #e5e7eb;
            display: flex;
            gap: 0.75rem;
            justify-content: flex-end;
          }

          .date-modal-btn {
            padding: 0.625rem 1.25rem;
            border: none;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .date-modal-btn.cancel-btn {
            background: #f1f5f9;
            color: #475569;
          }

          .date-modal-btn.cancel-btn:hover {
            background: #e2e8f0;
          }

          .date-modal-btn.update-btn {
            background: #2563EB;
            color: #ffffff;
          }

          .date-modal-btn.update-btn:hover {
            background: #1e40af;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
          }

          .section-title {
            font-size: 1.5rem;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
            font-family: 'Cairo', 'Almarai', sans-serif;
            letter-spacing: -0.02em;
          }

          .export-buttons {
            display: flex;
            gap: 0.75rem;
          }

          .export-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.625rem 1.25rem;
            background: #2563EB;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .export-btn:hover {
            background: #1e40af;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
          }

          .truncate-cell {
            max-width: 250px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            word-wrap: break-word;
          }

          .status-badge, .priority-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .status-completed {
            background: #D1FAE5;
            color: #065F46;
          }

          .status-in_progress {
            background: #DBEAFE;
            color: #1E40AF;
          }

          .status-pending {
            background: #FEF3C7;
            color: #92400E;
          }

          .priority-high {
            background: #FEE2E2;
            color: #991B1B;
          }

          .priority-medium {
            background: #FEF3C7;
            color: #92400E;
          }

          .priority-low {
            background: #D1FAE5;
            color: #065F46;
          }

          .overdue-row {
            background: #FEF2F2 !important;
          }

          .overdue-row:hover {
            background: #FEE2E2 !important;
          }

          .overdue-date {
            color: #EF4444;
            font-weight: 600;
          }

          .positive-balance {
            color: #10B981;
            font-weight: 600;
          }

          .negative-balance {
            color: #EF4444;
            font-weight: 600;
          }

          .performance-badge, .performance-score {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .performance-badge.high, .performance-score.high {
            background: #D1FAE5;
            color: #065F46;
          }

          .performance-badge.medium, .performance-score.medium {
            background: #FEF3C7;
            color: #92400E;
          }

          .performance-badge.low, .performance-score.low {
            background: #FEE2E2;
            color: #991B1B;
          }

          .stat-card-change {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.75rem;
            margin-top: 0.5rem;
            font-weight: 500;
          }

          .stat-card-change.positive {
            color: #10B981;
          }

          .stat-card-change.negative {
            color: #EF4444;
          }

          .empty-state-card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 4rem 2rem;
            text-align: center;
          }

          .empty-state-icon {
            width: 64px;
            height: 64px;
            color: #94a3b8;
            margin-bottom: 1.5rem;
          }

          .empty-state-card h3 {
            font-size: 1.5rem;
            color: #1a1a1a;
            margin-bottom: 0.5rem;
          }

          .empty-state-card p {
            color: #64748B;
            margin-bottom: 2rem;
          }

          .primary-btn {
            padding: 0.75rem 1.5rem;
            background: #2563EB;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: 'Cairo', 'Almarai', sans-serif;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
          }

          .primary-btn:hover {
            background: #1e40af;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
          }

          .secondary-btn {
            padding: 0.75rem 1.5rem;
            background: #ffffff;
            color: #475569;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .secondary-btn:hover {
            background: #f9fafb;
            border-color: #cbd5e1;
          }

          .schedule-form-card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 2rem;
            margin-top: 2rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .schedule-form-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #e5e7eb;
          }

          .schedule-form-header h3 {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1a1a1a;
            margin: 0;
          }

          .close-btn {
            width: 32px;
            height: 32px;
            border: none;
            background: #f3f4f6;
            border-radius: 50%;
            font-size: 1.5rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #475569;
            transition: all 0.2s ease;
          }

          .close-btn:hover {
            background: #e5e7eb;
          }

          .schedule-form-content {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .form-group label {
            font-weight: 600;
            color: #1a1a1a;
            font-size: 0.875rem;
          }

          .form-group input,
          .form-group select {
            padding: 0.75rem;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            font-family: 'Cairo', 'Almarai', sans-serif;
            font-size: 0.875rem;
          }

          .form-group input:focus,
          .form-group select:focus {
            outline: none;
            border-color: #2563EB;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          }

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
          }

          .form-actions {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
          }

          .action-buttons {
            display: flex;
            gap: 0.5rem;
          }

          .icon-btn {
            width: 32px;
            height: 32px;
            border: 1px solid #e5e7eb;
            background: #ffffff;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #475569;
            transition: all 0.2s ease;
          }

          .icon-btn:hover {
            background: #f9fafb;
            border-color: #cbd5e1;
            color: #2563EB;
          }

          .builder-container {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 2rem;
            margin-top: 2rem;
          }

          .builder-sidebar {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 1.5rem;
            height: fit-content;
            position: sticky;
            top: 100px;
          }

          .builder-sidebar h3 {
            font-size: 1.125rem;
            font-weight: 700;
            color: #1a1a1a;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #e5e7eb;
          }

          .field-categories {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            margin-bottom: 2rem;
          }

          .category-section h4 {
            font-size: 0.875rem;
            font-weight: 600;
            color: #64748B;
            margin-bottom: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .category-section label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.2s ease;
            font-size: 0.875rem;
            color: #475569;
          }

          .category-section label:hover {
            background: #f9fafb;
          }

          .category-section input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
          }

          .builder-actions {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .builder-main {
            min-height: 400px;
          }

          .builder-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
          }

          .builder-header h3 {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1a1a1a;
            margin: 0;
          }


          .table-card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 1.75rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
            margin-bottom: 2rem;
            width: 100%;
            min-width: 0;
          }

          .table-card-header {
            margin-bottom: 1.25rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #f1f3f4;
          }

          .table-card-title {
            font-size: 1.125rem;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .table-wrapper {
            width: 100%;
            overflow-x: hidden;
            overflow-y: visible;
          }

          .table-wrapper::-webkit-scrollbar {
            width: 0;
            height: 0;
            display: none;
          }

          .table-wrapper {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .table-wrapper * {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .table-wrapper *::-webkit-scrollbar {
            display: none;
            width: 0;
            height: 0;
          }

          .reports-table {
            width: 100%;
            border-collapse: collapse;
            font-family: 'Cairo', 'Almarai', sans-serif;
            table-layout: auto;
          }

          .reports-table th,
          .reports-table td {
            word-wrap: break-word;
            overflow-wrap: break-word;
          }

          /* Responsive table columns - auto-sizing with word wrap */
          .reports-table th,
          .reports-table td {
            padding-right: 0.75rem;
            padding-left: 0.75rem;
          }

          /* Ensure long text wraps properly */
          .reports-table td {
            hyphens: auto;
            -webkit-hyphens: auto;
            -moz-hyphens: auto;
          }

          .reports-table thead {
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            border-bottom: 2px solid #cbd5e1;
          }

          .reports-table th {
            padding: 1rem 0.75rem;
            text-align: center;
            font-weight: 700;
            color: #1e293b;
            font-size: 0.95rem;
            white-space: nowrap;
            line-height: 1.4;
            text-transform: none;
          }

          .reports-table td {
            padding: 1.125rem 1rem;
            text-align: center;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
            font-size: 0.95rem;
            white-space: normal;
            word-wrap: break-word;
            line-height: 1.5;
            font-weight: 500;
          }

          .reports-table tbody tr {
            background: #ffffff;
            transition: background 0.2s ease;
          }

          .reports-table tbody tr:nth-child(even) {
            background-color: #f8fafc;
          }

          .reports-table tbody tr:hover {
            background-color: #f1f5f9;
          }

          .reports-table tbody tr:last-child td {
            border-bottom: none;
          }

          .table-total-row {
            background: #f1f5f9 !important;
            font-weight: 700;
            color: #0f172a;
            border-top: 2px solid #e2e8f0;
          }

          .table-total-row td {
            font-size: 1rem !important;
          }

          .text-right {
            text-align: right !important;
          }

          .financial-table td {
            font-weight: 600;
            color: #1e293b;
          }

          .case-link {
            color: #2563EB;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s ease;
          }

          .case-link:hover {
            color: #1e40af;
            text-decoration: underline;
          }

          .outstanding-positive {
            color: #EF4444;
            font-weight: 600;
          }

          .outstanding-zero {
            color: #10B981;
            font-weight: 600;
          }

          /* ====== TABLET BREAKPOINT ====== */
          @media (max-width: 1024px) {
            .overview-cards-grid {
              grid-template-columns: repeat(3, 1fr);
            }
          }

          /* ====== MOBILE BREAKPOINT ====== */
          @media (max-width: 768px) {
            .reports-page {
              padding: 0.75rem 0.75rem 0 0.75rem;
            }

            /* Tabs - Wrapping grid for better visibility on mobile */
            .reports-tabs {
              display: flex;
              flex-wrap: wrap; 
              gap: 0.5rem;
              padding: 0.5rem;
              border-radius: 12px;
              margin-bottom: 1rem;
              overflow-x: visible;
              background: transparent;
              border: none;
              box-shadow: none;
            }
            
            .tab-btn {
              flex: 1 1 calc(33.333% - 0.5rem); /* 3 items per row on mobile */
              min-width: 90px;
              padding: 0.625rem 0.375rem;
              font-size: 0.725rem;
              border-radius: 8px;
              justify-content: center;
              text-align: center;
              background: #ffffff;
              border: 1px solid #e2e8f0;
              box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }

            .tab-btn.active {
               background: linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%);
               color: #ffffff;
               border-color: #2563EB;
            }

            /* Overview Cards - 2 column grid */
            .overview-cards-grid {
              grid-template-columns: 1fr;
              gap: 0.75rem;
              margin-bottom: 1rem;
            }

            /* Compact Financial Summary Grid */
            .financial-overview-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 0.5rem !important;
              margin-bottom: 1rem;
            }

            .financial-overview-grid .stat-card {
              padding: 0.75rem 0.5rem;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              min-height: 110px;
            }

            .financial-overview-grid .stat-card-header-row {
              flex-direction: column;
              gap: 0.25rem;
              margin-bottom: 0.25rem;
              width: 100%;
            }

            .financial-overview-grid .stat-card-icon {
              width: 28px;
              height: 28px;
              font-size: 0.9rem;
              margin: 0 auto;
            }

            .financial-overview-grid .stat-card-label {
              font-size: 0.7rem;
              white-space: normal;
              text-align: center;
              line-height: 1.2;
              color: #475569;
              font-weight: 600;
              height: 2.4em;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .financial-overview-grid .stat-card-value {
              font-size: 0.9rem;
              margin: 0.25rem 0 0 0;
              font-weight: 800;
            }

            .financial-overview-grid .stat-card-value div:last-child {
              font-size: 0.6rem !important;
              margin-top: 2px !important;
            }

            /* Allow 2 columns only for simple stat cards if space permits, but default to 1 for readability */
            @media (min-width: 480px) {
              .overview-cards-grid:not(.financial-overview-grid) {
                grid-template-columns: repeat(2, 1fr);
              }
            }

            .stat-card {
              padding: 0.875rem;
              border-radius: 10px;
            }

            .stat-card-icon {
              width: 28px;
              height: 28px;
              border-radius: 8px;
              font-size: 0.875rem;
            }

            .stat-card-value {
              font-size: 1.125rem;
              margin: 0.5rem 0 0.25rem 0;
            }

            .stat-card-label {
              font-size: 0.6875rem;
              line-height: 1.3;
            }

            .reports-content {
              padding: 0.5rem 0 0 0;
            }

            /* Internal spacing between cards on mobile */
            .reports-content > div {
              margin-bottom: 1rem !important;
            }

            :global(.main-content) {
              padding-bottom: 0px !important;
              margin-bottom: 0px !important;
            }

            .overview-cards-grid,
            .charts-grid,
            .table-card,
            .lawyer-highlights-section,
            .performance-metrics-section,
            .lawyer-performance-filters,
            .builder-sidebar,
            .builder-main,
            .reports-content > div:last-child {
              margin-bottom: 0px !important;
            }

            .reports-table th {
              font-size: 0.875rem;
              padding: 0.875rem 0.5rem;
            }

            .reports-table td {
              font-size: 0.875rem;
              padding: 0.875rem 0.5rem;
            }

            .table-total-row td {
              font-size: 0.9rem !important;
            }

            .stat-card-description {
              font-size: 0.625rem;
              margin-top: 0.25rem;
            }

            .stat-card .large-value {
              font-size: 1.75rem;
            }

            /* Charts - single column, compact */
            .charts-grid {
              grid-template-columns: 1fr;
              gap: 0.75rem;
              margin-bottom: 0px !important;
            }

            .chart-card {
              padding: 1rem;
              border-radius: 10px;
            }

            .chart-card-header {
              margin-bottom: 0.625rem;
              padding-bottom: 0.5rem;
            }

            .chart-card-title {
              font-size: 0.9375rem;
            }

            .chart-card-content {
              height: 200px;
              min-height: 200px !important;
            }

            .financial-reports-chart-card .chart-card-content {
              height: 450px !important;
              min-height: 450px !important;
            }

            /* Section headers & titles */
            .section-title, .table-card-title, .chart-card-title {
              font-size: 1.125rem !important;
              margin-bottom: 0.875rem !important;
              text-align: right;
              width: 100%;
              font-weight: 700;
              color: #1e293b;
            }

            .section-header {
              flex-direction: column;
              align-items: flex-end;
              gap: 0.75rem;
              margin-bottom: 1.25rem;
            }

            .export-buttons {
              width: 100%;
              flex-wrap: wrap;
              gap: 0.5rem;
            }

            .export-btn {
              flex: 1;
              min-width: 0;
              font-size: 0.75rem;
              padding: 0.5rem 0.75rem;
              justify-content: center;
            }

            /* Tables - card-based layout */
            .table-card {
              padding: 0;
              border: none;
              box-shadow: none;
              background: transparent;
              margin-bottom: 0 !important;
            }

            .table-card-header {
              padding: 0 0 0.75rem 0;
            }

            .table-wrapper {
              overflow-x: auto;
            }

            .reports-table {
              font-size: 0.875rem;
            }

            .mobile-cards-table thead {
              display: none; /* Hide header on mobile for card layout */
            }

            .mobile-cards-table tbody tr {
              display: block;
              margin-bottom: 1rem;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              overflow: hidden;
              background: #ffffff;
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }

            .mobile-cards-table tbody tr:last-child {
              margin-bottom: 0;
            }

            .mobile-cards-table td {
              display: flex;
              justify-content: space-between;
              padding: 0.75rem 1rem !important;
              text-align: left !important;
              border-bottom: 1px solid #f1f5f9 !important;
              font-size: 0.875rem !important;
            }

            .mobile-cards-table td:last-child {
              border-bottom: none !important;
            }

            .mobile-cards-table td::before {
              content: attr(data-label);
              font-weight: 700;
              color: #64748b;
              margin-right: 1rem;
            }

            .reports-table th {
              padding: 0.75rem 0.5rem;
              font-size: 0.8125rem;
            }

            .reports-table td {
              padding: 0.75rem 0.5rem;
              font-size: 0.875rem;
            }

            /* Custom Report Builder */
            .builder-container {
              grid-template-columns: 1fr;
              gap: 1rem;
            }

            .builder-sidebar {
              position: static;
            }

            .form-row {
              grid-template-columns: 1fr;
            }

            /* Lawyer Performance Filters */
            .lawyer-performance-filters {
              flex-direction: column;
              gap: 0.75rem;
              padding: 0.875rem;
              border-radius: 10px;
            }

            .filter-bar-title-section {
              width: 100%;
            }

            .filter-bar-title {
              font-size: 1.125rem;
            }

            .filter-group {
              min-width: 100%;
              max-width: 100%;
            }

            .filter-bar-actions {
              width: 100%;
              justify-content: stretch;
              margin-right: 0;
              gap: 0.5rem;
            }

            .export-btn-small {
              flex: 1;
              justify-content: center;
              font-size: 0.75rem;
              padding: 0.5rem 0.75rem;
            }

            .date-range-input-group {
              flex-direction: column;
              gap: 0.5rem;
            }

            .change-date-btn {
              width: 100%;
            }

            /* Productivity bar */
            .productivity-bar {
              margin-top: 0.625rem;
              height: 8px;
            }

            /* Loading state */
            .reports-loading-card {
              padding: 2.5rem 1.5rem;
            }

            .loading-icon {
              width: 56px;
              height: 56px;
            }

            .loading-text {
              font-size: 0.9375rem;
            }

            /* Performance metrics section */
            .performance-metrics-section {
              margin-top: 1.5rem;
            }

            /* Highlights section */
            .lawyer-highlights-section .overview-cards-grid {
              grid-template-columns: repeat(2, 1fr);
            }

            /* Modals */
            .date-modal-content {
              width: 95%;
            }

            .schedule-form {
              width: 95%;
              max-width: 100%;
            }
          }

          /* ====== SMALL MOBILE ====== */
          @media (max-width: 400px) {
            .reports-page {
              padding: 0.5rem 0.5rem 0 0.5rem;
            }

            .overview-cards-grid {
              grid-template-columns: 1fr 1fr;
              gap: 0.5rem;
            }

            .stat-card {
              padding: 0.625rem;
            }

            .stat-card-value {
              font-size: 1rem;
            }

            .tab-btn {
              padding: 0.375rem 0.625rem;
              font-size: 0.6875rem;
            }
          }
        `}</style>
      </div>
    </Layout>
  )
}

export default withAuth(Reports, ['can_extract_fees_report'])

