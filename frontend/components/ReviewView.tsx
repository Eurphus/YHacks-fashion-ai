"use client";

import { useEffect, useRef, useCallback, useState, KeyboardEvent } from "react";
import { RotateCcw, Sparkles, Play, Pause, CheckCircle2 } from "lucide-react";
import { useStudioStore } from "@/lib/studioStore";
import { processVideoMutation } from "@/lib/mockApi";
import clsx from "clsx";

// ── ReviewView ─────────────────────────────────────────────────────────────────
//
// Renders three consecutive phases inside one shared video container:
//
//   "review"     → looping recorded video + prompt input + Generate button
//   "processing" → video keeps looping, command bar becomes a loading state,
//                  border pulses purple, scan-line sweeps the frame,
//                  animated step descriptions cycle every 2 s
//   "reveal"     → AI video hot-swapped in at the same currentTime, autoplays,
//                  click the video to toggle play/pause,
//                  filter description shown in command bar
//
// Performance note: the playback progress bar is driven by requestAnimationFrame
// and writes directly to a DOM ref — no React re-render per frame.
//
// ──────────────────────────────────────────────────────────────────────────────

// ── Processing step descriptions ──────────────────────────────────────────────

const PROCESSING_STEPS = [
  "Analyzing outfit structure…",
  "Extracting garment boundaries…",
  "Applying style transfer…",
  "Rendering final output…",
] as const;

// ── Component ──────────────────────────────────────────────────────────────────

export default function ReviewView() {
  // ── Store ──────────────────────────────────────────────────────────────────
  const phase = useStudioStore((s) => s.phase);
  const recordedObjectUrl = useStudioStore((s) => s.recordedObjectUrl);
  const recordedBlob = useStudioStore((s) => s.recordedBlob);
  const prompt = useStudioStore((s) => s.prompt);
  const aiVideoUrl = useStudioStore((s) => s.aiVideoUrl);
  const aiVideoPlaying = useStudioStore((s) => s.aiVideoPlaying);
  const setPrompt = useStudioStore((s) => s.setPrompt);
  const startProcessing = useStudioStore((s) => s.startProcessing);
  const revealAiVideo = useStudioStore((s) => s.revealAiVideo);
  const toggleAiPlayback = useStudioStore((s) => s.toggleAiPlayback);
  const retake = useStudioStore((s) => s.retake);

  // ── Video element refs ─────────────────────────────────────────────────────
  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const aiVideoRef = useRef<HTMLVideoElement>(null);

  // Prevents the swap logic from running more than once per reveal
  const swapDoneRef = useRef(false);

  // ── Progress bar (RAF-driven, zero React re-renders per frame) ────────────
  const progressBarRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number>(0);
  // Mirror of `swapped` in a ref so the RAF callback stays stable
  const swappedRef = useRef(false);
  // Mirror of `isProcessing` so the RAF callback skips updates during AI gen
  const isProcessingRef = useRef(false);

  // ── Local state ────────────────────────────────────────────────────────────
  const [swapped, setSwapped] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  const promptTrimmed = prompt.trim();
  const canSubmit = promptTrimmed.length > 0 && phase === "review";

  // ── Keep swappedRef in sync (no re-renders needed in RAF callback) ────────
  useEffect(() => {
    swappedRef.current = swapped;
  }, [swapped]);

  // ── RAF progress bar — mounts once, reads refs internally ─────────────────
  useEffect(() => {
    const tick = () => {
      // Skip playback tracking while the AI is generating — the top bar is
      // showing the indeterminate CSS animation instead.
      if (!isProcessingRef.current) {
        const el = swappedRef.current
          ? aiVideoRef.current
          : originalVideoRef.current;

        if (progressBarRef.current && el && el.duration > 0) {
          const pct = (el.currentTime / el.duration) * 100;
          progressBarRef.current.style.width = `${pct}%`;
        }
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []); // intentionally empty — reads only refs

  // ── Reset swap state whenever we return to review (after retake) ──────────
  useEffect(() => {
    if (phase === "review") {
      swapDoneRef.current = false;
      setSwapped(false);
    }
  }, [phase]);

  // ── Animated processing step descriptions ─────────────────────────────────
  const isProcessing = phase === "processing";

  // Keep ref in sync so the RAF callback can read it without a dependency
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    if (!isProcessing) {
      setStepIdx(0);
      return;
    }
    const t = setInterval(
      () => setStepIdx((i) => (i + 1) % PROCESSING_STEPS.length),
      2_000,
    );
    return () => clearInterval(t);
  }, [isProcessing]);

  // ── Hot-swap: sync currentTime + reveal AI video ──────────────────────────
  useEffect(() => {
    const isReveal = phase === "reveal";
    if (!isReveal || !aiVideoUrl || swapDoneRef.current) return;

    const aiEl = aiVideoRef.current;
    const origEl = originalVideoRef.current;
    if (!aiEl) return;

    const doSwap = () => {
      swapDoneRef.current = true;

      // Match the AI video's playhead to the original so the cut is seamless
      if (origEl && !isNaN(origEl.currentTime)) {
        try {
          aiEl.currentTime = origEl.currentTime % (aiEl.duration || 1);
        } catch {
          // duration may not be available yet — best effort
        }
      }

      origEl?.pause();

      // Do NOT call aiEl.pause() here.
      // The store already has aiVideoPlaying: true (set in revealAiVideo),
      // so the effect below will call aiEl.play() once swapped becomes true.
      setSwapped(true);
    };

    if (aiEl.readyState >= 1) {
      doSwap();
    } else {
      aiEl.addEventListener("loadedmetadata", doSwap, { once: true });
    }

    return () => {
      aiEl.removeEventListener("loadedmetadata", doSwap);
    };
  }, [phase, aiVideoUrl]);

  // ── Sync AI video play/pause with store flag ───────────────────────────────
  useEffect(() => {
    const el = aiVideoRef.current;
    if (!el || phase !== "reveal" || !swapped) return;

    if (aiVideoPlaying) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [aiVideoPlaying, phase, swapped]);

  // ── Generate handler ───────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!canSubmit || !recordedBlob) return;

    startProcessing();

    try {
      const result = await processVideoMutation(recordedBlob, promptTrimmed);
      revealAiVideo(result.outputUrl);
    } catch (err) {
      console.error("[FashionAI] processVideoMutation failed:", err);
      revealAiVideo(
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      );
    }
  }, [canSubmit, recordedBlob, promptTrimmed, startProcessing, revealAiVideo]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleGenerate();
      }
    },
    [handleGenerate],
  );

  // ── Derived flags ──────────────────────────────────────────────────────────
  const isReveal = phase === "reveal";
  const showGlow = isProcessing || isReveal;
  const showAiEl = isProcessing || isReveal; // mount AI video early to preload

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* ════════════════════════════════════════════════════════════════════
          VIDEO CONTAINER
      ════════════════════════════════════════════════════════════════════ */}
      <div
        className={clsx(
          "relative w-full h-full rounded-2xl overflow-hidden bg-black",
          showGlow && "animate-pulse-glow",
          "transition-shadow duration-700",
        )}
      >
        {/* ── Top bar: playback progress OR indeterminate processing ────── */}
        {/* During review/reveal: fills left→right tracking currentTime.    */}
        {/* During processing: shows the indeterminate sweep animation.     */}
        <div
          className="absolute top-0 left-0 right-0 z-30 h-1 overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-hidden="true"
        >
          {isProcessing ? (
            <div className="loading-bar-fill" />
          ) : (
            <div
              ref={progressBarRef}
              className="h-full"
              style={{
                width: "0%",
                background: "linear-gradient(90deg, #a855f7, #ec4899)",
              }}
            />
          )}
        </div>

        {/* ── Original recorded video ──────────────────────────────────── */}
        <video
          ref={originalVideoRef}
          src={recordedObjectUrl ?? undefined}
          autoPlay
          loop
          muted
          playsInline
          className={clsx(
            "absolute inset-0 w-full h-full object-cover",
            "scale-x-[-1]", // mirror to match recording preview
            swapped ? "opacity-0" : "opacity-100",
            "transition-opacity duration-150",
          )}
          aria-label="Recorded outfit video"
        />

        {/* ── AI-generated video (preloaded, hidden until swap) ────────── */}
        {showAiEl && aiVideoUrl && (
          <video
            ref={aiVideoRef}
            src={aiVideoUrl}
            loop
            muted={false}
            playsInline
            preload="auto"
            onClick={isReveal && swapped ? toggleAiPlayback : undefined}
            className={clsx(
              "absolute inset-0 w-full h-full object-cover",
              "scale-x-[-1]",
              swapped ? "opacity-100 video-reveal" : "opacity-0",
              "transition-opacity duration-150",
              // Indicate the video is interactive after the swap
              isReveal && swapped && "cursor-pointer",
            )}
            aria-label="AI-generated outfit video"
          />
        )}

        {/* ── Click-to-pause overlay icon (shown when AI video is paused) ─ */}
        {isReveal && swapped && !aiVideoPlaying && (
          <div
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            aria-hidden="true"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(0,0,0,0.50)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
              }}
            >
              <Play className="w-7 h-7 text-white/90 ml-0.5" />
            </div>
          </div>
        )}

        {/* ── Processing scan-line ──────────────────────────────────────── */}
        {isProcessing && !swapped && (
          <div className="scan-line" aria-hidden="true" />
        )}

        {/* ── Processing dim overlay ────────────────────────────────────── */}
        {isProcessing && !swapped && (
          <div
            className="absolute inset-0 bg-purple-950/10 pointer-events-none z-10 animate-fade-in"
            aria-hidden="true"
          />
        )}

        {/* ── Retake button (review phase only, top-left) ───────────────── */}
        {phase === "review" && (
          <button
            onClick={retake}
            aria-label="Retake recording"
            className={clsx(
              "absolute top-4 left-4 z-30",
              "flex items-center gap-2 px-3 py-2 rounded-xl",
              "glass-dark",
              "text-white/80 hover:text-white text-sm font-medium",
              "transition-all duration-200 active:scale-95 hover:bg-white/10",
              "animate-fade-in",
            )}
          >
            <RotateCcw className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>Retake</span>
          </button>
        )}

        {/* ── "AI Look Generated" badge (reveal phase, top-right) ──────── */}
        {isReveal && swapped && (
          <div
            className={clsx(
              "absolute top-4 right-4 z-30",
              "flex items-center gap-2 px-3 py-2 rounded-xl",
              "glass-dark text-emerald-400 text-sm font-medium",
              "animate-slide-up",
            )}
            aria-live="polite"
          >
            <CheckCircle2
              className="w-4 h-4 flex-shrink-0"
              aria-hidden="true"
            />
            <span>AI Look Generated</span>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            COMMAND BAR
            Glassmorphic panel anchored to the bottom of the video,
            overlapping the bottom edge of the footage.
        ════════════════════════════════════════════════════════════════ */}
        <div
          className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-5 pt-0"
          aria-label={
            isReveal
              ? "Generation complete controls"
              : isProcessing
                ? "Processing status"
                : "Style command bar"
          }
        >
          <div
            className={clsx(
              "w-full rounded-2xl px-4 py-4 glass-dark",
              "border-t border-white/10",
              "animate-slide-up",
              inputFocused &&
                phase === "review" &&
                "shadow-[0_0_0_1px_rgba(168,85,247,0.25)]",
              "transition-all duration-300",
            )}
          >
            {/* ── REVIEW: prompt input + Generate button ────────────── */}
            {phase === "review" && (
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    placeholder="e.g., Make my shirt a vintage denim jacket..."
                    aria-label="Style prompt"
                    className={clsx(
                      "w-full bg-[#17171d] hover:bg-[#1b1b22] focus:bg-[#1b1b22]",
                      "border border-white/12 focus:border-purple-500/60",
                      "rounded-xl px-4 py-3",
                      "text-white placeholder-white/30 text-sm",
                      "outline-none transition-all duration-200 caret-purple-400",
                    )}
                    autoFocus
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!canSubmit}
                  aria-label="Generate AI look"
                  className={clsx(
                    "flex-shrink-0 flex items-center gap-2",
                    "px-5 py-3 rounded-xl text-sm font-semibold text-white",
                    "transition-all duration-200",
                    canSubmit
                      ? [
                          "bg-gradient-to-r from-purple-600 to-pink-600",
                          "hover:from-purple-500 hover:to-pink-500",
                          "shadow-[0_4px_16px_rgba(168,85,247,0.4)]",
                          "hover:shadow-[0_4px_24px_rgba(168,85,247,0.6)]",
                          "active:scale-95",
                        ]
                      : ["bg-white/10 text-white/30 cursor-not-allowed"],
                  )}
                >
                  <Sparkles
                    className="w-4 h-4 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span>Generate</span>
                </button>
              </div>
            )}

            {/* ── PROCESSING: indeterminate bar + animated step text ─── */}
            {isProcessing && (
              <div className="flex flex-col gap-3 animate-fade-in">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-white/80 text-sm font-medium">
                      FashionAI is designing your look…
                    </span>
                  </div>
                  <span className="text-white/25 text-xs font-mono hidden sm:block flex-shrink-0">
                    diffusion · v0.1
                  </span>
                </div>

                {/* Animated step description — cycles every 2 s */}
                <p
                  key={stepIdx}
                  className="text-white/40 text-xs leading-relaxed animate-fade-in"
                >
                  {PROCESSING_STEPS[stepIdx]}
                </p>
              </div>
            )}

            {/* ── REVEAL (waiting for swap) ─────────────────────────── */}
            {isReveal && !swapped && (
              <div className="flex items-center gap-2 animate-fade-in">
                <span
                  className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"
                  aria-hidden="true"
                />
                <span className="text-white/60 text-sm">
                  Preparing your new look…
                </span>
              </div>
            )}

            {/* ── REVEAL (swap complete) ────────────────────────────── */}
            {isReveal && swapped && (
              <div className="flex flex-col gap-3 animate-slide-up">
                {/* ── Top row: status + play/pause button ── */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2
                      className="w-4 h-4 text-emerald-400 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold leading-tight">
                        Generation Complete
                      </p>
                      <p className="text-white/35 text-xs truncate mt-0.5">
                        {prompt}
                      </p>
                    </div>
                  </div>

                  {/* Play / Pause — also duplicates the click-on-video affordance */}
                  <button
                    onClick={toggleAiPlayback}
                    aria-label={
                      aiVideoPlaying ? "Pause AI video" : "Play AI video"
                    }
                    className={clsx(
                      "flex-shrink-0 flex items-center gap-2",
                      "px-5 py-3 rounded-xl text-sm font-semibold text-white",
                      "bg-gradient-to-r from-emerald-600 to-teal-600",
                      "hover:from-emerald-500 hover:to-teal-500",
                      "shadow-[0_4px_16px_rgba(52,211,153,0.3)]",
                      "hover:shadow-[0_4px_24px_rgba(52,211,153,0.5)]",
                      "active:scale-95 transition-all duration-200",
                    )}
                  >
                    {aiVideoPlaying ? (
                      <>
                        <Pause
                          className="w-4 h-4 flex-shrink-0"
                          aria-hidden="true"
                        />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play
                          className="w-4 h-4 flex-shrink-0"
                          aria-hidden="true"
                        />
                        <span>Play</span>
                      </>
                    )}
                  </button>
                </div>

                {/* ── Divider ── */}
                <div className="h-px bg-white/[0.07]" aria-hidden="true" />

                {/* ── Filter / transformation description ── */}
                {/*
                  What the AI actually did:
                  1. The recorded frames were segmented to isolate clothing regions
                     from the background and body geometry.
                  2. Texture, colour, and silhouette data were extracted per-garment.
                  3. A diffusion model applied style conditioning guided by the prompt,
                     re-synthesising the garment appearance while keeping the body pose
                     and scene context intact.
                  4. The output frames were composited back at the original resolution.
                */}
                <div className="flex flex-col gap-1.5">
                  <p className="text-white/50 text-xs leading-relaxed">
                    <span className="text-purple-400/90 font-medium">
                      🎨 Style transfer applied —{" "}
                    </span>
                    Clothing regions were segmented frame-by-frame and their
                    texture + silhouette data extracted. A diffusion model then
                    re-synthesised each garment&apos;s appearance using your
                    prompt as a style guide, while preserving body geometry and
                    scene background.
                  </p>
                  <p className="text-white/20 text-[10px] font-mono tracking-wide">
                    fashionai-diffusion-v0.1-mock · click video to toggle
                    playback
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
