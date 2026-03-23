"""
SpeechBrain accent & language classification for audio files.

Usage:
  python scripts/lib/speechbrain-classify.py <audio_file_or_dir> [--output results.json]

Runs two models:
  1. Lang-ID (VoxLingua107 ECAPA-TDNN) — identifies L1 from 107 languages
  2. Accent-ID (CommonAccent XLSR) — classifies English accent from 16 regions

Outputs JSON with top-5 predictions + confidence for each model.
"""

import sys
import json
import os
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
os.environ["SPEECHBRAIN_LOG_LEVEL"] = "WARNING"

# Compatibility patches for SpeechBrain 1.0.3 with latest dependencies:
# 1. torchaudio >= 2.11 removed list_audio_backends()
# 2. huggingface_hub >= 1.0 removed use_auth_token param (replaced by token)
import torchaudio
if not hasattr(torchaudio, "list_audio_backends"):
    torchaudio.list_audio_backends = lambda: ["ffmpeg"]

import huggingface_hub
_original_hf_download = huggingface_hub.hf_hub_download
def _patched_hf_download(*args, **kwargs):
    kwargs.pop("use_auth_token", None)
    return _original_hf_download(*args, **kwargs)
huggingface_hub.hf_hub_download = _patched_hf_download

def load_audio_ffmpeg(audio_path: str, target_sr: int = 16000):
    """Load audio using ffmpeg subprocess (avoids torchcodec DLL issues on Windows)."""
    import torch
    import subprocess
    import struct

    # Use ffmpeg to convert to raw PCM float32 at target sample rate
    cmd = [
        "ffmpeg", "-i", audio_path,
        "-f", "f32le", "-acodec", "pcm_f32le",
        "-ar", str(target_sr), "-ac", "1",
        "-loglevel", "error",
        "pipe:1",
    ]
    proc = subprocess.run(cmd, capture_output=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {proc.stderr.decode()}")

    # Convert raw bytes to torch tensor
    n_samples = len(proc.stdout) // 4  # 4 bytes per float32
    samples = struct.unpack(f"<{n_samples}f", proc.stdout)
    return torch.tensor(samples, dtype=torch.float32)


def classify_lang_id(model, audio_path: str) -> dict:
    """Run ECAPA-TDNN lang-id model (uses classify_batch)."""
    import torch

    try:
        signal = load_audio_ffmpeg(audio_path)
        prediction = model.classify_batch(signal.unsqueeze(0))
        log_posteriors = prediction[0].squeeze(0)
        probs = torch.softmax(log_posteriors, dim=-1)

        top5_values, top5_indices = torch.topk(probs, k=min(5, len(probs)))
        label_encoder = model.hparams.label_encoder
        top5 = []
        for val, idx in zip(top5_values.tolist(), top5_indices.tolist()):
            label = label_encoder.decode_ndim(idx)
            top5.append({"language": label, "confidence": round(val * 100, 1)})

        return {"predicted": prediction[3][0], "confidence": round(prediction[1].exp().item() * 100, 1), "top5": top5}
    except Exception as e:
        return {"error": str(e)}


def classify_accent_id(model, audio_path: str) -> dict:
    """Run XLSR accent-id model (custom forward — no compute_features module)."""
    import torch

    try:
        signal = load_audio_ffmpeg(audio_path).unsqueeze(0)
        wav_lens = torch.tensor([1.0])

        with torch.no_grad():
            feats = model.mods.wav2vec2(signal)
            pooled = model.mods.avg_pool(feats, wav_lens)
            pooled = pooled.view(pooled.shape[0], -1)
            logits = model.mods.output_mlp(pooled)

        probs = torch.softmax(logits.squeeze(0), dim=-1)
        top5_values, top5_indices = torch.topk(probs, k=min(5, len(probs)))
        label_encoder = model.hparams.label_encoder
        top5 = []
        best_val = 0
        best_label = ""
        for val, idx in zip(top5_values.tolist(), top5_indices.tolist()):
            label = label_encoder.decode_ndim(idx)
            top5.append({"accent": label, "confidence": round(val * 100, 1)})
            if val > best_val:
                best_val = val
                best_label = label

        return {"predicted": best_label, "confidence": round(best_val * 100, 1), "top5": top5}
    except Exception as e:
        return {"error": str(e)}


def main():
    import argparse

    parser = argparse.ArgumentParser(description="SpeechBrain accent & language classification")
    parser.add_argument("input", help="Audio file or directory of audio files")
    parser.add_argument("--output", "-o", help="Output JSON file (default: stdout)")
    parser.add_argument("--cache-dir", default="scripts/.speechbrain-cache", help="Model cache directory")
    parser.add_argument("--model", choices=["lang", "accent", "both"], default="both",
                        help="Which model to run (default: both)")
    args = parser.parse_args()

    input_path = Path(args.input)
    audio_extensions = {".mp3", ".wav", ".m4a", ".flac", ".ogg", ".webm"}

    if input_path.is_dir():
        files = sorted([f for f in input_path.iterdir() if f.suffix.lower() in audio_extensions])
    elif input_path.is_file():
        files = [input_path]
    else:
        print(f"Error: {input_path} not found", file=sys.stderr)
        sys.exit(1)

    if not files:
        print("Error: no audio files found", file=sys.stderr)
        sys.exit(1)

    print(f"Processing {len(files)} file(s)...", file=sys.stderr)
    from speechbrain.inference.classifiers import EncoderClassifier

    results = {f.name: {"file": f.name} for f in files}

    if args.model in ("lang", "both"):
        print("\n--- Language ID ---", file=sys.stderr)
        try:
            model = EncoderClassifier.from_hparams(
                source="speechbrain/lang-id-voxlingua107-ecapa",
                savedir=os.path.join(args.cache_dir, "lang-id-voxlingua107"),
            )
            for i, f in enumerate(files):
                print(f"  [{i+1}/{len(files)}] {f.name}", file=sys.stderr)
                results[f.name]["langId"] = classify_lang_id(model, str(f))
        except Exception as e:
            print(f"Lang-ID failed: {e}", file=sys.stderr)
            for f in files:
                results[f.name]["langId"] = {"error": str(e)}

    if args.model in ("accent", "both"):
        print("\n--- Accent ID ---", file=sys.stderr)
        try:
            model = EncoderClassifier.from_hparams(
                source="Jzuluaga/accent-id-commonaccent_xlsr-en-english",
                savedir=os.path.join(args.cache_dir, "accent-id-commonaccent"),
            )
            for i, f in enumerate(files):
                print(f"  [{i+1}/{len(files)}] {f.name}", file=sys.stderr)
                results[f.name]["accentId"] = classify_accent_id(model, str(f))
        except Exception as e:
            print(f"Accent-ID failed: {e}", file=sys.stderr)
            for f in files:
                if "accentId" not in results[f.name]:
                    results[f.name]["accentId"] = {"error": str(e)}

    result_list = [results[f.name] for f in files]
    output = json.dumps(result_list, indent=2, ensure_ascii=False)

    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
        print(f"\nResults saved to {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
