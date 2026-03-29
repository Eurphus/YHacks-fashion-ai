"use client";

import { useEffect, useState, useRef } from "react";
import clsx from "clsx";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ToastMessage {
  id: string;
  text: string;
  /** Delay in ms from the moment the overlay mounts before this toast appears */
  delayMs: number;
  /** How long the toast stays visible before fading out (ms) */
  durationMs?: number;
}

interface ToastOverlayProps {
  /** Set to true when recording begins; triggers the timed sequence */
  active: boolean;
}

// ── Timed guidance sequence ────────────────────────────────────────────────────

const GUIDANCE_SEQUENCE: ToastMessage[] = [
  {
    id: "toast-outfit",
    text: "👗  Stand back so your outfit is in frame.",
    delayMs: 0,
    durationMs: 3500,
  },
  {
    id: "toast-spin",
    text: "💫  Do a slow spin or strike a pose!",
    delayMs: 3000,
    durationMs: 4000,
  },
];

// ── Individual Toast ───────────────────────────────────────────────────────────

interface SingleToastProps {
  text: string;
  durationMs: number;
  onDone: () => void;
}

function SingleToast({ text, durationMs, onDone }: SingleToastProps) {
  const [phase, setPhase] = useState<"entering" | "visible" | "exiting">(
    "entering"
  );
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    // entering → visible after the CSS enter animation (~300 ms)
    const enterTimer = setTimeout(() => setPhase("visible"), 300);

    // visible → exiting after the display duration
    const exitTimer = setTimeout(
      () => setPhase("exiting"),
      durationMs - 300
    );

    // done — remove from DOM after exit animation completes
    const doneTimer = setTimeout(() => onDoneRef.current(), durationMs);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [durationMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        // Layout & base style
        "relative flex items-center gap-3 px-5 py-3 rounded-2xl",
        // Glassmorphism
        "glass-dark",
        // Typography
        "text-white text-sm font-medium tracking-wide leading-snug",
        // Subtle left accent line
        "border-l-2 border-purple-400",
        // Phase-driven animation classes
        phase === "entering" && "toast-enter",
        phase === "exiting" && "toast-exit"
      )}
    >
      {/* Decorative shimmer line at top */}
      <span
        className="absolute top-0 left-4 right-4 h-px rounded-full opacity-40"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(168,85,247,0.8), transparent)",
        }}
        aria-hidden="true"
      />
      <span>{text}</span>
    </div>
  );
}

// ── ToastOverlay ───────────────────────────────────────────────────────────────

/**
 * Renders a timed sequence of floating guidance toasts over the camera feed.
 *
 * Mount this component when `active` becomes true (i.e. recording starts).
 * Each toast in GUIDANCE_SEQUENCE is queued with its own `delayMs` and
 * `durationMs` so the user sees:
 *
 *   t=0s  → "Stand back so your outfit is in frame."
 *   t=3s  → "Do a slow spin or strike a pose!"
 */
export default function ToastOverlay({ active }: ToastOverlayProps) {
  const [visibleToasts, setVisibleToasts] = useState<
    Array<{ id: string; text: string; durationMs: number }>
  >([]);
  const scheduledRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!active) {
      // Clear all pending timers and wipe visible toasts when recording stops
      scheduledRef.current.forEach(clearTimeout);
      scheduledRef.current = [];
      setVisibleToasts([]);
      return;
    }

    // Schedule each toast to appear at its configured delay
    const timers = GUIDANCE_SEQUENCE.map((msg) => {
      return setTimeout(() => {
        setVisibleToasts((prev) => [
          ...prev,
          {
            id: msg.id,
            text: msg.text,
            durationMs: msg.durationMs ?? 3000,
          },
        ]);
      }, msg.delayMs);
    });

    scheduledRef.current = timers;

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [active]);

  const removeToast = (id: string) => {
    setVisibleToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (!active || visibleToasts.length === 0) return null;

  return (
    /* Anchored to top-center of the video container, sitting above all overlays */
    <div
      className="absolute top-5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 w-max max-w-[90vw] pointer-events-none"
      aria-label="Recording guidance"
    >
      {visibleToasts.map((toast) => (
        <SingleToast
          key={toast.id}
          text={toast.text}
          durationMs={toast.durationMs}
          onDone={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
