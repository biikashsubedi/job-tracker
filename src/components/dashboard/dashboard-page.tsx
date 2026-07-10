"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Briefcase,
  Gift,
  MessagesSquare,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ApplicationDetail,
  ApplicationRow,
} from "@/lib/types";
import {
  computeStats,
  platformShare,
  roleTypeShare,
  statusBreakdown,
  upcomingDeadlines,
  weeklySeries,
  type ChartSlice,
} from "@/lib/dashboard";
import { workModeShare } from "@/lib/dashboard";
import { buildStatusGroups } from "@/lib/status-groups";
import { useRevalidateOnFocus } from "@/lib/use-revalidate";
import { daysUntil, formatDateShort } from "@/lib/format";
import { DetailDrawer } from "../applications/detail-drawer";
import { useLookups } from "@/components/lookups/lookup-provider";
import { cn } from "@/lib/utils";

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--popover))",
  color: "hsl(var(--popover-foreground))",
  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  fontSize: 12,
  padding: "8px 12px",
};

const TOOLTIP_LABEL_STYLE = { color: "hsl(var(--muted-foreground))" };
const TOOLTIP_ITEM_STYLE = { color: "hsl(var(--popover-foreground))" };

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  chip,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  chip: string;
  iconColor: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-3xl font-semibold tracking-tight">
            {value}
          </p>
          {sub && (
            <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            chip
          )}
        >
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  sub,
  children,
  className,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-5 shadow-sm", className)}>
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function NoData({ message = "No data yet" }: { message?: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function DonutLegend({ data }: { data: ChartSlice[] }) {
  return (
    <ul className="min-w-0 flex-1 space-y-1.5">
      {data.map((slice) => (
        <li key={slice.name} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: slice.fill }}
          />
          <span className="min-w-0 flex-1 truncate">{slice.name}</span>
          <span className="tabular-nums text-muted-foreground">
            {slice.value}
          </span>
          <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
            {slice.pct}%
          </span>
        </li>
      ))}
    </ul>
  );
}

function DeadlineRow({
  app,
  onOpen,
}: {
  app: ApplicationRow;
  onOpen: (app: ApplicationRow) => void;
}) {
  const days = daysUntil(app.deadline) ?? 0;
  const urgency =
    days <= 3
      ? {
          chip: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
          label: days === 0 ? "Today" : `in ${days}d`,
        }
      : days <= 7
        ? {
            chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
            label: `in ${days}d`,
          }
        : { chip: "bg-muted text-muted-foreground", label: `in ${days}d` };

  return (
    <button
      onClick={() => onOpen(app)}
      className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left shadow-sm transition-colors hover:bg-muted/50"
    >
      <span
        className={cn(
          "inline-flex w-16 shrink-0 items-center justify-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold",
          urgency.chip
        )}
      >
        {formatDateShort(app.deadline)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {app.position}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {app.company}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 text-xs font-medium tabular-nums",
          days <= 3 ? "text-red-600" : "text-muted-foreground"
        )}
      >
        {urgency.label}
      </span>
    </button>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 shadow-sm">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-4 h-48 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </>
  );
}

export function DashboardPage() {
  const { options, colorFor } = useLookups();
  const groups = useMemo(() => buildStatusGroups(options.STATUS), [options]);

  const [apps, setApps] = useState<ApplicationRow[] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<ApplicationRow | null>(null);
  const [selectedDetail, setSelectedDetail] =
    useState<ApplicationDetail | null>(null);

  const loadApps = useCallback(() => {
    fetch("/api/applications", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setApps)
      .catch(() => {
        setApps((prev) => prev ?? []);
        toast.error("Failed to load applications");
      });
  }, []);

  const refreshOpenDetail = useCallback(() => {
    const id = selected?.id;
    if (!id || !drawerOpen) return;
    fetch(`/api/applications/${id}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: ApplicationDetail) => {
        setSelected(data);
        setSelectedDetail(data);
      })
      .catch(() => {});
  }, [selected?.id, drawerOpen]);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  // Refresh when returning to the dashboard (back-nav, tab refocus, cross-tab).
  useRevalidateOnFocus(() => {
    loadApps();
    refreshOpenDetail();
  });

  const labelsOf = (type: Parameters<typeof colorFor>[0]) =>
    options[type].map((o) => o.label);
  const hexOf = (type: Parameters<typeof colorFor>[0]) => (label: string) =>
    colorFor(type, label).hex;

  const stats = useMemo(
    () => (apps ? computeStats(apps, groups) : null),
    [apps, groups]
  );
  const byStatus = useMemo(
    () =>
      apps
        ? statusBreakdown(apps, labelsOf("STATUS"), hexOf("STATUS"))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apps, options]
  );
  const byPlatform = useMemo(
    () =>
      apps
        ? platformShare(apps, labelsOf("PLATFORM"), hexOf("PLATFORM"))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apps, options]
  );
  const byWorkMode = useMemo(
    () =>
      apps
        ? workModeShare(apps, labelsOf("WORK_MODE"), hexOf("WORK_MODE"))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apps, options]
  );
  const byRoleType = useMemo(
    () => (apps ? roleTypeShare(apps, labelsOf("ROLE_TYPE")) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apps, options]
  );
  const overTime = useMemo(() => (apps ? weeklySeries(apps) : []), [apps]);
  const deadlines = useMemo(
    () => (apps ? upcomingDeadlines(apps) : []),
    [apps]
  );

  function openDetail(app: ApplicationRow) {
    setSelected(app);
    setSelectedDetail(null);
    setDrawerOpen(true);
    fetch(`/api/applications/${app.id}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: ApplicationDetail) => {
        setSelected(data);
        setSelectedDetail(data);
      })
      .catch(() => toast.error("Failed to load application details"));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live view of your job hunt, straight from the pipeline.
        </p>
      </div>

      {apps === null || stats === null ? (
        <DashboardSkeleton />
      ) : (
        <>
          <section
            aria-label="Key metrics"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <StatCard
              icon={Briefcase}
              label="Total Applications"
              value={String(stats.total)}
              sub="All time"
              chip="bg-indigo-100 dark:bg-indigo-500/15"
              iconColor="text-indigo-600 dark:text-indigo-400"
            />
            <StatCard
              icon={Activity}
              label="Active Pipeline"
              value={String(stats.active)}
              sub="Not yet in a terminal status"
              chip="bg-blue-100 dark:bg-blue-500/15"
              iconColor="text-blue-600 dark:text-blue-400"
            />
            <StatCard
              icon={MessagesSquare}
              label="Interviewing"
              value={String(stats.interviewing)}
              sub="Currently in interview stages"
              chip="bg-amber-100 dark:bg-amber-500/15"
              iconColor="text-amber-600 dark:text-amber-400"
            />
            <StatCard
              icon={Gift}
              label="Offers"
              value={String(stats.offers)}
              sub="Offer stage or beyond"
              chip="bg-green-100 dark:bg-green-500/15"
              iconColor="text-green-600 dark:text-green-400"
            />
            <StatCard
              icon={XCircle}
              label="Closed / Rejected"
              value={String(stats.closed)}
              sub="Didn't work out"
              chip="bg-red-100 dark:bg-red-500/15"
              iconColor="text-red-600 dark:text-red-400"
            />
            <StatCard
              icon={TrendingUp}
              label="Response Rate"
              value={`${stats.responseRate}%`}
              sub="Progressed past Applied"
              chip="bg-purple-100 dark:bg-purple-500/15"
              iconColor="text-purple-600 dark:text-purple-400"
            />
          </section>

          <section
            aria-label="Charts and insights"
            className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2"
          >
            <ChartCard
              title="Status Breakdown"
              sub="Where every application sits right now"
            >
              {byStatus.length === 0 ? (
                <NoData />
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(160, byStatus.length * 40 + 24)}
                >
                  <BarChart
                    data={byStatus}
                    layout="vertical"
                    margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
                  >
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={165}
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.04)" }}
                      contentStyle={TOOLTIP_STYLE}
                      labelStyle={TOOLTIP_LABEL_STYLE}
                      itemStyle={TOOLTIP_ITEM_STYLE}
                      formatter={(value) => [value, "Applications"]}
                    />
                    <Bar dataKey="value" barSize={18} radius={[4, 4, 4, 4]}>
                      {byStatus.map((slice) => (
                        <Cell key={slice.name} fill={slice.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard
              title="Applications by Platform"
              sub="Share of where you're applying"
            >
              {byPlatform.length === 0 ? (
                <NoData />
              ) : (
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
                  <div className="h-[190px] w-[190px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                      labelStyle={TOOLTIP_LABEL_STYLE}
                      itemStyle={TOOLTIP_ITEM_STYLE}
                          formatter={(value, name) => [value, name]}
                        />
                        <Pie
                          data={byPlatform}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          strokeWidth={0}
                        >
                          {byPlatform.map((slice) => (
                            <Cell key={slice.name} fill={slice.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <DonutLegend data={byPlatform} />
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Work Mode & Role Type"
              sub="How you're targeting roles"
            >
              {byWorkMode.length === 0 && byRoleType.length === 0 ? (
                <NoData />
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Work Mode
                    </p>
                    <div className="h-[150px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip contentStyle={TOOLTIP_STYLE}
                      labelStyle={TOOLTIP_LABEL_STYLE}
                      itemStyle={TOOLTIP_ITEM_STYLE} />
                          <Pie
                            data={byWorkMode}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={65}
                            paddingAngle={2}
                            strokeWidth={0}
                          >
                            {byWorkMode.map((slice) => (
                              <Cell key={slice.name} fill={slice.fill} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <DonutLegend data={byWorkMode} />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Role Type
                    </p>
                    <ResponsiveContainer
                      width="100%"
                      height={Math.max(120, byRoleType.length * 38 + 16)}
                    >
                      <BarChart
                        data={byRoleType}
                        layout="vertical"
                        margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
                      >
                        <XAxis type="number" hide allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={80}
                          tick={{ fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(0,0,0,0.04)" }}
                          contentStyle={TOOLTIP_STYLE}
                      labelStyle={TOOLTIP_LABEL_STYLE}
                      itemStyle={TOOLTIP_ITEM_STYLE}
                          formatter={(value) => [value, "Applications"]}
                        />
                        <Bar dataKey="value" barSize={16} radius={[4, 4, 4, 4]}>
                          {byRoleType.map((slice) => (
                            <Cell key={slice.name} fill={slice.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Upcoming Deadlines"
              sub="Next application deadlines, most urgent first"
            >
              {deadlines.length === 0 ? (
                <NoData message="No upcoming deadlines" />
              ) : (
                <div className="space-y-2">
                  {deadlines.map((app) => (
                    <DeadlineRow key={app.id} app={app} onOpen={openDetail} />
                  ))}
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Applications Over Time"
              sub="Applications submitted per week"
              className="lg:col-span-2"
            >
              {overTime.length === 0 ? (
                <NoData message="No application dates recorded yet" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart
                    data={overTime}
                    margin={{ top: 8, right: 12, bottom: 0, left: -20 }}
                  >
                    <defs>
                      <linearGradient id="fillWeekly" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelStyle={TOOLTIP_LABEL_STYLE}
                      itemStyle={TOOLTIP_ITEM_STYLE}
                      formatter={(value) => [value, "Applications"]}
                      labelFormatter={(label) => `Week of ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#fillWeekly)"
                      dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </section>
        </>
      )}

      <DetailDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            setSelected(null);
            setSelectedDetail(null);
          }
        }}
        app={selected}
        detail={selectedDetail}
        onDocumentsChanged={() => {
          loadApps();
          refreshOpenDetail();
        }}
      />
    </div>
  );
}
