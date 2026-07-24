import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, ShoppingCart, Receipt, BarChart2, Users, Truck, ChevronRight } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import client from '../api/client';

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const response = await client.get('/dashboard/stats');
      return response.data;
    }
  });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#006948" />
      </SafeAreaView>
    );
  }

  // Fallback defaults if data is empty
  const stats = data || {
    total_sales: 0,
    total_purchases: 0,
    total_expenses: 0,
    net_profit: 0,
    birds_sold: 0,
    birds_purchased: 0,
    avg_weight_sold: 0
  };
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top App Bar */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <Text className="text-xl font-bold text-[#006948]">Broiler 360</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Date Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          <TouchableOpacity className="px-5 py-2 bg-[#006948] rounded-md shadow-sm mr-2">
            <Text className="text-white font-semibold">Today</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-5 py-2 bg-white border border-gray-300 rounded-md shadow-sm mr-2">
            <Text className="text-gray-700 font-semibold">Yesterday</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-5 py-2 bg-white border border-gray-300 rounded-md shadow-sm mr-2">
            <Text className="text-gray-700 font-semibold">This Week</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Grid Cards */}
        <View className="flex-row flex-wrap justify-between mb-6">
          {/* Total Sales */}
          <View className="w-[48%] bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 h-28 justify-between">
            <View className="flex-row justify-between items-start">
              <Text className="text-xs font-bold text-gray-600 tracking-wider">TOTAL SALES</Text>
              <TrendingUp color="#006948" size={16} />
            </View>
            <View>
              <Text className="text-lg font-bold text-gray-900">₹{stats.total_sales.toLocaleString()}</Text>
            </View>
          </View>

          {/* Total Purchase */}
          <View className="w-[48%] bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 h-28 justify-between">
            <View className="flex-row justify-between items-start">
              <Text className="text-xs font-bold text-gray-600 tracking-wider">PURCHASES</Text>
              <ShoppingCart color="#6b7280" size={16} />
            </View>
            <View>
              <Text className="text-lg font-bold text-gray-900">₹{stats.total_purchases.toLocaleString()}</Text>
            </View>
          </View>

          {/* Total Expenses */}
          <View className="w-[48%] bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 h-28 justify-between">
            <View className="flex-row justify-between items-start">
              <Text className="text-xs font-bold text-gray-600 tracking-wider">EXPENSES</Text>
              <Receipt color="#6b7280" size={16} />
            </View>
            <View>
              <Text className="text-lg font-bold text-gray-900">₹{stats.total_expenses.toLocaleString()}</Text>
            </View>
          </View>

          {/* Net Profit */}
          <View className="w-[48%] bg-[#006948] p-4 rounded-xl shadow-sm mb-3 h-28 justify-between">
            <View className="flex-row justify-between items-start">
              <Text className="text-xs font-bold text-white tracking-wider">NET PROFIT</Text>
              <BarChart2 color="white" size={16} />
            </View>
            <View>
              <Text className="text-lg font-bold text-white">₹{stats.net_profit.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-3">Quick Actions</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity 
              onPress={() => navigation.navigate('Expenses' as never)}
              className="flex-1 bg-white p-3 rounded-xl border border-gray-200 flex-row items-center shadow-sm"
            >
              <View className="w-10 h-10 rounded-lg bg-green-100 items-center justify-center mr-3">
                <Receipt color="#006948" size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-gray-900">Expenses</Text>
                <Text className="text-xs text-gray-500">Record daily spend</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate('ExpenseCategories' as never)}
              className="flex-1 bg-white p-3 rounded-xl border border-gray-200 flex-row items-center shadow-sm"
            >
              <View className="w-10 h-10 rounded-lg bg-gray-100 items-center justify-center mr-3">
                <BarChart2 color="#374151" size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-gray-900">Categories</Text>
                <Text className="text-xs text-gray-500">Manage types</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Outstanding */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-3">Outstanding</Text>
          <View className="bg-white p-3 rounded-xl border border-gray-200 flex-row items-center justify-between shadow-sm mb-2">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-lg bg-orange-400 items-center justify-center mr-3">
                <Users color="white" size={20} />
              </View>
              <View className="ml-3">
                <Text className="text-xs font-semibold text-gray-600">Purchaser Dues</Text>
                <Text className="text-base font-bold text-gray-900">₹1,24,000</Text>
              </View>
            </View>
            <ChevronRight color="#9ca3af" size={20} />
          </View>
          
          <View className="bg-white p-3 rounded-xl border border-gray-200 flex-row items-center justify-between shadow-sm">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-lg bg-gray-200 items-center justify-center mr-3">
                <Truck color="#374151" size={20} />
              </View>
              <View>
                <Text className="text-xs font-semibold text-gray-600">Supplier Payables</Text>
                <Text className="text-base font-bold text-gray-900">₹85,500</Text>
              </View>
            </View>
            <ChevronRight color="#9ca3af" size={20} />
          </View>
        </View>

        {/* Flock Movement */}
        <View className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-10">
          <Text className="text-lg font-bold text-gray-900 mb-4">Flock Movement</Text>
          <View className="flex-row justify-between items-end mb-4">
            <View>
              <Text className="text-xs font-semibold text-gray-600">Birds Sold</Text>
              <Text className="text-xl font-bold text-gray-900">{stats.birds_sold}</Text>
            </View>
            <View className="items-end">
              <Text className="text-xs font-semibold text-gray-600">Avg. Weight</Text>
              <Text className="text-base font-bold text-[#006948]">{stats.avg_weight_sold.toFixed(2)} kg</Text>
            </View>
          </View>
          <View className="h-px bg-gray-100 mb-4 w-full" />
          <View className="flex-row justify-between items-end">
            <View>
              <Text className="text-xs font-semibold text-gray-600">Birds Purchased</Text>
              <Text className="text-xl font-bold text-gray-900">{stats.birds_purchased}</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
