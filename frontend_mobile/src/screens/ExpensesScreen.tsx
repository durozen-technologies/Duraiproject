import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, ChevronRight, Receipt, RefreshCcw, Search, X, Calendar } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fetchExpensesByBill, BillExpenseGroup, BillExpenseLine } from '../api/expenses';
import { formatDateToDDMMYYYY } from '../utils/formatDate';
import { formatMoney } from '../utils/billEntryCalc';

type DateFilter = 'Today' | 'This Week' | 'This Month' | 'Custom';

function toYmd(d: Date): string {
  return d.toISOString().split('T')[0];
}

function paidThrough(line: BillExpenseLine): string {
  const parts: string[] = [];
  if (line.cash_amount > 0) parts.push(`Cash ₹${formatMoney(line.cash_amount)}`);
  if (line.upi_amount > 0) parts.push(`UPI ₹${formatMoney(line.upi_amount)}`);
  if (parts.length === 0) parts.push('₹0.00');
  return parts.join(' · ');
}

function lineSummary(line: BillExpenseLine): string {
  const bits = [line.expense_name, paidThrough(line)];
  if (line.note?.trim()) bits.push(`Note: ${line.note.trim()}`);
  bits.push(`₹${formatMoney(line.total_amount)}`);
  return bits.join(' · ');
}

export default function ExpensesScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('Today');
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [appliedCustomStart, setAppliedCustomStart] = useState('');
  const [appliedCustomEnd, setAppliedCustomEnd] = useState('');
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [showCustomStartPicker, setShowCustomStartPicker] = useState(false);
  const [showCustomEndPicker, setShowCustomEndPicker] = useState(false);

  const dateRange = useMemo(() => {
    const now = new Date();
    if (dateFilter === 'Today') {
      const d = toYmd(now);
      return { from: d, to: d };
    }
    if (dateFilter === 'This Week') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: toYmd(start), to: toYmd(end) };
    }
    if (dateFilter === 'This Month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: toYmd(start), to: toYmd(end) };
    }
    if (dateFilter === 'Custom' && appliedCustomStart && appliedCustomEnd) {
      return { from: appliedCustomStart, to: appliedCustomEnd };
    }
    const d = toYmd(now);
    return { from: d, to: d };
  }, [dateFilter, appliedCustomStart, appliedCustomEnd]);

  const { data: billGroups = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['expensesByBill'],
    queryFn: () => fetchExpensesByBill(100),
  });

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return billGroups.filter((g) => {
      const billDate = String(g.date).split('T')[0];
      if (billDate < dateRange.from || billDate > dateRange.to) return false;
      if (!q) return true;
      return g.bill_number?.toLowerCase().includes(q);
    });
  }, [billGroups, searchQuery, dateRange]);

  const onRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['expensesByBill'] });
  };

  const toggleBill = (id: string) => {
    setExpandedBillId((prev) => (prev === id ? null : id));
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.canGoBack() && navigation.goBack()} className="mr-3">
            <ArrowLeft color="#111827" size={24} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Expenses</Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={onRefresh} className="p-2 bg-gray-100 rounded-full mr-2">
            <RefreshCcw color="#374151" size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('ExpenseCategories' as never)}
            className="px-2.5 py-1.5 bg-gray-100 rounded-lg"
          >
            <Text className="text-gray-700 font-bold text-sm">Manage Expense</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={['#006948']} />
        }
      >
        <View className="px-4 pt-3 pb-2 bg-white border-b border-gray-100">
          <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2 mb-3">
            <Search color="#6b7280" size={18} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search bill number (DPS...)"
              className="flex-1 text-sm text-gray-900 py-1 ml-2"
              placeholderTextColor="#9ca3af"
              style={{ outline: 'none' } as any}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X color="#9ca3af" size={18} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
            {(['Today', 'This Week', 'This Month'] as DateFilter[]).map((label) => (
              <TouchableOpacity
                key={label}
                onPress={() => setDateFilter(label)}
                className={`px-4 py-2 rounded-md shadow-sm mr-2 justify-center ${
                  dateFilter === label ? 'bg-[#006948]' : 'bg-white border border-gray-300'
                }`}
              >
                <Text className={`font-semibold text-sm ${dateFilter === label ? 'text-white' : 'text-gray-700'}`}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setCustomModalVisible(true)}
              className={`px-4 py-2 rounded-md shadow-sm mr-2 justify-center ${
                dateFilter === 'Custom' ? 'bg-[#006948]' : 'bg-white border border-gray-300'
              }`}
            >
              <Text className={`font-semibold text-sm ${dateFilter === 'Custom' ? 'text-white' : 'text-gray-700'}`}>
                {dateFilter === 'Custom' && appliedCustomStart && appliedCustomEnd
                  ? `${formatDateToDDMMYYYY(appliedCustomStart)} to ${formatDateToDDMMYYYY(appliedCustomEnd)}`
                  : 'Custom'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View className="p-4">
          <Text className="text-sm font-bold text-gray-600 mb-3 uppercase tracking-wider">
            Bill Expense History
          </Text>

          {isLoading ? (
            <ActivityIndicator size="large" color="#006948" className="mt-10" />
          ) : filteredGroups.length === 0 ? (
            <View className="bg-white p-8 rounded-xl border border-dashed border-gray-300 items-center mt-4">
              <Receipt color="#9ca3af" size={36} />
              <Text className="text-gray-500 text-center mt-3">
                {searchQuery ? 'No bills match your search.' : 'No bill expenses in this date range.'}
              </Text>
              <Text className="text-gray-400 text-center text-xs mt-1">
                Add expenses when creating or editing a bill entry.
              </Text>
            </View>
          ) : (
            filteredGroups.map((group: BillExpenseGroup) => {
              const expanded = expandedBillId === group.day_bill_id;
              return (
                <View
                  key={group.day_bill_id}
                  className="bg-white rounded-xl border border-gray-200 mb-3 shadow-sm overflow-hidden"
                >
                  <TouchableOpacity
                    onPress={() => toggleBill(group.day_bill_id)}
                    className="p-4 flex-row items-center justify-between"
                    activeOpacity={0.7}
                  >
                    <View className="flex-1 mr-3">
                      <Text className="text-base font-bold text-gray-900">{group.bill_number}</Text>
                      <Text className="text-sm text-gray-500 mt-0.5">
                        {formatDateToDDMMYYYY(group.date)} · {group.item_count} item
                        {group.item_count === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <View className="items-end flex-row items-center">
                      <Text className="text-lg font-extrabold text-red-600 mr-2">
                        ₹{formatMoney(group.expense_total)}
                      </Text>
                      {expanded ? (
                        <ChevronDown color="#6b7280" size={20} />
                      ) : (
                        <ChevronRight color="#6b7280" size={20} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {expanded ? (
                    <View className="border-t border-gray-100 bg-gray-50 px-3 py-2">
                      {group.items.map((line) => (
                        <View key={line.id} className="py-2.5 border-b border-gray-100">
                          <Text className="text-sm text-gray-800 leading-5" numberOfLines={2}>
                            {lineSummary(line)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal visible={customModalVisible} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl w-full max-w-md p-5">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-900">Custom Date Range</Text>
              <TouchableOpacity onPress={() => setCustomModalVisible(false)} className="bg-gray-100 p-2 rounded-full">
                <X color="#4b5563" size={18} />
              </TouchableOpacity>
            </View>

            <Text className="text-xs font-semibold text-gray-600 mb-1.5">From</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 mb-4"
                style={{ outline: 'none' }}
                value={toYmd(customStartDate)}
                onChange={(e) => {
                  if (e.target.value) setCustomStartDate(new Date(e.target.value));
                }}
              />
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => setShowCustomStartPicker(true)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 flex-row items-center"
                >
                  <Calendar color="#6b7280" size={16} />
                  <Text className="text-gray-900 ml-2">{formatDateToDDMMYYYY(customStartDate)}</Text>
                </TouchableOpacity>
                {showCustomStartPicker && (
                  <DateTimePicker
                    value={customStartDate}
                    mode="date"
                    display="default"
                    onChange={(_: any, selected?: Date) => {
                      setShowCustomStartPicker(Platform.OS === 'ios');
                      if (selected) setCustomStartDate(selected);
                    }}
                  />
                )}
              </>
            )}

            <Text className="text-xs font-semibold text-gray-600 mb-1.5">To</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 mb-5"
                style={{ outline: 'none' }}
                value={toYmd(customEndDate)}
                onChange={(e) => {
                  if (e.target.value) setCustomEndDate(new Date(e.target.value));
                }}
              />
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => setShowCustomEndPicker(true)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5 flex-row items-center"
                >
                  <Calendar color="#6b7280" size={16} />
                  <Text className="text-gray-900 ml-2">{formatDateToDDMMYYYY(customEndDate)}</Text>
                </TouchableOpacity>
                {showCustomEndPicker && (
                  <DateTimePicker
                    value={customEndDate}
                    mode="date"
                    display="default"
                    onChange={(_: any, selected?: Date) => {
                      setShowCustomEndPicker(Platform.OS === 'ios');
                      if (selected) setCustomEndDate(selected);
                    }}
                  />
                )}
              </>
            )}

            <TouchableOpacity
              onPress={() => {
                setAppliedCustomStart(toYmd(customStartDate));
                setAppliedCustomEnd(toYmd(customEndDate));
                setDateFilter('Custom');
                setCustomModalVisible(false);
              }}
              className="bg-[#006948] py-3.5 rounded-xl items-center"
            >
              <Text className="text-white font-bold">Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
