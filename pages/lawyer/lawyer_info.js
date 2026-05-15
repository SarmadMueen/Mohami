import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../lib/api';
import Layout from '../../components/layout/Layout';
import { supabase } from '../../lib/initSupabase';
import { useRouter } from 'next/router';
import withAuth from '../../lib/withAuth';
import Link from 'next/link';
import {
  AiOutlineUser,
  AiOutlineMail,
  AiOutlineIdcard,
  AiOutlineFileText,
  AiOutlineHome,
  AiOutlineCalendar,
  AiOutlineLock
} from 'react-icons/ai';
import {
  FaLock,
  FaShieldAlt,
  FaExternalLinkAlt,
  FaEnvelope,
  FaUsers,
  FaList,
  FaKey,
  FaEdit,
  FaHome,
  FaWrench,
  FaGavel,
  FaTimes,
  FaCalendarAlt,
  FaBell
} from 'react-icons/fa';

const LawyerInfo = () => {
  const router = useRouter();
  const [lawyerInfo, setLawyerInfo] = useState(null);
  const [currentRole, setCurrentRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isCasesModalOpen, setIsCasesModalOpen] = useState(false);
  const [casesData, setCasesData] = useState([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [expandedCase, setExpandedCase] = useState(null);

  useEffect(() => {
    const fetchLawyerInfo = async () => {
      try {
        const { id } = router.query;

        if (!id) {
          console.error('No lawyer ID in URL');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('lawyer_users')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          throw error;
        }

        setLawyerInfo(data);

        // Fetch current role from user_metadata
        if (data.email) {
          const { data: userMetadata, error: metadataError } = await supabase
            .from('user_metadata')
            .select('role')
            .eq('email', data.email)
            .single();

          if (!metadataError && userMetadata) {
            setCurrentRole(userMetadata.role || '');
          }
        }
      } catch (error) {
        console.error('Error fetching lawyer info:', error.message);
      } finally {
        setLoading(false);
      }
    };

    if (router.query.id) {
      fetchLawyerInfo();
    }
  }, [router.query.id]);

  const formatDate = (dateString) => {
    if (!dateString) return 'غير متوفر';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', options);
  };

  const handleEditClick = () => {
    router.push(`/lawyer/edit_lawyer?id=${router.query.id}`);
  };

  const handlePasswordChangeClick = () => {
    setIsPasswordModalOpen(true);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleCasesClick = async () => {
    setIsCasesModalOpen(true);
    setCasesLoading(true);
    setExpandedCase(null);

    try {
      if (!lawyerInfo?.email) {
        throw new Error('البريد الإلكتروني غير متوفر');
      }

      // Get lawyer's user ID from user_metadata
      const { data: userMetadata, error: metadataError } = await supabase
        .from('user_metadata')
        .select('new_lawyer_id, admin_user_id')
        .eq('email', lawyerInfo.email)
        .limit(1)
        .maybeSingle();

      if (metadataError) {
        console.error('Error fetching user metadata:', metadataError);
      }

      // Use found ID, or fallback to lawyerInfo.id if metadata not found
      const lawyerUserId = userMetadata?.new_lawyer_id || userMetadata?.admin_user_id || lawyerInfo.id;

      if (!lawyerUserId) {
        throw new Error('لم يتم العثور على معرف المستخدم للمحامي');
      }

      // Fetch cases assigned to this lawyer
      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select('*')
        .or(`lawyer_id.eq.${lawyerUserId},caseLawyerId.eq.${lawyerUserId}`)
        .order('created_at', { ascending: false });

      if (casesError) {
        throw new Error('خطأ في جلب القضايا');
      }

      // For each case, fetch related data
      const casesWithDetails = await Promise.all(
        (cases || []).map(async (caseItem) => {
          // Fetch sessions
          const { data: sessions } = await supabase
            .from('sessions')
            .select('*')
            .eq('case_number', caseItem.case_number)
            .order('sessiondate', { ascending: false });

          // Fetch reminders
          const { data: reminders } = await supabase
            .from('reminders')
            .select('*')
            .eq('reminder_title', caseItem.case_number)
            .order('reminder_date', { ascending: false });

          // Fetch case updates
          const { data: updates } = await supabase
            .from('case_update')
            .select('*')
            .eq('case_number', caseItem.case_number)
            .order('created_at', { ascending: false });

          return {
            ...caseItem,
            sessions: sessions || [],
            reminders: reminders || [],
            updates: updates || []
          };
        })
      );

      setCasesData(casesWithDetails);
    } catch (error) {
      console.error('Error fetching cases:', error);
      alert(error.message || 'حدث خطأ أثناء جلب القضايا');
    } finally {
      setCasesLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword || !confirmPassword) {
      setPasswordError('يرجى إدخال كلمة المرور الجديدة وتأكيدها');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordError('');

    try {
      if (!lawyerInfo?.email) {
        throw new Error('البريد الإلكتروني غير متوفر');
      }

      // Call API route to update password
      const response = await fetch(getApiUrl('/api/updatePassword'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: lawyerInfo.email,
          newPassword: newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'حدث خطأ أثناء تغيير كلمة المرور');
      }

      alert('تم تغيير كلمة المرور بنجاح');
      setIsPasswordModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
    } catch (error) {
      console.error('Error updating password:', error);
      setPasswordError(error.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const titleMappings = {
    lawyer_name: { translation: 'اسم المحامي', icon: <AiOutlineUser className="icon" /> },
    username: { translation: 'اسم المستخدم', icon: <AiOutlineUser className="icon" /> },
    email: { translation: 'البريد الإلكتروني', icon: <AiOutlineMail className="icon" /> },
    id_card_number: { translation: 'رقم الهوية', icon: <AiOutlineIdcard className="icon" /> },
    file_number: { translation: 'رقم الاضبارة', icon: <AiOutlineFileText className="icon" /> },
    retire_number: { translation: 'رقم التقاعد', icon: <AiOutlineFileText className="icon" /> },
    registration_address: { translation: 'غرفة التسجيل', icon: <AiOutlineHome className="icon" /> },
    affiliation_date: { translation: 'تاريخ الانتماء', icon: <AiOutlineCalendar className="icon" /> },
    effective_until: { translation: 'نافذة لغاية', icon: <AiOutlineCalendar className="icon" /> },
    validity: { translation: 'الصلاحية', icon: <AiOutlineLock className="icon" /> },
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '2rem', textAlign: 'center' }}>جاري التحميل...</div>
      </Layout>
    );
  }

  if (!lawyerInfo) {
    return (
      <Layout>
        <div style={{ padding: '2rem', textAlign: 'center' }}>لم يتم العثور على المحامي</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="lawyer-info-page">
        {/* Breadcrumb */}
        <div className="breadcrumb-container">
          <div className="breadcrumb">
            <Link href="/dashboard">
              <a>الرئيسية</a>
            </Link>
            <span className="breadcrumb-separator">/</span>
            <Link href="/lawyer/lawyer">
              <a>المحامين</a>
            </Link>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">معلومات المحامي</span>
          </div>
        </div>

        {/* Header Section */}
        <div className="profile-header">
          <div className="header-background"></div>
          <div className="header-content">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar">
                {lawyerInfo?.template_picture_url ? (
                  <img
                    src={lawyerInfo.template_picture_url}
                    alt="Profile"
                    className="avatar-img"
                  />
                ) : (
                  <div className="avatar-fallback">
                    <AiOutlineUser className="fallback-icon" />
                  </div>
                )}
                <div className="avatar-badge" onClick={handleEditClick}>
                  <FaEdit />
                </div>
              </div>
            </div>
            <div className="profile-info">
              <div className="profile-name-row">
                <h1 className="profile-name">{lawyerInfo?.lawyer_name || lawyerInfo?.username || 'اسم المستخدم'}</h1>
                <span className="role-badge">{currentRole || 'محامي'}</span>
              </div>
            </div>
            <div className="header-actions">
              <button onClick={handleEditClick} className="action-btn primary-btn">
                <FaEdit />
                تعديل الملف الشخصي
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="content-wrapper">
          {/* Sidebar */}
          <div className="sidebar-section">
            <div className="sidebar-card">
              <div className="sidebar-header">
                <h3>الإعدادات السريعة</h3>
              </div>
              <div className="sidebar-menu">
                <div className="menu-item active">
                  <AiOutlineUser className="menu-icon" />
                  <span>معلومات الحساب</span>
                </div>
                <div className="menu-item" onClick={handlePasswordChangeClick}>
                  <FaLock className="menu-icon" />
                  <span>تغيير كلمة المرور</span>
                </div>
                <div className="menu-item" onClick={handleCasesClick}>
                  <FaGavel className="menu-icon" />
                  <span>سجل القضايا</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="content-section">
            {/* Account Details Card */}
            <div className="info-card">
              <div className="card-header">
                <div className="header-left">
                  <div className="header-icon-wrapper">
                    <AiOutlineUser className="header-icon" />
                  </div>
                  <div>
                    <h2 className="card-title">معلومات الحساب</h2>
                    <p className="card-subtitle">التفاصيل الأساسية للمحامي</p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="info-grid">
                  <div className="info-item">
                    <div className="info-icon">
                      <AiOutlineMail />
                    </div>
                    <div className="info-content">
                      <label className="info-label">البريد الإلكتروني</label>
                      <div className="info-value">{lawyerInfo?.email || 'غير متوفر'}</div>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">
                      <AiOutlineUser />
                    </div>
                    <div className="info-content">
                      <label className="info-label">اسم المستخدم</label>
                      <div className="info-value">{lawyerInfo?.lawyer_name || lawyerInfo?.username || 'غير متوفر'}</div>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">
                      <AiOutlineIdcard />
                    </div>
                    <div className="info-content">
                      <label className="info-label">رقم الهوية</label>
                      <div className="info-value">{lawyerInfo?.id_card_number || 'غير متوفر'}</div>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">
                      <AiOutlineFileText />
                    </div>
                    <div className="info-content">
                      <label className="info-label">رقم الاضبارة</label>
                      <div className="info-value">{lawyerInfo?.file_number || 'غير متوفر'}</div>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">
                      <AiOutlineFileText />
                    </div>
                    <div className="info-content">
                      <label className="info-label">رقم التقاعد</label>
                      <div className="info-value">{lawyerInfo?.retire_number || 'غير متوفر'}</div>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">
                      <AiOutlineHome />
                    </div>
                    <div className="info-content">
                      <label className="info-label">غرفة التسجيل</label>
                      <div className="info-value">{lawyerInfo?.registration_address || 'غير متوفر'}</div>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">
                      <AiOutlineCalendar />
                    </div>
                    <div className="info-content">
                      <label className="info-label">تاريخ الانتماء</label>
                      <div className="info-value">{lawyerInfo?.affiliation_date ? formatDate(lawyerInfo.affiliation_date) : 'غير متوفر'}</div>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">
                      <AiOutlineCalendar />
                    </div>
                    <div className="info-content">
                      <label className="info-label">نافذة لغاية</label>
                      <div className="info-value">{lawyerInfo?.effective_until ? formatDate(lawyerInfo.effective_until) : 'غير متوفر'}</div>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">
                      <AiOutlineLock />
                    </div>
                    <div className="info-content">
                      <label className="info-label">الصلاحية</label>
                      <div className="info-value">{lawyerInfo?.validity || 'غير متوفر'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Settings Card */}
            <div className="info-card">
              <div className="card-header">
                <div className="header-left">
                  <div className="header-icon-wrapper">
                    <FaWrench className="header-icon" />
                  </div>
                  <div>
                    <h2 className="card-title">إعدادات الحساب</h2>
                    <p className="card-subtitle">الصلاحيات والأقسام المتاحة</p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="info-grid">
                  <div className="info-item full-width">
                    <div className="info-icon">
                      <FaUsers />
                    </div>
                    <div className="info-content">
                      <label className="info-label">فئة صلاحيات الحساب</label>
                      <div className="info-value">
                        <span className="role-tag">{currentRole || 'غير محدد'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="info-item full-width">
                    <div className="info-icon">
                      <FaList />
                    </div>
                    <div className="info-content">
                      <label className="info-label">الأقسام المتاحة</label>
                      <div className="sections-list">
                        <div className="section-badge">
                          <FaHome className="section-badge-icon" />
                          <span>قسم القضايا</span>
                        </div>
                        <div className="section-badge">
                          <FaWrench className="section-badge-icon" />
                          <span>قسم التنفيذ</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cases Modal */}
      {isCasesModalOpen && (
        <div className="cases-modal-overlay" onClick={() => setIsCasesModalOpen(false)}>
          <div className="cases-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="cases-modal-header">
              <FaGavel className="modal-header-icon" />
              <h3>سجل القضايا</h3>
              <button className="close-btn" onClick={() => setIsCasesModalOpen(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="cases-modal-body">
              {casesLoading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>جاري التحميل...</p>
                </div>
              ) : casesData.length === 0 ? (
                <div className="empty-state">
                  <FaGavel className="empty-icon" />
                  <p>لا توجد قضايا مسندة لهذا المحامي</p>
                </div>
              ) : (
                <div className="cases-list">
                  {casesData.map((caseItem) => (
                    <div key={caseItem.id} className="case-card">
                      <div
                        className="case-header"
                        onClick={() => setExpandedCase(expandedCase === caseItem.id ? null : caseItem.id)}
                      >
                        <div className="case-title-section">
                          <h4 className="case-title">{caseItem.case_number || 'قضية بدون رقم'}</h4>
                          <span className="case-client">{caseItem.client_name || 'عميل غير محدد'}</span>
                        </div>
                        <div className="case-meta">
                          <span className="case-state">{caseItem.caseState || 'غير محدد'}</span>
                          <span className={`expand-icon ${expandedCase === caseItem.id ? 'expanded' : ''}`}>▼</span>
                        </div>
                      </div>

                      {expandedCase === caseItem.id && (
                        <div className="case-details">
                          {/* Case Basic Info */}
                          <div className="detail-section">
                            <h5 className="section-title">معلومات القضية</h5>
                            <div className="info-row">
                              <span className="info-label">رقم القضية في المحكمة:</span>
                              <span className="info-text">{caseItem.case_number_in_court || 'غير محدد'}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">نوع القضية:</span>
                              <span className="info-text">{caseItem.caseType || 'غير محدد'}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">مرحلة القضية:</span>
                              <span className="info-text">{caseItem.caseStage || 'غير محدد'}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">تاريخ الإنشاء:</span>
                              <span className="info-text">{caseItem.created_at ? formatDate(caseItem.created_at) : 'غير محدد'}</span>
                            </div>
                          </div>

                          {/* Sessions */}
                          <div className="detail-section">
                            <h5 className="section-title">
                              <FaCalendarAlt className="section-icon" />
                              الجلسات ({caseItem.sessions?.length || 0})
                            </h5>
                            {caseItem.sessions && caseItem.sessions.length > 0 ? (
                              <div className="items-list">
                                {caseItem.sessions.map((session, idx) => (
                                  <div key={idx} className="item-card">
                                    <div className="item-header">
                                      <span className="item-title">جلسة رقم {session.sessionnumber || idx + 1}</span>
                                      <span className="item-date">{session.sessiondate ? formatDate(session.sessiondate) : 'غير محدد'}</span>
                                    </div>
                                    {session.sessiondetails && (
                                      <p className="item-description">{session.sessiondetails}</p>
                                    )}
                                    {session.sessiontime && (
                                      <span className="item-time">الوقت: {session.sessiontime}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="no-items">لا توجد جلسات مسجلة</p>
                            )}
                          </div>

                          {/* Reminders */}
                          <div className="detail-section">
                            <h5 className="section-title">
                              <FaBell className="section-icon" />
                              التذكيرات ({caseItem.reminders?.length || 0})
                            </h5>
                            {caseItem.reminders && caseItem.reminders.length > 0 ? (
                              <div className="items-list">
                                {caseItem.reminders.map((reminder, idx) => (
                                  <div key={idx} className="item-card">
                                    <div className="item-header">
                                      <span className="item-title">{reminder.reminder_description || 'تذكير'}</span>
                                      <span className="item-date">{reminder.reminder_date ? formatDate(reminder.reminder_date) : 'غير محدد'}</span>
                                    </div>
                                    {reminder.reminder_notes && (
                                      <p className="item-description">{reminder.reminder_notes}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="no-items">لا توجد تذكيرات</p>
                            )}
                          </div>

                          {/* Case Updates */}
                          <div className="detail-section">
                            <h5 className="section-title">
                              <FaList className="section-icon" />
                              التحديثات ({caseItem.updates?.length || 0})
                            </h5>
                            {caseItem.updates && caseItem.updates.length > 0 ? (
                              <div className="items-list">
                                {caseItem.updates.map((update, idx) => (
                                  <div key={idx} className="item-card">
                                    <div className="item-header">
                                      <span className="item-title">تحديث</span>
                                      <span className="item-date">{update.created_at ? formatDate(update.created_at) : 'غير محدد'}</span>
                                    </div>
                                    {update.update_text && (
                                      <p className="item-description">{update.update_text}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="no-items">لا توجد تحديثات</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="password-modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="password-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="password-modal-header">
              <FaLock className="modal-header-icon" />
              <h3>تغيير كلمة المرور</h3>
            </div>
            <div className="password-modal-body">
              {passwordError && (
                <div className="password-error-message">
                  {passwordError}
                </div>
              )}
              <div className="password-input-group">
                <label>كلمة المرور الجديدة</label>
                <input
                  type="password"
                  placeholder="أدخل كلمة المرور الجديدة"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isUpdatingPassword}
                />
              </div>
              <div className="password-input-group">
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
            <div className="password-modal-footer">
              <button
                className="password-btn-primary"
                onClick={handlePasswordUpdate}
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? 'جاري التحديث...' : 'تأكيد التغيير'}
              </button>
              <button
                className="password-btn-secondary"
                onClick={() => {
                  setIsPasswordModalOpen(false);
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

      <style jsx>{`
        .lawyer-info-page {
          direction: rtl;
          min-height: 100vh;
          background: transparent;
        }

        /* Breadcrumb */
        .breadcrumb-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px 24px 0;
        }
        
        .profile-header {
          max-width: 1400px;
          margin: 16px auto 0;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          color: #64748b;
        }

        .breadcrumb a {
          color: #3b82f6;
          text-decoration: none;
          transition: color 0.2s;
        }

        .breadcrumb a:hover {
          color: #2563eb;
        }

        .breadcrumb-separator {
          color: #cbd5e1;
        }

        .breadcrumb-current {
          color: #1e293b;
          font-weight: 500;
        }

        /* Profile Header */
        .profile-header {
          position: relative;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          margin: 16px 24px 0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
        }

        .header-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          opacity: 0.95;
        }

        .header-content {
          position: relative;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 24px;
          color: white;
        }

        .profile-avatar-wrapper {
          flex-shrink: 0;
        }

        .profile-avatar {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 3px solid rgba(255, 255, 255, 0.3);
          overflow: hidden;
          background: rgba(255, 255, 255, 0.2);
        }

        .avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
        }

        .fallback-icon {
          font-size: 3rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .avatar-badge {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 28px;
          height: 28px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
          font-size: 0.75rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          cursor: pointer;
        }

        .profile-info {
          flex: 1;
        }

        .profile-name-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .profile-name {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          color: white;
        }

        .role-badge {
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 12px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.875rem;
          color: white;
          backdrop-filter: blur(10px);
          white-space: nowrap;
        }

        .header-actions {
          flex-shrink: 0;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          border-radius: 10px;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          white-space: nowrap;
        }
        
        .action-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .primary-btn {
          background: white;
          color: #3b82f6;
        }

        /* Main Content Layout */
        .content-wrapper {
          max-width: 1400px;
          margin: 24px auto;
          padding: 0;
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 20px;
        }

        /* Sidebar */
        .sidebar-section {
          position: sticky;
          top: 24px;
          height: fit-content;
        }

        .sidebar-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }

        .sidebar-header {
          padding: 16px 18px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .sidebar-header h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .sidebar-menu {
          padding: 8px;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 8px;
          cursor: pointer;
          color: #475569;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
          margin-bottom: 4px;
        }
        
        .menu-item:hover {
          background: #f1f5f9;
          color: #3b82f6;
        }

        .menu-item.active {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
        }

        .menu-icon {
          font-size: 1.125rem;
        }

        /* Content Section */
        .content-section {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .info-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }

        .card-header {
          padding: 18px 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-icon-wrapper {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
        }

        .header-icon {
          font-size: 1.5rem;
        }

        .card-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 3px 0;
        }

        .card-subtitle {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0;
        }

        .card-body {
          padding: 20px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .info-item {
          display: flex;
          gap: 10px;
          padding: 14px;
          background: #f8fafc;
          border-radius: 10px;
          transition: all 0.2s ease;
        }
        
        .info-item:hover {
          background: #f1f5f9;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .info-item.full-width {
          grid-column: 1 / -1;
        }

        .info-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.875rem;
          flex-shrink: 0;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
        }

        .info-content {
          flex: 1;
        }

        .info-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-value {
          font-size: 0.875rem;
          color: #1e293b;
          font-weight: 500;
          word-break: break-word;
        }

        .role-tag {
          display: inline-block;
          padding: 6px 14px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .sections-list {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .section-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f1f5f9;
          border-radius: 8px;
          color: #475569;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .section-badge-icon {
          color: #3b82f6;
          font-size: 1rem;
        }

        @media (max-width: 1024px) {
          .content-wrapper {
            grid-template-columns: 1fr;
          }

          .sidebar-section {
            position: static;
          }

          .header-content {
            flex-direction: column;
            text-align: center;
          }

          .profile-info {
            text-align: center;
          }

          .info-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .breadcrumb-container,
          .profile-header,
          .content-wrapper {
            margin-left: 16px;
            margin-right: 16px;
            padding-left: 0;
            padding-right: 0;
          }

          .profile-header {
            margin-top: 16px;
          }

          .header-content {
            padding: 24px;
          }

          .profile-name {
            font-size: 1.5rem;
          }

          .card-body {
            padding: 20px;
          }

          .info-item {
            padding: 16px;
          }
        }

        /* Password Modal */
        .password-modal-overlay {
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
          padding: 20px;
          backdrop-filter: blur(4px);
        }

        .password-modal-container {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 450px;
          animation: modalSlideIn 0.3s ease;
          direction: rtl;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .password-modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 24px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border-radius: 12px 12px 0 0;
        }

        .modal-header-icon {
          font-size: 1.25rem;
        }

        .password-modal-header h3 {
          font-size: 1.125rem;
          font-weight: 700;
          margin: 0;
        }

        .password-modal-body {
          padding: 24px;
        }

        .password-error-message {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 0.875rem;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .password-input-group {
          margin-bottom: 20px;
        }

        .password-input-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .password-input-group input {
          width: 100%;
          padding: 10px 14px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.9375rem;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .password-input-group input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .password-input-group input:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }

        .password-modal-footer {
          display: flex;
          gap: 12px;
          padding: 0 24px 24px;
        }

        .password-btn-primary {
          flex: 1;
          padding: 10px 20px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
        }

        .password-btn-primary:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .password-btn-secondary {
          flex: 1;
          padding: 10px 20px;
          background: #f3f4f6;
          color: #6b7280;
          border: none;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
        }

        .password-btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Cases Modal */
        .cases-modal-overlay {
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
          padding: 20px;
          backdrop-filter: blur(4px);
        }

        .cases-modal-container {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          animation: modalSlideIn 0.3s ease;
          direction: rtl;
        }

        .cases-modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 24px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border-radius: 16px 16px 0 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        .cases-modal-header h3 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
          flex: 1;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: white;
          font-size: 1.25rem;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cases-modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .loading-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #64748b;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(59, 130, 246, 0.2);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-icon {
          font-size: 3rem;
          color: #cbd5e1;
          margin-bottom: 16px;
        }

        .cases-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .case-card {
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .case-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .case-header:hover {
          background: #f1f5f9;
        }

        .case-title-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .case-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .case-client {
          font-size: 0.875rem;
          color: #64748b;
        }

        .case-meta {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .case-state {
          padding: 4px 12px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 600;
        }

        .expand-icon {
          font-size: 0.75rem;
          color: #64748b;
          transition: transform 0.2s;
        }

        .expand-icon.expanded {
          transform: rotate(180deg);
        }

        .case-details {
          padding: 20px;
          background: white;
          border-top: 1px solid #e2e8f0;
        }

        .detail-section {
          margin-bottom: 24px;
        }

        .detail-section:last-child {
          margin-bottom: 0;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 16px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid rgba(59, 130, 246, 0.2);
        }

        .section-icon {
          color: #3b82f6;
          font-size: 1rem;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .info-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #64748b;
        }

        .info-text {
          font-size: 0.875rem;
          color: #1e293b;
        }

        .items-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .item-card {
          background: #f8fafc;
          border-radius: 8px;
          padding: 12px;
          border: 1px solid #e2e8f0;
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .item-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1e293b;
        }

        .item-date {
          font-size: 0.8125rem;
          color: #64748b;
        }

        .item-description {
          font-size: 0.875rem;
          color: #475569;
          margin: 8px 0 4px 0;
          line-height: 1.5;
        }

        .item-time {
          font-size: 0.8125rem;
          color: #64748b;
        }

        .no-items {
          font-size: 0.875rem;
          color: #94a3b8;
          text-align: center;
          padding: 20px;
          background: #f8fafc;
          border-radius: 8px;
        }

        @media (max-width: 768px) {
          .cases-modal-container {
            max-width: 100%;
            max-height: 95vh;
            margin: 10px;
          }

          .case-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .case-meta {
            width: 100%;
            justify-content: space-between;
          }

          .info-row {
            flex-direction: column;
            gap: 4px;
          }

          .section-card {
            padding: 20px;
          }

          .user-card {
            padding: 24px 20px;
          }

          .password-modal-container {
            max-width: 100%;
            margin: 0 10px;
          }
        }
      `}</style>
    </Layout>
  );
};

export default withAuth(LawyerInfo, ['can_add_lawyers']);

