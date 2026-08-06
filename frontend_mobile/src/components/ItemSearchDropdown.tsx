import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, ScrollView, Platform } from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';

export default function ItemSearchDropdown({ items, value, onSelect, placeholder, error, onDropdownOpen }: any) {
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (value) {
      const item = items?.find((i: any) => i.id === value);
      if (item) {
        setSearchText(item.name);
      }
    } else {
      setSearchText('');
    }
  }, [value, items]);

  const filteredItems = items?.filter((i: any) => {
    if (searchText.length < 1) return true; // Show all on focus if short
    return i.name.toLowerCase().includes(searchText.toLowerCase());
  });

  // Always show list when focused so they can just pick
  const showList = isFocused && !value;

  useEffect(() => {
    if (onDropdownOpen) {
      onDropdownOpen(showList);
    }
  }, [showList]);

  return (
    <View className="w-full relative z-[100]">
      <View className={`w-full bg-white border ${error ? 'border-red-500' : (isFocused ? 'border-[#0b4d3a]' : 'border-[#d8e0dc]')} rounded px-2 h-10 flex-row items-center`}>
        <TextInput
          className={`flex-1 text-sm ${value ? 'font-bold' : ''} text-gray-800 p-0 m-0 bg-transparent outline-none`}
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
      
      {showList && filteredItems && filteredItems.length > 0 && (
        <View 
          className="absolute top-full left-0 w-full bg-white border border-gray-300 rounded-sm mt-[2px] max-h-48 shadow-lg z-[100]" 
          style={Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6 } : { elevation: 5 }}
        >
          <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
            {filteredItems.map((item: any) => (
              <TouchableOpacity 
                key={item.id}
                className="px-3 py-2 border-b border-gray-100 hover:bg-[#f4f7f5] active:bg-[#e8f3ee] flex-row justify-between items-center"
                onPress={() => {
                  setSearchText(item.name);
                  onSelect(item.id);
                  setIsFocused(false);
                }}
              >
                <View className="flex-1">
                  <Text className="text-xs font-medium text-gray-800" numberOfLines={1}>{item.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {showList && filteredItems && filteredItems.length === 0 && (
        <View className="absolute top-full left-0 w-full bg-white border border-gray-300 rounded-sm mt-[2px] p-2 shadow-lg z-[100]" style={{ elevation: 5 }}>
          <Text className="text-xs text-gray-500 text-center">No matches</Text>
        </View>
      )}
    </View>
  );
}
