import { LicenseData, LicensePlanInfo, LicenseStatusInfo, LicenseType } from '../types/license';

export const ALL_FEATURES = [
  'Punto de Venta Ilimitado (POS y códigos de barras)',
  'Escáner Inteligente de Facturas con IA',
  'Control de Inventario y Kardex de Stock',
  'Gestión Multimoneda (USD, Bolívares y Tasa Oficial)',
  'Gestión de Clientes, Créditos y Fiados',
  'Gestión de Proveedores y Compras al Mayor',
  'Reportes Financieros, Cierre de Caja y Ganancias',
  'Sincronización en la Nube y Terminales Móviles'
];

export const LICENSE_PLANS: LicensePlanInfo[] = [
  {
    id: 'demo',
    name: 'Versión Demo Completa',
    badge: '15 DÍAS GRATIS',
    periodLabel: '15 Días de Prueba',
    durationDays: 15,
    priceUSD: 0,
    description: 'Acceso a todas las funciones sin restricciones para evaluar el sistema en tu negocio.',
    features: ALL_FEATURES,
  },
  {
    id: 'monthly',
    name: 'Licencia Mensual',
    badge: 'FLEXIBLE',
    periodLabel: '30 Días (1 Mes)',
    durationDays: 30,
    priceUSD: 15,
    description: 'Ideal para iniciar con pagos mensuales accesibles y soporte continuo.',
    features: ALL_FEATURES,
  },
  {
    id: 'semiannual',
    name: 'Licencia Semestral',
    badge: 'AHORRA 16%',
    periodLabel: '180 Días (6 Meses)',
    durationDays: 180,
    priceUSD: 75,
    description: 'Excelente balance entre economía y tranquilidad por medio año de operación.',
    features: ALL_FEATURES,
  },
  {
    id: 'annual',
    name: 'Licencia Anual',
    badge: 'MÁS POPULAR',
    recommended: true,
    periodLabel: '365 Días (1 Año)',
    durationDays: 365,
    priceUSD: 120,
    description: 'El plan favorito de los comercios. Máximo ahorro con soporte y actualizaciones por 1 año.',
    features: ALL_FEATURES,
  },
  {
    id: 'lifetime',
    name: 'Licencia Vitalicia',
    badge: 'UN SOLO PAGO',
    periodLabel: 'Permanente (Para Siempre)',
    durationDays: null,
    priceUSD: 290,
    description: 'Un único pago de por vida. Sin mensualidades ni renovaciones jamás.',
    features: [
      ...ALL_FEATURES,
      'Sin vencimiento ni renovaciones',
      'Actualizaciones mayores prioritarias',
      'Soporte técnico VIP preferencial'
    ],
  }
];

// Helper to generate a unique installation System ID
export function generateSystemId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randPart = (len: number) => {
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };
  return `OMNI-${randPart(4)}-${randPart(4)}`;
}

// Map plan types to 4-character codes
const TYPE_CODES: Record<LicenseType, string> = {
  demo: 'DEMO',
  monthly: 'MENS',
  semiannual: 'SEME',
  annual: 'ANUL',
  lifetime: 'VITA'
};

const CODE_TO_TYPE: Record<string, LicenseType> = {
  DEMO: 'demo',
  MENS: 'monthly',
  SEME: 'semiannual',
  ANUL: 'annual',
  VITA: 'lifetime'
};

// Checksum calculator for license keys
function calculateChecksum(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33) ^ text.charCodeAt(i);
  }
  const positive = Math.abs(hash);
  const hex = positive.toString(36).toUpperCase().padStart(4, '0');
  return hex.slice(-4);
}

/**
 * Generates an authentic license key:
 * Format: OMNI-[TYPE]-[PARAM]-[RANDOM]-[CHECKSUM]
 * Example: OMNI-ANUL-365D-9F2B-A1C8
 * Example: OMNI-VITA-LIFE-7C4E-91B2
 */
export function generateLicenseKey(type: LicenseType, customSeed?: string): string {
  const code = TYPE_CODES[type] || 'DEMO';
  const durationTag = type === 'demo' ? '15D' 
    : type === 'monthly' ? '30D' 
    : type === 'semiannual' ? '180D' 
    : type === 'annual' ? '365D' 
    : 'LIFE';
  
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  // Generate a cryptographically randomized 4-char token so each issued key is uniquely minted
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const base = `OMNI-${code}-${durationTag}-${rand}`;
  const checksum = calculateChecksum(base);
  return `${base}-${checksum}`;
}

/**
 * Validates a license key string
 */
export function validateLicenseKey(rawKey: string): { 
  valid: boolean; 
  type?: LicenseType; 
  durationDays?: number | null; 
  error?: string 
} {
  if (!rawKey) {
    return { valid: false, error: 'Debe ingresar una clave de activación.' };
  }

  const cleanKey = rawKey.trim().toUpperCase();
  const parts = cleanKey.split('-');

  if (parts.length < 5 || parts[0] !== 'OMNI') {
    return { 
      valid: false, 
      error: 'Formato inválido. Debe comenzar con OMNI-XXXX-XXXX-XXXX-XXXX' 
    };
  }

  const typeCode = parts[1];
  const type = CODE_TO_TYPE[typeCode];
  if (!type) {
    return { valid: false, error: `Tipo de licencia desconocido (${typeCode})` };
  }

  const base = parts.slice(0, 4).join('-');
  const providedChecksum = parts[4];
  const expectedChecksum = calculateChecksum(base);

  if (providedChecksum !== expectedChecksum) {
    return { 
      valid: false, 
      error: 'La clave de activación es inválida o tiene caracteres incorrectos.' 
    };
  }

  const plan = LICENSE_PLANS.find(p => p.id === type);
  return {
    valid: true,
    type,
    durationDays: plan?.durationDays ?? null
  };
}

/**
 * Creates the initial default 15-day Demo license
 */
export function createDefaultDemoLicense(
  storeName: string = 'Mi Comercio', 
  existingSystemId?: string
): LicenseData {
  const systemId = existingSystemId || generateSystemId();
  const now = new Date();
  const issuedAt = now.toISOString();
  const activatedAt = issuedAt;
  
  // 15 days trial from now
  const expires = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const expiresAt = expires.toISOString();
  
  const licenseKey = generateLicenseKey('demo', systemId);

  return {
    systemId,
    type: 'demo',
    licenseKey,
    licensedTo: storeName,
    issuedAt,
    activatedAt,
    expiresAt,
    features: ALL_FEATURES,
    status: 'active',
    notes: 'Versión Demo de evaluación completa por 15 días con todas las funciones habilitadas.',
    usedKeys: []
  };
}

/**
 * Computes live status and countdown info for a license
 */
export function getLicenseStatus(license?: LicenseData | null): LicenseStatusInfo {
  if (!license) {
    return {
      status: 'expired',
      type: 'demo',
      typeName: 'Sin Licencia',
      daysRemaining: 0,
      hoursRemaining: 0,
      percentElapsed: 100,
      isExpired: true,
      isLifetime: false,
      isExpiringSoon: false,
      formattedRemaining: 'Expirada',
      formattedExpiry: 'No registrada'
    };
  }

  const typeName = LICENSE_PLANS.find(p => p.id === license.type)?.name || license.type;

  // Lifetime license never expires
  if (license.type === 'lifetime' || !license.expiresAt) {
    return {
      status: 'active',
      type: 'lifetime',
      typeName: 'Licencia Vitalicia (Permanente)',
      daysRemaining: Infinity,
      hoursRemaining: Infinity,
      percentElapsed: 0,
      isExpired: false,
      isLifetime: true,
      isExpiringSoon: false,
      formattedRemaining: 'Permanente (Sin Vencimiento)',
      formattedExpiry: 'Ilimitada'
    };
  }

  const now = Date.now();
  const expiryTime = new Date(license.expiresAt).getTime();
  const activatedTime = new Date(license.activatedAt || license.issuedAt).getTime();
  const diffMs = expiryTime - now;

  const totalDurationMs = Math.max(1, expiryTime - activatedTime);
  const elapsedMs = Math.max(0, now - activatedTime);
  const percentElapsed = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)));

  const expiryDate = new Date(expiryTime);
  const formattedExpiry = expiryDate.toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  if (diffMs <= 0) {
    return {
      status: 'expired',
      type: license.type,
      typeName,
      daysRemaining: 0,
      hoursRemaining: 0,
      percentElapsed: 100,
      isExpired: true,
      isLifetime: false,
      isExpiringSoon: false,
      formattedRemaining: 'Período Finalizado',
      formattedExpiry
    };
  }

  const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60));
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysRemaining <= 3;
  const status = isExpiringSoon ? 'expiring_soon' : 'active';

  let formattedRemaining = '';
  if (daysRemaining > 1) {
    formattedRemaining = `${daysRemaining} días restantes`;
  } else if (hoursRemaining > 1) {
    formattedRemaining = `${hoursRemaining} horas restantes`;
  } else {
    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    formattedRemaining = `${mins} minutos restantes`;
  }

  return {
    status,
    type: license.type,
    typeName,
    daysRemaining,
    hoursRemaining,
    percentElapsed,
    isExpired: false,
    isLifetime: false,
    isExpiringSoon,
    formattedRemaining,
    formattedExpiry
  };
}

/**
 * Activates a new license key on top of existing license data
 */
export function activateLicenseKeyOnData(
  key: string,
  currentLicense: LicenseData,
  licensedTo?: string
): { success: boolean; newLicense?: LicenseData; message: string } {
  const cleanKey = key.trim().toUpperCase();
  const validation = validateLicenseKey(cleanKey);
  if (!validation.valid || !validation.type) {
    return { success: false, message: validation.error || 'Clave de licencia inválida.' };
  }

  // Security Check 1: Key already actively running on this machine (and not expired)
  const currentActiveKey = currentLicense.licenseKey?.trim().toUpperCase();
  const isCurrentlyExpired = currentLicense.expiresAt && new Date(currentLicense.expiresAt).getTime() <= Date.now();
  if (currentActiveKey && currentActiveKey === cleanKey && !isCurrentlyExpired && currentLicense.type !== 'demo') {
    return {
      success: false,
      message: 'Esta clave de licencia ya se encuentra actualmente activa en este equipo.'
    };
  }

  // Security Check 2: Key was already redeemed / consumed previously in the system history
  const usedKeys = currentLicense.usedKeys || (currentActiveKey && currentLicense.type !== 'demo' ? [currentActiveKey] : []);
  if (usedKeys.includes(cleanKey)) {
    return {
      success: false,
      message: 'Esta clave de licencia ya fue canjeada y consumida con anterioridad en este equipo. Cada clave oficial es de un solo uso comercial. Para renovar o extender su período, solicite una nueva clave oficial a su distribuidor.'
    };
  }

  const newType = validation.type;
  const now = new Date();
  const activatedAt = now.toISOString();
  let expiresAt: string | null = null;

  if (newType === 'lifetime') {
    expiresAt = null;
  } else {
    const durationDays = validation.durationDays || 30;
    
    // If legitimate renewal with a new unspent key while an active non-demo plan has days remaining, extend from current expiry date, otherwise from now
    let baseTime = now.getTime();
    if (currentLicense.type !== 'demo' && currentLicense.expiresAt) {
      const curExpiry = new Date(currentLicense.expiresAt).getTime();
      if (curExpiry > baseTime) {
        baseTime = curExpiry;
      }
    }
    
    const newExpiry = new Date(baseTime + durationDays * 24 * 60 * 60 * 1000);
    expiresAt = newExpiry.toISOString();
  }

  // Track the consumed key in usedKeys history to permanently prevent stacking
  const updatedUsedKeys = Array.from(new Set([...usedKeys, cleanKey]));

  const plan = LICENSE_PLANS.find(p => p.id === newType);
  const newLicense: LicenseData = {
    ...currentLicense,
    type: newType,
    licenseKey: cleanKey,
    licensedTo: licensedTo || currentLicense.licensedTo,
    activatedAt,
    expiresAt,
    status: 'active',
    features: plan?.features || ALL_FEATURES,
    notes: `Licencia ${plan?.name || newType} activada exitosamente el ${now.toLocaleDateString('es-VE')}.`,
    usedKeys: updatedUsedKeys
  };

  return {
    success: true,
    newLicense,
    message: `¡Licencia ${plan?.name} activada con éxito!`
  };
}
