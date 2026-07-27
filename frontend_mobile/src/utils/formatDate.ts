export const formatDateToDDMMYYYY = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '';
  
  if (typeof dateInput === 'string') {
    // Expects YYYY-MM-DD
    const parts = dateInput.split('T')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateInput;
  }
  
  // Is a Date object
  const d = dateInput.getDate().toString().padStart(2, '0');
  const m = (dateInput.getMonth() + 1).toString().padStart(2, '0');
  const y = dateInput.getFullYear();
  return `${d}/${m}/${y}`;
};
