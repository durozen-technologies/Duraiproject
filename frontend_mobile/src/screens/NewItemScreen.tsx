import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { ArrowLeft, Save, Box } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

export default function NewItemScreen({ navigation, route }: any) {
  const queryClient = useQueryClient();
  const editData = route.params?.editData;
  const isEditing = !!editData;

  const [form, setForm] = useState({
    name: editData?.name || '',
    is_active: editData?.is_active ?? true,
  });

  const [errors, setErrors] = useState<any>({});
  const [errorMsg, setErrorMsg] = useState('');

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        const response = await client.put(`/items/${editData.id}`, data);
        return response.data;
      } else {
        const response = await client.post('/items/', data);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      const successMessage = `Item ${isEditing ? 'updated' : 'created'} successfully`;
      // RN 7: navigate() pushes a new Items screen; popTo returns to the existing one
      if (typeof navigation.popTo === 'function') {
        navigation.popTo('Items', { successMessage });
      } else if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace('Items', { successMessage });
      }
    },
    onError: (error: any) => {
      setErrorMsg(error.response?.data?.detail || "An error occurred");
    }
  });

  const handleSave = () => {
    let newErrors: any = {};
    if (!form.name.trim()) newErrors.name = 'Item Name is required';
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;
    setErrorMsg('');

    mutation.mutate({
      name: form.name.trim(),
      is_active: form.is_active
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-gray-200 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1">
            <ArrowLeft color="#374151" size={24} />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">{isEditing ? 'Edit Item' : 'New Item'}</Text>
        </View>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={mutation.isPending}
          className={`flex-row items-center px-4 py-1.5 rounded-full ${mutation.isPending ? 'bg-gray-400' : 'bg-[#006948]'}`}
        >
          {mutation.isPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Save color="white" size={16} className="mr-1.5" />
              <Text className="text-white font-semibold">Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView 
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {errorMsg ? (
          <View className="bg-red-50 p-3 rounded-lg border border-red-200 mb-4">
            <Text className="text-red-600 font-medium text-sm text-center">{errorMsg}</Text>
          </View>
        ) : null}

        <View className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
          <View className="flex-row items-center mb-4">
            <Box color="#006948" size={20} className="mr-2" />
            <Text className="text-base font-bold text-gray-900">Item Details</Text>
          </View>

          {/* Name */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-1.5">
              Item Name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={form.name}
              onChangeText={(text) => {
                setForm({...form, name: text});
                if (errors.name) setErrors({...errors, name: null});
              }}
              placeholder="e.g. Broiler Chicken"
              className={`w-full px-4 py-3 bg-gray-50 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-xl text-gray-900`}
            />
            {errors.name && <Text className="text-xs text-red-500 mt-1">{errors.name}</Text>}
          </View>

          {/* Status */}
          {isEditing && (
            <View className="flex-row items-center justify-between mt-2 pt-4 border-t border-gray-100">
              <View>
                <Text className="text-sm font-semibold text-gray-700">Active Status</Text>
                <Text className="text-xs text-gray-500 mt-0.5">Inactive items won't appear in dropdowns</Text>
              </View>
              <Switch
                value={form.is_active}
                onValueChange={(val) => setForm({...form, is_active: val})}
                trackColor={{ false: "#d1d5db", true: "#059669" }}
                thumbColor={"#ffffff"}
              />
            </View>
          )}
        </View>

        <View className="h-10" />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
