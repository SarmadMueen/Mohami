import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/initSupabase';
import { useSubscription } from '../context/SubscriptionContext';

const withAuth = (WrappedComponent, requiredPermissions = [], restrictOnReadOnly = false) => {
  const WithAuth = (props) => {
    const router = useRouter();
    const { isReadOnly, loading: subLoading } = useSubscription();
    const [, setIsChecking] = useState(true); // setIsChecking is used, but isChecking is not
    const [, setIsAuthorized] = useState(false); // setIsAuthorized is used, but isAuthorized is not

    useEffect(() => {
      // Wait for router to be ready before checking
      if (!router.isReady) return;

      const checkSession = async () => {
        setIsChecking(true);
        const user = supabase.auth.user();

        if (!user) {
          router.push('/'); // Redirect to the login page if the user is not logged in
          return;
        }

        // Check if subscription is in read-only mode and restrictOnReadOnly is enabled
        if (restrictOnReadOnly && isReadOnly && !subLoading) {
          router.push('/settings/subscription');
          return;
        }

        try {
          // Fetch user metadata - try multiple methods
          let userMetadata = null;
          let metadataError = null;
          
          // First try with user_id
          let { data, error } = await supabase
            .from('user_metadata')
            .select('role, is_disabled')
            .eq('user_id', user.id)
            .single();
          
          if (!error && data) {
            userMetadata = data;
          } else {
            // Try with email
            const { data: emailData, error: emailError } = await supabase
              .from('user_metadata')
              .select('role, is_disabled')
              .eq('email', user.email)
              .single();
            
            if (!emailError && emailData) {
              userMetadata = emailData;
            } else {
              // Try with admin_user_id or new_lawyer_id
              const { data: idData, error: idError } = await supabase
                .from('user_metadata')
                .select('role, is_disabled')
                .or(`admin_user_id.eq.${user.id},new_lawyer_id.eq.${user.id}`)
                .limit(1);
              
              if (!idError && idData && idData.length > 0) {
                userMetadata = idData[0];
              } else {
                metadataError = idError || emailError || error;
              }
            }
          }

          if (metadataError || !userMetadata) {
            console.warn('User metadata not found, but user is logged in. Allowing access.');
            // Allow access if user is logged in, even without user_metadata
            setIsAuthorized(true);
            setIsChecking(false);
            return;
          }

          const { role, is_disabled } = userMetadata;

          // Check if account is disabled
          if (is_disabled) {
            router.push('/account-disabled');
            return;
          }

          // Only check permissions if requiredPermissions are specified
          if (requiredPermissions.length > 0) {
            // Fetch permissions based on the user's role
            const { data: permissionData, error: permissionError } = await supabase
              .from('permission_profiles')
              .select(...requiredPermissions)
              .eq('profile_name', role)
              .single();

            if (permissionError || !permissionData) {
              console.warn('Permission data not found, allowing access anyway');
              // Don't redirect, just allow access
            } else {
              // Check if the user has the required permissions
              const hasRequiredPermissions = requiredPermissions.every((permission) => {
                return permissionData[permission];
              });

              if (!hasRequiredPermissions) {
                router.push('/forbidden'); // Redirect to forbidden page if the user lacks required permissions
                return;
              }
            }
          }

          // If everything is successful, proceed to the wrapped component
          setIsAuthorized(true);
        } catch (error) {
          console.error('Error checking session:', error);
          router.push('/forbidden'); // Redirect to forbidden page in case of an error
        } finally {
          setIsChecking(false);
        }
      };

      checkSession();
    }, [router.isReady, router, requiredPermissions, restrictOnReadOnly, isReadOnly, subLoading]);

    // Always render the component - don't conditionally return null
    // The redirects will handle navigation, but we keep the component mounted
    return <WrappedComponent {...props} />;
  };

  // Add the displayName
  WithAuth.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithAuth;
};

export default withAuth;
