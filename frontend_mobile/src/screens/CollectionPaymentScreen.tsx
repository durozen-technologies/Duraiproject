import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, X, CheckCircle, RefreshCw, Clock, Edit2, Trash2, Calendar, Search, Info, Wallet } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import client from '../api/client';
import { formatDateToDDMMYYYY } from '../utils/formatDate';
import { formatMoney } from '../utils/billEntryCalc';
import ConfirmModal from '../components/ConfirmModal';

type CollectionTab = 'TO_PAY' | 'TO_RECEIVE' | 'HISTORY';
type HistoryDateFilter = 'Today' | 'This Week' | 'This Month' | 'Custom';
type HistoryTypeFilter = 'ALL' | 'TO_PAY' | 'TO_RECEIVE';

function isPaidTxn(type: string | null | undefined): boolean {
  return String(type || '').toLowerCase() === 'paid';
}

function toYmd(d: Date): string {
  return d.toISOString().split('T')[0];
}

function AmountField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View className="flex-1">
      <View className="flex-row items-center mb-1.5">
        <Text className="text-xs font-semibold text-gray-600">{label}</Text>
        <Info color="#9ca3af" size={12} style={{ marginLeft: 4 }} />
      </View>
      <View className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-3 flex-row items-center">
        <Text className="text-gray-400 text-sm mr-1">₹</Text>
        <TextInput
          className="flex-1 text-sm font-semibold text-gray-900 min-w-0"
          placeholder="0.00"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={value}
          onChangeText={(v) => onChangeText(v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
          style={{ outline: 'none' } as any}
        />
      </View>
    </View>
  );
}

export default function CollectionPaymentScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<CollectionTab>('TO_PAY');

  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [bankAmount, setBankAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [editTransactionId, setEditTransactionId] = useState<string | null>(null);
  const [editOriginalTotal, setEditOriginalTotal] = useState(0);
  const [editPaymentType, setEditPaymentType] = useState<'PAID' | 'RECEIVED' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [historyDateFilter, setHistoryDateFilter] = useState<HistoryDateFilter>('Today');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<HistoryTypeFilter>('ALL');
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [appliedCustomStart, setAppliedCustomStart] = useState('');
  const [appliedCustomEnd, setAppliedCustomEnd] = useState('');
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [showCustomStartPicker, setShowCustomStartPicker] = useState(false);
  const [showCustomEndPicker, setShowCustomEndPicker] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const historyDateRange = useMemo(() => {
    const now = new Date();
    if (historyDateFilter === 'Today') {
      const d = toYmd(now);
      return { from: d, to: d };
    }
    if (historyDateFilter === 'This Week') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: toYmd(start), to: toYmd(end) };
    }
    if (historyDateFilter === 'This Month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: toYmd(start), to: toYmd(end) };
    }
    if (historyDateFilter === 'Custom' && appliedCustomStart && appliedCustomEnd) {
      return { from: appliedCustomStart, to: appliedCustomEnd };
    }
    const d = toYmd(now);
    return { from: d, to: d };
  }, [historyDateFilter, appliedCustomStart, appliedCustomEnd]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'HISTORY') {
      await queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
    } else {
      await queryClient.invalidateQueries({ queryKey: ['parties'] });
    }
    setRefreshing(false);
  };

  const { data: parties, isLoading: partiesLoading } = useQuery({
    queryKey: ['parties', 'collection'],
    queryFn: async () => {
      const response = await client.get('/parties/');
      return response.data;
    },
    enabled: activeTab !== 'HISTORY',
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['paymentHistory', historyDateRange.from, historyDateRange.to],
    queryFn: async () => {
      const response = await client.get(
        `/payments/collection/history?from_date=${historyDateRange.from}&to_date=${historyDateRange.to}`
      );
      return response.data;
    },
    enabled: activeTab === 'HISTORY',
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editTransactionId) {
        const response = await client.put(`/payments/collection/${editTransactionId}`, data);
        return response.data;
      }
      const response = await client.post('/payments/collection', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['party'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
      setErrorMsg('');
      setSuccessMsg(editTransactionId ? 'Payment updated successfully' : 'Payment processed successfully');
      setTimeout(() => closeModal(), 1500);
    },
    onError: (error: any) => {
      setSuccessMsg('');
      setErrorMsg(error.response?.data?.detail || 'Failed to process payment');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      await client.delete(`/payments/collection/${transactionId}`);
      // Drop cached party so Edit Party does not keep a stale paid floor
      queryClient.removeQueries({ queryKey: ['party'] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['party'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
      setShowDeleteConfirm(false);
      setErrorMsg('');
      setSuccessMsg('Payment deleted successfully');
      setTimeout(() => closeModal(), 1500);
    },
    onError: (error: any) => {
      setShowDeleteConfirm(false);
      setSuccessMsg('');
      setErrorMsg(error.response?.data?.detail || 'Failed to delete payment');
    },
  });

  const filteredParties = useMemo(() => {
    if (!parties) return [];
    const q = searchQuery.toLowerCase();
    return parties.filter((party: any) => {
      const balance = parseFloat(party.current_balance || 0);
      if (activeTab === 'TO_PAY' && balance <= 0) return false;
      if (activeTab === 'TO_RECEIVE' && balance >= 0) return false;
      if (!q) return true;
      return (
        party.name?.toLowerCase().includes(q) ||
        (party.mobile && party.mobile.includes(searchQuery)) ||
        (party.nickname && party.nickname.toLowerCase().includes(q))
      );
    });
  }, [parties, activeTab, searchQuery]);

  const filteredHistory = useMemo(() => {
    if (!history) return [];
    const q = searchQuery.toLowerCase().trim();
    return history
      .filter((payment: any) => {
        const paid = isPaidTxn(payment.type);
        if (historyTypeFilter === 'TO_PAY' && !paid) return false;
        if (historyTypeFilter === 'TO_RECEIVE' && paid) return false;
        if (!q) return true;
        return (
          payment.party_name?.toLowerCase().includes(q) ||
          (payment.party_nickname && payment.party_nickname.toLowerCase().includes(q))
        );
      })
      .sort((a: any, b: any) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        const createdA = new Date(a.created_at || 0).getTime();
        const createdB = new Date(b.created_at || 0).getTime();
        return createdB - createdA;
      });
  }, [history, searchQuery, historyTypeFilter]);


  const outstandingForModal = useMemo(() => {
    if (!selectedParty) return 0;
    const balance = Math.abs(parseFloat(selectedParty.current_balance || 0));
    // When editing, outstanding includes the amount already applied on this txn
    return balance + (editTransactionId ? editOriginalTotal : 0);
  }, [selectedParty, editTransactionId, editOriginalTotal]);

  const handleOpenModal = (party: any) => {
    setSelectedParty(party);
    setEditTransactionId(null);
    setEditOriginalTotal(0);
    setEditPaymentType(null);
    setCashAmount('');
    setUpiAmount('');
    setBankAmount('');
    setDate(new Date());
    setValidationError('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleEditPayment = async (payment: any) => {
    try {
      const response = await client.get(`/parties/${payment.party_id}`);
      setSelectedParty(response.data);
      setEditTransactionId(payment.id);
      setEditOriginalTotal(parseFloat(payment.total_amount || 0));
      setEditPaymentType(isPaidTxn(payment.type) ? 'PAID' : 'RECEIVED');
      setCashAmount(payment.cash_amount?.toString() || '');
      setUpiAmount(payment.upi_amount?.toString() || '');
      setBankAmount(payment.bank_amount?.toString() || '');
      setDate(new Date(payment.date));
      setValidationError('');
      setErrorMsg('');
      setSuccessMsg('');
    } catch (e) {
      setErrorMsg('Could not fetch party details for editing.');
    }
  };

  const closeModal = () => {
    setSelectedParty(null);
    setEditTransactionId(null);
    setEditOriginalTotal(0);
    setEditPaymentType(null);
    setValidationError('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = () => {
    setValidationError('');

    const cash = parseFloat(cashAmount || '0');
    const upi = parseFloat(upiAmount || '0');
    const bank = parseFloat(bankAmount || '0');
    const total = cash + upi + bank;

    if (total <= 0) {
      setValidationError('Please enter a valid payment amount.');
      return;
    }

    if (total > outstandingForModal + 0.001) {
      setValidationError(`Amount cannot exceed outstanding ₹${outstandingForModal.toLocaleString()}`);
      return;
    }

    paymentMutation.mutate({
      party_id: selectedParty.id,
      cash_amount: cash,
      upi_amount: upi,
      bank_amount: bank,
      date: date.toISOString().split('T')[0],
    });
  };

  const typeBadge = (type: string) => {
    if (type === 'BOTH') return 'Both';
    if (type === 'SALE') return 'Sale';
    return 'Purchaser';
  };

  const modalIsToPay = editPaymentType
    ? editPaymentType === 'PAID'
    : selectedParty
      ? parseFloat(selectedParty.current_balance || 0) > 0
      : true;

  const paymentTotal = useMemo(() => {
    return (parseFloat(cashAmount) || 0) + (parseFloat(upiAmount) || 0) + (parseFloat(bankAmount) || 0);
  }, [cashAmount, upiAmount, bankAmount]);

  const remainingBalance = Math.max(0, outstandingForModal - paymentTotal);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <ArrowLeft color="#111827" size={24} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Collection</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} className="p-2 bg-gray-100 rounded-full">
          <RefreshCw color="#4b5563" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#006948']} />}
      >
        <View className="flex-row p-4 gap-2 bg-white border-b border-gray-200">
          <TouchableOpacity
            onPress={() => setActiveTab('TO_PAY')}
            className={`flex-1 py-3 items-center rounded-xl flex-row justify-center gap-1 ${activeTab === 'TO_PAY' ? 'bg-[#006948]' : 'bg-gray-100'}`}
          >
            <ArrowUpRight color={activeTab === 'TO_PAY' ? 'white' : '#6b7280'} size={18} />
            <Text className={`font-bold text-xs ${activeTab === 'TO_PAY' ? 'text-white' : 'text-gray-600'}`}>To Pay</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('TO_RECEIVE')}
            className={`flex-1 py-3 items-center rounded-xl flex-row justify-center gap-1 ${activeTab === 'TO_RECEIVE' ? 'bg-[#006948]' : 'bg-gray-100'}`}
          >
            <ArrowDownLeft color={activeTab === 'TO_RECEIVE' ? 'white' : '#6b7280'} size={18} />
            <Text className={`font-bold text-xs ${activeTab === 'TO_RECEIVE' ? 'text-white' : 'text-gray-600'}`}>To Receive</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('HISTORY')}
            className={`flex-1 py-3 items-center rounded-xl flex-row justify-center gap-1 ${activeTab === 'HISTORY' ? 'bg-[#006948]' : 'bg-gray-100'}`}
          >
            <Clock color={activeTab === 'HISTORY' ? 'white' : '#6b7280'} size={18} />
            <Text className={`font-bold text-xs ${activeTab === 'HISTORY' ? 'text-white' : 'text-gray-600'}`}>History</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'HISTORY' ? (
          <View className="bg-white border-b border-gray-200">
            <View className="px-4 pt-3 pb-2">
              <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2 mb-3">
                <Search color="#6b7280" size={18} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search party name or nickname..."
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

              <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled className="mb-2">
                {(['Today', 'This Week', 'This Month'] as HistoryDateFilter[]).map((label) => (
                  <TouchableOpacity
                    key={label}
                    onPress={() => setHistoryDateFilter(label)}
                    className={`px-4 py-2 rounded-md shadow-sm mr-2 justify-center ${
                      historyDateFilter === label ? 'bg-[#006948]' : 'bg-white border border-gray-300'
                    }`}
                  >
                    <Text className={`font-semibold text-sm ${historyDateFilter === label ? 'text-white' : 'text-gray-700'}`}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => setCustomModalVisible(true)}
                  className={`px-4 py-2 rounded-md shadow-sm mr-2 justify-center ${
                    historyDateFilter === 'Custom' ? 'bg-[#006948]' : 'bg-white border border-gray-300'
                  }`}
                >
                  <Text className={`font-semibold text-sm ${historyDateFilter === 'Custom' ? 'text-white' : 'text-gray-700'}`}>
                    {historyDateFilter === 'Custom' && appliedCustomStart && appliedCustomEnd
                      ? `${formatDateToDDMMYYYY(appliedCustomStart)} to ${formatDateToDDMMYYYY(appliedCustomEnd)}`
                      : 'Custom'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            <View className="flex-row px-4 pb-3 gap-2">
              {(
                [
                  { key: 'ALL', label: 'All' },
                  { key: 'TO_PAY', label: 'To Pay' },
                  { key: 'TO_RECEIVE', label: 'To Receive' },
                ] as { key: HistoryTypeFilter; label: string }[]
              ).map((item) => (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => setHistoryTypeFilter(item.key)}
                  className={`px-3 py-1 rounded-full border ${
                    historyTypeFilter === item.key ? 'bg-[#006948] border-[#006948]' : 'bg-white border-gray-300'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      historyTypeFilter === item.key ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View className="px-4 py-3 bg-white border-b border-gray-200">
            <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
              <Search color="#6b7280" size={20} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name or mobile..."
                className="flex-1 text-base text-gray-900 py-1 ml-2"
                placeholderTextColor="#9ca3af"
                style={{ outline: 'none' } as any}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X color="#9ca3af" size={20} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View className="p-4">
        {activeTab === 'HISTORY' ? (
          historyLoading && !refreshing ? (
            <ActivityIndicator size="large" color="#006948" className="mt-10" />
          ) : filteredHistory.length === 0 ? (
            <View className="items-center justify-center py-10">
              <Text className="text-gray-500 text-base">
                {searchQuery ? 'No payments match your search.' : 'No payments found in this date range.'}
              </Text>
            </View>
          ) : (
            filteredHistory.map((payment: any) => {
              const paid = isPaidTxn(payment.type);
              return (
                <TouchableOpacity
                  key={payment.id}
                  onPress={() => handleEditPayment(payment)}
                  className="bg-white p-4 rounded-xl border border-gray-200 mb-3 shadow-sm"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-3">
                      <Text className="text-base font-bold text-gray-900">{payment.party_name}</Text>
                      {payment.party_nickname ? (
                        <Text className="text-sm text-gray-500 mt-0.5">{payment.party_nickname}</Text>
                      ) : null}
                      <Text className="text-xs text-gray-500 mt-1.5">
                        {paid ? 'To Pay' : 'To Receive'} • {formatDateToDDMMYYYY(new Date(payment.date))}
                      </Text>
                    </View>
                    <Text className={`text-lg font-bold ${paid ? 'text-blue-600' : 'text-green-600'}`}>
                      ₹{formatMoney(payment.total_amount)}
                    </Text>
                  </View>
                  <View className="flex-row border-t border-gray-100 pt-3 mt-1 justify-between items-center">
                    <View className="flex-row flex-wrap gap-x-3 gap-y-1">
                      <Text className="text-xs font-semibold text-gray-600">Cash: ₹{formatMoney(payment.cash_amount)}</Text>
                      <Text className="text-xs font-semibold text-gray-600">UPI: ₹{formatMoney(payment.upi_amount)}</Text>
                      <Text className="text-xs font-semibold text-gray-600">Bank: ₹{formatMoney(payment.bank_amount || 0)}</Text>
                    </View>
                    <View className="flex-row items-center bg-gray-100 px-2 py-1 rounded-lg">
                      <Edit2 color="#4b5563" size={12} />
                      <Text className="text-gray-700 text-xs font-medium ml-1">Edit</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )
        ) : partiesLoading && !refreshing ? (
          <ActivityIndicator size="large" color="#006948" className="mt-10" />
        ) : filteredParties.length === 0 ? (
          <View className="items-center justify-center py-10">
            <Text className="text-gray-500 text-base">
              {searchQuery
                ? 'No parties match your search.'
                : activeTab === 'TO_PAY'
                  ? 'No parties to pay.'
                  : 'No parties to receive from.'}
            </Text>
          </View>
        ) : (
          filteredParties.map((party: any) => {
            const balance = parseFloat(party.current_balance || 0);
            const isToPay = balance > 0;
            return (
              <TouchableOpacity
                key={party.id}
                onPress={() => handleOpenModal(party)}
                className="bg-white p-4 rounded-xl border border-gray-200 mb-3 shadow-sm flex-row items-center justify-between"
              >
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">{party.name}</Text>
                  {party.nickname ? (
                    <Text className="text-sm text-gray-500 mt-0.5">{party.nickname}</Text>
                  ) : null}
                  <View className="flex-row items-center gap-2 mt-1">
                    <View className="bg-gray-100 px-2 py-0.5 rounded">
                      <Text className="text-[10px] font-bold text-gray-600">{typeBadge(party.type)}</Text>
                    </View>
                    {party.mobile ? <Text className="text-xs text-gray-400">{party.mobile}</Text> : null}
                  </View>
                </View>
                <View className="items-end ml-4">
                  <Text className="text-xs text-gray-500 mb-1">{isToPay ? 'To Pay' : 'To Receive'}</Text>
                  <Text className={`text-lg font-bold ${isToPay ? 'text-red-500' : 'text-[#006948]'}`}>
                    ₹{formatMoney(Math.abs(balance))} {isToPay ? 'CR' : 'DR'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        </View>
      </ScrollView>

      <Modal visible={!!selectedParty} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl w-full max-w-lg max-h-[92%] overflow-hidden shadow-xl">
            <View className="px-5 pt-5 pb-4 border-b border-gray-100 bg-gray-50">
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-3">
                  <Text className="text-lg font-bold text-gray-900 mb-1">
                    {editTransactionId ? 'Edit Payment' : modalIsToPay ? 'Record Payment' : 'Record Receipt'}
                  </Text>
                  <Text className="text-base text-gray-900 font-bold" numberOfLines={1}>
                    {selectedParty?.name}
                  </Text>
                  {selectedParty?.nickname ? (
                    <Text className="text-sm font-normal text-gray-600 mt-0.5" numberOfLines={1}>
                      {selectedParty?.nickname}
                    </Text>
                  ) : null}
                </View>
                <View className="flex-row items-center gap-2">
                  {editTransactionId ? (
                    <TouchableOpacity
                      onPress={() => setShowDeleteConfirm(true)}
                      className="bg-red-100 p-2 rounded-full flex-row items-center px-3"
                    >
                      <Trash2 color="#dc2626" size={16} />
                      <Text className="text-red-700 font-bold text-xs ml-1">Delete</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity onPress={closeModal} className="bg-gray-100 p-2 rounded-full">
                    <X color="#4b5563" size={20} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <ScrollView
              className="px-5 pt-4"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 28 }}
            >
              {/* Outstanding */}
              <View className="bg-[#fff7ed] border border-[#fed7aa] rounded-2xl px-4 py-4 mb-5">
                <Text className="text-xs font-medium text-gray-500 mb-1">Outstanding Amount</Text>
                <View className="flex-row items-center flex-wrap gap-2">
                  <Text className="text-2xl font-extrabold text-gray-900">
                    ₹{formatMoney(outstandingForModal)}
                  </Text>
                  <View className={`px-2 py-0.5 rounded-md ${modalIsToPay ? 'bg-orange-200' : 'bg-emerald-200'}`}>
                    <Text className={`text-[11px] font-bold ${modalIsToPay ? 'text-orange-800' : 'text-emerald-800'}`}>
                      {modalIsToPay ? 'CR' : 'DR'}
                    </Text>
                  </View>
                </View>
                <Text className={`text-sm font-semibold mt-1.5 ${modalIsToPay ? 'text-orange-700' : 'text-[#006948]'}`}>
                  {modalIsToPay ? 'To Pay' : 'To Receive'}
                </Text>
              </View>

              {validationError ? (
                <Text className="text-red-500 text-sm mb-3 text-center">{validationError}</Text>
              ) : null}

              {errorMsg ? (
                <View className="mb-3 bg-red-50 p-2 rounded-lg border border-red-200">
                  <Text className="text-red-600 text-sm font-semibold text-center">{errorMsg}</Text>
                </View>
              ) : null}

              {successMsg ? (
                <View className="mb-3 bg-green-50 p-2 rounded-lg border border-green-200">
                  <Text className="text-green-600 text-sm font-semibold text-center">{successMsg}</Text>
                </View>
              ) : null}

              {/* Cash / UPI / Bank */}
              <View className="flex-row gap-2 mb-4">
                <AmountField label="Cash Amount" value={cashAmount} onChangeText={setCashAmount} />
                <AmountField label="UPI Amount" value={upiAmount} onChangeText={setUpiAmount} />
                <AmountField label="Bank Amount" value={bankAmount} onChangeText={setBankAmount} />
              </View>

              {/* Payment Date */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-gray-600 mb-1.5">Payment Date</Text>
                {Platform.OS === 'web' ? (
                  <View className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center">
                    <Calendar color="#6b7280" size={18} />
                    <input
                      type="date"
                      className="flex-1 ml-2 bg-transparent text-gray-900 border-none"
                      style={{ outline: 'none' }}
                      value={date.toISOString().split('T')[0]}
                      onChange={(e) => {
                        if (e.target.value) setDate(new Date(e.target.value));
                      }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center"
                  >
                    <Calendar color="#6b7280" size={18} />
                    <Text className="text-gray-900 font-medium ml-2">{formatDateToDDMMYYYY(date)}</Text>
                  </TouchableOpacity>
                )}
                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={(event: any, selectedDate?: Date) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (selectedDate) setDate(selectedDate);
                    }}
                  />
                )}
              </View>

              {/* Total Payment + Remaining */}
              <View className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-2xl px-4 py-4 mb-5">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-bold text-[#006948]">Total Payment</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">Total of all payment methods</Text>
                  </View>
                  <View className="items-end">
                    <View className="flex-row items-center">
                      <Wallet color="#006948" size={18} />
                      <Text className="text-xl font-extrabold text-[#006948] ml-1.5">
                        ₹{formatMoney(paymentTotal)}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500 mt-1.5">
                      Remaining:{' '}
                      <Text className="font-semibold text-gray-700">₹{formatMoney(remainingBalance)}</Text>
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={paymentMutation.isPending}
                className={`py-4 rounded-xl items-center flex-row justify-center ${paymentMutation.isPending ? 'bg-gray-400' : 'bg-[#006948]'}`}
              >
                {paymentMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <CheckCircle color="white" size={20} />
                    <Text className="text-white text-lg font-bold ml-2">
                      {modalIsToPay ? 'Submit Payment' : 'Submit Receipt'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
                setHistoryDateFilter('Custom');
                setCustomModalVisible(false);
              }}
              className="bg-[#006948] py-3.5 rounded-xl items-center"
            >
              <Text className="text-white font-bold">Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        isVisible={showDeleteConfirm}
        title="Confirm Delete"
        message="Are you sure you want to delete this payment? The party balance will be restored."
        onConfirm={() => {
          if (editTransactionId) deleteMutation.mutate(editTransactionId);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        confirmText="Proceed"
        isDestructive={true}
      />
    </SafeAreaView>
  );
}
