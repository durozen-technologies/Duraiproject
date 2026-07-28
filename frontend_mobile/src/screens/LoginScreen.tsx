import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Lock, User, AlertCircle, Bird } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<'username' | 'password' | null>(null);
  const { login } = useAuth();

  const loginMutation = useMutation({
    mutationFn: async (formData: URLSearchParams) => {
      const response = await client.post('/auth/login', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      });
      return response.data;
    },
    onSuccess: async (data) => {
      if (data && data.access_token) {
        await login(data.access_token);
      }
    },
    onError: (err: any) => {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Network error. Please try again.");
      }
    }
  });

  const handleLogin = () => {
    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setError(null);
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    loginMutation.mutate(formData);
  };

  const getInputStyles = (inputName: 'username' | 'password') => {
    const isFocused = focusedInput === inputName;
    return `flex-row items-center border ${isFocused ? 'border-[#006948] bg-green-50/20 shadow-sm' : 'border-slate-300 bg-white'
      } rounded-lg px-4 h-14 transition-all`;
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        className="px-6 pb-12"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-10 items-center">
          <View className="w-20 h-20 bg-[#006948]/10 rounded-2xl items-center justify-center mb-6 border border-[#006948]/20">
            <Bird color="#006948" size={36} strokeWidth={1.5} />
          </View>
          <Text className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight text-center">
            LedgerDesk
          </Text>
          <Text className="text-slate-600 text-base text-center font-medium">
            Sign in to your farm dashboard
          </Text>
        </View>

        <View className="space-y-5">
          <View>
            <Text className="text-[13px] font-bold text-slate-700 mb-2 uppercase tracking-widest ml-1">Username</Text>
            <View className={getInputStyles('username')}>
              <User color={focusedInput === 'username' ? '#006948' : '#64748b'} size={20} className="mr-3" />
              <TextInput
                className="flex-1 text-slate-900 text-base h-full font-medium"
                placeholder="Enter your username"
                placeholderTextColor="#94a3b8"
                value={username}
                onFocus={() => setFocusedInput('username')}
                onBlur={() => setFocusedInput(null)}
                onChangeText={(text) => {
                  setUsername(text);
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loginMutation.isPending}
              />
            </View>
          </View>

          <View>
            <Text className="text-[13px] font-bold text-slate-700 mb-2 uppercase tracking-widest ml-1">Password</Text>
            <View className={getInputStyles('password')}>
              <Lock color={focusedInput === 'password' ? '#006948' : '#64748b'} size={20} className="mr-3" />
              <TextInput
                className="flex-1 text-slate-900 text-base h-full font-medium"
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                value={password}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError(null);
                }}
                secureTextEntry
                autoCapitalize="none"
                editable={!loginMutation.isPending}
                onSubmitEditing={handleLogin}
              />
            </View>
          </View>

          {error ? (
            <View className="bg-red-50 p-4 rounded-lg mt-2 border-l-4 border-red-500 shadow-sm flex-row items-center">
              <AlertCircle color="#dc2626" size={20} className="mr-3" />
              <Text className="text-red-800 text-sm font-semibold flex-1 leading-tight">{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            className={`h-14 rounded-lg items-center justify-center mt-4 flex-row shadow-sm ${loginMutation.isPending ? 'bg-[#004d35]' : 'bg-[#006948]'
              }`}
            onPress={handleLogin}
            disabled={loginMutation.isPending}
            activeOpacity={0.85}
          >
            {loginMutation.isPending ? (
              <ActivityIndicator color="white" className="mr-3" />
            ) : null}
            <Text className="text-white text-lg font-bold">
              {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
