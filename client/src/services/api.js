import axios from 'axios';

const getEnv = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env;
  }
  return {};
};

/**
 * Resolves base API URL dynamically from environment variables
 * In dev with proxy: defaults to '/api'
 * In production/deployment: uses VITE_API_BASE_URL or VITE_API_URL + '/api'
 */
const getApiBaseUrl = () => {
  const env = getEnv();
  if (env.VITE_API_BASE_URL) {
    return env.VITE_API_BASE_URL;
  }
  if (env.VITE_API_URL) {
    return `${env.VITE_API_URL.replace(/\/+$/, '')}/api`;
  }
  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Resolves full asset/image URL supporting both remote CDNs and backend uploads
 * across local and deployed environments via VITE_BACKEND_URL or VITE_API_URL
 */
export const getAssetUrl = (url) => {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }

  const env = getEnv();
  const backendHost = env.VITE_BACKEND_URL || env.VITE_API_URL || '';
  if (backendHost) {
    const cleanHost = backendHost.replace(/\/+$/, '');
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${cleanHost}${cleanPath}`;
  }

  return url;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25000, // 25s timeout prevents hanging on low internet / flaky mobile connections
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercept requests and attach Bearer token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('civicconnect_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses for centralized error handling and network status
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.userFriendlyMessage = 'Request timed out due to slow internet. Please check your connection and try again.';
    } else if (!error.response && typeof navigator !== 'undefined' && !navigator.onLine) {
      error.userFriendlyMessage = 'You are currently offline. Please reconnect to the internet.';
    }

    if (error.response && error.response.status === 401) {
      // If unauthorized and on protected route, clean token
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        // We can let the AuthContext handle redirection
      }
    }
    return Promise.reject(error);
  }
);

export default api;
