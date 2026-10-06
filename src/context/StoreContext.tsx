import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  AppState, 
  Product, 
  Customer, 
  Supplier, 
  Sale, 
  Purchase, 
  StoreSettings, 
  LicenseData, 
  LicenseStatusInfo,
  PosUser,
  ZReportRecord,
  PaymentMethodEntry,
  AppTheme,
  CartItem
} from '../types';
import { initialData } from '../data/initialData';
import { 
  createDefaultDemoLicense, 
  getLicenseStatus, 
  activateLicenseKeyOnData 
} from '../utils/licenseUtils';
import {
  FirebaseSyncStatus,
  syncProductToFirestore,
  deleteProductFromFirestore,
  syncCustomerToFirestore,
  syncSupplierToFirestore,
  syncSaleToFirestore,
  syncPurchaseToFirestore,
  syncSettingsToFirestore,
  seedFirestoreIfEmpty,
  subscribeToFirestoreUpdates,
  wipeFirestoreDatabase
} from '../services/firebaseSync';

interface StoreContextType {
  state: AppState;
  loading: boolean;
  syncing: boolean;
  lastSynced: string | null;
  syncError: string | null;
  firebaseStatus: FirebaseSyncStatus;
  forceFirebaseSync: () => Promise<boolean>;
  license: LicenseData;
  licenseInfo: LicenseStatusInfo;
  isLicenseModalOpen: boolean;
  setIsLicenseModalOpen: (open: boolean) => void;
  currentUser: PosUser;
  switchUserByPin: (pin: string) => { success: boolean; message?: string; user?: PosUser };
  switchUserDirectly: (userId: string) => void;
  addUser: (user: Omit<PosUser, 'id'>) => Promise<PosUser>;
  updateUser: (user: PosUser) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  saveZReport: (report: Omit<ZReportRecord, 'id' | 'zNumber'>) => Promise<ZReportRecord>;
  activateLicenseKey: (key: string, licensedTo?: string) => Promise<{ success: boolean; message: string }>;
  resetDemoLicense: () => Promise<boolean>;
  saveCurrentState: (newState: AppState) => Promise<boolean>;
  refreshExchangeRate: (targetCurrency?: string) => Promise<void>;
  updateExchangeRateManually: (newRate: number) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (productId: string, quantityDelta: number, reason: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id' | 'invoiceNumber'>) => Promise<Sale>;
  addPurchase: (purchase: Omit<Purchase, 'id' | 'invoiceNumber'> & { invoiceNumber?: string }, updateStock?: boolean) => Promise<Purchase>;
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<Customer>;
  updateCustomer: (customer: Customer) => Promise<void>;
  recordCustomerPayment: (
    customerId: string, 
    paymentMethodsOrAmount: number | PaymentMethodEntry[], 
    paymentMethodNameOrNotes?: string,
    optionalNotes?: string
  ) => Promise<Sale>;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<Supplier>;
  updateSupplier: (supplier: Supplier) => Promise<void>;
  updateSettings: (settings: StoreSettings) => Promise<void>;
  resetToDemoData: () => Promise<void>;
  hardResetDatabase: () => Promise<void>;
  exportDataJSON: () => string;
  importDataJSON: (jsonString: string) => Promise<boolean>;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  // Active POS ticket state (persisted across tab switches and page reloads)
  posCart: CartItem[];
  setPosCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  posCustomerId: string;
  setPosCustomerId: (id: string) => void;
  posDiscountPercent: number;
  setPosDiscountPercent: (percent: number) => void;
  posApplyTax: boolean;
  setPosApplyTax: (apply: boolean) => void;
  clearPosCart: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(initialData);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState<boolean>(false);
  const [, setTick] = useState<number>(0);

  // 3D Claymorphic Theme State (light, dark, eyecare)
  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('omnipos_theme') as AppTheme;
      if (stored === 'light' || stored === 'dark' || stored === 'eyecare') return stored;
    }
    return state.settings.theme || 'light';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const setTheme = useCallback((newTheme: AppTheme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('omnipos_theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    }
    setState(prev => {
      const updated = {
        ...prev,
        settings: {
          ...prev.settings,
          theme: newTheme
        }
      };
      pushStateToServer(updated);
      return updated;
    });
  }, []);

  // Active POS cart persistence across module navigation and browser reloads
  const [posCart, setPosCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('omnipos_active_pos_cart');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [posCustomerId, setPosCustomerIdState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('omnipos_active_pos_customer_id') || 'cus-1';
      } catch {
        return 'cus-1';
      }
    }
    return 'cus-1';
  });

  const [posDiscountPercent, setPosDiscountPercentState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('omnipos_active_pos_discount');
        return saved ? Number(saved) : 0;
      } catch {
        return 0;
      }
    }
    return 0;
  });

  const [posApplyTax, setPosApplyTaxState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('omnipos_active_pos_apply_tax');
        return saved !== null ? saved === 'true' : true;
      } catch {
        return true;
      }
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('omnipos_active_pos_cart', JSON.stringify(posCart));
      } catch (e) {
        console.warn('Could not save pos cart to localStorage', e);
      }
    }
  }, [posCart]);

  const setPosCustomerId = useCallback((id: string) => {
    setPosCustomerIdState(id);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('omnipos_active_pos_customer_id', id);
      } catch {}
    }
  }, []);

  const setPosDiscountPercent = useCallback((percent: number) => {
    setPosDiscountPercentState(percent);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('omnipos_active_pos_discount', String(percent));
      } catch {}
    }
  }, []);

  const setPosApplyTax = useCallback((apply: boolean) => {
    setPosApplyTaxState(apply);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('omnipos_active_pos_apply_tax', String(apply));
      } catch {}
    }
  }, []);

  const clearPosCart = useCallback(() => {
    setPosCart([]);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('omnipos_active_pos_cart');
      } catch {}
    }
  }, []);

  // Live Firebase connection and offline cache status
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseSyncStatus>({
    isConfigured: true,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isFromCache: false,
    hasInitialSync: false,
    pendingWrites: false,
    lastCloudSync: null,
    errorMessage: null
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Periodic tick to keep countdown fresh
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 30000); // every 30 seconds
    return () => clearInterval(timer);
  }, []);

  // Compute live license
  const license: LicenseData = state.license || createDefaultDemoLicense(state.settings?.storeName || 'Mi Comercio');
  const licenseInfo = getLicenseStatus(license);

  // Sync to server API
  const pushStateToServer = async (dataToSave: AppState) => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });
      if (res.ok) {
        const json = await res.json();
        setLastSynced(json.lastSyncedAt || new Date().toISOString());
        localStorage.setItem('omnipos_cache', JSON.stringify(dataToSave));
        return true;
      } else {
        throw new Error('Server returned non-200');
      }
    } catch (err: any) {
      console.warn('Sync failed, saving to local cache:', err);
      setSyncError('Modo local (Sin conexión con el servidor central)');
      localStorage.setItem('omnipos_cache', JSON.stringify(dataToSave));
      return false;
    } finally {
      setSyncing(false);
    }
  };

  // Fetch state on mount
  useEffect(() => {
    let isMounted = true;
    const loadState = async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && data.products) {
            // Ensure license exists
            if (!data.license) {
              data.license = createDefaultDemoLicense(data.settings?.storeName || 'Mi Comercio');
            }
            setState(data);
            setLastSynced(data.lastSyncedAt || new Date().toISOString());
            localStorage.setItem('omnipos_cache', JSON.stringify(data));
          }
        } else {
          throw new Error('API failed');
        }
      } catch (err) {
        console.warn('Could not reach backend state, checking local storage cache...', err);
        const cached = localStorage.getItem('omnipos_cache');
        if (cached && isMounted) {
          try {
            const parsed = JSON.parse(cached);
            if (!parsed.license) {
              parsed.license = createDefaultDemoLicense(parsed.settings?.storeName || 'Mi Comercio');
            }
            setState(parsed);
          } catch {
            setState(initialData);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadState();

    // Initialize Firebase Realtime Listeners & Auto-seed
    const unsubscribeFirebase = subscribeToFirestoreUpdates(
      (incoming) => {
        if (!isMounted) return;
        setState((prev) => {
          let updated = { ...prev };
          let changed = false;

          if (incoming.products && incoming.products.length > 0) {
            updated.products = incoming.products;
            changed = true;
          }
          if (incoming.customers && incoming.customers.length > 0) {
            updated.customers = incoming.customers;
            changed = true;
          }
          if (incoming.suppliers && incoming.suppliers.length > 0) {
            updated.suppliers = incoming.suppliers;
            changed = true;
          }
          if (incoming.sales && incoming.sales.length > 0) {
            updated.sales = incoming.sales;
            changed = true;
          }
          if (incoming.purchases && incoming.purchases.length > 0) {
            updated.purchases = incoming.purchases;
            changed = true;
          }
          if (incoming.settings && incoming.settings.storeName) {
            const rawRate = Number(incoming.settings.exchangeRate);
            const safeRate = !isNaN(rawRate) && rawRate > 0 ? rawRate : (prev.settings.exchangeRate > 0 ? prev.settings.exchangeRate : 52.40);
            updated.settings = { 
              ...prev.settings, 
              ...incoming.settings,
              exchangeRate: safeRate,
              primaryCurrency: incoming.settings.primaryCurrency || prev.settings.primaryCurrency || { code: 'USD', symbol: '$', name: 'Dólar Estadounidense' },
              secondaryCurrency: incoming.settings.secondaryCurrency || prev.settings.secondaryCurrency || { code: 'VES', symbol: 'Bs.', name: 'Bolívar Digital' }
            };
            changed = true;
          }

          if (changed) {
            localStorage.setItem('omnipos_cache', JSON.stringify(updated));
            return updated;
          }
          return prev;
        });
      },
      (statusUpdates) => {
        if (!isMounted) return;
        setFirebaseStatus((prev) => ({ ...prev, ...statusUpdates }));
      }
    );

    // Initial check: if Firestore is empty, seed it with initial local data
    setTimeout(() => {
      if (isMounted) {
        seedFirestoreIfEmpty(stateRef.current).catch(err => {
          console.warn('Initial Firestore seed skipped:', err);
        });
      }
    }, 1500);

    return () => {
      isMounted = false;
      unsubscribeFirebase();
    };
  }, []);

  // Daily exchange rate update on start
  const refreshExchangeRate = useCallback(async (targetCurrency?: string) => {
    try {
      const currCode = targetCurrency || state.settings.secondaryCurrency.code;
      const res = await fetch(`/api/exchange-rate?currency=${encodeURIComponent(currCode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.rate) {
          setState(prev => {
            const updated: AppState = {
              ...prev,
              settings: {
                ...prev.settings,
                exchangeRate: Number(data.rate),
                lastRateUpdate: new Date().toISOString()
              }
            };
            pushStateToServer(updated);
            return updated;
          });
        }
      }
    } catch (err) {
      console.error('Failed to auto-update exchange rate:', err);
    }
  }, [state.settings.secondaryCurrency.code]);

  useEffect(() => {
    if (!loading && state.settings.autoUpdateRate) {
      const lastUpdate = new Date(state.settings.lastRateUpdate || 0);
      const now = new Date();
      // If updated more than 12 hours ago or different day, refresh
      const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600);
      if (hoursDiff > 12) {
        refreshExchangeRate();
      }
    }
  }, [loading, state.settings.autoUpdateRate, state.settings.lastRateUpdate, refreshExchangeRate]);

  const updateExchangeRateManually = async (newRate: number) => {
    if (newRate <= 0) return;
    setState(prev => {
      const updated: AppState = {
        ...prev,
        settings: {
          ...prev.settings,
          exchangeRate: newRate,
          lastRateUpdate: new Date().toISOString()
        }
      };
      pushStateToServer(updated);
      return updated;
    });
  };

  const saveCurrentState = async (newState: AppState): Promise<boolean> => {
    setState(newState);
    return await pushStateToServer(newState);
  };

  // Product management
  const addProduct = async (productData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`
    };
    setState(prev => {
      const updated = {
        ...prev,
        products: [newProduct, ...prev.products]
      };
      pushStateToServer(updated);
      return updated;
    });
    syncProductToFirestore(newProduct).catch(err => {
      console.warn('Firebase sync queued/cached for addProduct:', err);
    });
  };

  const updateProduct = async (product: Product) => {
    setState(prev => {
      const updated = {
        ...prev,
        products: prev.products.map(p => p.id === product.id ? product : p)
      };
      pushStateToServer(updated);
      return updated;
    });
    syncProductToFirestore(product).catch(err => {
      console.warn('Firebase sync queued/cached for updateProduct:', err);
    });
  };

  const deleteProduct = async (id: string) => {
    setState(prev => {
      const updated = {
        ...prev,
        products: prev.products.filter(p => p.id !== id)
      };
      pushStateToServer(updated);
      return updated;
    });
    deleteProductFromFirestore(id).catch(err => {
      console.warn('Firebase sync queued/cached for deleteProduct:', err);
    });
  };

  const adjustStock = async (productId: string, quantityDelta: number, _reason: string) => {
    setState(prev => {
      let targetProduct: Product | undefined;
      const updated = {
        ...prev,
        products: prev.products.map(p => {
          if (p.id === productId) {
            const nextStock = Math.max(0, p.stock + quantityDelta);
            targetProduct = { ...p, stock: nextStock };
            return targetProduct;
          }
          return p;
        })
      };
      pushStateToServer(updated);
      if (targetProduct) {
        syncProductToFirestore(targetProduct).catch(err => {
          console.warn('Firebase stock sync queued:', err);
        });
      }
      return updated;
    });
  };

  // Sale management (POS)
  const addSale = async (saleData: Omit<Sale, 'id' | 'invoiceNumber'>): Promise<Sale> => {
    const activeUser = (state.users && state.users.length > 0 ? state.users : initialData.users || []).find(
      u => u.id === state.activeUserId
    ) || { id: 'usr-admin', name: 'Administrador General' };

    const invoiceNum = `FACT-${String(1000 + state.sales.length + 1).padStart(6, '0')}`;
    const newSale: Sale = {
      ...saleData,
      id: `sale-${Date.now()}`,
      invoiceNumber: invoiceNum,
      cashierId: saleData.cashierId || activeUser.id,
      cashierName: saleData.cashierName || activeUser.name,
      saleType: saleData.saleType || 'sale'
    };

    let affectedProducts: Product[] = [];
    let affectedCustomer: Customer | undefined;

    setState(prev => {
      // 1. Subtract inventory stock
      const updatedProducts = prev.products.map(p => {
        const itemSold = newSale.items.find(item => item.productId === p.id);
        if (itemSold) {
          const updatedP = {
            ...p,
            stock: Math.max(0, p.stock - itemSold.quantity)
          };
          affectedProducts.push(updatedP);
          return updatedP;
        }
        return p;
      });

      // 2. If credit payment gateway is used, increase customer debt
      const creditPayment = newSale.paymentMethods.find(m => m.gateway === 'credit');
      let updatedCustomers = prev.customers;
      if (creditPayment && newSale.customerId) {
        updatedCustomers = prev.customers.map(c => {
          if (c.id === newSale.customerId) {
            affectedCustomer = {
              ...c,
              currentDebtUSD: c.currentDebtUSD + creditPayment.amountUSD
            };
            return affectedCustomer;
          }
          return c;
        });
      }

      const updated: AppState = {
        ...prev,
        products: updatedProducts,
        customers: updatedCustomers,
        sales: [newSale, ...prev.sales]
      };
      pushStateToServer(updated);
      return updated;
    });

    // Realtime & Offline-first Sync to Firebase
    syncSaleToFirestore(newSale).catch(err => console.warn('Sale queued to Firestore:', err));
    affectedProducts.forEach(p => syncProductToFirestore(p).catch(() => {}));
    if (affectedCustomer) syncCustomerToFirestore(affectedCustomer).catch(() => {});

    return newSale;
  };

  // Purchases management
  const addPurchase = async (
    purchaseData: Omit<Purchase, 'id' | 'invoiceNumber'> & { invoiceNumber?: string },
    updateStock: boolean = true
  ): Promise<Purchase> => {
    const invoiceNum = purchaseData.invoiceNumber && purchaseData.invoiceNumber.trim().length > 0
      ? purchaseData.invoiceNumber.trim()
      : `COM-${String(500 + state.purchases.length + 1).padStart(5, '0')}`;
    
    const newPurchase: Purchase = {
      ...purchaseData,
      id: `pur-${Date.now()}`,
      invoiceNumber: invoiceNum
    };

    let affectedProducts: Product[] = [];

    setState(prev => {
      let updatedProducts = prev.products;

      if (updateStock) {
        updatedProducts = prev.products.map(prod => {
          const itemPurchased = newPurchase.items.find(i => i.productId === prod.id || i.productName.toLowerCase().trim() === prod.name.toLowerCase().trim());
          if (itemPurchased) {
            const up = {
              ...prod,
              stock: prod.stock + itemPurchased.quantity,
              costUSD: itemPurchased.unitCostUSD > 0 ? itemPurchased.unitCostUSD : prod.costUSD
            };
            affectedProducts.push(up);
            return up;
          }
          return prod;
        });

        // If items are brand new products not in inventory, auto-register them
        newPurchase.items.forEach(item => {
          const exists = updatedProducts.some(p => p.id === item.productId || p.name.toLowerCase().trim() === item.productName.toLowerCase().trim());
          if (!exists) {
            const estimatedPrice = Number((item.unitCostUSD * 1.35).toFixed(2));
            const newProd: Product = {
              id: item.productId || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: item.productName,
              sku: item.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
              barcode: '',
              category: 'General',
              costUSD: item.unitCostUSD,
              priceUSD: estimatedPrice > 0 ? estimatedPrice : 1.0,
              stock: item.quantity,
              minStock: 5,
              unit: 'ud'
            };
            updatedProducts = [newProd, ...updatedProducts];
            affectedProducts.push(newProd);
          }
        });
      }

      const updated: AppState = {
        ...prev,
        products: updatedProducts,
        purchases: [newPurchase, ...prev.purchases]
      };
      pushStateToServer(updated);
      return updated;
    });

    syncPurchaseToFirestore(newPurchase).catch(err => console.warn('Purchase queued to Firestore:', err));
    affectedProducts.forEach(p => syncProductToFirestore(p).catch(() => {}));

    return newPurchase;
  };

  // Customers & Debt
  const addCustomer = async (custData: Omit<Customer, 'id'>): Promise<Customer> => {
    const newCust: Customer = {
      ...custData,
      id: `cus-${Date.now()}`
    };
    setState(prev => {
      const updated = {
        ...prev,
        customers: [newCust, ...prev.customers]
      };
      pushStateToServer(updated);
      return updated;
    });
    syncCustomerToFirestore(newCust).catch(err => console.warn('Customer queued to Firestore:', err));
    return newCust;
  };

  const updateCustomer = async (customer: Customer) => {
    setState(prev => {
      const updated = {
        ...prev,
        customers: prev.customers.map(c => c.id === customer.id ? customer : c)
      };
      pushStateToServer(updated);
      return updated;
    });
    syncCustomerToFirestore(customer).catch(err => console.warn('Customer queued to Firestore:', err));
  };

  const recordCustomerPayment = async (
    customerId: string,
    paymentMethodsOrAmount: number | PaymentMethodEntry[],
    paymentMethodNameOrNotes?: string,
    optionalNotes?: string
  ): Promise<Sale> => {
    let createdSale: Sale | null = null;
    const rate = state.settings.exchangeRate;
    const currSymbol = state.settings.secondaryCurrency.symbol;
    const currCode = state.settings.secondaryCurrency.code;

    let methods: PaymentMethodEntry[] = [];
    let totalPaidUSD = 0;
    let customNotes = '';

    if (Array.isArray(paymentMethodsOrAmount)) {
      methods = paymentMethodsOrAmount;
      totalPaidUSD = methods.reduce((acc, m) => acc + m.amountUSD, 0);
      customNotes = paymentMethodNameOrNotes || '';
    } else {
      totalPaidUSD = Number(paymentMethodsOrAmount);
      const name = paymentMethodNameOrNotes || 'Efectivo Divisas ($)';
      methods = [
        {
          gateway: 'cash_usd',
          gatewayName: name,
          amountUSD: totalPaidUSD,
          amountLocal: totalPaidUSD * rate,
          notes: optionalNotes
        }
      ];
      customNotes = optionalNotes || '';
    }

    let updatedCustomerObj: Customer | undefined;
    setState(prev => {
      const customer = prev.customers.find(c => c.id === customerId);
      if (!customer) return prev;

      const newDebt = Math.max(0, customer.currentDebtUSD - totalPaidUSD);
      updatedCustomerObj = { ...customer, currentDebtUSD: newDebt };
      const updatedCustomers = prev.customers.map(c => 
        c.id === customerId ? updatedCustomerObj! : c
      );

      const activeUser = (prev.users && prev.users.length > 0 ? prev.users : initialData.users || []).find(
        u => u.id === prev.activeUserId
      ) || { id: 'usr-admin', name: 'Administrador General' };

      // Create an internal credit settlement sale entry
      const abonoSale: Sale = {
        id: `abono-${Date.now()}`,
        invoiceNumber: `ABONO-${String(2000 + prev.sales.length + 1).padStart(6, '0')}`,
        date: new Date().toISOString(),
        customerId: customer.id,
        customerName: customer.name,
        customerTaxId: customer.taxId,
        cashierId: activeUser.id,
        cashierName: activeUser.name,
        saleType: 'abono',
        items: [
          {
            productId: 'abono-credito',
            productName: `Abono a Cuenta por Cobrar (Fiado) - ${customer.name}`,
            sku: 'ABONO',
            quantity: 1,
            unitPriceUSD: totalPaidUSD,
            subtotalUSD: totalPaidUSD,
            costUSD: 0
          }
        ],
        subtotalUSD: totalPaidUSD,
        discountUSD: 0,
        taxUSD: 0,
        totalUSD: totalPaidUSD,
        totalLocal: totalPaidUSD * rate,
        exchangeRateUsed: rate,
        currencyCode: currCode,
        currencySymbol: currSymbol,
        paymentMethods: methods,
        amountReceivedUSD: totalPaidUSD,
        changeGivenUSD: 0,
        changeGivenLocal: 0,
        status: 'completed',
        notes: customNotes || `Abono de fiado. Saldo restante: $${newDebt.toFixed(2)}`
      };

      createdSale = abonoSale;

      const updated = {
        ...prev,
        customers: updatedCustomers,
        sales: [abonoSale, ...prev.sales]
      };
      pushStateToServer(updated);

      syncSaleToFirestore(abonoSale).catch(() => {});
      if (updatedCustomerObj) syncCustomerToFirestore(updatedCustomerObj).catch(() => {});

      return updated;
    });

    return createdSale!;
  };

  // Suppliers
  const addSupplier = async (supData: Omit<Supplier, 'id'>): Promise<Supplier> => {
    const newSup: Supplier = {
      ...supData,
      id: `sup-${Date.now()}`
    };
    setState(prev => {
      const updated = {
        ...prev,
        suppliers: [newSup, ...prev.suppliers]
      };
      pushStateToServer(updated);
      return updated;
    });
    syncSupplierToFirestore(newSup).catch(err => console.warn('Supplier queued to Firestore:', err));
    return newSup;
  };

  const updateSupplier = async (supplier: Supplier) => {
    setState(prev => {
      const updated = {
        ...prev,
        suppliers: prev.suppliers.map(s => s.id === supplier.id ? supplier : s)
      };
      pushStateToServer(updated);
      return updated;
    });
    syncSupplierToFirestore(supplier).catch(err => console.warn('Supplier queued to Firestore:', err));
  };

  // Settings
  const updateSettings = async (settings: StoreSettings) => {
    setState(prev => {
      const updated = {
        ...prev,
        settings
      };
      pushStateToServer(updated);
      return updated;
    });
    syncSettingsToFirestore(settings).catch(err => console.warn('Settings queued to Firestore:', err));
  };

  // Manual trigger to force complete synchronization with Firebase cloud
  const forceFirebaseSync = async (): Promise<boolean> => {
    try {
      setSyncing(true);
      const current = stateRef.current;
      for (const p of current.products) await syncProductToFirestore(p);
      for (const c of current.customers) await syncCustomerToFirestore(c);
      for (const s of current.suppliers) await syncSupplierToFirestore(s);
      for (const sale of current.sales) await syncSaleToFirestore(sale);
      for (const pur of current.purchases) await syncPurchaseToFirestore(pur);
      await syncSettingsToFirestore(current.settings);

      setFirebaseStatus(prev => ({
        ...prev,
        lastCloudSync: new Date().toISOString(),
        isFromCache: false,
        pendingWrites: false,
        errorMessage: null
      }));
      return true;
    } catch (err: any) {
      console.error('Manual Firebase sync error:', err);
      setFirebaseStatus(prev => ({ ...prev, errorMessage: err?.message || 'Error sincronizando con Firebase' }));
      return false;
    } finally {
      setSyncing(false);
    }
  };

  const resetToDemoData = async () => {
    setState(initialData);
    await pushStateToServer(initialData);
  };

  const hardResetDatabase = async () => {
    setSyncing(true);
    try {
      // 1. Wipe cloud Firestore collections
      await wipeFirestoreDatabase();

      // 2. Wipe server database.json
      try {
        await fetch('/api/hard-reset', { method: 'POST' });
      } catch (err) {
        console.warn('Could not call /api/hard-reset:', err);
      }

      // 3. Clear active POS tickets and session state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('omnipos_active_pos_cart');
        localStorage.setItem('omnipos_active_pos_customer_id', 'cus-1');
        localStorage.removeItem('omnipos_active_pos_discount');
      }
      setPosCart([]);
      setPosCustomerIdState('cus-1');
      setPosDiscountPercentState(0);

      // 4. Reset fiscal identity & business info to blank, license to demo, and admin to PIN 1234
      const cleanSettings: StoreSettings = {
        storeName: "",
        taxId: "",
        address: "",
        phone: "",
        email: "",
        receiptFooter: "",
        taxPercentage: 16,
        taxCalculationMode: 'included',
        primaryCurrency: { code: "USD", symbol: "$", name: "Dólar Estadounidense" },
        secondaryCurrency: { code: "VES", symbol: "Bs.", name: "Bolívar Digital" },
        exchangeRate: state.settings?.exchangeRate > 0 ? state.settings.exchangeRate : 52.40,
        lastRateUpdate: new Date().toISOString(),
        autoUpdateRate: true,
        configuredBanks: ['Banesco', 'Banco de Venezuela', 'Mercantil', 'BBVA Provincial', 'BNC', 'Bancaribe', 'Banplus', 'Otro'],
        defaultThermalWidth: '80mm',
        theme: 'light'
      };

      try {
        await syncSettingsToFirestore(cleanSettings);
      } catch (err) {
        console.warn('Could not sync blank settings to Firestore:', err);
      }

      const cleanState: AppState = {
        settings: cleanSettings,
        license: createDefaultDemoLicense('Comercio No Registrado'),
        products: [],
        suppliers: [],
        customers: [
          {
            id: "cus-1",
            name: "Cliente Casual (Venta Mostrador)",
            taxId: "V-00000000",
            phone: "N/A",
            email: "",
            address: "",
            creditLimitUSD: 0,
            currentDebtUSD: 0
          }
        ],
        sales: [],
        purchases: [],
        users: [
          {
            id: "usr-admin",
            name: "Administrador General",
            role: "admin",
            pin: "1234",
            active: true,
            email: "admin@omnipos.com"
          }
        ],
        activeUserId: 'usr-admin',
        zReports: [],
        lastSyncedAt: new Date().toISOString()
      };
      setState(cleanState);
      await pushStateToServer(cleanState);
    } finally {
      setSyncing(false);
    }
  };

  const exportDataJSON = () => {
    return JSON.stringify(state, null, 2);
  };

  const importDataJSON = async (jsonString: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.products && parsed.settings) {
        setState(parsed);
        await pushStateToServer(parsed);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const activateLicenseKey = async (key: string, licensedTo?: string): Promise<{ success: boolean; message: string }> => {
    try {
      // First try backend API
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, licensedTo })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.license) {
          setState(prev => ({ ...prev, license: json.license }));
          localStorage.setItem('omnipos_cache', JSON.stringify({ ...state, license: json.license }));
          return { success: true, message: json.message || 'Licencia activada exitosamente' };
        }
      }
      const errJson = await res.json().catch(() => null);
      if (errJson?.message) {
        return { success: false, message: errJson.message };
      }
    } catch (e) {
      console.warn('Backend activation failed, trying client validation:', e);
    }

    // Client fallback validation
    const curLic = state.license || createDefaultDemoLicense(state.settings?.storeName || 'Mi Comercio');
    const result = activateLicenseKeyOnData(key, curLic, licensedTo);
    if (result.success && result.newLicense) {
      const updatedState = { ...state, license: result.newLicense };
      setState(updatedState);
      await pushStateToServer(updatedState);
      return { success: true, message: result.message };
    }
    return { success: false, message: result.message || 'Error activando la clave' };
  };

  const resetDemoLicense = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/license/reset-demo', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.license) {
          setState(prev => ({ ...prev, license: json.license }));
          localStorage.setItem('omnipos_cache', JSON.stringify({ ...state, license: json.license }));
          return true;
        }
      }
    } catch (e) {
      console.warn('Backend reset demo failed, using client fallback:', e);
    }

    const newDemo = createDefaultDemoLicense(
      state.settings?.storeName || 'Mi Comercio',
      state.license?.systemId
    );
    const updatedState = { ...state, license: newDemo };
    setState(updatedState);
    await pushStateToServer(updatedState);
    return true;
  };

  // User Session & Permissions
  const usersList = state.users && state.users.length > 0 ? state.users : (initialData.users || []);
  const activeUserId = state.activeUserId || 'usr-admin';
  const currentUser: PosUser = usersList.find(u => u.id === activeUserId && u.active) || usersList[0] || {
    id: 'usr-admin',
    name: 'Administrador General',
    role: 'admin',
    pin: '1234',
    active: true
  };

  const switchUserByPin = (pin: string) => {
    const cleanPin = pin.trim();
    const allUsers = state.users && state.users.length > 0 ? state.users : (initialData.users || []);
    const user = allUsers.find(u => u.pin === cleanPin && u.active);
    if (!user) {
      return { success: false, message: 'PIN incorrecto o usuario inactivo.' };
    }
    setState(prev => {
      const up = { ...prev, activeUserId: user.id };
      pushStateToServer(up);
      return up;
    });
    return { success: true, user };
  };

  const switchUserDirectly = (userId: string) => {
    setState(prev => {
      const up = { ...prev, activeUserId: userId };
      pushStateToServer(up);
      return up;
    });
  };

  const addUser = async (userData: Omit<PosUser, 'id'>): Promise<PosUser> => {
    const newUser: PosUser = {
      ...userData,
      id: `usr-${Date.now()}`
    };
    setState(prev => {
      const currentUsers = prev.users && prev.users.length > 0 ? prev.users : (initialData.users || []);
      const updated = {
        ...prev,
        users: [...currentUsers, newUser]
      };
      pushStateToServer(updated);
      return updated;
    });
    return newUser;
  };

  const updateUser = async (user: PosUser) => {
    setState(prev => {
      const currentUsers = prev.users && prev.users.length > 0 ? prev.users : (initialData.users || []);
      const updated = {
        ...prev,
        users: currentUsers.map(u => u.id === user.id ? user : u)
      };
      pushStateToServer(updated);
      return updated;
    });
  };

  const deleteUser = async (id: string) => {
    setState(prev => {
      const currentUsers = prev.users && prev.users.length > 0 ? prev.users : (initialData.users || []);
      if (currentUsers.length <= 1) return prev; // Do not delete only user
      const updated = {
        ...prev,
        users: currentUsers.filter(u => u.id !== id),
        activeUserId: prev.activeUserId === id ? currentUsers.find(u => u.id !== id)?.id : prev.activeUserId
      };
      pushStateToServer(updated);
      return updated;
    });
  };

  const saveZReport = async (reportData: Omit<ZReportRecord, 'id' | 'zNumber'>): Promise<ZReportRecord> => {
    const currentZReports = state.zReports || [];
    const zNum = currentZReports.length + 1;
    const newReport: ZReportRecord = {
      ...reportData,
      id: `z-${Date.now()}`,
      zNumber: zNum
    };
    setState(prev => {
      const updated = {
        ...prev,
        zReports: [newReport, ...(prev.zReports || [])]
      };
      pushStateToServer(updated);
      return updated;
    });
    return newReport;
  };

  return (
    <StoreContext.Provider
      value={{
        state,
        loading,
        syncing,
        lastSynced,
        syncError,
        firebaseStatus,
        forceFirebaseSync,
        license,
        licenseInfo,
        isLicenseModalOpen,
        setIsLicenseModalOpen,
        currentUser,
        switchUserByPin,
        switchUserDirectly,
        addUser,
        updateUser,
        deleteUser,
        saveZReport,
        activateLicenseKey,
        resetDemoLicense,
        saveCurrentState,
        refreshExchangeRate,
        updateExchangeRateManually,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        addSale,
        addPurchase,
        addCustomer,
        updateCustomer,
        recordCustomerPayment,
        addSupplier,
        updateSupplier,
        updateSettings,
        resetToDemoData,
        hardResetDatabase,
        exportDataJSON,
        importDataJSON,
        theme,
        setTheme,
        posCart,
        setPosCart,
        posCustomerId,
        setPosCustomerId,
        posDiscountPercent,
        setPosDiscountPercent,
        posApplyTax,
        setPosApplyTax,
        clearPosCart
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
