export interface DashboardStats {
  totalCustomers: number;
  totalReceivables: number;
  collectedThisMonth: number;
  mainTreasury: number;
  monthlyProfit: number;
  collectionRate: number;
  lateCustomers: number;
  lateAmount: number;
  ratingACount: number;
  lowStockCount: number;
  vatDue: number;
}

export interface ProfitChartEntry {
  month: string;
  amount: number;
  isCurrent: boolean;
}

export interface TopCustomer {
  rank: number;
  name: string;
  paid: number;
  installments: number;
  creditScore: 'A' | 'B' | 'C' | 'D';
}

export interface DashboardData {
  stats: DashboardStats;
  profitChart: ProfitChartEntry[];
  topCustomers: TopCustomer[];
}
