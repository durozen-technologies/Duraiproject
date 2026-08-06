import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, ScrollView, Platform } from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';

function partyId(p: any) {
  return p?.id != null ? String(p.id) : '';
}

export default function PartySearchDropdown({
  parties,
  value,
  onSelect,
  placeholder,
  error,
  onDropdownOpen,
  allOptionLabel,
  allOptionValue = 'all',
}: any) {
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = React.useRef<TextInput>(null);

  const valueStr = value != null && value !== '' ? String(value) : '';
  const isAllSelected = !!allOptionLabel && valueStr === String(allOptionValue);
  const selectedParty = isAllSelected
    ? null
    : parties?.find((p: any) => partyId(p) === valueStr);
  const hasSelection = isAllSelected || !!selectedParty;

  const selectedLabel = isAllSelected
    ? allOptionLabel
    : selectedParty
      ? selectedParty.nickname
        ? `${selectedParty.name} (${selectedParty.nickname})`
        : selectedParty.name
      : '';

  useEffect(() => {
    if (!isFocused) {
      if (isAllSelected) {
        setSearchText(allOptionLabel || '');
      } else if (selectedParty) {
        setSearchText(
          selectedParty.nickname
            ? `${selectedParty.name} (${selectedParty.nickname})`
            : selectedParty.name || '',
        );
      } else if (!valueStr) {
        setSearchText('');
      }
      // If value is set but party not in list yet, keep current text (don't flash UUID)
    }
  }, [valueStr, parties, selectedParty, isAllSelected, allOptionLabel, isFocused]);

  const filteredParties =
    parties?.filter((p: any) => {
      const q = searchText.trim().toLowerCase();
      if (q.length < 1) return false;
      return (
        p.name?.toLowerCase().includes(q) ||
        (p.nickname && p.nickname.toLowerCase().includes(q)) ||
        (p.tamil_name && p.tamil_name.toLowerCase().includes(q))
      );
    }) || [];

  const showAllInList =
    !!allOptionLabel &&
    isFocused &&
    !hasSelection &&
    (searchText.trim().length < 1 ||
      allOptionLabel.toLowerCase().includes(searchText.trim().toLowerCase()));

  const showPartyList = isFocused && !hasSelection && searchText.trim().length >= 1;
  const showList = showAllInList || showPartyList;

  useEffect(() => {
    if (onDropdownOpen) {
      onDropdownOpen(showList);
    }
  }, [showList]);

  const beginEdit = () => {
    setIsFocused(true);
    // Clear selection so user can type a new search without fighting "ALL"/selected label
    if (hasSelection) {
      setSearchText('');
      onSelect('');
    }
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <View className="w-full relative z-[100]" style={{ zIndex: 100 }}>
      <View
        className={`w-full bg-white border ${
          error ? 'border-red-500' : isFocused ? 'border-[#0b4d3a]' : 'border-[#d8e0dc]'
        } rounded-lg px-2.5 min-h-[44px] flex-row items-center`}
      >
        {!isFocused && hasSelection ? (
          <TouchableOpacity className="flex-1 justify-center py-1.5 pr-1" onPress={beginEdit} activeOpacity={0.8}>
            <Text className="text-sm font-bold text-gray-900" numberOfLines={2}>
              {selectedLabel}
            </Text>
            {!isAllSelected && selectedParty?.tamil_name ? (
              <Text className="text-[11px] text-gray-500 mt-0.5" numberOfLines={1}>
                {selectedParty.tamil_name}
              </Text>
            ) : null}
          </TouchableOpacity>
        ) : (
          <TextInput
            ref={inputRef}
            className="flex-1 text-sm text-gray-900 p-0 m-0 bg-transparent outline-none min-h-[40px]"
            placeholder={placeholder || 'Search party...'}
            placeholderTextColor="#9ca3af"
            value={searchText}
            onFocus={() => {
              setIsFocused(true);
              if (hasSelection) {
                setSearchText('');
                onSelect('');
              }
            }}
            onBlur={() => {
              setTimeout(() => setIsFocused(false), 250);
            }}
            onChangeText={(text) => {
              setSearchText(text);
              if (valueStr) {
                onSelect('');
              }
            }}
            style={{ outline: 'none' } as any}
          />
        )}
        {searchText.length > 0 || hasSelection ? (
          <TouchableOpacity
            onPress={() => {
              setSearchText('');
              onSelect('');
              setIsFocused(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="ml-1 p-1"
          >
            <X color="#9ca3af" size={16} />
          </TouchableOpacity>
        ) : (
          <View className="ml-1 pointer-events-none p-1">
            <ChevronDown color="#9ca3af" size={16} />
          </View>
        )}
      </View>

      {showList ? (
        <View
          className="absolute top-full left-0 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-52 shadow-lg"
          style={
            Platform.OS === 'ios'
              ? {
                  zIndex: 999,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 6,
                }
              : { zIndex: 999, elevation: 12 }
          }
        >
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {showAllInList ? (
              <TouchableOpacity
                className="px-3 py-2.5 border-b border-gray-100 active:bg-[#e8f3ee]"
                onPress={() => {
                  onSelect(allOptionValue);
                  setSearchText(allOptionLabel);
                  setIsFocused(false);
                }}
              >
                <Text className="text-sm font-bold text-[#006948]">{allOptionLabel}</Text>
              </TouchableOpacity>
            ) : null}
            {showPartyList &&
              filteredParties.map((party: any) => (
                <TouchableOpacity
                  key={partyId(party)}
                  className="px-3 py-2.5 border-b border-gray-100 active:bg-[#e8f3ee] flex-row justify-between items-center"
                  onPress={() => {
                    const label = party.nickname
                      ? `${party.name} (${party.nickname})`
                      : party.name;
                    setSearchText(label);
                    onSelect(partyId(party));
                    setIsFocused(false);
                  }}
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-sm font-semibold text-gray-900" numberOfLines={2}>
                      {party.name}
                    </Text>
                    {party.nickname ? (
                      <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
                        {party.nickname}
                      </Text>
                    ) : null}
                    {party.tamil_name ? (
                      <Text className="text-[11px] text-gray-400 mt-0.5" numberOfLines={1}>
                        {party.tamil_name}
                      </Text>
                    ) : null}
                  </View>
                  <View className="bg-gray-100 px-1.5 py-0.5 rounded ml-1 shrink-0">
                    <Text className="text-[10px] font-bold text-gray-600">{party.type}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            {showPartyList && filteredParties.length === 0 ? (
              <View className="p-3">
                <Text className="text-xs text-gray-500 text-center">No matches</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
