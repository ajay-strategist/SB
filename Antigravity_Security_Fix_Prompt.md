# Antigravity Prompt — Secure the SB Mentorship App for production

> Paste this into Antigravity. It fixes the security issues found in `SECURITY_REVIEW.md`. The app is a static client-only web app (HTML/CSS/vanilla JS) in this repo: `index.html`, `pages/*.html`, `js/db.js`, `js/utils.js`, `js/supabase-config.js`, `supabase/schema.sql`. It stores **confidential data** (confidential meeting comments, private discussion points, wellbeing check-ins, parent details, password hashes), so treat this as a security hardening task and do not regress existing features.

## Context you must respect
- The current data layer (`js/db.js`) keeps an in-browser cache and mirrors writes to Supabase. Login is currently **custom** (email + password hash in the `users` record).
- Supabase is connected via a **public anon/publishable key** in `js/supabase-config.js`, and `supabase/schema.sql` currently grants the `anon` role **full read/write on every table** — meaning the entire database is world-readable/writable. This is the top priority to fix.
- Keep all existing app features and screens working (Admin, Principal=college-wide HOD view, HOD, Teacher/Mentor, Student, Parent). Do not change business logic behavior, only how security is enforced.

## Goal
Move **authorization and secrets to the server (Supabase)**, eliminate client-side trust, and close the output-escaping / session issues — so confidential data is only accessible to the right role.

---

## Task 1 — Adopt Supabase Auth (replace custom login) 🔴
- Replace the custom email/password check in `js/db.js` with **Supabase Auth** (`signInWithPassword`, `signUp` via admin invite, `resetPasswordForEmail`, `signOut`, `getSession`, `onAuthStateChange`).
- Stop storing or comparing password hashes anywhere in the client. Remove `hashPassword`/`verifyPassword` usage for auth. Remove `passwordHash` from the `users` table/records.
- Map the Supabase Auth user to an app profile row in `users` (same `id` as `auth.users.id`). Keep `role`, `department_id`, `course_id`, `class_id`, etc. on that profile row.
- The session/role must come from the **Supabase JWT**, not from a client-set object. Remove the tamperable localStorage session (`sb_session`) as the source of truth; derive role from the authenticated user's profile.
- Preserve the existing flows: admin invites users (Supabase invite / generated signup link), users set their own password, forgot-password works.

## Task 2 — Real Row Level Security (RLS) 🔴
Rewrite `supabase/schema.sql` policies. **Remove every `to anon using(true) with check(true)` policy.** Add least-privilege policies keyed off `auth.uid()` and the caller's role (read role from the `users` profile via a `SECURITY DEFINER` helper function or a JWT claim). Enforce:
- **Student:** can read only their own records (profile, semester records, extra-credit, achievements, meetings, mentoring notes, goals, wellbeing). **Never** read `confidential_comments`, teacher private discussion points, or other students' data.
- **Parent:** can read only their linked child's data **and only when `parent_approved = true`**; never confidential columns.
- **Teacher/Mentor:** can read/write only students assigned to them (via `mentor_assignments`) or in their classes; can read confidential comments; cannot see other teachers' private discussion points.
- **HOD:** scoped to their department. **Principal/Admin:** college-wide.
- Confidential fields (`confidential_comments`, `discussion_points_teacher`, `discussion_points_student`) must be protected by policy or split into a separate table so students/parents physically cannot fetch them.
- Provide the full corrected `schema.sql` (tables + policies + helper function). Include a safe migration that drops the permissive policies.

## Task 3 — Don't ship secrets or confidential columns to clients 🔴🟠
- Password hashes: removed (Task 1).
- **Email provider secrets** (SMTP host/user/password, API keys) must not live in the client-readable `settings` blob. Move email sending + credentials to a **Supabase Edge Function** (or server); the client only triggers it.
- Ensure queries select only the columns/rows a role is allowed to see (enforced by RLS, but also avoid `select *` of confidential columns for student/parent views).

## Task 4 — Fix stored XSS (output escaping + CSP) 🟠
- Audit every `innerHTML` sink across `index.html`, `pages/*.html`, and `js/utils.js`. **Escape all interpolated user-controlled values** (names, life goal, hobbies, meeting notes/goals/comments, achievement titles, remarks, notification title/message, profile fields, etc.). Use the existing `Str.escHtml` or switch to `textContent`. Include the **PDF export** in `PDFGen` (it `document.write`s raw HTML — escape those values too).
- Add a strict **Content-Security-Policy** meta tag to every HTML page (disallow inline event handlers where feasible, restrict script/style/img/connect sources to self + the Supabase domain + the supabase-js CDN).
- Add **Subresource Integrity** (`integrity` + `crossorigin`) to the `@supabase/supabase-js` CDN `<script>` tags, or self-host the library.

## Task 5 — Session & logout hygiene 🟠🟡
- With Supabase Auth in place, the role can no longer be forged client-side (Task 1). Remove any remaining trust in a client-set role.
- On **logout**, fully clear all cached app data (not just the session): clear the in-memory cache and remove the app's localStorage keys so confidential data does not remain on shared/lab computers. Call `supabase.auth.signOut()`.

## Task 6 — Tokens, rate limiting, audit 🟡
- Use Supabase Auth's built-in invite/reset tokens (server-generated, single-use, expiring). Remove the custom `generateId()`-based invite/reset tokens for auth.
- Rely on Supabase Auth rate limiting; add lockout/backoff if using a custom endpoint.
- Make the audit log **server-side and append-only** (a table only writable by an Edge Function / policy, not by clients). Clients may read their own audit entries per RLS.

## Task 7 — Cleanups 🟡⚪
- Remove the **"Reset demo data"** button/`localStorage.clear()` from `index.html` for production (or gate it behind admin-only + confirmation).
- Add basic secure-hosting headers guidance in a README (HSTS, X-Content-Type-Options: nosniff, Referrer-Policy, X-Frame-Options/frame-ancestors). 
- Add a CSV import validation + guard against CSV formula injection on export.

---

## Constraints
- Preserve all current features and role behaviors; this is hardening, not a redesign.
- Provide the corrected `supabase/schema.sql`, updated `js/db.js` (Supabase Auth + no client secrets), CSP additions in all HTML pages, and any Edge Functions (email, audit) with deploy instructions.
- After each task, explain what changed and how to verify it (e.g., "log in as a student, confirm the Supabase network calls cannot fetch another student's row or any confidential column").

## Acceptance criteria (must all pass)
1. With the browser DevTools, a logged-in **student** cannot fetch another student's data or any confidential field from Supabase (RLS blocks it) — verified via the network tab / direct REST call.
2. A **parent** can only fetch their approved child's non-confidential data.
3. No password hashes, SMTP/API secrets, or other students' confidential comments are present in any client response.
4. Editing localStorage/session cannot change the effective role (role comes from the Supabase JWT).
5. Injecting `"<img src=x onerror=alert(1)>"` into any editable field does **not** execute when another role views it or exports the PDF.
6. A strict CSP is present and the app still functions.
7. Logout leaves no confidential data in browser storage.
8. The permissive `anon using(true)` policies are gone.
