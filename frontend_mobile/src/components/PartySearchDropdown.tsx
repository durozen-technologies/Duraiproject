import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, ScrollView, Platform } from 'react-native';
import { Search, X } from 'lucide-react-native';

export default function PartySearchDropdown({ parties, value, onSelect, placeholder, error }: any) {
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (value) {
      const party = parties?.find((p: any) => p.id === value);
      if (party) {
        setSearchText(party.nickname ? `${party.name} - [${party.nickname}]` : party.name);
      }
    } else {
      setSearchText('');
    }
  }, [value, parties]);

  const filteredParties = parties?.filter((p: any) => {
    if (searchText.length < 2) return false;
    return p.name.toLowerCase().includes(searchText.toLowerCase()) || 
           (p.nickname && p.nickname.toLowerCase().includes(searchText.toLowerCase()));
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
      
      {showList && filteredParties && filteredParties.length > 0 && (
        <View className="bg-white border border-gray-200 rounded-md mt-1 max-h-48 overflow-hidden shadow-sm" style={Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 } : { elevation: 3 }}>
          <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
            {filteredParties.map((party: any) => (
              <TouchableOpacity 
                key={party.id}
                className="px-4 py-3 border-b border-gray-100 active:bg-gray-50 flex-row justify-between items-center"
                onPress={() => {
                  setSearchText(party.nickname ? `${party.name} (${party.nickname})` : party.name);
                  onSelect(party.id);
                  setIsFocused(false);
                }}
              >
                <View>
                  <Text className="text-sm font-medium text-gray-800">{party.name}</Text>
                  {party.nickname && <Text className="text-xs text-gray-500">{party.nickname}</Text>}
                </View>
                <View className="bg-gray-100 px-2 py-0.5 rounded">
                  <Text className="text-[10px] font-bold text-gray-600">{party.type}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {showList && filteredParties && filteredParties.length === 0 && (
        <View className="bg-white border border-gray-200 rounded-md mt-1 p-3">
          <Text className="text-sm text-gray-500 text-center">No matching parties found</Text>
        </View>
      )}
    </View>
  );
}
