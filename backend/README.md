# FashionAI Backend

FastAPI backend for the FashionAI Studio outfit-transformation pipeline.

## Quick start

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate      # macOS / Linux

# 2. Install dependencies
#    imageio-ffmpeg downloads a static FFmpeg binary on first run —
#    no separate FFmpeg installation required.
pip install -r requirements.txt

# 3. (Optional) copy the example environment file
cp .env.example .env

# 4. Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive API docs: http://localhost:8000/docs

---

## API contract

### `POST /api/v1/video/process`

**Request** — `multipart/form-data`

| Field  | Type   | Description                                 |
|--------|--------|---------------------------------------------|
| video  | file   | Recorded outfit video (WebM or MP4, ≤5 s)   |
| prompt | string | Natural-language style instruction          |

**Response** — `application/json`

```json
{
  "job_id":             "3f2a…",
  "status":             "completed",
  "output_url":         "http://localhost:8000/api/v1/video/result/3f2a…",
  "frames_extracted":   120,
  "frames_processed":   120,
  "processing_time_ms": 6241.5,
  "prompt":             "Make my shirt a vintage denim jacket",
  "metadata": {
    "input_width":      1280,
    "input_height":     720,
    "input_fps":        24.0,
    "input_duration_s": 5.0,
    "input_format":     "video/webm",
    "input_size_bytes": 2000000
  }
}
```

> The `output_url` field is a fully-qualified URL that the frontend
> `<video>` element can use directly as its `src`.

### `GET /api/v1/video/result/{job_id}`

Streams the processed MP4.  Supports HTTP range requests for video seeking.

### `GET /health`

Returns `{"status": "ok"}`.

---

## Project layout

```
app/
├── main.py                FastAPI app, CORS middleware, lifespan
├── api/v1/
│   └── video.py           POST /process  +  GET /result endpoints
├── core/
│   └── config.py          pydantic-settings (reads .env)
├── models/
│   └── video.py           Shared Pydantic request/response models
└── services/
    ├── ai_stub.py         Per-frame AI processor  ← swap this for a real model
    └── video_processor.py Extract → process → stitch pipeline
jobs/                      Runtime artefacts (gitignored)
```

---

## Swapping in a real AI model

Open `app/services/ai_stub.py` and replace the body of `process_frame`:

```python
def process_frame(image: Image.Image, prompt: str, frame_index: int) -> Image.Image:
    # TODO: call your real model here, e.g.:
    #   result = my_model.infer(image=image, prompt=prompt)
    #   return result
    return image.copy()   # ← remove this line
```

The contract is intentionally simple:

- **Input**  `PIL.Image.Image` (RGB, any spatial size)
- **Output** `PIL.Image.Image` (RGB, same spatial size as input)
