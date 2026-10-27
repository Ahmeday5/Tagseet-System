/**
 * Business meaning of every figure on the profits screen, surfaced as
 * native tooltips. Single source of truth for all profits components.
 */
export const PROFITS_HINTS = {
  profitsTreasury: 'الأرباح المستحقة للمساهمين اللي لسه ما اتوزعتش',
  companyProfitsTreasury: 'رصيد خزنة أرباح الشركة',
  representativesProfitsTotal: 'إجمالي العمولات المستحقة للمناديب ولم تُصرف بعد',
  representativeProfit: 'العمولة المستحقة للمندوب واللي لسه ما اتصرفتلوش',
  totalProfits: 'أرباح المبيعات + الإيرادات المباشرة للسنة',
  distributedProfits: 'أرباح الشركة + أرباح المناديب',
  currentProfits: 'الأرباح الكلية − الأرباح الموزعة',
  cashProfit: 'سعر الكاش ناقص تكلفة البضاعة، للعقود اللي اتباعت في الشهر',
  installmentProfit: 'الزيادة اللي جاية من التقسيط فوق سعر الكاش',
  salesProfit: 'أرباح الكاش + أرباح القسط',
  collectedProfit: 'نصيب الربح من الفلوس اللي اتحصلت فعلاً في الشهر من الأقساط',
  directRevenues: 'الإيرادات اللي اتسجلت يدوياً بره العقود',
  companyProfit: 'نصيب الشركة اللي اتوزع في الشهر',
  representativesProfit: 'إجمالي عمولات المناديب المستحقة في الشهر',
  monthlyRepresentativeProfit: 'العمولة اللي استحقها المندوب في الشهر',
} as const;
