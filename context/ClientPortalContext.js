import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/initSupabase';

const ClientPortalContext = createContext(null);

export const useClientPortal = () => {
  const context = useContext(ClientPortalContext);
  if (!context) {
    throw new Error('useClientPortal must be used within a ClientPortalProvider');
  }
  return context;
};

export const ClientPortalProvider = ({ children, clientAccount }) => {
  const [clientInfo, setClientInfo] = useState(clientAccount?.clients_data || null);
  const [cases, setCases] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);

  const clientDataId = clientAccount?.client_data_id;
  const adminId = clientAccount?.admin_id;
  const authUserId = clientAccount?.auth_user_id;

  // Fetch client's cases (double-scoped: client_data_id + admin_id)
  const fetchCases = useCallback(async () => {
    if (!clientDataId || !adminId) return;

    try {
      // First try FK-based linking (client_data_id)
      let { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('client_data_id', clientDataId)
        .eq('admin_id', adminId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cases by client_data_id:', error);
      }

      // If no results via FK, fall back to client_name matching (for legacy data)
      if ((!data || data.length === 0) && clientInfo?.client_name) {
        const { data: nameData, error: nameError } = await supabase
          .from('cases')
          .select('*')
          .eq('client_name', clientInfo.client_name)
          .eq('admin_id', adminId)
          .order('created_at', { ascending: false });

        if (!nameError && nameData) {
          data = nameData;
        }
      }

      setCases(data || []);
    } catch (err) {
      console.error('Error in fetchCases:', err);
      setCases([]);
    }
  }, [clientDataId, adminId, clientInfo]);

  // Fetch sessions for client's cases
  const fetchSessions = useCallback(async () => {
    if (!cases || cases.length === 0) return;

    try {
      const caseNumbers = cases.map(c => c.case_number).filter(Boolean);
      if (caseNumbers.length === 0) return;

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .in('case_number', caseNumbers)
        .in('user_id', [adminId]) // Only from the same firm
        .order('sessiondate', { ascending: true });

      if (error) {
        console.error('Error fetching sessions:', error);
        return;
      }

      setSessions(data || []);
    } catch (err) {
      console.error('Error in fetchSessions:', err);
      setSessions([]);
    }
  }, [cases, adminId]);

  // Fetch unread messages count
  const fetchUnreadMessages = useCallback(async () => {
    if (!clientDataId) return;

    try {
      const { count, error } = await supabase
        .from('client_messages')
        .select('*', { count: 'exact', head: true })
        .eq('client_data_id', clientDataId)
        .eq('sender_type', 'lawyer')
        .eq('is_read', false);

      if (!error) {
        setUnreadMessages(count || 0);
      }
    } catch (err) {
      console.error('Error fetching unread messages:', err);
    }
  }, [clientDataId]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!authUserId) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', authUserId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data);
        setUnreadNotifications(data.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [authUserId]);

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchCases();
      await fetchUnreadMessages();
      await fetchNotifications();
      setLoading(false);
    };

    if (clientDataId && adminId) {
      loadData();
    }
  }, [clientDataId, adminId, fetchCases, fetchUnreadMessages, fetchNotifications]);

  // Fetch sessions after cases are loaded
  useEffect(() => {
    if (cases.length > 0) {
      fetchSessions();
    }
  }, [cases, fetchSessions]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!clientDataId) return;

    const subscription = supabase
      .from(`client_messages:client_data_id=eq.${clientDataId}`)
      .on('INSERT', (payload) => {
        if (payload.new.sender_type === 'lawyer') {
          setUnreadMessages(prev => prev + 1);
        }
      })
      .subscribe();

    return () => {
      supabase.removeSubscription(subscription);
    };
  }, [clientDataId]);

  // Real-time subscription for notifications
  useEffect(() => {
    if (!authUserId) return;

    const subscription = supabase
      .from(`notifications:user_id=eq.${authUserId}`)
      .on('INSERT', (payload) => {
        setNotifications(prev => [payload.new, ...prev.slice(0, 19)]);
        setUnreadNotifications(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeSubscription(subscription);
    };
  }, [authUserId]);

  const value = {
    clientInfo,
    clientDataId,
    adminId,
    authUserId,
    cases,
    sessions,
    unreadMessages,
    notifications,
    unreadNotifications,
    loading,
    // Refresh functions
    refreshCases: fetchCases,
    refreshSessions: fetchSessions,
    refreshMessages: fetchUnreadMessages,
    refreshNotifications: fetchNotifications,
  };

  return (
    <ClientPortalContext.Provider value={value}>
      {children}
    </ClientPortalContext.Provider>
  );
};

export default ClientPortalContext;
