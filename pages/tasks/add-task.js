"use client"

import { useEffect, useMemo, useState } from "react"
import Head from "next/head"
import { useRouter } from "next/router"
import Layout from "../../components/layout/Layout"
import { supabase } from "../../lib/initSupabase"
import { FaArrowLeft, FaCheckCircle, FaFileAlt } from "react-icons/fa"

import withAuth from '../../lib/withAuth';

function AddTaskPage() {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [userId, setUserId] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminId, setAdminId] = useState(null)
  const [lawyerId, setLawyerId] = useState(null)
  const [creatorUsername, setCreatorUsername] = useState("")

  const [cases, setCases] = useState([])
  const [caseSearch, setCaseSearch] = useState("")
  const [linkToCase, setLinkToCase] = useState(false)
  const [selectedCaseId, setSelectedCaseId] = useState("")

  const [form, setForm] = useState({
    task_title: "",
    task_details: "",
    task_deadline: "",
    task_priority: "medium",
  })

  useEffect(() => {
    setIsClient(true)
    const u = supabase.auth.user()
    if (!u) return
    setUserId(u.id)
  }, [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function init() {
      setLoading(true)
      try {
        // Determine role + related IDs
        const { data: metaRows, error: metaErr } = await supabase
          .from("user_metadata")
          .select("admin_user_id, new_lawyer_id, user_id, username")
          .or(`new_lawyer_id.eq.${userId},admin_user_id.eq.${userId},user_id.eq.${userId}`)

        if (metaErr) throw metaErr

        const isAdminUser = (metaRows || []).some((m) => m.admin_user_id === userId)
        setIsAdmin(isAdminUser)

        // Pick a username if present
        const meRow =
          (metaRows || []).find((m) => m.user_id === userId) ||
          (metaRows || []).find((m) => m.new_lawyer_id === userId) ||
          (metaRows || []).find((m) => m.admin_user_id === userId) ||
          null
        setCreatorUsername(meRow?.username || supabase.auth.user()?.email || "مستخدم")

        // Compute admin_id / lawyer_id for insertion
        if (isAdminUser) {
          setAdminId(userId)
          setLawyerId(null)
        } else {
          const myLawyerRow = (metaRows || []).find((m) => m.new_lawyer_id === userId) || null
          setAdminId(myLawyerRow?.admin_user_id || null)
          setLawyerId(userId)
        }

        // Build list of visible cases
        let visibleCases = []
        if (isAdminUser) {
          const lawyerIds = (metaRows || [])
            .filter((m) => m.admin_user_id === userId)
            .map((m) => m.new_lawyer_id)
            .filter(Boolean)

          let q = supabase.from("cases").select("id, case_number, client_name")
          if (lawyerIds.length > 0) {
            q = q.or(
              `admin_id.eq.${userId},lawyer_id.in.(${lawyerIds.join(",")},${userId}),caseLawyerId.in.(${lawyerIds.join(",")},${userId})`
            )
          } else {
            q = q.or(`admin_id.eq.${userId},lawyer_id.eq.${userId},caseLawyerId.eq.${userId}`)
          }
          const { data, error } = await q.order("id", { ascending: false }).limit(500)
          if (error) throw error
          visibleCases = data || []
        } else {
          const { data, error } = await supabase
            .from("cases")
            .select("id, case_number, client_name")
            .or(`lawyer_id.eq.${userId},caseLawyerId.eq.${userId}`)
            .order("id", { ascending: false })
            .limit(500)
          if (error) throw error
          visibleCases = data || []
        }

        if (!cancelled) {
          setCases(visibleCases)
        }
      } catch (e) {
        console.error("AddTask init error:", e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [userId])

  const filteredCases = useMemo(() => {
    const q = (caseSearch || "").trim()
    if (!q) return cases
    const lower = q.toLowerCase()
    return cases.filter((c) => {
      const cn = (c.case_number || "").toString().toLowerCase()
      const client = (c.client_name || "").toString().toLowerCase()
      return cn.includes(lower) || client.includes(lower)
    })
  }, [cases, caseSearch])

  const selectedCase = useMemo(() => {
    if (!selectedCaseId) return null
    return cases.find((c) => String(c.id) === String(selectedCaseId)) || null
  }, [cases, selectedCaseId])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.task_title.trim()) return
    if (saving) return

    setSaving(true)
    try {
      const currentDate = new Date().toISOString().split("T")[0]

      const taskDataToInsert = {
        task_title: form.task_title.trim(),
        task_details: (form.task_details || "").trim(),
        task_deadline: form.task_deadline ? form.task_deadline : null,
        task_priority: form.task_priority,
        task_status: "pending",
        task_type: linkToCase ? "case" : "general",
        task_date: currentDate,
        created_by_username: creatorUsername || supabase.auth.user()?.email || "مستخدم",
        admin_id: adminId || null,
        lawyer_id: lawyerId || null,
        case_id: linkToCase && selectedCase ? selectedCase.id : null,
        task_case: linkToCase && selectedCase ? selectedCase.case_number : null,
      }

      const { data: inserted, error: insertError } = await supabase.from("tasks").insert([taskDataToInsert]).select()
      if (insertError) throw insertError

      // Try to create notifications like CaseDetailsPage does (best-effort)
      try {
        const notificationUserIds = []
        if (taskDataToInsert.admin_id) {
          const { data: adminMeta } = await supabase
            .from("user_metadata")
            .select("user_id")
            .eq("admin_user_id", taskDataToInsert.admin_id)
            .is("new_lawyer_id", null)
            .limit(1)
            .maybeSingle()
          notificationUserIds.push(adminMeta?.user_id || taskDataToInsert.admin_id)
        }
        if (taskDataToInsert.lawyer_id) {
          const { data: lawyerMeta } = await supabase
            .from("user_metadata")
            .select("user_id")
            .eq("new_lawyer_id", taskDataToInsert.lawyer_id)
            .limit(1)
            .maybeSingle()
          notificationUserIds.push(lawyerMeta?.user_id || taskDataToInsert.lawyer_id)
        }
        const uniqueUserIds = [...new Set(notificationUserIds)].filter(Boolean)
        if (uniqueUserIds.length > 0 && inserted && inserted.length > 0) {
          const { createNotificationsForUsers } = await import("../../lib/notifications")
          const deadlineLabel = taskDataToInsert.task_deadline
            ? new Date(taskDataToInsert.task_deadline).toLocaleDateString("ar-EG")
            : "غير محدد"
          await createNotificationsForUsers(uniqueUserIds, {
            title: "لديك مهمة جديدة",
            message: `${taskDataToInsert.task_title} - موعد: ${deadlineLabel}`,
            notification_type: "task",
            icon_type: "bell",
            related_entity_type: "task",
            related_entity_id: String(inserted[0].id),
            case_number: taskDataToInsert.task_case || null,
            metadata: {
              task_title: taskDataToInsert.task_title,
              task_deadline: taskDataToInsert.task_deadline,
              task_priority: taskDataToInsert.task_priority,
              task_type: taskDataToInsert.task_type,
            },
          })
        }
      } catch (notifErr) {
        console.warn("Task notification creation failed (non-blocking):", notifErr)
      }

      router.push("/dashboard")
    } catch (err) {
      console.error("Create task error:", err)
      alert(`تعذر إنشاء المهمة: ${err?.message || err}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <Head>
        <title>إضافة مهمة جديدة</title>
      </Head>

      <div className="task-page">
        <div className="task-page-header">
          <button className="back-btn" type="button" onClick={() => router.back()}>
            <FaArrowLeft />
            رجوع
          </button>
          <h1 className="task-page-title">إضافة مهمة جديدة</h1>
        </div>

        <div className="task-card">
          {loading ? (
            <div className="task-loading">جاري التحميل...</div>
          ) : (
            <form onSubmit={onSubmit} className="task-form">
              <div className="form-row">
                <label className="label">عنوان المهمة *</label>
                <input
                  className="input"
                  value={form.task_title}
                  onChange={(e) => setForm((p) => ({ ...p, task_title: e.target.value }))}
                  placeholder="مثال: متابعة جلسة / الاتصال بالموكل"
                  required
                />
              </div>

              <div className="form-row">
                <label className="label">تفاصيل</label>
                <textarea
                  className="textarea"
                  value={form.task_details}
                  onChange={(e) => setForm((p) => ({ ...p, task_details: e.target.value }))}
                  placeholder="اكتب تفاصيل المهمة..."
                  rows={4}
                />
              </div>

              <div className="form-grid">
                <div className="form-row">
                  <label className="label">الموعد</label>
                  <input
                    className="input"
                    type="date"
                    value={form.task_deadline}
                    onChange={(e) => setForm((p) => ({ ...p, task_deadline: e.target.value }))}
                  />
                </div>

                <div className="form-row">
                  <label className="label">الأولوية</label>
                  <select
                    className="input"
                    value={form.task_priority}
                    onChange={(e) => setForm((p) => ({ ...p, task_priority: e.target.value }))}
                  >
                    <option value="low">منخفضة</option>
                    <option value="medium">متوسطة</option>
                    <option value="high">عالية</option>
                  </select>
                </div>
              </div>

              <div className="link-row">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={linkToCase}
                    onChange={(e) => {
                      setLinkToCase(e.target.checked)
                      if (!e.target.checked) setSelectedCaseId("")
                    }}
                  />
                  ربط المهمة بقضية (اختياري)
                </label>
              </div>

              {linkToCase && (
                <div className="case-picker">
                  <div className="form-row">
                    <label className="label">بحث عن قضية</label>
                    <input
                      className="input"
                      value={caseSearch}
                      onChange={(e) => setCaseSearch(e.target.value)}
                      placeholder="ابحث برقم الدعوى أو اسم الموكل..."
                    />
                  </div>

                  <div className="form-row">
                    <label className="label">اختر القضية</label>
                    <select
                      className="input"
                      value={selectedCaseId}
                      onChange={(e) => setSelectedCaseId(e.target.value)}
                      required
                    >
                      <option value="">— اختر —</option>
                      {filteredCases.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.case_number || "—"} {c.client_name ? `- ${c.client_name}` : ""}
                        </option>
                      ))}
                    </select>
                    {selectedCase && (
                      <div className="case-hint">
                        <FaFileAlt /> تم اختيار: <b>{selectedCase.case_number}</b>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="actions">
                <button className="primary-btn" type="submit" disabled={saving}>
                  <FaCheckCircle />
                  {saving ? "جارٍ الحفظ..." : "حفظ المهمة"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <style jsx>{`
        .task-page {
          width: 100%;
          direction: rtl;
          font-family: 'Cairo', 'Almarai', sans-serif;
          color: #1e293b;
        }
        .task-page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }
        .task-page-title {
          font-size: 18px;
          font-weight: 800;
          margin: 0;
        }
        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #334155;
          cursor: pointer;
        }
        .back-btn:hover {
          background: #f8fafc;
        }
        .task-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .task-loading {
          padding: 20px;
          color: #64748b;
        }
        .task-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .form-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .label {
          font-size: 12px;
          font-weight: 700;
          color: #475569;
        }
        .input,
        .textarea {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 12px;
          font-family: inherit;
          font-size: 14px;
          outline: none;
          background: #fff;
        }
        .textarea {
          resize: vertical;
        }
        .input:focus,
        .textarea:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
        .link-row {
          display: flex;
          align-items: center;
          justify-content: flex-start;
        }
        .checkbox {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #334155;
          font-weight: 600;
        }
        .case-picker {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 12px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .case-hint {
          margin-top: 8px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #475569;
        }
        .actions {
          display: flex;
          justify-content: flex-start;
          margin-top: 4px;
        }
        .primary-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          background: #2563eb;
          color: #fff;
          font-weight: 800;
          font-size: 14px;
        }
        .primary-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Layout>
  )
}

export default withAuth(AddTaskPage, [], true);
