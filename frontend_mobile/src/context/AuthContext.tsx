import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const setToken = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getToken = async (key: string) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
};

const deleteToken = async (key: string) => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

type AuthContextType = {
  isLoading: boolean;
  userToken: string | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  userToken: null,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);

  useEffect(() => {
    const bootstrapAsync = async () => {
      let token;
      try {
        token = await getToken('ledger_token');
      } catch (e) {
        // Restoring token failed
      }
      setUserToken(token || null);
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);

  const login = async (token: string) => {
    try {
      await setToken('ledger_token', token);
      setUserToken(token);
    } catch (e) {
      console.error('Failed to store token', e);
      // Even if storage fails on some strict environments, let the user into the app for the session
      setUserToken(token);
    }
  };

  const logout = async () => {
    try {
      await deleteToken('ledger_token');
    } catch (e) {
      console.error('Failed to delete token', e);
    } finally {
      setUserToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ isLoading, userToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
