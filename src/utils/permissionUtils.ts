import { PosUser, UserRole, NavView } from '../types';

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, NavView[]> = {
  admin: [
    'dashboard',
    'pos',
    'purchases',
    'inventory',
    'suppliers',
    'customers',
    'reports',
    'settings'
  ],
  supervisor: [
    'dashboard',
    'pos',
    'purchases',
    'inventory',
    'suppliers',
    'customers',
    'reports'
  ],
  cajero: [
    'dashboard',
    'pos',
    'customers'
  ]
};

export const MODULE_NAMES: Record<NavView, string> = {
  dashboard: 'Inicio / Tasa Oficial',
  pos: 'Caja POS (Ventas & Cobros)',
  purchases: 'Compras al Mayor',
  inventory: 'Inventario & Kardex',
  suppliers: 'Proveedores',
  customers: 'Clientes & Fiados',
  reports: 'Reportes Financieros & Cierres',
  settings: 'Ajustes del Sistema & Licencia'
};

export const MODULE_REQUIRED_ROLE: Record<NavView, 'admin' | 'supervisor'> = {
  dashboard: 'supervisor',
  pos: 'supervisor',
  purchases: 'supervisor',
  inventory: 'supervisor',
  suppliers: 'supervisor',
  customers: 'supervisor',
  reports: 'supervisor',
  settings: 'admin' // Exclusivo de Administrador General
};

export const getUserAllowedModules = (user: PosUser): NavView[] => {
  if (user.role === 'admin') {
    return DEFAULT_ROLE_PERMISSIONS.admin;
  }
  if (user.allowedModules && user.allowedModules.length > 0) {
    return user.allowedModules;
  }
  return DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.cajero;
};

export const hasModulePermission = (user: PosUser, view: NavView): boolean => {
  if (!user || !user.active) return false;
  if (user.role === 'admin') return true;
  const allowed = getUserAllowedModules(user);
  return allowed.includes(view);
};
