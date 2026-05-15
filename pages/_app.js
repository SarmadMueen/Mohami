import Head from 'next/head';
import PropTypes from 'prop-types'; // Import PropTypes
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import '../styles/globals.css';

import { SubscriptionProvider } from '../context/SubscriptionContext';
import { useBackButton } from '../hooks/useBackButton';
import { supabase } from '../lib/initSupabase';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  
  // Handle Android back button - only affects native apps, no effect on web
  useBackButton();

  useEffect(() => {
    // Canonical native-app startup guard: skip landing page, register, and marketing pages on native apps.
    const capacitor = typeof window !== 'undefined' ? window.Capacitor : null;
    const platform = capacitor?.getPlatform?.();
    const isNativeCapacitor = platform === 'android' || platform === 'ios';
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isAndroidWebView = /Android/i.test(ua) && (/wv/i.test(ua) || /Version\/[\d.]+/i.test(ua));

    // Block these routes on native apps - redirect to login
    const blockedNativeRoutes = ['/', '/register', '/features', '/pricing'];
    if ((isNativeCapacitor || isAndroidWebView) && blockedNativeRoutes.includes(router.pathname)) {
      router.replace('/login');
    }
  }, [router]);

  // Global check for disabled accounts
  useEffect(() => {
    const checkDisabledAccount = async (user) => {
      if (!user) return;

      // Skip check on public pages
      const publicPages = ['/', '/login', '/account-disabled', '/forgot-password'];
      if (publicPages.includes(router.pathname)) return;

      try {
        const { data, error } = await supabase
          .from('user_metadata')
          .select('is_disabled')
          .eq('user_id', user.id)
          .single();

        if (data && data.is_disabled) {
          await supabase.auth.signOut();
          router.push('/account-disabled');
        }
      } catch (err) {
        console.error('Error checking disabled status:', err);
      }
    };

    // Check on mount
    const session = supabase.auth.session();
    if (session) {
      checkDisabledAccount(session.user);
    }

    // Also check on auth state changes
    const { subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        checkDisabledAccount(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Run on mount

  useEffect(() => {
    // === Content Protection ===

    // Disable right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    // Block keyboard shortcuts: F12, Ctrl+U, Ctrl+S, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    const handleKeyDown = (e) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return;
      }
      // Ctrl+U (view source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return;
      }
      // Ctrl+S (save page)
      if (e.ctrlKey && !e.shiftKey && e.key === 's') {
        e.preventDefault();
        return;
      }
      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return;
      }
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return;
      }
      // Ctrl+Shift+C (Element inspector)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return;
      }
      // Ctrl+P (print) — block unless in-app print is triggered
      if (e.ctrlKey && e.key === 'p') {
        if (!window.__allowPrint) {
          e.preventDefault();
          return;
        }
      }
    };

    // Disable drag & drop
    const handleDragStart = (e) => {
      e.preventDefault();
    };

    // Override window.print to use flag + CSS class
    const originalPrint = window.print.bind(window);
    window.print = function () {
      window.__allowPrint = true;
      document.body.classList.add('allow-print');
      originalPrint();
      setTimeout(() => {
        window.__allowPrint = false;
        document.body.classList.remove('allow-print');
      }, 1000);
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragstart', handleDragStart);
      window.print = originalPrint;
    };
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <link rel="icon" href="/logo.png" />
      </Head>

      <SubscriptionProvider>
        <Component {...pageProps} />
      </SubscriptionProvider>
    </>
  );
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired, // Validate Component as elementType
  pageProps: PropTypes.object.isRequired, // Validate pageProps as an object
};

export default MyApp;
