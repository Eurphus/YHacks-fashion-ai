import asyncio
import logging
import time
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from app.core.config import settings
from app.models.video import ProcessingStatus, VideoMetadata, VideoProcessResponse
from app.services import video_processor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/video", tags=["video"])

JOBS_DIR = Path(settings.jobs_dir)

# Simulated AI generation latency.
# Replace with 0 (or remove the sleep entirely) once a real model is wired in.
_AI_PSEUDO_DELAY_S: float = 5.0


# ---------------------------------------------------------------------------
# POST /process
# ---------------------------------------------------------------------------

@router.post(
    "/process",
    response_model=VideoProcessResponse,
    summary="Process a recorded outfit video",
    description=(
        "Accepts a raw recorded video and a natural-language style prompt. "
        "Extracts every frame at the video native frame rate, passes each "
        "through the AI style-transfer service, stitches the result into an "
        "H.264 MP4, and returns metadata including a URL to stream it."
    ),
)
async def process_video(
    request: Request,
    video: Annotated[
        UploadFile,
        File(description="Recorded outfit video (WebM or MP4, max 5 s, 720p / 24 fps)"),
    ],
    prompt: Annotated[
        str,
        Form(
            min_length=1,
            max_length=2_000,
            description="Natural-language style instruction.",
        ),
    ],
) -> VideoProcessResponse:
    # ── Create an isolated working directory for this job ────────────────────
    job_id = str(uuid.uuid4())
    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Job %s | started  prompt=%.60s", job_id, prompt)

    # ── Persist the uploaded video ───────────────────────────────────────────
    raw_bytes = await video.read()
    suffix = Path(video.filename or "recording.webm").suffix or ".webm"
    input_path = job_dir / f"input{suffix}"
    input_path.write_bytes(raw_bytes)

    logger.info(
        "Job %s | input saved  file=%s  size=%.1f KB",
        job_id,
        input_path.name,
        len(raw_bytes) / 1024,
    )

    # ── Run the CPU-bound pipeline in a thread-pool executor ─────────────────
    # This keeps the asyncio event loop free to handle other requests
    # while the frame extraction and stitching run in a background thread.
    t_wall = time.monotonic()

    loop = asyncio.get_event_loop()
    try:
        pipeline_result = await loop.run_in_executor(
            None,                        # use the default ThreadPoolExecutor
            video_processor.run_pipeline,
            input_path,
            job_dir,
            prompt,
        )
    except RuntimeError as exc:
        logger.error("Job %s | pipeline failed: %s", job_id, exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    # ── Pseudo AI processing delay ───────────────────────────────────────────
    # Simulates real model inference latency.  The sleep is async so it does
    # not block the event loop; other requests continue to be served normally.
    logger.info(
        "Job %s | pipeline done, applying %.0f s pseudo delay", job_id, _AI_PSEUDO_DELAY_S
    )
    await asyncio.sleep(_AI_PSEUDO_DELAY_S)

    elapsed_ms = (time.monotonic() - t_wall) * 1_000

    # ── Build the absolute output URL ────────────────────────────────────────
    # Derive the base URL from the incoming request so the response works
    # regardless of which host/port the server is running on.
    base_url = str(request.base_url).rstrip("/")
    output_url = f"{base_url}/api/v1/video/result/{job_id}"

    response = VideoProcessResponse(
        job_id=job_id,
        status=ProcessingStatus.completed,
        output_url=output_url,
        frames_extracted=pipeline_result["frames_extracted"],
        frames_processed=pipeline_result["frames_processed"],
        processing_time_ms=round(elapsed_ms, 2),
        prompt=prompt,
        metadata=VideoMetadata(
            input_width=pipeline_result["width"],
            input_height=pipeline_result["height"],
            input_fps=pipeline_result["fps"],
            input_duration_s=pipeline_result["duration_s"],
            input_format=video.content_type or "video/webm",
            input_size_bytes=len(raw_bytes),
        ),
    )

    logger.info(
        "Job %s | complete  frames=%d  time=%.0f ms  url=%s",
        job_id,
        pipeline_result["frames_processed"],
        elapsed_ms,
        output_url,
    )
    return response


# ---------------------------------------------------------------------------
# GET /result/{job_id}
# ---------------------------------------------------------------------------

@router.get(
    "/result/{job_id}",
    summary="Stream a processed video",
    description=(
        "Returns the H.264 MP4 output for a completed job. "
        "Supports HTTP range requests so the browser can seek within the video."
    ),
    response_class=FileResponse,
    responses={
        200: {"content": {"video/mp4": {}}, "description": "Processed video stream"},
        400: {"description": "Malformed job ID"},
        404: {"description": "Job not found or not yet complete"},
    },
)
async def get_video_result(job_id: str) -> FileResponse:
    # Basic path-traversal guard — job IDs are UUID4s (hex + hyphens only)
    if not all(c in "0123456789abcdef-" for c in job_id.lower()):
        raise HTTPException(status_code=400, detail="Invalid job ID format.")

    output_path = JOBS_DIR / job_id / "output.mp4"

    if not output_path.is_file():
        raise HTTPException(
            status_code=404,
            detail=f"No result found for job {job_id!r}. "
                   "The job may still be processing or the ID is invalid.",
        )

    return FileResponse(
        path=str(output_path),
        media_type="video/mp4",
        filename=f"fashionai_{job_id[:8]}.mp4",
        headers={
            "Cache-Control": "public, max-age=3600",
            "Accept-Ranges": "bytes",
        },
    )
