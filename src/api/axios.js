// src/api/axios.js
import axios from 'axios';

// Base API URL is injected via environment variables; default only for local dev.
const envBaseUrl = process.env.REACT_APP_API_BASE_URL;
if (!envBaseUrl && process.env.NODE_ENV === 'production') {
  throw new Error('Missing REACT_APP_API_BASE_URL. Set it in your .env before building.');
}

const api = axios.create({
  baseURL: envBaseUrl || 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true // REQUIRED for cookies
});

let accessToken = null;

export const setAccessToken = token => {
  accessToken = token;
};
api.interceptors.request.use(config => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// --- Auto refresh on 403 "Access Token Expired" ---
let isRefreshing = false;
let refreshPromise = null;

const performRefresh = () => {
  // Use a separate promise to dedupe concurrent refreshes
  if (!refreshPromise) {
    refreshPromise = api.post('/auth/refresh', undefined, { headers: { Authorization: undefined } })
      .then(res => {
        const newToken = res?.data?.accessToken || res?.data?.data?.accessToken;
        if (!newToken) throw new Error('Refresh response missing accessToken');
        setAccessToken(newToken);
        return newToken;
      })
      .finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error || {};

    // Avoid looping on the refresh endpoint itself
    const isRefreshCall = typeof config?.url === 'string' && config.url.includes('/auth/refresh');

    const tokenExpired =
      response?.status === 403 &&
      (response?.data?.message === 'Access Token Expired');

    if (tokenExpired && !isRefreshCall && !config?._retry) {
      config._retry = true;
      try {
        if (!isRefreshing) {
          isRefreshing = true;
          await performRefresh();
        } else {
          // Wait for the ongoing refresh
          await performRefresh();
        }

        // Retry original request with the new token
        if (accessToken) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${accessToken}`;
        } else {
          // If we somehow still don't have a token, propagate
          throw new Error('Failed to obtain refreshed access token');
        }

        return api(config);
      } catch (refreshErr) {
        // Clear token and bubble up the error for caller to handle (e.g., logout)
        setAccessToken(null);
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;