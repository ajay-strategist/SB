/* ============================================================
   db.js — localStorage Data Layer
   Normalized schema, CRUD helpers, seed data
   ============================================================ */

const DB = (() => {

  // ── Schema Keys ─────────────────────────────────────────────
  const KEYS = {
    settings: 'sb_settings',
    secureSettings: 'sb_secure_settings',
    departments: 'sb_departments',
    courses: 'sb_courses',
    users: 'sb_users',
    mentorAssignments: 'sb_mentor_assignments',
    studentProfiles: 'sb_student_profiles',
    semesterRecords: 'sb_semester_records',
    extraCreditCourses: 'sb_extra_credit_courses',
    achievements: 'sb_achievements',
    mentorMeetings: 'sb_mentor_meetings',
    ptaMeetings: 'sb_pta_meetings',
    progressionRecords: 'sb_progression_records',
    mentoringNotes: 'sb_mentoring_notes',
    signatures: 'sb_signatures',
    auditLog: 'sb_audit_log',
    inviteTokens: 'sb_invite_tokens',
    passwordResets: 'sb_password_resets',
    wellbeingCheckins: 'sb_wellbeing_checkins',
    goals: 'sb_goals',
    notifications: 'sb_notifications',
    customFields: 'sb_custom_fields',
    classes: 'sb_classes',
    privateStudentNotes: 'sb_private_student_notes',
    privateTeacherNotes: 'sb_private_teacher_notes',
    confidentialMeetingComments: 'sb_confidential_meeting_comments',
  };

  // ── Storage helpers ──────────────────────────────────────────
  function get(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); }
    catch { return null; }
  }

  function set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getArr(key) { return get(key) || []; }

  function setArr(key, arr) { set(key, arr); }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // ── Supabase backend (optional) ──────────────────────────────
  // When window.SB_CONFIG has url + anonKey and the supabase-js CDN
  // is loaded, the app hydrates from Supabase on init and writes
  // changes through to it. Otherwise it stays on localStorage only.
  const SB = (() => {
    const cfg = (typeof window !== 'undefined' && window.SB_CONFIG) || {};
    const enabled = !!(cfg.url && cfg.anonKey && typeof window !== 'undefined' && window.supabase);
    const client = enabled ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;
    const TABLE = {
      [KEYS.departments]: 'departments', [KEYS.courses]: 'courses', [KEYS.classes]: 'classes',
      [KEYS.users]: 'users', [KEYS.mentorAssignments]: 'mentor_assignments',
      [KEYS.studentProfiles]: 'student_profiles', [KEYS.semesterRecords]: 'semester_records',
      [KEYS.extraCreditCourses]: 'extra_credit_courses', [KEYS.achievements]: 'achievements',
      [KEYS.mentorMeetings]: 'mentor_meetings', [KEYS.ptaMeetings]: 'pta_meetings',
      [KEYS.progressionRecords]: 'progression_records', [KEYS.mentoringNotes]: 'mentoring_notes',
      [KEYS.signatures]: 'signatures', [KEYS.notifications]: 'notifications',
      [KEYS.customFields]: 'custom_fields',
      [KEYS.secureSettings]: 'secure_settings',
    };
    const tableFor = (key) => TABLE[key] || null;
    async function hydrate() {
      if (!enabled) return false;
      let hasUsers = false;
      for (const key of Object.keys(TABLE)) {
        try {
          const { data, error } = await client.from(TABLE[key]).select('id,data');
          if (error) { console.warn('[SB] load', TABLE[key], error.message); continue; }
          const arr = (data || []).map(r => ({ ...r.data, id: r.id }));
          localStorage.setItem(key, JSON.stringify(arr));
          if (key === KEYS.users && arr.length) hasUsers = true;
        } catch (e) { console.warn('[SB] hydrate', TABLE[key], e); }
      }
      try {
        const { data } = await client.from('settings').select('data').eq('id', 1).maybeSingle();
        if (data && data.data) localStorage.setItem(KEYS.settings, JSON.stringify(data.data));
      } catch (e) { /* ignore */ }
      try {
        const { data } = await client.from('secure_settings').select('data').eq('id', 1).maybeSingle();
        if (data && data.data) localStorage.setItem(KEYS.secureSettings, JSON.stringify(data.data));
      } catch (e) { /* ignore */ }
      return hasUsers;
    }
    function upsertRow(key, item) {
      const t = tableFor(key);
      if (!enabled || !t || !item || !item.id) return;
      client.from(t).upsert({ id: item.id, data: item, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.warn('[SB] upsert', t, error.message); });
    }
    function deleteRow(key, id) {
      const t = tableFor(key);
      if (!enabled || !t) return;
      client.from(t).delete().eq('id', id)
        .then(({ error }) => { if (error) console.warn('[SB] delete', t, error.message); });
    }
    function saveSettings(obj) {
      if (!enabled) return;
      client.from('settings').upsert({ id: 1, data: obj })
        .then(({ error }) => { if (error) console.warn('[SB] settings', error.message); });
    }
    function saveSecureSettings(obj) {
      if (!enabled) return;
      client.from('secure_settings').upsert({ id: 1, data: obj })
        .then(({ error }) => { if (error) console.warn('[SB] secure settings', error.message); });
    }
    return { enabled, client, hydrate, upsertRow, deleteRow, saveSettings, saveSecureSettings };
  })();

  // ── Audit log ────────────────────────────────────────────────
  function audit(userId, action, target) {
    const log = getArr(KEYS.auditLog);
    log.push({ id: generateId(), timestamp: new Date().toISOString(), userId, action, target });
    if (log.length > 1000) log.splice(0, log.length - 1000);
    setArr(KEYS.auditLog, log);
    if (SB.enabled && SB.client) {
      SB.client.rpc('log_audit_event', { p_action: action, p_target: target })
        .then(({ error }) => { if (error) console.warn('[SB] audit log failed', error.message); });
    }
  }

  // ── Generic CRUD ─────────────────────────────────────────────
  function findAll(key) { return getArr(key); }

  function findById(key, id) {
    return getArr(key).find(item => item.id === id) || null;
  }

  function findWhere(key, predicate) {
    return getArr(key).filter(predicate);
  }

  function extractMeetingSecrets(item) {
    const cleanItem = { ...item };
    const comments = cleanItem.confidentialComments;
    const tPoints = cleanItem.discussionPointsTeacher;
    const sPoints = cleanItem.discussionPointsStudent;
    delete cleanItem.confidentialComments;
    delete cleanItem.discussionPointsTeacher;
    delete cleanItem.discussionPointsStudent;
    return { cleanItem, comments, tPoints, sPoints };
  }

  function saveMeetingSecrets(meetingId, comments, tPoints, sPoints, actorId) {
    if (comments !== undefined) {
      if (comments !== null && comments.trim() !== '') {
        upsert(KEYS.confidentialMeetingComments, r => r.id === meetingId, { id: meetingId, confidentialComments: comments }, actorId);
      } else {
        remove(KEYS.confidentialMeetingComments, meetingId, actorId);
      }
    }
    if (tPoints !== undefined) {
      if (tPoints !== null && tPoints.trim() !== '') {
        upsert(KEYS.privateTeacherNotes, r => r.id === meetingId, { id: meetingId, discussionPointsTeacher: tPoints }, actorId);
      } else {
        remove(KEYS.privateTeacherNotes, meetingId, actorId);
      }
    }
    if (sPoints !== undefined) {
      if (sPoints !== null && sPoints.trim() !== '') {
        upsert(KEYS.privateStudentNotes, r => r.id === meetingId, { id: meetingId, discussionPointsStudent: sPoints }, actorId);
      } else {
        remove(KEYS.privateStudentNotes, meetingId, actorId);
      }
    }
  }

  function mergeSecrets(items) {
    if (!items) return items;
    const isArr = Array.isArray(items);
    const list = isArr ? items : [items];
    const commentsList = getArr(KEYS.confidentialMeetingComments);
    const teacherNotesList = getArr(KEYS.privateTeacherNotes);
    const studentNotesList = getArr(KEYS.privateStudentNotes);
    const merged = list.map(m => {
      const c = commentsList.find(r => r.id === m.id);
      const t = teacherNotesList.find(r => r.id === m.id);
      const s = studentNotesList.find(r => r.id === m.id);
      return {
        ...m,
        confidentialComments: c ? c.confidentialComments : undefined,
        discussionPointsTeacher: t ? t.discussionPointsTeacher : undefined,
        discussionPointsStudent: s ? s.discussionPointsStudent : undefined
      };
    });
    return isArr ? merged : merged[0];
  }

  function insert(key, data, actorId) {
    const arr = getArr(key);
    let item = { ...data, id: data.id || generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (key === KEYS.mentorMeetings) {
      const secrets = extractMeetingSecrets(item);
      item = secrets.cleanItem;
      saveMeetingSecrets(item.id, secrets.comments, secrets.tPoints, secrets.sPoints, actorId);
    }
    arr.push(item);
    setArr(key, arr);
    SB.upsertRow(key, item);
    audit(actorId, `INSERT:${key}`, item.id);
    return item;
  }

  function update(key, id, data, actorId) {
    const arr = getArr(key);
    const idx = arr.findIndex(item => item.id === id);
    if (idx === -1) return null;
    let updateData = { ...data };
    if (key === KEYS.mentorMeetings) {
      const secrets = extractMeetingSecrets(updateData);
      updateData = secrets.cleanItem;
      saveMeetingSecrets(id, secrets.comments, secrets.tPoints, secrets.sPoints, actorId);
    }
    arr[idx] = { ...arr[idx], ...updateData, id, updatedAt: new Date().toISOString() };
    setArr(key, arr);
    SB.upsertRow(key, arr[idx]);
    audit(actorId, `UPDATE:${key}`, id);
    return arr[idx];
  }

  function remove(key, id, actorId) {
    const arr = getArr(key);
    const filtered = arr.filter(item => item.id !== id);
    setArr(key, filtered);
    SB.deleteRow(key, id);
    if (key === KEYS.mentorMeetings) {
      remove(KEYS.confidentialMeetingComments, id, actorId);
      remove(KEYS.privateTeacherNotes, id, actorId);
      remove(KEYS.privateStudentNotes, id, actorId);
    }
    audit(actorId, `DELETE:${key}`, id);
  }

  function upsert(key, predicate, data, actorId) {
    const arr = getArr(key);
    const idx = arr.findIndex(predicate);
    if (idx === -1) return insert(key, data, actorId);
    let updateData = { ...data };
    if (key === KEYS.mentorMeetings) {
      const secrets = extractMeetingSecrets(updateData);
      updateData = secrets.cleanItem;
      saveMeetingSecrets(arr[idx].id, secrets.comments, secrets.tPoints, secrets.sPoints, actorId);
    }
    arr[idx] = { ...arr[idx], ...updateData, updatedAt: new Date().toISOString() };
    setArr(key, arr);
    SB.upsertRow(key, arr[idx]);
    audit(actorId, `UPSERT:${key}`, arr[idx].id);
    return arr[idx];
  }

  // ── JWT and Auth Token Helpers ──────────────────────────────
  function parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  function getSupabaseToken() {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        try {
          const val = JSON.parse(localStorage.getItem(key));
          if (val && val.access_token) return val.access_token;
        } catch (e) {}
      }
    }
    return null;
  }

  // ── Session ──────────────────────────────────────────────────
  let cachedSession = null;
  
  function getSession() {
    if (SB.enabled && SB.client) {
      const token = getSupabaseToken();
      if (!token) return null;
      const payload = parseJwt(token);
      if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) return null;
      
      const local = get('sb_session');
      const tokenRole = payload.user_metadata?.role || '';
      const tokenUserId = payload.sub;
      
      if (local && local.userId === tokenUserId && local.role === tokenRole) {
        return local;
      }
      
      const email = payload.email || '';
      const name = payload.user_metadata?.name || email.split('@')[0];
      const reconstructed = {
        userId: tokenUserId,
        role: tokenRole,
        name: name,
        email: email,
        expiresAt: payload.exp * 1000
      };
      set('sb_session', reconstructed);
      return reconstructed;
    } else {
      const s = get('sb_session');
      if (s && s.expiresAt > Date.now()) return s;
      return null;
    }
  }

  function setCachedSession(user) {
    cachedSession = { userId: user.id, role: user.role, name: user.name, email: user.email, expiresAt: Date.now() + 8 * 3600 * 1000 };
    set('sb_session', cachedSession);
    return cachedSession;
  }

  function clearSession() {
    localStorage.removeItem('sb_session');
    cachedSession = null;
  }

  function isSessionValid() {
    return !!getSession();
  }

  // ── Auth ─────────────────────────────────────────────────────
  async function login(email, password) {
    if (SB.enabled && SB.client) {
      const { data, error } = await SB.client.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      
      await SB.hydrate();
      
      const user = getArr(KEYS.users).find(u => u.id === data.user.id);
      if (!user) {
        await SB.client.auth.signOut();
        return { ok: false, error: 'User profile record not found.' };
      }
      if (user.status === 'invited') return { ok: false, error: 'Please check your email and set your password first.' };
      if (user.status === 'suspended') return { ok: false, error: 'Your account has been suspended. Contact admin.' };
      
      setCachedSession(user);
      audit(user.id, 'LOGIN', user.email);
      return { ok: true, session: getSession(), user };
    } else {
      const users = findAll(KEYS.users);
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) return { ok: false, error: 'No account found with this email address.' };
      if (user.status === 'invited') return { ok: false, error: 'Please check your email and set your password first.' };
      if (user.status === 'suspended') return { ok: false, error: 'Your account has been suspended. Contact admin.' };
      const session = setCachedSession(user);
      audit(user.id, 'LOGIN', user.email);
      return { ok: true, session, user };
    }
  }

  async function setPassword(token, password) {
    if (SB.enabled && SB.client) {
      const { data: res, error } = await SB.client.rpc('redeem_invite_token', { p_token: token });
      if (error) return { ok: false, error: error.message };
      
      const { error: signInError } = await SB.client.auth.signInWithPassword({
        email: res.email,
        password: res.tempPassword
      });
      if (signInError) return { ok: false, error: signInError.message };
      
      const { error: updateError } = await SB.client.auth.updateUser({ password: password });
      if (updateError) return { ok: false, error: updateError.message };
      
      await SB.client.rpc('mark_invite_token_used', { p_token: token });
      
      const users = getArr(KEYS.users);
      const userIdx = users.findIndex(u => u.id === res.userId);
      if (userIdx !== -1) {
        users[userIdx].status = 'active';
        setArr(KEYS.users, users);
        SB.upsertRow(KEYS.users, users[userIdx]);
      }
      
      audit(res.userId, 'SET_PASSWORD', res.userId);
      return { ok: true };
    } else {
      const tokens = getArr(KEYS.inviteTokens);
      const tok = tokens.find(t => t.token === token && t.expiresAt > Date.now() && !t.used);
      if (!tok) return { ok: false, error: 'This link is invalid or has expired.' };
      update(KEYS.users, tok.userId, { status: 'active' }, tok.userId);
      const tokIdx = tokens.findIndex(t => t.token === token);
      tokens[tokIdx].used = true;
      setArr(KEYS.inviteTokens, tokens);
      audit(tok.userId, 'SET_PASSWORD', tok.userId);
      return { ok: true };
    }
  }

  async function requestPasswordReset(email) {
    if (SB.enabled && SB.client) {
      const { error } = await SB.client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/pages/set-password.html`
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } else {
      const user = findAll(KEYS.users).find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) return { ok: false, error: 'No account found with this email.' };
      const token = generateId() + generateId();
      const resets = getArr(KEYS.passwordResets);
      resets.push({ token, userId: user.id, email: user.email, expiresAt: Date.now() + 3600 * 1000, used: false, createdAt: new Date().toISOString() });
      setArr(KEYS.passwordResets, resets);
      console.info('[EMAIL] Password reset link:', `${window.location.origin}/pages/set-password.html?reset=${token}`);
      return { ok: true, token };
    }
  }

  async function resetPassword(token, password) {
    if (SB.enabled && SB.client) {
      const { error } = await SB.client.auth.updateUser({ password: password });
      if (error) return { ok: false, error: error.message };
      const sessionObj = getSession();
      if (sessionObj) {
        const users = getArr(KEYS.users);
        const userIdx = users.findIndex(u => u.id === sessionObj.userId);
        if (userIdx !== -1) {
          users[userIdx].status = 'active';
          setArr(KEYS.users, users);
          SB.upsertRow(KEYS.users, users[userIdx]);
        }
        audit(sessionObj.userId, 'RESET_PASSWORD', sessionObj.userId);
      }
      return { ok: true };
    } else {
      const resets = getArr(KEYS.passwordResets);
      const rst = resets.find(r => r.token === token && r.expiresAt > Date.now() && !r.used);
      if (!rst) return { ok: false, error: 'This reset link is invalid or has expired.' };
      update(KEYS.users, rst.userId, { status: 'active' }, rst.userId);
      const idx = resets.findIndex(r => r.token === token);
      resets[idx].used = true;
      setArr(KEYS.passwordResets, resets);
      audit(rst.userId, 'RESET_PASSWORD', rst.userId);
      return { ok: true };
    }
  }

  async function logout() {
    clearSession();
    for (const key of Object.values(KEYS)) {
      localStorage.removeItem(key);
    }
    localStorage.removeItem('sb_session');
    localStorage.removeItem('sb_seeded');
    if (SB.enabled && SB.client) {
      try { await SB.client.auth.signOut(); } catch (e) { /* ignore */ }
    }
    window.location.href = window.location.origin + '/index.html';
  }

  // ── User Management ──────────────────────────────────────────
  async function createUser(data, actorId) {
    if (SB.enabled && SB.client) {
      const { data: res, error } = await SB.client.rpc('admin_create_user', {
        p_email: data.email.toLowerCase(),
        p_name: data.name,
        p_role: data.role,
        p_department_id: data.departmentId || null,
        p_course_id: data.courseId || null,
        p_class_id: data.classId || null,
        p_parent_email: data.parentEmail || null,
        p_linked_student_id: data.linkedStudentId || null,
        p_phone: data.phone || null
      });
      if (error) return { ok: false, error: error.message };
      const link = `${window.location.origin}/pages/set-password.html?invite=${res.token}`;
      console.info(`[EMAIL] Invite sent: ${link}`);
      await SB.hydrate();
      return { ok: true, user: { id: res.userId, ...data }, inviteToken: res.token, inviteLink: link };
    } else {
      const existing = findAll(KEYS.users).find(u => u.email.toLowerCase() === data.email.toLowerCase());
      if (existing) return { ok: false, error: 'A user with this email already exists.' };
      const token = generateId() + generateId();
      const user = insert(KEYS.users, {
        email: data.email.toLowerCase(),
        name: data.name,
        role: data.role,
        departmentId: data.departmentId || null,
        courseId: data.courseId || null,
        status: 'invited',
        passwordHash: null,
        phone: data.phone || null,
        parentEmail: data.parentEmail || null,
        linkedStudentId: data.linkedStudentId || null,
        classId: data.classId || null,
      }, actorId);
      const tokens = getArr(KEYS.inviteTokens);
      tokens.push({ token, userId: user.id, email: user.email, expiresAt: Date.now() + 7 * 24 * 3600 * 1000, used: false, createdAt: new Date().toISOString() });
      setArr(KEYS.inviteTokens, tokens);
      const link = `${window.location.origin}/pages/set-password.html?invite=${token}`;
      console.info(`[EMAIL] Invite sent to ${user.email}: ${link}`);
      return { ok: true, user, inviteToken: token, inviteLink: link };
    }
  }

  async function bulkImportUsers(csvText, actorId) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const results = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((h, idx) => row[h] = vals[idx] || '');
      if (!row.email || !row.name || !row.role) {
        results.push({ row: i, ok: false, error: 'Missing email, name, or role' });
        continue;
      }
      const dept = findAll(KEYS.departments).find(d => d.name.toLowerCase() === (row.department || '').toLowerCase());
      const course = findAll(KEYS.courses).find(c => c.name.toLowerCase() === (row.course || '').toLowerCase());
      const res = await createUser({ email: row.email, name: row.name, role: row.role, departmentId: dept?.id, courseId: course?.id, phone: row.phone, parentEmail: row.parentemail || row['parent email'] }, actorId);
      results.push({ row: i, email: row.email, ...res });
    }
    return results;
  }

  // ── Departments ──────────────────────────────────────────────
  const Departments = {
    getAll: () => findAll(KEYS.departments),
    getById: id => findById(KEYS.departments, id),
    create: (data, actor) => insert(KEYS.departments, data, actor),
    update: (id, data, actor) => update(KEYS.departments, id, data, actor),
    delete: (id, actor) => remove(KEYS.departments, id, actor),
  };

  // ── Courses ──────────────────────────────────────────────────
  const Courses = {
    getAll: () => findAll(KEYS.courses),
    getById: id => findById(KEYS.courses, id),
    getByDepartment: deptId => findWhere(KEYS.courses, c => c.departmentId === deptId),
    create: (data, actor) => insert(KEYS.courses, data, actor),
    update: (id, data, actor) => update(KEYS.courses, id, data, actor),
    delete: (id, actor) => remove(KEYS.courses, id, actor),
    getSemesterCount: (courseId) => {
      const c = findById(KEYS.courses, courseId);
      return c ? c.semesterCount : 6;
    },
  };

  // ── Users ────────────────────────────────────────────────────
  const Users = {
    getAll: () => findAll(KEYS.users),
    getById: id => findById(KEYS.users, id),
    getByRole: role => findWhere(KEYS.users, u => u.role === role),
    getByDept: deptId => findWhere(KEYS.users, u => u.departmentId === deptId),
    update: (id, data, actor) => update(KEYS.users, id, data, actor),
    delete: (id, actor) => remove(KEYS.users, id, actor),
    create: createUser,
    bulkImport: bulkImportUsers,
  };

  // ── Mentor Assignments ───────────────────────────────────────
  const Assignments = {
    getAll: () => findAll(KEYS.mentorAssignments),
    getMentees: mentorId => findWhere(KEYS.mentorAssignments, a => a.mentorId === mentorId).map(a => a.studentId),
    getMentor: studentId => {
      const a = findWhere(KEYS.mentorAssignments, a => a.studentId === studentId)[0];
      return a ? a.mentorId : null;
    },
    assign: (mentorId, studentId, actor) => {
      const existing = findWhere(KEYS.mentorAssignments, a => a.studentId === studentId);
      if (existing.length) existing.forEach(a => remove(KEYS.mentorAssignments, a.id, actor));
      return insert(KEYS.mentorAssignments, { mentorId, studentId }, actor);
    },
    unassign: (mentorId, studentId, actor) => {
      const a = findWhere(KEYS.mentorAssignments, a => a.mentorId === mentorId && a.studentId === studentId)[0];
      if (a) remove(KEYS.mentorAssignments, a.id, actor);
    },
  };

  // ── Student Profiles ─────────────────────────────────────────
  const Profiles = {
    get: studentId => findWhere(KEYS.studentProfiles, p => p.studentId === studentId)[0] || null,
    save: (studentId, data, actor) => upsert(KEYS.studentProfiles, p => p.studentId === studentId, { ...data, studentId }, actor),
  };

  // ── Semester Records ─────────────────────────────────────────
  const SemesterRecords = {
    getAll: studentId => findWhere(KEYS.semesterRecords, r => r.studentId === studentId),
    get: (studentId, semester) => findWhere(KEYS.semesterRecords, r => r.studentId === studentId && r.semester === semester)[0] || null,
    save: (studentId, semester, data, actor) => upsert(KEYS.semesterRecords, r => r.studentId === studentId && r.semester === semester, { ...data, studentId, semester }, actor),
  };

  // ── Extra Credit Courses ─────────────────────────────────────
  const ExtraCredit = {
    getAll: studentId => findWhere(KEYS.extraCreditCourses, e => e.studentId === studentId),
    getBySemester: (studentId, semester) => findWhere(KEYS.extraCreditCourses, e => e.studentId === studentId && e.semester === semester),
    create: (data, actor) => insert(KEYS.extraCreditCourses, data, actor),
    update: (id, data, actor) => update(KEYS.extraCreditCourses, id, data, actor),
    delete: (id, actor) => remove(KEYS.extraCreditCourses, id, actor),
  };

  // ── Achievements ─────────────────────────────────────────────
  const Achievements = {
    getAll: studentId => findWhere(KEYS.achievements, a => a.studentId === studentId),
    create: (data, actor) => insert(KEYS.achievements, data, actor),
    update: (id, data, actor) => update(KEYS.achievements, id, data, actor),
    delete: (id, actor) => remove(KEYS.achievements, id, actor),
  };

  // ── Mentor Meetings ──────────────────────────────────────────
  const Meetings = {
    getAll: studentId => mergeSecrets(findWhere(KEYS.mentorMeetings, m => m.studentId === studentId)),
    getBySemester: (studentId, semester) => mergeSecrets(findWhere(KEYS.mentorMeetings, m => m.studentId === studentId && m.semester === semester)),
    getByMentor: mentorId => mergeSecrets(findWhere(KEYS.mentorMeetings, m => m.mentorId === mentorId)),
    create: (data, actor) => insert(KEYS.mentorMeetings, data, actor),
    update: (id, data, actor) => update(KEYS.mentorMeetings, id, data, actor),
    delete: (id, actor) => {
      remove(KEYS.mentorMeetings, id, actor);
    },
    confirm: (id, actor) => update(KEYS.mentorMeetings, id, { studentConfirmed: true, confirmedAt: new Date().toISOString() }, actor),
  };

  // ── PTA Meetings ─────────────────────────────────────────────
  const PTAMeetings = {
    getAll: studentId => findWhere(KEYS.ptaMeetings, m => m.studentId === studentId),
    getBySemester: (studentId, semester) => findWhere(KEYS.ptaMeetings, m => m.studentId === studentId && m.semester === semester),
    create: (data, actor) => insert(KEYS.ptaMeetings, data, actor),
    update: (id, data, actor) => update(KEYS.ptaMeetings, id, data, actor),
    delete: (id, actor) => remove(KEYS.ptaMeetings, id, actor),
    acknowledge: (id, actor) => update(KEYS.ptaMeetings, id, { parentAcknowledged: true, acknowledgedAt: new Date().toISOString() }, actor),
  };

  // ── Progression ──────────────────────────────────────────────
  const Progression = {
    get: studentId => findWhere(KEYS.progressionRecords, p => p.studentId === studentId)[0] || null,
    save: (studentId, data, actor) => upsert(KEYS.progressionRecords, p => p.studentId === studentId, { ...data, studentId }, actor),
  };

  // ── Mentoring Notes ──────────────────────────────────────────
  const MentoringNotes = {
    getAll: studentId => findWhere(KEYS.mentoringNotes, n => n.studentId === studentId),
    get: (studentId, semester) => findWhere(KEYS.mentoringNotes, n => n.studentId === studentId && n.semester === semester)[0] || null,
    save: (studentId, semester, data, actor) => upsert(KEYS.mentoringNotes, n => n.studentId === studentId && n.semester === semester, { ...data, studentId, semester }, actor),
  };

  // ── Signatures ───────────────────────────────────────────────
  const Signatures = {
    get: studentId => findWhere(KEYS.signatures, s => s.studentId === studentId)[0] || null,
    save: (studentId, data, actor) => upsert(KEYS.signatures, s => s.studentId === studentId, { ...data, studentId }, actor),
    signMentor: (studentId, mentorId, signatureDataUrl, actor) => {
      const existing = findWhere(KEYS.signatures, s => s.studentId === studentId)[0] || {};
      upsert(KEYS.signatures, s => s.studentId === studentId, { ...existing, studentId, mentorId, mentorSignature: signatureDataUrl, mentorSignedAt: new Date().toISOString() }, actor);
    },
    signHOD: (studentId, hodId, signatureDataUrl, actor) => {
      const existing = findWhere(KEYS.signatures, s => s.studentId === studentId)[0] || {};
      upsert(KEYS.signatures, s => s.studentId === studentId, { ...existing, studentId, hodId, hodSignature: signatureDataUrl, hodSignedAt: new Date().toISOString() }, actor);
    },
  };

  // ── Settings ─────────────────────────────────────────────────
  const Settings = {
    get: () => {
      const general = get(KEYS.settings) || {};
      const secure = get(KEYS.secureSettings) || {};
      // Merge emailProvider from secure settings if accessible
      const emailProvider = { ...general.emailProvider, ...secure.emailProvider };
      // If the current role is student or parent, strip password and apiKey
      const session = getSession();
      if (session && ['student', 'parent'].includes(session.role)) {
        delete emailProvider.password;
        delete emailProvider.apiKey;
      }
      return { ...general, emailProvider };
    },
    set: (data) => {
      const current = get(KEYS.settings) || {};
      
      // Intercept and separate emailProvider details
      if (data.emailProvider) {
        const { type, fromEmail, host, port, user, password, apiKey } = data.emailProvider;
        
        // Save public fields in settings
        const publicEmailProvider = { type, fromEmail };
        const newGeneral = { ...current, ...data, emailProvider: publicEmailProvider };
        set(KEYS.settings, newGeneral);
        SB.saveSettings(newGeneral);
        
        // Save sensitive credentials in secure_settings
        const secureEmailProvider = { type, fromEmail, host, port, user, password, apiKey };
        const secureObj = { emailProvider: secureEmailProvider };
        set(KEYS.secureSettings, secureObj);
        SB.saveSecureSettings(secureObj);
      } else {
        const merged = { ...current, ...data };
        set(KEYS.settings, merged);
        SB.saveSettings(merged);
      }
    },
    getExtraCreditCategories: () => {
      const s = Settings.get();
      return s.extraCreditCategories || ['BLS', 'VLE/MOOC', 'Value Education', 'Add-on/SAP', 'Internship/Skill Training', 'Finishing School'];
    },
    getAchievementCategories: () => {
      const s = Settings.get();
      return s.achievementCategories || ['Academic', 'Arts', 'Sports', 'NSS/NCC', 'Cultural', 'Other'];
    },
    getProgressionCategories: () => {
      const s = Settings.get();
      return s.progressionCategories || ['UG → B.Ed', 'UG → PG', 'Campus Selection', 'Self-Employment', 'Abroad', 'Other'];
    },
    // Qualitative evaluation parameters — configurable by HOD/Teacher, all optional
    getQualitativeParameters: () => {
      const s = Settings.get();
      return s.qualitativeParameters || [
        'Openness', 'Sociability', 'Amiability', 'Self-Discipline', 'Self-Reliance',
        'Inquisitiveness', 'Hard Work', 'Punctuality', 'Enthusiasm', 'Analytical Skills', 'Creativity', 'Team Spirit',
      ];
    },
    getEmailTemplates: () => {
      const s = Settings.get();
      return s.emailTemplates || {
        invite: { subject: 'Welcome to MentorFile — Set your password', body: 'Click here to set your password: {{link}}' },
        reset: { subject: 'Password Reset — MentorFile', body: 'Click here to reset your password: {{link}}' },
        meetingReminder: { subject: 'Meeting Reminder', body: 'You have a mentor meeting scheduled on {{date}}.' },
      };
    },
    getCollegeInfo: () => {
      const s = Settings.get();
      return s.collegeInfo || { name: 'St. Berchmans College', tagline: 'College Mentorship System', primaryColor: '#4F46E5' };
    },
  };

  // ── Notifications ────────────────────────────────────────────
  const Notifications = {
    getForUser: userId => findWhere(KEYS.notifications, n => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    getUnread: userId => findWhere(KEYS.notifications, n => n.userId === userId && !n.read),
    create: (userId, title, message, type = 'info') => insert(KEYS.notifications, { userId, title, message, type, read: false }, userId),
    markRead: (id, actor) => update(KEYS.notifications, id, { read: true }, actor),
    markAllRead: (userId) => {
      const notifs = findWhere(KEYS.notifications, n => n.userId === userId && !n.read);
      notifs.forEach(n => update(KEYS.notifications, n.id, { read: true }, userId));
    },
  };

  // ── Analytics helpers ────────────────────────────────────────
  const Analytics = {
    getStudentStatus: (studentId) => {
      const records = SemesterRecords.getAll(studentId);
      if (!records.length) return 'gray';
      const latest = records[records.length - 1];
      const cfg = RiskConfig.get(); // thresholds set by HOD/Teacher
      const att = parseFloat(latest.attendance != null && latest.attendance !== '' ? latest.attendance : 100);
      const gp = parseFloat(latest.gradePoint != null && latest.gradePoint !== '' ? latest.gradePoint : 10);
      // Count failed internals across latest-semester subjects (if provided)
      let internalsFailed = 0;
      (latest.subjects || []).forEach(su => {
        if (su.internal != null && su.internal !== '' && parseFloat(su.internal) < cfg.minInternalMark) internalsFailed++;
      });
      if (att < cfg.minAttendancePct || gp < 5 || internalsFailed > cfg.maxInternalsFailed) return 'red';
      if (att < cfg.attentionAttendancePct || gp < 7 || internalsFailed > 0) return 'yellow';
      return 'green';
    },
    getDepartmentSummary: (deptId) => {
      const students = findWhere(KEYS.users, u => u.role === 'student' && u.departmentId === deptId);
      const statuses = students.map(s => Analytics.getStudentStatus(s.id));
      return {
        total: students.length,
        green: statuses.filter(s => s === 'green').length,
        yellow: statuses.filter(s => s === 'yellow').length,
        red: statuses.filter(s => s === 'red').length,
      };
    },
  };

  // ── Custom Fields ────────────────────────────────────────────
  const CustomFields = {
    getAll: () => findAll(KEYS.customFields),
    create: (data, actor) => insert(KEYS.customFields, data, actor),
    update: (id, data, actor) => update(KEYS.customFields, id, data, actor),
    delete: (id, actor) => remove(KEYS.customFields, id, actor),
  };

  // ── Audit ────────────────────────────────────────────────────
  const AuditLog = {
    getAll: () => findAll(KEYS.auditLog).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    getForUser: userId => findWhere(KEYS.auditLog, l => l.userId === userId),
  };

  // ── Role Hierarchy & Communication rules ─────────────────────
  // Admin → Principal | Principal → HOD, Teachers | HOD → Teachers, Students, Parents
  // Teacher → Students, Parents (NOT other teachers)
  const HIERARCHY = ['admin', 'principal', 'hod', 'mentor', 'parent', 'student'];
  const EMAIL_MATRIX = {
    admin: ['principal'],
    principal: ['hod', 'mentor'],
    hod: ['mentor', 'student', 'parent'],
    mentor: ['student', 'parent'],
    teacher: ['student', 'parent'],
    student: [],
    parent: [],
  };
  const Comms = {
    // Which recipient roles a given sender role may email
    allowedRecipientRoles: (role) => EMAIL_MATRIX[role] || [],
    canEmail: (fromRole, toRole) => (EMAIL_MATRIX[fromRole] || []).includes(toRole),
    // Which roles can access/edit the Email Config settings
    canConfigureEmail: (role) => ['admin', 'principal', 'hod', 'mentor'].includes(role),
  };

  // ── Parent linkage & approval ────────────────────────────────
  // A parent user is linked to a student via linkedStudentId.
  // Parent can only VIEW the student report once parentApproved === true
  // on the student record. Approval can be granted by admin/principal/hod/mentor.
  const ParentLinks = {
    getParentForStudent: (studentId) =>
      findWhere(KEYS.users, u => u.role === 'parent' && u.linkedStudentId === studentId)[0] || null,
    getStudentForParent: (parentId) => {
      const p = findById(KEYS.users, parentId);
      return p && p.linkedStudentId ? findById(KEYS.users, p.linkedStudentId) : null;
    },
    isApproved: (studentId) => {
      const s = findById(KEYS.users, studentId);
      return !!(s && s.parentApproved);
    },
    approve: (studentId, actorId) => update(KEYS.users, studentId, { parentApproved: true, parentApprovedBy: actorId, parentApprovedAt: new Date().toISOString() }, actorId),
    revoke: (studentId, actorId) => update(KEYS.users, studentId, { parentApproved: false }, actorId),
    // Edit the parent email on the student + linked parent account (teacher/hod/principal/admin)
    setParentEmail: (studentId, email, actorId) => {
      update(KEYS.users, studentId, { parentEmail: (email || '').toLowerCase() }, actorId);
      const parent = ParentLinks.getParentForStudent(studentId);
      if (parent) update(KEYS.users, parent.id, { email: (email || '').toLowerCase() }, actorId);
      return true;
    },
  };

  // ── Course config defaults (internals / attendance / components) ──
  const CourseConfig = {
    defaults: () => ({ numInternals: 2, minAttendancePct: 75, internalPassMark: 40, components: ['Internal 1', 'Internal 2', 'Assignment', 'Seminar'] }),
    get: (courseId) => {
      const c = findById(KEYS.courses, courseId) || {};
      const d = CourseConfig.defaults();
      return {
        numInternals: c.numInternals ?? d.numInternals,
        minAttendancePct: c.minAttendancePct ?? d.minAttendancePct,
        internalPassMark: c.internalPassMark ?? d.internalPassMark,
        components: c.components ?? d.components,
      };
    },
    save: (courseId, cfg, actor) => update(KEYS.courses, courseId, cfg, actor),
  };

  // ── Classes (a real entity: Year + Course + Batch) ───────────
  const Classes = {
    getAll: () => findAll(KEYS.classes),
    getById: id => findById(KEYS.classes, id),
    getByDepartment: deptId => findWhere(KEYS.classes, c => c.departmentId === deptId),
    // Standard name = "<year> <COURSE> <batch>", e.g. "2 BCOM A"
    buildName: (year, courseCode, batch) => `${year} ${courseCode}${batch ? ' ' + batch : ''}`.trim(),
    create: (data, actor) => {
      const course = findById(KEYS.courses, data.courseId);
      const name = Classes.buildName(data.currentYear, data.courseCode || (course ? course.code : ''), data.batch);
      return insert(KEYS.classes, {
        courseId: data.courseId,
        departmentId: course ? course.departmentId : (data.departmentId || null),
        courseCode: data.courseCode || (course ? course.code : ''),
        batch: data.batch || 'A',
        currentYear: parseInt(data.currentYear) || 1,
        durationYears: parseInt(data.durationYears) || (course ? Math.ceil((course.semesterCount || 6) / 2) : 3),
        promotionDate: data.promotionDate || '06-01', // MM-DD, default 1 June
        inchargeId: data.inchargeId || null,
        lastPromotedYear: new Date().getFullYear(),
        name,
      }, actor);
    },
    update: (id, data, actor) => {
      const merged = { ...findById(KEYS.classes, id), ...data };
      merged.name = Classes.buildName(merged.currentYear, merged.courseCode, merged.batch);
      return update(KEYS.classes, id, merged, actor);
    },
    delete: (id, actor) => remove(KEYS.classes, id, actor),
    getStudents: classId => findWhere(KEYS.users, u => u.role === 'student' && u.classId === classId),
    assignStudent: (classId, studentId, actor) => update(KEYS.users, studentId, { classId }, actor),
    setIncharge: (classId, inchargeId, actor) => update(KEYS.classes, classId, { inchargeId }, actor),
    // Auto-promotion: advance currentYear once per calendar year on/after promotionDate
    promoteIfDue: (actor = 'system') => {
      const now = new Date();
      const y = now.getFullYear();
      findAll(KEYS.classes).forEach(c => {
        if (c.lastPromotedYear >= y) return; // already promoted this year
        const [mm, dd] = (c.promotionDate || '06-01').split('-').map(Number);
        const due = new Date(y, (mm || 6) - 1, dd || 1);
        if (now >= due && c.currentYear < c.durationYears) {
          Classes.update(c.id, { currentYear: c.currentYear + 1, lastPromotedYear: y }, actor);
        } else if (now >= due) {
          update(KEYS.classes, c.id, { lastPromotedYear: y }, actor); // mark checked, no advance past duration
        }
      });
    },
  };

  // ── At-risk threshold config (set by HOD/mentor) ─────────────
  const RiskConfig = {
    get: () => {
      const s = Settings.get();
      return s.riskConfig || { minAttendancePct: 75, minInternalMark: 40, maxInternalsFailed: 1, attentionAttendancePct: 85 };
    },
    save: (cfg, actor) => { Settings.set({ riskConfig: { ...RiskConfig.get(), ...cfg } }); audit(actor, 'UPDATE:riskConfig', 'settings'); },
  };

  // ── Seed Data ────────────────────────────────────────────────
  async function seed() {
    // Skip only if flagged AND users actually exist in storage
    if (get('sb_seeded') && getArr(KEYS.users).length > 0) return;

    // Settings
    Settings.set({
      collegeInfo: { name: 'St. Berchmans College', tagline: 'College Mentorship System', primaryColor: '#4F46E5', location: 'Changanacherry, Kerala' },
      extraCreditCategories: ['BLS', 'VLE/MOOC', 'Value Education', 'Add-on/SAP', 'Internship/Skill Training', 'Finishing School'],
      achievementCategories: ['Academic', 'Arts', 'Sports', 'NSS/NCC', 'Cultural', 'Other'],
      progressionCategories: ['UG → B.Ed', 'UG → PG', 'Campus Selection', 'Self-Employment', 'Abroad', 'Other'],
      emailProvider: { type: 'smtp', host: '', port: 587, user: '', password: '' },
      emailTemplates: {
        invite: { subject: 'Welcome to MentorFile — Set your password', body: 'Dear {{name}},\n\nYou have been registered on the MentorFile system. Click the link below to set your password and get started:\n\n{{link}}\n\nThis link will expire in 7 days.\n\nRegards,\nMentorFile Team' },
        reset: { subject: 'Password Reset — MentorFile', body: 'Dear {{name}},\n\nClick the link below to reset your password:\n\n{{link}}\n\nThis link will expire in 1 hour.\n\nRegards,\nMentorFile Team' },
        meetingReminder: { subject: 'Mentor Meeting Reminder', body: 'Dear {{name}},\n\nThis is a reminder that your mentor meeting is scheduled on {{date}}.\n\nRegards,\nMentorFile Team' },
      },
      ssoEnabled: false,
      twoFactorEnabled: false,
    });

    // Departments
    const deptSci = Departments.create({ name: 'Science & Technology', code: 'SCI' }, 'system');
    const deptArts = Departments.create({ name: 'Arts & Humanities', code: 'ARTS' }, 'system');
    const deptComm = Departments.create({ name: 'Commerce & Management', code: 'COM' }, 'system');

    // Courses
    const courseBSc = Courses.create({ departmentId: deptSci.id, name: 'BSc Computer Science', code: 'BSC_CS', semesterCount: 6 }, 'system');
    const courseMSc = Courses.create({ departmentId: deptSci.id, name: 'MSc Physics', code: 'MSC_PHY', semesterCount: 4 }, 'system');
    const courseMAEng = Courses.create({ departmentId: deptArts.id, name: 'MA English Literature', code: 'MA_ENG', semesterCount: 4 }, 'system');
    const courseBBA = Courses.create({ departmentId: deptComm.id, name: 'BBA', code: 'BBA', semesterCount: 6 }, 'system');

    // Users: Admin
    const adminUser = insert(KEYS.users, {
      id: 'a1a1a1a1-a1a1-41a1-a1a1-a1a1a1a1a111',
      email: 'admin@sbc.edu',
      name: 'Dr. George Mathew',
      role: 'admin',
      status: 'active',
      departmentId: null,
      courseId: null,
    }, 'system');

    // Users: Mentors
    const mentor1 = insert(KEYS.users, {
      id: 'b1b1b1b1-b1b1-41b1-b1b1-b1b1b1b1b111',
      email: 'mentor.priya@sbc.edu',
      name: 'Dr. Priya Nair',
      role: 'mentor',
      status: 'active',
      departmentId: deptSci.id,
      courseId: null,
    }, 'system');

    const mentor2 = insert(KEYS.users, {
      id: 'b2b2b2b2-b2b2-42b2-b2b2-b2b2b2b2b222',
      email: 'mentor.joseph@sbc.edu',
      name: 'Prof. Joseph Thomas',
      role: 'mentor',
      status: 'active',
      departmentId: deptArts.id,
      courseId: null,
    }, 'system');

    // Users: HOD
    const hod1 = insert(KEYS.users, {
      id: 'c1c1c1c1-c1c1-41c1-c1c1-c1c1c1c1c111',
      email: 'hod.science@sbc.edu',
      name: 'Dr. Rajan Varghese',
      role: 'hod',
      status: 'active',
      departmentId: deptSci.id,
      courseId: null,
    }, 'system');

    // Users: Students
    const student1 = insert(KEYS.users, {
      id: 'd1d1d1d1-d1d1-41d1-d1d1-d1d1d1d1d111',
      email: 'anjali.krishna@gmail.com',
      name: 'Anjali Krishna',
      role: 'student',
      status: 'active',
      departmentId: deptSci.id,
      courseId: courseBSc.id,
      parentEmail: 'krishna.parent@gmail.com',
    }, 'system');

    const student2 = insert(KEYS.users, {
      id: 'd2d2d2d2-d2d2-42d2-d2d2-d2d2d2d2d222',
      email: 'rahul.menon@gmail.com',
      name: 'Rahul Menon',
      role: 'student',
      status: 'active',
      departmentId: deptSci.id,
      courseId: courseBSc.id,
      parentEmail: 'menon.parent@gmail.com',
    }, 'system');

    const student3 = insert(KEYS.users, {
      id: 'd3d3d3d3-d3d3-43d3-d3d3-d3d3d3d3d333',
      email: 'sneha.pillai@gmail.com',
      name: 'Sneha Pillai',
      role: 'student',
      status: 'active',
      departmentId: deptArts.id,
      courseId: courseMAEng.id,
      parentEmail: 'pillai.parent@gmail.com',
    }, 'system');

    const student4 = insert(KEYS.users, {
      id: 'd4d4d4d4-d4d4-44d4-d4d4-d4d4d4d4d444',
      email: 'arjun.babu@gmail.com',
      name: 'Arjun Babu',
      role: 'student',
      status: 'active',
      departmentId: deptSci.id,
      courseId: courseBSc.id,
      parentEmail: 'babu.parent@gmail.com',
    }, 'system');

    // Users: Parent
    const parent1 = insert(KEYS.users, {
      id: 'e1e1e1e1-e1e1-41e1-e1e1-e1e1e1e1e111',
      email: 'krishna.parent@gmail.com',
      name: 'Mr. Suresh Krishna',
      role: 'parent',
      status: 'active',
      linkedStudentId: student1.id,
      departmentId: null,
      courseId: null,
    }, 'system');

    // NOTE: Principal role is defined in the model & email matrix (DB.HIERARCHY).
    // A dedicated Principal portal (college-wide view) is a separate build pass,
    // so no principal login is seeded yet to avoid a broken redirect.

    // Parent access approvals (demo): student1 approved, others pending
    update(KEYS.users, student1.id, { parentApproved: true, parentApprovedBy: mentor1.id, parentApprovedAt: new Date().toISOString() }, mentor1.id);

    // Classes (Year + Course + Batch)
    const classCS = Classes.create({ courseId: courseBSc.id, courseCode: 'BSC-CS', batch: 'A', currentYear: 1, durationYears: 3, promotionDate: '06-01', inchargeId: mentor1.id }, adminUser.id);
    const classEng = Classes.create({ courseId: courseMAEng.id, courseCode: 'MA-ENG', batch: 'A', currentYear: 1, durationYears: 2, promotionDate: '06-01', inchargeId: mentor2.id }, adminUser.id);
    Classes.assignStudent(classCS.id, student1.id, adminUser.id);
    Classes.assignStudent(classCS.id, student2.id, adminUser.id);
    Classes.assignStudent(classCS.id, student4.id, adminUser.id);
    Classes.assignStudent(classEng.id, student3.id, adminUser.id);

    // Mentor Assignments
    Assignments.assign(mentor1.id, student1.id, adminUser.id);
    Assignments.assign(mentor1.id, student2.id, adminUser.id);
    Assignments.assign(mentor1.id, student4.id, adminUser.id);
    Assignments.assign(mentor2.id, student3.id, adminUser.id);

    // Student Profiles
    Profiles.save(student1.id, {
      photo: null,
      rollNo: 'BSC/CS/2024/01',
      className: 'BSc CS – Batch 2024–27',
      permanentAddress: '34, Puthenpurackal, Alappuzha, Kerala 688001',
      permanentPhone: '9876543210',
      communicationAddress: 'Room 12, St. Berchmans Hostel, Changanacherry',
      communicationPhone: '9876543211',
      fatherName: 'Mr. Suresh Krishna', fatherOccupation: 'Business', fatherPhone: '9876543210',
      motherName: 'Mrs. Latha Krishna', motherOccupation: 'Teacher',
      religion: 'Hindu', community: 'Nair',
      hobbies: 'Classical Dance, Reading, Coding',
      lifeGoal: 'To become a full-stack developer and start my own tech company.',
      bloodGroup: 'O+',
      residenceType: 'hosteler',
      hostelName: 'St. Berchmans Girls Hostel', wardenName: 'Sr. Alphonsa', wardenPhone: '9876500001',
      sslcSchool: 'Sacred Heart School, Alappuzha', sslcPercentage: '97.2', sslcGrade: 'A+',
      plusTwoSchool: 'Christ Nagar HSS, Trivandrum', plusTwoPercentage: '94.5', plusTwoGrade: 'A+',
      priorAchievements: 'District level Bharatanatyam performer. School Science Olympiad gold medalist.',
    }, mentor1.id);

    Profiles.save(student2.id, {
      rollNo: 'BSC/CS/2024/02', className: 'BSc CS – Batch 2024–27',
      fatherName: 'Mr. Rajan Menon', fatherOccupation: 'Govt. Officer', fatherPhone: '9988776655',
      motherName: 'Mrs. Deepa Menon', motherOccupation: 'Home Maker',
      religion: 'Hindu', community: 'Menon',
      hobbies: 'Chess, Football', lifeGoal: 'Software Engineer at a top MNC.', bloodGroup: 'A+',
      residenceType: 'day_scholar',
      sslcSchool: 'Govt. HS Ettumanoor', sslcPercentage: '92.0', sslcGrade: 'A+',
      plusTwoSchool: 'Govt. HSS Changanacherry', plusTwoPercentage: '88.5', plusTwoGrade: 'A',
    }, mentor1.id);

    Profiles.save(student3.id, {
      rollNo: 'MA/ENG/2024/01', className: 'MA English – Batch 2024–26',
      fatherName: 'Mr. Ravi Pillai', fatherOccupation: 'Farmer', fatherPhone: '8811223344',
      motherName: 'Mrs. Suma Pillai', motherOccupation: 'Teacher',
      religion: 'Hindu', community: 'Pillai',
      hobbies: 'Writing poetry, Classical music', lifeGoal: 'English Professor / Author.', bloodGroup: 'B+',
      residenceType: 'day_scholar',
      sslcSchool: 'Govt. HS Pala', sslcPercentage: '95.6', sslcGrade: 'A+',
      plusTwoSchool: 'St. Thomas HSS Pala', plusTwoPercentage: '91.2', plusTwoGrade: 'A+',
    }, mentor2.id);

    Profiles.save(student4.id, {
      rollNo: 'BSC/CS/2024/04', className: 'BSc CS – Batch 2024–27',
      fatherName: 'Mr. Babu Varghese', fatherOccupation: 'Driver', fatherPhone: '9111222333',
      motherName: 'Mrs. Beena Babu', motherOccupation: 'Home Maker',
      religion: 'Christian', community: 'Latin Catholic',
      hobbies: 'Gaming, Cricket', lifeGoal: 'Game Developer.', bloodGroup: 'B-',
      residenceType: 'hosteler', hostelName: 'Berchmans Boys Hostel', wardenName: 'Fr. John', wardenPhone: '9111200001',
      sslcSchool: 'Don Bosco HS Kottayam', sslcPercentage: '71.0', sslcGrade: 'B+',
      plusTwoSchool: 'Don Bosco HSS Kottayam', plusTwoPercentage: '65.0', plusTwoGrade: 'B',
    }, mentor1.id);

    // Semester Records
    SemesterRecords.save(student1.id, 1, { gradePoint: 9.2, grade: 'O', remarks: 'Excellent performance', attendance: 92.5, subjects: [
      { name: 'Programming in C', attendance: 94, internal: 48, external: 88, grade: 'O' },
      { name: 'Mathematics I', attendance: 90, internal: 44, external: 82, grade: 'A+' },
      { name: 'Digital Electronics', attendance: 93, internal: 46, external: 85, grade: 'A+' },
    ] }, mentor1.id);
    SemesterRecords.save(student1.id, 2, { gradePoint: 8.8, grade: 'A+', remarks: 'Very Good. Maintain consistency.', attendance: 88.0, subjects: [
      { name: 'Data Structures', attendance: 89, internal: 45, external: 80, grade: 'A+' },
      { name: 'Mathematics II', attendance: 86, internal: 41, external: 78, grade: 'A' },
    ] }, mentor1.id);
    SemesterRecords.save(student2.id, 1, { gradePoint: 7.1, grade: 'B+', remarks: 'Good. Needs improvement in Mathematics.', attendance: 80.5, subjects: [
      { name: 'Programming in C', attendance: 82, internal: 38, external: 66, grade: 'B+' },
      { name: 'Mathematics I', attendance: 74, internal: 32, external: 55, grade: 'C' },
    ] }, mentor1.id);
    SemesterRecords.save(student2.id, 2, { gradePoint: 6.8, grade: 'B', remarks: 'Satisfactory. Must focus more.', attendance: 74.0, subjects: [
      { name: 'Data Structures', attendance: 72, internal: 34, external: 58, grade: 'C+' },
      { name: 'Mathematics II', attendance: 70, internal: 30, external: 52, grade: 'C' },
    ] }, mentor1.id);
    SemesterRecords.save(student3.id, 1, { gradePoint: 9.6, grade: 'O', remarks: 'Outstanding. Top of batch.', attendance: 96.0 }, mentor2.id);
    SemesterRecords.save(student4.id, 1, { gradePoint: 5.4, grade: 'C+', remarks: 'Needs counseling and support.', attendance: 68.0, subjects: [
      { name: 'Programming in C', attendance: 66, internal: 28, external: 45, grade: 'D' },
      { name: 'Mathematics I', attendance: 70, internal: 35, external: 50, grade: 'C' },
    ] }, mentor1.id);

    // Extra Credit
    ExtraCredit.create({ studentId: student1.id, semester: 1, category: 'VLE/MOOC', courseName: 'Python for Data Science', provider: 'Coursera', completionDate: '2024-11-20' }, mentor1.id);
    ExtraCredit.create({ studentId: student1.id, semester: 1, category: 'BLS', courseName: 'Basic Life Support Training', provider: 'College NCC', completionDate: '2024-10-15' }, mentor1.id);
    ExtraCredit.create({ studentId: student2.id, semester: 1, category: 'Value Education', courseName: 'Ethics in Technology', provider: 'College', completionDate: '2024-11-30' }, mentor1.id);
    ExtraCredit.create({ studentId: student3.id, semester: 1, category: 'Internship/Skill Training', courseName: 'Editorial Internship', provider: 'Kerala Kaumudi', completionDate: '2024-12-01' }, mentor2.id);

    // Achievements
    Achievements.create({ studentId: student1.id, semester: 1, date: '2024-10-20', title: '1st Prize – Bharatanatyam, Arts Fest 2024', category: 'Arts' }, mentor1.id);
    Achievements.create({ studentId: student1.id, semester: 1, date: '2024-11-05', title: 'Hackathon Winner – InnoFest 2024', category: 'Academic' }, mentor1.id);
    Achievements.create({ studentId: student3.id, semester: 1, date: '2024-10-10', title: 'Best Debater – Intercollegiate Debate', category: 'Cultural' }, mentor2.id);

    // Mentor Meetings
    Meetings.create({ mentorId: mentor1.id, studentId: student1.id, semester: 1, date: '2024-09-15', notes: 'Discussed academic goals and hostel adjustment. Student is settling in well.', studentConfirmed: true }, mentor1.id);
    Meetings.create({ mentorId: mentor1.id, studentId: student1.id, semester: 1, date: '2024-11-10', notes: 'Reviewed Sem 1 progress. Excellent grades. Encouraged to take leadership roles.', studentConfirmed: true }, mentor1.id);
    Meetings.create({ mentorId: mentor1.id, studentId: student1.id, semester: 2, date: '2025-01-20', notes: 'Goal tracker review. Discussed internship opportunities.', studentConfirmed: false }, mentor1.id);
    Meetings.create({ mentorId: mentor1.id, studentId: student2.id, semester: 1, date: '2024-09-20', notes: 'Initial meeting. Discussed attendance concern early.', studentConfirmed: true }, mentor1.id);
    Meetings.create({ mentorId: mentor1.id, studentId: student2.id, semester: 2, date: '2025-01-15', notes: 'Attendance still below threshold. Parent meeting recommended.', studentConfirmed: true }, mentor1.id);
    Meetings.create({ mentorId: mentor1.id, studentId: student4.id, semester: 1, date: '2024-09-25', notes: 'Attendance critically low. Discussed reasons. Personal issues noted.', studentConfirmed: false }, mentor1.id);
    Meetings.create({ mentorId: mentor2.id, studentId: student3.id, semester: 1, date: '2024-09-18', notes: 'Exceptional student. Discussing research paper publication.', studentConfirmed: true }, mentor2.id);

    // PTA Meetings
    PTAMeetings.create({ studentId: student1.id, semester: 1, date: '2024-12-10', notes: 'Parents briefed on excellent academic progress. Encouraged to continue.', parentAcknowledged: true, acknowledgedAt: '2024-12-11T10:00:00Z' }, mentor1.id);
    PTAMeetings.create({ studentId: student2.id, semester: 2, date: '2025-01-25', notes: 'Parent meeting regarding low attendance. Action plan discussed.', parentAcknowledged: false }, mentor1.id);

    // Mentoring Notes
    MentoringNotes.save(student1.id, 1, {
      personalityTraits: { openness: 5, sociability: 5, amiability: 5, selfDiscipline: 4, selfReliance: 5 },
      scholarTraits: { inquisitiveness: 5, hardWork: 5, punctuality: 5, enthusiasm: 5, analyticalSkills: 4, creativity: 5, teamSpirit: 4 },
      participation: 'Active in NSS. College cultural secretary. Dance club lead.',
      remarks: 'Anjali is a model student with exceptional holistic development. Highly recommended for merit scholarship.',
    }, mentor1.id);

    MentoringNotes.save(student2.id, 1, {
      personalityTraits: { openness: 3, sociability: 4, amiability: 4, selfDiscipline: 3, selfReliance: 3 },
      scholarTraits: { inquisitiveness: 3, hardWork: 3, punctuality: 2, enthusiasm: 3, analyticalSkills: 3, creativity: 3, teamSpirit: 4 },
      participation: 'Member of college football team.',
      remarks: 'Rahul needs to improve discipline and study habits. Attendance improvement is a priority.',
    }, mentor1.id);

    // Signatures
    Signatures.signMentor(student1.id, mentor1.id, null, mentor1.id);

    // Notifications
    Notifications.create(mentor1.id, 'Low Attendance Alert', 'Arjun Babu has attendance below 75%. Immediate action required.', 'warning');
    Notifications.create(mentor1.id, 'Pending Meeting Confirmation', 'Anjali Krishna has not confirmed the meeting on 2025-01-20.', 'info');
    Notifications.create(mentor1.id, 'PTA Acknowledgement Pending', 'Rahul Menon\'s parent has not acknowledged the PTA meeting.', 'warning');

    set('sb_seeded', true);
    console.info('[DB] Seed data loaded successfully.');
  }

  // ── Init ─────────────────────────────────────────────────────
  async function init() {
    try {
      const remoteHasData = await SB.hydrate();      // no-op unless Supabase is configured
      // Only skip seeding if Supabase actually returned users
      if (remoteHasData && getArr(KEYS.users).length > 0) set('sb_seeded', true);
    } catch (e) { console.warn('[SB] init hydrate failed', e); }
    await seed();
    try { Classes.promoteIfDue('system'); } catch (e) { /* no-op */ }
  }

  // ── Public API ───────────────────────────────────────────────
  return {
    init,
    generateId,
    KEYS,
    get, set, getArr, setArr,

    // Auth
    login, setPassword, requestPasswordReset, resetPassword,
    getSession, setSession, clearSession, isSessionValid,
    hashPassword, verifyPassword,

    // Modules
    Departments, Courses, Users, Assignments,
    Profiles, SemesterRecords, ExtraCredit, Achievements,
    Meetings, PTAMeetings, Progression, MentoringNotes,
    Signatures, Settings, Notifications, Analytics,
    CustomFields, AuditLog,
    Comms, ParentLinks, CourseConfig, RiskConfig, HIERARCHY, Classes,
  };
})();

// Initialize on load
DB.init();
