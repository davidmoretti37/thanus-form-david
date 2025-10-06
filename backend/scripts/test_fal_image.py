#!/usr/bin/env python3
import os
import sys
import time
import json
from typing import Any, Optional

try:
    import requests
except Exception as e:
    print("ERROR: requests is required. Please install: pip install requests")
    sys.exit(1)

try:
    from dotenv import load_dotenv
except Exception:
    # dotenv is optional; we can proceed if env is already loaded
    def load_dotenv(*args, **kwargs):
        return False

try:
    from fal_client import submit
except Exception as e:
    print("ERROR: fal-client is required. Please ensure it's installed in the backend env (pyproject has fal-client>=0.4.0).")
    print("Import error:", repr(e))
    sys.exit(1)


def extract_first_image_url(response: Any) -> Optional[str]:
    """
    Depth-first search to find a URL-looking string in Fal response shapes:
      - {'images': [{'url': '...'}]}
      - {'image': {'url': '...'}}
      - {'output': [{'url': '...'}]}
      - or nested lists/dicts with 'url'/'signed_url'/'uri'
    """
    def _dfs(obj: Any) -> Optional[str]:
        if isinstance(obj, dict):
            for k in ("url", "signed_url", "uri"):
                v = obj.get(k)
                if isinstance(v, str) and v.startswith("http"):
                    return v
            for v in obj.values():
                found = _dfs(v)
                if found:
                    return found
        elif isinstance(obj, list):
            for item in obj:
                found = _dfs(item)
                if found:
                    return found
        elif isinstance(obj, str):
            if obj.startswith("http"):
                return obj
        return None
    return _dfs(response)


def main():
    # Load .env from backend/.env if available
    here = os.path.dirname(os.path.abspath(__file__))
    backend_root = os.path.abspath(os.path.join(here, ".."))
    env_path = os.path.join(backend_root, ".env")
    load_dotenv(env_path)

    fal_key = os.getenv("FAL_KEY")
    if not fal_key:
        print("ERROR: FAL_KEY is not set. Please set it in backend/.env and retry.")
        print(f"Checked path: {env_path}")
        sys.exit(1)

    # Model and prompt (allow prompt override via CLI)
    model = "fal-ai/flux-pro/kontext/max/text-to-image"
    prompt = "Test image (Fal AI): a scenic futuristic city skyline at sunset, ultra-detailed, volumetric lighting, cinematic"
    if len(sys.argv) > 1:
        prompt = " ".join(sys.argv[1:])

    # Common args accepted by many Fal text-to-image endpoints
    # For fal-ai/flux-pro/kontext/max/text-to-image, image_size must be one of:
    # 'square_hd', 'square', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'
    # Using 'square_hd' for best quality 1:1 outputs.
    args = {
        "prompt": prompt,
        "image_size": "square_hd",
        "num_images": 1,
    }

    print(f"Submitting to Fal model: {model}")
    print(f"Prompt: {prompt}")
    try:
        handler = submit(model, arguments=args)
        result = handler.get()  # blocking wait
    except Exception as e:
        print("ERROR: Fal submission failed:", repr(e))
        sys.exit(1)

    # Debug-print a summarized response
    try:
        print("Fal response (truncated):", json.dumps(result, ensure_ascii=False)[:500], "...")
    except Exception:
        # Some responses may not be JSON-serializable; ignore
        pass

    url = extract_first_image_url(result)
    if not url:
        print("ERROR: Could not find image URL in Fal response.")
        sys.exit(1)

    print("Downloading generated image from:", url)
    try:
        r = requests.get(url, timeout=60)
        r.raise_for_status()
    except Exception as e:
        print("ERROR: Failed to download generated image:", repr(e))
        sys.exit(1)

    # Save under backend/logs
    out_dir = os.path.join(backend_root, "logs")
    os.makedirs(out_dir, exist_ok=True)
    filename = f"fal_test_{int(time.time())}.png"
    out_path = os.path.abspath(os.path.join(out_dir, filename))
    with open(out_path, "wb") as f:
        f.write(r.content)

    print("SUCCESS: Saved image to:", out_path)


if __name__ == "__main__":
    main()
