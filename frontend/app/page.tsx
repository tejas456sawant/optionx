"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { BatchDetailView } from "@/components/covered-calls/BatchDetailView";
import { LastRunBatches } from "@/components/covered-calls/LastRunBatches";
import { ScannerPanel } from "@/components/covered-calls/ScannerPanel";
import { sortOptions } from "@/components/covered-calls/sort-options";
import { TradeIdeaModal } from "@/components/covered-calls/TradeIdeaModal";
import type {
  CoveredCallResponse,
  JobResultsResponse,
  JobsResponse,
  Opportunity,
  ScanJob,
  SearchState,
  SortKey,
} from "@/components/covered-calls/types";

function buildBatchResponse(job: ScanJob, opportunities: Opportunity[]): CoveredCallResponse {
  return {
    symbol: job.symbols.join(", "),
    underlyingPrice: opportunities[0]?.underlyingPrice ?? 0,
    expirationCount: 0,
    eligibleExpirationCount: 0,
    expirationsScanned: 0,
    expirationFilter: "Monthly",
    opportunities,
  };
}

export default function Home() {
  const [stockList, setStockList] = useState("NVDA\nSNDK");
  const [state, setState] = useState<SearchState>("idle");
  const [message, setMessage] = useState("");
  const [data, setData] = useState<CoveredCallResponse | null>(null);
  const [job, setJob] = useState<ScanJob | null>(null);
  const [batches, setBatches] = useState<ScanJob[]>([]);
  const [batchMessage, setBatchMessage] = useState("");
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("annualizedReturnPercent");
  const [underlyingFilter, setUnderlyingFilter] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [modalOpportunity, setModalOpportunity] = useState<Opportunity | null>(null);

  const selectedSort = sortOptions.find((option) => option.value === sortKey) ?? sortOptions[0];
  const availableUnderlyings = useMemo(() => {
    return Array.from(
      new Set((data?.opportunities ?? []).map((item) => item.underlying)),
    ).sort();
  }, [data]);

  const sortedOpportunities = useMemo(() => {
    const normalizedFilter = underlyingFilter.trim().toUpperCase();
    const rows = (data?.opportunities ?? []).filter((item) => {
      if (!normalizedFilter) return true;
      return item.underlying.includes(normalizedFilter);
    });
    rows.sort((left, right) => {
      const a = left[sortKey] ?? 0;
      const b = right[sortKey] ?? 0;
      return selectedSort.direction === "asc" ? a - b : b - a;
    });
    return rows;
  }, [data, selectedSort.direction, sortKey, underlyingFilter]);

  const selectedOpportunity =
    sortedOpportunities.find((item) => item.symbol === selectedSymbol) ??
    sortedOpportunities[0];

  async function loadBatches() {
    try {
      const response = await fetch("/api/covered-calls/jobs?limit=10", {
        cache: "no-store",
      });
      const payload = (await response.json()) as JobsResponse;
      if (!response.ok) throw new Error("Could not load recent batches.");
      setBatches(payload.jobs);
      setBatchMessage("");
    } catch (error) {
      setBatchMessage(error instanceof Error ? error.message : "Could not load recent batches.");
    }
  }

  async function openBatch(batchId: string) {
    setActiveBatchId(batchId);
    setState("loading");
    setMessage("Loading saved batch results.");
    setUnderlyingFilter("");
    setSelectedSymbol(null);
    setModalOpportunity(null);

    try {
      const response = await fetch(`/api/covered-calls/jobs/${batchId}/results?limit=1000`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as JobResultsResponse;
      if (!response.ok) throw new Error("Could not load batch results.");

      setJob(payload.job);
      setData(buildBatchResponse(payload.job, payload.opportunities));
      setState("success");
      setMessage(`Loaded ${payload.opportunities.length} saved trade ideas from this batch.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not load batch results.");
    }
  }

  async function deleteBatch(batchId: string) {
    const confirmed = window.confirm(
      "Delete this batch and all saved opportunities from the database?",
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/covered-calls/jobs/${batchId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const detail =
          typeof payload?.detail === "string" ? payload.detail : "Could not delete batch.";
        throw new Error(detail);
      }

      setBatches((current) => current.filter((batch) => batch.id !== batchId));
      if (activeBatchId === batchId) {
        setActiveBatchId(null);
        setData(null);
        setJob(null);
        setModalOpportunity(null);
        setSelectedSymbol(null);
      }
      setBatchMessage("");
    } catch (error) {
      setBatchMessage(error instanceof Error ? error.message : "Could not delete batch.");
    }
  }

  function goBackToScanner() {
    setActiveBatchId(null);
    setModalOpportunity(null);
    setSelectedSymbol(null);
    setUnderlyingFilter("");
    void loadBatches();
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBatches();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!job?.id || (job.status !== "queued" && job.status !== "running")) return;

    const jobId = job.id;
    let stopped = false;

    async function pollJobResults() {
      try {
        const response = await fetch(`/api/covered-calls/jobs/${jobId}/results?limit=1000`);
        const payload = (await response.json()) as JobResultsResponse;
        if (!response.ok) throw new Error("Could not load job status.");
        if (stopped) return;

        setJob(payload.job);
        setBatches((current) => {
          const withoutCurrent = current.filter((item) => item.id !== payload.job.id);
          return [payload.job, ...withoutCurrent].slice(0, 10);
        });
        setData(buildBatchResponse(payload.job, payload.opportunities));

        if (payload.job.status === "completed" || payload.job.status === "failed") {
          setState(payload.job.status === "completed" ? "success" : "error");
          setMessage(
            payload.job.status === "completed"
              ? `Completed ${payload.job.completedCount}/${payload.job.requestedCount} symbols and saved ${payload.opportunities.length} candidates.`
              : payload.job.error ?? "Scan job failed.",
          );
        } else {
          setMessage(
            `${payload.job.status === "queued" ? "Queued" : "Running"}: ${payload.job.completedCount}/${payload.job.requestedCount} symbols completed.`,
          );
        }
      } catch (error) {
        if (stopped) return;
        setState("error");
        setMessage(error instanceof Error ? error.message : "Could not load job status.");
      }
    }

    void pollJobResults();
    const interval = window.setInterval(pollJobResults, 3000);

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [job?.id, job?.status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const symbols = stockList
      .split(/[\s,]+/)
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
    if (!symbols.length) {
      setState("error");
      setMessage("Enter at least one symbol first.");
      return;
    }

    setState("loading");
    setMessage("");
    setData(null);
    setUnderlyingFilter("");
    setSelectedSymbol(null);

    try {
      const response = await fetch("/api/covered-calls/jobs", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          symbols,
          expiration_limit: 0,
          strike_proximity: 80,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const detail =
          typeof payload?.detail === "string"
            ? payload.detail
            : "Backend request failed.";
        throw new Error(detail);
      }

      setJob(payload);
      setBatches((current) => [payload, ...current.filter((item) => item.id !== payload.id)].slice(0, 10));
      setActiveBatchId(payload.id);
      setMessage(
        `Queued ${payload.requestedCount} symbols. The worker will scan monthly/LEAPS expirations in the background.`,
      );
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Request failed.");
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">OptionX</h1>
          </div>
        </div>
      </header>

      {activeBatchId ? (
        <BatchDetailView
          data={data}
          job={job}
          message={message}
          state={state}
          sortKey={sortKey}
          underlyingFilter={underlyingFilter}
          availableUnderlyings={availableUnderlyings}
          sortedOpportunities={sortedOpportunities}
          selectedOpportunity={selectedOpportunity}
          setSortKey={setSortKey}
          setUnderlyingFilter={setUnderlyingFilter}
          setSelectedSymbol={setSelectedSymbol}
          setModalOpportunity={setModalOpportunity}
          onBack={goBackToScanner}
        />
      ) : (
        <section className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[420px_1fr]">
          <div className="space-y-6">
            <ScannerPanel
              stockList={stockList}
              state={state}
              message={message}
              job={job}
              data={data}
              onStockListChange={setStockList}
              onSubmit={handleSubmit}
            />
          </div>
          <LastRunBatches
            batches={batches}
            batchMessage={batchMessage}
            onRefresh={loadBatches}
            onOpenBatch={openBatch}
            onDeleteBatch={deleteBatch}
          />
        </section>
      )}

      {modalOpportunity ? (
        <TradeIdeaModal
          opportunity={modalOpportunity}
          onClose={() => setModalOpportunity(null)}
        />
      ) : null}
    </main>
  );
}
