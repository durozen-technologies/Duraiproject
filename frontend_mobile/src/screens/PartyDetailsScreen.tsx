import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, RefreshCcw, Calendar as CalendarIcon, ShoppingCart, Tag, Edit2 } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import client from '../api/client';
import PartyDetailsModal from '../components/PartyDetailsModal';
import { formatDateToDDMMYYYY } from '../utils/formatDate';

type DateFilter = 'today' | 'week' | 'month' | 'year' | 'custom' | 'all';
type BillTab = 'PURCHASE' | 'SALE';

export default function PartyDetailsScreen({ navigation, route }: any) {
  const { partyId } = route.params || {};
  const [selectedDate, setSelectedDate] = useState<DateFilter>('today');
  const [activeTab, setActiveTab] = useState<BillTab>('PURCHASE');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const formatAmount = (value: number) =>
    Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const { data: party, isLoading: partyLoading, isError: partyError, error: partyErr, refetch: refetchParty, isRefetching: partyRefetching } = useQuery({
    queryKey: ['party', partyId],
    queryFn: async () => {
      const response = await client.get(`/parties/${partyId}`);
      return response.data;
    },
    enabled: !!partyId,
  });

  const showsPurchase = party?.type === 'PURCHASER' || party?.type === 'BOTH';
  const showsSale = party?.type === 'SUPPLIER' || party?.type === 'BOTH';

  useEffect(() => {
    if (!party) return;
    if (party.type === 'SUPPLIER') {
      setActiveTab('SALE');
      return;
    }
    setActiveTab('PURCHASE');
  }, [party]);

  const dateParams = useMemo(() => {
    const getToday = () => {
      const d = new Date();
      return d.toISOString().split('T')[0];
    };
    const getWeekStart = () => {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay());
      return d.toISOString().split('T')[0];
    };
    const getMonthStart = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    };
    const getYearStart = () => {
      const d = new Date();
      return `${d.getFullYear()}-01-01`;
    };

    if (selectedDate === 'today') {
      const today = getToday();
      return { from_date: today, to_date: today };
    }
    if (selectedDate === 'week') {
      return { from_date: getWeekStart(), to_date: getToday() };
    }
    if (selectedDate === 'month') {
      return { from_date: getMonthStart(), to_date: getToday() };
    }
    if (selectedDate === 'year') {
      return { from_date: getYearStart(), to_date: getToday() };
    }
    if (selectedDate === 'custom') {
      const from = new Date(startDate);
      const to = new Date(endDate);
      const fromStr = from.toISOString().split('T')[0];
      const toStr = to.toISOString().split('T')[0];
      return fromStr <= toStr
        ? { from_date: fromStr, to_date: toStr }
        : { from_date: toStr, to_date: fromStr };
    }
    return {};
  }, [selectedDate, startDate, endDate]);

  const { data: purchases, isLoading: purchasesLoading, refetch: refetchPurchases, isRefetching: purchasesRefetching } = useQuery({
    queryKey: ['purchases', 'party', partyId, dateParams],
    queryFn: async () => {
      const response = await client.get('/purchases/', {
        params: { party_id: partyId, ...dateParams },
      });
      return response.data;
    },
    enabled: !!partyId && showsPurchase,
  });

  const { data: sales, isLoading: salesLoading, refetch: refetchSales, isRefetching: salesRefetching } = useQuery({
    queryKey: ['sales', 'party', partyId, dateParams],
    queryFn: async () => {
      const response = await client.get('/sales/', {
        params: { party_id: partyId, ...dateParams },
      });
      return response.data;
    },
    enabled: !!partyId && showsSale,
  });

  const { data: items } = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const response = await client.get(`/items/`);
      return response.data;
    }
  });

  const onRefresh = React.useCallback(() => {
    refetchParty();
    if (showsPurchase) refetchPurchases();
    if (showsSale) refetchSales();
  }, [refetchParty, showsPurchase, showsSale, refetchPurchases, refetchSales]);

  const currentBills = activeTab === 'PURCHASE' ? purchases || [] : sales || [];
  const isBillsLoading = activeTab === 'PURCHASE' ? purchasesLoading : salesLoading;
  const isRefreshing = partyRefetching || purchasesRefetching || salesRefetching;

  if (!partyId) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-red-600">Invalid party selection.</Text>
      </SafeAreaView>
    );
  }

  if (partyLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#006948" />
      </SafeAreaView>
    );
  }

  if (partyError || !party) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Text className="text-red-600 text-center">
          Failed to load party details: {partyErr?.message || 'Unknown error'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-3 bg-white border-b border-gray-200 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1 rounded-full bg-gray-100">
            <ArrowLeft color="#374151" size={20} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>{party.name}</Text>
            <Text className="text-xs text-gray-500">{party.type}</Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={onRefresh} className="p-2 bg-gray-100 rounded-full mr-2">
            <RefreshCcw color="#374151" size={18} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsEditOpen(true)} className="bg-[#006948] rounded-full px-3 py-2 flex-row items-center">
            <Edit2 color="white" size={14} />
            <Text className="text-white text-xs font-semibold ml-1">Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="bg-[#006948] py-3 px-4 rounded-xl flex-row justify-between items-center">
          <View>
            <Text className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider">
              {party.current_balance > 0 ? 'To Pay' : party.current_balance < 0 ? 'To Receive' : 'Balance'}
            </Text>
            <Text className="text-white text-xl font-bold mt-0.5">
              ₹{formatAmount(Math.abs(party.current_balance || 0))}
              {party.current_balance > 0 ? ' CR' : party.current_balance < 0 ? ' DR' : ''}
            </Text>
          </View>
          {party.unpaid_opening_balance !== 0 ? (
            <View className="items-end">
              <Text className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider">Opening</Text>
              <Text className="text-white text-sm font-semibold mt-0.5">
                ₹{formatAmount(Math.abs(party.unpaid_opening_balance || 0))}
                {party.unpaid_opening_balance < 0 ? ' DR' : ' CR'}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mt-3">
          <View className="bg-gray-50 rounded-xl justify-center border border-gray-200">
            <Picker selectedValue={selectedDate} onValueChange={(itemValue) => setSelectedDate(itemValue)}>
              <Picker.Item label="Today" value="today" style={{ fontSize: 15 }} />
              <Picker.Item label="This Week" value="week" style={{ fontSize: 15 }} />
              <Picker.Item label="This Month" value="month" style={{ fontSize: 15 }} />
              <Picker.Item label="This Year" value="year" style={{ fontSize: 15 }} />
              <Picker.Item label="Custom" value="custom" style={{ fontSize: 15 }} />
              <Picker.Item label="All Time" value="all" style={{ fontSize: 15 }} />
            </Picker>
          </View>
        </View>

        {selectedDate === 'custom' && (
          <>
            {Platform.OS === 'web' ? (
              <View className="flex-row space-x-2 mt-2">
                <View className="flex-1 bg-gray-100 rounded-lg h-10 flex-row items-center justify-between px-3 border border-gray-200">
                  <Text className="text-gray-700 text-sm mr-2">Start</Text>
                  <input
                    type="date"
                    value={startDate.toISOString().split('T')[0]}
                    onChange={(e: any) => {
                      const d = new Date(e.target.value);
                      if (!Number.isNaN(d.getTime())) setStartDate(d);
                    }}
                    style={{ flex: 1, border: 'none', background: 'transparent', color: '#374151', fontSize: 14 }}
                  />
                </View>
                <View className="flex-1 bg-gray-100 rounded-lg h-10 flex-row items-center justify-between px-3 border border-gray-200">
                  <Text className="text-gray-700 text-sm mr-2">End</Text>
                  <input
                    type="date"
                    value={endDate.toISOString().split('T')[0]}
                    onChange={(e: any) => {
                      const d = new Date(e.target.value);
                      if (!Number.isNaN(d.getTime())) setEndDate(d);
                    }}
                    style={{ flex: 1, border: 'none', background: 'transparent', color: '#374151', fontSize: 14 }}
                  />
                </View>
              </View>
            ) : (
              <View className="flex-row space-x-2 mt-2">
                <TouchableOpacity
                  onPress={() => setShowStartPicker(true)}
                  className="flex-1 bg-gray-100 rounded-lg h-10 flex-row items-center justify-between px-3"
                >
                  <Text className="text-gray-700 text-sm">Start: {formatDateToDDMMYYYY(startDate.toISOString().split('T')[0])}</Text>
                  <CalendarIcon size={16} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowEndPicker(true)}
                  className="flex-1 bg-gray-100 rounded-lg h-10 flex-row items-center justify-between px-3"
                >
                  <Text className="text-gray-700 text-sm">End: {formatDateToDDMMYYYY(endDate.toISOString().split('T')[0])}</Text>
                  <CalendarIcon size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onValueChange={(_, date) => {
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
          onValueChange={(_, date) => {
            setShowEndPicker(Platform.OS === 'ios');
            if (date) setEndDate(date);
          }}
          onDismiss={() => setShowEndPicker(false)}
        />
      )}

      {showsPurchase && showsSale ? (
        <View className="flex-row px-4 pt-3 pb-2 bg-gray-50 space-x-2">
          <TouchableOpacity
            onPress={() => setActiveTab('PURCHASE')}
            className={`flex-1 py-2 rounded-full border ${activeTab === 'PURCHASE' ? 'bg-[#006948] border-[#006948]' : 'bg-white border-gray-300'}`}
          >
            <Text className={`text-center text-xs font-semibold ${activeTab === 'PURCHASE' ? 'text-white' : 'text-gray-700'}`}>Purchase</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('SALE')}
            className={`flex-1 py-2 rounded-full border ${activeTab === 'SALE' ? 'bg-[#006948] border-[#006948]' : 'bg-white border-gray-300'}`}
          >
            <Text className={`text-center text-xs font-semibold ${activeTab === 'SALE' ? 'text-white' : 'text-gray-700'}`}>Sale</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        className="flex-1 p-4"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#006948']} />}
      >
        {isBillsLoading ? (
          <ActivityIndicator size="large" color="#006948" className="mt-10" />
        ) : currentBills.length === 0 ? (
          <View className="items-center justify-center py-12 px-4 mt-8">
            <View className="bg-gray-100 p-4 rounded-full mb-4">
              {activeTab === 'PURCHASE' ? <ShoppingCart size={32} color="#9CA3AF" /> : <Tag size={32} color="#9CA3AF" />}
            </View>
            <Text className="text-gray-900 text-lg font-bold mb-1">
              No {activeTab === 'PURCHASE' ? 'purchase' : 'sale'} bills
            </Text>
            <Text className="text-gray-500 text-center text-sm">No bills found for the selected date range.</Text>
          </View>
        ) : (
          currentBills.map((bill: any) => {
            const itemName = items?.find((i: any) => i.id === bill.item_id)?.name;
            return (
              <TouchableOpacity
                key={bill.id}
                onPress={() => navigation.navigate(activeTab === 'PURCHASE' ? 'NewPurchase' : 'NewSale', { editData: bill })}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex-row items-center justify-between mb-3"
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 rounded-full bg-green-50 items-center justify-center mr-3 border border-green-100">
                    {activeTab === 'PURCHASE' ? <ShoppingCart color="#006948" size={20} /> : <Tag color="#006948" size={20} />}
                  </View>
                  <View className="flex-1 mr-2">
                    <Text className="font-bold text-gray-900 text-base" numberOfLines={1}>{party.name}</Text>
                    {bill.day_bill_number ? <Text className="text-[11px] text-gray-600 font-bold mt-0.5">{bill.day_bill_number}</Text> : null}
                    {itemName ? <Text className="text-[11px] text-[#006948] font-bold mt-0.5">{itemName}</Text> : null}
                    <View className="flex-row items-center mt-0.5">
                      <Text className="text-[11px] text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded mr-2">
                        {formatDateToDDMMYYYY(bill.date)}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {activeTab === 'PURCHASE'
                          ? `${bill.actual_birds || 0} Birds (${bill.net_weight || 0}kg)`
                          : `${(bill.boxes || 0) * (bill.birds_per_box || 0)} Birds (${bill.weight || 0}kg)`}
                      </Text>
                    </View>
                    <Text className="text-[11px] text-gray-400 mt-1" numberOfLines={1}>
                      Vehicle: {bill.vehicle_number || 'N/A'}
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-base font-bold text-gray-900">
                    ₹{formatAmount(Math.abs((activeTab === 'PURCHASE' ? bill.purchase_amount : bill.total_invoice_amount) || 0))}
                  </Text>
                  {bill.balance_amount > 0 ? (
                    <View className="bg-red-50 px-2 py-0.5 rounded-md mt-1 border border-red-100">
                      <Text className="text-[10px] text-red-600 font-bold tracking-wide">DUE ₹{formatAmount(bill.balance_amount)}</Text>
                    </View>
                  ) : (
                    <View className="bg-green-50 px-2 py-0.5 rounded-md mt-1 border border-green-100">
                      <Text className="text-[10px] text-[#006948] font-bold tracking-wide">PAID</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <PartyDetailsModal
        isVisible={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          refetchParty();
          if (showsPurchase) refetchPurchases();
          if (showsSale) refetchSales();
        }}
        party={party}
      />
    </SafeAreaView>
  );
}
