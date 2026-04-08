#!/usr/bin/env python3
"""Download yoga images, resize, and convert to base64."""
import requests, base64, json, os
from io import BytesIO
from PIL import Image

YOGA_IMAGES = {
    "childs_pose": "https://images.unsplash.com/photo-1593811167565-4672e6c8ce4c?w=600&q=70",
    "seated_meditation": "https://images.unsplash.com/photo-1562088287-bde35a1ea917?w=600&q=70",
    "cobra_pose": "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=70",
    "warrior_pose": "https://images.pexels.com/photos/6454061/pexels-photo-6454061.jpeg?auto=compress&cs=tinysrgb&w=600",
    "forward_bend": "https://images.pexels.com/photos/35987/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=600",
    "tree_pose": "https://images.pexels.com/photos/7596956/pexels-photo-7596956.jpeg?auto=compress&cs=tinysrgb&w=600",
}

W, H, Q = 320, 200, 40
results = {}

for key, url in YOGA_IMAGES.items():
    try:
        print(f"Downloading {key}...")
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
        r.raise_for_status()
        img = Image.open(BytesIO(r.content)).convert("RGB")
        w, h = img.size
        ratio = W / H
        cr = w / h
        if cr > ratio:
            nw = int(h * ratio)
            l = (w - nw) // 2
            img = img.crop((l, 0, l + nw, h))
        else:
            nh = int(w / ratio)
            t = (h - nh) // 2
            img = img.crop((0, t, w, t + nh))
        img = img.resize((W, H), Image.LANCZOS)
        buf = BytesIO()
        img.save(buf, format="JPEG", quality=Q, optimize=True)
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        results[key] = f"data:image/jpeg;base64,{b64}"
        print(f"  OK {len(b64)/1024:.1f} KB")
    except Exception as e:
        print(f"  FAIL {e}")
        results[key] = None

out = "/app/frontend/constants/yogaImages.json"
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w") as f:
    json.dump(results, f)
total = sum(len(v) for v in results.values() if v) / 1024
print(f"\nSaved {len([v for v in results.values() if v])} images ({total:.1f} KB)")
