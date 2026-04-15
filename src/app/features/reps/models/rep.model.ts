export type RepPermission = 'view' | 'create' | 'full';
export type RepStatus     = 'active' | 'leave' | 'inactive';

export interface Rep {
  id: string;
  name: string;
  phone: string;
  permissions: RepPermission;
  commissionRate: number;    // %
  monthlySales: number;
  commission: number;
  treasuryBalance: number;
  rating: 1 | 2 | 3 | 4 | 5;
  status: RepStatus;
}
