import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar as CalendarIcon, Download, FileText, ArrowLeft } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import client from '../api/client';
import PartySearchDropdown from '../components/PartySearchDropdown';

type ExportFormat = 'pdf' | 'xlsx';

const MIME: Record<ExportFormat, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export default function ReportsScreen({ navigation }: any) {
  const [fromDate, setFromDate] = useState(new Date(new Date().setDate(1)));
  const [toDate, setToDate] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState<string>('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [selectedLedgerPartyId, setSelectedLedgerPartyId] = useState<string>('');
  const [reportLanguage, setReportLanguage] = useState<'en' | 'ta'>('en');
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'purchase' | 'sale' | 'ledger' | null>(null);

  const { data: parties, isLoading } = useQuery({
    queryKey: ['parties'],
    queryFn: async () => {
      const response = await client.get(`/parties/`);
      return response.data;
    },
  });

  const activePurchasers = parties?.filter((p: any) => (p.type === 'PURCHASER' || p.type === 'BOTH') && p.is_active) || [];
  const activeSaleParties = parties?.filter((p: any) => (p.type === 'SALE' || p.type === 'BOTH') && p.is_active) || [];
  const activeParties = parties?.filter((p: any) => p.is_active) || [];

  const openOrShareFile = async (url: string, fileUri: string, format: ExportFormat) => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
      return;
    }
    const downloadRes = await FileSystem.downloadAsync(url, fileUri);
    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: downloadRes.uri,
          flags: 1,
          type: MIME[format],
        });
      } catch {
        await Sharing.shareAsync(downloadRes.uri, { mimeType: MIME[format] });
      }
    } else {
      await Sharing.shareAsync(downloadRes.uri, { mimeType: MIME[format] });
    }
  };

  const handleDownloadPurchaseReport = async (format: ExportFormat) => {
    const key = `purchase-${format}`;
    setDownloadingKey(key);
    try {
      const fromStr = fromDate.toISOString().split('T')[0];
      const toStr = toDate.toISOString().split('T')[0];
      const baseUrl = client.defaults.baseURL || 'http://localhost:8000/api';
      let url = `${baseUrl}/reports/purchases?from_date=${fromStr}&to_date=${toStr}&language=${reportLanguage}&format=${format}`;
      if (selectedPartyId && selectedPartyId !== 'all') {
        url += `&party_id=${selectedPartyId}`;
      }
      await openOrShareFile(
        url,
        `${FileSystem.documentDirectory}purchase_report_${fromStr}_${toStr}.${format}`,
        format,
      );
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleDownloadSaleReport = async (format: ExportFormat) => {
    const key = `sale-${format}`;
    setDownloadingKey(key);
    try {
      const fromStr = fromDate.toISOString().split('T')[0];
      const toStr = toDate.toISOString().split('T')[0];
      const baseUrl = client.defaults.baseURL || 'http://localhost:8000/api';
      let url = `${baseUrl}/reports/sales?from_date=${fromStr}&to_date=${toStr}&language=${reportLanguage}&format=${format}`;
      if (selectedSupplierId && selectedSupplierId !== 'all') {
        url += `&party_id=${selectedSupplierId}`;
      }
      await openOrShareFile(
        url,
        `${FileSystem.documentDirectory}sale_report_${fromStr}_${toStr}.${format}`,
        format,
      );
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleDownloadPartyLedger = async (format: ExportFormat) => {
    if (!selectedLedgerPartyId) {
      alert('Please select a party');
      return;
    }
    const key = `ledger-${format}`;
    setDownloadingKey(key);
    try {
      const fromStr = fromDate.toISOString().split('T')[0];
      const toStr = toDate.toISOString().split('T')[0];
      const baseUrl = client.defaults.baseURL || 'http://localhost:8000/api';
      const url = `${baseUrl}/reports/party-ledger?party_id=${selectedLedgerPartyId}&from_date=${fromStr}&to_date=${toStr}&language=${reportLanguage}&format=${format}`;
      await openOrShareFile(
        url,
        `${FileSystem.documentDirectory}party_ledger_${fromStr}_${toStr}.${format}`,
        format,
      );
    } catch (error) {
      console.error('Error downloading party ledger:', error);
      alert('Failed to download party ledger');
    } finally {
      setDownloadingKey(null);
    }
  };

  const FormatButtons = ({
    baseKey,
    onDownload,
    disabled = false,
  }: {
    baseKey: string;
    onDownload: (format: ExportFormat) => void;
    disabled?: boolean;
  }) => (
    <View className="flex-row" style={{ gap: 8 }}>
      {(['pdf', 'xlsx'] as ExportFormat[]).map((fmt) => {
        const busy = downloadingKey === `${baseKey}-${fmt}`;
        const label = fmt === 'pdf' ? 'PDF' : 'Excel';
        return (
          <TouchableOpacity
            key={fmt}
            onPress={() => onDownload(fmt)}
            disabled={disabled || !!downloadingKey}
            className={`flex-1 h-11 rounded-lg flex-row items-center justify-center ${
              disabled || downloadingKey ? 'bg-emerald-400' : 'bg-[#006948]'
            }`}
          >
            {busy ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Download color="white" size={16} />
                <Text className="text-white font-bold text-sm ml-1.5">{label}</Text>
              </>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center mb-2">
          <TouchableOpacity
            onPress={() =>
              navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'Dashboard' })
            }
            className="mr-3"
          >
            <ArrowLeft color="#111827" size={24} />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Reports</Text>
        </View>
        <Text className="text-xs text-gray-500 mt-1 mb-2">Party name language for export</Text>
        <View className="flex-row border border-gray-200 rounded-lg overflow-hidden">
          <TouchableOpacity
            onPress={() => setReportLanguage('en')}
            className={`flex-1 py-2.5 items-center ${reportLanguage === 'en' ? 'bg-[#006948]' : 'bg-white'}`}
          >
            <Text className={`text-sm font-semibold ${reportLanguage === 'en' ? 'text-white' : 'text-gray-600'}`}>
              English
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setReportLanguage('ta')}
            className={`flex-1 py-2.5 items-center ${reportLanguage === 'ta' ? 'bg-[#006948]' : 'bg-white'}`}
          >
            <Text className={`text-sm font-semibold ${reportLanguage === 'ta' ? 'text-white' : 'text-gray-600'}`}>
              Tamil
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-1">Date Range</Text>
          <View className="flex-row space-x-2">
            {Platform.OS === 'web' ? (
              <input
                type="date"
                className="flex-1 bg-gray-100 rounded-lg h-12 px-3 text-gray-700 border-none"
                style={{ outline: 'none', backgroundColor: '#f3f4f6' }}
                value={fromDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  if (e.target.value) setFromDate(new Date(e.target.value));
                }}
              />
            ) : (
              <TouchableOpacity
                onPress={() => setShowFromPicker(true)}
                className="flex-1 bg-gray-100 rounded-lg h-12 flex-row items-center justify-between px-3"
              >
                <Text className="text-gray-700">{fromDate.toISOString().split('T')[0]}</Text>
                <CalendarIcon size={20} color="#6B7280" />
              </TouchableOpacity>
            )}

            {Platform.OS === 'web' ? (
              <input
                type="date"
                className="flex-1 bg-gray-100 rounded-lg h-12 px-3 text-gray-700 border-none"
                style={{ outline: 'none', backgroundColor: '#f3f4f6' }}
                value={toDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  if (e.target.value) setToDate(new Date(e.target.value));
                }}
              />
            ) : (
              <TouchableOpacity
                onPress={() => setShowToPicker(true)}
                className="flex-1 bg-gray-100 rounded-lg h-12 flex-row items-center justify-between px-3"
              >
                <Text className="text-gray-700">{toDate.toISOString().split('T')[0]}</Text>
                <CalendarIcon size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View
          className="flex-row mb-4"
          style={{
            gap: 12,
            zIndex: openDropdown === 'purchase' || openDropdown === 'sale' ? 50 : 1,
            overflow: 'visible',
          }}
        >
          <View
            className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-4"
            style={{
              zIndex: openDropdown === 'purchase' ? 40 : 1,
              elevation: openDropdown === 'purchase' ? 8 : 1,
              overflow: 'visible',
            }}
          >
            <View className="flex-row items-center mb-3">
              <FileText color="#006948" size={20} />
              <Text className="text-base font-bold text-gray-900 ml-2">Purchase Report</Text>
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-1">Select Purchaser</Text>
            <View className="mb-4" style={{ zIndex: 30, overflow: 'visible', minHeight: openDropdown === 'purchase' ? 220 : undefined }}>
              {isLoading ? (
                <ActivityIndicator className="p-3" color="#006948" />
              ) : (
                <PartySearchDropdown
                  parties={activePurchasers}
                  value={selectedPartyId}
                  onSelect={(id: string) => setSelectedPartyId(id)}
                  placeholder="Type to search purchaser..."
                  allOptionLabel="ALL Purchasers"
                  allOptionValue="all"
                  onDropdownOpen={(open: boolean) => setOpenDropdown(open ? 'purchase' : null)}
                />
              )}
            </View>

            <FormatButtons baseKey="purchase" onDownload={handleDownloadPurchaseReport} />
          </View>

          <View
            className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-4"
            style={{
              zIndex: openDropdown === 'sale' ? 40 : 1,
              elevation: openDropdown === 'sale' ? 8 : 1,
              overflow: 'visible',
            }}
          >
            <View className="flex-row items-center mb-3">
              <FileText color="#006948" size={20} />
              <Text className="text-base font-bold text-gray-900 ml-2">Sale Report</Text>
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-1">Select Sale Party</Text>
            <View className="mb-4" style={{ zIndex: 30, overflow: 'visible', minHeight: openDropdown === 'sale' ? 220 : undefined }}>
              {isLoading ? (
                <ActivityIndicator className="p-3" color="#006948" />
              ) : (
                <PartySearchDropdown
                  parties={activeSaleParties}
                  value={selectedSupplierId}
                  onSelect={(id: string) => setSelectedSupplierId(id)}
                  placeholder="Type to search sale party..."
                  allOptionLabel="ALL Sale Parties"
                  allOptionValue="all"
                  onDropdownOpen={(open: boolean) => setOpenDropdown(open ? 'sale' : null)}
                />
              )}
            </View>

            <FormatButtons baseKey="sale" onDownload={handleDownloadSaleReport} />
          </View>
        </View>

        <View
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-20"
          style={{
            zIndex: openDropdown === 'ledger' ? 40 : 1,
            elevation: openDropdown === 'ledger' ? 8 : 1,
            overflow: 'visible',
          }}
        >
          <View className="flex-row items-center mb-3">
            <FileText color="#006948" size={20} />
            <Text className="text-base font-bold text-gray-900 ml-2">Party Ledger Report</Text>
          </View>

          <Text className="text-sm font-medium text-gray-700 mb-1">Select Party</Text>
          <View className="mb-4" style={{ zIndex: 30, overflow: 'visible', minHeight: openDropdown === 'ledger' ? 220 : undefined }}>
            {isLoading ? (
              <ActivityIndicator className="p-3" color="#006948" />
            ) : (
              <PartySearchDropdown
                parties={activeParties}
                value={selectedLedgerPartyId}
                onSelect={setSelectedLedgerPartyId}
                placeholder="Type to search party..."
                onDropdownOpen={(open: boolean) => setOpenDropdown(open ? 'ledger' : null)}
              />
            )}
          </View>

          <FormatButtons
            baseKey="ledger"
            onDownload={handleDownloadPartyLedger}
            disabled={!selectedLedgerPartyId}
          />
        </View>
      </ScrollView>

      {showFromPicker && (
        <DateTimePicker
          value={fromDate}
          mode="date"
          display="default"
          onChange={(event: any, date?: Date) => {
            setShowFromPicker(Platform.OS === 'ios');
            if (date) setFromDate(date);
          }}
        />
      )}

      {showToPicker && (
        <DateTimePicker
          value={toDate}
          mode="date"
          display="default"
          onChange={(event: any, date?: Date) => {
            setShowToPicker(Platform.OS === 'ios');
            if (date) setToDate(date);
          }}
        />
      )}
    </SafeAreaView>
  );
}
