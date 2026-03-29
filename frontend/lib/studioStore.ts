// ── Studio Store (Zustand) ─────────────────────────────────────────────────────
//
// Manages the full lifecycle of a single recording session:
//
//   idle  ──►  recording  ──►  review  ──►  processing  ──►  reveal
//    ▲                           │
//    └─────── retake ────────────┘
//
// ──────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";

// ── Phase Enum ─────────────────────────────────────────────────────────────────

export type StudioPhase =
  | "idle" // camera initialising / waiting to record
  | "recording" // MediaRecorder is active, countdown running
  | "review" // blob ready, looping playback + command bar visible
  | "processing" // processVideoMutation in-flight
  | "reveal"; // AI video returned, hot-swap complete

// ── State Shape ────────────────────────────────────────────────────────────────

export interface StudioState {
  // Current phase
  phase: StudioPhase;

  // The raw recorded video blob (set when MediaRecorder stops)
  recordedBlob: Blob | null;

  // Object URL created from recordedBlob (created once, revoked on retake/reset)
  recordedObjectUrl: string | null;

  // Countdown value in seconds (0–5) while recording is active
  countdown: number;

  // The user's styling prompt text
  prompt: string;

  // URL of the AI-generated output video (set when processVideoMutation resolves)
  aiVideoUrl: string | null;

  // Whether the AI video is currently playing (post-reveal)
  aiVideoPlaying: boolean;

  // Internal timer ID so we can clear the countdown interval on manual stop
  _countdownIntervalId: ReturnType<typeof setInterval> | null;
}

// ── Action Shape ───────────────────────────────────────────────────────────────

export interface StudioActions {
  // Called the moment the MediaRecorder starts
  startRecording: () => void;

  // Called every second by the countdown interval
  tickCountdown: () => void;

  // Called when recording stops (manually or by countdown reaching 0)
  stopRecording: (blob: Blob) => void;

  // Called when the user wants to discard the current blob and re-record
  retake: () => void;

  // Called when the user updates the prompt input
  setPrompt: (prompt: string) => void;

  // Called when the user submits the command bar
  startProcessing: () => void;

  // Called when backend generation fails and the user should return to review
  processingFailed: () => void;

  // Called when processVideoMutation resolves with the AI video URL
  revealAiVideo: (url: string) => void;

  // Toggle play/pause of the AI video after reveal
  toggleAiPlayback: () => void;

  // Hard reset to initial idle state (e.g. for a brand-new session)
  reset: () => void;
}

export type StudioStore = StudioState & StudioActions;

// ── Initial State ──────────────────────────────────────────────────────────────

const INITIAL_STATE: StudioState = {
  phase: "idle",
  recordedBlob: null,
  recordedObjectUrl: null,
  countdown: 5,
  prompt: "",
  aiVideoUrl: null,
  aiVideoPlaying: false,
  _countdownIntervalId: null,
};

// ── Store ──────────────────────────────────────────────────────────────────────

export const useStudioStore = create<StudioStore>((set, get) => ({
  ...INITIAL_STATE,

  // ── startRecording ──────────────────────────────────────────────────────────
  startRecording: () => {
    // Clear any pre-existing interval just in case
    const existing = get()._countdownIntervalId;
    if (existing) clearInterval(existing);

    const intervalId = setInterval(() => {
      get().tickCountdown();
    }, 1_000);

    set({
      phase: "recording",
      countdown: 5,
      _countdownIntervalId: intervalId,
    });
  },

  // ── tickCountdown ───────────────────────────────────────────────────────────
  tickCountdown: () => {
    const { countdown, _countdownIntervalId } = get();
    const next = countdown - 1;

    if (next <= 0) {
      // Timer hit 0 — the RecordingView component is responsible for calling
      // mediaRecorder.stop(), which will eventually fire stopRecording().
      // We just zero the display here; the interval is cleared in stopRecording.
      if (_countdownIntervalId) clearInterval(_countdownIntervalId);
      set({ countdown: 0, _countdownIntervalId: null });
    } else {
      set({ countdown: next });
    }
  },

  // ── stopRecording ───────────────────────────────────────────────────────────
  stopRecording: (blob: Blob) => {
    const { _countdownIntervalId, recordedObjectUrl } = get();

    // Clean up countdown ticker
    if (_countdownIntervalId) clearInterval(_countdownIntervalId);

    // Revoke any previous object URL to avoid memory leaks
    if (recordedObjectUrl) URL.revokeObjectURL(recordedObjectUrl);

    const newObjectUrl = URL.createObjectURL(blob);

    set({
      phase: "review",
      recordedBlob: blob,
      recordedObjectUrl: newObjectUrl,
      countdown: 5,
      _countdownIntervalId: null,
    });
  },

  // ── retake ──────────────────────────────────────────────────────────────────
  retake: () => {
    const { _countdownIntervalId, recordedObjectUrl } = get();

    if (_countdownIntervalId) clearInterval(_countdownIntervalId);
    if (recordedObjectUrl) URL.revokeObjectURL(recordedObjectUrl);

    set({
      phase: "idle",
      recordedBlob: null,
      recordedObjectUrl: null,
      countdown: 5,
      prompt: "",
      aiVideoUrl: null,
      aiVideoPlaying: false,
      _countdownIntervalId: null,
    });
  },

  // ── setPrompt ───────────────────────────────────────────────────────────────
  setPrompt: (prompt: string) => {
    set({ prompt });
  },

  // ── startProcessing ─────────────────────────────────────────────────────────
  startProcessing: () => {
    set({ phase: "processing" });
  },

  // ── processingFailed ────────────────────────────────────────────────────────
  processingFailed: () => {
    set({ phase: "review" });
  },

  // ── revealAiVideo ───────────────────────────────────────────────────────────
  revealAiVideo: (url: string) => {
    set({
      phase: "reveal",
      aiVideoUrl: url,
      aiVideoPlaying: true, // autoplay immediately on reveal
    });
  },

  // ── toggleAiPlayback ────────────────────────────────────────────────────────
  toggleAiPlayback: () => {
    set((state) => ({ aiVideoPlaying: !state.aiVideoPlaying }));
  },

  // ── reset ───────────────────────────────────────────────────────────────────
  reset: () => {
    const { _countdownIntervalId, recordedObjectUrl } = get();

    if (_countdownIntervalId) clearInterval(_countdownIntervalId);
    if (recordedObjectUrl) URL.revokeObjectURL(recordedObjectUrl);

    set({ ...INITIAL_STATE });
  },
}));
