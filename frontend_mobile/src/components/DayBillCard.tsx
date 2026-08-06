import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { formatDateToDDMMYYYY } from '../utils/formatDate';
import { DayBillListItem } from '../api/dayBills';

function money(n: number) {
  return (Number.isFinite(n) ? n : 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function DayBillCard({ bill, onPress }: { bill: DayBillListItem; onPress?: () => void }) {
  const purchaseEntries = bill.purchase_entries ?? bill.purchase_names?.length ?? 0;
  const saleEntries = bill.sale_entries ?? bill.sale_names?.length ?? 0;
  const purchaseItems = bill.purchase_item_names?.length
    ? bill.purchase_item_names.join(', ')
    : '—';
  const saleItems = bill.sale_item_names?.length ? bill.sale_item_names.join(', ') : '—';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
      className="bg-white rounded-lg border border-gray-200 shadow-sm mb-2 overflow-hidden"
    >
      <View className="bg-[#e8f3ee] px-2.5 py-1.5 flex-row justify-between items-center border-b border-gray-200">
        <Text className="text-[#0b4d3a] text-xs font-bold">{formatDateToDDMMYYYY(bill.date)}</Text>
        <Text className="text-[#0b4d3a] font-bold text-xs">{bill.bill_number}</Text>
      </View>

      <View className="flex-row">
        {/* PURCHASE */}
        <View className="flex-1 p-2.5 pt-2 border-r border-gray-200">
          <Text className="text-[10px] text-[#1a7a52] font-black uppercase tracking-widest mb-2 border-b border-[#e8f3ee] pb-1">Purchase</Text>
          <View className="flex-row">
            <View className="flex-1 pr-3">
            <Text className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Party</Text>
            <Text className="text-sm font-bold text-gray-900 mb-3 leading-tight" numberOfLines={1}>
              {bill.purchase_names?.join(', ') || '—'}
            </Text>

            <Text className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Items</Text>
            {bill.purchase_item_names?.length ? (
              <View className="bg-[#e8f3ee] px-2 py-1 rounded-md self-start">
                <Text className="text-[11px] font-bold text-[#1a7a52]" numberOfLines={1}>
                  {purchaseItems}
                </Text>
              </View>
            ) : (
              <Text className="text-sm font-bold text-gray-900">—</Text>
            )}
          </View>
          
          <View className="w-[45%] border-l border-gray-100 pl-3 justify-between">
            <View>
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="text-[11px] text-gray-500 font-medium">Net Kg</Text>
                <Text className="text-[11px] font-bold text-gray-900">{money(bill.purchase_net_kg)}</Text>
              </View>
              <View className="flex-row justify-between items-center pb-2 border-b border-gray-200 border-dashed">
                <Text className="text-[11px] text-gray-500 font-medium">Count</Text>
                <Text className="text-[11px] font-bold text-gray-900">{bill.purchase_count?.toLocaleString('en-IN') || 0}</Text>
              </View>
            </View>

            <View className="flex-row justify-between items-end mt-2">
              <Text className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Value</Text>
              <Text className="text-sm font-extrabold text-[#0b4d3a]">₹{money(bill.purchase_amount)}</Text>
            </View>
          </View>
          </View>
        </View>

        {/* SALE */}
        <View className="flex-1 p-2.5 pt-2">
          <Text className="text-[10px] text-[#2563eb] font-black uppercase tracking-widest mb-2 border-b border-blue-50 pb-1">Sale</Text>
          <View className="flex-row">
            <View className="flex-1 pr-3">
            <Text className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Party</Text>
            <Text className="text-sm font-bold text-gray-900 mb-3 leading-tight" numberOfLines={1}>
              {bill.sale_names?.join(', ') || '—'}
            </Text>

            <Text className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Items</Text>
            {bill.sale_item_names?.length ? (
              <View className="bg-[#e8f3ee] px-2 py-1 rounded-md self-start">
                <Text className="text-[11px] font-bold text-[#1a7a52]" numberOfLines={1}>
                  {saleItems}
                </Text>
              </View>
            ) : (
              <Text className="text-sm font-bold text-gray-900">—</Text>
            )}
          </View>
          
          <View className="w-[45%] border-l border-gray-100 pl-3 justify-between">
            <View>
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="text-[11px] text-gray-500 font-medium">Net Kg</Text>
                <Text className="text-[11px] font-bold text-gray-900">{money(bill.sale_net_kg)}</Text>
              </View>
              <View className="flex-row justify-between items-center pb-2 border-b border-gray-200 border-dashed">
                <Text className="text-[11px] text-gray-500 font-medium">Count</Text>
                <Text className="text-[11px] font-bold text-gray-900">{bill.sale_count?.toLocaleString('en-IN') || 0}</Text>
              </View>
            </View>

            <View className="flex-row justify-between items-end mt-2">
              <Text className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Value</Text>
              <Text className="text-sm font-extrabold text-[#0f5c45]">₹{money(bill.sale_amount)}</Text>
            </View>
          </View>
          </View>
        </View>
      </View>

      {bill.expense_total > 0 ? (
        <View className="bg-[#fcfaf8] px-2.5 py-1.5 border-t border-gray-200 flex-row justify-between items-center">
          <Text className="text-[10px] text-gray-500 font-bold tracking-wide uppercase">Expenses</Text>
          <Text className="text-xs font-extrabold text-gray-700">₹{money(bill.expense_total)}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
