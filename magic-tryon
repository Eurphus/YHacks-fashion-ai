Magic-TryOn local run notes

Environment
- Repo root: /home/sebastian/Documents/VSCode/magic-tryon
- Conda env: magictryon
- GPU tested: NVIDIA GeForce RTX 4090

Activate and run
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate magictryon

Image demo
CUDA_VISIBLE_DEVICES=0 python inference/image_tryon/predict_image_tryon_up.py

Video demo
CUDA_VISIBLE_DEVICES=0 python inference/video_tryon/predict_video_tryon_up.py

What was validated
- The 14B checkpoint in weights/MagicTryOn_14B_V1 loaded successfully.
- The image demo produced a PNG output.
- The video demo produced an MP4 output.

Verified generated files
- samples/Image-Demo-up/sanity_check/00055_00/00055_00_00345_00.png
- samples/Video-Demo-up/sanity_check/upper_body/1219222_detail/1219222_detail_00345_00.mp4

Observed timing on this machine
- One image sample: about 3 to 4 minutes
- One video sample: about 11 minutes

Notes
- weights/ is intentionally ignored and should not be committed.
- The image script saves a single-frame PNG because it runs with to_video = False.
- The video script is the correct entrypoint when an MP4 output is required.
