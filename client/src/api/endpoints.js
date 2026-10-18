/**
 * Every REST call the client makes, grouped by resource.
 *
 * The axios interceptor already unwraps { success, data }, so each function
 * resolves with the payload exactly as documented in the README API list.
 */
import api from './axiosClient';

/* --------------------------------- auth ---------------------------------- */

export const authApi = {
  /**
   * Register. When `document` (a File) is supplied the request is sent as
   * multipart/form-data so NGOs/shelters can attach their proof.
   */
  register(payload, document = null) {
    if (!document) return api.post('/auth/register', payload);

    const form = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') form.append(key, value);
    });
    form.append('document', document);

    return api.post('/auth/register', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (payload) => api.patch('/auth/password', payload),
};

/* --------------------------------- users --------------------------------- */

export const userApi = {
  getProfile: () => api.get('/users/me'),

  /** Multipart when an avatar file is provided. */
  updateProfile(payload, avatar = null) {
    if (!avatar) return api.patch('/users/me', payload);

    const form = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') form.append(key, value);
    });
    form.append('avatar', avatar);

    return api.patch('/users/me', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getDonorProfile: (id) => api.get(`/users/donors/${id}`),
  getDonorReviews: (id, params) => api.get(`/users/donors/${id}/reviews`, { params }),
};

/* ------------------------------- dashboard ------------------------------- */

export const dashboardApi = {
  donor: () => api.get('/dashboard/donor'),
  recipient: () => api.get('/dashboard/recipient'),
};

/* ------------------------------- categories ------------------------------ */

export const categoryApi = {
  list: (params) => api.get('/categories', { params }),
  create: (payload) => api.post('/categories', payload),
  update: (id, payload) => api.put(`/categories/${id}`, payload),
  remove: (id) => api.delete(`/categories/${id}`),
};

/* -------------------------------- donations ------------------------------ */

export const donationApi = {
  /** Recipient feed with filters (city, radius, category, type, search). */
  browse: (params) => api.get('/donations', { params }),
  cities: () => api.get('/donations/cities'),
  mine: (params) => api.get('/donations/mine', { params }),
  claimsReceived: (params) => api.get('/donations/claims-received', { params }),
  detail: (id, params) => api.get(`/donations/${id}`, { params }),
  history: (id) => api.get(`/donations/${id}/history`),

  /** Multipart when photos are attached. */
  create(payload, images = []) {
    const form = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') form.append(key, value);
    });
    images.forEach((file) => form.append('images', file));
    return api.post('/donations', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  update(id, payload, images = []) {
    const form = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') form.append(key, value);
    });
    images.forEach((file) => form.append('images', file));
    return api.put(`/donations/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  cancel: (id) => api.post(`/donations/${id}/cancel`),
  remove: (id) => api.delete(`/donations/${id}`),
};

/* --------------------------------- claims -------------------------------- */

export const claimApi = {
  claim: (donationId, pickupNote) => api.post('/claims', { donationId, pickupNote }),
  mine: (params) => api.get('/claims/mine', { params }),
  detail: (id) => api.get(`/claims/${id}`),

  /** Multipart when a delivery proof photo is attached. */
  deliver(id, { note = '', proof = null } = {}) {
    if (!proof) return api.post(`/claims/${id}/deliver`, { note });

    const form = new FormData();
    if (note) form.append('note', note);
    form.append('proof', proof);
    return api.post(`/claims/${id}/deliver`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  cancel: (id, reason) => api.post(`/claims/${id}/cancel`, { reason }),
};

/* ------------------------------ notifications ---------------------------- */

export const notificationApi = {
  list: (params) => api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`),
};

/* -------------------------------- feedback ------------------------------- */

export const feedbackApi = {
  create: (payload) => api.post('/feedback', payload),
  donorReviews: (donorId, params) => api.get(`/feedback/donor/${donorId}`, { params }),
  donationFeedback: (donationId) => api.get(`/feedback/donation/${donationId}`),
};

/* ---------------------------------- admin -------------------------------- */

export const adminApi = {
  overview: () => api.get('/admin/overview'),
  reports: (months) => api.get('/admin/reports', { params: { months } }),
  stats: () => api.get('/admin/stats'),

  listUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUserStatus: (id, payload) => api.patch(`/admin/users/${id}/status`, payload),

  listVerifications: (params) => api.get('/admin/verifications', { params }),
  reviewVerification: (id, payload) => api.patch(`/admin/verifications/${id}`, payload),

  listDonations: (params) => api.get('/admin/donations', { params }),
  updateDonationStatus: (id, payload) => api.patch(`/admin/donations/${id}`, payload),
  deleteDonation: (id) => api.delete(`/admin/donations/${id}`),

  broadcast: (payload) => api.post('/admin/broadcast', payload),
};

export default {
  authApi,
  userApi,
  dashboardApi,
  categoryApi,
  donationApi,
  claimApi,
  notificationApi,
  feedbackApi,
  adminApi,
};
