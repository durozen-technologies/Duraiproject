import React from 'react';
import PartyFormModal from './PartyFormModal';

interface PartyDetailsModalProps {
  isVisible: boolean;
  onClose: () => void;
  party: any | null;
}

/** @deprecated Prefer PartyFormModal directly. Kept for compatibility. */
export default function PartyDetailsModal({ isVisible, onClose, party }: PartyDetailsModalProps) {
  return (
    <PartyFormModal
      visible={isVisible}
      mode="edit"
      party={party}
      onClose={onClose}
    />
  );
}
