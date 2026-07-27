import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Receipt, Trash2, RefreshCcw } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { fetchExpenseCategories, createExpenseEntry, updateExpenseEntry, deleteExpenseEntry, fetchExpensesHistory, ExpenseCategory, ExpenseEntry } from '../api/expenses';
import ConfirmModal from '../components/ConfirmModal';

export default function ExpensesScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [editExpense, setEditExpense] = useState<ExpenseEntry | null>(null);
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['activeExpenseCategories'],
    queryFn: () => fetchExpenseCategories(true)
  });

  const { data: history, isLoading: isLoadingHistory, refetch, isRefetching } = useQuery({
    queryKey: ['expensesHistory'],
    queryFn: () => fetchExpensesHistory(20)
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => createExpenseEntry(data.categoryId, data.name, data.cash, data.upi, data.note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expensesHistory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setErrorMsg('');
      setSuccessMsg('Expense recorded successfully');
      setTimeout(() => closeModal(), 1500);
    },
    onError: (err: any) => {
      setSuccessMsg('');
      setErrorMsg(err?.response?.data?.detail || 'Failed to record expense');
    }
  });

  const updateExpenseMutation = useMutation({
    mutationFn: (data: any) => updateExpenseEntry(data.id, data.categoryId, data.name, data.cash, data.upi, data.note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expensesHistory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setErrorMsg('');
      setSuccessMsg('Expense updated successfully');
      setTimeout(() => closeModal(), 1500);
    },
    onError: (err: any) => {
      setSuccessMsg('');
      setErrorMsg(err?.response?.data?.detail || 'Failed to update expense');
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => deleteExpenseEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expensesHistory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setShowDeleteConfirm(false);
      setErrorMsg('');
      setSuccessMsg('Expense deleted successfully');
      setTimeout(() => closeModal(), 1500);
    },
    onError: (err: any) => {
      setShowDeleteConfirm(false);
      setSuccessMsg('');
      setErrorMsg(err?.response?.data?.detail || 'Failed to delete expense');
    }
  });

  const handleDeleteExpense = () => {
    if (!editExpense) return;
    setShowDeleteConfirm(true);
  };

  const openExpenseModal = (category: ExpenseCategory, expense?: ExpenseEntry) => {
    setSelectedCategory(category);
    if (expense) {
      setEditExpense(expense);
      setCashAmount(expense.cash_amount.toString());
      setUpiAmount(expense.upi_amount.toString());
      setNote(expense.note || '');
    } else {
      setEditExpense(null);
      setCashAmount('');
      setUpiAmount('');
      setNote('');
    }
  };

  const closeModal = () => {
    setSelectedCategory(null);
    setEditExpense(null);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSaveExpense = () => {
    if (!selectedCategory) return;
    
    const cash = parseFloat(cashAmount) || 0;
    const upi = parseFloat(upiAmount) || 0;
    
    if (cash + upi <= 0) {
      setErrorMsg('Total amount must be greater than zero');
      return;
    }
    setErrorMsg('');

    if (editExpense) {
      updateExpenseMutation.mutate({
        id: editExpense.id,
        categoryId: selectedCategory.id,
        name: selectedCategory.name,
        cash,
        upi,
        note: note.trim() || undefined
      });
    } else {
      createExpenseMutation.mutate({
        categoryId: selectedCategory.id,
        name: selectedCategory.name,
        cash,
        upi,
        note: note.trim() || undefined
      });
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top App Bar */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.canGoBack() && navigation.goBack()} className="mr-3">
            <ArrowLeft color="#111827" size={24} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Expenses</Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ['activeExpenseCategories'] });
            }}
            className="p-2 bg-gray-100 rounded-full mr-2"
          >
            <RefreshCcw color="#374151" size={18} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('ExpenseCategories' as never)}
            className="p-2 bg-gray-100 rounded-lg mr-2"
          >
            <Text className="text-gray-700 font-bold text-sm px-1">Categories</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl 
            refreshing={isRefetching} 
            onRefresh={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ['activeExpenseCategories'] });
            }} 
            colors={['#006948']} 
          />
        }
      >
        <Text className="text-sm font-bold text-gray-600 mb-3 uppercase tracking-wider">Record New Expense</Text>
        
        {isLoadingCategories ? (
          <ActivityIndicator size="small" color="#006948" className="mb-6" />
        ) : (
          <View className="mb-6">
            {categories?.map((cat) => (
              <TouchableOpacity 
                key={cat.id} 
                onPress={() => openExpenseModal(cat)}
                className="bg-white p-4 rounded-xl border border-gray-200 mb-3 flex-row items-center justify-between shadow-sm"
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-green-50 rounded-full items-center justify-center mr-3">
                    <Receipt color="#006948" size={20} />
                  </View>
                  <View>
                    <Text className="text-base font-bold text-gray-900">{cat.name}</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">Tap to record</Text>
                  </View>
                </View>
                <ChevronRight color="#9ca3af" size={20} />
              </TouchableOpacity>
            ))}
            {categories?.length === 0 && (
              <View className="bg-white p-6 rounded-xl border border-gray-200 items-center">
                <Text className="text-gray-500 text-center">No active categories found.</Text>
                <Text className="text-gray-500 text-center mt-1">Please ask admin to create categories.</Text>
              </View>
            )}
          </View>
        )}

        <Text className="text-sm font-bold text-gray-600 mb-3 uppercase tracking-wider">Recent History</Text>
        
        {isLoadingHistory ? (
          <ActivityIndicator size="small" color="#006948" />
        ) : (
          <View className="mb-8">
            {history?.map((entry) => {
              const cat = categories?.find(c => c.id === entry.category_id);
              return (
                <TouchableOpacity 
                  key={entry.id} 
                  onPress={() => {
                    if (cat) openExpenseModal(cat, entry);
                  }}
                  className="bg-white p-4 rounded-xl border border-gray-200 mb-3 shadow-sm"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-base font-bold text-gray-900">{entry.expense_name}</Text>
                    <Text className="text-base font-bold text-red-600">₹{entry.total_amount.toLocaleString()}</Text>
                  </View>
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-xs text-gray-500">
                      Cash: ₹{entry.cash_amount.toLocaleString()} | UPI: ₹{entry.upi_amount.toLocaleString()}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-400 mb-1">{formatDate(entry.spent_at)}</Text>
                  {entry.note ? (
                    <Text className="text-sm text-gray-600 mt-2 italic bg-gray-50 p-2 rounded">{entry.note}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
            {history?.length === 0 && (
              <View className="p-4 items-center">
                <Text className="text-gray-500">No recent expenses.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal for Recording Expense */}
      <Modal visible={!!selectedCategory} transparent={true} animationType="fade" onRequestClose={closeModal}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-center bg-black/50 p-4"
        >
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
              {editExpense ? 'Edit' : 'Record'} {selectedCategory?.name}
            </Text>

            {errorMsg ? (
              <View className="mb-2 mt-2 bg-red-50 p-2 rounded border border-red-200">
                <Text className="text-red-600 text-sm font-semibold text-center">{errorMsg}</Text>
              </View>
            ) : null}

            {successMsg ? (
              <View className="mb-2 mt-2 bg-green-50 p-2 rounded border border-green-200">
                <Text className="text-green-600 text-sm font-semibold text-center">{successMsg}</Text>
              </View>
            ) : null}
            
            <View className="mb-4 mt-2">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Cash Amount (₹)</Text>
              <TextInput 
                className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="0"
                keyboardType="decimal-pad"
                value={cashAmount}
                onChangeText={setCashAmount}
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">UPI Amount (₹)</Text>
              <TextInput 
                className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="0"
                keyboardType="decimal-pad"
                value={upiAmount}
                onChangeText={setUpiAmount}
              />
            </View>

            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Note (Optional)</Text>
              <TextInput 
                className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="Add a remark..."
                value={note}
                onChangeText={setNote}
              />
            </View>

            <View className="bg-green-50 p-4 rounded-lg mb-6 border border-green-200 flex-row justify-between items-center">
              <Text className="font-bold text-gray-700 uppercase text-xs">Total Expense</Text>
              <Text className="text-xl font-bold text-[#006948]">
                ₹{((parseFloat(cashAmount) || 0) + (parseFloat(upiAmount) || 0)).toLocaleString()}
              </Text>
            </View>

            <View className="flex-row justify-end gap-3">
              {editExpense ? (
                <TouchableOpacity 
                  onPress={handleDeleteExpense} 
                  disabled={deleteExpenseMutation.isPending || updateExpenseMutation.isPending}
                  className="w-[15%] py-3 bg-red-100 rounded-lg items-center justify-center mr-1"
                >
                  <Trash2 color="#dc2626" size={20} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={closeModal} className={`${editExpense ? 'w-[25%]' : 'flex-1'} py-3 bg-gray-100 rounded-lg items-center justify-center`}>
                <Text className="font-semibold text-gray-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSaveExpense} 
                className={`${editExpense ? 'w-[50%]' : 'flex-1'} py-3 bg-[#006948] rounded-lg items-center justify-center`}
                disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending || deleteExpenseMutation.isPending}
              >
                {(createExpenseMutation.isPending || updateExpenseMutation.isPending) ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="font-semibold text-white">{editExpense ? 'Update' : 'Save'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        isVisible={showDeleteConfirm}
        title="Confirm Delete"
        message="Are you sure you want to delete this expense?"
        onConfirm={() => {
          if (editExpense) deleteExpenseMutation.mutate(editExpense.id);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        confirmText="Delete"
        isDestructive={true}
      />
    </SafeAreaView>
  );
}
