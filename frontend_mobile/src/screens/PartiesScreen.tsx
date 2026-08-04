import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, RefreshCcw } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import PartyDetailsModal from '../components/PartyDetailsModal';

export default function PartiesScreen({ navigation, route }: any) {
  const [filter, setFilter] = useState<'ALL' | 'SUPPLIER' | 'PURCHASER'>('ALL');
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  React.useEffect(() => {
    if (route.params?.successMessage) {
      setSuccessMsg(route.params.successMessage);
      // Clear the param so it doesn't show again on returning to screen
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

  const { data: parties, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['parties', filter],
    queryFn: async () => {
      const url = filter === 'ALL' ? '/parties/' : `/parties/?party_type=${filter}`;
      const response = await client.get(url);
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
            placeholder="Search purchasers or suppliers..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm"
          />
        </View>
      </View>

      {/* Filters */}
      <View className="flex-row px-4 py-3 bg-white border-b border-gray-200 space-x-2">
        <TouchableOpacity 
          className={`px-4 py-1.5 rounded-full border ${filter === 'ALL' ? 'bg-[#006948] border-[#006948]' : 'bg-white border-gray-300'}`}
          onPress={() => setFilter('ALL')}
        >
          <Text className={`text-xs font-semibold ${filter === 'ALL' ? 'text-white' : 'text-gray-600'}`}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`px-4 py-1.5 rounded-full border ${filter === 'SUPPLIER' ? 'bg-[#006948] border-[#006948]' : 'bg-white border-gray-300'}`}
          onPress={() => setFilter('SUPPLIER')}
        >
          <Text className={`text-xs font-semibold ${filter === 'SUPPLIER' ? 'text-white' : 'text-gray-600'}`}>Suppliers</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`px-4 py-1.5 rounded-full border ${filter === 'PURCHASER' ? 'bg-[#006948] border-[#006948]' : 'bg-white border-gray-300'}`}
          onPress={() => setFilter('PURCHASER')}
        >
          <Text className={`text-xs font-semibold ${filter === 'PURCHASER' ? 'text-white' : 'text-gray-600'}`}>Purchasers</Text>
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
          <Text className="text-center text-gray-500 mt-10">No parties found.</Text>
        ) : (
          parties
            ?.sort((a: any, b: any) => {
              if (a.is_active === b.is_active) return a.name.localeCompare(b.name);
              return a.is_active ? -1 : 1;
            })
            .map((party: any) => (
            <TouchableOpacity 
              key={party.id} 
              onPress={() => {
                setSelectedParty(party);
                setModalVisible(true);
              }}
              className={`p-4 rounded-xl border shadow-sm flex-row items-center justify-between mb-3 ${party.is_active ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-300 opacity-80'}`}
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-xl bg-gray-200 items-center justify-center mr-3">
                  <Text className="text-gray-700 font-bold text-lg">{party.name.substring(0,2).toUpperCase()}</Text>
                </View>
                <View>
                  <View className="flex-row items-center space-x-2">
                    <Text className={`font-medium text-base ${party.is_active ? 'text-gray-900' : 'text-gray-600 line-through'}`}>{party.name}</Text>
                    {!party.is_active && (
                      <View className="bg-gray-300 px-2 py-0.5 rounded-full">
                        <Text className="text-[10px] font-bold text-gray-700">Disabled</Text>
                      </View>
                    )}
                  </View>
                  {party.nickname ? <Text className="text-xs text-gray-500 italic mt-0.5">{party.nickname}</Text> : null}
                  <Text className="text-xs text-gray-500 mt-1">{party.mobile || 'No phone'}</Text>
                  {party.address ? <Text className="text-xs text-gray-500 mt-0.5">{party.address}</Text> : null}
                </View>
              </View>
              <View className="items-end ml-2">
                {party.unpaid_opening_balance !== 0 && (
                  <Text className="text-xs text-gray-400 mb-1">Opening: ₹{party.unpaid_opening_balance?.toLocaleString()}</Text>
                )}
                {party.total_pending_invoice_amount > 0 && (
                  <Text className="text-[10px] font-bold text-gray-500 mb-0.5">Pending Bill: ₹{party.total_pending_invoice_amount?.toLocaleString()}</Text>
                )}
                <Text className="text-xs text-gray-500 mb-1">Balance Due</Text>
                <Text className={`text-lg font-bold ${(party.current_balance - (party.unpaid_opening_balance || 0)) > 0 ? 'text-red-500' : 'text-[#006948]'}`}>
                  ₹{(party.current_balance - (party.unpaid_opening_balance || 0)).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <PartyDetailsModal 
        isVisible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedParty(null);
        }}
        party={selectedParty}
      />
    </SafeAreaView>
  );
}
