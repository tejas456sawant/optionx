import type { SortKey } from "./types";

export const sortOptions: {
  label: string;
  value: SortKey;
  direction: "asc" | "desc";
}[] = [
  { label: "Annualized return", value: "annualizedReturnPercent", direction: "desc" },
  { label: "Max return", value: "maxProfitPercent", direction: "desc" },
  { label: "Capital required", value: "capitalRequired", direction: "asc" },
  { label: "Downside protection", value: "downsideProtectionPercent", direction: "desc" },
  { label: "Days to expiration", value: "daysToExpiration", direction: "asc" },
  { label: "Strike", value: "strike", direction: "asc" },
];
