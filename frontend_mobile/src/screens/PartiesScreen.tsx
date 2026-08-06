import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, RefreshCcw, Download, ArrowLeft } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import client from '../api/client';
import PartyFormModal from '../components/PartyFormModal';

export default function PartiesScreen({ navigation, route }: any) {
  const [filter, setFilter] = useState<'ALL' | 'SALE' | 'PURCHASER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  React.useEffect(() => {
    if (route.params?.successMessage) {
      setSuccessMsg(route.params.successMessage);
      navigation.setParams({ successMessage: undefined });
    }
  }, [route.params?.successMessage]);

  React.useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const { data: parties, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['parties', filter],
    queryFn: async () => {
      const url = filter === 'ALL' ? '/parties/' : `/parties/?party_type=${filter}`;
      const response = await client.get(url);
      return response.data;
    }
  });

  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  const filteredParties = React.useMemo(() => {
    if (!parties) return [];
    const q = searchQuery.trim().toLowerCase();
    let list = [...parties];
    if (q) {
      list = list.filter(
        (p: any) =>
          p.name?.toLowerCase().includes(q) ||
          p.nickname?.toLowerCase().includes(q) ||
          p.mobile?.toLowerCase().includes(q)
      );
    }
    return list.sort((a: any, b: any) => {
      if (a.is_active === b.is_active) return a.name.localeCompare(b.name);
      return a.is_active ? -1 : 1;
    });
  }, [parties, searchQuery]);

  const handleDownloadBalanceSheet = async () => {
    setIsDownloading(true);
    try {
      const baseUrl = client.defaults.baseURL || 'http://localhost:8000/api';
      const url = `${baseUrl}/reports/parties-balance-sheet`;
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const fileUri = `${FileSystem.documentDirectory}parties_balance_sheet.pdf`;
        const downloadRes = await FileSystem.downloadAsync(url, fileUri);
        if (Platform.OS === 'android') {
          try {
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
              data: downloadRes.uri,
              flags: 1,
              type: 'application/pdf',
            });
          } catch {
            await Sharing.shareAsync(downloadRes.uri);
          }
        } else {
          await Sharing.shareAsync(downloadRes.uri);
        }
      }
    } catch (e) {
      console.error('Error downloading balance sheet:', e);
      alert('Failed to download balance sheet');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-gray-200 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Dashboard'))}
            className="mr-3"
          >
            <ArrowLeft color="#111827" size={24} />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Parties</Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={handleDownloadBalanceSheet}
            disabled={isDownloading}
            className="bg-[#0b4d3a] flex-row items-center px-2.5 py-1.5 rounded-full mr-2"
          >
            {isDownloading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Download color="white" size={14} />
                <Text className="text-white text-xs font-semibold ml-1">Balance Sheet</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onRefresh}
            className="p-2 bg-gray-100 rounded-full mr-2"
          >
            <RefreshCcw color="#374151" size={16} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAddOpen(true)}
            className="bg-[#006948] flex-row items-center px-3 py-1.5 rounded-full"
          >
            <Plus color="white" size={14} />
            <Text className="text-white text-xs font-semibold ml-1">Add Party</Text>
          </TouchableOpacity>
        </View>
      </View>

      {successMsg ? (
        <View className="absolute bottom-12 self-center bg-[#059669] px-6 py-3 rounded-full z-50 shadow-lg elevation-5 flex-row items-center justify-center min-w-[250px]">
          <Text className="text-white font-medium text-sm text-center">{successMsg}</Text>
        </View>
      ) : null}

      {/* Compact Search + Filters + List scroll together */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={['#006948']} />
        }
      >
        <View className="px-4 py-2 bg-white border-b border-gray-200">
          <View className="relative justify-center">
            <View className="absolute left-2.5 z-10">
              <Search color="#9ca3af" size={14} />
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search parties..."
              placeholderTextColor="#9ca3af"
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-900"
              style={{ outline: 'none' } as any}
            />
          </View>
        </View>

        <View className="flex-row px-4 py-2.5 bg-white border-b border-gray-200 gap-2">
          <TouchableOpacity
            className={`px-3 py-1 rounded-full border ${filter === 'ALL' ? 'bg-[#006948] border-[#006948]' : 'bg-white border-gray-300'}`}
            onPress={() => setFilter('ALL')}
          >
            <Text className={`text-xs font-semibold ${filter === 'ALL' ? 'text-white' : 'text-gray-600'}`}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-3 py-1 rounded-full border ${filter === 'SALE' ? 'bg-[#006948] border-[#006948]' : 'bg-white border-gray-300'}`}
            onPress={() => setFilter('SALE')}
          >
            <Text className={`text-xs font-semibold ${filter === 'SALE' ? 'text-white' : 'text-gray-600'}`}>Sale</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-3 py-1 rounded-full border ${filter === 'PURCHASER' ? 'bg-[#006948] border-[#006948]' : 'bg-white border-gray-300'}`}
            onPress={() => setFilter('PURCHASER')}
          >
            <Text className={`text-xs font-semibold ${filter === 'PURCHASER' ? 'text-white' : 'text-gray-600'}`}>Purchasers</Text>
          </TouchableOpacity>
        </View>

        <View className="p-4">
        {isLoading ? (
          <ActivityIndicator size="large" color="#006948" className="mt-10" />
        ) : isError ? (
          <Text className="text-center text-red-500 mt-10">Error loading parties: {error?.message}</Text>
        ) : filteredParties.length === 0 ? (
          <Text className="text-center text-gray-500 mt-10">No parties found.</Text>
        ) : (
          filteredParties.map((party: any) => (
            <TouchableOpacity
              key={party.id}
              onPress={() => {
                navigation.navigate('PartyDetails', {
                  partyId: party.id,
                  partyName: party.name,
                });
              }}
              className={`p-4 rounded-xl border shadow-sm flex-row items-center justify-between mb-3 ${party.is_active ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-300 opacity-80'}`}
            >
              <View className="flex-row items-center flex-1">
                <View className="w-12 h-12 rounded-xl bg-gray-200 items-center justify-center mr-3">
                  <Text className="text-gray-700 font-bold text-lg">{party.name.substring(0, 2).toUpperCase()}</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center space-x-2">
                    <Text className={`font-bold text-base ${party.is_active ? 'text-gray-900' : 'text-gray-600 line-through'}`}>{party.name}</Text>
                    {!party.is_active && (
                      <View className="bg-gray-300 px-2 py-0.5 rounded-full">
                        <Text className="text-[10px] font-bold text-gray-700">Disabled</Text>
                      </View>
                    )}
                  </View>
                  {party.nickname ? <Text className="text-sm text-gray-500 mt-0.5">{party.nickname}</Text> : null}
                  <Text className="text-xs text-gray-500 mt-1">{party.mobile || 'No phone'}</Text>
                  {party.address ? <Text className="text-xs text-gray-500 mt-0.5">{party.address}</Text> : null}
                </View>
              </View>
              <View className="items-end ml-2">
                {party.unpaid_opening_balance !== 0 && (
                  <Text className="text-xs text-gray-400 mb-1">
                    Opening: ₹{Math.abs(party.unpaid_opening_balance)?.toLocaleString()}{' '}
                    {party.unpaid_opening_balance < 0 ? 'DR' : 'CR'}
                  </Text>
                )}
                <Text className="text-xs text-gray-500 mb-1">
                  {party.current_balance > 0 ? 'To Pay' : party.current_balance < 0 ? 'To Receive' : 'Balance'}
                </Text>
                <Text className={`text-lg font-bold ${party.current_balance > 0 ? 'text-red-500' : party.current_balance < 0 ? 'text-[#006948]' : 'text-gray-500'}`}>
                  ₹{Math.abs(party.current_balance || 0).toLocaleString()}
                  {party.current_balance > 0 ? ' CR' : party.current_balance < 0 ? ' DR' : ''}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        </View>
      </ScrollView>

      <PartyFormModal
        visible={addOpen}
        mode="create"
        onClose={() => setAddOpen(false)}
        onSuccess={(msg) => setSuccessMsg(msg)}
      />
    </SafeAreaView>
  );
}
