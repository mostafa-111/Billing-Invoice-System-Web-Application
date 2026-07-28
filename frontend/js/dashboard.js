// Load dashboard stats
async function loadDashboard() {
    try {
        const response = await apiRequest(API_ENDPOINTS.dashboard.user);
        if (response.success) {
            const stats = response.data.stats;
            if (document.getElementById('stat-invoices')) {
                document.getElementById('stat-invoices').textContent = stats.totalInvoices;
            }
            if (document.getElementById('stat-revenue')) {
                document.getElementById('stat-revenue').textContent = `$${stats.totalRevenue.toFixed(2)}`;
            }
            if (document.getElementById('stat-pending')) {
                document.getElementById('stat-pending').textContent = `$${stats.pendingAmount.toFixed(2)}`;
            }
            // Calculate paid count from recent invoices
            if (response.data.recentInvoices) {
                const paidCount = response.data.recentInvoices.filter(inv => inv.status === 'paid').length;
                if (document.getElementById('stat-paid')) {
                    document.getElementById('stat-paid').textContent = paidCount;
                }
            }
        }
    } catch (error) {
        showAlert('Error loading dashboard: ' + error.message, 'error');
    }
}

// Load invoices
async function loadInvoices() {
    try {
        const response = await apiRequest(API_ENDPOINTS.invoices.list);
        if (response.success) {
            const tbody = document.getElementById('invoices-table-body');
            if (response.data.invoices.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No invoices found. <a href="create-invoice.html">Create your first invoice</a></td></tr>';
                return;
            }
            
            tbody.innerHTML = response.data.invoices.map(invoice => `
                <tr>
                    <td>${invoice.invoiceNumber}</td>
                    <td>${invoice.client.name}</td>
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

// AI Suggestions
async function showAISuggestions() {
    try {
        const response = await apiRequest(API_ENDPOINTS.ai.suggestions, {
            method: 'POST',
            body: JSON.stringify({
                type: 'amount',
                context: 'dashboard_quick_action'
            })
        });

        if (response.success) {
            showAlert(`💡 AI Suggestion: Try creating an invoice for $${response.data.suggestion}`, 'info');
        }
    } catch (error) {
        showAlert('AI suggestions temporarily unavailable', 'info');
    }
}

// Recurring Invoices
async function showRecurringInvoices() {
    try {
        const response = await apiRequest(API_ENDPOINTS.recurring.list);

        if (response.success) {
            const count = response.data.invoices.length;
            if (count > 0) {
                showAlert(`You have ${count} recurring invoice(s). Click to manage them.`, 'info');
            } else {
                showAlert('Create your first recurring invoice for automatic billing!', 'info');
                setTimeout(() => {
                    window.location.href = 'create-invoice.html?recurring=true';
                }, 2000);
            }
        }
    } catch (error) {
        showAlert('Error loading recurring invoices', 'error');
    }
}

// Payment Links
async function showPaymentLinks() {
    const unpaidInvoices = document.querySelectorAll('.status-draft, .status-sent');
    if (unpaidInvoices.length > 0) {
        showAlert(`Create payment links for ${unpaidInvoices.length} unpaid invoice(s)`, 'info');
    } else {
        showAlert('All invoices are paid! 🎉', 'success');
    }
}

// Email Reminders
async function sendEmailReminders() {
    const sentInvoices = document.querySelectorAll('.status-sent');
    if (sentInvoices.length > 0) {
        showAlert(`Send payment reminders for ${sentInvoices.length} pending invoice(s)`, 'info');
    } else {
        showAlert('No pending invoices to remind about', 'info');
    }
}

// Tax Calculator
async function showTaxCalculator() {
    try {
        // Show a simple tax calculation example
        const response = await apiRequest(API_ENDPOINTS.tax.calculate, {
            method: 'POST',
            body: JSON.stringify({
                amount: 100,
                country: 'US',
                state: 'CA'
            })
        });

        if (response.success) {
            showAlert(`Tax calculation: $100 + $${response.data.taxAmount} tax = $${response.data.total}`, 'info');
        }
    } catch (error) {
        showAlert('Tax calculator ready - use it when creating invoices!', 'info');
    }
}

// Currency Converter
async function convertCurrency() {
    try {
        const response = await apiRequest(API_ENDPOINTS.currency.convert, {
            method: 'POST',
            body: JSON.stringify({
                amount: 100,
                from: 'USD',
                to: 'EUR'
            })
        });

        if (response.success) {
            showAlert(`Currency: $100 USD = €${response.data.convertedAmount} EUR`, 'info');
        }
    } catch (error) {
        showAlert('Currency converter available in invoice creation', 'info');
    }
}

// Enhanced invoice filtering
function filterInvoices(status) {
    const rows = document.querySelectorAll('#invoices-table-body tr');
    let visibleCount = 0;

    rows.forEach(row => {
        const statusCell = row.querySelector('.status-badge');
        if (!statusCell) return;

        const rowStatus = statusCell.textContent.toLowerCase().replace(' ', '-');
        if (!status || rowStatus.includes(status)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    showAlert(`Showing ${visibleCount} ${status || 'all'} invoice(s)`, 'info');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    loadInvoices();
});

