import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';

interface ConfirmModalProps {
  isVisible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isVisible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false
}: ConfirmModalProps) {
  return (
    <Modal visible={isVisible} animationType="fade" transparent={true} onRequestClose={onCancel}>
      <View className="flex-1 bg-black/50 justify-center items-center px-4">
        <View className="bg-white rounded-2xl w-full max-w-sm p-6">
          <Text className="text-xl font-bold text-gray-900 mb-2">{title}</Text>
          <Text className="text-base text-gray-600 mb-6">{message}</Text>
          
          <View className="flex-row justify-end">
            <TouchableOpacity 
              onPress={onCancel}
              className="px-4 py-2 rounded-lg bg-gray-100 mr-3"
            >
              <Text className="text-gray-700 font-semibold">{cancelText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={onConfirm}
              className={`px-4 py-2 rounded-lg ${isDestructive ? 'bg-red-600' : 'bg-[#006948]'}`}
            >
              <Text className="text-white font-semibold">{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
