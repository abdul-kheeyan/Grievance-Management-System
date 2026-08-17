import axios from 'axios';

let rawBase = (import.meta.env.VITE_API_BASE_URL || '/api').trim();
if (rawBase !== '/api') {
  rawBase = rawBase.replace(/\/+$/, '');
  if (!rawBase.endsWith('/api')) {
    rawBase = `${rawBase}/api`;
  }
}

const api = axios.create({ baseURL: rawBase });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('gs_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('gs_token');
      localStorage.removeItem('gs_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
