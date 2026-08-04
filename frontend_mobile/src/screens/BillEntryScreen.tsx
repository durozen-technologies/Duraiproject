import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Trash2, Save, Printer } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PartySearchDropdown from '../components/PartySearchDropdown';
import DriverSearchDropdown from '../components/DriverSearchDropdown';
import ItemSearchDropdown from '../components/ItemSearchDropdown';
import client from '../api/client';
import { fetchDrivers } from '../api/drivers';
import { createExpenseEntry, fetchExpenseCategories } from '../api/expenses';
import { formatDateToDDMMYYYY } from '../utils/formatDate';
import {
  derivePurchase,
  deriveSale,
  deriveExpense,
  summarizeBillEntry,
  formatMoney,
  formatVehicleInput,
  VEHICLE_REGEX,
  parseNum,
  parseIntSafe,
  totalBirds,
  calcNetKg,
} from '../utils/billEntryCalc';

type PurchaseRow = {
  key: string;
  party_id: string;
  item_id: string;
  driver_id: string;
  driver_name: string;
  vehicle_number: string;
  boxes: string;
  birds_per_box: string;
  weighbridge_weight: string;
  net_weight: string;
  net_manual: boolean;
  purchase_rate: string;
  cash_payment: string;
  upi_payment: string;
  bank_payment: string;
};

type SaleRow = {
  key: string;
  party_id: string;
  item_id: string;
  driver_id: string;
  driver_name: string;
  vehicle_number: string;
  boxes: string;
  birds_per_box: string;
  weighbridge_weight: string;
  net_weight: string;
  net_manual: boolean;
  weight_rate: string;
  box_rate: string;
  cash_payment: string;
  upi_payment: string;
  bank_payment: string;
};

type ExpenseRow = {
  key: string;
  category_id: string;
  expense_name: string;
  cash_amount: string;
  upi_amount: string;
  note: string;
};

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const emptyPurchase = (): PurchaseRow => ({
  key: uid(),
  party_id: '',
  item_id: '',
  driver_id: '',
  driver_name: '',
  vehicle_number: '',
  boxes: '',
  birds_per_box: '',
  weighbridge_weight: '',
  net_weight: '',
  net_manual: false,
  purchase_rate: '',
  cash_payment: '',
  upi_payment: '',
  bank_payment: '',
});

const emptySale = (): SaleRow => ({
  key: uid(),
  party_id: '',
  item_id: '',
  driver_id: '',
  driver_name: '',
  vehicle_number: '',
  boxes: '',
  birds_per_box: '',
  weighbridge_weight: '',
  net_weight: '',
  net_manual: false,
  weight_rate: '',
  box_rate: '',
  cash_payment: '',
  upi_payment: '',
  bank_payment: '',
});

const emptyExpense = (): ExpenseRow => ({
  key: uid(),
  category_id: '',
  expense_name: '',
  cash_amount: '',
  upi_amount: '',
  note: '',
});

const Th = ({ w, children }: { w: number; children: string }) => (
  <View style={{ width: w }} className="justify-center px-1 py-2 border-r border-[#cfe3da] bg-[#e8f3ee]">
    <Text className="font-bold text-[#1f3a30] text-[11px] text-center uppercase tracking-wider">{children}</Text>
  </View>
);

const Td = ({ w, children, bg = 'bg-white' }: { w: number; children: React.ReactNode; bg?: string }) => (
  <View style={{ width: w }} className={`justify-center px-1.5 py-1.5 border-r border-[#e6ece9] ${bg}`}>
    {children}
  </View>
);

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wide">{children}</Text>;
}

function NumInput({
  value,
  onChangeText,
  placeholder,
  error,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: boolean;
}) {
  return (
    <TextInput
      className={`bg-white border ${error ? 'border-red-500' : 'border-[#d8e0dc]'} rounded px-1.5 py-1 text-xs text-center w-full h-8`}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || '0'}
      keyboardType="decimal-pad"
    />
  );
}

function CalcBox({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View className="bg-[#e8f3ee] border border-[#cfe3da] rounded-md px-2 py-2">
      <Text className="text-[9px] font-bold text-[#2a3a34] mb-0.5">{label}</Text>
      <Text className={`text-sm font-bold ${danger ? 'text-red-600' : 'text-gray-900'}`}>{value}</Text>
    </View>
  );
}

export default function BillEntryScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [emptyBirdG, setEmptyBirdG] = useState('40');
  const [purchases, setPurchases] = useState<PurchaseRow[]>([emptyPurchase()]);
  const [sales, setSales] = useState<SaleRow[]>([emptySale()]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([emptyExpense()]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const { data: parties } = useQuery({
    queryKey: ['parties'],
    queryFn: async () => (await client.get('/parties/')).data,
  });
  const { data: drivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: fetchDrivers,
  });
  const { data: items } = useQuery({
    queryKey: ['items'],
    queryFn: async () => (await client.get('/items/')).data,
  });
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['activeExpenseCategories'],
    queryFn: () => fetchExpenseCategories(true),
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await client.get('/settings/empty_bird_weight_g');
        if (res.data?.value != null) setEmptyBirdG(String(res.data.value));
      } catch {
        /* keep default */
      }
    })();
  }, []);

  const purchaseParties = useMemo(
    () => parties?.filter((p: any) => (p.type === 'PURCHASER' || p.type === 'BOTH') && p.is_active !== false) || [],
    [parties]
  );
  const saleParties = useMemo(
    () => parties?.filter((p: any) => (p.type === 'SUPPLIER' || p.type === 'BOTH') && p.is_active !== false) || [],
    [parties]
  );
  const activeDrivers = useMemo(() => drivers?.filter((d: any) => d.is_active) || [], [drivers]);
  const activeItems = useMemo(() => items?.filter((i: any) => i.is_active !== false) || items || [], [items]);

  const isPurchaseFilled = (r: PurchaseRow) =>
    !!(r.party_id || r.driver_id || r.driver_name || r.vehicle_number || parseNum(r.weighbridge_weight) || parseNum(r.purchase_rate) || parseIntSafe(r.boxes));

  const isSaleFilled = (r: SaleRow) =>
    !!(r.party_id || r.driver_id || r.driver_name || r.vehicle_number || parseNum(r.weighbridge_weight) || parseNum(r.weight_rate) || parseIntSafe(r.boxes) || parseNum(r.net_weight));

  const isExpenseFilled = (r: ExpenseRow) =>
    !!(r.category_id || r.expense_name || parseNum(r.cash_amount) || parseNum(r.upi_amount));

  const summary = useMemo(
    () =>
      summarizeBillEntry(
        purchases.filter(isPurchaseFilled),
        sales.filter(isSaleFilled),
        expenses.filter(isExpenseFilled),
        emptyBirdG
      ),
    [purchases, sales, expenses, emptyBirdG]
  );

  const updatePurchase = (key: string, patch: Partial<PurchaseRow>, opts?: { remanual?: boolean }) => {
    setPurchases((rows) =>
      rows.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, ...patch };
        const birds = totalBirds(next.boxes, next.birds_per_box);
        if (opts?.remanual) next.net_manual = true;
        if (!next.net_manual && (patch.boxes !== undefined || patch.birds_per_box !== undefined || patch.weighbridge_weight !== undefined || patch.net_manual === false)) {
          next.net_weight = calcNetKg(next.weighbridge_weight, birds, emptyBirdG, null, false).toFixed(2);
        }
        return next;
      })
    );
  };

  const updateSale = (key: string, patch: Partial<SaleRow>, opts?: { remanual?: boolean }) => {
    setSales((rows) =>
      rows.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, ...patch };
        const birds = totalBirds(next.boxes, next.birds_per_box);
        if (opts?.remanual) next.net_manual = true;
        if (!next.net_manual && (patch.boxes !== undefined || patch.birds_per_box !== undefined || patch.weighbridge_weight !== undefined || patch.net_manual === false)) {
          next.net_weight = calcNetKg(next.weighbridge_weight, birds, emptyBirdG, null, false).toFixed(2);
        }
        return next;
      })
    );
  };

  const updateExpense = (key: string, patch: Partial<ExpenseRow>) => {
    setExpenses((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  useEffect(() => {
    setPurchases((rows) =>
      rows.map((r) => {
        if (r.net_manual) return r;
        const birds = totalBirds(r.boxes, r.birds_per_box);
        return { ...r, net_weight: calcNetKg(r.weighbridge_weight, birds, emptyBirdG, null, false).toFixed(2) };
      })
    );
    setSales((rows) =>
      rows.map((r) => {
        if (r.net_manual) return r;
        const birds = totalBirds(r.boxes, r.birds_per_box);
        return { ...r, net_weight: calcNetKg(r.weighbridge_weight, birds, emptyBirdG, null, false).toFixed(2) };
      })
    );
  }, [emptyBirdG]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const filledP = purchases.filter(isPurchaseFilled);
    const filledS = sales.filter(isSaleFilled);
    const filledE = expenses.filter(isExpenseFilled);

    if (filledP.length === 0 && filledS.length === 0 && filledE.length === 0) {
      setErrorMsg('Add at least one purchase, sale, or expense row');
      return false;
    }

    filledP.forEach((r, idx) => {
      if (!r.party_id) errs[`p-${r.key}-party`] = 'Required';
      if (!r.driver_id && !r.driver_name) errs[`p-${r.key}-driver`] = 'Required';
      if (!r.vehicle_number) errs[`p-${r.key}-vehicle`] = 'Required';
      else if (!VEHICLE_REGEX.test(r.vehicle_number)) errs[`p-${r.key}-vehicle`] = 'Format XX-00-XX-0000';
      if (parseIntSafe(r.boxes) <= 0) errs[`p-${r.key}-boxes`] = 'Required';
      if (parseIntSafe(r.birds_per_box) <= 0) errs[`p-${r.key}-bpb`] = 'Required';
      if (parseNum(r.purchase_rate) <= 0) errs[`p-${r.key}-rate`] = 'Required';
      if (parseNum(r.weighbridge_weight) <= 0) errs[`p-${r.key}-weigh`] = 'Required';
      if (Object.keys(errs).some((k) => k.startsWith(`p-${r.key}`))) {
        errs[`p-${r.key}`] = `Purchase #${idx + 1} has errors`;
      }
    });

    filledS.forEach((r, idx) => {
      if (!r.party_id) errs[`s-${r.key}-party`] = 'Required';
      if (!r.driver_id && !r.driver_name) errs[`s-${r.key}-driver`] = 'Required';
      if (!r.vehicle_number) errs[`s-${r.key}-vehicle`] = 'Required';
      else if (!VEHICLE_REGEX.test(r.vehicle_number)) errs[`s-${r.key}-vehicle`] = 'Format XX-00-XX-0000';
      if (parseIntSafe(r.boxes) <= 0) errs[`s-${r.key}-boxes`] = 'Required';
      if (parseNum(r.net_weight) <= 0) errs[`s-${r.key}-net`] = 'Required';
      if (parseNum(r.weight_rate) <= 0) errs[`s-${r.key}-rate`] = 'Required';
      if (Object.keys(errs).some((k) => k.startsWith(`s-${r.key}`))) {
        errs[`s-${r.key}`] = `Sale #${idx + 1} has errors`;
      }
    });

    filledE.forEach((r, idx) => {
      if (!r.category_id) errs[`e-${r.key}-cat`] = 'Required';
      const total = deriveExpense(r).total;
      if (total <= 0) errs[`e-${r.key}-amt`] = 'Cash + UPI must be > 0';
      if (Object.keys(errs).some((k) => k.startsWith(`e-${r.key}`))) {
        errs[`e-${r.key}`] = `Expense #${idx + 1} has errors`;
      }
    });

    setRowErrors(errs);
    if (Object.keys(errs).length > 0) {
      setErrorMsg('Fix validation errors before saving');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const saveMutation = useMutation({
    mutationFn: async (andPrint: boolean) => {
      const filledP = purchases.filter(isPurchaseFilled);
      const filledS = sales.filter(isSaleFilled);
      const filledE = expenses.filter(isExpenseFilled);
      const errors: string[] = [];

      for (let i = 0; i < filledP.length; i++) {
        const r = filledP[i];
        const d = derivePurchase(r, emptyBirdG);
        try {
          await client.post('/purchases/', {
            date,
            party_id: r.party_id,
            item_id: r.item_id || null,
            driver_id: r.driver_id || null,
            driver_name: r.driver_name,
            vehicle_number: r.vehicle_number,
            total_boxes: parseIntSafe(r.boxes),
            birds_per_box: parseIntSafe(r.birds_per_box),
            actual_birds: d.birds,
            weighbridge_weight: parseNum(r.weighbridge_weight),
            net_weight: d.net,
            purchase_rate: parseNum(r.purchase_rate),
            purchase_amount: d.amount,
            cash_payment: parseNum(r.cash_payment),
            upi_payment: parseNum(r.upi_payment),
            bank_payment: parseNum(r.bank_payment),
          });
        } catch (e: any) {
          errors.push(`Purchase #${i + 1}: ${e?.response?.data?.detail || e.message || 'failed'}`);
        }
      }

      for (let i = 0; i < filledS.length; i++) {
        const r = filledS[i];
        const d = deriveSale(r, emptyBirdG);
        const weightAmount = d.net * parseNum(r.weight_rate);
        const boxAmount = parseIntSafe(r.boxes) * parseNum(r.box_rate);
        try {
          await client.post('/sales/', {
            date,
            party_id: r.party_id,
            item_id: r.item_id || null,
            driver_id: r.driver_id || null,
            driver_name: r.driver_name,
            vehicle_number: r.vehicle_number,
            weighbridge_weight: parseNum(r.weighbridge_weight),
            weight: d.net,
            weight_rate: parseNum(r.weight_rate),
            weight_amount: weightAmount,
            boxes: parseIntSafe(r.boxes),
            birds_per_box: parseIntSafe(r.birds_per_box),
            actual_birds: d.birds,
            box_rate: parseNum(r.box_rate),
            box_amount: boxAmount,
            total_invoice_amount: d.invoice,
            cash_payment: parseNum(r.cash_payment),
            upi_payment: parseNum(r.upi_payment),
            bank_payment: parseNum(r.bank_payment),
          });
        } catch (e: any) {
          errors.push(`Sale #${i + 1}: ${e?.response?.data?.detail || e.message || 'failed'}`);
        }
      }

      for (let i = 0; i < filledE.length; i++) {
        const r = filledE[i];
        const cat = categories?.find((c) => c.id === r.category_id);
        try {
          await createExpenseEntry(
            r.category_id,
            r.expense_name || cat?.name || 'Expense',
            parseNum(r.cash_amount),
            parseNum(r.upi_amount),
            r.note || undefined
          );
        } catch (e: any) {
          errors.push(`Expense #${i + 1}: ${e?.response?.data?.detail || e.message || 'failed'}`);
        }
      }

      return { errors, andPrint };
    },
    onSuccess: ({ errors, andPrint }) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });

      if (errors.length > 0) {
        setErrorMsg(errors.join('\n'));
        setSuccessMsg('');
        return;
      }
      setSuccessMsg(andPrint ? 'Saved. Print coming soon.' : 'All entries saved successfully');
      setErrorMsg('');
      if (Platform.OS === 'web') {
        // brief pause then go back
        setTimeout(() => navigation.goBack(), 800);
      } else {
        Alert.alert('Saved', andPrint ? 'Entries saved. Print coming soon.' : 'All entries saved successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    },
    onError: (e: any) => {
      setErrorMsg(e?.message || 'Save failed');
    },
  });

  const handleSave = (andPrint = false) => {
    if (!validate()) return;
    saveMutation.mutate(andPrint);
  };

  const TotalsStrip = ({
    items,
  }: {
    items: { label: string; value: string; danger?: boolean }[];
  }) => (
    <View className={`bg-[#e8f3ee] border-t border-[#cfe3da] rounded-b-lg overflow-hidden ${isWide ? 'flex-row' : 'flex-row flex-wrap'}`}>
      {items.map((it) => (
        <View key={it.label} className={`${isWide ? 'flex-1' : 'w-1/2'} p-3 border-r border-[#cfe3da]`}>
          <Text className="text-[11px] font-bold text-[#2a3a34] text-center mb-1">{it.label}</Text>
          <Text className={`text-base font-bold text-center ${it.danger ? 'text-red-600' : 'text-gray-900'}`}>{it.value}</Text>
        </View>
      ))}
    </View>
  );

  const renderPurchaseRow = (r: PurchaseRow, index: number) => {
    const d = derivePurchase(r, emptyBirdG);
    const driver = activeDrivers.find((x: any) => x.id === r.driver_id);
    return (
      <View key={r.key} className="flex-row border-b border-[#e6ece9] bg-white" style={{ zIndex: 100 - index }}>
        {rowErrors[`p-${r.key}`] ? (
          <View className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 z-50" />
        ) : null}
        <Td w={180}>
          <PartySearchDropdown
            parties={purchaseParties}
            value={r.party_id}
            onSelect={(id: string) => updatePurchase(r.key, { party_id: id })}
            placeholder="Select party"
            error={!!rowErrors[`p-${r.key}-party`]}
          />
        </Td>
        <Td w={140}>
          <ItemSearchDropdown
            items={activeItems}
            value={r.item_id}
            onSelect={(id: string) => updatePurchase(r.key, { item_id: id })}
            placeholder="Select item"
          />
        </Td>
        <Td w={160}>
          <DriverSearchDropdown
            drivers={activeDrivers}
            value={r.driver_id || r.driver_name}
            onSelect={(val: string) => {
              const isUUID = val.length === 36 && val.includes('-');
              if (isUUID) updatePurchase(r.key, { driver_id: val, driver_name: '' });
              else updatePurchase(r.key, { driver_id: '', driver_name: val });
            }}
            placeholder="Select driver"
            error={!!rowErrors[`p-${r.key}-driver`]}
          />
        </Td>
        <Td w={110}>
          <TextInput className="bg-gray-50 border border-[#d8e0dc] rounded px-1.5 py-1 text-xs w-full h-8" value={driver?.mobile || ''} editable={false} />
        </Td>
        <Td w={120}>
          <TextInput
            className={`bg-white border ${rowErrors[`p-${r.key}-vehicle`] ? 'border-red-500' : 'border-[#d8e0dc]'} rounded px-1.5 py-1 text-xs w-full h-8 uppercase`}
            value={r.vehicle_number}
            onChangeText={(t) => updatePurchase(r.key, { vehicle_number: formatVehicleInput(t) })}
            placeholder="TN-52-AB-1234"
          />
        </Td>
        <Td w={70}><NumInput value={r.boxes} onChangeText={(v) => updatePurchase(r.key, { boxes: v })} error={!!rowErrors[`p-${r.key}-boxes`]} /></Td>
        <Td w={80}><NumInput value={r.birds_per_box} onChangeText={(v) => updatePurchase(r.key, { birds_per_box: v })} error={!!rowErrors[`p-${r.key}-bpb`]} /></Td>
        <Td w={80} bg="bg-[#f7faf8]"><Text className="text-center font-bold text-gray-800 text-xs">{d.birds}</Text></Td>
        <Td w={90}><NumInput value={r.weighbridge_weight} onChangeText={(v) => updatePurchase(r.key, { weighbridge_weight: v, net_manual: false })} error={!!rowErrors[`p-${r.key}-weigh`]} /></Td>
        <Td w={90}><NumInput value={r.net_weight} onChangeText={(v) => updatePurchase(r.key, { net_weight: v }, { remanual: true })} /></Td>
        <Td w={80} bg="bg-[#f7faf8]"><Text className="text-center font-bold text-gray-800 text-xs">{d.avgWt.toFixed(3)}</Text></Td>
        <Td w={80}><NumInput value={r.purchase_rate} onChangeText={(v) => updatePurchase(r.key, { purchase_rate: v })} error={!!rowErrors[`p-${r.key}-rate`]} /></Td>
        <Td w={100} bg="bg-[#f7faf8]"><Text className="text-center font-bold text-gray-800 text-xs">{formatMoney(d.amount)}</Text></Td>
        <Td w={90}><NumInput value={r.cash_payment} onChangeText={(v) => updatePurchase(r.key, { cash_payment: v })} /></Td>
        <Td w={90}><NumInput value={r.upi_payment} onChangeText={(v) => updatePurchase(r.key, { upi_payment: v })} /></Td>
        <Td w={90}><NumInput value={r.bank_payment} onChangeText={(v) => updatePurchase(r.key, { bank_payment: v })} /></Td>
        <Td w={100} bg="bg-[#f7faf8]"><Text className="text-center font-bold text-[#c0392b] text-xs">{formatMoney(d.balance)}</Text></Td>
        <Td w={50}>
          <TouchableOpacity onPress={() => setPurchases((rows) => (rows.length <= 1 ? [emptyPurchase()] : rows.filter((x) => x.key !== r.key)))} className="w-7 h-7 rounded bg-[#fdeceb] border border-[#f3c9c4] items-center justify-center mx-auto">
            <Trash2 size={13} color="#c0392b" />
          </TouchableOpacity>
        </Td>
      </View>
    );
  };

  const renderSaleRow = (r: SaleRow, index: number) => {
    const d = deriveSale(r, emptyBirdG);
    const driver = activeDrivers.find((x: any) => x.id === r.driver_id);
    return (
      <View key={r.key} className="flex-row border-b border-[#e6ece9] bg-white" style={{ zIndex: 100 - index }}>
        {rowErrors[`s-${r.key}`] ? (
          <View className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 z-50" />
        ) : null}
        <Td w={180}>
          <PartySearchDropdown
            parties={saleParties}
            value={r.party_id}
            onSelect={(id: string) => updateSale(r.key, { party_id: id })}
            placeholder="Select party"
            error={!!rowErrors[`s-${r.key}-party`]}
          />
        </Td>
        <Td w={140}>
          <ItemSearchDropdown
            items={activeItems}
            value={r.item_id}
            onSelect={(id: string) => updateSale(r.key, { item_id: id })}
            placeholder="Select item"
          />
        </Td>
        <Td w={160}>
          <DriverSearchDropdown
            drivers={activeDrivers}
            value={r.driver_id || r.driver_name}
            onSelect={(val: string) => {
              const isUUID = val.length === 36 && val.includes('-');
              if (isUUID) updateSale(r.key, { driver_id: val, driver_name: '' });
              else updateSale(r.key, { driver_id: '', driver_name: val });
            }}
            placeholder="Select driver"
            error={!!rowErrors[`s-${r.key}-driver`]}
          />
        </Td>
        <Td w={110}>
          <TextInput className="bg-gray-50 border border-[#d8e0dc] rounded px-1.5 py-1 text-xs w-full h-8" value={driver?.mobile || ''} editable={false} />
        </Td>
        <Td w={120}>
          <TextInput
            className={`bg-white border ${rowErrors[`s-${r.key}-vehicle`] ? 'border-red-500' : 'border-[#d8e0dc]'} rounded px-1.5 py-1 text-xs w-full h-8 uppercase`}
            value={r.vehicle_number}
            onChangeText={(t) => updateSale(r.key, { vehicle_number: formatVehicleInput(t) })}
            placeholder="TN-52-AB-1234"
          />
        </Td>
        <Td w={70}><NumInput value={r.boxes} onChangeText={(v) => updateSale(r.key, { boxes: v })} error={!!rowErrors[`s-${r.key}-boxes`]} /></Td>
        <Td w={80}><NumInput value={r.birds_per_box} onChangeText={(v) => updateSale(r.key, { birds_per_box: v })} /></Td>
        <Td w={80} bg="bg-[#f7faf8]"><Text className="text-center font-bold text-gray-800 text-xs">{d.birds}</Text></Td>
        <Td w={90}><NumInput value={r.weighbridge_weight} onChangeText={(v) => updateSale(r.key, { weighbridge_weight: v, net_manual: false })} /></Td>
        <Td w={90}><NumInput value={r.net_weight} onChangeText={(v) => updateSale(r.key, { net_weight: v }, { remanual: true })} error={!!rowErrors[`s-${r.key}-net`]} /></Td>
        <Td w={80}><NumInput value={r.weight_rate} onChangeText={(v) => updateSale(r.key, { weight_rate: v })} error={!!rowErrors[`s-${r.key}-rate`]} /></Td>
        <Td w={80}><NumInput value={r.box_rate} onChangeText={(v) => updateSale(r.key, { box_rate: v })} /></Td>
        <Td w={100} bg="bg-[#f7faf8]"><Text className="text-center font-bold text-gray-800 text-xs">{formatMoney(d.invoice)}</Text></Td>
        <Td w={90}><NumInput value={r.cash_payment} onChangeText={(v) => updateSale(r.key, { cash_payment: v })} /></Td>
        <Td w={90}><NumInput value={r.upi_payment} onChangeText={(v) => updateSale(r.key, { upi_payment: v })} /></Td>
        <Td w={90}><NumInput value={r.bank_payment} onChangeText={(v) => updateSale(r.key, { bank_payment: v })} /></Td>
        <Td w={100} bg="bg-[#f7faf8]"><Text className="text-center font-bold text-[#c0392b] text-xs">{formatMoney(d.balance)}</Text></Td>
        <Td w={50}>
          <TouchableOpacity onPress={() => setSales((rows) => (rows.length <= 1 ? [emptySale()] : rows.filter((x) => x.key !== r.key)))} className="w-7 h-7 rounded bg-[#fdeceb] border border-[#f3c9c4] items-center justify-center mx-auto">
            <Trash2 size={13} color="#c0392b" />
          </TouchableOpacity>
        </Td>
      </View>
    );
  };

  const renderExpenseCard = (r: ExpenseRow, index: number) => {
    const d = deriveExpense(r);
    const catError = !!rowErrors[`e-${r.key}-cat`];
    const selectedCat = categories?.find((c) => c.id === r.category_id);

    return (
      <View key={r.key} className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-xs font-bold text-gray-700">Expense #{index + 1}</Text>
          <TouchableOpacity
            onPress={() => setExpenses((rows) => (rows.length <= 1 ? [emptyExpense()] : rows.filter((x) => x.key !== r.key)))}
            className="p-1.5 bg-red-50 rounded-md"
          >
            <Trash2 size={16} color="#c0392b" />
          </TouchableOpacity>
        </View>
        {rowErrors[`e-${r.key}`] ? <Text className="text-red-600 text-sm font-semibold mb-2">{rowErrors[`e-${r.key}`]}</Text> : null}

        {/* Category — full width, clearly visible */}
        <View className="mb-3">
          <FieldLabel>Category *</FieldLabel>
          <View
            className={`rounded-lg p-2.5 ${
              catError ? 'border-2 border-red-500 bg-red-50' : 'border border-gray-300 bg-gray-50'
            }`}
          >
            {selectedCat ? (
              <Text className="text-sm font-bold text-[#0b4d3a] mb-2">Selected: {selectedCat.name}</Text>
            ) : (
              <Text className={`text-sm mb-2 ${catError ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                {catError ? 'Please select a category below' : 'Tap a category to select'}
              </Text>
            )}
            {categoriesLoading ? (
              <Text className="text-xs text-gray-500">Loading categories…</Text>
            ) : !categories || categories.length === 0 ? (
              <Text className="text-sm text-amber-700 font-medium">
                No categories found. Add them under Expenses → Categories first.
              </Text>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {categories.map((c) => {
                  const selected = r.category_id === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => {
                        updateExpense(r.key, {
                          category_id: c.id,
                          expense_name: r.expense_name || c.name,
                        });
                        setRowErrors((prev) => {
                          const next = { ...prev };
                          delete next[`e-${r.key}-cat`];
                          delete next[`e-${r.key}`];
                          return next;
                        });
                      }}
                      className={`px-3 py-2.5 rounded-lg border-2 min-w-[88px] items-center ${
                        selected ? 'bg-[#0b4d3a] border-[#0b4d3a]' : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text className={`text-sm font-bold ${selected ? 'text-white' : 'text-gray-800'}`}>{c.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
          {catError ? <Text className="text-red-600 text-xs font-semibold mt-1.5">Category is required</Text> : null}
        </View>

        <View className={`${isWide ? 'flex-row flex-wrap gap-2' : 'gap-2'}`}>
          <View className={isWide ? 'w-[28%]' : ''}>
            <FieldLabel>Expense Name</FieldLabel>
            <TextInput
              className="bg-white border border-gray-300 rounded-md px-2 py-2 text-sm"
              value={r.expense_name}
              onChangeText={(v) => updateExpense(r.key, { expense_name: v })}
              placeholder="Name"
            />
          </View>
          <View className={isWide ? 'w-[14%]' : ''}>
            <FieldLabel>Cash</FieldLabel>
            <NumInput value={r.cash_amount} onChangeText={(v) => updateExpense(r.key, { cash_amount: v })} error={!!rowErrors[`e-${r.key}-amt`]} />
          </View>
          <View className={isWide ? 'w-[14%]' : ''}>
            <FieldLabel>UPI</FieldLabel>
            <NumInput value={r.upi_amount} onChangeText={(v) => updateExpense(r.key, { upi_amount: v })} error={!!rowErrors[`e-${r.key}-amt`]} />
          </View>
          <View className={isWide ? 'w-[14%]' : ''}>
            <CalcBox label="Total" value={formatMoney(d.total)} />
          </View>
          <View className={isWide ? 'w-[24%]' : ''}>
            <FieldLabel>Note</FieldLabel>
            <TextInput
              className="bg-white border border-gray-300 rounded-md px-2 py-2 text-sm"
              value={r.note}
              onChangeText={(v) => updateExpense(r.key, { note: v })}
              placeholder="Optional"
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f4f7f5]">
      <View className="px-4 py-3 bg-[#0b4d3a] flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs'))} className="mr-3">
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-white tracking-wide">BILL ENTRY</Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        enableOnAndroid
        extraScrollHeight={120}
        keyboardShouldPersistTaps="handled"
      >
        {/* Meta */}
        <View className="bg-white px-4 py-3 border-b border-gray-100 flex-row flex-wrap gap-3 items-end">
          <View>
            <FieldLabel>Date</FieldLabel>
            {Platform.OS === 'web' ? (
              <TextInput
                className="border border-gray-300 rounded-md px-3 py-2 text-sm min-w-[140px]"
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />
            ) : (
              <>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} className="border border-gray-300 rounded-md px-3 py-2 bg-white min-w-[140px]">
                  <Text className="text-sm">{formatDateToDDMMYYYY(date)}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={new Date(date)}
                    mode="date"
                    onChange={(_, d) => {
                      setShowDatePicker(false);
                      if (d) setDate(d.toISOString().split('T')[0]);
                    }}
                  />
                )}
              </>
            )}
          </View>
          <View>
            <FieldLabel>Empty Bird (g)</FieldLabel>
            <TextInput
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-20 text-center"
              value={emptyBirdG}
              onChangeText={setEmptyBirdG}
              keyboardType="number-pad"
            />
          </View>
          <View className="pb-1">
            <Text className="text-xs font-bold text-gray-600">
              Remaining Weight:{' '}
              <Text className="text-base text-[#0b4d3a] font-bold">{formatMoney(summary.remainingWeight)} Kg</Text>
            </Text>
          </View>
        </View>

        {errorMsg ? (
          <View className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-md p-3">
            <Text className="text-red-700 text-xs whitespace-pre-wrap">{errorMsg}</Text>
          </View>
        ) : null}
        {successMsg ? (
          <View className="mx-4 mt-3 bg-green-50 border border-green-200 rounded-md p-3">
            <Text className="text-green-800 text-xs">{successMsg}</Text>
          </View>
        ) : null}

        {/* Purchases */}
        <View className="mt-4 mx-3 rounded-lg border border-[#cfe3da] bg-white" style={{ zIndex: 30 }}>
          <View className="bg-[#0b4d3a] px-4 py-2.5 flex-row justify-between items-center rounded-t-lg">
            <Text className="text-white font-bold text-sm tracking-wide">PURCHASES</Text>
            <TouchableOpacity onPress={() => setPurchases((rows) => [...rows, emptyPurchase()])} className="bg-[#1a7a52] px-3 py-1.5 rounded-md flex-row items-center">
              <Plus size={14} color="#fff" />
              <Text className="text-white text-xs font-bold ml-1">Add Purchase</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={true} keyboardShouldPersistTaps="handled">
            <View>
              {/* Header */}
              <View className="flex-row border-b border-[#cfe3da] bg-[#e8f3ee]">
                <Th w={180}>Party</Th>
                <Th w={140}>Item</Th>
                <Th w={160}>Driver</Th>
                <Th w={110}>Mobile</Th>
                <Th w={120}>Vehicle</Th>
                <Th w={70}>Boxes</Th>
                <Th w={80}>Birds/Box</Th>
                <Th w={80}>Tot Birds</Th>
                <Th w={90}>Weigh Wt</Th>
                <Th w={90}>Net Kg</Th>
                <Th w={80}>Avg Wt</Th>
                <Th w={80}>Rate/Kg</Th>
                <Th w={100}>Amount</Th>
                <Th w={90}>Cash</Th>
                <Th w={90}>UPI</Th>
                <Th w={90}>Bank</Th>
                <Th w={100}>Balance</Th>
                <Th w={50}>Act</Th>
              </View>
              <View>{purchases.map(renderPurchaseRow)}</View>
            </View>
          </ScrollView>
          <TotalsStrip
            items={[
              { label: 'Total Purchases', value: String(summary.purchaseCount) },
              { label: 'Total Birds', value: summary.purchaseBirds.toLocaleString('en-IN') },
              { label: 'Total Net Weight', value: `${formatMoney(summary.purchaseNetSum)} Kg` },
              { label: 'Total Amount', value: formatMoney(summary.purchaseAmountSum) },
              { label: 'Total Paid', value: formatMoney(summary.purchasePaidSum) },
              { label: 'Total Balance', value: formatMoney(summary.purchaseBalanceSum), danger: true },
            ]}
          />
        </View>

        {/* Sales */}
        <View className="mt-4 mx-3 rounded-lg border border-[#cfe3da] bg-white" style={{ zIndex: 20 }}>
          <View className="bg-[#0f5c45] px-4 py-2.5 flex-row justify-between items-center rounded-t-lg">
            <Text className="text-white font-bold text-sm tracking-wide">SALES</Text>
            <TouchableOpacity onPress={() => setSales((rows) => [...rows, emptySale()])} className="bg-[#1a7a52] px-3 py-1.5 rounded-md flex-row items-center">
              <Plus size={14} color="#fff" />
              <Text className="text-white text-xs font-bold ml-1">Add Sale</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={true} keyboardShouldPersistTaps="handled">
            <View>
              <View className="flex-row border-b border-[#cfe3da] bg-[#e8f3ee]">
                <Th w={180}>Party</Th>
                <Th w={140}>Item</Th>
                <Th w={160}>Driver</Th>
                <Th w={110}>Mobile</Th>
                <Th w={120}>Vehicle</Th>
                <Th w={70}>Boxes</Th>
                <Th w={80}>Birds/Box</Th>
                <Th w={80}>Tot Birds</Th>
                <Th w={90}>Weigh Wt</Th>
                <Th w={90}>Net Kg</Th>
                <Th w={80}>Rate/Kg</Th>
                <Th w={80}>Box Rate</Th>
                <Th w={100}>Invoice</Th>
                <Th w={90}>Cash</Th>
                <Th w={90}>UPI</Th>
                <Th w={90}>Bank</Th>
                <Th w={100}>Balance</Th>
                <Th w={50}>Act</Th>
              </View>
              <View>{sales.map(renderSaleRow)}</View>
            </View>
          </ScrollView>
          <TotalsStrip
            items={[
              { label: 'Total Sales', value: String(summary.saleCount) },
              { label: 'Total Birds', value: summary.saleBirds.toLocaleString('en-IN') },
              { label: 'Total Net Weight', value: `${formatMoney(summary.saleNetSum)} Kg` },
              { label: 'Total Invoice', value: formatMoney(summary.saleInvoiceSum) },
              { label: 'Total Received', value: formatMoney(summary.totalReceived) },
              { label: 'Total Balance', value: formatMoney(summary.saleBalanceSum), danger: true },
            ]}
          />
        </View>

        {/* Expenses + Summary */}
        <View className={`mt-4 mx-3 ${isWide ? 'flex-row gap-3' : ''}`} style={{ zIndex: 10 }}>
          <View className={`${isWide ? 'flex-1' : 'mb-3'} rounded-lg border border-[#cfe3da] bg-white`}>
            <View className="bg-[#0b4d3a] px-4 py-2.5 flex-row justify-between items-center rounded-t-lg">
              <Text className="text-white font-bold text-sm">EXPENSES</Text>
              <TouchableOpacity onPress={() => setExpenses((rows) => [...rows, emptyExpense()])} className="bg-[#1a7a52] px-3 py-1.5 rounded-md flex-row items-center">
                <Plus size={14} color="#fff" />
                <Text className="text-white text-xs font-bold ml-1">Add</Text>
              </TouchableOpacity>
            </View>
            <View className="p-3 bg-white">{expenses.map(renderExpenseCard)}</View>
            <View className="bg-[#e8f3ee] py-3 flex-row justify-center gap-2 border-t border-[#cfe3da] rounded-b-lg">
              <Text className="font-bold text-[#2a3a34]">Total Expenses</Text>
              <Text className="font-bold">{formatMoney(summary.expenseSum)}</Text>
            </View>
          </View>

          <View className={`${isWide ? 'flex-1' : ''} rounded-lg border border-[#cfe3da] bg-white`}>
            <View className="bg-[#0b4d3a] px-4 py-2.5 rounded-t-lg">
              <Text className="text-white font-bold text-sm">SUMMARY</Text>
            </View>
            <View className="bg-white p-4 flex-row flex-wrap rounded-b-lg">
              <View className="w-1/2 pr-2 gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-sm font-semibold text-gray-700">Purchase Amount</Text>
                  <Text className="text-sm font-bold">{formatMoney(summary.purchaseAmountSum)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm font-semibold text-gray-700">Sale Amount</Text>
                  <Text className="text-sm font-bold">{formatMoney(summary.saleInvoiceSum)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm font-semibold text-gray-700">Expenses</Text>
                  <Text className="text-sm font-bold">{formatMoney(summary.expenseSum)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm font-semibold text-gray-700">Profit / Loss</Text>
                  <Text className={`text-sm font-bold ${summary.profit < 0 ? 'text-red-600' : 'text-[#1a7a52]'}`}>
                    {formatMoney(summary.profit)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm font-semibold text-gray-700">Cash Received</Text>
                  <Text className="text-sm font-bold">{formatMoney(summary.saleCash)}</Text>
                </View>
              </View>
              <View className="w-1/2 pl-2 gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-sm font-semibold text-gray-700">UPI Received</Text>
                  <Text className="text-sm font-bold">{formatMoney(summary.saleUpi)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm font-semibold text-gray-700">Bank Received</Text>
                  <Text className="text-sm font-bold">{formatMoney(summary.saleBank)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm font-semibold text-gray-700">Total Received</Text>
                  <Text className="text-sm font-bold">{formatMoney(summary.totalReceived)}</Text>
                </View>
                <View className="flex-row justify-between border-t border-gray-100 pt-2 mt-1">
                  <Text className="text-sm font-semibold text-gray-700">Outstanding</Text>
                  <Text className="text-sm font-bold text-red-600">{formatMoney(summary.outstanding)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-[#f4f7f5] border-t border-gray-200 px-4 py-3 flex-row justify-end gap-2">
        <TouchableOpacity
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs'))}
          className="bg-[#c0392b] px-4 py-3 rounded-md"
        >
          <Text className="text-white font-bold text-sm">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleSave(false)}
          disabled={saveMutation.isPending}
          className="bg-[#0b4d3a] px-4 py-3 rounded-md flex-row items-center"
        >
          {saveMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Save size={16} color="#fff" />}
          <Text className="text-white font-bold text-sm ml-2">Save</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleSave(true)}
          disabled={saveMutation.isPending}
          className="bg-[#0f6b48] px-4 py-3 rounded-md flex-row items-center"
        >
          <Printer size={16} color="#fff" />
          <Text className="text-white font-bold text-sm ml-2">Save & Print</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
