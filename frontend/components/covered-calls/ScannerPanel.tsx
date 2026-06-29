import { Loader2, Search } from "lucide-react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { CoveredCallResponse, ScanJob, SearchState } from "./types";

export function ScannerPanel({
  stockList,
  state,
  message,
  job,
  data,
  onStockListChange,
  onSubmit,
}: {
  stockList: string;
  state: SearchState;
  message: string;
  job: ScanJob | null;
  data: CoveredCallResponse | null;
  onStockListChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Scanner</CardTitle>
        <CardDescription>
          Enter a comma or line separated stock list. The scan runs in Celery and saves monthly/LEAPS results to Postgres.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={onSubmit}>
          <Textarea
            aria-label="Stock list"
            name="symbols"
            value={stockList}
            onChange={(event) => onStockListChange(event.target.value.toUpperCase())}
            placeholder={"SNDK\nNVDA\nAAPL"}
            className="uppercase"
          />
          <Button type="submit" className="w-full" disabled={state === "loading"}>
            {state === "loading" ? <Loader2 className="animate-spin" /> : <Search />}
            Queue Covered Call Scan
          </Button>
        </form>
        {job ? (
          <div className="mt-4 rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{job.status.toUpperCase()}</span>
              <span className="text-muted-foreground">
                {job.completedCount}/{job.requestedCount} symbols
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>Saved rows</span>
              <span>{job.opportunityCount ?? data?.opportunities.length ?? 0}</span>
            </div>
            <p className="mt-1 break-all text-xs text-muted-foreground">{job.id}</p>
          </div>
        ) : null}
        {message ? (
          <p
            className={cn(
              "mt-4 text-sm",
              state === "error" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
