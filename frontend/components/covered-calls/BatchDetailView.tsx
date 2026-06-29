import { ArrowDownUp, ArrowLeft, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { dateLabel, money, percent } from "./format";
import { sortOptions } from "./sort-options";
import type {
  CoveredCallResponse,
  Opportunity,
  ScanJob,
  SearchState,
  SortKey,
} from "./types";

export function BatchDetailView({
  data,
  job,
  message,
  state,
  sortKey,
  underlyingFilter,
  availableUnderlyings,
  sortedOpportunities,
  selectedOpportunity,
  setSortKey,
  setUnderlyingFilter,
  setSelectedSymbol,
  setModalOpportunity,
  onBack,
}: {
  data: CoveredCallResponse | null;
  job: ScanJob | null;
  message: string;
  state: SearchState;
  sortKey: SortKey;
  underlyingFilter: string;
  availableUnderlyings: string[];
  sortedOpportunities: Opportunity[];
  selectedOpportunity: Opportunity | undefined;
  setSortKey: (value: SortKey) => void;
  setUnderlyingFilter: (value: string) => void;
  setSelectedSymbol: (value: string) => void;
  setModalOpportunity: (value: Opportunity) => void;
  onBack: () => void;
}) {
  return (
    <section className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft />
          Scanner
        </Button>
        <div className="text-right text-sm text-muted-foreground">
          <div>{job ? job.id : "Batch"}</div>
          <div>{job ? `${job.completedCount}/${job.requestedCount} symbols / ${job.opportunityCount ?? data?.opportunities.length ?? 0} saved rows` : null}</div>
        </div>
      </div>

      {message ? (
        <p
          className={cn(
            "text-sm",
            state === "error" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {message}
        </p>
      ) : null}

      <Card className="rounded-lg">
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Batch Opportunities</CardTitle>
            <CardDescription>
              {data
                ? `${data.symbol} / ${sortedOpportunities.length} of ${data.opportunities.length} saved monthly and LEAPS candidates`
                : "Open a batch to inspect its saved covered-call ideas."}
            </CardDescription>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(180px,280px)_auto_220px] md:items-center">
            <Input
              aria-label="Filter by underlying"
              value={underlyingFilter}
              onChange={(event) => setUnderlyingFilter(event.target.value.toUpperCase())}
              placeholder="Filter ticker"
              className="uppercase"
              list="batch-underlyings"
            />
            <datalist id="batch-underlyings">
              {availableUnderlyings.map((underlying) => (
                <option key={underlying} value={underlying} />
              ))}
            </datalist>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setUnderlyingFilter("")}>
                All
              </Button>
              {availableUnderlyings.slice(0, 5).map((underlying) => (
                <Button
                  key={underlying}
                  type="button"
                  variant={underlyingFilter === underlying ? "default" : "secondary"}
                  onClick={() => setUnderlyingFilter(underlying)}
                >
                  {underlying}
                </Button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowDownUp className="size-4" />
              <select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
                className="h-9 w-full rounded-md border bg-background px-2 text-foreground"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">Expiration</th>
                <th className="py-2 pr-3 font-medium">Underlying</th>
                <th className="py-2 pr-3 font-medium">Strike</th>
                <th className="py-2 pr-3 font-medium">Premium</th>
                <th className="py-2 pr-3 font-medium">Capital</th>
                <th className="py-2 pr-3 font-medium">Breakeven</th>
                <th className="py-2 pr-3 font-medium">Cushion</th>
                <th className="py-2 pr-3 font-medium">Max Return</th>
                <th className="py-2 pr-3 font-medium">Annualized</th>
                <th className="py-2 pr-3 font-medium">Delta</th>
                <th className="py-2 pr-3 font-medium">OI</th>
              </tr>
            </thead>
            <tbody>
              {sortedOpportunities.map((item) => (
                <tr
                  key={item.symbol}
                  className={cn(
                    "cursor-pointer border-b transition-colors hover:bg-muted/60",
                    selectedOpportunity?.symbol === item.symbol && "bg-muted",
                  )}
                  onClick={() => {
                    setSelectedSymbol(item.symbol);
                    setModalOpportunity(item);
                  }}
                >
                  <td className="py-3 pr-3">
                    <div className="font-medium">{dateLabel(item.expiration)}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.expirationType || "Option"} / {item.daysToExpiration}d
                    </div>
                  </td>
                  <td className="py-3 pr-3">{item.underlying}</td>
                  <td className="py-3 pr-3">{money(item.strike)}</td>
                  <td className="py-3 pr-3">{money(item.premium)}</td>
                  <td className="py-3 pr-3">{money(item.capitalRequired)}</td>
                  <td className="py-3 pr-3">{money(item.breakeven)}</td>
                  <td className="py-3 pr-3">{percent(item.downsideProtectionPercent)}</td>
                  <td className="py-3 pr-3">{percent(item.maxProfitPercent)}</td>
                  <td className="py-3 pr-3">{percent(item.annualizedReturnPercent)}</td>
                  <td className="py-3 pr-3">{item.delta?.toFixed(2) ?? "-"}</td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center justify-between gap-3">
                      <span>{item.openInterest ?? "-"}</span>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 px-2"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedSymbol(item.symbol);
                          setModalOpportunity(item);
                        }}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!sortedOpportunities.length ? (
                <tr>
                  <td className="py-8 pr-3 text-center text-muted-foreground" colSpan={11}>
                    {job
                      ? "No saved covered-call rows match the current filter."
                      : "No batch has been opened yet."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}
