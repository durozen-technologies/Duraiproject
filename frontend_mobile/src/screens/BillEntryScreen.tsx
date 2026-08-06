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
import { ArrowLeft, Plus, Trash2, Save, Pencil, ShoppingCart, Bird, Scale, IndianRupee, Wallet, Landmark, X } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PartySearchDropdown from '../components/PartySearchDropdown';
import DriverSearchDropdown from '../components/DriverSearchDropdown';
import ItemSearchDropdown from '../components/ItemSearchDropdown';
import CategorySearchDropdown from '../components/CategorySearchDropdown';
import ConfirmModal from '../components/ConfirmModal';
import client from '../api/client';
import { fetchDrivers } from '../api/drivers';
import { fetchExpenseCategories } from '../api/expenses';
import { createDayBill, deleteDayBill, fetchDayBill, updateDayBill } from '../api/dayBills';
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
  inferPurchaseOverrides,
  inferSaleOverrides,
} from '../utils/billEntryCalc';
import { useRoute } from '@react-navigation/native';

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
  birds_override: string;
  birds_manual: boolean;
  amount_override: string;
  amount_manual: boolean;
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
  birds_override: string;
  birds_manual: boolean;
  amount_override: string;
  amount_manual: boolean;
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
  birds_override: '',
  birds_manual: false,
  amount_override: '',
  amount_manual: false,
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
  birds_override: '',
  birds_manual: false,
  amount_override: '',
  amount_manual: false,
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

const Th = ({ w, children, theme = 'green' }: { w: number; children: string; theme?: 'green' | 'blue' }) => (
  <View style={{ width: w }} className={`justify-center px-1.5 py-3 border-r ${theme === 'green' ? 'border-[#cfe3da] bg-[#f0fdf4]' : 'border-blue-200 bg-blue-50'}`}>
    <Text className={`font-bold ${theme === 'green' ? 'text-[#1f3a30]' : 'text-blue-900'} text-xs text-center uppercase tracking-wider`}>{children}</Text>
  </View>
);

const OverrideableField = ({
  value,
  computedValue,
  isManual,
  onOverride,
  onCancel,
  isEditing
}: any) => {
  const display = isManual ? value : computedValue;
  if (!isEditing) {
    return (
      <View className="h-10 justify-center">
        <Text className="text-center font-bold text-gray-800 text-sm">{display}</Text>
      </View>
    );
  }

  return (
    <View className="items-center justify-center relative w-full h-10">
      {isManual ? (
        <View className="flex-row items-center border border-[#d8e0dc] rounded bg-white overflow-hidden w-full h-full absolute inset-0 z-10">
          <TextInput
            className="flex-1 text-center px-0.5 text-sm font-bold text-gray-800 h-full min-w-0"
            value={String(value)}
            onChangeText={onOverride}
            keyboardType="decimal-pad"
            style={{ outline: 'none' } as any}
          />
          <TouchableOpacity className="w-6 h-full items-center justify-center bg-gray-50 border-l border-gray-200 flex-shrink-0" onPress={onCancel}>
            <X size={12} color="#dc2626" />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text className="text-center font-bold text-gray-800 text-sm">{computedValue}</Text>
          <TouchableOpacity onPress={() => onOverride(String(computedValue))} className="absolute -bottom-2 p-0.5 rounded" activeOpacity={0.7}>
            <Pencil size={11} color="#16a34a" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const ThGrouped = ({ theme = 'green' }: { theme?: 'green' | 'blue' }) => (
  <View style={{ width: 270 }} className={`flex-col border-r ${theme === 'green' ? 'border-[#cfe3da] bg-[#f0fdf4]' : 'border-blue-200 bg-blue-50'}`}>
    <View className={`border-b justify-center py-1.5 ${theme === 'green' ? 'border-[#cfe3da]' : 'border-blue-200'}`}>
      <Text className={`font-bold ${theme === 'green' ? 'text-[#1f3a30]' : 'text-blue-900'} text-xs text-center uppercase tracking-wider`}>Paid Amount</Text>
    </View>
    <View className="flex-row flex-1">
      <View style={{ width: 90 }} className={`justify-center border-r ${theme === 'green' ? 'border-[#cfe3da]' : 'border-blue-200'}`}>
        <Text className={`font-bold ${theme === 'green' ? 'text-[#1f3a30]' : 'text-blue-900'} text-[11px] text-center uppercase tracking-wider`}>Cash</Text>
      </View>
      <View style={{ width: 90 }} className={`justify-center border-r ${theme === 'green' ? 'border-[#cfe3da]' : 'border-blue-200'}`}>
        <Text className={`font-bold ${theme === 'green' ? 'text-[#1f3a30]' : 'text-blue-900'} text-[11px] text-center uppercase tracking-wider`}>UPI</Text>
      </View>
      <View style={{ width: 90 }} className="justify-center">
        <Text className={`font-bold ${theme === 'green' ? 'text-[#1f3a30]' : 'text-blue-900'} text-[11px] text-center uppercase tracking-wider`}>Bank</Text>
      </View>
    </View>
  </View>
);

const Td = ({ w, children, bg = 'bg-white', error }: { w: number; children: React.ReactNode; bg?: string; error?: string }) => (
  <View style={{ width: w }} className={`justify-start px-1.5 py-2 border-r border-[#e6ece9] ${bg}`}>
    {children}
    {error ? <Text className="text-red-500 text-[10px] mt-1 font-medium leading-[12px] whitespace-pre-wrap">{error}</Text> : null}
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
      className={`bg-white border ${error ? 'border-red-500' : 'border-[#d8e0dc]'} rounded px-2 py-1.5 text-sm text-center w-full h-10`}
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
  const route = useRoute<any>();
  const editDayBillId: string | undefined = route.params?.dayBillId;
  const isExistingBill = !!editDayBillId;
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [emptyBirdG, setEmptyBirdG] = useState('40');
  const [isWeightLossEditing, setIsWeightLossEditing] = useState(false);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([emptyPurchase()]);
  const [sales, setSales] = useState<SaleRow[]>([emptySale()]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([emptyExpense()]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  // New entry starts editable; existing bill opens as preview until Edit is pressed
  const [isEditing, setIsEditing] = useState(!editDayBillId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: parties } = useQuery({
    queryKey: ['parties'],
    queryFn: async () => (await client.get('/parties/')).data,
  });

  const { data: editBill, isLoading: editLoading } = useQuery({
    queryKey: ['dayBill', editDayBillId],
    queryFn: () => fetchDayBill(editDayBillId!),
    enabled: isExistingBill,
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
        if (res.data?.value != null && !isExistingBill) setEmptyBirdG(String(res.data.value));
      } catch {
        /* keep default */
      }
    })();
  }, [isExistingBill]);

  useEffect(() => {
    if (!isExistingBill || !editBill || prefilled) return;
    setDate(String(editBill.date).split('T')[0]);
    setEmptyBirdG(String(editBill.empty_bird_weight_g ?? 40));
    setPurchases(
      editBill.purchases.length
        ? editBill.purchases.map((p) => {
          const emptyG = String(editBill.empty_bird_weight_g ?? 40);
          const overrides = inferPurchaseOverrides(p, emptyG);
          return {
            key: uid(),
            party_id: p.party_id || '',
            item_id: p.item_id || '',
            driver_id: p.driver_id || '',
            driver_name: p.driver_name || '',
            vehicle_number: p.vehicle_number || '',
            boxes: String(p.total_boxes || ''),
            birds_per_box: String(p.birds_per_box || ''),
            weighbridge_weight: String(p.weighbridge_weight || ''),
            purchase_rate: String(p.purchase_rate || ''),
            cash_payment: String(p.cash_payment || ''),
            upi_payment: String(p.upi_payment || ''),
            bank_payment: String(p.bank_payment || ''),
            ...overrides,
          };
        })
        : [emptyPurchase()]
    );
    setSales(
      editBill.sales.length
        ? editBill.sales.map((s) => {
          const emptyG = String(editBill.empty_bird_weight_g ?? 40);
          const overrides = inferSaleOverrides(s, emptyG);
          return {
            key: uid(),
            party_id: s.party_id || '',
            item_id: s.item_id || '',
            driver_id: s.driver_id || '',
            driver_name: s.driver_name || '',
            vehicle_number: s.vehicle_number || '',
            boxes: String(s.boxes || ''),
            birds_per_box: String(s.birds_per_box || ''),
            weighbridge_weight: String(s.weighbridge_weight || ''),
            weight_rate: String(s.weight_rate || ''),
            box_rate: String(s.box_rate || ''),
            cash_payment: String(s.cash_payment || ''),
            upi_payment: String(s.upi_payment || ''),
            bank_payment: String(s.bank_payment || ''),
            ...overrides,
          };
        })
        : [emptySale()]
    );
    setExpenses(
      editBill.expenses.length
        ? editBill.expenses.map((e) => ({
          key: uid(),
          category_id: e.category_id || '',
          expense_name: e.expense_name || '',
          cash_amount: String(e.cash_amount || ''),
          upi_amount: String(e.upi_amount || ''),
          note: e.note || '',
        }))
        : [emptyExpense()]
    );
    setPrefilled(true);
  }, [isExistingBill, editBill, prefilled]);

  const purchaseParties = useMemo(
    () => parties?.filter((p: any) => (p.type === 'PURCHASER' || p.type === 'BOTH') && p.is_active !== false) || [],
    [parties]
  );
  const saleParties = useMemo(
    () => parties?.filter((p: any) => (p.type === 'SALE' || p.type === 'BOTH') && p.is_active !== false) || [],
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

  const updatePurchase = (key: string, patch: Partial<PurchaseRow>) => {
    setPurchases((rows) =>
      rows.map((r) => {
        if (r.key !== key) return r;
        return { ...r, ...patch };
      })
    );
  };

  const updateSale = (key: string, patch: Partial<SaleRow>) => {
    setSales((rows) =>
      rows.map((r) => {
        if (r.key !== key) return r;
        return { ...r, ...patch };
      })
    );
  };

  const updateExpense = (key: string, patch: Partial<ExpenseRow>) => {
    setExpenses((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  useEffect(() => {
    // We no longer manually sync net_weight in state when emptyBirdG changes
    // because d.net dynamically calculates it on render, and OverrideableField displays d.net.
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
      const d = deriveSale(r, emptyBirdG);
      if (!r.party_id) errs[`s-${r.key}-party`] = 'Required';
      if (!r.driver_id && !r.driver_name) errs[`s-${r.key}-driver`] = 'Required';
      if (!r.vehicle_number) errs[`s-${r.key}-vehicle`] = 'Required';
      else if (!VEHICLE_REGEX.test(r.vehicle_number)) errs[`s-${r.key}-vehicle`] = 'Format XX-00-XX-0000';
      if (parseIntSafe(r.boxes) <= 0) errs[`s-${r.key}-boxes`] = 'Required';
      if (parseNum(r.weighbridge_weight) <= 0) errs[`s-${r.key}-weigh`] = 'Required';
      if (parseNum(r.weight_rate) <= 0) errs[`s-${r.key}-rate`] = 'Required';
      if (parseNum(r.box_rate) <= 0) errs[`s-${r.key}-box_rate`] = 'Required';
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

    // Item-level cross-validation
    const purchaseByItem: Record<string, { birds: number; weight: number }> = {};
    filledP.forEach((r) => {
      if (r.item_id) {
        if (!purchaseByItem[r.item_id]) purchaseByItem[r.item_id] = { birds: 0, weight: 0 };
        purchaseByItem[r.item_id].birds += derivePurchase(r, emptyBirdG).birds;
        purchaseByItem[r.item_id].weight += parseNum(r.weighbridge_weight);
      }
    });

    const saleByItem: Record<string, { birds: number; weight: number }> = {};
    filledS.forEach((r) => {
      if (r.item_id) {
        if (!saleByItem[r.item_id]) saleByItem[r.item_id] = { birds: 0, weight: 0 };
        saleByItem[r.item_id].birds += deriveSale(r, emptyBirdG).birds;
        saleByItem[r.item_id].weight += parseNum(r.weighbridge_weight);
      }
    });

    for (const itemId of Object.keys(saleByItem)) {
      const p = purchaseByItem[itemId] || { birds: 0, weight: 0 };
      const s = saleByItem[itemId];

      if (s.birds > p.birds) {
        filledS.forEach((r) => { if (r.item_id === itemId) errs[`s-${r.key}-item`] = `Sale birds (${s.birds}) > Purchase birds (${p.birds})`; });
      }
      if (s.weight > p.weight) {
        filledS.forEach((r) => { if (r.item_id === itemId) errs[`s-${r.key}-item`] = `Sale Wt (${s.weight}) > Purchase Wt (${p.weight})`; });
      }
    }

    setRowErrors(errs);
    if (Object.keys(errs).length > 0) {
      setErrorMsg('Below Fields are Required');
      return false;
    }

    setErrorMsg('');
    return true;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const filledP = purchases.filter(isPurchaseFilled);
      const filledS = sales.filter(isSaleFilled);
      const filledE = expenses.filter(isExpenseFilled);

      const payload = {
        date,
        empty_bird_weight_g: parseNum(emptyBirdG) || 40,
        purchases: filledP.map((r) => {
          const d = derivePurchase(r, emptyBirdG);
          return {
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
          };
        }),
        sales: filledS.map((r) => {
          const d = deriveSale(r, emptyBirdG);
          const weightAmount = d.net * parseNum(r.weight_rate);
          const boxAmount = parseIntSafe(r.boxes) * parseNum(r.box_rate);
          return {
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
          };
        }),
        expenses: filledE.map((r) => {
          const cat = categories?.find((c) => c.id === r.category_id);
          return {
            category_id: r.category_id,
            expense_name: r.expense_name || cat?.name || 'Expense',
            cash_amount: parseNum(r.cash_amount),
            upi_amount: parseNum(r.upi_amount),
            note: r.note || undefined,
          };
        }),
      };

      return isExistingBill && editDayBillId
        ? await updateDayBill(editDayBillId, payload)
        : await createDayBill(payload);
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expensesHistory'] });
      queryClient.invalidateQueries({ queryKey: ['expensesByBill'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['dayBills'] });
      queryClient.invalidateQueries({ queryKey: ['dayBill', editDayBillId] });

      setSuccessMsg(`${isExistingBill ? 'Updated' : 'Saved'} as ${created.bill_number}`);
      setErrorMsg('');
      // Always leave the screen after save/update (same pattern as NewPurchaseScreen).
      setTimeout(() => {
        if (navigation.canGoBack()) navigation.goBack();
        else navigation.navigate('MainTabs', { screen: 'Bill' });
      }, 800);
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail;
      setErrorMsg(typeof detail === 'string' ? detail : e?.message || 'Save failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!editDayBillId) throw new Error('Missing bill id');
      await deleteDayBill(editDayBillId);
    },
    onSuccess: () => {
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['dayBills'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expensesByBill'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      if (Platform.OS === 'web') {
        navigation.goBack();
      } else {
        Alert.alert('Deleted', 'Bill deleted successfully', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    },
    onError: (e: any) => {
      setShowDeleteConfirm(false);
      const detail = e?.response?.data?.detail;
      setErrorMsg(typeof detail === 'string' ? detail : e?.message || 'Failed to delete bill');
    },
  });

  const handleSave = () => {
    if (!validate()) return;
    saveMutation.mutate();
  };

  const SummaryCards = ({ items, theme = 'green' }: {
    items: { label: string; value: string; danger?: boolean; icon: any }[];
    theme?: 'green' | 'blue';
  }) => {
    const iconBg = theme === 'green' ? 'bg-[#dcfce7]' : 'bg-blue-100';
    const iconColor = theme === 'green' ? '#166534' : '#1e3a8a';
    return (
      <View className="flex-row flex-wrap p-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        {items.map((it, idx) => {
          const Icon = it.icon;
          return (
            <View key={idx} className="w-1/3 p-2">
              <View className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 h-full">
                <View className="flex-row items-center mb-2">
                  <View className={`${iconBg} p-1.5 rounded-md mr-2`}>
                    <Icon size={16} color={iconColor} />
                  </View>
                  <Text className="text-[10px] font-bold text-gray-500 uppercase flex-1" numberOfLines={1}>{it.label}</Text>
                </View>
                <Text className={`text-base font-bold ${it.danger ? 'text-red-600' : 'text-gray-900'}`}>{it.value}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderPurchaseRow = (r: PurchaseRow, index: number) => {
    const d = derivePurchase(r, emptyBirdG);
    const driver = activeDrivers.find((x: any) => x.id === r.driver_id);
    return (
      <View key={r.key} className="flex-row border-b border-[#e6ece9] bg-white" style={{ zIndex: 100 - index }}>
        {rowErrors[`p-${r.key}`] ? (
          <View className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 z-50" />
        ) : null}
        <Td w={180} error={rowErrors[`p-${r.key}-party`]}>
          <PartySearchDropdown
            parties={purchaseParties}
            value={r.party_id}
            onSelect={(id: string) => updatePurchase(r.key, { party_id: id })}
            placeholder="Select party"
            error={!!rowErrors[`p-${r.key}-party`]}
            onDropdownOpen={(isOpen: boolean) => setActiveDropdownId(isOpen ? `p-party-${r.key}` : null)}
          />
        </Td>
        <Td w={140}>
          <ItemSearchDropdown
            items={activeItems}
            value={r.item_id}
            onSelect={(id: string) => updatePurchase(r.key, { item_id: id })}
            placeholder="Select item"
            onDropdownOpen={(isOpen: boolean) => setActiveDropdownId(isOpen ? `p-item-${r.key}` : null)}
          />
        </Td>
        <Td w={180} error={rowErrors[`p-${r.key}-driver`]}>
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
            onDropdownOpen={(isOpen: boolean) => setActiveDropdownId(isOpen ? `p-driver-${r.key}` : null)}
          />
        </Td>
        <Td w={150} error={rowErrors[`p-${r.key}-vehicle`]}>
          <TextInput
            className={`bg-white border ${rowErrors[`p-${r.key}-vehicle`] ? 'border-red-500' : 'border-[#d8e0dc]'} rounded px-2 py-1.5 text-sm w-full h-10 uppercase`}
            value={r.vehicle_number}
            onChangeText={(t) => updatePurchase(r.key, { vehicle_number: formatVehicleInput(t) })}
            placeholder="TN-52-AB-1234"
          />
        </Td>
        <Td w={70} error={rowErrors[`p-${r.key}-boxes`]}><NumInput value={r.boxes} onChangeText={(v) => updatePurchase(r.key, { boxes: v })} error={!!rowErrors[`p-${r.key}-boxes`]} /></Td>
        <Td w={100} error={rowErrors[`p-${r.key}-bpb`]}><NumInput value={r.birds_per_box} onChangeText={(v) => updatePurchase(r.key, { birds_per_box: v })} error={!!rowErrors[`p-${r.key}-bpb`]} /></Td>
        <Td w={90} bg="bg-[#f7faf8]">
          <OverrideableField
            value={r.birds_override}
            computedValue={d.birds}
            isManual={r.birds_manual}
            onOverride={(v: string) => updatePurchase(r.key, { birds_override: v, birds_manual: true })}
            onCancel={() => updatePurchase(r.key, { birds_manual: false })}
            isEditing={isEditing}
          />
        </Td>
        <Td w={90} error={rowErrors[`p-${r.key}-weigh`]}><NumInput value={r.weighbridge_weight} onChangeText={(v) => updatePurchase(r.key, { weighbridge_weight: v, net_manual: false })} error={!!rowErrors[`p-${r.key}-weigh`]} /></Td>
        <Td w={100} bg="bg-white">
          <OverrideableField
            value={r.net_weight}
            computedValue={Number(d.net).toFixed(2)}
            isManual={r.net_manual}
            onOverride={(v: string) => updatePurchase(r.key, { net_weight: v, net_manual: true })}
            onCancel={() => updatePurchase(r.key, { net_manual: false })}
            isEditing={isEditing}
          />
        </Td>
        <Td w={80} bg="bg-[#f7faf8]"><View className="h-10 justify-center"><Text className="text-center font-bold text-gray-800 text-sm">{d.avgWt.toFixed(3)}</Text></View></Td>
        <Td w={80} error={rowErrors[`p-${r.key}-rate`]}><NumInput value={r.purchase_rate} onChangeText={(v) => updatePurchase(r.key, { purchase_rate: v })} error={!!rowErrors[`p-${r.key}-rate`]} /></Td>
        <Td w={110} bg="bg-[#f7faf8]">
          <OverrideableField
            value={r.amount_override}
            computedValue={Number(d.amount).toFixed(2)}
            isManual={r.amount_manual}
            onOverride={(v: string) => updatePurchase(r.key, { amount_override: v, amount_manual: true })}
            onCancel={() => updatePurchase(r.key, { amount_manual: false })}
            isEditing={isEditing}
          />
        </Td>
        <Td w={90}><NumInput value={r.cash_payment} onChangeText={(v) => updatePurchase(r.key, { cash_payment: v })} /></Td>
        <Td w={90}><NumInput value={r.upi_payment} onChangeText={(v) => updatePurchase(r.key, { upi_payment: v })} /></Td>
        <Td w={90}><NumInput value={r.bank_payment} onChangeText={(v) => updatePurchase(r.key, { bank_payment: v })} /></Td>
        <Td w={100} bg="bg-[#f7faf8]"><View className="h-10 justify-center"><Text className="text-center font-bold text-[#c0392b] text-sm">{formatMoney(d.balance)}</Text></View></Td>
        <Td w={50}>
          {isEditing ? (
            <TouchableOpacity onPress={() => setPurchases((rows) => (rows.length <= 1 ? [emptyPurchase()] : rows.filter((x) => x.key !== r.key)))} className="w-7 h-7 rounded bg-[#fdeceb] border border-[#f3c9c4] items-center justify-center mx-auto">
              <Trash2 size={13} color="#c0392b" />
            </TouchableOpacity>
          ) : null}
        </Td>
      </View>
    );
  };

  const purchasedItemIds = new Set(purchases.filter((p) => p.item_id).map((p) => p.item_id));
  const availableSaleItems = activeItems.filter((item: any) => purchasedItemIds.has(item.id));

  const renderSaleRow = (r: SaleRow, index: number) => {
    const d = deriveSale(r, emptyBirdG);
    const driver = activeDrivers.find((x: any) => x.id === r.driver_id);
    return (
      <View key={r.key} className="flex-row border-b border-[#e6ece9] bg-white" style={{ zIndex: 100 - index }}>
        {rowErrors[`s-${r.key}`] ? (
          <View className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 z-50" />
        ) : null}
        <Td w={180} error={rowErrors[`s-${r.key}-party`]}>
          <PartySearchDropdown
            parties={saleParties}
            value={r.party_id}
            onSelect={(id: string) => updateSale(r.key, { party_id: id })}
            placeholder="Select party"
            error={!!rowErrors[`s-${r.key}-party`]}
            onDropdownOpen={(isOpen: boolean) => setActiveDropdownId(isOpen ? `s-party-${r.key}` : null)}
          />
        </Td>
        <Td w={140} error={rowErrors[`s-${r.key}-item`]}>
          <ItemSearchDropdown
            items={availableSaleItems}
            value={r.item_id}
            onSelect={(id: string) => updateSale(r.key, { item_id: id })}
            placeholder="Select item"
            onDropdownOpen={(isOpen: boolean) => setActiveDropdownId(isOpen ? `s-item-${r.key}` : null)}
          />
        </Td>
        <Td w={180} error={rowErrors[`s-${r.key}-driver`]}>
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
            onDropdownOpen={(isOpen: boolean) => setActiveDropdownId(isOpen ? `s-driver-${r.key}` : null)}
          />
        </Td>
        <Td w={150} error={rowErrors[`s-${r.key}-vehicle`]}>
          <TextInput
            className={`bg-white border ${rowErrors[`s-${r.key}-vehicle`] ? 'border-red-500' : 'border-[#d8e0dc]'} rounded px-2 py-1.5 text-sm w-full h-10 uppercase`}
            value={r.vehicle_number}
            onChangeText={(t) => updateSale(r.key, { vehicle_number: formatVehicleInput(t) })}
            placeholder="TN-52-AB-1234"
          />
        </Td>
        <Td w={70} error={rowErrors[`s-${r.key}-boxes`]}><NumInput value={r.boxes} onChangeText={(v) => updateSale(r.key, { boxes: v })} error={!!rowErrors[`s-${r.key}-boxes`]} /></Td>
        <Td w={100}><NumInput value={r.birds_per_box} onChangeText={(v) => updateSale(r.key, { birds_per_box: v })} /></Td>
        <Td w={90} bg="bg-[#f7faf8]">
          <OverrideableField
            value={r.birds_override}
            computedValue={d.birds}
            isManual={r.birds_manual}
            onOverride={(v: string) => updateSale(r.key, { birds_override: v, birds_manual: true })}
            onCancel={() => updateSale(r.key, { birds_manual: false })}
            isEditing={isEditing}
          />
        </Td>
        <Td w={90} error={rowErrors[`s-${r.key}-weigh`]}><NumInput value={r.weighbridge_weight} onChangeText={(v) => updateSale(r.key, { weighbridge_weight: v, net_manual: false })} error={!!rowErrors[`s-${r.key}-weigh`]} /></Td>
        <Td w={100} bg="bg-white" error={rowErrors[`s-${r.key}-net`]}>
          <OverrideableField
            value={r.net_weight}
            computedValue={Number(d.net).toFixed(2)}
            isManual={r.net_manual}
            onOverride={(v: string) => updateSale(r.key, { net_weight: v, net_manual: true })}
            onCancel={() => updateSale(r.key, { net_manual: false })}
            isEditing={isEditing}
            error={!!rowErrors[`s-${r.key}-net`]}
          />
        </Td>
        <Td w={80} error={rowErrors[`s-${r.key}-rate`]}><NumInput value={r.weight_rate} onChangeText={(v) => updateSale(r.key, { weight_rate: v })} error={!!rowErrors[`s-${r.key}-rate`]} /></Td>
        <Td w={80} error={rowErrors[`s-${r.key}-box_rate`]}><NumInput value={r.box_rate} onChangeText={(v) => updateSale(r.key, { box_rate: v })} error={!!rowErrors[`s-${r.key}-box_rate`]} /></Td>
        <Td w={110} bg="bg-[#f7faf8]">
          <OverrideableField
            value={r.amount_override}
            computedValue={Number(d.invoice).toFixed(2)}
            isManual={r.amount_manual}
            onOverride={(v: string) => updateSale(r.key, { amount_override: v, amount_manual: true })}
            onCancel={() => updateSale(r.key, { amount_manual: false })}
            isEditing={isEditing}
          />
        </Td>
        <Td w={90}><NumInput value={r.cash_payment} onChangeText={(v) => updateSale(r.key, { cash_payment: v })} /></Td>
        <Td w={90}><NumInput value={r.upi_payment} onChangeText={(v) => updateSale(r.key, { upi_payment: v })} /></Td>
        <Td w={90}><NumInput value={r.bank_payment} onChangeText={(v) => updateSale(r.key, { bank_payment: v })} /></Td>
        <Td w={100} bg="bg-[#f7faf8]"><View className="h-10 justify-center"><Text className="text-center font-bold text-[#c0392b] text-sm">{formatMoney(d.balance)}</Text></View></Td>
        <Td w={50}>
          {isEditing ? (
            <TouchableOpacity onPress={() => setSales((rows) => (rows.length <= 1 ? [emptySale()] : rows.filter((x) => x.key !== r.key)))} className="w-7 h-7 rounded bg-[#fdeceb] border border-[#f3c9c4] items-center justify-center mx-auto">
              <Trash2 size={13} color="#c0392b" />
            </TouchableOpacity>
          ) : null}
        </Td>
      </View>
    );
  };

  const renderExpenseRow = (r: ExpenseRow, index: number) => {
    const d = deriveExpense(r);
    const catError = !!rowErrors[`e-${r.key}-cat`];

    return (
      <View key={r.key} className="flex-row border-b border-[#cfe3da] bg-white" style={{ zIndex: 100 - index }}>
        {rowErrors[`e-${r.key}`] ? (
          <View className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 z-50" />
        ) : null}
        <Td w={200} error={rowErrors[`e-${r.key}-cat`]}>
          <CategorySearchDropdown
            categories={categories}
            value={r.category_id}
            textValue={r.expense_name}
            onSelect={(id: string) => {
              const cat = categories?.find((c: any) => c.id === id);
              updateExpense(r.key, {
                category_id: id,
                expense_name: cat ? cat.name : r.expense_name,
              });
              setRowErrors((prev) => {
                const next = { ...prev };
                delete next[`e-${r.key}-cat`];
                delete next[`e-${r.key}`];
                return next;
              });
            }}
            onTextChange={(text: string) => {
              updateExpense(r.key, { expense_name: text });
            }}
            placeholder="Search category..."
            error={catError}
            onDropdownOpen={(isOpen: boolean) => setActiveDropdownId(isOpen ? `e-cat-${r.key}` : null)}
          />
        </Td>
        <Td w={100}><NumInput value={r.cash_amount} onChangeText={(v) => updateExpense(r.key, { cash_amount: v })} error={!!rowErrors[`e-${r.key}-amt`]} /></Td>
        <Td w={100}><NumInput value={r.upi_amount} onChangeText={(v) => updateExpense(r.key, { upi_amount: v })} error={!!rowErrors[`e-${r.key}-amt`]} /></Td>
        <Td w={100} bg="bg-[#f7faf8]">
          <View className="h-10 justify-center">
            <Text className="text-center font-bold text-gray-800 text-sm">{formatMoney(d.total)}</Text>
          </View>
        </Td>
        <Td w={180}>
          <TextInput
            className="bg-white border border-[#d8e0dc] rounded px-2 py-1.5 text-sm w-full h-10"
            value={r.note}
            onChangeText={(v) => updateExpense(r.key, { note: v })}
            placeholder="Optional"
          />
        </Td>
        <Td w={50}>
          {isEditing ? (
            <TouchableOpacity onPress={() => setExpenses((rows) => (rows.length <= 1 ? [emptyExpense()] : rows.filter((x) => x.key !== r.key)))} className="items-center justify-center p-1.5 bg-red-50 rounded">
              <Trash2 size={16} color="#c0392b" />
            </TouchableOpacity>
          ) : null}
        </Td>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f4f7f5]">
      <View className="px-4 py-3 bg-[#0b4d3a] flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 pr-2">
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs'))} className="mr-3">
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-white tracking-wide" numberOfLines={1}>
            {isExistingBill
              ? `${isEditing ? 'EDIT BILL' : 'BILL'}${editBill?.bill_number ? ` · ${editBill.bill_number}` : ''}`
              : 'BILL ENTRY'}
          </Text>
        </View>
        {isExistingBill && !isEditing ? (
          <TouchableOpacity
            onPress={() => {
              setErrorMsg('');
              setSuccessMsg('');
              setIsEditing(true);
            }}
            className="px-3 py-2 bg-[#1a7a52] rounded-full flex-row items-center"
          >
            <Pencil size={14} color="#fff" />
            <Text className="text-white text-xs font-bold ml-1">Edit</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {isExistingBill && editLoading && !prefilled ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0b4d3a" />
        </View>
      ) : (
        <KeyboardAwareScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: (isEditing ? 120 : 40) + (activeDropdownId?.startsWith('e-') ? 150 : 0) }}
          enableOnAndroid
          extraScrollHeight={120}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            {/* Meta */}
            <View pointerEvents={isEditing ? 'auto' : 'none'} className="bg-white mx-3 mt-4 px-4 py-3 border border-gray-200 rounded-lg flex-row flex-wrap gap-3 items-end">
              <View>
                <FieldLabel>Date</FieldLabel>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm min-w-[140px]"
                    style={{ outline: 'none', backgroundColor: 'white', color: isEditing ? '#1f2937' : '#9ca3af' }}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={!isEditing}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      onPress={() => isEditing && setShowDatePicker(true)}
                      className="border border-gray-300 rounded-md px-3 py-2 bg-white min-w-[140px]"
                    >
                      <Text className="text-sm">{formatDateToDDMMYYYY(date)}</Text>
                    </TouchableOpacity>
                    {showDatePicker && isEditing && (
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
                <FieldLabel>Weight Loss</FieldLabel>
                <View className={`flex-row items-center border ${isEditing && isWeightLossEditing ? 'border-gray-300' : 'border-transparent bg-gray-50'} rounded-md overflow-hidden`}>
                  <TextInput
                    className={`px-2 py-1.5 text-sm w-12 text-center ${!isWeightLossEditing ? 'text-gray-500' : 'bg-white'}`}
                    style={{ outline: 'none' } as any}
                    value={emptyBirdG}
                    onChangeText={setEmptyBirdG}
                    keyboardType="number-pad"
                    editable={isEditing && isWeightLossEditing}
                  />
                  <View className="bg-gray-100 border-l border-gray-300 px-2 py-1.5 h-full justify-center">
                    <Text className="text-gray-500 text-xs font-bold">g</Text>
                  </View>
                  {isEditing && !isWeightLossEditing && (
                    <TouchableOpacity onPress={() => setIsWeightLossEditing(true)} className="px-2 border-l border-gray-200 h-full justify-center">
                      <Pencil size={12} color="#16a34a" />
                    </TouchableOpacity>
                  )}
                  {isEditing && isWeightLossEditing && (
                    <TouchableOpacity onPress={() => { setIsWeightLossEditing(false); setEmptyBirdG('40'); }} className="px-2 border-l border-gray-200 h-full justify-center">
                      <X size={14} color="#dc2626" />
                    </TouchableOpacity>
                  )}
                </View>
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
            <View className="mt-4 mx-3 rounded-lg border border-[#cfe3da] bg-white shadow-sm" style={{ zIndex: 30 }}>
              <View className="bg-white px-4 py-3 flex-row justify-between items-center rounded-t-lg border-b border-[#cfe3da]">
                <View className="flex-row items-center">
                  <View className="bg-[#dcfce7] p-1.5 rounded-md mr-2">
                    <ShoppingCart size={18} color="#166534" />
                  </View>
                  <Text className="text-[#166534] font-bold text-sm tracking-wide">PURCHASES</Text>
                </View>
                {isEditing ? (
                  <TouchableOpacity onPress={() => setPurchases((rows) => [...rows, emptyPurchase()])} className="bg-[#1a7a52] px-3 py-1.5 rounded-md flex-row items-center">
                    <Plus size={14} color="#fff" />
                    <Text className="text-white text-xs font-bold ml-1">Add Purchase</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={true} keyboardShouldPersistTaps="handled" style={{ zIndex: 10 }} contentContainerStyle={{ paddingBottom: activeDropdownId?.startsWith('p-') ? 150 : 28 }}>
                <View pointerEvents={isEditing ? 'auto' : 'none'}>
                  {/* Header */}
                  <View className="flex-row border-b border-[#cfe3da] bg-[#e8f3ee]">
                    <Th w={180}>Party</Th>
                    <Th w={140}>Item</Th>
                    <Th w={180}>Driver</Th>
                    <Th w={150}>Vehicle</Th>
                    <Th w={70}>Boxes</Th>
                    <Th w={100}>Birds/Box</Th>
                    <Th w={90}>Tot Birds</Th>
                    <Th w={90}>Weigh Wt</Th>
                    <Th w={100}>Net Kg</Th>
                    <Th w={80}>Avg Wt</Th>
                    <Th w={80}>Rate/Kg</Th>
                    <Th w={110}>Amount</Th>
                    <ThGrouped theme="green" />
                    <Th w={100}>Balance</Th>
                    <Th w={50}>Act</Th>
                  </View>
                  <View>{purchases.map(renderPurchaseRow)}</View>
                </View>
              </ScrollView>
              <SummaryCards
                theme="green"
                items={[
                  { label: 'Purchases', value: String(summary.purchaseCount), icon: ShoppingCart },
                  { label: 'Birds', value: summary.purchaseBirds.toLocaleString('en-IN'), icon: Bird },
                  { label: 'Net Weight', value: `${formatMoney(summary.purchaseNetSum)} Kg`, icon: Scale },
                  { label: 'Amount', value: formatMoney(summary.purchaseAmountSum), icon: IndianRupee },
                  { label: 'Paid', value: formatMoney(summary.purchasePaidSum), icon: Wallet },
                  { label: 'Balance', value: formatMoney(summary.purchaseBalanceSum), danger: true, icon: Landmark },
                ]}
              />
            </View>

            {/* Sales */}
            <View className="mt-4 mx-3 rounded-lg border border-blue-200 bg-white shadow-sm" style={{ zIndex: 20 }}>
              <View className="bg-white px-4 py-3 flex-row justify-between items-center rounded-t-lg border-b border-blue-200">
                <View className="flex-row items-center">
                  <View className="bg-blue-100 p-1.5 rounded-md mr-2">
                    <ShoppingCart size={18} color="#1e3a8a" />
                  </View>
                  <Text className="text-blue-900 font-bold text-sm tracking-wide">SALES</Text>
                </View>
                {isEditing ? (
                  <TouchableOpacity onPress={() => setSales((rows) => [...rows, emptySale()])} className="bg-blue-600 px-3 py-1.5 rounded-md flex-row items-center">
                    <Plus size={14} color="#fff" />
                    <Text className="text-white text-xs font-bold ml-1">Add Sale</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={true} keyboardShouldPersistTaps="handled" style={{ zIndex: 10 }} contentContainerStyle={{ paddingBottom: activeDropdownId?.startsWith('s-') ? 150 : 32 }}>
                <View pointerEvents={isEditing ? 'auto' : 'none'}>
                  <View className="flex-row border-b border-blue-200 bg-blue-50">
                    <Th w={180} theme="blue">Party</Th>
                    <Th w={140} theme="blue">Item</Th>
                    <Th w={180} theme="blue">Driver</Th>
                    <Th w={150} theme="blue">Vehicle</Th>
                    <Th w={70} theme="blue">Boxes</Th>
                    <Th w={100} theme="blue">Birds/Box</Th>
                    <Th w={90} theme="blue">Tot Birds</Th>
                    <Th w={90} theme="blue">Weigh Wt</Th>
                    <Th w={100} theme="blue">Net Kg</Th>
                    <Th w={80} theme="blue">Rate/Kg</Th>
                    <Th w={80} theme="blue">Box Rate</Th>
                    <Th w={110} theme="blue">Invoice</Th>
                    <ThGrouped theme="blue" />
                    <Th w={100} theme="blue">Balance</Th>
                    <Th w={50} theme="blue">Act</Th>
                  </View>
                  <View>{sales.map(renderSaleRow)}</View>
                </View>
              </ScrollView>
              <SummaryCards
                theme="blue"
                items={[
                  { label: 'Sales', value: String(summary.saleCount), icon: ShoppingCart },
                  { label: 'Birds', value: summary.saleBirds.toLocaleString('en-IN'), icon: Bird },
                  { label: 'Net Weight', value: `${formatMoney(summary.saleNetSum)} Kg`, icon: Scale },
                  { label: 'Invoice', value: formatMoney(summary.saleInvoiceSum), icon: IndianRupee },
                  { label: 'Received', value: formatMoney(summary.totalReceived), icon: Wallet },
                  { label: 'Balance', value: formatMoney(summary.saleBalanceSum), danger: true, icon: Landmark },
                ]}
              />
            </View>

            {/* Expenses + Summary */}
            <View className={`mt-4 mx-3 ${isWide ? 'flex-row gap-3' : ''}`} style={{ zIndex: 10 }}>
              <View className={`${isWide ? 'flex-1' : 'mb-3'} rounded-lg border border-[#cfe3da] bg-white`}>
                <View className="bg-[#0b4d3a] px-4 py-2.5 flex-row justify-between items-center rounded-t-lg">
                  <Text className="text-white font-bold text-sm">EXPENSES</Text>
                  {isEditing ? (
                    <TouchableOpacity onPress={() => setExpenses((rows) => [...rows, emptyExpense()])} className="bg-[#1a7a52] px-3 py-1.5 rounded-md flex-row items-center">
                      <Plus size={14} color="#fff" />
                      <Text className="text-white text-xs font-bold ml-1">Add</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={true} keyboardShouldPersistTaps="handled" style={{ zIndex: 10 }} contentContainerStyle={{ paddingBottom: activeDropdownId?.startsWith('e-') ? 150 : 20 }}>
                  <View pointerEvents={isEditing ? 'auto' : 'none'}>
                    <View className="flex-row border-b border-[#cfe3da] bg-[#e8f3ee]">
                      <Th w={200}>Expense Name *</Th>
                      <Th w={100}>Cash</Th>
                      <Th w={100}>UPI</Th>
                      <Th w={100}>Total</Th>
                      <Th w={180}>Note</Th>
                      <Th w={50}>Act</Th>
                    </View>
                    <View>{expenses.map(renderExpenseRow)}</View>
                  </View>
                </ScrollView>
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
                    <View className="flex-row justify-between border-b border-gray-100 pb-2 mb-1">
                      <Text className="text-sm font-semibold text-gray-700">Profit / Loss</Text>
                      <Text className={`text-sm font-bold ${summary.profit < 0 ? 'text-red-600' : 'text-[#1a7a52]'}`}>
                        {formatMoney(summary.profit)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-sm font-semibold text-gray-700">Total Remaining Weight</Text>
                      <Text className="text-sm font-bold text-[#0b4d3a]">{formatMoney(summary.remainingWeight)} Kg</Text>
                    </View>
                  </View>
                  <View className="w-1/2 pl-2 gap-2">
                    <View className="flex-row justify-between">
                      <Text className="text-sm font-semibold text-gray-700">Cash Received</Text>
                      <Text className="text-sm font-bold">{formatMoney(summary.saleCash)}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-sm font-semibold text-gray-700">UPI Received</Text>
                      <Text className="text-sm font-bold">{formatMoney(summary.saleUpi)}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-sm font-semibold text-gray-700">Bank Received</Text>
                      <Text className="text-sm font-bold">{formatMoney(summary.saleBank)}</Text>
                    </View>
                    <View className="flex-row justify-between border-t border-gray-100 pt-2 mt-1">
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
          </View>
        </KeyboardAwareScrollView>
      )}

      {isEditing ? (
        <View className="absolute bottom-0 left-0 right-0 bg-[#f4f7f5] border-t border-gray-200 px-4 py-3 flex-row justify-end gap-2">
          <TouchableOpacity
            onPress={() => {
              if (isExistingBill) {
                setIsEditing(false);
                setErrorMsg('');
                setSuccessMsg('');
                setPrefilled(false);
              } else if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('MainTabs');
              }
            }}
            className="bg-gray-200 px-4 py-3 rounded-md"
          >
            <Text className="text-gray-800 font-bold text-sm">Cancel</Text>
          </TouchableOpacity>
          {isExistingBill ? (
            <TouchableOpacity
              onPress={() => {
                setErrorMsg('');
                setShowDeleteConfirm(true);
              }}
              className="bg-[#c0392b] px-4 py-3 rounded-md flex-row items-center"
            >
              <Trash2 size={16} color="#fff" />
              <Text className="text-white font-bold text-sm ml-2">Delete</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saveMutation.isPending || (isExistingBill && editLoading && !prefilled)}
            className="bg-[#0b4d3a] px-4 py-3 rounded-md flex-row items-center"
          >
            {saveMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Save size={16} color="#fff" />}
            <Text className="text-white font-bold text-sm ml-2">{isExistingBill ? 'Update Bill' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ConfirmModal
        isVisible={showDeleteConfirm}
        title="Delete Bill"
        message="Are you sure you want to delete this bill? This will remove all linked purchases, sales, and expenses, and restore party balances."
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        isDestructive
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          if (!deleteMutation.isPending) deleteMutation.mutate();
        }}
      />
    </SafeAreaView>
  );
}
