import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Phone, Save } from 'lucide-react-native';
import client from '../api/client';
import { useQueryClient } from '@tanstack/react-query';

function nameError(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'Driver name is required';
  if (trimmed.length < 3) return 'Driver name must be at least 3 characters';
  return '';
}

function mobileError(mobile: string): string {
  if (!mobile.trim()) return 'Mobile number is required';
  if (!/^\d{10}$/.test(mobile)) return 'Mobile number must be exactly 10 digits';
  return '';
}

export default function NewDriverScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const nameErr = nameError(name);
  const mobileErr = mobileError(mobile);

  const onMobileChange = (text: string) => {
    setMobile(text.replace(/\D/g, '').slice(0, 10));
  };

  const handleSave = async () => {
    setShowErrors(true);
    if (nameErr || mobileErr) return;

    setLoading(true);
    try {
      await client.post('/drivers/', {
        name: name.trim(),
        mobile,
        is_active: isActive,
      });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      navigation.navigate('MainTabs', { screen: 'Drivers', params: { successMessage: 'Driver created successfully!' } });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create driver');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 py-3 border-b border-gray-100 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ArrowLeft color="#374151" size={24} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Add New Driver</Text>
      </View>

      <View className="p-4 space-y-4">
        <View>
          <Text className="text-sm font-semibold text-gray-700 mb-1">Driver Name *</Text>
          <View
            className={`flex-row items-center bg-gray-50 border rounded-xl px-3 py-2 ${
              showErrors && nameErr ? 'border-red-400' : 'border-gray-200'
            }`}
          >
            <User color="#9CA3AF" size={20} className="mr-2" />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Full Name"
              className="flex-1 text-base py-1"
              style={{ outline: 'none' } as any}
            />
          </View>
          {showErrors && nameErr ? (
            <Text className="text-xs text-red-600 mt-1 ml-1 font-medium">{nameErr}</Text>
          ) : (
            <Text className="text-xs text-gray-500 mt-1 ml-1">At least 3 characters</Text>
          )}
        </View>

        <View>
          <Text className="text-sm font-semibold text-gray-700 mb-1">Mobile Number *</Text>
          <View
            className={`flex-row items-center bg-gray-50 border rounded-xl px-3 py-2 ${
              showErrors && mobileErr ? 'border-red-400' : 'border-gray-200'
            }`}
          >
            <Phone color="#9CA3AF" size={20} className="mr-2" />
            <TextInput
              value={mobile}
              onChangeText={onMobileChange}
              placeholder="10-digit mobile number"
              keyboardType="number-pad"
              maxLength={10}
              className="flex-1 text-base py-1"
              style={{ outline: 'none' } as any}
            />
          </View>
          {showErrors && mobileErr ? (
            <Text className="text-xs text-red-600 mt-1 ml-1 font-medium">{mobileErr}</Text>
          ) : (
            <Text className="text-xs text-gray-500 mt-1 ml-1">Must be exactly 10 digits</Text>
          )}
        </View>

        <View className="flex-row items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <View>
            <Text className="font-semibold text-gray-900">Active</Text>
            <Text className="text-xs text-gray-500">Enable or disable this driver</Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: '#D1D5DB', true: '#059669' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          className={`bg-[#006948] flex-row items-center justify-center py-4 rounded-xl ${loading ? 'opacity-50' : ''}`}
        >
          <Save color="white" size={20} className="mr-2" />
          <Text className="text-white font-bold text-lg">{loading ? 'Saving...' : 'Save Driver'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
