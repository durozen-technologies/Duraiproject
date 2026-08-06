import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, RefreshCcw, Search, Calendar as CalendarIcon, Tag, ShoppingCart } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import { formatDateToDDMMYYYY } from '../utils/formatDate';

export default function DriverDetailsScreen({ route, navigation }: any) {
  const { driverId, driverName } = route.params;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PURCHASE' | 'SALE'>('ALL');
  const formatAmount = (value: number) =>
    Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const { data: parties } = useQuery({
    queryKey: ['parties'],
    queryFn: async () => {
      const response = await client.get(`/parties/`);
      return response.data;
    }
  });

  const { data: items } = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const response = await client.get(`/items/`);
      return response.data;
    }
  });

  const { data: purchases, isLoading: loadingP, refetch: refetchP, isRefetching: isRefetchingP } = useQuery({
    queryKey: ['purchases', 'driver', driverId],
    queryFn: async () => {
      const response = await client.get(`/purchases/?driver_id=${driverId}`);
      return response.data;
    }
  });

  const { data: sales, isLoading: loadingS, refetch: refetchS, isRefetching: isRefetchingS } = useQuery({
    queryKey: ['sales', 'driver', driverId],
    queryFn: async () => {
      const response = await client.get(`/sales/?driver_id=${driverId}`);
      return response.data;
    }
  });

  const onRefresh = React.useCallback(() => {
    refetchP();
    refetchS();
  }, [refetchP, refetchS]);

  const isLoading = loadingP || loadingS;
  const isRefetching = isRefetchingP || isRefetchingS;

  const combinedBills = useMemo(() => {
    const all = [];
    if (purchases) {
      all.push(...purchases.map((p: any) => ({ ...p, _type: 'PURCHASE' })));
    }
    if (sales) {
      all.push(...sales.map((s: any) => ({ ...s, _type: 'SALE' })));
    }
    // sort by date desc
    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return all;
  }, [purchases, sales]);

  const filteredBills = useMemo(() => {
    return combinedBills.filter(bill => {
      if (filterType !== 'ALL' && bill._type !== filterType) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const partyName = parties?.find((p: any) => p.id === bill.party_id)?.name?.toLowerCase() || '';
        const billNo = bill.day_bill_number?.toLowerCase() || '';
        if (!partyName.includes(query) && !billNo.includes(query)) return false;
      }
      return true;
    });
  }, [combinedBills, filterType, searchQuery, parties]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-3 bg-white border-b border-gray-200 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1 rounded-full bg-gray-100">
            <ArrowLeft color="#374151" size={20} />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">{driverName}</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} className="p-2 bg-gray-100 rounded-full">
          <RefreshCcw color="#374151" size={18} />
        </TouchableOpacity>
      </View>

      <View className="p-4 bg-white border-b border-gray-200">
        <View className="relative justify-center mb-3">
          <View className="absolute left-3 z-10">
            <Search color="#9ca3af" size={20} />
          </View>
          <TextInput 
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by party or bill number..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm"
          />
        </View>

        <View className="flex-row space-x-2">
          <TouchableOpacity 
            className={`px-4 py-1.5 rounded-full border ${filterType === 'ALL' ? 'bg-[#006948] border-[#006948]' : 'bg-white border-gray-300'}`}
            onPress={() => setFilterType('ALL')}
          >
            <Text className={`text-xs font-semibold ${filterType === 'ALL' ? 'text-white' : 'text-gray-600'}`}>All Bills</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`px-4 py-1.5 rounded-full border ${filterType === 'PURCHASE' ? 'bg-[#006948] border-[#006948]' : 'bg-white border-gray-300'}`}
            onPress={() => setFilterType('PURCHASE')}
          >
            <Text className={`text-xs font-semibold ${filterType === 'PURCHASE' ? 'text-white' : 'text-gray-600'}`}>Purchases</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`px-4 py-1.5 rounded-full border ${filterType === 'SALE' ? 'bg-[#006948] border-[#006948]' : 'bg-white border-gray-300'}`}
            onPress={() => setFilterType('SALE')}
          >
            <Text className={`text-xs font-semibold ${filterType === 'SALE' ? 'text-white' : 'text-gray-600'}`}>Sales</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1 p-4"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={['#006948']} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#006948" className="mt-10" />
        ) : filteredBills.length === 0 ? (
          <Text className="text-center text-gray-500 mt-10">No bills found for this driver.</Text>
        ) : (
          filteredBills.map((bill: any) => {
            const partyName = parties?.find((p: any) => p.id === bill.party_id)?.name || 'Unknown Party';
            const itemName = items?.find((i: any) => i.id === bill.item_id)?.name;
            const isPurchase = bill._type === 'PURCHASE';
            
            const netWeight = isPurchase ? bill.net_weight : bill.weight;
            const count = isPurchase ? bill.actual_birds : bill.boxes * bill.birds_per_box;
            
            return (
              <View 
                key={`${bill._type}-${bill.id}`} 
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex-row items-center justify-between mb-3"
              >
                <View className="flex-row items-center flex-1">
                  <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 border ${isPurchase ? 'bg-blue-50 border-blue-100' : 'bg-green-50 border-green-100'}`}>
                    {isPurchase ? <ShoppingCart color="#2563EB" size={20} /> : <Tag color="#006948" size={20} />}
                  </View>
                  <View className="flex-1 mr-2">
                    <View className="flex-row items-center justify-between pr-2">
                      <Text className="font-bold text-gray-900 text-base flex-1" numberOfLines={1}>{partyName}</Text>
                    </View>
                    {bill.day_bill_number && <Text className="text-[11px] text-gray-600 font-bold mt-0.5">{bill.day_bill_number}</Text>}
                    {itemName ? <Text className="text-[11px] text-[#006948] font-bold mt-0.5">{itemName}</Text> : null}
                    <View className="flex-row items-center mt-0.5">
                      <Text className="text-[11px] text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded mr-2">{formatDateToDDMMYYYY(bill.date)}</Text>
                      <Text className="text-xs text-gray-500">{count} Birds ({netWeight}kg)</Text>
                    </View>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-[10px] text-gray-400 font-bold mb-0.5">{isPurchase ? 'PURCHASE' : 'SALE'}</Text>
                  {bill.balance_amount > 0 ? (
                    <View className="bg-red-50 px-2 py-0.5 rounded-md mt-1 border border-red-100">
                       <Text className="text-[10px] text-red-600 font-bold tracking-wide">BAL ₹{formatAmount(bill.balance_amount)}</Text>
                    </View>
                  ) : (
                    <View className="bg-green-50 px-2 py-0.5 rounded-md mt-1 border border-green-100">
                       <Text className="text-[10px] text-[#006948] font-bold tracking-wide">SETTLED</Text>
                    </View>
                  )}
                </View>
              </View>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
