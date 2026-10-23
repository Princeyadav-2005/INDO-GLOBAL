const BASE_URL = import.meta.env.VITE_API_URL || '/api'

async function request(method, endpoint, data = null, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  const token = localStorage.getItem('token')

  const headers = {
    ...options.headers
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config = {
    method,
    headers,
    ...options
  }

  if (data) {
    if (data instanceof FormData) {
      // Let browser set boundary automatically
      delete headers['Content-Type']
      config.body = data
    } else {
      headers['Content-Type'] = 'application/json'
      config.body = JSON.stringify(data)
    }
  }

  let response
  try {
    response = await fetch(url, config)
  } catch (err) {
    throw new Error('Network error. Kripya apna internet connection check karein.')
  }

  if (response.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    // Avoid infinite redirect loop if already on login/register/passport
    const currentPath = window.location.pathname
    if (!currentPath.includes('/login') && !currentPath.includes('/register') && !currentPath.includes('/passport')) {
      window.location.href = '/login'
    }
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Session samapt ho gaya hai. Dobara login karein.')
  }

  const contentType = response.headers.get('content-type')
  let result = null
  if (contentType && contentType.includes('application/json')) {
    result = await response.json()
  } else {
    result = await response.text()
  }

  if (!response.ok) {
    const errorMsg = (result && result.message) || (result && result.error) || `Request failed with status ${response.status}`
    const error = new Error(errorMsg)
    error.status = response.status
    error.data = result
    throw error
  }

  return result
}

// 1. Auth API
export const authAPI = {
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  register: (data) => request('POST', '/auth/register', data),
  me: () => request('GET', '/auth/me'),
  updateProfile: (data) => request('PATCH', '/auth/me', data),
  changePassword: (data) => request('POST', '/auth/change-password', data)
}

// 2. Farms API
export const farmsAPI = {
  list: () => request('GET', '/farms'),
  create: (data) => request('POST', '/farms', data),
  get: (id) => request('GET', `/farms/${id}`),
  update: (id, data) => request('PUT', `/farms/${id}`, data),
  createPlot: (farmId, data) => request('POST', `/farms/${farmId}/plots`, data),
  getPlots: (farmId) => request('GET', `/farms/${farmId}/plots`)
}

// 3. Seasons API
export const seasonsAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request('GET', `/seasons${query ? `?${query}` : ''}`)
  },
  create: (data) => request('POST', '/seasons', data),
  get: (id) => request('GET', `/seasons/${id}`),
  update: (id, data) => request('PUT', `/seasons/${id}`, data),
  summary: (id) => request('GET', `/seasons/${id}/summary`)
}

// 4. Expenses API
export const expensesAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request('GET', `/expenses${query ? `?${query}` : ''}`)
  },
  create: (data) => request('POST', '/expenses', data),
  get: (id) => request('GET', `/expenses/${id}`),
  update: (id, data) => request('PUT', `/expenses/${id}`, data),
  delete: (id) => request('DELETE', `/expenses/${id}`),
  uploadAttachment: (expenseId, formData) => request('POST', `/expenses/${expenseId}/attachments`, formData),
  getAttachments: (expenseId) => request('GET', `/expenses/${expenseId}/attachments`),
  summary: (seasonId) => request('GET', `/expenses/summary${seasonId ? `?seasonId=${seasonId}` : ''}`),
  review: (id, status, notes) => request('POST', `/expenses/${id}/review`, { status, notes }),
  dispute: (id, reason) => request('POST', `/expenses/${id}/dispute`, { reason })
}

// 5. Mandi API
export const mandiAPI = {
  getObservations: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request('GET', `/mandi/observations${query ? `?${query}` : ''}`)
  },
  fetchFromGov: (params = {}) => request('POST', '/mandi/fetch', params),
  importCSV: (formData) => request('POST', '/mandi/import', formData),
  getCoverage: () => request('GET', '/mandi/coverage'),
  compareMarkets: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request('GET', `/mandi/compare${query ? `?${query}` : ''}`)
  },
  calcProceeds: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request('GET', `/mandi/proceeds${query ? `?${query}` : ''}`)
  },
  getStates: () => request('GET', '/mandi/states'),
  getMandis: (state) => request('GET', `/mandi/mandis${state ? `?state=${encodeURIComponent(state)}` : ''}`),
  getCommodities: () => request('GET', '/mandi/commodities')
}

// 6. Harvest & Settlement API
export const harvestAPI = {
  create: (data) => request('POST', '/harvest', data),
  get: (seasonId) => request('GET', `/harvest/${seasonId}`),
  update: (id, data) => request('PATCH', `/harvest/${id}`, data),
  createSale: (harvestId, data) => request('POST', `/harvest/${harvestId}/sale`, data),
  getSales: (harvestId) => request('GET', `/harvest/${harvestId}/sale`)
}

export const settlementAPI = {
  get: (seasonId) => request('GET', `/settlement/${seasonId}`),
  calculate: (seasonId) => request('POST', `/settlement/${seasonId}/calculate`),
  acknowledge: (seasonId, role) => request('POST', `/settlement/${seasonId}/acknowledge`, { role })
}

// 7. QR Passport API
export const qrAPI = {
  generate: (seasonId, data) => request('POST', `/qr/${seasonId}/generate`, data),
  list: (seasonId) => request('GET', `/qr/list/${seasonId}`),
  getPassport: (token) => request('GET', `/qr/${token}/passport`),
  revoke: (token, reason) => request('POST', `/qr/${token}/revoke`, { reason })
}

// 8. AI Krishi API
export const aiAPI = {
  chat: (message, language = 'hi', history = []) => request('POST', '/ai/chat', { message, language, history }),
  cropRecommend: (data) => request('POST', '/ai/crop-recommend', data),
  disease: (description, image) => request('POST', '/ai/disease', { description, image }),
  voiceParse: (transcript, language = 'hi') => request('POST', '/ai/voice-parse', { transcript, language })
}

// 9. Weather, Schemes, Marketplace API
export const weatherAPI = {
  get: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request('GET', `/weather${query ? `?${query}` : ''}`)
  }
}

export const schemesAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request('GET', `/schemes${query ? `?${query}` : ''}`)
  }
}

export const marketplaceAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request('GET', `/marketplace/listings${query ? `?${query}` : ''}`)
  },
  get: (id) => request('GET', `/marketplace/listings/${id}`),
  create: (data) => request('POST', '/marketplace/listings', data),
  update: (id, data) => request('PATCH', `/marketplace/listings/${id}`, data),
  delete: (id) => request('DELETE', `/marketplace/listings/${id}`)
}

// 10. Consistency & Audit
export const consistencyAPI = {
  get: (seasonId) => seasonId ? request('GET', `/consistency/${seasonId}`) : Promise.resolve({ data: { issues: [] } }),
  run: (seasonId) => request('POST', `/consistency/${seasonId}/run`)
}

export const auditAPI = {
  get: (entityType, entityId) => request('GET', `/audit/${entityType}/${entityId}`)
}

export default {
  auth: authAPI,
  farms: farmsAPI,
  seasons: seasonsAPI,
  expenses: expensesAPI,
  mandi: mandiAPI,
  harvest: harvestAPI,
  settlement: settlementAPI,
  qr: qrAPI,
  ai: aiAPI,
  weather: weatherAPI,
  schemes: schemesAPI,
  marketplace: marketplaceAPI,
  consistency: consistencyAPI,
  audit: auditAPI
}
