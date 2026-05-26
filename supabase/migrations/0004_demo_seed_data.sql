-- Optional QA/demo seed data for Milestone 1 manual testing.
-- Run this only in a non-production Supabase project after creating matching auth users.
--
-- Example usage:
-- 1. Create demo auth users in Supabase Auth.
-- 2. Replace the UUID placeholders below with those auth user IDs.
-- 3. Run the inserts to create demo profiles, modules, groups, and memberships.
--
-- This file is documentation-first on purpose: M1 QA may use seeded demo records,
-- but the shipped app should not rely on fake placeholder UI.

-- INSERT INTO public.profiles (id, display_name, bio, faculty, major, year_of_study, interests, intents, onboarding_completed)
-- VALUES
--   ('00000000-0000-0000-0000-000000000001', 'Demo User 1', 'Business and analytics student looking for module mates.', 'NUS Business School', 'Business Analytics', 1, ARRAY['Finance', 'Consulting', 'Data Science'], ARRAY['study_group'], TRUE),
--   ('00000000-0000-0000-0000-000000000002', 'Demo User 2', 'Computing student interested in startup teams and revision groups.', 'School of Computing', 'Computer Science', 2, ARRAY['Software Engineering', 'AI / ML'], ARRAY['study_group', 'hackathon'], TRUE);

-- INSERT INTO public.modules (code, name, department, faculty)
-- VALUES
--   ('ACC1701X', 'Accounting for Decision Makers', 'Accounting', 'NUS Business School'),
--   ('CS1101S', 'Programming Methodology', 'Computer Science', 'School of Computing')
-- ON CONFLICT (code) DO NOTHING;

-- INSERT INTO public.user_modules (user_id, module_code, semester)
-- VALUES
--   ('00000000-0000-0000-0000-000000000001', 'ACC1701X', 'AY2627S1'),
--   ('00000000-0000-0000-0000-000000000002', 'CS1101S', 'AY2627S1')
-- ON CONFLICT (user_id, module_code, semester) DO NOTHING;

-- INSERT INTO public.groups (name, type, module_code, privacy, creator_id, description)
-- VALUES
--   ('ACC1701X Revision Circle', 'study_group', 'ACC1701X', 'public', '00000000-0000-0000-0000-000000000001', 'Weekly revision for business students.'),
--   ('CS1101S Problem Set Squad', 'study_group', 'CS1101S', 'public', '00000000-0000-0000-0000-000000000002', 'Work through tutorials together every week.');
