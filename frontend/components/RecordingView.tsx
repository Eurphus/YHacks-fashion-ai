"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useStudioStore } from "@/lib/studioStore";
import ToastOverlay from "@/components/ToastOverlay";
import {
  CAPTURE_CONFIG,
  buildVideoConstraints,
  pickMimeType,
  captureLabel,
  type ActualCaptureSettings,
} from "@/lib/captureConfig";
import clsx from "clsx";

// ── Constants ──────────────────────────────────────────────────────────────────

/** Seconds shown in the pre-recording countdown before MediaRecorder starts. */
const PRE_RECORD_SECONDS = 3;

/** Max recording duration driven by the Zustand store countdown. */
const MAX_RECORD_SECONDS = 5;

// SVG ring geometry for the pre-recording countdown overlay
const PRE_RING_R = 48;
const PRE_RING_C = 2 * Math.PI * PRE_RING_R; // ≈ 301.59 px

// SVG ring geometry for the in-recording countdown badge
const REC_RING_R = 28;
const REC_RING_C = 2 * Math.PI * REC_RING_R;

// ── RecordingView ──────────────────────────────────────────────────────────────
//
// Phase map (Zustand phase → local sub-state):
//
//   "idle"      + preCountdown === null  → camera preview, Record button
//   "idle"      + preCountdown > 0       → pre-recording countdown overlay
//   "recording"                          → live feed + countdown ring + Stop button
//
// Flow:
//   Record pressed → preCountdown = 3 → 2 → 1 → 0
//   → handleActualStartRecording() → MediaRecorder.start() + store.startRecording()
//   → countdown ticks 5 → … → 0 → MediaRecorder.stop()
//   → store.stopRecording(blob) → phase = "review"  (ReviewView takes over)
//
// ──────────────────────────────────────────────────────────────────────────────

export default function RecordingView() {
  // ── Store ──────────────────────────────────────────────────────────────────
  const phase = useStudioStore((s) => s.phase);
  const countdown = useStudioStore((s) => s.countdown);
  const startRecording = useStudioStore((s) => s.startRecording);
  const stopRecording = useStudioStore((s) => s.stopRecording);

  // ── Media refs ─────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Stable ref so the pre-countdown useEffect can call the actual start
  // function without it appearing in its own dependency array.
  const doStartRecordingRef = useRef<() => void>(() => {});

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitialising, setIsInitialising] = useState(true);
  const [preCountdown, setPreCountdown] = useState<number | null>(null);
  const [actualCapture, setActualCapture] =
    useState<ActualCaptureSettings | null>(null);

  // ── Camera initialisation ──────────────────────────────────────────────────
  //
  // Attempts to open the camera with the exact constraints from CAPTURE_CONFIG
  // (720p @ TARGET_FPS).  On OverconstrainedError it falls back to ideal so
  // the UI never hard-fails on locked webcam drivers.
  // After the stream opens, getSettings() reads back the *actual* negotiated
  // values so the badge shows what was truly achieved.
  //
  const initCamera = useCallback(async () => {
    setIsInitialising(true);
    setCameraError(null);
    setActualCapture(null);

    let stream: MediaStream | null = null;

    try {
      // ── First attempt: exact constraints ────────────────────────────────
      const exact = CAPTURE_CONFIG.USE_EXACT_CONSTRAINTS;
      stream = await navigator.mediaDevices.getUserMedia(
        buildVideoConstraints(exact),
      );
    } catch (err: unknown) {
      const isOverconstrained =
        err instanceof DOMException && err.name === "OverconstrainedError";

      if (isOverconstrained && CAPTURE_CONFIG.USE_EXACT_CONSTRAINTS) {
        // ── Fallback: ideal constraints ────────────────────────────────────
        console.warn(
          "[FashionAI] Exact constraints rejected by camera — retrying with ideal.",
          err,
        );
        try {
          stream = await navigator.mediaDevices.getUserMedia(
            buildVideoConstraints(false),
          );
        } catch (fallbackErr: unknown) {
          // Both attempts failed — surface a friendly error
          setCameraError(formatCameraError(fallbackErr));
          setIsInitialising(false);
          return;
        }
      } else {
        setCameraError(formatCameraError(err));
        setIsInitialising(false);
        return;
      }
    }

    if (!stream) {
      setCameraError("Could not open camera stream.");
      setIsInitialising(false);
      return;
    }

    // ── Read actual negotiated settings ──────────────────────────────────
    const track = stream.getVideoTracks()[0];
    const mimeType = pickMimeType();

    if (track) {
      const s = track.getSettings();
      const actual: ActualCaptureSettings = {
        width: s.width ?? CAPTURE_CONFIG.TARGET_WIDTH,
        height: s.height ?? CAPTURE_CONFIG.TARGET_HEIGHT,
        frameRate: s.frameRate ?? CAPTURE_CONFIG.TARGET_FPS,
        mimeType,
      };
      setActualCapture(actual);

      console.info(
        "[FashionAI] Camera opened.",
        `\n  resolution : ${actual.width}×${actual.height}`,
        `\n  frameRate  : ${actual.frameRate} fps`,
        `\n  mimeType   : ${mimeType || "(browser default)"}`,
        `\n  trackLabel : ${track.label}`,
      );
    }

    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {
        // autoPlay might be blocked until a user gesture — safe to ignore
      });
    }

    setIsInitialising(false);
  }, []);

  // Mount once; tear down tracks on unmount
  useEffect(() => {
    initCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [initCamera]);

  // ── Auto-stop when countdown hits 0 ───────────────────────────────────────
  useEffect(() => {
    if (phase === "recording" && countdown === 0) {
      recorderRef.current?.stop();
    }
  }, [phase, countdown]);

  // ── Pre-recording countdown ticker ────────────────────────────────────────
  useEffect(() => {
    if (preCountdown === null) return;

    if (preCountdown === 0) {
      // Countdown finished — kick off the real recording
      setPreCountdown(null);
      doStartRecordingRef.current();
      return;
    }

    const timer = setTimeout(
      () => setPreCountdown((p) => (p !== null && p > 0 ? p - 1 : null)),
      1_000,
    );
    return () => clearTimeout(timer);
  }, [preCountdown]);

  // ── Actual recording start (called after the 3-second pre-countdown) ──────
  const handleActualStartRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];

    const mimeType = pickMimeType();

    const recorderOptions: MediaRecorderOptions = {
      ...(mimeType && { mimeType }),
      ...(CAPTURE_CONFIG.VIDEO_BITS_PER_SECOND && {
        videoBitsPerSecond: CAPTURE_CONFIG.VIDEO_BITS_PER_SECOND,
      }),
    };

    const recorder = new MediaRecorder(streamRef.current, recorderOptions);

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mimeType || "video/webm",
      });
      stopRecording(blob);
    };

    recorderRef.current = recorder;
    recorder.start(100); // collect a chunk every 100 ms

    // Kick off the Zustand countdown (5 s)
    startRecording();
  }, [startRecording, stopRecording]);

  // Keep the ref stable so the pre-countdown useEffect always calls the
  // latest version without needing it in its dependency array.
  doStartRecordingRef.current = handleActualStartRecording;

  // ── Record button press → start 3-second pre-countdown ────────────────────
  const handleRecordButtonPress = useCallback(() => {
    if (isInitialising || cameraError) return;
    setPreCountdown(PRE_RECORD_SECONDS);
  }, [isInitialising, cameraError]);

  // ── Manual stop ───────────────────────────────────────────────────────────
  const handleStopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────
  const isRecording = phase === "recording";
  const isPreCounting = preCountdown !== null;

  // Recording countdown ring: fills proportionally from 5 → 0
  const recProgress = countdown / MAX_RECORD_SECONDS;
  const recStrokeDashOffset = REC_RING_C * (1 - recProgress);
  const countdownIsLow = countdown <= 2;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black rounded-2xl overflow-hidden">
      {/* ── Live camera feed ─────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={clsx(
          "w-full h-full object-cover",
          "scale-x-[-1]", // mirror so it feels like looking in a mirror
          isInitialising
            ? "opacity-0"
            : "opacity-100 transition-opacity duration-500",
        )}
        aria-label="Live camera preview"
      />

      {/* ── Spinner while camera wakes up ────────────────────────────────── */}
      {isInitialising && !cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full border-2 border-purple-500/40 border-t-purple-400 animate-spin" />
          <p className="text-white/50 text-sm tracking-wide">
            Initialising camera…
          </p>
        </div>
      )}

      {/* ── Camera error ─────────────────────────────────────────────────── */}
      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-red-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <p className="text-white/70 text-sm text-center leading-relaxed max-w-xs">
            {cameraError}
          </p>
          <button
            onClick={initCamera}
            className="px-5 py-2 rounded-full bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-sm font-medium transition-all"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          PRE-RECORDING COUNTDOWN OVERLAY
          Appears for 3 seconds after the Record button is pressed.
          Camera feed stays visible behind the semi-transparent overlay so
          Peter can frame himself before recording begins.
      ════════════════════════════════════════════════════════════════════ */}
      {isPreCounting && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 animate-fade-in"
          aria-live="assertive"
          aria-label={`Recording starts in ${preCountdown}`}
        >
          {/* Ring + number */}
          <div className="relative flex items-center justify-center w-[120px] h-[120px]">
            {/* Sweeping SVG ring — remounted on each tick via key to restart animation */}
            <svg
              key={`ring-${preCountdown}`}
              viewBox="0 0 120 120"
              className="-rotate-90 absolute inset-0 w-full h-full"
              aria-hidden="true"
            >
              {/* Track */}
              <circle
                cx={60}
                cy={60}
                r={PRE_RING_R}
                fill="none"
                stroke="rgba(255,255,255,0.10)"
                strokeWidth={4}
              />
              {/* Animated sweep — drains from full to empty over 1 second */}
              <circle
                cx={60}
                cy={60}
                r={PRE_RING_R}
                fill="none"
                stroke="#a855f7"
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray={PRE_RING_C}
                strokeDashoffset={0}
                className="countdown-ring-sweep"
              />
            </svg>

            {/* Large countdown number — pops in / out via key remount */}
            <span
              key={`num-${preCountdown}`}
              className="relative text-7xl font-bold text-white tabular-nums countdown-num-pop"
              aria-hidden="true"
            >
              {preCountdown}
            </span>
          </div>

          <p className="text-white/55 text-sm tracking-[0.22em] uppercase mt-5 animate-fade-in">
            Get ready…
          </p>
        </div>
      )}

      {/* ── Guidance toasts (only during active recording) ───────────────── */}
      <ToastOverlay active={isRecording} />

      {/* ── Recording countdown ring (top-right corner) ──────────────────── */}
      {isRecording && (
        <div
          className="absolute top-4 right-4 z-20 flex items-center justify-center animate-fade-in"
          aria-label={`${countdown} seconds remaining`}
        >
          <svg
            width={72}
            height={72}
            viewBox="0 0 72 72"
            className="-rotate-90"
            aria-hidden="true"
          >
            {/* Track */}
            <circle
              cx={36}
              cy={36}
              r={REC_RING_R}
              fill="none"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth={4}
            />
            {/* Progress — drains as time runs out */}
            <circle
              cx={36}
              cy={36}
              r={REC_RING_R}
              fill="none"
              stroke={countdownIsLow ? "#f87171" : "#a855f7"}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={REC_RING_C}
              strokeDashoffset={recStrokeDashOffset}
              style={{
                transition: "stroke-dashoffset 0.8s linear, stroke 0.3s ease",
              }}
            />
          </svg>

          <span
            className={clsx(
              "absolute text-lg font-bold tabular-nums",
              countdownIsLow ? "text-red-400" : "text-white",
            )}
          >
            {countdown}
          </span>
        </div>
      )}

      {/* ── Actual capture-settings badge (bottom-left, idle only) ────────── */}
      {actualCapture &&
        !isInitialising &&
        !cameraError &&
        !isRecording &&
        !isPreCounting && (
          <div
            className="absolute bottom-4 left-4 z-20 glass-dark rounded-lg px-2.5 py-1.5"
            title={`Encoding: ${actualCapture.mimeType || "browser default"} · ${(CAPTURE_CONFIG.VIDEO_BITS_PER_SECOND / 1_000_000).toFixed(1)} Mbps`}
          >
            <p className="text-white/45 text-[11px] font-mono tracking-wide">
              {captureLabel(
                actualCapture.width,
                actualCapture.height,
                actualCapture.frameRate,
              )}
            </p>
          </div>
        )}

      {/* ── Bottom controls (hidden during pre-countdown) ─────────────────── */}
      {!cameraError && !isInitialising && !isPreCounting && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3">
          {isRecording ? (
            /* ── Stop button ──────────────────────────────────────────────── */
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleStopRecording}
                aria-label="Stop recording"
                className={clsx(
                  "relative w-20 h-20 rounded-full",
                  "flex items-center justify-center",
                  "bg-red-600 hover:bg-red-500 active:scale-95",
                  "shadow-[0_0_24px_6px_rgba(239,68,68,0.45)]",
                  "transition-all duration-150 cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                )}
              >
                <span
                  className="absolute inset-0 rounded-full bg-red-500 record-ring opacity-70"
                  aria-hidden="true"
                />
                <span
                  className="relative w-7 h-7 bg-white rounded-md"
                  aria-hidden="true"
                />
              </button>
              <span className="text-white/60 text-xs font-medium tracking-wider uppercase">
                Stop
              </span>
            </div>
          ) : (
            /* ── Record button ────────────────────────────────────────────── */
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleRecordButtonPress}
                aria-label="Start recording"
                className={clsx(
                  "relative w-20 h-20 rounded-full",
                  "flex items-center justify-center",
                  "bg-red-600 hover:bg-red-500 active:scale-95",
                  "shadow-[0_0_20px_4px_rgba(239,68,68,0.35)]",
                  "transition-all duration-150 cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                )}
              >
                <span
                  className="absolute inset-0 rounded-full border-4 border-white/20"
                  aria-hidden="true"
                />
                <span
                  className="relative w-8 h-8 rounded-full bg-red-400"
                  aria-hidden="true"
                />
              </button>
              <span className="text-white/60 text-xs font-medium tracking-wider uppercase">
                Record
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCameraError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError")
      return "Camera permission denied. Please allow camera access and refresh.";
    if (err.name === "NotFoundError") return "No camera found on this device.";
    if (err.name === "NotReadableError")
      return "Camera is already in use by another application.";
  }
  return "Could not access camera. Please check your device settings.";
}
