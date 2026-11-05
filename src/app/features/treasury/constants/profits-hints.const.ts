/**
 * Fallback meaning of every figure on the profits screen. The backend's
 * `explanations` take precedence (see `ProfitInfoComponent`); these only
 * show when it sends nothing for a field.
 */
export const PROFITS_HINTS = {
  // treasuries
  profitsTreasury: 'الأرباح اللي لسه ما اتسوّتش: حصة الشركة المعلقة + حصة المساهمين المعلقة',
  companyPendingShare: 'نصيب الشركة من الأرباح اللي لسه ما اتسوّتش',
  shareholdersPendingShare: 'نصيب المساهمين من الأرباح اللي لسه ما اتسوّتش',
  companyProfitsTreasury: 'رصيد خزنة أرباح الشركة — لا يشمل حصتها من الأرباح اللي لسه ما اتسوّتش',
  companyTotalProfit: 'خزنة أرباح الشركة + حصة الشركة المعلقة',
  representativesProfitsTotal: 'إجمالي العمولات المستحقة للمناديب ولم تُصرف بعد',
  representativeProfit: 'العمولة المستحقة للمندوب واللي لسه ما اتصرفتلوش',
  accruedProfit: 'الأرباح المستحقة للمساهم ولم تُسوَّ بعد',
  companyPercentage: 'النسبة اللي بتاخدها الشركة من نصيب المساهم',
  companyShare: 'نصيب المساهم × نسبة الشركة',
  shareholderShare: 'نصيب المساهم − حصة الشركة',

  // summary
  totalProfits: 'أرباح المبيعات + الإيرادات المباشرة للسنة',
  collectedProfits: 'نصيب الربح من الفلوس اللي اتحصلت فعلاً خلال السنة',
  summaryDirectRevenues: 'الإيرادات اللي اتسجلت يدوياً بره العقود خلال السنة',
  summaryExpenses: 'إجمالي المصروفات خلال السنة',
  netProfits: 'الأرباح المحصلة + الإيرادات المباشرة − المصروفات',
  distributedProfits: 'أرباح الشركة + أرباح المساهمين + أرباح المناديب',
  currentProfits: 'الأرباح الكلية − الأرباح الموزعة',

  // monthly sales profits
  cashProfit: 'سعر الكاش ناقص تكلفة البضاعة، للعقود اللي اتباعت في الشهر',
  installmentProfit: 'الزيادة اللي جاية من التقسيط فوق سعر الكاش',
  salesProfit: 'أرباح الكاش + أرباح القسط',
  collectedProfit: 'المحصّل من الأقساط + المحصّل من البيع الكاش',
  collectedFromInstallments: 'نصيب الربح من الأقساط اللي اتحصلت فعلاً في الشهر',
  collectedFromCashSales: 'ربح المبيعات الكاش اللي اتحصلت في الشهر',
  directRevenues: 'الإيرادات اللي اتسجلت يدوياً بره العقود',
  expenses: 'المصروفات المسجلة في الشهر',
  netProfit: 'الأرباح المحصلة + الإيرادات المباشرة − المصروفات',

  // monthly distribution
  distributionNetProfit: 'صافي الربح من جدول أرباح المبيعات',
  representativesProfit: 'إجمالي أرباح المناديب في الشهر (عمولات + نسبة الإيرادات − نسبة المصروفات)',
  shareholdersPool: 'صافي الربح − أرباح المناديب',
  companyProfit: 'مجموع حصة الشركة من نصيب كل مساهم',
  shareholdersProfit: 'مجموع صافي نصيب المساهمين بعد خصم حصة الشركة',
  distributedProfit: 'أرباح المناديب + أرباح الشركة + أرباح المساهمين',
  monthlyRepresentativeProfit: 'أرباح المندوب في الشهر',
} as const;
