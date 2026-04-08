#!/usr/bin/env python3
"""Download exercise images, resize, and convert to base64 for the ADHD app."""

import requests
import base64
import json
from io import BytesIO
from PIL import Image

EXERCISE_IMAGES = {
    "squats": {
        "url": "https://images.pexels.com/photos/5038859/pexels-photo-5038859.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "title": "Squats"
    },
    "stretching": {
        "url": "https://images.unsplash.com/photo-1649008726820-d90aeb70c32e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwxfHxleGVyY2lzZSUyMGRlbW9uc3RyYXRpb258ZW58MHx8fHwxNzc1NjI0MDQ1fDA&ixlib=rb-4.1.0&q=85",
        "title": "Stretching"
    },
    "plank": {
        "url": "https://images.unsplash.com/photo-1551984427-6d77a1918093?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MDV8MHwxfHNlYXJjaHw0fHxmaXRuZXNzJTIwd29ya291dHxlbnwwfHx8fDE3NzU2MjQwNDl8MA&ixlib=rb-4.1.0&q=85",
        "title": "Plank"
    },
    "jumping": {
        "url": "https://images.unsplash.com/photo-1634788699201-77bbb9428ab6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MDV8MHwxfHNlYXJjaHwyfHxmaXRuZXNzJTIwd29ya291dHxlbnwwfHx8fDE3NzU2MjQwNDl8MA&ixlib=rb-4.1.0&q=85",
        "title": "Jump Rope"
    },
    "group_fitness": {
        "url": "https://images.unsplash.com/photo-1518310383802-640c2de311b2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MDV8MHwxfHNlYXJjaHwzfHxmaXRuZXNzJTIwd29ya291dHxlbnwwfHx8fDE3NzU2MjQwNDl8MA&ixlib=rb-4.1.0&q=85",
        "title": "Group Fitness"
    },
    "home_exercise": {
        "url": "https://images.unsplash.com/photo-1758612897695-be644d6febec?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHw0fHxleGVyY2lzZSUyMGRlbW9uc3RyYXRpb258ZW58MHx8fHwxNzc1NjI0MDQ1fDA&ixlib=rb-4.1.0&q=85",
        "title": "Home Exercise"
    }
}

TARGET_WIDTH = 320
TARGET_HEIGHT = 200
JPEG_QUALITY = 40  # Keep small for base64

results = {}

for key, info in EXERCISE_IMAGES.items():
    try:
        print(f"Downloading {info['title']}...")
        headers = {"User-Agent": "Mozilla/5.0"}
        resp = requests.get(info["url"], headers=headers, timeout=30)
        resp.raise_for_status()

        img = Image.open(BytesIO(resp.content))
        img = img.convert("RGB")

        # Crop to aspect ratio then resize
        w, h = img.size
        target_ratio = TARGET_WIDTH / TARGET_HEIGHT
        current_ratio = w / h

        if current_ratio > target_ratio:
            new_w = int(h * target_ratio)
            left = (w - new_w) // 2
            img = img.crop((left, 0, left + new_w, h))
        else:
            new_h = int(w / target_ratio)
            top = (h - new_h) // 2
            img = img.crop((0, top, w, top + new_h))

        img = img.resize((TARGET_WIDTH, TARGET_HEIGHT), Image.LANCZOS)

        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
        b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")

        results[key] = f"data:image/jpeg;base64,{b64_str}"
        size_kb = len(b64_str) / 1024
        print(f"  ✅ {info['title']}: {size_kb:.1f} KB base64")

    except Exception as e:
        print(f"  ❌ {info['title']}: {e}")
        results[key] = None

# Write to JSON file
output_path = "/app/frontend/constants/exerciseImages.json"
import os
os.makedirs(os.path.dirname(output_path), exist_ok=True)
with open(output_path, "w") as f:
    json.dump(results, f)

print(f"\nSaved {len([v for v in results.values() if v])} images to {output_path}")
total_size = sum(len(v) for v in results.values() if v) / 1024
print(f"Total size: {total_size:.1f} KB")
