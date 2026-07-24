import client from './client';

export interface ExpenseCategory {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface ExpenseEntry {
  id: string;
  category_id: string;
  expense_name: string;
  cash_amount: number;
  upi_amount: number;
  total_amount: number;
  note?: string;
  spent_at: string;
}

export async function fetchExpenseCategories(activeOnly: boolean = true): Promise<ExpenseCategory[]> {
  const response = await client.get(`/expenses/categories?active_only=${activeOnly}`);
  return response.data;
}

export async function createExpenseCategory(name: string, sort_order: number = 0, is_active: boolean = true): Promise<ExpenseCategory> {
  const response = await client.post('/expenses/categories', {
    name,
    sort_order,
    is_active
  });
  return response.data;
}

export async function updateExpenseCategory(id: string, updates: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
  const response = await client.put(`/expenses/categories/${id}`, updates);
  return response.data;
}

export async function fetchExpensesHistory(limit: number = 50): Promise<ExpenseEntry[]> {
  const response = await client.get(`/expenses/?limit=${limit}`);
  return response.data;
}

export async function createExpenseEntry(
  category_id: string,
  expense_name: string,
  cash_amount: number,
  upi_amount: number,
  note?: string
): Promise<ExpenseEntry> {
  const response = await client.post('/expenses/', {
    category_id,
    expense_name,
    cash_amount,
    upi_amount,
    note
  });
  return response.data;
}

export async function updateExpenseEntry(
  id: string,
  category_id: string,
  expense_name: string,
  cash_amount: number,
  upi_amount: number,
  note?: string
): Promise<ExpenseEntry> {
  const response = await client.put(`/expenses/${id}`, {
    category_id,
    expense_name,
    cash_amount,
    upi_amount,
    note
  });
  return response.data;
}

export async function deleteExpenseEntry(id: string): Promise<void> {
  await client.delete(`/expenses/${id}`);
}
