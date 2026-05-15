import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/initSupabase';
import Layout from '../../components/layout/Layout';
import withAuth from '../../lib/withAuth';
import { FiSave, FiUpload, FiX, FiEye, FiRefreshCw } from 'react-icons/fi';
import { useSubscription } from '../../context/SubscriptionContext';

const DesignLetterheadPage = () => {
  const router = useRouter();
  const { isReadOnly, loading: subLoading } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [customLogoPreview, setCustomLogoPreview] = useState(null);
  const [customLogoFile, setCustomLogoFile] = useState(null);
  const [watermarkLogoPreview, setWatermarkLogoPreview] = useState(null);
  const [watermarkLogoFile, setWatermarkLogoFile] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' or 'preview'

  // Default letterhead design structure
  const defaultDesign = {
    // Lawyer Information
    lawyerNameEn: '',
    lawyerNameAr: '',
    customLogoUrl: null,
    watermarkLogoUrl: null,
    showBarAssociationLogo: true,

    // Header Labels
    headerLabelEn: 'LAWYER',
    headerLabelAr: 'المحامي',

    // Addresses (array)
    addresses: [],

    // Phone numbers (array)
    phoneNumbers: [],

    // Layout & Design
    showHeader: true,
    showMiddleDecoration: true,
    middleDecorationType: 'scales', // 'scales', 'logo', 'none'
    middleDecorationColor: '#A78BFA',
    showFooter: true,

    // Styling
    primaryColor: '#1E3A8A',
    secondaryColor: '#22C55E',
    fontFamily: 'Cairo',
    fontSizeHeader: 18,
    fontSizeBody: 16,
    fontSizeFooter: 12,

    // Individual Element Styling
    headerLabelFontFamily: 'Cairo',
    headerLabelFontSize: 11,
    lawyerNameFontFamily: 'Cairo',
    lawyerNameFontSize: 18,
    addressesFontFamily: 'Cairo',
    addressesFontSize: 12,
    phoneNumbersFontFamily: 'Arial',
    phoneNumbersFontSize: 12,

    // Spacing
    headerPaddingTop: 20,
    headerPaddingBottom: 15,
    middlePadding: 30,
    footerPaddingTop: 15,
  };

  const [design, setDesign] = useState(defaultDesign);
  const [originalDesign, setOriginalDesign] = useState(null);

  // Fetch existing design and user info
  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = supabase.auth.user();
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch user metadata
        const { data: userData, error } = await supabase
          .from('user_metadata')
          .select('username, arabic_name, office_address_ar, phone_number, office_email, office_logo_url, letterhead_design')
          .or(`admin_user_id.eq.${user.id},new_lawyer_id.eq.${user.id},user_id.eq.${user.id}`)
          .limit(1);

        if (error) {
          console.error('Error fetching user data:', error);
          setLoading(false);
          return;
        }

        if (userData && userData.length > 0) {
          const data = userData[0];

          // Parse existing letterhead design or use defaults
          let letterheadDesign = defaultDesign;
          if (data.letterhead_design) {
            letterheadDesign = { ...defaultDesign, ...data.letterhead_design };
          }

          // Pre-fill from user metadata if not in design
          if (!letterheadDesign.lawyerNameEn && data.username) {
            letterheadDesign.lawyerNameEn = data.username;
          }
          if (!letterheadDesign.lawyerNameAr && data.arabic_name) {
            letterheadDesign.lawyerNameAr = data.arabic_name;
          }
          if (!letterheadDesign.customLogoUrl && data.office_logo_url) {
            letterheadDesign.customLogoUrl = data.office_logo_url;
            setCustomLogoPreview(data.office_logo_url);
          }
          if (letterheadDesign.watermarkLogoUrl) {
            setWatermarkLogoPreview(letterheadDesign.watermarkLogoUrl);
          } else if (data.office_logo_url && !letterheadDesign.customLogoUrl) {
            // Fallback: if existing data has office logo but no explicit watermark, maybe use it? 
            // For now, let's keep them separate unless explicitly set.
          }
          if (letterheadDesign.addresses.length === 0 && data.office_address_ar) {
            // Parse addresses (split by newline or semicolon)
            const addresses = data.office_address_ar.split(/\n|;/).filter(addr => addr.trim());
            letterheadDesign.addresses = addresses.length > 0 ? addresses : [''];
          } else if (letterheadDesign.addresses.length === 0) {
            letterheadDesign.addresses = [''];
          }
          if (letterheadDesign.phoneNumbers.length === 0 && data.phone_number) {
            // Parse phone numbers (split by dash or comma)
            const phones = data.phone_number.split(/[-,\s]+/).filter(phone => phone.trim());
            letterheadDesign.phoneNumbers = phones.length > 0 ? phones : [''];
          } else if (letterheadDesign.phoneNumbers.length === 0) {
            letterheadDesign.phoneNumbers = [''];
          }

          setDesign(letterheadDesign);
          setOriginalDesign(JSON.parse(JSON.stringify(letterheadDesign)));
        } else {
          // No user data found, use defaults
          setDesign({ ...defaultDesign, addresses: [''], phoneNumbers: [''] });
          setOriginalDesign(JSON.parse(JSON.stringify({ ...defaultDesign, addresses: [''], phoneNumbers: [''] })));
        }
      } catch (error) {
        console.error('Error:', error);
        setErrorMessage('حدث خطأ في تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (field, value) => {
    setDesign(prev => ({ ...prev, [field]: value }));
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleArrayChange = (field, index, value) => {
    setDesign(prev => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  const addArrayItem = (field) => {
    setDesign(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field, index) => {
    setDesign(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('حجم الصورة يجب أن يكون أقل من 5 ميجابايت.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setErrorMessage('الرجاء اختيار ملف صورة صحيح');
        return;
      }
      setCustomLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCustomLogo = () => {
    setCustomLogoFile(null);
    setCustomLogoPreview(null);
    setDesign(prev => ({ ...prev, customLogoUrl: null }));
  };

  const handleWatermarkUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('حجم الصورة يجب أن يكون أقل من 5 ميجابايت.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setErrorMessage('الرجاء اختيار ملف صورة صحيح');
        return;
      }
      setWatermarkLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setWatermarkLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeWatermarkLogo = () => {
    setWatermarkLogoFile(null);
    setWatermarkLogoPreview(null);
    setDesign(prev => ({ ...prev, watermarkLogoUrl: null }));
  };

  const uploadFile = async (file, folder) => {
    if (!file) return null;
    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const path = `letterhead/${folder}/${fileName}`;
    const { error } = await supabase.storage.from('images').upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw new Error(`فشل في تحميل الصورة: ${error.message}`);
    const { publicURL } = await supabase.storage.from('images').getPublicUrl(path);
    return publicURL;
  };

  const uploadLogo = async () => uploadFile(customLogoFile, 'logo');
  const uploadWatermark = async () => uploadFile(watermarkLogoFile, 'watermark');

  const handleSave = async () => {
    // Validation
    if (!design.lawyerNameEn.trim() && !design.lawyerNameAr.trim()) {
      setErrorMessage('الرجاء إدخال اسم المحامي على الأقل بالعربية أو الإنجليزية');
      return;
    }
    if (design.addresses.length === 0 || design.addresses.every(addr => !addr.trim())) {
      setErrorMessage('الرجاء إدخال عنوان مكتب واحد على الأقل');
      return;
    }
    if (design.phoneNumbers.length === 0 || design.phoneNumbers.every(phone => !phone.trim())) {
      setErrorMessage('الرجاء إدخال رقم هاتف محمول واحد على الأقل');
      return;
    }

    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const user = supabase.auth.user();
      if (!user) {
        throw new Error('المستخدم غير مسجل الدخول');
      }

      // Upload logos
      let logoUrl = design.customLogoUrl;
      if (customLogoFile) {
        logoUrl = await uploadLogo();
      }

      let watermarkUrl = design.watermarkLogoUrl;
      if (watermarkLogoFile) {
        watermarkUrl = await uploadWatermark();
      }

      // Prepare design data
      const designData = {
        ...design,
        customLogoUrl: logoUrl,
        watermarkLogoUrl: watermarkUrl,
        // Clean empty array items
        addresses: design.addresses.filter(addr => addr.trim()),
        phoneNumbers: design.phoneNumbers.filter(phone => phone.trim()),
      };

      // Update user_metadata
      const { error } = await supabase
        .from('user_metadata')
        .update({
          letterhead_design: designData
        })
        .or(`admin_user_id.eq.${user.id},new_lawyer_id.eq.${user.id},user_id.eq.${user.id}`);

      if (error) {
        throw new Error(`فشل في حفظ تصميم قالب الطلب: ${error.message}`);
      }

      setDesign(prev => ({ ...prev, customLogoUrl: logoUrl, watermarkLogoUrl: watermarkUrl }));
      setOriginalDesign(JSON.parse(JSON.stringify({ ...designData })));
      setCustomLogoFile(null);
      setWatermarkLogoFile(null);
      setSuccessMessage('تم حفظ تصميم قالب الطلب بنجاح! سيتم تطبيقه على جميع النماذج عند الطباعة.');

      // Clear message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error saving design:', error);
      setErrorMessage(error.message || 'حدث خطأ في حفظ قالب الطلب. الرجاء المحاولة مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalDesign) {
      setDesign(JSON.parse(JSON.stringify(originalDesign)));
      setErrorMessage('');
      setSuccessMessage('');
    }
  };

  const handlePreview = () => {
    setShowPreviewModal(true);
  };

  // Generate preview HTML
  const generatePreviewHTML = () => {
    const logoSrc = customLogoPreview || design.customLogoUrl;
    const watermarkSrc = watermarkLogoPreview || design.watermarkLogoUrl;

    const barAssociationLogo = `
      <svg width="90" height="110" viewBox="0 0 90 110" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .logo-shield { fill: none; stroke: #DC2626; stroke-width: 2.5; }
            .logo-text { font-size: 6.5px; fill: ${design.primaryColor}; font-weight: bold; }
            .logo-figure { fill: ${design.primaryColor}; }
          </style>
        </defs>
        <path class="logo-shield" d="M45 5 L75 15 L75 52 Q75 72 45 87 Q15 72 15 52 L15 15 Z"/>
        <text x="45" y="20" text-anchor="middle" class="logo-text">IRAQI BAR</text>
        <text x="45" y="28" text-anchor="middle" class="logo-text">ASSOCIATION</text>
        <text x="45" y="42" text-anchor="middle" class="logo-text">نقابة المحامين</text>
        <text x="45" y="50" text-anchor="middle" class="logo-text">العراقيين</text>
        <circle cx="45" cy="62" r="9" class="logo-figure"/>
        <text x="45" y="78" text-anchor="middle" class="logo-text">1933</text>
      </svg>
    `;

    const scalesOfJustice = `
      <svg width="250" height="250" viewBox="0 0 250 250" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .scales-outline { fill: none; stroke: ${design.middleDecorationColor}; stroke-width: 4; opacity: 0.9; }
            .scales-inner { fill: none; stroke: ${design.middleDecorationColor}; stroke-width: 3; opacity: 0.7; }
            .scales-base { fill: ${design.middleDecorationColor}; opacity: 0.8; }
            .scales-chain { stroke: ${design.middleDecorationColor}; stroke-width: 2.5; fill: none; opacity: 0.9; }
            .scales-pan { fill: ${design.middleDecorationColor}; stroke: ${design.middleDecorationColor}; stroke-width: 2.5; opacity: 0.7; }
          </style>
        </defs>
        <circle cx="125" cy="125" r="110" class="scales-outline"/>
        <circle cx="125" cy="125" r="100" class="scales-inner"/>
        <rect x="120" y="95" width="10" height="50" class="scales-base"/>
        <line x1="85" y1="125" x2="60" y2="125" class="scales-chain"/>
        <ellipse cx="60" cy="150" rx="25" ry="6" class="scales-pan"/>
        <line x1="165" y1="125" x2="190" y2="125" class="scales-chain"/>
        <ellipse cx="190" cy="150" rx="25" ry="6" class="scales-pan"/>
      </svg>
    `;

    return `
      <div style="
        width: 21cm;
        min-height: 29.7cm;
        padding: 1.5cm 2cm;
        background: white;
        direction: rtl;
        font-family: '${design.fontFamily}', 'Cairo', 'Almarai', sans-serif;
        margin: 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        border: 1px solid #E2E8F0;
        display: flex;
        flex-direction: column;
      ">
        ${design.showHeader ? `
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: ${design.headerPaddingBottom}px;
            padding-top: ${design.headerPaddingTop}px;
            padding-bottom: ${design.headerPaddingBottom}px;
            border-bottom: 3px solid ${design.secondaryColor};
            direction: ltr;
          ">
            <div style="flex: 1; text-align: left; direction: ltr; padding-right: 10px;">
              <div style="font-size: ${design.headerLabelFontSize}px; font-family: '${design.headerLabelFontFamily}', 'Cairo', 'Almarai', sans-serif; font-weight: 600; color: ${design.primaryColor}; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">${design.headerLabelEn || 'LAWYER'}</div>
              <div style="font-size: ${design.lawyerNameFontSize}px; font-family: '${design.lawyerNameFontFamily}', 'Cairo', 'Almarai', sans-serif; font-weight: 700; color: ${design.primaryColor}; text-transform: uppercase; line-height: 1.2; white-space: nowrap;">
                ${design.lawyerNameEn || 'Lawyer Name'}
              </div>
            </div>

            <div style="flex: 0 0 auto; display: flex; align-items: center; justify-content: center; margin: 0 10px;">
              ${logoSrc ?
          `<img src="${logoSrc}" style="max-width: 80px; max-height: 100px; margin: 0 8px;" alt="Logo" />` :
          (design.showBarAssociationLogo ? barAssociationLogo : '')
        }
            </div>

            <div style="flex: 1; text-align: right; direction: rtl; padding-left: 10px;">
              <div style="font-size: ${design.headerLabelFontSize}px; font-family: '${design.headerLabelFontFamily}', 'Cairo', 'Almarai', sans-serif; font-weight: 600; color: ${design.primaryColor}; margin-bottom: 6px;">${design.headerLabelAr || 'المحامي'}</div>
              <div style="font-size: ${design.lawyerNameFontSize}px; font-family: '${design.lawyerNameFontFamily}', 'Cairo', 'Almarai', sans-serif; font-weight: 700; color: ${design.primaryColor}; line-height: 1.2; white-space: nowrap;">
                ${design.lawyerNameAr || 'اسم المحامي'}
              </div>
            </div>
          </div>
        ` : ''}
        
        <div style="
          margin: 30px 0;
          font-size: ${design.fontSizeBody}px;
          line-height: 1.8;
          min-height: 400px;
          flex: 1;
          padding: 40px 30px;
          border: 2px dashed #CBD5E1;
          text-align: center;
          color: #94A3B8;
          background: linear-gradient(to bottom, #FAFBFC 0%, #F8FAFC 100%);
          border-radius: 4px;
          position: relative;
          overflow: hidden;
        ">
          ${design.showMiddleDecoration ? `
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              z-index: 0;
              opacity: 0.6;
              pointer-events: none;
              display: flex;
              justify-content: center;
              align-items: center;
            ">
              ${design.middleDecorationType === 'scales' ? scalesOfJustice : ''}
              ${design.middleDecorationType === 'logo' && watermarkSrc ? `
                <img src="${watermarkSrc}" style="max-width: 300px; max-height: 300px; opacity: 0.2;" alt="Watermark" />
              ` : ''}
            </div>
          ` : ''}

          <div style="position: relative; z-index: 1;">
            <p style="margin: 0; font-style: italic; font-size: ${design.fontSizeBody + 2}px;">
              محتوى النموذج القانوني سيظهر هنا عند الطباعة
            </p>
            <p style="margin: 12px 0 0 0; font-size: ${design.fontSizeBody - 2}px; color: #CBD5E1;">
              سيتم إدراج محتوى النموذج المحدد في هذا المكان
            </p>
          </div>
        </div>
        
        ${design.showFooter ? `
          <div style="
            margin-top: auto;
            padding-top: ${design.footerPaddingTop}px;
            border-top: 3px solid ${design.secondaryColor};
            font-size: ${design.fontSizeFooter}px;
            color: #1E293B;
            direction: rtl;
            display: flex;
            justify-content: space-between;
            align-items: center;
            line-height: 1.8;
          ">
            <div style="text-align: right;">
              ${design.addresses.filter(addr => addr.trim()).map(addr => `
                <div style="margin-bottom: 2px; font-size: ${design.addressesFontSize}px; font-family: '${design.addressesFontFamily}', 'Cairo', 'Almarai', sans-serif;">${addr}</div>
              `).join('')}
            </div>

            ${design.phoneNumbers.filter(phone => phone.trim()).length > 0 ? `
              <div style="direction: ltr; text-align: left;">
                <span style="font-weight: 500; font-size: ${design.phoneNumbersFontSize}px; font-family: '${design.phoneNumbersFontFamily}', 'Cairo', 'Almarai', sans-serif;">Mobile: </span>
                <span style="color: #DC2626; font-weight: 600; font-size: ${design.phoneNumbersFontSize}px; font-family: '${design.phoneNumbersFontFamily}', 'Cairo', 'Almarai', sans-serif;">
                  ${design.phoneNumbers.filter(phone => phone.trim()).join(' - ')}
                </span>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="spinner" style={{
            width: '48px',
            height: '48px',
            border: '4px solid #E2E8F0',
            borderTopColor: '#2563EB',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>جاري تحميل البيانات...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="design-letterhead-page">
        <div className="page-header">
          <h1 className="page-title">تصميم قالب الطلب</h1>
          {/* Action Buttons */}
          <div className="header-action-buttons">
            <button
              onClick={handleReset}
              className="btn-secondary"
              disabled={isReadOnly || subLoading}
              style={{
                opacity: isReadOnly || subLoading ? 0.5 : 1,
                cursor: isReadOnly || subLoading ? 'not-allowed' : 'pointer'
              }}
            >
              <FiRefreshCw size={16} />
              إعادة تعيين
            </button>
            <button onClick={handlePreview} className="btn-secondary">
              <FiEye size={16} />
              معاينة
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              disabled={saving || isReadOnly || subLoading}
              style={{
                opacity: (saving || isReadOnly || subLoading) ? 0.5 : 1,
                cursor: (saving || isReadOnly || subLoading) ? 'not-allowed' : 'pointer'
              }}
            >
              <FiSave size={16} />
              {saving ? 'جاري الحفظ...' : 'تحديث'}
            </button>
          </div>
        </div>

        {/* Mobile Tabs Switcher */}
        <div className="mobile-tabs">
          <button
            className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit')}
          >
            <span>تعديل التصميم</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            <span>معاينة القالب</span>
          </button>
        </div>

        <div className="design-container">
          {/* Live Preview - Visible always on desktop, conditionally on mobile */}
          <div className={`preview-section ${activeTab === 'preview' ? 'mobile-visible' : 'mobile-hidden'}`}>
            <div className="canvas-container">
              <div
                className="a4-page-preview"
                dangerouslySetInnerHTML={{ __html: generatePreviewHTML() }}
              />
            </div>
          </div>

          {/* Design Controls - Visible always on desktop, conditionally on mobile */}
          <div className={`controls-section ${activeTab === 'edit' ? 'mobile-visible' : 'mobile-hidden'}`}>
            <div className="sidebar-section">
              <div className="section-content">
                <div className="form-content">
                  {/* Lawyer Information */}
                  {/* Logo Upload - Moved to top */}
                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-text">الشعار المخصص</span>
                    </label>
                    <div className="logo-upload-section">
                      {customLogoPreview ? (
                        <div className="logo-preview">
                          <div style={{ position: 'relative' }}>
                            <img src={customLogoPreview} alt="Logo preview" />
                            <button
                              onClick={removeCustomLogo}
                              className="remove-btn"
                              disabled={isReadOnly || subLoading}
                              style={{
                                opacity: isReadOnly || subLoading ? 0.5 : 1,
                                cursor: isReadOnly || subLoading ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <FiX size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="upload-btn">
                          <FiUpload size={16} />
                          <span>اختر صورة للشعار (Upload Logo)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            style={{ display: 'none' }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Header Labels */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-text">العنوان الإنجليزي</span>
                      </label>
                      <input
                        type="text"
                        value={design.headerLabelEn}
                        onChange={(e) => handleInputChange('headerLabelEn', e.target.value)}
                        placeholder="LAWYER"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-text">العنوان العربي</span>
                      </label>
                      <input
                        type="text"
                        value={design.headerLabelAr}
                        onChange={(e) => handleInputChange('headerLabelAr', e.target.value)}
                        placeholder="المحامي"
                        className="form-input"
                      />
                    </div>
                  </div>

                  {/* Header Label Font & Size */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-text">خط العنوان</span>
                      </label>
                      <select
                        value={design.headerLabelFontFamily}
                        onChange={(e) => handleInputChange('headerLabelFontFamily', e.target.value)}
                        className="form-input"
                      >
                        <option value="Cairo">Cairo</option>
                        <option value="Almarai">Almarai</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Arial">Arial</option>
                        <option value="Traditional Arabic">Traditional Arabic</option>
                        <option value="Arabic Typesetting">Arabic Typesetting</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-text">حجم خط العنوان</span>
                      </label>
                      <input
                        type="number"
                        value={design.headerLabelFontSize}
                        onChange={(e) => handleInputChange('headerLabelFontSize', parseInt(e.target.value))}
                        min="8"
                        max="24"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-text">اسم المحامي بالإنجليزية</span>
                        <span className="label-required">*</span>
                      </label>
                      <input
                        type="text"
                        value={design.lawyerNameEn}
                        onChange={(e) => handleInputChange('lawyerNameEn', e.target.value)}
                        placeholder="يرجى إدخال اسم المحامي بالإنجليزية"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-text">اسم المحامي بالعربية</span>
                        <span className="label-required">*</span>
                      </label>
                      <input
                        type="text"
                        value={design.lawyerNameAr}
                        onChange={(e) => handleInputChange('lawyerNameAr', e.target.value)}
                        placeholder="يرجى إدخال اسم المحامي بالعربية"
                        className="form-input"
                      />
                    </div>
                  </div>

                  {/* Lawyer Name Font & Size */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-text">خط اسم المحامي</span>
                      </label>
                      <select
                        value={design.lawyerNameFontFamily}
                        onChange={(e) => handleInputChange('lawyerNameFontFamily', e.target.value)}
                        className="form-input"
                      >
                        <option value="Cairo">Cairo</option>
                        <option value="Almarai">Almarai</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Arial">Arial</option>
                        <option value="Traditional Arabic">Traditional Arabic</option>
                        <option value="Arabic Typesetting">Arabic Typesetting</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-text">حجم خط اسم المحامي</span>
                      </label>
                      <input
                        type="number"
                        value={design.lawyerNameFontSize}
                        onChange={(e) => handleInputChange('lawyerNameFontSize', parseInt(e.target.value))}
                        min="10"
                        max="36"
                        className="form-input"
                      />
                    </div>
                  </div>



                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-text">عناوين المكتب</span>
                      <span className="label-required">*</span>
                    </label>
                    {design.addresses.map((addr, index) => (
                      <div key={index} className="array-input-group">
                        <input
                          type="text"
                          value={addr}
                          onChange={(e) => handleArrayChange('addresses', index, e.target.value)}
                          placeholder="يرجى إدخال عنوان المكتب"
                          className="form-input"
                        />
                        {design.addresses.length > 1 && (
                          <button
                            onClick={() => removeArrayItem('addresses', index)}
                            className="remove-item-btn"
                            title="حذف العنوان"
                          >
                            <FiX size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => addArrayItem('addresses')} className="add-item-btn">
                      + إضافة عنوان آخر
                    </button>
                  </div>

                  {/* Addresses Font & Size */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-text">خط العناوين</span>
                      </label>
                      <select
                        value={design.addressesFontFamily}
                        onChange={(e) => handleInputChange('addressesFontFamily', e.target.value)}
                        className="form-input"
                      >
                        <option value="Cairo">Cairo</option>
                        <option value="Almarai">Almarai</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Arial">Arial</option>
                        <option value="Traditional Arabic">Traditional Arabic</option>
                        <option value="Arabic Typesetting">Arabic Typesetting</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-text">حجم خط العناوين</span>
                      </label>
                      <input
                        type="number"
                        value={design.addressesFontSize}
                        onChange={(e) => handleInputChange('addressesFontSize', parseInt(e.target.value))}
                        min="8"
                        max="18"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-text">أرقام الهاتف المحمول</span>
                      <span className="label-required">*</span>
                    </label>
                    {design.phoneNumbers.map((phone, index) => (
                      <div key={index} className="array-input-group">
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => handleArrayChange('phoneNumbers', index, e.target.value)}
                          placeholder="يرجى إدخال رقم الهاتف"
                          className="form-input"
                        />
                        {design.phoneNumbers.length > 1 && (
                          <button
                            onClick={() => removeArrayItem('phoneNumbers', index)}
                            className="remove-item-btn"
                            title="حذف الرقم"
                          >
                            <FiX size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => addArrayItem('phoneNumbers')} className="add-item-btn">
                      + إضافة رقم آخر
                    </button>
                  </div>

                  {/* Phone Numbers Font & Size */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-text">خط أرقام الهاتف</span>
                      </label>
                      <select
                        value={design.phoneNumbersFontFamily}
                        onChange={(e) => handleInputChange('phoneNumbersFontFamily', e.target.value)}
                        className="form-input"
                      >
                        <option value="Cairo">Cairo</option>
                        <option value="Almarai">Almarai</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Arial">Arial</option>
                        <option value="Traditional Arabic">Traditional Arabic</option>
                        <option value="Arabic Typesetting">Arabic Typesetting</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-text">حجم خط أرقام الهاتف</span>
                      </label>
                      <input
                        type="number"
                        value={design.phoneNumbersFontSize}
                        onChange={(e) => handleInputChange('phoneNumbersFontSize', parseInt(e.target.value))}
                        min="8"
                        max="18"
                        className="form-input"
                      />
                    </div>
                  </div>

                  {/* Design Settings */}

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={design.showHeader}
                        onChange={(e) => handleInputChange('showHeader', e.target.checked)}
                      />
                      <span>إظهار رأس الصفحة (اسم المحامي والشعار)</span>
                    </label>
                  </div>

                  {design.showHeader && (
                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={design.showBarAssociationLogo}
                          onChange={(e) => handleInputChange('showBarAssociationLogo', e.target.checked)}
                        />
                        <span>إظهار شعار نقابة المحامين العراقيين</span>
                      </label>
                    </div>
                  )}

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={design.showMiddleDecoration}
                        onChange={(e) => handleInputChange('showMiddleDecoration', e.target.checked)}
                      />
                      <span>إظهار الزخرفة الوسطى (ميزان العدالة أو الشعار)</span>
                    </label>
                  </div>

                  {design.showMiddleDecoration && (
                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-text">نوع الزخرفة الوسطى</span>
                      </label>
                      <select
                        value={design.middleDecorationType}
                        onChange={(e) => handleInputChange('middleDecorationType', e.target.value)}
                        className="form-input"
                      >
                        <option value="scales">ميزان العدالة</option>
                        <option value="logo">الشعار المخصص</option>
                        <option value="none">بدون زخرفة</option>
                      </select>
                    </div>
                  )}

                  {design.showMiddleDecoration && design.middleDecorationType !== 'none' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">
                          <span className="label-text">لون الزخرفة الوسطى</span>
                        </label>
                        <div className="color-input-group">
                          <input
                            type="color"
                            value={design.middleDecorationColor}
                            onChange={(e) => handleInputChange('middleDecorationColor', e.target.value)}
                          />
                          <input
                            type="text"
                            value={design.middleDecorationColor}
                            onChange={(e) => handleInputChange('middleDecorationColor', e.target.value)}
                            className="form-input color-text-input"
                            placeholder="#A78BFA"
                          />
                        </div>
                      </div>

                      {design.middleDecorationType === 'logo' && (
                        <div className="form-group">
                          <label className="form-label">
                            <span className="label-text">شعار العلامة المائية</span>
                          </label>
                          <div className="logo-upload-section">
                            {watermarkLogoPreview ? (
                              <div className="logo-preview">
                                <div style={{ position: 'relative' }}>
                                  <img src={watermarkLogoPreview} alt="Watermark preview" />
                                  <button
                                    onClick={removeWatermarkLogo}
                                    className="remove-btn"
                                    disabled={isReadOnly || subLoading}
                                    style={{
                                      opacity: isReadOnly || subLoading ? 0.5 : 1,
                                      cursor: isReadOnly || subLoading ? 'not-allowed' : 'pointer'
                                    }}
                                  >
                                    <FiX size={16} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="upload-btn">
                                <FiUpload size={16} />
                                <span>اختر صورة للعلامة المائية</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleWatermarkUpload}
                                  style={{ display: 'none' }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={design.showFooter}
                        onChange={(e) => handleInputChange('showFooter', e.target.checked)}
                      />
                      <span>إظهار تذييل الصفحة (العناوين وأرقام الهاتف)</span>
                    </label>
                  </div>

                  {/* Styling */}
                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-text">اللون الأساسي</span>
                    </label>
                    <div className="color-input-group">
                      <input
                        type="color"
                        value={design.primaryColor}
                        onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                      />
                      <input
                        type="text"
                        value={design.primaryColor}
                        onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                        className="form-input color-text-input"
                        placeholder="#1E3A8A"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-text">اللون الثانوي</span>
                    </label>
                    <div className="color-input-group">
                      <input
                        type="color"
                        value={design.secondaryColor}
                        onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                      />
                      <input
                        type="text"
                        value={design.secondaryColor}
                        onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                        className="form-input color-text-input"
                        placeholder="#22C55E"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-text">نوع الخط</span>
                    </label>
                    <select
                      value={design.fontFamily}
                      onChange={(e) => handleInputChange('fontFamily', e.target.value)}
                      className="form-input"
                    >
                      <option value="Cairo">Cairo - خط حديث للعربية</option>
                      <option value="Almarai">Almarai - خط عربي أنيق</option>
                      <option value="Times New Roman">Times New Roman - خط كلاسيكي</option>
                      <option value="Arial">Arial - خط واضح</option>
                      <option value="Traditional Arabic">Traditional Arabic - خط عربي تقليدي</option>
                      <option value="Arabic Typesetting">Arabic Typesetting - خط عربي احترافي</option>
                    </select>
                  </div>

                </div>
              </div>
            </div>

            {/* Messages */}
            {successMessage && (
              <div className="message success">{successMessage}</div>
            )}
            {errorMessage && (
              <div className="message error">{errorMessage}</div>
            )}
          </div>
        </div>

        {/* Preview Modal */}
        {showPreviewModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>معاينة القالب</h3>
                <button onClick={() => setShowPreviewModal(false)} className="close-modal-btn">
                  <FiX size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div
                  className="a4-page-preview modal-preview"
                  dangerouslySetInnerHTML={{ __html: generatePreviewHTML() }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .main-content {
          padding: 0 !important;
          margin: 0 !important;
          padding-top: 20px !important;
          height: auto !important;
          min-height: 100vh !important;
          overflow: visible !important;
        }
      `}</style>
      <style jsx>{`
        .design-letterhead-page {
          padding: 0;
          margin: 0;
          direction: rtl;
          font-family: 'Cairo', 'Almarai', sans-serif;
          background: #F8FAFC;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          padding-top: 60px;
        }

        .page-header {
          padding: 8px 24px;
          background: white;
          border-bottom: 1px solid #E2E8F0;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 40px;
        }

        .page-title {
          font-size: 20px;
          font-weight: 700;
          color: #1E293B;
          margin: 0;
        }

        .header-action-buttons {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .header-action-buttons .btn-primary,
        .header-action-buttons .btn-secondary {
          padding: 8px 24px;
          font-size: 15px;
          min-width: 120px;
          white-space: nowrap;
        }

        .mobile-tabs {
          display: none;
        }

        .design-container {
          display: grid;
          grid-template-columns: 60% 40%;
          gap: 0;
          flex: 1;
          min-height: calc(100vh - 60px);
        }

        .preview-section {
          background: #94a3b8;
          padding: 40px;
          display: flex;
          flex-direction: column;
          border-left: 1px solid #E2E8F0;
        }

        .canvas-container {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          min-height: 0;
          padding-top: 20px;
        }

        .a4-page-preview {
          width: 21cm;
          min-height: 29.7cm;
          background: white;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
          border-radius: 12px;
          margin: 0 auto;
        }

        .a4-page-preview > :global(div) {
          width: 100%;
          border-radius: 12px;
        }

        .controls-section {
          background: white;
          padding: 0;
          display: flex;
          flex-direction: column;
          border-left: 1px solid #E2E8F0;
          overflow-y: auto;
        }

        .sidebar-section {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .section-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .form-content {
          flex: 1;
          padding: 16px 20px 80px 20px;
        }

        .form-content::-webkit-scrollbar {
          width: 6px;
        }

        .form-content::-webkit-scrollbar-track {
          background: #F1F5F9;
          border-radius: 3px;
        }

        .form-content::-webkit-scrollbar-thumb {
          background-color: #CBD5E1;
          border-radius: 3px;
        }

        .form-content::-webkit-scrollbar-thumb:hover {
          background-color: #94A3B8;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 700;
          color: #475569;
        }

        .label-text {
          color: #1E293B;
        }

        .label-required {
          color: #DC2626;
        }

        .form-input {
          width: 100%;
          padding: 8px 12px;
          border: 1.5px solid #E2E8F0;
          border-radius: 6px;
          font-size: 13px;
          font-family: inherit;
          transition: all 0.2s;
          background: white;
        }

        .form-input:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .form-input::placeholder {
          color: #94A3B8;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          background: #F8FAFC;
          border-radius: 6px;
          border: 1px solid #E2E8F0;
          margin-bottom: 12px;
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          flex: 1;
          margin: 0;
        }

        .checkbox-group input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #2563EB;
        }

        .array-input-group {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .array-input-group .form-input {
          flex: 1;
        }

        .remove-item-btn {
          padding: 8px;
          background: #FEE2E2;
          color: #DC2626;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .remove-item-btn:hover {
          background: #FECACA;
        }

        .add-item-btn {
          padding: 8px 12px;
          background: #EFF6FF;
          color: #2563EB;
          border: 1.5px solid #2563EB;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
          align-self: flex-start;
        }

        .add-item-btn:hover {
          background: #DBEAFE;
        }

        .logo-upload-section {
          margin-top: 4px;
        }

        .logo-preview {
          position: relative;
          display: inline-block;
        }

        .logo-preview img {
          max-width: 150px;
          max-height: 150px;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
        }

        .remove-btn {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 28px;
          height: 28px;
          background: #DC2626;
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: #F8FAFC;
          border: 2px dashed #CBD5E1;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          color: #475569;
          transition: all 0.2s;
        }

        .upload-btn:hover {
          background: #F1F5F9;
          border-color: #94A3B8;
        }

        .color-input-group {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .color-input-group input[type="color"] {
          width: 50px;
          height: 36px;
          border: 1.5px solid #E2E8F0;
          border-radius: 6px;
          cursor: pointer;
        }

        .color-text-input {
          flex: 1;
        }

        .form-group select {
          width: 100%;
          padding: 8px 12px;
          border: 1.5px solid #E2E8F0;
          border-radius: 6px;
          font-size: 13px;
          font-family: inherit;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .form-group select:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .action-buttons {
          display: flex;
          gap: 10px;
          padding: 12px 20px;
          border-top: 1px solid #E2E8F0;
          background: #FAFBFC;
          flex-shrink: 0;
          position: sticky;
          bottom: 0;
          z-index: 10;
        }

        .btn-primary,
        .btn-secondary {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-primary {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: white;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.15);
        }

        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(37, 99, 235, 0.25);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: white;
          color: #475569;
          border: 1.5px solid #E2E8F0;
        }

        .btn-secondary:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
        }

        .message {
          margin: 0 20px 16px 20px;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 13px;
        }

        .message.success {
          background: #D1FAE5;
          color: #065F46;
        }

        .message.error {
          background: #FEE2E2;
          color: #991B1B;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1400px) {
          .design-container {
            grid-template-columns: 55% 45%;
          }

          .preview-section {
            padding: 30px;
          }

          .a4-page-preview {
            width: 18cm;
            min-height: 25cm;
          }
        }

        @media (max-width: 1200px) {
          .design-letterhead-page {
            height: auto;
            min-height: 100vh;
            background: #F8FAFC;
            padding-top: 80px;
          }

          .mobile-tabs {
            display: flex;
            width: 100%;
            background: white;
            padding: 10px 12px;
            gap: 0;
            position: sticky;
            top: 0;
            z-index: 100;
            border-bottom: 1px solid #E2E8F0;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          }

          .tab-btn {
            flex: 1;
            width: 50%;
            padding: 12px 8px;
            border: none;
            background: #F1F5F9;
            color: #64748B;
            border-radius: 0;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            font-family: inherit;
            min-height: 48px;
            text-align: center;
            border-bottom: 3px solid transparent;
          }

          .tab-btn:first-child {
            border-radius: 8px 0 0 8px;
          }

          .tab-btn:last-child {
            border-radius: 0 8px 8px 0;
          }

          .tab-btn:active {
            transform: scale(0.98);
          }

          .tab-btn.active {
            background: #2563EB;
            color: white;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
            border-bottom-color: #1D4ED8;
          }

          .design-container {
            display: flex;
            flex-direction: column;
            height: auto;
            width: 100%;
          }

          .preview-section.mobile-hidden,
          .controls-section.mobile-hidden {
            display: none;
          }

          .preview-section.mobile-visible {
            display: flex;
            padding: 16px;
            background: #F1F5F9;
            justify-content: center;
            flex: 1;
            width: 100%;
          }

          .controls-section.mobile-visible {
            display: flex;
            flex-direction: column;
            flex: 1;
            width: 100%;
            background: #F8FAFC;
          }

          .preview-section {
            border-left: none;
            height: auto;
            overflow: visible;
            flex: 1;
            width: 100%;
          }

          .controls-section {
            border-left: none;
            height: auto;
            flex: 1;
            width: 100%;
          }

          .section-content, .form-content {
            height: auto;
            overflow: visible;
          }

          /* Responsive A4 Scaling - Container-based approach */
          .canvas-container {
            width: 100%;
            display: flex;
            justify-content: center;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            padding: 16px 0;
          }

          .a4-page-preview {
            width: 21cm;
            min-height: 29.7cm;
            transform: none;
            margin: 0;
            flex-shrink: 0;
          }

          /* Stack form grids on mobile */
          .form-group[style*="grid"] {
            grid-template-columns: 1fr !important;
          }

          /* Improve touch targets */
          .form-input {
            min-height: 44px;
            padding: 12px 16px;
            font-size: 16px;
          }

          .btn-primary,
          .btn-secondary {
            min-height: 44px;
            padding: 12px 20px;
            font-size: 14px;
          }

          .remove-item-btn,
          .add-item-btn {
            min-height: 44px;
            min-width: 44px;
          }

          .page-header {
            padding: 8px 16px;
            flex-wrap: wrap;
          }

          .header-action-buttons {
            gap: 8px;
            flex-wrap: nowrap;
            width: auto;
          }

          .header-action-buttons .btn-primary,
          .header-action-buttons .btn-secondary {
            min-height: 40px;
            padding: 8px 14px;
            font-size: 14px;
            min-width: auto;
            white-space: nowrap;
            border-radius: 8px;
            flex: 0 0 auto;
          }

          .header-action-buttons .btn-primary {
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
          }

          .header-action-buttons .btn-secondary:nth-child(2) {
            display: none;
          }

          .form-content {
            padding: 20px !important;
            padding-bottom: 100px !important;
            background: white;
            border-radius: 12px;
            margin: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          }

          .form-group {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid #F1F5F9;
          }

          .form-group:last-child {
            border-bottom: none;
            margin-bottom: 0;
          }

          /* Zero-bottom-gap for Layout */
          :global(.main-content) {
            padding-bottom: 0px !important;
          }
        }

        /* Tablet-specific optimizations */
        @media (min-width: 768px) and (max-width: 1024px) {
          .design-container {
            grid-template-columns: 1fr 1fr;
          }

          .preview-section {
            padding: 24px;
          }

          .canvas-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .a4-page-preview {
            width: 18cm;
            min-height: 25cm;
          }

          .form-input {
            min-height: 40px;
            padding: 10px 14px;
          }
        }

        /* Small mobile optimizations */
        @media (max-width: 480px) {
          .page-header {
            padding: 10px 12px;
            gap: 6px;
          }

          .page-title {
            font-size: 15px;
            flex-shrink: 1;
            min-width: 0;
          }

          .header-action-buttons {
            gap: 5px;
          }

          .header-action-buttons .btn-primary,
          .header-action-buttons .btn-secondary {
            padding: 7px 10px;
            font-size: 13px;
            min-width: auto;
            min-height: 36px;
            white-space: nowrap;
            gap: 4px;
          }

          .header-action-buttons .btn-secondary svg,
          .header-action-buttons .btn-primary svg {
            flex-shrink: 0;
          }

          .mobile-tabs {
            padding: 8px 10px;
            gap: 0;
          }

          .tab-btn {
            padding: 10px 6px;
            font-size: 13px;
            min-height: 44px;
          }

          .preview-section.mobile-visible {
            padding: 12px;
          }

          .form-content {
            padding: 16px !important;
            padding-bottom: 100px !important;
            background: white;
            border-radius: 12px;
            margin: 10px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          }

          .form-group {
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid #F1F5F9;
          }

          .form-group:last-child {
            border-bottom: none;
            margin-bottom: 0;
          }
        }

        /* Very small mobile */
        @media (max-width: 360px) {
          .page-title {
            font-size: 14px;
          }

          .header-action-buttons .btn-primary,
          .header-action-buttons .btn-secondary {
            padding: 6px 8px;
            font-size: 12px;
            gap: 3px;
          }

          .tab-btn {
            font-size: 12px;
            padding: 9px 4px;
          }
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        @media (max-width: 768px) {
          .modal-content {
            width: 100%;
            height: 100vh;
            max-height: 100vh;
            border-radius: 0;
          }

          .modal-body {
            padding: 12px;
          }

          .modal-preview {
            transform: none;
            width: 100%;
          }

          .canvas-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .a4-page-preview {
            width: 21cm;
            min-height: 29.7cm;
            transform: none;
            margin: 0;
          }

          .modal-header h3 {
            font-size: 16px;
          }

          .close-modal-btn {
            padding: 8px;
            min-width: 44px;
            min-height: 44px;
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid #E2E8F0;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1E293B;
        }

        .close-modal-btn {
          background: transparent;
          border: none;
          color: #64748B;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .close-modal-btn:hover {
          background: #F1F5F9;
          color: #EF4444;
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          background: #F8FAFC;
          display: flex;
          justify-content: center;
        }

        .modal-preview {
          transform: scale(0.9);
          transform-origin: top center;
        }
      `}</style>
    </Layout >
  );
};

export default withAuth(DesignLetterheadPage, ['can_edit_template'], true);
