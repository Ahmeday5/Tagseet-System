/** `GET /dashboard/shareholders/treasuries-lookup` — every treasury (no type filtering). */
export interface ShareholderTreasuryLookup {
  id: number;
  name: string;
  representativeId: number | null;
  representativeName: string | null;
}
