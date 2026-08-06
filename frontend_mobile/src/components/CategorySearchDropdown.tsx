import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, ScrollView, Platform } from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';

export default function CategorySearchDropdown({ categories, value, textValue, onSelect, onTextChange, placeholder, error, onDropdownOpen }: any) {
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (value) {
      const category = categories?.find((c: any) => c.id === value);
      if (category) {
        setSearchText(category.name);
      }
    } else {
      setSearchText(textValue || '');
    }
  }, [value, textValue, categories]);

  const filteredCategories = categories?.filter((c: any) => {
    if (searchText.length < 1) return true;
    return c.name.toLowerCase().includes(searchText.toLowerCase());
  });

  const showList = isFocused && !value;

  useEffect(() => {
    if (onDropdownOpen) {
      onDropdownOpen(showList);
    }
  }, [showList]);

  return (
    <View className="w-full relative z-[100]">
      <View className={`w-full bg-white border ${error ? 'border-red-500' : (isFocused ? 'border-[#0b4d3a]' : 'border-[#d8e0dc]')} rounded-md px-2 h-9 flex-row items-center`}>
        <TextInput
          className="flex-1 text-sm text-gray-800 p-0 m-0 bg-transparent outline-none"
          placeholder={placeholder || "Select Category..."}
          value={searchText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setTimeout(() => setIsFocused(false), 400);
          }}
          onChangeText={(text) => {
            setSearchText(text);
            if (onTextChange) {
              onTextChange(text);
            }
            if (value) {
              onSelect('');
            }
          }}
          style={{ outline: 'none' } as any}
        />
        {searchText.length > 0 ? (
          <TouchableOpacity onPress={() => { setSearchText(''); onSelect(''); }} className="ml-1 p-0.5">
            <X color="#9ca3af" size={16} />
          </TouchableOpacity>
        ) : (
          <View className="ml-1 pointer-events-none">
            <ChevronDown color="#9ca3af" size={16} />
          </View>
        )}
      </View>
      
      {showList && filteredCategories && filteredCategories.length > 0 && (
        <View 
          className="absolute top-full left-0 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-48 shadow-lg z-[100]" 
          style={Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6 } : { elevation: 5 }}
        >
          <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
            {filteredCategories.map((c: any) => (
              <TouchableOpacity 
                key={c.id}
                className="px-3 py-2.5 border-b border-gray-100 hover:bg-[#f4f7f5] active:bg-[#e8f3ee] flex-row justify-between items-center"
                onPress={() => {
                  setSearchText(c.name);
                  onSelect(c.id);
                  setIsFocused(false);
                }}
              >
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>{c.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {showList && filteredCategories && filteredCategories.length === 0 && (
        <View className="absolute top-full left-0 w-full bg-white border border-gray-300 rounded-md mt-1 p-3 shadow-lg z-[100]" style={{ elevation: 5 }}>
          <Text className="text-sm text-gray-500 text-center">No matching category</Text>
        </View>
      )}
    </View>
  );
}
