import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { dateLabel, money } from "./format";
import { Metric } from "./Metric";
import { PayoffChart } from "./PayoffChart";
import { CashFlowToday } from "./trade-modal/CashFlowToday";
import { ExecutionSteps } from "./trade-modal/ExecutionSteps";
import { ExpirationScenarios } from "./trade-modal/ExpirationScenarios";
import { KeyNumbers } from "./trade-modal/KeyNumbers";
import type { Opportunity } from "./types";

export function TradeIdeaModal({
  opportunity,
  onClose,
}: {
  opportunity: Opportunity;
  onClose: () => void;
}) {
  const shareCost = opportunity.underlyingPrice * 100;
  const premiumReceived = opportunity.premium * 100;
  const netCashOutlay = opportunity.capitalRequired;
  const assignmentProceeds = opportunity.strike * 100;
  const totalReceivedIfAssigned = assignmentProceeds + premiumReceived;
  const returnOnStockPrice = opportunity.maxProfit / shareCost;
  const expirationLabel = dateLabel(opportunity.expiration);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-lg border bg-background shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-background px-5 py-4">
          <div>
            <h2 className="text-xl font-semibold tracking-normal">What Is This Trade?</h2>
            <p className="text-sm text-muted-foreground">
              Buy 100 shares of {opportunity.underlying} and sell 1 covered call expiring {expirationLabel}.
            </p>
          </div>
          <Button variant="secondary" className="h-9 px-2" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-6 p-5">
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-center text-base font-semibold text-slate-950">
            Buy 100 shares of {opportunity.underlying} at {money(opportunity.underlyingPrice)} and sell the {expirationLabel} {money(opportunity.strike)} covered call for {money(opportunity.premium)}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <ExecutionSteps
                opportunity={opportunity}
                expirationLabel={expirationLabel}
                premiumReceived={premiumReceived}
                shareCost={shareCost}
                netCashOutlay={netCashOutlay}
              />
              <CashFlowToday
                opportunity={opportunity}
                premiumReceived={premiumReceived}
                shareCost={shareCost}
                netCashOutlay={netCashOutlay}
              />
              <ExpirationScenarios
                opportunity={opportunity}
                assignmentProceeds={assignmentProceeds}
                premiumReceived={premiumReceived}
              />
            </div>

            <KeyNumbers
              opportunity={opportunity}
              premiumReceived={premiumReceived}
              netCashOutlay={netCashOutlay}
              totalReceivedIfAssigned={totalReceivedIfAssigned}
              returnOnStockPrice={returnOnStockPrice}
            />
          </div>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>3. Profit / Loss Diagram At Expiration</CardTitle>
              <CardDescription>
                Long 100 shares, short 1 call. Breakeven is net stock cost after premium.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PayoffChart opportunity={opportunity} />
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <Metric label="Breakeven" value={money(opportunity.breakeven)} />
                <Metric label="Strike cap" value={money(opportunity.strike)} />
                <Metric label="Days" value={`${opportunity.daysToExpiration}`} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
