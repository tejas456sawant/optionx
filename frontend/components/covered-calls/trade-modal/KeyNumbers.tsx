import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { money, percent } from "../format";
import { Metric } from "../Metric";
import type { Opportunity } from "../types";

export function KeyNumbers({
  opportunity,
  premiumReceived,
  netCashOutlay,
  totalReceivedIfAssigned,
  returnOnStockPrice,
}: {
  opportunity: Opportunity;
  premiumReceived: number;
  netCashOutlay: number;
  totalReceivedIfAssigned: number;
  returnOnStockPrice: number;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Key Numbers</CardTitle>
        <CardDescription>{opportunity.symbol}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <Metric label="Stock price" value={money(opportunity.underlyingPrice)} />
        <Metric label="Strike price" value={money(opportunity.strike)} />
        <Metric label="Option premium received" value={money(premiumReceived)} />
        <Metric label="Net cash outlay" value={money(netCashOutlay)} />
        <Metric label="Capital required" value={money(opportunity.capitalRequired)} />
        <Metric label="Breakeven" value={money(opportunity.breakeven)} />
        <Metric label="Downside cushion" value={percent(opportunity.downsideProtectionPercent)} />
        <Metric label="Max profit" value={money(opportunity.maxProfit)} />
        <Metric label="Max return" value={percent(opportunity.maxProfitPercent)} />
        <Metric label="Annualized" value={percent(opportunity.annualizedReturnPercent)} />
        <Metric label="Return on stock price" value={percent(returnOnStockPrice)} />
        <Metric label="Total received if assigned" value={money(totalReceivedIfAssigned)} />
        <Metric label="Delta" value={opportunity.delta?.toFixed(2) ?? "-"} />
        <Metric label="Open interest" value={`${opportunity.openInterest ?? "-"}`} />
        <Metric label="Volume" value={`${opportunity.volume ?? "-"}`} />
      </CardContent>
    </Card>
  );
}
