// Replace with your development machine's local LAN IP (e.g., http://192.168.1.100:8080/api) when testing on physical mobile device
const API_BASE = 'http://10.0.2.2:8080/api'; // Android Emulator default host loopback

export const mobileApi = {
  async getState() {
    try {
      const res = await fetch(`${API_BASE}/state`);
      return await res.json();
    } catch (e) {
      console.warn("Mobile API connection error:", e);
      return null;
    }
  },

  async verifyDocument(id, reviewerName = 'HOD', reviewerRole = 'DeanHOD', comment = 'Verified on Mobile') {
    const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(id)}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewerName, reviewerRole, comment })
    });
    return await res.json();
  },

  async returnDocument(id, reviewerName = 'HOD', reviewerRole = 'DeanHOD', reason = 'Correction requested') {
    const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(id)}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewerName, reviewerRole, reason })
    });
    return await res.json();
  }
};

