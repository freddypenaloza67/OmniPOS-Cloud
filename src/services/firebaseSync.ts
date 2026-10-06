import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  Unsubscribe 
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError, testFirestoreConnection } from './firebase';
import { AppState, Product, Customer, Supplier, Sale, Purchase, StoreSettings } from '../types';

export interface FirebaseSyncStatus {
  isConfigured: boolean;
  isOnline: boolean;
  isFromCache: boolean;
  hasInitialSync: boolean;
  pendingWrites: boolean;
  lastCloudSync: string | null;
  errorMessage: string | null;
}

/**
 * Recursively cleans any object/array so that no property has an `undefined` value,
 * which Firestore strictly rejects with "Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as any;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as any;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean as T;
}

// Save individual entities to Firestore with defensive checks & error handling
export async function syncProductToFirestore(product: Product): Promise<void> {
  const path = `products/${product.id}`;
  try {
    const docRef = doc(db, 'products', product.id);
    const payload = sanitizeForFirestore({
      id: product.id,
      name: product.name || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      category: product.category || 'General',
      costUSD: Number(product.costUSD) || 0,
      priceUSD: Number(product.priceUSD) || 0,
      stock: Number(product.stock) || 0,
      minStock: Number(product.minStock) || 0,
      unit: product.unit || 'unidad',
      description: product.description || '',
      supplierId: product.supplierId || '',
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function syncCustomerToFirestore(customer: Customer): Promise<void> {
  const path = `customers/${customer.id}`;
  try {
    const payload = sanitizeForFirestore({
      id: customer.id,
      name: customer.name || '',
      taxId: customer.taxId || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      creditLimitUSD: Number(customer.creditLimitUSD) || 0,
      currentDebtUSD: Number(customer.currentDebtUSD) || 0,
      notes: customer.notes || ''
    });
    await setDoc(doc(db, 'customers', customer.id), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function syncSupplierToFirestore(supplier: Supplier): Promise<void> {
  const path = `suppliers/${supplier.id}`;
  try {
    const payload = sanitizeForFirestore({
      id: supplier.id,
      name: supplier.name || '',
      taxId: supplier.taxId || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      paymentTerms: supplier.paymentTerms || '',
      notes: supplier.notes || ''
    });
    await setDoc(doc(db, 'suppliers', supplier.id), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function syncSaleToFirestore(sale: Sale): Promise<void> {
  const path = `sales/${sale.id}`;
  try {
    const rawItems = (sale.items || []).map(item => ({
      productId: item.productId || '',
      productName: item.productName || '',
      sku: item.sku || '',
      barcode: (item as any).barcode || '',
      quantity: Number(item.quantity) || 1,
      unitPriceUSD: Number(item.unitPriceUSD) || 0,
      subtotalUSD: Number(item.subtotalUSD) || 0,
      costUSD: Number(item.costUSD) || 0
    }));

    const rawPaymentMethods = (sale.paymentMethods || []).map(pm => {
      const cleanPm: Record<string, any> = {
        gateway: pm.gateway || 'cash_usd',
        gatewayName: pm.gatewayName || 'Efectivo',
        amountUSD: Number(pm.amountUSD) || 0,
        amountLocal: Number(pm.amountLocal) || 0
      };
      if (pm.reference && typeof pm.reference === 'string' && pm.reference.trim()) {
        cleanPm.reference = pm.reference.trim();
      }
      if (pm.bank && typeof pm.bank === 'string' && pm.bank.trim()) {
        cleanPm.bank = pm.bank.trim();
      }
      return cleanPm;
    });

    const payload = sanitizeForFirestore({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber || `FAC-${sale.id}`,
      date: sale.date || new Date().toISOString(),
      customerId: sale.customerId || '',
      customerName: sale.customerName || 'Cliente Ocasional',
      customerTaxId: sale.customerTaxId || 'V-00000000',
      items: rawItems,
      subtotalUSD: Number(sale.subtotalUSD) || 0,
      discountUSD: Number(sale.discountUSD) || 0,
      taxUSD: Number(sale.taxUSD) || 0,
      totalUSD: Number(sale.totalUSD) || 0,
      totalLocal: Number(sale.totalLocal) || 0,
      exchangeRateUsed: Number(sale.exchangeRateUsed) || 1,
      currencyCode: sale.currencyCode || 'VES',
      currencySymbol: sale.currencySymbol || 'Bs.',
      paymentMethods: rawPaymentMethods,
      amountReceivedUSD: Number(sale.amountReceivedUSD) || 0,
      changeGivenUSD: Number(sale.changeGivenUSD) || 0,
      changeGivenLocal: Number(sale.changeGivenLocal) || 0,
      status: sale.status || 'completed',
      notes: sale.notes || ''
    });

    await setDoc(doc(db, 'sales', sale.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function syncPurchaseToFirestore(purchase: Purchase): Promise<void> {
  const path = `purchases/${purchase.id}`;
  try {
    const rawItems = (purchase.items || []).map(item => ({
      productId: item.productId || '',
      productName: item.productName || '',
      sku: item.sku || '',
      quantity: Number(item.quantity) || 1,
      unitCostUSD: Number(item.unitCostUSD) || 0,
      totalCostUSD: Number(item.totalCostUSD) || 0
    }));

    const payload = sanitizeForFirestore({
      id: purchase.id,
      invoiceNumber: purchase.invoiceNumber || `COM-${purchase.id}`,
      date: purchase.date || new Date().toISOString(),
      supplierId: purchase.supplierId || '',
      supplierName: purchase.supplierName || 'Proveedor',
      items: rawItems,
      totalUSD: Number(purchase.totalUSD) || 0,
      totalLocal: Number(purchase.totalLocal) || 0,
      exchangeRateUsed: Number(purchase.exchangeRateUsed) || 1,
      paymentStatus: purchase.paymentStatus || 'paid',
      paymentMethod: purchase.paymentMethod || 'cash_usd',
      notes: purchase.notes || '',
      scannedInvoiceUrl: purchase.scannedInvoiceUrl || ''
    });

    await setDoc(doc(db, 'purchases', purchase.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function syncSettingsToFirestore(settings: StoreSettings): Promise<void> {
  const path = 'settings/general';
  try {
    const payload = sanitizeForFirestore({
      storeName: settings.storeName || 'Mi Comercio',
      taxId: settings.taxId || '',
      address: settings.address || '',
      phone: settings.phone || '',
      email: settings.email || '',
      receiptFooter: settings.receiptFooter || '',
      taxPercentage: Number(settings.taxPercentage) || 0,
      taxCalculationMode: settings.taxCalculationMode || 'included',
      exchangeRate: Number(settings.exchangeRate) > 0 ? Number(settings.exchangeRate) : 52.40,
      lastRateUpdate: settings.lastRateUpdate || new Date().toISOString(),
      autoUpdateRate: Boolean(settings.autoUpdateRate),
      primaryCurrency: settings.primaryCurrency || { code: 'USD', symbol: '$', name: 'Dólar Estadounidense' },
      secondaryCurrency: settings.secondaryCurrency || { code: 'VES', symbol: 'Bs.', name: 'Bolívar Digital' }
    });
    await setDoc(doc(db, 'settings', 'general'), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// Initial upload of local dataset if Firestore database is fresh/empty
export async function seedFirestoreIfEmpty(localState: AppState): Promise<boolean> {
  try {
    const productsSnap = await getDocs(collection(db, 'products'));
    if (productsSnap.empty && localState.products.length > 0) {
      console.log('Seeding initial data into Firebase Firestore...');
      for (const p of localState.products) {
        await syncProductToFirestore(p);
      }
      for (const c of localState.customers) {
        await syncCustomerToFirestore(c);
      }
      for (const s of localState.suppliers) {
        await syncSupplierToFirestore(s);
      }
      for (const sale of localState.sales) {
        await syncSaleToFirestore(sale);
      }
      for (const purch of localState.purchases) {
        await syncPurchaseToFirestore(purch);
      }
      await syncSettingsToFirestore(localState.settings);
      console.log('Firestore seed completed successfully.');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Could not auto-seed Firestore (may already have records or offline):', err);
    return false;
  }
}

// Realtime listeners subscriber with Offline detection
export function subscribeToFirestoreUpdates(
  onData: (data: {
    products?: Product[];
    customers?: Customer[];
    suppliers?: Supplier[];
    sales?: Sale[];
    purchases?: Purchase[];
    settings?: Partial<StoreSettings>;
  }) => void,
  onStatusChange: (status: Partial<FirebaseSyncStatus>) => void
): () => void {
  const unsubscribers: Unsubscribe[] = [];

  // Listen to network status
  const updateOnlineStatus = () => {
    onStatusChange({ isOnline: navigator.onLine });
  };
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // Initial connection probe
  testFirestoreConnection().then(online => {
    onStatusChange({ 
      isConfigured: true, 
      isOnline: online, 
      hasInitialSync: true 
    });
  });

  // 1. Products Realtime Listener
  const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
    const products: Product[] = [];
    snapshot.forEach(docSnap => {
      products.push(docSnap.data() as Product);
    });
    onData({ products });
    onStatusChange({
      isFromCache: snapshot.metadata.fromCache,
      pendingWrites: snapshot.metadata.hasPendingWrites,
      lastCloudSync: new Date().toISOString()
    });
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'products');
    onStatusChange({ errorMessage: error.message });
  });
  unsubscribers.push(unsubProducts);

  // 2. Customers Realtime Listener
  const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
    const customers: Customer[] = [];
    snapshot.forEach(docSnap => {
      customers.push(docSnap.data() as Customer);
    });
    onData({ customers });
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'customers');
  });
  unsubscribers.push(unsubCustomers);

  // 3. Suppliers Realtime Listener
  const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
    const suppliers: Supplier[] = [];
    snapshot.forEach(docSnap => {
      suppliers.push(docSnap.data() as Supplier);
    });
    onData({ suppliers });
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'suppliers');
  });
  unsubscribers.push(unsubSuppliers);

  // 4. Sales Realtime Listener
  const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
    const sales: Sale[] = [];
    snapshot.forEach(docSnap => {
      sales.push(docSnap.data() as Sale);
    });
    // Sort descending by date
    sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    onData({ sales });
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'sales');
  });
  unsubscribers.push(unsubSales);

  // 5. Purchases Realtime Listener
  const unsubPurchases = onSnapshot(collection(db, 'purchases'), (snapshot) => {
    const purchases: Purchase[] = [];
    snapshot.forEach(docSnap => {
      purchases.push(docSnap.data() as Purchase);
    });
    purchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    onData({ purchases });
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'purchases');
  });
  unsubscribers.push(unsubPurchases);

  // 6. Settings Realtime Listener
  const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      onData({
        settings: {
          storeName: data.storeName || 'Mi Comercio',
          taxId: data.taxId || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          receiptFooter: data.receiptFooter || '',
          taxPercentage: Number(data.taxPercentage) || 0,
          taxCalculationMode: data.taxCalculationMode === 'additional' ? 'additional' : 'included',
          exchangeRate: Number(data.exchangeRate) > 0 ? Number(data.exchangeRate) : 52.40,
          lastRateUpdate: data.lastRateUpdate || new Date().toISOString(),
          autoUpdateRate: Boolean(data.autoUpdateRate),
          primaryCurrency: data.primaryCurrency || { code: 'USD', symbol: '$', name: 'Dólar Estadounidense' },
          secondaryCurrency: data.secondaryCurrency || { code: 'VES', symbol: 'Bs.', name: 'Bolívar Digital' }
        }
      });
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'settings/general');
  });
  unsubscribers.push(unsubSettings);

  return () => {
    window.removeEventListener('online', updateOnlineStatus);
    window.removeEventListener('offline', updateOnlineStatus);
    unsubscribers.forEach(unsub => unsub());
  };
}

/**
 * Hard Reset: Deletes all products, sales, purchases, suppliers, and customers from Firestore,
 * and re-seeds only the default cashier customer.
 */
export async function wipeFirestoreDatabase(): Promise<void> {
  const collectionsToClear = ['products', 'sales', 'purchases', 'customers', 'suppliers'];
  for (const collName of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, collName));
      if (!snap.empty) {
        const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      }
    } catch (err) {
      console.warn(`Error clearing Firestore collection ${collName}:`, err);
    }
  }

  // Ensure default casual customer exists in Firestore
  try {
    await syncCustomerToFirestore({
      id: "cus-1",
      name: "Cliente Casual (Venta Mostrador)",
      taxId: "V-00000000",
      phone: "N/A",
      email: "",
      address: "",
      creditLimitUSD: 0,
      currentDebtUSD: 0
    });
  } catch (err) {
    console.warn('Error re-seeding default counter customer in Firestore:', err);
  }
}
