const BASE = import.meta.env.VITE_API_URL || '/api';
export const getToken = () => localStorage.getItem('pp_token');
export const getUser = () => JSON.parse(localStorage.getItem('pp_user') || 'null');
export const saveSession = ({ token, user }) => {
  localStorage.setItem('pp_token', token);
  localStorage.setItem('pp_user', JSON.stringify(user));
};
export const clearSession = () => { localStorage.removeItem('pp_token'); localStorage.removeItem('pp_user'); };

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(getToken() && { Authorization: `Bearer ${getToken()}` }) },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && getToken()) { clearSession(); window.location.href = '/login'; }
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}
