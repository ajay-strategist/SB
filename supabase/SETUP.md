# Connecting the app to Supabase

The app works on browser storage by default. To use your Supabase project as the database:

## 1. Create the tables
In Supabase → **SQL Editor** → New query → paste all of `supabase/schema.sql` → **Run**.
This creates one table per data collection (JSON documents) plus permissive access for the `anon` key.

## 2. Add your keys
Open `js/supabase-config.js` and fill in (from Supabase → **Project Settings → API**):
```js
window.SB_CONFIG = {
  url: 'https://YOUR-PROJECT.supabase.co',
  anonKey: 'YOUR-ANON-PUBLIC-KEY',
};
```
The anon public key is safe in front-end code.

## 3. First run
Open the app. On load it:
- **Hydrates** from Supabase (pulls existing data into the browser).
- If Supabase is empty, it **seeds** the sample data and pushes it up (so your Supabase fills automatically the first time).

From then on, every create/update/delete is **written through** to Supabase, and any device that opens the app pulls the latest on load.

## How it works (design)
- Login stays **custom** (email + password hash stored in the `users` document), per your choice.
- The app keeps its fast in-browser cache and mirrors writes to Supabase — so the whole UI is unchanged.

## Known limitations (first phase — to harden later)
- **RLS is permissive** for the anon key so the client app can read/write. Tighten policies (per-role access) before real production, ideally alongside moving auth to Supabase Auth.
- Not yet synced to Supabase (still browser-local): **audit log**, **invite/password-reset tokens**, and the student **Goal-Tracker milestones / wellbeing** entries.
- No live multi-user realtime sync — data refreshes on page load, not instantly across open sessions.

## Turning it off
Blank out the `url`/`anonKey` in `js/supabase-config.js` and the app reverts to browser-only storage.
