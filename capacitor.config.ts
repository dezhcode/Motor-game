import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aistudio.kavirsavar.qmxzpk.test',
  appName: 'کویرسوار تست',
  webDir: 'dist',
  android: {
    path: 'android',
    backgroundColor: '#1E293B',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
