import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, RefreshCcw } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchDrivers, Driver } from '../api/drivers';

export default function DriversScreen({ navigation, route }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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

  const { data: drivers, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['drivers'],
    queryFn: fetchDrivers
  });

  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  const filteredDrivers = drivers?.filter((driver: Driver) => 
    searchQuery === '' || 
    driver.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (driver.nickname && driver.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-3 bg-white border-b border-gray-200 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900">Drivers</Text>
        <View className="flex-row items-center space-x-2">
          <TouchableOpacity onPress={onRefresh} className="p-2 bg-gray-100 rounded-full mr-2">
            <RefreshCcw color="#374151" size={18} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('NewDriver')} className="bg-[#006948] flex-row items-center px-3 py-1.5 rounded-full">
            <Plus color="white" size={16} className="mr-1" />
            <Text className="text-white text-sm font-semibold">Add Driver</Text>
          </TouchableOpacity>
        </View>
      </View>

      {successMsg ? (
        <View className="absolute bottom-12 self-center bg-[#059669] px-6 py-3 rounded-full z-50 shadow-lg elevation-5 flex-row items-center justify-center min-w-[250px]">
          <Text className="text-white font-medium text-sm text-center">{successMsg}</Text>
        </View>
      ) : null}

      <View className="p-4 bg-white border-b border-gray-200">
        <View className="relative justify-center">
          <View className="absolute left-3 z-10">
            <Search color="#9ca3af" size={20} />
          </View>
          <TextInput 
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search drivers..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm"
          />
        </View>
      </View>

      <ScrollView 
        className="flex-1 p-4"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={['#006948']} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#006948" className="mt-10" />
        ) : isError ? (
          <Text className="text-center text-red-500 mt-10">Error loading drivers: {(error as any)?.message}</Text>
        ) : filteredDrivers?.length === 0 ? (
          <Text className="text-center text-gray-500 mt-10">No drivers found.</Text>
        ) : (
          filteredDrivers
            ?.sort((a: Driver, b: Driver) => {
              if (a.is_active === b.is_active) return a.name.localeCompare(b.name);
              return a.is_active ? -1 : 1;
            })
            .map((driver: Driver) => (
            <TouchableOpacity 
              key={driver.id} 
              onPress={() => navigation.navigate('DriverDetails', { driverId: driver.id, driverName: driver.name })}
              className={`p-4 rounded-xl border shadow-sm flex-row items-center justify-between mb-3 ${driver.is_active ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-300 opacity-80'}`}
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-xl bg-green-50 items-center justify-center mr-3 border border-green-100">
                  <Text className="text-[#006948] font-bold text-lg">{driver.name.substring(0,2).toUpperCase()}</Text>
                </View>
                <View>
                  <View className="flex-row items-center space-x-2">
                    <Text className={`font-medium text-base ${driver.is_active ? 'text-gray-900' : 'text-gray-600 line-through'}`}>{driver.name}</Text>
                    {!driver.is_active && (
                      <View className="bg-gray-300 px-2 py-0.5 rounded-full">
                        <Text className="text-[10px] font-bold text-gray-700">Disabled</Text>
                      </View>
                    )}
                  </View>
                  {driver.nickname ? <Text className="text-xs text-gray-500 italic mt-0.5">{driver.nickname}</Text> : null}
                  <Text className="text-xs text-gray-500 mt-1">{driver.mobile || 'No phone'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
