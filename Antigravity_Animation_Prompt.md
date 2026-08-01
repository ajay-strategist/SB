# Antigravity Prompt — Premium (restrained) motion system for the SB Mentorship App

> Paste into Antigravity. Add a cohesive, high-end **but restrained** animation layer to this static, multi-page web app (HTML/CSS/vanilla JS). Files: `index.html`, `pages/*.html` (admin, hod, mentor, student, parent), `js/db.js`, `js/utils.js`, `css/main.css`, `css/auth.css`. This is a college records app that staff use daily — motion must feel elegant and fast, never distracting or slow. Do **not** change any functionality, data, or security; this is a presentation-layer enhancement only.

## Design intent
- **Premium but restrained:** subtle, quick, purposeful. The "expensive" feel comes from consistent easing, orchestration, and a few signature moments — not from big flashy effects.
- Everything must **respect `prefers-reduced-motion: reduce`** (instant, no motion) and stay **60fps** (animate only `transform`/`opacity`; no layout thrash).
- Keep durations short: 120 / 200 / 320 / 480ms scale. No animation should delay a user's task.

## 1. Motion foundation (build first)
- Create `js/motion.js` and a `css/motion.css` that centralize the motion system and are included on every page (after existing CSS/JS).
- Define **design tokens** (CSS variables + JS constants):
  - Easings: `--ease-out: cubic-bezier(0.22,1,0.36,1)` (entrances), `--ease-in-out: cubic-bezier(0.65,0,0.35,1)`, and a gentle spring for confirmations.
  - Durations: `--dur-1:120ms; --dur-2:200ms; --dur-3:320ms; --dur-4:480ms;`
- Add a global `prefers-reduced-motion` guard that disables all non-essential motion.
- Provide reusable helpers in `js/motion.js`: `revealStagger(container, selector)`, `pageIn()`, `pageOut()`, `countUp(el, to)`, `drawRing(svgEl, pct)`, `success(el)`. Use these everywhere so motion is consistent.

## 2. Library choice
- Use **GSAP** (with the **Flip** plugin for shared-element transitions and **ScrollTrigger** for reveals) loaded from CDN with SRI, **or** **Motion One** if you prefer a lighter footprint — pick one and use it consistently. Also use the **View Transitions API** where supported (progressive enhancement) for cross-page transitions, falling back to a GSAP timeline.
- Keep total added JS lean; lazy-load celebration libs (e.g. `canvas-confetti`) only where used.

## 3. Signature moments (restrained versions)
- **Shared-element morph (Flip):** clicking a student/mentee card morphs the avatar + name into the student-file header instead of a hard swap. Same for course card → class list. Keep it ~320ms, single smooth move.
- **Page/tab transitions:** switching sidebar sections and the in-file tabs (Personal Info / Academic / Meetings / Meeting Report / Date-wise Report) cross-fades with a 6–10px rise; the active tab underline **glides** between tabs; the sidebar active item is a pill that slides. Subtle mask/blur on route change via View Transitions.
- **Data reveal:** stat cards (Total Students, At Risk, etc.) **count up** with easing on first paint; attendance and goal progress render as an **SVG ring/bar that draws** to its value; Meeting Report accent cards slide in from the left with the color bar drawing first, then text.
- **Success choreography (understated):** goal marked complete → checkmark **draws** (SVG stroke) + row settles with a soft spring; approve/sign actions → button morphs spinner→check. A **small, one-shot** confetti only on genuine milestones (goal completed / file approved) — tasteful, not constant.

## 4. Micro-interactions (everywhere, subtle)
- Cards: gentle hover lift (2–3px) + shadow, optional very slight cursor-follow spotlight (low opacity). No aggressive 3D tilt.
- Buttons: press-scale (0.97), soft focus ring, primary buttons get a faint sheen sweep on hover.
- Inputs: floating labels, border-grow on focus, **shake** on validation error, checkmark slide-in on valid.
- Toasts: slide-in with a thin progress bar; notification bell: badge **pop** + a single subtle shake on new items.
- Modals: scale (0.98→1) + fade with a light backdrop blur; content rises 8px.
- Chevrons rotate on expand/collapse; list items fade/rise with **40–70ms stagger**.

## 5. Loading states
- Replace spinners on data-heavy views (tables, dashboards, reports) with **skeleton shimmer** placeholders (gradient sweep), then a staggered content reveal when data is ready.

## 6. Login page (one tasteful hero)
- Logo fade-in with a small float; background image slow Ken-Burns zoom at low intensity; form fields cascade in; Sign In button gets a light sheen and a smooth loading→success state. Keep it classy, not cinematic.

## Constraints & acceptance criteria
- No change to features, routing logic, data, or the security posture. Purely additive presentation layer; if JS is disabled the app still works.
- All animations disabled/instant under `prefers-reduced-motion: reduce` (verify by toggling the OS setting).
- Maintains 60fps on a mid-range laptop (only transform/opacity; no forced reflows); no animation blocks input or delays navigation beyond ~320ms.
- Consistency: every screen uses the shared easing/duration tokens and the `js/motion.js` helpers — no ad-hoc timings.
- Deliver: `js/motion.js`, `css/motion.css`, the CDN includes (with SRI), and the edits wiring the helpers into each page. Briefly document the tokens and how to apply them to new components.
