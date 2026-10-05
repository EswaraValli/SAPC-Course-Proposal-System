// API Service Client for SAPC Course Proposal System

const BASE_URL = '/api';

export const api = {
  // Deadline & Submission Window
  async getDeadline() {
    const res = await fetch(`${BASE_URL}/deadline`);
    if (!res.ok) throw new Error('Failed to fetch deadline status');
    return res.json();
  },

  async updateDeadline(payload, token) {
    const res = await fetch(`${BASE_URL}/deadline`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Failed to update deadline');
    return data;
  },

  // Proposals
  async submitProposal(payload) {
    const res = await fetch(`${BASE_URL}/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || data.error || 'Failed to submit proposal');
      err.data = data;
      throw err;
    }
    return data;
  },

  async getProposals(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });

    const res = await fetch(`${BASE_URL}/proposals?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch proposals');
    return res.json();
  },

  async getProposalDetail(proposalId) {
    const res = await fetch(`${BASE_URL}/proposals/${proposalId}`);
    if (!res.ok) throw new Error(`Failed to fetch proposal ${proposalId}`);
    return res.json();
  },

  async updateProposalStatus(proposalId, status, remarks, token) {
    const res = await fetch(`${BASE_URL}/proposals/${proposalId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status, remarks })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update status');
    return data;
  },

  async resendNotificationEmail(proposalId, token) {
    const res = await fetch(`${BASE_URL}/proposals/${proposalId}/resend-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to resend email');
    return data;
  },

  // Auth
  async login(username, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async getCurrentUser(token) {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
  },

  async getEmailOutbox(token) {
    const res = await fetch(`${BASE_URL}/auth/outbox`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to retrieve email logs');
    return res.json();
  },

  // Helpers for direct download links
  getPdfDownloadUrl(proposalId) {
    return `${BASE_URL}/proposals/${proposalId}/pdf`;
  },

  getPdfViewUrl(proposalId) {
    return `${BASE_URL}/proposals/${proposalId}/pdf/view`;
  },

  getExportUrl(format = 'xlsx', params = {}, token = '') {
    const searchParams = new URLSearchParams({ format });
    if (token) searchParams.append('token', token);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && key !== 'page' && key !== 'per_page') {
        searchParams.append(key, value);
      }
    });
    return `${BASE_URL}/proposals/export?${searchParams.toString()}`;
  }
};
