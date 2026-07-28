// Register user
async function registerUser(formData) {
    try {
        const response = await apiRequest(API_ENDPOINTS.auth.register, {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        if (response.success) {
            setAuthData(response.data.token, response.data.user);
            showAlert('Registration successful! Redirecting...', 'success');
            setTimeout(() => {
                redirectByRole();
            }, 1000);
        }
    } catch (error) {
        showAlert(error.message || 'Registration failed. Please try again.', 'error');
    }
}

// Login user
async function loginUser(formData) {
    try {
        const response = await apiRequest(API_ENDPOINTS.auth.login, {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        if (response.success) {
            setAuthData(response.data.token, response.data.user);
            showAlert('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                redirectByRole();
            }, 1000);
        }
    } catch (error) {
        showAlert(error.message || 'Login failed. Please check your credentials.', 'error');
    }
}

// Logout
function logout() {
    clearAuthData();
    window.location.href = 'index.html';
}

// Check authentication and redirect if not logged in
function requireAuth() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = 'user-login.html';
        return false;
    }
    return true;
}

// Verify token on page load
async function verifyAuth() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = 'user-login.html';
        return;
    }
    
    try {
        const response = await apiRequest(API_ENDPOINTS.auth.me);
        if (response.success) {
            setAuthData(token, response.data.user);
        }
    } catch (error) {
        clearAuthData();
        window.location.href = 'user-login.html';
    }
}

