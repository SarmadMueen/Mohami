import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import {
    Briefcase,
    Users,
    Scale,
    DollarSign,
    CalendarClock,
    FileText,
    Twitter,
    Linkedin,
    Facebook,
    Mail,
    Phone,
    Menu,
    X,
    Shield,
    LayoutDashboard,
    FileCheck,
    HardDrive,
    BarChart3,
    Bell
} from 'lucide-react';
import Logo from '../components/Logo';

const PricingPage = () => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
        document.body.style.background = 'white';
        document.body.style.fontFamily = "'Cairo', sans-serif";

        return () => {
            document.body.style.background = '';
            document.body.style.fontFamily = '';
        };
    }, []);

    const handleGetStarted = () => {
        router.push('/register');
    };

    const handleLogin = () => {
        router.push('/login');
    };

    if (!mounted) {
        return null;
    }

    return (
        <>
            <Head>
                <title>الأسعار | محامي برو - باقات مرنة لمكتبك</title>
                <meta name="description" content="تعرف على باقات وأسعار محامي برو. حلول ذكية تناسب كافة أحجام مكاتب المحاماة في العراق." />
                <link rel="icon" href="/logo.png" />
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Kufi+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </Head>

            <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Cairo', sans-serif;
          background: white;
        }
        
        .landing-container {
          min-height: 100vh;
          background: white;
          direction: rtl;
        }
        
        .glass-header {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(229, 231, 235, 0.5);
        }

        .btn-primary {
          background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
          color: white;
          font-weight: 700;
          cursor: pointer;
        }
        
        .btn-primary:hover {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -6px rgba(37, 99, 235, 0.4);
        }

        @media (max-width: 768px) {
          .desktop-nav, .header-actions {
            display: none !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
          .pricing-header-row,
          .pricing-header-row ~ div {
            min-width: 900px;
          }
        }

        @media (max-width: 1024px) {
          .pricing-table-wrapper {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>

            <div className="landing-container" dir="rtl">
                {/* Header */}
                <header className="glass-header" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    height: '64px'
                }}>
                    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                            <Link href="/">
                                <a style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        <span style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", fontSize: '20px', fontWeight: '700', color: '#1E3A8A', lineHeight: '1.2', whiteSpace: 'nowrap' }}>محامي برو</span>
                                        <span style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", fontSize: '13px', fontWeight: '500', color: '#3B82F6', letterSpacing: '0.2px', whiteSpace: 'nowrap' }}>Mohami Pro</span>
                                    </div>
                                    <Logo height="48px" iconOnly={true} />
                                </a>
                            </Link>

                            <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                                <Link href="/#features">
                                    <a style={{ fontFamily: "'Cairo', sans-serif", fontSize: '16px', fontWeight: 'bold', color: '#334155', textDecoration: 'none', position: 'relative' }}>المميزات</a>
                                </Link>
                                <Link href="/pricing">
                                    <a style={{ fontFamily: "'Cairo', sans-serif", fontSize: '16px', fontWeight: 'bold', color: '#2563EB', textDecoration: 'none' }}>الأسعار</a>
                                </Link>
                                <Link href="/#contact">
                                    <a style={{ fontFamily: "'Cairo', sans-serif", fontSize: '16px', fontWeight: 'bold', color: '#334155', textDecoration: 'none' }}>تواصل معنا</a>
                                </Link>
                            </nav>

                            <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <button onClick={handleLogin} style={{
                                    fontFamily: "'Cairo', sans-serif",
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#334155',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}>تسجيل الدخول</button>
                                <button onClick={handleGetStarted} className="btn-primary" style={{
                                    color: 'white',
                                    background: '#2563EB',
                                    padding: '10px 24px',
                                    borderRadius: '9999px',
                                    fontFamily: "'Cairo', sans-serif",
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}>ابدأ مجاناً</button>
                            </div>

                            <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)} style={{ display: 'none', background: 'none', border: 'none', color: '#0f172a', padding: '8px' }}>
                                <Menu size={28} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                    <div style={{ position: 'fixed', inset: 0, background: '#ffffff', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '100px', gap: '20px' }}>
                        <button onClick={() => setMobileMenuOpen(false)} style={{ position: 'absolute', top: '20px', left: '25px', background: 'none', border: 'none', padding: '8px' }}>
                            <X size={32} />
                        </button>
                        <Link href="/#features"><a onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', textDecoration: 'none' }}>المميزات</a></Link>
                        <Link href="/pricing"><a onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '22px', fontWeight: '700', color: '#2563EB', textDecoration: 'none' }}>الأسعار</a></Link>
                        <Link href="/#contact"><a onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', textDecoration: 'none' }}>تواصل معنا</a></Link>
                        <div style={{ width: '60%', height: '1px', background: '#e2e8f0', margin: '10px 0' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '70%' }}>
                            <button onClick={() => { setMobileMenuOpen(false); handleLogin(); }} style={{ padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', color: 'white', fontWeight: '700' }}>تسجيل الدخول</button>
                            <button onClick={() => { setMobileMenuOpen(false); handleGetStarted(); }} style={{ padding: '14px', borderRadius: '12px', background: '#f1f5f9', border: '1px solid #e2e8f0', fontWeight: '700' }}>ابدأ مجاناً</button>
                        </div>
                    </div>
                )}

                {/* Pricing Content */}
                <main style={{ paddingTop: '64px' }}>
                    <section id="pricing" style={{ padding: '0 0 80px 0', background: 'white' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 50%, #3B82F6 100%)',
                            padding: 'clamp(60px, 8vw, 100px) 24px',
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}></div>
                            <div style={{ position: 'absolute', bottom: '-80px', left: '-40px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }}></div>

                            <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: '15px', color: 'rgba(255,255,255,0.8)', marginBottom: '12px', fontWeight: '500' }}>شريكك الاستراتيجي في التحول الرقمي والحوكمة</p>
                            <h1 style={{ fontFamily: "'Cairo', sans-serif", fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: '900', color: 'white', marginBottom: '16px' }}>الخطط والأسعار</h1>
                            <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: 'clamp(16px, 1.8vw, 19px)', color: 'rgba(255,255,255,0.85)', maxWidth: '800px', margin: '0 auto', lineHeight: '1.8' }}>
                                المحرك الرقمي الشامل الذي ينقل عملياتك القانونية من التقليدية إلى آفاق الإدارة الذكية والحوكمة. صُمم ليكون المركز العصبي لمكتبك، موفراً لك سيطرة مطلقة وأماناً فائقاً، مع رؤية إستراتيجية تدعم قراراتك بثبات ويقين.
                            </p>
                        </div>

                        <div className="pricing-table-wrapper" style={{ maxWidth: '1280px', margin: '-40px auto 0', padding: '0 24px', position: 'relative', zIndex: 10 }}>
                            <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>

                                {/* Re-implementing the table header */}
                                <div className="pricing-header-row" style={{ display: 'grid', gridTemplateColumns: '200px repeat(4, 1fr)', borderBottom: '2px solid #e2e8f0' }}>
                                    <div style={{ padding: '24px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid #e2e8f0' }}>
                                        <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: '15px', fontWeight: '800', color: '#2563EB' }}>الميزة / الباقة</span>
                                    </div>

                                    {/* Basic - Now with durations */}
                                    <div style={{ padding: '28px 20px', textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>
                                        <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#2563EB', marginBottom: '16px' }}>الأساسي</h3>
                                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
                                                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>25,000</span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>IQD / شهر واحد</div>
                                        </div>
                                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
                                                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>135,000</span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>IQD / 6 أشهر <span style={{ color: '#059669', background: '#d1fae5', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>توفير 10%</span></div>
                                        </div>
                                        <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '12px', border: '1px solid #fde68a' }}>
                                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
                                                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>240,000</span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>IQD / 12 شهر <span style={{ color: '#059669', background: '#d1fae5', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>توفير 20%</span></div>
                                        </div>
                                    </div>

                                    {/* Advanced - Now with durations */}
                                    <div style={{ padding: '28px 20px', textAlign: 'center', borderLeft: '1px solid #e2e8f0', background: 'linear-gradient(180deg, #eff6ff 0%, white 100%)', position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #2563EB, #3B82F6)', color: 'white', padding: '4px 20px', borderRadius: '0 0 12px 12px', fontSize: '11px', fontWeight: '700' }}>⭐ الأكثر شيوعاً</div>
                                        <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#2563EB', marginBottom: '16px', marginTop: '8px' }}>المتقدمة</h3>
                                        <div style={{ background: 'white', padding: '12px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #bfdbfe' }}>
                                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
                                                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>35,000</span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>IQD / شهر واحد</div>
                                        </div>
                                        <div style={{ background: 'white', padding: '12px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #bfdbfe' }}>
                                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
                                                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>189,000</span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>IQD / 6 أشهر <span style={{ color: '#059669', background: '#d1fae5', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>توفير 10%</span></div>
                                        </div>
                                        <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '12px', border: '1px solid #fde68a' }}>
                                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
                                                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>336,000</span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>IQD / 12 شهر <span style={{ color: '#059669', background: '#d1fae5', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>توفير 20%</span></div>
                                        </div>
                                    </div>

                                    {/* Institutional */}
                                    <div style={{ padding: '28px 20px', textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>
                                        <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#2563EB', marginBottom: '12px' }}>المؤسسي</h3>
                                        <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>
                                            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>119</span>
                                            <span style={{ fontSize: '14px', color: '#64748b' }}> USD / شهرياً</span>
                                        </div>
                                    </div>

                                    {/* Strategic */}
                                    <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                                        <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#2563EB', marginBottom: '12px' }}>الاستراتيجي</h3>
                                        <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>
                                            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>229</span>
                                            <span style={{ fontSize: '14px', color: '#64748b' }}> USD / شهرياً</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Features (Shortened for brevity but keeping high quality) */}
                                {[
                                    { label: 'عدد المستخدمين', icon: <Users size={18} />, values: ['حساب واحد (مدير)', 'حتى 3 حسابات', '—', '—'] },
                                    { label: 'سعة التخزين', icon: <HardDrive size={18} />, values: ['5 GB', '15 GB', '—', '—'] },
                                    { label: 'إدارة القضايا', icon: <Briefcase size={18} />, values: ['أساسي', 'متقدم', '—', '—'] },
                                    { label: 'الإدارة المالية', icon: <DollarSign size={18} />, values: ['أساسي', 'متقدم', '—', '—'] },
                                    { label: 'التقارير', icon: <BarChart3 size={18} />, values: ['أساسي', 'بياني', '—', '—'] },
                                    { label: 'الأمان', icon: <Shield size={18} />, values: ['شفرة SSL', 'صلاحيات أدوار', '—', '—'] }
                                ].map((row, idx) => (
                                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '200px repeat(4, 1fr)', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', borderLeft: '1px solid #f1f5f9' }}>
                                            {row.icon} <span style={{ fontSize: '13px', fontWeight: '700' }}>{row.label}</span>
                                        </div>
                                        {row.values.map((v, i) => (
                                            <div key={i} style={{ padding: '18px 16px', textAlign: 'center', fontSize: '13px', borderLeft: i < 3 ? '1px solid #f1f5f9' : 'none' }}>{v}</div>
                                        ))}
                                    </div>
                                ))}

                                {/* CTA Row */}
                                <div style={{ display: 'grid', gridTemplateColumns: '200px repeat(4, 1fr)', background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                                    <div style={{ borderLeft: '1px solid #e2e8f0' }}></div>
                                    {[0, 1, 2, 3].map(i => (
                                        <div key={i} style={{ padding: '20px 16px', display: 'flex', justifyContent: 'center', borderLeft: i < 3 ? '1px solid #e2e8f0' : 'none', opacity: i >= 2 ? 0.6 : 1 }}>
                                            <button
                                                onClick={i >= 2 ? null : handleGetStarted}
                                                className={i >= 2 ? "" : "btn-primary"}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    borderRadius: '10px',
                                                    background: i >= 2 ? '#f1f5f9' : undefined,
                                                    color: i >= 2 ? '#64748b' : undefined,
                                                    border: i >= 2 ? '1px dashed #cbd5e1' : 'none',
                                                    cursor: i >= 2 ? 'default' : 'pointer'
                                                }}
                                            >
                                                {i >= 2 ? 'قريباً' : 'ابدأ الآن'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                </main>

                <footer style={{ background: 'white', padding: '60px 0', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 48px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
                            <Logo height="50px" iconOnly={true} />
                            <div style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <span style={{ fontSize: '22px', fontWeight: '800', color: '#1E3A8A', display: 'block', whiteSpace: 'nowrap' }}>محامي برو</span>
                                <span style={{ fontSize: '13px', color: '#3B82F6', whiteSpace: 'nowrap' }}>Mohami Pro</span>
                            </div>
                        </div>
                        <p style={{ color: '#64748b', fontSize: '14px' }}>&copy; 2026 محامي برو. جميع الحقوق محفوظة.</p>
                    </div>
                </footer>
            </div>
        </>
    );
};

export default PricingPage;
