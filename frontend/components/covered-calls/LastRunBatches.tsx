import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { dateTimeLabel } from "./format";
import type { ScanJob } from "./types";

export function LastRunBatches({
  batches,
  batchMessage,
  onRefresh,
  onOpenBatch,
  onDeleteBatch,
}: {
  batches: ScanJob[];
  batchMessage: string;
  onRefresh: () => void;
  onOpenBatch: (batchId: string) => void;
  onDeleteBatch: (batchId: string) => void;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Last Run Batches</CardTitle>
          <CardDescription>Open a completed or running batch to inspect saved opportunities.</CardDescription>
        </div>
        <Button variant="secondary" onClick={onRefresh}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {batchMessage ? <p className="mb-4 text-sm text-destructive">{batchMessage}</p> : null}
        <div className="divide-y rounded-md border">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className="grid w-full gap-3 p-4 text-left transition-colors hover:bg-muted/60 md:grid-cols-[1fr_160px_120px_44px]"
              onClick={() => onOpenBatch(batch.id)}
            >
              <div>
                <div className="font-medium">{batch.symbols.join(", ")}</div>
                <div className="mt-1 break-all text-xs text-muted-foreground">{batch.id}</div>
              </div>
              <div className="text-sm">
                <div className="font-medium">{batch.status.toUpperCase()}</div>
                <div className="text-xs text-muted-foreground">
                  {batch.completedCount}/{batch.requestedCount} symbols
                </div>
              </div>
              <div className="text-sm">
                <div className="font-medium">{batch.opportunityCount ?? 0} rows</div>
                <div className="text-xs text-muted-foreground">{dateTimeLabel(batch.createdAt)}</div>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="h-9 px-2"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteBatch(batch.id);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {!batches.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No batches yet. Queue a scan from the scanner.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
