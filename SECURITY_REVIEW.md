# SB Mentorship App — Security Review

_Scope: index.html, pages/*, js/db.js, js/utils.js, supabase/schema.sql, supabase-config.js._
_Context: the app stores confidential data — confidential meeting comments, private discussion points, wellbeing check-ins, parent details, and password hashes._

**Headline:** This is a **client-only** application. All logic, data, and access checks run in the browser. There is **no server-side authorization**. On its own that already means confidentiality is only cosmetic; combined with the new Supabase connection using a public key and permissive rules, the **entire database is currently world-readable and writable by anyone who loads the site.** Do **not** launch to real students/parents in this state.

Severity: 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low

---

## 🔴 Critical

### C1. Supabase is wide open (permissive RLS + public anon key)
`supabase/schema.sql` grants the `anon` role **full read/write on every table**:
```sql
create policy "anon_all_..." on <table> for all to anon using (true) with check (true);
```
The anon/publishable key is (correctly) shipped in `js/supabase-config.js` — but with these policies, **anyone who opens the site can call the Supabase REST API directly** and read or modify **all data**: every student's records, **confidential comments**, **wellbeing entries**, **parent info**, and **password hashes** — or delete everything.
**Fix:** Do not go live with `to anon using(true)`. Move auth to **Supabase Auth** and write **per-role RLS** (students see only their own rows; parents only their approved child; teachers only assigned students; staff scoped to department). Until RLS is correct, keep Supabase off.

### C2. No real authorization — all access control is client-side
`requireAuth(roles)` and every "who can see this" check run in the browser and only redirect the page. They are trivially bypassed via DevTools or by calling the DB/REST directly. Confidential comments, private discussion points, and wellbeing are filtered **only in the UI** (`StudentReport.canSeeConfidential`), while the underlying records are fully present in the client.
**Fix:** Authorization must be enforced server-side (RLS policies and/or an API). The UI checks are convenience only.

### C3. Weak password hashing, and hashes exposed to clients
`js/db.js` hashes passwords with **unsalted SHA-256**, with a fallback to a trivial 32-bit hash (`'fb_' + …`). Hashes are stored in the `users` records, which are loaded into every browser and synced to a world-readable table.
- Unsalted SHA-256 is fast → rainbow-table / brute-force friendly.
- The fallback hash is effectively reversible.
- Any user (or anyone via the anon key) can read **all** password hashes.
**Fix:** Use **Supabase Auth** (server-side, salted bcrypt/scrypt) and never expose hashes to the client. If keeping custom auth, hashing and verification must happen server-side with bcrypt/argon2 + per-user salt.

### C4. Session tampering → privilege escalation
The session is unsigned JSON in localStorage:
```js
{ userId, role, name, email, expiresAt }
```
`isSessionValid()` only checks expiry. A user can edit `role` to `admin` (or change `userId` to impersonate anyone) in DevTools and reload → **full admin access**.
**Fix:** Use signed tokens (Supabase Auth JWTs) verified server-side; never trust a client-set role.

---

## 🟠 High

### H1. Stored XSS across the app and the PDF export
Many user-editable fields are inserted into the DOM via `innerHTML` **without escaping** — names, life goal, hobbies, meeting discussion/goals, achievement titles, notification messages, etc. (sinks in `pages/*.html` and `js/utils.js` incl. the `PDFGen` `document.write`). A student who sets, say, their **Life Goal** or a meeting note to `"<img src=x onerror=…>"` runs script in the **mentor's/HOD's** browser when they view the file → session theft or exfiltration of confidential data.
**Fix:** Escape every interpolated value (`Str.escHtml`) or use `textContent`; add a strict **Content-Security-Policy**. Escape values in the PDF HTML too.

### H2. Confidential data is loaded into every client
The app pulls the **full** users list (with `passwordHash`), all meetings (incl. `confidentialComments`, teacher/student private discussion points), and wellbeing entries into memory/localStorage for every role. Hiding them in the UI does not protect them.
**Fix:** Fetch only rows/columns the current role may see (server-enforced). Don't send confidential columns to clients that shouldn't see them.

### H3. Email provider secrets stored in world-readable settings
SMTP host/username/**password** and API keys are saved in the `settings` blob (localStorage + Supabase, anon-readable).
**Fix:** Keep email credentials server-side only; never in client storage.

### H4. Parent access gate is cosmetic
`parent.html` checks `ward.parentApproved` in JS, and falls back to matching by `parentEmail`. Both are bypassable, and with the anon key a parent can read **any** child's data regardless of approval.
**Fix:** Enforce parent↔student linkage and approval in RLS/server.

---

## 🟡 Medium

### M1. Predictable invite / reset tokens
`generateId()` uses `Date.now()` + `Math.random()` (not cryptographic). Invite/password-reset tokens built from it are guessable, and the reset flow trusts a client-side token check.
**Fix:** Server-generated, single-use, expiring tokens using `crypto.randomUUID()`/CSPRNG; store only hashes of tokens.

### M2. Confidential data persists after logout / on shared machines
`logout()` only removes `sb_session`. All users, hashes, and confidential records remain in `localStorage`. On a shared/lab computer the next person can read everything from DevTools.
**Fix:** Clear sensitive caches on logout; avoid caching confidential data client-side.

### M3. No CSP and no Subresource Integrity
No `Content-Security-Policy` anywhere, and the `@supabase/supabase-js` CDN `<script>` has no SRI hash — supply-chain and XSS exposure.
**Fix:** Add a strict CSP meta tag; pin the CDN with `integrity`/`crossorigin` or self-host it.

### M4. No rate limiting / lockout; client-side only
Login has no server-side throttling or lockout, enabling credential stuffing / brute force (made worse by C3).
**Fix:** Enforce rate limiting + lockout server-side.

### M5. Audit log is client-side and mutable
`audit_log` lives in localStorage and can be edited/erased by anyone → not usable for accountability.
**Fix:** Append-only, server-side audit.

---

## ⚪ Low

- **L1.** `Reset demo data` on the login page calls `localStorage.clear()` — remove for production (data-loss button).
- **L2.** CSV import has no validation and no CSV-formula-injection guard on later export.
- **L3.** `PDFGen` opens a new window and `document.write`s raw HTML (ties to H1).
- **L4.** No enforced HTTPS/secure headers (depends on hosting — set HSTS, X-Content-Type-Options, etc.).

---

## Recommended order of remediation
1. **Don't expose the DB.** Turn Supabase back off (blank the keys) until RLS is real, OR immediately replace the permissive policies. (C1)
2. **Adopt Supabase Auth + per-role RLS** — this fixes C1, C2, C3, C4, H2, H4, M1, M4 together, because authorization and password handling move server-side.
3. **Escape all output + add CSP** to close stored XSS. (H1, M3, L3)
4. **Stop shipping secrets/hashes to the client** (email creds, password hashes). (C3, H3)
5. **Clear sensitive data on logout**, remove the reset button. (M2, L1)

Most of items C1–C4 are inherent to a purely client-side app: the durable fix is putting **authorization and secrets on the server (Supabase Auth + RLS, or a small API)**. The XSS/output-escaping and logout-clearing items can be fixed in the client immediately.
