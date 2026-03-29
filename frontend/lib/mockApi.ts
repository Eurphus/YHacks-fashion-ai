// ── Mock Backend API ───────────────────────────────────────────────────────────
//
// Simulates an AI video-generation pipeline.
// In production this would POST the blob + prompt to a real inference endpoint
// and poll / stream back a result URL.
// ──────────────────────────────────────────────────────────────────────────────

export interface ProcessVideoResult {
  /** URL of the AI-generated output video */
  outputUrl: string;
  /** Echo of the prompt that was submitted */
  prompt: string;
  /** Simulated model metadata */
  meta: {
    modelVersion: string;
    processingMs: number;
    generatedAt: string;
  };
}

/**
 * processVideoMutation
 *
 * Accepts the recorded video Blob and a text prompt, simulates an 8-second
 * round-trip to an AI generation service, then resolves with a hardcoded
 * "AI-generated" video URL.
 *
 * @param blob   - The MediaRecorder output blob (video/webm or video/mp4)
 * @param prompt - The user's natural-language styling instruction
 */
export async function processVideoMutation(
  blob: Blob,
  prompt: string
): Promise<ProcessVideoResult> {
  const startedAt = Date.now();

  // Log submission details (useful during development / QA)
  console.info(
    "[FashionAI] Submitting for generation…",
    `\n  blob size : ${(blob.size / 1024).toFixed(1)} KB`,
    `\n  mime type : ${blob.type || "unknown"}`,
    `\n  prompt    : "${prompt}"`
  );

  // ── Simulate network + inference latency (8 seconds) ─────────────────────
  await new Promise<void>((resolve) => setTimeout(resolve, 8_000));

  const processingMs = Date.now() - startedAt;

  // ── Hardcoded dummy result ────────────────────────────────────────────────
  //
  // This is a freely-licensed, publicly accessible sample MP4 that acts as a
  // stand-in for the real AI-generated output.  Swap this URL for an actual
  // signed object-storage URL once the real pipeline is wired up.
  //
  const MOCK_OUTPUT_URL =
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4";

  const result: ProcessVideoResult = {
    outputUrl: MOCK_OUTPUT_URL,
    prompt,
    meta: {
      modelVersion: "fashionai-diffusion-v0.1-mock",
      processingMs,
      generatedAt: new Date().toISOString(),
    },
  };

  console.info(
    "[FashionAI] Generation complete.",
    `\n  output url : ${result.outputUrl}`,
    `\n  took       : ${(processingMs / 1000).toFixed(2)}s`
  );

  return result;
}
