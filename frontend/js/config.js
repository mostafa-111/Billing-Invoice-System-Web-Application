// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const API_ENDPOINTS = {
    auth: {
        register: `${API_BASE_URL}/auth/register`,
        login: `${API_BASE_URL}/auth/login`,
        me: `${API_BASE_URL}/auth/me`
    },
    invoices: {
        list: `${API_BASE_URL}/invoices`,
        get: (id) => `${API_BASE_URL}/invoices/${id}`,
        create: `${API_BASE_URL}/invoices`,
        update: (id) => `${API_BASE_URL}/invoices/${id}`,
        delete: (id) => `${API_BASE_URL}/invoices/${id}`,
        pdf: (id) => `${API_BASE_URL}/invoices/${id}/pdf`
    },
    users: {
        list: `${API_BASE_URL}/users`,
        get: (id) => `${API_BASE_URL}/users/${id}`,
        create: `${API_BASE_URL}/users`,
        update: (id) => `${API_BASE_URL}/users/${id}`,
        delete: (id) => `${API_BASE_URL}/users/${id}`
    },
    dashboard: {
        admin: `${API_BASE_URL}/dashboard/admin`,
        user: `${API_BASE_URL}/dashboard/user`
    },
    settings: {
        get: `${API_BASE_URL}/settings`,
        update: `${API_BASE_URL}/settings`,
        exportCSV: `${API_BASE_URL}/settings/export/csv`
    },
    ai: {
        suggestions: `${API_BASE_URL}/ai/suggestions`,
        feedback: (id) => `${API_BASE_URL}/ai/suggestions/${id}/feedback`
    },
    tax: {
        rate: `${API_BASE_URL}/tax/rate`,
        calculate: `${API_BASE_URL}/tax/calculate`,
        initRules: `${API_BASE_URL}/tax/init-rules`
    },
    email: {
        sendInvoice: (invoiceId) => `${API_BASE_URL}/email/send-invoice/${invoiceId}`,
        templates: `${API_BASE_URL}/email/templates`,
        createTemplate: `${API_BASE_URL}/email/templates`,
        initTemplates: `${API_BASE_URL}/email/init-templates`
    },
    recurring: {
        list: `${API_BASE_URL}/recurring`,
        create: `${API_BASE_URL}/recurring`,
        generate: (invoiceId) => `${API_BASE_URL}/recurring/${invoiceId}/generate`,
        update: (invoiceId) => `${API_BASE_URL}/recurring/${invoiceId}`
    },
    payment: {
        createLink: (invoiceId) => `${API_BASE_URL}/payment/create-link/${invoiceId}`,
        process: (invoiceId) => `${API_BASE_URL}/payment/process/${invoiceId}`,
        status: (invoiceId) => `${API_BASE_URL}/payment/status/${invoiceId}`
    },
    currency: {
        rate: `${API_BASE_URL}/currency/rate`,
        convert: `${API_BASE_URL}/currency/convert`,
        currencies: `${API_BASE_URL}/currency/currencies`
    },
    discountCodes: {
        list: `${API_BASE_URL}/discount-codes`,
        get: (id) => `${API_BASE_URL}/discount-codes/${id}`,
        create: `${API_BASE_URL}/discount-codes`,
        update: (id) => `${API_BASE_URL}/discount-codes/${id}`,
        delete: (id) => `${API_BASE_URL}/discount-codes/${id}`,
        validate: `${API_BASE_URL}/discount-codes/validate`
    }
};

// Helper function to get auth token
function getAuthToken() {
    return localStorage.getItem('token');
}

// Helper function to get user data
function getUserData() {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
}

// Helper function to check if user is admin
function isAdmin() {
    const user = getUserData();
    return user && user.role === 'admin';
}

// Helper function to require admin access (redirects if not admin)
function requireAdmin() {
    if (!requireAuth()) {
        return false;
    }
    if (!isAdmin()) {
        showAlert('Access denied. Admin privileges required.', 'error');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        return false;
    }
    return true;
}

// Helper function to set auth data
function setAuthData(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

// Helper function to clear auth data
function clearAuthData() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

// Helper function to redirect based on role
function redirectByRole() {
    const user = getUserData();
    if (user) {
        if (user.role === 'admin') {
            window.location.href = 'admin-dashboard.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    } else {
        window.location.href = 'user-login.html';
    }
}

// Helper function to make API request
async function apiRequest(url, options = {}) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            // If response is not JSON, create a simple error
            const text = await response.text();
            throw new Error(`Server error (${response.status}): ${text || 'Unknown error'}`);
        }
        
        if (!response.ok) {
            // Handle 403 Forbidden (Access Denied)
            if (response.status === 403) {
                const user = getUserData();
                if (user && user.role !== 'admin') {
                    showAlert('Access denied. Admin privileges required.', 'error');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 2000);
                }
            }
            // Handle 401 Unauthorized
            if (response.status === 401) {
                throw new Error(data.message || 'Invalid email or password');
            }
            // Handle validation errors (400 Bad Request)
            if (response.status === 400) {
                if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
                    const validationErrors = data.errors.map(err => err.msg || err.message || JSON.stringify(err)).join(', ');
                    throw new Error((data.message || 'Validation failed') + ': ' + validationErrors);
                }
                throw new Error(data.message || 'Bad Request');
            }
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// Helper function to show alert
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    alertContainer.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    
    setTimeout(() => {
        alertContainer.innerHTML = '';
    }, 5000);
}

// Helper function to download PDF with authentication
async function downloadPDF(url) {
    try {
        const token = getAuthToken();
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to download PDF');
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `invoice-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
    } catch (error) {
        showAlert('Error downloading PDF: ' + error.message, 'error');
    }
}

