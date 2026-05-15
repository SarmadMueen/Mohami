import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';
import { useRouter } from 'next/router';
import Link from 'next/link';

const EditLawyer = () => {
  const router = useRouter();
  const [lawyerInfo, setLawyerInfo] = useState(null);
  const [lawyerId, setLawyerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [idCardImage, setIdCardImage] = useState(null);
  const [templateImage, setTemplateImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentRole, setCurrentRole] = useState('');
  const [availableRoles, setAvailableRoles] = useState([]);

  useEffect(() => {
    const fetchLawyerInfo = async () => {
      try {
        const lawyerId = router.query.id;
        if (!lawyerId) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('lawyer_users')
          .select('*')
          .eq('id', lawyerId)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setLawyerInfo(data);
          setLawyerId(lawyerId);

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

          // Fetch available permission profiles
          const { data: profiles, error: profilesError } = await supabase
            .from('permission_profiles')
            .select('profile_name')
            .order('profile_name');

          if (!profilesError && profiles) {
            setAvailableRoles(profiles.map(p => p.profile_name));
          }
        } else {
          console.error('Lawyer not found');
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLawyerInfo((prevState) => ({
      ...prevState,
      [name]: value,
    }));
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

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let idCardImageUrl = lawyerInfo.id_card_picture_url || '';
      let templateImageUrl = lawyerInfo.template_picture_url || '';

      // Upload ID card image if changed
      if (idCardImage) {
        const idCardImageFileName = `${Date.now()}_id_card_${idCardImage.name}`;
        const idCardImagePath = `images/${idCardImageFileName}`;

        const { data: idCardImageData, error: idCardImageError } = await supabase.storage
          .from('images')
          .upload(idCardImagePath, idCardImage);

        if (idCardImageError) {
          console.error('Error uploading ID card image:', idCardImageError.message);
          setIsSaving(false);
          return;
        }

        const { publicURL: idCardPublicURL } = await supabase.storage
          .from('images')
          .getPublicUrl(idCardImagePath);

        idCardImageUrl = idCardPublicURL;
      }

      // Upload template image if changed
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

      // Prepare update data
      const updateData = {
        ...lawyerInfo,
        id_card_picture_url: idCardImageUrl,
        template_picture_url: templateImageUrl,
      };

      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.created_at;

      const { error } = await supabase
        .from('lawyer_users')
        .update(updateData)
        .eq('id', lawyerId);

      if (error) {
        throw error;
      }

      // Update role in user_metadata if changed
      if (lawyerInfo.email && currentRole) {
        const { error: roleUpdateError } = await supabase
          .from('user_metadata')
          .update({ role: currentRole })
          .eq('email', lawyerInfo.email);

        if (roleUpdateError) {
          console.error('Error updating role:', roleUpdateError);
          // Don't throw, just log the error
        }
      }

      console.log('Lawyer information updated successfully!');
      router.push('/lawyer/lawyer');
    } catch (error) {
      console.error('Error updating lawyer information:', error.message);
      alert('حدث خطأ أثناء تحديث معلومات المحامي');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleChange = (e) => {
    setCurrentRole(e.target.value);
  };

  const translateFieldTitle = (key) => {
    const translations = {
      lawyer_name: 'اسم المحامي',
      username: 'اسم المستخدم',
      id_card_number: 'رقم الهوية',
      file_number: 'رقم الاضبارة',
      retire_number: 'رقم التقاعد',
      registration_address: 'غرفة التسجيل',
      affiliation_date: 'تاريخ الانتماء',
      effective_until: 'نافذة لغاية',
      validity: 'الصلاحية',
      email: 'البريد الإلكتروني',
      roles: 'الأدوار',
      id_card_picture_url: 'صورة الهوية',
      template_picture_url: 'صورة البروفايل',
    };
    return translations[key] || key;
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
          <span className="breadcrumb-current">تعديل معلومات المحامي</span>
        </div>
      </div>
      <div className="container">
        <div className="form-title-wrapper">
          <div className="form-title">
            <h4>تعديل معلومات المحامي</h4>
            <button type="submit" onClick={handleFormSubmit} disabled={isSaving} className="save-button-top">
              {isSaving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
          <div className="divider"></div>
        </div>
        <div className="lawyer-grid">
          <form className="form" onSubmit={handleFormSubmit}>
            {/* Role Selection Field */}
            <div className="field">
              <label>صلاحية الحساب</label>
              <select 
                value={currentRole} 
                onChange={handleRoleChange}
              >
                <option value="">اختر الصلاحية</option>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            {Object.entries(lawyerInfo).map(([key, value]) => {
              if (['id', 'created_at', 'admin_user_id', 'roles'].includes(key)) {
                return null;
              }

              if (key === 'id_card_picture_url' || key === 'template_picture_url') {
                return (
                  <div className="field" key={key}>
                    <label>{translateFieldTitle(key)}</label>
                    {key === 'id_card_picture_url' ? (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleIdCardImageChange}
                      />
                    ) : (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleTemplateImageChange}
                      />
                    )}
                    {value && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <img
                          src={value}
                          alt={translateFieldTitle(key)}
                          style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px' }}
                        />
                      </div>
                    )}
                  </div>
                );
              }

              if (key === 'affiliation_date' || key === 'effective_until') {
                return (
                  <div className="field" key={key}>
                    <label>{translateFieldTitle(key)}</label>
                    <input
                      type="date"
                      name={key}
                      value={value || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                );
              }

              if (key === 'validity') {
                return (
                  <div className="field" key={key}>
                    <label>{translateFieldTitle(key)}</label>
                    <select name={key} value={value || ''} onChange={handleInputChange}>
                      <option value="">اختر الصلاحية</option>
                      <option value="أ">أ</option>
                      <option value="ب">ب</option>
                      <option value="ج">ج</option>
                    </select>
                  </div>
                );
              }

              if (key === 'registration_address') {
                return (
                  <div className="field" key={key}>
                    <label>{translateFieldTitle(key)}</label>
                    <textarea
                      name={key}
                      value={value || ''}
                      onChange={handleInputChange}
                      rows="1"
                      style={{ height: 'auto', minHeight: '42px' }}
                    />
                  </div>
                );
              }

              return (
                <div className="field" key={key}>
                  <label>{translateFieldTitle(key)}</label>
                  <input
                    type="text"
                    name={key}
                    value={value || ''}
                    onChange={handleInputChange}
                  />
                </div>
              );
            })}
          </form>
        </div>
      </div>
      <style jsx>{`
        .breadcrumb-container {
          direction: rtl;
          max-width: 1200px;
          margin: 20px auto 10px auto;
          padding: 0 15px;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: #6b7280;
        }

        .breadcrumb a {
          color: #3b82f6;
          text-decoration: none;
          transition: color 0.2s;
        }

        .breadcrumb a:hover {
          color: #2563eb;
          text-decoration: underline;
        }

        .breadcrumb-separator {
          color: #9ca3af;
        }

        .breadcrumb-current {
          color: #1f2937;
          font-weight: 500;
        }

        .container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          direction: rtl;
          background-color: #fff;
          border: 1px solid #ccc;
          padding: 15px;
          border-radius: 5px;
          box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
          max-width: 1200px;
          margin: 0 auto;
        }

        .form-title-wrapper {
          grid-column: 1 / -1;
          margin-bottom: 10px;
        }

        .form-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .form-title h4 {
          margin: 0;
          font-size: 1.5rem;
          color: #0070f3;
        }

        .save-button-top {
          padding: 10px 20px;
          background-color: #0070f3;
          color: #fff;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 1rem;
        }

        .save-button-top:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .divider {
          border-bottom: 2px solid #0070f3;
          margin-bottom: 10px;
        }

        .lawyer-grid {
          grid-column: 1 / -1;
        }

        .form {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .field {
          display: flex;
          flex-direction: column;
        }

        .field label {
          margin-bottom: 5px;
          font-weight: bold;
        }

        .field input,
        .field textarea,
        .field select {
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 5px;
          font-size: 1rem;
        }

        .field textarea {
          resize: none;
        }

        button {
          padding: 10px 15px;
          background-color: #0070f3;
          color: #fff;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 1rem;
          grid-column: 1 / -1;
        }

        button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .form-title {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .form-title h4 {
            font-size: 1.25rem;
          }

          .save-button-top {
            width: 100%;
          }

          button {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .container {
            padding: 10px;
          }

          .form {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Layout>
  );
};

export default withAuth(EditLawyer, ['can_add_lawyers'], true);

