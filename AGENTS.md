# AGENTS.md

You are an expert React Native and Expo engineer (with FastAPI familiarity) helping build NUSLink.

Write clean, simple, maintainable code. Prioritize clarity over abstraction. Think like a senior mobile developer on a small two-person team with a three-month timeline.

---

## Project Overview

NUSLink is a mobile app that matches NUS students for study groups, project teams, and competition squads based on shared modules, compatible working styles, and complementary skills.

The app includes:

- Professional profiles (academic credentials, modules taken, skills, project portfolio links, competition history)
- Module registration via NUSMods API, scoped per semester
- Smart matching algorithm (2-dimensional initial release → 4-dimensional with configurable weights in M3)
- Timetable sync with free-block detection
- In-app messaging, group formation, micro-communities, reputation system, competition hub (M2 and M3)
- AI-powered nudges and NUS SSO (M3 only)

See `FEATURES.md` for the canonical feature list and `DEVELOPMENT_PLAN.md` for milestone scope. In practice, use this file as the implementation guardrail: if the product spec is more ambitious than the current milestone, follow the smaller scope here and defer the rest.

Keep implementations simple and readable. Do not build M2 or M3 features until M1 is solid.

---

## Tech Stack

Mobile:
- Expo (managed workflow)
- React Native
- TypeScript (strict)
- Expo Router (file-based routing in `app/`)
- NativeWind
- Zustand
- AsyncStorage

Backend / data:
- Supabase (Auth, Postgres, Realtime)
- FastAPI (Python) — matching, AI logic, anything that doesn't fit in the database
- NUSMods API (read-only, public)

**Deferred — do not introduce until the milestone it belongs to:**

- OpenAI / Anthropic API — M3 only, for AI-powered features
- NUS SSO via OpenID Connect — M3 only

Do not introduce new major libraries without approval. Ask before installing anything new.

---

## Development Philosophy

Build feature by feature.

For every feature:

1. Read this file first.
2. Keep the implementation simple.
3. Avoid overengineering.
4. Prefer readable code over clever code.
5. Build the smallest useful version first.
6. Refactor only when repetition appears.

Two-person team, three-month timeline. Speed and clarity beat sophistication.

---

## Decision Making

If something is unclear or could be improved, suggest a better approach.
If a new library would significantly help, recommend it, explain why, and ask before adding it.
If a change requires touching more than one feature area, ask first.
If a change requires both mobile and backend edits, call that out at the top of your response so the diff can be reviewed as one unit.

Do not install new libraries without approval.

---

## Architecture

Repository layout:

```
app/                      # Expo Router routes only (screens + layouts)
  (auth)/
  (tabs)/
assets/                   # Images, fonts
backend/                  # FastAPI service (Python)
constants/                # App-wide constants (images, colors, config)
design-reference/         # Design refs, screenshots, mood board
src/
  components/             # Reusable, presentational UI
  features/               # Feature-scoped modules (auth, modules, matching, profile, ...)
  hooks/                  # Cross-cutting custom hooks
  lib/                    # Thin wrappers around external SDKs (supabase.ts, nusmods.ts)
  services/               # Domain services that compose lib/ + features/ logic
  store/                  # Zustand stores
  types/                  # Shared TypeScript types (database.ts, domain.ts)
  utils/                  # Pure utility functions
supabase/
  migrations/             # Versioned SQL migrations
```

Path aliases (defined in `tsconfig.json` — use these, do not use deep relative paths):

```
@/*           → ./*
@src/*        → ./src/*
@components/* → ./src/components/*
@features/*   → ./src/features/*
@hooks/*      → ./src/hooks/*
@lib/*        → ./src/lib/*
@services/*   → ./src/services/*
@store/*      → ./src/store/*
@appTypes/*   → ./src/types/*
@utils/*      → ./src/utils/*
@constants/*  → ./constants/*
```

### Folder responsibilities

**app/** is for routes and screens only. Screens compose components, call hooks, and read from stores. They should not contain large reusable UI blocks or business logic. If a screen exceeds ~150 lines, extract pieces into `@features/<feature>/` or `@components/`.

**src/features/** is the primary place new feature code lives. Each feature is a folder (e.g. `features/auth/`, `features/modules/`, `features/matching/`, `features/profile/`) containing the feature's own components, hooks, and types. A feature folder is self-contained — code inside one feature should not import from another feature's internals. If two features need the same thing, lift it to `@components/`, `@hooks/`, `@services/`, or `@utils/`.

**src/components/** is for generic, feature-agnostic UI primitives reused across features. Examples for NUSLink: `Button`, `ProfileCard`, `ModuleChip`, `MatchCard`, `BadgeTier`. Do not create a component in `components/` if it's only used inside one feature — keep it in that feature folder.

**src/services/** holds domain-level orchestration. A service composes one or more `lib/` clients with business rules. Example: `matchingService.ts` calls the FastAPI matching endpoint, applies the per-module-per-semester scope rule, and returns typed results to the UI. Screens and features call services, not `lib/` directly.

**src/lib/** holds thin client wrappers around external SDKs (`supabase.ts`, `nusmods.ts`, `apiClient.ts` for FastAPI). No business logic here — just configured clients. Never expose secret keys here.

**src/store/** holds Zustand stores. Examples: authenticated user, registered modules for the current semester, pending matches. Persist with AsyncStorage when needed.

**src/hooks/** holds cross-cutting hooks used across multiple features (e.g. `useAuth`, `useCurrentSemester`). Feature-specific hooks live inside the feature folder.

**src/utils/** holds pure functions with no side effects (formatters, validators, scoring helpers used for client-side previews).

**backend/** is the FastAPI service. Matching logic lives here, not in Edge Functions. Keep mobile-only concerns out of it.

**supabase/migrations/** holds versioned schema changes. Every schema change goes through a migration file checked into git. No ad-hoc table edits in the dashboard.

---

## Domain Rules

These are non-negotiable for NUSLink:

- **Matching is scoped per module per semester.** Never return matches who are not co-enrolled in the same module in the same semester. Enforce this in the FastAPI matching endpoint and in the RLS policy on any view that exposes match candidates.
- **Current semester only.** Past semesters are read-only history and never used for live matching.
- **Match candidates must have completed onboarding.** Do not show profiles that lack the required preference fields.
- **Reliability is shown as badge tiers, never as a numeric score.** Use tier labels (e.g., New, Reliable, Trusted, Standout). Never expose a 4.7-out-of-5 style rating.
- **No public ranking.** Users see their personal matches. There are no global leaderboards, popularity counts, or visible follower counts.

---

## Privacy Rules

- Profile fields are opt-in per field. A user may choose to share their faculty but not their target grades.
- Free-block timetable data is only used for matching computation. Do not display another user's full timetable.
- Reputation data is aggregated to the reviewee — they see their tier, not individual reviews.
- Personal data access is enforced by Supabase row-level security policies at the database layer, not just in the client or the FastAPI layer.

---

## UI Rules

For any UI task:

- Replicate the provided design exactly.
- Match layout, spacing, padding, font sizes, font hierarchy, colors, border radius, shadows, alignment, and proportions.
- Do not approximate. Do not simplify unless explicitly asked.

---

## Styling Rules

Use NativeWind classes. Do not use StyleSheet unless it is not possible to style with className.

Use the NativeWind version installed in this project. Check `package.json`. Do not upgrade without approval.

Reuse class patterns through utilities in `global.css`.

### Style Exception List

Use StyleSheet or inline styles for:

- SafeAreaView (className not supported on all props)
- KeyboardAvoidingView (behavior props)
- Modal (visible, transparent props)
- Animated.View (animated style values)
- Dynamic styles calculated at runtime
- Platform-specific styles
- Pressable / TouchableOpacity pressed states
- Shadows (different per platform)

Everywhere else, use NativeWind.

---

## Image Rule

Use centralized image imports.

1. Check if `constants/images.ts` exists.
2. If not, create it.
3. Import all app images there.
4. Use them through the centralized object.

```ts
import logo from "@/assets/images/logo.png";
import emptyMatches from "@/assets/images/empty_matches.png";

export const images = {
  logo,
  emptyMatches,
};
```

```tsx
import { images } from "@constants/images";

<Image source={images.logo} />
```

Do not import image assets directly inside screens or components.

---

## State Management

- Zustand for global client state (authenticated user, current semester modules, match results cache). Stores live in `@store/`.
- Local component state for transient UI (form inputs, modal visibility).
- AsyncStorage for persistence (Supabase session, last-active semester).
- Server state from Supabase / FastAPI is the source of truth. Do not duplicate it in Zustand longer than necessary, and re-fetch rather than mutate cached copies in place.

---

## TypeScript

- Strict mode.
- No `any`. If a type genuinely cannot be expressed, use `unknown` and narrow.
- Keep types simple and readable.
- Generate Supabase database types via the Supabase CLI and import them from `@appTypes/database`. Do not hand-write table row types.
- Domain types (Match, Profile, Module) live in `@appTypes/`. Feature-only types stay inside the feature folder.

---

## Backend & API Rules

### Supabase

- Use the Supabase client exported from `@lib/supabase`. Do not create new clients elsewhere.
- All schema changes go through versioned migrations in `supabase/migrations/`. Check them into git.
- Row-level security must be enabled on every user-data table. Write the policy in the same migration that creates the table.
- The mobile app reads from Supabase directly for simple CRUD. Anything involving matching, scoring, or AI goes through the FastAPI backend.

### FastAPI backend

- Lives in `backend/`. Owns matching logic, AI calls (M3), and anything that doesn't belong in the database.
- Endpoints are versioned (`/v1/...`).
- All endpoints validated with Pydantic models.
- The mobile app calls FastAPI through `@lib/apiClient` (a thin fetch wrapper that handles auth headers and base URL).
- Auth: FastAPI verifies the Supabase JWT on incoming requests. Never trust user IDs sent from the client.
- Repository pattern: business logic does not import the database client directly. It calls a repository, so tests can swap in fakes.

### NUSMods API

- Read-only, public, rate-limited.
- Cache module metadata (title, code, semester offerings) in Supabase, refreshed daily.
- Never call NUSMods on every render or every keystroke. Debounce search and serve from local cache where possible.

---

## Matching Algorithm

This is the core domain logic. Treat it as a first-class concern.

- **Initial matching release:** 2-dimensional — target grade similarity + schedule overlap. Lives in `backend/` as a FastAPI endpoint (`/v1/matches`).
- **M3 expansion:** 4-dimensional with configurable weights — adds working style + communication preferences. Adds complementary-skill suggestions for project matching.
- **M3:** AI-augmented nudges layered on top. The base algorithm stays deterministic and testable.

Matching logic is isolated in its own module inside `backend/` (e.g. `backend/app/matching/`). The mobile app calls it through `@services/matchingService`. The matching function must be unit-testable in isolation against fixture data.

---

## Secrets

- Never expose secret keys in client code.
- Supabase anon key is public and fine to ship in the client.
- Supabase service-role key is server-only. It belongs in `backend/` env, never in the React Native bundle.
- Future OpenAI / Anthropic keys go through FastAPI only.
- Use `.env` for local development. `.env.example` is checked in. `.env` is gitignored.

---

## Authentication

- **M1:** Supabase email/password auth.
- **M3:** NUS SSO via OpenID Connect (Supabase Auth supports this).

Do not build custom auth flows. Do not store passwords yourself.

FastAPI validates the Supabase JWT on every authenticated request — do not re-implement auth there.

---

## Testing

- Unit tests for the matching algorithm and other core domain logic in `backend/`. Target 80%+ coverage on these.
- Integration tests for FastAPI endpoints using httpx against a test Supabase project.
- Component tests with React Native Testing Library for components with non-trivial logic.
- Skip tests for trivial presentational components.

---

## Feature Implementation

When building a feature:

1. Read this file first. Skim `FEATURES.md` and `DEVELOPMENT_PLAN.md` if the feature scope is unclear.
2. Identify the files to change. Prefer adding to an existing feature folder over creating a new one.
3. Keep changes focused.
4. Do not rewrite unrelated code.
5. Follow existing patterns. If you can't find a pattern, ask before inventing one.
6. Make sure the feature works end-to-end. If mobile and backend both change, test the round trip.
7. Fix lint and type errors before finishing.

---

## Communication

Be concise. Explain what changed and how to test it. Flag anything that touches more than one feature area, or both mobile and backend, before making the change.

---

## Final Reminder

Before every feature:

- Read this file.
- Follow it strictly.
- Build clean, simple code.
- Replicate UI exactly when designs are provided.
- One feature, one prompt, one commit.
