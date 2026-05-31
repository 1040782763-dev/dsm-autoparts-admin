const BASE = '/api';

async function request(method, path, body) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const api = {
  // Auth
  login: (username, password) => request('POST', '/auth/login', { username, password }),
  me: () => request('GET', '/auth/me'),
  register: (data) => request('POST', '/auth/register', data),
  listUsers: (role) => request('GET', `/auth/users${role ? `?role=${role}` : ''}`),

  // Customers
  customers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/customers${qs ? '?' + qs : ''}`);
  },
  customersMap: () => request('GET', '/customers/map'),
  customer: (id) => request('GET', `/customers/${id}`),
  createCustomer: (data) => request('POST', '/customers', data),
  updateCustomer: (id, data) => request('PUT', `/customers/${id}`, data),
  churnRisk: () => request('GET', '/customers/report/churn-risk'),

  // Parts
  parts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/parts${qs ? '?' + qs : ''}`);
  },
  partCategories: () => request('GET', '/parts/categories'),
  part: (id) => request('GET', `/parts/${id}`),
  createPart: (data) => request('POST', '/parts', data),
  updatePart: (id, data) => request('PUT', `/parts/${id}`, data),
  deletePart: (id) => request('DELETE', `/parts/${id}`),

  // Orders
  orders: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/orders${qs ? '?' + qs : ''}`);
  },
  ordersDaily: (date) => request('GET', `/orders/daily${date ? '?date=' + date : ''}`),
  order: (id) => request('GET', `/orders/${id}`),
  createOrder: (data) => request('POST', '/orders', data),
  quickOrder: (data) => request('POST', '/orders/quick', data),
  updateOrderStatus: (id, status) => request('PATCH', `/orders/${id}/status`, { status }),
  cancelOrder: (id) => request('PATCH', `/orders/${id}/cancel`),

  // Payments
  payments: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/payments${qs ? '?' + qs : ''}`);
  },
  createPayment: (data) => request('POST', '/payments', data),
  dailySummary: (date) => request('GET', `/payments/daily-summary${date ? '?date=' + date : ''}`),

  // Visits
  visits: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/visits${qs ? '?' + qs : ''}`);
  },
  createVisit: (data) => request('POST', '/visits', data),

  // Issues
  issues: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/issues${qs ? '?' + qs : ''}`);
  },
  createIssue: (data) => request('POST', '/issues', data),
  updateIssue: (id, data) => request('PUT', `/issues/${id}`, data),

  // Analytics
  dashboard: () => request('GET', '/analytics/dashboard'),
  revenue: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/analytics/revenue${qs ? '?' + qs : ''}`);
  },
  salespersonRankings: () => request('GET', '/analytics/salesperson-rankings'),
  profitMargin: () => request('GET', '/analytics/profit-margin'),
  customerAnalytics: (id) => request('GET', `/analytics/customer/${id}`),

  // Reminders
  reminders: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/reminders${qs ? '?' + qs : ''}`);
  },
  createReminder: (data) => request('POST', '/reminders', data),
  markReminderSent: (id) => request('PATCH', `/reminders/${id}/sent`),
  deleteReminder: (id) => request('DELETE', `/reminders/${id}`),

  // Settings
  settings: () => request('GET', '/settings'),
  updateSettings: (data) => request('PUT', '/settings', data),
};

export default api;
