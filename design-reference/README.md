# Design Reference

Static design mockups and prototypes. These are **not part of the app build** — they are reference-only files used during the design phase.

## Files

| File | Purpose |
|------|---------|
| `design-canvas.jsx` | Figma-ish canvas wrapper for viewing all screens side-by-side |
| `ios-frame.jsx` | iOS 26 device frame with status bar |
| `tweaks-panel.jsx` | Live-tweak panel for adjusting design tokens at runtime |
| `tokens.jsx` | Theme tokens (light/dark) and shared scales |
| `primitives.jsx` | UI building blocks: Avatar, Button, Chip, ProgressBar, etc. |
| `screens/app.jsx` | Full NUSLink design canvas (all screens, light/dark, match tweaks) |
| `screens/chat.jsx` | Chat screen mockup |
| `screens/discover.jsx` | Discover tab mockup |
| `screens/onboarding.jsx` | Onboarding flow mockup |
| `screens/profile.jsx` | Profile screen mockup |

> Refer to these when implementing the real screens in `app/` and `src/features/`.
