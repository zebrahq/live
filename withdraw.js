const AIRTABLE_API_KEY = 'patefZ8p5V8GwALTC.216205e2cea767930779fe0b170ac58dcf021180ec0886ee42907592513d09e3';
const AIRTABLE_BASE_ID = 'appekA4ARqSJNPh0J';
const USERS_TABLE = 'tblxLL9PW1RYPQxye';
const WITHDRAW_TABLE = 'tbluQDRJ9AlEh15hO';

// Global variables
let currentUser = null;
let selectedPaymentMethod = null;

// DOM elements
const withdrawTab = document.getElementById('withdraw-tab');
const statusTab = document.getElementById('status-tab');
const withdrawForm = document.getElementById('withdraw-form');
const statusForm = document.getElementById('status-form');
const withdrawEmailInput = document.getElementById('withdraw-email');
const fetchInfoBtn = document.getElementById('fetch-info-btn');
const userInfoContainer = document.getElementById('user-info-container');
const userBalance = document.getElementById('user-balance');
const withdrawAmountInput = document.getElementById('withdraw-amount');
const paymentMethods = document.querySelectorAll('.payment-method');
const agentCodeContainer = document.getElementById('agent-code-container');
const submitWithdrawBtn = document.getElementById('submit-withdraw-btn');
const searchBySelect = document.getElementById('search-by');
const searchEmailContainer = document.getElementById('search-email-container');
const searchTransactionContainer = document.getElementById('search-transaction-container');
const searchEmailInput = document.getElementById('search-email');
const searchTransactionInput = document.getElementById('search-transaction');
const searchTransactionsBtn = document.getElementById('search-transactions-btn');
const transactionsContainer = document.getElementById('transactions-container');
const transactionModal = document.getElementById('transaction-modal');
const transactionDetailsContainer = document.getElementById('transaction-details-container');
const closeModalBtn = document.querySelector('.close-btn');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tabs
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab') + '-tab';
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Check if logo image fails to load and replace with text
    const logoImg = document.getElementById('logo-img');
    logoImg.onerror = function() {
        // If image fails to load, replace with text logo
        document.querySelector('.logo').innerHTML = '<h1 style="color: #e91e63; font-size: 28px; font-weight: bold; font-style: italic;">zebra reward</h1>';
    };
    
    // Setup event listeners
    setupWithdrawTab();
    setupStatusTab();
    setupModal();
});

// Setup withdraw tab functionality
function setupWithdrawTab() {
    // Fetch user info button
    fetchInfoBtn.addEventListener('click', async () => {
        const email = withdrawEmailInput.value.trim();
        
        // Reset error messages
        document.getElementById('withdraw-email-error').style.display = 'none';
        
        if (!email || !validateEmail(email)) {
            document.getElementById('withdraw-email-error').style.display = 'block';
            return;
        }
        
        // Show loading state
        fetchInfoBtn.classList.add('loading');
        fetchInfoBtn.disabled = true;
        
        try {
            // Check if user exists and get balance
            const userResult = await checkUserByEmail(email);
            
            if (userResult.exists) {
                // User exists
                currentUser = userResult.data;
                
                // Display user balance
                userBalance.textContent = `₹${parseFloat(currentUser.Balance || 0).toFixed(2)}`;
                
                // Show user info container
                userInfoContainer.style.display = 'block';
            } else {
                // User doesn't exist
                document.getElementById('withdraw-email-error').textContent = 'No account found with this email';
                document.getElementById('withdraw-email-error').style.display = 'block';
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
            alert('An error occurred. Please try again.');
        } finally {
            fetchInfoBtn.classList.remove('loading');
            fetchInfoBtn.disabled = false;
        }
    });
    
    // Payment method selection
    paymentMethods.forEach(method => {
        method.addEventListener('click', () => {
            // Remove selected class from all methods
            paymentMethods.forEach(m => m.classList.remove('selected'));
            
            // Add selected class to clicked method
            method.classList.add('selected');
            
            // Store selected method
            selectedPaymentMethod = method.getAttribute('data-method');
            
            // Show agent code field if UPI is selected
            if (selectedPaymentMethod === 'UPI') {
                agentCodeContainer.style.display = 'block';
            } else {
                agentCodeContainer.style.display = 'none';
            }
            
            // Hide error message
            document.getElementById('payment-method-error').style.display = 'none';
        });
    });
    
    // Submit withdrawal form
    withdrawForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Reset error messages
        document.getElementById('withdraw-amount-error').style.display = 'none';
        document.getElementById('payment-method-error').style.display = 'none';
        document.getElementById('agent-code-error').style.display = 'none';
        
        // Validate inputs
        const amount = parseFloat(withdrawAmountInput.value);
        
        if (!amount || amount < 29) {
            document.getElementById('withdraw-amount-error').style.display = 'block';
            return;
        }
        
        if (!selectedPaymentMethod) {
            document.getElementById('payment-method-error').style.display = 'block';
            return;
        }
        
        if (selectedPaymentMethod === 'UPI') {
            const agentCode = document.getElementById('agent-code').value.trim();
            
            if (!agentCode) {
                document.getElementById('agent-code-error').style.display = 'block';
                return;
            }
        }
        
        // Check if user has sufficient balance
        if (amount > parseFloat(currentUser.Balance || 0)) {
            document.getElementById('withdraw-amount-error').textContent = 'Insufficient balance';
            document.getElementById('withdraw-amount-error').style.display = 'block';
            return;
        }
        
        // Show loading state
        submitWithdrawBtn.classList.add('loading');
        submitWithdrawBtn.disabled = true;
        
        try {
            // Create withdrawal request
            const agentCode = selectedPaymentMethod === 'UPI' ? document.getElementById('agent-code').value.trim() : '';
            const transactionId = generateTransactionId();
            
            await createWithdrawalRequest({
                userEmail: currentUser.Email,
                userName: currentUser.Name || '',
                amount: amount,
                paymentMethod: selectedPaymentMethod,
                agentCode: agentCode,
                transactionId: transactionId,
                status: 'In progress'
            });
            
            // Show success message
            const successMessage = document.getElementById('withdraw-success');
            successMessage.textContent = `Your withdrawal request has been submitted successfully! Transaction ID: ${transactionId}`;
            successMessage.style.display = 'block';
            
            // Reset form
            withdrawForm.reset();
            userInfoContainer.style.display = 'none';
            paymentMethods.forEach(m => m.classList.remove('selected'));
            selectedPaymentMethod = null;
            
            // Hide success message after some time
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 5000);
        } catch (error) {
            console.error('Error submitting withdrawal request:', error);
            alert('An error occurred. Please try again.');
        } finally {
            submitWithdrawBtn.classList.remove('loading');
            submitWithdrawBtn.disabled = false;
        }
    });
}

// Setup status tab functionality
function setupStatusTab() {
    // Toggle search input based on search type
    searchBySelect.addEventListener('change', () => {
        const searchBy = searchBySelect.value;
        
        if (searchBy === 'email') {
            searchEmailContainer.style.display = 'block';
            searchTransactionContainer.style.display = 'none';
        } else {
            searchEmailContainer.style.display = 'none';
            searchTransactionContainer.style.display = 'block';
        }
    });
    
    // Submit status form
    statusForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Reset error messages
        document.getElementById('search-email-error').style.display = 'none';
        document.getElementById('search-transaction-error').style.display = 'none';
        
        const searchBy = searchBySelect.value;
        let searchValue = '';
        let isValid = true;
        
        if (searchBy === 'email') {
            searchValue = searchEmailInput.value.trim();
            
            if (!searchValue || !validateEmail(searchValue)) {
                document.getElementById('search-email-error').style.display = 'block';
                isValid = false;
            }
        } else {
            searchValue = searchTransactionInput.value.trim();
            
            if (!searchValue) {
                document.getElementById('search-transaction-error').style.display = 'block';
                isValid = false;
            }
        }
        
        if (!isValid) return;
        
        // Show loading state
        searchTransactionsBtn.classList.add('loading');
        searchTransactionsBtn.disabled = true;
        
        try {
            // Search transactions
            const transactions = await searchTransactions(searchBy, searchValue);
            
            // Display transactions
            displayTransactions(transactions);
            
            // Show success message if transactions found
            if (transactions.length > 0) {
                const successMessage = document.getElementById('status-success');
                successMessage.textContent = `Found ${transactions.length} transaction(s)`;
                successMessage.style.display = 'block';
                
                // Hide success message after some time
                setTimeout(() => {
                    successMessage.style.display = 'none';
                }, 3000);
            } else {
                transactionsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No transactions found</p>';
            }
        } catch (error) {
            console.error('Error searching transactions:', error);
            alert('An error occurred. Please try again.');
        } finally {
            searchTransactionsBtn.classList.remove('loading');
            searchTransactionsBtn.disabled = false;
        }
    });
}

// Setup modal functionality
function setupModal() {
    // Close modal when clicking the close button
    closeModalBtn.addEventListener('click', () => {
        transactionModal.style.display = 'none';
    });
    
    // Close modal when clicking outside the modal content
    window.addEventListener('click', (e) => {
        if (e.target === transactionModal) {
            transactionModal.style.display = 'none';
        }
    });
}

// Display transactions in the UI
// Display transactions in the UI
function displayTransactions(transactions) {s
transactionsContainer.innerHTML = '';

if (transactions.length === 0) {
transactionsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No transactions found</p>';
return;
}

transactions.sort((a, b) => new Date(b.Created) - new Date(a.Created));

transactions.forEach(transaction => {
const transactionItem = document.createElement('div');
const statusClass = getStatusClass(transaction.Status);
const statusText = getStatusDisplayText(transaction.Status);

transactionItem.className = `transaction-item ${statusClass}`;

transactionItem.innerHTML = `
    <div class="transaction-details">
        <span class="transaction-id">${transaction.TransactionId}</span>
        <span class="transaction-date">${formatDate(transaction.Created)}</span>
    </div>
    <div>
        <span class="transaction-amount">₹${parseFloat(transaction.Amount).toFixed(2)}</span>
    </div>
    <div>
        <span class="status ${statusClass}">${statusText}</span>
        <button class="view-btn" data-id="${transaction.Id}">View</button>
    </div>
`;

// Add event listener to view button
const viewBtn = transactionItem.querySelector('.view-btn');
viewBtn.addEventListener('click', () => {
    showTransactionDetails(transaction);
});

transactionsContainer.appendChild(transactionItem);
});
}
function getStatusClass(status) {
status = status.toLowerCase();
if (status === 'in progress' || status === 'pending') {
return 'pending';
} else if (status === 'completed' || status === 'approved') {
return 'completed';
} else if (status === 'rejected' || status === 'cancelled' || status === 'failed') {
return 'rejected';
}
return 'pending';
} function getStatusDisplayText(status) {
status = status.toLowerCase();
if (status === 'in progress') {
return 'Pending';
}
// Capitalize first letter of each word
return status.replace(/\b\w/g, l => l.toUpperCase());
}
// Show transaction details in modal
function showTransactionDetails(transaction) {
const statusClass = getStatusClass(transaction.Status);
const statusText = getStatusDisplayText(transaction.Status);

transactionDetailsContainer.innerHTML = `
<div class="transaction-detail-row">
    <div class="detail-label">Transaction ID</div>
    <div class="detail-value">${transaction.TransactionId}</div>
</div>
<div class="transaction-detail-row">
    <div class="detail-label">Amount</div>
    <div class="detail-value">₹${parseFloat(transaction.Amount).toFixed(2)}</div>
</div>
<div class="transaction-detail-row">
    <div class="detail-label">Date</div>
    <div class="detail-value">${formatDate(transaction.Created)}</div>
</div>
<div class="transaction-detail-row">
    <div class="detail-label">Status</div>
    <div class="detail-value">
        <span class="status ${statusClass}">${statusText}</span>
    </div>
</div>
<div class="transaction-detail-row">
    <div class="detail-label">Payment Method</div>
    <div class="detail-value">${transaction.PaymentMethod || 'N/A'}</div>
</div>
${transaction.AgentCode ? `
<div class="transaction-detail-row">
    <div class="detail-label">Agent Code</div>
    <div class="detail-value">${transaction.AgentCode}</div>
</div>
` : ''}
${transaction.UpiId ? `
<div class="transaction-detail-row">
    <div class="detail-label">UPI ID</div>
    <div class="detail-value">${transaction.UpiId}</div>
</div>
` : ''}
${transaction.Notice ? `
<div class="transaction-detail-row">
    <div class="detail-label">Notice</div>
    <div class="detail-value">${transaction.Notice}</div>
</div>
` : ''}
`;

// Show modal
transactionModal.style.display = 'flex';
}

// Format date
function formatDate(dateString) {
const date = new Date(dateString);
return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

// Generate transaction ID
function generateTransactionId() {
const prefix = 'TXN';
const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const randomPart = Array.from({length: 6}, () => randomChars.charAt(Math.floor(Math.random() * randomChars.length))).join('');
const numericPart = Math.floor(10000 + Math.random() * 90000).toString();

return `${prefix}-${randomPart}-${numericPart}`;
}

// Validate email
function validateEmail(email) {
const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
return re.test(String(email).toLowerCase());
}

// Check if user exists by email
async function checkUserByEmail(email) {
try {
const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USERS_TABLE}?filterByFormula={Email}="${email}"`, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
    }
});

const data = await response.json();

if (data.records && data.records.length > 0) {
    return {
        exists: true,
        data: {
            Id: data.records[0].id,
            Name: data.records[0].fields.Name,
            Email: data.records[0].fields.Email,
            Balance: data.records[0].fields.Balance || 0
        }
    };
} else {
    return { exists: false };
}
} catch (error) {
console.error('Error checking user:', error);
throw error;
}
}

// Create withdrawal request

async function updateUserBalance(email, withdrawAmount) {
try {
// First get the current user record
const userResult = await checkUserByEmail(email);

if (!userResult.exists) {
    throw new Error('User not found');
}

// Calculate new balance
const currentBalance = parseFloat(userResult.data.Balance) || 0;
const newBalance = Math.max(0, currentBalance - parseFloat(withdrawAmount));

// Update user record
const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USERS_TABLE}/${userResult.data.Id}`, {
    method: 'PATCH',
    headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        fields: {
            Balance: newBalance
        }
    })
});

if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
}

const data = await response.json();
return data;
} catch (error) {
console.error('Error updating user balance:', error);
throw error;
}
}
// Search transactions
async function searchTransactions(searchBy, searchValue) {
try {
let filterFormula = '';

if (searchBy === 'email') {
    filterFormula = `{UserEmail}="${searchValue}"`;
} else {
    filterFormula = `{TransactionId}="${searchValue}"`;
}

const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${WITHDRAW_TABLE}?filterByFormula=${encodeURIComponent(filterFormula)}&sort%5B0%5D%5Bfield%5D=Created&sort%5B0%5D%5Bdirection%5D=desc`, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
    }
});

if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
}

const data = await response.json();

if (data.records && data.records.length > 0) {
    return data.records.map(record => {
        const fields = record.fields || {};
        return {
            Id: record.id,
            UserEmail: fields.UserEmail || '',
            UserName: fields.UserName || '',
            Amount: fields.Amount || 0,
            PaymentMethod: fields.PaymentMethod || '',
            AgentCode: fields.AgentCode || '',
            UpiId: fields.UpiId || '',
            TransactionId: fields.TransactionId || '',
            Status: fields.Status || 'In progress',
            Notice: fields.Notice || '',
            Created: fields.Created || new Date().toISOString()
        };
    });
} else {
    return [];
}
} catch (error) {
console.error('Error searching transactions:', error);
throw error;
}
}function displayTransactions(transactions) {
    transactionsContainer.innerHTML = '';
    
    if (transactions.length === 0) {
        transactionsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No transactions found</p>';
        return;
    }
    
    transactions.sort((a, b) => new Date(b.Created) - new Date(a.Created));
    
    transactions.forEach(transaction => {
        const transactionItem = document.createElement('div');
        const statusClass = getStatusClass(transaction.Status);
        const statusText = getStatusDisplayText(transaction.Status);
        
        transactionItem.className = `transaction-item ${statusClass}`;
        
        transactionItem.innerHTML = `
            <div class="transaction-details">
                <span class="transaction-id">${transaction.TransactionId}</span>
                <span class="transaction-date">${formatDate(transaction.Created)}</span>
            </div>
            <div>
                <span class="transaction-amount">₹${parseFloat(transaction.Amount).toFixed(2)}</span>
            </div>
            <div>
                <span class="status ${statusClass}">${statusText}</span>
                <button class="view-btn" data-id="${transaction.Id}">View</button>
            </div>
        `;
        
        // Add event listener to view button
        const viewBtn = transactionItem.querySelector('.view-btn');
        viewBtn.addEventListener('click', () => {
            showTransactionDetails(transaction);
        });
        
        transactionsContainer.appendChild(transactionItem);
    });
}

// Helper function to get status class
function getStatusClass(status) {
    status = status.toLowerCase();
    if (status === 'in progress' || status === 'pending') {
        return 'pending';
    } else if (status === 'completed' || status === 'approved') {
        return 'completed';
    } else if (status === 'rejected' || status === 'cancelled' || status === 'failed') {
        return 'rejected';
    }
    return 'pending';
}

// Helper function to get display text for status
function getStatusDisplayText(status) {
    status = status.toLowerCase();
    if (status === 'in progress') {
        return 'Pending';
    }
    // Capitalize first letter of each word
    return status.replace(/\b\w/g, l => l.toUpperCase());
}

// Improved showTransactionDetails function
function showTransactionDetails(transaction) {
    const statusClass = getStatusClass(transaction.Status);
    const statusText = getStatusDisplayText(transaction.Status);
    
    transactionDetailsContainer.innerHTML = `
        <div class="transaction-detail-row">
            <div class="detail-label">Transaction ID</div>
            <div class="detail-value">${transaction.TransactionId}</div>
        </div>
        <div class="transaction-detail-row">
            <div class="detail-label">Amount</div>
            <div class="detail-value">₹${parseFloat(transaction.Amount).toFixed(2)}</div>
        </div>
        <div class="transaction-detail-row">
            <div class="detail-label">Date</div>
            <div class="detail-value">${formatDate(transaction.Created)}</div>
        </div>
        <div class="transaction-detail-row">
            <div class="detail-label">Status</div>
            <div class="detail-value">
                <span class="status ${statusClass}">${statusText}</span>
            </div>
        </div>
        <div class="transaction-detail-row">
            <div class="detail-label">Payment Method</div>
            <div class="detail-value">${transaction.PaymentMethod || 'N/A'}</div>
        </div>
        ${transaction.AgentCode ? `
        <div class="transaction-detail-row">
            <div class="detail-label">Agent Code</div>
            <div class="detail-value">${transaction.AgentCode}</div>
        </div>
        ` : ''}
        ${transaction.UpiId ? `
        <div class="transaction-detail-row">
            <div class="detail-label">UPI ID</div>
            <div class="detail-value">${transaction.UpiId}</div>
        </div>
        ` : ''}
        ${transaction.Notice ? `
        <div class="transaction-detail-row">
            <div class="detail-label">Notice</div>
            <div class="detail-value">${transaction.Notice}</div>
        </div>
        ` : ''}
    `;
    
    // Show modal
    transactionModal.style.display = 'flex';
}

// Fixed createWithdrawalRequest function to properly handle the API request
// Fixed createWithdrawalRequest function to properly handle the API request
async function createWithdrawalRequest(requestData) {
    try {
        // Format the data according to Airtable API requirements
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${WITHDRAW_TABLE}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                records: [
                    {
                        fields: {
                            UserEmail: requestData.userEmail,
                            UserName: requestData.userName || '',
                            Amount: parseFloat(requestData.amount),
                            PaymentMethod: requestData.paymentMethod,
                            AgentCode: requestData.agentCode || '',
                            TransactionId: requestData.transactionId,
                            Status: requestData.status || 'In progress'
                            // Removed the Created field as it's computed by Airtable
                        }
                    }
                ]
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // After successful withdrawal request, update user balance
        if (data.records && data.records.length > 0) {
            await updateUserBalance(requestData.userEmail, requestData.amount);
        }
        
        return data;
    } catch (error) {
        console.error('Error creating withdrawal request:', error);
        throw error;
    }
}
// New function to update user balance after successful withdrawal request
async function updateUserBalance(email, withdrawAmount) {
    try {
        // First get the current user record
        const userResult = await checkUserByEmail(email);
        
        if (!userResult.exists) {
            throw new Error('User not found');
        }
        
        // Calculate new balance
        const currentBalance = parseFloat(userResult.data.Balance) || 0;
        const newBalance = Math.max(0, currentBalance - parseFloat(withdrawAmount));
        
        // Update user record
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USERS_TABLE}/${userResult.data.Id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    Balance: newBalance
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error updating user balance:', error);
        throw error;
    }
}

// Improved searchTransactions function with better error handling
async function searchTransactions(searchBy, searchValue) {
    try {
        let filterFormula = '';
        
        if (searchBy === 'email') {
            filterFormula = `{UserEmail}="${searchValue}"`;
        } else {
            filterFormula = `{TransactionId}="${searchValue}"`;
        }
        
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${WITHDRAW_TABLE}?filterByFormula=${encodeURIComponent(filterFormula)}&sort%5B0%5D%5Bfield%5D=Created&sort%5B0%5D%5Bdirection%5D=desc`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.records && data.records.length > 0) {
            return data.records.map(record => {
                const fields = record.fields || {};
                return {
                    Id: record.id,
                    UserEmail: fields.UserEmail || '',
                    UserName: fields.UserName || '',
                    Amount: fields.Amount || 0,
                    PaymentMethod: fields.PaymentMethod || '',
                    AgentCode: fields.AgentCode || '',
                    UpiId: fields.UpiId || '',
                    TransactionId: fields.TransactionId || '',
                    Status: fields.Status || 'In progress',
                    Notice: fields.Notice || '',
                    Created: fields.Created || new Date().toISOString()
                };
            });
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error searching transactions:', error);
        throw error;
    }
}

// Enhanced checkUserByEmail function for better error handling
async function checkUserByEmail(email) {
    try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USERS_TABLE}?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}&maxRecords=1`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.records && data.records.length > 0) {
            const record = data.records[0];
            const fields = record.fields || {};
            
            return {
                exists: true,
                data: {
                    Id: record.id,
                    Name: fields.Name || '',
                    Email: fields.Email || '',
                    Balance: fields.Balance || 0,
                    UpiId: fields.UPI_ID || ''
                }
            };
        } else {
            return { exists: false };
        }
    } catch (error) {
        console.error('Error checking user:', error);
        throw error;
    }
}

// Improved formatDate function
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        
        return date.toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Error';
    }
}

// Enhanced validation function for withdrawal form
function validateWithdrawalForm() {
    let isValid = true;
    const errors = {
        amount: false,
        paymentMethod: false,
        agentCode: false,
        balance: false
    };
    
    // Reset error messages
    document.getElementById('withdraw-amount-error').style.display = 'none';
    document.getElementById('payment-method-error').style.display = 'none';
    document.getElementById('agent-code-error').style.display = 'none';
    
    // Validate amount
    const amount = parseFloat(withdrawAmountInput.value);
    if (!amount || isNaN(amount) || amount < 29) {
        document.getElementById('withdraw-amount-error').style.display = 'block';
        errors.amount = true;
        isValid = false;
    }
    
    // Validate payment method
    if (!selectedPaymentMethod) {
        document.getElementById('payment-method-error').style.display = 'block';
        errors.paymentMethod = true;
        isValid = false;
    }
    
    // Validate agent code if UPI is selected
    if (selectedPaymentMethod === 'UPI') {
        const agentCode = document.getElementById('agent-code').value.trim();
        if (!agentCode) {
            document.getElementById('agent-code-error').style.display = 'block';
            errors.agentCode = true;
            isValid = false;
        }
    }
    
    // Check if user has sufficient balance
    if (currentUser && amount > parseFloat(currentUser.Balance || 0)) {
        document.getElementById('withdraw-amount-error').textContent = 'Insufficient balance';
        document.getElementById('withdraw-amount-error').style.display = 'block';
        errors.balance = true;
        isValid = false;
    }
    
    return { isValid, errors };
}

// Setup the withdrawal form submission with improved validation
function setupWithdrawFormSubmission() {
    withdrawForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const validation = validateWithdrawalForm();
        if (!validation.isValid) return;
        
        // Show loading state
        submitWithdrawBtn.classList.add('loading');
        submitWithdrawBtn.disabled = true;
        
        try {
            // Get values from form
            const amount = parseFloat(withdrawAmountInput.value);
            const agentCode = selectedPaymentMethod === 'UPI' ? document.getElementById('agent-code').value.trim() : '';
            const transactionId = generateTransactionId();
            
            // Create withdrawal request
            const result = await createWithdrawalRequest({
                userEmail: currentUser.Email,
                userName: currentUser.Name || '',
                amount: amount,
                paymentMethod: selectedPaymentMethod,
                agentCode: agentCode,
                transactionId: transactionId,
                status: 'In progress',
                upiId: currentUser.UpiId || ''
            });
            
            // Show success message
            const successMessage = document.getElementById('withdraw-success');
            successMessage.textContent = `Your withdrawal request has been submitted successfully! Transaction ID: ${transactionId}`;
            successMessage.style.display = 'block';
            
            // Reset form
            withdrawForm.reset();
            userInfoContainer.style.display = 'none';
            paymentMethods.forEach(m => m.classList.remove('selected'));
            selectedPaymentMethod = null;
            currentUser = null;
            
            // Hide success message after some time
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 5000);
        } catch (error) {
            console.error('Error submitting withdrawal request:', error);
            alert('An error occurred while submitting your withdrawal request. Please try again.');
        } finally {
            submitWithdrawBtn.classList.remove('loading');
            submitWithdrawBtn.disabled = false;
        }
    });
}

// Enhanced fetch user info button handler
function setupFetchUserInfoButton() {
    fetchInfoBtn.addEventListener('click', async () => {
        const email = withdrawEmailInput.value.trim();
        
        // Reset error messages
        document.getElementById('withdraw-email-error').style.display = 'none';
        
        if (!email || !validateEmail(email)) {
            document.getElementById('withdraw-email-error').style.display = 'block';
            return;
        }
        
        // Show loading state
        fetchInfoBtn.classList.add('loading');
        fetchInfoBtn.disabled = true;
        
        try {
            // Check if user exists and get balance
            const userResult = await checkUserByEmail(email);
            
            if (userResult.exists) {
                // User exists
                currentUser = userResult.data;
                
                // Display user balance
                userBalance.textContent = `₹${parseFloat(currentUser.Balance || 0).toFixed(2)}`;
                
                // Show user info container
                userInfoContainer.style.display = 'block';
                
                // Pre-fill UPI ID if exists
                if (currentUser.UpiId) {
                    // If we had a UPI ID field in the form, we could set it here
                }
            } else {
                // User doesn't exist
                document.getElementById('withdraw-email-error').textContent = 'No account found with this email';
                document.getElementById('withdraw-email-error').style.display = 'block';
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
            alert('An error occurred while fetching user information. Please try again.');
        } finally {
            fetchInfoBtn.classList.remove('loading');
            fetchInfoBtn.disabled = false;
        }
    });
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tabs
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab') + '-tab';
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Check if logo image fails to load and replace with text
    const logoImg = document.getElementById('logo-img');
    if (logoImg) {
        logoImg.onerror = function() {
            // If image fails to load, replace with text logo
            document.querySelector('.logo').innerHTML = '<h1 style="color: #e91e63; font-size: 28px; font-weight: bold; font-style: italic;">zebra reward</h1>';
        };
    }
    
    // Setup event listeners for withdrawal tab
    setupFetchUserInfoButton();
    
    // Set up payment method selection
    paymentMethods.forEach(method => {
        method.addEventListener('click', () => {
            // Remove selected class from all methods
            paymentMethods.forEach(m => m.classList.remove('selected'));
            
            // Add selected class to clicked method
            method.classList.add('selected');
            
            // Store selected method
            selectedPaymentMethod = method.getAttribute('data-method');
            
            // Show agent code field if UPI is selected
            if (selectedPaymentMethod === 'UPI') {
                agentCodeContainer.style.display = 'block';
            } else {
                agentCodeContainer.style.display = 'none';
            }
            
            // Hide error message
            document.getElementById('payment-method-error').style.display = 'none';
        });
    });
    
    // Setup withdraw form submission
    setupWithdrawFormSubmission();
    
    // Setup status tab functionality
    setupStatusTab();
    
    // Setup modal functionality
    setupModal();
});

// Setup status tab functionality with improved error handling
function setupStatusTab() {
    // Toggle search input based on search type
    searchBySelect.addEventListener('change', () => {
        const searchBy = searchBySelect.value;
        
        if (searchBy === 'email') {
            searchEmailContainer.style.display = 'block';
            searchTransactionContainer.style.display = 'none';
        } else {
            searchEmailContainer.style.display = 'none';
            searchTransactionContainer.style.display = 'block';
        }
    });
    
    // Submit status form
    statusForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Reset error messages
        document.getElementById('search-email-error').style.display = 'none';
        document.getElementById('search-transaction-error').style.display = 'none';
        
        const searchBy = searchBySelect.value;
        let searchValue = '';
        let isValid = true;
        
        if (searchBy === 'email') {
            searchValue = searchEmailInput.value.trim();
            
            if (!searchValue || !validateEmail(searchValue)) {
                document.getElementById('search-email-error').style.display = 'block';
                isValid = false;
            }
        } else {
            searchValue = searchTransactionInput.value.trim();
            
            if (!searchValue) {
                document.getElementById('search-transaction-error').style.display = 'block';
                isValid = false;
            }
        }
        
        if (!isValid) return;
        
        // Show loading state
        searchTransactionsBtn.classList.add('loading');
        searchTransactionsBtn.disabled = true;
        
        try {
            // Search transactions
            const transactions = await searchTransactions(searchBy, searchValue);
            
            // Display transactions
            displayTransactions(transactions);
            
            // Show success message if transactions found
            if (transactions.length > 0) {
                const successMessage = document.getElementById('status-success');
                successMessage.textContent = `Found ${transactions.length} transaction(s)`;
                successMessage.style.display = 'block';
                
                // Hide success message after some time
                setTimeout(() => {
                    successMessage.style.display = 'none';
                }, 3000);
            } else {
                transactionsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No transactions found</p>';
            }
        } catch (error) {
            console.error('Error searching transactions:', error);
            alert('An error occurred while searching for transactions. Please try again.');
        } finally {
            searchTransactionsBtn.classList.remove('loading');
            searchTransactionsBtn.disabled = false;
        }
    });
}