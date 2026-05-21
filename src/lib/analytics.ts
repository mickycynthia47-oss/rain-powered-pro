export type ToolName = "email" | "meetings" | "tasks" | "research" | "chat";

export interface AnalyticsEvent {
  tool: ToolName;
  timestamp: number;
  success: boolean;
  responseTime: number;
}

export interface AnalyticsState {
  events: AnalyticsEvent[];
}

const KEY = "productivityAnalytics";

export function loadAnalytics(): AnalyticsState {
  if (typeof window === "undefined") return { events: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { events: [] };
    return JSON.parse(raw) as AnalyticsState;
  } catch {
    return { events: [] };
  }
}

export function saveAnalytics(state: AnalyticsState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("analytics:update"));
}

export function trackEvent(e: AnalyticsEvent) {
  const s = loadAnalytics();
  s.events.push(e);
  saveAnalytics(s);
}

export function resetAnalytics() {
  saveAnalytics({ events: [] });
}

export function countsByTool(state: AnalyticsState) {
  const c: Record<ToolName, number> = { email: 0, meetings: 0, tasks: 0, research: 0, chat: 0 };
  for (const e of state.events) if (e.success) c[e.tool]++;
  return c;
}

export function productivityScore(state: AnalyticsState) {
  const total = state.events.length;
  if (!total) return 0;
  const successes = state.events.filter((e) => e.success).length;
  const variety = new Set(state.events.map((e) => e.tool)).size;
  const base = (successes / total) * 70;
  const varietyBonus = (variety / 5) * 30;
  return Math.min(100, Math.round(base + varietyBonus));
}

export function weeklyActivity(state: AnalyticsState) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const buckets = days.map((d) => ({ day: d, count: 0 }));
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 3600 * 1000;
  for (const e of state.events) {
    if (e.timestamp < weekAgo) continue;
    const d = new Date(e.timestamp).getDay();
    buckets[d].count++;
  }
  // reorder Mon-Sun
  return [...buckets.slice(1), buckets[0]];
}

export function responseTimes(state: AnalyticsState) {
  return state.events.slice(-20).map((e, i) => ({
    idx: i + 1,
    ms: e.responseTime,
  }));
}

export function exportCsv(state: AnalyticsState) {
  const header = "tool,timestamp,success,responseTimeMs\n";
  const rows = state.events
    .map((e) => `${e.tool},${new Date(e.timestamp).toISOString()},${e.success},${e.responseTime}`)
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `productivity-analytics-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
