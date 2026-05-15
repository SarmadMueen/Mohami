import React, { useState } from 'react';
import Layout from '../../components/layout/Layout';
import { supabase } from '../../lib/initSupabase';
import { useRouter } from 'next/router';
import withAuth from '../../lib/withAuth';
import { checkStorageLimit } from '../../lib/storageUtils';
import { getApiUrl } from '../../lib/api';
import Head from 'next/head';
import { FiSave, FiUser, FiMail, FiPhone, FiMapPin, FiFileText, FiImage, FiX, FiUserCheck, FiGlobe, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import ContactPicker from '../../components/ContactPicker';

const AddClientForm = () => {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Client Portal state
  const [portalEnabled, setPortalEnabled] = useState(false);
  const [portalEmail, setPortalEmail] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
  const [showPortalPassword, setShowPortalPassword] = useState(false);

  const initialClientState = {
    client_name: '',
    email: '',
    phone: '',
    address: '',
    image_url: '',
    governorate_id: '',
    notes: '',
    id_number: '',
    legal_form: '',
    type: '',
    connection_name: '',
    connection_mobile: '',
    connection_address: '',
    conn_email: '',
  };

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

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const [newClient, setNewClient] = useState(initialClientState);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewClient((prevClient) => ({ ...prevClient, [name]: value }));
    // Clear messages when user starts typing
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSave = async (event) => {
    if (event) event.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Validate mandatory fields
      if (!newClient.client_name || newClient.client_name.trim() === '') {
        throw new Error('اسم الموكل مطلوب');
      }
      if (!newClient.legal_form) {
        throw new Error('الشكل القانوني مطلوب');
      }
      if (!newClient.type) {
        throw new Error('نوع الموكل مطلوب');
      }

      const user = supabase.auth.user();
      if (!user) {
        throw new Error('المستخدم غير مسجل الدخول');
      }
      const userId = user.id;

      // Fetch admin and lawyer IDs from user_metadata
      const { data: userMetadata, error: userMetadataError } = await supabase
        .from('user_metadata')
        .select('admin_user_id, new_lawyer_id')
        .or(`admin_user_id.eq.${userId},new_lawyer_id.eq.${userId}`);

      if (userMetadataError) {
        throw new Error('خطأ في جلب بيانات المستخدم: ' + userMetadataError.message);
      }

      let adminId = null;
      let lawyerId = null;

      if (!userMetadata || userMetadata.length === 0) {
        console.warn('User metadata not found for ID:', userId);
        // Fallback: If no metadata found, assume the user is the admin (for dev environments)
        adminId = userId;
        lawyerId = null;
      } else {
        if (userMetadata[0].admin_user_id === userId) {
          adminId = userMetadata[0].admin_user_id;
          lawyerId = userMetadata[0].new_lawyer_id;
        } else if (userMetadata[0].new_lawyer_id === userId) {
          adminId = userMetadata[0].admin_user_id;
          lawyerId = userMetadata[0].new_lawyer_id;
        } else {
          adminId = userMetadata[0].admin_user_id || userId;
          lawyerId = userMetadata[0].new_lawyer_id;
        }
      }

      if (selectedImage) {
        const storageCheck = await checkStorageLimit(adminId);
        if (!storageCheck.allowed) {
          throw new Error('سعة التخزين ممتلئة. يرجى ترقية الباقة أو حذف بعض الملفات.');
        }
      }

      // Upload image if selected
      let imageURL = '';
      if (selectedImage) {
        const fileName = `${Date.now()}_${selectedImage.name.replace(/\s+/g, '_')}`;
        const filePath = `images/${fileName}`;
        const { error: uploadError } = await supabase
          .storage
          .from('images')
          .upload(filePath, selectedImage);

        if (uploadError) {
          throw new Error('فشل في تحميل الصورة: ' + uploadError.message);
        }

        const { data } = supabase.storage.from('images').getPublicUrl(filePath);
        imageURL = data.publicURL;
      }

      // Validate email format only if email is provided
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (newClient.email && !emailRegex.test(newClient.email.trim())) {
        throw new Error('الرجاء إدخال بريد إلكتروني صحيح');
      }

      // Insert new client data
      const { data, error } = await supabase
        .from('clients_data')
        .insert([{
          client_name: newClient.client_name.trim(),
          email: newClient.email.trim(),
          phone: newClient.phone.trim(),
          address: newClient.address.trim(),
          image_url: imageURL,
          governorate_id: newClient.governorate_id,
          notes: newClient.notes.trim(),
          id_number: newClient.id_number.trim(),
          legal_form: newClient.legal_form,
          type: newClient.type,
          connection_name: newClient.connection_name.trim(),
          connection_mobile: newClient.connection_mobile.trim(),
          connection_address: newClient.connection_address.trim(),
          conn_email: newClient.conn_email.trim(),
          admin_id: adminId,
          lawyer_id: lawyerId
        }]).select();

      if (error) {
        throw new Error('خطأ في إضافة الموكل: ' + error.message);
      }

      const insertedClient = data[0];
      console.log('Inserted client:', insertedClient);

      // === Create Client Portal Account if enabled ===
      if (portalEnabled && portalEmail && portalPassword) {
        try {
          const portalRes = await fetch(getApiUrl('/api/client-portal/create-account'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: portalEmail.trim(),
              password: portalPassword,
              clientDataId: insertedClient.id,
              adminId: adminId,
              createdBy: userId,
            }),
          });
          const portalResult = await portalRes.json();
          if (!portalRes.ok) {
            console.error('Portal account creation failed:', portalResult.error);
            // DO NOT REDIRECT on failure
            setErrorMessage('تم إضافة الموكل بنجاح، لكن فشل إنشاء حساب البوابة: ' + (portalResult.error || 'خطأ غير معروف'));
            setLoading(false);
            return; 
          } else {
            console.log('Portal account created successfully:', portalResult);
            setSuccessMessage('تم إضافة الموكل وإنشاء حساب بوابة الموكل بنجاح');
          }
        } catch (portalError) {
          console.error('Portal account connection error details:', {
            message: portalError.message,
            stack: portalError.stack,
            error: portalError
          });
          setErrorMessage('تم إضافة الموكل بنجاح، لكن حدث خطأ أثناء الاتصال بخدمة حساب البوابة. يرجى التحقق من اتصال الخادم ومفاتيح Supabase.');
          setLoading(false);
          return;
        }
      } else {
        setSuccessMessage('تم إضافة الموكل بنجاح');
      }

      // Redirect after 1.5 seconds if everything succeeded
      setTimeout(() => {
        router.push(`/client/view-client?id=${insertedClient.id}`);
      }, 1500);

    } catch (error) {
      console.error('Error:', error.message);
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <Layout>
        <div className="page-container">
          <div className="page-header">
            <div className="page-header-row">
              <h1 className="page-title">إضافة موكل جديد</h1>
            </div>
          </div>

          {errorMessage && (
            <div className="message error-message">
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="message success-message">
              <span>{successMessage}</span>
            </div>
          )}

          <form id="client-form" onSubmit={handleSave} className="client-form">
            {/* Client Information Section */}
            <div className="form-section">
              <div className="section-header">
                <h2 className="section-title">معلومات الموكل</h2>
                <button
                  type="submit"
                  className="save-button-header"
                  disabled={loading}
                >
                  <FiSave className="button-icon" />
                  <span>{loading ? 'جاري الحفظ...' : 'حفظ'}</span>
                </button>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    <FiUser className="label-icon" />
                    اسم الموكل <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    name="client_name"
                    value={newClient.client_name}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="أدخل اسم الموكل"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <FiMail className="label-icon" />
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={newClient.email}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="example@email.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <FiPhone className="label-icon" />
                    رقم الجوال
                  </label>
                  <ContactPicker
                    value={newClient.phone}
                    onChange={(value) => setNewClient(prev => ({ ...prev, phone: value }))}
                    placeholder="أدخل رقم الجوال"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <FiMapPin className="label-icon" />
                    العنوان
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={newClient.address}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="أدخل العنوان"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <FiFileText className="label-icon" />
                    الشكل القانوني <span className="required-asterisk">*</span>
                  </label>
                  <select
                    name="legal_form"
                    value={newClient.legal_form}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="">اختر الشكل القانوني</option>
                    <option value="فرد">فرد</option>
                    <option value="شركة">شركة</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <FiUserCheck className="label-icon" />
                    نوع الموكل <span className="required-asterisk">*</span>
                  </label>
                  <select
                    name="type"
                    value={newClient.type}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="">اختر نوع الموكل</option>
                    <option value="حدث">حدث</option>
                    <option value="بالغ">بالغ</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <FiMapPin className="label-icon" />
                    المحافظة
                  </label>
                  <select
                    name="governorate_id"
                    value={newClient.governorate_id}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="">اختر المحافظة</option>
                    {governorates.map((governorate) => (
                      <option key={governorate} value={governorate}>
                        {governorate}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <FiFileText className="label-icon" />
                    رقم الهوية
                  </label>
                  <input
                    type="text"
                    name="id_number"
                    value={newClient.id_number}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="أدخل رقم الهوية"
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">
                    <FiImage className="label-icon" />
                    صورة الموكل
                  </label>
                  {imagePreview ? (
                    <div className="image-preview-container">
                      <img src={imagePreview} alt="Preview" className="image-preview" />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="remove-image-btn"
                      >
                        <FiX />
                        إزالة الصورة
                      </button>
                    </div>
                  ) : (
                    <div className="file-upload-container">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*"
                        className="file-input"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="file-upload-label">
                        <FiImage className="upload-icon" />
                        <span>اختر صورة</span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="form-group full-width">
                  <label className="form-label">
                    <FiFileText className="label-icon" />
                    ملاحظات
                  </label>
                  <textarea
                    name="notes"
                    value={newClient.notes}
                    onChange={handleInputChange}
                    className="form-textarea"
                    placeholder="أدخل أي ملاحظات إضافية"
                    rows="4"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="form-section">
              <div className="section-header">
                <h2 className="section-title">جهات الاتصال</h2>
                <div className="section-divider"></div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    <FiUser className="label-icon" />
                    اسم الشخص
                  </label>
                  <input
                    type="text"
                    name="connection_name"
                    value={newClient.connection_name}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="أدخل اسم الشخص"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <FiPhone className="label-icon" />
                    رقم الجوال
                  </label>
                  <ContactPicker
                    value={newClient.connection_mobile}
                    onChange={(value) => setNewClient(prev => ({ ...prev, connection_mobile: value }))}
                    placeholder="أدخل رقم الجوال"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <FiMapPin className="label-icon" />
                    العنوان
                  </label>
                  <input
                    type="text"
                    name="connection_address"
                    value={newClient.connection_address}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="أدخل العنوان"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <FiMail className="label-icon" />
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    name="conn_email"
                    value={newClient.conn_email}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="example@email.com"
                  />
                </div>
              </div>
            </div>

            {/* Client Portal Section */}
            <div className="form-section">
              <div className="section-header">
                <h2 className="section-title">بوابة الموكل</h2>
                <div className="section-divider"></div>
              </div>

              <div className="portal-toggle-container">
                <label className="portal-toggle">
                  <input
                    type="checkbox"
                    checked={portalEnabled}
                    onChange={(e) => setPortalEnabled(e.target.checked)}
                  />
                  <span className="portal-toggle-slider"></span>
                  <span className="portal-toggle-text">
                    <FiGlobe className="label-icon" />
                    تفعيل بوابة الموكل
                  </span>
                </label>
                <p className="portal-description">
                  عند التفعيل سيتم إنشاء حساب للموكل يمكنه من تسجيل الدخول ومتابعة قضاياه وجلساته ومستنداته
                </p>
              </div>

              {portalEnabled && (
                <div className="form-grid portal-fields">
                  <div className="form-group">
                    <label className="form-label">
                      <FiMail className="label-icon" />
                      بريد البوابة الإلكتروني <span className="required">*</span>
                    </label>
                    <input
                      type="email"
                      value={portalEmail}
                      onChange={(e) => setPortalEmail(e.target.value)}
                      className="form-input"
                      placeholder="client@email.com"
                      required={portalEnabled}
                      dir="ltr"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <FiLock className="label-icon" />
                      كلمة المرور <span className="required">*</span>
                    </label>
                    <div className="password-input-wrap">
                      <input
                        type={showPortalPassword ? 'text' : 'password'}
                        value={portalPassword}
                        onChange={(e) => setPortalPassword(e.target.value)}
                        className="form-input"
                        placeholder="6 أحرف على الأقل"
                        required={portalEnabled}
                        minLength={6}
                        dir="ltr"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPortalPassword(!showPortalPassword)}
                      >
                        {showPortalPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </form>
        </div>

        <style jsx>{`
          .page-container {
            direction: rtl;
            max-width: 1400px;
            margin: 0 auto;
            padding: 24px;
            font-family: 'Cairo', 'Almarai', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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

          .message {
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 24px;
            font-size: 0.9375rem;
            font-weight: 500;
            display: flex;
            align-items: center;
            animation: slideIn 0.3s ease-out;
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .error-message {
            background-color: #fee2e2;
            color: #dc2626;
            border: 1px solid #fecaca;
          }

          .success-message {
            background-color: #d1fae5;
            color: #059669;
            border: 1px solid #a7f3d0;
          }

          .client-form {
            display: flex;
            flex-direction: column;
            gap: 32px;
          }

          .form-section {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .section-header {
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .section-title {
            font-size: 20px;
            font-weight: 700;
            color: #1f2937;
            margin: 0;
          }

          .section-divider {
            height: 2px;
            background: linear-gradient(to left, #3b82f6, #2563eb);
            border-radius: 2px;
          }

          .save-button-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 24px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: #ffffff;
            border: none;
            border-radius: 8px;
            font-size: 0.9375rem;
            font-weight: 600;
            font-family: 'Cairo', 'Almarai', sans-serif;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
          }

          .save-button-header:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
          }

          .save-button-header:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }

          .form-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 24px;
          }

          .form-group {
            display: flex;
            flex-direction: column;
          }

          .form-group.full-width {
            grid-column: 1 / -1;
          }

          .form-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.875rem;
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
          }

          .label-icon {
            color: #3b82f6;
            font-size: 18px;
          }

          .required {
            color: #dc2626;
            margin-right: 4px;
          }

          .form-input,
          .form-select,
          .form-textarea {
            padding: 12px 16px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 0.9375rem;
            font-family: 'Cairo', 'Almarai', sans-serif;
            color: #1f2937;
            background: #ffffff;
            transition: all 0.2s ease;
            outline: none;
          }

          .form-input:focus,
          .form-select:focus,
          .form-textarea:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .form-input::placeholder,
          .form-textarea::placeholder {
            color: #9ca3af;
          }

          .form-select {
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: left 16px center;
            padding-right: 16px;
            padding-left: 40px;
          }

          .form-textarea {
            resize: vertical;
            min-height: 100px;
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
            gap: 8px;
            padding: 16px;
            border: 2px dashed #d1d5db;
            border-radius: 8px;
            background: #f9fafb;
            color: #6b7280;
            font-size: 0.9375rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .file-upload-label:hover {
            border-color: #3b82f6;
            background: #eff6ff;
            color: #3b82f6;
          }

          .upload-icon {
            font-size: 20px;
          }

          .image-preview-container {
            position: relative;
            display: inline-block;
          }

          .image-preview {
            width: 100%;
            max-width: 300px;
            height: auto;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            display: block;
          }

          .remove-image-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 12px;
            padding: 8px 16px;
            background: #fee2e2;
            color: #dc2626;
            border: 1px solid #fecaca;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .remove-image-btn:hover {
            background: #fecaca;
            border-color: #f87171;
          }

          .form-actions {
            display: flex;
            justify-content: flex-end;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
          }

          .save-button {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 14px 32px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: #ffffff;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            font-family: 'Cairo', 'Almarai', sans-serif;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
          }

          .save-button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
          }

          .save-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }

          .button-icon {
            font-size: 20px;
          }

          /* Portal Toggle Styles */
          .portal-toggle-container {
            margin-bottom: 20px;
          }

          .portal-toggle {
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            user-select: none;
          }

          .portal-toggle input {
            display: none;
          }

          .portal-toggle-slider {
            position: relative;
            width: 48px;
            height: 26px;
            background: #d1d5db;
            border-radius: 13px;
            transition: all 0.3s ease;
            flex-shrink: 0;
          }

          .portal-toggle-slider::after {
            content: '';
            position: absolute;
            top: 3px;
            left: 3px;
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 50%;
            transition: all 0.3s ease;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          }

          .portal-toggle input:checked + .portal-toggle-slider {
            background: #3b82f6;
          }

          .portal-toggle input:checked + .portal-toggle-slider::after {
            transform: translateX(22px);
          }

          .portal-toggle-text {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 15px;
            font-weight: 600;
            color: #1f2937;
          }

          .portal-description {
            margin: 8px 0 0 60px;
            font-size: 13px;
            color: #6b7280;
            line-height: 1.5;
          }

          .portal-fields {
            margin-top: 16px;
            padding: 16px;
            background: #f0f7ff;
            border: 1px solid #bfdbfe;
            border-radius: 10px;
          }

          .password-input-wrap {
            position: relative;
            display: flex;
            align-items: center;
          }

          .password-input-wrap .form-input {
            padding-left: 40px;
          }

          .password-toggle {
            position: absolute;
            left: 12px;
            background: none;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            font-size: 18px;
          }

          .password-toggle:hover {
            color: #3b82f6;
          }

          @media (max-width: 1024px) {
            .form-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          @media (max-width: 768px) {
            .page-container {
              padding: 16px;
            }

            .form-section {
              padding: 20px;
            }

            .form-grid {
              grid-template-columns: 1fr;
            }

            .page-title {
              font-size: 24px;
            }

            .section-title {
              font-size: 18px;
            }
          }
        `}</style>
      </Layout>
    </>
  );
};

export default withAuth(AddClientForm, ['can_view_clients'], true);
