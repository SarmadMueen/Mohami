/**
 * Platform detection utility for Capacitor apps
 * Detects if running on native Android/iOS or web
 */

export const isNativeMobile = () => {
  if (typeof window === 'undefined') return false;

  // First try Capacitor platform detection
  const capacitor = window.Capacitor;
  const platform = capacitor?.getPlatform?.();
  
  console.warn('[Platform] Capacitor object:', capacitor);
  console.warn('[Platform] Platform value:', platform);

  if (platform === 'android' || platform === 'ios') {
    console.warn('[Platform] Detected native mobile via Capacitor platform');
    return true;
  }

  // Fallback: check user agent for mobile indicators
  const userAgent = navigator.userAgent || '';
  console.warn('[Platform] User agent:', userAgent);
  
  // Check for various mobile indicators
  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isWebView = /wv|WebView/i.test(userAgent);
  const hasCapacitor = userAgent.includes('Capacitor');
  
  console.warn('[Platform] isAndroid:', isAndroid);
  console.warn('[Platform] isIOS:', isIOS);
  console.warn('[Platform] isWebView:', isWebView);
  console.warn('[Platform] hasCapacitor:', hasCapacitor);
  
  // If it's a mobile device and likely a WebView, treat it as native mobile
  if ((isAndroid || isIOS) && (isWebView || hasCapacitor)) {
    console.warn('[Platform] Detected native mobile via user agent');
    return true;
  }
  
  console.warn('[Platform] Not detected as native mobile');
  return false;
};

export const isAndroid = () => {
  if (typeof window === 'undefined') return false;
  
  const capacitor = window.Capacitor;
  const platform = capacitor?.getPlatform?.();
  
  return platform === 'android';
};

export const isIOS = () => {
  if (typeof window === 'undefined') return false;
  
  const capacitor = window.Capacitor;
  const platform = capacitor?.getPlatform?.();
  
  return platform === 'ios';
};

export const isWeb = () => {
  if (typeof window === 'undefined') return true;
  
  const capacitor = window.Capacitor;
  const platform = capacitor?.getPlatform?.();
  
  return platform === 'web' || !platform;
};

export const getPlatform = () => {
  if (typeof window === 'undefined') return 'web';
  
  const capacitor = window.Capacitor;
  return capacitor?.getPlatform?.() || 'web';
};
