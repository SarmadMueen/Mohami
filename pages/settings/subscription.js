import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import Link from 'next/link';
import { supabase } from '../../lib/initSupabase';
import { getApiUrl } from '../../lib/api';
import withAuth from '../../lib/withAuth';
import { CreditCard, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import {
    FiCheckCircle,
    FiShield,
    FiHardDrive,
    FiUsers,
    FiAward,
    FiHeadphones,
    FiBriefcase,
    FiFolder,
    FiFileText,
    FiMessageSquare
} from 'react-icons/fi';
import { useSubscription } from '../../context/SubscriptionContext';
import { useRouter } from 'next/router';
import { isNativeMobile } from '../../lib/platform';
import { checkStorageLimit } from '../../lib/storageUtils';

const SubscriptionPage = () => {
    const { 
        isTrialActive, 
        daysRemaining, 
        isSubscribed, 
        isReadOnly, 
        loading: subLoading, 
        subscription,
        planName: subPlanName,
        refresh 
    } = useSubscription();

    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [isAdmin, setIsAdmin] = useState(true);
    const [storageData, setStorageData] = useState(null);
    const [licenseState, setLicenseState] = useState({
        role: 'مدير النظام (رئيسي)',
        expiryDate: null,
        targetUserId: null
    });
    const router = useRouter();
    const isMobile = isNativeMobile();
    const [isDesktop, setIsDesktop] = useState(true);

    useEffect(() => {
        const checkDesktop = () => {
            const width = window.innerWidth;
            setIsDesktop(width >= 1024); // Only show on desktop (1024px and above)
        };
        
        checkDesktop();
        window.addEventListener('resize', checkDesktop);
        return () => window.removeEventListener('resize', checkDesktop);
    }, []);

    useEffect(() => {
        if (!router.isReady) return;

        if (router.query.payment && router.query.payment.startsWith('success')) {
            verifyPayment();
        } else {
            checkPermissions();
            fetchLicenseData();
        }
    }, [router.isReady, router.query, subscription]);

    const checkPermissions = async () => {
        const user = supabase.auth.user();
        if (!user) return;

        // Check if user is admin or lawyer
        const { data: ownData } = await supabase
            .from('user_metadata')
            .select('admin_user_id')
            .eq('user_id', user.id)
            .single();

        setIsAdmin(!ownData?.admin_user_id || ownData.admin_user_id === user.id);
    };

    const fetchLicenseData = async () => {
        try {
            const user = supabase.auth.user();
            if (!user) return;

            let targetUserId = user.id;
            let role = 'مدير النظام (رئيسي)';

            const { data: ownData } = await supabase
                .from('user_metadata')
                .select('admin_user_id')
                .eq('user_id', user.id)
                .single();

            if (ownData && ownData.admin_user_id && ownData.admin_user_id !== user.id) {
                targetUserId = ownData.admin_user_id;
                role = 'محامي / مساعد';
                setIsAdmin(false);
            } else {
                setIsAdmin(true);
            }

            const expiryDate = subscription?.current_period_end 
                ? new Date(subscription.current_period_end.replace(' ', 'T')).toLocaleDateString('ar-IQ') 
                : null;

            setLicenseState({
                role,
                expiryDate,
                targetUserId
            });

            // Fetch storage usage via API
            const storage = await checkStorageLimit(targetUserId);
            if (storage && !storage.error) {
                setStorageData(storage);
            }
        } catch (error) {
            console.error('Error fetching license metadata:', error);
        }
    };

    const verifyPayment = async () => {
        setCheckoutLoading(true);
        try {
            const session = supabase.auth.session();
            if (session) {
                await fetch('/api/payments/verify-success', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
            }
        } catch (e) {
            console.error('Verify failed', e);
        }
        await refresh();
        setCheckoutLoading(false);
        router.replace('/settings/subscription');
    };

    const handleSubscribe = async (planId, amount, currency) => {
        setCheckoutLoading(true);
        setErrorMessage(null);
        try {
            const session = supabase.auth.session();
            if (!session) {
                setErrorMessage('يرجى تسجيل الدخول أولاً.');
                return;
            }
            const res = await fetch('/api/payments/create-link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    plan_id: planId,
                    amount,
                    currency
                })
            });
            const data = await res.json();
            console.log('Payment API response:', data);
            if (data.url) {
                window.location.href = data.url;
            } else {
                let detail = '';
                if (data.details && typeof data.details === 'object') {
                    if (data.details.errors && data.details.errors.length > 0) {
                        detail = data.details.errors.map(e => e.code || e.message).join(', ');
                    } else {
                        detail = data.details.message || JSON.stringify(data.details);
                    }
                } else if (data.details) {
                    detail = String(data.details);
                } else {
                    detail = data.error || '';
                }
                setErrorMessage(`حدث خطأ أثناء إعداد رابط الدفع: ${detail}`);
            }
        } catch (err) {
            console.error('Payment fetch error:', err);
            setErrorMessage('خطأ في الاتصال بالخادم. يرجى المحاولة لاحقاً.');
        } finally {
            setCheckoutLoading(false);
        }
    };

    const handleManageSubscription = () => {
        if (isMobile) {
            window.open('https://www.mohamipro.com/billing', '_system');
        } else {
            window.location.href = 'https://checkout.thewayl.com/payment';
        }
    };

    return (
        <Layout>
            <Head>
                <title>ترخيص المكتب</title>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
            </Head>

            <div className="license-page-container">
                <div className="license-grid">
                    {/* Column 1: License Details (Right) */}
                    <div className="license-column">
                        <div className="column-card">
                            <h2 className="column-title">تفاصيل الترخيص</h2>
                            <div className="license-info-details">
                                <div className="detail-row">
                                    <span className="detail-label">باقة النظام</span>
                                    <span className="detail-value highlight-value">{subPlanName}</span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">نوع الرخصة</span>
                                    <span className="detail-value">{isTrialActive ? 'تجريبي' : 'اشتراك مدفوع'}</span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">نوع الحساب</span>
                                    <span className="detail-value">{licenseState.role}</span>
                                </div>

                                {licenseState.expiryDate && (
                                    <div className="detail-row">
                                        <span className="detail-label">تاريخ الانتهاء</span>
                                        <span className="detail-value text-red">{licenseState.expiryDate}</span>
                                    </div>
                                )}

                                {isAdmin && (
                                    <div className="action-box">
                                        <h3 className="action-title"><FiAward className="action-icon" /> ترخيص المكتب</h3>
                                        <p className="action-desc">يعرض هذا القسم حالة ترخيص المكتب، نوع الباقة، تاريخ انتهاء الخدمة، وبيانات الحساب المؤسسي المعتمد</p>
                                        <button onClick={handleManageSubscription} className="btn-primary">
                                            بوابة حساب المكتب
                                        </button>
                                    </div>
                                )}

                                {!isAdmin && (
                                    <div className="action-box bg-gray">
                                        <h3 className="action-title"><FiShield className="action-icon" /> حساب مُدار</h3>
                                        <p className="action-desc">هذا الحساب تتم إدارته عبر حساب مدير النظام الرئيسي للمكتب.</p>
                                    </div>
                                )}
                            </div>

                            <div className="support-box">
                                <h3 className="action-title"><FiHeadphones className="action-icon" /> الدعم الفني</h3>
                                <p className="action-desc">تواصل مع فريق الدعم في أي وقت في حال واجهتك مشكلة في النظام.</p>
                                <Link href="/support">
                                    <button className="btn-primary">اتصل بنا</button>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Storage & Team (Middle) */}
                    <div className="license-column">
                        <div className="column-card">
                            <h2 className="column-title">مساحة التخزين</h2>

                            {/* Storage Section */}
                            <div className="storage-section">
                                <div className="storage-header">
                                    <span className="storage-title"><FiHardDrive /> استخدام المساحة السحابية</span>
                                    {storageData ? (
                                        <span className="storage-numbers">{storageData.usedGB} GB / {storageData.limitGB} GB</span>
                                    ) : (
                                        <span>جاري الحساب...</span>
                                    )}
                                </div>

                                {storageData && (
                                    <div className="progress-bg">
                                        <div
                                            className="progress-fill"
                                            style={{
                                                width: `${storageData.percentUsed}%`,
                                                backgroundColor: storageData.percentUsed > 90 ? '#ef4444' : storageData.percentUsed > 75 ? '#f59e0b' : '#3b82f6'
                                            }}
                                        ></div>
                                    </div>
                                )}
                                <p className="storage-desc">يوفر لك النظام مساحة تخزين آمنة وموثوقة لحفظ القضايا والمرفقات وصور الموكلين.</p>
                            </div>

                            {/* Team Section */}
                            <div className="team-section">
                                <div className="team-header">
                                    <span className="team-title"><FiUsers /> المستخدمين</span>
                                    {storageData && <span className="team-count">{storageData.userCount} مستخدم</span>}
                                </div>
                                <p className="team-desc">عدد الحسابات الفعالة المشاركة داخل نفس رخصة المكتب التابعة للمدير.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pricing Cards - Only show on desktop (not on iPad/iPhone) */}
                {!isMobile && isDesktop && isAdmin && (
                    <div style={{ marginTop: '48px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', textAlign: 'center' }}>باقات الاشتراك المتاحة</h3>
                        <div className="pricing-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', maxWidth: '640px', margin: '0 auto' }}>

                            {/* Basic Plan */}
                            <div
                                className="pricing-card-clickable"
                                onClick={() => !checkoutLoading && subscription?.plan_id !== 'basic_12m' && handleSubscribe('basic_12m', 240000, 'IQD')}
                                style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '28px 20px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', cursor: checkoutLoading || subscription?.plan_id === 'basic_12m' ? 'default' : 'pointer', transition: 'all 0.25s ease', opacity: subscription?.plan_id === 'basic_12m' ? 0.6 : 1 }}
                            >
                                <h3 style={{ fontSize: '20px', color: '#64748B', marginBottom: '8px', marginTop: 0 }}>الأساسي</h3>
                                <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px', fontWeight: 'bold' }}>حساب مستخدم واحد (مدير فقط)</p>
                                <div style={{ marginBottom: '8px' }}>
                                    <span style={{ fontSize: '16px', color: '#94A3B8', textDecoration: 'line-through' }}>25,000 IQD / شهرياً</span>
                                </div>
                                <div style={{ marginBottom: '20px' }}>
                                    <span style={{ fontSize: '30px', fontWeight: '800', color: '#0F172A' }}>240,000</span>
                                    <span style={{ fontSize: '14px', color: '#64748B' }}> IQD / سنوياً</span>
                                </div>
                                <div style={{ marginBottom: '20px', display: 'inline-block', background: '#dcfce7', color: '#16a34a', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                                    وفّر 20% مقارنة بالاشتراك الشهري
                                </div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <li style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '10px', color: '#475569', fontSize: '14px' }}>سعة تخزين 10 GB</li>
                                    <li style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '10px', color: '#475569', fontSize: '14px' }}>إدارة القضايا الأساسية</li>
                                    <li style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '10px', color: '#475569', fontSize: '14px' }}>إدارة مالية أساسية</li>
                                </ul>

                                <div style={{
                                    width: '100%', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', border: '1px solid #fde68a',
                                    background: '#fffbeb', color: '#b45309', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <span>اشتراك سنوي</span>
                                    <span>240,000 IQD</span>
                                </div>
                            </div>

                            {/* Advanced Plan */}
                            <div
                                className="pricing-card-clickable"
                                onClick={() => !checkoutLoading && subscription?.plan_id !== 'advanced_12m' && handleSubscribe('advanced_12m', 336000, 'IQD')}
                                style={{ background: 'white', borderRadius: '16px', border: '2px solid #2563EB', padding: '28px 20px', textAlign: 'center', boxShadow: '0 10px 15px -3px rgba(37,99,235,0.2)', position: 'relative', cursor: checkoutLoading || subscription?.plan_id === 'advanced_12m' ? 'default' : 'pointer', transition: 'all 0.25s ease', opacity: subscription?.plan_id === 'advanced_12m' ? 0.6 : 1 }}
                            >
                                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', background: '#2563EB', color: 'white', padding: '4px 16px', fontSize: '12px', fontWeight: '700', borderRadius: '0 0 8px 8px' }}>الأكثر شيوعاً</div>
                                <h3 style={{ fontSize: '20px', color: '#64748B', marginBottom: '8px', marginTop: 0 }}>المتقدمة</h3>
                                <p style={{ fontSize: '13px', color: '#2563EB', marginBottom: '12px', fontWeight: 'bold' }}>حتى 3 حسابات (1 مدير + 2 محامي/مساعد)</p>
                                <div style={{ marginBottom: '8px' }}>
                                    <span style={{ fontSize: '16px', color: '#94A3B8', textDecoration: 'line-through' }}>35,000 IQD / شهرياً</span>
                                </div>
                                <div style={{ marginBottom: '20px' }}>
                                    <span style={{ fontSize: '30px', fontWeight: '800', color: '#0F172A' }}>336,000</span>
                                    <span style={{ fontSize: '14px', color: '#64748B' }}> IQD / سنوياً</span>
                                </div>
                                <div style={{ marginBottom: '20px', display: 'inline-block', background: '#dcfce7', color: '#16a34a', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                                    وفّر 20% مقارنة بالاشتراك الشهري
                                </div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <li style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '10px', color: '#475569', fontSize: '14px' }}>سعة تخزين 25 GB</li>
                                    <li style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '10px', color: '#475569', fontSize: '14px' }}>إدارة قضايا متقدمة</li>
                                    <li style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '10px', color: '#475569', fontSize: '14px' }}>تقارير إحصائية كاملة</li>
                                </ul>

                                <div style={{
                                    width: '100%', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', border: 'none',
                                    background: '#2563EB', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <span>اشتراك سنوي</span>
                                    <span>336,000 IQD</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {errorMessage && (
                    <div className="alert alert-error" style={{ marginTop: '24px', padding: '16px', background: '#FEF2F2', color: '#991B1B', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AlertCircle size={20} />
                        <span>{errorMessage}</span>
                    </div>
                )}
            </div>

            <style jsx>{`
                .license-page-container {
                    direction: rtl;
                    max-width: 1300px;
                    margin: 0 auto;
                    padding: 32px;
                    font-family: 'Cairo', 'Almarai', sans-serif;
                    background-color: #F8FAFC;
                    min-height: calc(100vh - 80px);
                }

                .page-header {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 32px;
                    background: white;
                    padding: 24px;
                    border-radius: 16px;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                }

                .header-icon {
                    width: 56px;
                    height: 56px;
                    background: #EFF6FF;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .page-title {
                    font-size: 24px;
                    font-weight: 800;
                    color: #0F172A;
                    margin: 0 0 8px 0;
                }

                .page-description {
                    font-size: 15px;
                    color: #64748B;
                    margin: 0;
                }

                .license-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 24px;
                }

                .column-card {
                    background: white;
                    border-radius: 16px;
                    padding: 32px 24px;
                    height: 100%;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                    border: 1px solid #E2E8F0;
                }

                .column-card.no-bg {
                    background: transparent;
                    border: none;
                    box-shadow: none;
                    padding: 0;
                }

                .column-title {
                    font-size: 20px;
                    font-weight: 800;
                    color: #1E293B;
                    margin: 0 0 32px 0;
                    padding-bottom: 16px;
                    border-bottom: 2px solid #F1F5F9;
                }

                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 0;
                    border-bottom: 1px dashed #E2E8F0;
                }

                .detail-label {
                    font-size: 15px;
                    color: #64748B;
                    font-weight: 600;
                }

                .detail-value {
                    font-size: 15px;
                    color: #0F172A;
                    font-weight: 700;
                }

                .highlight-value {
                    background: #F8FAFC;
                    padding: 4px 12px;
                    border-radius: 6px;
                    border: 1px solid #E2E8F0;
                }

                .text-red {
                    color: #DC2626;
                }

                .action-box {
                    margin-top: 32px;
                    padding: 24px;
                    border: 1px solid #E2E8F0;
                    border-radius: 12px;
                }
                
                .action-box.bg-gray {
                    background: #F8FAFC;
                }

                .support-box {
                    margin-top: 24px;
                    padding: 24px;
                }

                .action-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 16px;
                    font-weight: 700;
                    color: #1E293B;
                    margin: 0 0 8px 0;
                }

                .action-icon {
                    color: #8B5CF6;
                }

                .action-desc {
                    font-size: 14px;
                    color: #64748B;
                    line-height: 1.6;
                    margin: 0 0 16px 0;
                }

                .btn-primary {
                    display: inline-block;
                    background: #2563EB;
                    color: white;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 700;
                    text-decoration: none;
                    transition: all 0.2s;
                    text-align: center;
                    width: 100%;
                    border: none;
                    cursor: pointer;
                }

                .btn-primary:hover {
                    background: #1D4ED8;
                }

                .storage-section, .team-section {
                    margin-bottom: 40px;
                }

                .storage-header, .team-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .storage-title, .team-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 16px;
                    font-weight: 700;
                    color: #1E293B;
                }

                .storage-numbers, .team-count {
                    font-size: 14px;
                    font-weight: 700;
                    color: #475569;
                    background: #F1F5F9;
                    padding: 4px 10px;
                    border-radius: 6px;
                }

                .progress-bg {
                    background: #E2E8F0;
                    height: 12px;
                    border-radius: 10px;
                    overflow: hidden;
                    margin-bottom: 12px;
                }

                .progress-fill {
                    height: 100%;
                    border-radius: 10px;
                    transition: width 0.5s ease-in-out;
                }

                .storage-desc, .team-desc {
                    font-size: 14px;
                    color: #64748B;
                    line-height: 1.6;
                }

                /* Services Styles */
                .services-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .service-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                    background: white;
                    padding: 24px;
                    border-radius: 16px;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                    border: 1px solid #E2E8F0;
                }

                .service-icon {
                    width: 48px;
                    height: 48px;
                    background: #F8FAFC;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    font-size: 24px;
                }

                .service-content {
                    flex: 1;
                }

                .service-name {
                    font-size: 16px;
                    font-weight: 800;
                    color: #1E293B;
                    margin: 0 0 6px 0;
                }

                .service-desc {
                    font-size: 13px;
                    color: #64748B;
                    line-height: 1.6;
                    margin: 0;
                }

                .service-status {
                    font-size: 12px;
                    font-weight: 700;
                    color: #10B981;
                    background: #ECFDF5;
                    padding: 4px 10px;
                    border-radius: 20px;
                    white-space: nowrap;
                    margin-top: 4px;
                }

                .pricing-card-clickable:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 24px -4px rgba(0,0,0,0.12) !important;
                }

                @media (max-width: 1024px) {
                    .license-grid {
                        grid-template-columns: 1fr;
                    }
                    .column-card {
                        height: auto;
                    }
                    .services-list {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 768px) {
                    .services-list {
                        grid-template-columns: 1fr;
                    }
                    .license-page-container {
                        padding: 16px;
                    }
                }
            `}</style>
        </Layout>
    );
};

export default withAuth(SubscriptionPage, ['can_view_setting']);
