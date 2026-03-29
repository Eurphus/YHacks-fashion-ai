"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

// ── Root Page ──────────────────────────────────────────────────────────────────
//
// Acts as a simple auth gate. Presents a single "Log In as Peter" button.
// On click it calls the UserContext login() helper (which sets the
// localStorage flag) then pushes the user to /studio.
//
// If the user is already authenticated (e.g. after a page refresh) they are
// immediately redirected to /studio without seeing this screen.
// ──────────────────────────────────────────────────────────────────────────────

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, login, user } = useUser();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/studio");
    }
  }, [isAuthenticated, router]);

  const handleLogin = () => {
    setIsLoggingIn(true);
    login();
    router.push("/studio");
  };

  // Show a spinner while we redirect an already-authenticated user
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500/40 border-t-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] relative flex flex-col items-center justify-center overflow-hidden px-6">
      {/* ── Ambient background glow blobs ─────────────────────────────────── */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, #a855f7 0%, #7c3aed 50%, transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[100px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, #ec4899 0%, #db2777 50%, transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-10 blur-[80px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, #f97316 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* ── Main card ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full animate-fade-in">
        {/* Logo / wordmark */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {/* Icon mark */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, #a855f7 0%, #ec4899 60%, #f97316 100%)",
            }}
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
              aria-hidden="true"
            >
              {/* Simple hanger icon */}
              <path d="M12 3a2 2 0 0 1 2 2c0 .74-.4 1.38-1 1.73V8l8 6H3l8-6V6.73A2 2 0 0 1 12 3z" />
              <path d="M3 14v1a9 9 0 0 0 18 0v-1" />
            </svg>
          </div>

          {/* Wordmark */}
          <div className="flex flex-col items-start">
            <span
              className="text-2xl font-bold tracking-tight leading-none"
              style={{
                background:
                  "linear-gradient(90deg, #a855f7 0%, #ec4899 55%, #f97316 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              FashionAI
            </span>
            <span className="text-[10px] font-semibold tracking-[0.2em] text-white/30 uppercase mt-0.5">
              Studio
            </span>
          </div>
        </div>

        {/* Tagline */}
        <h1 className="text-3xl font-bold text-white leading-tight mb-3">
          Your wardrobe,{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #a855f7, #ec4899)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            reimagined.
          </span>
        </h1>
        <p className="text-white/45 text-sm leading-relaxed mb-10 max-w-xs">
          Record your outfit, describe the vibe you want, and watch AI transform
          your look in seconds.
        </p>

        {/* Beta invite card */}
        <div
          className="w-full rounded-2xl p-5 mb-6 text-left"
          style={{
            background: "rgba(255, 255, 255, 0.09)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
          role="region"
          aria-label="Beta access"
        >
          <div className="flex items-center gap-3 mb-3">
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
              }}
              aria-hidden="true"
            >
              {user.name.charAt(0)}
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight">
                {user.name}
              </p>
              <p className="text-white/40 text-xs capitalize">
                {user.role.replace("_", " ")} ·{" "}
                <span className="text-purple-400/80 font-mono text-[11px]">
                  {user.id}
                </span>
              </p>
            </div>

            {/* Beta badge */}
            <span className="ml-auto flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/20 uppercase">
              Beta
            </span>
          </div>

          <p className="text-white/35 text-xs leading-relaxed">
            You&apos;ve been granted early access to FashionAI Studio. This
            session is private and your footage stays on-device.
          </p>
        </div>

        {/* CTA button */}
        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          aria-label="Log in as Peter Macdonald"
          className="
            relative w-full flex items-center justify-center gap-3
            px-6 py-4 rounded-2xl
            text-white font-semibold text-base tracking-wide
            transition-all duration-200
            active:scale-[0.98]
            disabled:opacity-60 disabled:cursor-not-allowed
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]
            overflow-hidden
          "
          style={{
            background:
              "linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #ec4899 100%)",
            boxShadow:
              "0 8px 32px rgba(168, 85, 247, 0.45), 0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {/* Shimmer overlay */}
          <span
            className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)",
            }}
            aria-hidden="true"
          />

          {isLoggingIn ? (
            <>
              <span
                className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                aria-hidden="true"
              />
              <span>Entering Studio…</span>
            </>
          ) : (
            <>
              {/* Key icon */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 flex-shrink-0"
                aria-hidden="true"
              >
                <circle cx="7.5" cy="15.5" r="4.5" />
                <path d="m21 2-9.6 9.6" />
                <path d="m15.5 7.5 3 3L22 7l-3-3" />
              </svg>
              <span>Log In as Peter</span>
            </>
          )}
        </button>

        {/* Fine print */}
        <p className="mt-6 text-white/20 text-xs text-center leading-relaxed">
          Private beta · No account required · Data stays on-device
        </p>
      </div>

      {/* ── Floating feature pills ─────────────────────────────────────────── */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 px-4 pointer-events-none">
        {[
          { icon: "🎥", label: "Record outfit" },
          { icon: "✨", label: "Describe style" },
          { icon: "🪄", label: "AI transforms it" },
        ].map(({ icon, label }) => (
          <div
            key={label}
            className="glass flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          >
            <span className="text-sm" aria-hidden="true">
              {icon}
            </span>
            <span className="text-white/50 text-xs font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
