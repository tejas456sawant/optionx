import { cn } from "@/lib/utils";

import { money, percent } from "../format";
import type { Opportunity } from "../types";

export function ExpirationScenarios({
  opportunity,
  assignmentProceeds,
  premiumReceived,
}: {
  opportunity: Opportunity;
  assignmentProceeds: number;
  premiumReceived: number;
}) {
  return (
    <section>
      <h3 className="mb-3 text-lg font-semibold tracking-normal">2. What Happens At Expiration</h3>
      <div className="space-y-3">
        <ScenarioBox
          title={`Stock price >= ${money(opportunity.strike)}`}
          tone="green"
          lines={[
            "The call buyer can exercise the call.",
            `You sell your 100 shares for ${money(assignmentProceeds)} total.`,
            `You already collected ${money(premiumReceived)} premium.`,
            `Maximum profit is ${money(opportunity.maxProfit)}, or ${percent(opportunity.maxProfitPercent)} on cash outlay.`,
          ]}
        />
        <ScenarioBox
          title={`Stock price < ${money(opportunity.strike)}`}
          tone="red"
          lines={[
            "The call can expire worthless.",
            `You keep the ${money(premiumReceived)} premium.`,
            "You still own the shares, but their market value may be lower.",
            `Your breakeven is ${money(opportunity.breakeven)} per share.`,
          ]}
        />
      </div>
    </section>
  );
}

function ScenarioBox({
  title,
  lines,
  tone,
}: {
  title: string;
  lines: string[];
  tone: "green" | "red";
}) {
  const styles =
    tone === "green"
      ? "border-green-300 bg-green-50"
      : "border-red-300 bg-red-50";
  return (
    <div className={cn("rounded-md border p-4", styles)}>
      <div className="font-semibold text-slate-950">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-slate-800">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
