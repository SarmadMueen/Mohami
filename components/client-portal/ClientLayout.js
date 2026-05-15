import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '../../lib/initSupabase';
import { useClientPortal } from '../../context/ClientPortalContext';
import Logo from '../Logo';
import {
  Home,
  Briefcase,
  Calendar,
  DollarSign,
  FileText,
  MessageCircle,
  User,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';

const ClientLayout = ({ children }) => {
  const router = useRouter();
  const { clientInfo, unreadMessages, unreadNotifications, notifications } = useClientPortal();
  const [mounted, setMounted] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/client-portal/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { href: '/client-portal/dashboard', label: 'الرئيسية', icon: Home },
    { href: '/client-portal/cases', label: 'قضاياي', icon: Briefcase },
    { href: '/client-portal/sessions', label: 'جلساتي', icon: Calendar },
    { href: '/client-portal/financials', label: 'الحسابات', icon: DollarSign },
    { href: '/client-portal/documents', label: 'المستندات', icon: FileText },
    { href: '/client-portal/messages', label: 'الرسائل', icon: MessageCircle, badge: unreadMessages },
    { href: '/client-portal/profile', label: 'ملفي', icon: User },
  ];

  const mobileNavItems = navItems.slice(0, 4); // First 4 items for bottom nav
  const mobileMoreItems = navItems.slice(4); // Rest in "More" menu

  const isActive = (href) => {
    if (href === '/client-portal/dashboard') {
      return router.pathname === '/client-portal/dashboard' || router.pathname === '/client-portal';
    }
    return router.pathname.startsWith(href);
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} يوم`;
  };

  if (!mounted) return null;

  return (
    <div className="client-portal-layout" dir="rtl">
      <Head>
        <title>بوابة الموكل - محامي برو</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Almarai:wght@300;400;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* ===== TOP HEADER ===== */}
      <header className="cp-header">
        <nav className="cp-main-nav">
          {/* Right: Logo & Brand */}
          <div className="cp-nav-left-section">
            <Link href="/client-portal/dashboard">
              <a className="cp-brand-link">
                <div className="cp-brand-text">
                  <span className="cp-brand-name">بوابة الموكل</span>
                  <span className="cp-brand-sub">Mohami Pro</span>
                </div>
                <div className="cp-logo-icon">
                  <Logo height="50px" iconOnly={true} />
                </div>
              </a>
            </Link>
          </div>

          {/* Center: Navigation Links */}
          <div className="cp-nav-links">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link href={item.href} key={item.href}>
                  <a className={`cp-nav-link ${isActive(item.href) ? 'active' : ''}`}>
                    <div className="cp-nav-icon-container">
                      <Icon size={20} />
                      {item.badge > 0 && (
                        <span className="cp-nav-badge">{item.badge > 9 ? '+9' : item.badge}</span>
                      )}
                    </div>
                    <span className="cp-nav-label">{item.label}</span>
                  </a>
                </Link>
              );
            })}
          </div>

          {/* Left: Actions */}
          <div className="cp-nav-right-section">
            {/* Notifications */}
            <div className="cp-notification-wrapper" ref={notificationsRef}>
              <button
                className={`cp-notifications-btn ${isNotificationsOpen ? 'active' : ''}`}
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              >
                <div className="cp-nav-icon-container">
                  <Bell size={20} />
                  {unreadNotifications > 0 && (
                    <span className="cp-notification-badge">{unreadNotifications > 9 ? '+9' : unreadNotifications}</span>
                  )}
                </div>
                <span className="cp-nav-label">الإشعارات</span>
              </button>

              {isNotificationsOpen && (
                <div className="cp-dropdown cp-notifications-dropdown">
                  <div className="cp-dropdown-header">
                    <h4>الإشعارات</h4>
                    {unreadNotifications > 0 && (
                      <span className="cp-unread-count">{unreadNotifications} جديد</span>
                    )}
                  </div>
                  <div className="cp-dropdown-body">
                    {notifications.length === 0 ? (
                      <div className="cp-empty-state">
                        <Bell size={24} strokeWidth={1.5} />
                        <p>لا توجد إشعارات</p>
                      </div>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <div key={n.id} className={`cp-notification-item ${!n.is_read ? 'unread' : ''}`}>
                          <p className="cp-notification-text">{n.message || n.title}</p>
                          <span className="cp-notification-time">{formatTimeAgo(n.created_at)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="cp-profile-wrapper" ref={profileRef}>
              <button
                className="cp-profile-btn"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <div className="cp-avatar">
                  {clientInfo?.client_name?.charAt(0) || 'م'}
                </div>
                <span className="cp-profile-name">{clientInfo?.client_name || 'الموكل'}</span>
                <ChevronDown size={14} />
              </button>

              {isProfileOpen && (
                <div className="cp-dropdown cp-profile-dropdown">
                  <Link href="/client-portal/profile">
                    <a className="cp-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                      <User size={18} />
                      <span>الملف الشخصي</span>
                    </a>
                  </Link>
                  <button className="cp-dropdown-item cp-logout-btn" onClick={handleLogout}>
                    <LogOut size={18} />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* ===== MOBILE TOP HEADER ===== */}
      <header className="cp-mobile-header">
        <div className="cp-mobile-header-inner">
          <Link href="/client-portal/dashboard">
            <a className="cp-mobile-brand">
              <Logo height="32px" iconOnly={true} />
              <span className="cp-mobile-brand-text">بوابة الموكل</span>
            </a>
          </Link>
          <div className="cp-mobile-actions">
            <button className="cp-icon-btn" onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}>
              <Bell size={20} />
              {unreadNotifications > 0 && (
                <span className="cp-icon-badge">{unreadNotifications > 9 ? '+9' : unreadNotifications}</span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Notifications Dropdown */}
        {isNotificationsOpen && (
          <div className="cp-mobile-notifications-dropdown" ref={notificationsRef}>
            <div className="cp-dropdown-header">
              <h4>الإشعارات</h4>
              <button className="cp-close-btn" onClick={() => setIsNotificationsOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="cp-dropdown-body">
              {notifications.length === 0 ? (
                <div className="cp-empty-state">
                  <Bell size={24} strokeWidth={1.5} />
                  <p>لا توجد إشعارات</p>
                </div>
              ) : (
                notifications.slice(0, 8).map((n) => (
                  <div key={n.id} className={`cp-notification-item ${!n.is_read ? 'unread' : ''}`}>
                    <p className="cp-notification-text">{n.message || n.title}</p>
                    <span className="cp-notification-time">{formatTimeAgo(n.created_at)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="cp-main">
        {children}
      </main>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="cp-bottom-nav">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link href={item.href} key={item.href}>
              <a className={`cp-bottom-item ${isActive(item.href) ? 'active' : ''}`}>
                <div className="cp-bottom-icon-wrap">
                  <Icon size={22} strokeWidth={isActive(item.href) ? 2.5 : 2} />
                  {item.badge > 0 && (
                    <span className="cp-bottom-badge">{item.badge > 9 ? '+9' : item.badge}</span>
                  )}
                </div>
                <span>{item.label}</span>
              </a>
            </Link>
          );
        })}
        <button
          className={`cp-bottom-item ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <MoreHorizontal size={22} />
          <span>المزيد</span>
        </button>
      </nav>

      {/* ===== MOBILE MORE MENU OVERLAY ===== */}
      {isMobileMenuOpen && (
        <div className="cp-mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="cp-mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="cp-mobile-menu-header">
              <div className="cp-avatar cp-avatar-lg">
                {clientInfo?.client_name?.charAt(0) || 'م'}
              </div>
              <h3>{clientInfo?.client_name || 'الموكل'}</h3>
            </div>
            {mobileMoreItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link href={item.href} key={item.href}>
                  <a
                    className={`cp-mobile-menu-item ${isActive(item.href) ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                    {item.badge > 0 && (
                      <span className="cp-nav-badge">{item.badge}</span>
                    )}
                  </a>
                </Link>
              );
            })}
            <button className="cp-mobile-menu-item cp-logout-btn" onClick={handleLogout}>
              <LogOut size={20} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        /* Hide scrollbars completely but allow scrolling */
        ::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        * {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
        body {
          overflow-x: hidden;
        }
      `}</style>
      <style jsx>{`
        /* ===== BASE LAYOUT ===== */
        .client-portal-layout {
          min-height: 100vh;
          background: #F1F5F9;
          font-family: 'Cairo', 'Almarai', sans-serif;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        /* ===== DESKTOP HEADER ===== */
        .cp-header {
          display: none;
          position: sticky;
          top: 0;
          z-index: 100;
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          width: 100%;
        }

        .cp-main-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 24px;
          background: transparent;
          width: 100%;
          direction: rtl;
          height: 72px;
          min-height: 72px;
          gap: 1rem;
        }

        .cp-nav-left-section {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
          min-width: 200px;
        }

        .cp-brand-link {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }

        .cp-brand-text {
          display: flex;
          flex-direction: column;
          text-align: center;
          white-space: nowrap;
        }

        .cp-brand-name {
          font-family: 'Cairo', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #1E3A8A;
          line-height: 1.2;
        }

        .cp-brand-sub {
          font-size: 12px;
          font-weight: 500;
          color: #3B82F6;
          letter-spacing: 0.5px;
        }

        .cp-logo-icon {
          width: auto;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* ===== NAV LINKS (Vertical style matching lawyer nav) ===== */
        .cp-nav-links {
          display: flex;
          gap: 0;
          align-items: center;
          direction: rtl;
          flex: 1;
          justify-content: flex-end;
          padding: 0 0.25rem;
        }

        .cp-nav-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 16px;
          text-decoration: none;
          background: transparent;
          cursor: pointer;
          min-height: 64px;
          min-width: 44px;
          font-family: 'Cairo', sans-serif;
          border-radius: 12px;
          position: relative;
          transition: all 0.2s ease;
        }

        .cp-nav-link:hover:not(.active) {
          background: #f8fafc;
          transform: translateY(-1px);
        }

        .cp-nav-link.active {
          background: #eff6ff;
          color: #1d4ed8;
          position: relative;
        }
        
        .cp-nav-link.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 3px;
          background: #3B82F6;
          border-radius: 2px;
        }

        .cp-nav-icon-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: transparent;
          position: relative;
          color: #1f2937;
        }

        .cp-nav-link.active .cp-nav-icon-container {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .cp-nav-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #1f2937;
          text-align: center;
          line-height: 1.2;
          font-family: 'Cairo', sans-serif;
        }

        .cp-nav-link.active .cp-nav-label {
          color: #1d4ed8;
          font-weight: 700;
        }

        .cp-nav-badge {
          position: absolute;
          top: -4px;
          right: -6px;
          background: #EF4444;
          color: white;
          font-size: 9px;
          font-weight: 700;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #ffffff;
        }

        /* ===== NAV RIGHT SECTION ===== */
        .cp-nav-right-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
          margin-left: 0.5rem;
          position: relative;
        }

        .cp-notifications-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 4px 12px;
          background: transparent;
          border: none;
          cursor: pointer;
          min-height: 60px;
          border-radius: 12px;
          font-family: 'Cairo', sans-serif;
          transition: none;
        }

        .cp-notifications-btn.active {
          background: #eff6ff;
        }

        .cp-notifications-btn.active .cp-nav-icon-container {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .cp-notifications-btn.active .cp-nav-label {
          color: #1d4ed8;
          font-weight: 700;
        }

        .cp-notification-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          background: #EF4444;
          color: white;
          font-size: 10px;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #ffffff;
        }

        /* ===== PROFILE BUTTON ===== */
        .cp-profile-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          font-family: 'Cairo', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #1a1a1a;
          transition: none;
        }

        .cp-profile-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .cp-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3B82F6, #1E3A8A);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          font-family: 'Cairo', sans-serif;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .cp-avatar-lg {
          width: 48px;
          height: 48px;
          font-size: 20px;
        }

        .cp-profile-name {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ===== DROPDOWNS ===== */
        .cp-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
          border: 1px solid #e2e8f0;
          z-index: 200;
          min-width: 300px;
          overflow: hidden;
          animation: dropdownFadeIn 0.2s ease;
        }

        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .cp-dropdown-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
        }

        .cp-dropdown-header h4 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }

        .cp-unread-count {
          font-size: 12px;
          font-weight: 600;
          color: #3B82F6;
          background: #EFF6FF;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .cp-dropdown-body {
          max-height: 320px;
          overflow-y: auto;
        }

        .cp-notification-item {
          padding: 12px 16px;
          border-bottom: 1px solid #f8fafc;
          transition: background 0.15s ease;
        }

        .cp-notification-item:hover {
          background: #f8fafc;
        }

        .cp-notification-item.unread {
          background: #EFF6FF;
          border-right: 3px solid #3B82F6;
        }

        .cp-notification-text {
          margin: 0;
          font-size: 13px;
          color: #1e293b;
          line-height: 1.5;
        }

        .cp-notification-time {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 4px;
          display: block;
        }

        .cp-empty-state {
          padding: 32px;
          text-align: center;
          color: #94a3b8;
        }

        .cp-empty-state p {
          margin: 8px 0 0;
          font-size: 14px;
        }

        .cp-notifications-dropdown {
          left: 0;
          right: auto;
        }

        .cp-profile-dropdown {
          left: 0;
          right: auto;
          min-width: 200px;
          padding: 4px;
        }

        .cp-notification-wrapper,
        .cp-profile-wrapper {
          position: relative;
        }

        .cp-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #334155;
          text-decoration: none;
          transition: all 0.15s ease;
          width: 100%;
          border: none;
          background: none;
          cursor: pointer;
          font-family: inherit;
        }

        .cp-dropdown-item:hover {
          background: #f1f5f9;
          color: #1E3A8A;
        }

        .cp-logout-btn {
          color: #EF4444;
        }

        .cp-logout-btn:hover {
          background: #FEF2F2;
          color: #DC2626;
        }

        .cp-close-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cp-close-btn:hover {
          background: #f1f5f9;
        }

        /* ===== MAIN CONTENT ===== */
        .cp-main {
          max-width: 1600px;
          margin: 0 auto;
          padding: 24px 32px 32px;
          min-height: calc(100vh - 72px);
          padding-bottom: max(32px, env(safe-area-inset-bottom));
        }

        /* ===== MOBILE HEADER ===== */
        .cp-mobile-header {
          display: none;
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255,255,255,0.98);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(226,232,240,0.8);
          padding-top: env(safe-area-inset-top);
        }

        .cp-mobile-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          min-height: 60px;
        }

        .cp-mobile-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }

        .cp-mobile-brand-text {
          font-family: 'Cairo', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #1E3A8A;
        }

        .cp-mobile-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .cp-icon-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          position: relative;
          transition: background 0.2s;
        }
        
        .cp-icon-btn:hover {
          background: #f1f5f9;
        }
        
        .cp-icon-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #EF4444;
          color: white;
          font-size: 10px;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #ffffff;
        }

        .cp-mobile-notifications-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          z-index: 200;
          max-height: 60vh;
          overflow-y: auto;
        }

        /* ===== MOBILE BOTTOM NAV ===== */
        .cp-bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(255,255,255,0.98);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(226,232,240,0.8);
          z-index: 100;
          padding: 8px 0;
          padding-bottom: max(8px, env(safe-area-inset-bottom));
        }

        .cp-bottom-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px 0;
          font-size: 11px;
          font-weight: 500;
          color: #94a3b8;
          text-decoration: none;
          border: none;
          background: none;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
          min-height: 48px;
          position: relative;
        }

        .cp-bottom-item.active {
          color: #3B82F6;
          font-weight: 700;
        }
        
        .cp-bottom-item.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 3px;
          background: #3B82F6;
          border-radius: 2px;
        }

        .cp-bottom-icon-wrap {
          position: relative;
        }

        .cp-bottom-badge {
          position: absolute;
          top: -4px;
          right: -8px;
          background: #EF4444;
          color: white;
          font-size: 8px;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 6px;
          min-width: 14px;
          text-align: center;
          line-height: 12px;
        }

        /* ===== MOBILE MORE MENU ===== */
        .cp-mobile-menu-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 200;
          display: flex;
          align-items: flex-end;
          animation: overlayFadeIn 0.2s ease;
        }

        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .cp-mobile-menu {
          width: 100%;
          background: white;
          border-radius: 24px 24px 0 0;
          padding: 24px 20px;
          padding-bottom: max(24px, calc(env(safe-area-inset-bottom) + 16px));
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          max-height: 70vh;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .cp-mobile-menu-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 16px;
          margin-bottom: 8px;
          border-bottom: 1px solid #f1f5f9;
        }

        .cp-mobile-menu-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
        }

        .cp-mobile-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 12px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 500;
          color: #334155;
          text-decoration: none;
          transition: all 0.2s ease;
          width: 100%;
          border: none;
          background: none;
          cursor: pointer;
          font-family: inherit;
          min-height: 48px;
        }

        .cp-mobile-menu-item:hover,
        .cp-mobile-menu-item.active {
          background: #f1f5f9;
          color: #1E3A8A;
        }

        /* ===== RESPONSIVE ===== */
        @media (min-width: 769px) {
          .cp-header {
            display: block;
          }
          .cp-mobile-header,
          .cp-bottom-nav {
            display: none !important;
          }
        }

        @media (max-width: 768px) {
          .cp-header {
            display: none !important;
          }
          .cp-mobile-header {
            display: block;
          }
          .cp-bottom-nav {
            display: flex;
          }
          .cp-main {
            padding: 16px 6px;
            padding-bottom: 65px;
            padding-bottom: calc(65px + env(safe-area-inset-bottom));
          }
        }

        @media (min-width: 769px) and (max-width: 1100px) {
          .cp-nav-label {
            display: none;
          }
          .cp-nav-link {
            padding: 4px 8px;
            min-height: 50px;
          }
          .cp-notifications-btn {
            min-height: 50px;
          }
          .cp-notifications-btn .cp-nav-label {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default ClientLayout;
