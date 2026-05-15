import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/initSupabase';

const withClientAuth = (WrappedComponent) => {
  const WithClientAuth = (props) => {
    const router = useRouter();
    const [clientAccount, setClientAccount] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      if (!router.isReady) return;

      const checkClientSession = async () => {
        setIsLoading(true);
        const user = supabase.auth.user();

        if (!user) {
          router.push('/client-portal/login');
          return;
        }

        try {
          // Check if this user has a client_accounts entry
          const { data: clientData, error } = await supabase
            .from('client_accounts')
            .select('*, clients_data:client_data_id(*)')
            .eq('auth_user_id', user.id)
            .eq('is_portal_enabled', true)
            .single();

          if (error || !clientData) {
            console.error('Client account not found or disabled:', error);
            // Not a client portal user — redirect to client login
            router.push('/client-portal/login');
            return;
          }

          // Update last_login
          await supabase
            .from('client_accounts')
            .update({ last_login: new Date().toISOString() })
            .eq('id', clientData.id);

          setClientAccount(clientData);
        } catch (error) {
          console.error('Error checking client session:', error);
          router.push('/client-portal/login');
        } finally {
          setIsLoading(false);
        }
      };

      checkClientSession();
    }, [router.isReady, router]);

    if (isLoading) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          fontFamily: "'Cairo', sans-serif",
          direction: 'rtl'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e2e8f0',
              borderTop: '3px solid #3B82F6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p style={{ color: '#64748b', fontSize: '16px' }}>جاري التحميل...</p>
            <style jsx>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} clientAccount={clientAccount} />;
  };

  WithClientAuth.displayName = `withClientAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithClientAuth;
};

export default withClientAuth;
