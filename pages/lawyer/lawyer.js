
/* eslint-disable no-unused-vars */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';
import Layout from '../../components/layout/Layout';
import { useRouter } from 'next/router';
import { FaEdit, FaSync, FaUserShield, FaPlus, FaCog, FaTrash, FaLock } from 'react-icons/fa';
import { getApiUrl } from '../../lib/api';
import { useSubscription } from '../../context/SubscriptionContext';

const LawyerPage = () => {
  const router = useRouter();
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [newLawyerId, setNewLawyerId] = useState(null);
  const [deletingLawyerId, setDeletingLawyerId] = useState(null);
  const { maxLawyers, loading: subLoading, isReadOnly, planName } = useSubscription();

  const handleDeleteLawyer = async (lawyer) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف حساب المحامي "${lawyer.lawyer_name}"؟\nسيتم حذف جميع البيانات المرتبطة بهذا الحساب.\nهذا الإجراء لا يمكن التراجع عنه.`
    );
    if (!confirmed) return;

    setDeletingLawyerId(lawyer.id);
    try {
      const user = supabase.auth.user();
      if (!user) return;

      const response = await fetch(getApiUrl('/api/deleteLawyer'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lawyerUserId: lawyer.id,
          adminUserId: user.id
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'حدث خطأ أثناء حذف المحامي');
        return;
      }

      // Remove lawyer from local state
      setLawyers(prev => prev.filter(l => l.id !== lawyer.id));
      alert('تم حذف حساب المحامي بنجاح');
    } catch (error) {
      console.error('Error deleting lawyer:', error);
      alert('حدث خطأ أثناء حذف المحامي');
    } finally {
      setDeletingLawyerId(null);
    }
  };

  useEffect(() => {
    if (!router.isReady) return;

    const queryNewLawyerId = router.query.newLawyerId || null;
    setNewLawyerId(queryNewLawyerId);

    const fetchLawyers = async () => {
      try {
        setLoading(true);
        const user = supabase.auth.user();
        if (!user) {
          console.error('User not logged in');
          setLoading(false);
          return;
        }

        const userId = user.id;
        let finalLawyers = [];

        // Always try to get the user's role for permission checks
        const { data: roleMeta } = await supabase
          .from('user_metadata')
          .select('role, admin_user_id')
          .or(`user_id.eq.${userId},admin_user_id.eq.${userId},new_lawyer_id.eq.${userId}`)
          .neq('role', 'client_portal')
          .limit(1);

        if (roleMeta && roleMeta.length > 0) {
          setUserRole(roleMeta[0].role);
          setCurrentUserId(roleMeta[0].admin_user_id || userId);
        }

        // If newLawyerId is provided, fetch that specific lawyer directly
        if (queryNewLawyerId) {
          const lawyerIdNum = parseInt(queryNewLawyerId, 10);

          const { data: newLawyerData, error: newLawyerError } = await supabase
            .from('lawyer_users')
            .select('*')
            .eq('id', lawyerIdNum)
            .single();

          if (!newLawyerError && newLawyerData) {
            finalLawyers = [newLawyerData];

            // Also fetch all other lawyers under the same admin
            if (newLawyerData.admin_user_id) {
              const { data: allLawyers } = await supabase
                .from('lawyer_users')
                .select('*')
                .eq('admin_user_id', newLawyerData.admin_user_id);

              if (allLawyers) {
                // Put new lawyer first, then the rest
                finalLawyers = [
                  newLawyerData,
                  ...allLawyers.filter(l => l.id !== newLawyerData.id)
                ];
              }
            }
          } else {
            console.error('Failed to fetch new lawyer:', newLawyerError);
          }
        } else {
          // Normal flow: fetch lawyers based on role
          if (!roleMeta || roleMeta.length === 0) {
            console.error('Error fetching user metadata');
            setLoading(false);
            return;
          }

          const meta = roleMeta[0];
          const role = meta.role;

          let lookupId = null;

          // Determine which ID to use based on role
          if (role === 'الفئة 1' || role === 'super_admin') {
            lookupId = meta.admin_user_id || userId;
          } else if (role === 'الفئة 2') {
            lookupId = meta.admin_user_id;
          } else {
            console.error('Unknown role:', role);
            setLoading(false);
            return;
          }

          // Fetch lawyers from lawyer_users table where admin_user_id matches
          const { data: lawyersData, error: lawyersError } = await supabase
            .from('lawyer_users')
            .select('*')
            .eq('admin_user_id', lookupId);

          if (lawyersError) {
            console.error('Error fetching lawyers:', lawyersError);
            setLoading(false);
            return;
          }

          finalLawyers = lawyersData || [];
        }

        setLawyers(finalLawyers);
        setLoading(false);
      } catch (error) {
        console.error('Error:', error);
        setLoading(false);
      }
    };

    fetchLawyers();
  }, [router.isReady, router.query]);



  return (
    <Layout>
      <div className="lawyers-page-container">
        <div className="page-header">
          <div className="header-top">
            <h1 className="page-title">المحامين</h1>
            <span className="page-description">إدارة حسابات المحامين في مكتبك</span>
            {!loading && lawyers.length > 0 && (
              <span className="stat-item">
                <span className="stat-number">{lawyers.length}</span>
                <span className="stat-label">محامي</span>
              </span>
            )}
            <div className="header-actions">
              {!subLoading && maxLawyers > 0 && lawyers.length < maxLawyers ? (
                <button
                  className="action-button primary-button"
                  onClick={() => router.push('/settings/user_settings')}
                >
                  <FaPlus />
                  <span>إضافة محامي</span>
                </button>
              ) : !subLoading && (
                <button
                  className="action-button"
                  onClick={() => router.push('/settings/subscription')}
                  style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', cursor: 'pointer' }}
                  title={maxLawyers === 0 ? 'الباقة الحالية لا تتيح إضافة محامين' : `الحد الأقصى ${maxLawyers} محامي`}
                >
                  <FaLock />
                  <span>{maxLawyers === 0 ? 'ترقية الباقة لإضافة محامين' : `الحد الأقصى (${maxLawyers}) - ترقية`}</span>
                </button>
              )}
              <button
                className="action-button secondary-button"
                onClick={() => router.push('/settings/settings')}
              >
                <FaCog />
                <span>الإعدادات</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>جاري التحميل...</p>
          </div>
        ) : lawyers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="40" fill="#EFF6FF"/>
                <circle cx="40" cy="32" r="12" fill="#BFDBFE"/>
                <path d="M20 64C20 54 28 46 40 46C52 46 60 54 60 64V72H20V64Z" fill="#BFDBFE"/>
                <path d="M54 20L60 26M60 20L54 26" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="empty-text">لا يوجد محامين مسجلين</p>
            <p className="empty-subtext">قم بإضافة محامي جديد للبدء في إدارة فريقك</p>
            {!subLoading && maxLawyers > 0 ? (
              <button
                className="action-button primary-button empty-action"
                onClick={() => router.push('/settings/user_settings')}
              >
                <FaPlus />
                <span>إضافة محامي جديد</span>
              </button>
            ) : !subLoading && (
              <button
                className="action-button empty-action"
                onClick={() => router.push('/settings/subscription')}
                style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', cursor: 'pointer' }}
              >
                <FaLock />
                <span>ترقية الباقة لإضافة محامين</span>
              </button>
            )}
          </div>
        ) : (
          <div className="lawyers-grid">
            {lawyers.map((lawyer) => (
              <div 
                key={lawyer.id} 
                className={`lawyer-card ${lawyer.id === newLawyerId ? 'new-lawyer-card' : ''}`}
                ref={lawyer.id === newLawyerId ? (el => { if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }) : null}
              >
                {/* Card Top Accent */}
                <div className="card-accent"></div>

                {/* Category Tab */}
                <div className="card-category-tab">
                  {lawyer.roles || 'الفئة 1'}
                </div>

                {lawyer.id === newLawyerId && (
                  <div className="new-badge">
                    جديد
                  </div>
                )}

                {/* Profile Icon */}
                <div className="card-profile-icon">
                  {lawyer.template_picture_url ? (
                    <img
                      src={lawyer.template_picture_url}
                      alt={lawyer.lawyer_name || 'محامي'}
                      className="profile-image"
                    />
                  ) : (
                    <div className="profile-placeholder">
                      <span className="profile-initials">
                        {(lawyer.lawyer_name || 'م').charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="online-indicator"></div>
                </div>

                {/* Name */}
                <h2 className="card-name">{lawyer.lawyer_name || 'غير معروف'}</h2>

                {/* Job Title */}
                {lawyer.job_title && (
                  <p className="card-job-title">{lawyer.job_title}</p>
                )}

                {/* Role/Title */}
                {lawyer.roles && (
                  <div className="card-roles">
                    {typeof lawyer.roles === 'string'
                      ? lawyer.roles.split(',').map((role, idx) => (
                        <span key={idx} className="role-badge">{role.trim()}</span>
                      ))
                      : <span className="role-badge">{lawyer.roles}</span>
                    }
                  </div>
                )}

                {/* Info Details */}
                <div className="card-details">
                  {lawyer.email && (
                    <div className="detail-row">
                      <span className="detail-icon">📧</span>
                      <span className="detail-value">{lawyer.email}</span>
                    </div>
                  )}
                  {lawyer.file_number && (
                    <div className="detail-row">
                      <span className="detail-icon">📁</span>
                      <span className="detail-value">رقم الملف: {lawyer.file_number}</span>
                    </div>
                  )}
                  {lawyer.registration_address && (
                    <div className="detail-row">
                      <span className="detail-icon">📍</span>
                      <span className="detail-value">{lawyer.registration_address}</span>
                    </div>
                  )}
                  {lawyer.validity && (
                    <div className="detail-row">
                      <span className="detail-icon">📋</span>
                      <span className="detail-value">الصنف: {lawyer.validity}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="card-actions">
                  <button
                    className="action-btn edit-btn"
                    title="تعديل"
                    onClick={() => router.push(`/lawyer/edit_lawyer?id=${lawyer.id}`)}
                  >
                    <FaEdit />
                    <span>تعديل</span>
                  </button>
                  <button
                    className="action-btn performance-btn"
                    title="الأداء"
                    onClick={() => router.push(`/reports?tab=lawyerPerformance&lawyerName=${lawyer.lawyer_name || ''}`)}
                  >
                    <FaSync />
                    <span>الأداء</span>
                  </button>
                  <button
                    className="action-btn account-btn"
                    title="الحساب"
                    onClick={() => router.push(`/lawyer/lawyer_info?id=${lawyer.id}`)}
                  >
                    <FaUserShield />
                    <span>الحساب</span>
                  </button>
                  {(userRole === 'الفئة 1' || userRole === 'super_admin') && (
                    <button
                      className="action-btn delete-btn"
                      title="حذف"
                      disabled={deletingLawyerId === lawyer.id}
                      onClick={() => handleDeleteLawyer(lawyer)}
                    >
                      <FaTrash />
                      <span>{deletingLawyerId === lawyer.id ? 'جاري...' : 'حذف'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .lawyers-page-container {
          direction: rtl;
          padding: 2rem;
          background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
          min-height: auto;
          font-family: 'Almarai', sans-serif;
          overflow-x: hidden;
          max-width: 100vw;
          width: 100%;
          box-sizing: border-box;
        }

        .page-header {
          margin-bottom: 1.25rem;
          background: white;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
          border: 1px solid #e2e8f0;
        }

        .header-top {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.3rem 0.75rem;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-radius: 8px;
          border: 1px solid #bfdbfe;
        }

        .stat-number {
          font-size: 1rem;
          font-weight: 800;
          color: #1e40af;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #3b82f6;
          font-weight: 600;
        }

        .header-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          margin-right: auto;
        }

        .action-button {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          font-family: 'Cairo', 'Almarai', sans-serif;
          white-space: nowrap;
        }

        .action-button svg {
          width: 16px;
          height: 16px;
        }

        .primary-button {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: white;
          box-shadow: 0 4px 14px rgba(30, 64, 175, 0.25);
        }

        .primary-button:hover {
          box-shadow: 0 6px 20px rgba(30, 64, 175, 0.35);
          transform: translateY(-2px);
        }

        .secondary-button {
          background: white;
          color: #475569;
          border: 1.5px solid #e2e8f0;
        }

        .secondary-button:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }

        .page-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.02em;
          white-space: nowrap;
        }

        .page-description {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0;
          white-space: nowrap;
          border-right: 2px solid #e2e8f0;
          padding-right: 1rem;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 6rem;
          color: #64748b;
          font-size: 1rem;
          gap: 1rem;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 5rem 2rem;
          text-align: center;
          background: white;
          border-radius: 16px;
          border: 2px dashed #cbd5e1;
        }

        .empty-icon {
          margin-bottom: 1.5rem;
        }

        .empty-text {
          font-size: 1.25rem;
          color: #334155;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
        }

        .empty-subtext {
          font-size: 0.9rem;
          color: #94a3b8;
          margin: 0 0 1.5rem 0;
        }

        .empty-action {
          margin-top: 0.5rem;
        }

        .lawyers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .lawyer-card {
          position: relative;
          background: #ffffff;
          border-radius: 14px;
          padding: 0 1.25rem 1rem 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .lawyer-card:hover {
        }

        .card-accent {
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6);
          background-size: 200% 100%;
          margin-bottom: 0.75rem;
        }

        .lawyer-card:hover .card-accent {
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .new-lawyer-card {
          border: 2px solid #10b981;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.2);
          animation: pulse-green 2s ease-in-out;
        }

        .new-lawyer-card .card-accent {
          background: linear-gradient(90deg, #10b981, #34d399, #10b981);
          background-size: 200% 100%;
        }

        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 4px 16px rgba(16, 185, 129, 0.2); }
          50% { box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4); }
        }

        .new-badge {
          position: absolute;
          top: 4px;
          left: 0;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 0.35rem 0.75rem;
          border-radius: 0 0 10px 0;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.025em;
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
          z-index: 10;
        }

        .card-category-tab {
          position: absolute;
          top: 4px;
          right: 0;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: #ffffff;
          padding: 0.35rem 0.85rem;
          border-radius: 0 0 0 10px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.025em;
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
        }

        .card-profile-icon {
          margin-bottom: 0.5rem;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .profile-image {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #e0e7ff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: transform 0.3s ease;
        }

        .lawyer-card:hover .profile-image {
        }

        .profile-placeholder {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          overflow: hidden;
          background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
          border: 3px solid #e0e7ff;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s ease;
        }

        .lawyer-card:hover .profile-placeholder {
        }

        .profile-initials {
          font-size: 1.25rem;
          font-weight: 800;
          color: #4338ca;
        }

        .online-indicator {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 12px;
          height: 12px;
          background: #22c55e;
          border-radius: 50%;
          border: 2.5px solid white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }

        .card-name {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.15rem 0;
          line-height: 1.3;
        }

        .card-job-title {
          font-size: 0.7rem;
          color: #6366f1;
          font-weight: 600;
          margin: 0 0 0.25rem 0;
          background: #eef2ff;
          padding: 0.15rem 0.6rem;
          border-radius: 20px;
          display: inline-block;
        }

        .card-roles {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          justify-content: center;
          margin: 0.15rem 0 0.25rem 0;
        }

        .role-badge {
          display: inline-block;
          padding: 0.2rem 0.6rem;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: #ffffff;
          border-radius: 16px;
          font-size: 0.7rem;
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(59, 130, 246, 0.2);
          white-space: nowrap;
        }

        .card-details {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin: 0.4rem 0;
          padding: 0.5rem;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
        }

        .detail-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.82rem;
          color: #475569;
          text-align: right;
        }

        .detail-icon {
          font-size: 0.85rem;
          flex-shrink: 0;
        }

        .detail-value {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 500;
        }

        .card-actions {
          display: flex;
          gap: 0.4rem;
          margin-top: auto;
          width: 100%;
          padding-top: 0.5rem;
          border-top: 1px solid #f1f5f9;
          flex-wrap: wrap;
        }

        .action-btn {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          padding: 0.45rem 0.5rem;
          background: white;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          color: #475569;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          flex: 1;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .action-btn:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          transform: translateY(-1px);
        }

        .action-btn svg {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
        }

        .action-btn span {
          font-size: 0.8rem;
        }

        .edit-btn:hover {
          color: #2563eb;
          border-color: #93c5fd;
          background: #eff6ff;
        }

        .performance-btn:hover {
          color: #059669;
          border-color: #6ee7b7;
          background: #ecfdf5;
        }

        .account-btn:hover {
          color: #7c3aed;
          border-color: #c4b5fd;
          background: #f5f3ff;
        }

        .delete-btn {
          border-color: #fecaca;
          color: #dc2626;
          background: #fff5f5;
        }

        .delete-btn:hover {
          background: #fee2e2;
          border-color: #f87171;
          transform: translateY(-1px);
        }

        .delete-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 768px) {
          .lawyers-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .lawyers-page-container {
            padding: 1rem;
          }

          .page-header {
            padding: 1.25rem;
          }

          .page-title {
            font-size: 1.5rem;
          }

          .header-top {
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
          }

          .action-button {
            flex: 1;
            justify-content: center;
          }

          .lawyer-card {
            padding: 0 1.25rem 1.25rem 1.25rem;
          }

        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .lawyers-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
     `}</style>
    </Layout>
  );
};

export default withAuth(LawyerPage, ['can_add_lawyers']);
