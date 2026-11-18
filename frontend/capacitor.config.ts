import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aims.app',
  appName: 'AIMS',
  webDir: 'build',
  server: {
    // Allows navigation to localhost and LAN API servers during development.
    // For production, replace with your actual API domain.
    allowNavigation: ['localhost:5000', '10.0.2.2:5000']
  },
  android: {
    allowMixedContent: true
  }
};

export default config;

