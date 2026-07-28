import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Lock, User, AlertCircle, Bird, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const inputShellStyle = (inputName: 'username' | 'password') => {
    const isFocused = focusedInput === inputName;
    return [
      styles.inputShell,
      isFocused ? styles.inputShellFocused : styles.inputShellIdle,
    ];
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
        enableOnAndroid={true}
        extraScrollHeight={120}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandBlock}>
          <View style={styles.logoWrap}>
            <Bird color="#006948" size={36} strokeWidth={1.5} />
          </View>
          <Text style={styles.title}>LedgerDesk</Text>
          <Text style={styles.subtitle}>Sign in to your farm dashboard</Text>
        </View>

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Username</Text>
            <View style={inputShellStyle('username')}>
              <User
                color={focusedInput === 'username' ? '#006948' : '#64748b'}
                size={20}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
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
            <Text style={styles.label}>Password</Text>
            <View style={inputShellStyle('password')}>
              <Lock
                color={focusedInput === 'password' ? '#006948' : '#64748b'}
                size={20}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                value={password}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError(null);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loginMutation.isPending}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                {showPassword ? (
                  <EyeOff color="#64748b" size={20} />
                ) : (
                  <Eye color="#64748b" size={20} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <AlertCircle color="#dc2626" size={20} style={styles.inputIcon} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.submitButton,
              loginMutation.isPending ? styles.submitButtonPending : styles.submitButtonReady,
            ]}
            onPress={handleLogin}
            disabled={loginMutation.isPending}
            activeOpacity={0.85}
          >
            {loginMutation.isPending ? (
              <ActivityIndicator color="white" style={styles.inputIcon} />
            ) : null}
            <Text style={styles.submitText}>
              {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  brandBlock: {
    marginBottom: 40,
    alignItems: 'center',
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(0, 105, 72, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 105, 72, 0.2)',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: '#475569',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  form: {
    gap: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 56,
  },
  inputShellIdle: {
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  inputShellFocused: {
    borderColor: '#006948',
    backgroundColor: 'rgba(240, 253, 244, 0.5)',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 16,
    height: '100%',
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  submitButton: {
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    flexDirection: 'row',
  },
  submitButtonReady: {
    backgroundColor: '#006948',
  },
  submitButtonPending: {
    backgroundColor: '#004d35',
  },
  submitText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
