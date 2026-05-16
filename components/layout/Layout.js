import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import PropTypes from "prop-types";
import { supabase } from "../../lib/initSupabase";

import {
    FaBell,
    FaSignOutAlt,
    FaBalanceScale,
    FaGavel,
    FaBuilding,
    FaSync,
    FaUser,
    FaChevronDown,
    FaSearch,
    FaInfoCircle
} from "react-icons/fa";
import {
    HiOutlineHome,
    HiOutlineBriefcase,
    HiOutlineUsers,
    HiOutlineDocumentText,
    HiOutlineChartBar,
    HiOutlineShoppingCart,
    HiOutlineCalendar,
    HiOutlineUser,
    HiOutlineCog,
    HiOutlineOfficeBuilding
} from "react-icons/hi";
import {
    Home,
    LayoutDashboard,
    Briefcase,
    Users,
    FileText,
    BarChart3,
    ShoppingCart,
    Calendar,
    User,
    Settings,
    Building2,
    Scale,
    Gavel,
    Clock,
    TrendingUp,
    DollarSign,
    FileEdit,
    UserCircle,
    LayoutGrid,
    CheckSquare,
    ShieldCheck,
    Menu,
    X,
    Search,
    UserPlus,
    BookOpen,
    FilePlus,
    Plus,
    Sparkles,
    CalendarClock,
    CalendarDays,
    Receipt,
    ListTodo,
    Archive,
    HelpCircle,
    ChevronLeft
} from "lucide-react";
import Logo from "../Logo";
import { useSubscription } from "../../context/SubscriptionContext";



const Layout = ({ children }) => {
    const router = useRouter();
    const [userData, setUserData] = useState(() => {
        // Initialize from sessionStorage if available
        if (typeof window !== 'undefined') {
            try {
                const cached = sessionStorage.getItem('cachedLawyerName');
                if (cached) {
                    return { logoUrl: "", lawyerName: cached };
                }
            } catch (e) { }
        }
        return { logoUrl: "", lawyerName: "" };
    });
    const [hasInitializedFromCache, setHasInitializedFromCache] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { isTrialActive, daysRemaining, isSubscribed, isReadOnly, loading: subLoading } = useSubscription();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const notificationsRef = useRef(null);
    const [userPermissions, setUserPermissions] = useState(null);
    const [userJobTitle, setUserJobTitle] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                return sessionStorage.getItem('cachedJobTitle');
            } catch (e) { }
        }
        return null;
    });
    const [userRole, setUserRole] = useState(null);
    const [, setLoadingPermissions] = useState(true); // setLoadingPermissions is used, but loadingPermissions is not
    const [officeSettings, setOfficeSettings] = useState(() => {
        // Initialize from sessionStorage if available
        if (typeof window !== 'undefined') {
            try {
                const cached = sessionStorage.getItem('officeSettings');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed && (parsed.office_logo_url || parsed.office_address_ar)) {
                        return parsed;
                    }
                }
            } catch (e) {
                // Ignore cache errors
            }
        }
        return { office_logo_url: null, office_address_ar: '' };
    });
    const [loadingOfficeSettings, setLoadingOfficeSettings] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
    const [activeNavItem, setActiveNavItem] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileScreen, setIsMobileScreen] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 1280;
        }
        return false;
    });
    const [isMobilePhone, setIsMobilePhone] = useState(() => {
        if (typeof window !== 'undefined') {
            // Use <= 1024 to include all iPad portrait modes (768px-1024px) for mobile header/bottom nav
            return window.innerWidth <= 1024;
        }
        return false;
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [globalSearchResults, setGlobalSearchResults] = useState({ cases: [], clients: [], sessions: [], tasks: [], templates: [], decisions: [] });
    const [showGlobalSearchResults, setShowGlobalSearchResults] = useState(false);
    const [isGlobalSearching, setIsGlobalSearching] = useState(false);
    const globalSearchRef = useRef(null);
    const [showClientRequiredMsg, setShowClientRequiredMsg] = useState(false);
    const isLoggedIn = supabase.auth.user() !== null;
    const officeSettingsFetchedRef = useRef(false);
    const profileDropdownRef = useRef(null);
    const profileButtonRef = useRef(null);
    const userProfileFetchedRef = useRef(false);

    // Set mounted flag client-side to avoid hydration issues.
    useEffect(() => {
        setMounted(true);
    }, []);

    // Track screen size for mobile/desktop detection
    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobileScreen(window.innerWidth < 1280);
            // Use <= 1024 to include all iPad portrait modes (768px-1024px) for mobile header/bottom nav
            setIsMobilePhone(window.innerWidth <= 1024);
        };

        // Initial check
        if (typeof window !== 'undefined') {
            checkScreenSize();
        }

        // Listen for resize events
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // Update active nav item based on router pathname
    useEffect(() => {
        const pathname = router.pathname;
        // Map pathnames to nav item keys
        const pathMap = {
            '/dashboard': '/dashboard',
            '/': '/dashboard',
            '/cases/CasesTable': '/cases/CasesTable',
            '/services/legal-services': '/services/legal-services',
            '/client/all_clients': '/client/all_clients',
            '/cases/sessions': '/cases/sessions',
            '/reports': '/reports',
            '/accounting/accounting': '/accounting/accounting',
            '/calendar': '/calendar',
            '/templates': '/templates',
            '/lawyer/lawyer': '/lawyer/lawyer',
            '/quick-archive': '/quick-archive',
            '/help': '/help'
        };

        // Check if current pathname matches any mapped path
        for (const [path, key] of Object.entries(pathMap)) {
            if (pathname === path || pathname.startsWith(path + '/')) {
                setActiveNavItem(key);
                return;
            }
        }

        // Check for cases paths
        if (pathname.startsWith('/cases/') && pathname !== '/cases/sessions') {
            setActiveNavItem('/cases/CasesTable');
        }
    }, [router.pathname]);

    // Handler to set active nav item on click
    const handleNavClick = (path) => {
        setActiveNavItem(path);
        setIsMobileMenuOpen(false);
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    // Determine if back button should be shown (only on non-root pages for iPad)
    const shouldShowBackButton = (() => {
        const pathname = router.pathname;
        // Root pages where back button should NOT be shown
        const rootPages = [
            '/dashboard',
            '/',
            '/cases/CasesTable',
            '/services/legal-services',
            '/client/all_clients',
            '/cases/sessions',
            '/reports',
            '/accounting/accounting',
            '/calendar',
            '/templates',
            '/lawyer/lawyer',
            '/quick-archive',
            '/help',
            '/login',
            '/register',
            '/pricing',
            '/features'
        ];

        // Check if current page is a root page
        const isRootPage = rootPages.some(rootPath => 
            pathname === rootPath || pathname.startsWith(rootPath + '/')
        );

        // Show back button if NOT a root page
        return !isRootPage;
    })();

    // Calculate dropdown position and close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target) &&
                profileButtonRef.current && !profileButtonRef.current.contains(event.target)) {
                setIsProfileDropdownOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setIsNotificationsOpen(false);
            }
        };

        const updateDropdownPosition = () => {
            if (profileButtonRef.current) {
                const rect = profileButtonRef.current.getBoundingClientRect();
                const dropdownWidth = 320; // width for dropdown menu
                // Position dropdown much further to the right to ensure full visibility
                // Align dropdown's right edge closer to the screen edge
                const offset = -250; // Large negative offset to move it much further right
                const rightPosition = window.innerWidth - rect.right + offset;
                // Ensure dropdown doesn't go off-screen - keep at least 16px margin from left edge
                const minRight = dropdownWidth + 16;
                const finalRight = Math.max(rightPosition, minRight);

                setDropdownPosition({
                    top: rect.bottom + 8,
                    right: finalRight
                });
            }
        };

        if (isProfileDropdownOpen || isNotificationsOpen) {
            updateDropdownPosition();
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('resize', updateDropdownPosition);
            window.addEventListener('scroll', updateDropdownPosition, true);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updateDropdownPosition);
            window.removeEventListener('scroll', updateDropdownPosition, true);
        };
    }, [isProfileDropdownOpen]);

    // Fetch office settings for header display - only once per session
    useEffect(() => {
        const fetchOfficeSettings = async () => {
            // Check if we already have cached data and it's valid
            if (typeof window !== 'undefined') {
                try {
                    const cached = sessionStorage.getItem('officeSettings');
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        if (parsed && (parsed.office_logo_url || parsed.office_address_ar)) {
                            // Use cached data, don't fetch again
                            officeSettingsFetchedRef.current = true;
                            return;
                        }
                    }
                } catch (e) {
                    // Ignore cache errors, continue to fetch
                }
            }

            // Only fetch if we haven't fetched before in this session
            if (officeSettingsFetchedRef.current) {
                return;
            }

            try {
                setLoadingOfficeSettings(true);
                const user = supabase.auth.user();
                if (!user) {
                    setOfficeSettings({ office_logo_url: null, office_address_ar: '' });
                    setLoadingOfficeSettings(false);
                    return;
                }

                // Fetch office settings from logged-in admin user's metadata
                const { data, error } = await supabase
                    .from('user_metadata')
                    .select('office_logo_url, office_address_ar')
                    .eq('user_id', user.id)
                    .eq('role', 'الفئة 1')
                    .single();

                if (error && error.code !== 'PGRST116') {
                    // If not found, try to get any admin user's settings
                    const { data: fallbackData } = await supabase
                        .from('user_metadata')
                        .select('office_logo_url, office_address_ar')
                        .eq('role', 'الفئة 1')
                        .limit(1)
                        .single();

                    if (fallbackData) {
                        const settings = {
                            office_logo_url: fallbackData.office_logo_url || null,
                            office_address_ar: fallbackData.office_address_ar || ''
                        };
                        setOfficeSettings(settings);
                        // Cache in sessionStorage
                        if (typeof window !== 'undefined') {
                            try {
                                sessionStorage.setItem('officeSettings', JSON.stringify(settings));
                            } catch (e) {
                                // Ignore storage errors
                            }
                        }
                    } else {
                        const settings = { office_logo_url: null, office_address_ar: '' };
                        setOfficeSettings(settings);
                        if (typeof window !== 'undefined') {
                            try {
                                sessionStorage.setItem('officeSettings', JSON.stringify(settings));
                            } catch (e) {
                                // Ignore storage errors
                            }
                        }
                    }
                } else if (data) {
                    const settings = {
                        office_logo_url: data.office_logo_url || null,
                        office_address_ar: data.office_address_ar || ''
                    };
                    setOfficeSettings(settings);
                    // Cache in sessionStorage
                    if (typeof window !== 'undefined') {
                        try {
                            sessionStorage.setItem('officeSettings', JSON.stringify(settings));
                        } catch (e) {
                            // Ignore storage errors
                        }
                    }
                } else {
                    const settings = { office_logo_url: null, office_address_ar: '' };
                    setOfficeSettings(settings);
                    if (typeof window !== 'undefined') {
                        try {
                            sessionStorage.setItem('officeSettings', JSON.stringify(settings));
                        } catch (e) {
                            // Ignore storage errors
                        }
                    }
                }

                officeSettingsFetchedRef.current = true;
            } catch (error) {
                console.error('Error fetching office settings:', error);
                const settings = { office_logo_url: null, office_address_ar: '' };
                setOfficeSettings(settings);
                if (typeof window !== 'undefined') {
                    try {
                        sessionStorage.setItem('officeSettings', JSON.stringify(settings));
                    } catch (e) {
                        // Ignore storage errors
                    }
                }
            } finally {
                setLoadingOfficeSettings(false);
            }
        };

        if (isLoggedIn && !officeSettingsFetchedRef.current) {
            fetchOfficeSettings();
        } else if (!isLoggedIn) {
            setOfficeSettings({ office_logo_url: null, office_address_ar: '' });
            setLoadingOfficeSettings(false);
        }
    }, [isLoggedIn]);

    const fetchUserProfile = useCallback(async () => {
        try {
            setLoadingPermissions(true);
            const user = supabase.auth.user();
            if (!user) {
                setUserPermissions(null);
                setUserRole(null);
                setUserJobTitle(null);
                setUserData(prev => ({ ...prev, lawyerName: "" }));
                setLoadingPermissions(false);
                return;
            }

            // Fetch user metadata to get role, job_title, and username
            // First try exact user_id match, then fall back to broader search
            let userMetadata = null;
            let metadataError = null;

            // Query 1: user's own row (user_id, admin_user_id, or new_lawyer_id matches auth id)
            const { data: exactMatch, error: exactError } = await supabase
                .from('user_metadata')
                .select('role, job_title, username, arabic_name, admin_user_id, new_lawyer_id, user_id')
                .or(`user_id.eq.${user.id},admin_user_id.eq.${user.id},new_lawyer_id.eq.${user.id}`);

            if (!exactError && exactMatch && exactMatch.length > 0) {
                // Prioritize the user's OWN row to avoid picking another lawyer's data
                userMetadata =
                    exactMatch.find(m => m.user_id === user.id) ||                         // exact user_id match
                    exactMatch.find(m => m.new_lawyer_id === user.id) ||                    // lawyer's own row
                    exactMatch.find(m => m.admin_user_id === user.id && !m.new_lawyer_id) || // admin's own row
                    exactMatch.find(m => m.arabic_name || m.username) ||                    // fallback: any with a name
                    exactMatch[0];
            } else {
                // Fallback: broader search by email
                const { data: broadMatch, error: broadError } = await supabase
                    .from('user_metadata')
                    .select('role, job_title, username, arabic_name')
                    .eq('email', user.email);

                if (!broadError && broadMatch && broadMatch.length > 0) {
                    // Prioritize entries that have arabic_name or username populated
                    userMetadata = broadMatch.find(m => m.arabic_name || m.username) || broadMatch[0];
                } else {
                    metadataError = broadError || exactError;
                }
            }

            if (metadataError || !userMetadata) {
                console.error('Error fetching user metadata:', metadataError);
                // Don't clear cached lawyer name on failure to preserve existing display
                // Check if user is a client and redirect
                try {
                    const { data: clientData, error: clientError } = await supabase
                        .from('client_accounts')
                        .select('id')
                        .eq('auth_user_id', user.id)
                        .maybeSingle();
                        
                    if (clientData && !clientError) {
                        router.replace('/client-portal/dashboard');
                        return;
                    }
                } catch (err) {
                    console.error('Error checking client account:', err);
                }

                setUserPermissions(null);
                setUserRole(null);
                setUserJobTitle(null);
                // Don't clear lawyerName on error to preserve existing value
                setLoadingPermissions(false);
                return;
            }

            const role = userMetadata.role;
            setUserRole(role);
            
            // Use fresh DB values and update sessionStorage cache
            let finalJobTitle = userMetadata.job_title;
            let finalDisplayName = (userMetadata.arabic_name || "") || (userMetadata.username || "");
            
            if (typeof window !== 'undefined') {
                try {
                    // Always update cache with fresh DB data
                    if (finalJobTitle) sessionStorage.setItem('cachedJobTitle', finalJobTitle);
                    if (finalDisplayName) sessionStorage.setItem('cachedLawyerName', finalDisplayName);
                } catch (e) { }
            }
            
            setUserJobTitle(finalJobTitle);
            console.log('User metadata fetched:', { role, username: userMetadata.username, arabicName: userMetadata.arabic_name, jobTitle: finalJobTitle });
            setUserData(prev => ({ ...prev, lawyerName: finalDisplayName }));

            // Fetch permission profile for the user's role
            const { data: permissionData, error: permissionError } = await supabase
                .from('permission_profiles')
                .select('*')
                .eq('profile_name', role)
                .single();

            if (permissionError || !permissionData) {
                console.error('Error fetching permissions:', permissionError);
                setUserPermissions(null);
            } else {
                setUserPermissions(permissionData);
            }
        } catch (error) {
            console.error('Error in fetchUserProfile:', error);
            setUserPermissions(null);
        } finally {
            setLoadingPermissions(false);
        }
    }, [isLoggedIn]);

    // Fetch user permissions based on role — always fetch from DB to ensure correct data
    useEffect(() => {
        if (isLoggedIn && !userProfileFetchedRef.current) {
            // Use cache for initial render to avoid flicker
            const cachedLawyerName = sessionStorage.getItem('cachedLawyerName');
            const cachedJobTitle = sessionStorage.getItem('cachedJobTitle');
            if (cachedLawyerName) {
                setUserData(prev => ({ ...prev, lawyerName: cachedLawyerName }));
            }
            if (cachedJobTitle) {
                setUserJobTitle(cachedJobTitle);
            }
            // Always fetch fresh data from DB to correct any stale cache
            fetchUserProfile();
            userProfileFetchedRef.current = true;
        } else if (!isLoggedIn) {
            setUserPermissions(null);
            setUserRole(null);
            setUserJobTitle(null);
            setLoadingPermissions(false);
            userProfileFetchedRef.current = false;
        }
    }, [isLoggedIn]);

    // Listen for custom event to update navbar state directly
    useEffect(() => {
        const handleUserProfileUpdate = (event) => {
            console.log('userProfileUpdated event received:', event.detail);
            if (event.detail) {
                const { lawyerName, jobTitle } = event.detail;
                if (lawyerName) {
                    setUserData(prev => ({ ...prev, lawyerName }));
                    // Update sessionStorage to ensure cache is in sync
                    if (typeof window !== 'undefined') {
                        try {
                            sessionStorage.setItem('cachedLawyerName', lawyerName);
                        } catch (e) {
                            console.error('Error updating sessionStorage:', e);
                        }
                    }
                }
                if (jobTitle) {
                    setUserJobTitle(jobTitle);
                    // Update sessionStorage to ensure cache is in sync
                    if (typeof window !== 'undefined') {
                        try {
                            sessionStorage.setItem('cachedJobTitle', jobTitle);
                        } catch (e) {
                            console.error('Error updating sessionStorage:', e);
                        }
                    }
                }
            }
        };

        window.addEventListener('userProfileUpdated', handleUserProfileUpdate);

        return () => {
            window.removeEventListener('userProfileUpdated', handleUserProfileUpdate);
        };
    }, []);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        const user = supabase.auth.user();
        if (!user) return;

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (!error && data) {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        }
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            fetchNotifications();

            // Real-time subscription for new notifications
            const user = supabase.auth.user();
            if (user) {
                const subscription = supabase
                    .from(`notifications:user_id=eq.${user.id}`)
                    .on('INSERT', (payload) => {
                        console.log('New notification received:', payload);
                        setNotifications(prev => [payload.new, ...prev.slice(0, 19)]);
                        setUnreadCount(prev => prev + 1);
                    })
                    .on('UPDATE', (payload) => {
                        setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
                        // Re-calculate unread count
                        setNotifications(prev => {
                            setUnreadCount(prev.filter(n => !n.is_read).length);
                            return prev;
                        });
                    })
                    .subscribe();

                return () => {
                    supabase.removeSubscription(subscription);
                };
            }
        }
    }, [isLoggedIn, router.pathname, fetchNotifications]);

    // Listen for custom notification-updated events from child components
    useEffect(() => {
        const handleNotificationsUpdated = () => {
            fetchNotifications();
        };
        window.addEventListener('notifications-updated', handleNotificationsUpdated);
        return () => {
            window.removeEventListener('notifications-updated', handleNotificationsUpdated);
        };
    }, [fetchNotifications]);

    const markAsRead = async (notificationId) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            if (!error) {
                setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const markAllAsRead = async () => {
        const user = supabase.auth.user();
        if (!user) return;

        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (!error) {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                setUnreadCount(0);
            }
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    };

    // Auth state listener to redirect if no user session and refresh permissions
    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[Layout] Auth state change:', event, 'Session exists:', !!session, 'Current path:', router.pathname);
            // Don't redirect on login/register pages - they handle their own auth logic
            if (!session && router.pathname !== "/" && router.pathname !== "/login" && router.pathname !== "/register") {
                console.log('[Layout] Redirecting to / due to no session');
                router.replace("/");
            }
            // Refresh permissions when auth state changes
            if (session) {
                fetchUserProfile();
            } else {
                setUserPermissions(null);
                setUserRole(null);
                setUserJobTitle(null);
                setUserData({ logoUrl: "", lawyerName: "" });
            }
        });
        return () => authListener.unsubscribe();
    }, [router]);

    const onDataLoaded = useCallback((data) => {
        console.log('onDataLoaded called with:', data);
        setUserData(data);
    }, []);

    const handleLogout = async () => {
        try {
            // Clear cached office settings on logout
            if (typeof window !== 'undefined') {
                try {
                    sessionStorage.removeItem('officeSettings');
                } catch (e) {
                    // Ignore errors
                }
            }
            officeSettingsFetchedRef.current = false;
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            router.replace("/");
        } catch (error) {
            console.error("Logout error:", error.message);
        }
    };

    const handleAddCaseClick = async (e) => {
        if (e) e.preventDefault();
        
        const user = supabase.auth.user();
        if (!user) return;

        try {
            // Check if user has any clients
            const { data: metaList } = await supabase
                .from("user_metadata")
                .select("role, admin_user_id, user_id, new_lawyer_id")
                .or(`user_id.eq.${user.id},new_lawyer_id.eq.${user.id}`);

            let effectiveAdminId = user.id;
            if (metaList && metaList.length > 0) {
                const lawyerRow = metaList.find(m => m.new_lawyer_id === user.id);
                const userRow = metaList.find(m => m.user_id === user.id);
                const targetMeta = lawyerRow || userRow || metaList[0];
                effectiveAdminId = targetMeta.admin_user_id || targetMeta.user_id || user.id;
            }

            const queryCondition = `admin_id.eq.${effectiveAdminId},lawyer_id.eq.${effectiveAdminId},admin_id.eq.${user.id},lawyer_id.eq.${user.id}`;

            const { count, error } = await supabase
                .from('clients_data')
                .select('*', { count: 'exact', head: true })
                .or(queryCondition);

            if (!error && count === 0) {
                setShowClientRequiredMsg(true);
                setTimeout(() => {
                    setShowClientRequiredMsg(false);
                    router.push('/client/add_cl');
                }, 3000);
            } else {
                router.push('/cases/add-case');
            }
        } catch (error) {
            console.error('Error in handleAddCaseClick:', error);
            router.push('/cases/add-case');
        }
    };

    // Get firm context for search filtering
    const getSearchFirmContext = async () => {
        const user = supabase.auth.user();
        if (!user) return { firmUserIds: [], isAdmin: false };
        const uid = user.id;
        try {
            const { data: myMeta } = await supabase
                .from('user_metadata')
                .select('admin_user_id, new_lawyer_id, user_id, role')
                .or(`new_lawyer_id.eq.${uid},user_id.eq.${uid}`);

            let isAdmin = false;
            let firmAdminId = null;
            let firmUserIds = [uid];

            if (myMeta && myMeta.length > 0) {
                const myRow = myMeta.find(m => m.new_lawyer_id === uid) || myMeta.find(m => m.user_id === uid);
                if (myRow) {
                    isAdmin = myRow.role === 'Admin' || myRow.admin_user_id === uid;
                    firmAdminId = isAdmin ? uid : myRow.admin_user_id;
                }
            }

            if (firmAdminId) {
                const { data: firmUsers } = await supabase
                    .from('user_metadata')
                    .select('new_lawyer_id, user_id')
                    .or(`admin_user_id.eq.${firmAdminId},user_id.eq.${firmAdminId}`);
                if (firmUsers) {
                    const lIds = firmUsers.map(u => u.new_lawyer_id).filter(Boolean);
                    const uIds = firmUsers.map(u => u.user_id).filter(Boolean);
                    firmUserIds = [...new Set([firmAdminId, uid, ...lIds, ...uIds].filter(Boolean))];
                }
            }
            return { firmUserIds, isAdmin };
        } catch (err) {
            console.error('Error getting firm context for search:', err);
            return { firmUserIds: [uid], isAdmin: false };
        }
    };

    // Global Search Function - filtered by current firm
    const handleGlobalSearch = async (query) => {
        if (!query || !query.trim()) {
            setGlobalSearchResults({ cases: [], clients: [], sessions: [], tasks: [], templates: [], decisions: [] });
            setShowGlobalSearchResults(false);
            return;
        }
        const q = query.trim();
        setIsGlobalSearching(true);
        setShowGlobalSearchResults(true);
        try {
            const { firmUserIds, isAdmin } = await getSearchFirmContext();
            const uid = supabase.auth.user()?.id;
            const idsStr = firmUserIds.join(',');

            // Build firm-scoped filter queries
            const caseFilter = isAdmin
                ? `admin_id.in.(${idsStr}),lawyer_id.in.(${idsStr}),caseLawyerId.in.(${idsStr})`
                : `lawyer_id.eq.${uid},caseLawyerId.eq.${uid},admin_id.eq.${uid}`;

            const clientFilter = isAdmin
                ? `admin_id.in.(${idsStr}),lawyer_id.in.(${idsStr})`
                : `lawyer_id.eq.${uid},admin_id.eq.${uid}`;

            const taskFilter = isAdmin
                ? `admin_id.in.(${idsStr}),lawyer_id.in.(${idsStr})`
                : `lawyer_id.eq.${uid},admin_id.eq.${uid}`;

            // Fetch firm cases, clients, tasks (firm-scoped) + templates, decisions (shared)
            // Two chained .or() calls = AND in PostgREST: (firm filter) AND (text search)
            const [casesRes, clientsRes, tasksRes, templatesRes, decisionsRes] = await Promise.all([
                supabase.from('cases').select('id, case_number, client_name, caseType, caseState')
                    .or(caseFilter)
                    .or(`case_number.ilike.%${q}%,client_name.ilike.%${q}%,caseType.ilike.%${q}%,caseState.ilike.%${q}%`)
                    .limit(8),
                supabase.from('clients_data').select('id, client_name, legal_form, client_phone')
                    .or(clientFilter)
                    .or(`client_name.ilike.%${q}%,legal_form.ilike.%${q}%,client_phone.ilike.%${q}%`)
                    .limit(8),
                supabase.from('tasks').select('id, task_title, task_case, task_status, task_deadline')
                    .or(taskFilter)
                    .or(`task_title.ilike.%${q}%,task_case.ilike.%${q}%`)
                    .limit(8),
                supabase.from('templates').select('id, file_name, display_title, content, ocr_extracted_text')
                    .or(`file_name.ilike.%${q}%,display_title.ilike.%${q}%,content.ilike.%${q}%,ocr_extracted_text.ilike.%${q}%`)
                    .limit(8),
                supabase.from('court_decisions').select('id, title, decision_number, category, decision_date, description')
                    .or(`title.ilike.%${q}%,decision_number.ilike.%${q}%,category.ilike.%${q}%,description.ilike.%${q}%`)
                    .limit(8),
            ]);

            // For sessions: first get all firm case numbers, then search sessions within those
            let sessionsData = [];
            const firmCasesQuery = await supabase.from('cases').select('case_number').or(caseFilter);
            const firmCaseNumbers = [...new Set((firmCasesQuery.data || []).map(c => c.case_number).filter(Boolean))];
            if (firmCaseNumbers.length > 0) {
                const { data: sessRes } = await supabase
                    .from('sessions')
                    .select('id, sessionname, case_number, sessiondate, sessiondetails')
                    .in('case_number', firmCaseNumbers)
                    .or(`sessionname.ilike.%${q}%,case_number.ilike.%${q}%,sessiondetails.ilike.%${q}%`)
                    .limit(8);
                sessionsData = sessRes || [];
            }

            setGlobalSearchResults({
                cases: casesRes.data || [],
                clients: clientsRes.data || [],
                sessions: sessionsData,
                tasks: tasksRes.data || [],
                templates: templatesRes.data || [],
                decisions: decisionsRes.data || [],
            });
        } catch (err) {
            console.error('Global search error:', err);
        } finally {
            setIsGlobalSearching(false);
        }
    };

    // Debounced global search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) {
                handleGlobalSearch(searchQuery);
            } else {
                setShowGlobalSearchResults(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Close search results on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (globalSearchRef.current && !globalSearchRef.current.contains(e.target)) {
                setShowGlobalSearchResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="layout-container" suppressHydrationWarning style={{ paddingTop: isReadOnly && !subLoading ? '32px' : '0' }}>
            {/* Read-Only Banner */}
            {isReadOnly && !subLoading && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: '#dc2626',
                    color: 'white',
                    padding: '6px 16px',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}>
                    <span style={{ fontSize: '12px', fontWeight: '600' }}>
                        انتهت صلاحية رخصتك تجديد
                    </span>
                    <Link href="/settings/subscription">
                        <a style={{
                            backgroundColor: 'white',
                            color: '#dc2626',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontWeight: '600',
                            textDecoration: 'none',
                            fontSize: '11px'
                        }}>
                            تجديد
                        </a>
                    </Link>
                </div>
            )}
            {/* Mobile Bottom Navigation - Moved Outside Header */}
            <div className="mobile-bottom-nav">
                <Link href="/dashboard">
                    <a className={`mobile-nav-item ${router.pathname === '/dashboard' || router.pathname === '/' ? 'active' : ''}`}>
                        <Home size={22} strokeWidth={router.pathname === '/dashboard' || router.pathname === '/' ? 2.5 : 2} />
                        <span>الرئيسية</span>
                    </a>
                </Link>
                <Link href="/cases/CasesTable">
                    <a className={`mobile-nav-item ${router.pathname.startsWith('/cases') ? 'active' : ''}`}>
                        <Briefcase size={22} strokeWidth={router.pathname.startsWith('/cases') ? 2.5 : 2} />
                        <span>القضايا</span>
                    </a>
                </Link>
                <Link href="/calendar">
                    <a className={`mobile-nav-item ${router.pathname === '/calendar' ? 'active' : ''}`}>
                        <Calendar size={22} strokeWidth={router.pathname === '/calendar' ? 2.5 : 2} />
                        <span>التقويم</span>
                    </a>
                </Link>
                <button
                    className={`mobile-nav-item ${isNotificationsOpen ? 'active' : ''}`}
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    style={{ position: 'relative' }}
                >
                    <div className="nav-icon-container" style={{ position: 'relative' }}>
                        <FaBell size={20} color={isNotificationsOpen ? '#2563EB' : '#64748B'} />
                        {unreadCount > 0 && (
                            <span className="notification-badge" style={{ 
                                top: '-4px', 
                                right: '-6px',
                                padding: '2px 5px',
                                minWidth: '16px'
                            }}>
                                {unreadCount > 9 ? '+9' : unreadCount}
                            </span>
                        )}
                    </div>
                    <span>الإشعارات</span>
                </button>
                <button
                    className={`mobile-nav-item ${isMobileMenuOpen ? 'active' : ''}`}
                    onClick={toggleMobileMenu}
                >
                    <Menu size={22} />
                    <span>المزيد</span>
                </button>
            </div>


            <Head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
                <link href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700&display=swap" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fustat:wght@400;500;600;700&family=Noto+Kufi+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
                <link rel="icon" href="/logo.png" />
            </Head>

            <header className="header" suppressHydrationWarning style={{ display: 'block', visibility: 'visible', opacity: 1 }}>
                {/* Mobile App Header (Sticky Top) */}
                <div className="mobile-app-header">
                    <div className="mobile-app-brand">
                        <Link href={router.pathname === '/' ? '/' : '/dashboard'}>
                            <a style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                                <Logo height="40px" />
                            </a>
                        </Link>
                    </div>

                    <div className="mobile-app-actions">
                        {/* Back Button for mobile/iPad navigation */}
                        {shouldShowBackButton && (
                            <button
                                className="mobile-back-button"
                                onClick={() => router.back()}
                                aria-label="رجوع"
                            >
                                <ChevronLeft size={22} />
                            </button>
                        )}
                    </div>
                </div>

                <nav className="main-nav standard-header">
                    {/* Hamburger Menu for Mobile */}
                    <button
                        className="mobile-menu-toggle"
                        onClick={toggleMobileMenu}
                        aria-label="Toggle Menu"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    {/* Left Side - Logo and Office Info */}
                    <div className="nav-left-section">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {/* Back Button - Only visible on iPad */}
                            {shouldShowBackButton && (
                                <button
                                    className="ipad-back-button"
                                    onClick={() => router.back()}
                                    aria-label="رجوع"
                                    style={{
                                        display: 'none',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: '#F8FAFC',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '8px',
                                        padding: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        color: '#64748B'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#E2E8F0';
                                        e.currentTarget.style.color = '#1E293B';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#F8FAFC';
                                        e.currentTarget.style.color = '#64748B';
                                    }}
                                >
                                    <ChevronLeft size={20} />
                                </button>
                            )}
                            {/* Logo */}
                            <Link href={router.pathname === '/' ? '/' : '/dashboard'}>
                                <a className="brand-logo-inline" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                                    <Logo height="46px" />
                                </a>
                            </Link>

                            {/* Office Name with Username */}
                            <span
                                className="office-text"
                                style={{
                                    fontFamily: "'Cairo', sans-serif",
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    color: '#1f2937',
                                    whiteSpace: 'nowrap',
                                    opacity: loadingOfficeSettings ? 0.7 : 1,
                                    transition: 'opacity 0.3s ease-in-out',
                                    marginRight: '8px'
                                }}
                                suppressHydrationWarning
                            >
                                {(() => {
                                    // prioritize loaded or cached data to prevent flicker
                                    const username = userData?.lawyerName;
                                    const jobTitle = userJobTitle;

                                    // Always show lawyer name if available
                                    if (username && username.trim() !== '') {
                                        if (jobTitle && jobTitle.trim() !== '') {
                                            return `${jobTitle}: ${username}`;
                                        }
                                        return username;
                                    }

                                    if (jobTitle && jobTitle.trim() !== '') {
                                        return jobTitle;
                                    }

                                    // only show default if nothing is loaded or cached after mount
                                    return 'مكتب المحامي';
                                })()}
                            </span>
                        </div>
                    </div>
                    {/* Mobile Menu Overlay */}
                    {isMobileMenuOpen && (
                        <div 
                            className="mobile-menu-overlay"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                    )}

                    {/* Navigation Links */}
                    <div className={`nav-links ${isMobileMenuOpen ? 'mobile-show' : ''}`}>
                        {/* Mobile User Profile Section */}
                        <div className="mobile-user-profile-section">
                            <div className="mobile-user-details-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="mobile-user-info">
                                    <span className="mobile-username" suppressHydrationWarning>{userData.lawyerName || 'المحامي'}</span>
                                    <span className="mobile-user-role" suppressHydrationWarning>{userJobTitle || 'محامي'}</span>
                                </div>
                            </div>
                            <button className="mobile-menu-close" onClick={() => setIsMobileMenuOpen(false)}>
                                <X size={20} color="#64748b" />
                            </button>
                        </div>

                        {/* Home - Always visible */}
                        <Link href={isLoggedIn ? "/dashboard" : "/"}>
                            <a
                                className={`nav-link-vertical ${activeNavItem === "/dashboard" || router.pathname === "/dashboard" || router.pathname === "/" ? "nav-link-active" : ""}`}
                                onClick={() => handleNavClick("/dashboard")}
                                aria-label="الرئيسية"
                            >
                                <div className="nav-icon-container">
                                    <Home className="nav-icon" size={20} />
                                </div>
                                <span className="nav-label">الرئيسية</span>
                            </a>
                        </Link>

                        {/* Cases - requires can_add_cases or can_edit_cases */}
                        {(!mounted || !userPermissions || userPermissions.can_add_cases || userPermissions.can_edit_cases) && (
                            <Link href="/cases/CasesTable">
                                <a
                                    className={`nav-link-vertical ${activeNavItem === '/cases/CasesTable' || router.pathname === '/cases/CasesTable' || (router.pathname.startsWith('/cases/') && router.pathname !== '/cases/sessions') ? "nav-link-active" : ""}`}
                                    onClick={() => handleNavClick('/cases/CasesTable')}
                                >
                                    <div className="nav-icon-container">
                                        <Scale className="nav-icon" size={20} />
                                    </div>
                                    <span className="nav-label">القضايا</span>
                                </a>
                            </Link>
                        )}

                        {/* Legal Services - Always visible */}
                        <Link href="/services/legal-services">
                            <a
                                className={`nav-link-vertical ${activeNavItem === "/services/legal-services" || router.pathname === "/services/legal-services" || router.pathname.startsWith("/services/legal-services/") ? "nav-link-active" : ""}`}
                                onClick={() => handleNavClick("/services/legal-services")}
                                aria-label="الخدمات"
                            >
                                <div className="nav-icon-container">
                                    <Sparkles className="nav-icon" size={20} />
                                </div>
                                <span className="nav-label">الخدمات</span>
                            </a>
                        </Link>

                        {/* Clients - requires can_view_clients */}
                        {(!mounted || !userPermissions || userPermissions.can_view_clients) && (
                            <Link href="/client/all_clients">
                                <a
                                    className={`nav-link-vertical ${activeNavItem === "/client/all_clients" || router.pathname === "/client/all_clients" || router.pathname.startsWith("/client/") ? "nav-link-active" : ""}`}
                                    onClick={() => handleNavClick("/client/all_clients")}
                                >
                                    <div className="nav-icon-container">
                                        <UserCircle className="nav-icon" size={20} />
                                    </div>
                                    <span className="nav-label">الموكلين</span>
                                </a>
                            </Link>
                        )}

                        {/* Sessions - requires can_edit_cases */}
                        {(!mounted || !userPermissions || userPermissions.can_edit_cases) && (
                            <Link href="/cases/sessions">
                                <a
                                    className={`nav-link-vertical ${activeNavItem === "/cases/sessions" || router.pathname === "/cases/sessions" ? "nav-link-active" : ""}`}
                                    onClick={() => handleNavClick("/cases/sessions")}
                                >
                                    <div className="nav-icon-container">
                                        <CalendarClock className="nav-icon" size={20} />
                                    </div>
                                    <span className="nav-label">الجلسات</span>
                                </a>
                            </Link>
                        )}

                        {/* Reports - requires can_edit_cases or can_view_setting */}
                        {(!mounted || !userPermissions || userPermissions.can_edit_cases || userPermissions.can_view_setting) && (
                            <Link href="/reports">
                                <a
                                    className={`nav-link-vertical ${activeNavItem === "/reports" || router.pathname === "/reports" || router.pathname.startsWith("/reports/") ? "nav-link-active" : ""}`}
                                    onClick={() => handleNavClick("/reports")}
                                >
                                    <div className="nav-icon-container">
                                        <BarChart3 className="nav-icon" size={20} />
                                    </div>
                                    <span className="nav-label">التقارير</span>
                                </a>
                            </Link>
                        )}

                        {/* Accounting - requires can_view_clients */}
                        {(!mounted || !userPermissions || userPermissions.can_view_clients) && (
                            <Link href="/accounting/accounting">
                                <a
                                    className={`nav-link-vertical ${activeNavItem === "/accounting/accounting" || router.pathname === "/accounting/accounting" || router.pathname.startsWith("/accounting/") ? "nav-link-active" : ""}`}
                                    onClick={() => handleNavClick("/accounting/accounting")}
                                >
                                    <div className="nav-icon-container">
                                        <Receipt className="nav-icon" size={20} />
                                    </div>
                                    <span className="nav-label">المحاسبة</span>
                                </a>
                            </Link>
                        )}

                        {/* Calendar - requires can_edit_cases */}
                        {(!mounted || !userPermissions || userPermissions.can_edit_cases) && (
                            <Link href="/calendar">
                                <a
                                    className={`nav-link-vertical ${activeNavItem === "/calendar" || router.pathname === "/calendar" || router.pathname.startsWith("/calendar/") ? "nav-link-active" : ""}`}
                                    onClick={() => handleNavClick("/calendar")}
                                >
                                    <div className="nav-icon-container">
                                        <CalendarDays className="nav-icon" size={20} />
                                    </div>
                                    <span className="nav-label">التقويم</span>
                                </a>
                            </Link>
                        )}

                        {/* Tasks - requires can_edit_cases */}
                        {(!mounted || !userPermissions || userPermissions.can_edit_cases) && (
                            <Link href="/tasks">
                                <a
                                    className={`nav-link-vertical ${activeNavItem === "/tasks" || router.pathname === "/tasks" || router.pathname.startsWith("/tasks/") ? "nav-link-active" : ""}`}
                                    onClick={() => handleNavClick("/tasks")}
                                >
                                    <div className="nav-icon-container">
                                        <ListTodo className="nav-icon" size={20} />
                                    </div>
                                    <span className="nav-label">المهام</span>
                                </a>
                            </Link>
                        )}

                        {/* Templates - requires can_edit_template or can_add_template */}
                        {(!mounted || !userPermissions || userPermissions.can_edit_template || userPermissions.can_add_template) && (
                            <Link href="/templates">
                                <a
                                    className={`nav-link-vertical ${activeNavItem === "/templates" || router.pathname === "/templates" || router.pathname.startsWith("/templates/") ? "nav-link-active" : ""}`}
                                    onClick={() => handleNavClick("/templates")}
                                >
                                    <div className="nav-icon-container">
                                        <FileText className="nav-icon" size={20} />
                                    </div>
                                    <span className="nav-label">الطلبات</span>
                                </a>
                            </Link>
                        )}

                        {/* Lawyers - requires can_add_lawyers */}
                        {(!mounted || !userPermissions || userPermissions.can_add_lawyers) && (
                            <Link href="/lawyer/lawyer">
                                <a
                                    className={`nav-link-vertical ${activeNavItem === "/lawyer/lawyer" || router.pathname === "/lawyer/lawyer" || router.pathname.startsWith("/lawyer/") ? "nav-link-active" : ""}`}
                                    onClick={() => handleNavClick("/lawyer/lawyer")}
                                >
                                    <div className="nav-icon-container">
                                        <UserCircle className="nav-icon" size={20} />
                                    </div>
                                    <span className="nav-label">المحامين</span>
                                </a>
                            </Link>
                        )}

                        {/* Quick Archive - Always visible */}
                        <Link href="/quick-archive">
                            <a
                                className={`nav-link-vertical ${activeNavItem === "/quick-archive" || router.pathname === "/quick-archive" ? "nav-link-active" : ""}`}
                                onClick={() => handleNavClick("/quick-archive")}
                            >
                                <div className="nav-icon-container">
                                    <Archive className="nav-icon" size={20} />
                                </div>
                                <span className="nav-label">الارشفة</span>
                            </a>
                        </Link>

                        <Link href="/help">
                            <a
                                className={`nav-link-vertical ${activeNavItem === "/help" || router.pathname === "/help" ? "nav-link-active" : ""}`}
                                onClick={() => handleNavClick("/help")}
                            >
                                <div className="nav-icon-container">
                                    <HelpCircle className="nav-icon" size={20} />
                                </div>
                                <span className="nav-label">المساعدة</span>
                            </a>
                        </Link>

                        {/* Admin User Requests - Only for super_admin */}
                        {mounted && userRole === 'super_admin' && (
                            <Link href="/admin/user-requests">
                                <a
                                    className={`nav-link-vertical ${activeNavItem === "/admin/user-requests" || router.pathname === "/admin/user-requests" ? "nav-link-active" : ""}`}
                                    onClick={() => handleNavClick("/admin/user-requests")}
                                    style={{ borderRight: '2px solid #dc2626' }}
                                >
                                    <div className="nav-icon-container">
                                        <ShieldCheck className="nav-icon" size={17} style={{ color: '#dc2626' }} />
                                    </div>
                                    <span className="nav-label">طلبات المستخدمين</span>
                                </a>
                            </Link>
                        )}

                        {/* Mobile-only Settings & Account Links */}
                        <div className="mobile-only-section">
                            <div className="mobile-nav-divider"></div>

                            <Link href="/lawyer/my_account">
                                <a
                                    className={`nav-link-vertical ${activeNavItem === "/lawyer/my_account" || router.pathname === "/lawyer/my_account" ? "nav-link-active" : ""}`}
                                    onClick={() => handleNavClick("/lawyer/my_account")}
                                >
                                    <div className="nav-icon-container">
                                        <User className="nav-icon" size={20} />
                                    </div>
                                    <span className="nav-label">حسابي</span>
                                </a>
                            </Link>

                            {(!mounted || !userPermissions || userPermissions.can_view_setting) && (
                                <Link href="/settings/settings">
                                    <a
                                        className={`nav-link-vertical ${activeNavItem === "/settings/settings" || router.pathname === "/settings/settings" ? "nav-link-active" : ""}`}
                                        onClick={() => handleNavClick("/settings/settings")}
                                    >
                                        <div className="nav-icon-container">
                                            <Settings className="nav-icon" size={20} />
                                        </div>
                                        <span className="nav-label">الإعدادات</span>
                                    </a>
                                </Link>
                            )}

                            <button
                                className="nav-link-vertical logout-link-mobile"
                                onClick={handleLogout}
                            >
                                <div className="nav-icon-container logout-icon-wrapper">
                                    <FaSignOutAlt className="nav-icon" size={19} style={{ color: '#ef4444' }} />
                                </div>
                                <span className="nav-label" style={{ color: '#ef4444' }}>تسجيل الخروج</span>
                            </button>
                        </div>
                    </div>

                    {/* Right Side - Profile Button */}
                    <div className="nav-right-section">
                        {/* Notifications Icon */}
                        <div className="notifications-container" ref={notificationsRef}>
                            <button
                                className={`notifications-button ${isNotificationsOpen ? 'active' : ''}`}
                                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                title="الإشعارات"
                            >
                                <div className="nav-icon-container">
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FaBell className="nav-icon" size={18} />
                                        {unreadCount > 0 && (
                                            <span className="notification-badge">{unreadCount > 9 ? '+9' : unreadCount}</span>
                                        )}
                                    </div>
                                </div>
                                <span className="nav-label">الإشعارات</span>
                            </button>

                            {isNotificationsOpen && (
                                <div className="notifications-dropdown desktop-only">
                                    <div className="notifications-header">
                                        <span className="notifications-title">الإشعارات</span>
                                        {unreadCount > 0 && (
                                            <button className="mark-all-read" onClick={markAllAsRead}>
                                                تحديد الكل كمقروء
                                            </button>
                                        )}
                                    </div>
                                    <div className="notifications-list">
                                        {notifications.length === 0 ? (
                                            <div className="no-notifications">لا توجد إشعارات حالياً</div>
                                        ) : (
                                            notifications.map((notif) => (
                                                <div
                                                    key={notif.id}
                                                    className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                                                    onClick={() => {
                                                        markAsRead(notif.id);
                                                        setIsNotificationsOpen(false);
                                                        
                                                        let metadata = {};
                                                        try {
                                                            metadata = typeof notif.metadata === 'string' 
                                                                ? JSON.parse(notif.metadata) 
                                                                : (notif.metadata || {});
                                                        } catch (e) {
                                                            console.error("Error parsing notification metadata", e);
                                                        }

                                                        const caseId = metadata.case_id || notif.related_entity_id;
                                                        const caseNum = notif.case_number;

                                                        if (notif.related_entity_type === 'case' && notif.related_entity_id) {
                                                            router.push(`/cases/CaseDetailsPage?caseId=${notif.related_entity_id}`);
                                                        } else if (notif.related_entity_type === 'session') {
                                                            const path = caseId ? `/cases/CaseDetailsPage?caseId=${caseId}&tab=sessions&highlightType=session&highlightId=${notif.related_entity_id}` : `/cases/sessions`;
                                                            router.push(path);
                                                        } else if (notif.related_entity_type === 'task') {
                                                            if (caseId) {
                                                                router.push(`/cases/CaseDetailsPage?caseId=${caseId}&tab=jobTasks&highlightType=task&highlightId=${notif.related_entity_id}`);
                                                            } else {
                                                                router.push('/tasks');
                                                            }
                                                        } else if (notif.related_entity_type === 'reminder') {
                                                            if (caseId) {
                                                                router.push(`/cases/CaseDetailsPage?caseId=${caseId}&tab=reminders&reminderId=${notif.related_entity_id}`);
                                                            } else {
                                                                router.push('/calendar');
                                                            }
                                                        } else if (caseNum) {
                                                            router.push(`/cases/CaseDetailsPage?caseNumber=${caseNum}`);
                                                        }
                                                    }}
                                                >
                                                    <div className="notification-icon-wrapper">
                                                        <FaBell size={16} />
                                                    </div>
                                                    <div className="notification-content">
                                                        <div className="notification-item-title">{notif.title}</div>
                                                        <div className="notification-message">{notif.message}</div>
                                                        <div className="notification-date">
                                                            {new Date(notif.created_at).toLocaleString('ar-IQ')}
                                                        </div>
                                                    </div>
                                                    {!notif.is_read && <div className="unread-indicator"></div>}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    {notifications.length > 0 && (
                                        <div className="notifications-footer">
                                            <button className="clear-notifications" onClick={markAllAsRead}>مسح الكل</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Profile Button with Dropdown - Always visible, positioned on the left side */}
                        <button
                            ref={profileButtonRef}
                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                            className="profile-button"
                            title="الملف الشخصي"
                            aria-label="الملف الشخصي"
                        >
                            <div className="profile-avatar-container" suppressHydrationWarning>
                                {!mounted ? (
                                    <div className="profile-avatar-placeholder">
                                        <LayoutGrid className="profile-avatar-icon" size={20} />
                                    </div>
                                ) : officeSettings.office_logo_url ? (
                                    <img
                                        src={officeSettings.office_logo_url}
                                        alt="شعار المحامي"
                                        className="profile-avatar-image"
                                    />
                                ) : (
                                    <div className="profile-avatar-placeholder">
                                        <LayoutGrid className="profile-avatar-icon" size={20} />
                                    </div>
                                )}
                            </div>
                            <FaChevronDown className={`profile-chevron ${isProfileDropdownOpen ? 'open' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isProfileDropdownOpen && (
                            <div
                                className="profile-dropdown"
                                ref={profileDropdownRef}
                                style={{
                                    top: `${dropdownPosition.top}px`,
                                    right: `${dropdownPosition.right}px`
                                }}
                            >
                                <div className="profile-dropdown-content">
                                    <div className="profile-dropdown-menu">
                                        <div className="profile-dropdown-section">
                                            <Link href="/lawyer/my_account">
                                                <a
                                                    className="profile-dropdown-item"
                                                    onClick={() => setIsProfileDropdownOpen(false)}
                                                >
                                                    <div className="profile-dropdown-item-content">
                                                        <span className="profile-dropdown-item-text"><FaInfoCircle className="profile-dropdown-title-icon icon-blue" size={14} /> حسابي</span>
                                                        <span className="profile-dropdown-item-desc">إدارة الملف الشخصي</span>
                                                    </div>
                                                </a>
                                            </Link>
                                        </div>

                                        {(!mounted || !userPermissions || userPermissions.can_view_setting) && (
                                            <div className="profile-dropdown-section">
                                                <Link href="/settings/settings">
                                                    <a
                                                        className="profile-dropdown-item"
                                                        onClick={() => setIsProfileDropdownOpen(false)}
                                                    >
                                                        <div className="profile-dropdown-item-content">
                                                            <span className="profile-dropdown-item-text"><HiOutlineCog className="profile-dropdown-title-icon icon-purple" size={14} /> جميع الإعدادات</span>
                                                            <span className="profile-dropdown-item-desc">التحكم بالبرنامج والخيارات</span>
                                                        </div>
                                                    </a>
                                                </Link>
                                            </div>
                                        )}

                                        <Link href="/settings/subscription/">
                                            <a
                                                className="profile-dropdown-item"
                                                onClick={() => setIsProfileDropdownOpen(false)}
                                            >
                                                <div className="profile-dropdown-item-content">
                                                    <span className="profile-dropdown-item-text"><HiOutlineShoppingCart className="profile-dropdown-title-icon icon-green" size={14} /> إدارة الاشتراك والباقة</span>
                                                </div>
                                            </a>
                                        </Link>

                                        <div className="profile-dropdown-divider"></div>

                                        <button
                                            className="profile-dropdown-item logout-item"
                                            onClick={handleLogout}
                                        >
                                            <div className="profile-dropdown-item-content">
                                                <span className="profile-dropdown-item-text"><FaSignOutAlt className="profile-dropdown-title-icon icon-red" size={14} /> تسجيل الخروج</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </nav>
                <div className="header-action-bar" suppressHydrationWarning>
                    <div className="action-bar-right" ref={globalSearchRef}>
                        <div className="global-search-container">
                            <input
                                type="text"
                                placeholder="البحث في القضايا، الموكلين، المستندات..."
                                className="global-search-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => { if (searchQuery.trim()) setShowGlobalSearchResults(true); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleGlobalSearch(searchQuery); }}
                            />
                            <button className="global-search-btn" type="button" onClick={() => handleGlobalSearch(searchQuery)}>
                                <Search size={18} />
                            </button>
                        </div>
                        <button className="global-search-text-btn" type="button" onClick={() => handleGlobalSearch(searchQuery)}>
                            بحث
                        </button>
                            {showGlobalSearchResults && (
                                <div className="global-search-dropdown">
                                    {isGlobalSearching ? (
                                        <div className="global-search-loading">جاري البحث...</div>
                                    ) : (
                                        <>
                                            {globalSearchResults.cases.length > 0 && (
                                                <div className="global-search-category">
                                                    <div className="global-search-category-title"><Briefcase size={14} /> القضايا ({globalSearchResults.cases.length})</div>
                                                    {globalSearchResults.cases.map(item => (
                                                        <div key={item.id} className="global-search-item" onClick={() => { router.push(`/cases/CaseDetailsPage?caseId=${item.id}`); setShowGlobalSearchResults(false); setSearchQuery(''); }}>
                                                            <span className="global-search-item-title">{item.case_number}</span>
                                                            <span className="global-search-item-sub">{item.client_name} {item.caseType ? `- ${item.caseType}` : ''}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {globalSearchResults.clients.length > 0 && (
                                                <div className="global-search-category">
                                                    <div className="global-search-category-title"><Users size={14} /> الموكلين ({globalSearchResults.clients.length})</div>
                                                    {globalSearchResults.clients.map(item => (
                                                        <div key={item.id} className="global-search-item" onClick={() => { router.push(`/client/client_details?id=${item.id}`); setShowGlobalSearchResults(false); setSearchQuery(''); }}>
                                                            <span className="global-search-item-title">{item.client_name}</span>
                                                            <span className="global-search-item-sub">{item.legal_form || ''} {item.client_phone ? `- ${item.client_phone}` : ''}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {globalSearchResults.sessions.length > 0 && (
                                                <div className="global-search-category">
                                                    <div className="global-search-category-title"><Calendar size={14} /> الجلسات ({globalSearchResults.sessions.length})</div>
                                                    {globalSearchResults.sessions.map(item => (
                                                        <div key={item.id} className="global-search-item" onClick={() => { router.push(item.case_number ? `/cases/CaseDetailsPage?caseNumber=${item.case_number}&tab=sessions` : '/cases/sessions'); setShowGlobalSearchResults(false); setSearchQuery(''); }}>
                                                            <span className="global-search-item-title">{item.sessionname || `جلسة ${item.case_number || ''}`}</span>
                                                            <span className="global-search-item-sub">{item.case_number ? `دعوى ${item.case_number}` : ''} {item.sessiondate ? `- ${new Date(item.sessiondate).toLocaleDateString('ar-EG')}` : ''}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {globalSearchResults.tasks.length > 0 && (
                                                <div className="global-search-category">
                                                    <div className="global-search-category-title"><FileText size={14} /> المهام ({globalSearchResults.tasks.length})</div>
                                                    {globalSearchResults.tasks.map(item => (
                                                        <div key={item.id} className="global-search-item" onClick={() => { router.push(item.task_case ? `/cases/CaseDetailsPage?caseNumber=${item.task_case}&tab=jobTasks` : '/dashboard'); setShowGlobalSearchResults(false); setSearchQuery(''); }}>
                                                            <span className="global-search-item-title">{item.task_title || 'مهمة'}</span>
                                                            <span className="global-search-item-sub">{item.task_case ? `دعوى ${item.task_case}` : ''} {item.task_status ? `- ${item.task_status}` : ''}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {globalSearchResults.templates.length > 0 && (
                                                <div className="global-search-category">
                                                    <div className="global-search-category-title"><FileEdit size={14} /> النماذج ({globalSearchResults.templates.length})</div>
                                                    {globalSearchResults.templates.map(item => (
                                                        <div key={item.id} className="global-search-item" onClick={() => { router.push(`/templates/${encodeURIComponent(item.file_name)}`); setShowGlobalSearchResults(false); setSearchQuery(''); }}>
                                                            <span className="global-search-item-title">{item.display_title || item.file_name}</span>
                                                            <span className="global-search-item-sub">{item.content ? item.content.replace(/<[^>]+>/g, ' ').substring(0, 60) + '...' : 'نموذج'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {globalSearchResults.decisions.length > 0 && (
                                                <div className="global-search-category">
                                                    <div className="global-search-category-title"><Gavel size={14} /> القرارات التمييزية ({globalSearchResults.decisions.length})</div>
                                                    {globalSearchResults.decisions.map(item => (
                                                        <div key={item.id} className="global-search-item" onClick={() => { router.push(`/decisions/${item.id}`); setShowGlobalSearchResults(false); setSearchQuery(''); }}>
                                                            <span className="global-search-item-title">{item.title}</span>
                                                            <span className="global-search-item-sub">{item.decision_number ? `رقم ${item.decision_number}` : ''} {item.category ? `- ${item.category}` : ''} {item.decision_date ? `- ${new Date(item.decision_date).toLocaleDateString('ar-EG')}` : ''}</span>
                                                            {item.description && <span className="global-search-item-sub" style={{ marginTop: '2px', color: '#94a3b8' }}>{item.description.replace(/جمهورية العراق/g, '').substring(0, 80).trim()}...</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {!globalSearchResults.cases.length && !globalSearchResults.clients.length && !globalSearchResults.sessions.length && !globalSearchResults.tasks.length && !globalSearchResults.templates.length && !globalSearchResults.decisions.length && (
                                                <div className="global-search-empty">
                                                    <Search size={28} />
                                                    <span>لا توجد نتائج مطابقة</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    <div className="action-bar-left">
                        <a className="action-btn" onClick={handleAddCaseClick} style={{ cursor: 'pointer', background: '#3B82F6', color: 'white', boxShadow: 'none' }}>
                            <Scale size={15} /> قضية جديدة
                        </a>
                        <Link href="/client/add_cl">
                            <a className="action-btn" style={{ background: '#10B981', color: 'white', boxShadow: 'none' }}>
                                <UserPlus size={15} /> موكل جديد
                            </a>
                        </Link>
                        <Link href="/laws">
                            <a className="action-btn" style={{ background: '#8B5CF6', color: 'white', boxShadow: 'none' }}>
                                <BookOpen size={15} /> القوانين العراقية
                            </a>
                        </Link>
                        <Link href="/lawyer/lawyer">
                            <a className="action-btn" style={{ background: '#6B7280', color: 'white', boxShadow: 'none' }}>
                                <Plus size={15} /> محامي جديد
                            </a>
                        </Link>
                        <Link href="/decisions">
                            <a className="action-btn" style={{ background: '#EC4899', color: 'white', boxShadow: 'none' }}>
                                <Sparkles size={15} /> قرارات تمييزية
                            </a>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="main-content">
                {/* Mobile Search Bar - Visible only on dashboard and phone (not tablets) */}
                {(router.pathname === '/' || router.pathname === '/dashboard') && isMobilePhone && (
                    <div className="mobile-search-bar-wrapper" style={{ padding: '8px 12px 0px 12px', marginBottom: '8px' }}>
                        <div className="mobile-search-row">
                            <div className="mobile-search-input-wrap">
                                <FaSearch className="mobile-search-icon" />
                                <input
                                    type="text"
                                    className="mobile-search-input"
                                    placeholder="ابحث في القضايا والجلسات والمهام"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => { if (searchQuery.trim()) setShowGlobalSearchResults(true); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleGlobalSearch(searchQuery); }}
                                    dir="rtl"
                                />
                            </div>
                            <button
                                type="button"
                                className="mobile-search-submit-btn"
                                onClick={() => handleGlobalSearch(searchQuery)}
                            >
                                بحث
                            </button>
                        </div>
                    </div>
                )}

                {/* Mobile Quick Actions - 6 buttons in 3 columns grid - Visible only on dashboard and phone (not tablets) */}
                {(router.pathname === '/' || router.pathname === '/dashboard') && isMobilePhone && (
                    <div id="mobile-quick-actions" className="mobile-quick-actions-grid-premium">
                        <Link href="/services/legal-services">
                            <a className="mobile-action-btn mobile-action-btn--stacked btn-live-indigo">
                                <span className="mobile-action-btn-icon" aria-hidden><FileText size={18} strokeWidth={2.25} /></span>
                                <span className="mobile-action-label">طلب جديد</span>
                            </a>
                        </Link>
                        <Link href="/laws">
                            <a className="mobile-action-btn mobile-action-btn--stacked btn-live-blue">
                                <span className="mobile-action-btn-icon" aria-hidden><Scale size={18} strokeWidth={2.25} /></span>
                                <span className="mobile-action-label">القوانين العراقية</span>
                            </a>
                        </Link>
                        <Link href="/client/add_cl">
                            <a className="mobile-action-btn mobile-action-btn--stacked btn-live-cyan">
                                <span className="mobile-action-btn-icon" aria-hidden><UserPlus size={18} strokeWidth={2.25} /></span>
                                <span className="mobile-action-label">موكل جديد</span>
                            </a>
                        </Link>
                        <a className="mobile-action-btn mobile-action-btn--stacked btn-live-magenta" onClick={handleAddCaseClick}>
                            <span className="mobile-action-btn-icon" aria-hidden><Briefcase size={18} strokeWidth={2.25} /></span>
                            <span className="mobile-action-label">قضية جديدة</span>
                        </a>
                        <Link href="/decisions">
                            <a className="mobile-action-btn mobile-action-btn--stacked btn-live-violet">
                                <span className="mobile-action-btn-icon" aria-hidden><Gavel size={18} strokeWidth={2.25} /></span>
                                <span className="mobile-action-label">قرارات تمييزية</span>
                            </a>
                        </Link>
                        <Link href="/quick-archive">
                            <a className="mobile-action-btn mobile-action-btn--stacked btn-live-slate">
                                <span className="mobile-action-btn-icon" aria-hidden><FileEdit size={18} strokeWidth={2.25} /></span>
                                <span className="mobile-action-label">أرشفة الكترونية</span>
                            </a>
                        </Link>
                    </div>
                )}

                {children}
            </main>

            {/* Mobile-Only Notifications Portal - Bottom Sheet Style */}
            {isNotificationsOpen && (
                <div 
                    className="notifications-portal-overlay mobile-only"
                    onClick={() => setIsNotificationsOpen(false)}
                >
                    <div 
                        className="notifications-dropdown-container"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="notifications-header">
                            <span className="notifications-title">الإشعارات</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {unreadCount > 0 && (
                                    <button className="mark-all-read" onClick={markAllAsRead}>
                                        تحديد الكل كمقروء
                                    </button>
                                )}
                                <button className="mobile-only close-notifications" onClick={() => setIsNotificationsOpen(false)}>
                                    إغلاق
                                </button>
                            </div>
                        </div>
                        <div className="notifications-list">
                            {notifications.length === 0 ? (
                                <div className="no-notifications">لا توجد إشعارات حالياً</div>
                            ) : (
                                notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                                        onClick={() => {
                                            markAsRead(notif.id);
                                            setIsNotificationsOpen(false);
                                            
                                            let metadata = {};
                                            try {
                                                metadata = typeof notif.metadata === 'string' 
                                                    ? JSON.parse(notif.metadata) 
                                                    : (notif.metadata || {});
                                            } catch (e) {
                                                console.error("Error parsing notification metadata", e);
                                            }

                                            const caseId = metadata.case_id || notif.related_entity_id;
                                            const caseNum = notif.case_number;

                                            if (notif.related_entity_type === 'case' && notif.related_entity_id) {
                                                router.push(`/cases/CaseDetailsPage?caseId=${notif.related_entity_id}`);
                                            } else if (notif.related_entity_type === 'session') {
                                                const path = caseId ? `/cases/CaseDetailsPage?caseId=${caseId}&tab=sessions&highlightType=session&highlightId=${notif.related_entity_id}` : `/cases/sessions`;
                                                router.push(path);
                                            } else if (notif.related_entity_type === 'task') {
                                                if (caseId) {
                                                    router.push(`/cases/CaseDetailsPage?caseId=${caseId}&tab=jobTasks&highlightType=task&highlightId=${notif.related_entity_id}`);
                                                } else {
                                                    router.push('/tasks');
                                                }
                                            } else if (notif.related_entity_type === 'reminder') {
                                                if (caseId) {
                                                    router.push(`/cases/CaseDetailsPage?caseId=${caseId}&tab=reminders&reminderId=${notif.related_entity_id}`);
                                                } else {
                                                    router.push('/calendar');
                                                }
                                            } else if (caseNum) {
                                                router.push(`/cases/CaseDetailsPage?caseNumber=${caseNum}`);
                                            }
                                        }}
                                    >
                                        <div className="notification-icon-wrapper">
                                            <FaBell size={16} />
                                        </div>
                                        <div className="notification-content">
                                            <div className="notification-item-title">{notif.title}</div>
                                            <div className="notification-message">{notif.message}</div>
                                            <div className="notification-date">
                                                {new Date(notif.created_at).toLocaleString('ar-IQ')}
                                            </div>
                                        </div>
                                        {!notif.is_read && <div className="unread-indicator"></div>}
                                    </div>
                                ))
                            )}
                        </div>
                        {notifications.length > 0 && (
                            <div className="notifications-footer">
                                <button className="clear-notifications" onClick={markAllAsRead}>مسح الكل</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showClientRequiredMsg && (
                <div className="client-required-overlay">
                    <div className="client-required-modal">
                        <div className="client-required-icon">⚠️</div>
                        <h3>يرجى إضافة موكل أولاً</h3>
                        <p>يجب إضافة موكل واحد على الأقل قبل البدء بإضافة القضايا. جاري تحويلك لصفحة إضافة موكل...</p>
                    </div>
                </div>
            )}

            <style jsx global>{`
                /* Global Styles */
                :root {
                    --primary-color: #0039cb;
                    --primary-hover: #0033b3;
                    --text-color: #1a1a1a;
                    --text-muted: #666;
                    --border-color: #e5e7eb;
                    --bg-hover: rgba(255,255,255,0.1);
                    --success: #22c55e;
                    --warning: #f59e0b;
                    --danger: #ef4444;
                    --info: #3b82f6;
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                html {
                    overflow-x: hidden; /* Prevent horizontal scrollbar */
                    overflow-y: scroll; /* Force vertical scrollbar to prevent layout shift */
                    width: 100%;
                }

                body {
                    font-family: 'Cairo', 'Almarai', sans-serif;
                    /* Light gray-blue background matching design */
                    background: #F1F5F9;
                    color: var(--text-color);
                    line-height: 1.5;
                    overflow-x: hidden; /* Prevent horizontal scrollbar */
                    width: 100%;
                }

                .layout-container {
                    min-height: 100vh;
                    width: 100%;
                    overflow-x: hidden; /* Prevent horizontal scrollbar */
                    /* Light gray-blue background matching design */
                    background: #F1F5F9;
                    position: relative;
                }

                .header {
                    background: #ffffff !important;
                    color: #1a1a1a;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
                    width: 100%;
                    overflow: visible;
                    border-bottom: 1px solid #e5e7eb;
                    position: relative !important;
                    width: 100% !important;
                    z-index: 1000 !important;
                    border-radius: 0;
                    padding: 0;
                    height: auto !important;
                    min-height: 52px !important;
                    margin: 0;
                    box-sizing: border-box;
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                }

                .mobile-app-header {
                    display: none;
                }

                .header-top {
                    display: none; /* Hide header-top since everything is in main-nav now */
                }

                .header-action-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 64px; /* Increased gap from 48px */
                    padding: 16px 16px 12px 16px;
                    width: 100%;
                    box-sizing: border-box;
                    direction: rtl;
                    background: transparent;
                    border-radius: 0;
                    margin-bottom: 0;
                    border-top: 1px solid rgba(226, 232, 240, 0.4);
                    box-shadow: none;
                }

                .action-bar-right {
                    flex: 1;
                    width: 100%;
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .global-search-text-btn {
                    height: 36px;
                    padding: 0 20px;
                    background: #2563eb;
                    color: #ffffff;
                    border: none;
                    border-radius: 10px;
                    font-family: 'Cairo', sans-serif;
                    font-size: 14px;
                    font-weight: 700;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: background 0.2s ease;
                    flex-shrink: 0;
                }

                .global-search-text-btn:hover {
                    background: #1d4ed8;
                }

                .global-search-dropdown {
                    position: absolute;
                    top: calc(100% + 8px);
                    right: 0;
                    left: 0;
                    background: #ffffff;
                    border-radius: 14px;
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06);
                    border: 1px solid #e2e8f0;
                    z-index: 9999;
                    max-height: 480px;
                    overflow-y: auto;
                    padding: 8px;
                    direction: rtl;
                    animation: globalSearchSlideDown 0.2s ease-out;
                }

                @keyframes globalSearchSlideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .global-search-loading {
                    padding: 32px 20px;
                    text-align: center;
                    color: #64748b;
                    font-weight: 600;
                    font-family: 'Cairo', sans-serif;
                    font-size: 14px;
                }

                .global-search-empty {
                    padding: 40px 20px;
                    text-align: center;
                    color: #94a3b8;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                    font-family: 'Cairo', sans-serif;
                    font-size: 14px;
                    font-weight: 500;
                }

                .global-search-category {
                    margin-bottom: 4px;
                }

                .global-search-category-title {
                    padding: 8px 12px;
                    font-size: 12px;
                    font-weight: 800;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-family: 'Cairo', sans-serif;
                    border-bottom: 1px solid #f1f5f9;
                }

                .global-search-item {
                    padding: 10px 14px;
                    border-radius: 10px;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    transition: background 0.15s ease;
                }

                .global-search-item:hover {
                    background: #f1f5f9;
                }

                .global-search-item-title {
                    font-size: 14px;
                    font-weight: 700;
                    color: #0f172a;
                    font-family: 'Cairo', sans-serif;
                }

                .global-search-item-sub {
                    font-size: 12px;
                    color: #64748b;
                    font-family: 'Cairo', sans-serif;
                }

                .global-search-container {
                    position: relative;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    direction: ltr;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 12px;
                    overflow: hidden;
                    background: #ffffff;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                }

                .global-search-container:focus-within {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .global-search-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 42px;
                    height: 34px;
                    background: #2563eb;
                    border: none;
                    cursor: pointer;
                    color: #ffffff;
                    flex-shrink: 0;
                    border-radius: 10px;
                    margin: 2px;
                    transition: background 0.2s ease;
                }

                .global-search-btn:hover {
                    background: #1d4ed8;
                }

                .global-search-input {
                    flex: 1;
                    height: 34px;
                    padding: 0 16px;
                    border: none;
                    background: transparent;
                    font-family: 'Cairo', sans-serif;
                    font-size: 14px;
                    font-weight: 500;
                    color: #1E293B;
                    outline: none;
                    text-align: right;
                    direction: rtl;
                }

                .global-search-input::placeholder {
                    color: #94A3B8;
                    font-weight: 400;
                }

                .global-search-input:hover {
                    background: transparent;
                }

                .global-search-input:focus {
                    background: transparent;
                    border-color: transparent;
                    box-shadow: none;
                }

                .action-bar-left {
                    display: flex;
                    align-items: center;
                    gap: 16px; /* Increased gap from 10px */
                    flex-shrink: 0;
                }

                .action-bar-left .action-btn:hover {
                    box-shadow: none;
                    transform: none;
                }

                .action-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    height: 36px;
                    padding: 0 14px;
                    border-radius: 10px;
                    font-family: 'Cairo', sans-serif;
                    font-size: 13px;
                    font-weight: 700;
                    text-decoration: none;
                    cursor: pointer;
                    border: none;
                }


                .btn-blue {
                    background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                    border: none;
                }


                .btn-green {
                    background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                    border: none;
                }


                .btn-blue-light {
                    background: linear-gradient(135deg, #06B6D4 0%, #0891B2 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
                    border: none;
                }


                .btn-purple {
                    background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
                    border: none;
                }


                .btn-teal {
                    background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
                    border: none;
                }


                .btn-rose {
                    background: linear-gradient(135deg, #F43F5E 0%, #E11D48 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(244, 63, 94, 0.3);
                    border: none;
                }


                .notifications-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .nav-notification-btn {
                    position: relative;
                    background: transparent;
                    border: none;
                    color: #64748B;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }

                .notification-badge {
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

                .notifications-dropdown {
                    position: absolute;
                    top: calc(100% + 12px);
                    left: 0;
                    width: 360px;
                    background: #ffffff;
                    border-radius: 16px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
                    border: 1px solid #E2E8F0;
                    z-index: 1000;
                    overflow: hidden;
                    animation: dropdownFadeIn 0.2s ease;
                    display: flex;
                    flex-direction: column;
                }

                .notifications-header {
                    padding: 16px;
                    border-bottom: 1px solid #F1F5F9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #F8FAFC;
                }

                .notifications-title {
                    font-weight: 700;
                    font-size: 16px;
                    color: #1E293B;
                }

                .mark-all-read {
                    background: transparent;
                    border: none;
                    color: #2563EB;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 4px;
                    transition: background 0.2s;
                }

                .mark-all-read:hover {
                    background: rgba(37, 99, 235, 0.1);
                }

                .notifications-list {
                    max-height: 400px;
                    overflow-y: auto;
                }

                .no-notifications {
                    padding: 40px 20px;
                    text-align: center;
                    color: #94A3B8;
                    font-size: 14px;
                }

                .notification-item {
                    display: flex;
                    gap: 12px;
                    padding: 16px;
                    border-bottom: 1px solid #F1F5F9;
                    cursor: pointer;
                    transition: all 0.2s;
                    position: relative;
                    pointer-events: auto; /* Ensure clickable */
                    z-index: 10;
                }

                .notification-item:hover {
                    background: transparent;
                }

                .notification-item.unread {
                    background: #F0F7FF;
                }

                .notification-item.unread:hover {
                    background: #F0F7FF; /* Keep the unread color but remove the hover change */
                }

                .notification-icon-wrapper {
                    width: 36px;
                    height: 36px;
                    background: #F1F5F9;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #64748B;
                    flex-shrink: 0;
                }

                .unread .notification-icon-wrapper {
                    background: #2563EB;
                    color: #ffffff;
                }

                .notification-content {
                    flex: 1;
                    min-width: 0;
                }

                .notification-item-title {
                    font-weight: 600;
                    font-size: 14px;
                    color: #1E293B;
                    margin-bottom: 4px;
                }

                .notification-message {
                    font-size: 13px;
                    color: #64748B;
                    line-height: 1.4;
                    margin-bottom: 8px;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .notification-date {
                    font-size: 11px;
                    color: #94A3B8;
                }

                .unread-indicator {
                    width: 8px;
                    height: 8px;
                    background: #2563EB;
                    border-radius: 50%;
                    position: absolute;
                    top: 16px;
                    left: 16px;
                }

                .notifications-footer {
                    padding: 12px;
                    text-align: center;
                    border-top: 1px solid #F1F5F9;
                    background: #F8FAFC;
                }

                .notifications-footer a {
                    font-size: 13px;
                    font-weight: 600;
                    color: #64748B;
                    text-decoration: none;
                    transition: color 0.2s;
                }

                .notifications-footer a:hover {
                    color: #2563EB;
                }

                .notifications-list::-webkit-scrollbar {
                    width: 6px;
                }

                .notifications-list::-webkit-scrollbar-track {
                    background: transparent;
                }

                .notifications-list::-webkit-scrollbar-thumb {
                    background: #E2E8F0;
                    border-radius: 3px;
                }

                .notifications-list::-webkit-scrollbar-thumb:hover {
                    background: #CBD5E1;
                }

                .clear-notifications {
                    background: transparent;
                    border: none;
                    color: #64748B;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: color 0.2s;
                }

                .clear-notifications:hover {
                    color: #2563EB;
                }

                .user-profile {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .nav-user-profile {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .username {
                    font-weight: 500;
                    font-size: 0.9rem;
                }

                .avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    border: 2px solid rgba(255,255,255,0.2);
                }

                .main-nav {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0 24px; /* Standardize padding */
                    background: transparent;
                    width: 100%;
                    overflow: visible;
                    max-width: 100%;
                    flex-wrap: nowrap;
                    direction: rtl;
                    height: 68px;
                    min-height: 68px;
                    max-height: 68px;
                    position: relative;
                    border-radius: 0;
                    margin: 0;
                    box-sizing: border-box;
                    padding-top: 0;
                    gap: 1rem;
                }

                .mobile-menu-toggle {
                    display: none;
                    background: transparent;
                    border: none;
                    color: #1E3A8A;
                    cursor: pointer;
                    padding: 8px;
                    align-items: center;
                    justify-content: center;
                    z-index: 1100;
                    border-radius: 8px;
                    transition: background 0.2s;
                }

                .mobile-menu-toggle:hover {
                    background: rgba(30, 58, 138, 0.05);
                }

                .nav-links {
                    display: flex;
                    gap: 0;
                    align-items: center;
                    direction: rtl;
                    flex-wrap: nowrap;
                    flex: 1;
                    justify-content: flex-end;
                    overflow: visible;
                    min-width: 0;
                    padding: 0 0.25rem;
                    margin-left: 0;
                    box-sizing: border-box;
                }

                .nav-left-section {
                    display: flex;
                    align-items: center;
                    gap: 34px;
                    flex-shrink: 0;
                    background: transparent;
                    padding: 0;
                    min-width: 420px; /* Wider to preserve bigger logo + text spacing */
                }

                .office-text {
                    display: inline-block;
                    min-width: 150px;
                    margin-right: 18px;
                    transition: all 0.2s ease;
                }

                .nav-right-section {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    flex-shrink: 0;
                    margin-right: 0;
                    margin-left: 0.5rem;
                    background: transparent;
                    z-index: 1001;
                    padding: 0 0.5rem;
                    min-width: fit-content;
                    border-right: none;
                    box-sizing: border-box;
                    position: relative;
                    overflow: visible;
                }

                /* Brand Logo Section */
                .brand-section {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin: 0;
                    padding: 0 0.5rem;
                    flex-shrink: 0;
                    background: #FFFFFF;
                    z-index: 20;
                    border-right: 1px solid #e5e7eb;
                    box-sizing: border-box;
                }

                .brand-logo {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    text-decoration: none;
                    color: #1f2937;
                    transition: opacity 0.2s ease;
                }

                .brand-logo:hover {
                    opacity: 0.8;
                }

                .logo-icon {
                    width: auto;
                    height: 70px;
                    background: transparent;
                    border-radius: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    padding: 0;
                    margin: 0;
                    border: none;
                    box-shadow: none;
                }

                .logo-icon svg {
                    width: auto;
                    height: 100%;
                    display: block;
                    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .logo-icon:hover svg {
                    /* Hover effect removed */
                }

                .brand-name {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #1F2937;
                    white-space: nowrap;
                    letter-spacing: -0.01em;
                    font-family: 'Cairo', 'Almarai', sans-serif;
                }

                /* Vertical Divider */
                .nav-divider {
                    width: 1px;
                    height: 48px;
                    background: #e0e0e0;
                    margin: auto 0.5rem;
                    flex-shrink: 0;
                    align-self: center;
                }

                /* Navigation Links - Horizontal Layout */
                .nav-link-vertical {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    padding: 4px 12px;
                    text-decoration: none;
                    background: transparent;
                    cursor: pointer;
                    user-select: none;
                    -webkit-user-select: none;
                    min-height: 60px;
                    font-family: 'Cairo', sans-serif;
                    box-sizing: border-box;
                    transition: none !important;
                    border-radius: 12px;
                    position: relative;
                }

                .nav-link-vertical:active {
                    transform: none !important;
                }

                .nav-link-vertical.nav-link-active {
                    background: #eff6ff;
                    color: #1d4ed8;
                    font-weight: 600;
                    box-shadow: none;
                }

                .nav-link-vertical:hover:not(.nav-link-active) {
                    background: #f8fafc;
                    transform: none !important;
                }

                .nav-icon-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    transition: none !important;
                    background: transparent;
                }

                .nav-link-vertical.nav-link-active .nav-icon-container {
                    background: #dbeafe;
                    color: #1d4ed8;
                    transform: none !important;
                }

                .nav-link-vertical:hover .nav-icon-container {
                    /* Hover effect removed per request */
                }

                .nav-link-vertical.nav-link-active .nav-icon {
                    color: #1d4ed8;
                    stroke-width: 2;
                }

                .nav-link-vertical:focus {
                    outline: none;
                }

                .nav-link-vertical:focus-visible {
                    outline: 2px solid rgba(255, 255, 255, 0.5);
                    outline-offset: 2px;
                }

                .nav-icon {
                    color: #1f2937;
                    stroke-width: 2;
                    transition: none !important;
                }

                .nav-link-vertical:hover .nav-icon {
                    /* Hover effect removed per request */
                }

                /* Notifications Styling to Match Nav */
                .notifications-button {
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
                    transition: none !important;
                }

                .notifications-button.active {
                    background: #eff6ff;
                }

                .nav-label {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #1f2937;
                    text-align: center;
                    line-height: 1.2;
                    transition: none !important;
                    font-family: 'Cairo', sans-serif;
                }

                .nav-link-vertical.nav-link-active .nav-label {
                    color: #1d4ed8;
                    font-weight: 600;
                }

                .nav-link-vertical:hover .nav-label {
                    /* Hover effect removed per request */
                }

                /* Profile Button */
                .profile-button {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 6px 14px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: none !important;
                    font-family: 'Cairo', sans-serif;
                    box-sizing: border-box;
                    position: relative;
                    color: #1a1a1a;
                    font-size: 14px;
                    font-weight: 600;
                }

                .profile-button:hover {
                    background: #f1f5f9;
                    border-color: #cbd5e1;
                    transform: none !important;
                }

                .profile-avatar-container {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    overflow: hidden;
                    flex-shrink: 0;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid #ffffff;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                }

                .profile-avatar-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .profile-avatar-placeholder {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .profile-avatar-icon {
                    color: #64748B;
                }

                .profile-chevron {
                    color: #64748B;
                    font-size: 12px;
                    transition: all 0.3s ease;
                }

                .profile-chevron.open {
                    transform: rotate(180deg);
                    color: #2563EB;
                }

                /* Profile Dropdown */
                .profile-dropdown {
                    position: fixed;
                    background: rgba(255, 255, 255, 0.98);
                    border: 1px solid rgba(226, 232, 240, 0.8);
                    border-radius: 16px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 12px 24px -4px rgba(0, 0, 0, 0.08);
                    width: 340px;
                    z-index: 10000;
                    direction: rtl;
                    animation: dropdownFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    backdrop-filter: blur(20px);
                    padding: 8px;
                    overflow: hidden;
                }

                @keyframes dropdownFadeIn {
                    from { opacity: 0; transform: translateY(-8px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                .profile-dropdown-content {
                    padding: 4px;
                }

                .profile-dropdown-menu {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .profile-dropdown-section {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .profile-dropdown-section-title {
                    font-size: 11px;
                    font-weight: 700;
                    color: #94A3B8;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    padding: 8px 14px 4px;
                }

                .profile-dropdown-item {
                    display: flex;
                    align-items: center;
                    padding: 12px 14px;
                    width: 100%;
                    text-align: right;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    transition: none;
                    color: #475569;
                    font-size: 14px;
                    font-weight: 500;
                    font-family: 'Cairo', sans-serif;
                    text-decoration: none;
                    border-radius: 10px;
                }

                .profile-dropdown-item:hover {
                    background: transparent;
                }

                .profile-dropdown-icon-wrapper {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    transition: none;
                }

                .profile-dropdown-icon-wrapper.icon-blue {
                    background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
                    color: #3B82F6;
                }

                .profile-dropdown-icon-wrapper.icon-purple {
                    background: linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%);
                    color: #8B5CF6;
                }

                .profile-dropdown-icon-wrapper.icon-red {
                    background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%);
                    color: #EF4444;
                }

                .profile-dropdown-icon {
                    color: inherit;
                }

                .profile-dropdown-item-content {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    min-width: 0;
                }

                .profile-dropdown-item-text {
                    font-size: 13px;
                    font-weight: 600;
                    color: #000000;
                    white-space: nowrap;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .profile-dropdown-title-icon.icon-blue {
                    color: #3B82F6;
                }

                .profile-dropdown-title-icon.icon-purple {
                    color: #8B5CF6;
                }

                .profile-dropdown-title-icon.icon-red {
                    color: #EF4444;
                }

                .profile-dropdown-title-icon.icon-green {
                    color: #10B981;
                }

                .profile-dropdown-item-desc {
                    font-size: 12px;
                    font-weight: 400;
                    color: #64748B;
                    margin-right: auto;
                }

                .profile-dropdown-divider {
                    height: 1px;
                    background: linear-gradient(90deg, transparent, #E2E8F0, transparent);
                    margin: 4px 0;
                }

                .profile-dropdown-item.logout-item {
                    color: #EF4444;
                }

                .profile-dropdown-item.logout-item:hover {
                    background: transparent;
                }

                .profile-dropdown-item.logout-item .profile-dropdown-item-text {
                    color: #EF4444;
                }

                /* Office Information Section - Fixed dimensions to prevent layout shifts */
                .office-info-section {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin: 0 0.5rem;
                    padding: 0;
                    flex-shrink: 0;
                    box-sizing: border-box;
                    min-width: auto;
                    max-width: none;
                    width: auto;
                    height: 56px;
                    min-height: 56px;
                    max-height: 56px;
                    position: relative;
                    overflow: visible;
                    border-radius: 0;
                    transition: none;
                    background: transparent;
                }

                .brand-logo-inline {
                    display: flex;
                    align-items: center;
                    gap: 18px;
                    text-decoration: none;
                    color: #1a1a1a;
                    flex-shrink: 0;
                    padding: 0;
                    margin: 0;
                }

                .brand-logo-inline:hover {
                    opacity: 0.9;
                }

                .office-logo-container {
                    width: 32px;
                    height: 32px;
                    min-width: 32px;
                    max-width: 32px;
                    min-height: 32px;
                    max-height: 32px;
                    position: relative;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .office-logo-placeholder {
                    width: 32px;
                    height: 32px;
                    min-width: 32px;
                    max-width: 32px;
                    min-height: 32px;
                    max-height: 32px;
                    background: #f1f3f4;
                    border-radius: 4px;
                    display: block;
                    position: absolute;
                    top: 0;
                    left: 0;
                    animation: pulse 1.5s ease-in-out infinite;
                }

                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.5;
                    }
                }

                .office-logo-header {
                    width: 32px;
                    height: 32px;
                    min-width: 32px;
                    max-width: 32px;
                    min-height: 32px;
                    max-height: 32px;
                    object-fit: contain;
                    border-radius: 4px;
                    display: block;
                    position: relative;
                    z-index: 1;
                }

                .office-separator {
                    color: #dadce0;
                    font-size: 1.25rem;
                    font-weight: 300;
                    margin: 0 4px;
                    flex-shrink: 0;
                    line-height: 1;
                }

                .office-text {
                    font-size: 1.1rem;
                    color: #1a1a1a;
                    font-weight: 600;
                    white-space: nowrap;
                    font-family: 'Cairo', 'Almarai', sans-serif;
                    letter-spacing: 0.01em;
                    line-height: 22px;
                    height: 22px;
                    min-height: 22px;
                    max-height: 22px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    flex: 1;
                    display: block;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                }

                .main-content {
                    padding: 1rem 0.75rem;
                    width: 100%;
                    overflow-x: hidden;
                    background: transparent !important;
                    min-height: calc(100vh - 64px);
                    box-sizing: border-box;
                }

                @media (max-width: 1024px) {
                    .main-content {
                        padding: 1rem 1.25rem;
                        min-height: calc(100vh - 64px);
                    }

                    .main-nav {
                        padding: 0 1rem;
                        height: 56px;
                        min-height: 56px;
                        max-height: 56px;
                        gap: 0.25rem;
                    }

                    .header {
                        height: 60px !important;
                        min-height: 60px !important;
                        max-height: 60px !important;
                    }

                    .nav-label {
                        font-size: 0.625rem;
                    }
                    
                    .nav-links {
                        gap: 0;
                        padding: 0 0.2rem;
                    }
                    
                    .nav-left-section {
                        gap: 22px;
                        padding: 0 0.25rem;
                    }

                    .nav-link-vertical {
                        padding: 0.0625rem 0.25rem 0.4rem 0.25rem;
                        width: 58px;
                        min-width: 58px;
                        max-width: 58px;
                        flex: 0 0 58px;
                        min-height: 56px;
                        flex-direction: column;
                        font-size: 0.65rem;
                    }
                    
                    .nav-link-vertical.nav-link-active {
                        width: 58px;
                        min-width: 58px;
                        max-width: 58px;
                        flex: 0 0 58px;
                        padding: 0.0625rem 0.25rem 0.4rem 0.25rem;
                    }

                    .nav-icon {
                        font-size: 1.125rem;
                        width: 24px;
                        height: 24px;
                        min-width: 24px;
                        max-width: 24px;
                        min-height: 24px;
                        max-height: 24px;
                        color: #64748B;
                    }
                    
                    .nav-link-vertical.nav-link-active .nav-icon {
                        color: #2563EB;
                    }

                    .brand-name {
                        font-size: 0.875rem;
                    }

                    .logo-icon {
                        width: auto;
                        height: 58px;
                    }
                    
                /* Desktop Header Drodown - Restore original behavior */
                .notifications-dropdown.desktop-only {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    margin-top: 10px;
                    background: white;
                    width: 380px;
                    max-height: 480px;
                    border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                    display: flex;
                    flex-direction: column;
                    z-index: 1000;
                    overflow: hidden;
                    animation: slideDown 0.2s ease-out;
                }

                .desktop-only { display: flex; }
                .mobile-only { display: none; }

                /* Mobile Portal Overrides */
                @media (max-width: 1024px) {
                    .desktop-only { display: none !important; }
                    .mobile-only { display: flex !important; }

                    .notifications-portal-overlay.mobile-only {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        justify-content: center;
                        align-items: flex-end; /* Bottom Sheet position */
                        background: rgba(0, 0, 0, 0.4);
                        z-index: 2000;
                        backdrop-filter: blur(2px);
                    }

                    .notifications-dropdown-container {
                        width: 100%;
                        max-height: 80vh;
                        background: white; /* Fix transparency */
                        border-radius: 24px 24px 0 0; /* Premium bottom sheet */
                        animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                        margin-bottom: 60px; /* Above mobile nav */
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.15); /* Strong elevation Shadow */
                        overflow: hidden;
                    }

                    .mobile-only { display: block; }
                    .close-notifications {
                      background: #f1f5f9;
                      border: none;
                      padding: 4px 12px;
                      border-radius: 20px;
                      font-size: 12px;
                      color: #64748b;
                    }
                }

                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }

                .logo-icon svg {
                        height: 100%;
                        width: auto;
                    }

                    .nav-divider {
                        margin: 0 0.5rem;
                        height: 32px;
                    }

                    .office-info-section {
                        min-width: 200px;
                        max-width: 200px;
                        width: 200px;
                        height: 36px;
                        min-height: 36px;
                        max-height: 36px;
                        padding: 0 8px;
                        margin: 0 0.25rem;
                        gap: 8px;
                    }

                    .office-logo-container {
                        width: 28px;
                        height: 28px;
                        min-width: 28px;
                        max-width: 28px;
                        min-height: 28px;
                        max-height: 28px;
                    }

                    .office-logo-header {
                        width: 28px;
                        height: 28px;
                        min-width: 28px;
                        max-width: 28px;
                        min-height: 28px;
                        max-height: 28px;
                    }

                    .office-logo-placeholder {
                        width: 28px;
                        height: 28px;
                        min-width: 28px;
                        max-width: 28px;
                        min-height: 28px;
                        max-height: 28px;
                    }

                    .office-text {
                        font-size: 0.875rem;
                        height: 18px;
                        min-height: 18px;
                        max-height: 18px;
                        line-height: 18px;
                    }

                    .nav-right-section {
                        padding: 0 0.375rem;
                    }

                    .brand-section {
                        margin-left: 0.5rem;
                        padding: 0 0.375rem;
                    }
                }

                /* iPad/Tablet Landscape (1025px–1280px) */
                @media (min-width: 1025px) and (max-width: 1280px) {
                    .header {
                        height: auto !important;
                        min-height: unset !important;
                        max-height: unset !important;
                    }

                    .main-nav {
                        height: 56px !important;
                        min-height: 56px !important;
                        max-height: 56px !important;
                        gap: 0.1rem;
                        padding: 0 0.5rem;
                    }

                    .nav-left-section {
                        min-width: auto !important;
                        max-width: none;
                        gap: 6px;
                        padding: 0 0.5rem 0 0.5rem;
                        border-left: 1px solid #e5e7eb;
                        flex-shrink: 0;
                    }

                    .office-text {
                        display: flex !important;
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0px;
                        max-width: 140px;
                        min-width: unset !important;
                        height: auto !important;
                        min-height: auto !important;
                        max-height: none !important;
                        line-height: 1.3 !important;
                        white-space: nowrap;
                        overflow: hidden !important;
                        text-overflow: ellipsis;
                        font-size: 0.7rem !important;
                    }

                    .nav-links {
                        gap: 0;
                        padding: 0 0.2rem;
                    }

                    .nav-link-vertical {
                        width: 52px;
                        min-width: 52px;
                        max-width: 52px;
                        flex: 0 0 52px;
                        padding: 0.0625rem 0.15rem 0.35rem 0.15rem;
                        font-size: 0.58rem;
                        min-height: 54px;
                    }

                    .nav-link-vertical.nav-link-active {
                        width: 52px;
                        min-width: 52px;
                        max-width: 52px;
                        flex: 0 0 52px;
                    }

                    .nav-icon {
                        width: 20px;
                        height: 20px;
                        min-width: 20px;
                        max-width: 20px;
                        min-height: 20px;
                        max-height: 20px;
                    }

                    .nav-label {
                        font-size: 0.6rem;
                    }

                    .header-action-bar {
                        gap: 24px !important;
                        padding: 10px 14px !important;
                    }

                    .logo-icon {
                        width: auto;
                        height: 50px;
                    }

                    /* Hide mobile-only elements on tablet landscape */
                    .mobile-only-section {
                        display: none !important;
                    }

                    .mobile-user-profile-section {
                        display: none !important;
                    }

                    .logout-link-mobile {
                        display: none !important;
                    }

                    .mobile-menu-toggle {
                        display: none !important;
                    }

                    .mobile-app-header {
                        display: none !important;
                    }
                }

                .mobile-search-bar-container {
                    display: none;
                }

                .mobile-search-bar-wrapper {
                    display: none;
                }

                .mobile-quick-actions-row {
                    display: none;
                }

                .mobile-quick-actions-scroll {
                    display: none;
                }

                .mobile-quick-actions-grid {
                    display: none;
                }

                .mobile-quick-actions {
                    display: none !important;
                }

                .mobile-only-nav-item {
                    display: none;
                }

                .mobile-user-profile-section {
                    display: none;
                    width: 100%;
                    padding: 16px 16px 16px 8px;
                    background: #f8fafc;
                    border-radius: 12px;
                    margin-bottom: 24px;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }

                .mobile-user-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid #e2e8f0;
                    overflow: hidden;
                    flex-shrink: 0;
                }

                .mobile-user-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .mobile-user-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .mobile-username {
                    font-size: 14px;
                    font-weight: 700;
                    color: #1e293b;
                    font-family: 'Cairo', sans-serif;
                }

                .mobile-user-role {
                    font-size: 12px;
                    color: #64748b;
                    font-family: 'Cairo', sans-serif;
                }

                .mobile-menu-close {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                }

                .mobile-only-section {
                    display: none;
                }

                .mobile-menu-close:hover {
                    background: #e2e8f0;
                }

                @media (max-width: 1024px) {
                    .standard-header {
                        height: 0 !important;
                        min-height: 0 !important;
                        max-height: 0 !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        border: none !important;
                        overflow: visible !important;
                    }
                    .standard-header .mobile-menu-toggle,
                    .standard-header .nav-left-section,
                    .standard-header .nav-right-section {
                        display: none !important;
                    }

                    .header-action-bar {
                        display: none !important;
                    }

                    .mobile-user-profile-section {
                        display: flex;
                    }

                    .mobile-only-nav-item {
                        display: flex !important;
                    }

                    .mobile-app-header {
                        display: flex !important;
                        justify-content: space-between;
                        align-items: center;
                        padding: calc(8px + env(safe-area-inset-top, 0px)) 12px 6px 12px;
                        height: auto;
                        background: #FFFFFF;
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        z-index: 99999 !important;
                        border-bottom: 1px solid rgba(226, 232, 240, 0.8);
                        backdrop-filter: blur(12px);
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                        direction: rtl;
                        width: 100% !important;
                    }

                    .mobile-search-bar-container {
                        display: none;
                    }

                    .mobile-search-bar-wrapper {
                        display: block;
                    }

                    #mobile-quick-actions.mobile-quick-actions-grid-premium {
                        display: grid;
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                        gap: 10px;
                        padding: 0 12px 10px 12px;
                    }

                    .mobile-search-row {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        width: 100%;
                    }

                    .mobile-search-input-wrap {
                        position: relative;
                        flex: 1;
                    }

                    .mobile-quick-actions-row {
                        display: grid;
                    }

                    .mobile-quick-actions-scroll {
                        display: flex;
                    }

                    .mobile-quick-actions-grid {
                        display: grid;
                    }

                    .mobile-quick-actions {
                        display: grid !important;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 10px;
                        padding: 8px 12px 8px 12px;
                        background: #FFFFFF;
                        width: 100%;
                        border-bottom: 1px solid rgba(226, 232, 240, 0.8);
                        position: relative;
                        z-index: 100;
                        margin-top: 0px !important;
                        margin-bottom: 0px !important;
                    }

                    #mobile-quick-actions .mobile-action-btn {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        padding: 0 8px;
                        border-radius: 14px;
                        font-size: 11px;
                        font-weight: 700;
                        color: #ffffff;
                        text-decoration: none;
                        font-family: 'Cairo', sans-serif;
                        height: 56px;
                        min-height: 56px;
                        width: 100%;
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        line-height: 1.2;
                        letter-spacing: 0.02em;
                        box-shadow:
                            0 2px 8px rgba(0, 0, 0, 0.14),
                            inset 0 1px 0 rgba(255, 255, 255, 0.14);
                        -webkit-tap-highlight-color: transparent;
                        cursor: pointer;
                    }

                    #mobile-quick-actions .mobile-action-btn--stacked {
                        flex-direction: column;
                        justify-content: center;
                        gap: 4px;
                        padding: 8px 6px;
                    }

                    #mobile-quick-actions .mobile-action-btn-icon {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #ffffff;
                        line-height: 0;
                    }

                    #mobile-quick-actions .mobile-action-btn-icon svg {
                        filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
                    }

                    #mobile-quick-actions .mobile-action-btn:hover {
                        filter: none;
                        transform: none;
                    }

                    #mobile-quick-actions .mobile-action-btn:active {
                        box-shadow:
                            0 1px 4px rgba(0, 0, 0, 0.18),
                            inset 0 1px 0 rgba(255, 255, 255, 0.1);
                        filter: brightness(0.94);
                    }

                    #mobile-quick-actions .mobile-action-btn:focus-visible {
                        outline: 2px solid rgba(255, 255, 255, 0.95);
                        outline-offset: 1px;
                    }

                    #mobile-quick-actions .mobile-action-label {
                        font-size: 11px;
                        font-weight: 700;
                        white-space: normal;
                        text-align: center;
                        line-height: 1.25;
                        max-width: 100%;
                        padding: 0 2px;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                        color: rgba(255, 255, 255, 0.98);
                    }

                    #mobile-quick-actions .mobile-action-btn.btn-live-indigo {
                        background: #4f46e5;
                    }
                    #mobile-quick-actions .mobile-action-btn.btn-live-blue {
                        background: #2563eb;
                    }
                    #mobile-quick-actions .mobile-action-btn.btn-live-cyan {
                        background: #06b6d4;
                    }
                    #mobile-quick-actions .mobile-action-btn.btn-live-magenta {
                        background: #db2777;
                    }
                    #mobile-quick-actions .mobile-action-btn.btn-live-violet {
                        background: #7c3aed;
                    }
                    #mobile-quick-actions .mobile-action-btn.btn-live-slate {
                        background: #334155;
                    }

                    .mobile-search-input {
                        width: 100%;
                        height: 40px;
                        padding: 0 40px 0 16px;
                        border-radius: 10px;
                        border: 1px solid #E2E8F0;
                        background: #F8FAFC;
                        font-family: 'Cairo', sans-serif;
                        font-size: 13px;
                        color: #1E293B;
                        outline: none;
                        transition: all 0.2s ease;
                        text-align: right;
                        -webkit-appearance: none;
                    }

                    .mobile-search-wrapper {
                        position: relative;
                        width: 100%;
                        display: flex;
                        align-items: center;
                    }

                    .mobile-search-icon {
                        position: absolute;
                        right: 12px;
                        color: #94A3B8;
                        pointer-events: none;
                        z-index: 2;
                    }

                    .mobile-search-input {
                        width: 100%;
                        height: 40px;
                        padding: 0 40px 0 16px;
                        border-radius: 10px;
                        border: 1px solid #E2E8F0;
                        background: #F8FAFC;
                        font-family: 'Cairo', sans-serif;
                        font-size: 13px;
                        color: #1E293B;
                        outline: none;
                        transition: all 0.2s ease;
                        text-align: right;
                        -webkit-appearance: none;
                    }

                    .mobile-search-input::placeholder {
                        color: #94A3B8;
                        opacity: 1;
                    }

                    .mobile-search-input:focus {
                        background: #FFFFFF;
                        border-color: #3B82F6;
                        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                        outline: none;
                    }

                    .mobile-search-submit-btn {
                        height: 40px;
                        min-width: 68px;
                        border: none;
                        border-radius: 10px;
                        background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%);
                        color: #FFFFFF;
                        font-family: 'Cairo', sans-serif;
                        font-size: 13px;
                        font-weight: 800;
                        padding: 0 12px;
                        cursor: pointer;
                        flex-shrink: 0;
                    }
                    
                    /* Override layout container min-height on mobile */
                    .layout-container {
                        min-height: auto !important;
                    }

                    /* Adjust main content padding when search bar is visible */
                    .main-content {
                        padding: 0 4px !important;
                        padding-top: calc(75px + env(safe-area-inset-top, 0px)) !important;
                        padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px)) !important;
                        min-height: auto !important;
                    }

                    /* Dashboard mobile: remove side gutters so card title bars can span full screen */
                    .main-content:has(.mobile-dashboard-layout) {
                        padding-left: 0 !important;
                        padding-right: 0 !important;
                    }

                /* Mobile Bottom Navigation - Fixed */
                .mobile-bottom-nav {
                    display: flex;
                    justify-content: space-around;
                    align-items: center;
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: calc(64px + env(safe-area-inset-bottom, 0px));
                    background: rgba(255, 255, 255, 0.98);
                    border-top: 1px solid rgba(226, 232, 240, 0.8);
                    z-index: 99999; /* Ensure highest z-index */
                    padding-bottom: env(safe-area-inset-bottom, 0px);
                    backdrop-filter: blur(12px);
                    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
                    direction: rtl;
                }

                    .mobile-nav-item {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        color: #000000;
                        font-size: 11px;
                        font-weight: 700;
                        width: 60px;
                        height: 60px;
                        background: transparent;
                        border: none;
                        text-decoration: none;
                        font-family: 'Cairo', sans-serif;
                    }

                    .mobile-nav-item.active {
                        color: #2563EB;
                        background-color: #EFF6FF;
                        border-radius: 16px;
                        font-weight: 700;
                    }

                    .header {
                        height: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        padding-top: 0 !important;
                        backdrop-filter: none !important;
                        -webkit-backdrop-filter: none !important;
                        position: static !important;
                        z-index: auto !important;
                        background: transparent !important;
                        border: none !important;
                        box-shadow: none !important;
                        overflow: visible !important;
                    }

                    .nav-links {
                        position: fixed;
                        top: 0;
                        right: -100%;
                        width: 75%;
                        max-width: 300px;
                        height: 100vh;
                        background: white;
                        flex-direction: column;
                        align-items: flex-start;
                        padding: calc(60px + env(safe-area-inset-top, 0px)) 16px 80px 16px; /* Added top padding for header */
                        gap: 2px; /* Reduced gap between links */
                        z-index: 1050;
                        transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        box-shadow: -10px 0 25px rgba(0,0,0,0.1);
                        overflow-y: auto;
                        -ms-overflow-style: none; /* IE and Edge */
                        scrollbar-width: none; /* Firefox */
                        justify-content: flex-start;
                    }

                    .mobile-only-section {
                        display: flex;
                        flex-direction: column;
                        width: 100%;
                        margin-top: 16px;
                        margin-bottom: 24px;
                    }

                    .mobile-nav-divider {
                        height: 1px;
                        background: #e2e8f0;
                        margin: 12px 12px 24px 12px;
                        width: calc(100% - 24px);
                    }

                    .logout-link-mobile {
                        background: transparent;
                        border: none;
                        cursor: pointer;
                        margin-top: 8px;
                    }

                    .logout-icon-wrapper {
                        background: #fef2f2 !important;
                    }

                    /* Hide scrollbar for Chrome, Safari and Opera */
                    .nav-links::-webkit-scrollbar {
                        display: none;
                    }

                    .nav-links.mobile-show {
                        right: 0;
                    }

                    .mobile-menu-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.4);
                        z-index: 1040;
                        backdrop-filter: blur(2px);
                    }

                    .nav-label {
                        font-size: 0.95rem;
                        font-weight: 700;
                        color: #000000;
                    }

                    .nav-link-vertical {
                        width: 100%;
                        min-width: 100%;
                        max-width: 100%;
                        padding: 10px 14px;
                        gap: 12px;
                        min-height: 44px;
                        flex-direction: row;
                        justify-content: flex-start;
                        border-radius: 12px;
                        background-color: #F8FAFC !important;
                        transition: all 0.2s ease;
                    }


                    .nav-link-vertical:not(.nav-link-active) .nav-icon {
                        color: #64748B;
                    }

                    .nav-link-vertical:not(.nav-link-active) .nav-label {
                        color: #000000;
                        font-weight: 700;
                    }

                    .nav-icon-container {
                        width: 28px;
                        height: 28px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    }

                    .nav-icon {
                        width: 20px;
                        height: 20px;
                        min-width: 20px;
                        max-width: 20px;
                        min-height: 20px;
                        max-height: 20px;
                    }

                    .nav-left-section {
                        margin-right: auto;
                    }

                    .brand-logo-inline {
                        gap: 8px;
                    }

                    .brand-logo-inline span:first-child {
                        font-size: 16px !important;
                    }

                    .brand-logo-inline span:last-child {
                        font-size: 10px !important;
                    }

                    .logo-icon img {
                        height: 70px !important;
                    }

                    .office-text {
                        display: none; /* Hide office text on mobile to save space */
                    }

                    .nav-right-section {
                        padding: 0 0.25rem;
                        margin-left: 0;
                    }

                    .profile-button {
                        padding: 4px;
                        border: none;
                        background: transparent;
                    }

                    .profile-chevron {
                        display: none;
                    }

                    .profile-avatar-container {
                        width: 32px;
                        height: 32px;
                    }

                    .notifications-button {
                        min-height: 40px;
                        padding: 4px;
                    }

                    .notifications-button .nav-label {
                        display: none;
                    }

                    .profile-dropdown {
                        width: calc(100vw - 32px);
                        right: 16px !important;
                        left: 16px !important;
                    }
                }

                .client-required-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100000;
                    backdrop-filter: blur(4px);
                }
                .client-required-modal {
                    background: white;
                    padding: 32px;
                    border-radius: 20px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                    direction: rtl;
                    animation: modalFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .client-required-icon {
                    font-size: 48px;
                    margin-bottom: 16px;
                }
                .client-required-modal h3 {
                    font-size: 20px;
                    font-weight: 700;
                    color: #1e293b;
                    margin-bottom: 12px;
                    font-family: 'Cairo', sans-serif;
                }
                .client-required-modal p {
                    font-size: 15px;
                    color: #64748b;
                    line-height: 1.6;
                    font-family: 'Cairo', sans-serif;
                }
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }

                /* iPad-specific back button visibility */
                /* iPad Portrait: 768px - 1024px */
                @media (min-width: 768px) and (max-width: 1024px) {
                    .ipad-back-button {
                        display: flex !important;
                    }
                }

                /* iPad Landscape: 1025px - 1366px */
                @media (min-width: 1025px) and (max-width: 1366px) {
                    .ipad-back-button {
                        display: flex !important;
                    }
                }

                /* Mobile back button in mobile-app-header (hidden by default, shown at <=1024px) */
                .mobile-back-button {
                    display: none;
                    align-items: center;
                    justify-content: center;
                    background: #F1F5F9;
                    border: 1px solid #E2E8F0;
                    border-radius: 10px;
                    padding: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: #475569;
                    -webkit-tap-highlight-color: transparent;
                }
                .mobile-back-button:active {
                    background: #E2E8F0;
                    color: #1E293B;
                    transform: scale(0.95);
                }

                @media (max-width: 1024px) {
                    .mobile-back-button {
                        display: flex;
                    }
                }
            `}</style>
        </div>
    );
};

Layout.propTypes = {
    children: PropTypes.node.isRequired,
};

export default Layout;






