import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, RefreshCcw, Box, ArrowLeft } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';

export default function ItemsScreen({ navigation, route }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  React.useEffect(() => {
    if (route.params?.successMessage) {
      setSuccessMsg(route.params.successMessage);
      navigation.setParams({ successMessage: undefined });
    }
  }, [route.params?.successMessage]);

  React.useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const { data: items, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const response = await client.get('/items/');
      return response.data;
    }
  });

  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  const filteredItems = items?.filter((item: any) => 
    searchQuery === '' || item.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-gray-200 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'Dashboard' }))}
            className="mr-3"
          >
            <ArrowLeft color="#111827" size={24} />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Items</Text>
        </View>
        <View className="flex-row items-center space-x-2">
          <TouchableOpacity 
            onPress={onRefresh}
            className="p-2 bg-gray-100 rounded-full mr-2"
          >
            <RefreshCcw color="#374151" size={18} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('NewItem')}
            className="bg-[#006948] flex-row items-center px-3 py-1.5 rounded-full"
          >
            <Plus color="white" size={16} className="mr-1" />
            <Text className="text-white text-sm font-semibold">Add Item</Text>
          </TouchableOpacity>
        </View>
      </View>

      {successMsg ? (
        <View className="absolute bottom-12 self-center bg-[#059669] px-6 py-3 rounded-full z-50 shadow-lg elevation-5 flex-row items-center justify-center min-w-[250px]">
          <Text className="text-white font-medium text-sm text-center">{successMsg}</Text>
        </View>
      ) : null}

      {/* Search Bar */}
      <View className="p-4 bg-white border-b border-gray-200">
        <View className="relative justify-center">
          <View className="absolute left-3 z-10">
            <Search color="#9ca3af" size={20} />
          </View>
          <TextInput 
            placeholder="Search items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm"
          />
        </View>
      </View>

      {/* List */}
      <ScrollView 
        className="flex-1 px-4 py-3"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={['#006948']} />
        }
      >
        {isLoading ? (
          <View className="py-10 items-center justify-center">
            <ActivityIndicator size="large" color="#006948" />
          </View>
        ) : isError ? (
          <View className="py-10 items-center justify-center">
            <Text className="text-red-500 font-semibold mb-2">Failed to load items</Text>
            <TouchableOpacity onPress={onRefresh} className="px-4 py-2 bg-gray-200 rounded">
              <Text className="text-gray-700">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredItems.length === 0 ? (
          <View className="py-10 items-center justify-center">
            <Box color="#9ca3af" size={48} className="mb-3 opacity-50" />
            <Text className="text-gray-500 font-semibold">No items found</Text>
            <Text className="text-gray-400 text-sm mt-1 text-center">Try a different search or add a new item.</Text>
          </View>
        ) : (
          filteredItems.map((item: any) => (
            <TouchableOpacity 
              key={item.id} 
              className="bg-white p-4 rounded-xl mb-3 border border-gray-200 shadow-sm flex-row items-center justify-between"
              onPress={() => navigation.navigate('NewItem', { editData: item })}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-[#ecfdf5] items-center justify-center mr-3 border border-[#d1fae5]">
                  <Box color="#059669" size={20} />
                </View>
                <View>
                  <Text className="text-base font-bold text-gray-900">{item.name}</Text>
                  {!item.is_active && (
                    <Text className="text-xs text-red-500 mt-0.5">Inactive</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
