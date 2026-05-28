NUSLink: Feature Specification
A Mobile Platform for Building Academic Connections at NUS
Joel Yap & Zhang Kaiwen
Orbital 2026 — Apollo 11

Scope note: this document describes the intended product direction. If a feature is too large for the current milestone, `DEVELOPMENT_PLAN.md` decides when it ships, and `AGENTS.md` defines the smaller implementation scope to build first.
1. Introduction
1.1 Problem Statement
University modules in computing and other technical fields are heavily individual. Students sit in the same lectures and tutorials yet rarely form meaningful connections with their peers. As coursework becomes more demanding and in-person lectures become optional, students face increasing isolation. The consequences extend beyond mental well-being: students graduate with weak professional networks, miss opportunities for collaborative learning, and lose access to the peer-driven support structures that make university life academically and personally enriching.
1.2 Proposed Solution
NUSLink is a mobile application designed to help NUS students form meaningful academic and professional relationships. Unlike generic social platforms, NUSLink is purpose-built for the academic context. Students create professional profiles, register their current modules, and are intelligently matched with compatible peers for study groups, project teams, competition squads, and tutoring sessions. The platform combines structured profile data with a weighted matching algorithm to surface connections that students would not otherwise make.
1.3 Target Users
NUSLink is designed exclusively for NUS students. The primary user groups include freshmen seeking to build their first academic network, students looking for study partners or project teammates for specific modules, students seeking hackathon or competition teammates with complementary skills, and students willing to offer or receive peer tutoring.
2. User Onboarding
The onboarding flow follows a hybrid approach: essential information is collected upfront to enable immediate matching, while optional details can be completed later to improve match quality. The flow is designed to be completable in under three minutes.
2.1 Account Creation
For the initial release, users sign up via email and password using Supabase Auth. NUS Single Sign-On (SSO) is planned for a later milestone once the core product flow is stable. When introduced, SSO can be used to verify NUS student status and prefill academic information from identity claims.
2.2 Onboarding Screens
Screen 1 — Sign Up. The user creates an account via email and password. A future milestone may add SSO as an alternative sign-up path.
Screen 2 — Academic Information. The user enters faculty, major, year of study, and expected graduation date. Current semester modules are added via a search interface powered by the NUSMods API. Selected modules appear as removable chips. If SSO is added later, these fields can be pre-filled and remain editable.
Screen 3 — Profile Setup. The user uploads a profile picture and writes a short biography (200 characters maximum). Both fields are mandatory.
Screen 4 — Academic Interests. The user selects from broad predefined interest categories (such as AI/ML, Software Engineering, Data Science, Economics, Finance, Consulting, Design, and Research) and may add custom tags for niche interests. At least one interest is required. In M1 these suggestions are intentionally generalized across faculties rather than personalized by major or year.
Screen 5 — Intent Selection. The user selects one or more intents from: Study Groups, Hackathon/Competition Teams, Tutoring/TA, and Internship Networking. This selection is stored on the profile during onboarding completion. In M1 it helps complete the user profile and prepare later discovery features, but does not yet power people matching.
2.3 Optional Profile Fields
The following fields may be completed at any time after onboarding and contribute to a higher profile completion score and better match quality:
•	Timetable: Imported via NUSMods share URL (primary) or entered manually on a weekly grid. Used for schedule overlap scoring and shared scheduling.
•	Target grades: Set per module. Used by the matching algorithm to pair students with similar or complementary academic goals.
•	Professional links: LinkedIn, GitHub, or other portfolio URLs.
•	Resume upload: PDF, Word document, or screenshot. This is deferred to a later milestone, where AI may extract skills, interests, competition history, and work experience for auto-population (see Section 7.2).
•	Skills and language proficiency: Free-text tags for technical and non-technical skills.
•	Personality and workstyle quiz: A short questionnaire to capture working style preferences for improved matching. This becomes more important once the matching algorithm expands beyond the initial release.
3. Application Structure
3.1 Navigation
The application uses a bottom tab bar with five tabs and a top bar element:
•	Discover: The main browsing surface for both groups and communities. It contains a shared search bar and two browse modes: Groups and Communities. In M1, users can browse and join public groups and browse communities, while richer sorting and filtering remain intentionally light.
•	Create (+): Central elevated button for creating new groups. Opens the group creation form.
•	People: Dedicated people discovery and connection surface. In M1 it may appear only as an honest preview shell without functional matching or connect actions. In Milestone 2 it becomes the live people-discovery tab with list view, search, filters, compatibility sorting, and visible compatibility percentages.
•	Chats: Milestone 2 surface for the unified inbox containing group chats, community chats, and direct messages.
•	Profile: View the saved profile, current-semester modules, interests, intents, and M1 completion percentage. Rich editing and connection management are deferred.
The top bar contains the app logo and a notifications bell icon accessible from any screen in the fuller product vision. M1 may ship without the bell if notifications are not yet implemented.
3.2 Notifications
Notifications are delivered via in-app alerts and push notifications. Users receive notifications for connection requests, group invites, community activity, group recommendations, high-compatibility match alerts (80% or above), and smart nudges. A bell icon in the top bar displays the unread count. Tapping a notification navigates to the relevant screen.
4. Group Creation and Management
4.1 Group Types
Users can create four types of groups: Study Groups, Hackathon/Competition Teams, Project Teams, and Tutoring Sessions. These types are functionally identical in terms of available features; the distinction exists primarily to support filtering, matching context, and user intent. For example, the matching algorithm scores target grade similarity for study groups but target grade complementarity for tutoring sessions.
4.2 Group Creation Form
The creation form contains both mandatory and optional fields.
Mandatory fields: group name (50 characters maximum), group type, module, and privacy setting.
Optional fields: scheduled time and venue, minimum and maximum group size, text description (500 characters maximum), and tags.
In M1, only the manual public-group flow ships. Semi-private, private, and AI-assisted creation are deferred.
4.3 Privacy Settings
Public groups are visible to all users and can be joined by anyone.
Semi-private groups are visible only to users who satisfy a creator-defined restriction. The creator selects one of three restriction types: same module, same year, or same faculty. Users who meet the restriction can join directly.
Private groups display limited information (name, type, member count) to all users. Joining requires an explicit invitation. The creator can invite users through three methods: in-app user search, a shareable invite link, or a QR code. A “Request to Join” button is available for uninvited users.
4.4 Group Management
The group creator is automatically assigned the admin role and may promote other members to co-admin. Admins and co-admins can kick or mute members. Groups remain active until the creator manually closes them or all members leave. There is no automatic expiration.
5. Communities
5.1 Overview
Communities are larger, persistent groups designed for ongoing interaction around shared interests, clubs, or organisations. Unlike study groups, which are typically short-lived and task-specific, communities are intended to persist across semesters. Examples include NUS Hackers, NUS Developer Student Club, or a user-created community for a specific interest area.
5.2 Community Types
There are two categories of communities. Any verified user can create a community for an academic, professional, or interest-based purpose without prior approval. Official communities representing recognised NUS clubs and organisations are distinguished by a verified badge granted through a manual verification process. User-created communities do not require approval to create, but they are not marked as official unless they complete that verification flow.
5.3 Join Policies
The community creator selects one of two join policies. Open communities allow any user to join immediately. Request-approval communities require the creator or an admin to approve each join request before the user gains access.
5.4 Community Features
Inside a community, members have access to a group chat (with all standard chat features described in Section 6), a shared resources section for uploading and organising files, the ability to post group invites to recruit members for study groups or competition teams, and an events and calendar section. Community management follows the same admin and co-admin structure as groups.
6. Chat and Communication
6.1 Chat Features
All chat environments (group chats, community chats, and direct messages) share the same feature set:
•	Text messaging: Standard text messages with real-time delivery via Supabase Realtime.
•	Image and file sharing: Users can attach images or files from their device. Images render inline; files appear as downloadable links.
•	Polls: Any member can create a poll with a question and two to four options. Members vote by tapping an option, and results update in real time.
•	Pinned messages: Admins and co-admins can pin important messages. Pinned messages are accessible via a dedicated icon at the top of the chat.
•	Group invites: Members can share group invitations within a chat, allowing others to join relevant study groups or competition teams.
•	Threaded replies: Users can reply to a specific message to start a thread. The parent message displays a reply count, and tapping it opens a full-screen thread view with its own message input.
6.2 Shared Resources
Both groups and communities include a shared resources section, separate from the chat. Any member can upload files (documents, links, notes), and each member can delete their own uploads. This section is intended for persistent reference material such as lecture notes, past-year papers, and useful links, as distinct from the ephemeral flow of chat messages.
6.3 Shared Scheduling
Shared scheduling is available for study groups and hackathon/competition teams only. When members have linked their timetables, the system calculates overlapping free blocks across all members and suggests the top three to five time slots sorted by duration and member availability. Members who have not linked their timetable are shown the proposed time and can accept or decline manually. A session is confirmed when a majority of members accept. Confirmed sessions appear in the group detail screen and trigger notifications.
6.4 Direct Messages
Direct messages are restricted to mutually connected users. This design decision prevents unsolicited messages from strangers while encouraging users to establish connections before initiating private conversations. A “Connect” button is visible on member profiles within groups and communities to facilitate this.
6.5 Unified Inbox
The Chats tab presents a single unified inbox containing all group chats, community chats, and direct messages. Conversations are sorted by most recent message. Each row displays the chat name (or the other user’s name for direct messages), a preview of the last message, a timestamp, and an unread message count badge.
7. AI-Powered Features
These features are deferred until the later milestone after the core product is stable.
7.1 Group Creation Autofill
The group creation screen offers a toggle between manual mode and AI-assisted mode. In AI mode, the user is presented with a single large text input where they describe the group in natural language. For example, a user might type: “CS2040S study group before midterms, 3–5 people at CLB.”
The system sends this text to an AI language model, which extracts structured fields: group name, type, module, size range, scheduled time, venue, description, and tags. The AI also suggests fields that the user did not mention, such as relevant tags based on the module topic or recommended venues. The extracted fields auto-populate the standard form, and the user reviews and edits before submitting. If the AI cannot extract a required field, it is left empty for the user to complete manually. Until this milestone, group creation remains fully manual.
7.2 Profile Autofill from Resume
Users can import professional information by uploading a PDF resume, a Word document, or a screenshot. The system extracts text from the document (or uses AI vision for screenshots) and identifies skills, academic interests, competition history, and work experience. The extracted data is presented in a review screen where the user can edit, add, or remove items before saving to their profile. This feature is available both during onboarding and on the profile page.
7.3 Smart Nudges
The system generates context-aware notifications to encourage engagement and surface timely opportunities. There are three categories of nudges:
•	Time-based nudges are triggered by the academic calendar. For example, two weeks before midterms, the system might notify a user: “CS2040S midterms in 2 weeks — 3 study groups are forming.”
•	Behaviour-based nudges are triggered by user inactivity patterns. For example, a user who signed up but has not joined any group after three days might receive: “You haven’t joined a group yet — here are your top matches.”
•	Network-based nudges are triggered by changes in a user’s social graph. For example, when multiple connections register for the same module next semester: “4 people in your connections are also taking CS3230.”
Nudges are delivered via in-app notifications and push notifications. Users can toggle each nudge type on or off independently in their settings.
8. Smart Matching Algorithm
8.1 Overview
NUSLink uses a weighted scoring algorithm to calculate compatibility between users (people-to-people matching) and between users and existing groups (people-to-group matching). This approach was chosen over alternatives such as collaborative filtering or machine learning because it is explainable, works with sparse data, and is implementable within the project timeline. The initial release uses a smaller deterministic version, then expands in a later milestone.
8.2 Matching Dimensions
The initial matching release scores compatibility across two dimensions:
Schedule Overlap. The system counts overlapping free time blocks between two users’ timetables and normalises by the maximum possible overlap. This is a soft factor: users with no overlap are not excluded but receive a lower score.
Target Grade. Scoring is similarity-based for the initial release: two users aiming for similar grades in the same module score more highly.

In a later milestone, the algorithm expands to four dimensions by adding Working Style and Communication Preference with configurable weights. Skills remain useful for profile display and project discovery, and may later inform complementary-skill suggestions, but they are not part of the initial matching score.
8.3 Missing Data Handling
Several dimensions rely on optional profile fields (timetable, target grades, working style, communication preference). When a dimension has no data for one or both users, its weight is redistributed proportionally across the remaining dimensions. This ensures that users with incomplete profiles still receive meaningful matches, while users with complete profiles receive more nuanced scoring.
8.4 Matching Modes
People-to-people matching ranks other users by their pairwise compatibility score with the current user. The People tab displays these as profile cards or list items with a compatibility percentage.
People-to-group matching scores the current user against each existing group. The score is calculated as the average of the user’s pairwise scores with all current group members. A bonus is applied if the group’s module matches one of the user’s registered modules.
8.5 Scope and Recommendations
Live matching is scoped to users in the same module in the same semester. Past semesters are read-only history and are never used for live matching. The system proactively notifies users only when a match scores 80% or above, to avoid notification fatigue.
9. Discover Tab
9.1 Group Discovery
The Discover tab is the main browsing surface for group and community discovery. In M1, the Groups mode displays available public groups as scrollable cards. Each card shows the group name, type badge, module code, and an action to join. Honest empty states are preferred over fake cards if no groups exist.
9.2 Community Discovery
The Communities mode inside Discover allows users to browse, search, and join larger communities. This includes official NUS club communities and user-created communities. In M1, the browsing experience should be real but lightweight rather than overbuilt.
9.3 Search, Sort, and Filter
Discover includes a shared search bar for searching groups and communities. M1 keeps search and filtering intentionally simple. Advanced sorting, richer filters, and timetable-aware ranking are deferred to later milestones.
9.4 People Tab
The People tab is the dedicated surface for people discovery and connection. In M1 it should be presented only as an honest preview if included at all, without functional compatibility percentages, “High match” chips, or “Connect” actions. In Milestone 2 it ships as a simple list view with search, filters, sort by compatibility, and visible compatibility percentages.
10. Connection System
NUSLink uses a mutual connection model. One user sends a connection request; the other accepts or declines. Accepted connections are bilateral: both users appear in each other’s connections list. Declining a request removes it silently without notifying the requester.
In Milestone 2, the People tab becomes the main surface for discovering users, viewing compatibility percentages, and sending connection requests. Connections serve as the gateway to direct messaging. Users can only initiate a direct message conversation with someone they are mutually connected with. This entire connection system remains deferred beyond M1.
11. Reputation and Rating System
11.1 Rating Structure
Users can rate others across three categories: Reliability, Communication, and Contribution, and may also leave a written review or testimonial. A numeric input may be used internally to compute aggregates, but the public-facing trust summary should prioritize badge tiers and written reviews rather than raw category averages or public numeric scores.
11.2 Eligibility
Only users who have been in the same group for a minimum duration may rate each other. The minimum duration is configurable by the group creator (with a default of seven days). This ensures that ratings reflect actual collaborative experience rather than superficial interaction.
11.3 Rating Prompts
When a user leaves a study group (after meeting the minimum duration), an optional prompt invites them to rate their groupmates. Ratings can also be submitted at any time from the group member list.
11.4 Badge Tiers
Aggregate ratings determine a user’s badge tier. The exact thresholds can be tuned during implementation, but the product should surface tier labels rather than public numeric scores. Tentative tier labels are New, Reliable, Trusted, and Standout. Badge icons appear next to the user’s display name throughout the app, and written reviews can be shown on the reviewed user’s profile.
11.5 Future Monetisation
Premium and paid cosmetic badges are planned as a future revenue stream. Details are to be defined post-Orbital.
12. Security and Content Moderation
12.1 Access Control
For the initial release, authenticated users access the core product through Supabase email/password auth. If NUS SSO is added in a later milestone, tighter verification-based permissions can be introduced then.
12.2 AI Content Moderation
All user-generated content is scanned by an AI moderation system. This includes group names, descriptions, and tags; chat messages across all environments; and profile biographies. The moderation system classifies content into three categories:
•	Safe: Content is posted normally.
•	High-confidence violation: Content is blocked before posting. The user receives an explanation of why the content was rejected.
•	Borderline: Content is posted but automatically flagged and hidden from other users, pending future human review.
12.3 Violation Categories
The moderation system detects five categories of violations: illegal activity (such as selling drugs or contraband), commercial activity unrelated to academics (such as buy-and-sell postings), harassment, hate speech, or explicit content, spam or phishing attempts, and impersonation of other users or organisations.
12.4 Consequence Framework
Consequences are severity-based. Minor violations (such as off-topic posts) result in a warning and content removal. Moderate violations (such as repeated off-topic behaviour or minor commercial activity) result in a temporary ban of seven days, during which the user can read content but cannot post. Severe violations (such as illegal activity or harassment) result in an immediate permanent ban and account deactivation.
12.5 Future Work
Community reporting (a flag button on any piece of content), a human moderator dashboard for reviewing flagged content, and a formal appeal process for bans are planned for post-Orbital development.
13. Design Direction
The visual design of NUSLink follows a clean, modern, and minimalistic aesthetic built around white surfaces, black primary actions, and soft slate-blue accents. The typeface is SF Pro, chosen for its professional but approachable feel and native rendering on iOS. Cross-platform font licensing for Android is to be resolved separately.
The overall design philosophy prioritises readability, generous whitespace, and a card-based layout for browsable content such as groups and user profiles. The interface avoids visual clutter and presents information hierarchically, surfacing the most relevant M1 details (module, group type, completion state) at the card level and revealing richer social signals in later milestones.
14. Technical Architecture
14.1 Tech Stack
Mobile application: React Native with Expo and TypeScript, styled with NativeWind (Tailwind CSS for React Native).
Backend (data, auth, real-time): Supabase, providing PostgreSQL database, authentication, real-time subscriptions for chat, and file storage. NUS SSO via OIDC is deferred to a later milestone.
Backend (matching and AI logic): FastAPI in Python, responsible for the matching algorithm, later AI-powered features (autofill, moderation, nudges), and complex business logic.
External APIs: NUSMods API for module data and timetable information. OpenAI or Anthropic API is deferred until the AI milestone.
Hosting: Supabase Cloud for the database and real-time infrastructure. Railway for the FastAPI backend.
14.2 Software Engineering Practices
The project follows GitHub Flow with branch protection on the main branch, requiring pull requests with teammate approval and passing CI checks before any merge. GitHub Actions automates linting (ESLint for TypeScript, Ruff for Python), type checking (TypeScript compiler, mypy), and automated tests on every push. Deployment is automated via Expo EAS Update for the mobile app and Railway for the backend.
The testing strategy covers unit tests for core domain logic (particularly the matching algorithm), integration tests for FastAPI endpoints, and component tests using React Native Testing Library, with a target of 80% coverage on critical modules. Development follows two-week sprints tracked on GitHub Projects with planning and retrospective sessions each cycle.
The architecture enforces separation of concerns: React Native handles presentation, Supabase handles data persistence and authentication, and FastAPI owns domain logic. A repository pattern keeps business logic testable without requiring a live database. All schema changes go through versioned Supabase migrations committed to version control, with row-level security policies enforcing data access at the database layer.
15. Development Timeline
15.1 Milestone 1 — Technical Proof of Concept (End of May)
Functional email sign-up and login. Stable auth routing and onboarding guards. Complete five-screen onboarding flow with data persisted to the database. Basic profile page with real saved data and a completion bar. Module registration via NUSMods API. Basic group creation (public groups only, manual form). Basic Discover tab for groups and communities with simple search and honest empty states. People tab preview only, with no functional people matching or connect actions. Basic sign-out. FastAPI backend deployed with health endpoint. CI pipeline operational.
15.2 Milestone 2 — Core Features Complete (End of June)
Initial smart matching algorithm with two-dimensional scoring (target grade similarity and schedule overlap). People tab ships with a simple list view, search, filters, sort by compatibility, visible compatibility percentages, and connection requests. Compatibility percentage may also be shown on relevant group discovery surfaces where appropriate. Full group creation with all three privacy types using the manual flow. Communities support browse, create, join, and chat flows within the Discover and chat architecture. Real-time chat with text, images, files, polls, and pinned messages. Shared resources section. Direct messaging. Timetable import. Unified chat inbox with unread tracking. Basic notifications. User testing with five to ten NUS students.
15.3 Milestone 3 — Extended System (End of July)
NUS SSO via OpenID Connect. Matching algorithm expanded to four dimensions with configurable weights. AI group creation autofill. AI profile extraction from resumes. Smart nudges (time-based, behaviour-based, network-based) with user controls. Reputation and rating system with badge tiers plus visible written reviews on user profiles. Threaded replies in chat. Shared scheduling with auto-suggested time slots. AI content moderation. Push notification infrastructure. Profile completion bar with full calculation. Comprehensive user testing with fifteen to twenty students. Full technical and project documentation. Final demo video and updated poster.
