import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/initSupabase';
import Logo from '../components/Logo';
import {
    User,
    Mail,
    Phone,
    Briefcase,
    Upload,
    CheckCircle,
    AlertCircle,
    Loader2,
    Shield,
    Headphones,
    Gift,
    Menu,
    X
} from 'lucide-react';

export default function Register() {
    const router = useRouter();

    // Native app guard: redirect to login on native apps
    useEffect(() => {
        const cap = typeof window !== 'undefined' ? window.Capacitor : null;
        const platform = cap?.getPlatform?.();
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const isAndroidWebView = /Android/i.test(ua) && (/wv/i.test(ua) || /Version\/[\d.]+/i.test(ua));
        const isNativeCapacitor = platform === 'android' || platform === 'ios';

        if (isNativeCapacitor || isAndroidWebView) {
            router.replace('/login');
        }
    }, [router]);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        full_name_en: '',
        full_name_ar: '',
        email: '',
        phone: '',
        office_name: '',
        notes: ''
    });
    const [file, setFile] = useState(null);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (!formData.full_name_en || !formData.full_name_ar || !formData.email || !formData.phone || !file) {
                throw new Error('يرجى ملء جميع الحقول المطلوبة وإرفاق هوية النقابة');
            }
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            // Upload to root of bar-ids bucket
            const filePath = fileName;
            let { error: uploadError } = await supabase.storage.from('bar-ids').upload(filePath, file);
            if (uploadError) { console.error('Upload error:', uploadError); throw new Error('فشل في رفع الصورة. يرجى المحاولة مرة أخرى.'); }
            const { error: insertError } = await supabase.from('trial_requests').insert([{
                full_name_en: formData.full_name_en, full_name_ar: formData.full_name_ar,
                email: formData.email, phone: formData.phone, office_name: formData.office_name,
                bar_id_url: fileName, notes: formData.notes
            }]);
            if (insertError) { console.error('Insert error:', insertError); throw new Error('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة لاحقاً.'); }
            setSuccess(true);
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    // ── Success Screen ──
    if (success) {
        return (
            <>
                <Head>
                    <title>تم التسجيل بنجاح | محامي برو</title>
                    <meta name="robots" content="noindex" />
                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fustat:wght@400;500;600;700&display=swap" rel="stylesheet" />
                    <link rel="icon" href="/logo.png" />
                </Head>
                <style jsx global>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Cairo', sans-serif; 
            background: #f8fafc;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          body::-webkit-scrollbar {
            display: none;
          }
        `}</style>
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', direction: 'rtl', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)' }}>
                    <div style={{ maxWidth: '480px', width: '100%', background: 'white', borderRadius: '24px', padding: '48px 40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}>
                        <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 24px rgba(34,197,94,0.3)' }}>
                            <CheckCircle size={40} color="white" />
                        </div>
                        <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>تم إرسال طلبك بنجاح!</h2>
                        <p style={{ fontSize: '16px', color: '#64748b', lineHeight: '1.8', marginBottom: '32px' }}>شكراً لتسجيلك. سنقوم بمراجعة طلبك وتفعيل حسابك قريباً.<br />سيتم التواصل معك عبر البريد الإلكتروني أو الهاتف.</p>
                        <Link href="/"><a style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 32px', background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)', color: 'white', borderRadius: '12px', fontSize: '16px', fontWeight: '700', textDecoration: 'none', width: '100%', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>العودة للرئيسية</a></Link>
                    </div>
                </div>
            </>
        );
    }

    // ── Main Form ──
    return (
        <>
            <Head>
                <title>تسجيل طلب اشتراك | محامي برو - ابدأ تجربتك المجانية</title>
                <meta name="description" content="انضم إلى عائلة محامي برو اليوم. سجل طلبك للحصول على نسخة تجريبية كاملة المميزات لإدارة مكتب المحاماة الخاص بك في العراق." />
                <meta name="keywords" content="تسجيل محامي برو, اشتراك برنامج محاماة, تجربة مجانية محامي برو" />
                <link rel="canonical" href="https://mohamipro.com/register" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fustat:wght@400;500;600;700&display=swap" rel="stylesheet" />
                <link rel="icon" href="/logo.png" />
            </Head>

            <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Cairo', sans-serif; 
          background: white;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        body::-webkit-scrollbar {
          display: none;
        }

        .glass-header {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          height: 72px;
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(229,231,235,0.5);
        }

        .reg-input {
          width: 100%;
          padding: 8px 36px 8px 10px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          font-family: 'Cairo', sans-serif;
          background: #f8fafc;
          color: #0f172a;
          outline: none;
          transition: all 0.2s ease;
        }
        .reg-input:focus {
          border-color: #2563EB;
          background: white;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.08);
        }
        .reg-input::placeholder { color: #94a3b8; }
        .reg-input-ltr { direction: ltr; text-align: left; }

        .reg-textarea {
          width: 100%;
          padding: 6px 10px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          font-family: 'Cairo', sans-serif;
          background: #f8fafc;
          color: #0f172a;
          outline: none;
          transition: all 0.2s ease;
          resize: none;
        }
        .reg-textarea:focus {
          border-color: #2563EB;
          background: white;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.08);
        }
        .reg-textarea::placeholder { color: #94a3b8; }

        .submit-btn {
          width: 100%;
          padding: 10px 24px;
          background: linear-gradient(135deg, #2563EB 0%, #06B6D4 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          font-family: 'Cairo', sans-serif;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(37,99,235,0.25);
        }
        .submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(37,99,235,0.35);
        }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-icon { animation: spin 1s linear infinite; }

        .upload-zone {
          border: 1.5px dashed #cbd5e1;
          border-radius: 10px;
          padding: 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #f8fafc;
        }
        .upload-zone:hover { border-color: #2563EB; background: #eff6ff; }

        .btn-primary-nav {
          background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%);
          transition: all 0.3s;
          border: none;
          color: white;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-primary-nav:hover {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
          transform: translateY(-1px);
          box-shadow: 0 8px 16px -4px rgba(37,99,235,0.35);
        }


        .no-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }

        @media (max-width: 900px) {
          .reg-layout { flex-direction: column !important; }
          .reg-sidebar { display: none !important; }
          .reg-grid { grid-template-columns: 1fr !important; }
          .desktop-nav { display: none !important; }
          .header-actions { display: none !important; }
          .reg-main { height: auto !important; overflow: visible !important; }
          .reg-main-inner { min-height: auto !important; }
          .reg-card { min-height: auto !important; }
          .mobile-menu-btn { display: block !important; }
        }
        @media (min-width: 901px) {
          .mobile-menu-btn { display: none !important; }
        }
      `}</style>

            <div style={{ direction: 'rtl', minHeight: '100vh', background: 'white' }}>

                {/* ═══════ HEADER NAV ═══════ */}
                <header className="glass-header">
                    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 40px', height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                            {/* Logo */}
                            <Link href="/">
                                <a style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        <span style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", fontSize: '20px', fontWeight: '700', color: '#1E3A8A', lineHeight: '1.2', whiteSpace: 'nowrap' }}>محامي برو</span>
                                        <span style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", fontSize: '13px', fontWeight: '500', color: '#3B82F6', letterSpacing: '0.2px', whiteSpace: 'nowrap' }}>Mohami Pro</span>
                                    </div>
                                    <Logo height="48px" iconOnly={true} />
                                </a>
                            </Link>

                            {/* Desktop Nav Links */}
                            <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                                <Link href="/#features">
                                    <a style={{ fontFamily: "'Cairo', sans-serif", fontSize: '15px', fontWeight: 'bold', color: '#334155', textDecoration: 'none' }}>المميزات</a>
                                </Link>
                                <Link href="/#contact">
                                    <a style={{ fontFamily: "'Cairo', sans-serif", fontSize: '15px', fontWeight: 'bold', color: '#334155', textDecoration: 'none' }}>تواصل معنا</a>
                                </Link>
                            </nav>

                            {/* Header Actions */}
                            <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button onClick={() => router.push('/login')} style={{ fontFamily: "'Cairo', sans-serif", fontSize: '14px', fontWeight: '600', color: '#334155', background: 'none', border: 'none', cursor: 'pointer' }}>
                                    تسجيل الدخول
                                </button>
                                <button onClick={() => router.push('/register')} className="btn-primary-nav" style={{ color: 'white', padding: '8px 20px', borderRadius: '9999px', fontFamily: "'Cairo', sans-serif", fontSize: '14px' }}>
                                    ابدأ مجاناً
                                </button>
                            </div>

                            {/* Mobile Menu Button */}
                            <button
                                className="mobile-menu-btn"
                                onClick={() => setMobileMenuOpen(true)}
                                style={{
                                    display: 'none', // Controlled by CSS media queries
                                    background: 'none',
                                    border: 'none',
                                    color: '#0f172a',
                                    cursor: 'pointer',
                                    padding: '8px'
                                }}
                            >
                                <Menu size={28} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: '#ffffff',
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        paddingTop: '100px',
                        gap: '20px',
                        direction: 'rtl',
                        fontFamily: "'Cairo', sans-serif"
                    }}>
                        {/* Close Button */}
                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            style={{
                                position: 'absolute',
                                top: '20px',
                                left: '25px',
                                background: 'none',
                                border: 'none',
                                color: '#0f172a',
                                cursor: 'pointer',
                                padding: '8px'
                            }}
                        >
                            <X size={32} />
                        </button>

                        {/* Nav Links */}
                        <Link href="/#features">
                            <a
                                onClick={() => setMobileMenuOpen(false)}
                                style={{
                                    fontFamily: "'Cairo', sans-serif",
                                    fontSize: '22px',
                                    fontWeight: '700',
                                    color: '#0f172a',
                                    textDecoration: 'none',
                                    padding: '12px 24px'
                                }}
                            >
                                المميزات
                            </a>
                        </Link>
                        <Link href="/#contact">
                            <a
                                onClick={() => setMobileMenuOpen(false)}
                                style={{
                                    fontFamily: "'Cairo', sans-serif",
                                    fontSize: '22px',
                                    fontWeight: '700',
                                    color: '#0f172a',
                                    textDecoration: 'none',
                                    padding: '12px 24px'
                                }}
                            >
                                تواصل معنا
                            </a>
                        </Link>

                        {/* Divider */}
                        <div style={{ width: '60%', height: '1px', background: '#e2e8f0', margin: '10px 0' }}></div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '70%' }}>
                            <button
                                onClick={() => { setMobileMenuOpen(false); router.push('/login'); }}
                                style={{
                                    padding: '14px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                                    border: 'none',
                                    color: '#ffffff',
                                    fontWeight: '700',
                                    fontSize: '16px',
                                    fontFamily: "'Cairo', sans-serif",
                                    cursor: 'pointer'
                                }}
                            >
                                تسجيل الدخول
                            </button>
                            <button
                                onClick={() => { setMobileMenuOpen(false); router.push('/register'); }}
                                style={{
                                    padding: '14px',
                                    borderRadius: '12px',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    color: '#0f172a',
                                    fontWeight: '700',
                                    fontSize: '16px',
                                    fontFamily: "'Cairo', sans-serif",
                                    cursor: 'pointer'
                                }}
                            >
                                ابدأ مجاناً
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══════ MAIN CONTENT ═══════ */}
                <div className="reg-main" style={{ paddingTop: '68px', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '12px 24px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

                        {/* Page Title - compact */}
                        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                                قم بطلب{' '}
                                <span style={{ background: 'linear-gradient(135deg, #2563EB, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>تجربة مجانية</span>
                            </h1>
                            <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>احصل على نسخة تجريبية شاملة تمنحك وصولاً كاملاً لجميع الأدوات والمزايا، لتكتشف إمكانيات المنصة قبل الاشتراك.</p>
                        </div>

                        {/* Main Card */}
                        <div className="reg-layout" style={{
                            background: 'white',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            display: 'flex',
                            boxShadow: '0 4px 24px -4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
                            flex: 1,
                            minHeight: 0
                        }}>

                            {/* ─── Form Section ─── */}
                            <div className="no-scrollbar" style={{ padding: '16px 28px', flex: 1, overflow: 'auto' }}>

                                {/* Error Banner */}
                                {error && (
                                    <div style={{ marginBottom: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                                        <AlertCircle size={18} />
                                        <p style={{ fontSize: '13px', fontWeight: '600' }}>{error}</p>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit}>
                                    <div className="reg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>

                                        {/* Arabic Name */}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '3px' }}>
                                                الاسم الكامل (بالعربية) <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <div style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                                    <User size={16} color="#94a3b8" />
                                                </div>
                                                <input type="text" name="full_name_ar" required value={formData.full_name_ar} onChange={handleInputChange} className="reg-input" placeholder="الاسم الثلاثي" />
                                            </div>
                                        </div>

                                        {/* English Name */}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '3px' }}>
                                                الاسم الكامل (بالإنجليزية) <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <div style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                                    <User size={16} color="#94a3b8" />
                                                </div>
                                                <input type="text" name="full_name_en" required value={formData.full_name_en} onChange={handleInputChange} className="reg-input reg-input-ltr" placeholder="Full Name" />
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '3px' }}>
                                                البريد الإلكتروني <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <div style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                                    <Mail size={16} color="#94a3b8" />
                                                </div>
                                                <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="reg-input reg-input-ltr" placeholder="email@example.com" />
                                            </div>
                                        </div>

                                        {/* Phone */}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '3px' }}>
                                                رقم الهاتف <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <div style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                                    <Phone size={16} color="#94a3b8" />
                                                </div>
                                                <input type="tel" name="phone" required value={formData.phone} onChange={handleInputChange} className="reg-input reg-input-ltr" placeholder="07xxxxxxxxx" />
                                            </div>
                                        </div>

                                        {/* Office Name */}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '3px' }}>
                                                اسم المكتب <span style={{ color: '#94a3b8', fontWeight: '400', fontSize: '12px' }}>(اختياري)</span>
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <div style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                                    <Briefcase size={16} color="#94a3b8" />
                                                </div>
                                                <input type="text" name="office_name" value={formData.office_name} onChange={handleInputChange} className="reg-input" placeholder="مكتب العدالة للمحاماة" />
                                            </div>
                                        </div>

                                        {/* File Upload */}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '3px' }}>
                                                هوية النقابة <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <div
                                                className="upload-zone"
                                                onClick={() => document.getElementById('file-upload').click()}
                                                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 14px', textAlign: 'right' }}
                                            >
                                                <div style={{ width: '36px', height: '36px', background: file ? '#dcfce7' : '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    {file ? <CheckCircle size={18} color="#16a34a" /> : <Upload size={18} color="#2563EB" />}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    {file ? (
                                                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#16a34a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                                                    ) : (
                                                        <p style={{ fontSize: '13px', color: '#64748b' }}><span style={{ color: '#2563EB', fontWeight: '700' }}>اختر ملف</span> — PNG, JPG, PDF</p>
                                                    )}
                                                </div>
                                                <input id="file-upload" type="file" onChange={handleFileChange} accept="image/*,.pdf" style={{ display: 'none' }} />
                                            </div>
                                        </div>

                                        {/* Notes - Full width */}
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '3px' }}>
                                                ملاحظات <span style={{ color: '#94a3b8', fontWeight: '400', fontSize: '12px' }}>(اختياري)</span>
                                            </label>
                                            <textarea
                                                name="notes" rows={1} value={formData.notes} onChange={handleInputChange}
                                                className="reg-textarea" placeholder="أي معلومات إضافية..."
                                            />
                                        </div>
                                    </div>

                                    {/* Confirmation + Submit */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                        <input type="checkbox" id="confirm" required style={{ width: '16px', height: '16px', accentColor: '#2563EB', cursor: 'pointer' }} />
                                        <label htmlFor="confirm" style={{ fontSize: '13px', color: '#64748b', cursor: 'pointer' }}>
                                            أؤكد أن جميع المعلومات المدخلة صحيحة وقانونية.
                                        </label>
                                    </div>

                                    <button type="submit" disabled={loading} className="submit-btn">
                                        {loading ? (<><Loader2 size={18} className="spin-icon" /> جاري الإرسال...</>) : 'إرسال طلب الانضمام'}
                                    </button>
                                </form>
                            </div>

                            {/* ─── Sidebar ─── */}
                            <div className="reg-sidebar" style={{
                                width: '320px',
                                background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
                                color: 'white',
                                padding: '32px 28px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                position: 'relative',
                                overflow: 'hidden',
                                flexShrink: 0
                            }}>
                                {/* Decorative */}
                                <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '160px', height: '160px', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
                                <div style={{ position: 'absolute', bottom: '-40px', right: '-40px', width: '140px', height: '140px', background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />

                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '6px' }}>هل لديك أسئلة؟</h3>
                                    <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '28px', lineHeight: '1.7' }}>
                                        فريق المبيعات المخصص لدينا هنا لدعمك. نحن مجرد رسالة أو مكالمة بعيدة.
                                    </p>

                                    {/* Benefits */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                            <div style={{ width: '38px', height: '38px', background: 'rgba(37,99,235,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Gift size={18} color="#60a5fa" />
                                            </div>
                                            <div>
                                                <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>تجربة مجانية 14 يوم</h4>
                                                <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>بدون التزام أو بطاقة ائتمان</p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                            <div style={{ width: '38px', height: '38px', background: 'rgba(6,182,212,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Headphones size={18} color="#22d3ee" />
                                            </div>
                                            <div>
                                                <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>دعم فني مخصص</h4>
                                                <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>مساعدة في الإعداد ونقل البيانات</p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                            <div style={{ width: '38px', height: '38px', background: 'rgba(99,102,241,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Shield size={18} color="#818cf8" />
                                            </div>
                                            <div>
                                                <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>أمان وخصوصية</h4>
                                                <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>تشفير كامل لجميع بياناتك</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CTA Button */}
                                    <button
                                        onClick={() => window.open('mailto:support@mohamipro.com')}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: 'linear-gradient(135deg, #2563EB, #06B6D4)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontFamily: "'Cairo', sans-serif",
                                            fontSize: '15px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            marginBottom: '20px',
                                            boxShadow: '0 4px 14px rgba(37,99,235,0.3)'
                                        }}
                                    >
                                        اتصل بنا
                                    </button>

                                    {/* Contact */}
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                                        <p style={{ fontSize: '14px', fontWeight: '700', direction: 'ltr', textAlign: 'right', marginBottom: '4px' }}>+964 780 000 0000</p>
                                        <p style={{ fontSize: '13px', color: '#60a5fa' }}>support@mohamipro.com</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
