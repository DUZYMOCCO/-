#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ABYSS DIVE — ComfyUI ローカル API 呼び出し CLI（Hermes / 環境アート共通）

D:\\AI\\ComfyUI（既定 http://127.0.0.1:8188）へ txt2img / img2img ワークフローを投げ、
厚塗りペイント原画を生成して RGBA WebP / PNG として保存する。

使い方例:
  # 接続＆モデル確認
  python abyss-depth-lab/tools/comfy_gen.py --check

  # 1) 新規パーツ生成（txt2img + 自動背景透過）
  python abyss-depth-lab/tools/comfy_gen.py \\
    --prompt "giant deep-sea armored crab leg segment, dark weathered basalt chitin, barnacles, rust, bioluminescent cyan crevices" \\
    --model dreamshaper --width 768 --height 768 --remove-bg \\
    --out abyss-depth-lab/assets/crab_leg_upper.webp

  # 2) Blender / Pillow 仮絵の厚塗りリペイント（img2img: 関節位置・シルエットを維持）
  python abyss-depth-lab/tools/comfy_gen.py \\
    --mode img2img --input path/to/blockout.png --denoise 0.58 \\
    --prompt "deep-sea giant crab armored leg, wet chitin plates, barnacles, scratches, heavy painterly shading" \\
    --model dreamshaper --remove-bg \\
    --out abyss-depth-lab/assets/crab_leg_upper.webp
"""

import argparse
import io
import json
import os
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from collections import deque

DEFAULT_SERVER = os.environ.get("COMFYUI_URL", "http://127.0.0.1:8188").rstrip("/")

MODEL_PRESETS = {
    "dreamshaper": r"SD1.5\dreamshaper_8.safetensors",
    "realistic":   r"SD1.5\realisticVisionV60B1_v50VAE.safetensors",
    "sdxl":        r"SDXL\sd_xl_base_1.0_0.9vae.safetensors",
    "juggernaut":  r"SDXL\Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors",
}

STYLE_PREFIX = (
    "semi-realistic painterly 2D game asset, high-density weathered deep-sea texture, "
    "rich volumetric lighting and micro-detail, wet surface, scratches, barnacles, "
    "no black outlines, no cel shading, isolated single object centered on solid uniform #00ff00 green background"
)

DEFAULT_NEGATIVE = (
    "anime lineart, black outline, flat vector, plastic pipe, untextured primitive, "
    "cel shaded, cartoon, blurry, lowres, watermark, text, frame, border, multiple views, busy background"
)


def api_json(server: str, path: str, data: dict | None = None, timeout: int = 30):
    url = f"{server}{path}"
    if data is not None:
        raw = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(url, data=raw, headers={"Content-Type": "application/json"}, method="POST")
    else:
        req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        raise RuntimeError(
            f"ComfyUI ({server}) に接続できません: {e}\n"
            r"先に D:\AI\ComfyUI\run_nvidia_gpu.bat を起動してから再実行してください。"
        ) from e


def upload_image(server: str, image_path: str) -> str:
    boundary = f"----ComfyBoundary{uuid.uuid4().hex}"
    filename = os.path.basename(image_path)
    with open(image_path, "rb") as f:
        img_bytes = f.read()

    parts = [
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="image"; filename="{filename}"\r\n'
        f"Content-Type: application/octet-stream\r\n\r\n".encode("utf-8"),
        img_bytes,
        f"\r\n--{boundary}\r\n"
        f'Content-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n'
        f"--{boundary}--\r\n".encode("utf-8"),
    ]
    body = b"".join(parts)
    req = urllib.request.Request(
        f"{server}/upload/image",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        res = json.loads(resp.read().decode("utf-8"))
    return res["name"]


def build_workflow(
    ckpt_name: str,
    prompt: str,
    negative: str,
    width: int,
    height: int,
    steps: int,
    cfg: float,
    seed: int,
    mode: str,
    uploaded_name: str | None = None,
    denoise: float = 1.0,
) -> dict:
    wf = {
        "1": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": ckpt_name},
        },
        "2": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": prompt, "clip": ["1", 1]},
        },
        "3": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": negative, "clip": ["1", 1]},
        },
        "5": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
                "steps": steps,
                "cfg": cfg,
                "sampler_name": "dpmpp_2m",
                "scheduler": "karras",
                "denoise": denoise if mode == "img2img" else 1.0,
                "model": ["1", 0],
                "positive": ["2", 0],
                "negative": ["3", 0],
                "latent_image": ["4", 0],
            },
        },
        "6": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["5", 0], "vae": ["1", 2]},
        },
        "7": {
            "class_type": "SaveImage",
            "inputs": {"filename_prefix": "abyss_gen", "images": ["6", 0]},
        },
    }

    if mode == "img2img":
        if not uploaded_name:
            raise ValueError("img2img モードでは --input の指定が必要です。")
        wf["8"] = {
            "class_type": "LoadImage",
            "inputs": {"image": uploaded_name},
        }
        wf["4"] = {
            "class_type": "VAEEncode",
            "inputs": {"pixels": ["8", 0], "vae": ["1", 2]},
        }
    else:
        wf["4"] = {
            "class_type": "EmptyLatentImage",
            "inputs": {"width": width, "height": height, "batch_size": 1},
        }
    return wf


def wait_for_result(server: str, prompt_id: str, timeout: int = 300) -> bytes:
    t0 = time.time()
    while time.time() - t0 < timeout:
        hist = api_json(server, f"/history/{prompt_id}")
        if prompt_id in hist:
            outputs = hist[prompt_id].get("outputs", {})
            for node_out in outputs.values():
                imgs = node_out.get("images")
                if imgs:
                    info = imgs[0]
                    qs = urllib.parse.urlencode({
                        "filename": info["filename"],
                        "subfolder": info.get("subfolder", ""),
                        "type": info.get("type", "output"),
                    })
                    with urllib.request.urlopen(f"{server}/view?{qs}", timeout=30) as resp:
                        return resp.read()
            status = hist[prompt_id].get("status", {})
            raise RuntimeError(f"ComfyUI 出力が空です: {status}")
        time.sleep(0.5)
    raise TimeoutError(f"ComfyUI の生成が {timeout} 秒以内に完了しませんでした。")


def remove_edge_bg(img, tolerance: int = 42):
    """四隅の色からフラッドフィルで単色背景を透過抜きし、エッジのグリーン/背景フリンジを抑える。"""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()

    corners = [px[0, 0][:3], px[w - 1, 0][:3], px[0, h - 1][:3], px[w - 1, h - 1][:3]]
    bg_r = sum(c[0] for c in corners) / 4.0
    bg_g = sum(c[1] for c in corners) / 4.0
    bg_b = sum(c[2] for c in corners) / 4.0

    def dist(rgb):
        return ((rgb[0] - bg_r) ** 2 + (rgb[1] - bg_g) ** 2 + (rgb[2] - bg_b) ** 2) ** 0.5

    visited = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            idx = y * w + x
            if not visited[idx] and dist(px[x, y][:3]) <= tolerance:
                visited[idx] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            idx = y * w + x
            if not visited[idx] and dist(px[x, y][:3]) <= tolerance:
                visited[idx] = 1
                q.append((x, y))

    while q:
        cx, cy = q.popleft()
        px[cx, cy] = (0, 0, 0, 0)
        for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                idx = ny * w + nx
                if not visited[idx] and dist(px[nx, ny][:3]) <= tolerance:
                    visited[idx] = 1
                    q.append((nx, ny))

    # 境界 1px の背景色かぶり（グリーンフリンジ等）を軽くフェザー処理
    feather = tolerance * 1.45
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if (
                px[x - 1, y][3] == 0 or px[x + 1, y][3] == 0
                or px[x, y - 1][3] == 0 or px[x, y + 1][3] == 0
            ):
                d = dist((r, g, b))
                if d < feather:
                    na = int(255 * max(0.0, (d - tolerance * 0.6) / (feather - tolerance * 0.6)))
                    # グリーンバック由来なら G チャンネルを周辺 R/B 平均へ寄せてフリンジ除去
                    if bg_g > bg_r + 40 and bg_g > bg_b + 40 and g > max(r, b):
                        g = int((r + b) * 0.5)
                    px[x, y] = (r, g, b, na)

    bbox = rgba.getbbox()
    return rgba.crop(bbox) if bbox else rgba


def main():
    ap = argparse.ArgumentParser(description="ABYSS DIVE ComfyUI sprite generator")
    ap.add_argument("--server", default=DEFAULT_SERVER, help="ComfyUI API URL (default: http://127.0.0.1:8188)")
    ap.add_argument("--check", action="store_true", help="接続と利用可能なチェックポイント一覧を確認して終了")
    ap.add_argument("--mode", choices=["txt2img", "img2img"], default="txt2img")
    ap.add_argument("--model", default="juggernaut", help="juggernaut | dreamshaper | realistic | sdxl | 任意の ckpt_name")
    ap.add_argument("--prompt", default="", help="生成プロンプト（英語推奨）")
    ap.add_argument("--negative", default=DEFAULT_NEGATIVE)
    ap.add_argument("--no-style", action="store_true", help="ABYSS DIVE 共通スタイル接頭辞を付与しない")
    ap.add_argument("--input", default="", help="img2img 用の下絵画像パス")
    ap.add_argument("--denoise", type=float, default=0.58, help="img2img の変化量 (0.35〜0.75 推奨)")
    ap.add_argument("--width", type=int, default=0, help="出力幅 (既定: SD1.5=768, SDXL=1024)")
    ap.add_argument("--height", type=int, default=0, help="出力高さ (既定: SD1.5=768, SDXL=1024)")
    ap.add_argument("--steps", type=int, default=28)
    ap.add_argument("--cfg", type=float, default=0.0, help="CFG (0 のときは juggernaut=5.5 / その他=7.0)")
    ap.add_argument("--seed", type=int, default=-1)
    ap.add_argument("--remove-bg", action="store_true", help="単色背景を透過抜きしてトリミングする")
    ap.add_argument("--bg-tol", type=int, default=48, help="背景透過の許容色差 (既定 48)")
    ap.add_argument("--resize", default="", help="保存前リサイズ (例: 512x512)")
    ap.add_argument("--out", default="", help="出力ファイルパス (.webp / .png)")
    args = ap.parse_args()

    if args.check:
        stats = api_json(args.server, "/system_stats")
        obj = api_json(args.server, "/object_info/CheckpointLoaderSimple")
        ckpts = obj["CheckpointLoaderSimple"]["input"]["required"]["ckpt_name"][0]
        print("ComfyUI OK:", stats.get("system", {}).get("comfyui_version", "connected"))
        print("Checkpoints:")
        for c in ckpts:
            print("  -", c)
        return

    if not args.prompt or not args.out:
        ap.error("--prompt と --out を指定してください（接続確認のみは --check）")

    ckpt = MODEL_PRESETS.get(args.model, args.model)
    is_sdxl = ("sdxl" in ckpt.lower()) or (args.model in ("sdxl", "juggernaut"))
    width = args.width or (1024 if is_sdxl else 768)
    height = args.height or (1024 if is_sdxl else 768)
    cfg = args.cfg if args.cfg > 0 else (5.5 if args.model == "juggernaut" else 7.0)
    seed = args.seed if args.seed >= 0 else random.randint(1, 2**31 - 1)
    full_prompt = args.prompt if args.no_style else f"{STYLE_PREFIX}, {args.prompt}"

    uploaded = None
    if args.mode == "img2img":
        if not args.input or not os.path.exists(args.input):
            ap.error("--mode img2img には実在する --input 画像が必要です。")
        uploaded = upload_image(args.server, args.input)

    wf = build_workflow(
        ckpt_name=ckpt,
        prompt=full_prompt,
        negative=args.negative,
        width=width,
        height=height,
        steps=args.steps,
        cfg=cfg,
        seed=seed,
        mode=args.mode,
        uploaded_name=uploaded,
        denoise=args.denoise,
    )

    queued = api_json(args.server, "/prompt", {"prompt": wf, "client_id": uuid.uuid4().hex})
    prompt_id = queued["prompt_id"]
    print(f"[comfy_gen] queued {prompt_id} (model={ckpt}, mode={args.mode}, seed={seed})")
    img_bytes = wait_for_result(args.server, prompt_id)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    ext = os.path.splitext(args.out)[1].lower()
    if args.remove_bg or args.resize or ext == ".webp":
        from PIL import Image
        img = Image.open(io.BytesIO(img_bytes))
        if args.remove_bg:
            img = remove_edge_bg(img, tolerance=args.bg_tol)
        if args.resize:
            rw, rh = [int(x) for x in args.resize.lower().split("x")]
            img = img.resize((rw, rh), Image.LANCZOS)
        if ext == ".webp":
            img.save(args.out, format="WEBP", quality=92, method=6)
        else:
            img.save(args.out)
    else:
        with open(args.out, "wb") as f:
            f.write(img_bytes)

    print(f"[comfy_gen] saved -> {args.out}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"[comfy_gen] ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
