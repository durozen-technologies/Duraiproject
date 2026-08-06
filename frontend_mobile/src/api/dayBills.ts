import client from './client';

export interface DayBillPurchasePayload {
  party_id: string;
  item_id?: string | null;
  vehicle_number?: string;
  driver_name?: string;
  driver_id?: string | null;
  total_boxes: number;
  birds_per_box: number;
  actual_birds: number;
  weighbridge_weight: number;
  net_weight: number;
  purchase_rate: number;
  purchase_amount: number;
  cash_payment: number;
  upi_payment: number;
  bank_payment: number;
  remarks?: string;
}

export interface DayBillSalePayload {
  party_id: string;
  item_id?: string | null;
  vehicle_number?: string;
  driver_name?: string;
  driver_id?: string | null;
  weighbridge_weight: number;
  weight: number;
  weight_rate: number;
  weight_amount: number;
  boxes: number;
  birds_per_box: number;
  actual_birds: number;
  box_rate: number;
  box_amount: number;
  total_invoice_amount: number;
  cash_payment: number;
  upi_payment: number;
  bank_payment: number;
}

export interface DayBillExpensePayload {
  category_id: string;
  expense_name: string;
  cash_amount: number;
  upi_amount: number;
  note?: string;
}

export interface DayBillCreatePayload {
  date: string;
  empty_bird_weight_g: number;
  purchases: DayBillPurchasePayload[];
  sales: DayBillSalePayload[];
  expenses: DayBillExpensePayload[];
}

export interface DayBillListItem {
  id: string;
  bill_number: string;
  date: string;
  empty_bird_weight_g: number;
  purchase_names: string[];
  purchase_item_names: string[];
  purchase_entries: number;
  purchase_net_kg: number;
  purchase_count: number;
  purchase_amount: number;
  purchase_to_pay: number;
  sale_names: string[];
  sale_item_names: string[];
  sale_entries: number;
  sale_net_kg: number;
  sale_count: number;
  sale_amount: number;
  sale_pending: number;
  expense_total: number;
}

export interface DayBillDetail extends DayBillListItem {
  purchases: {
    id: string;
    bill_number: string;
    party_id?: string | null;
    item_id?: string | null;
    driver_id?: string | null;
    party_name: string;
    item_name: string;
    driver_name: string;
    driver_mobile: string;
    vehicle_number: string;
    total_boxes: number;
    birds_per_box: number;
    actual_birds: number;
    weighbridge_weight: number;
    net_weight: number;
    purchase_rate: number;
    purchase_amount: number;
    cash_payment: number;
    upi_payment: number;
    bank_payment: number;
    balance_amount: number;
    remarks?: string;
  }[];
  sales: {
    id: string;
    bill_number: string;
    party_id?: string | null;
    item_id?: string | null;
    driver_id?: string | null;
    party_name: string;
    item_name: string;
    driver_name: string;
    driver_mobile: string;
    vehicle_number: string;
    boxes: number;
    birds_per_box: number;
    actual_birds: number;
    weighbridge_weight: number;
    net_weight: number;
    weight?: number;
    weight_rate: number;
    weight_amount?: number;
    box_rate: number;
    box_amount?: number;
    total_invoice_amount: number;
    cash_payment: number;
    upi_payment: number;
    bank_payment: number;
    balance_amount: number;
  }[];
  expenses: {
    id: string;
    category_id?: string | null;
    category_name: string;
    expense_name: string;
    cash_amount: number;
    upi_amount: number;
    total_amount: number;
    note: string;
  }[];
}

export async function createDayBill(payload: DayBillCreatePayload): Promise<DayBillListItem> {
  const response = await client.post('/day-bills/', payload);
  return response.data;
}

export async function updateDayBill(id: string, payload: DayBillCreatePayload): Promise<DayBillListItem> {
  const response = await client.put(`/day-bills/${id}`, payload);
  return response.data;
}

export async function deleteDayBill(id: string): Promise<void> {
  await client.delete(`/day-bills/${id}`);
}

export async function fetchDayBills(params?: {
  start_date?: string;
  end_date?: string;
}): Promise<DayBillListItem[]> {
  const response = await client.get('/day-bills/', { params });
  return response.data;
}

export async function fetchDayBill(id: string): Promise<DayBillDetail> {
  const response = await client.get(`/day-bills/${id}`);
  return response.data;
}
