import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  RefreshCcw,
  Search,
  Tag,
  ShoppingCart,
  Pencil,
  X,
  User,
  Phone,
  Save,
} from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { fetchDrivers, updateDriver, Driver } from '../api/drivers';
import { formatDateToDDMMYYYY } from '../utils/formatDate';

export default function DriverDetailsScreen({ route, navigation }: any) {
  const { driverId, driverName: initialName } = route.params;
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PURCHASE' | 'SALE'>('ALL');
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditErrors, setShowEditErrors] = useState(false);

  const formatAmount = (value: number) =>
    Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const { data: drivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: fetchDrivers,
  });

  const driver: Driver | undefined = useMemo(
    () => drivers?.find((d) => d.id === driverId),
    [drivers, driverId]
  );

  const displayName = driver?.name || initialName || 'Driver';

  const { data: parties } = useQuery({
    queryKey: ['parties'],
    queryFn: async () => {
      const response = await client.get(`/parties/`);
      return response.data;
    },
  });

  const { data: items } = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const response = await client.get(`/items/`);
      return response.data;
    },
  });

  const { data: purchases, isLoading: loadingP, refetch: refetchP, isRefetching: isRefetchingP } = useQuery({
    queryKey: ['purchases', 'driver', driverId],
    queryFn: async () => {
      const response = await client.get(`/purchases/?driver_id=${driverId}`);
      return response.data;
    },
  });

  const { data: sales, isLoading: loadingS, refetch: refetchS, isRefetching: isRefetchingS } = useQuery({
    queryKey: ['sales', 'driver', driverId],
    queryFn: async () => {
      const response = await client.get(`/sales/?driver_id=${driverId}`);
      return response.data;
    },
  });

  const onRefresh = React.useCallback(() => {
    refetchP();
    refetchS();
    queryClient.invalidateQueries({ queryKey: ['drivers'] });
  }, [refetchP, refetchS, queryClient]);

  const isLoading = loadingP || loadingS;
  const isRefetching = isRefetchingP || isRefetchingS;

  const combinedBills = useMemo(() => {
    const all: any[] = [];
    if (purchases) {
      all.push(...purchases.map((p: any) => ({ ...p, _type: 'PURCHASE' })));
    }
    if (sales) {
      all.push(...sales.map((s: any) => ({ ...s, _type: 'SALE' })));
    }
    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return all;
  }, [purchases, sales]);

  const filteredBills = useMemo(() => {
    return combinedBills.filter((bill) => {
      if (filterType !== 'ALL' && bill._type !== filterType) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const partyName = parties?.find((p: any) => p.id === bill.party_id)?.name?.toLowerCase() || '';
        const billNo = bill.day_bill_number?.toLowerCase() || '';
        if (!partyName.includes(query) && !billNo.includes(query)) return false;
      }
      return true;
    });
  }, [combinedBills, filterType, searchQuery, parties]);

  const onEditMobileChange = (text: string) => {
    setEditMobile(text.replace(/\D/g, '').slice(0, 10));
  };

  const editNameErr = (() => {
    const trimmed = editName.trim();
    if (!trimmed) return 'Driver name is required';
    if (trimmed.length < 3) return 'Driver name must be at least 3 characters';
    return '';
  })();

  const editMobileErr = (() => {
    if (!editMobile.trim()) return 'Mobile number is required';
    if (!/^\d{10}$/.test(editMobile)) return 'Mobile number must be exactly 10 digits';
    return '';
  })();

  const openEdit = () => {
    setEditName(driver?.name || initialName || '');
    setEditMobile((driver?.mobile || '').replace(/\D/g, '').slice(0, 10));
    setEditActive(driver?.is_active ?? true);
    setShowEditErrors(false);
    setEditVisible(true);
  };

  const handleSaveDriver = async () => {
    setShowEditErrors(true);
    if (editNameErr || editMobileErr) return;

    setSaving(true);
    try {
      const updated = await updateDriver(driverId, {
        name: editName.trim(),
        mobile: editMobile,
        is_active: editActive,
      });
      await queryClient.invalidateQueries({ queryKey: ['drivers'] });
      navigation.setParams({ driverName: updated.name });
      setEditVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update driver');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-3 bg-white border-b border-gray-200 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1 rounded-full bg-gray-100">
            <ArrowLeft color="#374151" size={20} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
              {displayName}
            </Text>
            {driver && !driver.is_active ? (
              <Text className="text-[11px] text-red-600 font-semibold">Disabled</Text>
            ) : null}
          </View>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={openEdit} className="p-2 bg-gray-100 rounded-full mr-2">
            <Pencil color="#006948" size={18} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRefresh} className="p-2 bg-gray-100 rounded-full">
            <RefreshCcw color="#374151" size={18} />
          </TouchableOpacity>
        </View>
      </View>

      <View className="p-4 bg-white border-b border-gray-200">
        <View className="relative justify-center mb-3">
          <View className="absolute left-3 z-10">
            <Search color="#9ca3af" size={20} />
          </View>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by party or bill number..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm"
            style={{ outline: 'none' } as any}
          />
        </View>

        <View className="flex-row space-x-2">
          <TouchableOpacity
            className={`px-4 py-1.5 rounded-full border mr-2 ${filterType === 'ALL' ? 'bg-[#006948] border-[#006948]' : 'bg-white border-gray-300'}`}
            onPress={() => setFilterType('ALL')}
          >
            <Text className={`text-xs font-semibold ${filterType === 'ALL' ? 'text-white' : 'text-gray-600'}`}>
              All Bills
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-4 py-1.5 rounded-full border mr-2 ${filterType === 'PURCHASE' ? 'bg-[#006948] border-[#006948]' : 'bg-white border-gray-300'}`}
            onPress={() => setFilterType('PURCHASE')}
          >
            <Text className={`text-xs font-semibold ${filterType === 'PURCHASE' ? 'text-white' : 'text-gray-600'}`}>
              Purchases
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-4 py-1.5 rounded-full border ${filterType === 'SALE' ? 'bg-[#006948] border-[#006948]' : 'bg-white border-gray-300'}`}
            onPress={() => setFilterType('SALE')}
          >
            <Text className={`text-xs font-semibold ${filterType === 'SALE' ? 'text-white' : 'text-gray-600'}`}>
              Sales
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 p-4"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={['#006948']} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#006948" className="mt-10" />
        ) : filteredBills.length === 0 ? (
          <Text className="text-center text-gray-500 mt-10">No bills found for this driver.</Text>
        ) : (
          filteredBills.map((bill: any) => {
            const partyName = parties?.find((p: any) => p.id === bill.party_id)?.name || 'Unknown Party';
            const itemName = items?.find((i: any) => i.id === bill.item_id)?.name;
            const isPurchase = bill._type === 'PURCHASE';

            const netWeight = isPurchase ? bill.net_weight : bill.weight;
            const count = isPurchase ? bill.actual_birds : bill.boxes * bill.birds_per_box;

            return (
              <View
                key={`${bill._type}-${bill.id}`}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex-row items-center justify-between mb-3"
              >
                <View className="flex-row items-center flex-1">
                  <View
                    className={`w-12 h-12 rounded-full items-center justify-center mr-3 border ${isPurchase ? 'bg-blue-50 border-blue-100' : 'bg-green-50 border-green-100'}`}
                  >
                    {isPurchase ? <ShoppingCart color="#2563EB" size={20} /> : <Tag color="#006948" size={20} />}
                  </View>
                  <View className="flex-1 mr-2">
                    <Text className="font-bold text-gray-900 text-base" numberOfLines={1}>
                      {partyName}
                    </Text>
                    {bill.day_bill_number ? (
                      <Text className="text-[11px] text-gray-600 font-bold mt-0.5">{bill.day_bill_number}</Text>
                    ) : null}
                    {itemName ? (
                      <Text className="text-[11px] text-[#006948] font-bold mt-0.5">{itemName}</Text>
                    ) : null}
                    <View className="flex-row items-center mt-0.5">
                      <Text className="text-[11px] text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded mr-2">
                        {formatDateToDDMMYYYY(bill.date)}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {count} Birds ({netWeight}kg)
                      </Text>
                    </View>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-[10px] text-gray-400 font-bold mb-0.5">
                    {isPurchase ? 'PURCHASE' : 'SALE'}
                  </Text>
                  {bill.balance_amount > 0 ? (
                    <View className="bg-red-50 px-2 py-0.5 rounded-md mt-1 border border-red-100">
                      <Text className="text-[10px] text-red-600 font-bold tracking-wide">
                        BAL ₹{formatAmount(bill.balance_amount)}
                      </Text>
                    </View>
                  ) : (
                    <View className="bg-green-50 px-2 py-0.5 rounded-md mt-1 border border-green-100">
                      <Text className="text-[10px] text-[#006948] font-bold tracking-wide">SETTLED</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl w-full max-w-md p-5">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-900">Edit Driver</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)} className="bg-gray-100 p-2 rounded-full">
                <X color="#4b5563" size={18} />
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-semibold text-gray-700 mb-1">Driver Name *</Text>
            <View
              className={`flex-row items-center bg-gray-50 border rounded-xl px-3 py-2 ${
                showEditErrors && editNameErr ? 'border-red-400' : 'border-gray-200'
              }`}
            >
              <User color="#9CA3AF" size={18} />
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Full Name"
                className="flex-1 text-base py-1 ml-2"
                style={{ outline: 'none' } as any}
              />
            </View>
            {showEditErrors && editNameErr ? (
              <Text className="text-xs text-red-600 mt-1 mb-3 ml-1 font-medium">{editNameErr}</Text>
            ) : (
              <Text className="text-xs text-gray-500 mt-1 mb-3 ml-1">At least 3 characters</Text>
            )}

            <Text className="text-sm font-semibold text-gray-700 mb-1">Mobile Number *</Text>
            <View
              className={`flex-row items-center bg-gray-50 border rounded-xl px-3 py-2 ${
                showEditErrors && editMobileErr ? 'border-red-400' : 'border-gray-200'
              }`}
            >
              <Phone color="#9CA3AF" size={18} />
              <TextInput
                value={editMobile}
                onChangeText={onEditMobileChange}
                placeholder="10-digit mobile number"
                keyboardType="number-pad"
                maxLength={10}
                className="flex-1 text-base py-1 ml-2"
                style={{ outline: 'none' } as any}
              />
            </View>
            {showEditErrors && editMobileErr ? (
              <Text className="text-xs text-red-600 mt-1 mb-3 ml-1 font-medium">{editMobileErr}</Text>
            ) : (
              <Text className="text-xs text-gray-500 mt-1 mb-3 ml-1">Must be exactly 10 digits</Text>
            )}

            <View className="flex-row items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5">
              <View className="flex-1 mr-3">
                <Text className="font-semibold text-gray-900">Active</Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {editActive ? 'Enabled and available in bills' : 'Disabled and hidden from new bills'}
                </Text>
              </View>
              <Switch
                value={editActive}
                onValueChange={setEditActive}
                trackColor={{ false: '#D1D5DB', true: '#059669' }}
                thumbColor="#ffffff"
              />
            </View>

            <TouchableOpacity
              onPress={handleSaveDriver}
              disabled={saving}
              className={`bg-[#006948] flex-row items-center justify-center py-3.5 rounded-xl ${saving ? 'opacity-50' : ''}`}
            >
              <Save color="white" size={18} />
              <Text className="text-white font-bold ml-2">{saving ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
