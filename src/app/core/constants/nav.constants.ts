import { NavSection } from '../../layouts/admin/sidebar/sidebar.component';

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'عام',
    items: [
      {
        id: 'dashboard',
        label: 'لوحة التحكم',
        route: '/dashboard',
        icon: 'fas fa-home',
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
        icon: 'fas fa-users',
      },
      {
        id: 'catalog',
        label: 'الكتالوج والطلبيات',
        route: '/catalog',
        badge: '3',
        badgeType: 'amber',
        icon: 'fas fa-box',
      },
      {
        id: 'reps',
        label: 'المندوبون',
        route: '/reps',
        icon: 'fas fa-user-tie',
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
        icon: 'fas fa-truck',
      },
      {
        id: 'invoices',
        label: 'فواتير المشتريات',
        route: '/invoices',
        icon: 'fas fa-file-invoice',
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
        icon: 'fas fa-warehouse',
      },
      {
        id: 'inv-alerts',
        label: 'تنبيهات المخزون',
        route: '/warehouse/alerts',
        badge: '3',
        badgeType: 'amber',
        icon: 'fas fa-exclamation-triangle',
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
        icon: 'fas fa-wallet',
      },
      {
        id: 'shareholders',
        label: 'المساهمون',
        route: '/treasury/shareholders',
        icon: 'fas fa-hand-holding-usd',
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
        icon: 'fab fa-whatsapp',
      },
      {
        id: 'users',
        label: 'الصلاحيات والمستخدمون',
        route: '/users',
        icon: 'fas fa-user-cog',
      },
      {
        id: 'audit',
        label: 'سجل التدقيق',
        route: '/audit',
        icon: 'fas fa-clipboard-list',
      },
      {
        id: 'reports',
        label: 'التقارير والتصدير',
        route: '/reports',
        icon: 'fas fa-chart-bar',
      },
      {
        id: 'contracts',
        label: 'العقود PDF',
        route: '/contracts',
        icon: 'fas fa-file-pdf',
      },
    ],
  },
];
