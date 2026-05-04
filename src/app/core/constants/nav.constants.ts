import { NavSection } from '../../layouts/admin/sidebar/sidebar.component';

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'عام',
    items: [
      {
        id: 'dashboard',
        label: 'لوحة التحكم',
        route: '/dashboard',
        icon: 'home',
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
        badge: '5',
        badgeType: 'red',
        icon: 'users',
      },
      {
        id: 'catalog',
        label: 'الكتالوج والطلبيات',
        route: '/catalog',
        badge: '3',
        badgeType: 'amber',
        icon: 'box',
      },
      {
        id: 'reps',
        label: 'المندوبون',
        route: '/reps',
        icon: 'user-tie',
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
      },
      {
        id: 'invoices',
        label: 'فواتير المشتريات',
        route: '/invoices',
        icon: 'file-invoice',
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
      },
      {
        id: 'products',
        label: 'المنتجات',
        route: '/products',
        icon: 'products',
      },
      {
        id: 'categories',
        label: 'فئات المنتجات',
        route: '/categories',
        icon: 'tag',
      },
      {
        id: 'inv-alerts',
        label: 'تنبيهات المخزون',
        route: '/warehouse/alerts',
        badge: '3',
        badgeType: 'amber',
        icon: 'warning',
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
      },
      {
        id: 'shareholders',
        label: 'المساهمون',
        route: '/treasury/shareholders',
        icon: 'hand-coin',
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
      },
      {
        id: 'users',
        label: 'الصلاحيات والمستخدمون',
        route: '/users',
        icon: 'user-cog',
      },
      {
        id: 'audit',
        label: 'سجل التدقيق',
        route: '/audit',
        icon: 'clipboard',
      },
      {
        id: 'reports',
        label: 'التقارير والتصدير',
        route: '/reports',
        icon: 'chart',
      },
      {
        id: 'contracts',
        label: 'العقود PDF',
        route: '/contracts',
        icon: 'file-pdf',
      },
    ],
  },
];
