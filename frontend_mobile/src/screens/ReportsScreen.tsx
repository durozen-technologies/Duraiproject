import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar as CalendarIcon, Download, FileText } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import client from '../api/client';

export default function ReportsScreen() {
  const [fromDate, setFromDate] = useState(new Date(new Date().setDate(1))); // 1st of current month
  const [toDate, setToDate] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState<string>('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [selectedLedgerPartyId, setSelectedLedgerPartyId] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: parties, isLoading } = useQuery({
    queryKey: ['parties'],
    queryFn: async () => {
      const response = await client.get(`/parties/`);
      return response.data;
    }
  });

  const activePurchasers = parties?.filter((p: any) => (p.type === 'PURCHASER' || p.type === 'BOTH') && p.is_active) || [];
  const activeSuppliers = parties?.filter((p: any) => (p.type === 'SUPPLIER' || p.type === 'BOTH') && p.is_active) || [];
  const activeParties = parties?.filter((p: any) => p.is_active) || [];

  const openOrSharePdf = async (url: string, fileUri: string) => {
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
          type: 'application/pdf',
        });
      } catch {
        await Sharing.shareAsync(downloadRes.uri);
      }
    } else {
      await Sharing.shareAsync(downloadRes.uri);
    }
  };

  const handleDownloadPurchaseReport = async () => {
    setIsDownloading(true);
    try {
      const fromStr = fromDate.toISOString().split('T')[0];
      const toStr = toDate.toISOString().split('T')[0];
      const baseUrl = client.defaults.baseURL || 'http://localhost:8000/api';
      let url = `${baseUrl}/reports/purchases?from_date=${fromStr}&to_date=${toStr}`;
      if (selectedPartyId !== 'all') {
        url += `&party_id=${selectedPartyId}`;
      }
      await openOrSharePdf(url, `${FileSystem.documentDirectory}purchase_report_${fromStr}_${toStr}.pdf`);
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("Failed to download report");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSaleReport = async () => {
    setIsDownloading(true);
    try {
      const fromStr = fromDate.toISOString().split('T')[0];
      const toStr = toDate.toISOString().split('T')[0];
      const baseUrl = client.defaults.baseURL || 'http://localhost:8000/api';
      let url = `${baseUrl}/reports/sales?from_date=${fromStr}&to_date=${toStr}`;
      if (selectedSupplierId !== 'all') {
        url += `&party_id=${selectedSupplierId}`;
      }
      await openOrSharePdf(url, `${FileSystem.documentDirectory}sale_report_${fromStr}_${toStr}.pdf`);
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("Failed to download report");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPartyLedger = async () => {
    if (!selectedLedgerPartyId) {
      alert('Please select a party');
      return;
    }
    setIsDownloading(true);
    try {
      const fromStr = fromDate.toISOString().split('T')[0];
      const toStr = toDate.toISOString().split('T')[0];
      const baseUrl = client.defaults.baseURL || 'http://localhost:8000/api';
      const url = `${baseUrl}/reports/party-ledger?party_id=${selectedLedgerPartyId}&from_date=${fromStr}&to_date=${toStr}`;
      await openOrSharePdf(url, `${FileSystem.documentDirectory}party_ledger_${fromStr}_${toStr}.pdf`);
    } catch (error) {
      console.error('Error downloading party ledger:', error);
      alert('Failed to download party ledger');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-3 bg-white border-b border-gray-200">
        <Text className="text-lg font-bold text-gray-900">Reports</Text>
      </View>
      
      <ScrollView className="flex-1 p-4">
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <View className="flex-row items-center mb-4">
            <FileText color="#006948" size={24} className="mr-2" />
            <Text className="text-lg font-bold text-gray-900">Purchase Report</Text>
          </View>
          
          <Text className="text-sm font-medium text-gray-700 mb-1">Date Range</Text>
          <View className="flex-row space-x-2 mb-4">
            {Platform.OS === 'web' ? (
              <input
                type="date"
                className="flex-1 bg-gray-100 rounded-lg h-12 px-3 text-gray-700 border-none"
                style={{ outline: 'none', backgroundColor: '#f3f4f6' }}
                value={fromDate.toISOString().split('T')[0]}
                onChange={(e) => { if (e.target.value) setFromDate(new Date(e.target.value)); }}
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
                onChange={(e) => { if (e.target.value) setToDate(new Date(e.target.value)); }}
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
          
          <Text className="text-sm font-medium text-gray-700 mb-1">Select Purchaser</Text>
          <View className="bg-gray-100 rounded-lg mb-6 border border-gray-200 justify-center">
            {isLoading ? (
              <ActivityIndicator className="p-3" color="#006948" />
            ) : (
              <Picker
                selectedValue={selectedPartyId}
                onValueChange={(itemValue) => setSelectedPartyId(itemValue)}
                style={{ height: 50 }}
              >
                <Picker.Item label="ALL Purchasers" value="all" style={{ fontSize: 15 }} />
                {activePurchasers.map((p: any) => (
                  <Picker.Item key={p.id} label={p.name} value={p.id} style={{ fontSize: 15 }} />
                ))}
              </Picker>
            )}
          </View>
          
          <TouchableOpacity 
            onPress={handleDownloadPurchaseReport}
            disabled={isDownloading}
            className={`h-12 rounded-lg flex-row items-center justify-center space-x-2 ${isDownloading ? 'bg-emerald-400' : 'bg-[#006948]'}`}
          >
            {isDownloading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Download color="white" size={20} />
                <Text className="text-white font-bold text-lg">Download PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <View className="flex-row items-center mb-4">
            <FileText color="#006948" size={24} className="mr-2" />
            <Text className="text-lg font-bold text-gray-900">Sale Report</Text>
          </View>

          <Text className="text-sm font-medium text-gray-700 mb-1">Date Range</Text>
          <View className="flex-row space-x-2 mb-4">
            {Platform.OS === 'web' ? (
              <input
                type="date"
                className="flex-1 bg-gray-100 rounded-lg h-12 px-3 text-gray-700 border-none"
                style={{ outline: 'none', backgroundColor: '#f3f4f6' }}
                value={fromDate.toISOString().split('T')[0]}
                onChange={(e) => { if (e.target.value) setFromDate(new Date(e.target.value)); }}
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
                onChange={(e) => { if (e.target.value) setToDate(new Date(e.target.value)); }}
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
          
          <Text className="text-sm font-medium text-gray-700 mb-1">Select Supplier</Text>
          <View className="bg-gray-100 rounded-lg mb-6 border border-gray-200 justify-center">
            {isLoading ? (
              <ActivityIndicator className="p-3" color="#006948" />
            ) : (
              <Picker
                selectedValue={selectedSupplierId}
                onValueChange={(itemValue) => setSelectedSupplierId(itemValue)}
                style={{ height: 50 }}
              >
                <Picker.Item label="ALL Suppliers" value="all" style={{ fontSize: 15 }} />
                {activeSuppliers.map((p: any) => (
                  <Picker.Item key={p.id} label={p.name} value={p.id} style={{ fontSize: 15 }} />
                ))}
              </Picker>
            )}
          </View>
          
          <TouchableOpacity 
            onPress={handleDownloadSaleReport}
            disabled={isDownloading}
            className={`h-12 rounded-lg flex-row items-center justify-center space-x-2 ${isDownloading ? 'bg-emerald-400' : 'bg-[#006948]'}`}
          >
            {isDownloading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Download color="white" size={20} />
                <Text className="text-white font-bold text-lg">Download PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-20">
          <View className="flex-row items-center mb-4">
            <FileText color="#006948" size={24} className="mr-2" />
            <Text className="text-lg font-bold text-gray-900">Party Ledger Report</Text>
          </View>

          <Text className="text-sm font-medium text-gray-700 mb-1">Date Range</Text>
          <View className="flex-row space-x-2 mb-4">
            {Platform.OS === 'web' ? (
              <input
                type="date"
                className="flex-1 bg-gray-100 rounded-lg h-12 px-3 text-gray-700 border-none"
                style={{ outline: 'none', backgroundColor: '#f3f4f6' }}
                value={fromDate.toISOString().split('T')[0]}
                onChange={(e) => { if (e.target.value) setFromDate(new Date(e.target.value)); }}
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
                onChange={(e) => { if (e.target.value) setToDate(new Date(e.target.value)); }}
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

          <Text className="text-sm font-medium text-gray-700 mb-1">Select Party</Text>
          <View className="bg-gray-100 rounded-lg mb-6 border border-gray-200 justify-center">
            {isLoading ? (
              <ActivityIndicator className="p-3" color="#006948" />
            ) : (
              <Picker
                selectedValue={selectedLedgerPartyId}
                onValueChange={(itemValue) => setSelectedLedgerPartyId(itemValue)}
                style={{ height: 50 }}
              >
                <Picker.Item label="Select a party..." value="" style={{ fontSize: 15 }} />
                {activeParties.map((p: any) => (
                  <Picker.Item key={p.id} label={p.name} value={p.id} style={{ fontSize: 15 }} />
                ))}
              </Picker>
            )}
          </View>

          <TouchableOpacity
            onPress={handleDownloadPartyLedger}
            disabled={isDownloading || !selectedLedgerPartyId}
            className={`h-12 rounded-lg flex-row items-center justify-center space-x-2 ${
              isDownloading || !selectedLedgerPartyId ? 'bg-emerald-400' : 'bg-[#006948]'
            }`}
          >
            {isDownloading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Download color="white" size={20} />
                <Text className="text-white font-bold text-lg">Download PDF</Text>
              </>
            )}
          </TouchableOpacity>
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
