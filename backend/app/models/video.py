# ---------------------------------------------------------------------------
# Shared API contract — backend ↔ frontend
#
# IMPORTANT: This file is the single source of truth for the shape of every
# request and response in the video-processing pipeline.
#
# If you add, rename, or remove a field here you MUST mirror that change in:
#   frontend/lib/mockApi.ts  →  BackendVideoProcessResponse interface
# ---------------------------------------------------------------------------

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ProcessingStatus(str, Enum):
    pending    = "pending"
    processing = "processing"
    completed  = "completed"
    failed     = "failed"


class VideoMetadata(BaseModel):
    # Technical properties extracted / reported from the uploaded clip
    input_width:      int   = Field(..., description="Width of the input video in pixels")
    input_height:     int   = Field(..., description="Height of the input video in pixels")
    input_fps:        float = Field(..., description="Frame rate of the input video")
    input_duration_s: float = Field(..., description="Duration of the input video in seconds")
    input_format:     str   = Field(..., description="MIME type reported by the client (e.g. video/webm)")
    input_size_bytes: int   = Field(..., description="Raw byte size of the uploaded file")


class VideoProcessResponse(BaseModel):
    # Primary job identity
    job_id:  str             = Field(..., description="UUID4 identifier for this processing job")
    status:  ProcessingStatus = Field(..., description="Current status of the job")

    # Where to find the result
    output_url: str = Field(
        ...,
        description=(
            "Absolute URL to stream the processed MP4 video. "
            "Maps directly to GET /api/v1/video/result/{job_id}."
        ),
    )

    # Processing telemetry
    frames_extracted:   int   = Field(..., description="Frames extracted from the input video")
    frames_processed:   int   = Field(..., description="Frames processed by the AI pipeline")
    processing_time_ms: float = Field(..., description="Total wall-clock time in milliseconds")

    # Echo of the submitted prompt (useful for the frontend to display)
    prompt: str = Field(..., description="The style instruction submitted with this job")

    # Input video properties
    metadata: VideoMetadata


class FrameProcessingResult(BaseModel):
    # Granular per-frame result — used internally and in debug logging
    frame_index: int            = Field(..., description="Zero-based frame position in the video")
    success:     bool           = Field(..., description="Whether the frame was processed without error")
    error:       Optional[str]  = Field(None, description="Error message if success is False")
