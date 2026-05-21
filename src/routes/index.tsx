import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
  Legend,
} from "recharts";
import {
  Sun,
  Moon,
  Mail,
  ClipboardList,
  CheckSquare,
  Microscope,
  MessageSquare,
  LayoutDashboard,
  Copy,
  Download,
  RotateCcw,
  Plus,
  Trash2,
  Send,
  Loader2,
  LogOut,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Splash } from "@/components/splash";
import {
  loadAnalytics,
  
  trackEvent,
  resetAnalytics,
  countsByTool,
  productivityScore,
  weeklyActivity,
  responseTimes,
  exportCsv,
  type AnalyticsState,
  type ToolName,
} from "@/lib/analytics";
import {
  generateEmail,
  summarizeMeeting,
  planTasks,
  researchAnalyze,
  chatReply,
  withRetry,
  type Task,
} from "@/lib/mock-ai";

export const Route = createFileRoute("/")({ component: Page });

/* ============================ ROOT PAGE ============================ */

function Page() {
  const [showSplash, setShowSplash] = useState<boolean | null>(null);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setShowSplash(typeof window !== "undefined" && !localStorage.getItem("splashSeen"));
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (showSplash === null || loading) return null;
  if (!user) return null;

  return (
    <>
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}
      <App user={user} />
    </>
  );
}

/* ============================ APP SHELL ============================ */

type Tab = "dashboard" | "email" | "meetings" | "tasks" | "research" | "chat";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "🏠 Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "email", label: "📧 Email", icon: <Mail className="h-4 w-4" /> },
  { id: "meetings", label: "📝 Meetings", icon: <ClipboardList className="h-4 w-4" /> },
  { id: "tasks", label: "✅ Tasks", icon: <CheckSquare className="h-4 w-4" /> },
  { id: "research", label: "🔬 Research", icon: <Microscope className="h-4 w-4" /> },
  { id: "chat", label: "💬 Chat", icon: <MessageSquare className="h-4 w-4" /> },
];

function App({ user }: { user: { email?: string | null; user_metadata?: { full_name?: string; avatar_url?: string } } }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [dark, setDark] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  };

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const avatar = user.user_metadata?.avatar_url;

  useEffect(() => {
    const stored = localStorage.getItem("bh-theme");
    setDark(stored === "dark");
  }, []);

  useEffect(() => {
    localStorage.setItem("bh-theme", dark ? "dark" : "light");
  }, [dark]);

  const bg = dark ? "#0D1B2A" : "#E3F2FD";
  const cardBg = dark ? "#1B263B" : "#FFFFFF";
  const text = dark ? "#E3F2FD" : "#0D1B2A";

  return (
    <div className="min-h-screen transition-colors" style={{ backgroundColor: bg, color: text }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-4 py-4 text-white shadow-lg sm:px-8"
        style={{ background: "linear-gradient(135deg, #1565C0, #42A5F5)" }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌧️</span>
            <div>
              <h1 className="text-lg font-bold leading-tight sm:text-xl">
                AI Workplace Productivity Assistant
              </h1>
              <p className="text-xs text-white/80">Blue Horizon Edition</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs sm:flex">
              {avatar ? (
                <img src={avatar} alt="" className="h-6 w-6 rounded-full" />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/30 text-[10px] font-bold">
                  {displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="font-medium">{displayName}</span>
            </div>
            <button
              onClick={() => setDark((d) => !d)}
              className="rounded-full bg-white/20 p-2 transition hover:bg-white/30"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-2 text-xs font-medium transition hover:bg-white/30"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <nav className="mx-auto mt-4 flex max-w-7xl gap-2 overflow-x-auto">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-white text-[#1565C0] shadow"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
        {tab === "dashboard" && <Dashboard dark={dark} cardBg={cardBg} />}
        {tab === "email" && <EmailSection dark={dark} cardBg={cardBg} />}
        {tab === "meetings" && <MeetingSection dark={dark} cardBg={cardBg} />}
        {tab === "tasks" && <TaskSection dark={dark} cardBg={cardBg} />}
        {tab === "research" && <ResearchSection dark={dark} cardBg={cardBg} />}
        {tab === "chat" && <ChatSection dark={dark} cardBg={cardBg} />}
      </main>

      <footer className="border-t px-4 py-6 text-center text-xs opacity-70 sm:px-8" style={{ borderColor: dark ? "#1B263B" : "#BBDEFB" }}>
        🛡️ AI generates suggestions. Please verify important information before acting. | Blue
        Horizon Edition v1.0 ·{" "}
        <a href="https://github.com" className="underline">
          GitHub
        </a>
      </footer>
    </div>
  );
}

/* ============================ COMMON ============================ */

function Card({
  children,
  cardBg,
  className = "",
}: {
  children: React.ReactNode;
  cardBg: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-md ${className}`}
      style={{ backgroundColor: cardBg, borderColor: "#90CAF9" }}
    >
      {children}
    </div>
  );
}

function SectionDisclaimer() {
  return (
    <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-[11px] text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
      🛡️ AI suggestions — please verify.
    </div>
  );
}

function PrimaryButton({
  children,
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70 ${
        props.className || ""
      }`}
      style={{ background: "linear-gradient(135deg, #1565C0, #42A5F5)" }}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {loading ? "Processing... ⏳" : children}
    </button>
  );
}

const inputCls =
  "w-full rounded-xl border border-blue-200 bg-white/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1565C0] focus:outline-none focus:ring-2 focus:ring-[#42A5F5]/40 dark:bg-slate-800/80 dark:text-slate-50 dark:border-slate-600";

/* ============================ DASHBOARD ============================ */

function useAnalytics() {
  const [state, setState] = useState<AnalyticsState>({ events: [] });
  useEffect(() => {
    setState(loadAnalytics());
    const onUpdate = () => setState(loadAnalytics());
    window.addEventListener("analytics:update", onUpdate);
    return () => window.removeEventListener("analytics:update", onUpdate);
  }, []);
  return state;
}

function Dashboard({ dark, cardBg }: { dark: boolean; cardBg: string }) {
  const state = useAnalytics();
  const counts = countsByTool(state);
  const score = productivityScore(state);
  const week = weeklyActivity(state);
  const rt = responseTimes(state);

  const metrics = [
    { label: "📧 Emails", value: counts.email },
    { label: "📝 Meetings", value: counts.meetings },
    { label: "✅ Tasks", value: counts.tasks },
    { label: "🔬 Research", value: counts.research },
    { label: "💬 Chats", value: counts.chat },
    { label: "⭐ Productivity Score", value: score },
  ];

  const pieData = [
    { name: "Email", value: counts.email || 0, color: "#1565C0" },
    { name: "Meetings", value: counts.meetings || 0, color: "#1976D2" },
    { name: "Tasks", value: counts.tasks || 0, color: "#1E88E5" },
    { name: "Research", value: counts.research || 0, color: "#42A5F5" },
    { name: "Chat", value: counts.chat || 0, color: "#90CAF9" },
  ];
  const allZero = pieData.every((d) => d.value === 0);
  const pieRender = allZero ? pieData.map((d) => ({ ...d, value: 1 })) : pieData;

  const handleReset = () => {
    if (confirm("Reset all analytics? This cannot be undone.")) {
      resetAnalytics();
      toast.info("ℹ️ Analytics reset");
    }
  };

  const axisColor = dark ? "#BBDEFB" : "#1565C0";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">📊 Analytics Dashboard</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              exportCsv(state);
              toast.success("✅ Exported CSV");
            }}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#1565C0] px-4 py-2 text-sm font-semibold text-[#1565C0] hover:bg-[#1565C0] hover:text-white"
          >
            <Download className="h-4 w-4" /> 📥 Export CSV
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-red-500 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-500 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" /> 🔄 Reset
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-2xl p-4 text-white shadow-md"
            style={{ background: "linear-gradient(135deg, #1565C0, #42A5F5)" }}
          >
            <div className="text-xs opacity-90">{m.label}</div>
            <div className="mt-1 text-2xl font-bold">{m.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card cardBg={cardBg}>
          <h3 className="mb-3 text-sm font-bold">Usage Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieRender}
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieRender.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card cardBg={cardBg}>
          <h3 className="mb-3 text-sm font-bold">Productivity Score</h3>
          <div className="relative h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="70%"
                outerRadius="100%"
                data={[{ name: "Score", value: score, fill: "url(#gaugeGrad)" }]}
                startAngle={180}
                endAngle={0}
              >
                <defs>
                  <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00ACC1" />
                    <stop offset="100%" stopColor="#0D47A1" />
                  </linearGradient>
                </defs>
                <RadialBar background={{ fill: dark ? "#0D1B2A" : "#E3F2FD" }} dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div
              className="pointer-events-none absolute inset-0 flex items-end justify-center pb-10 text-3xl font-bold"
              style={{ color: "#1565C0" }}
            >
              {score}
              <span className="ml-1 text-base font-medium">/100</span>
            </div>
          </div>
        </Card>

        <Card cardBg={cardBg}>
          <h3 className="mb-3 text-sm font-bold">Weekly Activity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={week}>
                <XAxis dataKey="day" stroke={axisColor} fontSize={12} />
                <YAxis stroke={axisColor} fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(21,101,192,0.08)" }} />
                <Bar dataKey="count" fill="#42A5F5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card cardBg={cardBg}>
          <h3 className="mb-3 text-sm font-bold">Response Time (ms)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rt}>
                <defs>
                  <linearGradient id="cyanFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00ACC1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#00ACC1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="idx" stroke={axisColor} fontSize={12} />
                <YAxis stroke={axisColor} fontSize={12} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="ms"
                  stroke="#00ACC1"
                  strokeWidth={2}
                  fill="url(#cyanFill)"
                  dot={{ stroke: "#00ACC1", strokeWidth: 2, fill: "#fff", r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <SectionDisclaimer />
    </div>
  );
}

/* ============================ ANALYTICS HELPER ============================ */

async function runTool<T>(
  tool: ToolName,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await withRetry(fn, (n) => toast.error(`❌ Failed. Retrying (${n}/3)...`));
    trackEvent({ tool, timestamp: Date.now(), success: true, responseTime: Date.now() - start });
    return result;
  } catch (e) {
    trackEvent({ tool, timestamp: Date.now(), success: false, responseTime: Date.now() - start });
    throw e;
  }
}

/* ============================ EMAIL ============================ */

function EmailSection({ cardBg }: { dark: boolean; cardBg: string }) {
  const [recipient, setRecipient] = useState("👔 Manager");
  const [tone, setTone] = useState("Formal");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<{ subject: string; body: string } | null>(null);

  const handle = async () => {
    if (!context.trim()) {
      toast.warning("⚠️ Please enter context");
      return;
    }
    setLoading(true);
    try {
      const r = await runTool("email", () => generateEmail({ recipient, tone, context }));
      setOut(r);
      toast.success("✅ Email generated! Dashboard updated");
    } catch {
      toast.error("❌ Failed after retries");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card cardBg={cardBg}>
        <h2 className="mb-4 text-lg font-bold">📧 Smart Email Generator</h2>
        <div className="space-y-3">
          <label className="block text-sm font-medium">Recipient</label>
          <select className={inputCls} value={recipient} onChange={(e) => setRecipient(e.target.value)}>
            {["👔 Manager", "🤝 Client", "👥 Team", "📊 Stakeholder"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <label className="block text-sm font-medium">Tone</label>
          <select className={inputCls} value={tone} onChange={(e) => setTone(e.target.value)}>
            {["Formal", "Informal", "Persuasive", "Urgent"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <label className="block text-sm font-medium">What's this about?</label>
          <textarea
            rows={5}
            className={inputCls}
            placeholder="Bullet points or context..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
          <PrimaryButton onClick={handle} loading={loading}>✨ Generate Email</PrimaryButton>
        </div>
        <SectionDisclaimer />
      </Card>

      <Card cardBg={cardBg}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">📨 Output</h3>
          {out && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(`Subject: ${out.subject}\n\n${out.body}`);
                toast.success("✅ Copied to clipboard");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-[#1565C0] px-3 py-1 text-xs font-semibold text-[#1565C0] hover:bg-[#1565C0] hover:text-white"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          )}
        </div>
        {out ? (
          <div className="space-y-3 text-sm">
            <div><span className="font-bold">Subject:</span> {out.subject}</div>
            <pre className="whitespace-pre-wrap rounded-lg bg-blue-50 p-3 font-sans text-slate-800 dark:bg-slate-800 dark:text-slate-100">{out.body}</pre>
          </div>
        ) : (
          <p className="text-sm opacity-60">Generated email will appear here.</p>
        )}
      </Card>
    </div>
  );
}

/* ============================ MEETINGS ============================ */

function MeetingSection({ cardBg }: { dark: boolean; cardBg: string }) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<Awaited<ReturnType<typeof summarizeMeeting>> | null>(null);
  const MAX = 5000;

  const handle = async () => {
    if (notes.trim().length < 20) {
      toast.warning("⚠️ Need at least 20 characters of notes");
      return;
    }
    setLoading(true);
    try {
      const r = await runTool("meetings", () => summarizeMeeting(notes));
      setOut(r);
      toast.success("✅ Meeting summarized! Dashboard updated");
    } catch {
      toast.error("❌ Failed after retries");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card cardBg={cardBg}>
        <h2 className="mb-4 text-lg font-bold">📝 Meeting Notes Summarizer</h2>
        <textarea
          rows={10}
          className={inputCls}
          placeholder="Paste your messy meeting notes here..."
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, MAX))}
        />
        <div className="mt-1 text-right text-xs opacity-60">
          {notes.length} / {MAX}
        </div>
        <PrimaryButton onClick={handle} loading={loading} className="mt-3">
          🔄 Summarize Meeting
        </PrimaryButton>
        <SectionDisclaimer />
      </Card>

      <Card cardBg={cardBg}>
        <h3 className="mb-3 text-lg font-bold">📋 Summary</h3>
        {out ? (
          <div className="space-y-4 text-sm">
            <div>
              <div className="font-semibold">🔑 Key Points</div>
              <ul className="ml-4 list-disc">
                {out.keyPoints.map((k, i) => <li key={i}>{k}</li>)}
              </ul>
            </div>
            <div>
              <div className="font-semibold">✅ Decisions Made</div>
              <ul className="ml-4 list-disc">
                {out.decisions.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
            <div>
              <div className="font-semibold">📋 Action Items</div>
              <ul className="ml-4 list-disc">
                {out.actions.map((a, i) => <li key={i}><b>{a.owner}:</b> {a.task}</li>)}
              </ul>
            </div>
            <div>
              <div className="font-semibold">⏰ Deadlines</div>
              <ul className="ml-4 list-disc">
                {out.deadlines.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-sm opacity-60">Summary will appear here.</p>
        )}
      </Card>
    </div>
  );
}

/* ============================ TASKS ============================ */

function TaskSection({ cardBg }: { dark: boolean; cardBg: string }) {
  const [tasks, setTasks] = useState<Task[]>([
    { name: "", priority: "Medium", deadline: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<Awaited<ReturnType<typeof planTasks>> | null>(null);

  const addTask = () => {
    if (tasks.length >= 10) { toast.warning("⚠️ Maximum 10 tasks"); return; }
    setTasks([...tasks, { name: "", priority: "Medium", deadline: "" }]);
  };
  const updateTask = (i: number, patch: Partial<Task>) =>
    setTasks(tasks.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const removeTask = (i: number) => setTasks(tasks.filter((_, idx) => idx !== i));

  const handle = async () => {
    const filled = tasks.filter((t) => t.name.trim());
    if (!filled.length) { toast.warning("⚠️ Add at least one task"); return; }
    setLoading(true);
    try {
      const r = await runTool("tasks", () => planTasks(filled));
      setOut(r);
      toast.success("✅ Plan ready! Dashboard updated");
    } catch {
      toast.error("❌ Failed after retries");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card cardBg={cardBg}>
        <h2 className="mb-4 text-lg font-bold">✅ AI Task Planner</h2>
        <div className="space-y-3">
          {tasks.map((t, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <input
                className={inputCls + " col-span-5"}
                placeholder="Task name"
                value={t.name}
                onChange={(e) => updateTask(i, { name: e.target.value })}
              />
              <select
                className={inputCls + " col-span-3"}
                value={t.priority}
                onChange={(e) => updateTask(i, { priority: e.target.value as Task["priority"] })}
              >
                <option value="High">🔴 High</option>
                <option value="Medium">🟡 Medium</option>
                <option value="Low">🟢 Low</option>
              </select>
              <input
                type="date"
                className={inputCls + " col-span-3"}
                value={t.deadline}
                onChange={(e) => updateTask(i, { deadline: e.target.value })}
              />
              <button
                onClick={() => removeTask(i)}
                className="col-span-1 rounded-xl border border-red-300 text-red-500 hover:bg-red-50"
                aria-label="Remove"
              >
                <Trash2 className="mx-auto h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addTask}
            className="inline-flex items-center gap-1 rounded-xl border border-[#1565C0] px-3 py-1.5 text-sm text-[#1565C0] hover:bg-[#1565C0] hover:text-white"
          >
            <Plus className="h-4 w-4" /> Add task
          </button>
          <div>
            <PrimaryButton onClick={handle} loading={loading}>🎯 Generate Smart Plan</PrimaryButton>
          </div>
        </div>
        <SectionDisclaimer />
      </Card>

      <Card cardBg={cardBg}>
        <h3 className="mb-3 text-lg font-bold">🗂️ Plan</h3>
        {out ? (
          <div className="space-y-4 text-sm">
            <div>
              <div className="font-semibold">🏆 Today's Top 3</div>
              <ol className="ml-4 list-decimal">
                {out.top3.map((t, i) => <li key={i}>{t.name} <span className="opacity-60">({t.priority})</span></li>)}
              </ol>
            </div>
            <div>
              <div className="font-semibold">⏱️ Suggested Time Blocks</div>
              <ul className="ml-4 list-disc">
                {out.blocks.map((b, i) => <li key={i}><b>{b.time}</b> — {b.task}</li>)}
              </ul>
            </div>
            <div>
              <div className="font-semibold">📊 Eisenhower Matrix</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <Quadrant label="Urgent & Important" items={out.matrix.urgentImportant} color="#1565C0" />
                <Quadrant label="Important / Not Urgent" items={out.matrix.notUrgentImportant} color="#1976D2" />
                <Quadrant label="Urgent / Not Important" items={out.matrix.urgentNotImportant} color="#42A5F5" />
                <Quadrant label="Neither" items={out.matrix.neither} color="#90CAF9" />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm opacity-60">Plan will appear here.</p>
        )}
      </Card>
    </div>
  );
}

function Quadrant({ label, items, color }: { label: string; items: Task[]; color: string }) {
  return (
    <div className="rounded-lg p-2 text-white" style={{ background: color }}>
      <div className="text-[11px] font-bold uppercase opacity-90">{label}</div>
      <ul className="mt-1 space-y-0.5">
        {items.length ? items.map((t, i) => <li key={i}>• {t.name}</li>) : <li className="opacity-70">—</li>}
      </ul>
    </div>
  );
}

/* ============================ RESEARCH ============================ */

const RATE_WINDOW = 60_000;
const RATE_MAX = 5;

function ResearchSection({ cardBg }: { dark: boolean; cardBg: string }) {
  const [mode, setMode] = useState<"summarize" | "explain">("summarize");
  const [text, setText] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<Awaited<ReturnType<typeof researchAnalyze>> | null>(null);
  const callsRef = useRef<number[]>([]);

  const handle = async () => {
    const input = mode === "summarize" ? text : topic;
    if (!input.trim()) { toast.warning("⚠️ Please provide input"); return; }
    const now = Date.now();
    callsRef.current = callsRef.current.filter((t) => now - t < RATE_WINDOW);
    if (callsRef.current.length >= RATE_MAX) {
      toast.warning("⚠️ Rate limit: 5 queries / minute. Please wait.");
      return;
    }
    callsRef.current.push(now);
    setLoading(true);
    try {
      const r = await runTool("research", () => researchAnalyze(input, mode));
      setOut(r);
      toast.success("✅ Analysis complete! Dashboard updated");
    } catch {
      toast.error("❌ Failed after retries");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card cardBg={cardBg}>
        <h2 className="mb-4 text-lg font-bold">🔬 AI Research Assistant</h2>
        <div className="mb-3 inline-flex rounded-xl bg-blue-100 p-1 dark:bg-slate-700">
          {([
            ["summarize", "📄 Summarize Text"],
            ["explain", "🔍 Explain Topic"],
          ] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setMode(k)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                mode === k ? "bg-white text-[#1565C0] shadow" : "text-slate-600 dark:text-slate-200"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        {mode === "summarize" ? (
          <textarea rows={8} className={inputCls} placeholder="Paste article or report..." value={text} onChange={(e) => setText(e.target.value)} />
        ) : (
          <input className={inputCls} placeholder="Enter a topic..." value={topic} onChange={(e) => setTopic(e.target.value)} />
        )}
        <div className="mt-3">
          <PrimaryButton onClick={handle} loading={loading}>🔬 Analyze & Summarize</PrimaryButton>
        </div>
        <SectionDisclaimer />
      </Card>

      <Card cardBg={cardBg}>
        <h3 className="mb-3 text-lg font-bold">📌 Analysis</h3>
        {out ? (
          <div className="space-y-3 text-sm">
            <div><div className="font-semibold">📌 Executive Summary</div><p>{out.summary}</p></div>
            <div><div className="font-semibold">💡 Key Insights</div><ul className="ml-4 list-disc">{out.insights.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
            <div><div className="font-semibold">🎯 Recommendations</div><ul className="ml-4 list-disc">{out.recommendations.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
            <div><div className="font-semibold">⚠️ Limitations</div><p>{out.limitations}</p></div>
          </div>
        ) : (
          <p className="text-sm opacity-60">Analysis will appear here.</p>
        )}
      </Card>
    </div>
  );
}

/* ============================ CHAT ============================ */

const SUGGESTIONS = ["📧 Draft email", "📝 Summarize this", "✅ Plan my day", "🔬 Explain AI"];

function ChatSection({ cardBg }: { dark: boolean; cardBg: string }) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "👋 Hi! I'm your Blue Horizon AI assistant. How can I help today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (overrideText?: string) => {
    const content = (overrideText ?? input).trim();
    if (!content) { toast.warning("⚠️ Please enter a message"); return; }
    if (content.length > 500) { toast.warning("⚠️ Max 500 characters"); return; }
    const newMsgs = [...messages, { role: "user" as const, content }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const history = newMsgs.slice(-6);
      const reply = await runTool("chat", () => chatReply(history));
      setMessages([...newMsgs, { role: "assistant", content: reply }]);
    } catch {
      toast.error("❌ Failed after retries");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card cardBg={cardBg} className="mx-auto max-w-3xl">
      <h2 className="mb-3 text-lg font-bold">💬 AI Chatbot</h2>
      <div className="h-[420px] space-y-3 overflow-y-auto rounded-xl bg-blue-50/60 p-3 dark:bg-slate-900/40">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow ${
                m.role === "user"
                  ? "bg-slate-200 text-slate-900"
                  : "text-white"
              }`}
              style={m.role === "assistant" ? { background: "linear-gradient(135deg, #1565C0, #42A5F5)" } : {}}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-blue-200 px-4 py-2 text-sm text-blue-900">
              <Loader2 className="inline h-3 w-3 animate-spin" /> thinking…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="rounded-full border border-[#42A5F5] px-3 py-1 text-xs text-[#1565C0] hover:bg-[#42A5F5] hover:text-white"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className={inputCls}
          placeholder="Type a message... (max 500)"
          value={input}
          maxLength={500}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
        />
        <PrimaryButton onClick={() => send()} loading={loading}>
          <Send className="h-4 w-4" />
        </PrimaryButton>
      </div>
      <SectionDisclaimer />
    </Card>
  );
}
