export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  costUSD: number;
  priceUSD: number;
  stock: number;
  minStock: number;
  unit: string;
  description?: string;
  supplierId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  taxId: string; // RIF, NIT, RFC
  phone: string;
  email: string;
  address: string;
  paymentTerms: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  taxId: string; // DNI, CI, RIF
  phone: string;
  email: string;
  address: string;
  creditLimitUSD: number;
  currentDebtUSD: number;
  notes?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPriceUSD: number;
  subtotalUSD: number;
  costUSD: number;
}

export type PaymentGatewayType = 
  | 'cash_usd' 
  | 'cash_local' 
  | 'card_terminal' 
  | 'mobile_payment' 
  | 'bank_transfer' 
  | 'zelle' 
  | 'paypal' 
  | 'crypto_usdt' 
  | 'credit';

export interface PaymentMethodEntry {
  gateway: PaymentGatewayType;
  gatewayName: string;
  amountUSD: number;
  amountLocal: number;
  reference?: string;
  bank?: string;
  notes?: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string; // ISO
  customerId?: string;
  customerName: string;
  customerTaxId?: string;
  items: SaleItem[];
  subtotalUSD: number;
  discountUSD: number;
  taxUSD: number;
  totalUSD: number;
  totalLocal: number;
  exchangeRateUsed: number;
  currencyCode: string;
  currencySymbol: string;
  paymentMethods: PaymentMethodEntry[];
  amountReceivedUSD: number;
  changeGivenUSD: number;
  changeGivenLocal: number;
  status: 'completed' | 'cancelled';
  notes?: string;
  cashierId?: string;
  cashierName?: string;
  saleType?: 'sale' | 'abono';
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCostUSD: number;
  totalCostUSD: number;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  date: string;
  supplierId?: string;
  supplierName: string;
  items: PurchaseItem[];
  totalUSD: number;
  totalLocal: number;
  exchangeRateUsed: number;
  paymentStatus: 'paid' | 'pending';
  paymentMethod: string;
  notes?: string;
  scannedInvoiceUrl?: string;
}

export interface StoreSettings {
  storeName: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
  receiptFooter: string;
  taxPercentage: number;
  primaryCurrency: {
    code: string;
    symbol: string;
    name: string;
  };
  secondaryCurrency: {
    code: string;
    symbol: string;
    name: string;
  };
  exchangeRate: number; // 1 primary = X secondary
  lastRateUpdate: string;
  autoUpdateRate: boolean;
  configuredBanks?: string[];
  defaultThermalWidth?: '80mm' | '58mm';
  theme?: AppTheme;
}

export type AppTheme = 'light' | 'dark' | 'eyecare';

export type UserRole = 'admin' | 'supervisor' | 'cajero';

export interface PosUser {
  id: string;
  name: string;
  role: UserRole;
  pin: string; // 4-digit PIN code
  active: boolean;
  email?: string;
  createdAt?: string;
}

export interface InflowSummary {
  gateway: string;
  name: string;
  amountUSD: number;
  amountLocal: number;
  count: number;
}

export interface BankInflowSummary {
  bank: string;
  amountUSD: number;
  amountLocal: number;
  count: number;
  references: string[];
}

export interface UserPerformanceSummary {
  userId: string;
  userName: string;
  role: string;
  totalSalesUSD: number;
  totalSalesLocal: number;
  transactionsCount: number;
  inflowsByGateway: Record<string, number>;
}

export interface ZReportRecord {
  id: string;
  zNumber: number; // Consecutivo fiscal: 1, 2, 3...
  date: string; // YYYY-MM-DD
  openedAt: string;
  closedAt: string;
  closedByUserId: string;
  closedByUserName: string;
  totalSalesUSD: number;
  totalSalesLocal: number;
  transactionsCount: number;
  firstInvoice: string;
  lastInvoice: string;
  inflowsByGateway: Record<string, { name: string; amountUSD: number; amountLocal: number; count: number }>;
  inflowsByBank: Record<string, { bank: string; amountUSD: number; amountLocal: number; count: number }>;
  inflowsByUser: Record<string, { userId: string; userName: string; role: string; totalUSD: number; totalLocal: number; count: number }>;
  cashExpectedUSD: number;
  cashExpectedLocal: number;
  cashCountedUSD?: number;
  cashCountedLocal?: number;
  cashDifferenceUSD?: number;
  cashDifferenceLocal?: number;
  notes?: string;
}

import { LicenseData } from './license';
export * from './license';

export interface AppState {
  settings: StoreSettings;
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  sales: Sale[];
  purchases: Purchase[];
  users?: PosUser[];
  activeUserId?: string;
  zReports?: ZReportRecord[];
  license?: LicenseData;
  lastSyncedAt?: string;
}
