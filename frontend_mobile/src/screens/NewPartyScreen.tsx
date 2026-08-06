import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PartyFormModal from '../components/PartyFormModal';

/** Stack fallback: opens the same centered Add Party modal. Prefer Parties → Add. */
export default function NewPartyScreen({ navigation }: any) {
  const [visible, setVisible] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-black/40">
      <View className="flex-1">
        <PartyFormModal
          visible={visible}
          mode="create"
          onClose={() => {
            setVisible(false);
            navigation.goBack();
          }}
          onSuccess={() => {
            navigation.navigate('MainTabs', {
              screen: 'Parties',
              params: { successMessage: 'Party added' },
            });
          }}
        />
      </View>
    </SafeAreaView>
  );
}
