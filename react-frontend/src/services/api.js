/**
 * Thin HTTP client for the University Document Portal REST API.
 * All methods throw on non-2xx responses so callers can handle errors
 * consistently with try/catch.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

function getActorHeaders(explicitActor) {
  let role = '';
  let dept = '';
  let id = '';

  if (explicitActor && (explicitActor.role || explicitActor.email)) {
    role = explicitActor.role || '';
    dept = explicitActor.department || '';
    id   = explicitActor.employeeId || explicitActor.id || '';
  }

  if (!role) {
    try {
      const raw = localStorage.getItem('portal_user_profile')
        || sessionStorage.getItem('portal_user_profile')
        || localStorage.getItem('portal_current_user')
        || sessionStorage.getItem('portal_current_user');
      if (raw) {
        const u = JSON.parse(raw);
        role = u.role || '';
        dept = u.department || '';
        id   = u.employeeId || u.id || '';
      }
    } catch (_) {}
  }

  const headers = {};
  if (role) headers['X-Actor-Role'] = role;
  if (dept) headers['X-Actor-Department'] = dept;
  if (id)   headers['X-Actor-Id'] = id;
  return headers;
}

async function request(path, options = {}) {
  const { headers: optHeaders = {}, isMultipart = false, ...restOptions } = options;
  const actorHeaders = getActorHeaders();

  const finalHeaders = {
    ...actorHeaders,
    ...optHeaders,
  };

  if (!isMultipart && !(restOptions.body instanceof FormData)) {
    if (!finalHeaders['Content-Type']) {
      finalHeaders['Content-Type'] = 'application/json';
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...restOptions,
    headers: finalHeaders,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json().catch(() => ({}));
}

export const api = {
  // ── State ──────────────────────────────────────────────────────────────────
  getState: () => request('/state'),

  // ── Auth ───────────────────────────────────────────────────────────────────
  login: (email, password, otp, method) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, otp, method }),
    }),

  changePassword: (userId, oldPassword, newPassword) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ userId, oldPassword, newPassword }),
    }),

  forgotPassword: (email) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // ── Documents ─────────────────────────────────────────────────────────────
  getDocuments: (category = 'ALL', status = 'ALL', search = '') => {
    const params = new URLSearchParams({ category, status, search });
    return request(`/documents?${params}`, { headers: {} });
  },

  createDocument: (doc, actorName, actorRole) =>
    request(
      `/documents?actorName=${encodeURIComponent(actorName)}&actorRole=${encodeURIComponent(actorRole)}`,
      { method: 'POST', body: JSON.stringify(doc) }
    ),

  updateDocument: (id, doc) =>
    request(`/documents/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(doc),
    }),

  deleteDocument: (id) =>
    request(`/documents/${encodeURIComponent(id)}`, { method: 'DELETE', headers: {} }),

  resubmitDocument: (id, actorName, actorRole, updates = {}) =>
    request(
      `/documents/${encodeURIComponent(id)}/resubmit?actorName=${encodeURIComponent(actorName)}&actorRole=${encodeURIComponent(actorRole)}`,
      { method: 'POST', body: JSON.stringify(updates) }
    ),

  verifyDocument: (id, reviewerName, reviewerRole, comment) =>
    request(`/documents/${encodeURIComponent(id)}/verify`, {
      method: 'POST',
      body: JSON.stringify({ reviewerName, reviewerRole, comment }),
    }),

  returnDocument: (id, reviewerName, reviewerRole, reason) =>
    request(`/documents/${encodeURIComponent(id)}/return`, {
      method: 'POST',
      body: JSON.stringify({ reviewerName, reviewerRole, reason }),
    }),

  lockDocument: (id, reviewerName, reviewerRole) =>
    request(`/documents/${encodeURIComponent(id)}/lock`, {
      method: 'POST',
      body: JSON.stringify({ reviewerName, reviewerRole }),
    }),

  batchForward: (actorName, actorRole) =>
    request('/documents/batch-forward', {
      method: 'POST',
      body: JSON.stringify({ reviewerName: actorName, reviewerRole: actorRole }),
    }),

  batchLock: (actorName, actorRole) =>
    request('/documents/batch-lock', {
      method: 'POST',
      body: JSON.stringify({ reviewerName: actorName, reviewerRole: actorRole }),
    }),

  getKPIs: () => request('/documents/kpis', { headers: {} }),

  // ── Files ─────────────────────────────────────────────────────────────────
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/files/upload', {
      method: 'POST',
      headers: {}, // let browser set multipart Content-Type
      body: formData,
    });
  },

  // ── Audit & Activities ────────────────────────────────────────────────────
  getAuditLogs:    () => request('/audit-logs', { headers: {} }),
  getActivities:   () => request('/activities', { headers: {} }),

  // ── Revisions ─────────────────────────────────────────────────────────────
  getRevisions:    () => request('/revisions', { headers: {} }),
  createRevision:  (req) => request('/revisions', { method: 'POST', body: JSON.stringify(req) }),
  authorizeRevision: (id) => request(`/revisions/${encodeURIComponent(id)}/authorize`, { method: 'POST', headers: {} }),
  rejectRevision:  (id) => request(`/revisions/${encodeURIComponent(id)}/reject`, { method: 'POST', headers: {} }),

  // ── Settings ──────────────────────────────────────────────────────────────
  getSettings:    () => request('/settings', { headers: {} }),
  updateSettings: (s) => request('/settings', { method: 'PUT', body: JSON.stringify(s) }),

  // ── Users & Provisioning ───────────────────────────────────────────────
  getUsers: () => request('/users'),

  provisionUser: (user, actor) => {
    const actorHeaders = getActorHeaders(actor);
    return request('/users', {
      method: 'POST',
      headers: actorHeaders,
      body: JSON.stringify(user),
    });
  },

  updateUser: (id, data, actor) => {
    const actorHeaders = getActorHeaders(actor);
    return request(`/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: actorHeaders,
      body: JSON.stringify(data),
    });
  },

  updateUserStatus: (id, status) =>
    request(`/users/${encodeURIComponent(id)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  updateUserPermissions: (id, perms) =>
    request(`/users/${encodeURIComponent(id)}/permissions`, {
      method: 'PUT',
      body: JSON.stringify(perms),
    }),

  deleteUser: (id) =>
    request(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // ── Departments ───────────────────────────────────────────────────────────
  getDepartments: () => request('/departments'),

  createDepartment: (dept) =>
    request('/departments', { method: 'POST', body: JSON.stringify(dept) }),

  updateDepartment: (id, dept) =>
    request(`/departments/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(dept),
    }),
};
