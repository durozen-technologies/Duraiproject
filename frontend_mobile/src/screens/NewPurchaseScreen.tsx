import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Save, Truck, Box, Scale, Calculator, Banknote, Edit2, Pencil, Trash2 } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PartySearchDropdown from '../components/PartySearchDropdown';
import DriverSearchDropdown from '../components/DriverSearchDropdown';
import ItemSearchDropdown from '../components/ItemSearchDropdown';
import client from '../api/client';
import { fetchDrivers } from '../api/drivers';
import { formatDateToDDMMYYYY } from '../utils/formatDate';
import ConfirmModal from '../components/ConfirmModal';

export default function NewPurchaseScreen({ navigation, route }: any) {
  const queryClient = useQueryClient();
  const editData = route.params?.editData;
  const [isEditing, setIsEditing] = useState(!editData);

  const [form, setForm] = useState({
    date: editData?.date || new Date().toISOString().split('T')[0],
    supplier_id: editData?.party_id || '',
    item_id: editData?.item_id || '',
    driver_id: editData?.driver_id || '',
    driver_name: editData?.driver_name || '',
    vehicle_number: editData?.vehicle_number || '',
    total_boxes: editData?.total_boxes?.toString() || '',
    birds_per_box: editData?.birds_per_box?.toString() || '',
    adjustment: '',
    actual_birds: editData?.actual_birds?.toString() || '',
    weighbridge_weight: editData?.weighbridge_weight?.toString() || '',
    net_weight: editData?.net_weight?.toString() || '',
    purchase_rate: editData?.purchase_rate?.toString() || '',
    total_amount: editData?.purchase_amount?.toString() || '',
    cash_payment: editData?.cash_payment?.toString() || '',
    upi_payment: editData?.upi_payment?.toString() || '',
    bank_payment: editData?.bank_payment?.toString() || '',
    empty_bird_weight_g: '40',
    remarks: editData?.remarks || ''
  });

  const { data: parties } = useQuery({
    queryKey: ['parties'],
    queryFn: async () => {
      const res = await client.get('/parties/');
      return res.data;
    }
  });

  const { data: drivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: fetchDrivers
  });

  const { data: items } = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const res = await client.get('/items/');
      return res.data;
    }
  });

  React.useEffect(() => {
    const loadGrams = async () => {
      try {
        const res = await client.get('/settings/empty_bird_weight_g');
        if (res.data && res.data.value !== null) {
          setForm(f => ({ ...f, empty_bird_weight_g: res.data.value }));
        }
      } catch (e) {
        console.error("Failed to load empty bird weight", e);
      }
    };
    loadGrams();
  }, []);

  const updateEmptyBirdWeight = (v: string) => {
    setForm(f => ({ ...f, empty_bird_weight_g: v }));
  };

  const [isEditingBirds, setIsEditingBirds] = useState(false);
  const [isEditingNetWeight, setIsEditingNetWeight] = useState(false);
  const [isEditingGrams, setIsEditingGrams] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleVehicleNumberChange = (text: string) => {
    let cleaned = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    let formatted = '';
    
    if (cleaned.length > 0) {
      formatted += cleaned.substring(0, 2);
    }
    if (cleaned.length > 2) {
      formatted += '-' + cleaned.substring(2, 4);
    }
    if (cleaned.length > 4) {
      const rest = cleaned.substring(4);
      const match = rest.match(/^([A-Z]{1,2})(\d{0,4})/);
      if (match) {
        formatted += '-' + match[1];
        if (match[2]) {
          formatted += '-' + match[2];
        }
      } else {
        formatted += '-' + rest;
      }
    }
    setForm({...form, vehicle_number: formatted});
    setErrors({...errors, vehicle_number: null});
  };

  React.useEffect(() => {
    if (!isEditingBirds) {
      const boxes = parseInt(form.total_boxes) || 0;
      const birdsPerBox = parseInt(form.birds_per_box) || 0;
      if (boxes > 0 || birdsPerBox > 0) {
        setForm(f => ({ ...f, actual_birds: (boxes * birdsPerBox).toString() }));
      }
    }
  }, [form.total_boxes, form.birds_per_box, isEditingBirds]);

  React.useEffect(() => {
    if (!isEditingNetWeight) {
      const wBridge = parseFloat(form.weighbridge_weight) || 0;
      const birds = parseInt(form.actual_birds) || 0;
      if (wBridge > 0 || birds > 0) {
        const emptyWeightKg = (parseFloat(form.empty_bird_weight_g) || 40) / 1000;
        const net = wBridge - (birds * emptyWeightKg); 
        setForm(f => ({ ...f, net_weight: Math.max(0, net).toFixed(2) }));
      }
    }
  }, [form.weighbridge_weight, form.actual_birds, form.empty_bird_weight_g, isEditingNetWeight]);

  React.useEffect(() => {
    const net = parseFloat(form.net_weight) || 0;
    const rate = parseFloat(form.purchase_rate) || 0;
    if (net > 0 && rate > 0) {
      setForm(f => ({ ...f, total_amount: (net * rate).toFixed(2) }));
    }
  }, [form.net_weight, form.purchase_rate]);



  const mutation = useMutation({
    mutationFn: (purchaseData: any) => {
      if (editData?.id) {
        return client.put(`/purchases/${editData.id}`, purchaseData);
      }
      return client.post('/purchases/', purchaseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setErrorMsg('');
      setSuccessMsg(`Purchase ${editData ? 'updated' : 'saved'} successfully`);
      setTimeout(() => {
        if (navigation.canGoBack()) navigation.goBack();
        else navigation.navigate('MainTabs');
      }, 1500);
    },
    onError: (error: any) => {
      let msg = `Failed to ${editData ? 'update' : 'save'} purchase`;
      if (error?.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          msg = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          msg = error.response.data.detail.map((e: any) => `${e.loc?.join('.')} ${e.msg}`).join('\n');
        }
      } else if (error?.message) {
        msg = error.message;
      }
      setSuccessMsg('');
      setErrorMsg(msg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      return client.delete(`/purchases/${editData.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setShowDeleteConfirm(false);
      setErrorMsg('');
      setSuccessMsg("Purchase deleted successfully");
      setTimeout(() => {
        if (navigation.canGoBack()) navigation.goBack();
        else navigation.navigate('MainTabs');
      }, 1500);
    },
    onError: (error: any) => {
      setShowDeleteConfirm(false);
      setSuccessMsg('');
      setErrorMsg("Failed to delete purchase");
    }
  });

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleSave = () => {
    const newErrors: any = {};
    if (!form.supplier_id) newErrors.supplier_id = "Purchaser is required";
    if (!form.driver_id && !form.driver_name) newErrors.driver_id = "Driver is required";
    const vehicleRegex = /^[A-Za-z]{2}-\d{2}-[A-Za-z]{1,2}-\d{4}$/;
    if (!form.vehicle_number) {
      newErrors.vehicle_number = "Vehicle Number is required";
    } else if (!vehicleRegex.test(form.vehicle_number)) {
      newErrors.vehicle_number = "Format must be like MH-12-AB-1234";
    }
    if (!form.total_boxes || parseInt(form.total_boxes) <= 0) newErrors.total_boxes = "Total Boxes is required";
    if (!form.birds_per_box || parseInt(form.birds_per_box) <= 0) newErrors.birds_per_box = "Birds Per Box is required";
    if (!form.purchase_rate || parseFloat(form.purchase_rate) <= 0) newErrors.purchase_rate = "Purchase Rate is required";
    if (!form.weighbridge_weight || parseFloat(form.weighbridge_weight) <= 0) newErrors.weighbridge_weight = "Weighbridge Weight is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});

    mutation.mutate({
      ...form,
      date: form.date || new Date().toISOString().split('T')[0],
      party_id: form.supplier_id,
      item_id: form.item_id || null,
      driver_id: form.driver_id || null,
      driver_name: form.driver_name,
      total_boxes: parseInt(form.total_boxes) || 0,
      birds_per_box: parseInt(form.birds_per_box) || 0,
      actual_birds: parseInt(form.actual_birds) || 0,
      weighbridge_weight: parseFloat(form.weighbridge_weight) || 0,
      net_weight: parseFloat(form.net_weight) || 0,
      purchase_rate: parseFloat(form.purchase_rate) || 0,
      purchase_amount: parseFloat(form.total_amount) || 0,
      cash_payment: parseFloat(form.cash_payment) || 0,
      upi_payment: parseFloat(form.upi_payment) || 0,
      bank_payment: parseFloat(form.bank_payment) || 0,
      remarks: form.remarks
    });
  };

  const selectedDriver = drivers?.find((d: any) => d.id === form.driver_id);
  const driverMobile = selectedDriver?.mobile || '';

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-3 bg-white border-b border-gray-100 flex-row items-center justify-between shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')} className="mr-4">
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <View>
            <Text className="text-lg font-bold text-gray-900">{editData ? (isEditing ? 'Edit Purchase' : 'Purchase Details') : 'New Purchase'}</Text>
            {editData?.bill_number && <Text className="text-xs font-semibold text-gray-500">{editData.bill_number}</Text>}
          </View>
        </View>
        {editData && !isEditing && (
          <TouchableOpacity onPress={() => {
            if (editData?.total_invoice_amount !== editData?.balance_amount) {
              setErrorMsg("Cannot edit or delete this bill because a collection payment is applied. Please delete the collection payment first.");
              return;
            }
            setIsEditing(true);
          }} className="bg-gray-100 px-3 py-1.5 rounded-full flex-row items-center">
            <Pencil color="#374151" size={14} className="mr-1" />
            <Text className="text-sm font-semibold text-gray-700">Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAwareScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        enableOnAndroid={true}
        extraScrollHeight={120}
        keyboardShouldPersistTaps="handled"
      >
        <View pointerEvents={isEditing ? 'auto' : 'none'} className="flex-1">
        {/* Supplier & Logistics */}
        <View className="mb-5">
          <View className="flex-row items-center mb-3">
            <Truck color="#006948" size={20} className="mr-2" />
            <Text className="text-sm font-semibold text-[#006948]">Purchaser & Logistics</Text>
          </View>
          
          <View className="space-y-3">
            <View className="flex-col md:flex-row md:justify-between" style={{ zIndex: 50, elevation: 50 }}>
              <View className="md:w-[48%] mb-3 md:mb-0">
                <Text className="text-xs font-medium text-gray-700 mb-1">Date</Text>
                {Platform.OS === 'web' ? (
                  <input 
                    type="date"
                    value={form.date}
                    onChange={(e: any) => setForm({...form, date: e.target.value})}
                    style={{ padding: 10, width: '100%', height: 50, border: '1px solid #d1d5db', borderRadius: 6, backgroundColor: 'white' }}
                  />
                ) : (
                  <>
                    <TouchableOpacity 
                      onPress={() => setShowDatePicker(true)}
                      className="w-full px-3 bg-white border border-gray-300 rounded-md h-[50px] justify-center"
                    >
                      <Text className="text-sm">{formatDateToDDMMYYYY(form.date)}</Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={new Date(form.date)}
                        mode="date"
                        display="default"
                        onValueChange={(event: any, selectedDate: any) => {
                          setShowDatePicker(false);
                          if (selectedDate) {
                            setForm({...form, date: selectedDate.toISOString().split('T')[0]});
                          }
                        }}
                        onDismiss={() => setShowDatePicker(false)}
                      />
                    )}
                  </>
                )}
              </View>
              <View className="md:w-[48%]">
                <Text className="text-xs font-medium text-gray-700 mb-1">Purchaser</Text>
                <View style={{ zIndex: 50 }}>
                  <PartySearchDropdown
                    parties={parties?.filter((p: any) => (p.type === 'PURCHASER' || p.type === 'BOTH') && p.is_active !== false)}
                    value={form.supplier_id}
                    onSelect={(id: string) => {
                      setForm({...form, supplier_id: id});
                      setErrors({...errors, supplier_id: null});
                    }}
                    placeholder="Search Purchaser (min 2 chars)..."
                    error={errors.supplier_id}
                  />
                </View>
              </View>
            </View>
            
            <View className="flex-col md:flex-row md:justify-between" style={{ zIndex: 45, elevation: 45 }}>
              <View className="w-full mb-3 md:mb-0">
                <Text className="text-xs font-medium text-gray-700 mb-1">Item</Text>
                <View style={{ zIndex: 45 }}>
                  <ItemSearchDropdown
                    items={items?.filter((i: any) => i.is_active !== false)}
                    value={form.item_id}
                    onSelect={(id: string) => {
                      setForm({...form, item_id: id});
                    }}
                    placeholder="Select Item..."
                  />
                </View>
              </View>
            </View>
            <View className="flex-row justify-between" style={{ zIndex: 40 }}>
              <View className="w-[32%]">
                <Text className="text-xs font-medium text-gray-700 mb-1">Driver</Text>
                <View style={{ zIndex: 40 }}>
                  <DriverSearchDropdown
                    drivers={drivers?.filter((d: any) => d.is_active || d.id === form.driver_id)}
                    value={form.driver_id || form.driver_name}
                    onSelect={(val: string) => {
                      if (val && val.length === 36 && val.includes('-')) {
                        setForm({...form, driver_id: val, driver_name: ''});
                      } else {
                        setForm({...form, driver_id: '', driver_name: val});
                      }
                      setErrors({...errors, driver_id: null});
                    }}
                    placeholder="Search..."
                    error={errors.driver_id}
                  />
                </View>
                {errors.driver_id && <Text className="text-red-500 text-[10px] mt-1">{errors.driver_id}</Text>}
              </View>
              <View className="w-[32%]">
                <Text className="text-xs font-medium text-gray-700 mb-1">Driver Mobile</Text>
                <TextInput 
                  value={driverMobile}
                  editable={false}
                  placeholder="N/A"
                  className="w-full px-2 py-2.5 bg-gray-100 border border-gray-300 rounded-md text-xs text-gray-500"
                />
              </View>
              <View className="w-[32%]">
                <Text className="text-xs font-medium text-gray-700 mb-1">Vehicle No</Text>
                <TextInput 
                  placeholder="MH-12-AB"
                  value={form.vehicle_number}
                  onChangeText={handleVehicleNumberChange}
                  className="w-full px-2 py-2.5 bg-white border border-gray-300 rounded-md text-xs"
                />
                {errors.vehicle_number && <Text className="text-red-500 text-[10px] mt-1">{errors.vehicle_number}</Text>}
              </View>
            </View>
          </View>
        </View>

        {/* Quantity Details */}
        <View className="mb-5">
          <View className="flex-row items-center mb-3">
            <Box color="#006948" size={20} className="mr-2" />
            <Text className="text-sm font-semibold text-[#006948]">Quantity Details</Text>
          </View>
          
          <View className="flex-row justify-between mb-3">
            <View className="w-[48%]">
              <Text className="text-xs font-medium text-gray-700 mb-1">Total Boxes</Text>
                <TextInput 
                  placeholder="100"
                  keyboardType="numeric"
                  value={form.total_boxes}
                  onChangeText={(v) => { setForm({...form, total_boxes: v}); setErrors({...errors, total_boxes: null}); }}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-md text-sm"
                />
                {errors.total_boxes && <Text className="text-red-500 text-xs mt-1">{errors.total_boxes}</Text>}
              </View>
              <View className="w-[48%]">
                <Text className="text-xs font-medium text-gray-700 mb-1">Birds per Box</Text>
                <TextInput 
                  placeholder="15"
                  keyboardType="numeric"
                  value={form.birds_per_box}
                  onChangeText={(v) => { setForm({...form, birds_per_box: v}); setErrors({...errors, birds_per_box: null}); }}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-md text-sm"
                />
                {errors.birds_per_box && <Text className="text-red-500 text-xs mt-1">{errors.birds_per_box}</Text>}
              </View>
          </View>

          <View className="mb-3">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-xs font-medium text-gray-700">Total Birds Count</Text>
              {!isEditingBirds && (
                <TouchableOpacity onPress={() => setIsEditingBirds(true)} className="flex-row items-center">
                  <Pencil color="#006948" size={12} className="mr-1" />
                  <Text className="text-xs font-medium text-[#006948]">Edit</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput 
              placeholder="0" 
              keyboardType="numeric" 
              value={form.actual_birds}
              onChangeText={(v) => setForm({...form, actual_birds: v})}
              editable={isEditingBirds}
              className={`w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm font-bold ${!isEditingBirds ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900'}`}
            />
            {isEditingBirds && (
              <TouchableOpacity onPress={() => setIsEditingBirds(false)} className="mt-2 self-end">
                <Text className="text-xs font-medium text-gray-500">Cancel Edit (Auto Calculate)</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Weight & Rates */}
        <View className="mb-5">
          <View className="flex-row items-center mb-3">
            <Scale color="#006948" size={20} className="mr-2" />
            <Text className="text-sm font-semibold text-[#006948]">Weight & Rates</Text>
          </View>
          
          <View className="flex-row justify-between mb-3">
            <View className="w-[48%]">
              <Text className="text-xs font-medium text-gray-700 mb-1">Purchase Rate (₹/kg)</Text>
                <TextInput 
                  placeholder="120"
                  keyboardType="numeric"
                  value={form.purchase_rate}
                  onChangeText={(v) => { setForm({...form, purchase_rate: v}); setErrors({...errors, purchase_rate: null}); }}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-md text-sm"
                />
                {errors.purchase_rate && <Text className="text-red-500 text-xs mt-1">{errors.purchase_rate}</Text>}
              </View>
            <View className="w-[48%]">
              <Text className="text-xs font-medium text-gray-700 mb-1">Weighbridge Weight (kg)</Text>
                <TextInput 
                  placeholder="1500.5"
                  keyboardType="numeric"
                  value={form.weighbridge_weight}
                  onChangeText={(v) => { setForm({...form, weighbridge_weight: v}); setErrors({...errors, weighbridge_weight: null}); }}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-md text-sm"
                />
                {errors.weighbridge_weight && <Text className="text-red-500 text-xs mt-1">{errors.weighbridge_weight}</Text>}
              </View>
          </View>

          <View className="mb-3">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-xs font-medium text-gray-700">Net Weight (kg)</Text>
              {!isEditingNetWeight && (
                <TouchableOpacity onPress={() => setIsEditingNetWeight(true)} className="flex-row items-center">
                  <Pencil color="#006948" size={12} className="mr-1" />
                  <Text className="text-xs font-medium text-[#006948]">Edit</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput 
              placeholder="0.00" 
              keyboardType="numeric" 
              value={form.net_weight}
              onChangeText={(v) => setForm({...form, net_weight: v})}
              editable={isEditingNetWeight}
              className={`w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm font-bold ${!isEditingNetWeight ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900'}`}
            />
            {!isEditingNetWeight ? (
              <View className="flex-row items-center mt-1">
                <Text className="text-[10px] text-gray-500">Auto-calculated: Weighbridge - (Total Birds × </Text>
                {isEditingGrams ? (
                  <TextInput
                    value={form.empty_bird_weight_g}
                    onChangeText={updateEmptyBirdWeight}
                    onBlur={() => setIsEditingGrams(false)}
                    keyboardType="numeric"
                    autoFocus
                    className="p-0 text-[10px] font-bold text-gray-700 border-b border-[#006948] w-6 text-center"
                  />
                ) : (
                  <TouchableOpacity onPress={() => setIsEditingGrams(true)} className="flex-row items-center">
                    <Text className="text-[10px] font-bold text-[#006948] mr-1">{form.empty_bird_weight_g}g</Text>
                    <Edit2 color="#006948" size={10} />
                  </TouchableOpacity>
                )}
                <Text className="text-[10px] text-gray-500">)</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setIsEditingNetWeight(false)} className="mt-2 self-end">
                <Text className="text-xs font-medium text-gray-500">Cancel Edit (Auto Calculate)</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Total Purchase Amount */}
        <View className="mb-5">
          <Text className="text-xs font-medium text-gray-700 mb-1">Total Purchase Amount (Net Weight × Purchase Rate)</Text>
          <TextInput 
            placeholder="0.00" 
            value={form.total_amount}
            editable={false}
            className="w-full px-3 py-2.5 bg-gray-100 border border-gray-300 rounded-md text-[#006948] font-bold text-lg" 
          />
        </View>

        {errorMsg ? (
          <View className="mb-4 bg-red-50 p-3 rounded-lg border border-red-200">
            <Text className="text-red-600 text-sm font-semibold">{errorMsg}</Text>
          </View>
        ) : null}

        {successMsg ? (
          <View className="mb-4 bg-green-50 p-3 rounded-lg border border-green-200">
            <Text className="text-green-600 text-sm font-semibold">{successMsg}</Text>
          </View>
        ) : null}

        {/* Payment */}
        <View className="mb-10">
          <View className="flex-row items-center mb-3">
            <Banknote color="#006948" size={20} className="mr-2" />
            <Text className="text-sm font-semibold text-[#006948]">Payment</Text>
          </View>
          
          <View className="space-y-3">
            <View className="flex-row justify-between">
              <View className="w-[31%]">
                <Text className="text-xs font-medium text-gray-700 mb-1">Cash Payment</Text>
                <TextInput 
                  placeholder="0.00" 
                  keyboardType="numeric" 
                  value={form.cash_payment}
                  onChangeText={(v) => setForm({...form, cash_payment: v})}
                  className="w-full px-3 py-2.5 border border-gray-300 bg-white rounded-md text-sm font-bold" 
                />
              </View>
              <View className="w-[31%]">
                <Text className="text-xs font-medium text-gray-700 mb-1">UPI Payment</Text>
                <TextInput 
                  placeholder="0.00" 
                  keyboardType="numeric" 
                  value={form.upi_payment}
                  onChangeText={(v) => setForm({...form, upi_payment: v})}
                  className="w-full px-3 py-2.5 border border-gray-300 bg-white rounded-md text-sm font-bold" 
                />
              </View>
              <View className="w-[31%]">
                <Text className="text-xs font-medium text-gray-700 mb-1">Bank Account</Text>
                <TextInput 
                  placeholder="0.00" 
                  keyboardType="numeric" 
                  value={form.bank_payment}
                  onChangeText={(v) => setForm({...form, bank_payment: v})}
                  className="w-full px-3 py-2.5 border border-gray-300 bg-white rounded-md text-sm font-bold" 
                />
              </View>
            </View>
            <View className="flex-row justify-between items-center bg-gray-100 p-3 rounded-md mt-2">
              <View>
                <Text className="text-xs text-gray-500 font-medium">Total Paid</Text>
                <Text className="text-sm font-bold text-[#006948]">₹ {((parseFloat(form.cash_payment) || 0) + (parseFloat(form.upi_payment) || 0) + (parseFloat(form.bank_payment) || 0)).toFixed(2)}</Text>
              </View>
              <View className="items-end">
                <Text className="text-xs text-gray-500 font-medium">Balance Amount</Text>
                <Text className="text-sm font-bold text-red-500">
                  ₹ {((parseFloat(form.total_amount) || 0) - ((parseFloat(form.cash_payment) || 0) + (parseFloat(form.upi_payment) || 0) + (parseFloat(form.bank_payment) || 0))).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </View>
        </View>
      </KeyboardAwareScrollView>

      {/* Bottom Actions */}
      {isEditing && (
        <View className="absolute bottom-0 w-full bg-white border-t border-gray-200 p-4 flex-row justify-between">
          {editData ? (
            <TouchableOpacity 
              onPress={handleDelete}
              disabled={deleteMutation.isPending || mutation.isPending}
              className="w-[15%] py-3 bg-red-100 border border-red-200 rounded-md items-center justify-center mr-2"
            >
              <Trash2 color="#dc2626" size={20} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity 
            onPress={() => {
              if (editData) setIsEditing(false);
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('MainTabs');
            }}
            className={`${editData ? 'w-[25%]' : 'w-[30%]'} py-3 bg-white border border-gray-300 rounded-md items-center justify-center mr-2`}
          >
            <Text className="text-gray-700 font-semibold text-sm">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleSave}
            disabled={mutation.isPending || (editData && deleteMutation.isPending)}
            className={`${editData ? 'w-[55%]' : 'w-[68%]'} py-3 bg-[#006948] rounded-md flex-row items-center justify-center`}
          >
            <Save color="white" size={16} className="mr-2" />
            <Text className="text-white font-semibold text-sm">{mutation.isPending ? 'Saving...' : (editData ? 'Update Purchase' : 'Save Purchase')}</Text>
          </TouchableOpacity>
        </View>
      )}
      <ConfirmModal
        isVisible={showDeleteConfirm}
        title="Confirm Delete"
        message="Are you sure you want to delete this purchase? This will revert the party balance."
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDeleteConfirm(false)}
        confirmText="Delete"
        isDestructive={true}
      />
    </SafeAreaView>
  );
}
