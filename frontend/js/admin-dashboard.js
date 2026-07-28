let currentTab = 'users';

// Cache for loaded data to prevent duplicate calls
const dataCache = {
    users: null,
    discountCodes: null,
    settings: null,
    lastLoad: {}
};

// Load dashboard stats (optimized - no duplicate user calls)
async function loadDashboard() {
    try {
        const response = await apiRequest(API_ENDPOINTS.dashboard.admin);
        if (response.success) {
            const stats = response.data.stats;
            document.getElementById('stat-invoices').textContent = stats.totalInvoices || 0;
            document.getElementById('stat-revenue').textContent = `$${(stats.totalRevenue || 0).toFixed(2)}`;
            document.getElementById('stat-users').textContent = stats.totalUsers || 0;
            
            // Use active users from stats if available, otherwise calculate from cache
            if (stats.activeUsers !== undefined) {
                if (document.getElementById('stat-active-users')) {
                    document.getElementById('stat-active-users').textContent = stats.activeUsers;
                }
            } else if (dataCache.users) {
                const activeUsers = dataCache.users.filter(u => u.isActive).length;
                    if (document.getElementById('stat-active-users')) {
                        document.getElementById('stat-active-users').textContent = activeUsers;
                }
            }
            
            // Show recent invoices
            if (response.data.recentInvoices) {
                const recentList = document.getElementById('recent-invoices-list');
                if (recentList) {
                    if (response.data.recentInvoices.length === 0) {
                        recentList.innerHTML = '<p style="text-align: center; color: #6B7280;">No recent invoices</p>';
                    } else {
                        recentList.innerHTML = response.data.recentInvoices.slice(0, 5).map(inv => `
                            <div style="padding: 1rem; border-left: 3px solid #0D9488; margin-bottom: 1rem; background: #F0FDFA; border-radius: 8px;">
                                <strong>${inv.invoiceNumber}</strong> - ${inv.client.name} 
                                <span class="status-badge status-${inv.status}">${inv.status.toUpperCase()}</span>
                                <span style="float: right; color: #6B7280;">$${inv.total.toFixed(2)} | ${new Date(inv.createdAt).toLocaleDateString()}</span>
                            </div>
                        `).join('');
                    }
                }
            }
        }
    } catch (error) {
        showAlert('Error loading dashboard: ' + error.message, 'error');
    }
}

// Load invoices (with loading state)
async function loadInvoices() {
    const tbody = document.getElementById('invoices-table-body');
    if (!tbody) return;
    
    // Show loading state
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Loading...</td></tr>';
    
    try {
        const response = await apiRequest(API_ENDPOINTS.invoices.list);
        if (response.success) {
            if (response.data.invoices.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No invoices found</td></tr>';
                return;
            }
            
            tbody.innerHTML = response.data.invoices.map(invoice => `
                <tr>
                    <td>${invoice.invoiceNumber}</td>
                    <td>${invoice.client.name}</td>
                    <td>${invoice.user.name}</td>
                    <td>$${invoice.total.toFixed(2)}</td>
                    <td><span class="status-badge status-${invoice.status}">${invoice.status.toUpperCase()}</span></td>
                    <td>${new Date(invoice.createdAt).toLocaleDateString()}</td>
                    <td>
                        <div class="action-buttons">
                            <a href="edit-invoice.html?id=${invoice._id}" class="btn-secondary btn-small">Edit</a>
                            <button onclick="downloadPDF('${API_ENDPOINTS.invoices.pdf(invoice._id)}')" class="btn-secondary btn-small">PDF</button>
                            <button onclick="deleteInvoice('${invoice._id}')" class="btn-danger btn-small">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        showAlert('Error loading invoices: ' + error.message, 'error');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Error loading invoices</td></tr>';
    }
}

// Load users (with caching)
async function loadUsers(forceRefresh = false) {
    console.log('loadUsers called, forceRefresh:', forceRefresh);
    console.log('Token available:', !!getAuthToken());

    // Check cache first
    if (!forceRefresh && dataCache.users && Date.now() - (dataCache.lastLoad.users || 0) < 30000) {
        console.log('Using cached users data');
        renderUsers(dataCache.users);
        return;
    }

    try {
        console.log('Making API request to load users...');
        const tbody = document.getElementById('users-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading...</td></tr>';
        }

        const response = await apiRequest(API_ENDPOINTS.users.list);
        console.log('Users API response:', response);

        if (response.success) {
            console.log('Users loaded successfully:', response.data.users.length, 'users');
            dataCache.users = response.data.users;
            dataCache.lastLoad.users = Date.now();
            renderUsers(response.data.users);
        } else {
            console.error('Users API returned success=false:', response);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Error loading users: ' + error.message, 'error');
        const tbody = document.getElementById('users-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Error loading users</td></tr>';
        }
    }
}

// Render users table (separated for reuse)
function renderUsers(users) {
    console.log('renderUsers called with', users.length, 'users');
    console.log('Users data:', users);

    const tbody = document.getElementById('users-table-body');
    console.log('users-table-body element found:', !!tbody);

    if (!tbody) {
        console.error('users-table-body element not found!');
        return;
    }

    // Check if the parent tab is visible
    const usersTab = document.getElementById('users-tab');
    console.log('users-tab element found:', !!usersTab);
    console.log('users-tab display style:', usersTab ? usersTab.style.display : 'N/A');

    if (users.length === 0) {
        console.log('No users found, showing empty message');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No users found</td></tr>';
        return;
    }

    console.log('Rendering users table with', users.length, 'users');
    const html = users.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td><span class="status-badge ${user.isActive ? 'status-paid' : 'status-draft'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
                    <button onclick="toggleUserStatus('${user._id}', ${user.isActive})" class="btn-secondary btn-small">${user.isActive ? 'Deactivate' : 'Activate'}</button>
                    <button onclick="deleteUser('${user._id}')" class="btn-danger btn-small">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');

    console.log('Generated HTML length:', html.length);
    tbody.innerHTML = html;
    console.log('HTML set successfully');
}

// Load settings
async function loadSettings() {
    try {
        const response = await apiRequest(API_ENDPOINTS.settings.get);
        if (response.success) {
            const settings = response.data.settings;
            document.getElementById('company-name').value = settings.companyName || '';
            document.getElementById('currency').value = settings.currency || 'USD';
            document.getElementById('tax-rate').value = settings.taxRate || 0;
            document.getElementById('company-email').value = settings.email || '';
            document.getElementById('company-address').value = settings.address || '';
        }
    } catch (error) {
        showAlert('Error loading settings: ' + error.message, 'error');
    }
}

// Delete invoice
async function deleteInvoice(id) {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    
    try {
        const response = await apiRequest(API_ENDPOINTS.invoices.delete(id), { method: 'DELETE' });
        if (response.success) {
            showAlert('Invoice deleted successfully', 'success');
            loadInvoices();
            loadDashboard();
        }
    } catch (error) {
        showAlert('Error deleting invoice: ' + error.message, 'error');
    }
}

// Delete user
async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        const response = await apiRequest(API_ENDPOINTS.users.delete(id), { method: 'DELETE' });
        if (response.success) {
            showAlert('User deleted successfully', 'success');
            dataCache.users = null; // Clear cache
            loadUsers(true); // Force refresh
            loadDashboard();
        }
    } catch (error) {
        showAlert('Error deleting user: ' + error.message, 'error');
    }
}

// Toggle user status
async function toggleUserStatus(id, currentStatus) {
    try {
        const response = await apiRequest(API_ENDPOINTS.users.update(id), {
            method: 'PUT',
            body: JSON.stringify({ isActive: !currentStatus })
        });
        if (response.success) {
            showAlert(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`, 'success');
            dataCache.users = null; // Clear cache
            loadUsers(true); // Force refresh
        }
    } catch (error) {
        showAlert('Error updating user: ' + error.message, 'error');
    }
}

// Show tab
function showTab(tab) {
    console.log('showTab called with tab:', tab);
    console.log('Previous currentTab:', currentTab);

    currentTab = tab;
    console.log('Hiding all tab-content elements');
    document.querySelectorAll('.tab-content').forEach(el => {
        console.log('Hiding element:', el.id);
        el.style.display = 'none';
    });

    const targetTab = document.getElementById(`${tab}-tab`);
    console.log('Showing target tab:', `${tab}-tab`, 'found:', !!targetTab);
    if (targetTab) {
        targetTab.style.display = 'block';
    }

    document.querySelectorAll('.table-header button').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
    });
    document.getElementById(`tab-${tab}`).classList.remove('btn-secondary');
    document.getElementById(`tab-${tab}`).classList.add('btn-primary');

    // Lazy load data for specific tabs (only when tab is accessed)
    if (tab === 'discount-codes') {
        loadDiscountCodes();
    } else if (tab === 'invoices') {
        loadInvoices();
    }
    // Users tab data is loaded initially, no lazy loading needed

    console.log('showTab completed, currentTab is now:', currentTab);
}

// Create user modal
function showCreateUserModal() {
    console.log('showCreateUserModal called');
    const modal = document.getElementById('user-modal');
    console.log('Modal element:', modal);
    if (modal) {
        modal.style.display = 'flex';
        console.log('User modal opened');
    } else {
        console.error('User modal not found!');
    }
}

function closeUserModal() {
    const modal = document.getElementById('user-modal');
    const form = document.getElementById('create-user-form');
    if (modal) {
        modal.style.display = 'none';
    }
    if (form) {
        form.reset();
    }
    console.log('User modal closed');
}

// Export CSV
async function exportCSV() {
    try {
        const token = getAuthToken();
        const response = await fetch(API_ENDPOINTS.settings.exportCSV, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'invoices-export.csv';
            a.click();
            window.URL.revokeObjectURL(url);
            showAlert('CSV exported successfully', 'success');
        } else {
            throw new Error('Export failed');
        }
    } catch (error) {
        showAlert('Error exporting CSV: ' + error.message, 'error');
    }
}

// Load discount codes (with caching)
async function loadDiscountCodes(forceRefresh = false) {
    // Check cache first
    if (!forceRefresh && dataCache.discountCodes && Date.now() - (dataCache.lastLoad.discountCodes || 0) < 30000) {
        renderDiscountCodes(dataCache.discountCodes);
        return;
    }
    
    try {
        const tbody = document.getElementById('discount-codes-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Loading...</td></tr>';
        }
        
        const response = await apiRequest(API_ENDPOINTS.discountCodes.list);
        if (response.success) {
            dataCache.discountCodes = response.data.codes;
            dataCache.lastLoad.discountCodes = Date.now();
            renderDiscountCodes(response.data.codes);
        }
    } catch (error) {
        showAlert('Error loading discount codes: ' + error.message, 'error');
        const tbody = document.getElementById('discount-codes-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Error loading discount codes</td></tr>';
        }
    }
}

// Render discount codes table (separated for reuse)
function renderDiscountCodes(codes) {
    const tbody = document.getElementById('discount-codes-table-body');
    if (!tbody) return;
    
    if (codes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No discount codes found</td></tr>';
        return;
    }
    
    tbody.innerHTML = codes.map(code => `
        <tr>
            <td><strong>${code.code}</strong></td>
            <td>${code.percentage}%</td>
            <td>${code.description || '-'}</td>
            <td><span class="status-badge ${code.isActive ? 'status-paid' : 'status-draft'}">${code.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>${code.currentUses}${code.maxUses ? ` / ${code.maxUses}` : ' / ∞'}</td>
            <td>${code.validUntil ? new Date(code.validUntil).toLocaleDateString() : 'No expiry'}</td>
            <td>
                <div class="action-buttons">
                    <button onclick="editDiscountCode('${code._id}')" class="btn-secondary btn-small">Edit</button>
                    <button onclick="deleteDiscountCode('${code._id}')" class="btn-danger btn-small">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Show create discount code modal
function showCreateDiscountCodeModal() {
    const modal = document.getElementById('discount-code-modal');
    const form = document.getElementById('create-discount-code-form');
    const title = document.getElementById('discount-code-modal-title');
    const submitBtn = document.getElementById('discount-code-submit-btn');
    const codeInput = document.getElementById('discount-code-code');
    
    if (modal) {
        title.textContent = 'Create Discount Code';
        submitBtn.textContent = 'Create Code';
        form.reset();
        form.removeAttribute('data-edit-id');
        if (codeInput) {
            codeInput.disabled = false;
        }
        modal.style.display = 'flex';
    }
}

// Close discount code modal
function closeDiscountCodeModal() {
    const modal = document.getElementById('discount-code-modal');
    const form = document.getElementById('create-discount-code-form');
    if (modal) {
        modal.style.display = 'none';
    }
    if (form) {
        form.reset();
        form.removeAttribute('data-edit-id');
    }
}

// Edit discount code
async function editDiscountCode(id) {
    try {
        const response = await apiRequest(API_ENDPOINTS.discountCodes.get(id));
        if (response.success) {
            const code = response.data.code;
            const modal = document.getElementById('discount-code-modal');
            const form = document.getElementById('create-discount-code-form');
            const title = document.getElementById('discount-code-modal-title');
            const submitBtn = document.getElementById('discount-code-submit-btn');
            
            document.getElementById('discount-code-code').value = code.code;
            document.getElementById('discount-code-percentage').value = code.percentage;
            document.getElementById('discount-code-description').value = code.description || '';
            document.getElementById('discount-code-valid-from').value = code.validFrom ? new Date(code.validFrom).toISOString().split('T')[0] : '';
            document.getElementById('discount-code-valid-until').value = code.validUntil ? new Date(code.validUntil).toISOString().split('T')[0] : '';
            document.getElementById('discount-code-max-uses').value = code.maxUses || '';
            document.getElementById('discount-code-active').checked = code.isActive;
            
            document.getElementById('discount-code-code').disabled = true; // Can't change code once created
            
            title.textContent = 'Edit Discount Code';
            submitBtn.textContent = 'Update Code';
            form.setAttribute('data-edit-id', id);
            modal.style.display = 'flex';
        }
    } catch (error) {
        showAlert('Error loading discount code: ' + error.message, 'error');
    }
}

// Delete discount code
async function deleteDiscountCode(id) {
    if (!confirm('Are you sure you want to delete this discount code?')) return;
    
    try {
        const response = await apiRequest(API_ENDPOINTS.discountCodes.delete(id), { method: 'DELETE' });
        if (response.success) {
            showAlert('Discount code deleted successfully', 'success');
            dataCache.discountCodes = null; // Clear cache
            loadDiscountCodes(true); // Force refresh
        }
    } catch (error) {
        showAlert('Error deleting discount code: ' + error.message, 'error');
    }
}

// Password visibility toggle function
function togglePasswordVisibility(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);

    if (input && button) {
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = '🙈'; // Closed eye when visible
            button.setAttribute('aria-label', 'Hide password');
        } else {
            input.type = 'password';
            button.textContent = '👁️'; // Open eye when hidden
            button.setAttribute('aria-label', 'Show password');
        }
    }
}

// Initialize - Single DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', () => {
    loadInvoices();
    
    // Create user form
    const userForm = document.getElementById('create-user-form');
    if (userForm && !userForm.hasAttribute('data-listener-attached')) {
        console.log('Setting up user form listener');
        userForm.setAttribute('data-listener-attached', 'true');
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('User form submitted');

            // Get form elements
            const nameEl = document.getElementById('user-name');
            const emailEl = document.getElementById('user-email');
            const passwordEl = document.getElementById('user-password');
            const roleEl = document.getElementById('user-role');

            console.log('Form elements:', { nameEl, emailEl, passwordEl, roleEl });

            if (!nameEl || !emailEl || !passwordEl || !roleEl) {
                console.error('Form fields missing:', { nameEl, emailEl, passwordEl, roleEl });
                showAlert('Form fields are missing. Please refresh the page.', 'error');
                return;
            }

            // Get form values with safer null checks
            const name = nameEl && typeof nameEl.value === 'string' ? nameEl.value.trim() : '';
            const email = emailEl && typeof emailEl.value === 'string' ? emailEl.value.trim() : '';
            const password = passwordEl && typeof passwordEl.value === 'string' ? passwordEl.value : '';
            const role = roleEl && typeof roleEl.value === 'string' ? roleEl.value : 'user';

            console.log('Form values:', { name, email, password: '***', role });

            // Validate form
            if (!name || !email || !password) {
                showAlert('Please fill in all required fields', 'error');
                return;
            }

            if (password.length < 6) {
                showAlert('Password must be at least 6 characters', 'error');
                return;
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showAlert('Please enter a valid email address', 'error');
                return;
            }

            const formData = {
                name,
                email,
                password,
                role: role || 'user'
            };

            console.log('Sending form data:', { ...formData, password: '***' });

            try {
                const response = await apiRequest(API_ENDPOINTS.users.create, {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });

                console.log('Response received:', response);

                if (response.success) {
                    console.log('User creation successful');
                    showAlert('User created successfully', 'success');
                    closeUserModal();
                    dataCache.users = null; // Clear cache
                    loadUsers(true); // Force refresh
                    loadDashboard();
                } else {
                    console.log('User creation failed:', response);
                    showAlert(response.message || 'Error creating user', 'error');
                }
            } catch (error) {
                console.error('Create user error:', error);
                const errorMessage = error.message || 'Unknown error occurred';
                showAlert('Error creating user: ' + errorMessage, 'error');
            }
        });
    } else {
        console.log('User form already has listener or not found:', userForm);
    }

    // Password toggle for user creation modal
    const userPasswordToggle = document.getElementById('user-password-toggle');
    if (userPasswordToggle) {
        userPasswordToggle.addEventListener('click', () => {
            togglePasswordVisibility('user-password', 'user-password-toggle');
        });
    }

    // Discount code form
    const discountCodeForm = document.getElementById('create-discount-code-form');
    if (discountCodeForm && !discountCodeForm.hasAttribute('data-listener-attached')) {
        discountCodeForm.setAttribute('data-listener-attached', 'true');
        discountCodeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const code = document.getElementById('discount-code-code').value.toUpperCase().trim();
            const percentageInput = document.getElementById('discount-code-percentage');
            const percentage = percentageInput && typeof percentageInput.value === 'string' ? parseFloat(percentageInput.value) : 0;
            const descriptionInput = document.getElementById('discount-code-description');
            const description = descriptionInput && typeof descriptionInput.value === 'string' ? descriptionInput.value.trim() : '';
            const validFromInput = document.getElementById('discount-code-valid-from');
            const validUntilInput = document.getElementById('discount-code-valid-until');
            const maxUsesInput = document.getElementById('discount-code-max-uses');
            const isActiveInput = document.getElementById('discount-code-active');

            const validFrom = validFromInput && typeof validFromInput.value === 'string' ? validFromInput.value : '';
            const validUntil = validUntilInput && typeof validUntilInput.value === 'string' ? validUntilInput.value : '';
            const maxUses = maxUsesInput && typeof maxUsesInput.value === 'string' ? maxUsesInput.value : '';
            const isActive = isActiveInput ? isActiveInput.checked : true;
            
            const editId = discountCodeForm.getAttribute('data-edit-id');
            
            // Don't send code field when editing (it's disabled and can't be changed)
            const formData = {
                percentage,
                description: description || undefined,
                validFrom: validFrom || undefined,
                validUntil: validUntil || undefined,
                maxUses: maxUses ? parseInt(maxUses) : undefined,
                isActive
            };
            
            // Only include code when creating
            if (!editId) {
                formData.code = code;
            }
            
            try {
                let response;
                if (editId) {
                    // Update existing code
                    response = await apiRequest(API_ENDPOINTS.discountCodes.update(editId), {
                        method: 'PUT',
                        body: JSON.stringify(formData)
                    });
                } else {
                    // Create new code
                    response = await apiRequest(API_ENDPOINTS.discountCodes.create, {
                        method: 'POST',
                        body: JSON.stringify(formData)
                    });
                }
                
                if (response.success) {
                    showAlert(editId ? 'Discount code updated successfully' : 'Discount code created successfully', 'success');
                    closeDiscountCodeModal();
                    dataCache.discountCodes = null; // Clear cache
                    loadDiscountCodes(true); // Force refresh
                }
            } catch (error) {
                showAlert('Error saving discount code: ' + error.message, 'error');
            }
        });
    }
    
    // Settings form
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm && !settingsForm.hasAttribute('data-listener-attached')) {
        settingsForm.setAttribute('data-listener-attached', 'true');
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = {
                companyName: document.getElementById('company-name').value,
                currency: document.getElementById('currency').value,
                taxRate: parseFloat(document.getElementById('tax-rate').value) || 0,
                email: document.getElementById('company-email').value,
                address: document.getElementById('company-address').value
            };
            
            try {
                const response = await apiRequest(API_ENDPOINTS.settings.update, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
                if (response.success) {
                    showAlert('Settings saved successfully', 'success');
                }
            } catch (error) {
                showAlert('Error saving settings: ' + error.message, 'error');
            }
        });
    }
});


