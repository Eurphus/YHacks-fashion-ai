// ── FashionAI Mock → Real API ──────────────────────────────────────────────────
//
// This module is the frontend half of the API contract.
// The backend half lives in:  backend/app/models/video.py
//
// CONTRACT RULE: every field in BackendVideoProcessResponse must exactly
// match the Pydantic VideoProcessResponse model on the backend.
// If a field is added, renamed, or removed on either side, update both.
//
// ──────────────────────────────────────────────────────────────────────────────

// ── Backend contract type (mirrors backend/app/models/video.py) ───────────────

export type BackendProcessingStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface BackendVideoMetadata {
  /** Width of the input video in pixels */
  input_width: number;
  /** Height of the input video in pixels */
  input_height: number;
  /** Frame rate of the input video */
  input_fps: number;
  /** Duration of the input video in seconds */
  input_duration_s: number;
  /** MIME type reported by the client (e.g. "video/webm") */
  input_format: string;
  /** Raw byte size of the uploaded file */
  input_size_bytes: number;
}

/**
 * Shape of the JSON body returned by POST /api/v1/video/process.
 *
 * This interface is the TypeScript mirror of the Python Pydantic model
 * `VideoProcessResponse` in backend/app/models/video.py.
 * Any field change here must be reflected there, and vice-versa.
 */
export interface BackendVideoProcessResponse {
  /** UUID4 identifier for this processing job */
  job_id: string;
  /** Current status of the job */
  status: BackendProcessingStatus;
  /**
   * Absolute URL to stream the processed MP4 video.
   * Maps to GET /api/v1/video/result/{job_id}.
   */
  output_url: string;
  /** Frames extracted from the input video */
  frames_extracted: number;
  /** Frames successfully processed by the AI pipeline */
  frames_processed: number;
  /** Total wall-clock processing time in milliseconds */
  processing_time_ms: number;
  /** Echo of the style prompt that was submitted */
  prompt: string;
  /** Technical metadata about the uploaded clip */
  metadata: BackendVideoMetadata;
}

// ── Frontend result type (consumed by ReviewView / studioStore) ───────────────

export interface ProcessVideoResult {
  /** Full URL to the processed video — assigned directly to <video src> */
  outputUrl: string;
  /** Echo of the submitted prompt */
  prompt: string;
  meta: {
    /** Model identifier string */
    modelVersion: string;
    /** Total processing time reported by the backend, in milliseconds */
    processingMs: number;
    /** ISO-8601 timestamp of when the result was received by the frontend */
    generatedAt: string;
    /** Number of frames extracted from the recording */
    framesExtracted: number;
    /** Number of frames processed by the AI pipeline */
    framesProcessed: number;
    /** Technical metadata about the input video */
    inputMetadata: BackendVideoMetadata;
  };
}

// ── API call ──────────────────────────────────────────────────────────────────

const SESSION_STORAGE_KEY = "fashionai_generation_session_id";

function getOrCreateGenerationSessionId(): string {
  if (typeof window === "undefined") {
    return "server-session";
  }

  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const created =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `session_${Date.now()}`;
  window.localStorage.setItem(SESSION_STORAGE_KEY, created);
  return created;
}

/**
 * processVideoMutation
 *
 * Uploads the recorded video blob and the user's style prompt to the
 * FashionAI backend for frame-level AI processing.
 *
 * The backend will:
 *   1. Extract every frame from the video at its native frame rate
 *   2. Pass each frame through the AI style-transfer service
 *   3. Add a simulated processing delay (5 s in the current stub)
 *   4. Stitch the output frames into an H.264 MP4
 *   5. Return metadata including a URL to stream the result
 *
 * @param blob   - The MediaRecorder output blob (video/webm or video/mp4)
 * @param prompt - The user's natural-language styling instruction
 */
export async function processVideoMutation(
  blob: Blob,
  prompt: string,
): Promise<ProcessVideoResult> {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    "http://localhost:8000";

  const endpoint = `${apiBase}/api/v1/video/process`;

  // ── Build multipart payload ────────────────────────────────────────────────
  // Field names must match the FastAPI route parameter names exactly:
  //   video  → UploadFile  (File(...))
  //   prompt → str         (Form(...))
  //   session_id → optional stable identifier for prompt/history reuse
  const body = new FormData();
  const sessionId = getOrCreateGenerationSessionId();
  body.append("video", blob, "recording.webm");
  body.append("prompt", prompt);
  body.append("session_id", sessionId);

  console.info(
    "[FashionAI] Submitting to backend…",
    `\n  endpoint  : ${endpoint}`,
    `\n  session   : ${sessionId}`,
    `\n  blob size : ${(blob.size / 1024).toFixed(1)} KB`,
    `\n  mime type : ${blob.type || "unknown"}`,
    `\n  prompt    : "${prompt}"`,
  );

  // ── POST to backend ────────────────────────────────────────────────────────
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      body,
      // Do NOT set Content-Type manually — the browser must set it so that
      // the multipart boundary is included in the header automatically.
    });
  } catch (networkErr) {
    const msg =
      networkErr instanceof Error
        ? networkErr.message
        : "Network request failed";
    console.error("[FashionAI] Network error:", networkErr);
    throw new Error(
      `Could not reach the FashionAI backend at ${apiBase}. ` +
        `Make sure the server is running (uvicorn app.main:app --port 8000). ` +
        `Detail: ${msg}`,
    );
  }

  // ── Parse error responses ──────────────────────────────────────────────────
  if (!response.ok) {
    let detail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errBody = await response.json();
      if (typeof errBody?.detail === "string") {
        detail = errBody.detail;
      }
    } catch {
      // response body was not JSON — keep the status-line detail
    }
    console.error("[FashionAI] Backend error:", detail);
    throw new Error(`Backend returned an error: ${detail}`);
  }

  // ── Parse success response ─────────────────────────────────────────────────
  const data: BackendVideoProcessResponse = await response.json();

  if (data.status !== "completed") {
    throw new Error(
      `Backend job ${data.job_id} ended with unexpected status: "${data.status}"`,
    );
  }

  console.info(
    "[FashionAI] Generation complete.",
    `\n  job_id     : ${data.job_id}`,
    `\n  output_url : ${data.output_url}`,
    `\n  frames     : ${data.frames_processed} / ${data.frames_extracted}`,
    `\n  took       : ${(data.processing_time_ms / 1000).toFixed(2)} s`,
  );

  // ── Map backend response → frontend result shape ───────────────────────────
  return {
    outputUrl: data.output_url,
    prompt: data.prompt,
    meta: {
      modelVersion: "fashionai-diffusion-v0.1",
      processingMs: data.processing_time_ms,
      generatedAt: new Date().toISOString(),
      framesExtracted: data.frames_extracted,
      framesProcessed: data.frames_processed,
      inputMetadata: data.metadata,
    },
  };
}
