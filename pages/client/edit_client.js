import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';
import { useRouter } from 'next/router';
import {
  AiOutlineUser,
  AiOutlineMail,
  AiOutlinePhone,
  AiOutlineHome,
  AiOutlineIdcard,
  AiOutlineFileText,
  AiOutlineGlobal,
  AiOutlinePicture,
  AiOutlineSave,
  AiOutlineArrowRight
} from 'react-icons/ai';
import ContactPicker from '../../components/ContactPicker';

const EditClient = () => {
  const router = useRouter();
  const [clientInfo, setClientInfo] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const governorates = [
    'بغداد',
    'أربيل',
    'الانبار',
    'بابل',
    'بصرة',
    'دهوك',
    'ذي قار',
    'ديالى',
    'كربلاء',
    'كركوك',
    'ميسان',
    'النجف',
    'نينوى',
    'واسط',
  ];

  const legalForms = [
    'فرد',
    'شركة',
    'مؤسسة',
    'جمعية',
    'أخرى'
  ];

  useEffect(() => {
    const fetchClientInfo = async () => {
      try {
        setLoading(true);
        const clientId = router.query.id;
        if (!clientId) return;

        const { data, error } = await supabase
          .from('clients_data')
          .select('*')
          .eq('id', clientId)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setClientInfo(data);
          setClientId(clientId);

          // Check authorization - allow both admin and lawyer
          try {
            // Use the older API method that's available in this Supabase version
            const user = supabase.auth.user();

            if (!user) {
              setErrorMessage('يجب تسجيل الدخول أولاً');
              setLoading(false);
              return;
            }

            const userId = user.id;
            console.log('Current user ID:', userId);
            console.log('Client admin_id:', data.admin_id);
            console.log('Client lawyer_id:', data.lawyer_id);

            // Get user metadata to check role and admin_id (optional - don't fail if this errors)
            let userMetadata = null;
            try {
              const { data: metadata, error: metaError } = await supabase
                .from('user_metadata')
                .select('role, admin_user_id, new_lawyer_id')
                .eq('user_id', userId)
                .single();

              if (!metaError && metadata) {
                userMetadata = metadata;
                console.log('User metadata:', userMetadata);
              }
            } catch (metaErr) {
              console.log('Could not fetch user metadata, using direct check:', metaErr);
              // Continue with direct check
            }

            // Check if user is admin or assigned lawyer
            let isAuthorizedUser = false;

            // First, try direct check (simplest and most reliable)
            if (data.admin_id === userId || data.lawyer_id === userId) {
              isAuthorizedUser = true;
              console.log('User authorized via direct check');
            }
            // If user metadata is available, do additional checks
            else if (userMetadata) {
              // If user is admin (الفئة 1), check if they own this client
              if (userMetadata.role === 'الفئة 1' || userMetadata.role === 'Admin') {
                const adminId = userMetadata.admin_user_id || userId;
                isAuthorizedUser = data.admin_id === adminId || data.admin_id === userId;
                console.log('Admin check:', { adminId, clientAdminId: data.admin_id, isAuthorizedUser });
              }
              // If user is lawyer (الفئة 2), check if they are assigned to this client
              else if (userMetadata.role === 'الفئة 2' || userMetadata.role === 'Lawyer') {
                isAuthorizedUser = data.lawyer_id === userId || data.admin_id === userMetadata.admin_user_id;
                console.log('Lawyer check:', { lawyerId: data.lawyer_id, userId, clientAdminId: data.admin_id, userAdminId: userMetadata.admin_user_id, isAuthorizedUser });
              }
            }

            if (isAuthorizedUser) {
              setIsAuthorized(true);
              console.log('User is authorized to edit');
            } else {
              console.log('User is NOT authorized to edit');
              setErrorMessage('غير مصرح لك بتعديل معلومات هذا العميل');
            }
          } catch (authError) {
            console.error('Authorization error:', authError);
            // Don't set error message here, let the outer catch handle it
            throw authError;
          }
        } else {
          setErrorMessage('العميل غير موجود');
        }
      } catch (error) {
        console.error('Error fetching client info:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          stack: error.stack
        });
        const errorMessage = error.message || 'خطأ غير معروف';
        setErrorMessage(`حدث خطأ أثناء تحميل معلومات العميل: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    if (router.query.id) {
      fetchClientInfo();
    }
  }, [router.query.id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setClientInfo((prevState) => ({
      ...prevState,
      [name]: value,
    }));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload image immediately
      try {
        setIsUploadingImage(true);
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const filePath = `images/${fileName}`;
        const { error: uploadError } = await supabase
          .storage
          .from('images')
          .upload(filePath, file);

        if (uploadError) {
          throw new Error('فشل في تحميل الصورة: ' + uploadError.message);
        }

        const { data } = supabase.storage.from('images').getPublicUrl(filePath);
        
        setClientInfo((prevState) => ({
          ...prevState,
          image_url: data.publicURL || data.publicUrl,
        }));
      } catch (error) {
        console.error('Error uploading image:', error);
        setErrorMessage('حدث خطأ أثناء رفع الصورة: ' + error.message);
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthorized) {
      setErrorMessage('غير مصرح لك بتعديل معلومات هذا العميل');
      return;
    }

    if (!clientInfo.client_name || !clientInfo.email) {
      setErrorMessage('اسم الموكل والبريد الإلكتروني مطلوبان');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientInfo.email.trim())) {
      setErrorMessage('الرجاء إدخال بريد إلكتروني صحيح');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');

      // Upload image logic was moved to handleFileChange
      let imageURL = clientInfo.image_url || '';

      // Prepare update data - exclude admin_id and other non-editable fields
      const updateData = {
        client_name: clientInfo.client_name?.trim() || '',
        email: clientInfo.email?.trim() || '',
        phone: clientInfo.phone?.trim() || '',
        address: clientInfo.address?.trim() || '',
        id_number: clientInfo.id_number?.trim() || '',
        governorate_id: clientInfo.governorate_id || '',
        legal_form: clientInfo.legal_form || '',
        notes: clientInfo.notes?.trim() || '',
        image_url: imageURL,
        type: clientInfo.type || '',
        connection_name: clientInfo.connection_name?.trim() || '',
        connection_mobile: clientInfo.connection_mobile?.trim() || '',
        connection_address: clientInfo.connection_address?.trim() || '',
        conn_email: clientInfo.conn_email?.trim() || '',
      };

      const { error } = await supabase
        .from('clients_data')
        .update(updateData)
        .eq('id', clientId);

      if (error) {
        throw error;
      }

      setSuccessMessage('تم تحديث معلومات العميل بنجاح');
      setTimeout(() => {
        router.push(`/client/view-client?id=${clientId}`);
      }, 1500);
    } catch (error) {
      console.error('Error updating client information:', error.message);
      setErrorMessage('حدث خطأ أثناء تحديث معلومات العميل: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Define editable client fields with their configurations
  const clientFields = [
    {
      key: 'client_name',
      label: 'اسم الموكل',
      icon: <AiOutlineUser />,
      type: 'text',
      required: true,
      placeholder: 'أدخل اسم الموكل'
    },
    {
      key: 'email',
      label: 'البريد الإلكتروني',
      icon: <AiOutlineMail />,
      type: 'email',
      required: true,
      placeholder: 'example@email.com'
    },
    {
      key: 'phone',
      label: 'رقم الجوال',
      icon: <AiOutlinePhone />,
      type: 'contact_picker',
      required: false,
      placeholder: '07XX XXX XXXX'
    },
    {
      key: 'id_number',
      label: 'رقم الهوية',
      icon: <AiOutlineIdcard />,
      type: 'text',
      required: false,
      placeholder: 'أدخل رقم الهوية'
    },
    {
      key: 'address',
      label: 'العنوان',
      icon: <AiOutlineHome />,
      type: 'text',
      required: false,
      placeholder: 'أدخل العنوان الكامل'
    },
    {
      key: 'governorate_id',
      label: 'المحافظة',
      icon: <AiOutlineGlobal />,
      type: 'select',
      required: false,
      options: governorates
    },
    {
      key: 'legal_form',
      label: 'الشكل القانوني',
      icon: <AiOutlineFileText />,
      type: 'select',
      required: false,
      options: legalForms
    },
    {
      key: 'image_url',
      label: 'رابط الصورة',
      icon: <AiOutlinePicture />,
      type: 'image_upload',
      required: false,
      placeholder: 'https://example.com/image.jpg'
    },
    {
      key: 'notes',
      label: 'ملاحظات',
      icon: <AiOutlineFileText />,
      type: 'textarea',
      required: false,
      placeholder: 'أدخل أي ملاحظات إضافية'
    }
  ];

  // Contact info fields
  const contactFields = [
    {
      key: 'connection_name',
      label: 'اسم جهة الاتصال',
      icon: <AiOutlineUser />,
      type: 'text',
      required: false,
      placeholder: 'أدخل اسم جهة الاتصال'
    },
    {
      key: 'connection_mobile',
      label: 'هاتف جهة الاتصال',
      icon: <AiOutlinePhone />,
      type: 'contact_picker',
      required: false,
      placeholder: '07XX XXX XXXX'
    },
    {
      key: 'connection_address',
      label: 'عنوان جهة الاتصال',
      icon: <AiOutlineHome />,
      type: 'text',
      required: false,
      placeholder: 'أدخل عنوان جهة الاتصال'
    },
    {
      key: 'conn_email',
      label: 'البريد الإلكتروني لجهة الاتصال',
      icon: <AiOutlineMail />,
      type: 'email',
      required: false,
      placeholder: 'example@email.com'
    }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>جاري تحميل معلومات العميل...</p>
        </div>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 1rem;
          }
          .loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #f3f4f6;
            border-top: 4px solid #4f46e5;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </Layout>
    );
  }

  if (!clientInfo) {
    return (
      <Layout>
        <div className="error-container">
          <p>العميل غير موجود</p>
        </div>
        <style jsx>{`
          .error-container {
            text-align: center;
            padding: 2rem;
            color: #ef4444;
          }
        `}</style>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="edit-client-page">
        <div className="page-header">
          <div className="page-header-row">
            <h1 className="page-title">تعديل معلومات الموكل</h1>
            <button
              type="button"
              className="save-button"
              disabled={saving || !isAuthorized}
              onClick={handleFormSubmit}
            >
              <AiOutlineSave className="button-icon" />
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </div>

        <div className="form-container">
          {errorMessage && (
            <div className="message error-message">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="message success-message">
              {successMessage}
            </div>
          )}

          {clientInfo && (
            <form className="edit-form" onSubmit={handleFormSubmit}>
              <div className="form-grid">
                {clientFields.map((field) => {
                  const value = clientInfo[field.key] || '';
                  return (
                    <div className="form-field" key={field.key}>
                      <label className="field-label">
                        <span className="field-icon">{field.icon}</span>
                        {field.label}
                        {field.required && <span className="required">*</span>}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          name={field.key}
                          value={value}
                          onChange={handleInputChange}
                          className="form-input"
                        >
                          <option value="">اختر {field.label}</option>
                          {field.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          name={field.key}
                          value={value}
                          onChange={handleInputChange}
                          className="form-input textarea-input"
                          placeholder={field.placeholder}
                          rows={4}
                          draggable="false"
                          onDragStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            return false;
                          }}
                          onDrag={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            return false;
                          }}
                          onDragEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            return false;
                          }}
                          onMouseDown={(e) => {
                            if (e.button === 0) {
                              e.stopPropagation();
                            }
                          }}
                        />
                      ) : field.type === 'image_upload' ? (
                        <>
                          <div className="image-upload-section">
                            {isUploadingImage ? (
                              <div className="image-uploading-msg">
                                <div className="small-spinner"></div>
                                <span>جاري رفع الصورة...</span>
                              </div>
                            ) : clientInfo.image_url && clientInfo.image_url.startsWith('http') ? (
                              <a 
                                href={clientInfo.image_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="image-link active-link"
                              >
                                <AiOutlinePicture className="image-link-icon" />
                                <span>رابط الصورة</span>
                              </a>
                            ) : null}
                            <div className="file-upload-container">
                              <input
                                type="file"
                                onChange={handleFileChange}
                                accept="image/*"
                                className="file-input"
                                id="image-upload"
                              />
                              <label htmlFor="image-upload" className="file-upload-label">
                                <AiOutlinePicture className="upload-icon" />
                                <span>{clientInfo.image_url ? 'رفع صورة جديدة' : 'اختر صورة'}</span>
                              </label>
                            </div>
                          </div>
                        </>
                      ) : field.type === 'contact_picker' ? (
                        <ContactPicker
                          value={value}
                          onChange={(val) => handleInputChange({ target: { name: field.key, value: val } })}
                          placeholder={field.placeholder}
                        />
                      ) : (
                        <input
                          type={field.type}
                          name={field.key}
                          value={value}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder={field.placeholder}
                          required={field.required}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* معلومات جهة الاتصال */}
              <div className="contact-section-header">
                <AiOutlineUser className="section-icon" />
                <h2>معلومات جهة الاتصال</h2>
              </div>
              <div className="form-grid">
                {contactFields.map((field) => {
                  const value = clientInfo[field.key] || '';
                  return (
                    <div className="form-field" key={field.key}>
                      <label className="field-label">
                        <span className="field-icon">{field.icon}</span>
                        {field.label}
                      </label>
                      <input
                        type={field.type}
                        name={field.key}
                        value={value}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder={field.placeholder}
                      />
                    </div>
                  );
                })}
              </div>


            </form>
          )}
        </div>
      </div>

      <style jsx>{`
        .edit-client-page {
          direction: rtl;
          min-height: 100vh;
          padding: 2rem;
        }

        .page-header {
          margin-bottom: 32px;
        }

        .page-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid #3b82f6;
        }

        .page-title {
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .page-note {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .form-container {
          background: white;
          border-radius: 0.75rem;
          padding: 2.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .message {
          padding: 1rem 1.5rem;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
          font-size: 0.9375rem;
          font-weight: 500;
          font-family: "Noto Kufi Arabic", "Cairo", "Almarai", sans-serif;
        }

        .error-message {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .success-message {
          background: #d1fae5;
          color: #059669;
          border: 1px solid #a7f3d0;
        }

        .edit-form {
          width: 100%;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .contact-section-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .contact-section-header h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
          font-family: "Noto Kufi Arabic", "Cairo", "Almarai", sans-serif;
        }

        .section-icon {
          width: 1.5rem;
          height: 1.5rem;
          color: #4f46e5;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .field-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #374151;
          font-family: "Noto Kufi Arabic", "Cairo", "Almarai", sans-serif;
        }

        .field-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #4f46e5;
        }

        .required {
          color: #ef4444;
          margin-right: 0.25rem;
        }

        .form-input {
          padding: 0.625rem 0.875rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-family: "Noto Kufi Arabic", "Cairo", "Almarai", sans-serif;
          color: #1f2937;
          background: white;
          transition: all 0.2s ease;
          width: 100%;
          max-width: 300px;
        }

        select.form-input {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: left 10px center;
          padding-right: 10px;
          padding-left: 30px;
        }

        .form-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-input::placeholder {
          color: #9ca3af;
        }

        .textarea-input {
          resize: none !important;
          min-height: 80px;
          max-height: 150px;
          overflow-y: auto;
          -webkit-user-drag: none !important;
          -khtml-user-drag: none !important;
          -moz-user-drag: none !important;
          -o-user-drag: none !important;
          user-drag: none !important;
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          user-select: text;
          pointer-events: auto;
        }
        
        .textarea-input::-webkit-resizer {
          display: none !important;
        }
        
        .textarea-input::selection {
          background: rgba(79, 70, 229, 0.2);
        }
        
        .textarea-input:active,
        .textarea-input:focus {
          resize: none !important;
        }

        .save-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.5rem;
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          font-family: "Noto Kufi Arabic", "Cairo", "Almarai", sans-serif;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
          white-space: nowrap;
        }

        .save-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
          box-shadow: 0 4px 8px rgba(79, 70, 229, 0.3);
          transform: translateY(-1px);
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .button-icon {
          width: 1.125rem;
          height: 1.125rem;
        }

        .file-upload-container {
          position: relative;
        }

        .file-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .file-upload-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem 0.875rem;
          border: 2px dashed #d1d5db;
          border-radius: 0.5rem;
          background: #f9fafb;
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: "Noto Kufi Arabic", "Cairo", "Almarai", sans-serif;
        }

        .file-upload-label:hover {
          border-color: #4f46e5;
          background: #eff6ff;
          color: #4f46e5;
        }

        .upload-icon {
          width: 1.25rem;
          height: 1.25rem;
        }

        .image-upload-section {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .image-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.875rem;
          background: #eff6ff;
          color: #4f46e5;
          border: 1px solid #c7d2fe;
          border-radius: 0.5rem;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          font-family: "Noto Kufi Arabic", "Cairo", "Almarai", sans-serif;
          transition: all 0.2s ease;
          width: fit-content;
        }

        .image-link:hover {
          background: #e0e7ff;
          border-color: #a5b4fc;
        }

        .image-link-icon {
          width: 1.125rem;
          height: 1.125rem;
        }

        .image-uploading-msg {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.875rem;
          background: #f8fafc;
          color: #64748b;
          border: 1px dashed #cbd5e1;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          font-family: "Noto Kufi Arabic", "Cairo", "Almarai", sans-serif;
        }

        .small-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #cbd5e1;
          border-top: 2px solid #4f46e5;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @media (max-width: 768px) {
          .edit-client-page {
            padding: 1rem;
          }

          .page-header {
            padding: 1rem 1.5rem;
          }

          .header-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .page-title {
            font-size: 1.5rem;
          }

          .form-container {
            padding: 1.5rem;
          }

          .form-grid {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }

          .page-header-row {
            flex-wrap: wrap;
            gap: 0.75rem;
          }

          .save-button {
            padding: 0.5rem 1rem;
            font-size: 0.8rem;
          }
        }

        @media (max-width: 480px) {
          .page-title {
            font-size: 1.25rem;
          }

          .form-container {
            padding: 1rem;
          }
        }
      `}</style>
    </Layout>
  );
};

export default withAuth(EditClient, ['can_view_clients'], true);
