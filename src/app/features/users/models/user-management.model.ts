import { UserRole } from '../../../core/models/auth.model';

export type PermissionKey =
  | 'all'
  | 'customers.view' | 'customers.create' | 'customers.edit' | 'customers.delete'
  | 'catalog.view' | 'catalog.create'
  | 'treasury.view' | 'treasury.manage'
  | 'reports.view' | 'reports.export'
  | 'users.view' | 'users.manage'
  | 'audit.view';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: PermissionKey[];
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:   'مدير عام',
  manager: 'مدير',
  cashier: 'محاسب',
  viewer:  'مشاهد',
};

export interface PermissionGroup {
  key: string;
  label: string;
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  { key: 'customers', label: 'العملاء'      },
  { key: 'catalog',   label: 'الكتالوج'     },
  { key: 'treasury',  label: 'الخزينة'      },
  { key: 'reports',   label: 'التقارير'     },
  { key: 'users',     label: 'المستخدمون'   },
  { key: 'audit',     label: 'سجل التدقيق'  },
];
