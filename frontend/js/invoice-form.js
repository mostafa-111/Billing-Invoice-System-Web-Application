// Add item row
function addItemRow() {
    const tbody = document.getElementById('items-tbody');
    const row = document.createElement('tr');
    row.className = 'item-row';
    row.innerHTML = `
        <td><input type="text" class="item-name" required></td>
        <td><input type="text" class="item-description"></td>
        <td><input type="number" class="item-quantity" min="0.01" step="0.01" value="1" required></td>
        <td><input type="number" class="item-price" min="0" step="0.01" value="0" required></td>
        <td class="item-total">$0.00</td>
        <td><button type="button" onclick="removeItemRow(this)" class="btn-danger btn-small">Remove</button></td>
    `;
    tbody.appendChild(row);
    
    // Add event listeners
    const inputs = row.querySelectorAll('.item-quantity, .item-price');
    inputs.forEach(input => {
        input.addEventListener('input', calculateTotals);
    });
}

// Remove item row
function removeItemRow(button) {
    const rows = document.querySelectorAll('.item-row');
    if (rows.length > 1) {
        button.closest('tr').remove();
        calculateTotals();
    } else {
        alert('Invoice must have at least one item');
    }
}

// Store current discount code data
let currentDiscountData = { amount: 0, code: null };

// Validate discount code
async function validateDiscountCode() {
    const discountCodeInput = document.getElementById('discount-code');
    if (!discountCodeInput) return;
    
    const code = discountCodeInput.value.trim().toUpperCase();
    if (!code) {
        currentDiscountData = { amount: 0, code: null };
        calculateTotals();
        return;
    }
    
    const rows = document.querySelectorAll('.item-row');
    let subtotal = 0;
    rows.forEach(row => {
        const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        subtotal += quantity * price;
    });
    
    if (subtotal === 0) {
        showAlert('Please add items before applying discount code', 'warning');
        discountCodeInput.value = '';
        currentDiscountData = { amount: 0, code: null };
        calculateTotals();
        return;
    }
    
    try {
        const response = await apiRequest(API_ENDPOINTS.discountCodes.validate, {
            method: 'POST',
            body: JSON.stringify({ code, subtotal })
        });
        
        if (response.success) {
            currentDiscountData = {
                amount: response.data.discountAmount,
                code: response.data.code,
                percentage: response.data.percentage
            };
            showAlert(`Discount code "${code}" applied! ${response.data.percentage}% off`, 'success');
            calculateTotals();
        }
    } catch (error) {
        showAlert(error.message || 'Invalid discount code', 'error');
        discountCodeInput.value = '';
        currentDiscountData = { amount: 0, code: null };
        calculateTotals();
    }
}

// Calculate totals
function calculateTotals() {
    const rows = document.querySelectorAll('.item-row');
    let subtotal = 0;
    
    rows.forEach(row => {
        const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const total = quantity * price;
        row.querySelector('.item-total').textContent = `$${total.toFixed(2)}`;
        subtotal += total;
    });
    
    const user = getUserData();
    const isAdminUser = user && user.role === 'admin';
    // For non-admin users, tax rate is always 14%
    const taxRate = isAdminUser ? (parseFloat(document.getElementById('tax-rate').value) || 0) : 14;
    
    // Use discount from code or admin direct discount
    let discount = 0;
    const discountCodeInput = document.getElementById('discount-code');
    const adminDiscountInput = document.getElementById('discount');
    
    if (discountCodeInput && discountCodeInput.value.trim()) {
        discount = currentDiscountData.amount || 0;
    } else if (isAdminUser && adminDiscountInput) {
        discount = parseFloat(adminDiscountInput.value) || 0;
    }
    
    const taxAmount = (subtotal * taxRate) / 100;
    const grandTotal = subtotal + taxAmount - discount;
    
    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('tax-amount').textContent = `$${taxAmount.toFixed(2)}`;
    document.getElementById('discount-amount').textContent = `-$${discount.toFixed(2)}`;
    document.getElementById('grand-total').textContent = `$${grandTotal.toFixed(2)}`;
}

// Load invoice for editing
async function loadInvoice(id) {
    try {
        const response = await apiRequest(API_ENDPOINTS.invoices.get(id));
        if (response.success) {
            const invoice = response.data.invoice;
            const user = getUserData();
            const isAdminUser = user && user.role === 'admin';
            
            // Fill client info
            document.getElementById('client-name').value = invoice.client.name;
            document.getElementById('client-email').value = invoice.client.email;
            document.getElementById('client-address').value = invoice.client.address || '';
            document.getElementById('client-phone').value = invoice.client.phone || '';
            
            // Clear existing items
            const tbody = document.getElementById('items-tbody');
            tbody.innerHTML = '';
            
            // Add items
            invoice.items.forEach(item => {
                addItemRow();
                const rows = tbody.querySelectorAll('.item-row');
                const lastRow = rows[rows.length - 1];
                lastRow.querySelector('.item-name').value = item.name;
                lastRow.querySelector('.item-description').value = item.description || '';
                lastRow.querySelector('.item-quantity').value = item.quantity;
                lastRow.querySelector('.item-price').value = item.price;
            });
            
            // Fill other fields
            // For non-admin users, tax rate is always 14% and disabled
            const taxRateInput = document.getElementById('tax-rate');
            if (isAdminUser) {
                taxRateInput.value = invoice.taxRate || 0;
                taxRateInput.disabled = false;
            } else {
                taxRateInput.value = 14;
                taxRateInput.disabled = true;
                taxRateInput.style.backgroundColor = '#f3f4f6';
            }
            
            // Set discount code if exists
            if (invoice.discountCode) {
                const discountCodeInput = document.getElementById('discount-code');
                if (discountCodeInput) {
                    discountCodeInput.value = invoice.discountCode;
                    // Validate and apply the code
                    setTimeout(() => validateDiscountCode(), 100);
                }
            }
            
            // For admin, show direct discount amount if no code was used
            if (isAdminUser && !invoice.discountCode) {
                const adminDiscountInput = document.getElementById('discount');
                if (adminDiscountInput) {
                    adminDiscountInput.value = invoice.discount || 0;
                }
            }
            
            // Status field - only admin can edit
            const statusSelect = document.getElementById('status');
            if (statusSelect) {
                if (isAdminUser) {
                    statusSelect.value = invoice.status;
                    statusSelect.disabled = false;
                } else {
                    statusSelect.value = invoice.status;
                    statusSelect.disabled = true;
                    statusSelect.style.backgroundColor = '#f3f4f6';
                }
            }
            
            if (invoice.dueDate) {
                document.getElementById('due-date').value = new Date(invoice.dueDate).toISOString().split('T')[0];
            }
            document.getElementById('notes').value = invoice.notes || '';
            
            calculateTotals();
        }
    } catch (error) {
        showAlert('Error loading invoice: ' + error.message, 'error');
        window.location.href = 'dashboard.html';
    }
}

// Submit invoice form
document.addEventListener('DOMContentLoaded', () => {
    const user = getUserData();
    const isAdminUser = user && user.role === 'admin';
    
    // Set up tax rate field based on user role
    const taxRateInput = document.getElementById('tax-rate');
    if (taxRateInput) {
        if (!isAdminUser) {
            // Non-admin users: tax rate is always 14% and disabled
            taxRateInput.value = 14;
            taxRateInput.disabled = true;
            taxRateInput.style.backgroundColor = '#f3f4f6';
            taxRateInput.setAttribute('readonly', 'readonly');
        }
        // Add event listener for calculation
        taxRateInput.addEventListener('input', calculateTotals);
    }
    
    // Set up status field based on user role
    const statusSelect = document.getElementById('status');
    if (statusSelect && !isAdminUser) {
        // Non-admin users: status is disabled
        statusSelect.disabled = true;
        statusSelect.style.backgroundColor = '#f3f4f6';
    }
    
    // Show/hide admin discount field
    const adminDiscountGroup = document.getElementById('admin-discount-group');
    if (adminDiscountGroup) {
        adminDiscountGroup.style.display = isAdminUser ? 'block' : 'none';
    }
    
    // Set up discount code input
    const discountCodeInput = document.getElementById('discount-code');
    if (discountCodeInput) {
        // Validate code when user stops typing (debounce)
        let timeout;
        discountCodeInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                validateDiscountCode();
            }, 500);
        });
        
        // Also validate on blur
        discountCodeInput.addEventListener('blur', validateDiscountCode);
    }
    
    // Add event listener for admin direct discount calculation
    const discountInput = document.getElementById('discount');
    if (discountInput && isAdminUser) {
        discountInput.addEventListener('input', () => {
            // Clear discount code if admin enters direct discount
            if (discountCodeInput) {
                discountCodeInput.value = '';
                currentDiscountData = { amount: 0, code: null };
            }
            calculateTotals();
        });
    }
    
    const tbody = document.getElementById('items-tbody');
    if (tbody) {
        tbody.addEventListener('input', (e) => {
            if (e.target.classList.contains('item-quantity') || e.target.classList.contains('item-price')) {
                calculateTotals();
            }
        });
    }
    
    // Form submission
    const form = document.getElementById('invoice-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Collect items
            const items = [];
            document.querySelectorAll('.item-row').forEach(row => {
                const nameInput = row.querySelector('.item-name');
                const descriptionInput = row.querySelector('.item-description');
                const quantityInput = row.querySelector('.item-quantity');
                const priceInput = row.querySelector('.item-price');
                
                if (nameInput && quantityInput && priceInput) {
                    const name = nameInput.value;
                    const description = descriptionInput ? descriptionInput.value : '';
                    const quantity = parseFloat(quantityInput.value);
                    const price = parseFloat(priceInput.value);
                    
                    if (name && quantity > 0 && price >= 0) {
                        items.push({
                            name,
                            description,
                            quantity,
                            price
                        });
                    }
                }
            });
            
            if (items.length === 0) {
                showAlert('Please add at least one item', 'error');
                return;
            }
            
            // Safely get form values with null checks
            const clientNameEl = document.getElementById('client-name');
            const clientEmailEl = document.getElementById('client-email');
            const clientAddressEl = document.getElementById('client-address');
            const clientPhoneEl = document.getElementById('client-phone');
            const discountCodeEl = document.getElementById('discount-code');
            const discountEl = document.getElementById('discount');
            const dueDateEl = document.getElementById('due-date');
            const notesEl = document.getElementById('notes');
            const currencyEl = document.getElementById('currency');
            const isRecurringEl = document.getElementById('is-recurring');
            const recurringIntervalEl = document.getElementById('recurring-interval');
            const recurringStartEl = document.getElementById('recurring-start');
            
            if (!clientNameEl || !clientEmailEl) {
                showAlert('Required fields are missing', 'error');
                return;
            }
            
            const isRecurring = isRecurringEl ? isRecurringEl.value === 'true' : false;
            const taxRateValue = taxRateInput ? (parseFloat(taxRateInput.value) || 0) : 14;
            const statusValue = statusSelect ? statusSelect.value : 'draft';
            
            // Handle discount: use discount code if provided, otherwise admin can use direct discount
            const discountCodeValue = discountCodeEl && discountCodeEl.value.trim() ? discountCodeEl.value.trim().toUpperCase() : null;
            const discountValue = isAdminUser && discountEl && !discountCodeValue ? (parseFloat(discountEl.value) || 0) : undefined;

            const formData = {
                client: {
                    name: clientNameEl.value,
                    email: clientEmailEl.value,
                    address: clientAddressEl ? clientAddressEl.value : '',
                    phone: clientPhoneEl ? clientPhoneEl.value : ''
                },
                items,
                taxRate: taxRateValue,
                ...(discountCodeValue ? { discountCode: discountCodeValue } : {}),
                ...(discountValue !== undefined ? { discount: discountValue } : {}),
                currency: currencyEl ? currencyEl.value : 'USD',
                status: statusValue,
                dueDate: dueDateEl ? (dueDateEl.value || undefined) : undefined,
                notes: notesEl ? notesEl.value : '',
                isRecurring,
                ...(isRecurring && recurringIntervalEl && recurringStartEl && {
                    recurringInterval: recurringIntervalEl.value,
                    recurringStart: recurringStartEl.value
                })
            };
            
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const invoiceId = urlParams.get('id');
                
                let response;
                if (invoiceId) {
                    // Update existing invoice
                    response = await apiRequest(API_ENDPOINTS.invoices.update(invoiceId), {
                        method: 'PUT',
                        body: JSON.stringify(formData)
                    });
                } else {
                    // Create new invoice
                    response = await apiRequest(API_ENDPOINTS.invoices.create, {
                        method: 'POST',
                        body: JSON.stringify(formData)
                    });
                }
                
                if (response.success) {
                    showAlert(invoiceId ? 'Invoice updated successfully' : 'Invoice created successfully', 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                }
            } catch (error) {
                showAlert('Error saving invoice: ' + error.message, 'error');
            }
        });
    }
    
    // Check if editing
    const urlParams = new URLSearchParams(window.location.search);
    const invoiceId = urlParams.get('id');
    if (invoiceId) {
        const h2Element = document.querySelector('h2');
        if (h2Element) h2Element.textContent = 'Edit Invoice';
        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton) submitButton.textContent = 'Update Invoice';
        loadInvoice(invoiceId);
    }
    
    // Initial calculation
    calculateTotals();
});

// Toggle recurring options visibility
function toggleRecurringOptions() {
    const isRecurring = document.getElementById('is-recurring').value === 'true';
    const recurringOptions = document.getElementById('recurring-options');
    recurringOptions.style.display = isRecurring ? 'block' : 'none';
}

// AI Suggestions
async function getAISuggestion(type) {
    const aiResult = document.getElementById('ai-result');
    aiResult.style.display = 'block';
    aiResult.textContent = '🤖 Thinking...';

    try {
        let context = '';
        if (type === 'amount') {
            const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace('$', ''));
            context = `Current subtotal: $${subtotal}`;
        } else if (type === 'due_date') {
            context = 'General invoice due date suggestion';
        }

        const response = await apiRequest(API_ENDPOINTS.ai.suggestions, {
            method: 'POST',
            body: JSON.stringify({ type, context })
        });

        if (response.success) {
            const suggestion = response.data.suggestion;
            aiResult.innerHTML = `<strong>💡 AI Suggestion:</strong> ${suggestion}`;

            // Auto-apply suggestion based on type
            if (type === 'amount' && confirm(`Apply suggested amount of $${suggestion} as discount?`)) {
                document.getElementById('discount').value = suggestion;
                calculateTotals();
            } else if (type === 'due_date' && confirm(`Set due date to ${suggestion}?`)) {
                document.getElementById('due-date').value = suggestion;
            }
        }
    } catch (error) {
        aiResult.innerHTML = '<strong>❌ AI unavailable:</strong> Feature temporarily down';
    }
}

// Tax Calculation
async function calculateTax() {
    const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace('$', ''));
    if (subtotal === 0) {
        showAlert('Add items first to calculate tax', 'warning');
        return;
    }

    try {
        const response = await apiRequest(API_ENDPOINTS.tax.calculate, {
            method: 'POST',
            body: JSON.stringify({
                amount: subtotal,
                country: 'US', // Default to US for demo
                state: 'CA',   // Default to CA for demo
                discount: parseFloat(document.getElementById('discount').value) || 0
            })
        });

        if (response.success) {
            const result = response.data;
            document.getElementById('tax-rate').value = result.taxRate;
            calculateTotals();

            showAlert(`Tax calculated: ${result.taxName} (${result.taxRate}%)`, 'success');
        }
    } catch (error) {
        showAlert('Tax calculation failed', 'error');
    }
}

// Currency Conversion
async function convertCurrency() {
    const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace('$', ''));
    if (subtotal === 0) {
        showAlert('Add items first to convert currency', 'warning');
        return;
    }

    try {
        const response = await apiRequest(API_ENDPOINTS.currency.convert, {
            method: 'POST',
            body: JSON.stringify({
                amount: subtotal,
                from: 'USD',
                to: document.getElementById('currency').value
            })
        });

        if (response.success) {
            showAlert(`Converted: ${response.data.formatted}`, 'info');
        }
    } catch (error) {
        showAlert('Currency conversion failed', 'error');
    }
}

