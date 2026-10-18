/**
 * Axios instance shared by every API call.
 *
 *  * attaches the JWT from localStorage to every request
 *  * unwraps the { success, data } envelope so callers receive `data` directly
 *  * normalises errors into { message, status, details } so the UI never has to
 *    know whether it was a 422 validation error or a network timeout
 *  * emits an `auth:unauthorized` window event on 401 so AuthContext can log out
 */
import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'cfp_token';

// In dev the Vite proxy forwards /api to http://localhost:5000.
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const axiosClient = axios.create({
  baseURL,
  timeout: 25000,
  headers: { Accept: 'application/json' },
});

/** Read the persisted token (single source of truth for the header). */
export function getStoredToken() {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* private mode - token simply will not persist */
  }
}

/* ------------------------------ request side ------------------------------ */

axiosClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Let the browser set the multipart boundary itself.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

/* ------------------------------ response side ----------------------------- */

axiosClient.interceptors.response.use(
  // Success: strip the envelope.
  (response) => response.data?.data ?? response.data,

  (error) => {
    const status = error.response?.status || 0;
    const body = error.response?.data || {};

    let message = body.error || error.message || 'Something went wrong.';
    if (status === 0) {
      message = 'Cannot reach the server. Is the API running?';
    } else if (error.code === 'ECONNABORTED') {
      message = 'The request timed out. Please try again.';
    }

    const normalized = {
      message,
      status,
      details: Array.isArray(body.details) ? body.details : [],
    };

    // Session expired / suspended -> let the app reset its auth state.
    if (status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: normalized }));
    }

    return Promise.reject(normalized);
  },
);

export default axiosClient;
