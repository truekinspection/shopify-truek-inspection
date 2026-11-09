"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  CalendarDays,
  CalendarRange,
  FileSearch,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { Navbar } from "@/components/navbar";
import { FooterSection } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  fetchClearVinProductionStats,
  type AccountActivityStatsRow,
  type StatsGranularity,
} from "./actions";

type StatsRow = AccountActivityStatsRow;

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday-start week
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfNextMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function sumCounts(rows: StatsRow[]): number {
  return rows.reduce((acc, r) => acc + r.count, 0);
}

/**
 * Loads production usage rows from ClearVIN stats only (server action).
 * Never uses DB, localStorage, or test-token traffic.
 */
async function loadProductionStats(params: {
  granularity: StatsGranularity;
  from?: string;
  to?: string;
}): Promise<StatsRow[]> {
  const result = await fetchClearVinProductionStats(params);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

export default function AccountActivityPage() {
  const today = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(
    () => formatDateISO(addDays(today, -30)),
    [today],
  );
  const defaultTo = useMemo(() => formatDateISO(today), [today]);

  const [dailyTotal, setDailyTotal] = useState<number | null>(null);
  const [weeklyTotal, setWeeklyTotal] = useState<number | null>(null);
  const [monthlyTotal, setMonthlyTotal] = useState<number | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");

  const [granularity, setGranularity] = useState<StatsGranularity>("day");
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [tableRows, setTableRows] = useState<StatsRow[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState("");

  const [reportId, setReportId] = useState("");
  const [reportFormat, setReportFormat] = useState<"html" | "pdf">("html");
  const [locale, setLocale] = useState("");
  const [fetchBusy, setFetchBusy] = useState(false);
  const [fetchedHtml, setFetchedHtml] = useState<string | null>(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    };
  }, [pdfObjectUrl]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const dayStr = formatDateISO(today);
      // Docs: single day uses next calendar day as exclusive-style `to`
      const dayTo = formatDateISO(addDays(today, 1));
      const weekFrom = formatDateISO(startOfWeek(today));
      const weekTo = formatDateISO(addDays(today, 1));
      const monthFrom = formatDateISO(startOfMonth(today));
      // Docs monthly example: from=YYYY-MM-01&to=next-month-01
      const monthTo = formatDateISO(startOfNextMonth(today));

      const [daily, weekly, monthly] = await Promise.all([
        loadProductionStats({
          granularity: "day",
          from: dayStr,
          to: dayTo,
        }),
        loadProductionStats({
          granularity: "day",
          from: weekFrom,
          to: weekTo,
        }),
        loadProductionStats({
          granularity: "month",
          from: monthFrom,
          to: monthTo,
        }),
      ]);

      setDailyTotal(sumCounts(daily));
      setWeeklyTotal(sumCounts(weekly));
      setMonthlyTotal(sumCounts(monthly));
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not load summary cards.";
      setSummaryError(msg);
      setDailyTotal(null);
      setWeeklyTotal(null);
      setMonthlyTotal(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [today]);

  const loadTable = useCallback(async () => {
    setTableLoading(true);
    setTableError("");
    try {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(toDate)
      ) {
        throw new Error("From and To must use YYYY-MM-DD format.");
      }
      const rows = await loadProductionStats({
        granularity,
        from: fromDate,
        to: toDate,
      });
      setTableRows(rows);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not load activity table.";
      setTableError(msg);
      setTableRows([]);
    } finally {
      setTableLoading(false);
    }
  }, [fromDate, toDate, granularity]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void loadTable();
  }, [loadTable]);

  const handleFetchReportCopy = async () => {
    const id = reportId.trim();
    if (!id) {
      toast.error("Report ID required", {
        description: "Enter the ClearVIN Report ID to re-fetch a copy.",
      });
      return;
    }

    setFetchBusy(true);
    setFetchedHtml(null);
    if (pdfObjectUrl) {
      URL.revokeObjectURL(pdfObjectUrl);
      setPdfObjectUrl(null);
    }

    try {
      const search = new URLSearchParams();
      search.set("reportId", id);
      search.set("format", reportFormat);
      if (locale.trim()) search.set("locale", locale.trim());

      const res = await fetch(`/api/clearvin/report?${search.toString()}`);
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(
          typeof json.message === "string"
            ? json.message
            : "Failed to fetch report copy.",
        );
      }

      if (reportFormat === "pdf") {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPdfObjectUrl(url);
        toast.success("PDF ready", {
          description: "No additional credit was consumed.",
        });
      } else {
        const html = await res.text();
        setFetchedHtml(html);
        toast.success("Report loaded", {
          description: "No additional credit was consumed.",
        });
      }
    } catch (e) {
      toast.error("Fetch failed", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setFetchBusy(false);
    }
  };

  return (
    <main className="max-w-[1920px] mx-auto relative overflow-hidden min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 mt-24 max-w-6xl mx-auto px-4 py-10 w-full space-y-10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-custom_red font-semibold text-sm uppercase tracking-wide">
            <Activity className="h-5 w-5" />
            ClearVIN account activity
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Production usage
          </h1>
          <p className="text-gray-600 max-w-2xl text-sm md:text-base">
            Live credit-consuming report counts from the ClearVIN production
            stats API. Test-token activity is never included.
          </p>
          <p className="text-xs text-gray-500">
            <Link href="/" className="underline hover:text-custom_red">
              Back to home
            </Link>
          </p>
        </div>

        {/* Summary cards — ClearVIN production stats only */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
          {summaryError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3 text-sm text-gray-800">
              <AlertTriangle className="h-5 w-5 text-custom_red shrink-0" />
              <div>
                <p>{summaryError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => void loadSummary()}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Today
                  </CardDescription>
                  <CardTitle className="text-3xl">
                    {summaryLoading ? (
                      <Loader2 className="h-7 w-7 animate-spin text-custom_red" />
                    ) : (
                      (dailyTotal ?? "—")
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  granularity=day · today
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <CalendarRange className="h-4 w-4" />
                    This week
                  </CardDescription>
                  <CardTitle className="text-3xl">
                    {summaryLoading ? (
                      <Loader2 className="h-7 w-7 animate-spin text-custom_red" />
                    ) : (
                      (weeklyTotal ?? "—")
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  granularity=day · Mon–today
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    This month
                  </CardDescription>
                  <CardTitle className="text-3xl">
                    {summaryLoading ? (
                      <Loader2 className="h-7 w-7 animate-spin text-custom_red" />
                    ) : (
                      (monthlyTotal ?? "—")
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  granularity=month · current month
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        {/* Filtered table — date-range stats endpoint */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Activity by period
          </h2>
          <div className="flex flex-col md:flex-row gap-4 md:items-end rounded-xl border bg-white p-4 shadow-sm">
            <div className="space-y-2 flex-1 min-w-[140px]">
              <Label htmlFor="granularity">Granularity</Label>
              <select
                id="granularity"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                value={granularity}
                onChange={(e) =>
                  setGranularity(e.target.value as StatsGranularity)
                }
              >
                <option value="day">Day</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="fromDate">From (YYYY-MM-DD)</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="toDate">To (YYYY-MM-DD)</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <Button
              className="bg-custom_red hover:bg-custom_red/90 text-white"
              onClick={() => void loadTable()}
              disabled={tableLoading}
            >
              {tableLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </>
              ) : (
                "Apply filters"
              )}
            </Button>
          </div>

          {tableError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-gray-800">
              {tableError}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Report count</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tableLoading ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-custom_red inline-block" />
                      </td>
                    </tr>
                  ) : tableRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-10 text-center text-gray-500"
                      >
                        No production activity for this period.
                      </td>
                    </tr>
                  ) : (
                    tableRows.map((row) => (
                      <tr
                        key={row.date}
                        className="border-b last:border-0 hover:bg-gray-50/80"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {row.date}
                        </td>
                        <td className="px-4 py-3">{row.count}</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              row.count > 0
                                ? "inline-flex rounded-full bg-green-100 text-green-800 px-2.5 py-0.5 text-xs font-semibold"
                                : "inline-flex rounded-full bg-gray-100 text-gray-600 px-2.5 py-0.5 text-xs font-semibold"
                            }
                          >
                            {row.count > 0 ? "Active" : "None"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Report copy by ID (unchanged section; uses existing report API) */}
        <section className="space-y-4 pb-8">
          <div className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-custom_red" />
            <h2 className="text-lg font-semibold text-gray-900">
              Fetch Report Copy
            </h2>
          </div>
          <p className="text-sm text-gray-600 max-w-2xl">
            Re-download a previously ordered ClearVIN report by its Report ID.
            No additional credit is consumed.
          </p>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="reportId">ClearVIN Report ID</Label>
                  <Input
                    id="reportId"
                    placeholder="Enter report ID"
                    value={reportId}
                    onChange={(e) => setReportId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportFormat">Format</Label>
                  <select
                    id="reportFormat"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    value={reportFormat}
                    onChange={(e) =>
                      setReportFormat(e.target.value as "html" | "pdf")
                    }
                  >
                    <option value="html">HTML</option>
                    <option value="pdf">PDF</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locale">Locale (optional)</Label>
                  <Input
                    id="locale"
                    placeholder="e.g. es"
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                  />
                </div>
              </div>
              <Button
                className="bg-custom_red hover:bg-custom_red/90 text-white"
                onClick={() => void handleFetchReportCopy()}
                disabled={fetchBusy}
              >
                {fetchBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Fetching…
                  </>
                ) : (
                  "Fetch Report"
                )}
              </Button>
            </CardContent>
          </Card>

          {pdfObjectUrl ? (
            <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
              <p className="text-sm font-medium text-gray-900">PDF ready</p>
              <a
                href={pdfObjectUrl}
                download={`clearvin-report-${reportId.trim() || "copy"}.pdf`}
                className="inline-flex text-sm font-semibold text-custom_red underline"
              >
                Download PDF
              </a>
              <iframe
                title="ClearVIN report PDF"
                src={pdfObjectUrl}
                className="w-full h-[70vh] border rounded-lg"
              />
            </div>
          ) : null}

          {fetchedHtml ? (
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="border-b px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50">
                Report preview (HTML)
              </div>
              <iframe
                title="ClearVIN report HTML"
                srcDoc={fetchedHtml}
                className="w-full h-[70vh] border-0 bg-white"
                sandbox="allow-same-origin allow-scripts allow-popups allow-downloads"
              />
            </div>
          ) : null}
        </section>
      </div>
      <FooterSection />
    </main>
  );
}
