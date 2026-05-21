import { useEffect, useState } from "react";

const RAIN_COUNT = 60;

export function Splash({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false);

  const handleOk = () => {
    setFading(true);
    setTimeout(() => {
      localStorage.setItem("splashSeen", "true");
      onDone();
    }, 500);
  };

  const handleExit = () => {
    setFading(true);
    setTimeout(() => {
      window.location.href = "/auth";
    }, 400);
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{ background: "linear-gradient(135deg, #0D47A1, #1976D2, #42A5F5)" }}
    >
      {/* Rain drops */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: RAIN_COUNT }).map((_, i) => {
          const left = Math.random() * 100;
          const delay = Math.random() * 3;
          const duration = 2 + Math.random() * 3;
          const size = 4 + Math.random() * 8;
          const color =
            Math.random() > 0.5 ? "rgba(255,255,255,0.3)" : "rgba(144,202,249,0.4)";
          return (
            <span
              key={i}
              className="absolute rounded-full raindrop"
              style={{
                left: `${left}%`,
                top: `-20px`,
                width: size,
                height: size * 1.6,
                background: color,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
              }}
            />
          );
        })}
      </div>

      {/* Center card */}
      <div className="relative z-10 flex h-full items-center justify-center px-6">
        <div
          className="max-w-xl rounded-3xl border border-white/30 bg-white/15 p-10 text-center shadow-2xl"
          style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
        >
          <h1
            className="text-3xl font-bold tracking-widest text-white sm:text-4xl"
            style={{ textShadow: "0 4px 14px rgba(0,0,0,0.4)", letterSpacing: "0.1em" }}
          >
            AI WORKPLACE PRODUCTIVITY ASSISTANT
          </h1>
          <p className="mt-3 text-sm sm:text-base" style={{ color: "#BBDEFB" }}>
            Blue Horizon Edition — Rain-Powered Analytics
          </p>
          <div className="mt-6 flex justify-center gap-4 text-3xl">
            {["🤖", "⚡", "📧", "📊"].map((emoji, i) => (
              <span
                key={emoji}
                className="splash-bounce inline-block"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                {emoji}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleOk}
              className="splash-pulse cursor-pointer rounded-full px-8 py-4 font-bold text-white transition-transform hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #00ACC1, #00838F)",
                boxShadow: "0 0 0 0 rgba(0,172,193,0.7)",
              }}
            >
              🌊 CLICK OK TO PROCEED →
            </button>
            <button
              onClick={handleExit}
              className="cursor-pointer rounded-full border-2 border-white/50 px-6 py-3 font-semibold text-white/90 transition hover:bg-white/10"
            >
              ✕ EXIT
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes raindrop-fall {
          0%   { transform: translateY(0); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translateY(110vh); opacity: 0.2; }
        }
        .raindrop { animation-name: raindrop-fall; animation-timing-function: linear; animation-iteration-count: infinite; }

        @keyframes splash-bounce {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-14px); }
        }
        .splash-bounce { animation: splash-bounce 1.4s ease-in-out infinite; }

        @keyframes splash-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(0,172,193,0.6); }
          70%  { box-shadow: 0 0 0 22px rgba(0,172,193,0); }
          100% { box-shadow: 0 0 0 0 rgba(0,172,193,0); }
        }
        .splash-pulse { animation: splash-pulse 1.8s ease-out infinite; }
      `}</style>
    </div>
  );
}
