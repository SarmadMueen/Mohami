export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

/**
 * Helper to construct full API URLs.
 * On web, returns relative paths to avoid CORS issues and use current session.
 * On mobile (Capacitor), returns absolute URLs.
 * 
 * @param {string} path - The API endpoint path (e.g., '/api/users')
 * @returns {string} - The URL to fetch
 */
export const getApiUrl = (path) => {
    let normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Split path and query string to handle trailing slash correctly
    const queryIndex = normalizedPath.indexOf('?');
    const basePath = queryIndex !== -1 ? normalizedPath.substring(0, queryIndex) : normalizedPath;
    const queryString = queryIndex !== -1 ? normalizedPath.substring(queryIndex) : '';
    
    // Support Next.js trailingSlash: true configuration
    // Always add trailing slash to base path to avoid redirects (which break CORS preflight)
    let finalPath = basePath;
    if (!finalPath.endsWith('/')) {
        finalPath = `${finalPath}/`;
    }
    
    // Re-attach query string if present
    finalPath = `${finalPath}${queryString}`;
    
    // In a browser environment, use absolute URL on native/webview mobile
    // where relative /api routes are not hosted by the local Capacitor origin.
    if (typeof window !== 'undefined') {
        const capacitor = window.Capacitor;
        const platform = capacitor?.getPlatform?.();
        const isNative = platform === 'android' || platform === 'ios';
        
        // Only use absolute URL if truly running in native Capacitor
        // Don't rely on user agent detection alone as it can cause CORS issues during web dev
        if (isNative && capacitor?.isNativePlatform?.()) {
            if (!API_BASE_URL) {
                console.error('[API] Missing NEXT_PUBLIC_API_BASE_URL (or NEXT_PUBLIC_APP_URL) for mobile runtime.', {
                    path: finalPath,
                    platform: platform || 'unknown',
                    origin: window.location?.origin
                });
                return finalPath;
            }
            return `${API_BASE_URL}${finalPath}`;
        }

        // Keep relative paths for regular web browser usage (including localhost dev).
        return finalPath;
    }

    // Absolute URL for SSR or when explicitly needed
    return API_BASE_URL ? `${API_BASE_URL}${finalPath}` : finalPath;
};
