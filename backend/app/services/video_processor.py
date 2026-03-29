# ---------------------------------------------------------------------------
# Video Processing Pipeline
# ---------------------------------------------------------------------------
#
# Orchestrates the full frame-level pipeline:
#
#   1. Read    — decode every frame from the input video via FFmpeg
#   2. Archive — save raw frames as JPEG to job_dir/frames_raw/
#   3. Process — run each frame through ai_stub.process_frame()
#   4. Archive — save processed frames to job_dir/frames_processed/
#   5. Stitch  — encode processed frames back into H.264 MP4
#
# FFmpeg is provided automatically by the imageio-ffmpeg package which
# downloads a static binary on first use; no system install is required.
#
# This module is intentionally synchronous.  The async HTTP layer
# (api/v1/video.py) runs it in a ThreadPoolExecutor to avoid blocking
# the asyncio event loop.
#
# ---------------------------------------------------------------------------

import logging
import subprocess
from pathlib import Path

import imageio
import imageio_ffmpeg
import numpy as np
from PIL import Image

from app.services.ai_stub import process_frame
from app.services.garment_context import build_generation_context

logger = logging.getLogger(__name__)

# Used when the video metadata does not report a frame rate.
_FALLBACK_FPS: float = 24.0


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _ndarray_to_pil(frame: np.ndarray) -> Image.Image:
    # Convert a uint8 (H, W, C) numpy array in RGB order to a PIL Image.
    return Image.fromarray(frame.astype(np.uint8), mode="RGB")


def _pil_to_ndarray(image: Image.Image) -> np.ndarray:
    # Convert a PIL Image to a uint8 (H, W, C) numpy array in RGB order.
    return np.array(image.convert("RGB"), dtype=np.uint8)


def _read_frames(
    video_path: Path,
) -> tuple[list[np.ndarray], float, tuple[int, int]]:
    # Decode every frame from *video_path* using the imageio ffmpeg backend.
    #
    # Returns:
    #   frames — list of (H, W, 3) uint8 numpy arrays in RGB order
    #   fps    — detected frame rate (falls back to _FALLBACK_FPS)
    #   size   — (width, height) tuple

    frames: list[np.ndarray] = []
    fps = _FALLBACK_FPS
    width, height = 1280, 720

    try:
        reader = imageio.get_reader(str(video_path), format="ffmpeg")
        meta = reader.get_meta_data()

        detected_fps = meta.get("fps")
        if detected_fps and float(detected_fps) > 0:
            fps = float(detected_fps)

        if "size" in meta:
            # imageio reports size as (width, height)
            width, height = int(meta["size"][0]), int(meta["size"][1])

        for raw_frame in reader:
            frames.append(np.asarray(raw_frame))

        reader.close()

    except Exception as exc:
        raise RuntimeError(
            f"Could not read video file '{video_path.name}': {exc}"
        ) from exc

    logger.info(
        "Read %d frames from '%s'  fps=%.2f  size=%dx%d",
        len(frames),
        video_path.name,
        fps,
        width,
        height,
    )
    return frames, fps, (width, height)


def _normalize_input_video(input_path: Path, job_dir: Path) -> Path:
    # Browser-recorded WebM files can carry a 1k time base with missing/zero
    # duration metadata. imageio then expands them into thousands of duplicate
    # frames. Re-encode to a stable CFR MP4 first so downstream frame reads are
    # predictable.
    normalized_path = job_dir / "normalized_input.mp4"
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

    cmd = [
        ffmpeg_exe,
        "-y",
        "-i",
        str(input_path),
        "-vf",
        f"fps={_FALLBACK_FPS}",
        "-an",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "fast",
        "-crf",
        "22",
        str(normalized_path),
    ]

    try:
        completed = subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(
            f"Could not normalize input video '{input_path.name}': {exc.stderr.strip()}"
        ) from exc

    logger.info(
        "Normalized input video '%s' -> '%s'",
        input_path.name,
        normalized_path.name,
    )
    if completed.stderr:
        logger.debug("ffmpeg normalize log:\n%s", completed.stderr.strip())

    return normalized_path


def _save_frames(frames: list[np.ndarray], out_dir: Path, stage_label: str) -> None:
    # Persist a list of frames as numbered JPEG files for inspection/debugging.
    out_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames):
        _ndarray_to_pil(frame).save(
            out_dir / f"frame_{i:06d}.jpg",
            format="JPEG",
            quality=95,
        )
    logger.debug("Saved %d %s frames → %s", len(frames), stage_label, out_dir)


def _process_frames(
    raw_frames: list[np.ndarray],
    out_dir: Path,
    prompt: str,
    generation_context: dict | None = None,
) -> list[np.ndarray]:
    # Run each raw frame through the AI stub and persist the results.
    #
    # Returns a list of processed frames as numpy arrays.

    out_dir.mkdir(parents=True, exist_ok=True)
    processed: list[np.ndarray] = []

    for i, frame in enumerate(raw_frames):
        pil_in  = _ndarray_to_pil(frame)
        pil_out = process_frame(pil_in, prompt, i, generation_context)

        # Ensure the output image has the same spatial dimensions as the input.
        # A real model should honour this contract; we enforce it defensively.
        if pil_out.size != pil_in.size:
            pil_out = pil_out.resize(pil_in.size, Image.LANCZOS)

        pil_out.save(out_dir / f"frame_{i:06d}.jpg", format="JPEG", quality=95)
        processed.append(_pil_to_ndarray(pil_out))

    logger.info("Processed %d / %d frames", len(processed), len(raw_frames))
    return processed


def _stitch_video(
    frames: list[np.ndarray],
    output_path: Path,
    fps: float,
) -> None:
    # Encode processed frames into an H.264 MP4 using imageio + ffmpeg.
    #
    # libx264 with yuv420p pixel format produces a video that plays in every
    # major browser without requiring transcoding on the client side.

    try:
        writer = imageio.get_writer(
            str(output_path),
            format="ffmpeg",
            fps=fps,
            codec="libx264",
            pixelformat="yuv420p",
            # macro_block_size forces W and H to be multiples of 16,
            # which is required by some H.264 decoders.
            macro_block_size=16,
            # Additional FFmpeg quality flags passed verbatim.
            # CRF 22 is visually near-lossless for 720p content.
            output_params=["-crf", "22", "-preset", "fast"],
        )
        for frame in frames:
            writer.append_data(frame)
        writer.close()

    except Exception as exc:
        raise RuntimeError(f"Could not write output video: {exc}") from exc

    size_kb = output_path.stat().st_size / 1024
    logger.info("Stitched video → %s  (%.1f KB)", output_path.name, size_kb)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_pipeline(
    input_path: Path,
    job_dir: Path,
    prompt: str,
    session_id: str | None = None,
) -> dict:
    # Execute the full video-processing pipeline synchronously.
    #
    # Intended to be called via asyncio.get_event_loop().run_in_executor()
    # from the async HTTP handler so the event loop is not blocked.
    #
    # Args:
    #   input_path — path to the uploaded video file (WebM or MP4)
    #   job_dir    — working directory for this job (already exists)
    #   prompt     — user style instruction string
    #
    # Returns:
    #   dict with keys: frames_extracted, frames_processed, fps,
    #                   width, height, duration_s, output_path

    job_dir.mkdir(parents=True, exist_ok=True)

    # 1. Normalize to a sane CFR source, then decode.
    normalized_input_path = _normalize_input_video(input_path, job_dir)
    raw_frames, fps, (width, height) = _read_frames(normalized_input_path)

    if not raw_frames:
        raise RuntimeError(
            "No frames could be extracted from the uploaded video.  "
            "The file may be empty, corrupt, or in an unsupported format."
        )

    # 2. Archive raw frames (useful for debugging / QA)
    _save_frames(raw_frames, job_dir / "frames_raw", "raw")

    # Build the AI request from prompt + representative input photo + retrieved garments.
    reference_frame_path = job_dir / "reference_photo.jpg"
    _ndarray_to_pil(raw_frames[len(raw_frames) // 2]).save(reference_frame_path, format="JPEG", quality=95)
    generation_context = build_generation_context(
        prompt=prompt,
        session_id=session_id,
        reference_photo_path=reference_frame_path,
        job_dir=job_dir,
    )

    # 3 & 4. Process and archive
    processed_frames = _process_frames(
        raw_frames,
        job_dir / "frames_processed",
        generation_context["effective_prompt"],
        generation_context,
    )

    # 5. Stitch
    output_path = job_dir / "output.mp4"
    _stitch_video(processed_frames, output_path, fps)

    return {
        "frames_extracted": len(raw_frames),
        "frames_processed": len(processed_frames),
        "fps":              fps,
        "width":            width,
        "height":           height,
        "duration_s":       len(raw_frames) / fps,
        "output_path":      str(output_path),
        "session_id":       generation_context["session_id"],
        "effective_prompt": generation_context["effective_prompt"],
        "selected_garments": generation_context["selected_garments"],
    }
