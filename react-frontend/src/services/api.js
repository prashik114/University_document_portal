const API_BASE = 'http://localhost:8080/api';

export const api = {
  async getState() {
    const res = await fetch(`${API_BASE}/state`);
    if (!res.ok) throw new Error('Failed to fetch state');
    return await res.json();
  },

  async getDocuments(category = 'ALL', status = 'ALL', search = '') {
    const params = new URLSearchParams({ category, status, search });
    const res = await fetch(`${API_BASE}/documents?${params}`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return await res.json();
  },

  async createDocument(doc, actorName = 'Faculty', actorRole = 'Faculty') {
    const res = await fetch(`${API_BASE}/documents?actorName=${encodeURIComponent(actorName)}&actorRole=${encodeURIComponent(actorRole)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc)
    });
    if (!res.ok) throw new Error('Failed to create document');
    return await res.json();
  },

  async verifyDocument(id, reviewerName, reviewerRole, comment) {
    const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(id)}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewerName, reviewerRole, comment })
    });
    if (!res.ok) throw new Error('Failed to verify document');
    return await res.json();
  },

  async returnDocument(id, reviewerName, reviewerRole, reason) {
    const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(id)}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewerName, reviewerRole, reason })
    });
    if (!res.ok) throw new Error('Failed to return document');
    return await res.json();
  },

  async lockDocument(id, reviewerName, reviewerRole) {
    const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(id)}/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewerName, reviewerRole })
    });
    if (!res.ok) throw new Error('Failed to lock document');
    return await res.json();
  },

  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/files/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload file');
    return await res.json();
  }
};

