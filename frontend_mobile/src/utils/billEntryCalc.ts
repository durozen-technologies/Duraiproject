/** Shared calculation helpers for Bill Entry (purchase + sale + expense). */

export function parseNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

export function parseIntSafe(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? Math.trunc(v) : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 0;
}

export function totalBirds(boxes: string | number, birdsPerBox: string | number): number {
  return parseIntSafe(boxes) * parseIntSafe(birdsPerBox);
}

/** Net Kg = Weighbridge − (Total Birds × empty_bird_g / 1000). Editable override when netManual. */
export function calcNetKg(
  weighbridge: string | number,
  birds: number,
  emptyBirdG: string | number,
  netOverride: string | number | null | undefined,
  netManual: boolean
): number {
  if (netManual && netOverride !== null && netOverride !== undefined && netOverride !== '') {
    return Math.max(0, parseNum(netOverride));
  }
  const emptyKg = (parseNum(emptyBirdG) || 40) / 1000;
  return Math.max(0, parseNum(weighbridge) - birds * emptyKg);
}

export function avgWeight(netKg: number, birds: number): number {
  return birds > 0 ? netKg / birds : 0;
}

export function purchaseAmount(netKg: number, rate: string | number): number {
  return netKg * parseNum(rate);
}

export function purchasePaid(cash: string | number, upi: string | number, bank: string | number): number {
  return parseNum(cash) + parseNum(upi) + parseNum(bank);
}

export function purchaseBalance(amount: number, paid: number): number {
  return amount - paid;
}

export function saleInvoice(
  netKg: number,
  rate: string | number,
  boxes: string | number,
  boxRate: string | number
): number {
  return netKg * parseNum(rate) + parseIntSafe(boxes) * parseNum(boxRate);
}

export function saleReceived(cash: string | number, upi: string | number, bank: string | number): number {
  return parseNum(cash) + parseNum(upi) + parseNum(bank);
}

export function saleBalance(invoice: number, received: number): number {
  return invoice - received;
}

export function expenseTotal(cash: string | number, upi: string | number): number {
  return parseNum(cash) + parseNum(upi);
}

export interface PurchaseRowLike {
  boxes: string | number;
  birds_per_box: string | number;
  weighbridge_weight: string | number;
  net_weight: string | number;
  net_manual?: boolean;
  purchase_rate: string | number;
  cash_payment: string | number;
  upi_payment: string | number;
  bank_payment: string | number;
}

export interface SaleRowLike {
  boxes: string | number;
  birds_per_box: string | number;
  weighbridge_weight: string | number;
  net_weight: string | number;
  net_manual?: boolean;
  weight_rate: string | number;
  box_rate: string | number;
  cash_payment: string | number;
  upi_payment: string | number;
  bank_payment: string | number;
}

export interface ExpenseRowLike {
  cash_amount: string | number;
  upi_amount: string | number;
}

export function derivePurchase(row: PurchaseRowLike, emptyBirdG: string | number) {
  const birds = totalBirds(row.boxes, row.birds_per_box);
  const net = calcNetKg(row.weighbridge_weight, birds, emptyBirdG, row.net_weight, !!row.net_manual);
  const amount = purchaseAmount(net, row.purchase_rate);
  const paid = purchasePaid(row.cash_payment, row.upi_payment, row.bank_payment);
  return {
    birds,
    net,
    avgWt: avgWeight(net, birds),
    amount,
    paid,
    balance: purchaseBalance(amount, paid),
  };
}

export function deriveSale(row: SaleRowLike, emptyBirdG: string | number) {
  const birds = totalBirds(row.boxes, row.birds_per_box);
  const net = calcNetKg(row.weighbridge_weight, birds, emptyBirdG, row.net_weight, !!row.net_manual);
  const invoice = saleInvoice(net, row.weight_rate, row.boxes, row.box_rate);
  const received = saleReceived(row.cash_payment, row.upi_payment, row.bank_payment);
  return {
    birds,
    net,
    invoice,
    received,
    balance: saleBalance(invoice, received),
  };
}

export function deriveExpense(row: ExpenseRowLike) {
  return { total: expenseTotal(row.cash_amount, row.upi_amount) };
}

export function summarizeBillEntry(
  purchases: PurchaseRowLike[],
  sales: SaleRowLike[],
  expenses: ExpenseRowLike[],
  emptyBirdG: string | number
) {
  let purchaseAmountSum = 0;
  let purchaseNetSum = 0;
  let purchaseBirds = 0;
  let purchasePaidSum = 0;
  let purchaseBalanceSum = 0;

  purchases.forEach((r) => {
    const d = derivePurchase(r, emptyBirdG);
    purchaseAmountSum += d.amount;
    purchaseNetSum += d.net;
    purchaseBirds += d.birds;
    purchasePaidSum += d.paid;
    purchaseBalanceSum += d.balance;
  });

  let saleInvoiceSum = 0;
  let saleNetSum = 0;
  let saleBirds = 0;
  let saleCash = 0;
  let saleUpi = 0;
  let saleBank = 0;
  let saleBalanceSum = 0;

  sales.forEach((r) => {
    const d = deriveSale(r, emptyBirdG);
    saleInvoiceSum += d.invoice;
    saleNetSum += d.net;
    saleBirds += d.birds;
    saleCash += parseNum(r.cash_payment);
    saleUpi += parseNum(r.upi_payment);
    saleBank += parseNum(r.bank_payment);
    saleBalanceSum += d.balance;
  });

  let expenseSum = 0;
  expenses.forEach((r) => {
    expenseSum += deriveExpense(r).total;
  });

  const profit = saleInvoiceSum - purchaseAmountSum - expenseSum;
  const totalReceived = saleCash + saleUpi + saleBank;

  return {
    purchaseCount: purchases.length,
    purchaseBirds,
    purchaseNetSum,
    purchaseAmountSum,
    purchasePaidSum,
    purchaseBalanceSum,
    saleCount: sales.length,
    saleBirds,
    saleNetSum,
    saleInvoiceSum,
    saleCash,
    saleUpi,
    saleBank,
    totalReceived,
    saleBalanceSum,
    expenseSum,
    remainingWeight: purchaseNetSum - saleNetSum,
    profit,
    outstanding: saleBalanceSum,
  };
}

export function formatMoney(n: number): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const VEHICLE_REGEX = /^[A-Za-z]{2}-\d{2}-[A-Za-z]{1,2}-\d{4}$/;

export function formatVehicleInput(text: string): string {
  const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let formatted = '';
  if (cleaned.length > 0) formatted += cleaned.substring(0, 2);
  if (cleaned.length > 2) formatted += '-' + cleaned.substring(2, 4);
  if (cleaned.length > 4) formatted += '-' + cleaned.substring(4, 6);
  if (cleaned.length > 6) formatted += '-' + cleaned.substring(6, 10);
  return formatted;
}
