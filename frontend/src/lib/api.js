const normalizeApiBase = (value) => {
  if (!value) return ''
  return value.replace(/\/+$/, '').replace(/\/api$/, '')
}

const envApiBase = normalizeApiBase(
  process.env.REACT_APP_API_URL || process.env.NEXT_PUBLIC_API_URL
)

if (!envApiBase) {
  // eslint-disable-next-line no-console
  console.error(
    '[CMUShareCycle] Missing API URL. Set REACT_APP_API_URL or NEXT_PUBLIC_API_URL to https://app2.turnpro.dev/api before building.'
  )
}

export const API_BASE = envApiBase ? `${envApiBase}/api` : '/api'

// Log API base URL for debugging at runtime
// eslint-disable-next-line no-console
console.log('[CMUShareCycle] API_BASE =', API_BASE)
// eslint-disable-next-line no-console
console.log(
  '[CMUShareCycle] REACT_APP_API_URL =',
  process.env.REACT_APP_API_URL,
  'NEXT_PUBLIC_API_URL =',
  process.env.NEXT_PUBLIC_API_URL
)
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

const DEFAULT_TIMEOUT_MS = 15000 // 15 วินาที
const CHAT_TIMEOUT_MS = 30000 // แชทใช้ 30 วินาที — ลดโอกาส "Fetch is aborted"

const request = async (path, { token, headers, timeoutMs = DEFAULT_TIMEOUT_MS, ...options } = {}) => {
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...(headers || {}),
  }

  if (token) {
    mergedHeaders['Authorization'] = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timeoutId = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: mergedHeaders,
      signal: controller.signal,
    })
    if (timeoutId) clearTimeout(timeoutId)
    return handleResponse(res)
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId)
    if (err?.name === 'AbortError' || /aborted|fetch is aborted/i.test(String(err?.message || ''))) {
      const e = new Error('การเชื่อมต่อช้าหรือถูกยกเลิก — กรุณาลองอีกครั้ง')
      e.isAbort = true
      throw e
    }
    throw err
  }
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

export const adminApi = {
  getSummary: (token) => request('/admin/summary', { token }),
  // Users
  listUsers: (token, { page = 1, pageSize = 20, search = '' } = {}) =>
    request(
      `/admin/users?page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(
        pageSize
      )}&search=${encodeURIComponent(search)}`,
      { token }
    ),
  updateUserRole: (token, userId, role) =>
    request(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
      token,
    }),
  updateUserSuspension: (token, userId, suspended) =>
    request(`/admin/users/${userId}/suspension`, {
      method: 'PATCH',
      body: JSON.stringify({ suspended }),
      token,
    }),
  deleteUser: (token, userId) =>
    request(`/admin/users/${userId}`, {
      method: 'DELETE',
      token,
    }),
  // Items
  listItems: (token, { page = 1, pageSize = 20, status = '' } = {}) =>
    request(
      `/admin/items?page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(
        pageSize
      )}&status=${encodeURIComponent(status)}`,
      { token }
    ),
  deleteItem: (token, itemId) =>
    request(`/admin/items/${itemId}`, {
      method: 'DELETE',
      token,
    }),
  // Reports
  listReports: (token, { page = 1, pageSize = 20, status = '' } = {}) =>
    request(
      `/admin/reports?page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(
        pageSize
      )}&status=${encodeURIComponent(status)}`,
      { token }
    ),
  updateReportStatus: (token, reportId, status) =>
    request(`/admin/reports/${reportId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      token,
    }),
  // Chats
  listChats: (token, { page = 1, pageSize = 20 } = {}) =>
    request(
      `/admin/chats?page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(
        pageSize
      )}`,
      { token }
    ),
  getChatMessages: (token, chatId) =>
    request(`/admin/chats/${chatId}/messages`, { token }),
  deleteMessage: (token, chatId, messageId) =>
    request(`/admin/chats/${chatId}/messages/${messageId}`, {
      method: 'DELETE',
      token,
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
    request('/chats', { method: 'POST', body: JSON.stringify(payload), token, timeoutMs: CHAT_TIMEOUT_MS }),
  list: (token) => request('/chats', { token, timeoutMs: CHAT_TIMEOUT_MS }),
  messages: (token, chatId) => request(`/chats/${chatId}/messages`, { token, timeoutMs: CHAT_TIMEOUT_MS }),
  uploadImage: (token, dataUrl) =>
    request('/chats/upload-image', {
      method: 'POST',
      body: JSON.stringify({ image: dataUrl }),
      token,
      timeoutMs: CHAT_TIMEOUT_MS,
    }),
  accept: (token, chatId) =>
    request(`/chats/${chatId}/accept`, { method: 'PATCH', token, timeoutMs: CHAT_TIMEOUT_MS }),
  decline: (token, chatId) =>
    request(`/chats/${chatId}/decline`, { method: 'PATCH', token, timeoutMs: CHAT_TIMEOUT_MS }),
  confirmQr: (token, chatId, payload) =>
    request(`/chats/${chatId}/confirm`, {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
      timeoutMs: CHAT_TIMEOUT_MS,
    }),
  delete: (token, chatId) =>
    request(`/chats/${chatId}`, { method: 'DELETE', token, timeoutMs: CHAT_TIMEOUT_MS }),
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

export const leaderboardApi = {
  getLeaderboard: (type = 'points', period = 'all', limit = 10) =>
    request(`/leaderboard?type=${type}&period=${period}&limit=${limit}`),
  getFacultyLeaderboard: (type = 'co2') =>
    request(`/leaderboard/faculty?type=${type}`),
  getMyRank: (token, type = 'points') =>
    request(`/leaderboard/me?type=${type}`, { token }),
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
    request('/donation-requests/my-requests', {
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
