import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getApiUrl } from '../../lib/api';
import Head from 'next/head';
import { supabase } from '../../lib/initSupabase';
import { ROLES } from '../roles';
import {
    Users,
    Search,
    RefreshCw,
    Clock,
    Calendar,
    ChevronLeft,
    Settings,
    AlertCircle,
    CheckCircle,
    Plus,
    Ban,
    ShieldCheck
} from 'lucide-react';

const ManageUsers = () => {
    const router = useRouter();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    // Extension Modal State
    const [showExtendModal, setShowExtendModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [extensionDays, setExtensionDays] = useState(14);
    const [isProcessing, setIsProcessing] = useState(false);

    // Lawyer Limit Modal State
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [selectedLimitUser, setSelectedLimitUser] = useState(null);
    const [customLimit, setCustomLimit] = useState(null);
    const [isProcessingLimit, setIsProcessingLimit] = useState(false);

    // Account Disable State
    const [isProcessingDisable, setIsProcessingDisable] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const session = supabase.auth.session();
        if (!session) {
            router.push('/admin');
            return;
        }

        const { data: metadata, error } = await supabase
            .from('user_metadata')
            .select('role')
            .eq('user_id', session.user.id)
            .single();

        if (error || !metadata || metadata.role !== 'super_admin') {
            router.push('/admin');
            return;
        }

        setCurrentUser(session.user);
        setIsAuthorized(true);
        fetchUsers(session.user.id);
    };

    const fetchUsers = async (adminId) => {
        const userId = adminId || currentUser?.id;
        if (!userId) return;

        setLoading(true);
        try {
            const response = await fetch(getApiUrl(`/api/admin/list-users?adminUserId=${userId}`));
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to fetch users');

            setUsers(data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
            setMessage({ type: 'error', text: `فشل في جلب قائمة المستخدمين: ${err.message}` });
        } finally {
            setLoading(false);
        }
    };

    const handleExtend = async () => {
        if (!selectedUser || !currentUser) return;
        setIsProcessing(true);

        try {
            const currentSub = (selectedUser.subscriptions || []).find(s => s.status === 'active') ||
                (selectedUser.subscriptions || [])[0];

            console.log('Extending subscription for:', selectedUser.arabic_name, 'with subId:', currentSub?.id);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const response = await fetch(getApiUrl('/api/admin/extend-subscription'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminUserId: currentUser.id,
                    targetUserId: selectedUser.user_id,
                    days: extensionDays,
                    subscriptionId: currentSub?.id
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error response:', errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || errorData.details || 'فشل في تمديد الصلاحية');
                } catch {
                    throw new Error('فشل في تمديد الصلاحية');
                }
            }

            const data = await response.json();
            console.log('Extension success:', data);

            setMessage({ type: 'success', text: `تم تمديد اشتراك ${selectedUser.arabic_name || selectedUser.username} يوم بنجاح` });
            setShowExtendModal(false);
            fetchUsers(currentUser.id);
        } catch (err) {
            console.error('Extension error:', err);
            setMessage({ type: 'error', text: err.message || 'حدث خطأ أثناء تمديد الاشتراك' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdateLimit = async () => {
        if (!selectedLimitUser || !currentUser) return;
        setIsProcessingLimit(true);

        try {
            const response = await fetch(getApiUrl('/api/admin/update-lawyer-limit'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminUserId: currentUser.id,
                    targetUserId: selectedLimitUser.user_id,
                    customLimit: customLimit
                })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'فشل في تحديث الحد الأقصى');

            setMessage({ type: 'success', text: `تم تحديث حد المحامين لـ ${selectedLimitUser.arabic_name || selectedLimitUser.username} بنجاح` });
            setShowLimitModal(false);
            fetchUsers(currentUser.id);
        } catch (err) {
            console.error('Update limit error:', err);
            setMessage({ type: 'error', text: err.message || 'حدث خطأ أثناء تحديث الحد الأقصى' });
        } finally {
            setIsProcessingLimit(false);
        }
    };

    const handleToggleDisable = async (user) => {
        if (!currentUser) return;
        setIsProcessingDisable(true);

        try {
            const response = await fetch(getApiUrl('/api/admin/toggle-user-disable'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminUserId: currentUser.id,
                    targetUserId: user.user_id,
                    isDisabled: !user.is_disabled
                })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'فشل في تحديث حالة الحساب');

            const action = user.is_disabled ? 'تفعيل' : 'تعطيل';
            setMessage({ type: 'success', text: `تم ${action} حساب ${user.arabic_name || user.username} بنجاح` });
            fetchUsers(currentUser.id);
        } catch (err) {
            console.error('Toggle disable error:', err);
            setMessage({ type: 'error', text: err.message || 'حدث خطأ أثناء تحديث حالة الحساب' });
        } finally {
            setIsProcessingDisable(false);
        }
    };

    const getSubStatus = (user) => {
        const activeSub = user.subscriptions?.find(s => s.status === 'active');
        if (!activeSub) return { label: 'لا يوجد اشتراك', class: 'inactive', days: 0 };

        const expiry = new Date(activeSub.current_period_end);
        const now = new Date();
        const diff = expiry.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 3600 * 24));

        if (days <= 0) return { label: 'منتهي الصلاحية', class: 'expired', days: 0 };
        if (activeSub.plan_id.includes('trial')) return { label: 'تجريبي', class: 'trial', days };
        return { label: 'مشترك فعال', class: 'active', days };
    };

    const filteredUsers = users.filter(user => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (user.arabic_name || '').toLowerCase().includes(term) ||
            (user.username || '').toLowerCase().includes(term) ||
            (user.email || '').toLowerCase().includes(term) ||
            (user.phone_number || '').includes(term) ||
            (user.office_name_ar || '').toLowerCase().includes(term)
        );
    }).sort((a, b) => {
        // Sort active users to the top
        const statusA = getSubStatus(a);
        const statusB = getSubStatus(b);
        
        // Active users first
        if (statusA.class === 'active' && statusB.class !== 'active') return -1;
        if (statusA.class !== 'active' && statusB.class === 'active') return 1;
        
        // Then by join date (newest first)
        const joinedA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const joinedB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return joinedB - joinedA;
    });

    const getLawyerLimit = (user) => {
        // If custom limit is set, use it
        if (user.custom_lawyer_limit !== null && user.custom_lawyer_limit !== undefined) {
            return user.custom_lawyer_limit;
        }
        // Otherwise use plan-based limit
        const activeSub = user.subscriptions?.find(s => s.status === 'active');
        if (!activeSub) return 0;
        const planId = activeSub.plan_id?.toLowerCase() || '';
        if (planId.includes('basic')) return 0;
        if (planId.includes('advanced')) return 2;
        if (planId.includes('trial')) return 2;
        return 0;
    };

    if (!isAuthorized && !loading) return null;

    return (
        <div className="admin-page" dir="rtl">
            <Head>
                <title>إدارة صلاحيات الحسابات - محامي برو</title>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
            </Head>

            {/* Header */}
            <header className="page-header">
                <div className="header-content">
                    <button className="back-btn" onClick={() => router.push('/admin')}>
                        <ChevronLeft size={20} />
                        لوحة التحكم
                    </button>
                    <div className="title-section">
                        <Users size={28} />
                        <h1>إدارة صلاحيات الحسابات</h1>
                    </div>
                </div>
            </header>

            <main className="main-content">
                {/* Messages */}
                {message.text && (
                    <div className={`alert-banner ${message.type}`}>
                        {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                        <span>{message.text}</span>
                        <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
                    </div>
                )}

                {/* Toolbar */}
                <div className="toolbar">
                    <div className="search-bar">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="بحث عن مستخدم..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="refresh-btn" onClick={fetchUsers} disabled={loading}>
                        <RefreshCw size={18} className={loading ? 'spin' : ''} />
                        تحديث القائمة
                    </button>
                </div>

                {/* Users Table */}
                <div className="table-wrapper">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>المستخدم</th>
                                <th>المكتب</th>
                                <th>رقم الهاتف</th>
                                <th>آخر تسجيل دخول</th>
                                <th>حالة الحساب</th>
                                <th>حالة الاشتراك</th>
                                <th>تاريخ الانتهاء</th>
                                <th>المتبقي</th>
                                <th>عدد المحامين</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-8">
                                        <RefreshCw className="spin mx-auto mb-2" size={24} />
                                        جاري تحميل البيانات...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="text-center py-8">
                                        {searchTerm ? 'لا توجد نتائج للبحث' : 'لا يوجد مستخدمين مسجلين'}
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => {
                                    const status = getSubStatus(user);
                                    const activeSub = user.subscriptions?.find(s => s.status === 'active');
                                    const lawyerLimit = getLawyerLimit(user);
                                    const currentLawyers = user.lawyer_count || 0;

                                    return (
                                        <tr key={user.id}>
                                            <td>
                                                <div className="user-info">
                                                    <span className="ar-name">{user.arabic_name}</span>
                                                    <span className="email">{user.email}</span>
                                                </div>
                                            </td>
                                            <td>{user.office_name_ar || '-'}</td>
                                            <td>{user.phone_number || '-'}</td>
                                            <td>
                                                {user.last_login ? new Date(user.last_login).toLocaleDateString('en-US', { 
                                                    year: 'numeric', 
                                                    month: 'short', 
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) : '-'}
                                            </td>
                                            <td>
                                                <span className={`status-badge ${user.is_disabled ? 'disabled' : 'enabled'}`}>
                                                    {user.is_disabled ? <Ban size={12} /> : <ShieldCheck size={12} />}
                                                    {user.is_disabled ? 'معطل' : 'نشط'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${status.class}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="date-info">
                                                    {activeSub ? new Date(activeSub.current_period_end).toLocaleDateString('ar-IQ') : '-'}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={status.days < 3 ? 'text-danger' : ''}>
                                                    {status.days > 0 ? `${status.days} يوم` : '-'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="lawyer-limit-cell">
                                                    <span className={currentLawyers >= lawyerLimit ? 'text-danger' : ''}>
                                                        {currentLawyers}/{lawyerLimit}
                                                    </span>
                                                    <button
                                                        className="edit-limit-btn"
                                                        onClick={() => {
                                                            setSelectedLimitUser(user);
                                                            setCustomLimit(user.custom_lawyer_limit !== null ? user.custom_lawyer_limit : lawyerLimit);
                                                            setShowLimitModal(true);
                                                        }}
                                                        title="تعديل الحد الأقصى"
                                                    >
                                                        <Settings size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        className="extend-btn"
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setShowExtendModal(true);
                                                        }}
                                                    >
                                                        <Plus size={16} /> تمديد
                                                    </button>
                                                    <button
                                                        className={`disable-btn ${user.is_disabled ? 'enable' : 'disable'}`}
                                                        onClick={() => handleToggleDisable(user)}
                                                        disabled={isProcessingDisable}
                                                    >
                                                        {user.is_disabled ? <ShieldCheck size={14} /> : <Ban size={14} />}
                                                        {user.is_disabled ? 'تفعيل' : 'تعطيل'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Extension Modal */}
            {showExtendModal && selectedUser && (
                <div className="modal-overlay" onClick={() => setShowExtendModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>تمديد صلاحية الحساب</h3>
                            <p>{selectedUser.arabic_name}</p>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>عدد أيام التمديد</label>
                                <div className="days-options">
                                    {[7, 14, 30, 90, 365].map(days => (
                                        <button
                                            key={days}
                                            className={extensionDays === days ? 'active' : ''}
                                            onClick={() => setExtensionDays(days)}
                                        >
                                            {days > 30 ? (days === 365 ? 'سنة' : '3 أشهر') : `${days} يوم`}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="number"
                                    value={extensionDays}
                                    onChange={e => setExtensionDays(e.target.value)}
                                    className="custom-days"
                                    placeholder="أو أدخل عدد الأيام..."
                                />
                            </div>
                            <div className="info-box">
                                <Clock size={16} />
                                <span>سيتم تمديد صلاحية الحساب ابتداءً من تاريخ الانتهاء الحالي أو من تاريخ اليوم إذا كان منتهياً.</span>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowExtendModal(false)}>إلغاء</button>
                            <button
                                className="btn-confirm"
                                onClick={handleExtend}
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'جاري الحفظ...' : 'تأكيد التمديد'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lawyer Limit Modal */}
            {showLimitModal && selectedLimitUser && (
                <div className="modal-overlay" onClick={() => setShowLimitModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>تعديل حد المحامين</h3>
                            <p>{selectedLimitUser.arabic_name}</p>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>الحد الأقصى للمحامين</label>
                                <div className="limit-options">
                                    {[0, 1, 2, 5, 10, 20, 50].map(limit => (
                                        <button
                                            key={limit}
                                            className={customLimit === limit ? 'active' : ''}
                                            onClick={() => setCustomLimit(limit)}
                                        >
                                            {limit === 0 ? 'بدون محامين' : limit}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="number"
                                    value={customLimit}
                                    onChange={e => setCustomLimit(parseInt(e.target.value) || 0)}
                                    className="custom-days"
                                    placeholder="أو أدخل حد مخصص..."
                                    min="0"
                                />
                            </div>
                            <div className="info-box">
                                <Clock size={16} />
                                <span>اضغط على "استخدام الحد الافتراضي" لإعادة تعيين الحد بناءً على الباقة.</span>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => {
                                setCustomLimit(selectedLimitUser.custom_lawyer_limit !== null ? selectedLimitUser.custom_lawyer_limit : getLawyerLimit(selectedLimitUser));
                            }}>إلغاء</button>
                            <button
                                className="btn-secondary"
                                onClick={() => {
                                    setCustomLimit(null);
                                }}
                                disabled={isProcessingLimit}
                            >
                                استخدام الحد الافتراضي
                            </button>
                            <button
                                className="btn-confirm"
                                onClick={handleUpdateLimit}
                                disabled={isProcessingLimit}
                            >
                                {isProcessingLimit ? 'جاري الحفظ...' : 'تأكيد'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
        .admin-page {
          min-height: 100vh;
          background: #f8fafc;
          font-family: 'Cairo', sans-serif;
        }
        
        .page-header {
          background: white;
          padding: 16px 32px;
          border-bottom: 1px solid #e2e8f0;
          position: sticky; top: 0; z-index: 10;
        }
        
        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .back-btn {
          display: flex; align-items: center; gap: 8px;
          border: none; background: none; color: #64748b;
          cursor: pointer; font-family: inherit;
        }
        
        .title-section {
          display: flex; align-items: center; gap: 12px;
          color: #1e293b;
        }
        
        .title-section h1 { font-size: 20px; font-weight: 800; margin: 0; }
        
        .main-content {
          max-width: 1600px;
          margin: 0 auto;
          padding: 32px;
        }
        
        .alert-banner {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          display: flex; align-items: center; gap: 12px;
        }
        
        .alert-banner.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .alert-banner.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
        .alert-banner button { margin-right: auto; background: none; border: none; font-size: 18px; cursor: pointer; color: inherit; }
        
        .toolbar {
          display: flex; gap: 16px; margin-bottom: 24px;
        }
        
        .search-bar {
          flex: 1; display: flex; align-items: center; gap: 10px;
          background: white; border: 1.5px solid #e2e8f0; border-radius: 10px;
          padding: 0 16px;
        }
        
        .search-bar input {
          border: none; outline: none; width: 100%; height: 44px;
          font-family: inherit; font-size: 14px;
        }
        
        .refresh-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 0 20px; background: white; border: 1.5px solid #e2e8f0;
          border-radius: 10px; cursor: pointer; font-family: inherit; font-size: 14px;
          color: #64748b;
        }
        
        .table-wrapper {
          background: white; border-radius: 16px; border: 1px solid #e2e8f0;
          overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        
        .users-table { width: 100%; border-collapse: collapse; text-align: right; }
        .users-table th { background: #f8fafc; padding: 16px; font-size: 13px; color: #64748b; font-weight: 600; }
        .users-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .users-table tr:last-child td { border: none; }
        
        .user-info { display: flex; flex-direction: column; }
        .ar-name { font-weight: 700; color: #1e293b; font-size: 15px; }
        .email { font-size: 12px; color: #64748b; }
        
        .status-badge {
          display: inline-flex; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 700;
        }
        .status-badge.active { background: #dcfce7; color: #166534; }
        .status-badge.trial { background: #eff6ff; color: #1e40af; }
        .status-badge.expired { background: #fee2e2; color: #991b1b; }
        .status-badge.inactive { background: #f1f5f9; color: #64748b; }
        .status-badge.enabled { background: #dcfce7; color: #166534; }
        .status-badge.disabled { background: #fee2e2; color: #991b1b; }
        
        .extend-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 12px; border-radius: 8px; border: 1px solid #2563eb;
          background: white; color: #2563eb; font-weight: 700; font-size: 13px;
          cursor: pointer; font-family: inherit; transition: all 0.2s;
        }
        .extend-btn:hover { background: #2563eb; color: white; }

        .disable-btn {
            display: flex; align-items: center; gap: 6px;
            padding: 8px 12px; border-radius: 8px; border: 1px solid #dc2626;
            background: white; color: #dc2626; font-weight: 700; font-size: 13px;
            cursor: pointer; font-family: inherit; transition: all 0.2s;
        }
        .disable-btn:hover { background: #dc2626; color: white; }
        .disable-btn.enable {
            border-color: #16a34a;
            color: #16a34a;
        }
        .disable-btn.enable:hover { background: #16a34a; color: white; }
        .disable-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .text-danger { color: #dc2626; font-weight: 700; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .lawyer-limit-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .edit-limit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px 8px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: white;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .edit-limit-btn:hover {
          border-color: #2563eb;
          color: #2563eb;
        }
        
        .limit-options {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        
        .limit-options button {
          padding: 10px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          font-family: inherit;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .limit-options button:hover {
          border-color: #2563eb;
          color: #2563eb;
        }
        
        .limit-options button.active {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }
        
        .modal-footer {
          display: flex;
          gap: 12px;
        }
        
        .modal-footer button {
          flex: 1;
          padding: 12px;
          border-radius: 10px;
          font-family: inherit;
          font-weight: 700;
          cursor: pointer;
        }
        
        .btn-cancel {
          background: #f1f5f9;
          border: none;
          color: #475569;
        }
        
        .btn-secondary {
          background: #64748b;
          border: none;
          color: white;
        }
        
        .btn-secondary:hover {
          background: #475569;
        }
        
        .btn-confirm {
          background: #2563eb;
          border: none;
          color: white;
        }
        
        .btn-confirm:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        /* Modal */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
          backdrop-filter: blur(4px);
        }
        
        .modal-content {
          background: white; border-radius: 20px; width: 100%; max-width: 480px;
          padding: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }
        
        .modal-header h3 { font-size: 20px; font-weight: 800; margin: 0 0 4px; color: #1e293b; }
        .modal-header p { font-size: 14px; color: #2563eb; font-weight: 700; margin: 0 0 24px; }
        
        .form-group label { display: block; font-size: 14px; font-weight: 700; margin-bottom: 12px; }
        
        .days-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
        .days-options button {
          padding: 10px; border: 1.5px solid #e2e8f0; border-radius: 10px;
          background: white; font-family: inherit; font-weight: 700; font-size: 13px;
          cursor: pointer; transition: all 0.2s;
        }
        .days-options button:hover { border-color: #2563eb; color: #2563eb; }
        .days-options button.active { background: #2563eb; color: white; border-color: #2563eb; }
        
        .custom-days {
          width: 100%; padding: 12px; border: 1.5px solid #e2e8f0; border-radius: 10px;
          font-family: inherit; font-size: 14px; margin-bottom: 24px;
        }
        
        .info-box {
          background: #f0f9ff; border: 1px solid #bae6fd; padding: 12px;
          border-radius: 10px; display: flex; gap: 10px; color: #0369a1; font-size: 13px;
          line-height: 1.5; margin-bottom: 32px;
        }
        
        .modal-footer { display: flex; gap: 12px; }
        .modal-footer button { flex: 1; padding: 12px; border-radius: 10px; font-family: inherit; font-weight: 700; cursor: pointer; }
        .btn-cancel { background: #f1f5f9; border: none; color: #475569; }
        .btn-confirm { background: #2563eb; border: none; color: white; }
        .btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
        </div>
    );
};

export default ManageUsers;
