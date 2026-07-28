// @ts-ignore
import './global.css';
import React from 'react';
import { View, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator, linking } from './src/navigation/RootNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';

const queryClient = new QueryClient();

function AppNavigator() {
  const { isLoading } = useAuth();

  // Keep splash outside NavigationContainer so a navigator is always
  // the container's child once auth bootstrap finishes.
  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#006948" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={Platform.OS === 'web' ? linking : undefined}>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
