import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mohamipro.app',
  appName: 'Mohami Pro',
  webDir: 'out',
  server: {
    // Allow custom URL scheme for deep linking
    allowNavigation: ['mohamipro://*']
  },
  plugins: {
    Camera: {
      permissions: ['camera'],
    },
    SplashScreen: {
      backgroundColor: '#ffffff',
      launchShowDuration: 4000,
      launchAutoHide: true,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      iosSplashName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Browser: {
      // Ensure Browser plugin is registered
    },
  },
};

export default config;
