import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, RefreshCcw, Calendar as CalendarIcon, FileText } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fetchDayBills } from '../api/dayBills';
import DayBillCard from '../components/DayBillCard';
import { formatDateToDDMMYYYY } from '../utils/formatDate';

export default function BillsScreen({ navigation }: any) {
  const [selectedDate, setSelectedDate] = useState<'today' | 'all' | 'custom'>('today');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const dateParams = useMemo(() => {
    if (selectedDate === 'all') return {};
    if (selectedDate === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { start_date: start.toISOString(), end_date: end.toISOString() };
    }
    const s = new Date(startDate);
    s.setHours(0, 0, 0, 0);
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);
    return { start_date: s.toISOString(), end_date: e.toISOString() };
  }, [selectedDate, startDate, endDate]);

  const { data: dayBills = [], isLoading, refetch, isRefetching, isError } = useQuery({
    queryKey: ['dayBills', dateParams],
    queryFn: () => fetchDayBills(dateParams),
  });

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return dayBills;
    const q = searchQuery.toLowerCase();
    return dayBills.filter(
      (b) =>
        b.bill_number?.toLowerCase().includes(q) ||
        b.purchase_names?.some((n) => n.toLowerCase().includes(q)) ||
        b.sale_names?.some((n) => n.toLowerCase().includes(q)) ||
        b.purchase_item_names?.some((n) => n.toLowerCase().includes(q)) ||
        b.sale_item_names?.some((n) => n.toLowerCase().includes(q))
    );
  }, [dayBills, searchQuery]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-3 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <FileText color="#0b4d3a" size={22} />
          <Text className="text-lg font-bold text-gray-900 ml-2">Bill</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => refetch()} className="p-2 bg-gray-100 rounded-full">
            <RefreshCcw size={18} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('BillEntry')}
            className="bg-[#0b4d3a] px-3 py-2 rounded-lg flex-row items-center"
          >
            <Plus size={16} color="#fff" />
            <Text className="text-white text-xs font-bold ml-1">New Entry</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-4 pt-3 pb-2 bg-white border-b border-gray-100">
        <TextInput
          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-3"
          placeholder="Search DPS No / Party Name"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['today', 'all', 'custom'] as const).map((key) => (
            <TouchableOpacity
              key={key}
              onPress={() => setSelectedDate(key)}
              className={`px-4 py-2 rounded-md mr-2 ${
                selectedDate === key ? 'bg-[#0b4d3a]' : 'bg-gray-100 border border-gray-200'
              }`}
            >
              <Text className={`text-xs font-bold ${selectedDate === key ? 'text-white' : 'text-gray-700'}`}>
                {key === 'today' ? 'Today' : key === 'all' ? 'All' : 'Custom'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedDate === 'custom' ? (
          <View className="flex-row gap-2 mt-3">
            <TouchableOpacity
              onPress={() => setShowStartPicker(true)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 flex-row items-center bg-gray-50"
            >
              <CalendarIcon size={14} color="#6b7280" />
              <Text className="text-xs font-semibold text-gray-700 ml-2">
                {formatDateToDDMMYYYY(startDate.toISOString().split('T')[0])}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowEndPicker(true)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 flex-row items-center bg-gray-50"
            >
              <CalendarIcon size={14} color="#6b7280" />
              <Text className="text-xs font-semibold text-gray-700 ml-2">
                {formatDateToDDMMYYYY(endDate.toISOString().split('T')[0])}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {Platform.OS !== 'web' && showStartPicker ? (
          <DateTimePicker
            value={startDate}
            mode="date"
            onChange={(_, d) => {
              setShowStartPicker(false);
              if (d) setStartDate(d);
            }}
          />
        ) : null}
        {Platform.OS !== 'web' && showEndPicker ? (
          <DateTimePicker
            value={endDate}
            mode="date"
            onChange={(_, d) => {
              setShowEndPicker(false);
              if (d) setEndDate(d);
            }}
          />
        ) : null}

        {Platform.OS === 'web' && selectedDate === 'custom' ? (
          <View className="flex-row gap-2 mt-2">
            <input
              type="date"
              value={startDate.toISOString().split('T')[0]}
              onChange={(e: any) => {
                const d = new Date(e.target.value);
                if (!isNaN(d.getTime())) setStartDate(d);
              }}
              style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <input
              type="date"
              value={endDate.toISOString().split('T')[0]}
              onChange={(e: any) => {
                const d = new Date(e.target.value);
                if (!isNaN(d.getTime())) setEndDate(d);
              }}
              style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0b4d3a" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#0b4d3a']} />
          }
        >
          {isError ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-3">
              <Text className="text-red-700 text-sm font-semibold text-center">Failed to load bill entries</Text>
            </View>
          ) : null}

          {filtered.length === 0 ? (
            <View className="bg-white rounded-xl border border-dashed border-gray-300 p-8 items-center mt-6">
              <FileText color="#9ca3af" size={36} />
              <Text className="text-sm text-gray-500 text-center mt-3 mb-4">No bill entries yet</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('BillEntry')}
                className="bg-[#0b4d3a] px-5 py-3 rounded-lg"
              >
                <Text className="text-white text-sm font-bold">Create Bill Entry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filtered.map((bill) => (
              <DayBillCard
                key={bill.id}
                bill={bill}
                onPress={() => navigation.navigate('BillEntry', { dayBillId: bill.id, mode: 'view' })}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
