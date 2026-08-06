import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Save, User } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

export default function NewPartyScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'SUPPLIER' | 'PURCHASER' | 'BOTH'>('SUPPLIER');

  const [form, setForm] = useState({
    name: '',
    nickname: '',
    mobile: '',
    address: '',
    opening_balance: ''
  });
  const [openingDirection, setOpeningDirection] = useState<'CR' | 'DR'>('CR');
  const [errors, setErrors] = useState<{name?: string, mobile?: string, address?: string, opening_balance?: string, generic?: string}>({});

  const mutation = useMutation({
    mutationFn: (newParty: any) => {
      return client.post('/parties/', newParty);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      setErrors({});
      navigation.navigate('MainTabs', { 
        screen: 'Parties',
        params: { successMessage: `${tab === 'SUPPLIER' ? 'Supplier' : tab === 'PURCHASER' ? 'Purchaser' : 'Party'} added successfully` }
      });
    },
    onError: (error: any) => {
      let msg = "Failed to add party";
      if (error?.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          msg = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          msg = error.response.data.detail.map((e: any) => e.msg).join(', ');
        }
      } else if (error?.message) {
        msg = error.message;
      }
      setErrors({ generic: msg });
    }
  });

  const handleSave = () => {
    let newErrors: {name?: string, mobile?: string, address?: string, opening_balance?: string} = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.mobile.trim()) {
      newErrors.mobile = "Mobile Number is required";
    } else if (!/^\d{10}$/.test(form.mobile.trim())) {
      newErrors.mobile = "Mobile Number must be exactly 10 digits";
    }
    if (!form.address.trim()) newErrors.address = "Address is required";
    if (form.opening_balance.trim() === '') newErrors.opening_balance = "Opening Balance is required (Enter 0 if Nil)";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    const amount = Math.abs(parseFloat(form.opening_balance) || 0);
    mutation.mutate({
      name: form.name,
      nickname: form.nickname,
      mobile: form.mobile,
      address: form.address,
      type: tab,
      opening_balance: openingDirection === 'CR' ? amount : -amount
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
          <TouchableOpacity 
            className={`flex-1 py-3 items-center ${tab === 'BOTH' ? 'bg-[#006948]' : 'bg-white'}`}
            onPress={() => setTab('BOTH')}
          >
            <Text className={`text-sm font-semibold ${tab === 'BOTH' ? 'text-white' : 'text-gray-500'}`}>Both</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-5">
          <View className="flex-row items-center mb-3">
            <User color="#006948" size={20} className="mr-2" />
            <Text className="text-sm font-semibold text-[#006948]">Details</Text>
          </View>
          
          {errors.generic ? (
            <View className="mb-4 bg-red-50 p-3 rounded-lg border border-red-200">
              <Text className="text-red-600 text-sm font-semibold text-center">{errors.generic}</Text>
            </View>
          ) : null}
          
          <View className="space-y-3">
            <View>
              <Text className="text-xs font-medium text-gray-700 mb-1">Name / Company Name *</Text>
              <TextInput 
                placeholder=". Pioneer Feeds"
                value={form.name}
                onChangeText={(v) => setForm({...form, name: v})}
                className={`w-full px-3 py-2.5 bg-white border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md text-sm`}
              />
              {errors.name ? (
                <Text className="text-red-500 text-xs mt-1">{errors.name}</Text>
              ) : null}
            </View>
            
            <View>
              <Text className="text-xs font-medium text-gray-700 mb-1">Nickname</Text>
              <TextInput 
                placeholder="Alias (Optional)"
                value={form.nickname}
                onChangeText={(v) => setForm({...form, nickname: v})}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-md text-sm"
              />
            </View>

            <View>
              <Text className="text-xs font-medium text-gray-700 mb-1">Mobile Number *</Text>
              <TextInput 
                placeholder="9876543210"
                keyboardType="phone-pad"
                maxLength={10}
                value={form.mobile}
                onChangeText={(v) => {
                  // Only allow digits
                  const numericValue = v.replace(/[^0-9]/g, '');
                  setForm({...form, mobile: numericValue});
                }}
                className={`w-full px-3 py-2.5 bg-white border ${errors.mobile ? 'border-red-500' : 'border-gray-300'} rounded-md text-sm`}
              />
              {errors.mobile ? (
                <Text className="text-red-500 text-xs mt-1">{errors.mobile}</Text>
              ) : null}
            </View>

            <View>
              <Text className="text-xs font-medium text-gray-700 mb-1">Address *</Text>
              <TextInput 
                placeholder=" 123 Main St, City"
                value={form.address}
                onChangeText={(v) => setForm({...form, address: v})}
                className={`w-full px-3 py-2.5 bg-white border ${errors.address ? 'border-red-500' : 'border-gray-300'} rounded-md text-sm`}
              />
              {errors.address ? (
                <Text className="text-red-500 text-xs mt-1">{errors.address}</Text>
              ) : null}
            </View>

            <View>
              <Text className="text-xs font-medium text-gray-700 mb-1">Opening Balance (₹) *</Text>
              <View className="flex-row gap-2 mb-2">
                <TouchableOpacity
                  onPress={() => setOpeningDirection('CR')}
                  className={`flex-1 py-2 items-center rounded-md border ${openingDirection === 'CR' ? 'bg-[#006948] border-[#006948]' : 'bg-white border-gray-300'}`}
                >
                  <Text className={`text-sm font-semibold ${openingDirection === 'CR' ? 'text-white' : 'text-gray-600'}`}>CR</Text>
                  <Text className={`text-[10px] ${openingDirection === 'CR' ? 'text-green-100' : 'text-gray-400'}`}>To Pay</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setOpeningDirection('DR')}
                  className={`flex-1 py-2 items-center rounded-md border ${openingDirection === 'DR' ? 'bg-[#006948] border-[#006948]' : 'bg-white border-gray-300'}`}
                >
                  <Text className={`text-sm font-semibold ${openingDirection === 'DR' ? 'text-white' : 'text-gray-600'}`}>DR</Text>
                  <Text className={`text-[10px] ${openingDirection === 'DR' ? 'text-green-100' : 'text-gray-400'}`}>To Receive</Text>
                </TouchableOpacity>
              </View>
              <TextInput 
                placeholder="0.00"
                keyboardType="numeric"
                value={form.opening_balance}
                onChangeText={(v) => {
                  const formatted = v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                  setForm({...form, opening_balance: formatted});
                }}
                className={`w-full px-3 py-2.5 bg-white border ${errors.opening_balance ? 'border-red-500' : 'border-gray-300'} rounded-md text-sm`}
              />
              {errors.opening_balance ? (
                <Text className="text-red-500 text-xs mt-1">{errors.opening_balance}</Text>
              ) : (
                <Text className="text-gray-500 text-xs mt-1">CR = To Pay, DR = To Receive</Text>
              )}
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
