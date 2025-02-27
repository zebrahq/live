// Airtable API configuration
const AIRTABLE_API_KEY = 'patefZ8p5V8GwALTC.216205e2cea767930779fe0b170ac58dcf021180ec0886ee42907592513d09e3';
const AIRTABLE_BASE_ID = 'appekA4ARqSJNPh0J';
const USERS_TABLE = 'tblxLL9PW1RYPQxye';
const SUBMISSIONS_TABLE = 'tblZq2lccxuw6eX9J';

// Initialize variables
let currentUser = null;
let userPassword = null;
let userCodes = [];

// DOM elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const passwordField = document.getElementById('password-field');
const firstTimePasswordFields = document.getElementById('first-time-password-fields');
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const loginBtn = document.getElementById('login-btn');

// Check if logo image fails to load and replace with text
document.addEventListener('DOMContentLoaded', function() {
    const logoImgs = document.querySelectorAll('img[src="zebra-reward-logo.png"]');
    logoImgs.forEach(img => {
        img.onerror = function() {
            // If image fails to load, replace with text logo
            document.querySelectorAll('.logo').forEach(logo => {
                logo.innerHTML = '<h1 style="color: #e91e63; font-size: 28px; font-weight: bold; font-style: italic;">zebra reward</h1>';
            });
        };
    });

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

    // Add logout functionality
    document.getElementById('logout-btn').addEventListener('click', () => {
        // Clear user data
        currentUser = null;
        userPassword = null;
        userCodes = [];
        
        // Reset forms
        loginForm.reset();
        document.getElementById('profile-form').reset();
        document.getElementById('password-form').reset();
        
        // Hide password fields
        passwordField.style.display = 'none';
        firstTimePasswordFields.style.display = 'none';
        
        // Show login container
        dashboardContainer.style.display = 'none';
        loginContainer.style.display = 'block';
    });
    
    // Initialize forms
    setupLoginForm();
    setupProfileForm();
    setupPasswordForm();
});

// Handle login form
function setupLoginForm() {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Reset error messages
        document.getElementById('login-email-error').style.display = 'none';
        document.getElementById('login-password-error').style.display = 'none';
        document.getElementById('new-password-error').style.display = 'none';
        
        const email = loginEmailInput.value.trim();
        
        if (!email || !email.includes('@')) {
            document.getElementById('login-email-error').style.display = 'block';
            return;
        }
        
        // Show loading state
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
        
        try {
            // Check if user exists
            const userResult = await checkUserByEmail(email);
            
            if (userResult.exists) {
                // User exists
                currentUser = userResult.data;
                
                // Check if user has password
                if (currentUser.Password) {
                    // Show password field
                    if (passwordField.style.display === 'none') {
                        passwordField.style.display = 'block';
                        loginBtn.textContent = 'Login';
                        loginBtn.classList.remove('loading');
                        loginBtn.disabled = false;
                        return;
                    }
                    
                    // Verify password
                    const password = loginPasswordInput.value.trim();
                    
                    if (!password) {
                        document.getElementById('login-password-error').style.display = 'block';
                        loginBtn.classList.remove('loading');
                        loginBtn.disabled = false;
                        return;
                    }
                    
                    if (password !== currentUser.Password) {
                        document.getElementById('login-password-error').textContent = 'Incorrect password';
                        document.getElementById('login-password-error').style.display = 'block';
                        loginBtn.classList.remove('loading');
                        loginBtn.disabled = false;
                        return;
                    }
                    
                    userPassword = password;
                } else {
                    // First time login, need to set password
                    if (firstTimePasswordFields.style.display === 'none') {
                        firstTimePasswordFields.style.display = 'block';
                        loginBtn.textContent = 'Create Password';
                        loginBtn.classList.remove('loading');
                        loginBtn.disabled = false;
                        return;
                    }
                    
                    // Validate new password
                    const newPassword = newPasswordInput.value.trim();
                    const confirmPassword = confirmPasswordInput.value.trim();
                    
                    if (!newPassword || !confirmPassword) {
                        document.getElementById('new-password-error').textContent = 'Please enter and confirm your password';
                        document.getElementById('new-password-error').style.display = 'block';
                        loginBtn.classList.remove('loading');
                        loginBtn.disabled = false;
                        return;
                    }
                    
                    if (newPassword !== confirmPassword) {
                        document.getElementById('new-password-error').textContent = 'Passwords do not match';
                        document.getElementById('new-password-error').style.display = 'block';
                        loginBtn.classList.remove('loading');
                        loginBtn.disabled = false;
                        return;
                    }
                    
                    // Save new password
                    await updateUserPassword(currentUser.id, newPassword);
                    userPassword = newPassword;
                    currentUser.Password = newPassword;
                }
                
                // Load user codes
                await loadUserCodes();
                
                // Update UI
                updateDashboardUI();
                
                // Show dashboard
                loginContainer.style.display = 'none';
                dashboardContainer.style.display = 'block';
            } else {
                // User doesn't exist
                document.getElementById('login-email-error').textContent = 'No account found with this email';
                document.getElementById('login-email-error').style.display = 'block';
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('An error occurred. Please try again.');
        } finally {
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
        }
    });
}

// Handle profile form
function setupProfileForm() {
    const profileForm = document.getElementById('profile-form');
    
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const updateBtn = document.getElementById('update-profile-btn');
        updateBtn.classList.add('loading');
        updateBtn.disabled = true;
        
        try {
            const name = document.getElementById('profile-name').value.trim();
            const personalEmail = document.getElementById('profile-personal-email').value.trim();
            const phone = document.getElementById('profile-phone').value.trim();
            
            // Update user data
            await updateUserProfile(currentUser.id, {
                Name: name,
                'Personal Email': personalEmail,
                Phone: phone
            });
            
            // Update current user
            currentUser.Name = name;
            currentUser['Personal Email'] = personalEmail;
            currentUser.Phone = phone;
            
            // Update UI
            updateDashboardUI();
            
            // Show success message
            const successMessage = document.getElementById('profile-success');
            successMessage.style.display = 'block';
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 3000);
        } catch (error) {
            console.error('Profile update error:', error);
            alert('An error occurred while updating your profile. Please try again.');
        } finally {
            updateBtn.classList.remove('loading');
            updateBtn.disabled = false;
        }
    });
}

// Handle password form
function setupPasswordForm() {
    const passwordForm = document.getElementById('password-form');
    
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Reset error messages
        document.getElementById('current-password-error').style.display = 'none';
        document.getElementById('change-password-error').style.display = 'none';
        
        const currentPassword = document.getElementById('current-password').value.trim();
        const newPassword = document.getElementById('change-new-password').value.trim();
        const confirmPassword = document.getElementById('change-confirm-password').value.trim();
        
        if (!currentPassword || currentPassword !== userPassword) {
            document.getElementById('current-password-error').style.display = 'block';
            return;
        }
        
        if (!newPassword || !confirmPassword) {
            document.getElementById('change-password-error').textContent = 'Please enter and confirm your new password';
            document.getElementById('change-password-error').style.display = 'block';
            return;
        }
        
        if (newPassword !== confirmPassword) {
            document.getElementById('change-password-error').textContent = 'Passwords do not match';
            document.getElementById('change-password-error').style.display = 'block';
            return;
        }
        
        const updateBtn = document.getElementById('update-password-btn');
        updateBtn.classList.add('loading');
        updateBtn.disabled = true;
        
        try {
            // Update password
            await updateUserPassword(currentUser.id, newPassword);
            userPassword = newPassword;
            currentUser.Password = newPassword;
            
            // Reset form
            passwordForm.reset();
            
            // Show success message
            const successMessage = document.getElementById('password-success');
            successMessage.style.display = 'block';
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 3000);
        } catch (error) {
            console.error('Password update error:', error);
            alert('An error occurred while updating your password. Please try again.');
        } finally {
            updateBtn.classList.remove('loading');
            updateBtn.disabled = false;
        }
    });
}

// Update dashboard UI with user data
function updateDashboardUI() {
    if (!currentUser) return;
    
    // Update user info
    document.getElementById('user-name').textContent = currentUser.Name || 'User';
    document.getElementById('user-email').textContent = currentUser.Email || '';
    
    // Update avatar with first letter of name
    const firstLetter = (currentUser.Name && currentUser.Name.charAt(0)) || 'U';
    document.getElementById('user-avatar').textContent = firstLetter.toUpperCase();
    
    // Update balance
    document.getElementById('balance-amount').textContent = `₹${parseFloat(currentUser.Balance || 0).toFixed(2)}`;
    
    // Update profile form
    document.getElementById('profile-name').value = currentUser.Name || '';
    document.getElementById('profile-email').value = currentUser.Email || '';
    document.getElementById('profile-personal-email').value = currentUser['Personal Email'] || '';
    document.getElementById('profile-phone').value = currentUser.Phone || '';
    
    // Update redeem codes
    updateRedeemCodesList();
}

// Update redeem codes list
function updateRedeemCodesList() {
    const codesList = document.getElementById('redeem-codes-list');
    codesList.innerHTML = '';
    
    if (userCodes.length === 0) {
        codesList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No redeem codes found</p>';
        return;
    }
    
    // Sort codes by date (newest first)
    userCodes.sort((a, b) => {
        return new Date(b['Submission Date']) - new Date(a['Submission Date']);
    });
    
    userCodes.forEach(code => {
        const isActive = code.Status === 'Active';
        const codeItem = document.createElement('div');
        codeItem.className = `code-item ${isActive ? 'active' : 'used'}`;
        
        const submissionDate = formatDisplayDate(code['Submission Date'] || '');
        const redemptionDate = code['Redemption Date'] ? formatDisplayDate(code['Redemption Date']) : '';
        
        codeItem.innerHTML = `
            <div class="code-details">
                <span class="code">${code['Redemption Code'] || ''}</span>
                <span class="date">${submissionDate} ${redemptionDate ? '• Redeemed: ' + redemptionDate : ''}</span>
            </div>
            <span class="status ${isActive ? 'active' : 'used'}">${code.Status || ''}</span>
        `;
        
        codesList.appendChild(codeItem);
    });
}

// Airtable API functions
// Check if user exists by email
async function checkUserByEmail(email) {
    try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USERS_TABLE}?filterByFormula={Email}="${encodeURIComponent(email)}"`, {
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
                    id: data.records[0].id,
                    ...data.records[0].fields
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

// Update user password
async function updateUserPassword(userId, password) {
    try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USERS_TABLE}/${userId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    Password: password
                }
            })
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error updating password:', error);
        throw error;
    }
}

// Update user profile
async function updateUserProfile(userId, profileData) {
    try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USERS_TABLE}/${userId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: profileData
            })
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
}

// Load user redemption codes
async function loadUserCodes() {
    try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${SUBMISSIONS_TABLE}?filterByFormula={User Email}="${encodeURIComponent(currentUser.Email)}"`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.records && data.records.length > 0) {
            userCodes = data.records.map(record => record.fields);
        } else {
            userCodes = [];
        }
    } catch (error) {
        console.error('Error loading user codes:', error);
        throw error;
    }
}

// Format date for display
function formatDisplayDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}