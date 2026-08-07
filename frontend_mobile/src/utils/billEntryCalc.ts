/** Shared calculation helpers for Bill Entry (purchase + sale + expense). */

export function parseNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

/** Round money/weight money results to exactly 2 decimal places. */
export function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

export function parseIntSafe(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? Math.trunc(v) : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 0;
}

export function totalBirds(boxes: string | number | null | undefined, birdsPerBox: string | number | null | undefined): number {
  return parseIntSafe(boxes) * parseIntSafe(birdsPerBox);
}

/** Net Kg = Weighbridge − (Total Birds × empty_bird_g / 1000). Editable override when netManual. */
export function calcNetKg(
  weighbridge: string | number | null | undefined,
  birds: number,
  emptyBirdG: string | number | null | undefined,
  netOverride: string | number | null | undefined,
  netManual: boolean
): number {
  if (netManual && netOverride !== null && netOverride !== undefined) {
    return Math.max(0, parseNum(netOverride));
  }
  const emptyKg = (parseNum(emptyBirdG) || 40) / 1000;
  return Math.max(0, parseNum(weighbridge) - birds * emptyKg);
}

export function avgWeight(netKg: number, birds: number): number {
  return birds > 0 ? netKg / birds : 0;
}

export function purchaseAmount(netKg: number, rate: string | number | null | undefined): number {
  return round2(netKg * parseNum(rate));
}

export function purchasePaid(cash: string | number | null | undefined, upi: string | number | null | undefined, bank: string | number | null | undefined): number {
  return round2(parseNum(cash) + parseNum(upi) + parseNum(bank));
}

export function purchaseBalance(amount: number, paid: number): number {
  return round2(amount - paid);
}

export function saleInvoice(
  netKg: number,
  rate: string | number | null | undefined,
  boxes: string | number | null | undefined,
  boxRate: string | number | null | undefined
): number {
  return round2(netKg * parseNum(rate) + parseIntSafe(boxes) * parseNum(boxRate));
}

export function saleReceived(cash: string | number | null | undefined, upi: string | number | null | undefined, bank: string | number | null | undefined): number {
  return round2(parseNum(cash) + parseNum(upi) + parseNum(bank));
}

export function saleBalance(invoice: number, received: number): number {
  return round2(invoice - received);
}

export function expenseTotal(cash: string | number | null | undefined, upi: string | number | null | undefined): number {
  return round2(parseNum(cash) + parseNum(upi));
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
  birds_override?: string | number;
  birds_manual?: boolean;
  amount_override?: string | number;
  amount_manual?: boolean;
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
  birds_override?: string | number;
  birds_manual?: boolean;
  amount_override?: string | number;
  amount_manual?: boolean;
}

export interface ExpenseRowLike {
  cash_amount: string | number;
  upi_amount: string | number;
}

export function derivePurchase(row: PurchaseRowLike, emptyBirdG: string | number | null | undefined) {
  let birds = totalBirds(row.boxes, row.birds_per_box);
  if (row.birds_manual && row.birds_override !== undefined) {
    birds = Math.max(0, parseIntSafe(row.birds_override));
  }
  const net = calcNetKg(row.weighbridge_weight, birds, emptyBirdG, row.net_weight, !!row.net_manual);
  let amount = purchaseAmount(net, row.purchase_rate);
  if (row.amount_manual && row.amount_override !== undefined) {
    amount = round2(Math.max(0, parseNum(row.amount_override)));
  }
  const paid = purchasePaid(row.cash_payment, row.upi_payment, row.bank_payment);
  return {
    birds,
    net: round2(net),
    avgWt: avgWeight(net, birds),
    amount,
    paid,
    balance: purchaseBalance(amount, paid),
  };
}

export function deriveSale(row: SaleRowLike, emptyBirdG: string | number | null | undefined) {
  let birds = totalBirds(row.boxes, row.birds_per_box);
  if (row.birds_manual && row.birds_override !== undefined) {
    birds = Math.max(0, parseIntSafe(row.birds_override));
  }
  const net = calcNetKg(row.weighbridge_weight, birds, emptyBirdG, row.net_weight, !!row.net_manual);
  let invoice = saleInvoice(net, row.weight_rate, row.boxes, row.box_rate);
  if (row.amount_manual && row.amount_override !== undefined) {
    invoice = round2(Math.max(0, parseNum(row.amount_override)));
  }
  const received = saleReceived(row.cash_payment, row.upi_payment, row.bank_payment);
  return {
    birds,
    net: round2(net),
    invoice,
    received,
    balance: saleBalance(invoice, received),
  };
}

export function deriveExpense(row: ExpenseRowLike) {
  return { total: expenseTotal(row.cash_amount, row.upi_amount) };
}

/** True when saved value differs from auto-calc (used to restore pencil vs textbox after reload). */
function differs(a: number, b: number, eps = 0.005): boolean {
  return Math.abs(a - b) > eps;
}

/**
 * Infer Tot Birds / Net Kg / Amount override flags from persisted purchase fields.
 * Manual mode when saved value ≠ what boxes×bpb / weighbridge formula / rate would produce.
 */
export function inferPurchaseOverrides(
  p: {
    total_boxes?: number | null;
    birds_per_box?: number | null;
    actual_birds?: number | null;
    weighbridge_weight?: number | null;
    net_weight?: number | null;
    purchase_rate?: number | null;
    purchase_amount?: number | null;
  },
  emptyBirdG: string | number | null | undefined
) {
  const boxes = parseIntSafe(p.total_boxes);
  const bpb = parseIntSafe(p.birds_per_box);
  const autoBirds = totalBirds(boxes, bpb);
  const actualBirds = parseIntSafe(p.actual_birds ?? autoBirds);
  const birdsManual = actualBirds !== autoBirds;
  const birds = birdsManual ? actualBirds : autoBirds;

  const autoNet = round2(calcNetKg(p.weighbridge_weight, birds, emptyBirdG, null, false));
  const savedNet = round2(parseNum(p.net_weight));
  const netManual = differs(savedNet, autoNet);
  const net = netManual ? savedNet : autoNet;

  const autoAmount = purchaseAmount(net, p.purchase_rate);
  const savedAmount = round2(parseNum(p.purchase_amount));
  const amountManual = differs(savedAmount, autoAmount);

  return {
    birds_manual: birdsManual,
    birds_override: birdsManual ? String(actualBirds) : '',
    net_manual: netManual,
    net_weight: savedNet.toFixed(2),
    amount_manual: amountManual,
    amount_override: amountManual ? savedAmount.toFixed(2) : '',
  };
}

/**
 * Infer Tot Birds / Net Kg / Invoice override flags from persisted sale fields.
 */
export function inferSaleOverrides(
  s: {
    boxes?: number | null;
    birds_per_box?: number | null;
    actual_birds?: number | null;
    weighbridge_weight?: number | null;
    net_weight?: number | null;
    weight?: number | null;
    weight_rate?: number | null;
    box_rate?: number | null;
    total_invoice_amount?: number | null;
  },
  emptyBirdG: string | number | null | undefined
) {
  const boxes = parseIntSafe(s.boxes);
  const bpb = parseIntSafe(s.birds_per_box);
  const autoBirds = totalBirds(boxes, bpb);
  const actualBirds = parseIntSafe(s.actual_birds ?? autoBirds);
  const birdsManual = actualBirds !== autoBirds;
  const birds = birdsManual ? actualBirds : autoBirds;

  const savedNet = round2(parseNum(s.net_weight ?? s.weight));
  const autoNet = round2(calcNetKg(s.weighbridge_weight, birds, emptyBirdG, null, false));
  const netManual = differs(savedNet, autoNet);
  const net = netManual ? savedNet : autoNet;

  const autoInvoice = saleInvoice(net, s.weight_rate, boxes, s.box_rate);
  const savedInvoice = round2(parseNum(s.total_invoice_amount));
  const amountManual = differs(savedInvoice, autoInvoice);

  return {
    birds_manual: birdsManual,
    birds_override: birdsManual ? String(actualBirds) : '',
    net_manual: netManual,
    net_weight: savedNet.toFixed(2),
    amount_manual: amountManual,
    amount_override: amountManual ? savedInvoice.toFixed(2) : '',
  };
}

export function summarizeBillEntry(
  purchases: PurchaseRowLike[],
  sales: SaleRowLike[],
  expenses: ExpenseRowLike[],
  emptyBirdG: string | number | null | undefined
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
