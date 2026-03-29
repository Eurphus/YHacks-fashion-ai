import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import video as video_router
from app.core.config import settings

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)

logger = logging.getLogger(__name__)

JOBS_DIR = Path(settings.jobs_dir)
SESSIONS_DIR = Path(settings.sessions_dir)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    JOBS_DIR.mkdir(parents=True, exist_ok=True)
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    logger.info("FashionAI backend started.")
    logger.info("  jobs dir  : %s", JOBS_DIR.resolve())
    logger.info("  sessions  : %s", SESSIONS_DIR.resolve())
    logger.info("  CORS      : %s", settings.cors_origins)
    logger.info("  docs      : http://%s:%s/docs", settings.host, settings.port)
    yield
    # Shutdown
    logger.info("FashionAI backend stopped.")


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="FashionAI Backend",
    description=(
        "Processes recorded outfit videos through an AI style-transfer pipeline. "
        "Extracts frames at native frame rate, runs per-frame model inference, "
        "stitches the result into an MP4, and returns a streamable URL."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Length"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(video_router.router, prefix="/api/v1")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["health"], summary="Liveness probe")
async def health_check() -> dict:
    return {"status": "ok", "service": "fashionai-backend", "version": "0.1.0"}
