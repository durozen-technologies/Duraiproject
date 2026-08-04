import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, ScrollView, Platform } from 'react-native';
import { Search, X } from 'lucide-react-native';

export default function ItemSearchDropdown({ items, value, onSelect, placeholder, error }: any) {
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

  return (
    <View className="w-full relative z-50">
      <View className={`w-full bg-white border ${error ? 'border-red-500' : (isFocused ? 'border-[#006948]' : 'border-gray-300')} rounded-md min-h-[50px] flex-row items-center px-3`}>
        <Search color="#9ca3af" size={18} className="mr-2" />
        <TextInput
          className="flex-1 text-sm py-3"
          placeholder={placeholder || "Select Item"}
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
      
      {showList && filteredItems && filteredItems.length > 0 && (
        <View className="bg-white border border-gray-200 rounded-md mt-1 max-h-48 overflow-hidden shadow-sm" style={Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 } : { elevation: 3 }}>
          <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
            {filteredItems.map((item: any) => (
              <TouchableOpacity 
                key={item.id}
                className="px-4 py-3 border-b border-gray-100 active:bg-gray-50 flex-row justify-between items-center"
                onPress={() => {
                  setSearchText(item.name);
                  onSelect(item.id);
                  setIsFocused(false);
                }}
              >
                <View>
                  <Text className="text-sm font-medium text-gray-800">{item.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {showList && filteredItems && filteredItems.length === 0 && (
        <View className="bg-white border border-gray-200 rounded-md mt-1 p-3">
          <Text className="text-sm text-gray-500 text-center">No matching items found</Text>
        </View>
      )}
    </View>
  );
}
