# SB Mentorship App — Master Modification List

## ✅ Modification Set 2 — Status

**Done:**
- **N1 Class entity** — real Classes managed in Admin ▸ Classes; students linked via classId.
- **N2/N3 Year + Duration + Auto-promotion** — each class has Current Year, Course Duration, and a Promotion Date (default 1 June, editable); advances the year automatically on that date until duration ends (`Classes.promoteIfDue` runs on load).
- **N4 Transfer In-charge** — editable in the class dialog.
- **N5 Transfer Students** — HOD transfer now moves students between classes.
- **N6 Standard name** — Year + Course + Batch built from dropdowns (e.g. "2 BSC-CS A").
- **O7 Combine Open & Report** — Students view shows a Report button (plus Edit File).
- **O8 Subject-wise** — editable subject-wise table in the Teacher's Academic tab.
- **O10 Meeting Report** — new tab after Qualitative Record with Overall + Date-wise reports.
- **P11–13 Qualitative** — parameters are configurable (Manage Parameters), all optional, updatable anytime.
- **Q15 Parent approval** — visible Approve/Revoke buttons in HOD + Teacher views.
- **O9 (partial)** — meetings sorted latest→oldest; Update-details button; Comments + Confidential + **private Teacher Discussion Points**; Student **Request Meeting** with **private Student Discussion Points**.

**Still to do / simplified:**
- **O9 dedicated update *page*** — currently a modal, not a separate full page.
- **Email compose / bulk-mail UI** (Set 1 E2/E3) — still model-only.
- **O14** dropped (you kept the Mentee Directory; button renamed to "Course Settings").
- Auto-promotion runs on app load (no server scheduler in this static app).

**Reset demo data** on the login page to load classes + subject-wise seed.

---


## ✅ Build Status (updated after implementation)

**Done:** A1–A6 (branding, logo, sign-out red in sidebar, role label, sign-off removed, Profile & Settings + password) · B1–B2 (hierarchy, Teacher=Mentor) · C1–C8 (dashboard, dept HOD/faculty columns, mentor-assignments removed, filters fixed & relabelled, parent email column + editable) · D1–D2 (parent approval + matching) · E1/E4 (email matrix in model, config access defined) · F1–F9 (HOD stats, classes tab, class detail, students view, report, transfer, edit class, HOD-as-mentor, updates users) · G1–G8 (teacher tabs, class/students view, assigned-only, need-attention/at-risk, confidential comments, schedule meeting, refer to HOD) · H1–H2 (course details + risk config editable) · I1–I3 (Profile & Settings + password, academic overview pass/fail, subject-wise) · K1–K2 (report + meeting reports) · L1–L2 & M1–M3 (parent scoped + approval gate, confidential hidden from student/parent) · Principal = college-wide HOD view.

**Partial / simplified:**
- **E2/E3 (compose + bulk mail UI):** permission model built; the actual send/compose & class-wise bulk screen is not yet a UI.
- **J3/J4/J5:** meeting has Discussion + Goals + Confidential Comments and notifies/"emails" the student; but the scheduled meeting is a modal (not a dedicated page with a student-details tab), HOD custom-fields propagation and the exact "two separate reports" split are not built.
- **"Class" = Course:** classes are modelled as courses (gender-wise uses a new profile Gender field; in-charge is inferred). A separate Class entity was not added.

**Note:** Demo data seeds once — use **"Reset demo data"** on the login page to load the updated sample data.

---


_Consolidated and categorized from all feedback. Items that were stated once and revised later have been merged into their final form (see "Reconciled" notes)._

---

## A. Global / Branding & Layout (applies to all logins)

- **A1.** Add the **college image** to the front page.
- **A2.** Add the **college logo** in the specified place (top-left brand area).
- **A3.** Move **Sign Out** out of the Account popup → place it in the **left sidebar, under the user's name**.
- **A4.** In the left sidebar footer, show the **role label (e.g. "Admin")** instead of the person's name ("George Mathew").
- **A5.** **Remove "Sign-Off" everywhere** — from all roles/logins and from the student profile tabs.
  _Reconciled: first requested only for HOD overview, later extended to "all logins."_
- **A6.** Rename **"Settings" → "Profile & Settings"** for every role; include the ability to **update password + profile details**.
  _Reconciled: raised for Admin, then Student portal — applies to all roles._

---

## B. Roles & Hierarchy

- **B1.** Enforce hierarchy: **Admin → Principal → HOD → Teacher → Parent → Student**.
- **B2.** Treat **Faculty = Teacher = Mentor** as the same role throughout.

---

## C. Admin Portal

- **C1.** Dashboard: **remove the "At-Risk & Attention" panel** (no at-risk student details for Admin).
- **C2.** Dashboard: **keep Department Overview** as is.
- **C3.** Departments page: add **HOD name** column and **number of faculties** column.
- **C4.** **Remove "Mentor Assignments"** from the Admin navigation.
- **C5.** Users page: **fix the filter buttons** (Admin/Mentor currently not working).
- **C6.** Users page filters: **remove the "Admin" filter**; show **Principal, Department (instead of separate HOD & Teacher), Parent, Student**.
- **C7.** Student/Users table: **show the Parent's email ID**.
- **C8.** Parent email is **editable** by Teacher, HOD, Principal, and Admin.

---

## D. Parent Access & Approval

- **D1.** Parents can view details **only after approval** by Admin / Principal / HOD / Teacher.
- **D2.** Build a proper **parent–student matching + approval system**, with logic designed to **reduce the workload** of Admin/Principal/HOD/Teacher.

---

## E. Email / Communication

- **E1.** Sending permissions by role:
  - **Admin →** Principal only.
  - **Principal →** HOD & Teachers.
  - **HOD →** Teachers, Students, Parents.
  - **Teacher →** Students & Parents only (**not** other teachers).
- **E2.** Ability to send the **same mail to a Student + Parent** together.
- **E3.** **Bulk mail** to all Students & Parents, with filters (**class-wise**, etc.).
- **E4.** **Email Config settings** accessible to **Principal, HOD, and Teachers** (not only Admin).
- **E5.** When a meeting is scheduled, the **student is auto-emailed** with the meeting details **from whoever fixed it** (Teacher's mail if teacher, HOD's mail if HOD).

---

## F. HOD Portal

- **F1.** Department Overview stats:
  - "**No. of Students**" (instead of "Mentees").
  - "**No. of Faculties**".
  - Add "**No. of Classes**".
  - "**No. of Students by each Faculty**" = **Mentor Coverage**.
  - "**No. of Students by Class**".
  - (Sign-Off removed — see A5.)
- **F2.** HOD can **update users**: Teachers, Students, Parents.
- **F3.** **Class Tab** → a **card per class** showing: class name, in-charge, no. of students, gender-wise breakdown.
- **F4.** Inside a class → student list with name, **current-sem attendance %**, and **Show Report**.
- **F5.** **Students View** (table): name, class, attendance %, Show Report — same as the Teacher's Students View.
- **F6.** In Students View, option to **transfer students** to another Teacher or an entire Class.
- **F7.** Option to **edit a class**.
- **F8.** HOD is **also a mentor** to a few students.
- **F9.** HOD can **add custom meeting fields**; added fields appear in the Meetings page for **all teachers in the department** (see J4).

---

## G. Mentor / Teacher Portal

- **G1.** Three tabs: **Dashboard | Class | Profile & Settings**.
- **G2.** **Class tab has two views:** Class View and **Students View** (table: name, class, attendance %, Show Report — HOD format).
- **G3.** **Show Assigned Classes**, filtered to **only that mentor's own students** (sometimes just 2–3 per class).
- **G4.** Inside a class → student name, attendance %, Show Report.
- **G5.** **Dashboard:** show **"Need Attention"** and **"At Risk"** student lists.
- **G6.** **Confidential comments:** mentor can mark a comment confidential and choose **who can see it** (Principal, HOD, Teachers). On **student transfer**, choose to **share or not share** the comment with the new teacher.
- **G7.** **Schedule Meeting** available from the students list (see Meetings module).
- **G8.** Teachers can **refer/flag a student to the HOD** ("to talk" / reference).

---

## H. Course Setup & At-Risk Logic

- **H1.** **Teachers & HOD can edit Course Details:** number of internals (sometimes 2), minimum attendance %, assignments, seminars — **all components**.
- **H2.** The **Need Attention / At Risk logic is set by HOD & Mentor** and driven by: attendance % below threshold, internal marks below threshold, number of internals failed, and the course components above.

---

## I. Student Portal

- **I1.** **Profile & Settings** with **update password** option.
- **I2.** Academic & Attendance page: **first show an Overview** — no. of **Passed & Failed**, and a **semester-wise performance report**.
- **I3.** Add **subject-wise details** per semester: attendance %, internal marks, external marks, grade.

---

## J. Meetings Module (was "Meeting Log")

- **J1.** **Rename "Meeting Log" → "Meetings"**; change the button **"Log Meeting" → "Schedule a Meeting"**. Still show current meeting-log details.
- **J2.** Show **Scheduled Meetings**; users can also schedule directly from there.
- **J3.** A **scheduled meeting opens its own page**:
  - **Tab 1:** student's Personal Details, Academic Details, Previous Meeting Comments, Goals.
  - **Fields:** Date, Discussion, and Mentor-added **Goals**.
- **J4.** **HOD can add extra custom fields** → they appear for all teachers in the department (link to F9).
- **J5.** **Meeting content** should follow a **proper, standardized structure**.
- **J6.** **Comments & Goals** (added by HOD/Mentor) are **visible to Parents too** — unless marked confidential (then hidden from everyone; see G6).

---

## K. Student Report (used by HOD & Teacher via "Show Report")

- **K1.** Report shows full data: semester-wise attendance, **subject-wise attendance**, internal marks, external marks, grade, internship & projects, teacher's comments, and option to view **parent details**.
- **K2.** Add a **new "Meeting Reports" tab** containing **two reports**:
  - **Report 1:** Discussions, Comments, Goals.
  - **Report 2:** Date-wise log — Date, Time (optional), Goals, Discussion, Comments.

---

## L. Parent Portal

- **L1.** Parent can **modify only their own student(s)**.
- **L2.** Parent can view **their student's report** — but **confidential items are hidden** from them.

## M. Confidential Comments (cross-cutting)

- **M1.** Add a **"Confidential Comments"** field to **each meeting log**.
- **M2.** **Students** can view their **meetings report** — **except confidential** comments.
- **M3.** **Parents** can view their student's report/meetings — **except confidential** items (see L2).
  _Confidential visibility ties into G6: mentor chooses who can see confidential content._

---

## Points to confirm before building

1. **Principal portal** — you listed Principal in the hierarchy and email rules, but not its screens. Should the Principal see a **college-wide version of the HOD view** (all departments)?
2. **"Department" filter (C6)** — should clicking it list all HODs + Teachers of that department together, or filter by a chosen department?
3. **At-Risk thresholds (H2)** — default values to start with (e.g. attendance < 75%, or set entirely by HOD/mentor)?
4. **Sign-Off removal (A5)** — confirm this also removes the mentor/HOD **digital signature** step from the exported PDF, or only the on-screen tab.
