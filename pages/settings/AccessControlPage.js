/* eslint-disable no-unused-vars */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';
import Layout from '../../components/layout/Layout';
import Switch from 'react-switch';
import Link from 'next/link';
import { HiOutlineUsers, HiOutlinePencil, HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi';

const AccessControlPage = () => {
  const [roles, setRoles] = useState([]);
  const [permissionProfiles, setPermissionProfiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [missingColumns, setMissingColumns] = useState([]);
  const [newProfileName, setNewProfileName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [editingProfileName, setEditingProfileName] = useState('');

  // Permission mapping with Arabic titles and descriptions
  const permissionMapping = {
    can_edit_cases: {
      title: 'تعديل الدعاوي',
      description: 'السماح للمستخدم بتعديل معلومات الدعاوي الموجودة في النظام',
      category: 'الدعاوي'
    },
    can_add_cases: {
      title: 'إضافة دعاوي',
      description: 'السماح للمستخدم بإضافة دعاوي جديدة إلى النظام',
      category: 'الدعاوي'
    },
    can_delete_cases: {
      title: 'حذف الدعاوي',
      description: 'السماح للمستخدم بحذف الدعاوي من النظام',
      category: 'الدعاوي'
    },
    can_edit_template: {
      title: 'تعديل القوالب',
      description: 'السماح للمستخدم بتعديل القوالب الموجودة في النظام',
      category: 'القوالب'
    },
    can_add_template: {
      title: 'إضافة قوالب',
      description: 'السماح للمستخدم بإضافة قوالب جديدة إلى النظام',
      category: 'القوالب'
    },
    can_add_lawyers: {
      title: 'إضافة محامين',
      description: 'السماح للمستخدم بإضافة محامين جدد إلى النظام',
      category: 'المستخدمين'
    },
    can_view_setting: {
      title: 'عرض الإعدادات',
      description: 'السماح للمستخدم بعرض صفحة الإعدادات',
      category: 'النظام'
    },
    can_view_clients: {
      title: 'عرض العملاء',
      description: 'السماح للمستخدم بعرض قائمة العملاء في النظام',
      category: 'العملاء'
    },
    // Additional permissions that might be in the database
    can_add_fees: {
      title: 'إضافة رسوم',
      description: 'السماح للمستخدم بإدخال الرسوم على ملف الدعوى',
      category: 'الحسابات'
    },
    can_extract_fees_report: {
      title: 'استخراج تقرير الرسوم',
      description: 'السماح للمستخدم بتصدير أو إستخراج تقرير الرسوم لجميع الملفات',
      category: 'الحسابات'
    },
    can_view_accounts_schedule: {
      title: 'عرض جدول الحسابات',
      description: 'جدول الحسابات يتضمن عرض جدول الرسوم المدخلة وجدول الدفعات المستلمة',
      category: 'الحسابات'
    },
    can_add_sessions: {
      title: 'إضافة جلسة',
      description: 'السماح للمستخدم بإضافة جلسات جديدة إلى ملف الدعوى',
      category: 'ملف الدعوى'
    },
    can_create_action: {
      title: 'إنشاء إجراء جديد',
      description: 'السماح للمستخدم بإنشاء إجراءات جديدة في ملف الدعوى',
      category: 'ملف الدعوى'
    },
    can_add_updates: {
      title: 'إضافة تحديث',
      description: 'السماح للمستخدم بإضافة تحديثات إلى ملف الدعوى',
      category: 'ملف الدعوى'
    },
    can_add_notes: {
      title: 'إضافة ملاحظة',
      description: 'السماح للمستخدم بإضافة ملاحظات إلى ملف الدعوى',
      category: 'ملف الدعوى'
    },
    can_add_case_updates: {
      title: 'إضافة التحديثات إلى ملف الدعوى',
      description: 'السماح للمستخدم بإضافة الجلسات والإجراءات والتحديثات والملاحظات إلى ملف الدعوى',
      category: 'ملف الدعوى'
    }
  };

  useEffect(() => {
    const fetchPermissionProfiles = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('permission_profiles').select('*').order('id');

        if (error) {
          console.error('Error fetching permission profiles:', error);
        } else {
          setPermissionProfiles(data || []);
          
          // Determine which permission columns actually exist in the database
          if (data && data.length > 0) {
            const firstProfile = data[0];
            const allPossibleRoles = [
          'can_edit_cases',
          'can_edit_template',
          'can_add_template',
          'can_view_setting',
          'can_add_lawyers',
          'can_add_cases',
          'can_delete_cases',
          'can_view_clients',
              'can_add_sessions',
              'can_create_action',
              'can_add_updates',
              'can_add_notes',
              'can_add_case_updates',
            ];
            
            // Only include roles that exist in the database schema
            const existingRoles = allPossibleRoles.filter(role => Object.prototype.hasOwnProperty.call(firstProfile, role));
            setRoles(existingRoles);
            
            // Check for missing columns
            const missing = allPossibleRoles.filter(role => !Object.prototype.hasOwnProperty.call(firstProfile, role));
            setMissingColumns(missing);
          } else {
            // If no profiles exist, show all roles (they'll be created with defaults)
            setRoles([
              'can_edit_cases',
              'can_edit_template',
              'can_add_template',
              'can_view_setting',
              'can_add_lawyers',
              'can_add_cases',
              'can_delete_cases',
              'can_view_clients',
              'can_add_sessions',
              'can_create_action',
              'can_add_updates',
              'can_add_notes',
              'can_add_case_updates',
            ]);
          }
        }
      } catch (error) {
        console.error('Error:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissionProfiles();
  }, []);

  const handleSwitchChange = async (profileId, role) => {
    // Store the previous state for potential revert
    const previousProfiles = [...permissionProfiles];
    
    // Update only the selected role for the specific profile
    const updatedProfiles = permissionProfiles.map((profile) => {
      if (profile.id === profileId) {
        return {
          ...profile,
          [role]: !profile[role],
        };
      }
      return profile;
    });

    // Update state immediately for UI responsiveness
    setPermissionProfiles(updatedProfiles);

    // Find the specific profile that was changed
    const changedProfile = updatedProfiles.find((profile) => profile.id === profileId);
    
    if (!changedProfile) {
      console.error('Profile not found');
      setPermissionProfiles(previousProfiles);
      return;
    }

    // Check if the column exists in the database before trying to update
    if (!roles.includes(role)) {
      alert(`خطأ: الصلاحية "${permissionMapping[role]?.title || role}" غير متاحة لأن العمود غير موجود في قاعدة البيانات. يرجى إضافة الأعمدة الجديدة أولاً.`);
      setPermissionProfiles(previousProfiles);
      return;
    }

    // Save to database automatically
    try {
      // First, try to update just the changed field
      const updateData = {
        [role]: changedProfile[role]
      };

      const { error } = await supabase
        .from('permission_profiles')
        .update(updateData)
        .eq('id', profileId);

      if (error) {
        console.error('Error updating permission profile:', error);
        
        // Check if error is due to missing column
        if (error.message && (error.message.includes('column') || error.message.includes('schema cache'))) {
          alert(`خطأ: العمود "${role}" غير موجود في قاعدة البيانات. يرجى إضافة الأعمدة الجديدة أولاً.\n\n${error.message}`);
        } else {
          alert(`حدث خطأ أثناء حفظ التغييرات: ${error.message || 'خطأ غير معروف'}`);
        }
        
        // Revert the change on error
        setPermissionProfiles(previousProfiles);
      } else {
        console.log('Permission profile updated successfully.');
      }
    } catch (error) {
      console.error('Error updating permission profile:', error.message);
      
      // Check if error is due to missing column
      if (error.message && (error.message.includes('column') || error.message.includes('schema cache'))) {
        alert(`خطأ: العمود "${role}" غير موجود في قاعدة البيانات. يرجى إضافة الأعمدة الجديدة أولاً.\n\n${error.message}`);
      } else {
        alert(`حدث خطأ أثناء حفظ التغييرات: ${error.message || 'خطأ غير معروف'}`);
      }
      
      // Revert the change on error
      setPermissionProfiles(previousProfiles);
    }
  };

  const handleSaveChanges = async () => {
    try {
      // Update all permission profiles in the database
      const { error } = await supabase.from('permission_profiles').upsert(permissionProfiles);
      if (error) {
        console.error('Error updating permission profiles:', error);
        alert('حدث خطأ أثناء حفظ التغييرات');
      } else {
      console.log('Permission profiles updated successfully.');
        alert('تم حفظ التغييرات بنجاح');
      }
    } catch (error) {
      console.error('Error updating permission profiles:', error.message);
      alert('حدث خطأ أثناء حفظ التغييرات');
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      alert('الرجاء إدخال اسم الفئة');
      return;
    }

    // Check for duplicate
    if (permissionProfiles.some(p => p.profile_name.trim() === newProfileName.trim())) {
      alert('هذه الفئة موجودة بالفعل');
      return;
    }

    setIsCreating(true);
    try {
      // Create new profile with all permissions set to false
      const newProfileData = {
        profile_name: newProfileName.trim(),
      };

      // Set all permission columns to false
      roles.forEach(role => {
        newProfileData[role] = false;
      });

      const { data, error } = await supabase
        .from('permission_profiles')
        .insert([newProfileData])
        .select();

      if (error) {
        console.error('Error creating profile:', error);
        alert('حدث خطأ أثناء إنشاء الفئة');
      } else {
        setPermissionProfiles([...permissionProfiles, data[0]]);
        setNewProfileName('');
        alert('تم إنشاء الفئة بنجاح');
      }
    } catch (error) {
      console.error('Error creating profile:', error.message);
      alert('حدث خطأ أثناء إنشاء الفئة');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProfile = async (profileId, profileName) => {
    const confirmed = window.confirm(`هل أنت متأكد من حذف فئة "${profileName}"؟ سيتم حذف جميع الصلاحيات المرتبطة بها.`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('permission_profiles')
        .delete()
        .eq('id', profileId);

      if (error) {
        console.error('Error deleting profile:', error);
        alert('حدث خطأ أثناء حذف الفئة');
      } else {
        setPermissionProfiles(permissionProfiles.filter(p => p.id !== profileId));
        alert('تم حذف الفئة بنجاح');
      }
    } catch (error) {
      console.error('Error deleting profile:', error.message);
      alert('حدث خطأ أثناء حذف الفئة');
    }
  };

  const handleStartRename = (profileId, currentName) => {
    setEditingProfileId(profileId);
    setEditingProfileName(currentName);
  };

  const handleSaveRename = async (profileId) => {
    if (!editingProfileName.trim()) {
      alert('الرجاء إدخال اسم الفئة');
      return;
    }

    // Check for duplicate
    if (permissionProfiles.some(p => p.id !== profileId && p.profile_name.trim() === editingProfileName.trim())) {
      alert('هذه الفئة موجودة بالفعل');
      return;
    }

    try {
      const { error } = await supabase
        .from('permission_profiles')
        .update({ profile_name: editingProfileName.trim() })
        .eq('id', profileId);

      if (error) {
        console.error('Error renaming profile:', error);
        alert('حدث خطأ أثناء تغيير اسم الفئة');
      } else {
        setPermissionProfiles(permissionProfiles.map(p => 
          p.id === profileId ? { ...p, profile_name: editingProfileName.trim() } : p
        ));
        setEditingProfileId(null);
        setEditingProfileName('');
      }
    } catch (error) {
      console.error('Error renaming profile:', error.message);
      alert('حدث خطأ أثناء تغيير اسم الفئة');
    }
  };

  const handleCancelRename = () => {
    setEditingProfileId(null);
    setEditingProfileName('');
  };

  // Group permissions by category - only include roles that exist in database
  const groupedPermissions = roles.reduce((acc, role) => {
    const mapping = permissionMapping[role];
    if (mapping) {
      const category = mapping.category || 'أخرى';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        key: role,
        ...mapping
      });
    }
    return acc;
  }, {});

  // Filter permissions based on search query
  const filteredGroupedPermissions = Object.keys(groupedPermissions).reduce((acc, category) => {
    const filtered = groupedPermissions[category].filter(perm => {
      const searchLower = searchQuery.toLowerCase();
      return perm.title.toLowerCase().includes(searchLower) ||
             perm.description.toLowerCase().includes(searchLower) ||
             category.toLowerCase().includes(searchLower);
    });
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {});


  const [selectedProfileId, setSelectedProfileId] = useState(null);

  return (
    <Layout>
      <div className="access-control-page" style={{ direction: 'rtl' }}>
        <div className="access-control-header">
          {missingColumns.length > 0 && (
            <div className="missing-columns-alert" style={{
              background: '#FEF3C7',
              border: '1px solid #F59E0B',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem',
              direction: 'rtl'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#92400E' }}>
                ⚠️ تحذير: بعض الأعمدة غير موجودة في قاعدة البيانات
              </div>
              <div style={{ marginBottom: '0.75rem', color: '#78350F', fontSize: '0.875rem' }}>
                الأعمدة المفقودة: {missingColumns.join(', ')}
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.75rem', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.8125rem', color: '#1F2937', direction: 'ltr', textAlign: 'left' }}>
                <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>قم بتنفيذ SQL التالي في قاعدة البيانات:</div>
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {`ALTER TABLE permission_profiles
${missingColumns.map(col => `ADD COLUMN IF NOT EXISTS ${col} BOOLEAN DEFAULT false;`).join('\n')}`}
                </div>
              </div>
            </div>
          )}
          <div className="access-control-header-top">
            <Link href="./settings">
              <a className="all-settings-button">
                جميع الإعدادات
              </a>
            </Link>
            <div className="access-control-title-section">
              <div className="access-control-title-wrapper">
                <HiOutlineUsers className="access-control-title-icon" />
                <h1 className="access-control-title">الصلاحيات</h1>
              </div>
              <p className="access-control-description">
                يمكن التحكم بالصلاحيات الممنوحة لجميع انواع الحسابات ماعدا الحسابات الرئيسية
              </p>
            </div>
          </div>
          <div className="access-control-search">
            <label htmlFor="permission-search" className="search-label">البحث</label>
            <input
              type="text"
              id="permission-search"
              className="search-input"
              placeholder="ابحث عن الصلاحيات"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="create-profile-section">
            <input
              type="text"
              className="create-profile-input"
              placeholder="اسم الفئة الجديدة"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProfile()}
            />
            <button
              className="create-profile-button"
              onClick={handleCreateProfile}
              disabled={isCreating}
            >
              <HiOutlinePlus size={18} />
              <span>{isCreating ? 'جاري الإنشاء...' : 'إضافة فئة'}</span>
            </button>
          </div>
        </div>

        <div className="access-control-content">
          {loading ? (
            <div className="loading-spinner">جاري التحميل...</div>
          ) : (
            <>
              {/* Desktop/Tablet Table View */}
              <div className="desktop-view">
                <div className="permissions-table-container">
                  <table className="permissions-table">
                    <thead>
                      <tr>
                        <th className="permission-details-header">تفاصيل الصلاحية</th>
                        {permissionProfiles.map((profile) => (
                          <th key={profile.id} className="profile-header">
                            <div className="profile-header-content">
                              {editingProfileId === profile.id ? (
                                <input
                                  type="text"
                                  className="profile-name-input"
                                  value={editingProfileName}
                                  onChange={(e) => setEditingProfileName(e.target.value)}
                                  onBlur={() => handleSaveRename(profile.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRename(profile.id);
                                    if (e.key === 'Escape') handleCancelRename();
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <>
                                  <span>{profile.profile_name}</span>
                                  <div className="profile-header-actions">
                                    <HiOutlinePencil 
                                      className="edit-icon" 
                                      onClick={() => handleStartRename(profile.id, profile.profile_name)}
                                    />
                                    <HiOutlineTrash 
                                      className="delete-icon" 
                                      onClick={() => handleDeleteProfile(profile.id, profile.profile_name)}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(filteredGroupedPermissions).map((category) => (
                        <React.Fragment key={category}>
                          <tr className="category-row">
                            <td colSpan={permissionProfiles.length + 1} className="category-cell">
                              {category}
                            </td>
                          </tr>
                          {filteredGroupedPermissions[category].map((permission) => (
                            <tr key={permission.key} className="permission-row">
                              <td className="permission-details-cell">
                                <div className="permission-title">{permission.title}</div>
                                <div className="permission-description">{permission.description}</div>
                              </td>
                              {permissionProfiles.map((profile) => (
                                <td key={profile.id} className="permission-toggle-cell">
                                  <Switch
                                    onChange={() => handleSwitchChange(profile.id, permission.key)}
                                    checked={profile[permission.key] || false}
                                    onColor="#3b82f6"
                                    offColor="#e5e7eb"
                                    onHandleColor="#ffffff"
                                    offHandleColor="#ffffff"
                                    handleDiameter={20}
                                    uncheckedIcon={false}
                                    checkedIcon={false}
                                    height={24}
                                    width={48}
                                    className="permission-switch"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="mobile-view">
                {/* Profile Selector for Mobile */}
                <div className="mobile-profile-selector">
                  <label className="mobile-selector-label">اختر الفئة:</label>
                  <select 
                    className="mobile-profile-select"
                    value={selectedProfileId || ''}
                    onChange={(e) => setSelectedProfileId(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">-- اختر فئة --</option>
                    {permissionProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.profile_name}
                      </option>
                    ))}
                  </select>
                  {selectedProfileId && (
                    <div className="mobile-profile-actions">
                      <button 
                        className="mobile-action-button mobile-edit-button"
                        onClick={() => {
                          const profile = permissionProfiles.find(p => p.id === selectedProfileId);
                          if (profile) handleStartRename(profile.id, profile.profile_name);
                        }}
                      >
                        <HiOutlinePencil size={16} />
                        تعديل الاسم
                      </button>
                      <button 
                        className="mobile-action-button mobile-delete-button"
                        onClick={() => {
                          const profile = permissionProfiles.find(p => p.id === selectedProfileId);
                          if (profile) handleDeleteProfile(profile.id, profile.profile_name);
                        }}
                      >
                        <HiOutlineTrash size={16} />
                        حذف
                      </button>
                    </div>
                  )}
                </div>

                {/* Profile Rename Modal */}
                {editingProfileId && (
                  <div className="mobile-rename-modal">
                    <input
                      type="text"
                      className="mobile-rename-input"
                      value={editingProfileName}
                      onChange={(e) => setEditingProfileName(e.target.value)}
                      placeholder="اسم الفئة"
                    />
                    <div className="mobile-rename-actions">
                      <button 
                        className="mobile-rename-save"
                        onClick={() => handleSaveRename(editingProfileId)}
                      >
                        حفظ
                      </button>
                      <button 
                        className="mobile-rename-cancel"
                        onClick={handleCancelRename}
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {/* Permission Cards */}
                {selectedProfileId ? (
                  <div className="mobile-permissions-container">
                    {Object.keys(filteredGroupedPermissions).map((category) => (
                      <div key={category} className="mobile-category-section">
                        <h3 className="mobile-category-title">{category}</h3>
                        {filteredGroupedPermissions[category].map((permission) => {
                          const profile = permissionProfiles.find(p => p.id === selectedProfileId);
                          return (
                            <div key={permission.key} className="mobile-permission-card">
                              <div className="mobile-permission-info">
                                <div className="mobile-permission-title">{permission.title}</div>
                                <div className="mobile-permission-description">{permission.description}</div>
                              </div>
                              <Switch
                                onChange={() => handleSwitchChange(selectedProfileId, permission.key)}
                                checked={profile ? (profile[permission.key] || false) : false}
                                onColor="#3b82f6"
                                offColor="#e5e7eb"
                                onHandleColor="#ffffff"
                                offHandleColor="#ffffff"
                                handleDiameter={28}
                                uncheckedIcon={false}
                                checkedIcon={false}
                                height={32}
                                width={60}
                                className="mobile-permission-switch"
                              />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mobile-empty-state">
                    <HiOutlineUsers size={48} color="#9ca3af" />
                    <p>اختر فئة لعرض وتعديل الصلاحيات</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .access-control-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
          min-height: 100vh;
          padding-top: max(2rem, env(safe-area-inset-top));
          padding-bottom: max(2rem, env(safe-area-inset-bottom));
        }

        .access-control-header {
          background-color: #ffffff;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .access-control-header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          gap: 2rem;
        }

        .all-settings-button {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: #ffffff;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9375rem;
          transition: all 0.2s ease;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
        }

        .all-settings-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
        }

        .access-control-title-section {
          flex: 1;
        }

        .access-control-title-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .access-control-title-icon {
          width: 32px;
          height: 32px;
          color: #3b82f6;
        }

        .access-control-title {
          font-size: 1.875rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .access-control-description {
          font-size: 0.9375rem;
          color: #6b7280;
          margin: 0;
          line-height: 1.6;
        }

        .access-control-search {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .search-label {
          font-size: 0.9375rem;
          font-weight: 500;
          color: #374151;
          white-space: nowrap;
        }

        .search-input {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9375rem;
          transition: all 0.2s ease;
          background-color: #ffffff;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .create-profile-section {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .create-profile-input {
          flex: 0 0 300px;
          padding: 0.75rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9375rem;
          background-color: #ffffff;
        }

        .create-profile-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .create-profile-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .create-profile-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
        }

        .create-profile-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .access-control-content {
          background-color: #ffffff;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow-x: auto;
        }

        /* Desktop View Styles */
        .desktop-view {
          display: block;
        }

        .mobile-view {
          display: none;
        }

        .permissions-table-container {
          width: 100%;
          overflow-x: auto;
        }

        .permissions-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 800px;
        }

        .permissions-table thead {
          background-color: #f9fafb;
        }

        .permissions-table th {
          padding: 1rem;
          text-align: right;
          font-weight: 600;
          font-size: 0.9375rem;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
        }

        .permission-details-header {
          width: 40%;
          position: sticky;
          right: 0;
          z-index: 20;
          background-color: #f9fafb;
          box-shadow: -2px 0 5px rgba(0,0,0,0.05);
        }

        .profile-header {
          text-align: center;
        }

        .profile-header-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .profile-header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .edit-icon {
          width: 16px;
          height: 16px;
          color: #6b7280;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .edit-icon:hover {
          color: #3b82f6;
        }

        .delete-icon {
          width: 16px;
          height: 16px;
          color: #ef4444;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .delete-icon:hover {
          color: #dc2626;
        }

        .profile-name-input {
          padding: 0.375rem 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.9375rem;
          background-color: #ffffff;
          text-align: center;
          min-width: 120px;
        }

        .profile-name-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .category-row {
          background-color: #f3f4f6;
        }

        .category-cell {
          padding: 0.75rem 1rem;
          font-weight: 600;
          font-size: 1rem;
          color: #1f2937;
          border-bottom: 1px solid #e5e7eb;
        }

        .permission-row {
          border-bottom: 1px solid #e5e7eb;
          transition: background-color 0.2s ease;
          background-color: #ffffff;
        }

        .permission-row:hover {
          background-color: #f9fafb;
        }

        .permission-details-cell {
          padding: 1rem;
          vertical-align: top;
          position: sticky;
          right: 0;
          z-index: 10;
          background-color: inherit;
          box-shadow: -2px 0 5px rgba(0,0,0,0.05);
        }

        .permission-title {
          font-weight: 600;
          font-size: 0.9375rem;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .permission-description {
          font-size: 0.875rem;
          color: #6b7280;
          line-height: 1.5;
        }

        .permission-toggle-cell {
          text-align: center;
          padding: 1rem;
          vertical-align: middle;
        }

        .permission-switch {
          display: inline-block;
        }

        .loading-spinner {
          text-align: center;
          padding: 3rem;
          font-size: 1.125rem;
          color: #6b7280;
        }

        /* Mobile View Styles */
        .mobile-profile-selector {
          background: #f9fafb;
          padding: 1rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
        }

        .mobile-selector-label {
          display: block;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.75rem;
        }

        .mobile-profile-select {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          font-size: 1rem;
          background-color: #ffffff;
          margin-bottom: 1rem;
          -webkit-appearance: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: left 1rem center;
          background-size: 1.25rem;
        }

        .mobile-profile-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .mobile-profile-actions {
          display: flex;
          gap: 0.75rem;
        }

        .mobile-action-button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1rem;
          border: none;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mobile-edit-button {
          background-color: #3b82f6;
          color: #ffffff;
        }

        .mobile-edit-button:active {
          transform: scale(0.98);
        }

        .mobile-delete-button {
          background-color: #ef4444;
          color: #ffffff;
        }

        .mobile-delete-button:active {
          transform: scale(0.98);
        }

        .mobile-rename-modal {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .mobile-rename-input {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          font-size: 1rem;
          background-color: #ffffff;
          margin-bottom: 1rem;
        }

        .mobile-rename-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .mobile-rename-actions {
          display: flex;
          gap: 0.75rem;
        }

        .mobile-rename-save {
          flex: 1;
          padding: 0.875rem 1rem;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
        }

        .mobile-rename-save:active {
          transform: scale(0.98);
        }

        .mobile-rename-cancel {
          flex: 1;
          padding: 0.875rem 1rem;
          background-color: #f3f4f6;
          color: #374151;
          border: none;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
        }

        .mobile-rename-cancel:active {
          transform: scale(0.98);
        }

        .mobile-permissions-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .mobile-category-section {
          background: #f9fafb;
          border-radius: 12px;
          padding: 1rem;
        }

        .mobile-category-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 1rem 0;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .mobile-permission-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 0.75rem;
          transition: all 0.2s ease;
        }

        .mobile-permission-card:active {
          transform: scale(0.98);
          background-color: #f9fafb;
        }

        .mobile-permission-info {
          flex: 1;
          margin-left: 1rem;
        }

        .mobile-permission-title {
          font-weight: 600;
          font-size: 1rem;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .mobile-permission-description {
          font-size: 0.875rem;
          color: #6b7280;
          line-height: 1.5;
        }

        .mobile-permission-switch {
          flex-shrink: 0;
        }

        .mobile-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          text-align: center;
          color: #6b7280;
        }

        .mobile-empty-state p {
          margin-top: 1rem;
          font-size: 1rem;
        }

        /* Tablet Styles */
        @media (max-width: 1024px) {
          .access-control-page {
            padding: 1.5rem;
            padding-top: max(1.5rem, env(safe-area-inset-top));
            padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
          }

          .access-control-header {
            padding: 1.5rem;
          }

          .access-control-header-top {
            flex-direction: column;
            gap: 1.5rem;
          }

          .all-settings-button {
            align-self: flex-start;
          }

          .create-profile-input {
            flex: 1;
          }

          .create-profile-section {
            flex-direction: column;
          }

          .create-profile-button {
            width: 100%;
            justify-content: center;
          }
        }

        /* Mobile Styles */
        @media (max-width: 768px) {
          .access-control-page {
            padding: 1rem;
            padding-top: max(1rem, env(safe-area-inset-top));
            padding-bottom: max(1rem, env(safe-area-inset-bottom));
          }

          .access-control-header {
            padding: 1.25rem;
            margin-bottom: 1.5rem;
          }

          .missing-columns-alert {
            border-radius: 12px !important;
            padding: 1rem !important;
          }

          .access-control-title {
            font-size: 1.5rem;
          }

          .access-control-title-icon {
            width: 28px;
            height: 28px;
          }

          .access-control-description {
            font-size: 0.875rem;
          }

          .access-control-search {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
          }

          .search-label {
            margin-bottom: 0;
            font-size: 0.875rem;
          }

          .search-input {
            padding: 0.875rem 1rem;
            font-size: 1rem;
            border-radius: 12px;
          }

          .create-profile-input {
            padding: 0.875rem 1rem;
            font-size: 1rem;
            border-radius: 12px;
          }

          .create-profile-button {
            padding: 0.875rem 1.25rem;
            font-size: 1rem;
            border-radius: 12px;
            min-height: 48px;
          }

          .access-control-content {
            padding: 1rem;
            border-radius: 12px;
          }

          /* Hide desktop view on mobile */
          .desktop-view {
            display: none;
          }

          /* Show mobile view on mobile */
          .mobile-view {
            display: block;
          }

          /* Ensure touch targets are at least 44px for iOS */
          .mobile-action-button,
          .mobile-rename-save,
          .mobile-rename-cancel,
          .mobile-profile-select {
            min-height: 48px;
          }

          /* Improve tap targets for switches */
          .mobile-permission-card {
            min-height: 72px;
          }
        }

        /* Small Mobile Styles */
        @media (max-width: 480px) {
          .access-control-page {
            padding: 0.75rem;
            padding-top: max(0.75rem, env(safe-area-inset-top));
            padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
          }

          .access-control-header {
            padding: 1rem;
          }

          .access-control-title {
            font-size: 1.25rem;
          }

          .mobile-permission-card {
            flex-direction: column;
            align-items: flex-start;
            padding: 1rem;
          }

          .mobile-permission-info {
            margin-left: 0;
            margin-bottom: 1rem;
            width: 100%;
          }

          .mobile-permission-switch {
            align-self: flex-end;
          }

          .mobile-profile-actions {
            flex-direction: column;
          }

          .mobile-rename-actions {
            flex-direction: column;
          }
        }

        /* iOS Notch Support */
        @supports (padding: max(0px)) {
          .access-control-page {
            padding-top: max(2rem, env(safe-area-inset-top));
            padding-bottom: max(2rem, env(safe-area-inset-bottom));
          }
        }
      `}</style>
    </Layout>
  );
};

export default withAuth(AccessControlPage, ['can_view_setting'], true);
