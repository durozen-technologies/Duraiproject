import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, ScrollView, Platform } from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';

export default function DriverSearchDropdown({ drivers, value, onSelect, placeholder, error, onDropdownOpen }: any) {
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = React.useRef<TextInput>(null);
  
  const selectedDriver = drivers?.find((d: any) => d.id === value);

  useEffect(() => {
    if (value) {
      if (selectedDriver) {
        setSearchText(selectedDriver.name);
      } else {
        setSearchText(value); // fallback for free-text
      }
    } else {
      setSearchText('');
    }
  }, [value, drivers, selectedDriver]);

  const filteredDrivers = drivers?.filter((d: any) => {
    if (searchText.length < 1) return true;
    return d.name.toLowerCase().includes(searchText.toLowerCase()) || 
           (d.mobile && d.mobile.includes(searchText));
  });

  const showList = isFocused && !value;

  useEffect(() => {
    if (onDropdownOpen) {
      onDropdownOpen(showList);
    }
  }, [showList]);

  return (
    <View className="w-full relative z-[100]">
      <View className={`w-full bg-white border ${error ? 'border-red-500' : (isFocused ? 'border-[#0b4d3a]' : 'border-[#d8e0dc]')} rounded px-2 h-10 flex-row items-center`}>
        {!isFocused && value && selectedDriver ? (
          <TouchableOpacity 
            className="flex-1 justify-center py-0.5" 
            onPress={() => {
              setIsFocused(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            activeOpacity={0.8}
          >
            <Text className="text-sm font-bold text-gray-800" numberOfLines={1}>{selectedDriver.name}</Text>
            {selectedDriver.mobile ? <Text className="text-xs text-gray-500 font-medium leading-3 mt-0.5" numberOfLines={1}>{selectedDriver.mobile}</Text> : null}
          </TouchableOpacity>
        ) : (
          <TextInput
            ref={inputRef}
            className="flex-1 text-sm text-gray-800 p-0 m-0 bg-transparent outline-none h-10"
            placeholder={placeholder || "Select..."}
            value={searchText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsFocused(false), 400);
            }}
            onChangeText={(text) => {
              setSearchText(text);
              if (value) {
                onSelect('');
              }
            }}
            style={{ outline: 'none' } as any}
          />
        )}
        {searchText.length > 0 ? (
          <TouchableOpacity onPress={() => { setSearchText(''); onSelect(''); }} className="ml-1 p-0.5">
            <X color="#9ca3af" size={14} />
          </TouchableOpacity>
        ) : (
          <View className="ml-1 pointer-events-none">
            <ChevronDown color="#9ca3af" size={14} />
          </View>
        )}
      </View>
      
      {showList && filteredDrivers && filteredDrivers.length > 0 && (
        <View 
          className="absolute top-full left-0 w-full bg-white border border-gray-300 rounded-sm mt-[2px] max-h-48 shadow-lg z-[100]" 
          style={Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6 } : { elevation: 5 }}
        >
          <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
            {filteredDrivers.map((driver: any) => (
              <TouchableOpacity 
                key={driver.id}
                className="px-3 py-2 border-b border-gray-100 hover:bg-[#f4f7f5] active:bg-[#e8f3ee] flex-row justify-between items-center"
                onPress={() => {
                  setSearchText(driver.name);
                  onSelect(driver.id);
                  setIsFocused(false);
                }}
              >
                <View className="flex-1">
                  <Text className="text-xs font-medium text-gray-800" numberOfLines={1}>{driver.name}</Text>
                  {driver.mobile && <Text className="text-[10px] text-gray-500">{driver.mobile}</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {showList && filteredDrivers && filteredDrivers.length === 0 && (
        <View className="absolute top-full left-0 w-full bg-white border border-gray-300 rounded-sm mt-[2px] p-2 shadow-lg z-[100]" style={{ elevation: 5 }}>
          <Text className="text-xs text-gray-500 text-center">No matches</Text>
        </View>
      )}
    </View>
  );
}
