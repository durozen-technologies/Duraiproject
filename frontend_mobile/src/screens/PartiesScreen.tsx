import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, RefreshCcw } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';

export default function PartiesScreen({ navigation }: any) {
  const [tab, setTab] = useState<'SUPPLIER' | 'PURCHASER'>('SUPPLIER');

  const { data: parties, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['parties', tab],
    queryFn: async () => {
      const response = await client.get(`/parties/?party_type=${tab}`);
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
        <Text className="text-lg font-bold text-gray-900">Parties</Text>
        <View className="flex-row items-center space-x-2">
          <TouchableOpacity 
            onPress={onRefresh}
            className="p-2 bg-gray-100 rounded-full mr-2"
          >
            <RefreshCcw color="#374151" size={18} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('NewParty')}
            className="bg-[#006948] flex-row items-center px-3 py-1.5 rounded-full"
          >
            <Plus color="white" size={16} className="mr-1" />
            <Text className="text-white text-sm font-semibold">Add Party</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View className="p-4 bg-white border-b border-gray-200">
        <View className="relative justify-center">
          <View className="absolute left-3 z-10">
            <Search color="#9ca3af" size={20} />
          </View>
          <TextInput 
            placeholder="Search purchasers or suppliers..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm"
          />
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-gray-200 bg-white">
        <TouchableOpacity 
          className={`flex-1 py-3 items-center ${tab === 'SUPPLIER' ? 'border-b-2 border-[#006948]' : ''}`}
          onClick={() => setTab('SUPPLIER')}
          onPress={() => setTab('SUPPLIER')}
        >
          <Text className={`text-sm font-semibold ${tab === 'SUPPLIER' ? 'text-[#006948]' : 'text-gray-500'}`}>Suppliers</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`flex-1 py-3 items-center ${tab === 'PURCHASER' ? 'border-b-2 border-[#006948]' : ''}`}
          onClick={() => setTab('PURCHASER')}
          onPress={() => setTab('PURCHASER')}
        >
          <Text className={`text-sm font-semibold ${tab === 'PURCHASER' ? 'text-[#006948]' : 'text-gray-500'}`}>Purchasers</Text>
        </TouchableOpacity>
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
          <Text className="text-center text-red-500 mt-10">Error loading parties: {error?.message}</Text>
        ) : parties?.length === 0 ? (
          <Text className="text-center text-gray-500 mt-10">No {tab}s found.</Text>
        ) : (
          parties?.map((party: any) => (
            <View key={party.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-xl bg-gray-100 items-center justify-center mr-3">
                  <Text className="text-gray-700 font-bold text-lg">{party.name.substring(0,2).toUpperCase()}</Text>
                </View>
                <View>
                  <Text className="font-medium text-gray-900 text-base">{party.name}</Text>
                  <Text className="text-xs text-gray-500 mt-1">{party.mobile || 'No phone'}</Text>
                  {party.address ? <Text className="text-xs text-gray-500 mt-0.5">{party.address}</Text> : null}
                </View>
              </View>
              <View className="items-end">
                <Text className={`text-base font-bold ${party.current_balance < 0 ? 'text-red-600' : 'text-[#006948]'}`}>
                  {party.current_balance < 0 ? '-' : '+'}₹{Math.abs(party.current_balance).toLocaleString()}
                </Text>
                <View className={`mt-1 px-2 py-0.5 rounded ${party.current_balance < 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                  <Text className={`text-[10px] font-bold ${party.current_balance < 0 ? 'text-red-600' : 'text-[#006948]'}`}>
                    {party.current_balance < 0 ? 'Owes You' : 'You Owe'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
