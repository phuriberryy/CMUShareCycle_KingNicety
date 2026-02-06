// Determine API base URL
// - In CRA/Vercel, configure REACT_APP_API_BASE_URL (recommended) or REACT_APP_API_URL / REACT_APP_API_BASE
// - Runtime detection: If on Vercel (vercel.app domain), ALWAYS use Render backend
// - Defaults to http://localhost:4000/api for local development

// First check: Are we running on production? (runtime check, works even if env vars not set)
const isProduction = typeof window !== 'undefined' && 
  (window.location.hostname.includes('vercel.app') || 
   window.location.hostname.includes('github.io') ||
   window.location.hostname.includes('cmu-cycle-test'))

// Determine base URL with priority:
// 1. Runtime production detection (always wins if on Vercel/GitHub Pages)
// 2. Build-time env vars
// 3. Default to localhost
let rawApiBase = isProduction
  ? 'https://cmusharecycle-kingnicety-mg0w.onrender.com'
  : (process.env.REACT_APP_API_BASE_URL ||
     process.env.REACT_APP_API_URL ||
     process.env.REACT_APP_API_BASE ||
     'http://localhost:4000')

// Remove trailing slash and any existing /api suffix to avoid double /api/api
rawApiBase = rawApiBase.replace(/\/+$/, '').replace(/\/api$/, '')

export const API_BASE = `${rawApiBase}/api`

// Log API base URL for debugging (works in all environments)
const envSource = isProduction
  ? `runtime-detection (Production: ${typeof window !== 'undefined' ? window.location.hostname : 'unknown'})`
  : process.env.REACT_APP_API_BASE_URL 
  ? 'REACT_APP_API_BASE_URL' 
  : process.env.REACT_APP_API_URL 
  ? 'REACT_APP_API_URL' 
  : process.env.REACT_APP_API_BASE 
  ? 'REACT_APP_API_BASE'
  : 'default (localhost)'

// eslint-disable-next-line no-console
console.log('[CMUShareCycle] 🔍 API Configuration:')
// eslint-disable-next-line no-console
console.log('  API_BASE =', API_BASE)
// eslint-disable-next-line no-console
console.log('  Source =', envSource)
// eslint-disable-next-line no-console
console.log('  Hostname =', typeof window !== 'undefined' ? window.location.hostname : 'server-side')

// Warn if in production but still using localhost
if (process.env.NODE_ENV === 'production' && API_BASE.includes('localhost')) {
  // eslint-disable-next-line no-console
  console.error('[CMUShareCycle] ⚠️ CRITICAL: Using localhost API in production! This will fail. Set REACT_APP_API_BASE_URL in Vercel environment variables.')
}
const AUTH_STORAGE_KEY = 'sharecycle_auth'

const handleUnauthorized = () => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    window.dispatchEvent(new Event('sharecycle:logout'))
  } catch (err) {
    // Ignore storage errors (e.g., private mode)
  }
}

const handleResponse = async (res) => {
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401) {
      handleUnauthorized()
    }
    const error = new Error(data.message || 'Request failed')
    // Attach status code for better error handling
    error.status = res.status
    // Attach additional error data for error handling
    if (data.errors) error.errors = data.errors
    if (data.existingRequestId) error.existingRequestId = data.existingRequestId
    throw error
  }
  return data
}

const request = async (path, { token, headers, ...options } = {}) => {
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...(headers || {}),
  }

  if (token) {
    mergedHeaders['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: mergedHeaders,
  })

  return handleResponse(res)
}

export const authApi = {
  login: (payload) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}

export const itemsApi = {
  list: () => request('/items'),
  getById: (itemId) => request(`/items/${itemId}`),
  create: (token, payload) =>
    request('/items', {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    }),
  update: (token, itemId, payload) =>
    request(`/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      token,
    }),
  delete: (token, itemId) =>
    request(`/items/${itemId}`, {
      method: 'DELETE',
      token,
    }),
  getUserItems: (token, userId) =>
    request(`/items/user/${userId}`, {
      token,
    }),
  getItemExchangeRequests: (token, itemId) =>
    request(`/items/${itemId}/exchange-requests`, {
      token,
    }),
}

export const exchangeApi = {
  request: (token, payload) =>
    request('/exchange', {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    }),
  getById: (token, requestId) =>
    request(`/exchange/${requestId}`, {
      token,
    }),
  getMyRequests: (token) =>
    request('/exchange/my-requests', {
      token,
    }),
  acceptByOwner: (token, requestId) =>
    request(`/exchange/${requestId}/accept-owner`, {
      method: 'POST',
      token,
    }),
  acceptByRequester: (token, requestId) =>
    request(`/exchange/${requestId}/accept-requester`, {
      method: 'POST',
      token,
    }),
  reject: (token, requestId) =>
    request(`/exchange/${requestId}/reject`, {
      method: 'POST',
      token,
    }),
  acceptInChat: (token, chatId) =>
    request(`/exchange/chat/${chatId}/accept`, {
      method: 'POST',
      token,
    }),
  rejectInChat: (token, chatId) =>
    request(`/exchange/chat/${chatId}/reject`, {
      method: 'POST',
      token,
    }),
  finalize: (token, chatId) =>
    request(`/exchange/chat/${chatId}/finalize`, {
      method: 'POST',
      token,
    }),
}

export const notificationApi = {
  list: (token) => request('/notifications', { token }),
  markRead: (token) => request('/notifications/read', { method: 'POST', token }),
  markNotificationRead: (token, notificationId) =>
    request(`/notifications/${notificationId}/read`, { method: 'POST', token }),
  getUnreadCount: (token) => request('/notifications/unread-count', { token }),
}

export const profileApi = {
  getProfile: (token) => request('/profile', { token }),
  updateProfile: (token, payload) =>
    request('/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
      token,
    }),
  getMyItems: (token) => request('/profile/items', { token }),
  getExchangeHistory: (token) => request('/profile/exchange-history', { token }),
  getDonationHistory: (token) => request('/donations/my-donations', { token }),
}

export const chatApi = {
  create: (token, payload) =>
    request('/chats', { method: 'POST', body: JSON.stringify(payload), token }),
  list: (token) => request('/chats', { token }),
  messages: (token, chatId) => request(`/chats/${chatId}/messages`, { token }),
  accept: (token, chatId) =>
    request(`/chats/${chatId}/accept`, { method: 'PATCH', token }),
  decline: (token, chatId) =>
    request(`/chats/${chatId}/decline`, { method: 'PATCH', token }),
  confirmQr: (token, chatId, payload) =>
    request(`/chats/${chatId}/confirm`, {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    }),
}

export const statisticsApi = {
  getStatistics: () => request('/statistics'),
}

export const donationApi = {
  create: (token, payload) =>
    request('/donations', {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    }),
  receive: (token, payload) =>
    request('/donations/receive', {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    }),
  getMyDonations: (token) => request('/donations/my-donations', { token }),
  getStatistics: () => request('/donations/statistics'),
}

export const donationRequestApi = {
  request: (token, payload) =>
    request('/donation-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    }),
  getById: (token, requestId) =>
    request(`/donation-requests/${requestId}`, {
      token,
    }),
  getMyRequests: (token) =>
    request('/donation-requests/my/requests', {
      token,
    }),
  acceptByOwner: (token, requestId) =>
    request(`/donation-requests/${requestId}/accept-owner`, {
      method: 'POST',
      token,
    }),
  acceptByRequester: (token, requestId) =>
    request(`/donation-requests/${requestId}/accept-requester`, {
      method: 'POST',
      token,
    }),
  reject: (token, requestId) =>
    request(`/donation-requests/${requestId}/reject`, {
      method: 'POST',
      token,
    }),
}
