# Chat media & poll fixes — integration guide

Two files changed. Drop them in and you're done — no new dependencies, no API
changes. Below is exactly what changed and how to reproduce it from scratch if
you'd rather patch your own copies.

## Files in this export
- `ChatThreadScreen.jsx` — bubble sizing + media rendering + liquid-glass poll
- `chatData.js` — sample data gains photo/video captions

Both are drop-in replacements for the files of the same name you already have.

---

## What was broken

1. **Bubbles squashed tall content.** The message list is a vertical flex
   column and each bubble was a flex *item*. Flex items shrink on the main axis
   by default (`flexShrink: 1`), so tall bubbles (image, poll) got compressed —
   the photo looked cropped and the poll collapsed. Audio/file rows also had no
   fixed width, so a short label like "Audio" wrapped one character per line
   ("A / u / d / i").

2. **The poll didn't match the liquid-glass system** — it was a plain
   question + thin track bars.

---

## The fixes

### 1. Stop bubbles from shrinking
Every bubble gets `flexShrink: 0` so it keeps its intrinsic height.

```jsx
// in the Bubble component's style array
style={[
  styles.bubble,               // now includes flexShrink: 0 (see below)
  mine ? styles.bubbleMine : styles.bubbleTheirs,
  isMedia && styles.bubbleMedia,
  isPoll && { maxWidth: 300 },
  { alignSelf: mine ? "flex-end" : "flex-start" },
]}
```

```js
// styles
bubble: { maxWidth: "80%", flexShrink: 0, paddingVertical: 9, paddingHorizontal: 12, /* … */ },
bubbleMedia: { paddingVertical: 4, paddingHorizontal: 4 },
```

> React Native note: `ScrollView` doesn't force-shrink children the way a CSS
> flex column does, but setting `flexShrink: 0` is the correct, portable fix and
> also guards against a `flex` wrapper around the list. Keep it.

### 2. Give media rows a fixed width so labels never wrap
```js
fileRow:  { flexDirection: "row", alignItems: "center", gap: 11, width: 220, maxWidth: "100%" },
fileText: { flex: 1, minWidth: 0 },                 // lets the name ellipsize
audioRow: { flexDirection: "row", alignItems: "center", gap: 10, width: 218, maxWidth: "100%" },
audioDur: { fontSize: 11.5, flexShrink: 0 },        // duration never wraps
wave:     { flex: 1, flexDirection: "row", alignItems: "center", gap: 2, height: 24, overflow: "hidden" },
```
File name uses `numberOfLines={1}`; the meta line too.

### 3. Photo / video captions
Images and videos now render the media box with an optional caption beneath,
inside one `mediaWrap` column:

```jsx
function Caption({ text, color }) {
  if (!text) return null;
  return <Text style={[styles.caption, { color }]}>{text}</Text>;
}

// image / video branch:
<View style={styles.mediaWrap}>
  <LinearGradient … style={styles.mediaBox}> … </LinearGradient>
  <Caption text={msg.caption} color={textColor} />
</View>
```
```js
mediaWrap: { gap: 6 },
caption:   { fontSize: 14, lineHeight: 19, paddingHorizontal: 7, paddingBottom: 2 },
mediaBox:  { width: 232, maxWidth: "100%", height: 168, borderRadius: 14, alignItems: "center", justifyContent: "center", overflow: "hidden" },
```
The bubble time row and reaction chip get `paddingHorizontal: 6` when the bubble
is media, so they align with the caption instead of sitting flush to the edge.

Add `caption` to any media message in your data:
```js
{ kind: "image", mine: false, time: "3:12 PM", sender: "Wei Jie",
  caption: "Free credits here — grab them before SuperAI 2026 ends 🎟️", … }
{ kind: "video", mine: true,  time: "3:15 PM", dur: "0:42",
  caption: "demo of the new build pipeline", … }
```

### 4. Liquid-glass poll
The poll body is rebuilt as a glass card:

- **Header:** a rounded glass icon tile (`stats-chart`) + bold question.
- **"Anonymous Poll"** kicker.
- **Options:** each is a rounded, translucent glass pill (`pollOpt`) with a
  soft fill bar (`pollFill`) absolutely positioned behind the label, its width
  set to the option's percentage. Label left, percent right.
- **Footer:** vote count.

Colors adapt to bubble side (`mine`):
```js
const glassBase   = mine ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.55)";
const glassBorder = mine ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.85)";
const fill        = mine ? "rgba(255,255,255,0.34)" : "rgba(91,79,224,0.20)";
const pctColor    = mine ? "#fff" : "#4230a0";
```
```jsx
<View style={styles.pollWrap}>
  <View style={styles.pollHead}>
    <View style={[styles.pollIcon, { backgroundColor: glassBase, borderColor: glassBorder }]}>
      <Ionicons name="stats-chart" size={15} color={mine ? "#fff" : ACCENT} />
    </View>
    <Text style={[styles.pollQ, { color: textColor }]}>{msg.question}</Text>
  </View>
  <Text style={[styles.pollKicker, { color: timeColor }]}>Anonymous Poll</Text>
  <View style={{ gap: 8 }}>
    {msg.options.map((o, i) => (
      <View key={i} style={[styles.pollOpt, { backgroundColor: glassBase, borderColor: glassBorder }]}>
        <View style={[styles.pollFill, { width: `${o.pct}%`, backgroundColor: fill }]} />
        <Text style={[styles.pollOptLabel, { color: textColor }]} numberOfLines={1}>{o.label}</Text>
        <Text style={[styles.pollOptPct, { color: pctColor }]}>{o.pct}%</Text>
      </View>
    ))}
  </View>
  <Text style={[styles.pollVotes, { color: timeColor }]}>{msg.votes}</Text>
</View>
```
```js
pollWrap:     { width: 264, maxWidth: "100%", gap: 8 },
pollHead:     { flexDirection: "row", alignItems: "center", gap: 9 },
pollIcon:     { width: 30, height: 30, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
pollQ:        { flex: 1, fontSize: 15, fontWeight: "700", lineHeight: 20 },
pollKicker:   { fontSize: 11.5, marginTop: -2, marginBottom: 2 },
pollOpt:      { position: "relative", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderRadius: 13, borderWidth: 1, paddingVertical: 11, paddingHorizontal: 13, overflow: "hidden" },
pollFill:     { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 13 },
pollOptLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
pollOptPct:   { fontSize: 13.5, fontWeight: "700" },
pollVotes:    { fontSize: 11.5, marginTop: 1 },
```
`o.pct` is a number (e.g. `58`); the label is rendered as `{o.pct}%`.

---

## Replicate from scratch (checklist)
1. Add `flexShrink: 0` to the base `bubble` style.
2. Add `bubbleMedia` (padding 4) and apply it to image/video bubbles; give poll
   bubbles `maxWidth: 300`.
3. Replace fixed `minWidth` on file/audio rows with a fixed `width` + `maxWidth: "100%"`; add `flex:1; minWidth:0` to the file text column and `flexShrink:0` to the audio duration.
4. Wrap image/video in `mediaWrap` and render a `<Caption>` below.
5. Pad the time row + reaction chip by 6px horizontally on media bubbles.
6. Swap the poll body for the glass version above.
7. Add `caption` fields to your image/video messages.

That's the whole change set — everything else in the thread screen is untouched.
