import { cn } from "@/lib/utils";

import { money, signedMoney } from "../format";
import type { Opportunity } from "../types";

export function ExecutionSteps({
  opportunity,
  expirationLabel,
  premiumReceived,
  shareCost,
  netCashOutlay,
}: {
  opportunity: Opportunity;
  expirationLabel: string;
  premiumReceived: number;
  shareCost: number;
  netCashOutlay: number;
}) {
  return (
    <section>
      <h3 className="mb-3 text-lg font-semibold tracking-normal">1. What We Do Today</h3>
      <div className="grid gap-3 md:grid-cols-3">
        <StepCard
          tone="green"
          label="Step 1"
          title={`Buy 100 shares of ${opportunity.underlying}`}
          value={`Cost: ${signedMoney(-shareCost)}`}
        />
        <StepCard
          tone="blue"
          label="Step 2"
          title={`Sell 1 covered call, ${expirationLabel}, ${money(opportunity.strike)} strike`}
          value={`Receive: ${signedMoney(premiumReceived)}`}
        />
        <StepCard
          tone="violet"
          label="Step 3"
          title="Net cash outlay"
          value={money(netCashOutlay)}
        />
      </div>
    </section>
  );
}

function StepCard({
  tone,
  label,
  title,
  value,
}: {
  tone: "green" | "blue" | "violet";
  label: string;
  title: string;
  value: string;
}) {
  const styles = {
    green: "border-green-300 bg-green-50 text-green-700",
    blue: "border-blue-300 bg-blue-50 text-blue-700",
    violet: "border-violet-300 bg-violet-50 text-violet-700",
  };
  return (
    <div className={cn("rounded-md border p-4", styles[tone])}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-3 font-medium text-slate-950">{title}</div>
      <div className="mt-4 text-sm font-semibold">{value}</div>
    </div>
  );
}
