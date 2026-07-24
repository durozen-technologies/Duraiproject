import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Tag, RefreshCcw } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';

export default function SalesScreen({ navigation }: any) {
  const { data: sales, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const response = await client.get(`/sales/`);
      return response.data;
    }
  });

  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-gray-200 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900">Sales</Text>
        <View className="flex-row items-center space-x-2">
          <TouchableOpacity 
            onPress={onRefresh}
            className="p-2 bg-gray-100 rounded-full mr-2"
          >
            <RefreshCcw color="#374151" size={18} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('NewSale')}
            className="bg-[#006948] flex-row items-center px-3 py-1.5 rounded-full"
          >
            <Plus color="white" size={16} className="mr-1" />
            <Text className="text-white text-sm font-semibold">New</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={['#006948']} />
        }
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#006948" className="mt-10" />
        ) : isError ? (
          <Text className="text-center text-red-500 mt-10">Error loading sales: {error?.message}</Text>
        ) : sales?.length === 0 ? (
          <Text className="text-center text-gray-500 mt-10">No sales found.</Text>
        ) : (
          sales?.map((sale: any) => (
            <TouchableOpacity 
              key={sale.id} 
              onPress={() => navigation.navigate('NewSale', { editData: sale })}
              className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex-row items-center justify-between mb-3"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-12 h-12 rounded-xl bg-gray-100 items-center justify-center mr-3">
                  <Tag color="#374151" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-900 text-base">{sale.date}</Text>
                  <Text className="text-xs text-gray-500 mt-1">Vehicle: {sale.vehicle_number || 'N/A'} {sale.driver_name ? `(${sale.driver_name})` : ''}</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">Birds: {sale.boxes * sale.birds_per_box} ({sale.weight} kg)</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-base font-bold text-[#006948]">
                  ₹{(sale.total_invoice_amount || 0).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
