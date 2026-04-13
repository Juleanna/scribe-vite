const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

class ApiClient {
  getAccessToken() {
    return localStorage.getItem('scribe_access_token');
  }
  getRefreshToken() {
    return localStorage.getItem('scribe_refresh_token');
  }
  setTokens(access, refresh) {
    localStorage.setItem('scribe_access_token', access);
    if (refresh) localStorage.setItem('scribe_refresh_token', refresh);
  }
  clearTokens() {
    localStorage.removeItem('scribe_access_token');
    localStorage.removeItem('scribe_refresh_token');
  }

  async request(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const headers = { ...options.headers };
    const access = this.getAccessToken();
    if (access) headers['Authorization'] = `Bearer ${access}`;
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let res = await fetch(url, { ...options, headers });

    if (res.status === 401 && this.getRefreshToken()) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getAccessToken()}`;
        res = await fetch(url, { ...options, headers });
      }
    }
    return res;
  }

  async refreshAccessToken() {
    try {
      const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: this.getRefreshToken() }),
      });
      if (!res.ok) { this.clearTokens(); return false; }
      const data = await res.json();
      this.setTokens(data.access, data.refresh || this.getRefreshToken());
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  // Auth
  async register(email, password) {
    const res = await fetch(`${API_BASE}/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, password_confirm: password }),
    });
    return res;
  }

  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const data = await res.json();
      this.setTokens(data.access, data.refresh);
    }
    return res;
  }

  async logout() {
    const refresh = this.getRefreshToken();
    if (refresh) {
      await this.request('/auth/logout/', {
        method: 'POST',
        body: JSON.stringify({ refresh }),
      }).catch(() => {});
    }
    this.clearTokens();
  }

  async getMe() {
    return this.request('/auth/me/');
  }

  async updateMe(data) {
    return this.request('/auth/me/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async changePassword(oldPassword, newPassword) {
    return this.request('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
  }

  // Projects
  async listProjects(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.tag) query.set('tag', params.tag);
    const qs = query.toString();
    return this.request(`/projects/${qs ? '?' + qs : ''}`);
  }

  async listTags() { return this.request('/tags/'); }
  async createTag(data) { return this.request('/tags/', { method: 'POST', body: JSON.stringify(data) }); }
  async deleteTag(id) { return this.request(`/tags/${id}/`, { method: 'DELETE' }); }
  async bulkDeleteProjects(ids) { return this.request('/projects/bulk_delete/', { method: 'POST', body: JSON.stringify({ ids }) }); }

  async createProject(data) {
    return this.request('/projects/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProject(id) {
    return this.request(`/projects/${id}/`);
  }

  async updateProject(id, data) {
    return this.request(`/projects/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id) {
    return this.request(`/projects/${id}/`, { method: 'DELETE' });
  }

  async duplicateProject(id) {
    return this.request(`/projects/${id}/duplicate/`, { method: 'POST' });
  }

  async shareProject(id) {
    return this.request(`/projects/${id}/share/`, { method: 'POST' });
  }

  async getSharedProject(token) {
    return fetch(`${API_BASE}/shared/${token}/`).then(r => r.json());
  }

  // Steps
  async createStep(projectId, { mediaBase64, mediaBlob, mediaType, title, description, order }) {
    if (mediaType === 'video' && mediaBlob) {
      const form = new FormData();
      form.append('media', mediaBlob, 'recording.webm');
      form.append('media_type', mediaType);
      form.append('title', title || '');
      form.append('description', description || '');
      form.append('order', String(order ?? 0));
      return this.request(`/projects/${projectId}/steps/`, { method: 'POST', body: form });
    }
    return this.request(`/projects/${projectId}/steps/`, {
      method: 'POST',
      body: JSON.stringify({ media_base64: mediaBase64, media_type: mediaType, title, description, order }),
    });
  }

  async updateStep(projectId, stepId, data) {
    return this.request(`/projects/${projectId}/steps/${stepId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteStep(projectId, stepId) {
    return this.request(`/projects/${projectId}/steps/${stepId}/`, { method: 'DELETE' });
  }

  async reorderSteps(projectId, stepIds) {
    return this.request(`/projects/${projectId}/steps/reorder/`, {
      method: 'POST',
      body: JSON.stringify({ step_ids: stepIds }),
    });
  }

  // Webhooks
  async listWebhooks() { return this.request('/webhooks/'); }
  async createWebhook(data) { return this.request('/webhooks/', { method: 'POST', body: JSON.stringify(data) }); }
  async deleteWebhook(id) { return this.request(`/webhooks/${id}/`, { method: 'DELETE' }); }

  // AI
  async describeImage(imageBase64, previousImageBase64) {
    return this.request('/ai/describe/', {
      method: 'POST',
      body: JSON.stringify({ image: imageBase64, previous_image: previousImageBase64 || null }),
    });
  }
}

export const api = new ApiClient();
