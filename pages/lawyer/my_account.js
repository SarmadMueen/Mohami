import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/initSupabase";
import withAuth from "../../lib/withAuth";
import Layout from "../../components/layout/Layout";
import { Shield, PenTool, Link as LinkIcon, Mail, User, Clock, FileText, Calendar, AlertCircle, CheckCircle, Eye, Scale, RefreshCw, StickyNote, FileCheck, Users } from "lucide-react";

const MyAccount = () => {
  const [userData, setUserData] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [cases, setCases] = useState([]);
  const [sessionsData, setSessionsData] = useState([]);
  const [updatesData, setUpdatesData] = useState([]); // for "التحديثات"
  const [notesData, setNotesData] = useState([]); // for "الملاحظات"
  const [actionsData, setActionsData] = useState([]); // for "الإجراءات"
  const [contractsData, setContractsData] = useState([]); // for "العقود"
  const [agenciesData, setAgenciesData] = useState([]); // for "الوكالات"
  const [clientsData, setClientsData] = useState([]); // for "الموكلين"
  const [tasksData, setTasksData] = useState([]); // for "المهام الوظيفية"
  const [adminId, setAdminId] = useState(null); // To help with fetching
  const [lawyerId, setLawyerId] = useState(null); // Lawyer ID for filtering
  const [lawyerIds, setLawyerIds] = useState([]); // All lawyer IDs under admin

  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [activeTab, setActiveTab] = useState("القضايا");
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState(null);

  // List of tab titles with icons
  const tabs = [
    { id: "القضايا", label: "القضايا", icon: FileText },
    { id: "الجلسات", label: "الجلسات", icon: Calendar },
    { id: "التحديثات", label: "التحديثات", icon: RefreshCw },
    { id: "الملاحظات", label: "الملاحظات", icon: StickyNote },
    { id: "الإجراءات", label: "الإجراءات", icon: Scale },
    { id: "العقود", label: "العقود", icon: FileCheck },
    { id: "الوكالات", label: "الوكالات", icon: LinkIcon },
    { id: "الموكلين", label: "الموكلين", icon: Users }
  ];

  const translateRole = (role) => {
    if (role === "Admin") return "مسؤول";
    if (role === "Lawyer") return "محامي";
    return role;
  };

  // Fetch user metadata and role on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = supabase.auth.user();
        if (!user) throw new Error("المستخدم غير مسجّل الدخول");
        const currentUserId = user.id;
        setUserId(currentUserId);

        // Try to find user_metadata by admin_user_id, new_lawyer_id, or user_id
        const selectFields = "role, username, email, arabic_name, admin_user_id, new_lawyer_id, user_id, job_title, phone_number, office_name_ar, office_name_en, office_address_ar, office_address_en, office_email";
        let { data: allMatches, error } = await supabase
          .from("user_metadata")
          .select(selectFields)
          .or(`admin_user_id.eq.${currentUserId},new_lawyer_id.eq.${currentUserId},user_id.eq.${currentUserId}`);

        // Pick the user's OWN row from multiple matches
        let data = null;
        if (!error && allMatches && allMatches.length > 0) {
          const ownRow =
            allMatches.find(m => m.user_id === currentUserId) ||                         // exact user_id match
            allMatches.find(m => m.new_lawyer_id === currentUserId) ||                    // lawyer's own row
            allMatches.find(m => m.admin_user_id === currentUserId && !m.new_lawyer_id) || // admin's own row
            allMatches[0];
          data = [ownRow];
        }

        // If not found, try with user_id or email fallback
        if (error || !data || data.length === 0) {
          console.log('Not found by admin_user_id/new_lawyer_id, trying user_id');
          const { data: userIdData, error: userIdError } = await supabase
            .from("user_metadata")
            .select("role, username, email, arabic_name, admin_user_id, new_lawyer_id, user_id, job_title, phone_number, office_name_ar, office_name_en, office_address_ar, office_address_en, office_email")
            .eq("user_id", currentUserId)
            .single();

          if (!userIdError && userIdData) {
            data = [userIdData];
            error = null;
          } else {
            // If still not found, try with email
            console.log('Not found by user_id, trying email');
            const { data: emailData, error: emailError } = await supabase
              .from("user_metadata")
              .select("role, username, email, arabic_name, admin_user_id, new_lawyer_id, user_id, job_title, phone_number, office_name_ar, office_name_en, office_address_ar, office_address_en, office_email")
              .eq("email", user.email)
              .single();

            if (!emailError && emailData) {
              data = [emailData];
              error = null;
            }
          }
        }

        if (error || !data || data.length === 0) {
          throw new Error("لم يتم العثور على البيانات في user_metadata");
        }

        const metaData = data[0];
        const currentRole =
          metaData.admin_user_id === currentUserId
            ? "Admin"
            : metaData.new_lawyer_id === currentUserId
              ? "Lawyer"
              : metaData.user_id === currentUserId
                ? "Admin" // If user_id matches, treat as Admin
                : "Unknown";
        setUserRole(currentRole);
        setUserData({
          name: metaData.username || "",
          arabicName: metaData.arabic_name || "",
          email: metaData.email || "",
          lastSignIn: user.last_sign_in_at || "",
          jobTitle: metaData.job_title || "مدير مكتب محاماة",
          phoneNumber: metaData.phone_number || "",
          officeNameAr: metaData.office_name_ar || "",
          officeNameEn: metaData.office_name_en || "",
          officeAddressAr: metaData.office_address_ar || "",
          officeAddressEn: metaData.office_address_en || "",
          officeEmail: metaData.office_email || ""
        });
        setAdminId(metaData.admin_user_id); // Set admin ID
        setLawyerId(metaData.new_lawyer_id); // Set lawyer ID

        // If admin, fetch all lawyer IDs under this admin
        if (currentRole === "Admin" && metaData.admin_user_id) {
          const { data: allLawyers, error: lawyersError } = await supabase
            .from("user_metadata")
            .select("new_lawyer_id")
            .eq("admin_user_id", metaData.admin_user_id)
            .not("new_lawyer_id", "is", null);

          if (!lawyersError && allLawyers) {
            const ids = allLawyers.map(l => l.new_lawyer_id).filter(Boolean);
            setLawyerIds(ids);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setErrorMessage(`خطأ: ${error.message}`);
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Fetch cases when activeTab is "القضايا" and required data available
  useEffect(() => {
    const fetchCases = async () => {
      if (activeTab !== "القضايا" || !userId || !userRole) return;
      try {
        let allCases = [];
        if (userRole === "Admin") {
          // Admin: Show all cases created by admin OR assigned to any lawyer under this admin
          // Fetch cases created by admin
          const { data: adminCases, error: adminError } = await supabase
            .from("cases")
            .select("*")
            .eq("admin_id", userId);
          if (adminError) throw new Error(adminError.message);
          if (adminCases) allCases = [...allCases, ...adminCases];

          // Fetch cases assigned to lawyers under this admin
          if (lawyerIds.length > 0) {
            const { data: lawyerCases, error: lawyerError } = await supabase
              .from("cases")
              .select("*")
              .in("lawyer_id", lawyerIds);
            if (lawyerError) throw new Error(lawyerError.message);
            if (lawyerCases) allCases = [...allCases, ...lawyerCases];

            const { data: caseLawyerCases, error: caseLawyerError } = await supabase
              .from("cases")
              .select("*")
              .in("caseLawyerId", lawyerIds);
            if (caseLawyerError) throw new Error(caseLawyerError.message);
            if (caseLawyerCases) allCases = [...allCases, ...caseLawyerCases];
          }

          // Remove duplicates based on case_number or id
          const uniqueCases = Array.from(
            new Map(allCases.map(c => [c.id || c.case_number, c])).values()
          );
          setCases(uniqueCases);
        } else if (userRole === "Lawyer") {
          // Lawyer: Show cases created by lawyer OR assigned to lawyer by admin
          const { data: lawyerCases, error: lawyerError } = await supabase
            .from("cases")
            .select("*")
            .or(`lawyer_id.eq.${lawyerId},caseLawyerId.eq.${lawyerId}`);
          if (lawyerError) throw new Error(lawyerError.message);
          setCases(lawyerCases || []);
        }
      } catch (error) {
        setErrorMessage(error.message);
      }
    };

    fetchCases();
  }, [activeTab, userId, userRole, adminId, lawyerId, lawyerIds]);

  // Fetch sessions when activeTab is "الجلسات" and userId is available
  useEffect(() => {
    const fetchSessions = async () => {
      if (activeTab !== "الجلسات" || !userId || !userRole) return;
      try {
        let query;
        if (userRole === "Admin") {
          // Admin: Show sessions created by admin OR by any lawyer under this admin
          if (lawyerIds.length > 0) {
            const userIds = [...lawyerIds, userId];
            query = supabase
              .from("sessions")
              .select("sessiondate, sessionnumber, sessiondetails, sessiontime, next_session_req")
              .in("user_id", userIds);
          } else {
            query = supabase
              .from("sessions")
              .select("sessiondate, sessionnumber, sessiondetails, sessiontime, next_session_req")
              .eq("user_id", userId);
          }
        } else if (userRole === "Lawyer") {
          // Lawyer: Show sessions created by lawyer OR assigned to lawyer by admin
          query = supabase
            .from("sessions")
            .select("sessiondate, sessionnumber, sessiondetails, sessiontime, next_session_req")
            .or(`user_id.eq.${lawyerId},lawyer_id.eq.${lawyerId}`);
        }
        if (query) {
          const { data, error } = await query;
          if (error) throw new Error(error.message);
          setSessionsData(data || []);
        }
      } catch (error) {
        setErrorMessage(error.message);
      }
    };

    fetchSessions();
  }, [activeTab, userId, userRole, lawyerId, lawyerIds]);

  // Fetch updates from case_update table and merge with case_number_in_court from cases table
  useEffect(() => {
    const fetchUpdates = async () => {
      if (activeTab !== "التحديثات" || !userId || !userRole) return;
      try {
        let query;
        if (userRole === "Admin") {
          // Admin: Show updates created by admin OR by any lawyer under this admin
          if (lawyerIds.length > 0) {
            const userIds = [...lawyerIds, userId];
            query = supabase
              .from("case_update")
              .select("update_date, update_details, attachment_url, case_number")
              .in("user_id", userIds);
          } else {
            query = supabase
              .from("case_update")
              .select("update_date, update_details, attachment_url, case_number")
              .eq("user_id", userId);
          }
        } else if (userRole === "Lawyer") {
          // Lawyer: Show updates created by lawyer OR assigned to lawyer by admin
          query = supabase
            .from("case_update")
            .select("update_date, update_details, attachment_url, case_number")
            .eq("user_id", lawyerId);
        }

        if (!query) {
          setUpdatesData([]);
          return;
        }

        const { data: updates, error } = await query;
        if (error) throw new Error(error.message);
        if (!updates || updates.length === 0) {
          setUpdatesData([]);
          return;
        }

        // Get unique case numbers from updates
        const caseNumbers = Array.from(new Set(updates.map(upd => upd.case_number).filter(Boolean)));
        // Fetch matching cases data from cases table
        const { data: casesData, error: casesError } = await supabase
          .from("cases")
          .select("case_number, case_number_in_court")
          .in("case_number", caseNumbers);
        if (casesError) throw new Error(casesError.message);
        const casesLookup = {};
        (casesData || []).forEach(item => {
          casesLookup[item.case_number] = item.case_number_in_court;
        });
        const mergedUpdates = updates.map(upd => ({
          ...upd,
          case_number_in_court: casesLookup[upd.case_number] || null
        }));
        setUpdatesData(mergedUpdates);
      } catch (error) {
        setErrorMessage(error.message);
      }
    };

    fetchUpdates();
  }, [activeTab, userId, userRole, lawyerId, lawyerIds]);

  // Fetch notes from notes table and merge with case_number_in_court from cases table
  useEffect(() => {
    const fetchNotes = async () => {
      if (activeTab !== "الملاحظات" || !userId || !userRole) return;
      try {
        let query;
        if (userRole === "Admin") {
          // Admin: Show notes created by admin OR by any lawyer under this admin
          if (lawyerIds.length > 0) {
            const userIds = [...lawyerIds, userId];
            query = supabase
              .from("notes")
              .select("note, created_at, case_number")
              .in("user_id", userIds);
          } else {
            query = supabase
              .from("notes")
              .select("note, created_at, case_number")
              .eq("user_id", userId);
          }
        } else if (userRole === "Lawyer") {
          // Lawyer: Show notes created by lawyer OR assigned to lawyer by admin
          query = supabase
            .from("notes")
            .select("note, created_at, case_number")
            .eq("user_id", lawyerId);
        }

        if (!query) {
          setNotesData([]);
          return;
        }

        const { data: notes, error } = await query;
        if (error) throw new Error(error.message);
        if (!notes || notes.length === 0) {
          setNotesData([]);
          return;
        }
        const caseNumbers = Array.from(new Set(notes.map(note => note.case_number).filter(Boolean)));
        const { data: casesData, error: casesError } = await supabase
          .from("cases")
          .select("case_number, case_number_in_court")
          .in("case_number", caseNumbers);
        if (casesError) throw new Error(casesError.message);
        const casesLookup = {};
        (casesData || []).forEach(item => {
          casesLookup[item.case_number] = item.case_number_in_court;
        });
        const mergedNotes = notes.map(note => ({
          ...note,
          case_number_in_court: casesLookup[note.case_number] || null
        }));
        setNotesData(mergedNotes);
      } catch (error) {
        setErrorMessage(error.message);
      }
    };

    fetchNotes();
  }, [activeTab, userId, userRole, lawyerId, lawyerIds]);

  // Fetch actions from actions table and merge with case_number_in_court from cases table
  useEffect(() => {
    const fetchActions = async () => {
      if (activeTab !== "الإجراءات" || !userId || !userRole) return;
      try {
        let query;
        if (userRole === "Admin") {
          // Admin: Show actions created by admin OR by any lawyer under this admin
          if (lawyerIds.length > 0) {
            const userIds = [...lawyerIds, userId];
            query = supabase
              .from("actions")
              .select("actiondate, actiontype, actionstatus, actiondetails, case_number, reminder")
              .in("user_id", userIds);
          } else {
            query = supabase
              .from("actions")
              .select("actiondate, actiontype, actionstatus, actiondetails, case_number, reminder")
              .eq("user_id", userId);
          }
        } else if (userRole === "Lawyer") {
          // Lawyer: Show actions created by lawyer OR assigned to lawyer by admin
          query = supabase
            .from("actions")
            .select("actiondate, actiontype, actionstatus, actiondetails, case_number, reminder")
            .eq("user_id", lawyerId);
        }

        if (!query) {
          setActionsData([]);
          return;
        }

        const { data: actions, error } = await query;
        if (error) throw new Error(error.message);
        if (!actions || actions.length === 0) {
          setActionsData([]);
          return;
        }
        // Extract unique case numbers from the actions table
        const caseNumbers = Array.from(new Set(actions.map(act => act.case_number).filter(Boolean)));
        // Fetch matching cases to retrieve case_number_in_court value
        const { data: casesData, error: casesError } = await supabase
          .from("cases")
          .select("case_number, case_number_in_court")
          .in("case_number", caseNumbers);
        if (casesError) throw new Error(casesError.message);

        const casesLookup = {};
        (casesData || []).forEach(item => {
          casesLookup[item.case_number] = item.case_number_in_court;
        });
        // Merge the actions data with case_number_in_court from the cases lookup
        const mergedActions = actions.map(action => ({
          ...action,
          case_number_in_court: casesLookup[action.case_number] || null
        }));
        setActionsData(mergedActions);
      } catch (error) {
        setErrorMessage(error.message);
      }
    };

    fetchActions();
  }, [activeTab, userId, userRole, adminId, lawyerId, lawyerIds]);

  // Fetch Contracts
  useEffect(() => {
    const fetchContracts = async () => {
      if (activeTab !== "العقود" || !adminId || !userRole) return;
      try {
        let query;
        if (userRole === "Admin") {
          // Admin: Show all contracts created by admin
          query = supabase
            .from("contract")
            .select("*")
            .eq("admin_id", adminId);
        } else if (userRole === "Lawyer") {
          // Lawyer: Show contracts created by admin (same admin_user_id) OR assigned to lawyer
          query = supabase
            .from("contract")
            .select("*")
            .eq("admin_id", adminId);
        }
        if (query) {
          const { data, error } = await query;
          if (error) throw new Error(error.message);
          setContractsData(data || []);
        }
      } catch (error) {
        setErrorMessage(error.message);
      }
    };
    fetchContracts();
  }, [activeTab, adminId, userRole]);

  // Fetch Agencies (Attorney)
  useEffect(() => {
    const fetchAgencies = async () => {
      if (activeTab !== "الوكالات" || !adminId || !userRole) return;
      try {
        let query;
        if (userRole === "Admin") {
          // Admin: Show all agencies created by admin
          query = supabase
            .from("attorney")
            .select("*")
            .eq("admin_id", adminId);
        } else if (userRole === "Lawyer") {
          // Lawyer: Show agencies created by admin (same admin_user_id) OR assigned to lawyer
          query = supabase
            .from("attorney")
            .select("*")
            .eq("admin_id", adminId);
        }
        if (query) {
          const { data, error } = await query;
          if (error) throw new Error(error.message);
          setAgenciesData(data || []);
        }
      } catch (error) {
        setErrorMessage(error.message);
      }
    };
    fetchAgencies();
  }, [activeTab, adminId, userRole]);

  // Fetch Clients
  useEffect(() => {
    const fetchClients = async () => {
      if (activeTab !== "الموكلين" || !adminId || !userRole) return;
      try {
        let query;
        if (userRole === "Admin") {
          // Admin: Show all clients created by admin
          query = supabase
            .from("clients_data")
            .select("*")
            .eq("admin_id", adminId);
        } else if (userRole === "Lawyer") {
          // Lawyer: Show clients created by admin (same admin_user_id) OR assigned to lawyer
          query = supabase
            .from("clients_data")
            .select("*")
            .eq("admin_id", adminId);
        }
        if (query) {
          const { data, error } = await query;
          if (error) throw new Error(error.message);
          setClientsData(data || []);
        }
      } catch (error) {
        setErrorMessage(error.message);
      }
    };
    fetchClients();
  }, [activeTab, adminId, userRole]);

  // Fetch Tasks (المهام الوظيفية)
  useEffect(() => {
    const fetchTasks = async () => {
      if (activeTab !== "المهام الوظيفية" || !userId || !userRole) return;
      try {
        let query;
        if (userRole === "Admin") {
          // Admin: Show all tasks created by admin OR assigned to any lawyer under this admin
          if (lawyerIds.length > 0) {
            query = supabase
              .from("tasks")
              .select("*")
              .or(`admin_id.eq.${userId},lawyer_id.in.(${lawyerIds.join(',')})`);
          } else {
            query = supabase
              .from("tasks")
              .select("*")
              .eq("admin_id", userId);
          }
        } else if (userRole === "Lawyer") {
          // Lawyer: Show tasks assigned to lawyer (by lawyer_id)
          query = supabase
            .from("tasks")
            .select("*")
            .eq("lawyer_id", lawyerId);
        }
        if (query) {
          const { data, error } = await query;
          if (error) throw new Error(error.message);
          setTasksData(data || []);
        }
      } catch (error) {
        setErrorMessage(error.message);
      }
    };
    fetchTasks();
  }, [activeTab, userId, userRole, adminId, lawyerId, lawyerIds]);

  const handlePasswordChange = async () => {
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('يرجى ملء جميع الحقول');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const user = supabase.auth.user();
      if (!user) {
        setPasswordError('لم يتم العثور على مستخدم مسجل دخول');
        setIsUpdatingPassword(false);
        return;
      }

      // Update password using Supabase
      const { error } = await supabase.auth.update({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      setSuccessMessage('تم تغيير كلمة المرور بنجاح');
      setErrorMessage(null);
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError(error.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!isDirty) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("user_metadata")
        .update({
          username: userData.name,
          arabic_name: userData.arabicName,
          phone_number: userData.phoneNumber,
          job_title: userData.jobTitle,
          office_name_ar: userData.officeNameAr,
          office_email: userData.officeEmail,
          office_address_ar: userData.officeAddressAr,
        })
        .eq("user_id", userId);

      if (error) throw error;

      // Update sessionStorage and dispatch event with new data
      if (typeof window !== 'undefined') {
        try {
          const displayName = userData.arabicName || userData.name;
          if (displayName) sessionStorage.setItem('cachedLawyerName', displayName);
          if (userData.jobTitle) sessionStorage.setItem('cachedJobTitle', userData.jobTitle);
          // Dispatch event with new data to update navbar state
          window.dispatchEvent(new CustomEvent('userProfileUpdated', {
            detail: {
              lawyerName: displayName,
              jobTitle: userData.jobTitle
            }
          }));
        } catch (e) {
          console.error('Error updating sessionStorage:', e);
        }
      }

      setIsDirty(false);
      setSuccessMessage("تمت مزامنة وحفظ جميع التغييرات بنجاح");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Update error:', err);
      setErrorMessage("حدث خطأ أثناء حفظ البيانات");
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (key, value) => {
    setUserData(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">جاري التحميل...</p>
        </div>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #f7f8fc;
            gap: 1.5rem;
          }
          .spinner {
            width: 60px;
            height: 60px;
            border: 5px solid #e5e7eb;
            border-top-color: #1e40af;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .loading-text {
            font-size: 1.125rem;
            font-weight: 500;
            color: #6b7280;
            font-family: 'Almarai', sans-serif;
          }
        `}</style>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-container">
        {/* Toast Messages (Fixed positioning to prevent layout shifts) */}
        <div className="toast-container">
          {errorMessage && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="alert alert-success">
              <CheckCircle size={20} />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Account Info Card */}
        <div className="content-grid">
          <div className="info-card-modern">
            <div className="info-card-header">
              <div className="info-card-header-left">
                <div className="info-card-avatar">
                  {userData?.arabicName ? userData.arabicName.charAt(0) : userData?.name ? userData.name.charAt(0).toUpperCase() : '؟'}
                </div>
                <div className="info-card-header-text">
                  <h2 className="info-card-title">{userData?.arabicName || userData?.name || 'معلومات الحساب'}</h2>
                  <span className="info-card-subtitle">{userData?.jobTitle || 'محامي'} • {userData?.officeNameAr || ''}</span>
                </div>
              </div>
              <div className="info-card-actions">
                <button
                  className="save-changes-btn"
                  onClick={handleSaveChanges}
                  disabled={isSaving || !isDirty}
                >
                  {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
                <button
                  className="password-change-btn-header"
                  onClick={() => setIsPasswordModalOpen(true)}
                >
                  <Shield size={16} />
                  <span>تغيير كلمة المرور</span>
                </button>
              </div>
            </div>
            <div className="info-card-body">
              <div className="info-section-label">المعلومات الشخصية</div>
              <div className="info-grid-modern">
                <div className="info-item-modern">
                  <div className="info-item-icon"><User size={16} /></div>
                  <div className="info-item-content">
                    <label className="info-item-label">اسم المستخدم (English)</label>
                    <input
                      className="info-input-modern"
                      value={userData?.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                    />
                  </div>
                </div>
                <div className="info-item-modern">
                  <div className="info-item-icon"><PenTool size={16} /></div>
                  <div className="info-item-content">
                    <label className="info-item-label">اسم المستخدم (العربية)</label>
                    <input
                      className="info-input-modern"
                      value={userData?.arabicName}
                      onChange={(e) => handleFieldChange('arabicName', e.target.value)}
                    />
                  </div>
                </div>
                <div className="info-item-modern">
                  <div className="info-item-icon"><Mail size={16} /></div>
                  <div className="info-item-content">
                    <label className="info-item-label">البريد الإلكتروني</label>
                    <div className="info-item-value-locked">{userData?.email || "غير متوفر"}</div>
                  </div>
                </div>
                <div className="info-item-modern">
                  <div className="info-item-icon"><LinkIcon size={16} /></div>
                  <div className="info-item-content">
                    <label className="info-item-label">رقم الهاتف</label>
                    <input
                      className="info-input-modern"
                      value={userData?.phoneNumber}
                      onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                    />
                  </div>
                </div>
                <div className="info-item-modern">
                  <div className="info-item-content">
                    <label className="info-item-label">المسمى الوظيفي</label>
                    <div className="info-item-value">
                      <select
                        className="info-select-modern"
                        value={userData?.jobTitle || "مدير مكتب محاماة"}
                        onChange={(e) => handleFieldChange('jobTitle', e.target.value)}
                      >
                        <option value="">اختر المسمى الوظيفي</option>
                        <option value="المستشار العام (م.ع.)">المستشار العام (م.ع.)</option>
                        <option value="رئيس الشؤون القانونية">رئيس الشؤون القانونية</option>
                        <option value="سكرتير قانوني">سكرتير قانوني</option>
                        <option value="مساعد قانوني أول">مساعد قانوني أول</option>
                        <option value="كاتب التسجيل">كاتب التسجيل</option>
                        <option value="محاسب">محاسب</option>
                        <option value="محامي">محامي</option>
                        <option value="محامي مشارك">محامي مشارك</option>
                        <option value="محامي مشارك أول">محامي مشارك أول</option>
                        <option value="محلل قانوني">محلل قانوني</option>
                        <option value="مدير الخدمات القانونية">مدير الخدمات القانونية</option>
                        <option value="مدير السجلات القانونية">مدير السجلات القانونية</option>
                        <option value="مدير العقود القانونية">مدير العقود القانونية</option>
                        <option value="مدير الموارد البشرية">مدير الموارد البشرية</option>
                        <option value="مدير تكنولوجيا المعلومات">مدير تكنولوجيا المعلومات</option>
                        <option value="مدير مكتب محاماة">مدير مكتب محاماة</option>
                        <option value="مساعد اداري">مساعد اداري</option>
                        <option value="مساعد قانوني">مساعد قانوني</option>
                        <option value="مستشار قانوني">مستشار قانوني</option>
                        <option value="نائب المستشار العام">نائب المستشار العام</option>
                        <option value="وسيط">وسيط</option>
                        <option value="مدير حسابات">مدير حسابات</option>
                        <option value="مدير إداري">مدير إداري</option>
                        <option value="مدير قانوني">مدير قانوني</option>
                        <option value="مدير قسم">مدير قسم</option>
                        <option value="مدير تنفيذي">مدير تنفيذي</option>
                        <option value="مساعد تنفيذي">مساعد تنفيذي</option>
                        <option value="أمين سر مجلس الإدارة">أمين سر مجلس الإدارة</option>
                        <option value="باحث قانوني">باحث قانوني</option>
                        <option value="أخرى">أخرى</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>
              <div className="info-section-label">معلومات المكتب</div>
              <div className="info-grid-modern">
                <div className="info-item-modern">
                  <div className="info-item-icon"><Scale size={16} /></div>
                  <div className="info-item-content">
                    <label className="info-item-label">اسم المكتب</label>
                    <input
                      className="info-input-modern"
                      value={userData?.officeNameAr}
                      onChange={(e) => handleFieldChange('officeNameAr', e.target.value)}
                    />
                  </div>
                </div>

                <div className="info-item-modern">
                  <div className="info-item-icon"><Mail size={16} /></div>
                  <div className="info-item-content">
                    <label className="info-item-label">بريد المكتب</label>
                    <input
                      className="info-input-modern"
                      value={userData?.officeEmail}
                      onChange={(e) => handleFieldChange('officeEmail', e.target.value)}
                    />
                  </div>
                </div>
                <div className="info-item-modern">
                  <div className="info-item-icon"><LinkIcon size={16} /></div>
                  <div className="info-item-content">
                    <label className="info-item-label">عنوان المكتب</label>
                    <input
                      className="info-input-modern"
                      value={userData?.officeAddressAr}
                      onChange={(e) => handleFieldChange('officeAddressAr', e.target.value)}
                    />
                  </div>
                </div>


                <div className="info-item-modern">
                  <div className="info-item-icon"><Clock size={16} /></div>
                  <div className="info-item-content">
                    <label className="info-item-label">آخر تسجيل دخول</label>
                    <div className="info-item-value-locked">
                      {userData?.lastSignIn
                        ? new Date(userData.lastSignIn).toLocaleString("ar-EG")
                        : "غير متوفر"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Container */}
        <div className="tabs-wrapper">
          <div className="tabs-header">
            <div className="tabs-menu">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <div key={tab.id} className="tab-wrapper">
                    <button
                      className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
                      onClick={() => setActiveTab(activeTab === tab.id ? "" : tab.id)}
                    >
                      <div className="tab-button-content">
                        {IconComponent && <IconComponent className="tab-icon" size={18} />}
                        <span>{tab.label}</span>
                      </div>
                    </button>
                    {/* Mobile: render content directly below tab */}
                    <div className={`mobile-tab-content ${activeTab === tab.id ? "active" : ""}`}>
                      {activeTab === tab.id && (
                        <div className="tabs-content-area mobile-inline">
                          {activeTab === "القضايا" && (
                            <div className="tab-panel">
                              {cases.length > 0 ? (
                                <table className="premium-table">
                                  <thead>
                                    <tr>
                                      <th>رقم القضية</th>
                                      <th>العميل</th>
                                      <th>نوع القضية</th>
                                      <th>الحالة</th>
                                      <th>تاريخ التسجيل</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {cases.map((caseItem) => (
                                      <tr key={caseItem.id} onClick={() => setSelectedRowId(caseItem.id)} className={selectedRowId === caseItem.id ? "selected" : ""}>
                                        <td data-label="رقم القضية">{caseItem.case_number || "-"}</td>
                                        <td data-label="العميل">{caseItem.client_name || "-"}</td>
                                        <td data-label="نوع القضية">{caseItem.case_type || "-"}</td>
                                        <td data-label="الحالة">{caseItem.status || "-"}</td>
                                        <td data-label="تاريخ التسجيل">{caseItem.registration_date ? new Date(caseItem.registration_date).toLocaleDateString("ar-SA") : "-"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="empty-state">لا توجد قضايا</div>
                              )}
                            </div>
                          )}
                          {activeTab === "الجلسات" && (
                            <div className="tab-panel">
                              {sessionsData.length > 0 ? (
                                <table className="premium-table">
                                  <thead>
                                    <tr>
                                      <th>تاريخ الجلسة</th>
                                      <th>رقم الجلسة</th>
                                      <th>تفاصيل الجلسة</th>
                                      <th>وقت الجلسة</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sessionsData.map((session, index) => (
                                      <tr key={index} onClick={() => setSelectedRowId(`session-${index}`)} className={selectedRowId === `session-${index}` ? "selected" : ""}>
                                        <td data-label="تاريخ الجلسة">{session.sessiondate || "-"}</td>
                                        <td data-label="رقم الجلسة">{session.sessionnumber || "-"}</td>
                                        <td data-label="تفاصيل الجلسة">{session.sessiondetails || "-"}</td>
                                        <td data-label="وقت الجلسة">{session.sessiontime || "-"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="empty-state">لا توجد جلسات</div>
                              )}
                            </div>
                          )}
                          {activeTab === "التحديثات" && (
                            <div className="tab-panel">
                              {updatesData.length > 0 ? (
                                <table className="premium-table">
                                  <thead>
                                    <tr>
                                      <th>التاريخ</th>
                                      <th>التحديث</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {updatesData.map((update, index) => (
                                      <tr key={index} onClick={() => setSelectedRowId(`update-${index}`)} className={selectedRowId === `update-${index}` ? "selected" : ""}>
                                        <td data-label="التاريخ">{update.date || "-"}</td>
                                        <td data-label="التحديث">{update.update || "-"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="empty-state">لا توجد تحديثات</div>
                              )}
                            </div>
                          )}
                          {activeTab === "الملاحظات" && (
                            <div className="tab-panel">
                              {notesData.length > 0 ? (
                                <table className="premium-table">
                                  <thead>
                                    <tr>
                                      <th>التاريخ</th>
                                      <th>الملاحظة</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {notesData.map((note, index) => (
                                      <tr key={index} onClick={() => setSelectedRowId(`note-${index}`)} className={selectedRowId === `note-${index}` ? "selected" : ""}>
                                        <td data-label="التاريخ">{note.date || "-"}</td>
                                        <td data-label="الملاحظة">{note.note || "-"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="empty-state">لا توجد ملاحظات</div>
                              )}
                            </div>
                          )}
                          {activeTab === "الإجراءات" && (
                            <div className="tab-panel">
                              {actionsData.length > 0 ? (
                                <table className="premium-table">
                                  <thead>
                                    <tr>
                                      <th>التاريخ</th>
                                      <th>الإجراء</th>
                                      <th>الحالة</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {actionsData.map((action, index) => (
                                      <tr key={index} onClick={() => setSelectedRowId(`action-${index}`)} className={selectedRowId === `action-${index}` ? "selected" : ""}>
                                        <td data-label="التاريخ">{action.date || "-"}</td>
                                        <td data-label="الإجراء">{action.action || "-"}</td>
                                        <td data-label="الحالة">{action.status || "-"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="empty-state">لا توجد إجراءات</div>
                              )}
                            </div>
                          )}
                          {activeTab === "العقود" && (
                            <div className="tab-panel">
                              {contractsData.length > 0 ? (
                                <table className="premium-table">
                                  <thead>
                                    <tr>
                                      <th>التاريخ</th>
                                      <th>النوع</th>
                                      <th>الوصف</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {contractsData.map((contract, index) => (
                                      <tr key={index} onClick={() => setSelectedRowId(`contract-${index}`)} className={selectedRowId === `contract-${index}` ? "selected" : ""}>
                                        <td data-label="التاريخ">{contract.date || "-"}</td>
                                        <td data-label="النوع">{contract.type || "-"}</td>
                                        <td data-label="الوصف">{contract.description || "-"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="empty-state">لا توجد عقود</div>
                              )}
                            </div>
                          )}
                          {activeTab === "الوكالات" && (
                            <div className="tab-panel">
                              {agenciesData.length > 0 ? (
                                <table className="premium-table">
                                  <thead>
                                    <tr>
                                      <th>التاريخ</th>
                                      <th>النوع</th>
                                      <th>الوصف</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {agenciesData.map((agency, index) => (
                                      <tr key={index} onClick={() => setSelectedRowId(`agency-${index}`)} className={selectedRowId === `agency-${index}` ? "selected" : ""}>
                                        <td data-label="التاريخ">{agency.date || "-"}</td>
                                        <td data-label="النوع">{agency.type || "-"}</td>
                                        <td data-label="الوصف">{agency.description || "-"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="empty-state">لا توجد وكالات</div>
                              )}
                            </div>
                          )}
                          {activeTab === "الموكلين" && (
                            <div className="tab-panel">
                              {clientsData.length > 0 ? (
                                <table className="premium-table">
                                  <thead>
                                    <tr>
                                      <th>الاسم</th>
                                      <th>رقم الهاتف</th>
                                      <th>البريد الإلكتروني</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {clientsData.map((client, index) => (
                                      <tr key={index} onClick={() => setSelectedRowId(`client-${index}`)} className={selectedRowId === `client-${index}` ? "selected" : ""}>
                                        <td data-label="الاسم">{client.name || "-"}</td>
                                        <td data-label="رقم الهاتف">{client.phone || "-"}</td>
                                        <td data-label="البريد الإلكتروني">{client.email || "-"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="empty-state">لا يوجد موكلين</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="tabs-content-area">
            {activeTab === "القضايا" && (
              <div className="tab-panel">

                {cases.length > 0 ? (
                  <div className="table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>نوع القضية</th>
                          <th>عنوان المحكمة</th>
                          <th>المحافظة</th>
                          <th>المادة القانونية</th>
                          <th>الدائرة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cases.map((item, index) => (
                          <tr key={index}>
                            <td data-label="نوع القضية">
                              <span className="badge-blue">{item.caseType || "غير محدد"}</span>
                            </td>
                            <td data-label="عنوان المحكمة">{item.courtAddress || "-"}</td>
                            <td data-label="المحافظة">{item.Governorate || "-"}</td>
                            <td data-label="المادة القانونية">{item.legalArticle || "-"}</td>
                            <td data-label="الدائرة">{item.location || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state-premium">
                    <div className="empty-icon-wrapper">
                      <FileText size={48} />
                    </div>
                    <h3>لا توجد قضايا</h3>
                    <p>لم يتم العثور على قضايا مرتبطة بهذا الحساب حالياً.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "الجلسات" && (
              <div className="tab-panel">

                {sessionsData.length > 0 ? (
                  <div className="table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>تاريخ الجلسة</th>
                          <th>رقم الجلسة</th>
                          <th>تفاصيل الجلسة</th>
                          <th>وقت الجلسة</th>
                          <th>الجلسة القادمة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionsData.map((session, index) => (
                          <tr key={index}>
                            <td data-label="تاريخ الجلسة">{session.sessiondate || "-"}</td>
                            <td data-label="رقم الجلسة">
                              <span className="badge-gray">{session.sessionnumber || "-"}</span>
                            </td>
                            <td data-label="تفاصيل الجلسة">{session.sessiondetails || "-"}</td>
                            <td data-label="وقت الجلسة">{session.sessiontime || "-"}</td>
                            <td data-label="الجلسة القادمة">{session.next_session_req || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state-premium">
                    <div className="empty-icon-wrapper">
                      <Calendar size={48} />
                    </div>
                    <h3>لا توجد جلسات</h3>
                    <p>لا توجد جلسات مجدولة في الوقت الحالي.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "التحديثات" && (
              <div className="tab-panel">

                {updatesData.length > 0 ? (
                  <div className="table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>تاريخ التحديث</th>
                          <th>تفاصيل التحديث</th>
                          <th>رقم القضية</th>
                          <th>المرفقات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {updatesData.map((update, index) => (
                          <tr key={index}>
                            <td data-label="تاريخ التحديث">
                              {update.update_date
                                ? new Date(update.update_date).toLocaleDateString("ar-EG")
                                : "-"}
                            </td>
                            <td data-label="تفاصيل التحديث" className="wrap-text">{update.update_details || "-"}</td>
                            <td data-label="رقم القضية">{update.case_number_in_court || "غير متوفر"}</td>
                            <td data-label="المرفقات">
                              {update.attachment_url ? (
                                <a href={update.attachment_url} target="_blank" rel="noopener noreferrer" className="action-link">
                                  <Eye size={16} />
                                  <span>عرض</span>
                                </a>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state-premium">
                    <div className="empty-icon-wrapper">
                      <AlertCircle size={48} />
                    </div>
                    <h3>لا توجد تحديثات</h3>
                    <p>لم يتم تسجيل أي تحديثات جديدة.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "الملاحظات" && (
              <div className="tab-panel">

                {notesData.length > 0 ? (
                  <div className="table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>الملاحظة</th>
                          <th>تاريخ الإنشاء</th>
                          <th>رقم الدعوى</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notesData.map((noteItem, index) => (
                          <tr key={index}>
                            <td data-label="الملاحظة" className="wrap-text">{noteItem.note || "-"}</td>
                            <td data-label="تاريخ الإنشاء">
                              {noteItem.created_at
                                ? new Date(noteItem.created_at).toLocaleDateString("ar-EG")
                                : "-"}
                            </td>
                            <td data-label="رقم الدعوى">{noteItem.case_number_in_court || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state-premium">
                    <div className="empty-icon-wrapper">
                      <PenTool size={48} />
                    </div>
                    <h3>لا توجد ملاحظات</h3>
                    <p>لم تقم بإضافة أي ملاحظات بعد.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "الإجراءات" && (
              <div className="tab-panel">

                {actionsData.length > 0 ? (
                  <div className="table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>الإجراء</th>
                          <th>النوع</th>
                          <th>الحالة</th>
                          <th>التاريخ</th>
                          <th>رقم الدعوى</th>
                        </tr>
                      </thead>
                      <tbody>
                        {actionsData.map((action, index) => (
                          <tr key={index}>
                            <td data-label="الإجراء">{action.actiondetails || "-"}</td>
                            <td data-label="النوع">{action.actiontype || "-"}</td>
                            <td data-label="الحالة">
                              <span className={`status-badge ${action.actionstatus === "منجز" ? "success" : "pending"}`}>
                                {action.actionstatus || "غير محدد"}
                              </span>
                            </td>
                            <td data-label="التاريخ">{action.actiondate || "-"}</td>
                            <td data-label="رقم الدعوى">{action.case_number_in_court || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state-premium">
                    <div className="empty-icon-wrapper">
                      <CheckCircle size={48} />
                    </div>
                    <h3>لا توجد إجراءات</h3>
                    <p>سجل الإجراءات فارغ حالياً.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "العقود" && (
              <div className="tab-panel">

                {contractsData.length > 0 ? (
                  <div className="table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>رقم العقد</th>
                          <th>اسم الموكل</th>
                          <th>نوع العقد</th>
                          <th>تاريخ الانتهاء</th>
                          <th>الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contractsData.map((contract, index) => (
                          <tr key={index}>
                            <td data-label="رقم العقد">{contract.contract_number || "-"}</td>
                            <td data-label="اسم الموكل">{contract.client_name || "-"}</td>
                            <td data-label="نوع العقد">
                              <span className="badge-blue">{contract.contract_type || "-"}</span>
                            </td>
                            <td data-label="تاريخ الانتهاء">{contract.end_date || "-"}</td>
                            <td data-label="الإجراءات">
                              <button className="action-btn-icon">
                                <Eye size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state-premium">
                    <div className="empty-icon-wrapper">
                      <FileText size={48} />
                    </div>
                    <h3>لا توجد عقود</h3>
                    <p>لم يتم العثور على عقود مسجلة.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "الوكالات" && (
              <div className="tab-panel">

                {agenciesData.length > 0 ? (
                  <div className="table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>رقم التوكيل</th>
                          <th>اسم الموكل</th>
                          <th>نوع التوكيل</th>
                          <th>تاريخ الانتهاء</th>
                          <th>الملاحظات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agenciesData.map((agency, index) => (
                          <tr key={index}>
                            <td data-label="رقم التوكيل">{agency.attorney_number || "-"}</td>
                            <td data-label="اسم الموكل">{agency.client_name || "-"}</td>
                            <td data-label="نوع التوكيل">
                              <span className="badge-purple">{agency.contract_type || "-"}</span>
                            </td>
                            <td data-label="تاريخ الانتهاء">{agency.end_date || "-"}</td>
                            <td data-label="الملاحظات">{agency.notes || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state-premium">
                    <div className="empty-icon-wrapper">
                      <Link size={48} />
                    </div>
                    <h3>لا توجد وكالات</h3>
                    <p>لم يتم العثور على وكالات مسجلة.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "الموكلين" && (
              <div className="tab-panel">

                {clientsData.length > 0 ? (
                  <div className="table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>اسم الموكل</th>
                          <th>نوع الموكل</th>
                          <th>رقم الهوية</th>
                          <th>الشكل القانوني</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientsData.map((client, index) => (
                          <tr key={index}>
                            <td data-label="اسم الموكل" className="font-bold">{client.client_name || "-"}</td>
                            <td data-label="نوع الموكل">{client.type || "-"}</td>
                            <td data-label="رقم الهوية">{client.id_number || "-"}</td>
                            <td data-label="الشكل القانوني">{client.legal_form || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state-premium">
                    <div className="empty-icon-wrapper">
                      <User size={48} />
                    </div>
                    <h3>لا يوجد موكلين</h3>
                    <p>لم يتم العثور على موكلين مسجلين.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "المهام الوظيفية" && (
              <div className="tab-panel">

                {tasksData.length > 0 ? (
                  <div className="table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>عنوان المهمة</th>
                          <th>نوع المهمة</th>
                          <th>تاريخ المهمة</th>
                          <th>تاريخ الانتهاء</th>
                          <th>الأولوية</th>
                          <th>الحالة</th>
                          <th>رقم القضية</th>
                          <th>المحامي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasksData.map((task, index) => (
                          <tr key={index}>
                            <td className="font-bold">{task.task_title || "-"}</td>
                            <td>
                              <span className="badge-blue">{task.task_type || "-"}</span>
                            </td>
                            <td>{task.task_date ? new Date(task.task_date).toLocaleDateString("ar-EG") : "-"}</td>
                            <td>{task.task_deadline ? new Date(task.task_deadline).toLocaleDateString("ar-EG") : "-"}</td>
                            <td>
                              <span className={`status-badge ${task.task_priority === "عالية" ? "alert" :
                                task.task_priority === "متوسطة" ? "pending" :
                                  "success"
                                }`}>
                                {task.task_priority || "-"}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge ${task.task_status === "مكتملة" ? "success" :
                                task.task_status === "قيد التنفيذ" ? "pending" :
                                  "alert"
                                }`}>
                                {task.task_status || "غير محدد"}
                              </span>
                            </td>
                            <td>{task.task_case || "-"}</td>
                            <td>{task.lawyer_related || task.created_by_username || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state-premium">
                    <div className="empty-icon-wrapper">
                      <Clock size={48} />
                    </div>
                    <h3>لا توجد مهام</h3>
                    <p>لم يتم العثور على مهام وظيفية حالياً.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modern Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="modal-overlay" onClick={() => {
          setIsPasswordModalOpen(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordError('');
        }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <Shield size={24} />
              <h3>تغيير كلمة المرور</h3>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError('');
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {passwordError && (
                <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                  <AlertCircle size={16} />
                  <span>{passwordError}</span>
                </div>
              )}
              <div className="input-group">
                <label>كلمة المرور الحالية</label>
                <input
                  type="password"
                  placeholder="أدخل كلمة المرور الحالية"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isUpdatingPassword}
                />
              </div>
              <div className="input-group">
                <label>كلمة المرور الجديدة</label>
                <input
                  type="password"
                  placeholder="أدخل كلمة المرور الجديدة"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isUpdatingPassword}
                />
              </div>
              <div className="input-group">
                <label>تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isUpdatingPassword}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-primary"
                onClick={handlePasswordChange}
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? 'جاري التغيير...' : 'تأكيد التغيير'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError('');
                }}
                disabled={isUpdatingPassword}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        html, body {
          overflow-x: hidden;
          max-width: 100%;
        }
      `}</style>
      <style jsx>{`
        .page-container {
          min-height: 100vh;
          background: transparent;
          padding: 24px;
          font-family: 'Almarai', sans-serif;
          direction: rtl;
          max-width: 100%;
          box-sizing: border-box;
        }

        /* Toast Messages */
        .toast-container {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 10001;
          display: flex;
          flex-direction: column;
          gap: 12px;
          pointer-events: none;
          max-width: 400px;
          width: 90%;
        }

        .alert {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          animation: toastSlideIn 0.3s ease-out;
        }

        @keyframes toastSlideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .alert-error {
          background: #FEF2F2;
          color: #991B1B;
          border: 1px solid #FEE2E2;
        }

        .alert-success {
          background: #F0FDF4;
          color: #166534;
          border: 1px solid #DCFCE7;
        }

        /* Quick Options */
        /* Content Grid - Info Card */
        .content-grid {
          display: flex;
          justify-content: flex-start;
          gap: 24px;
          margin-bottom: 32px;
        }

        .info-card-modern {
          background: white;
          border-radius: 16px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          width: 100%;
        }

        .info-card-header {
          padding: 20px 24px;
          border-bottom: 1px solid #E2E8F0;
          background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .info-card-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .info-card-avatar {
          width: 52px;
          height: 52px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 22px;
          font-weight: 700;
          font-family: 'Cairo', sans-serif;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
          flex-shrink: 0;
        }

        .info-card-header-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .info-card-title {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          line-height: 1.3;
        }

        .info-card-subtitle {
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          line-height: 1.3;
        }

        .info-card-actions {
          display: flex;
          gap: 10px;
        }

        .info-section-label {
          font-size: 13px;
          font-weight: 700;
          color: #2563EB;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 14px;
          margin-top: 6px;
          padding-bottom: 8px;
          border-bottom: 2px solid #eff6ff;
        }

        .info-section-label:not(:first-child) {
          margin-top: 24px;
        }

        .password-change-btn-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #2563EB;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Almarai', sans-serif;
        }

        .save-changes-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #2563EB; /* Blue 600 */
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Almarai', sans-serif;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }

        .save-changes-btn:hover:not(:disabled) {
          background: #1D4ED8;
          transform: translateY(-1px);
        }

        .save-changes-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .info-card-body {
          padding: 24px;
        }

        .info-grid-modern {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px 24px;
        }

        .info-item-modern {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .info-item-icon {
          width: 36px;
          height: 36px;
          min-width: 36px;
          background: #f1f5f9;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          margin-top: 20px;
        }

        .info-item-content {
          flex: 1;
        }

        .info-item-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 6px;
        }

        .info-item-value {
          font-size: 14px;
          font-weight: 500;
          color: #000000;
        }

        .info-item-value-locked {
          font-size: 14px;
          font-weight: 500;
          color: #000000;
          background: #F1F5F9;
          height: 40px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          box-sizing: border-box;
        }

        .info-input-modern {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          color: #000000;
          background: white;
          transition: all 0.2s;
          outline: none;
          box-sizing: border-box;
        }

        .info-input-modern:focus {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .info-select-modern {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          color: #000000;
          background: #F8FAFC;
          cursor: pointer;
          outline: none;
          box-sizing: border-box;
        }

        .info-select-modern:focus {
          border-color: #2563EB;
        }

        .quick-options-row {
          display: none;
        }

        .option-item {
          flex: 1;
          background: white;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          border: 2px solid #e5e7eb;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }


        .option-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          color: #3b82f6;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.15);
        }

        .option-label {
          font-weight: 700;
          color: #000000;
          font-size: 15px;
        }

        /* Tabs */
        .tabs-wrapper {
          background: white;
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }

        .tabs-header {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-bottom: 2px solid #e5e7eb;
          padding: 12px 24px 0 24px;
        }

        .tabs-menu {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
          padding-bottom: 4px;
        }
        
        .tabs-menu::-webkit-scrollbar {
          height: 6px;
        }
        
        .tabs-menu::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        
        .tabs-menu::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        

        .tab-button {
          background: transparent;
          border: none;
          padding: 12px 20px;
          font-family: inherit;
          font-size: 15px;
          font-weight: 700;
          color: #000000;
          cursor: pointer;
          position: relative;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          border-radius: 6px;
          border-right: 3px solid transparent;
          text-align: right;
        }

        .tab-button-content {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .tab-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          transition: color 0.2s ease;
          stroke-width: 2;
          color: #475569;
        }

        .tab-button.active {
          background: linear-gradient(to left, #dbeafe 0%, #eff6ff 100%);
          color: #000000;
          font-weight: 700;
          border-right: 3px solid #3b82f6;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
        }

        .tab-button.active .tab-icon {
          color: #3b82f6;
        }

        .tab-button:not(.active):hover {
          background: linear-gradient(to left, #f8fafc 0%, #f1f5f9 100%);
          color: #000000;
          border-right: 3px solid #94a3b8;
        }

        .tab-button:not(.active):hover .tab-icon {
          color: #64748b;
        }

        .tabs-content-area {
          padding: 24px;
          min-height: 400px;
          background: white;
        }

        /* Hide mobile tab content on desktop */
        .mobile-tab-content {
          display: none;
        }

        /* Hide mobile inline content on desktop */
        .tabs-content-area.mobile-inline {
          display: none;
        }
        
        .tab-panel {
          animation: slideIn 0.4s ease-out;
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .panel-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .panel-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          color: #1e40af;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .panel-title {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #000000;
        }

        /* Premium Table */
        .table-container {
          overflow-x: auto;
          position: relative;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }
        
        .table-container::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }

        .premium-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 800px;
        }

        .premium-table thead {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .premium-table th {
          padding: 18px 24px;
          text-align: right;
          font-size: 15px;
          font-weight: 700;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          border-bottom: none;
          position: relative;
        }
        
        .premium-table th:not(:last-child)::after {
          content: '';
          position: absolute;
          left: 0;
          top: 20%;
          bottom: 20%;
          width: 1px;
          background: rgba(255, 255, 255, 0.2);
        }

        .premium-table tbody tr {
          transition: all 0.2s ease;
          border-bottom: 1px solid #f1f5f9;
          background: white;
        }

        .premium-table tbody tr:last-child {
          border-bottom: none;
        }


        .premium-table td {
          padding: 18px 24px;
          font-size: 16px;
          color: #000000;
          vertical-align: middle;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .premium-table tbody tr:last-child td {
          border-bottom: none;
        }
        
        .font-bold {
          font-weight: 700;
          color: #000000;
        }
        
        .text-muted {
          color: #000000;
        }
        
        .wrap-text {
          max-width: 300px;
          word-wrap: break-word;
          white-space: normal;
          line-height: 1.6;
        }

        /* Badges */
        .badge-blue {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 8px;
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1e40af;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(30, 64, 175, 0.1);
        }

        .badge-gray {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 8px;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          color: #475569;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(71, 85, 105, 0.1);
        }
        
        .badge-purple {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 8px;
          background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
          color: #7e22ce;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(126, 34, 206, 0.1);
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        }

        .status-badge.success {
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          color: #15803d;
        }
        
        .status-badge.alert {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #b91c1c;
        }
        
        .status-badge.pending {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          color: #b45309;
        }

        .action-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #2563eb;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          padding: 6px 12px;
          border-radius: 8px;
          background: rgba(37, 99, 235, 0.1);
        }


        .action-btn-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e2e8f0;
          background: white;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }


        /* Empty State */
        .empty-state-premium {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 0;
          text-align: center;
        }

        .empty-icon-wrapper {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          color: #94a3b8;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .empty-state-premium h3 {
          margin: 0 0 12px 0;
          font-size: 20px;
          font-weight: 700;
          color: #000000;
        }

        .empty-state-premium p {
          margin: 0;
          color: #000000;
          font-size: 15px;
          line-height: 1.6;
        }

        /* Password Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
        }

        .modal-container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          width: 100%;
          max-width: 500px;
          direction: rtl;
          overflow: hidden;
        }

        .modal-header {
          background: #2563EB;
          color: white;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          flex: 1;
        }

        .modal-close-btn {
          position: absolute;
          left: 20px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          font-size: 28px;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          line-height: 1;
        }


        .modal-body {
          padding: 24px;
        }

        .input-group {
          margin-bottom: 20px;
        }

        .input-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #000000;
          margin-bottom: 8px;
        }

        .input-group input {
          width: 100%;
          padding: 12px 16px;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          font-size: 14px;
          font-family: 'Almarai', sans-serif;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .input-group input:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .input-group input:disabled {
          background: #F1F5F9;
          cursor: not-allowed;
        }

        .modal-footer {
          padding: 20px 24px;
          border-top: 1px solid #E2E8F0;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn-primary {
          padding: 12px 24px;
          background: #2563EB;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Almarai', sans-serif;
        }


        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          padding: 12px 24px;
          background: white;
          color: #000000;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Almarai', sans-serif;
        }


        .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .page-container {
            padding: 16px;
          }

          .messages-container {
            margin-bottom: 16px;
          }

          .tabs-content-area {
            padding: 20px;
          }

          .info-grid-modern {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .info-card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 14px;
            padding: 16px;
          }

          .info-card-avatar {
            width: 46px;
            height: 46px;
            font-size: 20px;
            border-radius: 12px;
          }

          .info-card-actions {
            width: 100%;
            flex-direction: column;
          }

          .password-change-btn-header {
            width: 100%;
            justify-content: center;
          }

          .save-changes-btn {
            width: 100%;
            justify-content: center;
          }

          .info-card-modern {
            max-width: 100%;
            border-radius: 14px;
          }

          .info-card-body {
            padding: 16px;
          }

          .info-item-icon {
            display: none;
          }

          .info-grid-modern {
            gap: 12px;
          }

          .modal-container {
            max-width: 100%;
            margin: 0;
          }

          /* Tabs vertical layout on mobile */
          .tabs-menu {
            flex-direction: column;
            gap: 8px;
            overflow-x: visible;
          }

          .tab-button {
            width: 100%;
            text-align: right;
            padding: 14px 16px;
            border-radius: 12px;
            background: transparent;
            border: none;
            box-shadow: none;
            transition: all 0.2s ease;
          }

          .tab-button.active {
            background: transparent;
            color: #3b82f6;
            border: none;
            box-shadow: none;
          }

          .tab-button.active .tab-icon {
            color: #3b82f6;
          }

          .tab-button:not(.active):hover {
            background: transparent;
          }

          .tab-button:not(.active):hover .tab-icon {
            color: #64748b;
          }

          .tabs-content-area {
            padding: 16px;
            padding-top: 8px;
            min-height: auto;
            background: transparent;
          }

          .tabs-header {
            padding: 0;
          }

          /* Show mobile tab content on mobile */
          .mobile-tab-content {
            display: none;
            border: none;
            box-shadow: none;
            background: transparent;
            margin-top: 0;
            margin-bottom: 16px;
            min-height: auto;
            overflow: hidden;
          }

          .mobile-tab-content.active {
            display: block;
          }

          /* Show mobile inline content on mobile */
          .tabs-content-area.mobile-inline {
            display: block;
            padding: 16px;
            padding-top: 8px;
            min-height: auto;
            background: transparent;
            border: 2px solid #3b82f6;
            border-radius: 12px;
          }

          /* Hide desktop tabs-content-area on mobile */
          .tabs-wrapper > .tabs-content-area:not(.mobile-inline) {
            display: none;
          }

          /* Table to Card Layout for Mobile */
          .premium-table {
            display: block;
            min-width: auto;
          }

          .premium-table thead {
            display: none;
          }

          .premium-table tbody {
            display: block;
          }

          .premium-table tbody tr {
            display: block;
            padding: 12px;
            margin-bottom: 12px;
            border: none;
            border-radius: 12px;
            box-shadow: none;
            background: transparent;
            border-bottom: 1px solid #e5e7eb;
          }

          .premium-table tbody tr:last-child {
            border-bottom: none;
          }

          .premium-table tbody tr.selected {
            background: #eff6ff;
            border-left: 3px solid #3b82f6;
          }

          .premium-table td {
            display: flex;
            flex-direction: row;
            padding: 8px 0;
            border-bottom: none;
            font-size: 14px;
            gap: 8px;
            align-items: center;
          }

          .premium-table td::before {
            content: attr(data-label);
            font-size: 13px;
            font-weight: 800;
            color: #000000;
            margin-right: 0;
          }

          .table-container {
            overflow: visible;
          }

          .badge-blue,
          .badge-gray,
          .badge-purple,
          .status-badge {
            align-self: flex-start;
            font-size: 11px;
            padding: 4px 10px;
          }

          .action-link {
            align-self: flex-start;
          }

          .action-btn-icon {
            align-self: flex-start;
          }

          .wrap-text {
            max-width: 100%;
          }
        }
      `}</style>
    </Layout>
  );
};

export default withAuth(MyAccount);