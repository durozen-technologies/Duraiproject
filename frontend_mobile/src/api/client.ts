// We'll use standard axios since react-native-axios is old
import standardAxios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// IMPORTANT: Replace this IP with your computer's local IP address (e.g. 192.168.x.x) if testing on a physical device.
// If testing on Android Emulator, use 10.0.2.2.
const getApiUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    if (Platform.OS === 'android' && envUrl.includes('localhost')) {
      return envUrl.replace('localhost', '10.0.2.2');
    }
    return envUrl;
  }

  // Dev fallback: same host, backend on :8000
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `http://${window.location.hostname}:8000/api`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api';
  }
  return 'http://localhost:8000/api';
};

const API_URL = getApiUrl();

const client = standardAxios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(
  async (config) => {
    try {
      let token = null;
      if (Platform.OS === 'web') {
        token = localStorage.getItem('ledger_token');
      } else {
        token = await SecureStore.getItemAsync('ledger_token');
      }
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // Ignore
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default client;
