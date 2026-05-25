# TOM.AI — Custom assets (you provide, we wire in)

Drop your files into these folders. The app reads paths from `src/config/assets.js`.

## Logos (`/assets/logos/`)

| File | Purpose |
|------|---------|
| `logo-primary.png` | Main logo (navbar, chat) — **replaces** `/images/logo.png` when present |
| `logo-mark.svg` | Small icon / favicon source |
| `logo-animated.glb` | 3D spinning logo (intro + welcome hero) |
| `logo-intro.webm` | Optional video loop for splash (transparent bg) |

Recommended: PNG 512×512 or SVG; GLB under ~5MB.

## 3D scenes (`/assets/3d/`)

| File | Purpose |
|------|---------|
| `hero-scene.glb` | Welcome page background (left panel) |
| `mascot.glb` | Optional 3D mascot (replaces SVG cat) |
| `chat-ambient.glb` | Subtle loop behind chat empty state |

Export from Blender: **glTF Binary (.glb)**, Draco optional, Y-up, scale ~1 unit.

## Motion / UI (`/assets/motion/`)

| File | Purpose |
|------|---------|
| `workflow.json` | Lottie workflow animation (optional) |
| `particles.json` | Lottie overlay (optional) |

## Workflow illustrations (`/assets/workflow/`)

| File | Step |
|------|------|
| `step-1-connect.png` | Connect / sign in |
| `step-2-chat.png` | Chat with AI |
| `step-3-tasks.png` | Tasks & reminders |

PNG/WebP 800×600 or SVG.

---

After adding files, set flags in `.env`:

```env
REACT_APP_USE_3D=true
REACT_APP_HERO_MODEL=/assets/3d/hero-scene.glb
REACT_APP_LOGO_3D=/assets/logos/logo-animated.glb
```

Restart `npm start` after changes.
