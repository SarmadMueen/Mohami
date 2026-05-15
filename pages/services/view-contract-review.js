import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { 
    FiEdit, 
    FiTrash2, 
    FiRefreshCw, 
    FiFileText, 
    FiPrinter,
    FiFile,
    FiCheckCircle,
    FiUpload
} from 'react-icons/fi';

const ViewContractReviewPage = () => {
    const router = useRouter();
    const { id } = router.query;
    const [review, setReview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(null);

    useEffect(() => {
        if (id) {
            fetchReviewDetails();
        }
    }, [id]);

    // Set default tab based on available content
    useEffect(() => {
        if (review) {
            if (review.key_risks_issues) {
                setActiveTab('key-risks');
            } else if (review.recommendation) {
                setActiveTab('recommendation');
            } else {
                setActiveTab('attachments');
            }
        }
    }, [review]);

    const fetchReviewDetails = async () => {
        try {
            setLoading(true);
            
            const { data: reviewData, error: reviewError } = await supabase
                .from('contract_reviews')
                .select('*')
                .eq('id', id)
                .single();

            if (reviewError) throw reviewError;
            setReview(reviewData);

        } catch (error) {
            console.error('Error fetching review details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('هل أنت متأكد من حذف هذه المراجعة؟')) return;

        try {
            const { error } = await supabase
                .from('contract_reviews')
                .delete()
                .eq('id', id);

            if (error) throw error;
            router.push('/services/add-contract-review');
        } catch (error) {
            console.error('Error deleting review:', error);
            alert('حدث خطأ أثناء حذف المراجعة');
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        const printContent = `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>عرض المراجعة</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Cairo', 'Almarai', sans-serif;
                        padding: 2rem;
                        background: #ffffff;
                        color: #1e293b;
                    }
                    .print-header {
                        text-align: center;
                        margin-bottom: 2rem;
                        padding-bottom: 1rem;
                        border-bottom: 2px solid #e2e8f0;
                    }
                    .print-header h1 {
                        font-size: 1.875rem;
                        font-weight: 700;
                        color: #1e293b;
                        margin-bottom: 0.5rem;
                    }
                    .print-section {
                        margin-bottom: 2rem;
                    }
                    .print-section-title {
                        font-size: 1.125rem;
                        font-weight: 600;
                        color: #1e293b;
                        margin-bottom: 1rem;
                        padding-bottom: 0.5rem;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    .print-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 1rem;
                        margin-bottom: 1rem;
                    }
                    .print-item {
                        margin-bottom: 0.75rem;
                    }
                    .print-label {
                        font-size: 0.75rem;
                        color: #64748b;
                        font-weight: 600;
                        margin-bottom: 0.25rem;
                    }
                    .print-value {
                        font-size: 0.9375rem;
                        color: #1e293b;
                        font-weight: 500;
                    }
                    .print-text {
                        font-size: 0.9375rem;
                        color: #1e293b;
                        line-height: 1.8;
                        white-space: pre-wrap;
                        margin-top: 0.5rem;
                    }
                    @media print {
                        body {
                            padding: 1rem;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <h1>عرض مراجعة العقد</h1>
                </div>
                
                <div class="print-section">
                    <h2 class="print-section-title">معلومات العقد</h2>
                    <div class="print-grid">
                        <div class="print-item">
                            <div class="print-label">عنوان العقد</div>
                            <div class="print-value">${review.contract_title || '-'}</div>
                        </div>
                        <div class="print-item">
                            <div class="print-label">رقم الدعوى</div>
                            <div class="print-value">${review.case_reference_id || '-'}</div>
                        </div>
                        <div class="print-item">
                            <div class="print-label">نوع العقد</div>
                            <div class="print-value">${review.contract_type || '-'}</div>
                        </div>
                        <div class="print-item">
                            <div class="print-label">تاريخ المراجعة</div>
                            <div class="print-value">${review.review_date ? new Date(review.review_date).toLocaleDateString('en-US') : '-'}</div>
                        </div>
                        <div class="print-item">
                            <div class="print-label">الحالة</div>
                            <div class="print-value">${getStatusText(review.status)}</div>
                        </div>
                        ${review.opposing_party ? `
                        <div class="print-item">
                            <div class="print-label">الطرف الآخر</div>
                            <div class="print-value">${review.opposing_party}</div>
                        </div>
                        ` : ''}
                        ${review.governing_jurisdiction ? `
                        <div class="print-item">
                            <div class="print-label">القانون الحاكم</div>
                            <div class="print-value">${review.governing_jurisdiction}</div>
                        </div>
                        ` : ''}
                        <div class="print-item">
                            <div class="print-label">يتطلب تسجيل</div>
                            <div class="print-value">${review.requires_registration ? 'نعم' : 'لا'}</div>
                        </div>
                        ${review.contract_fees && parseFloat(review.contract_fees) > 0 ? `
                        <div class="print-item">
                            <div class="print-label">رسوم المراجعة</div>
                            <div class="print-value">${parseFloat(review.contract_fees).toFixed(2)} دينار</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                ${review.key_risks_issues ? `
                <div class="print-section">
                    <h2 class="print-section-title">المخاطر الرئيسية / القضايا</h2>
                    <div class="print-text">${review.key_risks_issues}</div>
                </div>
                ` : ''}
                
                ${review.recommendation ? `
                <div class="print-section">
                    <h2 class="print-section-title">التوصية</h2>
                    <div class="print-text">${review.recommendation}</div>
                </div>
                ` : ''}
                
                ${review.document_upload_url ? `
                <div class="print-section">
                    <h2 class="print-section-title">المرفقات</h2>
                    <div class="print-value">${review.file_name || 'عرض المستند'}</div>
                </div>
                ` : ''}
            </body>
            </html>
        `;
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    };

    const handleExportPDF = () => {
        alert('سيتم إضافة ميزة تصدير PDF قريباً');
    };

    if (loading) {
        return (
            <Layout>
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    جاري تحميل البيانات...
                </div>
            </Layout>
        );
    }

    if (!review) {
        return (
            <Layout>
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    لم يتم العثور على المراجعة
                </div>
            </Layout>
        );
    }

    const getStatusText = (status) => {
        switch (status) {
            case 'تمت المراجعة':
            case 'Reviewed':
                return 'تمت المراجعة';
            case 'يحتاج تفاوض':
            case 'Needs Negotiation':
                return 'يحتاج تفاوض';
            case 'موافقة':
            case 'Approved':
                return 'موافقة';
            case 'رفض':
            case 'Rejected':
                return 'رفض';
            default:
                return status || 'غير محدد';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'تمت المراجعة':
            case 'Reviewed':
                return '#10b981'; // Green
            case 'يحتاج تفاوض':
            case 'Needs Negotiation':
                return '#f59e0b'; // Orange
            case 'موافقة':
            case 'Approved':
                return '#3b82f6'; // Blue
            case 'رفض':
            case 'Rejected':
                return '#ef4444'; // Red
            default:
                return '#64748b'; // Gray
        }
    };


    return (
        <Layout>
            <Head>
                <title>عرض مراجعة عقد - مكتب المحامي</title>
            </Head>
            <div className="view-review-page">
                <div className="breadcrumbs">
                    <Link href="/services/legal-services">الخدمات القانونية</Link> / 
                    <Link href="/services/add-contract-review">مراجعة العقود</Link> / 
                    عرض المراجعة
                </div>
                <style jsx>{`
                    .view-review-page {
                        min-height: 100vh;
                        background: transparent;
                        padding: 2rem;
                        direction: rtl;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                    }

                    .breadcrumbs {
                        margin-bottom: 2rem;
                        padding: 1rem;
                        background: #f8fafc;
                        border-radius: 8px;
                        font-size: 0.875rem;
                        color: #64748b;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                    }

                    .breadcrumbs a {
                        color: #3b82f6;
                        text-decoration: none;
                        transition: color 0.2s;
                    }

                    .breadcrumbs a:hover {
                        color: #2563eb;
                        text-decoration: underline;
                    }

                    .page-container {
                        max-width: 1800px;
                        margin: 0 auto;
                        display: flex;
                        gap: 2rem;
                        flex-direction: row-reverse;
                    }

                    .view-review-page .main-content {
                        flex: 1;
                        background: #ffffff !important;
                        border-radius: 12px;
                        padding: 2rem;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    }

                    .info-section {
                        margin-bottom: 2rem;
                        padding-bottom: 1.5rem;
                        border-bottom: 2px solid #e2e8f0;
                    }

                    .info-section:last-child {
                        border-bottom: none;
                        margin-bottom: 0;
                        padding-bottom: 0;
                    }

                    .info-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 1rem;
                        margin-top: 1.25rem;
                    }

                    .info-card {
                        background: #f8fafc;
                        border-radius: 8px;
                        padding: 1rem;
                        box-shadow: none;
                        border: 1px solid #e2e8f0;
                        transition: all 0.2s;
                    }

                    .info-card:hover {
                        background: #f1f5f9;
                        border-color: #cbd5e1;
                    }

                    .card-title {
                        font-size: 1.25rem;
                        font-weight: 700;
                        color: #1e293b;
                        margin-bottom: 0;
                        padding-bottom: 0.875rem;
                        border-bottom: 2px solid #e2e8f0;
                        margin-bottom: 1.25rem;
                        letter-spacing: -0.01em;
                    }

                    .card-content {
                        display: flex;
                        flex-direction: column;
                        gap: 0;
                    }

                    .detail-row {
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                        padding: 0;
                        margin-bottom: 0;
                    }

                    .detail-label {
                        font-size: 0.75rem;
                        color: #64748b;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.08em;
                        margin-bottom: 0;
                    }

                    .detail-value {
                        font-size: 1rem;
                        color: #1e293b;
                        font-weight: 500;
                        line-height: 1.6;
                        word-wrap: break-word;
                    }

                    .status-badge {
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.5rem 1rem;
                        border-radius: 8px;
                        font-size: 0.875rem;
                        font-weight: 500;
                    }

                    .view-review-page .sidebar {
                        width: 350px;
                        background: #ffffff !important;
                        border-radius: 12px;
                        padding: 2rem;
                        color: #1e293b !important;
                        height: fit-content;
                        position: sticky;
                        top: 2rem;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                        border: 1px solid #e2e8f0;
                    }

                    .view-review-page .sidebar * {
                        color: inherit;
                    }

                    .sidebar-header {
                        margin-bottom: 2rem;
                    }

                    .sidebar-title {
                        font-size: 1.5rem;
                        font-weight: 700;
                        margin-bottom: 0.5rem;
                        color: #1e293b;
                    }

                    .sidebar-description {
                        font-size: 0.875rem;
                        color: #64748b;
                        line-height: 1.6;
                    }

                    .status-tag {
                        display: inline-block;
                        padding: 0.375rem 0.75rem;
                        background: #f1f5f9;
                        border-radius: 6px;
                        font-size: 0.8125rem;
                        font-weight: 500;
                        margin-top: 1rem;
                        color: #1e293b;
                    }

                    .nav-links {
                        list-style: none;
                        padding: 0;
                        margin: 1.5rem 0;
                    }

                    .nav-links li {
                        padding: 0.75rem 0;
                        border-bottom: 1px solid #e2e8f0;
                    }

                    .nav-links li:last-child {
                        border-bottom: none;
                    }

                    .nav-links a {
                        color: #475569;
                        text-decoration: none;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-size: 0.9375rem;
                        transition: color 0.2s;
                    }

                    .nav-links a:hover {
                        color: #1e293b;
                    }

                    .edit-button {
                        width: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                        padding: 0.875rem;
                        background: #2563EB;
                        color: #ffffff;
                        border: none;
                        border-radius: 8px;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        margin-bottom: 1.5rem;
                    }

                    .edit-button:hover {
                        background: #1d4ed8;
                        transform: translateY(-2px);
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    }

                    .options-list {
                        margin-top: 1.5rem;
                    }

                    .options-title {
                        font-size: 0.875rem;
                        font-weight: 600;
                        margin-bottom: 1rem;
                        color: #1e293b;
                    }

                    .option-item {
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                        padding: 0.75rem;
                        background: #f8fafc;
                        border-radius: 8px;
                        margin-bottom: 0.5rem;
                        cursor: pointer;
                        transition: all 0.2s;
                        color: #475569;
                        text-decoration: none;
                        font-size: 0.875rem;
                        border: none;
                        width: 100%;
                        text-align: right;
                    }

                    .option-item:hover {
                        background: #f1f5f9;
                        color: #1e293b;
                    }

                    .link-icon {
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                        color: #3b82f6;
                        text-decoration: none;
                        font-size: 0.875rem;
                        transition: color 0.2s;
                    }

                    .link-icon:hover {
                        color: #2563eb;
                    }

                    .file-link {
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                        color: #3b82f6;
                        text-decoration: none;
                        font-size: 0.875rem;
                    }

                    .file-link:hover {
                        text-decoration: underline;
                    }

                    .tabs-container {
                        margin-top: 2rem;
                    }

                    .tabs-nav {
                        display: flex;
                        gap: 0;
                        border-bottom: 2px solid #e2e8f0;
                        margin-bottom: 0;
                    }

                    .tab-button {
                        padding: 1rem 1.5rem;
                        background: transparent;
                        border: none;
                        border-bottom: 3px solid transparent;
                        font-size: 1rem;
                        font-weight: 500;
                        color: #64748b;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                        position: relative;
                        margin-bottom: -2px;
                    }

                    .tab-button:hover {
                        color: #3b82f6;
                        background: #f8fafc;
                    }

                    .tab-button.active {
                        color: #2563eb;
                        border-bottom-color: #2563eb;
                        font-weight: 600;
                    }

                    .tab-content {
                        background: #ffffff;
                        padding: 2rem;
                        min-height: 200px;
                        border: 1px solid #e2e8f0;
                        border-top: none;
                        border-radius: 0 0 8px 8px;
                    }

                    .tab-panel {
                        animation: fadeIn 0.3s ease-in;
                    }

                    @keyframes fadeIn {
                        from {
                            opacity: 0;
                            transform: translateY(10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    @media (max-width: 1200px) {
                        .page-container {
                            flex-direction: column;
                        }

                        .sidebar {
                            width: 100%;
                            position: relative;
                            top: 0;
                        }

                        .info-grid {
                            grid-template-columns: 1fr;
                            gap: 1rem;
                        }
                    }

                    @media print {
                        .sidebar {
                            display: none !important;
                        }

                        .breadcrumbs {
                            display: none !important;
                        }

                        .view-review-page {
                            background: #ffffff !important;
                        }

                        .page-container {
                            flex-direction: column !important;
                        }

                        .main-content {
                            box-shadow: none !important;
                            border: none !important;
                            padding: 1rem !important;
                        }

                        .info-section {
                            page-break-inside: avoid;
                        }
                    }
                `}</style>

                <div className="page-container">
                    <div className="main-content">

                        {/* Header */}
                        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '2px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <h1 style={{ 
                                        fontSize: '1.875rem', 
                                        fontWeight: '700', 
                                        color: '#1e293b',
                                        margin: '0 0 0.5rem 0'
                                    }}>
                                        عرض مراجعة العقد
                                    </h1>
                                </div>
                                <span 
                                    className="status-badge"
                                    style={{ 
                                        background: getStatusColor(review.status) + '20',
                                        color: getStatusColor(review.status),
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        fontWeight: '500'
                                    }}
                                >
                                    {getStatusText(review.status)}
                                </span>
                            </div>
                        </div>

                        {/* معلومات العقد */}
                        <div className="info-section" id="contract-info">
                            <div className="info-grid">
                                <div className="info-card">
                                    <div className="detail-row">
                                        <span className="detail-label">عنوان العقد:</span>
                                        <span className="detail-value">{review.contract_title || '-'}</span>
                                    </div>
                                </div>
                                <div className="info-card">
                                    <div className="detail-row">
                                        <span className="detail-label">رقم الدعوى:</span>
                                        <span className="detail-value">{review.case_reference_id || '-'}</span>
                                    </div>
                                </div>
                                <div className="info-card">
                                    <div className="detail-row">
                                        <span className="detail-label">نوع العقد:</span>
                                        <span className="detail-value">{review.contract_type || '-'}</span>
                                    </div>
                                </div>
                                <div className="info-card">
                                    <div className="detail-row">
                                        <span className="detail-label">تاريخ المراجعة:</span>
                                        <span className="detail-value">
                                            {review.review_date 
                                                ? new Date(review.review_date).toLocaleDateString('en-US')
                                                : '-'}
                                        </span>
                                    </div>
                                </div>
                                <div className="info-card">
                                    <div className="detail-row">
                                        <span className="detail-label">الحالة:</span>
                                        <span 
                                            className="status-badge"
                                            style={{ 
                                                background: getStatusColor(review.status) + '20',
                                                color: getStatusColor(review.status)
                                            }}
                                        >
                                            {getStatusText(review.status)}
                                        </span>
                                    </div>
                                </div>
                                {review.opposing_party && (
                                    <div className="info-card">
                                        <div className="detail-row">
                                            <span className="detail-label">الطرف الآخر:</span>
                                            <span className="detail-value">{review.opposing_party}</span>
                                        </div>
                                    </div>
                                )}
                                {review.governing_jurisdiction && (
                                    <div className="info-card">
                                        <div className="detail-row">
                                            <span className="detail-label">القانون الحاكم:</span>
                                            <span className="detail-value">{review.governing_jurisdiction}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="info-card">
                                    <div className="detail-row">
                                        <span className="detail-label">يتطلب تسجيل:</span>
                                        <span className="detail-value">
                                            {review.requires_registration ? 'نعم' : 'لا'}
                                        </span>
                                    </div>
                                </div>
                                {review.contract_fees && parseFloat(review.contract_fees) > 0 && (
                                    <div className="info-card" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '2px solid #3b82f6' }}>
                                        <div className="detail-row">
                                            <span className="detail-label" style={{ color: '#1e40af', fontWeight: '700' }}>رسوم المراجعة:</span>
                                            <span className="detail-value" style={{ color: '#1e40af', fontWeight: '700', fontSize: '1.125rem' }}>
                                                {parseFloat(review.contract_fees).toFixed(2)} دينار
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="tabs-container">
                            <div className="tabs-nav">
                                {review.key_risks_issues && (
                                    <button
                                        className={`tab-button ${activeTab === 'key-risks' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('key-risks')}
                                    >
                                        المخاطر الرئيسية / القضايا
                                    </button>
                                )}
                                {review.recommendation && (
                                    <button
                                        className={`tab-button ${activeTab === 'recommendation' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('recommendation')}
                                    >
                                        التوصية
                                    </button>
                                )}
                                <button
                                    className={`tab-button ${activeTab === 'attachments' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('attachments')}
                                >
                                    المرفقات
                                </button>
                            </div>

                            {/* Tab Content */}
                            {activeTab && (
                                <div className="tab-content">
                                    {activeTab === 'key-risks' && review.key_risks_issues && (
                                        <div className="tab-panel">
                                            <p style={{ 
                                                color: '#1e293b', 
                                                lineHeight: '1.8',
                                                whiteSpace: 'pre-wrap',
                                                margin: 0,
                                                fontSize: '0.9375rem'
                                            }}>
                                                {review.key_risks_issues}
                                            </p>
                                        </div>
                                    )}

                                    {activeTab === 'recommendation' && review.recommendation && (
                                        <div className="tab-panel">
                                            <p style={{ 
                                                color: '#1e293b', 
                                                lineHeight: '1.8',
                                                whiteSpace: 'pre-wrap',
                                                margin: 0,
                                                fontSize: '0.9375rem'
                                            }}>
                                                {review.recommendation}
                                            </p>
                                        </div>
                                    )}

                                    {activeTab === 'attachments' && (
                                        <div className="tab-panel">
                                            {review.document_upload_url ? (
                                                <a 
                                                    href={review.document_upload_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="file-link"
                                                >
                                                    <FiUpload />
                                                    {review.file_name || 'عرض المستند'}
                                                </a>
                                            ) : (
                                                <span className="detail-value" style={{ color: '#94a3b8' }}>
                                                    لا يوجد أي مرفقات
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar - Left side */}
                    <div className="sidebar">
                        <div className="sidebar-header">
                            <span 
                                className="status-tag"
                                style={{ 
                                    background: getStatusColor(review.status) + '20',
                                    color: getStatusColor(review.status)
                                }}
                            >
                                {getStatusText(review.status)}
                            </span>
                            <h1 className="sidebar-title">عرض المراجعة</h1>
                        </div>

                        <button 
                            className="edit-button"
                            onClick={() => router.push(`/services/add-contract-review?edit=${id}`)}
                        >
                            <FiEdit />
                            تعديل المراجعة
                        </button>

                        <div className="options-list">
                            <h4 className="options-title">قائمة خيارات</h4>
                            <button className="option-item" onClick={handleDelete}>
                                <FiTrash2 />
                                حذف المراجعة
                            </button>
                            <button className="option-item" onClick={handleExportPDF}>
                                <FiFileText />
                                حفظ ملف PDF
                            </button>
                            <button className="option-item" onClick={handlePrint}>
                                <FiPrinter />
                                طباعة
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default withAuth(ViewContractReviewPage);

