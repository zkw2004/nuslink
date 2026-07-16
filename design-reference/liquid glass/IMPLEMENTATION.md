# NUSLink Chat — React Native implementation guide

Drop-in Expo/React Native screens for the chat feature, in the app's Liquid
Glass style. This covers the **new** functionality: swipe actions, the
message long-press menu with reactions, the pin workflow, media/poll message
bubbles, the attachment sheet, and the chat/group info page.

---

## 1. Files in this folder

| File | What it is |
|------|-----------|
| `chatData.js` | All sample data + helpers. **Source of truth for the `group` flag.** |
| `ChatsScreen.jsx` | Chat list. Edit mode (Read/Archive/Delete) **+ swipe-to-reveal Mute/Delete/Archive**. |
| `ChatThreadScreen.jsx` | Conversation. Bubbles (text/image/video/file/voice/poll), **long-press menu, reactions, pin flow, pinned banner**, attachment sheet, tappable name pill. |
| `ChatInfoScreen.jsx` | **New.** Chat/group info page (actions + media tabs). |
| `AttachSheet.jsx` | **New.** Composer attachment picker (Poll for groups only). |
| `ArchivedScreen.jsx`, `NewChatSheet.jsx` | Unchanged from before. |
| `LiquidGlass.jsx`, `GlassButton.jsx`, `BottomNav.jsx` | Shared primitives (unchanged). |

Copy the whole folder into your project (e.g. `src/chat/`). Keep the files
together — they import each other by relative path.

---

## 2. Dependencies

```bash
expo install expo-blur expo-linear-gradient @expo/vector-icons
expo install react-native-gesture-handler
```

`react-native-gesture-handler` is **new** (used by the swipe rows). It needs a
root wrapper. In your app entry (`App.js` / `app/_layout.tsx`):

```jsx
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* …your navigator… */}
    </GestureHandlerRootView>
  );
}
```

> Bare RN (no Expo): use `react-native-blur`, `react-native-linear-gradient`,
> and `react-native-vector-icons` instead, and follow gesture-handler's bare
> install (Android `MainActivity` edit). The component code is identical.

---

## 3. Wiring the screens together

These are presentational screens driven by callback props — plug them into
whatever navigator you use (React Navigation, Expo Router, or local state).

### Minimal local-state host

```jsx
import { useState } from "react";
import ChatsScreen from "./chat/ChatsScreen";
import ChatThreadScreen from "./chat/ChatThreadScreen";
import ChatInfoScreen from "./chat/ChatInfoScreen";
import ArchivedScreen from "./chat/ArchivedScreen";

export default function ChatFlow() {
  const [route, setRoute] = useState({ name: "chats" });

  switch (route.name) {
    case "thread":
      return (
        <ChatThreadScreen
          chatId={route.chatId}
          onBack={() => setRoute({ name: "chats" })}
          onOpenInfo={(chatId) => setRoute({ name: "info", chatId })}
        />
      );
    case "info":
      return (
        <ChatInfoScreen
          chatId={route.chatId}
          onBack={() => setRoute({ name: "thread", chatId: route.chatId })}
          onMute={(id) => {/* persist mute */}}
          onSearch={(id) => {/* open in-chat search */}}
          onDelete={(id) => setRoute({ name: "chats" })}   // DM: delete chat
          onLeave={(id) => setRoute({ name: "chats" })}    // group: leave
        />
      );
    case "archived":
      return <ArchivedScreen onBack={() => setRoute({ name: "chats" })} />;
    default:
      return (
        <ChatsScreen
          onOpenThread={(chatId) => setRoute({ name: "thread", chatId })}
          onOpenArchived={() => setRoute({ name: "archived" })}
          onCompose={() => {/* open NewChatSheet */}}
          onTabChange={(tab) => {/* switch bottom tab */}}
          onCreate={() => {/* + button */}}
          onArchive={(ids) => {/* persist archive */}}
          onDelete={(ids) => {/* persist delete */}}
          onMute={(id) => {/* persist mute */}}
        />
      );
  }
}
```

### With React Navigation (native stack)

```jsx
<Stack.Navigator screenOptions={{ headerShown: false }}>
  <Stack.Screen name="Chats">
    {(p) => <ChatsScreen
      onOpenThread={(chatId) => p.navigation.navigate("Thread", { chatId })}
      onOpenArchived={() => p.navigation.navigate("Archived")}
      onArchive={persistArchive} onDelete={persistDelete} onMute={persistMute} />}
  </Stack.Screen>
  <Stack.Screen name="Thread">
    {(p) => <ChatThreadScreen
      chatId={p.route.params.chatId}
      onBack={() => p.navigation.goBack()}
      onOpenInfo={(chatId) => p.navigation.navigate("ChatInfo", { chatId })} />}
  </Stack.Screen>
  <Stack.Screen name="ChatInfo">
    {(p) => <ChatInfoScreen
      chatId={p.route.params.chatId}
      onBack={() => p.navigation.goBack()}
      onDelete={() => p.navigation.popToTop()}
      onLeave={() => p.navigation.popToTop()} />}
  </Stack.Screen>
</Stack.Navigator>
```

---

## 4. Feature notes (where to hook real data)

**The `group` flag is the master switch.** Set `group: true` on a chat and it
automatically gets: the Poll attachment option, a poll message bubble, the
"Pin for everyone" wording, the "Leave" action (instead of "Delete chat"), and
the extra "Polls" media tab. DMs get none of those. See `chatData.js`.

### Swipe actions (`ChatsScreen`)
- Each row is wrapped in `<Swipeable renderRightActions=…>`. Swipe left →
  Mute/Unmute · Delete · Archive. Disabled in edit mode.
- Demo mutes/archives/deletes in local state and calls `onMute/onArchive/
  onDelete`. Replace those bodies with your store mutations.
- **The edit-mode bar is Read / Archive / Delete only** — mute deliberately
  lives on the swipe, not as a pill.

### Long-press menu + reactions (`ChatThreadScreen`)
- `<Bubble onLongPress>` opens `BubbleMenu` (a modal). Reaction row on top,
  then Reply / Copy / **Edit (own messages only)** / Pin / Forward / Delete /
  Select.
- Tapping a reaction writes to local `reactions[index]`. `handleAction(key)`
  currently only implements Pin; wire `reply`, `copy`, `edit`, `forward`,
  `delete`, `select` to your logic (clipboard: `expo-clipboard`).

### Pin workflow
- Pin → `PinPrompt` → choose "Pin for everyone"/"Pin for me and X" or
  "Pin for me" → sets `pinnedText` → a **pinned banner** shows at the top of
  the thread with an ✕ to unpin. One pinned message in the demo; extend
  `pinnedText` to an array for multiple.

### Media bubbles
- Built by `buildThread(chat)` in `chatData.js`: text messages + photo/file/
  video/voice always, **poll appended only for groups**. Bubble kinds render
  via `MediaBody`. Swap the placeholder boxes for real thumbnails/players
  (`expo-av` for audio/video, `expo-image` for photos).

### Attachment sheet (`AttachSheet`)
- Opened by the composer paperclip. Photo · Video · File · Audio, plus **Poll
  for groups**. `onPick(type)` fires then closes — wire to `expo-image-picker`,
  `expo-document-picker`, an audio recorder, and your poll composer.

### Chat/group info (`ChatInfoScreen`)
- Header identity, then actions — **DM: Mute · Search · Delete chat**,
  **group: Mute · Search · Leave**. No mobile/username block.
- Media tabs — **DM: Photos Videos Files Audio Links**, **group: + Polls**.
  Photos/Videos/Polls render a thumbnail grid; Files/Audio/Links a list
  (data in `INFO_LISTS`).

---

## 5. Replacing the sample data

`chatData.js` is filler. Map your API models to the same shapes:

- **Chat**: `{ id, name, initials, avatarBg:[c1,c2], group, muted, read, time, preview, badge }`
- **Message**: `{ mine, time, read?, kind?, text?, fileName?, fileSize?, dur?, sender?, question?, options?, votes?, reaction?, reactCount? }`
  (`kind` ∈ `text|image|video|file|audio|poll`; default `text`.)

Prefer real avatar images? Replace the `<LinearGradient>` avatar blocks with
`<Image>` and add a `photo` field to each chat.

---

That's it — copy the folder, install `react-native-gesture-handler`, add the
root wrapper, and wire the callbacks to your navigation + chat store.
