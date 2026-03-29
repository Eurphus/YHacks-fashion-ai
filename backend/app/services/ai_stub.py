# ---------------------------------------------------------------------------
# AI Frame Processing Stub
# ---------------------------------------------------------------------------
#
# This module is the only place that needs to change when connecting a real
# AI model.  The rest of the pipeline (extraction, stitching, HTTP layer)
# is model-agnostic.
#
# Contract
# --------
#   Input  : PIL.Image.Image  —  RGB mode, any spatial size
#   Output : PIL.Image.Image  —  RGB mode, SAME spatial size as the input
#
# Current behaviour
# -----------------
#   Identity transform: each frame is returned unchanged.
#   A 0 ms per-frame overhead is added so profiling shows real bottlenecks.
#
# To wire in a real model, replace the body of process_frame(), e.g.:
#
#   # Diffusion-based style transfer (illustrative pseudo-code)
#   def process_frame(image, prompt, frame_index):
#       encoded = vae_encoder(image)
#       latent  = diffusion_model(encoded, prompt_embedding(prompt))
#       return vae_decoder(latent)
#
# ---------------------------------------------------------------------------

import logging

from PIL import Image

logger = logging.getLogger(__name__)


def process_frame(
    image: Image.Image,
    prompt: str,
    frame_index: int,
    context: dict | None = None,
) -> Image.Image:
    # Apply AI style transfer to a single video frame.
    #
    # Args:
    #   image       — input frame as a Pillow RGB Image
    #   prompt      — the user natural-language style instruction
    #   frame_index — zero-based position of this frame in the video sequence
    #
    # Returns:
    #   Processed frame as a Pillow RGB Image with identical spatial dimensions.

    if context and frame_index == 0:
        logger.info(
            "AI stub received request context | session=%s | photo=%s | garments=%d",
            context.get("session_id"),
            context.get("reference_photo_path"),
            len(context.get("selected_garments", [])),
        )

    logger.debug("frame %05d | stub identity transform | prompt=%.40s", frame_index, prompt)

    # ── STUB: identity transform ─────────────────────────────────────────────
    # Replace this single line with a real model call.
    return image.copy()
