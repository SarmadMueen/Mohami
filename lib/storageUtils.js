import { supabase } from './initSupabase';
import { getApiUrl } from './api';

/**
 * Checks if the current user (admin or lawyer) has enough storage to upload new files.
 * @param {string} adminId The ID of the primary admin.
 * @returns {Promise<{ allowed: boolean, usedGB: number, limitGB: number }>}
 */
export async function checkStorageLimit(adminId) {
    try {
        const session = supabase.auth.session();
        if (!session || !session.access_token) {
            console.log('[Storage] No session or access_token');
            return { allowed: false, error: 'Unauthorized' };
        }

        const url = getApiUrl(`/api/storage/get-storage-usage${adminId ? `?adminUserId=${adminId}` : ''}`);
        console.log('[Storage] Fetching URL:', url);
        console.log('[Storage] API_BASE_URL env:', typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'NOT SET') : 'SSR');
        
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
        });

        console.log('[Storage] Response status:', res.status);
        const contentType = res.headers.get('content-type');
        console.log('[Storage] Content-Type:', contentType);

        if (!res.ok) {
            const text = await res.text();
            console.error('[Storage] Error response:', text.substring(0, 200));
            throw new Error('Failed to fetch storage limit');
        }

        // Check if response is actually JSON
        if (contentType && !contentType.includes('application/json')) {
            const text = await res.text();
            console.error('[Storage] Non-JSON response:', text.substring(0, 200));
            throw new Error('Response is not JSON');
        }

        const data = await res.json();
        console.log('[Storage] Success:', data);
        return data;
    } catch (e) {
        console.error('[Storage] Error:', e);
        // Fail open or fail closed? Let's fail OPEN if the check breaks, so we don't break their core workflow
        return { allowed: true };
    }
}
