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

const ViewConsultationPage = () => {
    const router = useRouter();
    const { id } = router.query;
    const [consultation, setConsultation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(null);

    useEffect(() => {
        if (id) {
            fetchConsultationDetails();
        }
    }, [id]);

    // Set default tab based on available content
    useEffect(() => {
        if (consultation) {
            if (consultation.case_facts) {
                setActiveTab('case-facts');
            } else if (consultation.legal_discussion) {
                setActiveTab('legal-discussion');
            } else if (consultation.legal_opinion) {
                setActiveTab('legal-opinion');
            }
        }
    }, [consultation]);

    const fetchConsultationDetails = async () => {
        try {
            setLoading(true);
            
            const { data: consultationData, error: consultationError } = await supabase
                .from('consultations')
                .select('*')
                .eq('id', id)
                .single();

            if (consultationError) throw consultationError;
            setConsultation(consultationData);

        } catch (error) {
            console.error('Error fetching consultation details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('هل أنت متأكد من حذف هذه الاستشارة؟')) return;

        try {
            const { error } = await supabase
                .from('consultations')
                .delete()
                .eq('id', id);

            if (error) throw error;
            router.push('/services/add-consultation');
        } catch (error) {
            console.error('Error deleting consultation:', error);
            alert('حدث خطأ أثناء حذف الاستشارة');
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        const printContent = `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>عرض الاستشارة</title>
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
                    <h1>عرض الاستشارة</h1>
                </div>
                
                <div class="print-section">
                    <h2 class="print-section-title">معلومات الاستشارة</h2>
                    <div class="print-grid">
                        <div class="print-item">
                            <div class="print-label">عنوان الاستشارة</div>
                            <div class="print-value">${consultation.consultation_title || '-'}</div>
                        </div>
                        <div class="print-item">
                            <div class="print-label">اسم العميل</div>
                            <div class="print-value">${consultation.client_name || '-'}</div>
                        </div>
                        <div class="print-item">
                            <div class="print-label">نوع الاستشارة</div>
                            <div class="print-value">${consultation.consultation_type || '-'}</div>
                        </div>
                        <div class="print-item">
                            <div class="print-label">تاريخ الاستشارة</div>
                            <div class="print-value">${consultation.consultation_date ? new Date(consultation.consultation_date).toLocaleDateString('en-US') : '-'}</div>
                        </div>
                        ${consultation.consultation_fees ? `
                        <div class="print-item">
                            <div class="print-label">رسوم الاستشارة</div>
                            <div class="print-value">${consultation.consultation_fees}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                ${consultation.case_facts ? `
                <div class="print-section">
                    <h2 class="print-section-title">وقائع القضية</h2>
                    <div class="print-text">${consultation.case_facts}</div>
                </div>
                ` : ''}
                
                ${consultation.legal_discussion ? `
                <div class="print-section">
                    <h2 class="print-section-title">المناقشة القانونية</h2>
                    <div class="print-text">${consultation.legal_discussion}</div>
                </div>
                ` : ''}
                
                ${consultation.legal_opinion ? `
                <div class="print-section">
                    <h2 class="print-section-title">الرأي القانوني</h2>
                    <div class="print-text">${consultation.legal_opinion}</div>
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

    if (!consultation) {
        return (
            <Layout>
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    لم يتم العثور على الاستشارة
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <Head>
                <title>عرض الاستشارة - مكتب المحامي</title>
            </Head>
            <div className="view-consultation-page">
                <div className="breadcrumbs">
                    <Link href="/services/legal-services">الخدمات القانونية</Link> / 
                    <Link href="/services/add-consultation">استشارة قانونية</Link> / 
                    عرض الاستشارة
                </div>
                <style jsx>{`
                    .view-consultation-page {
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

                    .view-consultation-page .main-content {
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

                    .view-consultation-page .sidebar {
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

                    .view-consultation-page .sidebar * {
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

                        .view-consultation-page {
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
                            <h1 style={{ 
                                fontSize: '1.875rem', 
                                fontWeight: '700', 
                                color: '#1e293b',
                                margin: '0 0 0.5rem 0'
                            }}>
                                تفاصيل الاستشارة
                            </h1>
                        </div>

                        {/* معلومات الاستشارة */}
                        <div className="info-section" id="consultation-info">
                            <div className="info-grid">
                                <div className="info-card">
                                    <div className="detail-row">
                                        <span className="detail-label">عنوان الاستشارة:</span>
                                        <span className="detail-value">{consultation.consultation_title || '-'}</span>
                                    </div>
                                </div>
                                <div className="info-card">
                                    <div className="detail-row">
                                        <span className="detail-label">اسم العميل:</span>
                                        <span className="detail-value">{consultation.client_name || '-'}</span>
                                    </div>
                                </div>
                                <div className="info-card">
                                    <div className="detail-row">
                                        <span className="detail-label">نوع الاستشارة:</span>
                                        <span className="detail-value">{consultation.consultation_type || '-'}</span>
                                    </div>
                                </div>
                                <div className="info-card">
                                    <div className="detail-row">
                                        <span className="detail-label">تاريخ الاستشارة:</span>
                                        <span className="detail-value">
                                            {consultation.consultation_date 
                                                ? new Date(consultation.consultation_date).toLocaleDateString('en-US')
                                                : '-'}
                                        </span>
                                    </div>
                                </div>
                                {consultation.consultation_fees && (
                                    <div className="info-card">
                                        <div className="detail-row">
                                            <span className="detail-label">رسوم الاستشارة:</span>
                                            <span className="detail-value">{consultation.consultation_fees}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="tabs-container">
                            <div className="tabs-nav">
                                {consultation.case_facts && (
                                    <button
                                        className={`tab-button ${activeTab === 'case-facts' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('case-facts')}
                                    >
                                        وقائع القضية
                                    </button>
                                )}
                                {consultation.legal_discussion && (
                                    <button
                                        className={`tab-button ${activeTab === 'legal-discussion' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('legal-discussion')}
                                    >
                                        المناقشة القانونية
                                    </button>
                                )}
                                {consultation.legal_opinion && (
                                    <button
                                        className={`tab-button ${activeTab === 'legal-opinion' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('legal-opinion')}
                                    >
                                        الرأي القانوني
                                    </button>
                                )}
                            </div>

                            {/* Tab Content */}
                            {activeTab && (
                                <div className="tab-content">
                                    {activeTab === 'case-facts' && consultation.case_facts && (
                                        <div className="tab-panel">
                                            <p style={{ 
                                                color: '#1e293b', 
                                                lineHeight: '1.8',
                                                whiteSpace: 'pre-wrap',
                                                margin: 0,
                                                fontSize: '0.9375rem'
                                            }}>
                                                {consultation.case_facts}
                                            </p>
                                        </div>
                                    )}

                                    {activeTab === 'legal-discussion' && consultation.legal_discussion && (
                                        <div className="tab-panel">
                                            <p style={{ 
                                                color: '#1e293b', 
                                                lineHeight: '1.8',
                                                whiteSpace: 'pre-wrap',
                                                margin: 0,
                                                fontSize: '0.9375rem'
                                            }}>
                                                {consultation.legal_discussion}
                                            </p>
                                        </div>
                                    )}

                                    {activeTab === 'legal-opinion' && consultation.legal_opinion && (
                                        <div className="tab-panel">
                                            <p style={{ 
                                                color: '#1e293b', 
                                                lineHeight: '1.8',
                                                whiteSpace: 'pre-wrap',
                                                margin: 0,
                                                fontSize: '0.9375rem'
                                            }}>
                                                {consultation.legal_opinion}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar - Right side */}
                    <div className="sidebar">
                        <div className="sidebar-header">
                            <h1 className="sidebar-title">عرض الاستشارة</h1>
                        </div>

                        <button 
                            className="edit-button"
                            onClick={() => router.push(`/services/add-consultation?edit=${id}`)}
                        >
                            <FiEdit />
                            تعديل الاستشارة
                        </button>

                        <div className="options-list">
                            <h4 className="options-title">قائمة خيارات</h4>
                            <button className="option-item" onClick={handleDelete}>
                                <FiTrash2 />
                                حذف الاستشارة
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

export default withAuth(ViewConsultationPage);








