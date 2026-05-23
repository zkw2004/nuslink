NUSLink — Development Plan & Work Allocation
Joel Yap & Zhang Kaiwen
Orbital 2026 — Apollo 11

A development plan for the conservative scope of NUSLink. This document translates `FEATURES.md` into milestone-sized deliverables and follows the implementation guardrails in `AGENTS.md`: keep M1 small, ship a manual non-AI core first, and defer SSO plus AI-heavy features until the later milestone.

## Overview

This plan breaks the product into six two-week sprints across three milestones.

- Milestone 1 proves the stack works end to end.
- Milestone 2 ships the core social and matching experience.
- Milestone 3 adds higher-risk features such as SSO, AI, moderation, and trust signals.

## Allocation Summary

- Joel owns most frontend-heavy surfaces, authentication UI, chat UI, notifications, and AI-facing product flows.
- Kaiwen owns backend architecture, database design, matching logic, moderation, trust systems, and technical documentation.
- Integration testing, milestone reports, and final submissions are shared.

## Milestone 1 — Technical Proof of Concept

Deadline: End of May 2026

Goal: users can sign up, finish onboarding, create basic public groups, and browse or join them. The backend, database, and CI pipeline are working.

### Joel

- Project scaffolding: initialise Expo, TypeScript, NativeWind, folder structure, and path aliases. Est. 2 days.
- Supabase project setup: configure email/password auth, initial project settings, and core environment setup. Est. 1 day.
- Sign-up and login screens: build email/password auth flow with loading and error states. Est. 3 days.
- Onboarding screens 1–3: sign up, academic information, and profile setup. Integrate NUSMods search and profile image upload. Est. 4 days.
- CI pipeline: configure linting, type-checking, Python checks, and automated test runs. Est. 1 day.

### Kaiwen

- FastAPI backend scaffolding and deployment: set up project structure, health endpoint, CORS, and Railway deployment. Est. 2 days.
- Database schema design and migrations: create initial schema for users, profiles, modules, groups, and memberships with RLS. Est. 2 days.
- Onboarding screens 4–5: academic interests and intent selection, including persistence and onboarding completion flow. Est. 3 days.
- Basic profile page with completion bar: show user info, modules, interests, and intents with editable fields. Est. 3 days.
- Basic group creation: public groups only, manual form only. Est. 2 days.
- Basic Discover tab: list and join public groups, no matching yet. Est. 2 days.

### Shared

- Integration testing and bug fixes: verify onboarding through group join end to end. Est. 2 days.
- Milestone 1 documentation and submission: report, README updates, demo prep, poster updates. Est. 1 day.

## Milestone 2 — Core Features Complete

Deadline: End of June 2026

Goal: ship the core experience with manual group creation, initial matching, real-time chat, communities, direct messaging, and timetable-aware discovery.

### Joel

- Full group creation: add semi-private and private privacy modes, invite flow, and visibility rules. Est. 3 days.
- Real-time chat: text, images, and files using Supabase Realtime. Est. 4 days.
- Chat features: polls and pinned messages. Est. 3 days.
- Timetable import: parse NUSMods share URL and support manual fallback entry. Est. 2 days.
- Unified chat inbox: merge group chats, community chats, and DMs with unread state. Est. 2 days.
- User testing coordination: recruit and run sessions with 5–10 NUS students. Est. 2 days.

### Kaiwen

- Initial matching algorithm: implement 2-dimensional scoring in FastAPI using target grade similarity and schedule overlap. Enforce same-module, same-semester matching. Est. 4 days.
- Matching API and Discover integration: expose ranked people and group matches with compatibility percentages and filters. Est. 3 days.
- Communities tab: browse, create, join, and chat in communities. Est. 4 days.
- Shared resources section: support persistent uploads for groups and communities. Est. 2 days.
- Connection system and direct messaging: mutual connections gate DMs. Est. 3 days.
- Basic notifications: in-app notifications for requests, invites, activity, and high-match alerts. Est. 2 days.

### Shared

- Integration testing and user feedback synthesis: validate matching, chat, communities, and connections end to end. Est. 3 days.
- Milestone 2 documentation and submission: report, updated technical notes, demo, and poster updates. Est. 1 day.

## Milestone 3 — Extended System

Deadline: End of July 2026

Goal: add higher-risk and higher-complexity features after the core product is stable.

### Joel

- NUS SSO integration: add Supabase OIDC flow while keeping email/password as fallback. Est. 3 days.
- AI group creation autofill: natural-language group drafting through FastAPI. Est. 3 days.
- AI profile extraction from resumes: extract and review professional information from uploaded files. Est. 4 days.
- Smart nudges system: time-based, behaviour-based, and network-based nudges with user controls. Est. 4 days.
- Threaded replies in chat. Est. 2 days.
- Push notification infrastructure. Est. 3 days.
- Comprehensive user testing with 15–20 students. Est. 3 days.
- Final demo video and poster. Est. 2 days.

### Kaiwen

- Matching algorithm expansion: extend the initial model to 4 dimensions by adding working style and communication preference with configurable weights. Est. 3 days.
- Reputation and rating system: collect internal rating inputs but surface only badge tiers to users. Est. 4 days.
- Shared scheduling: compute overlapping free blocks and support accept/decline coordination. Est. 4 days.
- AI content moderation: moderate group content, chats, and bios through FastAPI. Est. 3 days.
- Profile completion bar: full calculation across optional fields. Est. 1 day.
- Full technical documentation: architecture, API, schema, deployment, contribution guide. Est. 2 days.
- Final bug fixes and polish. Est. 4 days.

### Shared

- Final integration testing and regression testing. Est. 2 days.
- Milestone 3 documentation and final submission. Est. 1 day.

## Sprint Timeline

- Sprint 1, May 12–25: project scaffolding, auth foundation, backend foundation, initial schema.
- Sprint 2, May 26–Jun 8: onboarding completion, profile page, public groups, Discover, CI, Milestone 1 wrap-up.
- Sprint 3, Jun 9–22: privacy-aware groups, initial matching, chat foundation, Discover integration.
- Sprint 4, Jun 23–Jul 6: communities, resources, DMs, notifications, timetable import, inbox, Milestone 2 wrap-up.
- Sprint 5, Jul 7–20: SSO, matching expansion, AI flows, moderation, reputation, scheduling, push notifications.
- Sprint 6, Jul 21–31: large-scale user testing, polish, documentation, final demo, final submission.

## Dependencies And Risks

### Cross-Cutting Dependencies

- Matching depends on onboarding data, modules, and timetable data being stable.
- Chat depends on Supabase Realtime and storage setup from the early milestones.
- AI features depend on FastAPI infrastructure and access to an external AI provider.
- Push notifications depend on Expo notification setup and device token handling.

### Risk Mitigation

- SSO is deferred to Milestone 3 because it is the highest-risk external dependency.
- The core product remains usable with email/password auth if SSO slips.
- The first matching release stays intentionally small and deterministic.
- Every AI-assisted feature must have a manual fallback.

## Coordination

- Use GitHub Projects for task tracking.
- Require teammate review before merge.
- Do sprint planning and retrospectives together.
- Use milestone integration testing to catch cross-feature regressions early.
