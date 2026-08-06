import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, X, CheckCircle, RefreshCw, Clock, Edit2, Trash2, Calendar, Search } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import client from '../api/client';
import { formatDateToDDMMYYYY } from '../utils/formatDate';
import ConfirmModal from '../components/ConfirmModal';

type CollectionTab = 'TO_PAY' | 'TO_RECEIVE' | 'HISTORY';

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

  const [historyFromDate, setHistoryFromDate] = useState(new Date());
  const [historyToDate, setHistoryToDate] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

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
    queryKey: ['paymentHistory', historyFromDate.toISOString().split('T')[0], historyToDate.toISOString().split('T')[0]],
    queryFn: async () => {
      const fromStr = historyFromDate.toISOString().split('T')[0];
      const toStr = historyToDate.toISOString().split('T')[0];
      const response = await client.get(`/payments/collection/history?from_date=${fromStr}&to_date=${toStr}`);
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
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
      setEditPaymentType(payment.type === 'PAID' ? 'PAID' : 'RECEIVED');
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
    if (type === 'SUPPLIER') return 'Supplier';
    return 'Purchaser';
  };

  const modalIsToPay = editPaymentType
    ? editPaymentType === 'PAID'
    : selectedParty
      ? parseFloat(selectedParty.current_balance || 0) > 0
      : true;

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

      {activeTab === 'HISTORY' && (
        <View className="p-4 bg-white border-b border-gray-200">
          <Text className="text-gray-700 font-semibold mb-2">Filter Date Range:</Text>
          <View className="flex-row justify-between space-x-2">
            <TouchableOpacity
              onPress={() => setShowFromPicker(true)}
              className="flex-1 flex-row items-center justify-center bg-gray-100 px-3 py-2 rounded-lg"
            >
              <Calendar color="#4b5563" size={16} className="mr-1.5" />
              <Text className="text-gray-800 font-medium text-xs">From: {formatDateToDDMMYYYY(historyFromDate)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowToPicker(true)}
              className="flex-1 flex-row items-center justify-center bg-gray-100 px-3 py-2 rounded-lg"
            >
              <Calendar color="#4b5563" size={16} className="mr-1.5" />
              <Text className="text-gray-800 font-medium text-xs">To: {formatDateToDDMMYYYY(historyToDate)}</Text>
            </TouchableOpacity>
          </View>

          {showFromPicker && (
            <DateTimePicker
              value={historyFromDate}
              mode="date"
              display="default"
              maximumDate={historyToDate}
              onValueChange={(event: any, selectedDate?: Date) => {
                setShowFromPicker(false);
                if (selectedDate) setHistoryFromDate(selectedDate);
              }}
            />
          )}
          {showToPicker && (
            <DateTimePicker
              value={historyToDate}
              mode="date"
              display="default"
              minimumDate={historyFromDate}
              onValueChange={(event: any, selectedDate?: Date) => {
                setShowToPicker(false);
                if (selectedDate) setHistoryToDate(selectedDate);
              }}
            />
          )}
        </View>
      )}

      {activeTab !== 'HISTORY' && (
        <View className="px-4 py-3 bg-white border-b border-gray-200">
          <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
            <Search color="#6b7280" size={20} className="mr-2" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or mobile..."
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
      )}

      <ScrollView
        className="flex-1 p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#006948']} />}
      >
        {activeTab === 'HISTORY' ? (
          historyLoading && !refreshing ? (
            <ActivityIndicator size="large" color="#006948" className="mt-10" />
          ) : history?.length === 0 ? (
            <View className="items-center justify-center py-10">
              <Text className="text-gray-500 text-base">No payments found in this date range.</Text>
            </View>
          ) : (
            history?.map((payment: any) => (
              <TouchableOpacity
                key={payment.id}
                onPress={() => handleEditPayment(payment)}
                className="bg-white p-4 rounded-xl border border-gray-200 mb-3 shadow-sm"
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View>
                    <Text className="text-base font-bold text-gray-900">{payment.party_name}</Text>
                    <Text className="text-xs text-gray-500 mt-1">
                      {payment.type === 'PAID' ? 'Paid (To Pay)' : 'Received (To Receive)'}
                    </Text>
                  </View>
                  <Text className={`text-lg font-bold ${payment.type === 'RECEIVED' ? 'text-green-600' : 'text-blue-600'}`}>
                    ₹{payment.total_amount.toLocaleString()}
                  </Text>
                </View>
                <View className="flex-row space-x-4 border-t border-gray-100 pt-3 mt-1 justify-between items-center">
                  <View className="flex-row flex-wrap gap-x-3 gap-y-1">
                    <Text className="text-xs font-semibold text-gray-600">Cash: ₹{payment.cash_amount}</Text>
                    <Text className="text-xs font-semibold text-gray-600">UPI: ₹{payment.upi_amount}</Text>
                    <Text className="text-xs font-semibold text-gray-600">Bank: ₹{payment.bank_amount || 0}</Text>
                  </View>
                  <View className="flex-row items-center bg-gray-100 px-2 py-1 rounded-lg">
                    <Edit2 color="#4b5563" size={12} className="mr-1" />
                    <Text className="text-gray-700 text-xs font-medium">Edit</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
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
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base font-bold text-gray-900">{party.name}</Text>
                    <View className="bg-gray-100 px-2 py-0.5 rounded">
                      <Text className="text-[10px] font-bold text-gray-600">{typeBadge(party.type)}</Text>
                    </View>
                  </View>
                  {party.mobile && <Text className="text-sm text-gray-500 mt-0.5">{party.mobile}</Text>}
                  {party.address && <Text className="text-xs text-gray-400 mt-1">{party.address}</Text>}
                </View>
                <View className="items-end ml-4">
                  <Text className="text-xs text-gray-500 mb-1">{isToPay ? 'To Pay' : 'To Receive'}</Text>
                  <Text className={`text-lg font-bold ${isToPay ? 'text-red-500' : 'text-[#006948]'}`}>
                    ₹{Math.abs(balance).toLocaleString()} {isToPay ? 'CR' : 'DR'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View className="h-10" />
      </ScrollView>

      <Modal visible={!!selectedParty} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-xl font-bold text-gray-900">
                  {editTransactionId ? 'Edit Payment' : modalIsToPay ? 'Record Payment' : 'Record Receipt'}
                </Text>
                <Text className="text-sm text-gray-500 mt-1">{selectedParty?.name}</Text>
              </View>
              <View className="flex-row space-x-3">
                {editTransactionId && (
                  <TouchableOpacity
                    onPress={() => setShowDeleteConfirm(true)}
                    className="bg-red-50 p-2 rounded-full border border-red-100 flex-row items-center px-3 mr-2"
                  >
                    <Trash2 color="#dc2626" size={16} className="mr-1" />
                    <Text className="text-red-600 font-bold text-xs">Delete</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={closeModal} className="bg-gray-100 p-2 rounded-full">
                  <X color="#4b5563" size={20} />
                </TouchableOpacity>
              </View>
            </View>

            <View className="bg-orange-50 p-3 rounded-lg mb-6 border border-orange-100 items-center">
              <Text className="text-sm text-orange-800">
                Outstanding:{' '}
                <Text className="font-bold">
                  ₹{outstandingForModal.toLocaleString()} {modalIsToPay ? 'CR' : 'DR'}
                </Text>
              </Text>
            </View>

            {validationError ? (
              <Text className="text-red-500 text-sm mb-4 text-center">{validationError}</Text>
            ) : null}

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

            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Cash Amount</Text>
              <View className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center">
                <Text className="text-gray-500 mr-2 text-lg">₹</Text>
                <TextInput
                  className="flex-1 text-lg font-semibold text-gray-900"
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={cashAmount}
                  onChangeText={setCashAmount}
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">UPI Amount</Text>
              <View className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center">
                <Text className="text-gray-500 mr-2 text-lg">₹</Text>
                <TextInput
                  className="flex-1 text-lg font-semibold text-gray-900"
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={upiAmount}
                  onChangeText={setUpiAmount}
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Bank Amount</Text>
              <View className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center">
                <Text className="text-gray-500 mr-2 text-lg">₹</Text>
                <TextInput
                  className="flex-1 text-lg font-semibold text-gray-900"
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={bankAmount}
                  onChangeText={setBankAmount}
                />
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
              >
                <Text className="text-gray-900">{formatDateToDDMMYYYY(date)}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onValueChange={(event: any, selectedDate?: Date) => {
                    setShowDatePicker(false);
                    if (selectedDate) setDate(selectedDate);
                  }}
                  onDismiss={() => setShowDatePicker(false)}
                />
              )}
            </View>

            <View className="mb-6 flex-row justify-between items-center bg-green-50 p-4 rounded-xl border border-green-100">
              <Text className="text-sm font-bold text-green-800">Total</Text>
              <Text className="text-xl font-extrabold text-green-800">
                ₹
                {(
                  (parseFloat(cashAmount) || 0) +
                  (parseFloat(upiAmount) || 0) +
                  (parseFloat(bankAmount) || 0)
                ).toLocaleString()}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={paymentMutation.isPending}
              className={`py-4 rounded-xl items-center flex-row justify-center gap-2 ${paymentMutation.isPending ? 'bg-gray-400' : 'bg-[#006948]'}`}
            >
              {paymentMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <CheckCircle color="white" size={20} />
                  <Text className="text-white text-lg font-bold">
                    {modalIsToPay ? 'Submit Payment' : 'Submit Receipt'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View className="h-6" />
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
