import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ShoppingCart, RefreshCcw, Calendar as CalendarIcon, Search, X } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import client from '../api/client';
import { formatDateToDDMMYYYY } from '../utils/formatDate';

export default function PurchasesScreen({ navigation }: any) {
  const [selectedParty, setSelectedParty] = useState('all');
  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');

  const { data: purchases, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const response = await client.get(`/purchases/`);
      return response.data;
    }
  });

  const { data: parties } = useQuery({
    queryKey: ['parties'],
    queryFn: async () => {
      const response = await client.get(`/parties/`);
      return response.data;
    }
  });

  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  const filteredPurchases = useMemo(() => {
    if (!purchases) return [];
    
    const getTodayStr = () => {
      const d = new Date();
      return d.toISOString().split('T')[0];
    };
    
    const getWeekStartStr = () => {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay());
      return d.toISOString().split('T')[0];
    };
    
    const getMonthStr = () => getTodayStr().slice(0, 7);
    const getYearStr = () => getTodayStr().slice(0, 4);

    return purchases.filter((p: any) => {
      if (searchQuery && !p.bill_number?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedParty !== 'all' && p.party_id !== selectedParty) return false;
      
      if (selectedDate !== 'all') {
        if (selectedDate === 'today' && p.date !== getTodayStr()) return false;
        if (selectedDate === 'week' && p.date < getWeekStartStr()) return false;
        if (selectedDate === 'month' && !p.date.startsWith(getMonthStr())) return false;
        if (selectedDate === 'year' && !p.date.startsWith(getYearStr())) return false;
        if (selectedDate === 'custom') {
          const pDate = new Date(p.date);
          pDate.setHours(0,0,0,0);
          const s = new Date(startDate);
          s.setHours(0,0,0,0);
          const e = new Date(endDate);
          e.setHours(23,59,59,999);
          if (pDate < s || pDate > e) return false;
        }
      }
      
      if (selectedStatus === 'pending' && (p.balance_amount || 0) <= 0) return false;
      if (selectedStatus === 'paid' && (p.balance_amount || 0) > 0) return false;
      
      return true;
    });
  }, [purchases, selectedParty, selectedDate, selectedStatus, startDate, endDate]);

  const totalAmount = filteredPurchases.reduce((sum: number, p: any) => sum + (p.purchase_amount || 0), 0);
  let totalBalance = filteredPurchases.reduce((sum: number, p: any) => sum + (p.balance_amount || 0), 0);

  if (parties) {
    if (selectedParty !== 'all') {
      const p = parties.find((party: any) => party.id === selectedParty);
      if (p) {
        totalBalance += (p.unpaid_opening_balance || 0);
      }
    } else {
      parties.forEach((p: any) => {
        if (p.type === 'PURCHASER' && p.is_active !== false) {
          totalBalance += (p.unpaid_opening_balance || 0);
        }
      });
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-gray-200 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900">Purchases</Text>
        <View className="flex-row items-center space-x-2">
          <TouchableOpacity 
            onPress={onRefresh}
            className="p-2 bg-gray-100 rounded-full mr-2"
          >
            <RefreshCcw color="#374151" size={18} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('NewPurchase')}
            className="bg-[#006948] flex-row items-center px-3 py-1.5 rounded-full"
          >
            <Plus color="white" size={16} className="mr-1" />
            <Text className="text-white text-sm font-semibold">New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View className="bg-white px-4 py-3 pb-4 space-y-3 z-10 border-b border-gray-100">
        <View className="flex-row space-x-3">
          <View className="flex-1">
            <View className="bg-gray-50 rounded-xl justify-center border border-gray-200">
              <Picker
                selectedValue={selectedParty}
                onValueChange={(itemValue) => setSelectedParty(itemValue)}
              >
                <Picker.Item label="All Parties" value="all" style={{ fontSize: 15 }} />
                {parties?.filter((p: any) => p.type === 'PURCHASER' && p.is_active !== false).map((party: any) => (
                  <Picker.Item key={party.id} label={party.name} value={party.id} style={{ fontSize: 15 }} />
                ))}
              </Picker>
            </View>
          </View>
          <View className="flex-1">
            <View className="bg-gray-50 rounded-xl justify-center border border-gray-200">
              <Picker
                selectedValue={selectedDate}
                onValueChange={(itemValue) => setSelectedDate(itemValue)}
              >
                <Picker.Item label="Today" value="today" style={{ fontSize: 15 }} />
                <Picker.Item label="This Week" value="week" style={{ fontSize: 15 }} />
                <Picker.Item label="This Month" value="month" style={{ fontSize: 15 }} />
                <Picker.Item label="This Year" value="year" style={{ fontSize: 15 }} />
                <Picker.Item label="Custom" value="custom" style={{ fontSize: 15 }} />
                <Picker.Item label="All Time" value="all" style={{ fontSize: 15 }} />
              </Picker>
            </View>
          </View>
        </View>

        {selectedDate === 'custom' && (
          <View className="flex-row space-x-2 mt-2">
            <TouchableOpacity 
              onPress={() => setShowStartPicker(true)}
              className="flex-1 bg-gray-100 rounded-lg h-10 flex-row items-center justify-between px-3"
            >
              <Text className="text-gray-700 text-sm">Start: {startDate.toISOString().split('T')[0]}</Text>
              <CalendarIcon size={16} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowEndPicker(true)}
              className="flex-1 bg-gray-100 rounded-lg h-10 flex-row items-center justify-between px-3"
            >
              <Text className="text-gray-700 text-sm">End: {endDate.toISOString().split('T')[0]}</Text>
              <CalendarIcon size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        )}
        
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onValueChange={(event, date) => {
              setShowStartPicker(Platform.OS === 'ios');
              if (date) setStartDate(date);
            }}
            onDismiss={() => setShowStartPicker(false)}
          />
        )}
        
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onValueChange={(event, date) => {
              setShowEndPicker(Platform.OS === 'ios');
              if (date) setEndDate(date);
            }}
            onDismiss={() => setShowEndPicker(false)}
          />
        )}

        {/* Summary Card */}
        <View className="bg-[#006948] py-3 px-4 rounded-xl flex-row justify-between items-center shadow-sm">
          <View className="flex-1">
            <Text className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider">Total Purchases</Text>
            <Text className="text-white text-lg font-bold mt-0.5" numberOfLines={1} adjustsFontSizeToFit>₹{totalAmount.toLocaleString()}</Text>
          </View>
          <View className="h-8 w-[1px] bg-white/20 mx-4" />
          <View className="flex-1 items-end">
            <Text className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider">Balance Due</Text>
            <Text className="text-white text-lg font-bold mt-0.5" numberOfLines={1} adjustsFontSizeToFit>₹{totalBalance.toLocaleString()}</Text>
          </View>
        </View>

        {/* Status Chips */}
        <View className="flex-row space-x-2 pt-1">
          {['all', 'pending', 'paid'].map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setSelectedStatus(status as any)}
              className={`px-4 py-1.5 rounded-full border ${selectedStatus === status ? 'bg-gray-800 border-gray-800' : 'bg-gray-50 border-gray-200'}`}
            >
              <Text className={`text-xs font-semibold capitalize tracking-wide ${selectedStatus === status ? 'text-white' : 'text-gray-600'}`}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search Bar for Bill Number */}
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2 mt-2">
          <Search color="#6b7280" size={20} className="mr-2" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by bill number..."
            className="flex-1 text-base text-gray-900 py-1"
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X color="#9ca3af" size={20} />
            </TouchableOpacity>
          )}
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
          <Text className="text-center text-red-500 mt-10">Error loading purchases: {error?.message}</Text>
        ) : filteredPurchases.length === 0 ? (
          <View className="items-center justify-center py-12 px-4 mt-8">
            <View className="bg-gray-100 p-4 rounded-full mb-4">
              <ShoppingCart size={32} color="#9CA3AF" />
            </View>
            <Text className="text-gray-900 text-lg font-bold mb-1">No purchases found</Text>
            <Text className="text-gray-500 text-center mb-6 text-sm">Try adjusting your filters or create a new purchase.</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('NewPurchase')}
              className="bg-[#006948] px-6 py-3 rounded-full flex-row items-center"
            >
              <Plus color="white" size={18} className="mr-2" />
              <Text className="text-white font-semibold">New Purchase</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredPurchases.map((purchase: any) => {
            const partyName = parties?.find((p: any) => p.id === purchase.party_id)?.name || 'Unknown Party';
            return (
            <TouchableOpacity 
              key={purchase.id} 
              onPress={() => navigation.navigate('NewPurchase', { editData: purchase })}
              className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex-row items-center justify-between mb-3"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-12 h-12 rounded-full bg-green-50 items-center justify-center mr-3 border border-green-100">
                  <ShoppingCart color="#006948" size={20} />
                </View>
                <View className="flex-1 mr-2">
                  <View className="flex-row items-center justify-between pr-2">
                    <Text className="font-bold text-gray-900 text-base flex-1" numberOfLines={1}>{partyName}</Text>
                  </View>
                  {purchase.bill_number && <Text className="text-[11px] text-gray-600 font-bold mt-0.5">{purchase.bill_number}</Text>}
                  <View className="flex-row items-center mt-0.5">
                    <Text className="text-[11px] text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded mr-2">{formatDateToDDMMYYYY(purchase.date)}</Text>
                    <Text className="text-xs text-gray-500">{purchase.actual_birds} Birds ({purchase.net_weight}kg)</Text>
                  </View>
                  <Text className="text-[11px] text-gray-400 mt-1" numberOfLines={1}>Vehicle: {purchase.vehicle_number || 'N/A'}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-base font-bold text-gray-900">
                  ₹{purchase.purchase_amount.toLocaleString()}
                </Text>
                {purchase.balance_amount > 0 ? (
                  <View className="bg-red-50 px-2 py-0.5 rounded-md mt-1 border border-red-100">
                     <Text className="text-[10px] text-red-600 font-bold tracking-wide">DUE ₹{purchase.balance_amount.toLocaleString()}</Text>
                  </View>
                ) : (
                  <View className="bg-green-50 px-2 py-0.5 rounded-md mt-1 border border-green-100">
                     <Text className="text-[10px] text-[#006948] font-bold tracking-wide">PAID</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )})
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
