import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '../lib/initSupabase';
import {
  Briefcase,
  Users,
  Scale,
  DollarSign,
  CalendarClock,
  FileText,
  Check,
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Twitter,
  Linkedin,
  Facebook,
  MapPin,
  Phone,
  Menu,
  X,
  Shield,
  Headphones,
  Zap,
  BarChart3,
  Bell,
  Smartphone,
  LayoutDashboard,
  FileCheck,
  Crown,
  Database,
  Star,
  HardDrive,
  ChevronDown,
  Brain,
  Cpu,
  Send,
  ListTodo,
  Calculator,
  BookOpen,
  ShieldCheck,
  Cloud
} from 'lucide-react';
import Logo from '../components/Logo';

const LandingPage = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isMobileApp, setIsMobileApp] = useState(false);
  const [mobileEmail, setMobileEmail] = useState('');
  const [mobilePassword, setMobilePassword] = useState('');
  const [mobileLoading, setMobileLoading] = useState(false);
  const [mobileErrorMessage, setMobileErrorMessage] = useState('');

  const scrollToId = (id) => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleMobileLogin = async (e) => {
    e.preventDefault();
    setMobileLoading(true);
    setMobileErrorMessage('');

    try {
      const { error, user } = await supabase.auth.signIn({
        email: mobileEmail,
        password: mobilePassword,
      });

      if (error) {
        setMobileErrorMessage(error.message || 'Failed to login. Please check your credentials.');
      } else {
        if (user) {
          const { data: clientData } = await supabase
            .from('client_accounts')
            .select('id')
            .eq('auth_user_id', user.id)
            .maybeSingle();

          if (clientData) {
            router.push('/client-portal/dashboard');
          } else {
            router.push('/dashboard');
          }
        }
      }
    } catch (error) {
      setMobileErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setMobileLoading(false);
    }
  };

  useEffect(() => {
    const onScroll = () => setHeaderScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMounted(true);
    document.body.style.background = 'white';
    document.body.style.fontFamily = "'Cairo', sans-serif";

    // Check if running inside native mobile shell (Capacitor/WebView fallback)
    const isCapacitor = typeof window !== 'undefined' && window.Capacitor;
    const capacitorPlatform = isCapacitor?.getPlatform?.();
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
    const isAndroidWebView = /Android/i.test(ua) && (/wv/i.test(ua) || /Version\/[\d.]+/i.test(ua));
    const isNative = (capacitorPlatform === 'ios' || capacitorPlatform === 'android') || isAndroidWebView;
    setIsMobileApp(isNative);

    // Native startup redirect is handled centrally in pages/_app.js.

    // For web, check authentication status
    const checkAuth = async () => {
      try {
        const session = supabase.auth.session();
        if (session && session.user) {
          // Check if user is a client or lawyer/admin
          const { data: clientData } = await supabase
            .from('client_accounts')
            .select('id')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();

          if (clientData) {
            router.replace('/client-portal/dashboard');
          } else {
            router.replace('/dashboard');
          }
        } else {
          setAuthChecked(true);
        }
      } catch (err) {
        setAuthChecked(true);
      }
    };

    if (!isNative) {
      checkAuth();
    }

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session && session.user) {
          const checkUserAndRedirect = async (userId) => {
            try {
              const { data: clientData } = await supabase
                .from('client_accounts')
                .select('id')
                .eq('auth_user_id', userId)
                .maybeSingle();

              if (clientData) {
                router.replace('/client-portal/dashboard');
              } else {
                router.replace('/dashboard');
              }
            } catch (err) {
              router.replace('/dashboard');
            }
          };
          checkUserAndRedirect(session.user.id);
        }
      }
    );

    return () => {
      if (authListener && authListener.unsubscribe) {
        authListener.unsubscribe();
      }
      document.body.style.background = '';
      document.body.style.fontFamily = '';
    };
  }, [router]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [mobileMenuOpen]);

  const handleGetStarted = () => {
    router.push('/register');
  };

  const handleLogin = () => {
    router.push('/login');
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    router.push('/register');
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!mounted) {
    return null;
  }

  // If running in mobile app, redirect happens immediately.
  if (isMobileApp) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Mohami Pro | محامي برو - أفضل نظام إدارة مكاتب محاماة في العراق</title>
        <meta name="description" content="محامي برو هو النظام القانوني الأول في العراق لإدارة مكاتب المحاماة. تنظيم القضايا، الجلسات، الموكلين، والتقارير المالية في منصة واحدة آمنة." />
        <meta name="keywords" content="محامي برو, برنامج محاماة العراق, إدارة مكاتب المحاماة, قانون العراق, تنظيم قضايا, مكتب محاماة رقمي, برنامج ادارة الموكلين" />
        <link rel="icon" href="/logo.png" />
        <link rel="canonical" href="https://mohamipro.com" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://mohamipro.com/" />
        <meta property="og:title" content="محامي برو | النظام المتكامل لإدارة مكاتب المحاماة في العراق" />
        <meta property="og:description" content="أدر مكتبك باحترافية كاملة. تنظيم القضايا، الجلسات، والمدفوعات المالية مع محامي برو." />
        <meta property="og:image" content="https://mohamipro.com/logo.png" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://mohamipro.com/" />
        <meta property="twitter:title" content="محامي برو | النظام المتكامل لإدارة مكاتب المحاماة في العراق" />
        <meta property="twitter:description" content="أدر مكتبك باحترافية كاملة. تنظيم القضايا، الجلسات، والمدفوعات المالية مع محامي برو." />
        <meta property="twitter:image" content="https://mohamipro.com/logo.png" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fustat:wght@400;500;600;700&family=Noto+Kufi+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Mohami Pro",
              "operatingSystem": "Web",
              "applicationCategory": "BusinessApplication",
              "description": "Legal management software for law firms in Iraq.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              }
            })
          }}
        />
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
          --mp-primary: #2563eb;
          --mp-primary-hover: #1d4ed8;
          --mp-ink: #0f172a;
          --mp-surface: #f4f8fb;
          --mp-surface-2: #eef6ff;
          --mp-muted: #64748b;
          --mp-border: #e2e8f0;
          --mp-radius: 16px;
          --mp-radius-lg: 24px;
          min-height: 100vh;
          background: white;
          direction: rtl;
        }
        
        .glass-header {
          background: #ffffff;
          border-bottom: 1px solid #E2E8F0;
          transition: all 0.3s ease;
          height: 72px;
        }
        
        /* ===== PREMIUM NAVY HERO SECTION ===== */
        .hero-section {
          position: relative;
          overflow: visible;
          padding: 0;
          text-align: right;
          direction: rtl;
        }

        .hero-bg-decoration {
          position: absolute;
          top: -72px;
          left: 0;
          right: 0;
          height: 500px;
          background: 
            radial-gradient(circle at 50% 70%, rgba(59, 130, 246, 0.35), transparent 35%),
            linear-gradient(135deg, #0A2845 0%, #103A6E 46%, #1A4FA0 100%);
          pointer-events: none;
          overflow: hidden;
          z-index: 0;
        }

        .hero-bg-arc-1 {
          position: absolute;
          width: 900px;
          height: 900px;
          border: 1.5px solid rgba(255, 255, 255, 0.12);
          border-radius: 50%;
          top: -25%;
          right: -12%;
        }

        .hero-bg-arc-2 {
          position: absolute;
          width: 700px;
          height: 700px;
          border: 1.5px solid rgba(255, 255, 255, 0.10);
          border-radius: 50%;
          bottom: 5%;
          left: -8%;
        }

        .hero-bg-arc-3 {
          position: absolute;
          width: 500px;
          height: 500px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 50%;
          top: 30%;
          left: 50%;
          transform: translateX(-50%);
        }

        .hero-inner {
          max-width: 100%;
          margin: 100px 0 0;
          padding: 0 150px 0 24px;
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .hero-heading {
          font-family: 'Cairo', sans-serif;
          font-size: clamp(20px, 2.2vw, 30px);
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.22;
          letter-spacing: -0.02em;
          margin: 0;
          max-width: 980px;
        }

        .hero-subheading {
          font-family: 'Cairo', sans-serif;
          font-size: clamp(13px, 1.1vw, 15px);
          color: rgba(255, 255, 255, 0.82);
          line-height: 1.9;
          margin: 12px 0 0;
          max-width: 780px;
          font-weight: 400;
        }

        .hero-buttons {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 24px;
        }

        .hero-btn-primary {
          height: 54px;
          padding: 0 44px;
          border-radius: 14px;
          background: transparent;
          color: #FFFFFF;
          font-family: 'Cairo', sans-serif;
          font-size: 18px;
          font-weight: 800;
          border: 2px solid rgba(255, 255, 255, 0.9);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .hero-btn-primary:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: #FFFFFF;
        }

        .hero-btn-secondary {
          height: 54px;
          padding: 0 32px;
          border-radius: 14px;
          background: #FFFFFF;
          color: #2563EB;
          font-family: 'Cairo', sans-serif;
          font-size: 18px;
          font-weight: 800;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
        }

        .hero-btn-secondary:hover {
          background: #F8FAFC;
          color: #1D4ED8;
        }

        /* ===== DASHBOARD SHOWCASE ===== */
        .showcase-container {
          position: relative;
          z-index: 4;
          margin-top: -20px;
          margin-bottom: -70px;
          width: 100%;
          display: flex;
          justify-content: flex-start;
        }

        .browser-frame {
          position: relative;
          background: transparent;
          border-radius: 0;
          overflow: hidden;
          box-shadow: none;
          width: calc(100% - 48px);
          max-width: 1200px;
          border: none;
          transition: all 0.5s ease;
          transform: perspective(1800px) rotateY(-2deg) rotateX(1.5deg) scale(0.78);
          transform-origin: center center;
        }

        .browser-bar {
          display: none;
        }

        .browser-dots {
          display: none;
        }

        .browser-dot {
          display: none;
        }

        .browser-content {
          width: 100%;
          background: transparent;
        }

        .browser-content img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: contain;
          object-position: top center;
          filter: none;
        }

        /* ===== HERO RESPONSIVE ===== */
        @media (max-width: 1024px) {
          .hero-section {
            padding-top: 68px;
            padding-bottom: 210px;
          }
          .hero-inner {
            max-width: 800px;
            padding: 0 30px;
          }
          .hero-heading {
            font-size: clamp(32px, 5vw, 48px);
          }
          .showcase-container {
            margin-top: 50px;
            margin-bottom: -130px;
          }
          .browser-frame {
            width: calc(100% - 48px);
            max-width: 92vw;
          }
        }

        @media (max-width: 768px) {
          .hero-section {
            padding-top: 56px;
            padding-bottom: 72px;
          }
          .hero-heading {
            font-size: clamp(30px, 7vw, 36px);
          }
          .hero-subheading {
            font-size: 16px;
          }
          .hero-btn-primary {
            height: 48px;
            padding: 0 32px;
            font-size: 16px;
            margin-top: 24px;
          }
          .showcase-container {
            margin-top: 36px;
            margin-bottom: 0;
            padding: 0 12px;
          }
          .browser-frame {
            border-radius: 18px;
            width: calc(100% - 24px);
            transform: none;
          }
          .browser-bar {
            height: 34px;
            padding: 0 14px;
          }
          .browser-dot {
            width: 8px;
            height: 8px;
          }
        }

        /* ===== PRESERVED STYLES BELOW ===== */

        .insight-panel {
          background: #fff;
          border: 1px solid rgba(226, 232, 240, 0.95);
          border-radius: var(--mp-radius-lg);
          padding: clamp(20px, 4vw, 28px) clamp(20px, 4vw, 32px);
          box-shadow: 0 4px 28px -12px rgba(15, 23, 42, 0.08);
          margin-bottom: 24px;
        }

        .insight-accent-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 16px 24px;
          margin-top: 8px;
        }

        .insight-accent-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          background: rgba(248, 250, 252, 0.9);
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-family: 'Cairo', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #334155;
        }

        .checklist-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          text-align: right;
          margin-bottom: 14px;
        }

        .checklist-item:last-child {
          margin-bottom: 0;
        }

        .checklist-dot {
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(37, 99, 235, 0.12);
          color: var(--mp-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }

        .audience-card {
          background: #fff;
          border-radius: var(--mp-radius-lg);
          padding: clamp(24px, 4vw, 32px);
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 4px 24px -8px rgba(15, 23, 42, 0.08);
          text-align: right;
          height: 100%;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .audience-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px -12px rgba(37, 99, 235, 0.15);
        }

        .platform-icons {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 20px 28px;
          margin-top: 28px;
        }

        .platform-icon-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          min-width: 72px;
        }

        .rotating-text-wrapper {
          display: inline-block;
          height: 1.2em;
          overflow: hidden;
          vertical-align: bottom;
          width: auto;
          min-width: 260px;
        }

        .rotating-text-container {
          display: block;
          height: 1.2em;
          overflow: hidden;
        }

        .rotating-item {
          display: block;
          height: 1.2em;
          line-height: 1.2em;
          color: #2563EB;
          animation: rotateText 9s infinite cubic-bezier(0.1, 0, 0.2, 1);
          white-space: nowrap;
        }

        @keyframes rotateText {
          0%, 25% { transform: translateY(0); opacity: 1; }
          33%, 58% { transform: translateY(-100%); opacity: 1; }
          66%, 91% { transform: translateY(-200%); opacity: 1; }
          100% { transform: translateY(-300%); opacity: 0; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }

        .glass-card {
          background: white;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .feature-card {
          background: white;
          border: 1px solid rgba(226, 232, 240, 0.95);
          border-radius: var(--mp-radius);
          padding: 32px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: right;
          box-shadow: 0 4px 24px -10px rgba(15, 23, 42, 0.08);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          height: 100%;
        }

        .feature-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 40px -14px rgba(37, 99, 235, 0.12);
        }
        
        .number-circle {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%);
          color: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 20px;
          flex-shrink: 0;
          box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
        }
        


        .feature-details-link {
          margin-top: auto;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 14px;
          color: #0f172a;
          cursor: pointer;
          align-self: flex-end; /* Push to right/end */
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #60A5FA 0%, #22d3ee 100%); /* Brighter Blue-Cyan Gradient */
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: inline-block;
          font-weight: 900;
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
        
        .bento-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }

        @media (min-width: 1024px) {
          .bento-grid {
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(2, minmax(240px, auto));
          }
          
          .bento-card-tall {
            grid-row: span 2;
          }
          
          .bento-card-wide {
            grid-column: span 2;
          }
        }
        
        .bento-card {
          background: white;
          border-radius: var(--mp-radius-lg);
          padding: 24px;
          border: 1px solid rgba(238, 242, 246, 0.95);
          box-shadow: 0 4px 28px -10px rgba(15, 23, 42, 0.07);
          display: flex;
          flex-direction: column;
          height: 100%;
          transition: box-shadow 0.25s ease;
        }

        .bento-card:hover {
          box-shadow: 0 12px 40px -12px rgba(15, 23, 42, 0.1);
        }

        .bento-title {
          font-family: 'Cairo', sans-serif;
          font-weight: 800;
          color: var(--mp-ink);
        }

        .bento-desc {
          font-family: 'Cairo', sans-serif;
          color: var(--mp-muted);
          line-height: 1.7;
          font-size: 14px;
        }
        
        /* Tablet breakpoint - hero handled in hero responsive block */

        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          
          .header-actions {
            display: none !important;
          }

          .mobile-menu-btn {
            display: block !important;
          }

          /* hero mobile handled in hero responsive block */

          .rotating-text-wrapper {
            min-width: 200px;
          }

          .feature-card {
            padding: 24px;
            text-align: center;
            align-items: center;
          }
          
          .bento-card {
            padding: 24px;
            height: auto;
            min-height: 200px;
          }

          .bento-inner-content {
            display: flex;
            flex-direction: column !important;
            gap: 20px;
            width: 100%;
          }

          .bento-text-content {
            max-width: 100% !important;
            text-align: center;
          }

          .bento-visual-wrapper {
            width: 100% !important;
            min-height: 120px;
            margin-top: 10px;
          }

          .bento-icon-badge {
            margin: 0 auto 12px !important;
          }
          
          .checklist-grid {
            grid-template-columns: 1fr;
          }

          .pricing-header-row,
          .pricing-header-row ~ div {
            min-width: 900px;
          }
        }

        @media (max-width: 1024px) {
          #pricing > div:nth-child(2) > div:first-child {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
        
        .bento-inner-content {
          display: flex;
          width: 100%;
        }

        .mobile-menu-overlay {
          position: fixed;
          inset: 0;
          background: #ffffff;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 24px;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          opacity: 0;
          visibility: hidden;
          transform: translateY(-20px);
        }
        
        .mobile-menu-overlay.open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        /* ===== PREMIUM CTA SECTION ===== */
        .cta-section {
          position: relative;
          background: linear-gradient(135deg, #063BCE 0%, #0758F7 50%, #0347D9 100%);
          padding: 56px 24px;
          text-align: center;
          direction: rtl;
          overflow: hidden;
        }

        .cta-decoration-circle-right {
          display: none;
        }

        .cta-decoration-circle-top-left {
          display: none;
        }

        .cta-content {
          position: relative;
          z-index: 2;
          max-width: 850px;
          margin: 0 auto;
        }

        .cta-headline {
          font-family: 'Cairo', sans-serif;
          font-size: clamp(28px, 3.5vw, 42px);
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.2;
          margin: 0 0 24px;
        }

        .cta-subtitle {
          font-family: 'Cairo', sans-serif;
          font-size: clamp(14px, 1.2vw, 17px);
          color: rgba(255, 255, 255, 0.86);
          line-height: 1.9;
          max-width: 720px;
          margin: 0 auto 38px;
          font-weight: 500;
        }

        .cta-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 58px;
          padding: 0 48px;
          background: #FFFFFF;
          color: #0758F7;
          font-family: 'Cairo', sans-serif;
          font-size: 18px;
          font-weight: 800;
          border: 2px solid #FFFFFF;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.18);
        }

        .cta-trust-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 40px;
          margin-top: 34px;
          flex-wrap: wrap;
        }

        .cta-trust-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.92);
          font-family: 'Cairo', sans-serif;
          font-size: 15px;
          font-weight: 600;
        }

        .cta-trust-icon {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .cta-section {
            padding: 64px 20px;
          }
          .cta-headline {
            font-size: 34px;
          }
          .cta-subtitle {
            font-size: 16px;
          }
          .cta-button {
            width: 100%;
            max-width: 320px;
          }
          .cta-trust-row {
            gap: 20px;
          }
          .cta-decoration-circle-right {
            width: 300px;
            height: 300px;
            border-width: 50px;
            opacity: 0.5;
          }
          .cta-decoration-circle-top-left {
            width: 140px;
            height: 140px;
            border-width: 28px;
            opacity: 0.5;
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
          height: '72px',
          background: '#ffffff',
          borderBottom: '1px solid #E2E8F0',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
              
              {/* Logo (Far Right in RTL) */}
              <Link href="/">
                <a style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: '12px', flex: 1, justifyContent: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", fontSize: '20px', fontWeight: '700', color: '#1E3A8A', lineHeight: '1.2', whiteSpace: 'nowrap' }}>محامي برو</span>
                    <span style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", fontSize: '13px', fontWeight: '500', color: '#3B82F6', letterSpacing: '0.2px', whiteSpace: 'nowrap' }}>Mohami Pro</span>
                  </div>
                  <Logo height="48px" iconOnly={true} />
                </a>
              </Link>

              {/* Desktop Navigation (Center) */}
              <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '32px', flex: 1, justifyContent: 'center' }}>
                <Link href="/features">
                  <a style={{ fontFamily: "'Cairo', sans-serif", fontSize: '16px', fontWeight: 'bold', color: '#334155', textDecoration: 'none' }}>
                    المميزات
                  </a>
                </Link>
                <Link href="/pricing">
                  <a style={{ fontFamily: "'Cairo', sans-serif", fontSize: '16px', fontWeight: 'bold', color: '#334155', textDecoration: 'none' }}>
                    الأسعار
                  </a>
                </Link>
                <button
                  type="button"
                  onClick={() => scrollToId('contact')}
                  style={{
                    fontFamily: "'Cairo', sans-serif",
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#334155',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer'
                  }}
                >
                  تواصل معنا
                </button>
              </nav>

              {/* Header Actions (Far Left in RTL) */}
              <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-end' }}>
                <button onClick={handleLogin} style={{
                  fontFamily: "'Cairo', sans-serif",
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#334155',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}>
                  تسجيل الدخول
                </button>
                <button onClick={handleGetStarted} className="btn-primary" style={{
                  color: 'white',
                  background: 'var(--mp-primary, #2563EB)',
                  padding: '10px 22px',
                  borderRadius: '9999px',
                  fontFamily: "'Cairo', sans-serif",
                  fontSize: '14px',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: 'pointer'
                }}>
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

        {/* Mobile Menu Overlay - Outside header for proper full-screen rendering */}
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
            <Link href="/features">
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
            <Link href="/pricing">
              <a
                style={{
                  fontFamily: "'Cairo', sans-serif",
                  fontSize: '22px',
                  fontWeight: '700',
                  color: '#0f172a',
                  textDecoration: 'none',
                  padding: '12px 24px'
                }}
              >
                الأسعار
              </a>
            </Link>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                setTimeout(() => {
                  const el = document.getElementById('contact');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
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
            <a
              href="#insight"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                setTimeout(() => scrollToId('insight'), 100);
              }}
              style={{
                fontFamily: "'Cairo', sans-serif",
                fontSize: '18px',
                fontWeight: '700',
                color: '#2563eb',
                textDecoration: 'none',
                padding: '8px 24px'
              }}
            >
              لماذا محامي برو؟
            </a>

            {/* Divider */}
            <div style={{ width: '60%', height: '1px', background: '#e2e8f0', margin: '10px 0' }}></div>

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '70%' }}>
              <button
                onClick={() => { setMobileMenuOpen(false); handleLogin(); }}
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
                onClick={() => { setMobileMenuOpen(false); handleGetStarted(); }}
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

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-bg-decoration" aria-hidden="true">
            <div className="hero-bg-arc-1" />
            <div className="hero-bg-arc-2" />
            <div className="hero-bg-arc-3" />
          </div>

          <div className="hero-inner">
            <h1 className="hero-heading">
              برنامج قانوني متكامل يركّز على جودة وتنظيم العمل القانوني في العراق
            </h1>

            <p className="hero-subheading">
              محامي برو منصة رقمية لإدارة مكاتب المحاماة والشؤون القانونية، تمنحك رؤية واضحة وشاملة على القضايا والجلسات والموكلين ومسار العمل داخل المكتب، وتساعدك على تنظيم فريقك ومتابعة المهام بكفاءة واحترافية.
            </p>

            <div className="hero-buttons">
              <button type="button" onClick={handleGetStarted} className="hero-btn-primary">
                ابدأ إدارة مكتبك الآن
              </button>
              <button type="button" onClick={() => router.push('/features')} className="hero-btn-secondary">
                لماذا صُمم محامي برو للمحامين؟
              </button>
            </div>

            <div className="showcase-container">
              <div className="browser-frame">
                <div className="browser-bar">
                  <div className="browser-dots">
                    <span className="browser-dot browser-dot-red" />
                    <span className="browser-dot browser-dot-yellow" />
                    <span className="browser-dot browser-dot-green" />
                  </div>
                </div>
                <div className="browser-content">
                  <img
                    src="/dashboard.png"
                    alt="لوحة التحكم"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div style={{
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    aspectRatio: '16/9',
                    background: '#f8fafc',
                    color: '#94a3b8',
                    fontFamily: "'Cairo', sans-serif",
                    fontSize: '18px',
                    fontWeight: '700'
                  }}>
                    صورة لوحة التحكم (/dashboard.png)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Insight — visibility & governance (single column + checklist card) */}
        <section id="insight" style={{ padding: '60px 0 44px', background: '#F8FBFF' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'right', direction: 'rtl' }}>
              <div style={{
                background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                padding: '32px',
                borderRadius: '16px',
                marginBottom: '24px'
              }}>
                <h2 style={{
                  fontFamily: "'Cairo', sans-serif",
                  fontSize: 'clamp(24px, 3.2vw, 36px)',
                  fontWeight: '900',
                  color: '#0f172a',
                  lineHeight: '1.3',
                  marginBottom: '12px'
                }}>
                  هل لديك صورة كاملة عما يجري في مكتبك القانوني؟
                </h2>
                <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: 'clamp(16px, 1.5vw, 18px)', color: '#475569', lineHeight: '1.85', marginBottom: '20px', fontWeight: '500' }}>
                  إدارة العمل القانوني لم تعد مجرد متابعة مواعيد وملفات، بل أصبحت منظومة تحتاج إلى وضوح، توثيق، وحوكمة ذكية. محامي برو يساعدك على معرفة ما يجري داخل مكتبك بدقة، من القضايا والجلسات إلى المهام والقرارات، مع حماية بياناتك وتنظيم مسار العمل.
                </p>
                <div className="insight-panel" style={{ maxWidth: '100%', margin: '0', background: 'transparent', border: 'none', boxShadow: 'none', padding: '0' }}>
                  {[
                    'رؤية واضحة لكل إجراء وقرار داخل المكتب',
                    'حماية موثوقة للبيانات والمعلومات الحساسة',
                    'توثيق شامل لمسار العمل والمراجعة',
                    'استخدام ذكي وآمن للأدوات الرقمية والذكاء الاصطناعي'
                  ].map((line) => (
                    <div key={line} className="checklist-item">
                      <span className="checklist-dot" aria-hidden>
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: '16px', color: '#334155', fontWeight: '600', lineHeight: '1.55' }}>{line}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleGetStarted}
                  style={{
                    fontFamily: "'Cairo', sans-serif",
                    fontSize: '16px',
                    fontWeight: '800',
                    background: '#2563EB',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '14px 32px',
                    cursor: 'pointer',
                    marginTop: '20px'
                  }}
                >
                  ابدأ تجربتك المجانية
                </button>
              </div>
            </div>

            <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center' }}>
            </div>
          </div>
        </section>



        {/* Audience */}
        <section id="audience" style={{ padding: 'clamp(36px, 5vw, 56px) 0', background: 'var(--mp-surface, #f4f8fb)' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
            <div style={{ textAlign: 'center', maxWidth: '760px', margin: '0 auto 32px', direction: 'rtl' }}>
              <h2 style={{ fontFamily: "'Cairo', sans-serif", fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: '900', color: '#0f172a', marginBottom: '12px', lineHeight: '1.25' }}>
                من يحتاج محامي برو؟
              </h2>
              <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: 'clamp(16px, 1.5vw, 17px)', color: '#64748b', fontWeight: '500', lineHeight: '1.8' }}>
                محامي برو مناسب لأي منظمة في العراق تتعامل مع أعمال قانونية يومية وترغب في إدارتها بكفاءة واحترافية.
              </p>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              direction: 'rtl'
            }}>
              <div className="audience-card">
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', marginBottom: '16px' }}>
                  <Briefcase size={22} />
                </div>
                <h3 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
                  مكاتب المحاماة والمحامون المستقلون
                </h3>
                <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: '15px', color: '#64748b', lineHeight: '1.8', fontWeight: '500' }}>
                  تنظيم القضايا والموكلين عبر الفروع أو الفرق داخل المكتب، مع توزيع المهام ومتابعة الأداء من لوحة واحدة تمنحك وضوحاً وتحكماً أقرب إلى واقع الدعاوى والجلسات في العراق.
                </p>
              </div>
              <div className="audience-card">
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891b2', marginBottom: '16px' }}>
                  <Scale size={22} />
                </div>
                <h3 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
                  إدارات الشؤون القانونية في الشركات الخاصة وشركات التأمين
                </h3>
                <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: '15px', color: '#64748b', lineHeight: '1.8', fontWeight: '500' }}>
                  تمركز العمليات القانونية وإدارة العقود والنزاعات ومتابعة الامتثال، مع رؤية مشتركة بين الإدارات عبر سير عمل آمن ومنظم يقلل من فقدان المعلومة بين الأقسام.
                </p>
              </div>
              <div className="audience-card">
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(30,58,138,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e3a8a', marginBottom: '16px' }}>
                  <Users size={22} />
                </div>
                <h3 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
                  الإدارات القانونية في الجهات الحكومية والمؤسسات العامة
                </h3>
                <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: '15px', color: '#64748b', lineHeight: '1.8', fontWeight: '500' }}>
                  إدارة القضايا والمستندات القانونية بمعايير حوكمة أوضح، ودعم الامتثال التنظيمي، مع عمليات أمنية قابلة للتدقيق وتتماشى مع متطلبات القطاع العام في العراق.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" style={{ padding: '40px 0 28px 0', background: 'var(--mp-surface, #f4f8fb)' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>

            {/* Features Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>

              {/* Feature 1: Dashboard */}
              <div className="feature-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', width: '100%' }}>
                  <div className="number-circle"><LayoutDashboard size={26} color="#ffffff" strokeWidth={2.5} /></div>
                  <h3 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    لوحة قيادة تفاعلية
                  </h3>
                </div>
                <div style={{ width: '100%', height: '3px', background: 'linear-gradient(90deg, #2563EB 0%, transparent 100%)', marginBottom: '16px', borderRadius: '2px' }}></div>
                <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: '16px', color: '#475569', lineHeight: '1.8', fontWeight: '500' }}>
                  احصل على رؤية بانورامية فورية لعمل مكتبك. تابع مستجدات الدعاوى ومواعيد المرافعات اليومية عبر رسوم بيانية تفاعلية تدعم اتخاذ قراراتك الإستراتيجية.
                </p>
              </div>

              {/* Feature 2: Case Management */}
              <div className="feature-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', width: '100%' }}>
                  <div className="number-circle"><Briefcase size={26} color="#ffffff" strokeWidth={2.5} /></div>
                  <h3 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    إدارة رقمية للدعاوى
                  </h3>
                </div>
                <div style={{ width: '100%', height: '3px', background: 'linear-gradient(90deg, #2563EB 0%, transparent 100%)', marginBottom: '16px', borderRadius: '2px' }}></div>
                <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: '16px', color: '#475569', lineHeight: '1.8', fontWeight: '500' }}>
                  تخلص من فوضى الأضابير الورقية بفضل أرشيف متكامل يرافق دعواك من القيد وحتى التمييز، مع فلترة ذكية تضع أدق المستندات بين يديك بلمح البصر.
                </p>
              </div>

              {/* Feature 3: Legal Calendar */}
              <div className="feature-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', width: '100%' }}>
                  <div className="number-circle"><CalendarClock size={26} color="#ffffff" strokeWidth={2.5} /></div>
                  <h3 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    تقويم قانوني استباقي
                  </h3>
                </div>
                <div style={{ width: '100%', height: '3px', background: 'linear-gradient(90deg, #2563EB 0%, transparent 100%)', marginBottom: '16px', borderRadius: '2px' }}></div>
                <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: '16px', color: '#475569', lineHeight: '1.8', fontWeight: '500' }}>
                  لن تفوتك أي مرافعة. التقويم الذكي ونظام الإشعارات يواكب جلسات المحاكم وتواريخ الطعون آلياً ليضمن التزامك بالمدد القانونية الدقيقة دون عناء.
                </p>
              </div>

              {/* Feature 4: Client Management */}
              <div className="feature-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', width: '100%' }}>
                  <div className="number-circle"><Users size={26} color="#ffffff" strokeWidth={2.5} /></div>
                  <h3 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    ملفات شاملة للموكلين
                  </h3>
                </div>
                <div style={{ width: '100%', height: '3px', background: 'linear-gradient(90deg, #2563EB 0%, transparent 100%)', marginBottom: '16px', borderRadius: '2px' }}></div>
                <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: '16px', color: '#475569', lineHeight: '1.8', fontWeight: '500' }}>
                  ارتقِ بخدمة موكليك عبر ملف رقمي مخصص لكل منهم. بيانات، مستندات، وتاريخ قانوني منظّم فوراً لتقديم استشارات تعزز من احترافية مكتبك وثقتهم.
                </p>
              </div>

              {/* Feature 5: Task Management */}
              <div className="feature-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', width: '100%' }}>
                  <div className="number-circle"><ListTodo size={26} color="#ffffff" strokeWidth={2.5} /></div>
                  <h3 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    تنظيم احترافي للمهام
                  </h3>
                </div>
                <div style={{ width: '100%', height: '3px', background: 'linear-gradient(90deg, #2563EB 0%, transparent 100%)', marginBottom: '16px', borderRadius: '2px' }}></div>
                <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: '16px', color: '#475569', lineHeight: '1.8', fontWeight: '500' }}>
                  حوّل مكتبك لخلية عمل إبداعية. وزّع المهام على فريقك، حدد الأولويات ومواعيد الإنجاز بدقة عالية لضمان استمرارية سير العمليات اليومية بكفاءة تامة.
                </p>
              </div>

              {/* Feature 6: Financial Management */}
              <div className="feature-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', width: '100%' }}>
                  <div className="number-circle"><Calculator size={26} color="#ffffff" strokeWidth={2.5} /></div>
                  <h3 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    نظام مالي متكامل
                  </h3>
                </div>
                <div style={{ width: '100%', height: '3px', background: 'linear-gradient(90deg, #2563EB 0%, transparent 100%)', marginBottom: '16px', borderRadius: '2px' }}></div>
                <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: '16px', color: '#475569', lineHeight: '1.8', fontWeight: '500' }}>
                  سيطرة تامة على أتعابك ومصروفاتك. تتبع الدفعات المحصلة والمتبقية من خلال تقارير دورية تضمن لك إدارة مالية شفافة وواضحة ترعى حقوقك كاملةً.
                </p>
              </div>

              {/* Feature 7: Legal Resources */}
              <div className="feature-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', width: '100%' }}>
                  <div className="number-circle"><BookOpen size={26} color="#ffffff" strokeWidth={2.5} /></div>
                  <h3 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    صياغة سريعة للعرائض
                  </h3>
                </div>
                <div style={{ width: '100%', height: '3px', background: 'linear-gradient(90deg, #2563EB 0%, transparent 100%)', marginBottom: '16px', borderRadius: '2px' }}></div>
                <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: '16px', color: '#475569', lineHeight: '1.8', fontWeight: '500' }}>
                  ضاعف إنتاجيتك بوقت قياسي. صغ العقود واللوائح بضغطة زر معتمداً على مكتبة من القوالب التفاعلية والوصول الفوري للتشريعات العراقية الأساسية الدقيقة.
                </p>
              </div>

              {/* Feature 8: Security */}
              <div className="feature-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', width: '100%' }}>
                  <div className="number-circle"><ShieldCheck size={26} color="#ffffff" strokeWidth={2.5} /></div>
                  <h3 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    أمان وتشفير متقدم
                  </h3>
                </div>
                <div style={{ width: '100%', height: '3px', background: 'linear-gradient(90deg, #2563EB 0%, transparent 100%)', marginBottom: '16px', borderRadius: '2px' }}></div>
                <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: '16px', color: '#475569', lineHeight: '1.8', fontWeight: '500' }}>
                  أسرار موكليك في حصن منيع. نظام مشفر بصلاحيات وصول صارمة ومزود بنسخ احتياطية سحابية تضمن لك حماية كاملة من المخاطر أو احتمالية التلف والضياع.
                </p>
              </div>
            </div>
          </div>
        </section >

        {/* Pricing Section moved to /pricing.js */}

        {/* Premium CTA Section */}
        <section className="cta-section">
          <div className="cta-decoration-circle-right"></div>
          <div className="cta-decoration-circle-top-left"></div>
          
          <div className="cta-content">
            <h2 className="cta-headline">هل أنت مستعد للبدء؟</h2>
            <p className="cta-subtitle">
              ابدأ بتنظيم عملك القانوني مع محامي برو، واكتشف كيف يمكن لمنصة واحدة أن تجعل إدارة مكتبك أكثر وضوحاً وسهولة.
            </p>
            <button type="button" onClick={handleGetStarted} className="cta-button">
              ابدأ تجربتك المجانية
            </button>
            <div className="cta-trust-row">
              <div className="cta-trust-item">
                <div className="cta-trust-icon">
                  <Check size={16} strokeWidth={3} />
                </div>
                <span>تجربة مجانية</span>
              </div>
              <div className="cta-trust-item">
                <div className="cta-trust-icon">
                  <Check size={16} strokeWidth={3} />
                </div>
                <span>لا تحتاج بطاقة ائتمان</span>
              </div>
              <div className="cta-trust-item">
                <div className="cta-trust-icon">
                  <Check size={16} strokeWidth={3} />
                </div>
                <span>إعداد سريع</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          background: '#1e293b',
          color: '#cbd5e1',
          paddingTop: '64px',
          paddingBottom: '32px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative Gradient Background */}
          <div style={{
            position: 'absolute',
            top: '-150px',
            right: '-150px',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}></div>

          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 48px', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '48px', marginBottom: '64px' }}>
              {/* Brand Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
                    <span style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", fontSize: '24px', fontWeight: '800', color: '#ffffff', lineHeight: '1.1' }}>محامي برو</span>
                    <span style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", fontSize: '13px', fontWeight: '600', color: '#3B82F6', letterSpacing: '0.5px' }}>Mohami Pro</span>
                  </div>
                  <div style={{ background: 'white', padding: '6px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Logo height="45px" iconOnly={true} />
                  </div>
                </div>
                <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: '15px', lineHeight: '1.8', color: '#94a3b8', maxWidth: '300px' }}>
                  نظام إدارة مكاتب المحاماة المتكامل والشامل في العراق. حلول ذكية لتنظيم القضايا والارتقاء بالممارسة القانونية.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <a href="https://www.facebook.com/profile.php?id=61588419684565" target="_blank" rel="noopener noreferrer" style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', textDecoration: 'none', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} onMouseOver={(e) => { e.currentTarget.style.background = '#1877F2'; e.currentTarget.style.borderColor = '#1877F2'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                    <Facebook size={20} />
                  </a>
                  <a href="https://www.linkedin.com/company/mohami-pro/?viewAsMember=true" target="_blank" rel="noopener noreferrer" style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', textDecoration: 'none', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} onMouseOver={(e) => { e.currentTarget.style.background = '#0077B5'; e.currentTarget.style.borderColor = '#0077B5'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                    <Linkedin size={20} />
                  </a>
                  <a href="https://t.me/+7bB9KEMXn3w2OGJi" target="_blank" rel="noopener noreferrer" style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', textDecoration: 'none', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} onMouseOver={(e) => { e.currentTarget.style.background = '#229ED9'; e.currentTarget.style.borderColor = '#229ED9'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                    <Send size={20} />
                  </a>
                  <a href="mailto:info@mohamipro.com" style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', textDecoration: 'none', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} onMouseOver={(e) => { e.currentTarget.style.background = '#3B82F6'; e.currentTarget.style.borderColor = '#3B82F6'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                    <Mail size={20} />
                  </a>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h4 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '18px', fontWeight: 'bold', color: '#ffffff', marginBottom: '24px' }}>روابط سريعة</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '15px' }}>
                  <Link href="/features"><a style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#3B82F6'} onMouseOut={(e) => e.target.style.color = '#94a3b8'}>المميزات</a></Link>
                  <a href="#" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#3B82F6'} onMouseOut={(e) => e.target.style.color = '#94a3b8'}>المدونة</a>
                  <a href="/pricing" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#3B82F6'} onMouseOut={(e) => e.target.style.color = '#94a3b8'}>الأسعار</a>
                  <a href="/privacy_policy.html" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#3B82F6'} onMouseOut={(e) => e.target.style.color = '#94a3b8'}>سياسة الخصوصية</a>
                </div>
              </div>

              {/* Contact */}
              <div id="contact">
                <h4 style={{ fontFamily: "'Cairo', sans-serif", fontSize: '18px', fontWeight: 'bold', color: '#ffffff', marginBottom: '24px' }}>تواصل معنا</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6', border: '1px solid rgba(37, 99, 235, 0.1)' }}>
                      <Mail size={20} />
                    </div>
                    <a href="mailto:info@mohamipro.com" style={{ color: '#94a3b8', textDecoration: 'none', direction: 'ltr', fontSize: '16px', fontWeight: '500' }}>info@mohamipro.com</a>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06B6D4', border: '1px solid rgba(6, 182, 212, 0.1)' }}>
                      <Phone size={20} />
                    </div>
                    <span style={{ color: '#94a3b8', direction: 'ltr', fontSize: '16px', fontWeight: '500' }}>+964 750 662 6622</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Bottom */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <p style={{ fontFamily: "'Cairo', sans-serif", fontSize: '14px', color: '#64748b' }}>&copy; 2026 محامي برو. جميع الحقوق محفوظة.</p>
            </div>
          </div>
        </footer>
      </div >
    </>
  );
};

export default LandingPage;
