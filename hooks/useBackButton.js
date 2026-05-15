import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { App } from '@capacitor/app';

/**
 * Custom hook to handle Android back button press
 * - Navigates back within the app using router.back()
 * - Only exits the app when at the root route (/)
 * - No effect on iOS (no hardware back button)
 */
export const useBackButton = () => {
  const router = useRouter();

  useEffect(() => {
    // Only register listener on Android
    const setupBackButtonListener = async () => {
      try {
        await App.addListener('backButton', async () => {
          // Check if we're at the root route
          const currentPath = router.pathname;
          
          // Define routes where back button should exit the app
          const rootRoutes = ['/', '/login', '/register'];
          
          if (rootRoutes.includes(currentPath)) {
            // At root or auth pages, exit the app
            App.exitApp();
          } else {
            // Navigate back within the app
            router.back();
          }
        });
      } catch (error) {
        console.error('Error setting up back button listener:', error);
      }
    };

    setupBackButtonListener();

    // Cleanup listener on unmount
    return () => {
      App.removeAllListeners();
    };
  }, [router]);
};
