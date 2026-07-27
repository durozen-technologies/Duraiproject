import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Users, Truck, PlusCircle, X, CheckCircle, RefreshCw, Clock, Edit2, Trash2, Calendar, Search } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import client from '../api/client';
import { formatDateToDDMMYYYY } from '../utils/formatDate';
import ConfirmModal from '../components/ConfirmModal';

export default function CollectionPaymentScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'SUPPLIER' | 'PURCHASER' | 'HISTORY'>('SUPPLIER');

  // New Payment / Edit Modal State
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [editTransactionId, setEditTransactionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // History State
  const [historyFromDate, setHistoryFromDate] = useState(new Date());
  const [historyToDate, setHistoryToDate] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  
  // Search State
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
    queryKey: ['parties', activeTab],
    queryFn: async () => {
      const response = await client.get(`/parties/?party_type=${activeTab}`);
      return response.data;
    },
    enabled: activeTab !== 'HISTORY'
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['paymentHistory', historyFromDate.toISOString().split('T')[0], historyToDate.toISOString().split('T')[0]],
    queryFn: async () => {
      const fromStr = historyFromDate.toISOString().split('T')[0];
      const toStr = historyToDate.toISOString().split('T')[0];
      const response = await client.get(`/payments/collection/history?from_date=${fromStr}&to_date=${toStr}`);
      return response.data;
    },
    enabled: activeTab === 'HISTORY'
  });

  const { data: pendingBills, isLoading: pendingBillsLoading } = useQuery({
    queryKey: ['pendingBills', selectedParty?.id],
    queryFn: async () => {
      const response = await client.get(`/parties/${selectedParty.id}/pending-bills`);
      return response.data;
    },
    enabled: !!selectedParty
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editTransactionId) {
        const response = await client.put(`/payments/collection/${editTransactionId}`, data);
        return response.data;
      } else {
        const response = await client.post('/payments/collection', data);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
      setErrorMsg('');
      setSuccessMsg(editTransactionId ? "Payment updated successfully" : "Payment processed successfully");
      setTimeout(() => closeModal(), 1500);
    },
    onError: (error: any) => {
      setSuccessMsg('');
      setErrorMsg(error.response?.data?.detail || "Failed to process payment");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      await client.delete(`/payments/collection/${transactionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
      setShowDeleteConfirm(false);
      setErrorMsg('');
      setSuccessMsg("Payment deleted and bills unlocked successfully");
      setTimeout(() => closeModal(), 1500);
    },
    onError: (error: any) => {
      setShowDeleteConfirm(false);
      setSuccessMsg('');
      setErrorMsg(error.response?.data?.detail || "Failed to delete payment");
    }
  });

  const handleOpenModal = (party: any) => {
    setSelectedParty(party);
    setEditTransactionId(null);
    setCashAmount('');
    setUpiAmount('');
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
      setCashAmount(payment.cash_amount.toString());
      setUpiAmount(payment.upi_amount.toString());
      setDate(new Date(payment.date));
      setValidationError('');
      setErrorMsg('');
      setSuccessMsg('');
    } catch (e) {
      setErrorMsg("Could not fetch party details for editing.");
    }
  };

  const handleDeletePayment = () => {
    if (!editTransactionId) return;
    setShowDeleteConfirm(true);
  };

  const closeModal = () => {
    setSelectedParty(null);
    setEditTransactionId(null);
    setValidationError('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = () => {
    setValidationError('');
    
    const cash = parseFloat(cashAmount || '0');
    const upi = parseFloat(upiAmount || '0');
    const total = cash + upi;

    if (total <= 0) {
      setValidationError('Please enter a valid payment amount.');
      return;
    }

    paymentMutation.mutate({
      party_id: selectedParty.id,
      cash_amount: cash,
      upi_amount: upi,
      date: date.toISOString().split('T')[0]
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top App Bar */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <ArrowLeft color="#111827" size={24} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Collection Payment</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} className="p-2 bg-gray-100 rounded-full">
          <RefreshCw color="#4b5563" size={20} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View className="flex-row p-4 gap-2 bg-white border-b border-gray-200">
        <TouchableOpacity 
          onPress={() => setActiveTab('SUPPLIER')}
          className={`flex-1 py-3 items-center rounded-xl flex-row justify-center gap-1 ${activeTab === 'SUPPLIER' ? 'bg-[#006948]' : 'bg-gray-100'}`}
        >
          <Truck color={activeTab === 'SUPPLIER' ? 'white' : '#6b7280'} size={18} />
          <Text className={`font-bold text-xs ${activeTab === 'SUPPLIER' ? 'text-white' : 'text-gray-600'}`}>Suppliers</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('PURCHASER')}
          className={`flex-1 py-3 items-center rounded-xl flex-row justify-center gap-1 ${activeTab === 'PURCHASER' ? 'bg-[#006948]' : 'bg-gray-100'}`}
        >
          <Users color={activeTab === 'PURCHASER' ? 'white' : '#6b7280'} size={18} />
          <Text className={`font-bold text-xs ${activeTab === 'PURCHASER' ? 'text-white' : 'text-gray-600'}`}>Purchasers</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('HISTORY')}
          className={`flex-1 py-3 items-center rounded-xl flex-row justify-center gap-1 ${activeTab === 'HISTORY' ? 'bg-[#006948]' : 'bg-gray-100'}`}
        >
          <Clock color={activeTab === 'HISTORY' ? 'white' : '#6b7280'} size={18} />
          <Text className={`font-bold text-xs ${activeTab === 'HISTORY' ? 'text-white' : 'text-gray-600'}`}>History</Text>
        </TouchableOpacity>
      </View>

      {/* History Date Picker */}
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

      {/* Search Bar for Parties */}
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

      {/* List */}
      <ScrollView 
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#006948"]} />
        }
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
                    <Text className="text-xs text-gray-500 mt-1">{payment.type === 'PAID' ? 'Paid to Supplier' : 'Received from Purchaser'}</Text>
                  </View>
                  <Text className={`text-lg font-bold ${payment.type === 'RECEIVED' ? 'text-green-600' : 'text-blue-600'}`}>
                    ₹{payment.total_amount.toLocaleString()}
                  </Text>
                </View>
                <View className="flex-row space-x-4 border-t border-gray-100 pt-3 mt-1 justify-between items-center">
                  <View className="flex-row space-x-4">
                    <Text className="text-xs font-semibold text-gray-600">Cash: ₹{payment.cash_amount}</Text>
                    <Text className="text-xs font-semibold text-gray-600">UPI: ₹{payment.upi_amount}</Text>
                  </View>
                  <View className="flex-row items-center bg-gray-100 px-2 py-1 rounded-lg">
                    <Edit2 color="#4b5563" size={12} className="mr-1" />
                    <Text className="text-gray-700 text-xs font-medium">Edit</Text>
                  </View>
                </View>
                {payment.allocations && payment.allocations.length > 0 && (
                  <View className="mt-3 border-t border-gray-100 pt-2">
                    <Text className="text-[10px] font-bold text-gray-400 mb-1">APPLIED TO:</Text>
                    {payment.allocations.map((alloc: any, idx: number) => (
                      <View key={idx} className="flex-row justify-between items-center mb-1">
                        <Text className="text-[11px] text-gray-600 font-medium">
                          {alloc.type === 'OPENING_BALANCE' ? 'Applies to opening balance' : `Bill #${alloc.bill_number}`}
                        </Text>
                        <Text className="text-[11px] font-bold text-gray-700">₹{alloc.amount.toLocaleString()}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            ))
          )
        ) : (
          (() => {
            const filteredParties = parties?.filter((party: any) => 
              party.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              (party.mobile && party.mobile.includes(searchQuery))
            );

            if (partiesLoading && !refreshing) {
              return <ActivityIndicator size="large" color="#006948" className="mt-10" />;
            }
            if (filteredParties?.length === 0) {
              return (
                <View className="items-center justify-center py-10">
                  <Text className="text-gray-500 text-base">
                    {searchQuery ? 'No parties match your search.' : 'No parties found.'}
                  </Text>
                </View>
              );
            }
            return filteredParties?.map((party: any) => (
              <TouchableOpacity 
                key={party.id}
                onPress={() => handleOpenModal(party)}
                className="bg-white p-4 rounded-xl border border-gray-200 mb-3 shadow-sm flex-row items-center justify-between"
              >
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">{party.name}</Text>
                  {party.mobile && (
                    <Text className="text-sm text-gray-500 mt-0.5">{party.mobile}</Text>
                  )}
                  {party.address && (
                    <Text className="text-xs text-gray-400 mt-1">{party.address}</Text>
                  )}
                </View>
                <View className="items-end ml-4">
                  {party.unpaid_opening_balance > 0 && (
                    <Text className="text-xs text-gray-400 mb-1">Opening: ₹{party.unpaid_opening_balance?.toLocaleString()}</Text>
                  )}
                  {party.total_pending_invoice_amount > 0 && (
                    <Text className="text-[10px] font-bold text-gray-500 mb-0.5">Pending Bill: ₹{party.total_pending_invoice_amount?.toLocaleString()}</Text>
                  )}
                  <Text className="text-xs text-gray-500 mb-1">Balance Due</Text>
                  <Text className={`text-lg font-bold ${(party.current_balance - (party.unpaid_opening_balance || 0)) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                    ₹{(party.current_balance - (party.unpaid_opening_balance || 0)).toLocaleString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          })()
        )}
        
        {/* Bottom padding for scrolling */}
        <View className="h-10" />
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={!!selectedParty} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-xl font-bold text-gray-900">{editTransactionId ? 'Edit Payment' : 'Record Payment'}</Text>
                <Text className="text-sm text-gray-500 mt-1">{selectedParty?.name}</Text>
              </View>
              <View className="flex-row space-x-3">
                {editTransactionId && (
                  <TouchableOpacity onPress={handleDeletePayment} className="bg-red-50 p-2 rounded-full border border-red-100 flex-row items-center px-3 mr-2">
                    <Trash2 color="#dc2626" size={16} className="mr-1" />
                    <Text className="text-red-600 font-bold text-xs">Delete</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={closeModal} className="bg-gray-100 p-2 rounded-full">
                  <X color="#4b5563" size={20} />
                </TouchableOpacity>
              </View>
            </View>
            
            <View className={`bg-orange-50 p-3 rounded-lg mb-6 border border-orange-100 flex-row ${selectedParty?.unpaid_opening_balance > 0 ? 'justify-between' : 'justify-center'}`}>
              {selectedParty?.unpaid_opening_balance > 0 && (
                <Text className="text-sm text-orange-800">
                  Opening: <Text className="font-bold">₹{selectedParty?.unpaid_opening_balance}</Text>
                </Text>
              )}
              <Text className="text-sm text-orange-800 text-right">
                Bill Bal: <Text className="font-bold">₹{selectedParty ? (selectedParty.current_balance - (selectedParty.unpaid_opening_balance || 0)) : 0}</Text>
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

            {/* Cash Input */}
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

            {/* UPI Input */}
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

            {/* Date Picker */}
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
                    if (selectedDate) {
                      setDate(selectedDate);
                    }
                  }}
                  onDismiss={() => setShowDatePicker(false)}
                />
              )}
            </View>

            {/* Total Paid Display */}
            <View className="mb-6 flex-row justify-between items-center bg-green-50 p-4 rounded-xl border border-green-100">
              <Text className="text-sm font-bold text-green-800">Total Paying</Text>
              <Text className="text-xl font-extrabold text-green-800">
                ₹{((parseFloat(cashAmount) || 0) + (parseFloat(upiAmount) || 0)).toLocaleString()}
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
                  <Text className="text-white text-lg font-bold">Submit Payment</Text>
                </>
              )}
            </TouchableOpacity>
            
            {/* iOS safe area bottom spacing inside modal */}
            <View className="h-6" />
          </View>
        </View>
      </Modal>

      <ConfirmModal
        isVisible={showDeleteConfirm}
        title="Confirm Delete"
        message="Are you sure you want to delete this payment? This will unlock associated bills."
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
