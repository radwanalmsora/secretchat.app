import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.secretchat.app',
  appName: 'SecretChat',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
