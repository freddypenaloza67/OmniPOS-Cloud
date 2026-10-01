export type LicenseType = 'demo' | 'monthly' | 'semiannual' | 'annual' | 'lifetime';

export type LicenseStatus = 'active' | 'expiring_soon' | 'expired';

export interface LicenseData {
  systemId: string; // Machine / Installation fingerprint e.g. OMNI-SYS-9A8B-4F12
  type: LicenseType;
  licenseKey: string;
  licensedTo: string; // Store / Customer name
  issuedAt: string; // ISO string
  activatedAt: string; // ISO string
  expiresAt: string | null; // ISO string or null for lifetime
  features: string[]; // List of enabled modules
  status: LicenseStatus;
  notes?: string;
}

export interface LicenseStatusInfo {
  status: LicenseStatus;
  type: LicenseType;
  typeName: string;
  daysRemaining: number;
  hoursRemaining: number;
  percentElapsed: number;
  isExpired: boolean;
  isLifetime: boolean;
  isExpiringSoon: boolean;
  formattedRemaining: string;
  formattedExpiry: string;
}

export interface LicensePlanInfo {
  id: LicenseType;
  name: string;
  badge?: string;
  periodLabel: string;
  durationDays: number | null;
  priceUSD: number;
  description: string;
  features: string[];
  recommended?: boolean;
}
