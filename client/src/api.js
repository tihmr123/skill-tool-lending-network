const BASE_URL = 'http://localhost:4000/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),

  getListings: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/listings${qs ? `?${qs}` : ''}`);
  },
  getListing: (id) => request(`/listings/${id}`),
  createListing: (payload, token) =>
    request('/listings', { method: 'POST', body: payload, token }),
  updateListing: (id, payload, token) =>
    request(`/listings/${id}`, { method: 'PUT', body: payload, token }),
  deleteListing: (id, token) => request(`/listings/${id}`, { method: 'DELETE', token }),
  getMyListings: (token) => request('/listings/mine/list', { token }),

  createRequest: (payload, token) =>
    request('/requests', { method: 'POST', body: payload, token }),
  getSentRequests: (token) => request('/requests/sent', { token }),
  getReceivedRequests: (token) => request('/requests/received', { token }),
  respondToRequest: (id, status, token) =>
    request(`/requests/${id}`, { method: 'PUT', body: { status }, token }),
};