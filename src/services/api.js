const API_BASE = '/api';

async function api(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = localStorage.getItem('dental_token');
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        ...options,
    };

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
        config.body = JSON.stringify(config.body);
    }

    // Don't set Content-Type for FormData (let browser set it with boundary)
    if (config.body instanceof FormData) {
        delete config.headers['Content-Type'];
    }

    const res = await fetch(url, config);

    // Handle non-JSON responses gracefully
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        if (!res.ok) throw new Error(`Server error (${res.status})`);
        return {};
    }

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || 'API request failed');
    }

    return data;
}

// Customers
export const getCustomers = (params = {}) => {
    const query = new URLSearchParams(
        Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return api(`/customers${query ? `?${query}` : ''}`);
};
export const getCustomer = (id) => api(`/customers/${id}`);
export const createCustomer = (data) => api('/customers', { method: 'POST', body: data });
export const updateCustomer = (id, data) => api(`/customers/${id}`, { method: 'PUT', body: data });
export const deleteCustomer = (id) => api(`/customers/${id}`, { method: 'DELETE' });
export const bulkUploadCustomers = (formData) => api('/customers/bulk-upload', { method: 'POST', body: formData });

// Customer Profile & Treatments
export const getCustomerProfile = (id) => api(`/customers/${id}/profile`);
export const getCustomerTreatments = (id, params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([_, v]) => v)).toString();
    return api(`/customers/${id}/treatments${query ? `?${query}` : ''}`);
};
export const createCustomerTreatment = (customerId, data) => api(`/customers/${customerId}/treatments`, { method: 'POST', body: data });

// Debts
export const getDebts = (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([_, v]) => v)).toString();
    return api(`/debts${query ? `?${query}` : ''}`);
};
export const createDebt = (data) => api('/debts', { method: 'POST', body: data });
export const updateDebt = (id, data) => api(`/debts/${id}`, { method: 'PUT', body: data });
export const deleteDebt = (id) => api(`/debts/${id}`, { method: 'DELETE' });

// Appointments
export const getAppointments = () => api('/appointments');
export const createAppointment = (data) => api('/appointments', { method: 'POST', body: data });
export const updateAppointment = (id, data) => api(`/appointments/${id}`, { method: 'PUT', body: data });
export const deleteAppointment = (id) => api(`/appointments/${id}`, { method: 'DELETE' });
export const getAppointmentNotifications = () => api('/appointments/notifications');

// Treatments
export const getTreatments = (category) => api(`/treatments${category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : ''}`);
export const getTreatmentCategories = () => api('/treatments/categories');
export const createTreatment = (data) => api('/treatments', { method: 'POST', body: data });
export const updateTreatment = (id, data) => api(`/treatments/${id}`, { method: 'PUT', body: data });
export const deleteTreatment = (id) => api(`/treatments/${id}`, { method: 'DELETE' });

// Payments
export const getPayments = (params) => {
    const query = new URLSearchParams(params).toString();
    return api(`/payments${query ? `?${query}` : ''}`);
};
export const createPayment = (data) => api('/payments', { method: 'POST', body: data });
export const deletePayment = (id) => api(`/payments/${id}`, { method: 'DELETE' });
export const getPaymentStats = () => api('/payments/stats/summary');

// Dashboard
export const getDashboardStats = () => api('/dashboard/stats');
export const getRevenueChart = () => api('/dashboard/revenue-chart');
export const getUpcomingAppointments = () => api('/dashboard/upcoming-appointments');

// Tooth Records (Odontogram) — now uses tooth_id (quadrant-based)
export const getToothRecords = (customerId) => api(`/dashboard/teeth/${customerId}`);
export const saveToothRecord = (data) => api('/dashboard/teeth', { method: 'POST', body: data });
export const deleteToothRecord = (customerId, toothId) => api(`/dashboard/teeth/${customerId}/${encodeURIComponent(toothId)}`, { method: 'DELETE' });

// Settings & Auth Management
export const getSettings = () => api('/settings');
export const updateSettings = (data) => api('/settings', { method: 'PUT', body: data });
export const updateProfile = (data) => api('/auth/profile', { method: 'PUT', body: data });
export const changePassword = (data) => api('/auth/password', { method: 'PUT', body: data });

// Cash Transactions
export const getCashTransactions = () => api('/cash');
export const createCashTransaction = (data) => api('/cash', { method: 'POST', body: data });
export const deleteCashTransaction = (id) => api(`/cash/${id}`, { method: 'DELETE' });
export const bulkDeleteCashTransactions = (before) => api(`/cash?before=${before}`, { method: 'DELETE' });

// Debt Payments
export const getDebtPayments = (debtId) => api(`/debts/${debtId}/payments`);
export const createDebtPayment = (debtId, data) => api(`/debts/${debtId}/payments`, { method: 'POST', body: data });
export const getDebtNotifications = () => api('/debts/notifications');

// Expenses
export const getExpenses = (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([_, v]) => v)).toString();
    return api(`/expenses${query ? `?${query}` : ''}`);
};
export const createExpense = (data) => api('/expenses', { method: 'POST', body: data });
export const updateExpense = (id, data) => api(`/expenses/${id}`, { method: 'PUT', body: data });
export const deleteExpense = (id) => api(`/expenses/${id}`, { method: 'DELETE' });
export const getFinancialSummary = (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([_, v]) => v)).toString();
    return api(`/expenses/summary${query ? `?${query}` : ''}`);
};
