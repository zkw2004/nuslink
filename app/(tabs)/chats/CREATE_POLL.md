# Create Poll sheet — integration guide

One new file: **`CreatePollSheet.jsx`**. It's a self-contained full-screen modal
in the app's liquid-glass style. You wire it to the existing `AttachSheet` "Poll"
option and to your chat store's "send poll" action. No new dependencies beyond
the ones the chat screens already use.

## Dependencies (already in your project)
```
expo install expo-blur expo-linear-gradient @expo/vector-icons
```

---

## 1. Drop in the file
Copy `CreatePollSheet.jsx` next to `AttachSheet.jsx` / `ChatThreadScreen.jsx`.

## 2. Open it from the Poll option
`AttachSheet` already fires `onPick(type)` and closes. In **`ChatThreadScreen.jsx`**,
add a state flag and open the poll composer when `type === "poll"`:

```jsx
import CreatePollSheet from "./CreatePollSheet";

// inside ChatThreadScreen()
const [attachOpen, setAttachOpen] = useState(false);
const [pollOpen, setPollOpen] = useState(false);

// …

<AttachSheet
  visible={attachOpen}
  isGroup={chat.group}
  onClose={() => setAttachOpen(false)}
  onPick={(type) => {
    if (type === "poll") setPollOpen(true);
    // else -> your existing photo/video/file/audio pickers
  }}
/>

<CreatePollSheet
  visible={pollOpen}
  onClose={() => setPollOpen(false)}
  onSend={(poll) => {
    // append a real poll message to your thread/store, e.g.:
    // addMessage({
    //   kind: "poll", mine: true, time: nowLabel(),
    //   question: poll.question,
    //   votes: "0 votes",
    //   options: poll.options.map((label) => ({ label, pct: 0 })),
    //   settings: poll.settings,
    // });
  }}
/>
```

The Poll option only appears in `AttachSheet` when `isGroup` is true, so the
composer stays group-only automatically — no extra guard needed.

## 3. What `onSend` gives you
```ts
{
  question: string,
  options: string[],              // empty options are stripped
  settings: {
    publicVotes: boolean,         // show voter names on each option
    multiChoice: boolean,         // voters can pick more than one
    crowdOptions: boolean,        // members can add their own options
    changeVotes: boolean,         // voters can change their choice
  }
}
```
Map `options` into the shape the poll bubble already renders
(`{ label, pct }[]`) as shown in the comment above. `pct: 0` on a fresh poll;
your backend fills real percentages as votes come in.

---

## Design notes (so it stays consistent)
- **Question field** mirrors the poll message bubble header: a 34px glass icon
  tile (`stats-chart`) + bold 18px question + an "Anonymous Poll" kicker.
- **Options** are individual rounded glass pills (`borderRadius: 14`,
  `rgba(255,255,255,0.55)` fill, white hairline border) — the same material as
  the rendered poll options. "Add an option" is a dashed-border pill; it's
  hidden once you reach `MAX_OPTIONS` (12).
- **Toggles** use the app's purple accent (`#5b4fe0`) when on, not iOS green,
  so they match the brand. The knob slides 18px via `translateX`.
- Everything sits on the same `#EEF1FC → #E2E8F8` app gradient with
  translucent white cards, matching `ChatInfoScreen`.

## Tuning
- `MAX_OPTIONS` — max number of options (top of file).
- Initial toggle defaults — the `useState` for `settings`.
- Starts with one empty option; change the `useState([""])` seed if you want two.

That's the whole integration. The file is standalone — nothing else in your
codebase changes except the two `CreatePollSheet` wiring points in
`ChatThreadScreen.jsx`.
