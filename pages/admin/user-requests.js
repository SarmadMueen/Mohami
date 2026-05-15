import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../lib/api';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/initSupabase';
import { ROLES } from '../roles';
import {
  Users,
  Check,
  X,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  RefreshCw,
  Search,
  FileText
} from 'lucide-react';

const UserRequests = () => {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userMetadata, setUserMetadata] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [signedImageUrl, setSignedImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userMetadata) {
      fetchRequests();
    }
  }, [filter, userMetadata]);

  const checkAuth = async () => {
    const session = supabase.auth.session();
    if (!session) {
      router.push('/login');
      return;
    }

    setCurrentUser(session.user);

    // Check if user is admin
    const { data: metadata, error } = await supabase
      .from('user_metadata')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error || !metadata || metadata.role !== ROLES.SUPER_ADMIN) {
      router.push('/admin');
      return;
    }

    setUserMetadata(metadata);
  };

  const fetchRequests = async () => {
    setLoading(true);
    let query = supabase
      .from('trial_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching requests:', error);
      setMessage({ type: 'error', text: 'فشل في جلب الطلبات' });
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setProcessingId(selectedRequest.id);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(getApiUrl('/api/admin/approve-trial'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          adminUserId: currentUser.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.details ? `${result.error}: ${result.details}` : result.error || 'فشل في الموافقة على الطلب');
      }

      setMessage({ type: 'success', text: `تمت الموافقة! تم إرسال بيانات الدخول إلى ${selectedRequest.email}` });
      setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
      setShowApprovalModal(false);
      setSelectedRequest(null);
      // Optional: don't call fetchRequests() here to avoid race conditions with DB replication delay

    } catch (error) {
      console.error('Approve error:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setProcessingId(selectedRequest.id);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(getApiUrl('/api/admin/reject-trial'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          adminUserId: currentUser.id,
          notes: rejectNotes
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'فشل في رفض الطلب');
      }

      setMessage({ type: 'success', text: 'تم رفض الطلب بنجاح' });
      setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectNotes('');
      // Optional: don't call fetchRequests() here to avoid race conditions

    } catch (error) {
      console.error('Reject error:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-pending"><Clock size={14} /> قيد الانتظار</span>;
      case 'approved':
        return <span className="badge badge-approved"><CheckCircle size={14} /> تمت الموافقة</span>;
      case 'rejected':
        return <span className="badge badge-rejected"><XCircle size={14} /> مرفوض</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  // Function to get signed URL for private bucket image
  const getSignedImageUrl = async (fileName) => {
    if (!fileName) return null;

    setImageLoading(true);
    try {
      // Handle if it's already a full URL (legacy data)
      if (fileName.startsWith('http')) {
        setSignedImageUrl(fileName);
        setImageLoading(false);
        return;
      }

      console.log('Getting signed URL for:', fileName);

      // Try with the path as-is first (new uploads at root)
      let { data, error } = await supabase.storage
        .from('bar-ids')
        .createSignedUrl(fileName, 3600);

      // If failed, try with bar-ids/ prefix (old files in subfolder)
      if (error) {
        const withPrefix = 'bar-ids/' + fileName;
        console.log('Retrying with prefix:', withPrefix);
        const result = await supabase.storage
          .from('bar-ids')
          .createSignedUrl(withPrefix, 3600);
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Signed URL error:', error);
        setMessage({ type: 'error', text: 'فشل في تحميل الصورة: ' + error.message });
        setImageLoading(false);
        return;
      }

      console.log('Signed URL data:', data);
      const signedUrl = data?.signedUrl || data?.signedURL;
      console.log('Signed URL:', signedUrl);
      setSignedImageUrl(signedUrl);
    } catch (err) {
      console.error('Get signed URL error:', err);
      setMessage({ type: 'error', text: 'فشل في تحميل الصورة' });
    }
    setImageLoading(false);
  };

  const filteredRequests = requests.filter(req => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      req.full_name_ar?.toLowerCase().includes(term) ||
      req.full_name_en?.toLowerCase().includes(term) ||
      req.email?.toLowerCase().includes(term) ||
      req.phone?.includes(term) ||
      req.office_name?.toLowerCase().includes(term)
    );
  });

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !userMetadata) {
    return (
      <div className="loading-container">
        <RefreshCw className="spin" size={32} />
        <p>جاري التحميل...</p>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            font-family: 'Cairo', sans-serif;
            color: #64748b;
          }
          .spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>إدارة طلبات الاشتراك - محامي برو</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="page-container" dir="rtl">
        {/* Header */}
        <header className="page-header">
          <div className="header-content">
            <button className="back-btn" onClick={() => router.push('/admin')}>
              <ChevronLeft size={20} />
              العودة للوحة التحكم
            </button>
            <div className="header-title">
              <Users size={28} />
              <h1>إدارة طلبات الاشتراك</h1>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="main-content">
          {/* Message */}
          {message.text && (
            <div className={`message ${message.type}`}>
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{message.text}</span>
              <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
            </div>
          )}

          {/* Controls */}
          <div className="controls-bar">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="بحث بالاسم أو البريد أو الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-tabs">
              <button
                className={filter === 'pending' ? 'active' : ''}
                onClick={() => setFilter('pending')}
              >
                <Clock size={16} /> قيد الانتظار
              </button>
              <button
                className={filter === 'approved' ? 'active' : ''}
                onClick={() => setFilter('approved')}
              >
                <CheckCircle size={16} /> تمت الموافقة
              </button>
              <button
                className={filter === 'rejected' ? 'active' : ''}
                onClick={() => setFilter('rejected')}
              >
                <XCircle size={16} /> مرفوض
              </button>
              <button
                className={filter === 'all' ? 'active' : ''}
                onClick={() => setFilter('all')}
              >
                <FileText size={16} /> الكل
              </button>
            </div>

            <button className="refresh-btn" onClick={fetchRequests} disabled={loading}>
              <RefreshCw size={18} className={loading ? 'spin' : ''} />
              تحديث
            </button>
          </div>

          {/* Table */}
          <div className="table-container">
            {loading ? (
              <div className="table-loading">
                <RefreshCw className="spin" size={24} />
                <span>جاري تحميل الطلبات...</span>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="empty-state">
                <Users size={48} />
                <p>لا توجد طلبات {filter !== 'all' ? getStatusLabel(filter) : ''}</p>
              </div>
            ) : (
              <table className="requests-table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>البريد الإلكتروني</th>
                    <th>الهاتف</th>
                    <th>المكتب</th>
                    <th>الحالة</th>
                    <th>تاريخ الطلب</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <div className="name-cell">
                          <span className="name-ar">{request.full_name_ar}</span>
                          <span className="name-en">{request.full_name_en}</span>
                        </div>
                      </td>
                      <td dir="ltr" style={{ textAlign: 'left' }}>{request.email}</td>
                      <td dir="ltr" style={{ textAlign: 'left' }}>{request.phone}</td>
                      <td>{request.office_name || '-'}</td>
                      <td>{getStatusBadge(request.status)}</td>
                      <td>{formatDate(request.created_at)}</td>
                      <td>
                        <div className="action-buttons">
                          {request.bar_id_url && (
                            <button
                              className="action-btn view"
                              onClick={async () => {
                                setSelectedRequest(request);
                                await getSignedImageUrl(request.bar_id_url);
                                setShowImageModal(true);
                              }}
                              title="عرض الهوية"
                            >
                              <Eye size={16} />
                            </button>
                          )}
                          {request.status === 'pending' && (
                            <>
                              <button
                                className="action-btn approve"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowApprovalModal(true);
                                }}
                                disabled={processingId === request.id}
                                title="موافقة"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                className="action-btn reject"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowRejectModal(true);
                                }}
                                disabled={processingId === request.id}
                                title="رفض"
                              >
                                <X size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>

        {/* Image Modal */}
        {showImageModal && selectedRequest && (
          <div className="modal-overlay" onClick={() => { setShowImageModal(false); setSignedImageUrl(null); }}>
            <div className="modal image-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>هوية نقابة المحامين - {selectedRequest.full_name_ar}</h3>
                <button className="close-btn" onClick={() => { setShowImageModal(false); setSignedImageUrl(null); }}>×</button>
              </div>
              <div className="modal-body">
                {imageLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <RefreshCw className="spin" size={24} />
                    <p>جاري تحميل الصورة...</p>
                  </div>
                ) : signedImageUrl ? (
                  <img src={signedImageUrl} alt="Bar ID" style={{ maxWidth: '100%' }} />
                ) : (
                  <p style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>لا يمكن تحميل الصورة</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Approval Modal */}
        {showApprovalModal && selectedRequest && (
          <div className="modal-overlay" onClick={() => setShowApprovalModal(false)}>
            <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>تأكيد الموافقة</h3>
                <button className="close-btn" onClick={() => setShowApprovalModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <p>هل أنت متأكد من الموافقة على طلب:</p>
                <div className="request-summary">
                  <p><strong>الاسم:</strong> {selectedRequest.full_name_ar}</p>
                  <p><strong>البريد:</strong> {selectedRequest.email}</p>
                  <p><strong>الهاتف:</strong> {selectedRequest.phone}</p>
                </div>
                <p className="note">سيتم إنشاء حساب جديد وإرسال بيانات الدخول للمستخدم.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-cancel" onClick={() => setShowApprovalModal(false)}>
                  إلغاء
                </button>
                <button
                  className="btn btn-approve"
                  onClick={handleApprove}
                  disabled={processingId === selectedRequest.id}
                >
                  {processingId === selectedRequest.id ? 'جاري المعالجة...' : 'تأكيد الموافقة'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedRequest && (
          <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
            <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>رفض الطلب</h3>
                <button className="close-btn" onClick={() => setShowRejectModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <p>هل أنت متأكد من رفض طلب <strong>{selectedRequest.full_name_ar}</strong>؟</p>
                <div className="form-group">
                  <label>سبب الرفض (اختياري)</label>
                  <textarea
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    placeholder="أدخل سبب الرفض..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-cancel" onClick={() => setShowRejectModal(false)}>
                  إلغاء
                </button>
                <button
                  className="btn btn-reject"
                  onClick={handleReject}
                  disabled={processingId === selectedRequest.id}
                >
                  {processingId === selectedRequest.id ? 'جاري المعالجة...' : 'تأكيد الرفض'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .page-container {
          min-height: 100vh;
          background: #f8fafc;
          font-family: 'Cairo', sans-serif;
        }

        .page-header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 16px 32px;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: #64748b;
          font-size: 14px;
          cursor: pointer;
          font-family: inherit;
        }

        .back-btn:hover {
          color: #2563eb;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #0f172a;
        }

        .header-title h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
        }

        .main-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px 32px;
        }

        .message {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 14px;
        }

        .message.success {
          background: #d1fae5;
          color: #059669;
          border: 1px solid #a7f3d0;
        }

        .message.error {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .message button {
          margin-right: auto;
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: inherit;
        }

        .controls-bar {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          align-items: center;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 16px;
          flex: 1;
          min-width: 250px;
        }

        .search-box input {
          border: none;
          outline: none;
          font-size: 14px;
          width: 100%;
          font-family: inherit;
        }

        .filter-tabs {
          display: flex;
          gap: 8px;
          background: white;
          padding: 4px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .filter-tabs button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          background: none;
          border-radius: 6px;
          font-size: 13px;
          color: #64748b;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
        }

        .filter-tabs button:hover {
          background: #f1f5f9;
        }

        .filter-tabs button.active {
          background: #2563eb;
          color: white;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #64748b;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
        }

        .refresh-btn:hover:not(:disabled) {
          border-color: #2563eb;
          color: #2563eb;
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .table-container {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .table-loading,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px;
          gap: 16px;
          color: #64748b;
        }

        .requests-table {
          width: 100%;
          border-collapse: collapse;
        }

        .requests-table th,
        .requests-table td {
          padding: 14px 16px;
          text-align: right;
          border-bottom: 1px solid #f1f5f9;
        }

        .requests-table th {
          background: #f8fafc;
          font-weight: 600;
          font-size: 13px;
          color: #64748b;
        }

        .requests-table tr:hover {
          background: #fafbfc;
        }

        .name-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .name-ar {
          font-weight: 600;
          color: #0f172a;
        }

        .name-en {
          font-size: 12px;
          color: #94a3b8;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge-pending {
          background: #fef3c7;
          color: #d97706;
        }

        .badge-approved {
          background: #d1fae5;
          color: #059669;
        }

        .badge-rejected {
          background: #fee2e2;
          color: #dc2626;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-btn.view {
          background: #e0f2fe;
          color: #0284c7;
        }

        .action-btn.view:hover:not(:disabled) {
          background: #bae6fd;
        }

        .action-btn.approve {
          background: #d1fae5;
          color: #059669;
        }

        .action-btn.approve:hover:not(:disabled) {
          background: #a7f3d0;
        }

        .action-btn.reject {
          background: #fee2e2;
          color: #dc2626;
        }

        .action-btn.reject:hover:not(:disabled) {
          background: #fecaca;
        }

        /* Modals */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal {
          background: white;
          border-radius: 16px;
          max-width: 90%;
          max-height: 90vh;
          overflow: auto;
        }

        .image-modal {
          max-width: 800px;
        }

        .image-modal img {
          width: 100%;
          display: block;
        }

        .confirm-modal {
          width: 450px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          color: #94a3b8;
          cursor: pointer;
        }

        .modal-body {
          padding: 24px;
        }

        .modal-body p {
          margin: 0 0 16px;
          color: #475569;
        }

        .request-summary {
          background: #f8fafc;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .request-summary p {
          margin: 0 0 8px;
        }

        .request-summary p:last-child {
          margin: 0;
        }

        .note {
          font-size: 13px;
          color: #64748b;
          background: #fffbeb;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #fef3c7;
        }

        .form-group {
          margin-top: 16px;
        }

        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .form-group textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
        }

        .form-group textarea:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-cancel {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #64748b;
        }

        .btn-cancel:hover:not(:disabled) {
          background: #e2e8f0;
        }

        .btn-approve {
          background: #059669;
          border: none;
          color: white;
        }

        .btn-approve:hover:not(:disabled) {
          background: #047857;
        }

        .btn-reject {
          background: #dc2626;
          border: none;
          color: white;
        }

        .btn-reject:hover:not(:disabled) {
          background: #b91c1c;
        }

        @media (max-width: 768px) {
          .controls-bar {
            flex-direction: column;
          }

          .search-box {
            width: 100%;
          }

          .filter-tabs {
            width: 100%;
            overflow-x: auto;
          }

          .requests-table th,
          .requests-table td {
            padding: 10px 8px;
            font-size: 13px;
          }
        }
      `}</style>
    </>
  );
};

function getStatusLabel(status) {
  switch (status) {
    case 'pending': return 'قيد الانتظار';
    case 'approved': return 'تمت الموافقة عليها';
    case 'rejected': return 'مرفوضة';
    default: return '';
  }
}

export default UserRequests;
