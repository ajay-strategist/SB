# Build Prompt — College Mentorship WebApp (for Antigravity)

> Paste everything below into Antigravity as the project brief. It is written so the AI makes sensible technical choices on its own. Nothing about courses, semesters, or departments is hardcoded — everything is configurable from an admin panel.

---

## 1. What I want you to build

Build a complete, production-ready **College Mentorship Web Application** that replaces a paper "Mentor's File." It digitizes a student's full mentoring journey: profile, academic performance, attendance, co-curricular records, mentor meetings, parent (PTA) meetings, and final progression/outcomes. It must work on desktop and mobile (responsive / installable PWA).

The app currently being replaced is a physical record book used by St. Berchmans College. Recreate every field from it (detailed in Section 6) and add the smart features in Section 7.

**Build it phase by phase (Section 9). Start with Phase 1 fully working before moving on.**

You choose the tech stack — pick a modern, reliable, well-documented one (e.g. a React/Next.js front end, a Node or Python backend, and a SQL database like PostgreSQL). Use a managed email service for sending mail. Prioritize maintainability, security, and clean UI over cleverness. Explain your choices briefly as you go.

---

## 2. Core principle: EVERYTHING IS DYNAMIC

Nothing about the institution's structure may be hardcoded. The college must be able to configure all of it from an admin panel without a developer:

- **Departments** — add/edit/remove any number.
- **Courses** — add any course under a department. Each course has its **own semester count** set by admin (UG = 6, PG = 4, integrated = 10, or anything). The app must support *any* number of semesters per course.
- **Semesters render dynamically** — every screen that lists semesters (grades, attendance, meetings, PTA, extra-credit) shows exactly the number of semesters that student's course has. Never assume 6.
- **Mentor–mentee assignments** — admin assigns any number of students to any mentor; reassignable any time.
- **Custom fields** — let admin add extra profile or record fields later without code changes (configurable form fields).
- **Form labels / list items** (e.g. extra-credit course types, achievement categories) are editable in settings, not fixed in code.

If you ever need a value like "number of semesters" or "list of courses," read it from the database/config — never from a constant in the code.

---

## 3. User roles

Four roles, with role-based access control:

1. **Admin** (college IT/office) — sets up departments, courses, semester counts, imports users, assigns mentors, manages email settings, oversees everything.
2. **Mentor / Faculty** — primary user. Dashboard of assigned mentees; opens any mentee file; records observations, meetings, remarks; signs off.
3. **HOD / Principal** — oversight across a department or the whole college; analytics; approvals; digital sign-off; report exports.
4. **Student (Mentee)** — completes/updates own profile; views own grades, attendance, progress; confirms meetings.
5. **Parent** — limited read access to their child's progress; digitally acknowledges PTA meetings. (Parent access can be a login *or* a secure link sent to their email — make it configurable.)

Each role sees only what it should. Students can never see other students' data; mentors see only their assigned mentees; HOD sees their department; admin sees all.

---

## 4. Login, registration & email (important — follow exactly)

**Identity = email address.** Use the person's **personal email ID** as the login username (the college may not use Google Workspace, so do NOT depend on Google/Microsoft accounts). Email is the unique identity and cannot be changed by the user.

**Account creation flow:**

1. Admin adds users by **bulk import (CSV/Excel)** or manual entry — providing name, role, personal email, department, course.
2. The system **automatically sends a registration/invite email** to each person's personal email address.
3. The email contains a **secure, expiring, one-time link**.
4. The user clicks it, verifies their email, and **sets their own password** for the first time.
5. After setting the password they log in and complete their profile.

**Ongoing auth:**

- Standard email + password login.
- **"Forgot password"** sends a secure reset link to the same personal email.
- Users can change their password anytime from settings.
- Optional **2-factor (email OTP)** especially for Admin/HOD/Principal.
- Passwords stored hashed (bcrypt/argon2). Secure sessions, rate-limiting, lockout on repeated failures.

**Email sending:**

- Use a configurable email service. Provide an **admin settings screen** where the college enters their email provider credentials (SMTP details *or* an API key for a service like SendGrid/Resend/Mailgun). Do not hardcode any email provider.
- All emails go to **personal email IDs** stored per user.
- Email templates (invite, password reset, meeting reminder, alerts) are editable in admin settings.
- Make the SSO ("Sign in with Google/Microsoft") an **optional, toggleable feature** the admin can enable later if the college adopts a workspace — but the app must work fully with just email + password.

---

## 5. The mentee file — fields to digitize (from the paper book)

Recreate these exactly, as structured screens. Remember every semester-based section must be dynamic to the course's semester count.

**A. Personal Details (Mentee Profile)**
Photograph upload; Name (block letters); Department, Class & Roll No.; Permanent Address with phone; Address for Communication with phone; Father's name, occupation & phone; Mother's name & occupation; Religion & Community; Hobbies & Talents; Life Goal/Ambition; Blood Group; Hosteler or Day Scholar (if hosteler: hostel name, warden name & phone).

**B. Curricular Records (entry qualification)**
SSLC — school name + total marks/grade/percentage. +2 — school name + total marks/grade/percentage.

**C. Co-Curricular Records (during +2)**
Free-text + uploads for arts, sports, games achievements before joining.

**D. Academic Performance — per semester (dynamic count)**
For each semester: Grade Point, Grade, Remarks.

**E. Percentage of Attendance — per semester (dynamic).**

**F. Extra Credit Courses — per semester (dynamic).**
Each semester can list course types (e.g. BLS, VLE/MOOC, Value Education, Add-on/SAP, Internship/Skill Training, Finishing School). These category labels must be **editable in settings**, not hardcoded.

**G. Co-curricular Activities & Achievements**
List of awards, prizes, recognitions in academic fests, arts & sports — with certificate uploads, date, and semester.

**H. Mentor Meeting Log — per semester (dynamic)**
Date + notes for each meeting; student confirms attendance.

**I. PTA Meeting Log — per semester (dynamic)**
Date + parent's digital acknowledgement (replaces parent signature).

**J. Student Progression (final outcomes)**
Configurable outcome categories (e.g. UG→B.Ed, UG→PG, Campus Selection, Self-Employment/Others) with details.

**K. Mentoring Record (qualitative)**
Personality Traits (openness, sociability, amiability, self-discipline, self-reliance…); Scholar Traits (inquisitiveness, hard work, punctuality, enthusiasm, analytical skills, creativity, team spirit…); Participation in co-curricular activities (NSS, NCC, clubs…). Free-text per semester/period.

**L. Sign-off**
Mentor name + **digital signature**; HOD/Principal name + **digital signature**. Timestamped and attributed.

---

## 6. Smart / futuristic features (build into Phase 2 & 3)

- **Mentor dashboard** — all mentees at a glance with status indicators (green/amber/red) based on attendance, grades, and meeting frequency. No student gets overlooked.
- **Early-warning alerts** — auto-flag students with low attendance, falling grades, or missed meetings; notify the mentor.
- **HOD/Principal analytics** — department trends, progression/placement stats, mentor activity, batch comparisons, at-risk lists.
- **Predictive analytics** — flag likely at-risk students *before* failure using attendance + grade trends.
- **AI mentoring assistant** — summarize a mentee's full history into pre-meeting talking points and suggested discussion topics.
- **Wellbeing check-ins** — periodic optional pulse survey for students; confidentially flag stress signals to the mentor.
- **Goal tracker** — turn "Life Goal/Ambition" into a living milestone tracker reviewed each semester.
- **Meeting scheduler + reminders** — notify mentor, student, and parent before meetings (email + in-app + push).
- **Mobile/PWA** with push notifications.
- **In-app mentor–mentee chat** (logged as part of the record).
- **Multilingual UI** (English + a configurable regional language).
- **One-click report export** — generate a student's complete mentoring file as a clean **PDF**, and generate an **accreditation/NAAC-ready report pack** for audits.
- **Full audit trail** — every create/edit timestamped and attributed; nothing silently changed.
- **Automatic backups + data encryption + access logging.**

---

## 7. Data model guidance (high level)

Design normalized tables roughly like: `users` (with role, personal_email, hashed_password, status), `departments`, `courses` (with `semester_count`), `student_profiles`, `mentor_assignments`, `semester_records` (grade_point, grade, remarks, attendance — keyed by student + semester_number so any count works), `extra_credit_courses`, `achievements`, `mentor_meetings`, `pta_meetings`, `progression`, `mentoring_notes`, `signatures`, `audit_log`, `email_templates`, `settings`. Use the `semester_number` pattern so there's no fixed limit of 6.

---

## 8. UI / UX expectations

- Clean, modern, professional, accessible. Mobile-first responsive.
- Simple enough for non-technical faculty and parents.
- Clear navigation per role; dashboard as the home screen.
- Empty/loading/error states handled gracefully.
- Light and dark mode.

---

## 9. Build in phases — finish each before the next

**Phase 1 — Foundation (build first, fully working):**
Role-based auth with email invite + password set + reset; admin panel for departments, courses (with dynamic semester counts), and user bulk-import; email sending via configurable provider; full student profile; academic + attendance records (dynamic semesters); mentor meeting & PTA logs; co-curricular & extra-credit records; digital sign-off; PDF export of a student file.

**Phase 2 — Smart layer:**
Mentor dashboard with status indicators; at-risk alerts; HOD/Principal analytics; parent portal/links; meeting scheduler with reminders; mobile/PWA + push; in-app chat; optional Google/Microsoft SSO toggle.

**Phase 3 — Futuristic:**
AI mentoring assistant; predictive at-risk analytics; wellbeing check-ins; goal tracker; multilingual support; NAAC/accreditation report automation.

---

## 10. Non-negotiables

- Nothing institution-specific is hardcoded — departments, courses, semester counts, categories, and email settings are all admin-configurable.
- Login uses the user's **personal email ID**; works without any corporate workspace.
- Secure by default: hashed passwords, RBAC, audit trail, encrypted data, backups.
- Every semester-based screen adapts to the course's semester count.
- Deliver clean, documented, maintainable code with setup instructions, seed/demo data, and a short admin user guide.

Start with Phase 1. Set up the project, then build features in order. After each major step, briefly tell me what you built and how to run it.
