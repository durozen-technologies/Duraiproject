import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { X, Save } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

type PartyTypeTab = 'SALE' | 'PURCHASER' | 'BOTH';

type FieldErrors = {
  name?: string;
  mobile?: string;
  address?: string;
  opening_balance?: string;
  generic?: string;
};

interface PartyFormModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  party?: any | null;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

const emptyForm = {
  name: '',
  nickname: '',
  tamil_name: '',
  mobile: '',
  address: '',
  opening_balance: '',
  is_active: true,
};

export default function PartyFormModal({
  visible,
  mode,
  party,
  onClose,
  onSuccess,
}: PartyFormModalProps) {
  const queryClient = useQueryClient();
  const { height } = useWindowDimensions();
  const [tab, setTab] = useState<PartyTypeTab>('SALE');
  const [form, setForm] = useState(emptyForm);
  const [openingDirection, setOpeningDirection] = useState<'CR' | 'DR'>('CR');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showErrors, setShowErrors] = useState(false);

  const isEdit = mode === 'edit';

  const { data: freshParty, isFetched: partyFetched } = useQuery({
    queryKey: ['party', party?.id],
    queryFn: async () => {
      const res = await client.get(`/parties/${party.id}`);
      return res.data;
    },
    enabled: visible && isEdit && !!party?.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  // Prefer fresh GET so paid floor matches remaining collections (not stale list cache).
  const partyData = freshParty || party;

  /** Absolute ₹ settled by remaining collection rows — only from fresh party GET. */
  const paidFloorAbs = (() => {
    if (!isEdit || !partyFetched || !freshParty) return 0;
    // Source of truth: sum of payment_transactions.opening_applied (never opening − unpaid)
    return Math.abs(Number(freshParty.opening_settled) || 0);
  })();

  const paidTowardOpening =
    Number(freshParty?.opening_balance ?? partyData?.opening_balance ?? 0) < 0
      ? -paidFloorAbs
      : paidFloorAbs;

  const openingForDirection = Number(
    freshParty?.opening_balance ?? partyData?.opening_balance ?? 0,
  );
  const originalDirection: 'CR' | 'DR' | null = !isEdit || !partyData
    ? null
    : openingForDirection < 0
      ? 'DR'
      : openingForDirection > 0
        ? 'CR'
        : paidTowardOpening < 0
          ? 'DR'
          : paidTowardOpening > 0
            ? 'CR'
            : null;

  useEffect(() => {
    if (!visible) return;
    setShowErrors(false);
    setErrors({});
    if (isEdit && partyData) {
      const opening = parseFloat(partyData.opening_balance || 0);
      setForm({
        name: partyData.name || '',
        nickname: partyData.nickname || '',
        tamil_name: partyData.tamil_name || '',
        mobile: (partyData.mobile || '').replace(/\D/g, '').slice(0, 10),
        address: partyData.address || '',
        opening_balance: Math.abs(opening).toString(),
        is_active: partyData.is_active ?? true,
      });
      setOpeningDirection(opening < 0 ? 'DR' : 'CR');
      setTab((partyData.type as PartyTypeTab) || 'SALE');
    } else if (!isEdit) {
      setForm(emptyForm);
      setOpeningDirection('CR');
      setTab('SALE');
    }
  }, [visible, isEdit, partyData]);

  const createMutation = useMutation({
    mutationFn: (payload: any) => client.post('/parties/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      const label = tab === 'SALE' ? 'Sale party' : tab === 'PURCHASER' ? 'Purchaser' : 'Party';
      onSuccess?.(`${label} added`);
      onClose();
    },
    onError: (error: any) => {
      let msg = 'Could not save party. Try again.';
      const detail = error?.response?.data?.detail;
      if (typeof detail === 'string') msg = detail;
      else if (Array.isArray(detail)) msg = detail.map((e: any) => e.msg).join(', ');
      setErrors({ generic: msg });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => client.put(`/parties/${party.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['party', party?.id] });
      onSuccess?.('Party updated');
      onClose();
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 'Could not update party. Try again.';
      if (typeof detail === 'string' && detail.toLowerCase().includes('opening')) {
        setErrors({ opening_balance: msg, generic: msg });
      } else {
        setErrors({ generic: msg });
      }
    },
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const name = form.name.trim();
    if (!name) next.name = 'Please enter the party name';
    else if (name.length < 3) next.name = 'Name must be at least 3 characters';

    if (!form.mobile.trim()) next.mobile = 'Please enter a mobile number';
    else if (!/^\d{10}$/.test(form.mobile)) next.mobile = 'Mobile number must be exactly 10 digits';

    if (!form.address.trim()) next.address = 'Please enter the address';

    if (form.opening_balance.trim() === '') {
      next.opening_balance = 'Enter opening balance (use 0 if none)';
    } else if (isEdit && paidFloorAbs > 0) {
      const amount = Math.abs(parseFloat(form.opening_balance) || 0);
      if (originalDirection && openingDirection !== originalDirection) {
        next.opening_balance =
          'Cannot change To Pay/To Receive after collection has been applied to opening';
      } else if (amount < paidFloorAbs) {
        next.opening_balance = `Opening cannot be below ₹${paidFloorAbs.toFixed(2)} already settled by collection`;
      }
    }
    return next;
  };

  const handleSave = () => {
    setShowErrors(true);
    const next = validate();
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    const amount = Math.abs(parseFloat(form.opening_balance) || 0);
    const signedOpening = openingDirection === 'CR' ? amount : -amount;

    if (isEdit) {
      updateMutation.mutate({
        name: form.name.trim(),
        nickname: form.nickname.trim() || null,
        tamil_name: form.tamil_name.trim() || null,
        mobile: form.mobile,
        address: form.address.trim(),
        is_active: form.is_active,
        opening_balance: signedOpening,
      });
    } else {
      createMutation.mutate({
        name: form.name.trim(),
        nickname: form.nickname.trim() || null,
        tamil_name: form.tamil_name.trim() || null,
        mobile: form.mobile,
        address: form.address.trim(),
        type: tab,
        opening_balance: signedOpening,
        is_active: true,
      });
    }
  };

  const fieldBorder = (key: keyof FieldErrors) =>
    showErrors && errors[key] ? 'border-red-400' : 'border-gray-200';

  const maxCardHeight = Math.min(height * 0.88, 720);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 bg-black/55 justify-center items-center px-4 py-6">
          <View
            className="bg-white w-full max-w-lg rounded-2xl overflow-hidden border border-gray-100"
            style={{
              maxHeight: maxCardHeight,
              elevation: 8,
              shadowColor: '#000',
              shadowOpacity: 0.18,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 12 },
            }}
          >
            {/* Header */}
            <View className="px-5 pt-5 pb-4 border-b border-gray-100 flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-xl font-extrabold text-gray-900 tracking-tight">
                  {isEdit ? 'Edit Party' : 'Add Party'}
                </Text>
                <Text className="text-sm text-gray-500 mt-1">
                  {isEdit
                    ? 'Update contact details and account status'
                    : 'Create a party for purchase or sale bills'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                accessibilityLabel="Close"
                className="bg-gray-100 p-2.5 rounded-full"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X color="#374151" size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}
            >
              {errors.generic ? (
                <View className="mb-4 bg-red-50 px-3 py-2.5 rounded-xl border border-red-200">
                  <Text className="text-red-700 text-sm font-semibold text-center">{errors.generic}</Text>
                </View>
              ) : null}

              {!isEdit ? (
                <View className="mb-5">
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Party type
                  </Text>
                  <View className="flex-row rounded-xl overflow-hidden border border-gray-200">
                    {(
                      [
                        { id: 'SALE', label: 'Sale' },
                        { id: 'PURCHASER', label: 'Purchaser' },
                        { id: 'BOTH', label: 'Both' },
                      ] as const
                    ).map((opt) => (
                      <TouchableOpacity
                        key={opt.id}
                        onPress={() => setTab(opt.id)}
                        className={`flex-1 py-3 items-center ${tab === opt.id ? 'bg-[#006948]' : 'bg-white'}`}
                      >
                        <Text
                          className={`text-sm font-bold ${tab === opt.id ? 'text-white' : 'text-gray-600'}`}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                <View className="mb-5 flex-row items-center justify-between bg-gray-50 px-4 py-3.5 rounded-xl border border-gray-200">
                  <View className="flex-1 mr-3">
                    <Text className="text-base font-bold text-gray-900">Active</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      {form.is_active
                        ? 'Shown in bills and searches'
                        : 'Hidden from new bills'}
                    </Text>
                  </View>
                  <Switch
                    value={form.is_active}
                    onValueChange={(val) => setForm({ ...form, is_active: val })}
                    trackColor={{ false: '#D1D5DB', true: '#006948' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              )}

              <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Details
              </Text>

              <View className="mb-3.5">
                <Text className="text-sm font-semibold text-gray-800 mb-1.5">Name *</Text>
                <TextInput
                  value={form.name}
                  onChangeText={(v) => setForm({ ...form, name: v })}
                  placeholder="Company or person name"
                  placeholderTextColor="#9ca3af"
                  className={`bg-gray-50 border ${fieldBorder('name')} rounded-xl px-4 py-3 text-base text-gray-900`}
                  style={{ outline: 'none' } as any}
                />
                {showErrors && errors.name ? (
                  <Text className="text-red-600 text-xs mt-1.5 font-medium">{errors.name}</Text>
                ) : null}
              </View>

              <View className="mb-3.5">
                <Text className="text-sm font-semibold text-gray-800 mb-1.5">Nickname</Text>
                <TextInput
                  value={form.nickname}
                  onChangeText={(v) => setForm({ ...form, nickname: v })}
                  placeholder="Short name (optional)"
                  placeholderTextColor="#9ca3af"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                  style={{ outline: 'none' } as any}
                />
              </View>

              <View className="mb-3.5">
                <Text className="text-sm font-semibold text-gray-800 mb-1.5">Tamil name</Text>
                <TextInput
                  value={form.tamil_name}
                  onChangeText={(v) => setForm({ ...form, tamil_name: v })}
                  placeholder="தமிழ் பெயர்"
                  placeholderTextColor="#9ca3af"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                  style={{ outline: 'none' } as any}
                />
                <Text className="text-xs text-gray-500 mt-1.5">Used in PDF reports when Tamil is selected</Text>
              </View>

              <View className="mb-3.5">
                <Text className="text-sm font-semibold text-gray-800 mb-1.5">Mobile *</Text>
                <TextInput
                  value={form.mobile}
                  onChangeText={(v) =>
                    setForm({ ...form, mobile: v.replace(/\D/g, '').slice(0, 10) })
                  }
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  maxLength={10}
                  className={`bg-gray-50 border ${fieldBorder('mobile')} rounded-xl px-4 py-3 text-base text-gray-900`}
                  style={{ outline: 'none' } as any}
                />
                {showErrors && errors.mobile ? (
                  <Text className="text-red-600 text-xs mt-1.5 font-medium">{errors.mobile}</Text>
                ) : (
                  <Text className="text-xs text-gray-500 mt-1.5">Must be exactly 10 digits</Text>
                )}
              </View>

              <View className="mb-3.5">
                <Text className="text-sm font-semibold text-gray-800 mb-1.5">Address *</Text>
                <TextInput
                  value={form.address}
                  onChangeText={(v) => setForm({ ...form, address: v })}
                  placeholder="Area, town, landmark"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  className={`bg-gray-50 border ${fieldBorder('address')} rounded-xl px-4 py-3 text-base text-gray-900 min-h-[72px]`}
                  style={{ outline: 'none' } as any}
                />
                {showErrors && errors.address ? (
                  <Text className="text-red-600 text-xs mt-1.5 font-medium">{errors.address}</Text>
                ) : null}
              </View>

              <View className="mb-2">
                <Text className="text-sm font-semibold text-gray-800 mb-1.5">Opening balance (₹) *</Text>
                <View className="flex-row gap-2 mb-2">
                  <TouchableOpacity
                    onPress={() => {
                      if (paidFloorAbs > 0 && originalDirection && originalDirection !== 'CR') return;
                      setOpeningDirection('CR');
                    }}
                    disabled={paidFloorAbs > 0 && originalDirection === 'DR'}
                    className={`flex-1 py-2.5 items-center rounded-xl border ${
                      openingDirection === 'CR'
                        ? 'bg-[#006948] border-[#006948]'
                        : 'bg-white border-gray-200'
                    } ${paidFloorAbs > 0 && originalDirection === 'DR' ? 'opacity-40' : ''}`}
                  >
                    <Text
                      className={`text-sm font-bold ${
                        openingDirection === 'CR' ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      To Pay
                    </Text>
                    <Text
                      className={`text-[10px] mt-0.5 ${
                        openingDirection === 'CR' ? 'text-emerald-100' : 'text-gray-400'
                      }`}
                    >
                      CR
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (paidFloorAbs > 0 && originalDirection && originalDirection !== 'DR') return;
                      setOpeningDirection('DR');
                    }}
                    disabled={paidFloorAbs > 0 && originalDirection === 'CR'}
                    className={`flex-1 py-2.5 items-center rounded-xl border ${
                      openingDirection === 'DR'
                        ? 'bg-[#006948] border-[#006948]'
                        : 'bg-white border-gray-200'
                    } ${paidFloorAbs > 0 && originalDirection === 'CR' ? 'opacity-40' : ''}`}
                  >
                    <Text
                      className={`text-sm font-bold ${
                        openingDirection === 'DR' ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      To Receive
                    </Text>
                    <Text
                      className={`text-[10px] mt-0.5 ${
                        openingDirection === 'DR' ? 'text-emerald-100' : 'text-gray-400'
                      }`}
                    >
                      DR
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  value={form.opening_balance}
                  onChangeText={(v) => {
                    const formatted = v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                    setForm({ ...form, opening_balance: formatted });
                  }}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  className={`bg-gray-50 border ${fieldBorder('opening_balance')} rounded-xl px-4 py-3 text-base text-gray-900`}
                  style={{ outline: 'none' } as any}
                />
                {showErrors && errors.opening_balance ? (
                  <Text className="text-red-600 text-xs mt-1.5 font-medium">{errors.opening_balance}</Text>
                ) : paidFloorAbs > 0 ? (
                  <Text className="text-xs text-amber-700 mt-1.5 font-medium">
                    At least ₹{paidFloorAbs.toFixed(2)} (already collected against opening)
                  </Text>
                ) : (
                  <Text className="text-xs text-gray-500 mt-1.5">
                    To Pay (CR) or To Receive (DR). Enter 0 if none.
                  </Text>
                )}
              </View>
            </ScrollView>

            {/* Footer */}
            <View className="px-5 py-4 border-t border-gray-100 flex-row gap-3 bg-white">
              <TouchableOpacity
                onPress={onClose}
                disabled={pending}
                className="flex-1 py-3.5 rounded-xl border border-gray-300 items-center justify-center bg-white"
              >
                <Text className="text-gray-700 font-bold text-sm">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={pending}
                className={`flex-[1.4] py-3.5 rounded-xl bg-[#006948] flex-row items-center justify-center ${
                  pending ? 'opacity-60' : ''
                }`}
              >
                {pending ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Save color="white" size={18} />
                )}
                <Text className="text-white font-bold text-sm ml-2">
                  {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Save party'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
