import { AppState } from '../types';
import { createDefaultDemoLicense } from '../utils/licenseUtils';

export const initialData: AppState = {
  license: createDefaultDemoLicense("Comercio No Registrado"),
  settings: {
    storeName: "Supermercado & Distribuidora Éxito",
    taxId: "J-40982314-8",
    address: "Av. Principal Bolívar, Local #42, Centro Comercial Mayorista",
    phone: "+58 414-555-0199 / +58 212-987-6543",
    email: "ventas@supermercadoxito.com",
    receiptFooter: "¡Gracias por su compra! Conserve su factura para cualquier reclamo o garantía. Válido por 7 días.",
    taxPercentage: 16,
    taxCalculationMode: 'included',
    primaryCurrency: {
      code: "USD",
      symbol: "$",
      name: "Dólar Estadounidense"
    },
    secondaryCurrency: {
      code: "VES",
      symbol: "Bs.",
      name: "Bolívar Digital"
    },
    exchangeRate: 52.40,
    lastRateUpdate: new Date().toISOString(),
    autoUpdateRate: true,
    configuredBanks: [
      'Banesco',
      'Banco de Venezuela',
      'Mercantil',
      'BBVA Provincial',
      'BNC',
      'Bancaribe',
      'Banplus',
      'Otro'
    ],
    defaultThermalWidth: '80mm'
  },
  products: [
    {
      id: "prod-1",
      name: "Harina de Maíz Precocida Harina PAN 1kg",
      sku: "HAR-PAN-001",
      barcode: "7591016000018",
      category: "Víveres",
      costUSD: 1.05,
      priceUSD: 1.45,
      stock: 64,
      minStock: 20,
      unit: "ud",
      description: "Harina de maíz blanco refinada tradicional"
    },
    {
      id: "prod-2",
      name: "Arroz Blanco Grano Largo Mary Especial 1kg",
      sku: "ARR-MRY-002",
      barcode: "7591024001025",
      category: "Víveres",
      costUSD: 1.15,
      priceUSD: 1.60,
      stock: 45,
      minStock: 15,
      unit: "ud",
      description: "Arroz enriquecido tipo I grano largo"
    },
    {
      id: "prod-3",
      name: "Aceite Vegetal Comestible Vatel 1 Litro",
      sku: "ACE-VAT-003",
      barcode: "7591035002031",
      category: "Víveres",
      costUSD: 2.40,
      priceUSD: 3.20,
      stock: 28,
      minStock: 10,
      unit: "lt",
      description: "Aceite puro de soya 100% libre de colesterol"
    },
    {
      id: "prod-4",
      name: "Pasta Larga Spaghetti Primor 1kg",
      sku: "PAS-PRM-004",
      barcode: "7591046003048",
      category: "Víveres",
      costUSD: 1.25,
      priceUSD: 1.80,
      stock: 50,
      minStock: 15,
      unit: "ud"
    },
    {
      id: "prod-margarina-pastorena",
      name: "Margarina con Sal La Pastoreña 500g",
      sku: "MAR-PAS-025",
      barcode: "7592648698228",
      category: "Víveres",
      costUSD: 1.35,
      priceUSD: 1.95,
      stock: 48,
      minStock: 10,
      unit: "ud",
      description: "Untable de margarina con sal 60% de grasa La Pastoreña"
    },
    {
      id: "prod-5",
      name: "Café Molido Gourmet Fama de América 500g",
      sku: "CAF-FAM-005",
      barcode: "7591057004052",
      category: "Café e Infusiones",
      costUSD: 3.20,
      priceUSD: 4.50,
      stock: 18,
      minStock: 8,
      unit: "ud",
      description: "Café 100% puro tostado y molido sabor intenso"
    },
    {
      id: "prod-6",
      name: "Leche Completa Pasteurizada Campestre 1 Litro",
      sku: "LEC-CMP-006",
      barcode: "7591068005069",
      category: "Lácteos",
      costUSD: 1.50,
      priceUSD: 2.10,
      stock: 12,
      minStock: 15,
      unit: "lt",
      description: "Leche pasteurizada con vitaminas A y D"
    },
    {
      id: "prod-7",
      name: "Queso Blanco Semiduro Llanero Pasteurizado 1kg",
      sku: "QUE-LLA-007",
      barcode: "7591079006076",
      category: "Charcutería",
      costUSD: 4.50,
      priceUSD: 6.20,
      stock: 9,
      minStock: 10,
      unit: "kg",
      description: "Queso blanco criollo ideal para rallar"
    },
    {
      id: "prod-8",
      name: "Jamón de Pierna Cocido Superior Plumrose 1kg",
      sku: "JAM-PLU-008",
      barcode: "7591080007083",
      category: "Charcutería",
      costUSD: 6.80,
      priceUSD: 9.50,
      stock: 7,
      minStock: 5,
      unit: "kg"
    },
    {
      id: "prod-9",
      name: "Refresco Coca Cola Original 2 Litros",
      sku: "BEB-COK-009",
      barcode: "7591091008090",
      category: "Bebidas",
      costUSD: 1.70,
      priceUSD: 2.50,
      stock: 35,
      minStock: 12,
      unit: "ud"
    },
    {
      id: "prod-10",
      name: "Agua Mineral Minalba sin Gas 5 Litros",
      sku: "BEB-MIN-010",
      barcode: "7591102009106",
      category: "Bebidas",
      costUSD: 1.40,
      priceUSD: 2.00,
      stock: 40,
      minStock: 15,
      unit: "ud"
    },
    {
      id: "prod-11",
      name: "Detergente en Polvo Multiusos Las Llaves 1kg",
      sku: "LIM-LLA-011",
      barcode: "7591113010113",
      category: "Limpieza",
      costUSD: 1.80,
      priceUSD: 2.60,
      stock: 22,
      minStock: 10,
      unit: "ud"
    },
    {
      id: "prod-12",
      name: "Jabón de Baño Protex Antibacterial 110g Pack x3",
      sku: "HIG-PRX-012",
      barcode: "7591124011120",
      category: "Higiene Personal",
      costUSD: 2.10,
      priceUSD: 3.00,
      stock: 14,
      minStock: 8,
      unit: "paq"
    },
    {
      id: "prod-13",
      name: "Cargador Rápido USB-C 20W Universal",
      sku: "TEC-CAR-013",
      barcode: "7591135012137",
      category: "Tecnología",
      costUSD: 3.50,
      priceUSD: 6.50,
      stock: 16,
      minStock: 5,
      unit: "ud"
    }
  ],
  suppliers: [
    {
      id: "sup-1",
      name: "Alimentos Polar Comercial C.A.",
      taxId: "J-00041372-9",
      phone: "+58 212-202-3111",
      email: "pedidos@empresaspolar.com",
      address: "Edif. Polar, Los Cortijos de Lourdes, Caracas",
      paymentTerms: "Crédito 15 días",
      notes: "Distribuidor mayorista de Harina PAN, Pastas Primor, Mantequilla Mavesa"
    },
    {
      id: "sup-2",
      name: "Distribuidora Mayorista Los Andes",
      taxId: "J-31456789-0",
      phone: "+58 414-301-4422",
      email: "ventas@losandesdist.com",
      address: "Zona Industrial San Vicente II, Galpón 4",
      paymentTerms: "Contado contra entrega",
      notes: "Proveedor de lácteos, quesos y embutidos Plumrose"
    },
    {
      id: "sup-3",
      name: "Coca-Cola FEMSA Distribución",
      taxId: "J-30012485-6",
      phone: "+58 800-2622265",
      email: "atencion@kof.com.ve",
      address: "Zona Industrial La Bandera, Caracas",
      paymentTerms: "Crédito 7 días",
      notes: "Bebidas carbonatadas y aguas Minalba"
    }
  ],
  customers: [
    {
      id: "cus-1",
      name: "Cliente Casual (Venta Mostrador)",
      taxId: "V-00000000",
      phone: "N/A",
      email: "",
      address: "Mostrador",
      creditLimitUSD: 0,
      currentDebtUSD: 0
    },
    {
      id: "cus-2",
      name: "Restaurante El Rincón Criollo C.A.",
      taxId: "J-40112345-2",
      phone: "+58 412-889-1022",
      email: "compras@elrinconcriollo.com",
      address: "Calle Sucre c/c Miranda, Casco Histórico",
      creditLimitUSD: 300,
      currentDebtUSD: 74.50,
      notes: "Cliente recurrente con línea de crédito autorizada"
    },
    {
      id: "cus-3",
      name: "María Elena Rodríguez",
      taxId: "V-16.789.432",
      phone: "+58 416-712-4455",
      email: "maria.rodriguez16@gmail.com",
      address: "Urb. Las Acacias, Edif. Gardenia, Apto 4-B",
      creditLimitUSD: 50,
      currentDebtUSD: 18.20,
      notes: "Vecina de la zona - Pagos por Pago Móvil"
    },
    {
      id: "cus-4",
      name: "Inversiones Panadería El Trigal",
      taxId: "J-50123984-1",
      phone: "+58 424-918-2233",
      email: "gerencia@eltrigalpan.com",
      address: "Av. Universidad c/ Av. Fuerzas Armadas",
      creditLimitUSD: 500,
      currentDebtUSD: 0,
      notes: "Compra por bultos semanalmente"
    }
  ],
  sales: [
    {
      id: "sale-1001",
      invoiceNumber: "FACT-001001",
      date: new Date(Date.now() - 3600000 * 5).toISOString(),
      customerId: "cus-2",
      customerName: "Restaurante El Rincón Criollo C.A.",
      customerTaxId: "J-40112345-2",
      items: [
        {
          productId: "prod-1",
          productName: "Harina de Maíz Precocida Harina PAN 1kg",
          sku: "HAR-PAN-001",
          quantity: 10,
          unitPriceUSD: 1.45,
          subtotalUSD: 14.50,
          costUSD: 1.05
        },
        {
          productId: "prod-3",
          productName: "Aceite Vegetal Comestible Vatel 1 Litro",
          sku: "ACE-VAT-003",
          quantity: 4,
          unitPriceUSD: 3.20,
          subtotalUSD: 12.80,
          costUSD: 2.40
        },
        {
          productId: "prod-7",
          productName: "Queso Blanco Semiduro Llanero Pasteurizado 1kg",
          sku: "QUE-LLA-007",
          quantity: 3,
          unitPriceUSD: 6.20,
          subtotalUSD: 18.60,
          costUSD: 4.50
        }
      ],
      subtotalUSD: 45.90,
      discountUSD: 0,
      taxUSD: 7.34,
      totalUSD: 53.24,
      totalLocal: 2789.78,
      exchangeRateUsed: 52.40,
      currencyCode: "VES",
      currencySymbol: "Bs.",
      paymentMethods: [
        {
          gateway: "mobile_payment",
          gatewayName: "Pago Móvil Banesco",
          amountUSD: 53.24,
          amountLocal: 2789.78,
          reference: "PM-9812401",
          bank: "Banesco Banco Universal"
        }
      ],
      amountReceivedUSD: 53.24,
      changeGivenUSD: 0,
      changeGivenLocal: 0,
      status: "completed",
      notes: "Pedido despachado a cocina"
    },
    {
      id: "sale-1002",
      invoiceNumber: "FACT-001002",
      date: new Date(Date.now() - 3600000 * 2).toISOString(),
      customerId: "cus-1",
      customerName: "Cliente Casual (Venta Mostrador)",
      items: [
        {
          productId: "prod-9",
          productName: "Refresco Coca Cola Original 2 Litros",
          sku: "BEB-COK-009",
          quantity: 2,
          unitPriceUSD: 2.50,
          subtotalUSD: 5.00,
          costUSD: 1.70
        },
        {
          productId: "prod-5",
          productName: "Café Molido Gourmet Fama de América 500g",
          sku: "CAF-FAM-005",
          quantity: 1,
          unitPriceUSD: 4.50,
          subtotalUSD: 4.50,
          costUSD: 3.20
        }
      ],
      subtotalUSD: 9.50,
      discountUSD: 0,
      taxUSD: 1.52,
      totalUSD: 11.02,
      totalLocal: 577.45,
      exchangeRateUsed: 52.40,
      currencyCode: "VES",
      currencySymbol: "Bs.",
      paymentMethods: [
        {
          gateway: "cash_usd",
          gatewayName: "Efectivo Divisas ($)",
          amountUSD: 11.02,
          amountLocal: 577.45
        }
      ],
      amountReceivedUSD: 20.00,
      changeGivenUSD: 8.98,
      changeGivenLocal: 470.55,
      status: "completed"
    }
  ],
  purchases: [
    {
      id: "pur-501",
      invoiceNumber: "FAC-POLAR-88910",
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      supplierId: "sup-1",
      supplierName: "Alimentos Polar Comercial C.A.",
      items: [
        {
          productId: "prod-1",
          productName: "Harina de Maíz Precocida Harina PAN 1kg",
          sku: "HAR-PAN-001",
          quantity: 100,
          unitCostUSD: 1.05,
          totalCostUSD: 105.00
        },
        {
          productId: "prod-4",
          productName: "Pasta Larga Spaghetti Primor 1kg",
          sku: "PAS-PRM-004",
          quantity: 60,
          unitCostUSD: 1.25,
          totalCostUSD: 75.00
        }
      ],
      totalUSD: 180.00,
      totalLocal: 9432.00,
      exchangeRateUsed: 52.40,
      paymentStatus: "paid",
      paymentMethod: "Transferencia Bancaria",
      notes: "Entregado por camión Polar N° 14"
    }
  ],
  users: [
    {
      id: "usr-admin",
      name: "Administrador General",
      role: "admin",
      pin: "1234",
      active: true,
      email: "admin@omnipos.com"
    },
    {
      id: "usr-supervisor",
      name: "Carlos Méndez (Supervisor)",
      role: "supervisor",
      pin: "2024",
      active: true,
      email: "supervisor@omnipos.com"
    },
    {
      id: "usr-cajero-1",
      name: "María Valero (Caja 1)",
      role: "cajero",
      pin: "0000",
      active: true,
      email: "caja1@omnipos.com"
    },
    {
      id: "usr-cajero-2",
      name: "Andrés Colmenares (Caja 2)",
      role: "cajero",
      pin: "1111",
      active: true,
      email: "caja2@omnipos.com"
    }
  ],
  activeUserId: "usr-admin",
  zReports: [],
  lastSyncedAt: new Date().toISOString()
};
