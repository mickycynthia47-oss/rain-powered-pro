import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart, RadialBarChart, RadialBar, Legend,
} from "recharts";
import {
  Sun, Moon, Mail, ClipboardList, CheckSquare, Microscope, MessageSquare,
  LayoutDashboard, Copy, Download, RotateCcw, Plus, Trash2, Send, Loader2,
  LogOut, Mic, MicOff, Trophy, Settings as SettingsIcon, Volume2, VolumeX,
  ThumbsUp, ThumbsDown, Upload, Bell,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Splash } from "@/components/splash";
import {
  loadAnalytics, trackEvent, resetAnalytics, countsByTool, productivityScore,
  weeklyActivity, responseTimes, exportCsv,
  type AnalyticsState, type ToolName,
} from "@/lib/analytics";
import {
  generateEmail, summarizeMeeting, planTasks, researchAnalyze, chatReply,
  withRetry, type Task,
} from "@/lib/mock-ai";
import { getSpeechRecognition, startAmbient, stopAmbient, setAmbientVolume } from "@/lib/voice";

export const Route = createFileRoute("/")({ component: Page });

/* ============================ ROOT ============================ */

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

/* ============================ SHELL ============================ */

type Tab =
  | "dashboard" | "email" | "meetings" | "tasks" | "research"
  | "chat" | "voice" | "achievements" | "settings";

const NAV: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "dashboard", label: "🏠 Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { id: "email", label: "📧 Email Generator", icon: <Mail className="h-5 w-5" /> },
  { id: "meetings", label: "📝 Meeting Summarizer", icon: <ClipboardList className="h-5 w-5" /> },
  { id: "tasks", label: "✅ Task Planner", icon: <CheckSquare className="h-5 w-5" /> },
  { id: "research", label: "🔬 Research Assistant", icon: <Microscope className="h-5 w-5" /> },
  { id: "chat", label: "💬 Chatbot", icon: <MessageSquare className="h-5 w-5" /> },
  { id: "voice", label: "🎙️ Voice Commands", icon: <Mic className="h-5 w-5" /> },
  { id: "achievements", label: "🏆 Achievements", icon: <Trophy className="h-5 w-5" /> },
  { id: "settings", label: "⚙️ Settings", icon: <SettingsIcon className="h-5 w-5" /> },
];

type SettingsState = {
  personality: number; // 0 prof - 100 casual
  verbosity: number;   // 0 concise - 100 verbose
  emoji: "None" | "Some" | "Many";
  language: "English" | "Spanish" | "French";
  soundOn: boolean;
  soundKind: "rain" | "ocean" | "coffee";
  volume: number; // 0-100
  notifications: boolean;
  reminderSound: boolean;
};

const DEFAULT_SETTINGS: SettingsState = {
  personality: 30, verbosity: 50, emoji: "Some", language: "English",
  soundOn: false, soundKind: "rain", volume: 30,
  notifications: false, reminderSound: true,
};

function loadSettings(): SettingsState {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem("bh-settings");
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { return DEFAULT_SETTINGS; }
}

type UserShape = { email?: string | null; user_metadata?: { full_name?: string; avatar_url?: string } };

function App({ user }: { user: UserShape }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [dark, setDark] = useState(true); // dark default
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("bh-theme");
    if (stored) setDark(stored === "dark");
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    localStorage.setItem("bh-theme", dark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    localStorage.setItem("bh-settings", JSON.stringify(settings));
  }, [settings]);

  // Ambient audio control
  useEffect(() => {
    if (settings.soundOn) startAmbient(settings.soundKind, settings.volume / 100);
    else stopAmbient();
    return () => stopAmbient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.soundOn, settings.soundKind]);
  useEffect(() => { setAmbientVolume(settings.volume / 100); }, [settings.volume]);

  const handleSignOut = async () => {
    stopAmbient();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  };

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const avatar = user.user_metadata?.avatar_url;

  const mainBg = dark ? "#0D1B2A" : "#E3F2FD";
  const cardBg = dark ? "#1B263B" : "#FFFFFF";
  const text = dark ? "#E3F2FD" : "#0D47A1";

  const sidebarWidth = sidebarOpen ? 280 : 72;

  return (
    <div className="min-h-screen transition-colors" style={{ backgroundColor: mainBg, color: text }}>
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 flex flex-col text-white shadow-2xl transition-all duration-300"
        style={{
          width: sidebarWidth,
          background: "linear-gradient(180deg, #0D47A1, #1565C0)",
        }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/15 px-4 py-5">
          {sidebarOpen ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-2xl">🌧️</span>
              <h1 className="truncate text-lg font-bold tracking-tight">AI Assistant</h1>
            </div>
          ) : (
            <span className="mx-auto text-2xl">🌧️</span>
          )}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-md p-1 text-white/80 hover:bg-white/15"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? "←" : "→"}
          </button>
        </div>

        {/* User */}
        <div className={`flex items-center gap-3 border-b border-white/10 px-4 py-4 ${sidebarOpen ? "" : "justify-center"}`}>
          {avatar ? (
            <img src={avatar} alt="" className="h-10 w-10 rounded-full ring-2 ring-white/40" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 text-base font-bold ring-2 ring-white/40">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          {sidebarOpen && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">👤 {displayName}</div>
              <div className="truncate text-[11px] text-white/70">{user.email}</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {NAV.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active ? "text-white shadow-md" : "text-white/85 hover:bg-[#42A5F5]/40"
                }`}
                style={active ? { backgroundColor: "#00ACC1" } : {}}
                title={item.label}
              >
                <span className="shrink-0">{item.icon}</span>
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom controls */}
        <div className="space-y-2 border-t border-white/10 p-3">
          <button
            onClick={() => setDark((d) => !d)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/90 hover:bg-white/15"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {sidebarOpen && <span>{dark ? "Light Mode" : "🌙 Dark Mode"}</span>}
          </button>
          <button
            onClick={() => setSettings((s) => ({ ...s, soundOn: !s.soundOn }))}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/90 hover:bg-white/15"
          >
            {settings.soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            {sidebarOpen && <span>{settings.soundOn ? `🔊 ${settings.soundKind}` : "🔇 Sound off"}</span>}
          </button>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/90 hover:bg-white/15"
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="min-h-screen transition-all" style={{ marginLeft: sidebarWidth, padding: 20 }}>
        <div className="mx-auto max-w-7xl">
          {tab === "dashboard" && <Dashboard dark={dark} cardBg={cardBg} />}
          {tab === "email" && <EmailSection dark={dark} cardBg={cardBg} />}
          {tab === "meetings" && <MeetingSection dark={dark} cardBg={cardBg} />}
          {tab === "tasks" && <TaskSection dark={dark} cardBg={cardBg} />}
          {tab === "research" && <ResearchSection dark={dark} cardBg={cardBg} />}
          {tab === "chat" && <ChatSection dark={dark} cardBg={cardBg} />}
          {tab === "voice" && <VoiceSection cardBg={cardBg} onNav={setTab} />}
          {tab === "achievements" && <AchievementsSection cardBg={cardBg} />}
          {tab === "settings" && <SettingsSection cardBg={cardBg} settings={settings} setSettings={setSettings} />}
        </div>

        <footer className="mx-auto mt-10 max-w-7xl border-t pt-6 text-center text-xs opacity-70" style={{ borderColor: dark ? "#1B263B" : "#BBDEFB" }}>
          🛡️ AI generates suggestions. Please verify important information.
          <div className="mt-1 opacity-80">Blue Horizon Edition v2.0 | 🌧️ Rain-Powered Analytics</div>
        </footer>
      </main>
    </div>
  );
}

/* ============================ COMMON ============================ */

function Card({ children, cardBg, className = "" }: { children: ReactNode; cardBg: string; className?: string }) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-md ${className}`}
      style={{ backgroundColor: cardBg, borderColor: "#1565C0" }}
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
  children, loading, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70 ${props.className || ""}`}
      style={{ background: "linear-gradient(135deg, #1565C0, #42A5F5)" }}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {loading ? "Processing... ⏳" : children}
    </button>
  );
}

const inputCls =
  "w-full rounded-xl border border-blue-200 bg-white/90 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1565C0] focus:outline-none focus:ring-2 focus:ring-[#42A5F5]/40 dark:bg-slate-800/80 dark:text-slate-50 dark:border-slate-600";

function MicButton({ onText, disabled }: { onText: (t: string) => void; disabled?: boolean }) {
  const [listening, setListening] = useState(false);
  const srRef = useRef<ReturnType<typeof getSpeechRecognition>>(null);

  const toggle = () => {
    if (listening) { srRef.current?.stop(); setListening(false); return; }
    const sr = getSpeechRecognition();
    if (!sr) { toast.warning("⚠️ Voice input not supported in this browser"); return; }
    srRef.current = sr;
    sr.onresult = (e) => {
      const r = e.results[e.results.length - 1];
      const text = (r as unknown as { 0: { transcript: string } })[0].transcript;
      onText(text);
      // bump achievements
      const cur = Number(localStorage.getItem("bh-voiceCount") || 0);
      localStorage.setItem("bh-voiceCount", String(cur + 1));
    };
    sr.onend = () => setListening(false);
    sr.onerror = () => setListening(false);
    sr.start();
    setListening(true);
    toast.info("🎙️ Listening...");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
        listening ? "border-red-400 bg-red-100 text-red-600 animate-pulse" : "border-[#42A5F5] text-[#1565C0] hover:bg-[#42A5F5] hover:text-white"
      }`}
      title="Voice input"
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}

function FeedbackBar({ tool }: { tool: ToolName }) {
  const [v, setV] = useState<"up" | "down" | null>(null);
  const click = (val: "up" | "down") => {
    setV(val);
    const k = "bh-feedback";
    const cur = JSON.parse(localStorage.getItem(k) || "[]");
    cur.push({ tool, value: val, ts: Date.now() });
    localStorage.setItem(k, JSON.stringify(cur));
    toast.success(val === "up" ? "👍 Thanks for the feedback!" : "👎 We'll keep improving");
  };
  return (
    <div className="mt-3 flex items-center gap-2 text-xs">
      <span className="opacity-70">Was this helpful?</span>
      <button
        onClick={() => click("up")}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${v === "up" ? "border-green-500 bg-green-50 text-green-700" : "border-blue-200 hover:bg-blue-50"}`}
      ><ThumbsUp className="h-3 w-3" /> 👍</button>
      <button
        onClick={() => click("down")}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${v === "down" ? "border-red-500 bg-red-50 text-red-700" : "border-blue-200 hover:bg-blue-50"}`}
      ><ThumbsDown className="h-3 w-3" /> 👎</button>
    </div>
  );
}

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
        <h2 className="text-2xl font-bold">🏠 Dashboard</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { exportCsv(state); toast.success("✅ Exported CSV"); }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1565C0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0D47A1]"
          ><Download className="h-4 w-4" /> 📥 Export CSV</button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          ><RotateCcw className="h-4 w-4" /> 🔄 Reset</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl p-4 text-white shadow-md"
            style={{ background: "linear-gradient(135deg, #1565C0, #42A5F5)" }}>
            <div className="text-xs opacity-90">{m.label}</div>
            <div className="mt-1 text-2xl font-bold">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card cardBg={cardBg}>
          <h3 className="mb-3 text-sm font-bold">Usage Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieRender} innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value" nameKey="name">
                  {pieRender.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card cardBg={cardBg}>
          <h3 className="mb-3 text-sm font-bold">Productivity Score</h3>
          <div className="relative h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="70%" outerRadius="100%"
                data={[{ name: "Score", value: score, fill: "url(#gaugeGrad)" }]}
                startAngle={180} endAngle={0}>
                <defs>
                  <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00ACC1" />
                    <stop offset="100%" stopColor="#0D47A1" />
                  </linearGradient>
                </defs>
                <RadialBar background={{ fill: dark ? "#0D1B2A" : "#E3F2FD" }} dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-10 text-3xl font-bold" style={{ color: "#42A5F5" }}>
              {score}<span className="ml-1 text-base font-medium">/100</span>
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
                <Area type="monotone" dataKey="ms" stroke="#00ACC1" strokeWidth={2} fill="url(#cyanFill)"
                  dot={{ stroke: "#00ACC1", strokeWidth: 2, fill: "#fff", r: 3 }} />
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

async function runTool<T>(tool: ToolName, fn: () => Promise<T>): Promise<T> {
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
    if (!context.trim()) { toast.warning("⚠️ Please enter context"); return; }
    setLoading(true);
    try {
      const r = await runTool("email", () => generateEmail({ recipient, tone, context }));
      setOut(r);
      toast.success("✅ Email generated!");
    } catch { toast.error("❌ Failed after retries"); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card cardBg={cardBg}>
        <h2 className="mb-4 text-xl font-bold">📧 Smart Email Generator</h2>
        <div className="space-y-3">
          <label className="block text-sm font-medium">Recipient</label>
          <select className={inputCls} value={recipient} onChange={(e) => setRecipient(e.target.value)}>
            {["👔 Manager", "🤝 Client", "👥 Team", "📊 Stakeholder"].map((o) => <option key={o}>{o}</option>)}
          </select>
          <label className="block text-sm font-medium">Tone</label>
          <select className={inputCls} value={tone} onChange={(e) => setTone(e.target.value)}>
            {["📝 Formal", "😊 Informal", "🎯 Persuasive", "🔥 Urgent"].map((o) => <option key={o} value={o.split(" ")[1]}>{o}</option>)}
          </select>
          <label className="block text-sm font-medium">What's this about?</label>
          <div className="flex gap-2">
            <textarea rows={5} className={inputCls} placeholder="Bullet points or context..."
              value={context} onChange={(e) => setContext(e.target.value)} />
            <MicButton onText={(t) => setContext((c) => (c ? c + " " : "") + t)} />
          </div>
          <PrimaryButton onClick={handle} loading={loading}>✨ Generate Email</PrimaryButton>
        </div>
        <SectionDisclaimer />
      </Card>

      <Card cardBg={cardBg}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">📨 Output</h3>
          {out && (
            <button
              onClick={() => { navigator.clipboard.writeText(`Subject: ${out.subject}\n\n${out.body}`); toast.success("✅ Copied"); }}
              className="inline-flex items-center gap-1 rounded-lg border border-[#1565C0] px-3 py-1 text-xs font-semibold text-[#1565C0] hover:bg-[#1565C0] hover:text-white"
            ><Copy className="h-3 w-3" /> Copy</button>
          )}
        </div>
        {out ? (
          <div className="space-y-3 text-sm">
            <div><span className="font-bold">Subject:</span> {out.subject}</div>
            <pre className="whitespace-pre-wrap rounded-lg bg-blue-50 p-3 font-sans text-slate-800 dark:bg-slate-800 dark:text-slate-100">{out.body}</pre>
            <FeedbackBar tool="email" />
          </div>
        ) : <p className="text-sm opacity-60">Generated email will appear here.</p>}
      </Card>
    </div>
  );
}

/* ============================ MEETINGS ============================ */

function MeetingSection({ cardBg }: { dark: boolean; cardBg: string }) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<Awaited<ReturnType<typeof summarizeMeeting>> | null>(null);
  const [drag, setDrag] = useState(false);
  const MAX = 5000;

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 2_000_000) { toast.warning("⚠️ File too large (max 2MB)"); return; }
    const text = await file.text();
    setNotes(text.slice(0, MAX));
    toast.success(`✅ Loaded ${file.name}`);
  };

  const handle = async () => {
    if (notes.trim().length < 20) { toast.warning("⚠️ Need at least 20 characters"); return; }
    setLoading(true);
    try {
      const r = await runTool("meetings", () => summarizeMeeting(notes));
      setOut(r);
      toast.success("✅ Meeting summarized!");
    } catch { toast.error("❌ Failed after retries"); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card cardBg={cardBg}>
        <h2 className="mb-4 text-xl font-bold">📝 Meeting Notes Summarizer</h2>
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          className={`mb-3 flex items-center justify-between gap-3 rounded-xl border-2 border-dashed px-3 py-2 text-xs transition ${drag ? "border-[#1565C0] bg-blue-50" : "border-blue-300"}`}
        >
          <span>📎 Drag & drop a .txt file, or</span>
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#1565C0] px-3 py-1.5 text-white">
            <Upload className="h-3 w-3" /> Choose file
            <input type="file" accept=".txt,.md" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </label>
        </div>
        <div className="flex gap-2">
          <textarea rows={9} className={inputCls} placeholder="Paste your meeting notes..."
            value={notes} onChange={(e) => setNotes(e.target.value.slice(0, MAX))} />
          <MicButton onText={(t) => setNotes((c) => (c ? c + " " : "") + t)} />
        </div>
        <div className="mt-1 text-right text-xs opacity-60">{notes.length} / {MAX}</div>
        <PrimaryButton onClick={handle} loading={loading} className="mt-3">🔄 Summarize Meeting</PrimaryButton>
        <SectionDisclaimer />
      </Card>

      <Card cardBg={cardBg}>
        <h3 className="mb-3 text-lg font-bold">📋 Summary</h3>
        {out ? (
          <div className="space-y-4 text-sm">
            <div><div className="font-semibold">🔑 Key Points</div><ul className="ml-4 list-disc">{out.keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul></div>
            <div><div className="font-semibold">✅ Decisions Made</div><ul className="ml-4 list-disc">{out.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul></div>
            <div><div className="font-semibold">📋 Action Items</div><ul className="ml-4 list-disc">{out.actions.map((a, i) => <li key={i}><b>{a.owner}:</b> {a.task}</li>)}</ul></div>
            <div><div className="font-semibold">⏰ Deadlines</div><ul className="ml-4 list-disc">{out.deadlines.map((d, i) => <li key={i}>{d}</li>)}</ul></div>
            <FeedbackBar tool="meetings" />
          </div>
        ) : <p className="text-sm opacity-60">Summary will appear here.</p>}
      </Card>
    </div>
  );
}

/* ============================ TASKS ============================ */

function TaskSection({ cardBg }: { dark: boolean; cardBg: string }) {
  const [tasks, setTasks] = useState<Task[]>([{ name: "", priority: "Medium", deadline: "" }]);
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<Awaited<ReturnType<typeof planTasks>> | null>(null);

  const addTask = () => {
    if (tasks.length >= 10) { toast.warning("⚠️ Max 10 tasks"); return; }
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
      toast.success("✅ Plan ready!");
    } catch { toast.error("❌ Failed after retries"); }
    finally { setLoading(false); }
  };

  const setReminder = (taskName: string) => {
    if (!("Notification" in window)) { toast.warning("⚠️ Notifications unsupported"); return; }
    if (Notification.permission !== "granted") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") fireReminder(taskName);
      });
    } else fireReminder(taskName);
  };
  const fireReminder = (taskName: string) => {
    setTimeout(() => { new Notification("🔔 Task reminder", { body: taskName }); }, 5000);
    toast.success("🔔 Reminder set (5s demo)");
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card cardBg={cardBg}>
        <h2 className="mb-4 text-xl font-bold">✅ AI Task Planner</h2>
        <div className="space-y-3">
          {tasks.map((t, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <input className={inputCls + " col-span-5"} placeholder="Task name"
                value={t.name} onChange={(e) => updateTask(i, { name: e.target.value })} />
              <select className={inputCls + " col-span-3"} value={t.priority}
                onChange={(e) => updateTask(i, { priority: e.target.value as Task["priority"] })}>
                <option value="High">🔴 High</option>
                <option value="Medium">🟡 Medium</option>
                <option value="Low">🟢 Low</option>
              </select>
              <input type="date" className={inputCls + " col-span-3"}
                value={t.deadline} onChange={(e) => updateTask(i, { deadline: e.target.value })} />
              <button onClick={() => removeTask(i)}
                className="col-span-1 rounded-xl border border-red-300 text-red-500 hover:bg-red-50">
                <Trash2 className="mx-auto h-4 w-4" />
              </button>
            </div>
          ))}
          <button onClick={addTask}
            className="inline-flex items-center gap-1 rounded-xl border border-[#1565C0] px-3 py-1.5 text-sm text-[#1565C0] hover:bg-[#1565C0] hover:text-white">
            <Plus className="h-4 w-4" /> Add task
          </button>
          <div><PrimaryButton onClick={handle} loading={loading}>🎯 Generate Smart Plan</PrimaryButton></div>
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
                {out.top3.map((t, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span>{t.name} <span className="opacity-60">({t.priority})</span></span>
                    <button onClick={() => setReminder(t.name)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#1565C0] px-2 py-0.5 text-[10px] text-[#1565C0] hover:bg-[#1565C0] hover:text-white">
                      <Bell className="h-3 w-3" /> Remind
                    </button>
                  </li>
                ))}
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
            <FeedbackBar tool="tasks" />
          </div>
        ) : <p className="text-sm opacity-60">Plan will appear here.</p>}
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

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 2_000_000) { toast.warning("⚠️ File too large"); return; }
    const t = await file.text();
    setText(t);
    toast.success(`✅ Loaded ${file.name}`);
  };

  const handle = async () => {
    const input = mode === "summarize" ? text : topic;
    if (!input.trim()) { toast.warning("⚠️ Please provide input"); return; }
    const now = Date.now();
    callsRef.current = callsRef.current.filter((t) => now - t < RATE_WINDOW);
    if (callsRef.current.length >= RATE_MAX) { toast.warning("⚠️ Rate limit: 5 / minute"); return; }
    callsRef.current.push(now);
    setLoading(true);
    try {
      const r = await runTool("research", () => researchAnalyze(input, mode));
      setOut(r);
      toast.success("✅ Analysis complete!");
    } catch { toast.error("❌ Failed after retries"); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card cardBg={cardBg}>
        <h2 className="mb-4 text-xl font-bold">🔬 AI Research Assistant</h2>
        <div className="mb-3 inline-flex rounded-xl bg-blue-100 p-1 dark:bg-slate-700">
          {([["summarize", "📄 Summarize Text"], ["explain", "🔍 Explain Topic"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                mode === k ? "bg-white text-[#1565C0] shadow" : "text-slate-600 dark:text-slate-200"
              }`}>{l}</button>
          ))}
        </div>
        {mode === "summarize" ? (
          <>
            <div className="mb-2">
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#1565C0] px-3 py-1.5 text-xs text-[#1565C0] hover:bg-[#1565C0] hover:text-white">
                <Upload className="h-3 w-3" /> 📎 Upload .txt
                <input type="file" accept=".txt,.md" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </label>
            </div>
            <div className="flex gap-2">
              <textarea rows={8} className={inputCls} placeholder="Paste article or report..."
                value={text} onChange={(e) => setText(e.target.value)} />
              <MicButton onText={(t) => setText((c) => (c ? c + " " : "") + t)} />
            </div>
          </>
        ) : (
          <div className="flex gap-2">
            <input className={inputCls} placeholder="Enter a topic..." value={topic} onChange={(e) => setTopic(e.target.value)} />
            <MicButton onText={(t) => setTopic(t)} />
          </div>
        )}
        <div className="mt-3"><PrimaryButton onClick={handle} loading={loading}>🔬 Analyze & Summarize</PrimaryButton></div>
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
            <FeedbackBar tool="research" />
          </div>
        ) : <p className="text-sm opacity-60">Analysis will appear here.</p>}
      </Card>
    </div>
  );
}

/* ============================ CHAT ============================ */

const SUGGESTIONS = ["📧 Draft email", "📝 Summarize meeting", "✅ Plan my day", "🔬 Explain AI"];

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
    } catch { toast.error("❌ Failed after retries"); }
    finally { setLoading(false); }
  };

  return (
    <Card cardBg={cardBg} className="mx-auto max-w-3xl">
      <h2 className="mb-3 text-xl font-bold">💬 AI Chatbot</h2>
      <div className="h-[420px] space-y-3 overflow-y-auto rounded-xl bg-blue-50/60 p-3 dark:bg-slate-900/40">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow ${
                m.role === "user" ? "bg-slate-200 text-slate-900" : "text-white"
              }`}
              style={m.role === "assistant" ? { background: "linear-gradient(135deg, #1565C0, #42A5F5)" } : { backgroundColor: "#E0E0E0" }}>
              {m.content}
              {m.role === "assistant" && i > 0 && (
                <div className="mt-1 flex gap-1 opacity-90">
                  <button onClick={() => toast.success("👍 Thanks!")} className="text-xs">👍</button>
                  <button onClick={() => toast.info("👎 Noted")} className="text-xs">👎</button>
                </div>
              )}
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
          <button key={s} onClick={() => send(s)}
            className="rounded-full border border-[#42A5F5] px-3 py-1 text-xs text-[#1565C0] hover:bg-[#42A5F5] hover:text-white">{s}</button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input className={inputCls} placeholder="Type a message... (max 500)"
          value={input} maxLength={500}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
        <MicButton onText={(t) => setInput((c) => (c ? c + " " : "") + t)} />
        <PrimaryButton onClick={() => send()} loading={loading}><Send className="h-4 w-4" /></PrimaryButton>
      </div>
      <SectionDisclaimer />
    </Card>
  );
}

/* ============================ VOICE ============================ */

function VoiceSection({ cardBg, onNav }: { cardBg: string; onNav: (t: Tab) => void }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const srRef = useRef<ReturnType<typeof getSpeechRecognition>>(null);

  useEffect(() => {
    const raw = localStorage.getItem("bh-voiceHistory");
    if (raw) setHistory(JSON.parse(raw));
  }, []);

  const saveHistory = (cmd: string) => {
    const next = [cmd, ...history].slice(0, 20);
    setHistory(next);
    localStorage.setItem("bh-voiceHistory", JSON.stringify(next));
    const cur = Number(localStorage.getItem("bh-voiceCount") || 0);
    localStorage.setItem("bh-voiceCount", String(cur + 1));
  };

  const route = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes("email")) { onNav("email"); toast.info("📧 Email Generator"); }
    else if (t.includes("meeting") || t.includes("summarize")) { onNav("meetings"); toast.info("📝 Meeting Summarizer"); }
    else if (t.includes("task") || t.includes("plan")) { onNav("tasks"); toast.info("✅ Task Planner"); }
    else if (t.includes("research") || t.includes("explain")) { onNav("research"); toast.info("🔬 Research"); }
    else if (t.includes("chat")) { onNav("chat"); toast.info("💬 Chatbot"); }
    else if (t.includes("dashboard")) { onNav("dashboard"); toast.info("🏠 Dashboard"); }
    else toast.info("🤔 Command not recognized");
  };

  const toggle = () => {
    if (listening) { srRef.current?.stop(); setListening(false); return; }
    const sr = getSpeechRecognition();
    if (!sr) { toast.warning("⚠️ Voice not supported"); return; }
    srRef.current = sr;
    sr.continuous = false;
    sr.onresult = (e) => {
      const r = e.results[e.results.length - 1] as unknown as { 0: { transcript: string }; isFinal?: boolean };
      const text = r[0].transcript;
      setTranscript(text);
      if (r.isFinal) { saveHistory(text); route(text); }
    };
    sr.onend = () => setListening(false);
    sr.onerror = () => setListening(false);
    sr.start();
    setListening(true);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">🎙️ Voice Commands</h2>
      <Card cardBg={cardBg}>
        <div className="flex flex-col items-center gap-4 py-6">
          <button onClick={toggle}
            className={`flex h-32 w-32 items-center justify-center rounded-full text-5xl text-white shadow-2xl transition ${listening ? "animate-pulse" : "hover:scale-105"}`}
            style={{ background: listening ? "linear-gradient(135deg, #ef4444, #b91c1c)" : "linear-gradient(135deg, #00ACC1, #00838F)" }}>
            {listening ? <MicOff className="h-14 w-14" /> : <Mic className="h-14 w-14" />}
          </button>
          <div className="text-sm font-semibold">
            {listening ? "🔴 Listening..." : "⚪ Click and speak..."}
          </div>
          <div className="min-h-[2rem] w-full max-w-lg rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-2 text-center text-sm dark:bg-slate-800/60">
            {transcript || <span className="opacity-50">Transcription will appear here</span>}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card cardBg={cardBg}>
          <h3 className="mb-2 font-bold">💡 Try saying</h3>
          <ul className="space-y-1 text-sm">
            <li>• "Generate an email to my manager"</li>
            <li>• "Summarize my meeting notes"</li>
            <li>• "Plan my tasks for today"</li>
            <li>• "Open research"</li>
            <li>• "Open chat"</li>
            <li>• "Show dashboard"</li>
          </ul>
        </Card>
        <Card cardBg={cardBg}>
          <h3 className="mb-2 font-bold">🕒 History</h3>
          {history.length ? (
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {history.map((h, i) => <li key={i} className="truncate">• {h}</li>)}
            </ul>
          ) : <p className="text-sm opacity-60">No commands yet.</p>}
        </Card>
      </div>
      <SectionDisclaimer />
    </div>
  );
}

/* ============================ ACHIEVEMENTS ============================ */

type Badge = { id: string; emoji: string; name: string; goal: number; current: number; xp: number };

function AchievementsSection({ cardBg }: { cardBg: string }) {
  const state = useAnalytics();
  const counts = countsByTool(state);
  const totalEvents = state.events.length;
  const fastResponses = state.events.filter((e) => e.responseTime < 1000).length;
  const uniqueTools = new Set(state.events.map((e) => e.tool)).size;
  const voiceCount = Number(typeof window !== "undefined" ? localStorage.getItem("bh-voiceCount") || 0 : 0);
  const streak = useMemo(() => {
    const days = new Set(state.events.map((e) => new Date(e.timestamp).toDateString()));
    let s = 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (days.has(d.toDateString())) s++;
      else break;
    }
    return s;
  }, [state]);

  const badges: Badge[] = [
    { id: "first", emoji: "🎯", name: "First Blood", goal: 1, current: Math.min(1, totalEvents), xp: 10 },
    { id: "email", emoji: "📧", name: "Email Master", goal: 50, current: counts.email, xp: 100 },
    { id: "speed", emoji: "⚡", name: "Speed Demon", goal: 10, current: fastResponses, xp: 50 },
    { id: "rain", emoji: "🌧️", name: "Rain Maker", goal: 5, current: uniqueTools, xp: 75 },
    { id: "streak", emoji: "🔥", name: "Streak Master", goal: 7, current: streak, xp: 150 },
    { id: "voice", emoji: "🗣️", name: "Voice Commander", goal: 20, current: voiceCount, xp: 80 },
  ];

  const totalXP = badges.reduce((sum, b) => sum + (b.current >= b.goal ? b.xp : 0), 0);

  // confetti on unlock
  const unlockedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const prevRaw = localStorage.getItem("bh-unlocked");
    const prev: string[] = prevRaw ? JSON.parse(prevRaw) : [];
    prev.forEach((id) => unlockedRef.current.add(id));
    const newlyUnlocked = badges.filter((b) => b.current >= b.goal && !unlockedRef.current.has(b.id));
    if (newlyUnlocked.length) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#1565C0", "#42A5F5", "#00ACC1", "#FFFFFF"] });
      newlyUnlocked.forEach((b) => { toast.success(`🏆 Unlocked: ${b.emoji} ${b.name}`); unlockedRef.current.add(b.id); });
      localStorage.setItem("bh-unlocked", JSON.stringify(Array.from(unlockedRef.current)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">🏆 Achievements</h2>
        <div className="rounded-full px-4 py-2 text-sm font-bold text-white shadow"
          style={{ background: "linear-gradient(135deg, #00ACC1, #1565C0)" }}>
          🏆 Total XP: {totalXP}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {badges.map((b) => {
          const pct = Math.min(100, Math.round((b.current / b.goal) * 100));
          const done = b.current >= b.goal;
          return (
            <Card key={b.id} cardBg={cardBg} className={done ? "ring-2 ring-[#00ACC1]" : ""}>
              <div className="flex items-start justify-between">
                <div className={`text-4xl ${done ? "" : "grayscale opacity-60"}`}>{b.emoji}</div>
                <div className="text-xs font-bold text-[#00ACC1]">{done ? "✅ UNLOCKED" : `+${b.xp} XP`}</div>
              </div>
              <h3 className="mt-2 font-bold">{b.name}</h3>
              <div className="mt-2 text-xs opacity-70">{b.current} / {b.goal}</div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-slate-700">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #00ACC1, #42A5F5)" }} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ SETTINGS ============================ */

function SettingsSection({ cardBg, settings, setSettings }: {
  cardBg: string;
  settings: SettingsState;
  setSettings: (s: SettingsState) => void;
}) {
  const update = <K extends keyof SettingsState>(k: K, v: SettingsState[K]) =>
    setSettings({ ...settings, [k]: v });

  const requestNotifs = async () => {
    if (!("Notification" in window)) { toast.warning("⚠️ Notifications unsupported"); return; }
    const p = await Notification.requestPermission();
    update("notifications", p === "granted");
    if (p === "granted") toast.success("✅ Notifications enabled");
    else toast.info("ℹ️ Notifications denied");
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">⚙️ Settings</h2>

      <Card cardBg={cardBg}>
        <h3 className="mb-4 font-bold">🤖 AI Personality</h3>
        <div className="space-y-4 text-sm">
          <div>
            <div className="mb-1 flex justify-between"><span>Professional</span><span>Casual</span></div>
            <input type="range" min="0" max="100" value={settings.personality} className="w-full accent-[#1565C0]"
              onChange={(e) => update("personality", Number(e.target.value))} />
          </div>
          <div>
            <div className="mb-1 flex justify-between"><span>Concise</span><span>Verbose</span></div>
            <input type="range" min="0" max="100" value={settings.verbosity} className="w-full accent-[#1565C0]"
              onChange={(e) => update("verbosity", Number(e.target.value))} />
          </div>
          <div>
            <label className="block font-medium">Emoji usage</label>
            <select className={inputCls} value={settings.emoji} onChange={(e) => update("emoji", e.target.value as SettingsState["emoji"])}>
              <option>None</option><option>Some</option><option>Many</option>
            </select>
          </div>
        </div>
      </Card>

      <Card cardBg={cardBg}>
        <h3 className="mb-4 font-bold">🌍 Language</h3>
        <select className={inputCls} value={settings.language} onChange={(e) => update("language", e.target.value as SettingsState["language"])}>
          <option>English</option><option>Spanish</option><option>French</option>
        </select>
      </Card>

      <Card cardBg={cardBg}>
        <h3 className="mb-4 font-bold">🔊 Ambient Sound</h3>
        <div className="space-y-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={settings.soundOn} onChange={(e) => update("soundOn", e.target.checked)} className="accent-[#1565C0]" />
            Enable ambient sound
          </label>
          <div>
            <label className="block font-medium">Sound</label>
            <select className={inputCls} value={settings.soundKind} onChange={(e) => update("soundKind", e.target.value as SettingsState["soundKind"])}>
              <option value="rain">🌧️ Rain</option>
              <option value="ocean">🌊 Ocean</option>
              <option value="coffee">☕ Coffee Shop</option>
            </select>
          </div>
          <div>
            <div className="mb-1 flex justify-between"><span>Volume</span><span>{settings.volume}%</span></div>
            <input type="range" min="0" max="100" value={settings.volume} className="w-full accent-[#1565C0]"
              onChange={(e) => update("volume", Number(e.target.value))} />
          </div>
        </div>
      </Card>

      <Card cardBg={cardBg}>
        <h3 className="mb-4 font-bold">🔔 Notifications</h3>
        <div className="space-y-3 text-sm">
          <button onClick={requestNotifs}
            className="rounded-xl bg-[#1565C0] px-4 py-2 text-white hover:bg-[#0D47A1]">
            {settings.notifications ? "✅ Browser notifications enabled" : "🔔 Enable browser notifications"}
          </button>
          <label className="block">
            <input type="checkbox" checked={settings.reminderSound} onChange={(e) => update("reminderSound", e.target.checked)} className="mr-2 accent-[#1565C0]" />
            Reminder sound
          </label>
        </div>
      </Card>

      <div className="text-xs opacity-70">💾 Settings auto-save to your browser.</div>
    </div>
  );
}
