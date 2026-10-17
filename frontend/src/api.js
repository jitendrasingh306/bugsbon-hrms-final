const BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

export const getToken = () => localStorage.getItem('hrms_token');
export const setToken = (t) => (t ? localStorage.setItem('hrms_token', t) : localStorage.removeItem('hrms_token'));

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check that the backend is running.', 0);
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    // An expired/invalid session on a normal request sends the person back to login.
    if (res.status === 401 && getToken() && !path.startsWith('/auth/login')) window.dispatchEvent(new Event('auth:logout'));
    throw new ApiError(data?.message || 'Request failed', res.status, data?.fields);
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  put: (p, b) => request('PUT', p, b),
  patch: (p, b) => request('PATCH', p, b),
};
