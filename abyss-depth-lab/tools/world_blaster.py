#!/usr/bin/env python3
"""
ABYSS DIVE · DEPTH LAB — Image-to-World / 多層2D＆3Dアセット統合パイプライン CLI
(neilsonnn/image-blaster の設計思想をローカル ComfyUI＋ピンポイント外部 API ハイブリッドへ移植)

使い方:
  1) ローカル無料: 1枚アート → 深度推定(外部深度マップ任意) → WebGL2法線(_n.webp) + 発光(_e.webp) + 遠/中/近景スライス
     python abyss-depth-lab/tools/world_blaster.py slice --input <image.webp> --out-dir <dir> [--depth <depth.png>]

  2) 有料 API (FAL): Hunyuan 3D で単体オブジェクトを PBR 付き .glb 化（潜水艇リアビュー／大型ボス向け）
     set FAL_KEY=xxxx
     python abyss-depth-lab/tools/world_blaster.py hunyuan3d --input <image.webp> --out-dir <dir> [--face-count 50000] [--dry-run]

  3) 有料 API (World Labs): Marble 1.1 で 1枚アートを 3D Gaussian Splatting (.spz) 空間化（海溝回廊／マントル／BH向け）
     set WORLD_LABS_API_KEY=xxxx
     python abyss-depth-lab/tools/world_blaster.py marble --input <image.webp> --out-dir <dir> [--prompt "..."] [--dry-run]

  4) 有料 API (FAL / ElevenLabs): 環境音・物理 SE (.mp3) 生成
     set FAL_KEY=xxxx
     python abyss-depth-lab/tools/world_blaster.py sfx --prompt "deep underwater abyssal current roar" --out <file.mp3> [--duration 8] [--dry-run]

  5) 一気通貫 (blast): ローカル法線・レイヤースライス + 有効な API キーに応じて 3D/空間/SE まで worlds/<slug>/ へ一括生成
     python abyss-depth-lab/tools/world_blaster.py blast --input <image.webp> --slug mantle_canyon [--prompt "..."] [--sfx-prompt "..."] [--dry-run]

API キーは環境変数（FAL_KEY / WORLD_LABS_API_KEY）または abyss-depth-lab/tools/.env.local から自動読み込みします。
"""

import argparse
import base64
import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

TOOLS_DIR = Path(__file__).resolve().parent
ENV_LOCAL = TOOLS_DIR / ".env.local"


def load_env_local():
    """abyss-depth-lab/tools/.env.local があれば環境変数へ未設定キーのみ読み込む（リポジトリ外管理）。"""
    if not ENV_LOCAL.exists():
        return
    for raw in ENV_LOCAL.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        if k and k not in os.environ:
            os.environ[k] = v


def image_to_data_uri(img_path: Path) -> str:
    mime, _ = mimetypes.guess_type(str(img_path))
    mime = mime or "image/png"
    b64 = base64.b64encode(img_path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{b64}"


def http_json(url: str, payload: dict | None = None, headers: dict | None = None, method: str | None = None, timeout: int = 120):
    hdrs = {"Accept": "application/json", "User-Agent": "abyss-world-blaster/1.0"}
    if headers:
        hdrs.update(headers)
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        hdrs.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=data, headers=hdrs, method=method or ("POST" if data is not None else "GET"))
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return json.loads(body) if body.strip() else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code} {url}: {err_body[:400]}") from e


def download_file(url: str, out_path: Path, headers: dict | None = None, timeout: int = 180):
    hdrs = {"User-Agent": "abyss-world-blaster/1.0"}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, headers=hdrs)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        out_path.write_bytes(resp.read())
    return out_path


# ---------------------------------------------------------------------------
# 1. ローカル無料: 深度推定 → WebGL2 法線マップ(_n) + 発光(_e) + Z帯スライス
# ---------------------------------------------------------------------------

_DEPTH_PIPE = None


def run_depth_anything_v2(img_pil: Image.Image, model_id: str = "depth-anything/Depth-Anything-V2-Small-hf") -> np.ndarray:
    """
    ローカル GPU (CUDA) で Depth Anything V2 (Apache-2.0 / 完全無料) を実行し、
    正規化深度マップ (0=遠..1=近, float32) を返す。
    """
    global _DEPTH_PIPE
    import torch
    from transformers import pipeline

    if _DEPTH_PIPE is None:
        device = 0 if torch.cuda.is_available() else -1
        _DEPTH_PIPE = pipeline(task="depth-estimation", model=model_id, device=device)
    res = _DEPTH_PIPE(img_pil.convert("RGB"))
    d_pil = res["depth"].resize(img_pil.size, Image.Resampling.BILINEAR)
    d = np.asarray(d_pil, dtype=np.float32)
    d_min, d_max = float(d.min()), float(d.max())
    if d_max - d_min > 1e-5:
        d = (d - d_min) / (d_max - d_min)
    else:
        d = np.zeros_like(d, dtype=np.float32)
    return np.clip(d, 0.0, 1.0)


def estimate_depth_map(
    rgb: np.ndarray,
    alpha: np.ndarray,
    depth_path: Path | None = None,
    img_pil: Image.Image | None = None,
    depth_engine: str = "auto",
) -> tuple[np.ndarray, str]:
    """
    深度マップ (0=遠..1=近) を生成し、(depth, used_engine) を返す。
      - depth_path 指定時: 外部深度マップをそのまま使用
      - depth_engine == 'ai' または 'auto' で torch/transformers が使える環境:
          ローカル Depth Anything V2 (CUDA) で本物の 3D 幾何深度を推論
      - それ以外: 軽量ヒューリスティックへ自動フォールバック
    """
    h, w = rgb.shape[:2]
    if depth_path and depth_path.exists():
        d_img = Image.open(depth_path).convert("L").resize((w, h), Image.Resampling.BILINEAR)
        d = np.asarray(d_img, dtype=np.float32) / 255.0
        return np.clip(d, 0.0, 1.0), "external_file"

    if depth_engine in ("auto", "ai") and img_pil is not None:
        try:
            d = run_depth_anything_v2(img_pil)
            d = d * (0.20 + 0.80 * alpha)
            return np.clip(d, 0.0, 1.0), "depth_anything_v2_local"
        except Exception as e:
            if depth_engine == "ai":
                raise RuntimeError(f"Depth Anything V2 実行失敗: {e}") from e
            print(f"[world_blaster] Depth Anything V2 unavailable ({e}), falling back to heuristic", file=sys.stderr)

    # フォールバック: 輝度 + 下部ほど手前(垂直バイアス) + 局所エッジ
    lum = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2])
    y_grad = np.linspace(0.18, 0.92, h, dtype=np.float32)[:, None]

    gy, gx = np.gradient(lum)
    edge = np.hypot(gx, gy)
    edge_norm = np.clip(edge / (np.percentile(edge, 96) + 1e-5), 0.0, 1.0)

    raw = np.clip(0.48 * y_grad + 0.34 * lum + 0.18 * edge_norm, 0.0, 1.0)
    d_img = Image.fromarray((raw * 255).astype(np.uint8), mode="L").filter(ImageFilter.GaussianBlur(radius=max(2, min(w, h) // 128)))
    depth = np.asarray(d_img, dtype=np.float32) / 255.0
    depth = depth * (0.25 + 0.75 * alpha)
    return np.clip(depth, 0.0, 1.0), "heuristic"


def depth_to_normal_map(depth: np.ndarray, alpha: np.ndarray, strength: float = 3.2) -> Image.Image:
    """
    深度マップ (0..1) から WebGL2 `depth-bridge.js` 互換のタンジェント空間法線マップ (_n.webp) を生成。
    R = (nx * 0.5 + 0.5), G = (ny * 0.5 + 0.5), B = (nz * 0.5 + 0.5), A = 入力アルファ維持。
    """
    dy, dx = np.gradient(depth)
    nx = -dx * strength
    ny = -dy * strength
    nz = np.ones_like(depth, dtype=np.float32)
    inv_len = 1.0 / np.sqrt(nx * nx + ny * ny + nz * nz + 1e-8)
    nx *= inv_len
    ny *= inv_len
    nz *= inv_len

    out = np.zeros((depth.shape[0], depth.shape[1], 4), dtype=np.uint8)
    out[..., 0] = np.clip((nx * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)
    out[..., 1] = np.clip((ny * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)
    out[..., 2] = np.clip((nz * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)
    out[..., 3] = np.clip(alpha * 255.0, 0, 255).astype(np.uint8)
    return Image.fromarray(out, mode="RGBA")


def extract_emissive_map(rgb: np.ndarray, alpha: np.ndarray, threshold: float = 0.62) -> Image.Image:
    """高輝度かつ彩度の高い発光部（シアン・黄金・琥珀のバイオ発光）を _e.webp として抽出。"""
    mx = np.max(rgb, axis=-1)
    mn = np.min(rgb, axis=-1)
    sat = (mx - mn) / (mx + 1e-5)
    lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    glow = np.clip((lum * (0.55 + 0.75 * sat) - threshold) / (1.0 - threshold + 1e-5), 0.0, 1.0)
    glow = glow * glow * alpha

    out = np.zeros((rgb.shape[0], rgb.shape[1], 4), dtype=np.uint8)
    out[..., :3] = np.clip(rgb * glow[..., None] * 255.0 * 1.25, 0, 255).astype(np.uint8)
    out[..., 3] = np.clip(glow * 255.0, 0, 255).astype(np.uint8)
    return Image.fromarray(out, mode="RGBA")


def slice_depth_layers(rgba: np.ndarray, depth: np.ndarray, out_dir: Path, stem: str) -> dict:
    """深度マップを遠景 (far)・中景 (mid)・近景 (near) のソフト境界 3 レイヤーへ自動分離。"""
    bands = [
        ("far",  0.00, 0.42),
        ("mid",  0.34, 0.72),
        ("near", 0.64, 1.01),
    ]
    paths = {}
    feather = 0.08
    for name, lo, hi in bands:
        m_lo = np.clip((depth - (lo - feather)) / max(1e-5, feather), 0.0, 1.0) if lo > 0 else np.ones_like(depth)
        m_hi = np.clip(((hi + feather) - depth) / max(1e-5, feather), 0.0, 1.0) if hi < 1.0 else np.ones_like(depth)
        mask = m_lo * m_hi
        layer = rgba.copy()
        layer[..., 3] = np.clip(layer[..., 3].astype(np.float32) * mask, 0, 255).astype(np.uint8)
        p = out_dir / f"{stem}_{name}.webp"
        Image.fromarray(layer, mode="RGBA").save(p, format="WEBP", quality=90, method=6)
        paths[name] = str(p)
    return paths


def cmd_slice(args):
    src = Path(args.input).resolve()
    if not src.exists():
        raise FileNotFoundError(f"入力画像が見つかりません: {src}")
    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = args.stem or src.stem

    img = Image.open(src).convert("RGBA")
    rgba = np.asarray(img, dtype=np.uint8)
    rgb = rgba[..., :3].astype(np.float32) / 255.0
    alpha = rgba[..., 3].astype(np.float32) / 255.0

    depth_path = Path(args.depth).resolve() if args.depth else None
    depth_engine = getattr(args, "depth_engine", "auto") or "auto"
    depth, used_engine = estimate_depth_map(rgb, alpha, depth_path, img_pil=img, depth_engine=depth_engine)

    depth_out = out_dir / f"{stem}_depth.png"
    Image.fromarray((depth * 255).astype(np.uint8), mode="L").save(depth_out)

    normal_out = out_dir / f"{stem}_n.webp"
    depth_to_normal_map(depth, alpha, strength=args.normal_strength).save(normal_out, format="WEBP", quality=90, method=6)

    emissive_out = out_dir / f"{stem}_e.webp"
    extract_emissive_map(rgb, alpha, threshold=args.emissive_threshold).save(emissive_out, format="WEBP", quality=90, method=6)

    layer_paths = {}
    if not args.no_layers:
        layer_paths = slice_depth_layers(rgba, depth, out_dir, stem)

    result = {
        "mode": "local_slice",
        "depth_engine": used_engine,
        "input": str(src),
        "depth": str(depth_out),
        "normal": str(normal_out),
        "emissive": str(emissive_out),
        "layers": layer_paths,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


# ---------------------------------------------------------------------------
# 2. 有料 API (FAL): Hunyuan 3D メッシュ生成 (.glb / PBR)
# ---------------------------------------------------------------------------

def fal_queue_run(endpoint: str, payload: dict, api_key: str, poll_sec: float = 3.0, max_wait: int = 360) -> dict:
    headers = {"Authorization": f"Key {api_key}"}
    submit_url = f"https://queue.fal.run/{endpoint}"
    queued = http_json(submit_url, payload=payload, headers=headers)
    status_url = queued.get("status_url")
    response_url = queued.get("response_url")
    if not status_url or not response_url:
        return queued

    t0 = time.time()
    while time.time() - t0 < max_wait:
        st = http_json(status_url, headers=headers)
        state = st.get("status", "")
        if state == "COMPLETED":
            return http_json(response_url, headers=headers)
        if state in ("FAILED", "CANCELLED"):
            raise RuntimeError(f"FAL job {state}: {st}")
        time.sleep(poll_sec)
    raise TimeoutError(f"FAL job timed out after {max_wait}s: {endpoint}")


def cmd_hunyuan3d(args):
    src = Path(args.input).resolve()
    if not src.exists():
        raise FileNotFoundError(f"入力画像が見つかりません: {src}")
    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = args.stem or src.stem

    payload = {
        "input_image_url": image_to_data_uri(src) if not args.dry_run else f"<data-uri:{src.name}>",
        "face_count": args.face_count,
        "enable_pbr": bool(args.enable_pbr),
        "generate_type": args.generate_type,
    }
    endpoint = args.endpoint or "fal-ai/hunyuan3d-v21"

    if args.dry_run:
        info = {"mode": "hunyuan3d", "dry_run": True, "endpoint": endpoint, "payload": payload, "out_glb": str(out_dir / f"{stem}.glb")}
        print(json.dumps(info, ensure_ascii=False, indent=2))
        return info

    api_key = os.environ.get("FAL_KEY", "").strip()
    if not api_key:
        raise RuntimeError("FAL_KEY が未設定です。環境変数 FAL_KEY または abyss-depth-lab/tools/.env.local に設定してください。")

    res = fal_queue_run(endpoint, payload, api_key)
    mesh_info = res.get("model_mesh") or res.get("model_glb") or {}
    mesh_url = mesh_info.get("url") if isinstance(mesh_info, dict) else None
    out_glb = out_dir / f"{stem}.glb"
    if mesh_url:
        download_file(mesh_url, out_glb)
    meta_path = out_dir / f"{stem}_hunyuan3d.json"
    meta_path.write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")
    out = {"mode": "hunyuan3d", "glb": str(out_glb) if mesh_url else None, "meta": str(meta_path)}
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return out


# ---------------------------------------------------------------------------
# 3. 有料 API (World Labs): Marble 1.1 3D 空間生成 (.spz Gaussian Splatting)
# ---------------------------------------------------------------------------

def cmd_marble(args):
    src = Path(args.input).resolve()
    if not src.exists():
        raise FileNotFoundError(f"入力画像が見つかりません: {src}")
    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = args.stem or src.stem

    api_base = os.environ.get("WORLD_LABS_API_BASE", "https://api.worldlabs.ai/marble/v1").rstrip("/")
    payload = {
        "display_name": stem,
        "model": args.model or "Marble 0.1-plus",
        "world_prompt": {
            "type": "image",
            "image_prompt": {
                "source": "data_base64",
                "data_base64": "<base64>" if args.dry_run else base64.b64encode(src.read_bytes()).decode("ascii"),
                "extension": src.suffix.lstrip(".") or "webp",
            },
            "text_prompt": args.prompt or "Deep underwater abyssal canyon, volumetric bioluminescent lighting, crisp dark rock walls",
        },
    }

    if args.dry_run:
        info = {"mode": "marble", "dry_run": True, "url": f"{api_base}/worlds:generate", "payload": payload, "out_dir": str(out_dir)}
        print(json.dumps(info, ensure_ascii=False, indent=2))
        return info

    api_key = os.environ.get("WORLD_LABS_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("WORLD_LABS_API_KEY が未設定です。環境変数または abyss-depth-lab/tools/.env.local に設定してください。")

    headers = {"WLT-Api-Key": api_key}
    op = http_json(f"{api_base}/worlds:generate", payload=payload, headers=headers)
    op_id = op.get("operation_id") or op.get("name")
    final_res = op

    if op_id:
        t0 = time.time()
        while time.time() - t0 < 420:
            st = http_json(f"{api_base}/operations/{op_id}", headers=headers)
            if st.get("done"):
                final_res = st
                break
            time.sleep(4.0)

    meta_path = out_dir / f"{stem}_marble.json"
    meta_path.write_text(json.dumps(final_res, ensure_ascii=False, indent=2), encoding="utf-8")

    # レスポンスから .spz / .glb / サムネイル URL が見つかれば自動保存
    downloaded = {}
    resp_obj = final_res.get("response") or final_res
    assets = resp_obj.get("assets") if isinstance(resp_obj, dict) else {}
    splats = assets.get("splats") if isinstance(assets, dict) else {}
    spz_urls = splats.get("spz_urls") if isinstance(splats, dict) else {}
    if isinstance(spz_urls, dict):
        for quality, url in spz_urls.items():
            if isinstance(url, str) and url.startswith("http"):
                p = out_dir / f"{stem}_{quality}.spz"
                download_file(url, p)
                downloaded[f"spz_{quality}"] = str(p)

    out = {"mode": "marble", "meta": str(meta_path), "downloaded": downloaded}
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return out


# ---------------------------------------------------------------------------
# 4. 有料 API (FAL / ElevenLabs): 環境音・物理 SE (.mp3) 生成
# ---------------------------------------------------------------------------

def cmd_sfx(args):
    out_path = Path(args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    endpoint = "fal-ai/elevenlabs/sound-effects"
    payload = {
        "text": args.prompt,
        "duration_seconds": args.duration,
        "prompt_influence": args.influence,
    }
    if args.dry_run:
        info = {"mode": "sfx", "dry_run": True, "endpoint": endpoint, "payload": payload, "out": str(out_path)}
        print(json.dumps(info, ensure_ascii=False, indent=2))
        return info

    api_key = os.environ.get("FAL_KEY", "").strip()
    if not api_key:
        raise RuntimeError("FAL_KEY が未設定です。環境変数 FAL_KEY または abyss-depth-lab/tools/.env.local に設定してください。")

    res = fal_queue_run(endpoint, payload, api_key)
    audio = res.get("audio") or {}
    url = audio.get("url") if isinstance(audio, dict) else None
    if not url:
        raise RuntimeError(f"音声 URL が返りませんでした: {res}")
    download_file(url, out_path)
    out = {"mode": "sfx", "audio": str(out_path)}
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return out


# ---------------------------------------------------------------------------
# 5. 一気通貫 (blast): ローカル2D層＋利用可能な外部APIを worlds/<slug>/ へ統合出力
# ---------------------------------------------------------------------------

def cmd_blast(args):
    src = Path(args.input).resolve()
    slug = args.slug or src.stem
    world_dir = (Path(args.worlds_root).resolve() if args.worlds_root else (TOOLS_DIR.parent / "worlds")) / slug
    world_dir.mkdir(parents=True, exist_ok=True)

    manifest = {
        "slug": slug,
        "source": str(src),
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "steps": {},
    }

    # Step 1: ローカル無料（必ず実行：法線 _n.webp・発光 _e.webp・Z帯スライス）
    slice_ns = argparse.Namespace(
        input=str(src), out_dir=str(world_dir / "layers"), stem=slug,
        depth=args.depth, normal_strength=3.2, emissive_threshold=0.62, no_layers=False,
    )
    manifest["steps"]["slice"] = cmd_slice(slice_ns)

    # Step 2: World Labs Marble（キーあり or --dry-run のとき実行）
    if args.dry_run or os.environ.get("WORLD_LABS_API_KEY"):
        marble_ns = argparse.Namespace(
            input=str(src), out_dir=str(world_dir / "marble"), stem=slug,
            prompt=args.prompt, model=None, dry_run=args.dry_run,
        )
        manifest["steps"]["marble"] = cmd_marble(marble_ns)
    else:
        manifest["steps"]["marble"] = {"skipped": "WORLD_LABS_API_KEY not set"}

    # Step 3: FAL Hunyuan 3D（--with-mesh 指定時、かつキーあり or --dry-run）
    if args.with_mesh and (args.dry_run or os.environ.get("FAL_KEY")):
        h_ns = argparse.Namespace(
            input=str(src), out_dir=str(world_dir / "mesh"), stem=slug,
            face_count=50000, enable_pbr=True, generate_type="Normal",
            endpoint=None, dry_run=args.dry_run,
        )
        manifest["steps"]["hunyuan3d"] = cmd_hunyuan3d(h_ns)

    # Step 4: ElevenLabs SFX（--sfx-prompt 指定時、かつキーあり or --dry-run）
    if args.sfx_prompt and (args.dry_run or os.environ.get("FAL_KEY")):
        s_ns = argparse.Namespace(
            prompt=args.sfx_prompt, out=str(world_dir / "audio" / f"{slug}_ambience.mp3"),
            duration=8.0, influence=0.45, dry_run=args.dry_run,
        )
        manifest["steps"]["sfx"] = cmd_sfx(s_ns)

    mpath = world_dir / "manifest.json"
    mpath.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n[world_blaster] manifest saved: {mpath}")
    return manifest


def build_parser():
    p = argparse.ArgumentParser(description="ABYSS DIVE Image-to-World / 多層2D＆3Dアセット統合パイプライン")
    sub = p.add_subparsers(dest="cmd", required=True)

    p_slice = sub.add_parser("slice", help="ローカル無料: 深度推定→法線(_n.webp)+発光(_e.webp)+遠/中/近景2Dスライス")
    p_slice.add_argument("--input", required=True)
    p_slice.add_argument("--out-dir", required=True)
    p_slice.add_argument("--stem", default="")
    p_slice.add_argument("--depth", default="", help="外部深度マップ画像（任意）")
    p_slice.add_argument("--depth-engine", choices=["auto", "ai", "heuristic"], default="auto", help="深度推定エンジン（auto=Depth Anything V2 優先）")
    p_slice.add_argument("--normal-strength", type=float, default=3.2)
    p_slice.add_argument("--emissive-threshold", type=float, default=0.62)
    p_slice.add_argument("--no-layers", action="store_true")
    p_slice.set_defaults(func=cmd_slice)

    p_h3d = sub.add_parser("hunyuan3d", help="FAL API: Hunyuan 3D で .glb メッシュ生成")
    p_h3d.add_argument("--input", required=True)
    p_h3d.add_argument("--out-dir", required=True)
    p_h3d.add_argument("--stem", default="")
    p_h3d.add_argument("--face-count", type=int, default=50000)
    p_h3d.add_argument("--enable-pbr", type=lambda x: str(x).lower() != "false", default=True)
    p_h3d.add_argument("--generate-type", choices=["Normal", "LowPoly", "Geometry"], default="Normal")
    p_h3d.add_argument("--endpoint", default="")
    p_h3d.add_argument("--dry-run", action="store_true")
    p_h3d.set_defaults(func=cmd_hunyuan3d)

    p_m = sub.add_parser("marble", help="World Labs API: Marble 1.1 で 3D Gaussian Splatting (.spz) 生成")
    p_m.add_argument("--input", required=True)
    p_m.add_argument("--out-dir", required=True)
    p_m.add_argument("--stem", default="")
    p_m.add_argument("--prompt", default="")
    p_m.add_argument("--model", default="")
    p_m.add_argument("--dry-run", action="store_true")
    p_m.set_defaults(func=cmd_marble)

    p_s = sub.add_parser("sfx", help="FAL / ElevenLabs API: 環境音・効果音 (.mp3) 生成")
    p_s.add_argument("--prompt", required=True)
    p_s.add_argument("--out", required=True)
    p_s.add_argument("--duration", type=float, default=8.0)
    p_s.add_argument("--influence", type=float, default=0.45)
    p_s.add_argument("--dry-run", action="store_true")
    p_s.set_defaults(func=cmd_sfx)

    p_b = sub.add_parser("blast", help="一気通貫: ローカル法線＆スライス＋設定済み外部 API を worlds/<slug>/ へ一括出力")
    p_b.add_argument("--input", required=True)
    p_b.add_argument("--slug", default="")
    p_b.add_argument("--worlds-root", default="")
    p_b.add_argument("--depth", default="")
    p_b.add_argument("--prompt", default="")
    p_b.add_argument("--sfx-prompt", default="")
    p_b.add_argument("--with-mesh", action="store_true")
    p_b.add_argument("--dry-run", action="store_true")
    p_b.set_defaults(func=cmd_blast)

    return p


def main():
    load_env_local()
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
