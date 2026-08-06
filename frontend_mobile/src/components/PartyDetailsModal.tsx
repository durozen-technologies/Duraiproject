import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Switch, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { X, Edit2, Save } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

interface PartyDetailsModalProps {
  isVisible: boolean;
  onClose: () => void;
  party: any | null;
}

export default function PartyDetailsModal({ isVisible, onClose, party }: PartyDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    mobile: '',
    address: '',
    is_active: true,
    opening_balance: '0'
  });
  const [openingDirection, setOpeningDirection] = useState<'CR' | 'DR'>('CR');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (party) {
      const opening = parseFloat(party.opening_balance || 0);
      setFormData({
        name: party.name || '',
        nickname: party.nickname || '',
        mobile: party.mobile || '',
        address: party.address || '',
        is_active: party.is_active ?? true,
        opening_balance: Math.abs(opening).toString()
      });
      setOpeningDirection(opening < 0 ? 'DR' : 'CR');
      setIsEditing(false);
    }
  }, [party]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await client.put(`/parties/${party.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      setErrorMsg('');
      setSuccessMsg('Party updated successfully');
      setTimeout(() => {
        setIsEditing(false);
        setSuccessMsg('');
        onClose();
      }, 1500);
    },
    onError: (error: any) => {
      setSuccessMsg('');
      setErrorMsg(error.response?.data?.detail || 'Failed to update party');
    }
  });

  const handleSave = () => {
    if (!formData.name.trim()) {
      setErrorMsg('Name is required');
      return;
    }
    setErrorMsg('');
    
    const amount = Math.abs(parseFloat(formData.opening_balance) || 0);
    const submitData = {
      ...formData,
      opening_balance: openingDirection === 'CR' ? amount : -amount
    };
    
    updateMutation.mutate(submitData);
  };

  if (!party) return null;

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 h-[85%]">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6 border-b border-gray-100 pb-4">
            <Text className="text-xl font-bold text-gray-900">
              {isEditing ? 'Edit Party' : 'Party Details'}
            </Text>
            <View className="flex-row items-center space-x-4">
              {!isEditing ? (
                <TouchableOpacity onPress={() => setIsEditing(true)} className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg">
                  <Edit2 color="#006948" size={16} className="mr-2" />
                  <Text className="text-[#006948] font-semibold text-sm">Edit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setIsEditing(false)} className="px-3 py-2">
                  <Text className="text-gray-500 font-semibold text-sm">Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
                <X color="#374151" size={20} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
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

            <View className="space-y-4 pb-8">
            {/* Status Toggle (Only visible in edit mode or if disabled) */}
            {(isEditing || !formData.is_active) && (
              <View className="flex-row items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200">
                <View>
                  <Text className="text-base font-semibold text-gray-900">Account Status</Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    {formData.is_active ? 'Active and visible in transactions' : 'Disabled and hidden from transactions'}
                  </Text>
                </View>
                <Switch
                  value={formData.is_active}
                  onValueChange={(val) => setFormData({ ...formData, is_active: val })}
                  disabled={!isEditing}
                  trackColor={{ false: '#D1D5DB', true: '#006948' }}
                  thumbColor={'#FFFFFF'}
                />
              </View>
            )}

            {/* Form Fields */}
            <View className="space-y-1">
              <Text className="text-sm font-semibold text-gray-700 ml-1">Name</Text>
              {isEditing ? (
                <TextInput
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Enter party name"
                  className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                />
              ) : (
                <View className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                  <Text className="text-base text-gray-900">{party.name}</Text>
                </View>
              )}
            </View>

            <View className="space-y-1">
              <Text className="text-sm font-semibold text-gray-700 ml-1">Nickname</Text>
              {isEditing ? (
                <TextInput
                  value={formData.nickname}
                  onChangeText={(text) => setFormData({ ...formData, nickname: text })}
                  placeholder="Enter nickname (optional)"
                  className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                />
              ) : (
                <View className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                  <Text className="text-base text-gray-900">{party.nickname || 'Not provided'}</Text>
                </View>
              )}
            </View>

            <View className="space-y-1">
              <Text className="text-sm font-semibold text-gray-700 ml-1">Mobile Number</Text>
              {isEditing ? (
                <TextInput
                  value={formData.mobile}
                  onChangeText={(text) => setFormData({ ...formData, mobile: text })}
                  placeholder="Enter mobile number"
                  keyboardType="phone-pad"
                  className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                />
              ) : (
                <View className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                  <Text className="text-base text-gray-900">{party.mobile || 'Not provided'}</Text>
                </View>
              )}
            </View>

            <View className="space-y-1">
              <Text className="text-sm font-semibold text-gray-700 ml-1">Address</Text>
              {isEditing ? (
                <TextInput
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                  placeholder="Enter address"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 min-h-[80px]"
                />
              ) : (
                <View className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 min-h-[80px]">
                  <Text className="text-base text-gray-900">{party.address || 'Not provided'}</Text>
                </View>
              )}
            </View>
            <View className="space-y-1">
              <Text className="text-sm font-semibold text-gray-700 ml-1">Opening Balance</Text>
              {isEditing ? (
                <View>
                  {!(party && (parseFloat(party.current_balance) !== parseFloat(party.opening_balance) || parseFloat(party.unpaid_opening_balance) !== parseFloat(party.opening_balance))) && (
                    <View className="flex-row gap-2 mb-2">
                      <TouchableOpacity
                        onPress={() => setOpeningDirection('CR')}
                        className={`flex-1 py-2 items-center rounded-lg border ${openingDirection === 'CR' ? 'bg-[#006948] border-[#006948]' : 'bg-white border-gray-300'}`}
                      >
                        <Text className={`text-sm font-semibold ${openingDirection === 'CR' ? 'text-white' : 'text-gray-600'}`}>CR</Text>
                        <Text className={`text-[10px] ${openingDirection === 'CR' ? 'text-green-100' : 'text-gray-400'}`}>To Pay</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setOpeningDirection('DR')}
                        className={`flex-1 py-2 items-center rounded-lg border ${openingDirection === 'DR' ? 'bg-[#006948] border-[#006948]' : 'bg-white border-gray-300'}`}
                      >
                        <Text className={`text-sm font-semibold ${openingDirection === 'DR' ? 'text-white' : 'text-gray-600'}`}>DR</Text>
                        <Text className={`text-[10px] ${openingDirection === 'DR' ? 'text-green-100' : 'text-gray-400'}`}>To Receive</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <TextInput
                    value={formData.opening_balance}
                    onChangeText={(text) => {
                      const formatted = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                      setFormData({ ...formData, opening_balance: formatted });
                    }}
                    placeholder="Enter opening balance"
                    keyboardType="numeric"
                    editable={!(party && (parseFloat(party.current_balance) !== parseFloat(party.opening_balance) || parseFloat(party.unpaid_opening_balance) !== parseFloat(party.opening_balance)))}
                    className={`border border-gray-300 rounded-lg px-4 py-3 text-base ${(party && (parseFloat(party.current_balance) !== parseFloat(party.opening_balance) || parseFloat(party.unpaid_opening_balance) !== parseFloat(party.opening_balance))) ? 'bg-gray-200 text-gray-500' : 'bg-gray-50 text-gray-900'}`}
                  />
                  {(party && (parseFloat(party.current_balance) !== parseFloat(party.opening_balance) || parseFloat(party.unpaid_opening_balance) !== parseFloat(party.opening_balance))) ? (
                    <Text className="text-xs text-orange-600 mt-1 ml-1">Cannot edit opening balance after transactions have started</Text>
                  ) : (
                    <Text className="text-gray-500 text-xs mt-1 ml-1">CR = To Pay, DR = To Receive</Text>
                  )}
                </View>
              ) : (
                <View className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                  <Text className="text-base text-gray-900">
                    ₹{Math.abs(parseFloat(party.opening_balance || 0)).toLocaleString()}{' '}
                    {parseFloat(party.opening_balance || 0) < 0 ? 'DR' : parseFloat(party.opening_balance || 0) > 0 ? 'CR' : ''}
                  </Text>
                </View>
              )}
            </View>

            {/* Footer (Save Button) */}
            {isEditing && (
              <View className="pt-6 mt-2 border-t border-gray-100">
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={updateMutation.isPending}
                  className="bg-[#006948] py-4 rounded-xl items-center flex-row justify-center"
                >
                  {updateMutation.isPending ? (
                    <ActivityIndicator color="white" className="mr-2" />
                  ) : (
                    <Save color="white" size={20} className="mr-2" />
                  )}
                  <Text className="text-white font-bold text-lg">Save Changes</Text>
                </TouchableOpacity>
              </View>
            )}
            </View>
          </ScrollView>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
