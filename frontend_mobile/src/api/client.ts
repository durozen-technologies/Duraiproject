import axios from 'react-native-axios';
// We'll use standard axios instead since react-native-axios is old, actually standard axios works in RN.
import standardAxios from 'axios';
import { Platform } from 'react-native';

// IMPORTANT: Replace this IP with your computer's local IP address (e.g. 192.168.x.x) if testing on a physical device.
// If testing on Android Emulator, use 10.0.2.2.
// Since the user is on the web right now via Metro, localhost works fine.
const getApiUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    if (Platform.OS === 'android' && envUrl.includes('localhost')) {
      return envUrl.replace('localhost', '10.0.2.2');
    }
    return envUrl;
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

export default client;
