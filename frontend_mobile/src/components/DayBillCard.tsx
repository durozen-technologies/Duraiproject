import React from 'react';
import { View, Text } from 'react-native';
import { formatDateToDDMMYYYY } from '../utils/formatDate';
import { DayBillListItem } from '../api/dayBills';

function money(n: number) {
  return (Number.isFinite(n) ? n : 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function DayBillCard({ bill }: { bill: DayBillListItem }) {
  const purchaseEntries = bill.purchase_entries ?? bill.purchase_names?.length ?? 0;
  const saleEntries = bill.sale_entries ?? bill.sale_names?.length ?? 0;
  const purchaseItems = bill.purchase_item_names?.length
    ? bill.purchase_item_names.join(', ')
    : '—';
  const saleItems = bill.sale_item_names?.length ? bill.sale_item_names.join(', ') : '—';

  return (
    <View className="bg-white rounded-xl border border-gray-200 shadow-sm mb-3 overflow-hidden">
      <View className="bg-[#0b4d3a] px-3 py-2.5 flex-row justify-between items-center">
        <Text className="text-white font-bold text-sm">{bill.bill_number}</Text>
        <Text className="text-white/90 text-xs font-semibold">{formatDateToDDMMYYYY(bill.date)}</Text>
      </View>

      <View className="flex-row">
        <View className="flex-1 p-3 border-r border-gray-100">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-[10px] font-bold text-[#0b4d3a] tracking-wider">PURCHASE</Text>
            <View className="bg-[#e8f3ee] px-2 py-0.5 rounded-full">
              <Text className="text-[10px] font-bold text-[#0b4d3a]">
                {purchaseEntries} {purchaseEntries === 1 ? 'entry' : 'entries'}
              </Text>
            </View>
          </View>
          <Text className="text-[10px] text-gray-500 font-semibold mb-0.5">Item</Text>
          <Text className="text-xs font-bold text-gray-900 mb-1" numberOfLines={2}>
            {purchaseItems}
          </Text>
          {bill.purchase_names?.length ? (
            <Text className="text-[10px] text-gray-500 mb-2" numberOfLines={2}>
              {bill.purchase_names.join(', ')}
            </Text>
          ) : (
            <View className="mb-2" />
          )}
          <View className="gap-1">
            <View className="flex-row justify-between">
              <Text className="text-[11px] text-gray-500">Net Kg</Text>
              <Text className="text-[11px] font-bold text-gray-800">{money(bill.purchase_net_kg)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[11px] text-gray-500">Count</Text>
              <Text className="text-[11px] font-bold text-gray-800">
                {bill.purchase_count?.toLocaleString('en-IN') || 0}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[11px] text-gray-500">Bill Value</Text>
              <Text className="text-[11px] font-bold text-gray-800">₹{money(bill.purchase_amount)}</Text>
            </View>
            <View className="flex-row justify-between mt-0.5">
              <Text className="text-[11px] font-semibold text-red-600">To Pay</Text>
              <Text className="text-[11px] font-bold text-red-600">₹{money(bill.purchase_to_pay)}</Text>
            </View>
          </View>
        </View>

        <View className="flex-1 p-3">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-[10px] font-bold text-[#0f5c45] tracking-wider">SALE</Text>
            <View className="bg-[#e8f3ee] px-2 py-0.5 rounded-full">
              <Text className="text-[10px] font-bold text-[#0f5c45]">
                {saleEntries} {saleEntries === 1 ? 'entry' : 'entries'}
              </Text>
            </View>
          </View>
          <Text className="text-[10px] text-gray-500 font-semibold mb-0.5">Item</Text>
          <Text className="text-xs font-bold text-gray-900 mb-1" numberOfLines={2}>
            {saleItems}
          </Text>
          {bill.sale_names?.length ? (
            <Text className="text-[10px] text-gray-500 mb-2" numberOfLines={2}>
              {bill.sale_names.join(', ')}
            </Text>
          ) : (
            <View className="mb-2" />
          )}
          <View className="gap-1">
            <View className="flex-row justify-between">
              <Text className="text-[11px] text-gray-500">Net Kg</Text>
              <Text className="text-[11px] font-bold text-gray-800">{money(bill.sale_net_kg)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[11px] text-gray-500">Count</Text>
              <Text className="text-[11px] font-bold text-gray-800">
                {bill.sale_count?.toLocaleString('en-IN') || 0}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[11px] text-gray-500">Bill Value</Text>
              <Text className="text-[11px] font-bold text-gray-800">₹{money(bill.sale_amount)}</Text>
            </View>
            <View className="flex-row justify-between mt-0.5">
              <Text className="text-[11px] font-semibold text-red-600">Pending Due</Text>
              <Text className="text-[11px] font-bold text-red-600">₹{money(bill.sale_pending)}</Text>
            </View>
          </View>
        </View>
      </View>

      {bill.expense_total > 0 ? (
        <View className="bg-gray-50 px-3 py-1.5 border-t border-gray-100 flex-row justify-between">
          <Text className="text-[11px] text-gray-500 font-semibold">Expenses</Text>
          <Text className="text-[11px] font-bold text-gray-700">₹{money(bill.expense_total)}</Text>
        </View>
      ) : null}
    </View>
  );
}
