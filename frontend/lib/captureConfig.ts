// ── Client-side Video Capture Configuration ───────────────────────────────────
//
// All camera / MediaRecorder quality settings live here.
// Change TARGET_FPS to switch frame rates without touching component code.
//
// Supported FPS values (most webcams):
//   15  — low-bandwidth, older hardware
//   24  — cinematic feel, smaller file sizes          ◄ default
//   30  — standard web / webcam
//   60  — ultra-smooth (requires good lighting + USB3 camera)
//
// ──────────────────────────────────────────────────────────────────────────────

export const CAPTURE_CONFIG = {
  // ── Frame rate ─────────────────────────────────────────────────────────────
  /**
   * Target frames per second sent to the AI backend.
   *
   * ★  THIS IS THE VALUE TO CHANGE FOR A DIFFERENT FPS  ★
   *
   * The browser will request this value as an `exact` constraint first.
   * If the camera cannot satisfy it (e.g. a locked webcam driver), the
   * initialiser automatically retries with `ideal` so recording still works.
   */
  TARGET_FPS: 24 as number,

  // ── Resolution ─────────────────────────────────────────────────────────────
  /** Target horizontal resolution in pixels. 1280 pairs with 720 for 720p. */
  TARGET_WIDTH: 1280,

  /** Target vertical resolution in pixels. */
  TARGET_HEIGHT: 720,

  // ── Constraint strictness ──────────────────────────────────────────────────
  /**
   * When `true`  → ask the browser for `exact` constraints.
   *   • Best quality guarantee; throws OverconstrainedError if unsupported.
   *   • The camera initialiser catches this and retries with `ideal`.
   *
   * When `false` → always use `ideal` constraints (best-effort, never throws).
   *   • Useful for dev environments or devices with locked camera drivers.
   */
  USE_EXACT_CONSTRAINTS: true,

  // ── MediaRecorder encoding hints ───────────────────────────────────────────
  /**
   * Preferred MIME types tried in order.
   * The first one supported by the current browser is used.
   */
  MIME_TYPE_PREFERENCE: [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ] as string[],

  /**
   * Target video bitrate in bits-per-second passed to MediaRecorder.
   * 2_500_000 = 2.5 Mbps — a solid balance for 720p@24fps before upload.
   * Increase for higher fidelity; decrease to reduce payload size to the API.
   */
  VIDEO_BITS_PER_SECOND: 2_500_000,
} as const;

// ── Constraint builders ────────────────────────────────────────────────────────

/**
 * Returns a `MediaStreamConstraints` object built from CAPTURE_CONFIG.
 *
 * @param exact  When true, uses `exact` for width/height/frameRate.
 *               When false, uses `ideal` (best-effort).
 */
export function buildVideoConstraints(exact: boolean): MediaStreamConstraints {
  const w = CAPTURE_CONFIG.TARGET_WIDTH;
  const h = CAPTURE_CONFIG.TARGET_HEIGHT;
  const fps = CAPTURE_CONFIG.TARGET_FPS;

  return {
    video: {
      facingMode: "user",
      width:     exact ? { exact: w }   : { ideal: w },
      height:    exact ? { exact: h }   : { ideal: h },
      frameRate: exact ? { exact: fps } : { ideal: fps },
    },
    audio: false,
  };
}

/**
 * Picks the first MIME type from MIME_TYPE_PREFERENCE that the current
 * browser's MediaRecorder implementation supports.
 * Returns an empty string if none match (browser uses its own default).
 */
export function pickMimeType(): string {
  return (
    CAPTURE_CONFIG.MIME_TYPE_PREFERENCE.find((t) =>
      MediaRecorder.isTypeSupported(t)
    ) ?? ""
  );
}

// ── Display helpers ────────────────────────────────────────────────────────────

/**
 * Converts raw pixel dimensions + frame rate into a short human-readable
 * label shown in the camera preview badge.
 *
 * Examples:
 *   captureLabel(1280, 720, 24)  → "720p · 24 fps"
 *   captureLabel(1920, 1080, 30) → "1080p · 30 fps"
 *   captureLabel(640, 480, 15)   → "480p · 15 fps"
 */
export function captureLabel(
  width: number,
  height: number,
  frameRate: number
): string {
  void width; // reserved — may be used for aspect-ratio display in future
  const resLabel =
    height >= 2160 ? "4K"
    : height >= 1440 ? "1440p"
    : height >= 1080 ? "1080p"
    : height >= 720  ? "720p"
    : height >= 480  ? "480p"
    : `${height}p`;

  return `${resLabel} · ${Math.round(frameRate)} fps`;
}

/**
 * Actual settings returned by `track.getSettings()` after the stream opens.
 * Stored in component state so the UI can show what was truly negotiated.
 */
export interface ActualCaptureSettings {
  width: number;
  height: number;
  frameRate: number;
  /** The MIME type chosen for MediaRecorder encoding. */
  mimeType: string;
}
