import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/" });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/" });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg.includes("already registered") ? "Email already registered. Try logging in." : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message || "Google sign-in failed");
        setLoading(false);
      }
      // If redirected or success, page navigates away.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ background: "linear-gradient(135deg, #0D47A1, #1976D2, #42A5F5)" }}
    >
      {/* subtle raindrops */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 30 }).map((_, i) => {
          const left = Math.random() * 100;
          const delay = Math.random() * 3;
          const duration = 2.5 + Math.random() * 2.5;
          const size = 3 + Math.random() * 6;
          return (
            <span
              key={i}
              className="absolute rounded-full auth-raindrop"
              style={{
                left: `${left}%`,
                top: "-20px",
                width: size,
                height: size * 1.6,
                background: "rgba(255,255,255,0.25)",
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
              }}
            />
          );
        })}
      </div>

      <div
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/30 bg-white/15 p-8 shadow-2xl"
        style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
      >
        <div className="mb-6 text-center">
          <div className="text-4xl">🌧️</div>
          <h1 className="mt-2 text-2xl font-bold text-white">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#BBDEFB" }}>
            Blue Horizon Edition
          </p>
        </div>

        <div className="mb-5 flex rounded-full bg-white/10 p-1">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
                mode === m ? "bg-white text-[#1565C0] shadow" : "text-white/80 hover:text-white"
              }`}
            >
              {m === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-white placeholder-white/60 outline-none focus:bg-white/30"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@work.com"
            className="w-full rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-white placeholder-white/60 outline-none focus:bg-white/30"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            className="w-full rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-white placeholder-white/60 outline-none focus:bg-white/30"
          />

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white shadow-lg transition hover:scale-[1.01] disabled:opacity-70"
            style={{ background: "linear-gradient(135deg, #00ACC1, #00838F)" }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "🌊 Log in" : "🚀 Create account"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-white/70">
          <div className="h-px flex-1 bg-white/30" />
          OR
          <div className="h-px flex-1 bg-white/30" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-white py-3 font-semibold text-gray-800 shadow transition hover:scale-[1.01] disabled:opacity-70"
        >
          <svg className="h-5 w-5" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-8.7 19.5-19.5 0-1.2-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.7l-6-5.1c-1.9 1.3-4.3 2.1-7 2.1-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39 16.3 43.5 24 43.5z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.3l6 5.1c-.4.4 6.5-4.7 6.5-14.4 0-1.2-.1-2.3-.2-3.5z"/>
          </svg>
          Continue with Google
        </button>

        <p className="mt-4 text-center text-xs text-white/70">
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="font-semibold text-white underline"
          >
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
      </div>

      <style>{`
        @keyframes auth-raindrop-fall {
          0%   { transform: translateY(0); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translateY(110vh); opacity: 0.2; }
        }
        .auth-raindrop {
          animation-name: auth-raindrop-fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  );
}
