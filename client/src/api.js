const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Check that the backend is running.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // A 401 on a request that sent a token means the login is no longer valid
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),

  getListings: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/listings${qs ? `?${qs}` : ''}`);
  },
  getFilters: () => request('/listings/meta/filters'),
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
  respondToRequest: (id, status, token, extra = {}) =>
    request(`/requests/${id}`, { method: 'PUT', body: { status, ...extra }, token }),
  cancelRequest: (id, token) => request(`/requests/${id}`, { method: 'DELETE', token }),

  getReviews: (listingId) => request(`/reviews/listing/${listingId}`),
  createReview: (payload, token) =>
    request('/reviews', { method: 'POST', body: payload, token }),
};