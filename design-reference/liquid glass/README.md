# NUSLink People Screen — Codex build brief

Build a React Native (Expo) screen from the six files in this folder. Follow this
exactly — most failed replications come from missing the Expo deps or from trying
to translate the web CSS (`backdrop-filter`, SVG `feDisplacementMap`) literally.
Neither exists in RN. The glass is built from BlurView + a tint overlay + a
specular border, already implemented in `LiquidGlass.jsx` / `GlassButton.jsx`.

## 0. Prerequisites (this is the #1 reason it fails)

Requires a real **Expo** project — not bare React Native, not react-native-web,
not a snack without these packages. Install:

```bash
npx create-expo-app nuslink        # if starting fresh
cd nuslink
npx expo install expo-blur expo-linear-gradient @expo/vector-icons
```

- `expo-blur` — provides `<BlurView>` (the actual frosted-glass material).
- `expo-linear-gradient` — the periwinkle background.
- `@expo/vector-icons` — nav + bell + create icons (Ionicons).

If any of these is missing the app throws `Unable to resolve module ...` and
nothing renders. Do NOT swap them for community forks.

**Platform note:** the blur is real on iOS. On Android `BlurView` degrades to a
translucent tint (Android has no live backdrop blur) — that is expected and still
looks correct because of the tint fill + specular border. Do not add extra
libraries to "fix" Android blur.

## 1. File map — copy all six, keep the names

```
LiquidGlass.jsx        GlassSurface primitive: BlurView + adaptive tint fill + specular border
GlassButton.jsx        dark / light / plain glass button, scales + brightens on press
ProfileCard.jsx        five-zone match card (imports GlassSurface + GlassButton)
BottomNav.jsx          floating glass tab bar with center dark "Create" circle
PeopleScreen.jsx       People feed: gradient bg + header + filter chips + feed + BottomNav
ProfileScreen.jsx      Profile view: glass sections (basics, academics, interests, etc.)
EditProfileScreen.jsx  Edit form: glass fields + toggle pills + import timetable
data.js                sample PEOPLE + FILTERS arrays
```

Import graph (do not rename or the imports break):
`PeopleScreen → ProfileCard → { LiquidGlass, GlassButton }`, each screen → `BottomNav`,
`ProfileScreen`/`EditProfileScreen` → `{ LiquidGlass, GlassButton, BottomNav }`.

Wire the three screens with a simple state switch in `App.js`:

```jsx
import React, { useState } from "react";
import PeopleScreen from "./PeopleScreen";
import ProfileScreen from "./ProfileScreen";
import EditProfileScreen from "./EditProfileScreen";

export default function App() {
  const [screen, setScreen] = useState("profile"); // "people" | "profile" | "edit"
  const tab = (t) => setScreen(t === "people" ? "people" : "profile");
  if (screen === "people") return <PeopleScreen onTabChange={tab} />;
  if (screen === "edit")
    return <EditProfileScreen onDone={() => setScreen("profile")} onTabChange={tab} />;
  return <ProfileScreen onEdit={() => setScreen("edit")} onTabChange={tab} />;
}
```

## 2. Wire it as the app entry

In `App.js`:

```jsx
import PeopleScreen from "./PeopleScreen"; // adjust path to where you copied the files
export default function App() {
  return <PeopleScreen />;
}
```

Run: `npx expo start`, open on an **iOS simulator or device** to see the true
glass (Expo Go is fine).

## 3. What each glass layer is (so you don't "simplify" it away)

A Liquid Glass surface = THREE stacked layers, in this order, all inside one
`overflow: "hidden"` rounded container:

1. `<BlurView intensity={35–45} tint="systemChromeMaterialLight|Dark" />` filling the box.
2. A `<View>` with a low-opacity fill (`rgba(255,255,255,0.34)` light / `rgba(18,19,30,0.9)` dark) — the adaptive tint.
3. A `<View>` border overlay: bright top-left rim (`rgba(255,255,255,0.55)`) + subtle dark bottom-right rim — the specular edge that reads as curved glass.

Content sits above all three. This is already coded — don't collapse it to a
single translucent `backgroundColor`, which is the 2020 glassmorphism look, not this.

## 4. Touch reaction (required, already in GlassButton)

On `onPressIn` the button animates `scale → 0.97`; on `onPressOut` back to `1`
(Animated spring, `useNativeDriver: true`). Keep it — it's how the glass "reacts".

## 5. Theme tokens (keep uniform)

- Background gradient: `#F6F8FD → #E7EBF7 → #D3DBEE → #C6D0E8` (top→bottom).
- Accent (periwinkle): `#5B4FE0`. Only the intent pill + match % use it.
- Near-black (Connect btn, active chip/tab, Create): `#16172A` / `rgba(18,19,30,0.9)`.
- Text: title `#1A1A26`, body `#4B4B57`, muted `#7A7A87`.
- Type: name 15/600, everything else 11–13/400–600. Two sizes, two weights.

## 6. Common Codex mistakes — check these if it looks wrong

- **Blank / crash:** a dep from step 0 isn't installed. Read the Metro error.
- **Flat white boxes, no blur:** running on web or Android without accepting the
  tint fallback, OR BlurView was replaced by a plain View. Test on iOS.
- **Solid buttons, no glass:** the three-layer stack was collapsed — restore it.
- **Icons missing:** `@expo/vector-icons` not installed, or wrong Ionicons name.
- **Card content unreadable over glass:** keep the tint fill opacity ≥ 0.34 light.

## 7. If you truly cannot use BlurView

Fallback only: replace each `<BlurView>` with a `<View>` whose backgroundColor is
`rgba(255,255,255,0.6)` (light) / `rgba(18,19,30,0.92)` (dark) and keep the
specular border. It loses the frost but preserves layout and theme. This is a
last resort, not the target.
