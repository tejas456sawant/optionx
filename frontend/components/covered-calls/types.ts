export type SearchState = "idle" | "loading" | "success" | "error";

export type SortKey =
  | "annualizedReturnPercent"
  | "maxProfitPercent"
  | "capitalRequired"
  | "downsideProtectionPercent"
  | "daysToExpiration"
  | "strike";

export type Opportunity = {
  symbol: string;
  underlying: string;
  underlyingPrice: number;
  expiration: string;
  expirationType: string;
  daysToExpiration: number;
  strike: number;
  premium: number;
  netDebit: number;
  capitalRequired: number;
  breakeven: number;
  downsideProtectionPercent: number;
  maxProfit: number;
  maxProfitPercent: number;
  annualizedReturnPercent: number;
  assignedReturnPercent: number;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  delta: number | null;
  probabilityITM: number | null;
  probabilityOTM: number | null;
  openInterest: number | null;
  volume: number | null;
};

export type CoveredCallResponse = {
  symbol: string;
  underlyingPrice: number;
  expirationCount: number;
  eligibleExpirationCount: number;
  expirationsScanned: number;
  expirationFilter: string;
  opportunities: Opportunity[];
};

export type ScanJob = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  symbols: string[];
  requestedCount: number;
  completedCount: number;
  failedCount: number;
  opportunityCount: number | null;
  error: string | null;
  createdAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
};

export type JobResultsResponse = {
  job: ScanJob;
  opportunities: Opportunity[];
};

export type JobsResponse = {
  jobs: ScanJob[];
};
