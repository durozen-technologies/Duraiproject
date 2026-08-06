import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, ShoppingCart, Receipt, BarChart2, Users, Truck, ChevronRight, Wallet, Edit2, FileText, X, History, FileStack, RefreshCcw, Calendar, LogOut, Box, FilePlus, ArrowUp, ArrowDown } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import client from '../api/client';
import { formatDateToDDMMYYYY } from '../utils/formatDate';
import { useAuth } from '../context/AuthContext';

export default function DashboardScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  const [modalVisible, setModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [overrideCount, setOverrideCount] = useState('');
  const [overrideWeight, setOverrideWeight] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Date Filtering State
  const [filterType, setFilterType] = useState('Single Day');
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [showCustomStartPicker, setShowCustomStartPicker] = useState(false);
  const [showCustomEndPicker, setShowCustomEndPicker] = useState(false);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [appliedCustomStart, setAppliedCustomStart] = useState('');
  const [appliedCustomEnd, setAppliedCustomEnd] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const formatInrAmount = (value: number) =>
    Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getDateRange = () => {
    const now = new Date();
    if (filterType === 'Single Day') {
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const end = new Date(start.getTime() + 86400000 - 1);
      return { start_date: start.toISOString(), end_date: end.toISOString() };
    }
    if (filterType === 'This Week') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      const end = new Date(start.getTime() + 7 * 86400000 - 1);
      return { start_date: start.toISOString(), end_date: end.toISOString() };
    }
    if (filterType === 'This Month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { start_date: start.toISOString(), end_date: end.toISOString() };
    }
    if (filterType === 'Custom' && appliedCustomStart && appliedCustomEnd) {
      try {
        const [d1, m1, y1] = appliedCustomStart.split('-');
        const [d2, m2, y2] = appliedCustomEnd.split('-');
        const start = new Date(parseInt(y1), parseInt(m1) - 1, parseInt(d1));
        const end = new Date(parseInt(y2), parseInt(m2) - 1, parseInt(d2), 23, 59, 59);
        return { start_date: start.toISOString(), end_date: end.toISOString() };
      } catch {
        return {};
      }
    }
    return {};
  };

  const dateParams = getDateRange();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboardStats', dateParams],
    queryFn: async () => {
      const response = await client.get('/dashboard/stats', { params: dateParams });
      return response.data;
    }
  });

  const { data: historyData } = useQuery({
    queryKey: ['stockHistory'],
    queryFn: async () => {
      const response = await client.get('/dashboard/stock/override/history');
      return response.data;
    },
    enabled: historyModalVisible
  });

  const overrideMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await client.post('/dashboard/stock/override', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['stockHistory'] });
      setErrorMsg('');
      setSuccessMsg('Stock updated successfully');
      setTimeout(() => setModalVisible(false), 1500);
    },
    onError: (err: any) => {
      setSuccessMsg('');
      setErrorMsg(err.response?.data?.detail || "Failed to update stock");
    }
  });

  const handleSaveOverride = () => {
    if (!overrideCount || !overrideWeight) {
      setErrorMsg("Please enter both count and weight.");
      return;
    }
    setErrorMsg('');
    overrideMutation.mutate({
      new_total_birds: parseInt(overrideCount),
      new_total_weight: parseFloat(overrideWeight),
      notes: overrideNotes
    });
  };

  const openEditModal = () => {
    if (data) {
      setOverrideCount(data.birds_purchased.toString());
      setOverrideWeight((data.weight_purchased || 0).toString());
      setOverrideNotes('');
    }
    setModalVisible(true);
  };

  const onRefresh = React.useCallback(() => {
    refetch();
    if (historyModalVisible) {
      queryClient.invalidateQueries({ queryKey: ['stockHistory'] });
    }
  }, [refetch, historyModalVisible, queryClient]);

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
    avg_weight_sold: 0,
    weight_sold: 0,
    weight_purchased: 0,
    purchaser_dues: 0,
    supplier_payables: 0
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top App Bar */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <Text className="text-xl font-bold text-[#006948]">LedgerDesk</Text>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={onRefresh}
            className="p-2 bg-gray-100 rounded-full"
          >
            <RefreshCcw color="#374151" size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={logout}
            className="p-2 bg-red-50 rounded-full"
          >
            <LogOut color="#ef4444" size={18} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={['#006948']} />
        }
      >
        {/* Date Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          {/* Specific Date Filter (replaces 'Today') */}
          {Platform.OS === 'web' ? (
            <View className={`px-5 py-2 rounded-md shadow-sm mr-2 flex-row items-center relative overflow-hidden ${filterType === 'Single Day' ? 'bg-[#006948]' : 'bg-white border border-gray-300'}`}>
              <Calendar color={filterType === 'Single Day' ? 'white' : '#4b5563'} size={14} className="mr-1.5" />
              <Text className={`font-semibold ${filterType === 'Single Day' ? 'text-white' : 'text-gray-700'}`}>
                {selectedDate.toDateString() === new Date().toDateString()
                  ? 'Today'
                  : formatDateToDDMMYYYY(selectedDate.toISOString().split('T')[0])}
              </Text>
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e: any) => {
                  const d = new Date(e.target.value);
                  if (!isNaN(d.getTime())) {
                    setSelectedDate(d);
                    setFilterType('Single Day');
                  }
                }}
                onClick={() => setFilterType('Single Day')}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setFilterType('Single Day');
                setShowDatePicker(true);
              }}
              className={`px-5 py-2 rounded-md shadow-sm mr-2 flex-row items-center ${filterType === 'Single Day' ? 'bg-[#006948]' : 'bg-white border border-gray-300'}`}
            >
              <Calendar color={filterType === 'Single Day' ? 'white' : '#4b5563'} size={14} className="mr-1.5" />
              <Text className={`font-semibold ${filterType === 'Single Day' ? 'text-white' : 'text-gray-700'}`}>
                {selectedDate.toDateString() === new Date().toDateString()
                  ? 'Today'
                  : formatDateToDDMMYYYY(selectedDate.toISOString().split('T')[0])}
              </Text>
            </TouchableOpacity>
          )}

          {Platform.OS !== 'web' && showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onValueChange={(event: any, newDate: any) => {
                setShowDatePicker(false);
                if (newDate) {
                  setSelectedDate(newDate);
                  setFilterType('Single Day');
                }
              }}
              onDismiss={() => setShowDatePicker(false)}
            />
          )}

          <TouchableOpacity
            onPress={() => {
              setFilterType('This Week');
            }}
            className={`px-5 py-2 rounded-md shadow-sm mr-2 justify-center ${filterType === 'This Week' ? 'bg-[#006948]' : 'bg-white border border-gray-300'}`}
          >
            <Text className={`font-semibold ${filterType === 'This Week' ? 'text-white' : 'text-gray-700'}`}>
              This Week
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setFilterType('This Month');
            }}
            className={`px-5 py-2 rounded-md shadow-sm mr-2 justify-center ${filterType === 'This Month' ? 'bg-[#006948]' : 'bg-white border border-gray-300'}`}
          >
            <Text className={`font-semibold ${filterType === 'This Month' ? 'text-white' : 'text-gray-700'}`}>
              This Month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCustomModalVisible(true)}
            className={`px-5 py-2 rounded-md shadow-sm mr-2 justify-center ${filterType === 'Custom' ? 'bg-[#006948]' : 'bg-white border border-gray-300'}`}
          >
            <Text className={`font-semibold ${filterType === 'Custom' ? 'text-white' : 'text-gray-700'}`}>
              {filterType === 'Custom' && appliedCustomStart && appliedCustomEnd
                ? `${appliedCustomStart} to ${appliedCustomEnd}`
                : 'Custom'}
            </Text>
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
              <Text className="text-lg font-bold text-gray-900">₹{formatInrAmount(stats.total_sales)}</Text>
            </View>
          </View>

          {/* Total Purchase */}
          <View className="w-[48%] bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 h-28 justify-between">
            <View className="flex-row justify-between items-start">
              <Text className="text-xs font-bold text-gray-600 tracking-wider">PURCHASES</Text>
              <ShoppingCart color="#6b7280" size={16} />
            </View>
            <View>
              <Text className="text-lg font-bold text-gray-900">₹{formatInrAmount(stats.total_purchases)}</Text>
            </View>
          </View>

          {/* Total Expenses */}
          <View className="w-[48%] bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 h-28 justify-between">
            <View className="flex-row justify-between items-start">
              <Text className="text-xs font-bold text-gray-600 tracking-wider">EXPENSES</Text>
              <Receipt color="#6b7280" size={16} />
            </View>
            <View>
              <Text className="text-lg font-bold text-gray-900">₹{formatInrAmount(stats.total_expenses)}</Text>
            </View>
          </View>

          {/* Net Profit */}
          <View className="w-[48%] bg-[#006948] p-4 rounded-xl shadow-sm mb-3 h-28 justify-between">
            <View className="flex-row justify-between items-start">
              <Text className="text-xs font-bold text-white tracking-wider">NET PROFIT</Text>
              <BarChart2 color="white" size={16} />
            </View>
            <View>
              <Text className="text-lg font-bold text-white">₹{formatInrAmount(stats.net_profit)}</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-3">Quick Actions</Text>
          <View className="flex-row flex-wrap gap-3">
            <TouchableOpacity
              onPress={() => navigation.navigate('BillEntry' as never)}
              className="w-[47%] bg-white p-3 rounded-xl border border-gray-200 flex-col items-center shadow-sm justify-center"
            >
              <View className="w-12 h-12 rounded-full bg-[#ecfdf5] items-center justify-center mb-2">
                <FilePlus color="#006948" size={24} />
              </View>
              <Text className="text-sm font-bold text-gray-900 text-center">Bill Entry</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('CollectionPayment' as never)}
              className="w-[47%] bg-white p-3 rounded-xl border border-gray-200 flex-col items-center shadow-sm justify-center"
            >
              <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-2">
                <Wallet color="#1d4ed8" size={24} />
              </View>
              <Text className="text-sm font-bold text-gray-900 text-center">Collection</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Reports' as never)}
              className="w-[47%] bg-white p-3 rounded-xl border border-gray-200 flex-col items-center shadow-sm justify-center"
            >
              <View className="w-12 h-12 rounded-full bg-purple-50 items-center justify-center mb-2">
                <FileStack color="#7e22ce" size={24} />
              </View>
              <Text className="text-sm font-bold text-gray-900 text-center">Reports</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Items' as never)}
              className="w-[47%] bg-white p-3 rounded-xl border border-gray-200 flex-col items-center shadow-sm justify-center"
            >
              <View className="w-12 h-12 rounded-full bg-[#ecfdf5] items-center justify-center mb-2">
                <Box color="#059669" size={24} />
              </View>
              <Text className="text-sm font-bold text-gray-900 text-center">Items</Text>
            </TouchableOpacity>
          </View>
        </View>


        {/* Outstanding */}
        {/* Outstanding */}
        <View className="mb-10">
          <Text className="text-lg font-bold text-gray-900 mb-3">Outstanding</Text>
          <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-2">
            {/* Sale To Receive */}
            <View className="p-5 flex-row justify-between items-start border-b border-gray-100">
              <View className="flex-row flex-1 mr-4">
                <View className="w-6 h-6 rounded-full bg-orange-100 mt-1 mr-3 flex-shrink-0" />
                <View className="flex-1">
                  <Text className="text-lg font-bold text-[#1e293b] mb-1">Sale To Receive</Text>
                  <Text className="text-xs text-gray-500 mb-3">Amount expected to be received from your customers.</Text>
                  <View className="self-start flex-row items-center bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                    <ArrowUp color="#f97316" size={12} className="mr-1" />
                    <Text className="text-[10px] font-bold text-orange-500">Incoming</Text>
                  </View>
                </View>
              </View>
              <View className="items-end justify-center pt-1">
                <Text className="text-xl font-bold text-[#0f172a] mb-1">₹{formatInrAmount(stats.purchaser_dues)}</Text>
                <Text className="text-xs text-gray-500">Outstanding</Text>
              </View>
            </View>

            {/* Purchase To Pay */}
            <View className="p-5 flex-row justify-between items-start">
              <View className="flex-row flex-1 mr-4">
                <View className="w-6 h-6 rounded-full bg-slate-200 mt-1 mr-3 flex-shrink-0" />
                <View className="flex-1">
                  <Text className="text-lg font-bold text-[#1e293b] mb-1">Purchase To Pay</Text>
                  <Text className="text-xs text-gray-500 mb-3">Amount expected to be paid to your vendors.</Text>
                  <View className="self-start flex-row items-center bg-slate-50 px-2 py-1 rounded-full border border-slate-200">
                    <ArrowDown color="#64748b" size={12} className="mr-1" />
                    <Text className="text-[10px] font-bold text-slate-500">Outgoing</Text>
                  </View>
                </View>
              </View>
              <View className="items-end justify-center pt-1">
                <Text className="text-xl font-bold text-[#0f172a] mb-1">₹{formatInrAmount(stats.supplier_payables)}</Text>
                <Text className="text-xs text-gray-500">Outstanding</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Edit Stock Modal */}
        <Modal visible={modalVisible} transparent={true} animationType="fade">
          <View className="flex-1 justify-center items-center bg-black/50 p-4">
            <View className="bg-white rounded-2xl w-full p-5 shadow-xl">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-900">Edit Stock</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X color="#6b7280" size={24} />
                </TouchableOpacity>
              </View>

              {errorMsg ? (
                <View className="mb-4 bg-red-50 p-2 rounded border border-red-200">
                  <Text className="text-red-600 text-sm font-semibold text-center">{errorMsg}</Text>
                </View>
              ) : null}

              {successMsg ? (
                <View className="mb-4 bg-green-50 p-2 rounded border border-green-200">
                  <Text className="text-green-600 text-sm font-semibold text-center">{successMsg}</Text>
                </View>
              ) : null}

              <Text className="text-sm font-semibold text-gray-700 mb-1">Total Purchase Count</Text>
              <TextInput
                value={overrideCount}
                onChangeText={setOverrideCount}
                keyboardType="numeric"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-900"
                placeholder="0"
              />

              <Text className="text-sm font-semibold text-gray-700 mb-1">Total Purchase Weight (kg)</Text>
              <TextInput
                value={overrideWeight}
                onChangeText={setOverrideWeight}
                keyboardType="numeric"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-900"
                placeholder="0.00"
              />

              <Text className="text-sm font-semibold text-gray-700 mb-1">Notes (Optional)</Text>
              <TextInput
                value={overrideNotes}
                onChangeText={setOverrideNotes}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 text-gray-900"
                placeholder="Reason for adjustment"
                multiline
              />

              <TouchableOpacity
                onPress={handleSaveOverride}
                disabled={overrideMutation.isPending}
                className="bg-[#006948] rounded-xl py-3.5 items-center shadow-sm"
              >
                {overrideMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* History Modal */}
        <Modal visible={historyModalVisible} transparent={true} animationType="slide">
          <View className="flex-1 bg-white mt-10 rounded-t-3xl shadow-2xl">
            <View className="px-5 py-4 border-b border-gray-100 flex-row justify-between items-center">
              <Text className="text-lg font-bold text-gray-900">Stock History</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)} className="p-2 bg-gray-100 rounded-full">
                <X color="#4b5563" size={20} />
              </TouchableOpacity>
            </View>
            <ScrollView className="p-4">
              {historyData && historyData.length > 0 ? (
                historyData.map((item: any) => (
                  <View key={item.id} className="bg-gray-50 p-4 rounded-xl mb-3 border border-gray-100">
                    <View className="flex-row justify-between items-start mb-2">
                      <Text className="text-xs font-semibold text-gray-500">{new Date(item.date).toLocaleString()}</Text>
                      <View className="bg-blue-100 px-2 py-0.5 rounded text-xs">
                        <Text className="text-blue-700 text-[10px] font-bold">MANUAL</Text>
                      </View>
                    </View>
                    <View className="flex-row justify-between items-end mt-1">
                      <View>
                        <Text className="text-xs text-gray-500">Count</Text>
                        <Text className="text-base font-bold text-gray-900">{item.new_total_birds}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-xs text-gray-500">Weight</Text>
                        <Text className="text-base font-bold text-gray-900">{formatInrAmount(item.new_total_weight)} kg</Text>
                      </View>
                    </View>
                    {item.notes ? (
                      <View className="mt-3 bg-white p-2 rounded-lg border border-gray-200">
                        <Text className="text-xs text-gray-600 italic">"{item.notes}"</Text>
                      </View>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text className="text-center text-gray-500 mt-10">No history available</Text>
              )}
              <View className="h-10" />
            </ScrollView>
          </View>
        </Modal>

        {/* Custom Date Range Modal */}
        <Modal visible={customModalVisible} transparent={true} animationType="fade">
          <View className="flex-1 justify-center items-center bg-black/50 p-4">
            <View className="bg-white rounded-2xl w-full p-5 shadow-xl">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-900">Custom Date Range</Text>
                <TouchableOpacity onPress={() => setCustomModalVisible(false)}>
                  <X color="#6b7280" size={24} />
                </TouchableOpacity>
              </View>

              <Text className="text-sm font-semibold text-gray-700 mb-1">From Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={customStartDate.toISOString().split('T')[0]}
                  onChange={(e: any) => {
                    const d = new Date(e.target.value);
                    if (!isNaN(d.getTime())) setCustomStartDate(d);
                  }}
                  style={{ padding: 10, width: '100%', height: 48, border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#f9fafb', marginBottom: 16 }}
                />
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => setShowCustomStartPicker(true)}
                    className="w-full px-4 bg-gray-50 border border-gray-200 rounded-xl h-[48px] justify-center mb-4"
                  >
                    <Text className="text-sm text-gray-900">{formatDateToDDMMYYYY(customStartDate.toISOString().split('T')[0])}</Text>
                  </TouchableOpacity>
                  {showCustomStartPicker && (
                    <DateTimePicker
                      value={customStartDate}
                      mode="date"
                      display="default"
                      onValueChange={(event: any, newDate: any) => {
                        setShowCustomStartPicker(false);
                        if (newDate) setCustomStartDate(newDate);
                      }}
                      onDismiss={() => setShowCustomStartPicker(false)}
                    />
                  )}
                </>
              )}

              <Text className="text-sm font-semibold text-gray-700 mb-1">To Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={customEndDate.toISOString().split('T')[0]}
                  onChange={(e: any) => {
                    const d = new Date(e.target.value);
                    if (!isNaN(d.getTime())) setCustomEndDate(d);
                  }}
                  style={{ padding: 10, width: '100%', height: 48, border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#f9fafb', marginBottom: 24 }}
                />
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => setShowCustomEndPicker(true)}
                    className="w-full px-4 bg-gray-50 border border-gray-200 rounded-xl h-[48px] justify-center mb-6"
                  >
                    <Text className="text-sm text-gray-900">{formatDateToDDMMYYYY(customEndDate.toISOString().split('T')[0])}</Text>
                  </TouchableOpacity>
                  {showCustomEndPicker && (
                    <DateTimePicker
                      value={customEndDate}
                      mode="date"
                      display="default"
                      onValueChange={(event: any, newDate: any) => {
                        setShowCustomEndPicker(false);
                        if (newDate) setCustomEndDate(newDate);
                      }}
                      onDismiss={() => setShowCustomEndPicker(false)}
                    />
                  )}
                </>
              )}

              <TouchableOpacity
                onPress={() => {
                  if (customStartDate > customEndDate) {
                    Alert.alert("Error", "Start date cannot be after end date.");
                    return;
                  }
                  setAppliedCustomStart(formatDateToDDMMYYYY(customStartDate.toISOString().split('T')[0]));
                  setAppliedCustomEnd(formatDateToDDMMYYYY(customEndDate.toISOString().split('T')[0]));
                  setFilterType('Custom');
                  setCustomModalVisible(false);
                }}
                className="bg-[#006948] rounded-xl py-3.5 items-center shadow-sm"
              >
                <Text className="text-white font-bold text-base">Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </SafeAreaView>

  );
}
