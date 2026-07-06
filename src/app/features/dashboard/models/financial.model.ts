/**
 * Snapshot of the company's financial position at a single point in time,
 * exactly as returned by `GET /dashboard/financial-separation`.
 *
 *   - `treasury`                          cash + bank balances
 *   - `receivables`                       what clients still owe
 *   - `payables`                          what we still owe suppliers
 *   - `inventoryValue`                    cost of goods on hand
 *   - `shareholdersDue`                   amounts due to shareholders
 *   - `companySubAccountsBalance`         balance held in company sub-accounts
 *   - `representativesSubAccountsDue`     amounts due in representatives' sub-accounts
 *   - `netSubAccountsBalance`             net total across all sub-accounts
 *   - `totalShareholdersCapital`          total capital contributed by shareholders
 *   - `totalShareholdersCount`            number of shareholders
 *   - `netFinancialPosition`              (treasury + receivables + inventoryValue) − payables
 */
export interface FinancialSeparation {
  treasury: number;
  receivables: number;
  payables: number;
  inventoryValue: number;
  shareholdersDue: number;
  companySubAccountsBalance: number;
  representativesSubAccountsDue: number;
  netSubAccountsBalance: number;
  totalShareholdersCapital: number;
  totalShareholdersCount: number;
  netFinancialPosition: number;
}
