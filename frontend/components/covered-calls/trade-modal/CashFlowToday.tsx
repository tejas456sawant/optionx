import { cn } from "@/lib/utils";

import { money, signedMoney } from "../format";
import type { Opportunity } from "../types";

export function CashFlowToday({
  opportunity,
  premiumReceived,
  shareCost,
  netCashOutlay,
}: {
  opportunity: Opportunity;
  premiumReceived: number;
  shareCost: number;
  netCashOutlay: number;
}) {
  return (
    <section className="rounded-md border bg-muted/30 p-4">
      <h3 className="mb-4 text-lg font-semibold tracking-normal">Cash Flow Today</h3>
      <div className="grid gap-3 text-sm md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
        <CashFlowBox label={`Buy 100 shares @ ${money(opportunity.underlyingPrice)}`} value={signedMoney(-shareCost)} tone="red" />
        <div className="hidden text-2xl font-semibold md:block">+</div>
        <CashFlowBox label={`Sell call @ ${money(opportunity.premium)}`} value={signedMoney(premiumReceived)} tone="green" />
        <div className="hidden text-2xl font-semibold md:block">=</div>
        <CashFlowBox label="Net cash outlay" value={money(netCashOutlay)} tone="amber" />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Even though the shares cost {money(shareCost)}, collecting {money(premiumReceived)} in option premium lowers the capital tied up to {money(netCashOutlay)}.
      </p>
    </section>
  );
}

function CashFlowBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "red" | "green" | "amber";
}) {
  const styles = {
    red: "border-red-300 bg-red-50 text-red-700",
    green: "border-green-300 bg-green-50 text-green-700",
    amber: "border-amber-300 bg-amber-50 text-amber-700",
  };
  return (
    <div className={cn("rounded-md border p-3 text-center", styles[tone])}>
      <div className="text-slate-950">{label}</div>
      <div className="mt-2 font-semibold">{value}</div>
    </div>
  );
}
