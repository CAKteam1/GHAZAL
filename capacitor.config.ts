import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ghazal.ai.agent',
  appName: 'GHAZAL',
  webDir: '../web/dist',
  server: {
    androidScheme: 'http',
    cleartext: true
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#F7F5F0'
    }
  }
};

export default config;
