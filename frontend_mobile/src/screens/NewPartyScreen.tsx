import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Save, User } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

export default function NewPartyScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'SUPPLIER' | 'PURCHASER'>('SUPPLIER');

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    address: '',
    opening_balance: '0'
  });

  const mutation = useMutation({
    mutationFn: (newParty: any) => {
      return client.post('/parties/', newParty);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      Alert.alert("Success", `${tab === 'SUPPLIER' ? 'Supplier' : 'Purchaser'} added successfully`);
      navigation.goBack();
    },
    onError: (error: any) => {
      let errorMsg = "Failed to add party";
      if (error?.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMsg = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // FastAPI validation error is an array
          errorMsg = error.response.data.detail.map((e: any) => e.msg).join(', ');
        }
      } else if (error?.message) {
        errorMsg = error.message;
      }
      Alert.alert("Error", errorMsg);
    }
  });

  const handleSave = () => {
    if (!form.name) {
      Alert.alert("Error", "Name is required");
      return;
    }
    mutation.mutate({
      name: form.name,
      mobile: form.mobile,
      address: form.address,
      type: tab,
      opening_balance: parseFloat(form.opening_balance) || 0
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-3 bg-white border-b border-gray-100 flex-row items-center shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Add New Party</Text>
      </View>

      <KeyboardAwareScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        enableOnAndroid={true}
        extraScrollHeight={120}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tabs */}
        <View className="flex-row border border-gray-200 rounded-lg mb-6 overflow-hidden bg-white">
          <TouchableOpacity 
            className={`flex-1 py-3 items-center ${tab === 'SUPPLIER' ? 'bg-[#006948]' : 'bg-white'}`}
            onPress={() => setTab('SUPPLIER')}
          >
            <Text className={`text-sm font-semibold ${tab === 'SUPPLIER' ? 'text-white' : 'text-gray-500'}`}>Supplier</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-3 items-center ${tab === 'PURCHASER' ? 'bg-[#006948]' : 'bg-white'}`}
            onPress={() => setTab('PURCHASER')}
          >
            <Text className={`text-sm font-semibold ${tab === 'PURCHASER' ? 'text-white' : 'text-gray-500'}`}>Purchaser</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-5">
          <View className="flex-row items-center mb-3">
            <User color="#006948" size={20} className="mr-2" />
            <Text className="text-sm font-semibold text-[#006948]">Details</Text>
          </View>
          
          <View className="space-y-3">
            <View>
              <Text className="text-xs font-medium text-gray-700 mb-1">Name / Company Name *</Text>
              <TextInput 
                placeholder=". Pioneer Feeds"
                value={form.name}
                onChangeText={(v) => setForm({...form, name: v})}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-md text-sm"
              />
            </View>
            
            <View>
              <Text className="text-xs font-medium text-gray-700 mb-1">Mobile Number</Text>
              <TextInput 
                placeholder="9876543210"
                keyboardType="phone-pad"
                value={form.mobile}
                onChangeText={(v) => setForm({...form, mobile: v})}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-md text-sm"
              />
            </View>

            <View>
              <Text className="text-xs font-medium text-gray-700 mb-1">Address</Text>
              <TextInput 
                placeholder=" 123 Main St, City"
                value={form.address}
                onChangeText={(v) => setForm({...form, address: v})}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-md text-sm"
              />
            </View>

            <View>
              <Text className="text-xs font-medium text-gray-700 mb-1">Opening Balance (₹)</Text>
              <TextInput 
                placeholder="0.00"
                keyboardType="numeric"
                value={form.opening_balance}
                onChangeText={(v) => setForm({...form, opening_balance: v})}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-md text-sm"
              />
              <Text className="text-[10px] text-gray-400 mt-1">Use negative value if they owe you money.</Text>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* Bottom Actions */}
      <View className="absolute bottom-0 w-full bg-white border-t border-gray-200 p-4 flex-row justify-between">
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          className="w-[30%] py-3 bg-white border border-gray-300 rounded-md items-center justify-center mr-2"
        >
          <Text className="text-gray-700 font-semibold text-sm">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={handleSave}
          disabled={mutation.isPending}
          className="w-[68%] py-3 bg-[#006948] rounded-md flex-row items-center justify-center"
        >
          <Save color="white" size={16} className="mr-2" />
          <Text className="text-white font-semibold text-sm">{mutation.isPending ? 'Saving...' : 'Save Party'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
