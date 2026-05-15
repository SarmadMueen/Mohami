/* eslint-disable no-unused-vars */
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';
import Layout from '../../components/layout/Layout';
import Head from 'next/head';
import { FiSave, FiUpload, FiX } from 'react-icons/fi';

const GeneralSettingsPage = () => {
  const [officeSettings, setOfficeSettings] = useState({
    entity_type: '',
    office_name_ar: '',
    office_address_ar: '',
    office_name_en: '',
    office_address_en: '',
    phone_number: '',
    phone_country_code: '+44', // Default country code
    email: '',
  });

  const [officeLogo, setOfficeLogo] = useState(null);
  const [signature, setSignature] = useState(null);
  const [officeLogoPreview, setOfficeLogoPreview] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState(null);
  const [existingSignatureUrl, setExistingSignatureUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [userRole, setUserRole] = useState('');
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  // Entity type options
  const entityTypeOptions = [
    { value: '', label: 'اختر...' },
    { value: 'مكتب محاماة', label: 'مكتب محاماة' },
    { value: 'شركة', label: 'شركة' },
    { value: 'مؤسسة', label: 'مؤسسة' },
    { value: 'أخرى', label: 'أخرى' },
  ];

  // Country codes for phone number
  const countryCodes = [
    { code: '+44', flag: '🇬🇧', country: 'UK' },
    { code: '+964', flag: '🇮🇶', country: 'Iraq' },
    { code: '+966', flag: '🇸🇦', country: 'Saudi Arabia' },
    { code: '+971', flag: '🇦🇪', country: 'UAE' },
    { code: '+974', flag: '🇶🇦', country: 'Qatar' },
    { code: '+965', flag: '🇰🇼', country: 'Kuwait' },
  ];

  // Check user role and access
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = supabase.auth.user();
        if (!user) {
          setHasAccess(false);
          setIsCheckingAccess(false);
          return;
        }

        const { data: userMetadata, error } = await supabase
          .from('user_metadata')
          .select('role')
          .eq('email', user.email)
          .single();

        if (error || !userMetadata) {
          console.error('Error fetching user metadata:', error);
          setHasAccess(false);
          setIsCheckingAccess(false);
          return;
        }

        const role = userMetadata.role;
        setUserRole(role);

        // Only الفئة 1 users have access
        if (role === 'الفئة 1') {
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAccess();
  }, []);

  // Fetch existing office settings from user_metadata (admin user's record)
  useEffect(() => {
    if (!hasAccess) return;

    const fetchOfficeSettings = async () => {
      setIsLoading(true);
      try {
        const user = supabase.auth.user();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Fetch admin user's metadata record (where role = 'الفئة 1')
        const { data, error } = await supabase
          .from('user_metadata')
          .select('*')
          .eq('user_id', user.id)
          .eq('role', 'الفئة 1')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching office settings:', error);
          setErrorMessage('حدث خطأ في تحميل الإعدادات');
        } else if (data) {
          setOfficeSettings({
            entity_type: data.entity_type || '',
            office_name_ar: data.office_name_ar || '',
            office_address_ar: data.office_address_ar || '',
            office_name_en: data.office_name_en || '',
            office_address_en: data.office_address_en || '',
            phone_number: data.phone_number || '',
            phone_country_code: data.phone_country_code || '+44',
            email: data.office_email || data.email || '',
          });
          setExistingLogoUrl(data.office_logo_url);
          setExistingSignatureUrl(data.signature_url);
        }
      } catch (error) {
        console.error('Error:', error);
        setErrorMessage('حدث خطأ في تحميل الإعدادات');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOfficeSettings();
  }, [hasAccess]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setOfficeSettings((prev) => ({ ...prev, [name]: value }));
    // Clear messages when user starts typing
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleLogoChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrorMessage('الرجاء اختيار ملف صورة');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
        return;
      }
      setOfficeLogo(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setOfficeLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setErrorMessage('');
    }
  };

  const handleSignatureChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrorMessage('الرجاء اختيار ملف صورة');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
        return;
      }
      setSignature(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignaturePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setErrorMessage('');
    }
  };

  const removeLogo = () => {
    setOfficeLogo(null);
    setOfficeLogoPreview(null);
  };

  const removeSignature = () => {
    setSignature(null);
    setSignaturePreview(null);
  };

  const uploadImage = async (image, folder) => {
    if (!image) {
      return null;
    }

    const fileName = `${Date.now()}_${image.name.replace(/\s+/g, '_')}`;
    const path = `office/${folder}/${fileName}`;

    const { error } = await supabase.storage.from('images').upload(path, image, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      throw new Error(`فشل في تحميل الصورة: ${error.message}`);
    }

    const { publicURL } = await supabase.storage.from('images').getPublicUrl(path);
    return publicURL;
  };

  const handleSave = async () => {
    // Validation
    if (!officeSettings.entity_type) {
      setErrorMessage('الرجاء اختيار نوع الكيان');
      return;
    }
    if (!officeSettings.office_name_ar.trim()) {
      setErrorMessage('الرجاء إدخال اسم المكتب بالعربية');
      return;
    }
    if (!officeSettings.office_address_ar.trim()) {
      setErrorMessage('الرجاء إدخال عنوان المكتب بالعربية');
      return;
    }
    if (!officeSettings.office_name_en.trim()) {
      setErrorMessage('الرجاء إدخال اسم المكتب بالإنجليزية');
      return;
    }
    if (!officeSettings.office_address_en.trim()) {
      setErrorMessage('الرجاء إدخال عنوان المكتب بالإنجليزية');
      return;
    }
    if (!officeSettings.phone_number.trim()) {
      setErrorMessage('الرجاء إدخال رقم الهاتف');
      return;
    }
    // Validate phone number (numbers only)
    if (!/^\d+$/.test(officeSettings.phone_number.trim())) {
      setErrorMessage('رقم الهاتف يجب أن يحتوي على أرقام فقط');
      return;
    }
    if (!officeSettings.email.trim()) {
      setErrorMessage('الرجاء إدخال البريد الإلكتروني');
      return;
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(officeSettings.email.trim())) {
      setErrorMessage('الرجاء إدخال بريد إلكتروني صحيح');
      return;
    }

    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      let logoUrl = existingLogoUrl;
      let signatureUrl = existingSignatureUrl;

      // Upload logo if new one is selected
      if (officeLogo) {
        logoUrl = await uploadImage(officeLogo, 'logo');
      }

      // Upload signature if new one is selected
      if (signature) {
        signatureUrl = await uploadImage(signature, 'signature');
      }

      // Prepare data for upsert
      const settingsData = {
        ...officeSettings,
        phone_number: officeSettings.phone_number.trim(),
        email: officeSettings.email.trim(),
        office_logo_url: logoUrl,
        signature_url: signatureUrl,
        updated_at: new Date().toISOString(),
      };

      // Get current user to update their user_metadata record
      const user = supabase.auth.user();
      if (!user) {
        throw new Error('المستخدم غير مسجل الدخول');
      }

      // Update user_metadata record for admin user (using user_id)
      const { error } = await supabase
        .from('user_metadata')
        .update({
          entity_type: settingsData.entity_type,
          office_name_ar: settingsData.office_name_ar,
          office_address_ar: settingsData.office_address_ar,
          office_name_en: settingsData.office_name_en,
          office_address_en: settingsData.office_address_en,
          phone_number: settingsData.phone_number,
          phone_country_code: settingsData.phone_country_code,
          office_email: settingsData.email,
          office_logo_url: logoUrl,
          signature_url: signatureUrl,
        })
        .eq('user_id', user.id)
        .eq('role', 'الفئة 1');

      if (error) {
        throw new Error(`فشل في حفظ الإعدادات: ${error.message}`);
      }

      // Update existing URLs for preview
      if (logoUrl) setExistingLogoUrl(logoUrl);
      if (signatureUrl) setExistingSignatureUrl(signatureUrl);

      // Clear file inputs
      setOfficeLogo(null);
      setSignature(null);
      setOfficeLogoPreview(null);
      setSignaturePreview(null);

      setSuccessMessage('تم حفظ الإعدادات بنجاح');
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setErrorMessage(error.message || 'حدث خطأ في حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading while checking access
  if (isCheckingAccess) {
    return (
      <Layout>
        <Head>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet" />
        </Head>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', fontFamily: "'Cairo', 'Almarai', sans-serif" }}>
          <div style={{ fontSize: '1.125rem', color: '#6b7280' }}>جاري التحميل...</div>
        </div>
      </Layout>
    );
  }

  // Show access denied message if user doesn't have permission
  if (!hasAccess) {
    return (
      <Layout>
        <Head>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet" />
        </Head>
        <div className="access-denied-container">
          <div className="access-denied-message">
            <h2>غير مصرح بالوصول</h2>
            <p>هذه الصفحة متاحة فقط للمستخدمين من الفئة 1 (المسؤولين).</p>
            <p>دورك الحالي: {userRole || 'غير محدد'}</p>
          </div>
        </div>
        <style jsx>{`
          .access-denied-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 60vh;
            padding: 2rem;
            direction: rtl;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }
          .access-denied-message {
            background-color: #fff;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
            text-align: center;
            max-width: 500px;
          }
          .access-denied-message h2 {
            color: #dc2626;
            font-size: 1.5rem;
            margin-bottom: 1rem;
          }
          .access-denied-message p {
            color: #6b7280;
            margin-bottom: 0.5rem;
          }
        `}</style>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="page-container">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner">جاري التحميل...</div>
          </div>
        ) : (
          <div className="settings-layout">
            {/* Main Content Area */}
            <div className="settings-content">
              <div className="page-intro">
                <h2 className="intro-title">الإعدادات العامة</h2>
                <p className="intro-description">
                  جميع الإعدادات التي تختص بالنظام بشكل عام مثل: ترويسة المكتب، اسم المكتب، شعار المكتب و المعلومات العامة للمكتب.
                </p>
                <div className="intro-tags">
                  <span className="intro-tag">معلومات المكتب</span>
                  <span className="intro-tag">الشعار والختم</span>
                </div>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                {/* Success/Error Messages */}
                {successMessage && (
                  <div className="message success-message">
                    {successMessage}
                  </div>
                )}
                {errorMessage && (
                  <div className="message error-message">
                    {errorMessage}
                  </div>
                )}

                {/* Office Information Section */}
                <div className="form-section">
                  <div className="section-title-row">
                    <h2 className="section-title">معلومات المكتب</h2>
                    <button
                      type="submit"
                      className="save-button"
                      disabled={isSaving}
                    >
                      <FiSave />
                      {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                    </button>
                  </div>
                  <div className="section-grid">
                      {/* Row 1 */}
                      <div className="form-field">
                        <label>
                          العربية
                        </label>
                        <input
                          type="text"
                          disabled
                          style={{ background: '#f9fafb', cursor: 'not-allowed' }}
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="office_address_ar">
                          عنوان المكتب <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          id="office_address_ar"
                          name="office_address_ar"
                          value={officeSettings.office_address_ar}
                          onChange={handleInputChange}
                          placeholder="العراق"
                          required
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="office_name_ar">
                          اسم المكتب <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          id="office_name_ar"
                          name="office_name_ar"
                          value={officeSettings.office_name_ar}
                          onChange={handleInputChange}
                          placeholder="فرح خالد"
                          required
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="entity_type">
                          نوع الكيان <span className="required">*</span>
                        </label>
                        <select
                          id="entity_type"
                          name="entity_type"
                          value={officeSettings.entity_type}
                          onChange={handleInputChange}
                          required
                        >
                          {entityTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Row 2 */}
                      <div className="form-field">
                        <label>
                          English
                        </label>
                        <input
                          type="text"
                          disabled
                          style={{ background: '#f9fafb', cursor: 'not-allowed' }}
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="phone_number">
                          رقم الهاتف <span className="required">*</span>
                        </label>
                        <div className="phone-input-wrapper">
                          <select
                            className="country-code-select"
                            value={officeSettings.phone_country_code}
                            onChange={(e) => setOfficeSettings(prev => ({ ...prev, phone_country_code: e.target.value }))}
                          >
                            {countryCodes.map((country) => (
                              <option key={country.code} value={country.code}>
                                {country.flag} {country.code}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            id="phone_number"
                            name="phone_number"
                            value={officeSettings.phone_number}
                            onChange={handleInputChange}
                            placeholder="7856061345"
                            pattern="[0-9]+"
                            className="phone-number-input"
                            required
                          />
                        </div>
                      </div>

                      <div className="form-field">
                        <label htmlFor="office_address_en">
                          عنوان المكتب <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          id="office_address_en"
                          name="office_address_en"
                          value={officeSettings.office_address_en}
                          onChange={handleInputChange}
                          placeholder="Iraq"
                          required
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="office_name_en">
                          اسم المكتب <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          id="office_name_en"
                          name="office_name_en"
                          value={officeSettings.office_name_en}
                          onChange={handleInputChange}
                          placeholder="Farah Khaled"
                          required
                        />
                      </div>

                      {/* Row 3 */}
                      <div className="form-field">
                        <label htmlFor="email">
                          البريد الإلكتروني <span className="required">*</span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={officeSettings.email}
                          onChange={handleInputChange}
                          placeholder="alqudsihanaa@gmail.com"
                          required
                        />
                      </div>
                    </div>
                  </div>

                {/* Logo and Seal Section */}
                <div className="form-section" style={{ marginTop: '24px' }}>
                  <h2 className="section-title">الشعار والختم</h2>
                  <div className="section-grid col-2">

                      <div className="form-field">
                        <label htmlFor="office_logo">
                          شعار المكتب
                        </label>
                        <div className="image-upload-container">
                          <input
                            type="file"
                            id="office_logo"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="file-input"
                          />
                          {(officeLogoPreview || existingLogoUrl) && (
                            <div className="image-preview-container">
                              <div className="image-preview-wrapper">
                                <img
                                  src={officeLogoPreview || existingLogoUrl}
                                  alt="شعار المكتب"
                                  className="image-preview"
                                />
                                {officeLogoPreview && (
                                  <button
                                    type="button"
                                    onClick={removeLogo}
                                    className="remove-image-btn"
                                    aria-label="إزالة الصورة"
                                  >
                                    <FiX />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="form-field">
                        <label htmlFor="signature">
                          ختم المحامي
                        </label>
                        <div className="image-upload-container">
                          <input
                            type="file"
                            id="signature"
                            accept="image/*"
                            onChange={handleSignatureChange}
                            className="file-input"
                          />
                          {(signaturePreview || existingSignatureUrl) && (
                            <div className="image-preview-container">
                              <div className="image-preview-wrapper">
                                <img
                                  src={signaturePreview || existingSignatureUrl}
                                  alt="ختم المحامي"
                                  className="image-preview"
                                />
                                {signaturePreview && (
                                  <button
                                    type="button"
                                    onClick={removeSignature}
                                    className="remove-image-btn"
                                    aria-label="إزالة الصورة"
                                  >
                                    <FiX />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

              </form>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .page-container {
          padding: 24px;
          background-color: #f5f7fa;
          font-family: 'Cairo', 'Almarai', sans-serif;
          direction: rtl;
          max-width: 100%;
          margin: 0;
          min-height: auto;
          width: 100%;
        }

        .settings-layout {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-intro {
          background-color: #ffffff;
          border-radius: 12px;
          padding: 20px 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
        }

        .intro-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1d4ed8;
          margin: 0 0 8px 0;
        }

        .intro-description {
          font-size: 0.875rem;
          color: #6b7280;
          line-height: 1.7;
          margin: 0 0 12px 0;
        }

        .intro-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .intro-tag {
          display: inline-flex;
          align-items: center;
          padding: 6px 14px;
          background-color: #eff6ff;
          color: #3b82f6;
          font-size: 0.8125rem;
          font-weight: 600;
          border-radius: 20px;
        }

        /* Main Content */
        .settings-content {
          flex: 1;
          min-width: 0;
        }

        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        .loading-spinner {
          font-size: 1.125rem;
          color: #6b7280;
        }

        .message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-weight: 500;
        }

        .success-message {
          background-color: #d1fae5;
          color: #065f46;
          border: 1px solid #6ee7b7;
        }

        .error-message {
          background-color: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .form-grid {
          display: grid;
          gap: 24px;
          grid-template-columns: 1fr;
          max-width: 100%;
          width: 100%;
        }

        .form-section {
          background-color: #ffffff;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
          width: 100%;
        }

        .section-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .section-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .col-2 {
          grid-template-columns: repeat(2, 1fr);
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-field label {
          font-weight: 700;
          color: #1f2937;
          font-size: 0.8125rem;
          margin-bottom: 4px;
        }

        .required {
          color: #dc2626;
        }

        .form-field input,
        .form-field select,
        .form-field textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          font-family: inherit;
          background-color: #f8fafc;
          transition: all 0.2s ease;
          color: #1f2937;
          line-height: 1.4;
          height: 40px;
        }

        .form-field textarea {
          height: auto;
          min-height: 60px;
          resize: vertical;
        }

        .phone-input-wrapper {
          display: flex;
          gap: 8px;
        }

        .country-code-select {
          width: 100px;
          flex-shrink: 0;
          padding: 8px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          background-color: #f8fafc;
          cursor: pointer;
          height: 40px;
        }

        .phone-number-input {
          flex: 1;
        }

        .form-field input::placeholder,
        .form-field textarea::placeholder {
          color: #9ca3af;
        }

        .form-field input:focus,
        .form-field select:focus,
        .form-field textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          background-color: #ffffff;
          border-width: 1.5px;
        }

        .form-field select {
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: left 8px center;
          background-repeat: no-repeat;
          background-size: 12px;
          padding-left: 28px;
          appearance: none;
        }

        .image-upload-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .file-input {
          padding: 10px;
          border: 1.5px dashed #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
          cursor: pointer;
          background-color: #f8fafc;
        }

        .file-input:hover {
          border-color: #3b82f6;
        }

        .image-preview-container {
          margin-top: 8px;
        }

        .image-preview-wrapper {
          position: relative;
          display: inline-block;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px;
          background-color: #f9fafb;
        }

        .image-preview {
          max-width: 200px;
          max-height: 200px;
          border-radius: 4px;
          display: block;
        }

        .remove-image-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          background-color: #dc2626;
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s ease;
        }

        .remove-image-btn:hover {
          background-color: #b91c1c;
        }


        .save-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          padding: 8px 20px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          border: none;
          cursor: pointer;
          font-family: 'Cairo', 'Almarai', sans-serif;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.15);
          white-space: nowrap;
        }

        .save-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }

        .save-button:disabled {
          background-image: none;
          background-color: #9ca3af;
          cursor: not-allowed;
          box-shadow: none;
        }

        @media (max-width: 1200px) {
          .section-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .section-grid.col-2 {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .page-container {
            padding: 12px;
            padding-bottom: 0px !important;
            min-height: auto;
          }

          .settings-layout {
            gap: 12px;
          }

          .page-intro {
            padding: 16px;
          }

          .intro-title {
            font-size: 1.1rem;
          }

          .intro-description {
            font-size: 0.8125rem;
          }

          .section-grid {
            grid-template-columns: 1fr;
          }

          .form-section {
            padding: 16px;
          }

          .form-field input,
          .form-field select,
          .form-field textarea {
            height: 44px;
            font-size: 16px;
            padding: 10px 12px;
          }

          .country-code-select {
            height: 44px;
          }

          .section-title-row {
            margin-bottom: 16px;
            padding-bottom: 10px;
          }
        }
      `}</style>
    </Layout>
  );
};

export default withAuth(GeneralSettingsPage, ['can_view_setting'], true);
