/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../lib/api';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';
import Layout from '../../components/layout/Layout';
import { useRouter } from 'next/router';
import { useSubscription } from '../../context/SubscriptionContext';

const AddNewLawyerUser = () => {
  const [newLawyer, setNewLawyer] = useState({
    lawyer_name: '',
    id_card_number: '',
    file_number: '',
    retire_number: '',
    registration_address: '',
    affiliation_date: '',
    effective_until: '',
    validity: '',
    job_title: '',
  });

  const [idCardImage, setIdCardImage] = useState(null);
  const [templateImage, setTemplateImage] = useState(null);
  const [lawyers, setLawyers] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [selectedProfile, setSelectedProfile] = useState('');
  const [permissionProfiles, setPermissionProfiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lawyerCount, setLawyerCount] = useState(0);
  const [planCheckError, setPlanCheckError] = useState(null);
  const { maxLawyers, loading: subLoading, isReadOnly, planName } = useSubscription();

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewLawyer((prevLawyer) => ({ ...prevLawyer, [name]: value }));
  };

  const handleIdCardImageChange = (event) => {
    const image = event.target.files[0];
    if (image) {
      setIdCardImage(image);
    }
  };

  const handleTemplateImageChange = (event) => {
    const image = event.target.files[0];
    if (image) {
      setTemplateImage(image);
    }
  };

  const fetchLawyerUsers = async () => {
    try {
      const { data, error } = await supabase.from('lawyer_users').select('*');

      if (error) {
        console.error('Error fetching lawyer user data:', error);
      } else {
        setLawyers(data);
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  };

  const fetchPermissionProfiles = async () => {
    try {
      const { data, error } = await supabase.from('permission_profiles').select('*');

      if (error) {
        console.error('Error fetching permission profiles:', error);
      } else {
        setPermissionProfiles(data);
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  };

  const fetchLawyerCount = async () => {
    try {
      const user = supabase.auth.user();
      if (!user) return;
      const { data, error } = await supabase
        .from('lawyer_users')
        .select('id')
        .eq('admin_user_id', user.id);
      if (!error && data) {
        setLawyerCount(data.length);
      }
    } catch (err) {
      console.error('Error fetching lawyer count:', err);
    }
  };

  useEffect(() => {
    fetchLawyerUsers();
    fetchPermissionProfiles();
    fetchLawyerCount();
  }, []);

  const handleSaveClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let idCardImageUrl = '';
      let templateImageUrl = '';

      if (idCardImage) {
        const idCardImageFileName = `${Date.now()}_id_card_${idCardImage.name}`;
        const idCardImagePath = `images/${idCardImageFileName}`;

        const { data: idCardImageData, error: idCardImageError } = await supabase.storage
          .from('images')
          .upload(idCardImagePath, idCardImage);

        if (idCardImageError) {
          throw new Error('Error uploading ID card image: ' + idCardImageError.message);
        }

        const { publicURL: idCardPublicURL } = await supabase.storage
          .from('images')
          .getPublicUrl(idCardImagePath);

        idCardImageUrl = idCardPublicURL;
      }

      if (templateImage) {
        const templateImageFileName = `${Date.now()}_template_${templateImage.name}`;
        const templateImagePath = `images/${templateImageFileName}`;

        const { data: templateImageData, error: templateImageError } = await supabase.storage
          .from('images')
          .upload(templateImagePath, templateImage);

        if (templateImageError) {
          throw new Error('Error uploading template image');
        }

        const { publicURL: templatePublicURL } = await supabase.storage
          .from('images')
          .getPublicUrl(templateImagePath);

        templateImageUrl = templatePublicURL;
      }

      const currentAdminId = supabase.auth.user().id;
      const lawyerUserDataToInsert = {
        ...newLawyer,
        email: email,
        id_card_picture_url: idCardImageUrl,
        template_picture_url: templateImageUrl,
        roles: selectedProfile,
        admin_user_id: currentAdminId
      };

      const { data: insertedLawyerUserData, error: insertError } = await supabase
        .from('lawyer_users')
        .insert([lawyerUserDataToInsert])
        .select();

      if (insertError) {
        throw new Error('Error inserting lawyer user data');
      }

      const createUserResponse = await fetch(getApiUrl('/api/createLawyerUser'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, adminUserId: currentAdminId }),
      });

      const createUserResult = await createUserResponse.json();

      if (createUserResult.error) {
        // If server returned a plan limit error, show it clearly
        if (createUserResult.code === 'PLAN_NO_LAWYERS' || createUserResult.code === 'LAWYER_LIMIT_REACHED' || createUserResult.code === 'SUBSCRIPTION_INACTIVE') {
          setPlanCheckError(createUserResult.error);
          // Clean up the already-inserted lawyer_users row since auth creation was blocked
          if (insertedLawyerUserData && insertedLawyerUserData[0]?.id) {
            await supabase.from('lawyer_users').delete().eq('id', insertedLawyerUserData[0].id);
          }
          return;
        }
        throw new Error(createUserResult.error);
      }

      const { user } = createUserResult;
      const newLawyerUserId = user.id;

      const { error: metadataError } = await supabase
        .from('user_metadata')
        .insert([
          {
            user_id: newLawyerUserId,
            username: newLawyer.lawyer_name,
            email: email,
            role: selectedProfile,
            admin_user_id: currentAdminId,
            new_lawyer_id: newLawyerUserId,
            job_title: newLawyer.job_title
          },
        ]);

      if (metadataError) {
        console.error('Error inserting user metadata:', metadataError);
      }

      setNewLawyer({
        lawyer_name: '',
        id_card_number: '',
        file_number: '',
        retire_number: '',
        registration_address: '',
        affiliation_date: '',
        effective_until: '',
        validity: '',
        job_title: '',
      });

      setEmail('');
      setPassword('');
      setIdCardImage(null);
      setTemplateImage(null);

      // Show success message
      setIsSuccess(true);

      // Redirect to lawyer page after 3 seconds
      setTimeout(() => {
        const newLawyerId = insertedLawyerUserData && insertedLawyerUserData[0]?.id;
        if (newLawyerId) {
          router.push(`/lawyer/lawyer?newLawyerId=${newLawyerId}`);
        } else {
          router.push('/lawyer/lawyer');
        }
      }, 3000);

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCreateLawyer = !subLoading && maxLawyers > 0 && lawyerCount < maxLawyers && !isReadOnly;

  return (
    <Layout>
      <div className="user-settings-page">
        {!subLoading && !canCreateLawyer ? (
          <div className="form-container" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '32px' }}>🔒</div>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                {maxLawyers === 0 ? 'الباقة الحالية لا تتيح إضافة محامين' : `لقد وصلت إلى الحد الأقصى (${maxLawyers} محامي)`}
              </h2>
              <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '8px' }}>
                الباقة الحالية: <strong>{planName}</strong>
              </p>
              <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px' }}>
                {maxLawyers === 0
                  ? 'للتمكن من إضافة محامين، يرجى الترقية إلى الباقة المتقدمة أو الفترة التجريبية.'
                  : 'لإضافة المزيد من المحامين، يرجى ترقية باقتك.'}
              </p>
              <button
                onClick={() => router.push('/settings/subscription')}
                style={{ padding: '12px 32px', borderRadius: '10px', background: '#2563EB', color: 'white', fontWeight: '700', fontSize: '15px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                عرض الباقات والترقية
              </button>
            </div>
          </div>
        ) : (
        <div className="form-container">
          <div className="form-header">
            <div className="form-header-content">
              <div>
                <h1 className="form-title">إضافة محامي جديد</h1>
                <p className="form-subtitle">أدخل معلومات المحامي الجديد لإضافته إلى النظام
                  {maxLawyers > 0 && <span style={{ color: '#64748b', marginRight: '8px' }}>({lawyerCount}/{maxLawyers})</span>}
                </p>
              </div>
              <div className="form-actions">
                <button onClick={handleSaveClick} className="save-button" disabled={isSubmitting}>
                  {isSubmitting ? 'جاري إنشاء حساب المحامي...' : isSuccess ? 'تم إنشاء الحساب بنجاح' : 'حفظ البيانات'}
                </button>
              </div>
            </div>
            {planCheckError && (
              <div style={{ marginTop: '12px', padding: '12px 16px', background: '#FEF2F2', color: '#991B1B', borderRadius: '8px', fontSize: '14px', fontWeight: '600', border: '1px solid #FECACA' }}>
                {planCheckError}
              </div>
            )}
          </div>
          <div className="form-grid">
            <div className="field" style={{ direction: 'rtl' }}>
              <label className="label" style={{ direction: 'rtl' }}> البريد الإلكتروني:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="input"
              />
            </div>
            <div className="field" style={{ direction: 'rtl' }}>
              <label className="label" style={{ direction: 'rtl' }}>كلمة المرور:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="input"
              />
            </div>
            <div className="field" style={{ direction: 'rtl' }}>
              <label className="label" style={{ direction: 'rtl' }}>
                اختر الفئة:
              </label>
              <select
                name="profile"
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
                className="select"
                required
              >
                <option value="">اختر الفئة</option>
                {permissionProfiles.map((profile) => (
                  <option key={profile.id} value={profile.profile_name}>
                    {profile.profile_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field" style={{ direction: 'rtl' }}>
              <label className="label" style={{ direction: 'rtl' }}>
                المسمى الوظيفي:
              </label>
              <select
                name="job_title"
                value={newLawyer.job_title}
                onChange={handleInputChange}
                className="select"
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
              </select>
            </div>

            <div className="field" style={{ direction: 'rtl' }}>
              <label className="label" style={{ direction: 'rtl' }}>رقم هوية المحامي :</label>
              <input
                type="text"
                name="id_card_number"
                value={newLawyer.id_card_number}
                onChange={handleInputChange}
                className="input"
              />
            </div>
            <div className="field" style={{ direction: 'rtl' }}>
              <label className="label" style={{ direction: 'rtl' }}>أسم المحامي :</label>
              <input
                type="text"
                name="lawyer_name"
                value={newLawyer.lawyer_name}
                onChange={handleInputChange}
                className="input"
              />
            </div>
            <div className="field" style={{ direction: 'rtl' }}>
              <label className="label" style={{ direction: 'rtl' }}>رقم الاضبارة :</label>
              <input
                type="text"
                name="file_number"
                value={newLawyer.file_number}
                onChange={handleInputChange}
                className="input"
              />
            </div>
            <div className="field" style={{ direction: 'rtl' }}>
              <label className="label" style={{ direction: 'rtl' }}>رقم التقاعد	:</label>
              <input
                type="text"
                name="retire_number"
                value={newLawyer.retire_number}
                onChange={handleInputChange}
                className="input"
              />
            </div>
            <div className="field" style={{ direction: 'rtl' }}>
              <label className="label" style={{ direction: 'rtl' }}>غرفة التسجيل	:</label>
              <textarea
                name="registration_address"
                value={newLawyer.registration_address}
                onChange={handleInputChange}
                className="textarea"
                style={{ resize: 'none' }}
                rows="1"
              />
            </div>
            <div className="field" style={{ direction: 'rtl' }}>
              <label className="label" style={{ direction: 'rtl' }}>تاريخ الانتماء :</label>
              <input
                type="date"
                name="affiliation_date"
                value={newLawyer.affiliation_date}
                onChange={handleInputChange}
                className="input date-input"
                onClick={(e) => e.target.showPicker?.()}
              />
            </div>
            <div className="field" style={{ direction: 'rtl' }}>
              <label className="label" style={{ direction: 'rtl' }}>نافذة لغاية	:</label>
              <input
                type="date"
                name="effective_until"
                value={newLawyer.effective_until}
                onChange={handleInputChange}
                className="input date-input"
                onClick={(e) => e.target.showPicker?.()}
              />
            </div>
            <div className="field" style={{ direction: 'rtl' }}>
              <label className="label" style={{ direction: 'rtl' }}>الصلاحية :</label>
              <select
                name="validity"
                value={newLawyer.validity}
                onChange={handleInputChange}
                className="select"
              >
                <option value="">Select validity</option>
                <option value="أ">أ</option>
                <option value="ب">ب</option>
                <option value="ج">ج</option>
              </select>
            </div>
            <div className="file-upload-group">
              <div className="field" style={{ direction: 'rtl' }}>
                <label className="label" style={{ direction: 'rtl' }}>تحميل صورة الهوية :</label>
                <input
                  type="file"
                  onChange={handleIdCardImageChange}
                  className="file-input"
                />
              </div>
              <div className="field" style={{ direction: 'rtl' }}>
                <label className="label" style={{ direction: 'rtl' }}>تحميل صورة البروفايل:</label>
                <input
                  type="file"
                  onChange={handleTemplateImageChange}
                  className="file-input"
                />
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {isSubmitting && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p className="loading-text">جاري إنشاء حساب المحامي...</p>
          </div>
        </div>
      )}

      {isSuccess && (
        <div className="success-overlay">
          <div className="success-content">
            <div className="success-icon">✓</div>
            <p className="success-text">تم إنشاء حساب المحامي بنجاح</p>
            <p className="success-subtext">جاري التوجيه إلى صفحة المحامين...</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .user-settings-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
          direction: rtl;
        }

        .form-container {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
          padding: 2rem;
          margin-bottom: 2rem;
          border: 1px solid #e5e7eb;
        }

        .form-header {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #f3f4f6;
        }

        .form-header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 2rem;
        }

        .form-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .form-subtitle {
          font-size: 0.9375rem;
          color: #6b7280;
          margin: 0;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .file-upload-group {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          grid-column: 1 / -1;
        }

        .date-input {
          cursor: pointer;
        }

        .date-input::-webkit-calendar-picker-indicator {
          cursor: pointer;
          opacity: 1;
        }

        .field {
          display: flex;
          flex-direction: column;
        }

        .label {
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #374151;
          font-size: 0.875rem;
        }

        .input,
        .textarea,
        .select {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          width: 100%;
          font-size: 0.9375rem;
          transition: all 0.2s ease;
          background-color: #ffffff;
          color: #1f2937;
        }

        .input:focus,
        .textarea:focus,
        .select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .input:hover,
        .textarea:hover,
        .select:hover {
          border-color: #9ca3af;
        }

        .textarea {
          resize: none !important;
          min-height: auto;
          height: auto;
          font-family: inherit;
          overflow-y: auto;
          line-height: 1.5;
        }

        .textarea::-webkit-resizer {
          display: none !important;
        }

        .file-input {
          padding: 0.75rem;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          background-color: #f9fafb;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }

        .file-input:hover {
          border-color: #3b82f6;
          background-color: #eff6ff;
        }

        .file-input::file-selector-button {
          padding: 0.5rem 1rem;
          margin-left: 0.5rem;
          border: none;
          border-radius: 6px;
          background-color: #3b82f6;
          color: white;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.875rem;
          transition: background-color 0.2s ease;
        }

        .file-input::file-selector-button:hover {
          background-color: #2563eb;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          align-items: flex-start;
          flex-shrink: 0;
        }

        .save-button {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 2rem;
          cursor: pointer;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
          white-space: nowrap;
        }

        .save-button:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
          transform: translateY(-1px);
        }

        .save-button:active {
          transform: translateY(0);
        }

        .loading-overlay {
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

        .loading-content {
          background: white;
          padding: 2rem 3rem;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-text {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .success-overlay {
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

        .success-content {
          background: white;
          padding: 2.5rem 3rem;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          text-align: center;
        }

        .success-icon {
          width: 60px;
          height: 60px;
          background: #10b981;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: bold;
        }

        .success-text {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .success-subtext {
          font-size: 0.9375rem;
          color: #6b7280;
          margin: 0;
        }


        @media (max-width: 1024px) {
          .form-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .file-upload-group {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .user-settings-page {
            padding: 1rem;
            padding-bottom: calc(90px + env(safe-area-inset-bottom)) !important;
          }

          .form-container {
            padding: 1.5rem;
          }

          .form-header-content {
            flex-direction: column;
            gap: 1.5rem;
          }

          .form-actions {
            width: 100%;
            justify-content: flex-start;
          }

          .form-title {
            font-size: 1.5rem;
          }

          .form-grid {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }

          .file-upload-group {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .form-container {
            padding: 1rem;
          }

          .form-title {
            font-size: 1.25rem;
          }

          .save-button {
            width: 100%;
            padding: 0.875rem 1.5rem;
          }
        }
      `}</style>
    </Layout>
  );
};

export default withAuth(AddNewLawyerUser, ['can_add_lawyers'], true);
