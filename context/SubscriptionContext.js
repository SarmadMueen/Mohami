import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/initSupabase';
import { useRouter } from 'next/router';
import { getApiUrl } from '../lib/api';

// Make sure to define a context
const SubscriptionContext = createContext({
    isTrialActive: false,
    daysRemaining: 0,
    isSubscribed: false,
    isReadOnly: false,
    loading: true,
    subscription: null,
    planName: '',
    maxLawyers: 0,
    refresh: () => { },
});

// Plan-based max lawyers limit
function getMaxLawyersForPlan(planId, isTrialActive) {
    if (!planId) return isTrialActive ? 2 : 0;
    const id = planId.toLowerCase();
    if (id.includes('basic')) return 0;
    if (id.includes('advanced')) return 2;
    if (id.includes('extended_trial')) return 2;
    if (id.includes('test')) return 2;
    if (id.includes('trial')) return 2;
    return 0;
}

// Get max lawyers considering custom limit from user_metadata
async function getMaxLawyersWithCustomLimit(supabase, targetUserId, planId, isTrialActive) {
    // First, check if the admin has a custom lawyer limit
    try {
        const { data: metadata, error: metaError } = await supabase
            .from('user_metadata')
            .select('custom_lawyer_limit')
            .eq('user_id', targetUserId)
            .single();

        if (!metaError && metadata && metadata.custom_lawyer_limit !== null && metadata.custom_lawyer_limit !== undefined) {
            console.log('Using custom lawyer limit:', metadata.custom_lawyer_limit, 'for user:', targetUserId);
            return metadata.custom_lawyer_limit;
        }
    } catch (e) {
        console.error('Error fetching custom lawyer limit:', e);
    }

    // Fall back to plan-based limit
    return getMaxLawyersForPlan(planId, isTrialActive);
}

export const SubscriptionProvider = ({ children }) => {
    const [subState, setSubState] = useState({
        isTrialActive: false,
        daysRemaining: 0,
        isSubscribed: false,
        isReadOnly: false,
        loading: true,
        subscription: null,
    });

    const router = useRouter();
    const isMountedRef = useRef(true);

    const fetchSubscriptionStatus = useCallback(async () => {
        try {
            const user = supabase.auth.user();
            if (!user) {
                if (isMountedRef.current) setSubState(prev => ({ ...prev, loading: false }));
                return;
            }

            // Get the main admin's ID if this is a lawyer account. 
            // Many times RLS block querying other metadata or even your own strictly without specific setup
            let targetUserId = user.id;

            // Try to fetch metadata directly, but use a more explicit catch-all method because RLS might block normal select
            try {
                // Try to fetch through user_metadata table first
                const { data: metaData, error: metaErr } = await supabase
                    .from('user_metadata')
                    .select('admin_user_id, role')
                    .eq('user_id', user.id)
                    .single();

                if (!metaErr && metaData && metaData.admin_user_id) {
                    targetUserId = metaData.admin_user_id;
                } else if (user.user_metadata && user.user_metadata.admin_user_id) {
                    // Fallback to JWT payload
                    targetUserId = user.user_metadata.admin_user_id;
                } else if (user.user_metadata && user.user_metadata.role !== 'مدير') {
                    if (user.user_metadata && user.user_metadata.admin_user_id) {
                        targetUserId = user.user_metadata.admin_user_id;
                    } else {
                        // CRITICAL: RLS BLOCKED US AND JWT IS OUTDATED
                        // Query their own metadata row explicitly using email as a secondary safe unique identifier
                        try {
                            const { data: ownData, error: lErr } = await supabase
                                .from('user_metadata')
                                .select('admin_user_id')
                                .eq('email', user.email)
                                .single();

                            if (!lErr && ownData && ownData.admin_user_id) {
                                targetUserId = ownData.admin_user_id;
                            }
                        } catch (internalErr) { }
                    }
                }
            } catch (e) {
                console.error("Subscription context error fetching metadata:", e);
            }

            // CRITICAL HOTFIX: If it found no targetUserId other than itself, but the user is definitely a lawyer...
            if (targetUserId === user.id && user.user_metadata && user.user_metadata.admin_user_id) {
                targetUserId = user.user_metadata.admin_user_id;
            }

            // 1. Get the latest active subscription record via server-side API (bypasses RLS)
            let subData = null;
            try {
                const session = supabase.auth.session();
                if (session) {
                    const apiUrl = getApiUrl(`/api/subscription/get-info/?targetUserId=${targetUserId}`);
                    console.log('Fetching subscription from:', apiUrl);
                    const subRes = await fetch(apiUrl, {
                        headers: { 'Authorization': `Bearer ${session.access_token}` }
                    });
                    if (subRes.ok) {
                        const subResult = await subRes.json();
                        subData = subResult.subscription;
                        console.log('Subscription API result for targetUserId:', targetUserId, subData);
                    } else {
                        const errData = await subRes.json().catch(() => ({}));
                        console.error('Subscription API returned error:', subRes.status, errData);
                    }
                }
            } catch (subFetchErr) {
                console.error('Error fetching subscription via API:', subFetchErr);
            }

            // 1b. CLIENT-SIDE FALLBACK: If API failed or returned null, try direct Supabase query (if RLS allows)
            if (!subData) {
                try {
                    const { data: directData, error: directErr } = await supabase
                        .from('subscriptions')
                        .select('*')
                        .eq('user_id', targetUserId)
                        .order('current_period_end', { ascending: false })
                        .limit(1);

                    if (!directErr && directData && directData.length > 0) {
                        subData = directData[0];
                        console.log('Successfully used client-side fallback for subscription:', subData);
                    }
                } catch (fallbackErr) {
                    console.error('Client-side fallback query failed:', fallbackErr);
                }
            }

            const now = new Date();

            // If user has an active record in subscriptions table
            if (subData) {
                // Ensure correct date parsing by replacing space with T if needed
                const expiryStr = subData.current_period_end?.replace(' ', 'T') || subData.current_period_end;
                const expiryDate = new Date(expiryStr);
                const isExpired = expiryDate < now;

                if (!isExpired) {
                    // Normalize dates to start of day to prevent timezone/clock float issues
                    const endDay = new Date(expiryDate);
                    endDay.setHours(0, 0, 0, 0);
                    const currDay = new Date(now);
                    currDay.setHours(0, 0, 0, 0);

                    const diffInTime = endDay.getTime() - currDay.getTime();
                    const daysLeft = Math.max(0, Math.round(diffInTime / (1000 * 3600 * 24)));
                    const isTrial = subData.plan_id.toLowerCase().includes('trial');

                    if (isMountedRef.current) {
                        setSubState(prev => ({
                            ...prev,
                            isTrialActive: isTrial,
                            daysRemaining: daysLeft,
                            isSubscribed: !isTrial, // If it's a real plan, set subscribed
                            isReadOnly: false,
                            loading: false,
                            subscription: subData
                        }));
                    }
                    return;
                } else {
                    // It's expired
                    if (isMountedRef.current) {
                        setSubState(prev => ({
                            ...prev,
                            isTrialActive: false,
                            daysRemaining: 0,
                            isSubscribed: false,
                            isReadOnly: true,
                            loading: false
                        }));
                    }
                    return;
                }
            }

            // 2. Fallback: No record in subscriptions found, check legacy Trial Period (14 days from registration)
            // If this is a lawyer account, base the trial off the admin's creation date, not their own.
            let baseCreationDate = new Date(user.created_at);

            if (targetUserId && targetUserId !== user.id) {
                const { data: adminUser } = await supabase
                    .from('user_metadata')
                    .select('created_at, user_id')
                    .eq('user_id', targetUserId)
                    .single();

                // Need to grab actual created_at. 
                if (adminUser && adminUser.created_at) {
                    baseCreationDate = new Date(adminUser.created_at);
                }
            }

            // Temporary safety net just in case `created_at` isn't accessible via the current fetch logic.
            // We'll trust the user.created_at if the metaData fetch above fails.
            const expiryLegacy = new Date(baseCreationDate);
            expiryLegacy.setDate(expiryLegacy.getDate() + 14);
            expiryLegacy.setHours(0, 0, 0, 0);

            const currDayFallback = new Date(now);
            currDayFallback.setHours(0, 0, 0, 0);

            const differenceInTime = expiryLegacy.getTime() - currDayFallback.getTime();
            const daysRemainingFallback = Math.max(0, Math.round(differenceInTime / (1000 * 3600 * 24)));
            const isTrialActiveFallback = daysRemainingFallback > 0;

            if (isMountedRef.current) {
                setSubState(prev => ({
                    ...prev,
                    isTrialActive: isTrialActiveFallback,
                    daysRemaining: daysRemainingFallback,
                    isSubscribed: false,
                    isReadOnly: !isTrialActiveFallback,
                    loading: false
                }));
            }
        } catch (err) {
            console.error("Error fetching subscription/trial state:", err);
            if (isMountedRef.current) setSubState(prev => ({ ...prev, loading: false }));
        }
    }, []);

    // Expose a refresh function that can be called from any consuming component
    const refresh = useCallback(async () => {
        if (isMountedRef.current) {
            setSubState(prev => ({ ...prev, loading: true }));
        }
        await fetchSubscriptionStatus();
    }, [fetchSubscriptionStatus]);

    useEffect(() => {
        isMountedRef.current = true;

        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (session) {
                    fetchSubscriptionStatus();
                } else {
                    if (isMountedRef.current) {
                        setSubState({
                            isTrialActive: false,
                            daysRemaining: 0,
                            isSubscribed: false,
                            isReadOnly: false,
                            loading: false,
                            subscription: null,
                        });
                    }
                }
            }
        );

        // Fetch initially
        fetchSubscriptionStatus();

        return () => {
            isMountedRef.current = false;
            authListener?.unsubscribe();
        };
    }, [fetchSubscriptionStatus]);

    const getPlanName = () => {
        const sub = subState.subscription;
        if (!sub) return subState.isTrialActive ? 'فترة تجريبية' : 'لا يوجد اشتراك';
        
        const planId = sub.plan_id.toLowerCase();
        if (planId.includes('basic')) return 'الباقة الأساسية';
        if (planId.includes('advanced')) return 'الباقة المتقدمة';
        if (planId.includes('extended_trial')) return 'فترة تجريبية ممتدة';
        if (planId.includes('test')) return 'باقة تجريبية (مطورين)';
        if (planId.includes('trial')) return 'باقة تجريبية (14 يوم)';
        
        return 'اشتراك فعال';
    };

    const maxLawyers = getMaxLawyersForPlan(
        subState.subscription?.plan_id,
        subState.isTrialActive
    );

    // Note: Custom lawyer limits are fetched separately in the API endpoints
    // The context uses plan-based limits as default, but the actual enforcement
    // happens in the API which checks custom limits first

    const contextValue = { ...subState, planName: getPlanName(), maxLawyers, refresh };

    return (
        <SubscriptionContext.Provider value={contextValue}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => useContext(SubscriptionContext);
