/**
 * Mobile API client.
 * Uses Android emulator loopback (10.0.2.2) for local development.
 * Override API_BASE via the EXPO_PUBLIC_API_BASE_URL env var for staging/production.
 */
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:8080/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const mobileApi = {
  getState: () => request('/state'),

  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, method: 'password' }),
    }),

  verifyDocument: (id, reviewerName, reviewerRole, comment = '') =>
    request(`/documents/${encodeURIComponent(id)}/verify`, {
      method: 'POST',
      body: JSON.stringify({ reviewerName, reviewerRole, comment }),
    }),

  returnDocument: (id, reviewerName, reviewerRole, reason) =>
    request(`/documents/${encodeURIComponent(id)}/return`, {
      method: 'POST',
      body: JSON.stringify({ reviewerName, reviewerRole, reason }),
    }),
};
