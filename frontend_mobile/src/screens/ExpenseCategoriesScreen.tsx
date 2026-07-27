import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { fetchExpenseCategories, createExpenseCategory, updateExpenseCategory, ExpenseCategory } from '../api/expenses';

export default function ExpenseCategoriesScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['expenseCategories'],
    queryFn: () => fetchExpenseCategories(false) // fetch all, including inactive
  });

  const createMutation = useMutation({
    mutationFn: (newCat: any) => createExpenseCategory(newCat.name, newCat.sortOrder, newCat.isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
      queryClient.invalidateQueries({ queryKey: ['activeExpenseCategories'] });
      setErrorMsg('');
      setSuccessMsg('Category created successfully');
      setTimeout(() => closeModal(), 1500);
    },
    onError: (err: any) => {
      setSuccessMsg('');
      setErrorMsg(err?.response?.data?.detail || 'Failed to create category');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (updateData: any) => updateExpenseCategory(updateData.id, updateData.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
      queryClient.invalidateQueries({ queryKey: ['activeExpenseCategories'] });
      setErrorMsg('');
      setSuccessMsg('Category updated successfully');
      setTimeout(() => closeModal(), 1500);
    },
    onError: (err: any) => {
      setSuccessMsg('');
      setErrorMsg(err?.response?.data?.detail || 'Failed to update category');
    }
  });

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setSortOrder('0');
    setIsActive(true);
    setModalVisible(true);
  };

  const openEditModal = (cat: ExpenseCategory) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSortOrder(cat.sort_order.toString());
    setIsActive(cat.is_active);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSave = () => {
    if (!name.trim()) {
      setErrorMsg('Category name is required');
      return;
    }
    setErrorMsg('');
    const orderNum = parseInt(sortOrder) || 0;
    
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        updates: { name, sort_order: orderNum, is_active: isActive }
      });
    } else {
      createMutation.mutate({ name, sortOrder: orderNum, isActive });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top App Bar */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-bold text-gray-900">Expense Categories</Text>
        <TouchableOpacity onPress={openAddModal} className="w-10 h-10 bg-[#006948] rounded-full items-center justify-center">
          <Plus color="white" size={20} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#006948" />
        </View>
      ) : (
        <ScrollView className="flex-1 p-4">
          {categories?.map((cat) => (
            <TouchableOpacity 
              key={cat.id} 
              onPress={() => openEditModal(cat)}
              className={`bg-white p-4 rounded-xl border mb-3 flex-row items-center justify-between shadow-sm ${cat.is_active ? 'border-gray-200' : 'border-red-200 opacity-70'}`}
            >
              <View className="justify-center">
                <Text className="text-base font-bold text-gray-900">{cat.name}</Text>
                <Text className="text-xs text-gray-500 mt-1">{cat.is_active ? 'Active' : 'Inactive'}</Text>
              </View>
              <Edit2 color="#9ca3af" size={18} />
            </TouchableOpacity>
          ))}
          {categories?.length === 0 && (
            <View className="p-8 items-center">
              <Text className="text-gray-500">No categories found. Tap + to add one.</Text>
            </View>
          )}
          <View className="h-20" />
        </ScrollView>
      )}

      {/* Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={closeModal}>
        <View className="flex-1 justify-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
              {editingId ? 'Edit Category' : 'New Category'}
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
              <Text className="text-sm font-semibold text-gray-700 mb-2">Category Name</Text>
              <TextInput 
                className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="e.g. Fuel, Salary"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View className="flex-row items-center justify-between mb-8">
              <Text className="text-sm font-semibold text-gray-700">Is Active?</Text>
              <Switch 
                value={isActive} 
                onValueChange={setIsActive}
                trackColor={{ false: '#d1d5db', true: '#006948' }}
              />
            </View>

            <View className="flex-row justify-end space-x-3 gap-3">
              <TouchableOpacity onPress={closeModal} className="flex-1 py-3 bg-gray-100 rounded-lg items-center">
                <Text className="font-semibold text-gray-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSave} 
                className="flex-1 py-3 bg-[#006948] rounded-lg items-center"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="font-semibold text-white">Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
