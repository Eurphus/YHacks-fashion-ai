"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useStudioStore } from "@/lib/studioStore";
import RecordingView from "@/components/RecordingView";
import ReviewView from "@/components/ReviewView";
import clsx from "clsx";

// ── StudioPage ─────────────────────────────────────────────────────────────────
//
// Top-level route for the recording / generation experience.
//
// Phase routing:
//   "idle"       → RecordingView (camera preview + record button)
//   "recording"  → RecordingView (live feed + countdown + stop button)
//   "review"     → ReviewView   (looping blob + command bar)
//   "processing" → ReviewView   (looping blob + loading bar + glow)
//   "reveal"     → ReviewView   (AI video hot-swapped + play controls)
//
// Auth gate: if the user is not authenticated (localStorage flag not set),
// redirect back to the root login page.
// ──────────────────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useUser();
  const phase = useStudioStore((s) => s.phase);
  const reset = useStudioStore((s) => s.reset);

  // ── Auth gate ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  // ── Reset store when the page first mounts so a fresh session starts ─────
  // (handles the case where the user navigates back after a completed session)
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Don't render until we know the auth state is valid
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500/40 border-t-purple-400 animate-spin" />
      </div>
    );
  }

  // ── Derived flags ────────────────────────────────────────────────────────
  const inCameraPhase = phase === "idle" || phase === "recording";
  const inReviewPhase =
    phase === "review" || phase === "processing" || phase === "reveal";

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">

      {/* ── Top navigation bar ─────────────────────────────────────────── */}
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-5 border-b border-white/5">
        {/* Wordmark */}
        <div className="flex items-center gap-2">
          <span
            className="text-lg font-bold tracking-tight"
            style={{
              background:
                "linear-gradient(90deg, #a855f7 0%, #ec4899 60%, #f97316 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            FashionAI
          </span>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/20 uppercase">
            Beta
          </span>
        </div>

        {/* Phase indicator */}
        <div className="hidden sm:flex items-center gap-2">
          {(["idle", "recording", "review", "processing", "reveal"] as const).map(
            (p, i) => {
              const labels: Record<typeof p, string> = {
                idle: "Camera",
                recording: "Recording",
                review: "Review",
                processing: "Generating",
                reveal: "Complete",
              };
              const isActive = phase === p;
              const isDone =
                (["idle", "recording", "review", "processing", "reveal"] as const).indexOf(phase) > i;

              return (
                <div key={p} className="flex items-center gap-2">
                  {i > 0 && (
                    <div
                      className={clsx(
                        "w-4 h-px transition-all duration-500",
                        isDone ? "bg-purple-400/60" : "bg-white/10"
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={clsx(
                      "text-xs font-medium transition-all duration-300",
                      isActive && "text-white",
                      isDone && "text-purple-400/70",
                      !isActive && !isDone && "text-white/25"
                    )}
                  >
                    {labels[p]}
                  </span>
                </div>
              );
            }
          )}
        </div>

        {/* User pill */}
        <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-full">
          {/* Avatar placeholder */}
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
            }}
            aria-hidden="true"
          >
            {user.name.charAt(0)}
          </span>
          <span className="text-white/70 text-xs font-medium hidden sm:block">
            {user.name}
          </span>
        </div>
      </header>

      {/* ── Main studio canvas ──────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        {/*
          Outer shell — constrains the video to a portrait-ish aspect ratio
          that looks great for outfit footage on all screen sizes.
        */}
        <div
          className={clsx(
            "relative w-full",
            // Portrait aspect ratio, maxed at a comfortable viewport height
            "max-w-lg",
            // Tall enough to show the full outfit
            "aspect-[9/16] max-h-[calc(100vh-7rem)]",
            "animate-fade-in"
          )}
        >
          {/* ── RecordingView (idle + recording phases) ────────────────── */}
          {inCameraPhase && (
            <div className="absolute inset-0 animate-fade-in">
              <RecordingView />
            </div>
          )}

          {/* ── ReviewView (review + processing + reveal phases) ──────── */}
          {inReviewPhase && (
            <div className="absolute inset-0 animate-fade-in">
              <ReviewView />
            </div>
          )}
        </div>
      </main>

      {/* ── Subtle footer ──────────────────────────────────────────────── */}
      <footer className="flex-shrink-0 h-10 flex items-center justify-center border-t border-white/5">
        <p className="text-white/15 text-xs tracking-wide">
          FashionAI Studio · Private Beta
        </p>
      </footer>
    </div>
  );
}
