import { NavSection } from '../../layouts/admin/sidebar/sidebar.component';
import { PERMISSIONS } from './permissions.const';

/**
 * Sidebar layout. Each item carries `requiredAnyPermission` so the sidebar
 * can hide entries the current user can't act on.
 *
 *   - Read-heavy items use the `*.View` permission.
 *   - Action-heavy items (forms / mutations) include both `View` AND
 *     `FullAccess` so the entry shows for view-only roles too — the
 *     specific action buttons inside each page have their own gates.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'عام',
    items: [
      {
        id: 'dashboard',
        label: 'لوحة التحكم',
        route: '/dashboard',
        icon: 'home',
        requiredAnyPermission: [PERMISSIONS.dashboardView],
      },
    ],
  },
  {
    label: 'المبيعات',
    items: [
      {
        id: 'customers',
        label: 'عملاء الأقساط',
        route: '/customers',
        badgeKey: 'overdueClients',
        badgeType: 'red',
        icon: 'users',
        requiredAnyPermission: [PERMISSIONS.clientsView],
      },
      {
        id: 'catalog',
        label: 'الكتالوج والطلبيات',
        route: '/catalog',
        badgeKey: 'pendingClientOrders',
        badgeType: 'amber',
        icon: 'box',
        requiredAnyPermission: [PERMISSIONS.clientsView],
      },
      {
        id: 'reps',
        label: 'المندوبون',
        route: '/reps',
        icon: 'user-tie',
        requiredAnyPermission: [PERMISSIONS.userManagement],
      },
    ],
  },
  {
    label: 'المشتريات',
    items: [
      {
        id: 'suppliers',
        label: 'الموردون',
        route: '/suppliers',
        icon: 'truck',
        requiredAnyPermission: [PERMISSIONS.suppliersView],
      },
      {
        id: 'invoices',
        label: 'فواتير المشتريات',
        route: '/invoices',
        icon: 'file-invoice',
        requiredAnyPermission: [PERMISSIONS.suppliersView],
      },
    ],
  },
  {
    label: 'المخزون',
    items: [
      {
        id: 'warehouse',
        label: 'المخازن',
        route: '/warehouse',
        icon: 'warehouse',
        requiredAnyPermission: [PERMISSIONS.suppliersView],
      },
      {
        id: 'products',
        label: 'المنتجات',
        route: '/products',
        icon: 'products',
        requiredAnyPermission: [PERMISSIONS.suppliersView],
      },
      {
        id: 'categories',
        label: 'فئات المنتجات',
        route: '/categories',
        icon: 'tag',
        requiredAnyPermission: [PERMISSIONS.suppliersView],
      },
      {
        id: 'inv-alerts',
        label: 'تنبيهات المخزون',
        route: '/warehouse/alerts',
        badgeKey: 'lowStockProducts',
        badgeType: 'amber',
        icon: 'warning',
        requiredAnyPermission: [PERMISSIONS.suppliersView],
      },
    ],
  },
  {
    label: 'المالية',
    items: [
      {
        id: 'treasury',
        label: 'الخزينة',
        route: '/treasury',
        icon: 'wallet',
        requiredAnyPermission: [PERMISSIONS.treasuryView],
      },
      {
        id: 'vouchers',
        label: 'سندات القبض والصرف',
        route: '/vouchers',
        icon: 'receipt',
        requiredAnyPermission: [PERMISSIONS.treasuryView],
      },
      {
        id: 'shareholders',
        label: 'المساهمون',
        route: '/treasury/shareholders',
        icon: 'hand-coin',
        requiredAnyPermission: [PERMISSIONS.treasuryView],
      },
    ],
  },
  {
    label: 'النظام',
    items: [
      {
        id: 'notifications',
        label: 'إشعارات WhatsApp',
        route: '/notifications',
        badge: '3',
        badgeType: 'whatsapp',
        icon: 'whatsapp',
        requiredAnyPermission: [PERMISSIONS.clientsView],
      },
      {
        id: 'users',
        label: 'الصلاحيات والمستخدمون',
        route: '/users',
        icon: 'user-cog',
        requiredAnyPermission: [PERMISSIONS.userManagement],
      },
      {
        id: 'audit',
        label: 'سجل التدقيق',
        route: '/audit',
        icon: 'clipboard',
        requiredAnyPermission: [PERMISSIONS.userManagement],
      },
      {
        id: 'reports',
        label: 'التقارير والتصدير',
        route: '/reports',
        icon: 'chart',
        requiredAnyPermission: [PERMISSIONS.dashboardView],
      },
      {
        id: 'contracts',
        label: 'العقود PDF',
        route: '/contracts',
        icon: 'file-pdf',
        requiredAnyPermission: [PERMISSIONS.clientsView],
      },
    ],
  },
];
