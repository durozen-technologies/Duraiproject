import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Phone, Save } from 'lucide-react-native';
import client from '../api/client';
import { useQueryClient } from '@tanstack/react-query';

export default function NewDriverScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [mobile, setMobile] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Driver name is required');
      return;
    }

    setLoading(true);
    try {
      await client.post('/drivers/', {
        name,
        nickname,
        mobile,
        is_active: isActive
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
          <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <User color="#9CA3AF" size={20} className="mr-2" />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Full Name"
              className="flex-1 text-base py-1"
            />
          </View>
        </View>

        <View>
          <Text className="text-sm font-semibold text-gray-700 mb-1">Nickname (Optional)</Text>
          <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <User color="#9CA3AF" size={20} className="mr-2" />
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="Alias/Nickname"
              className="flex-1 text-base py-1"
            />
          </View>
        </View>

        <View>
          <Text className="text-sm font-semibold text-gray-700 mb-1">Mobile Number (Optional)</Text>
          <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Phone color="#9CA3AF" size={20} className="mr-2" />
            <TextInput
              value={mobile}
              onChangeText={setMobile}
              placeholder="Phone Number"
              keyboardType="phone-pad"
              className="flex-1 text-base py-1"
            />
          </View>
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
