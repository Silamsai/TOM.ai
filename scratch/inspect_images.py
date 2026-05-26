import os
from PIL import Image

brain_dir = r"C:\Users\Dell\.gemini\antigravity\brain\b5528321-1bda-424f-97c8-683cf70a63eb"
images = [f for f in os.listdir(brain_dir) if f.endswith('.png')]

print(f"Found PNG images in last conversation: {images}")
for img_name in images:
    img_path = os.path.join(brain_dir, img_name)
    try:
        with Image.open(img_path) as img:
            print(f"{img_name}: format={img.format}, size={img.size}, mode={img.mode}")
    except Exception as e:
        print(f"Error reading {img_name}: {e}")

brain_dir_prev = r"C:\Users\Dell\.gemini\antigravity\brain\59b796c6-e981-4409-90d4-b361e084abea"
images_prev = [f for f in os.listdir(brain_dir_prev) if f.endswith('.jpg')]
print(f"Found JPG images in conversation 59b796c6: {images_prev}")
for img_name in images_prev:
    img_path = os.path.join(brain_dir_prev, img_name)
    try:
        with Image.open(img_path) as img:
            print(f"{img_name}: format={img.format}, size={img.size}, mode={img.mode}")
    except Exception as e:
        print(f"Error reading {img_name}: {e}")
