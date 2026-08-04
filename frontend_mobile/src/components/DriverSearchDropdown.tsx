import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, ScrollView, Platform } from 'react-native';
import { Search, X } from 'lucide-react-native';

export default function DriverSearchDropdown({ drivers, value, onSelect, placeholder, error }: any) {
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (value) {
      // Allow legacy text matches or UUID matches
      const isUUID = value.length === 36 && value.includes('-');
      const driver = isUUID 
        ? drivers?.find((d: any) => d.id === value)
        : drivers?.find((d: any) => d.name === value);

      if (driver) {
        setSearchText(driver.nickname ? `${driver.name} - [${driver.nickname}]` : driver.name);
      } else if (!isUUID && value) {
        setSearchText(`${value} (Legacy)`);
      } else {
        setSearchText('');
      }
    } else {
      setSearchText('');
    }
  }, [value, drivers]);

  const filteredDrivers = drivers?.filter((d: any) => {
    if (searchText.length < 2) return false;
    return d.name.toLowerCase().includes(searchText.toLowerCase()) || 
           (d.nickname && d.nickname.toLowerCase().includes(searchText.toLowerCase())) ||
           (d.mobile && d.mobile.includes(searchText));
  });

  const showList = isFocused && searchText.length >= 2 && !value;

  return (
    <View className="w-full relative z-50">
      <View className={`w-full bg-white border ${error ? 'border-red-500' : (isFocused ? 'border-[#006948]' : 'border-gray-300')} rounded-md min-h-[50px] flex-row items-center px-3`}>
        <Search color="#9ca3af" size={18} className="mr-2" />
        <TextInput
          className="flex-1 text-sm py-3"
          placeholder={placeholder}
          value={searchText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setTimeout(() => setIsFocused(false), 200);
          }}
          onChangeText={(text) => {
            setSearchText(text);
            if (value) {
              onSelect('');
            }
          }}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchText(''); onSelect(''); }}>
            <X color="#9ca3af" size={18} />
          </TouchableOpacity>
        )}
      </View>
      
      {showList && filteredDrivers && filteredDrivers.length > 0 && (
        <View className="bg-white border border-gray-200 rounded-md mt-1 max-h-48 overflow-hidden shadow-sm" style={Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 } : { elevation: 3 }}>
          <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
            {filteredDrivers.map((driver: any) => (
              <TouchableOpacity 
                key={driver.id}
                className="px-4 py-3 border-b border-gray-100 active:bg-gray-50 flex-row justify-between items-center"
                onPress={() => {
                  setSearchText(driver.nickname ? `${driver.name} (${driver.nickname})` : driver.name);
                  onSelect(driver.id);
                  setIsFocused(false);
                }}
              >
                <View>
                  <Text className="text-sm font-medium text-gray-800">{driver.name}</Text>
                  {driver.nickname && <Text className="text-xs text-gray-500">{driver.nickname}</Text>}
                </View>
                {driver.mobile && (
                  <Text className="text-xs text-gray-500">{driver.mobile}</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {showList && filteredDrivers && filteredDrivers.length === 0 && (
        <View className="bg-white border border-gray-200 rounded-md mt-1 p-3 flex-row justify-between items-center">
          <Text className="text-sm text-gray-500">No matching drivers found</Text>
        </View>
      )}
    </View>
  );
}
