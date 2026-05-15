"use client"
import { useState, useEffect } from "react"
import ReactDOM from 'react-dom'
import { useRouter } from "next/router"
import Head from "next/head"
import Layout from "../../components/layout/Layout"
import { supabase } from '../../lib/initSupabase'
import {
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaPlus,
  FaSearch,
  FaFilter,
  FaTimes
} from "react-icons/fa"
import { CheckSquare, Calendar, User, FileText } from "lucide-react"
import { useSubscription } from '../../context/SubscriptionContext'

export default function TasksPage() {
  const router = useRouter()
  const { isReadOnly, loading: subLoading } = useSubscription()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedTask, setSelectedTask] = useState(null)
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [replyStatus, setReplyStatus] = useState('قيد العمل')
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  const [userId, setUserId] = useState(null)
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
  const [casesData, setCasesData] = useState([])
  const [toastMessage, setToastMessage] = useState(null)
  const [toastType, setToastType] = useState('success') // 'success' or 'error'

  useEffect(() => {
    const sessionUser = supabase.auth.user()
    if (sessionUser) {
      setUserId(sessionUser.id)
      fetchTasks(sessionUser.id)
    }
  }, [])

  const fetchCasesData = async (uid) => {
    try {
      const { data: userMetadata, error: userMetadataError } = await supabase
        .from('user_metadata')
        .select('admin_user_id, new_lawyer_id')
        .or(`new_lawyer_id.eq.${uid}, admin_user_id.eq.${uid}`)

      if (userMetadataError) {
        console.error('Error fetching user metadata:', userMetadataError)
        return
      }

      const isAdmin = userMetadata.some(meta => meta.admin_user_id === uid)
      const lawyerIds = userMetadata
        .filter(meta => meta.admin_user_id === uid)
        .map(meta => meta.new_lawyer_id)

      let cases = []

      if (isAdmin) {
        const { data, error } = await supabase
          .from('cases')
          .select('id, case_number, client_name')
          .or(`admin_id.eq.${uid}, lawyer_id.in.(${lawyerIds.join(',')},${uid}), caseLawyerId.in.(${lawyerIds.join(',')},${uid})`)
        if (error) {
          console.error('Error fetching admin cases:', error)
          return
        }
        cases = data || []
      } else {
        const { data, error } = await supabase
          .from('cases')
          .select('id, case_number, client_name')
          .or(`lawyer_id.eq.${uid}, caseLawyerId.eq.${uid}`)
        if (error) {
          console.error('Error fetching lawyer cases:', error)
          return
        }
        cases = data || []
      }

      setCasesData(cases)
    } catch (error) {
      console.error('Error fetching cases:', error)
    }
  }

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
            const { createNotificationsForUsers } = await import('../../lib/notifications')
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

      alert('تم إضافة المهمة بنجاح')
      handleCloseAddTaskModal()
      
      // Refresh tasks
      if (userId) {
        fetchTasks(userId)
      }
    } catch (error) {
      console.error('Error submitting task:', error)
      alert(`حدث خطأ: ${error.message}`)
    } finally {
      setIsSubmittingTask(false)
    }
  }

  const fetchTasks = async (uid) => {
    try {
      setLoading(true)
      const { data: userMetadata, error: metadataError } = await supabase
        .from('user_metadata')
        .select('admin_user_id, new_lawyer_id, user_id, role')
        .or(`admin_user_id.eq.${uid},new_lawyer_id.eq.${uid},user_id.eq.${uid}`)
        .limit(1)
        .maybeSingle()

      if (metadataError) {
        console.error('Error fetching user metadata:', metadataError)
        setLoading(false)
        return
      }

      if (!userMetadata) {
        console.log('No user metadata found for user:', uid)
        setTasks([])
        setLoading(false)
        return
      }

      const userId = uid
      const isAdmin = userMetadata.admin_user_id === userId
      const adminId = isAdmin ? userId : userMetadata.admin_user_id
      let firmUserIds = [userId]

      if (adminId) {
        const { data: firmMembers } = await supabase
          .from('user_metadata')
          .select('new_lawyer_id, user_id')
          .or(`admin_user_id.eq.${adminId},user_id.eq.${adminId}`)

        if (firmMembers) {
          const lIds = firmMembers.map(u => u.new_lawyer_id).filter(Boolean)
          const uIds = firmMembers.map(u => u.user_id).filter(Boolean)
          firmUserIds = [...new Set([adminId, userId, ...lIds, ...uIds])]
        }
      }

      console.log('Fetching tasks - isAdmin:', isAdmin, 'adminId:', adminId, 'firmUserIds:', firmUserIds, 'uid:', uid)

      let tasksQuery = supabase
        .from('tasks')
        .select('id, task_title, task_details, task_deadline, task_status, task_case, task_type, task_priority, task_date, case_id, lawyer_id, admin_id, lawyer_related, created_by_username, created_at')
        .order('created_at', { ascending: false })

      if (isAdmin) {
        tasksQuery = tasksQuery.or(`admin_id.in.(${firmUserIds.join(',')}),lawyer_id.in.(${firmUserIds.join(',')})`)
      } else {
        tasksQuery = tasksQuery.or(`lawyer_id.eq.${uid},admin_id.eq.${uid}`)
      }

      const { data, error } = await tasksQuery

      console.log('Fetched tasks:', data?.length || 0, 'tasks')

      if (error) {
        console.error('Error fetching tasks:', error)
        setTasks([])
      } else {
        // Fetch replies for each task
        const tasksWithReplies = await Promise.all(
          (data || []).map(async (task) => {
            const { data: replies } = await supabase
              .from('task_replies')
              .select('*')
              .eq('task_id', task.id)
              .order('created_at', { ascending: true })
            return { ...task, replies: replies || [] }
          })
        )
        setTasks(tasksWithReplies)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchQuery || 
      task.task_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.task_details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.task_case?.includes(searchQuery)
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'pending' && (task.task_status === 'pending' || !task.task_status)) ||
      (statusFilter === 'completed' && (task.task_status === 'completed' || task.task_status === 'مكتملة')) ||
      (statusFilter === 'in-progress' && (task.task_status === 'in-progress' || task.task_status === 'قيد التنفيذ'))
    
    const matchesPriority = priorityFilter === 'all' ||
      task.task_priority === priorityFilter
    
    const matchesType = typeFilter === 'all' ||
      (typeFilter === 'general' && !task.case_id && !task.task_case) ||
      (typeFilter === 'case' && (task.case_id || task.task_case))

    return matchesSearch && matchesStatus && matchesPriority && matchesType
  })

  const handleTaskClick = (task) => {
    if (task.case_id) {
      router.push(`/cases/CaseDetailsPage?caseId=${task.case_id}&tab=jobTasks`)
    } else if (task.task_case) {
      router.push(`/cases/CaseDetailsPage?caseNumber=${task.task_case}&tab=jobTasks`)
    } else {
      setSelectedTask(task)
    }
  }

  const handleSubmitReply = async (e) => {
    e.preventDefault()
    if (!replyContent.trim() || !selectedTask) return

    setIsSubmittingReply(true)
    try {
      const currentUser = supabase.auth.user()
      if (!currentUser) {
        alert('لم يتم العثور على مستخدم مسجل دخول')
        setIsSubmittingReply(false)
        return
      }

      const { data: currentUserData } = await supabase
        .from('user_metadata')
        .select('username')
        .or(`admin_user_id.eq."${currentUser.id}",new_lawyer_id.eq."${currentUser.id}",user_id.eq."${currentUser.id}"`)
        .limit(1)
        .maybeSingle()

      const replyBy = currentUserData?.username || currentUser.email || 'مستخدم'

      const { error: replyError } = await supabase
        .from('task_replies')
        .insert([{
          task_id: selectedTask.id,
          reply_content: replyContent.trim(),
          reply_status: replyStatus,
          reply_by: replyBy,
          reply_by_user_id: currentUser.id
        }])

      if (replyError) {
        throw replyError
      }

      // Update task status if changed
      if (replyStatus !== selectedTask.task_status) {
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ task_status: replyStatus })
          .eq('id', selectedTask.id)

        if (updateError) {
          console.error('Error updating task status:', updateError)
        }
      }

      // Show success toast message
      setToastMessage('تم إضافة التحديث بنجاح')
      setToastType('success')
      setIsReplyModalOpen(false)
      setReplyContent('')
      setReplyStatus('قيد العمل')
      
      // Clear selected task to prevent detail modal from showing
      setSelectedTask(null)
      
      // Refresh tasks
      if (userId) {
        fetchTasks(userId)
      }

      // Hide toast after 3 seconds
      setTimeout(() => {
        setToastMessage(null)
      }, 3000)
    } catch (error) {
      console.error('Error submitting reply:', error)
      setToastMessage(`حدث خطأ: ${error.message}`)
      setToastType('error')
      setTimeout(() => {
        setToastMessage(null)
      }, 4000)
    } finally {
      setIsSubmittingReply(false)
    }
  }

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case "مكتملة":
      case "completed":
        return "completed"
      case "قيد التنفيذ":
      case "in-progress":
      case "قيد العمل":
        return "in-progress"
      case "متأخرة":
      case "overdue":
        return "overdue"
      default:
        return "pending"
    }
  }

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case "مكتملة":
      case "completed":
        return "مكتملة"
      case "قيد التنفيذ":
      case "in-progress":
        return "قيد التنفيذ"
      case "قيد العمل":
        return "قيد العمل"
      case "متأخرة":
      case "overdue":
        return "متأخرة"
      default:
        return "قيد الانتظار"
    }
  }

  const getStatusFilterLabel = (filter) => {
    switch (filter) {
      case "pending":
        return "قيد الانتظار"
      case "in-progress":
        return "قيد التنفيذ"
      case "completed":
        return "مكتملة"
      default:
        return ""
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "عالية":
        return "#EF4444"
      case "متوسطة":
        return "#F59E0B"
      case "منخفضة":
        return "#10B981"
      default:
        return "#64748B"
    }
  }

  const isTaskOverdue = (task) => {
    if (!task.task_deadline) return false
    const deadline = new Date(task.task_deadline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    deadline.setHours(0, 0, 0, 0)
    return deadline < today && task.task_status !== 'completed' && task.task_status !== 'مكتملة'
  }

  return (
    <Layout>
      <Head>
        <title>المهام الوظيفية - نظام إدارة القضايا</title>
      </Head>

      <div className="tasks-page-container">
        {/* Header Section */}
        <div className="tasks-page-header-modern">
          <div className="tasks-header-top">
            <div className="tasks-title-wrapper">
              <div className="tasks-icon-wrapper">
                <CheckSquare size={24} />
              </div>
              <div>
                <h1 className="tasks-page-title-modern">المهام الوظيفية</h1>
                <p className="tasks-page-subtitle">
                  {filteredTasks.length} مهمة {statusFilter !== 'all' && `(${getStatusFilterLabel(statusFilter)})`}
                </p>
              </div>
            </div>
            <button
              className="tasks-add-btn-modern"
              onClick={handleOpenAddTaskModal}
              title="إضافة مهمة جديدة"
              disabled={isReadOnly || subLoading}
              style={{
                opacity: isReadOnly || subLoading ? 0.5 : 1,
                cursor: isReadOnly || subLoading ? 'not-allowed' : 'pointer'
              }}
            >
              <FaPlus size={16} />
              <span>إضافة مهمة</span>
            </button>
          </div>

          {/* Search and Filters - Single Row */}
          <div className="tasks-filters-row">
            <div className="tasks-search-modern">
              <FaSearch className="tasks-search-icon-modern" />
              <input
                type="text"
                className="tasks-search-input-modern"
                placeholder="البحث في المهام..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="tasks-search-clear-modern"
                  onClick={() => setSearchQuery('')}
                  aria-label="مسح البحث"
                >
                  <FaTimes size={12} />
                </button>
              )}
            </div>

            <div className="tasks-filter-buttons">
              <button
                className={`tasks-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                جميع الحالات
              </button>
              <button
                className={`tasks-filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setStatusFilter('pending')}
              >
                قيد الانتظار
              </button>
              <button
                className={`tasks-filter-btn ${statusFilter === 'in-progress' ? 'active' : ''}`}
                onClick={() => setStatusFilter('in-progress')}
              >
                قيد التنفيذ
              </button>
              <button
                className={`tasks-filter-btn ${statusFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setStatusFilter('completed')}
              >
                مكتملة
              </button>
            </div>

            <div className="tasks-filter-selects">
              <select
                className="tasks-filter-select-modern"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">جميع الأولويات</option>
                <option value="عالية">عالية</option>
                <option value="متوسطة">متوسطة</option>
                <option value="منخفضة">منخفضة</option>
              </select>

              <select
                className="tasks-filter-select-modern"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">جميع الأنواع</option>
                <option value="general">مهام عامة</option>
                <option value="case">مهام مرتبطة بقضية</option>
              </select>
            </div>
          </div>
        </div>

        <div className="tasks-content">
          {loading ? (
            <div className="tasks-loading">جاري التحميل...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="tasks-empty">
              <FileText className="tasks-empty-icon" size={48} />
              <p className="tasks-empty-text">لا توجد مهام</p>
            </div>
          ) : (
            <div className="tasks-table-container">
              <div className="tasks-table-header">
                <div className="tasks-table-col tasks-col-title">المهمة</div>
                <div className="tasks-table-col tasks-col-status">الحالة</div>
                <div className="tasks-table-col tasks-col-priority">الأولوية</div>
                <div className="tasks-table-col tasks-col-type">النوع</div>
                <div className="tasks-table-col tasks-col-deadline">الموعد النهائي</div>
                <div className="tasks-table-col tasks-col-assigned">المُكلف</div>
                <div className="tasks-table-col tasks-col-case">القضية</div>
                <div className="tasks-table-col tasks-col-actions">الإجراءات</div>
              </div>
              <div className="tasks-table-body">
                {filteredTasks.map((task) => {
                  const deadline = task.task_deadline ? new Date(task.task_deadline) : null
                  const isOverdue = isTaskOverdue(task)
                  const isCompleted = task.task_status === 'completed' || task.task_status === 'مكتملة'

                  return (
                    <div
                      key={task.id}
                      className={`tasks-table-row ${isCompleted ? 'task-completed' : ''} ${isOverdue ? 'task-overdue' : ''}`}
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="tasks-table-col tasks-col-title">
                        <div className="task-row-title-wrapper">
                          <h4 className="task-row-title">{task.task_title || 'مهمة بدون عنوان'}</h4>
                          {task.task_details && (
                            <p className="task-row-details">{task.task_details}</p>
                          )}
                          {task.replies && task.replies.length > 0 && (
                            <span className="task-row-replies">{task.replies.length} تحديث</span>
                          )}
                        </div>
                      </div>
                      <div className="tasks-table-col tasks-col-status">
                        <span className="task-mobile-label">الحالة</span>
                        <span className={`task-status-badge-modern ${getStatusClass(task.task_status)}`}>
                          {getStatusLabel(task.task_status)}
                        </span>
                      </div>
                      <div className="tasks-table-col tasks-col-priority">
                        <span className="task-mobile-label">الأولوية</span>
                        <span
                          className="task-priority-badge-modern"
                          style={{ backgroundColor: getPriorityColor(task.task_priority) + '20', color: getPriorityColor(task.task_priority) }}
                        >
                          {task.task_priority || 'متوسطة'}
                        </span>
                      </div>
                      <div className="tasks-table-col tasks-col-type">
                        <span className="task-mobile-label">النوع</span>
                        <span className="task-type-text">{task.task_type || '-'}</span>
                      </div>
                      <div className="tasks-table-col tasks-col-deadline">
                        <span className="task-mobile-label">الموعد النهائي</span>
                        <div className="task-deadline-wrapper">
                          {deadline ? (
                            <>
                              <Calendar size={14} />
                              <span className={isOverdue ? 'overdue-text' : ''}>
                                {deadline.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                              {isOverdue && <FaExclamationTriangle className="overdue-icon" size={12} />}
                            </>
                          ) : (
                            <span className="no-deadline">بدون موعد</span>
                          )}
                        </div>
                      </div>
                      <div className="tasks-table-col tasks-col-assigned">
                        <span className="task-mobile-label">المُكلف</span>
                        {task.lawyer_related ? (
                          <div className="task-assigned-wrapper">
                            <User size={14} />
                            <span>{task.lawyer_related}</span>
                          </div>
                        ) : (
                          <span className="no-assigned">-</span>
                        )}
                      </div>
                      <div className="tasks-table-col tasks-col-case">
                        <span className="task-mobile-label">القضية</span>
                        {task.task_case ? (
                          <span className="task-case-badge-modern">
                            {task.task_case}
                          </span>
                        ) : !task.case_id && !task.task_case ? (
                          <span className="task-general-badge-modern">عامة</span>
                        ) : (
                          <span className="no-case">-</span>
                        )}
                      </div>
                      <div className="tasks-table-col tasks-col-actions" onClick={(e) => e.stopPropagation()}>
                        {!task.case_id && !task.task_case && (
                          <button
                            className="task-reply-btn-modern"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedTask(task)
                              setReplyStatus(task.task_status || 'قيد العمل')
                              setIsReplyModalOpen(true)
                            }}
                            disabled={isReadOnly || subLoading}
                            style={{
                              opacity: isReadOnly || subLoading ? 0.5 : 1,
                              cursor: isReadOnly || subLoading ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <FaPlus size={12} />
                            <span>تحديث</span>
                          </button>
                        )}
                        {task.created_at && (
                          <span className="task-created-date-modern">
                            {new Date(task.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Task Modal - Rendered as popup overlay using Portal */}
      {typeof window !== 'undefined' && isAddTaskModalOpen && ReactDOM.createPortal(
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
      )}

      {/* Toast Notification */}
      {toastMessage && (
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
      )}

      {/* Toast Notification */}
      {toastMessage && (
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
      )}

      {/* Reply Modal */}
      {isReplyModalOpen && selectedTask && (
        <div className="popup-overlay-reminder">
          <div className="reminder-popup-container">
            <div className="reminder-popup-header">
              <div className="reminder-header-content">
                <div className="reminder-header-icon-wrapper">
                  <span className="reminder-header-icon">💬</span>
                </div>
                <h2>إضافة تحديث للمهمة</h2>
              </div>
              <button
                type="button"
                className="reminder-close-btn-right"
                onClick={() => {
                  setIsReplyModalOpen(false)
                  setReplyContent('')
                  setReplyStatus('قيد العمل')
                }}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>
            <div className="reminder-popup-content" style={{ padding: '12px 16px' }}>
              <div className="task-detail-preview">
                <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '700' }}>{selectedTask.task_title}</h3>
                {selectedTask.task_details && (
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748B' }}>{selectedTask.task_details}</p>
                )}
              </div>

              <form onSubmit={handleSubmitReply} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="reply_status" style={{ fontSize: '12px', marginBottom: '3px' }}>
                    حالة المهمة
                  </label>
                  <select
                    className="reminder-form-input reminder-form-select"
                    id="reply_status"
                    value={replyStatus}
                    onChange={(e) => setReplyStatus(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '13px' }}
                  >
                    <option value="قيد العمل">قيد العمل</option>
                    <option value="قيد التنفيذ">قيد التنفيذ</option>
                    <option value="مكتملة">مكتملة</option>
                    <option value="متأخرة">متأخرة</option>
                  </select>
                </div>

                <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="reply_content" style={{ fontSize: '12px', marginBottom: '3px' }}>
                    التحديث <span className="required-asterisk">*</span>
                  </label>
                  <textarea
                    className="reminder-form-textarea"
                    id="reply_content"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows="3"
                    placeholder="أضف تحديثك هنا..."
                    required
                    style={{ padding: '6px 10px', fontSize: '13px', minHeight: '70px', maxHeight: '70px' }}
                  ></textarea>
                </div>

                <div className="reminder-button-container" style={{ marginTop: '6px', paddingTop: '10px' }}>
                  <button
                    type="button"
                    className="reminder-cancel-button"
                    onClick={() => {
                      setIsReplyModalOpen(false)
                      setReplyContent('')
                      setReplyStatus('قيد العمل')
                    }}
                    disabled={isSubmittingReply}
                    style={{ padding: '7px 16px', fontSize: '13px' }}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="reminder-add-button"
                    disabled={isSubmittingReply}
                    style={{
                      padding: '7px 16px',
                      fontSize: '13px',
                      pointerEvents: 'auto',
                      transition: 'none',
                      cursor: isSubmittingReply ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isSubmittingReply ? 'جاري الحفظ...' : 'حفظ التحديث'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && !isReplyModalOpen && !selectedTask.case_id && !selectedTask.task_case && (
        <div className="popup-overlay-reminder">
          <div className="reminder-popup-container" style={{ maxWidth: '700px' }}>
            <div className="reminder-popup-header">
              <div className="reminder-header-content">
                <div className="reminder-header-icon-wrapper">
                  <span className="reminder-header-icon">📋</span>
                </div>
                <h2>تفاصيل المهمة</h2>
              </div>
              <button
                type="button"
                className="reminder-close-btn-right"
                onClick={() => setSelectedTask(null)}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>
            <div className="reminder-popup-content" style={{ padding: '16px 20px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="task-detail-view">
                <div className="task-detail-section">
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '700' }}>
                    {selectedTask.task_title || 'مهمة بدون عنوان'}
                  </h3>

                  <div className="task-detail-info-grid">
                    <div className="task-detail-info-item">
                      <span className="task-detail-label">الحالة:</span>
                      <span className={`task-status-badge-modern ${getStatusClass(selectedTask.task_status)}`}>
                        {getStatusLabel(selectedTask.task_status)}
                      </span>
                    </div>

                    <div className="task-detail-info-item">
                      <span className="task-detail-label">الأولوية:</span>
                      <span
                        className="task-priority-badge-modern"
                        style={{ backgroundColor: getPriorityColor(selectedTask.task_priority) + '20', color: getPriorityColor(selectedTask.task_priority) }}
                      >
                        {selectedTask.task_priority || 'متوسطة'}
                      </span>
                    </div>

                    {selectedTask.task_type && (
                      <div className="task-detail-info-item">
                        <span className="task-detail-label">النوع:</span>
                        <span>{selectedTask.task_type}</span>
                      </div>
                    )}

                    {selectedTask.task_deadline && (
                      <div className="task-detail-info-item">
                        <span className="task-detail-label">الموعد النهائي:</span>
                        <span className={isTaskOverdue(selectedTask) ? 'overdue-text' : ''}>
                          {new Date(selectedTask.task_deadline).toLocaleDateString('ar-EG', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                          {isTaskOverdue(selectedTask) && <span style={{ color: '#EF4444', marginRight: '4px' }}>(متأخرة)</span>}
                        </span>
                      </div>
                    )}

                    {selectedTask.lawyer_related && (
                      <div className="task-detail-info-item">
                        <span className="task-detail-label">مُكلفة إلى:</span>
                        <span>{selectedTask.lawyer_related}</span>
                      </div>
                    )}

                    {selectedTask.created_by_username && (
                      <div className="task-detail-info-item">
                        <span className="task-detail-label">أنشأها:</span>
                        <span>{selectedTask.created_by_username}</span>
                      </div>
                    )}

                    {selectedTask.created_at && (
                      <div className="task-detail-info-item">
                        <span className="task-detail-label">تاريخ الإنشاء:</span>
                        <span>
                          {new Date(selectedTask.created_at).toLocaleDateString('ar-EG', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedTask.task_details && (
                    <div className="task-detail-section">
                      <h4 style={{ margin: '16px 0 8px 0', fontSize: '14px', fontWeight: '700' }}>التفاصيل:</h4>
                      <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#475569' }}>
                        {selectedTask.task_details}
                      </p>
                    </div>
                  )}

                  {selectedTask.replies && selectedTask.replies.length > 0 && (
                    <div className="task-detail-section">
                      <h4 style={{ margin: '16px 0 12px 0', fontSize: '14px', fontWeight: '700' }}>التحديثات:</h4>
                      <div className="task-replies-list">
                        {selectedTask.replies.map((reply, idx) => (
                          <div key={idx} className="task-reply-item">
                            <div className="task-reply-header">
                              <span className="task-reply-author">{reply.reply_by || 'مستخدم'}</span>
                              <span className="task-reply-date">
                                {new Date(reply.created_at).toLocaleDateString('ar-EG', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {reply.reply_status && (
                              <div className="task-reply-status">
                                <span className={`task-status-badge-modern ${getStatusClass(reply.reply_status)}`}>
                                  {getStatusLabel(reply.reply_status)}
                                </span>
                              </div>
                            )}
                            <div className="task-reply-content">{reply.reply_content}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="task-detail-actions" style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                    <button
                      className="task-reply-btn-modern"
                      onClick={() => {
                        setReplyStatus(selectedTask.task_status || 'قيد العمل')
                        setIsReplyModalOpen(true)
                      }}
                      disabled={isReadOnly || subLoading}
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        opacity: isReadOnly || subLoading ? 0.5 : 1,
                        cursor: isReadOnly || subLoading ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <FaPlus size={14} />
                      <span>إضافة تحديث</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .tasks-page-container {
          width: 100%;
          padding: 20px 24px;
          direction: rtl;
          font-family: 'Cairo', sans-serif;
          background: #F1F5F9;
          min-height: auto;
        }

        /* Header Section */
        .tasks-page-header-modern {
          background: #ffffff;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .tasks-header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }

        .tasks-title-wrapper {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .tasks-icon-wrapper {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }

        .tasks-page-title-modern {
          font-size: 28px;
          font-weight: 700;
          color: #1E293B;
          margin: 0 0 4px 0;
          line-height: 1.2;
        }

        .tasks-page-subtitle {
          font-size: 14px;
          color: #64748B;
          margin: 0;
          font-weight: 500;
        }

        .tasks-add-btn-modern {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Cairo', sans-serif;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
        }

        .tasks-add-btn-modern:hover {
          background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        /* Filters Section - Single Row */
        .tasks-filters-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #E2E8F0;
        }

        .tasks-search-modern {
          position: relative;
          flex: 1;
          min-width: 280px;
          max-width: 400px;
          display: flex;
          align-items: center;
        }

        .tasks-search-icon-modern {
          position: absolute;
          right: 16px;
          color: #64748B;
          font-size: 16px;
          z-index: 1;
        }

        .tasks-search-input-modern {
          width: 100%;
          padding: 12px 48px 12px 16px;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          font-size: 14px;
          font-family: 'Cairo', sans-serif;
          direction: rtl;
          background: #ffffff;
          transition: all 0.2s ease;
        }

        .tasks-search-input-modern:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .tasks-search-clear-modern {
          position: absolute;
          left: 16px;
          background: #F1F5F9;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748B;
          transition: all 0.2s ease;
          z-index: 1;
        }

        .tasks-search-clear-modern:hover {
          background: #E2E8F0;
          color: #1E293B;
        }

        .tasks-filter-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: nowrap;
          flex-shrink: 0;
        }

        .tasks-filter-btn {
          padding: 10px 16px;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Cairo', sans-serif;
          background: #ffffff;
          color: #64748B;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .tasks-filter-btn:hover {
          border-color: #2563EB;
          color: #2563EB;
          background: #EFF6FF;
        }

        .tasks-filter-btn.active {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: #ffffff;
          border-color: #2563EB;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
        }

        .tasks-filter-selects {
          display: flex;
          gap: 8px;
          flex-wrap: nowrap;
          flex-shrink: 0;
        }

        .tasks-filter-select-modern {
          padding: 10px 14px;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Cairo', sans-serif;
          background: #ffffff;
          color: #1E293B;
          cursor: pointer;
          direction: rtl;
          transition: all 0.2s ease;
          min-width: 140px;
          white-space: nowrap;
        }

        .tasks-filter-select-modern:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .tasks-content {
          width: 100%;
        }

        /* Content Section */
        .tasks-content {
          width: 100%;
        }

        .tasks-loading {
          text-align: center;
          padding: 60px 20px;
          background: #ffffff;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          color: #64748B;
          font-size: 16px;
          font-weight: 600;
        }

        .tasks-empty {
          text-align: center;
          padding: 60px 20px;
          background: #ffffff;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .tasks-empty-icon {
          color: #CBD5E1;
          margin-bottom: 16px;
        }

        .tasks-empty-text {
          color: #64748B;
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }

        /* Tasks Table Layout */
        .tasks-table-container {
          background: #ffffff;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .tasks-table-header {
          display: grid;
          grid-template-columns: 2fr 120px 100px 120px 140px 120px 100px 140px;
          gap: 12px;
          padding: 16px 20px;
          background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
          border-bottom: 2px solid #E2E8F0;
          font-weight: 700;
          font-size: 13px;
          color: #1E293B;
        }

        .tasks-table-body {
          display: flex;
          flex-direction: column;
        }

        .tasks-table-row {
          display: grid;
          grid-template-columns: 2fr 120px 100px 120px 140px 120px 100px 140px;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid #F1F5F9;
          cursor: pointer;
          transition: all 0.2s ease;
          align-items: center;
        }

        .tasks-table-row:hover {
          background: #F8FAFC;
        }

        .tasks-table-row.task-completed {
          opacity: 0.7;
          background: #FAFBFC;
        }

        .tasks-table-row.task-overdue {
          border-right: 3px solid #EF4444;
        }

        .tasks-table-col {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .task-mobile-label {
          display: none;
          font-size: 13px;
          font-weight: 800;
          color: #1E293B;
          margin-left: 8px;
        }

        .task-row-title-wrapper {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .task-row-title {
          font-size: 15px;
          font-weight: 700;
          color: #1E293B;
          margin: 0;
          line-height: 1.4;
        }

        .task-row-details {
          font-size: 13px;
          color: #64748B;
          margin: 0;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .task-row-replies {
          font-size: 11px;
          color: #2563EB;
          font-weight: 600;
          padding: 2px 8px;
          background: #EFF6FF;
          border-radius: 6px;
          display: inline-block;
          width: fit-content;
        }

        .task-type-text {
          font-size: 13px;
          color: #1E293B;
          font-weight: 500;
        }

        .task-deadline-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #1E293B;
        }

        .task-deadline-wrapper svg {
          color: #1E293B;
          flex-shrink: 0;
        }

        .no-deadline {
          color: #1E293B;
          font-size: 12px;
        }

        .task-assigned-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #1E293B;
        }

        .task-assigned-wrapper svg {
          color: #1E293B;
          flex-shrink: 0;
        }

        .no-assigned,
        .no-case {
          color: #1E293B;
          font-size: 12px;
        }

        /* Task Badges (used in table) */
        .task-case-badge-modern {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          background: linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%);
          color: #0369A1;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid #7DD3FC;
        }

        .task-general-badge-modern {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          background: linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%);
          color: #475569;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid #D1D5DB;
        }

        .task-status-badge-modern {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .task-status-badge-modern.completed {
          background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%);
          color: #059669;
          border: 1px solid #34D399;
        }

        .task-status-badge-modern.in-progress {
          background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%);
          color: #2563EB;
          border: 1px solid #60A5FA;
        }

        .task-status-badge-modern.overdue {
          background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%);
          color: #DC2626;
          border: 1px solid #F87171;
        }

        .task-status-badge-modern.pending {
          background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
          color: #D97706;
          border: 1px solid #FCD34D;
        }

        .task-priority-badge-modern {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid transparent;
        }

        .overdue-icon {
          color: #EF4444;
          margin-right: 4px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .task-created-date-modern {
          font-size: 11px;
          color: #94A3B8;
          font-weight: 500;
        }

        .task-reply-btn-modern {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%);
          border: 1.5px solid #E2E8F0;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          color: #2563EB;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Cairo', sans-serif;
        }

        .task-reply-btn-modern:hover {
          background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
          border-color: #2563EB;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
        }

        .task-detail-view {
          width: 100%;
        }

        .task-detail-section {
          margin-bottom: 20px;
        }

        .task-detail-info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 12px;
        }

        .task-detail-info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .task-detail-label {
          font-size: 12px;
          font-weight: 600;
          color: #64748B;
        }

        .overdue-text {
          color: #EF4444;
          font-weight: 600;
        }

        .task-replies-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .task-reply-item {
          padding: 12px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
        }

        .task-reply-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .task-reply-author {
          font-size: 13px;
          font-weight: 600;
          color: #1E293B;
        }

        .task-reply-date {
          font-size: 11px;
          color: #94A3B8;
        }

        .task-reply-status {
          margin-bottom: 8px;
        }

        .task-reply-content {
          font-size: 13px;
          color: #475569;
          line-height: 1.6;
        }

        .task-detail-actions {
          display: flex;
          gap: 12px;
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

        /* Responsive Design */
        @media (max-width: 1400px) {
          .tasks-table-header,
          .tasks-table-row {
            grid-template-columns: 2fr 100px 90px 100px 130px 110px 90px 130px;
            gap: 10px;
            padding: 14px 16px;
          }
        }

        @media (max-width: 1024px) {
          .tasks-table-header,
          .tasks-table-row {
            grid-template-columns: 2fr 90px 80px 90px 120px 100px 80px 120px;
            gap: 8px;
            padding: 12px 14px;
            font-size: 12px;
          }

          .task-row-title {
            font-size: 14px;
          }

          .task-row-details {
            font-size: 12px;
          }

          .tasks-filters-row {
            flex-wrap: wrap;
          }

          .tasks-search-modern {
            min-width: 100%;
            max-width: 100%;
          }
        }

        @media (max-width: 768px) {
          .tasks-page-container {
            padding: calc(12px + env(safe-area-inset-top, 0px)) 12px calc(12px + env(safe-area-inset-bottom, 0px));
            min-height: 100vh;
          }

          .tasks-page-header-modern {
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 16px;
          }

          .tasks-header-top {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }

          .tasks-title-wrapper {
            gap: 12px;
          }

          .tasks-icon-wrapper {
            width: 40px;
            height: 40px;
          }

          .tasks-icon-wrapper svg {
            width: 20px;
            height: 20px;
          }

          .tasks-page-title-modern {
            font-size: 22px;
            margin-bottom: 2px;
          }

          .tasks-page-subtitle {
            font-size: 13px;
          }

          .tasks-add-btn-modern {
            width: 100%;
            justify-content: center;
            padding: 12px 20px;
            font-size: 14px;
          }

          .tasks-filters-row {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
            margin-top: 12px;
            padding-top: 12px;
          }

          .tasks-search-modern {
            min-width: 100%;
            max-width: 100%;
          }

          .tasks-search-input-modern {
            padding: 12px 42px 12px 14px;
            font-size: 14px;
          }

          .tasks-filter-buttons {
            width: 100%;
            flex-wrap: wrap;
            gap: 8px;
            justify-content: flex-start;
          }

          .tasks-filter-btn {
            flex: 1;
            min-width: calc(50% - 4px);
            padding: 10px 12px;
            font-size: 13px;
          }

          .tasks-filter-selects {
            width: 100%;
            flex-direction: column;
            gap: 8px;
          }

          .tasks-filter-select-modern {
            width: 100%;
            min-width: 100%;
            padding: 10px 12px;
            font-size: 13px;
          }

          /* Card-based layout for mobile instead of table */
          .tasks-table-container {
            background: transparent;
            border: none;
            border-radius: 0;
            overflow: visible;
            box-shadow: none;
          }

          .tasks-table-header {
            display: none;
          }

          .tasks-table-body {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .tasks-table-row {
            display: flex;
            flex-direction: column;
            grid-template-columns: none;
            gap: 12px;
            padding: 16px;
            background: #ffffff;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            min-width: 100%;
            align-items: flex-start;
          }

          .tasks-table-row:hover {
            background: #ffffff;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          }

          .tasks-table-col {
            width: 100%;
            justify-content: flex-start;
            flex-direction: row;
            align-items: center;
            gap: 4px;
          }

          .task-mobile-label {
            display: block;
          }

          .tasks-col-title {
            order: 1;
          }

          .tasks-col-status {
            order: 2;
          }

          .tasks-col-priority {
            order: 3;
          }

          .tasks-col-deadline {
            order: 4;
          }

          .tasks-col-assigned {
            order: 5;
          }

          .tasks-col-type {
            order: 6;
          }

          .tasks-col-case {
            order: 7;
          }

          .tasks-col-actions {
            order: 8;
            justify-content: flex-end;
            margin-top: 8px;
            padding-top: 12px;
            border-top: 1px solid #F1F5F9;
          }

          .task-row-title {
            font-size: 16px;
          }

          .task-row-details {
            font-size: 13px;
          }

          .task-detail-info-grid {
            grid-template-columns: 1fr;
          }

          .tasks-loading,
          .tasks-empty {
            padding: 40px 20px;
            border-radius: 12px;
          }

          .tasks-empty-icon {
            width: 48px;
            height: 48px;
          }

          /* Toast notification mobile */
          .toast-notification {
            top: calc(20px + env(safe-area-inset-top, 0px));
          }

          .toast-content {
            min-width: auto;
            max-width: calc(100vw - 40px);
            padding: 12px 16px;
            font-size: 13px;
          }
        }

        @media (max-width: 640px) {
          .tasks-page-container {
            padding: calc(10px + env(safe-area-inset-top, 0px)) 10px calc(10px + env(safe-area-inset-bottom, 0px));
          }

          .tasks-page-header-modern {
            padding: 14px;
          }

          .tasks-page-title-modern {
            font-size: 20px;
          }

          .tasks-page-subtitle {
            font-size: 12px;
          }

          .tasks-icon-wrapper {
            width: 36px;
            height: 36px;
          }

          .tasks-icon-wrapper svg {
            width: 18px;
            height: 18px;
          }

          .tasks-add-btn-modern {
            padding: 10px 16px;
            font-size: 13px;
          }

          .tasks-search-input-modern {
            padding: 10px 38px 10px 12px;
            font-size: 13px;
          }

          .tasks-filter-btn {
            padding: 8px 10px;
            font-size: 12px;
          }

          .tasks-filter-select-modern {
            padding: 8px 10px;
            font-size: 12px;
          }

          .tasks-table-row {
            padding: 14px;
            gap: 10px;
          }

          .task-row-title {
            font-size: 15px;
          }

          .task-row-details {
            font-size: 12px;
          }

          .task-reply-btn-modern {
            padding: 8px 12px;
            font-size: 11px;
          }
        }

        @media (max-width: 480px) {
          .tasks-page-container {
            padding: calc(8px + env(safe-area-inset-top, 0px)) 8px calc(8px + env(safe-area-inset-bottom, 0px));
          }

          .tasks-page-header-modern {
            padding: 12px;
            border-radius: 10px;
          }

          .tasks-title-wrapper {
            gap: 10px;
          }

          .tasks-icon-wrapper {
            width: 32px;
            height: 32px;
          }

          .tasks-icon-wrapper svg {
            width: 16px;
            height: 16px;
          }

          .tasks-page-title-modern {
            font-size: 18px;
          }

          .tasks-page-subtitle {
            font-size: 11px;
          }

          .tasks-add-btn-modern {
            padding: 10px 14px;
            font-size: 12px;
          }

          .tasks-filters-row {
            gap: 10px;
            margin-top: 10px;
            padding-top: 10px;
          }

          .tasks-search-input-modern {
            padding: 10px 36px 10px 12px;
            font-size: 13px;
            border-radius: 8px;
          }

          .tasks-filter-btn {
            padding: 8px 10px;
            font-size: 12px;
            border-radius: 8px;
            min-width: calc(50% - 4px);
          }

          .tasks-filter-select-modern {
            padding: 8px 10px;
            font-size: 12px;
            border-radius: 8px;
          }

          .tasks-table-row {
            padding: 12px;
            gap: 8px;
            border-radius: 10px;
          }

          .task-row-title {
            font-size: 14px;
          }

          .task-row-details {
            font-size: 12px;
            -webkit-line-clamp: 3;
          }

          .task-status-badge-modern,
          .task-priority-badge-modern {
            padding: 5px 10px;
            font-size: 11px;
          }

          .task-reply-btn-modern {
            padding: 8px 10px;
            font-size: 11px;
          }

          .toast-content {
            padding: 10px 14px;
            font-size: 12px;
          }
        }
      `}</style>

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
    </Layout>
  )
}

