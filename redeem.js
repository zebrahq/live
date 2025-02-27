// Define wheel values
const wheelValues = [4,5, 6, 8, 9, 10, 11, 12];
const wheelColors = [
    '#4CAF50', // Green
    '#2196F3', // Blue
    '#FF9800', // Orange
    '#9C27B0', // Purple
    '#E91E63', // Pink
    '#3F51B5', // Indigo
    '#009688', // Teal
    '#FF5722', // Deep Orange
    // '#607D8B', // Blue Grey
    // '#8BC34A'  // Light Green
];

// Airtable API configuration
const AIRTABLE_API_KEY = 'patefZ8p5V8GwALTC.216205e2cea767930779fe0b170ac58dcf021180ec0886ee42907592513d09e3';
const AIRTABLE_BASE_ID = 'appekA4ARqSJNPh0J';
const SUBMISSIONS_TABLE = 'tblZq2lccxuw6eX9J'; // Updated table ID
const USERS_TABLE = 'tblxLL9PW1RYPQxye'; // Updated table ID

// Initialize variables
let submissionData = null;
let rewardOption = null;
let scanner = null;
let userId = null;

// DOM elements
const tabEnterBtn = document.getElementById('tab-enter');
const tabScanBtn = document.getElementById('tab-scan');
const contentEnter = document.getElementById('content-enter');
const contentScan = document.getElementById('content-scan');
const validateCodeBtn = document.getElementById('validate-code-btn');
const startScanBtn = document.getElementById('start-scan-btn');
const redeemContainer = document.getElementById('redeem-container');
const resultsContainer = document.getElementById('results-container');
const wheelContainer = document.getElementById('wheel-container');
const successContainer = document.getElementById('success-container');
const proceedBtn = document.getElementById('proceed-btn');
const spinBtn = document.getElementById('spin-btn');
const homeBtn = document.getElementById('home-btn');
const redeemAnotherBtn = document.getElementById('redeem-another-btn');

// Tab switching
tabEnterBtn.addEventListener('click', () => {
    tabEnterBtn.classList.add('active');
    tabScanBtn.classList.remove('active');
    contentEnter.classList.add('active');
    contentScan.classList.remove('active');
    if (scanner) {
        scanner.stop();
    }
});

tabScanBtn.addEventListener('click', () => {
    tabScanBtn.classList.add('active');
    tabEnterBtn.classList.remove('active');
    contentScan.classList.add('active');
    contentEnter.classList.remove('active');
});

// Initialize QR scanner
startScanBtn.addEventListener('click', () => {
    startScanBtn.classList.add('loading');
    startScanBtn.disabled = true;
    
    if (scanner) {
        scanner.resume();
        startScanBtn.textContent = 'Scanning...';
        return;
    }
    
    scanner = new Html5Qrcode("qr-reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    scanner.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanFailure
    ).then(() => {
        startScanBtn.textContent = 'Scanning...';
    }).catch((err) => {
        document.getElementById('scan-feedback').textContent = `Error starting scanner: ${err}`;
        document.getElementById('scan-feedback').style.display = 'block';
        startScanBtn.classList.remove('loading');
        startScanBtn.disabled = false;
    });
});

// QR scan success handler
function onScanSuccess(decodedText) {
    scanner.pause();
    validateRedemptionCode(decodedText);
}

// QR scan failure handler
function onScanFailure(error) {
    console.error('QR scan error:', error);
}

// Manual code validation
validateCodeBtn.addEventListener('click', () => {
    const code = document.getElementById('redeem-code').value.trim();
    if (code) {
        validateRedemptionCode(code);
    } else {
        document.getElementById('code-feedback').textContent = 'Please enter a redemption code';
        document.getElementById('code-feedback').style.display = 'block';
    }
});

// Validate redemption code
async function validateRedemptionCode(code) {
    // Reset UI
    document.getElementById('code-feedback').style.display = 'none';
    document.getElementById('scan-feedback').style.display = 'none';
    validateCodeBtn.classList.add('loading');
    validateCodeBtn.disabled = true;
    if (startScanBtn) {
        startScanBtn.classList.add('loading');
        startScanBtn.disabled = true;
    }
    
    try {
        // Check if code exists and is valid
        const result = await checkRedemptionCode(code);
        
        if (result.exists) {
            submissionData = result.data;
            
            // Check if the code has already been redeemed
          // Change this check in the validateRedemptionCode function:
if (submissionData.Status === 'Used') {  // Changed from 'Redeemed' to 'Used'
    showFeedback('code-feedback', 'This code has already been redeemed');
    showFeedback('scan-feedback', 'This code has already been redeemed');
    return;
}
            // Update UI with submission data
            document.getElementById('user-name').textContent = submissionData.Name;
            document.getElementById('api-type').textContent = submissionData['API Type'];
            document.getElementById('submission-date').textContent = formatDisplayDate(submissionData['Submission Date']);
            document.getElementById('redemption-code').textContent = submissionData['Redemption Code'];
            
            // Show results container
            redeemContainer.style.display = 'none';
            resultsContainer.style.display = 'block';
        } else {
            showFeedback('code-feedback', 'Invalid redemption code');
            showFeedback('scan-feedback', 'Invalid redemption code');
        }
    } catch (error) {
        console.error('Error validating code:', error);
        showFeedback('code-feedback', 'Error validating code. Please try again.');
        showFeedback('scan-feedback', 'Error validating code. Please try again.');
    } finally {
        validateCodeBtn.classList.remove('loading');
        validateCodeBtn.disabled = false;
        if (startScanBtn) {
            startScanBtn.classList.remove('loading');
            startScanBtn.disabled = false;
        }
    }
}

// Select reward option
document.querySelectorAll('.reward-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.reward-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        option.classList.add('selected');
        rewardOption = option.getAttribute('data-option');
    });
});

// Proceed with selected reward option
proceedBtn.addEventListener('click', async () => {
    if (!rewardOption) {
        document.getElementById('reward-feedback').textContent = 'Please select a reward option';
        document.getElementById('reward-feedback').style.display = 'block';
        return;
    }
    
    proceedBtn.classList.add('loading');
    proceedBtn.disabled = true;
    
    try {
        // Check if user exists
        const email = submissionData['Email'];
        const user = await checkUserExists(email);
        
        if (user.exists) {
            userId = user.id;
        } else {
            // Create new user
            const newUser = await createUser({
                email: email,
                name: submissionData['Name'],
                balance: 0
            });
            userId = newUser.id;
        }
        
        if (rewardOption === 'spin') {
            // Initialize wheel
            initializeWheel();
            
            // Show wheel container
            resultsContainer.style.display = 'none';
            wheelContainer.style.display = 'flex';
        } else if (rewardOption === 'cash') {
            // Direct cash option
            await processReward(7);
        }
    } catch (error) {
        console.error('Error processing reward:', error);
        document.getElementById('reward-feedback').textContent = 'Error processing reward. Please try again.';
        document.getElementById('reward-feedback').style.display = 'block';
        proceedBtn.classList.remove('loading');
        proceedBtn.disabled = false;
    }
});

// Initialize wheel
function initializeWheel() {
    const wheelOuter = document.getElementById('wheel-outer');
    wheelOuter.innerHTML = '';
    
    // Create wheel segments
    for (let i = 0; i < wheelValues.length; i++) {
        const segment = document.createElement('div');
        segment.className = 'wheel-segment';
        segment.style.backgroundColor = wheelColors[i];
        segment.style.transform = `rotate(${i * 36}deg)`;
        
        const value = document.createElement('div');
        value.className = 'wheel-value';
        value.textContent = `₹${wheelValues[i]}`;
        value.style.left = '30%';
        value.style.top = '30%';
        value.style.transform = `rotate(${180 - (i * 36)}deg)`;
        
        segment.appendChild(value);
        wheelOuter.appendChild(segment);
    }
}

// Spin wheel
spinBtn.addEventListener('click', () => {
    if (spinBtn.disabled) return;
    
    spinBtn.classList.add('loading');
    spinBtn.disabled = true;
    
    const wheelOuter = document.getElementById('wheel-outer');
    const randomValue = Math.floor(Math.random() * wheelValues.length);
    const randomDegree = 1800 + (randomValue * 36) + Math.floor(Math.random() * 36);
    
    wheelOuter.style.transform = `rotate(${randomDegree}deg)`;
    
    setTimeout(async () => {
        const rewardAmount = wheelValues[wheelValues.length - 1 - (randomValue % wheelValues.length)];
        document.getElementById('wheel-result').textContent = `You won ₹${rewardAmount}!`;
        document.getElementById('wheel-result').style.display = 'block';
        
        try {
            await processReward(rewardAmount);
        } catch (error) {
            console.error('Error processing wheel reward:', error);
            document.getElementById('wheel-result').textContent = 'Error processing reward. Please try again.';
            spinBtn.classList.remove('loading');
            spinBtn.disabled = false;
        }
    }, 5000);
});

// Process reward
async function processReward(amount) {
    try {
        console.log("Processing reward:", amount, "for user ID:", userId);
        
        // Update user balance
        const updateResult = await updateUserBalance(userId, amount);
        console.log("Balance update result:", updateResult);
        
        // Mark submission as redeemed
        const statusResult = await updateSubmissionStatus(submissionData.id);
        console.log("Status update result:", statusResult);
        
        // Show success message
        document.getElementById('final-amount').textContent = `₹${amount.toFixed(2)}`;
        
        if (rewardOption === 'spin') {
            wheelContainer.style.display = 'none';
        } else {
            resultsContainer.style.display = 'none';
        }
        
        successContainer.style.display = 'block';
    } catch (error) {
        console.error('Error processing reward:', error);
        throw error;
    }
}

// Check if redemption code exists in Airtable
async function checkRedemptionCode(code) {
    try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${SUBMISSIONS_TABLE}?filterByFormula=AND({Redemption Code}='${code}')`, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`
            }
        });
        
        const data = await response.json();
        
        if (data.records && data.records.length > 0) {
            const record = data.records[0];
            return {
                exists: true,
                data: {
                    id: record.id,
                    'Name': record.fields['Name'] || 'Unknown',
                    'Email': record.fields['Email'] || '',
                    'API Type': record.fields['API Type'] || 'Unknown',
                    'Submission Date': record.fields['Submission Date'] || '',
                    'Redemption Code': record.fields['Redemption Code'] || code,
                    'Status': record.fields['Status'] || 'Pending'
                }
            };
        } else {
            return { exists: false };
        }
    } catch (error) {
        console.error('Error checking redemption code:', error);
        throw error;
    }
}

// Check if user exists in Airtable
async function checkUserExists(email) {
    try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USERS_TABLE}?filterByFormula=AND({Email}='${email}')`, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`
            }
        });
        
        const data = await response.json();
        
        if (data.records && data.records.length > 0) {
            return {
                exists: true,
                id: data.records[0].id,
                balance: parseFloat(data.records[0].fields['Balance'] || 0)
            };
        } else {
            return { exists: false };
        }
    } catch (error) {
        console.error('Error checking user:', error);
        throw error;
    }
}

// Create new user in Airtable
async function createUser(userData) {
    try {
        console.log("Creating new user:", userData);
        
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USERS_TABLE}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                records: [{
                    fields: {
                        'Name': userData.name,
                        'Email': userData.email,
                        'Balance': userData.balance
                    }
                }]
            })
        });
        
        const data = await response.json();
        console.log("User creation response:", data);
        
        if (data.records && data.records.length > 0) {
            return {
                id: data.records[0].id,
                fields: data.records[0].fields
            };
        } else {
            throw new Error("Failed to create user record");
        }
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

// Update user balance
async function updateUserBalance(userId, amount) {
    try {
        console.log("Updating balance for user ID:", userId, "with amount:", amount);
        
        // First get current balance
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USERS_TABLE}/${userId}`, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`
            }
        });
        
        const data = await response.json();
        console.log("Current user data:", data);
        
        const currentBalance = parseFloat(data.fields['Balance'] || 0);
        const newBalance = currentBalance + amount;
        
        console.log("Current balance:", currentBalance, "New balance:", newBalance);
        
        // Update with new balance
        const updateResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USERS_TABLE}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                records: [{
                    id: userId,
                    fields: {
                        'Balance': newBalance
                    }
                }]
            })
        });
        
        const updateData = await updateResponse.json();
        console.log("Balance update response:", updateData);
        
        return { success: true, newBalance, response: updateData };
    } catch (error) {
        console.error('Error updating user balance:', error);
        throw error;
    }
}

// Update submission status
// Update submission status
async function updateSubmissionStatus(submissionId) {
    try {
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${SUBMISSIONS_TABLE}/${submissionId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    'Status': 'Used',  // Changed from 'Redeemed' to 'Used' to match your Airtable options
                    'Redemption Date': new Date().toISOString()
                }
            })
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error updating submission status:', error);
        throw error;
    }
}

// Format display date
function formatDisplayDate(dateStr) {
    if (!dateStr) return 'N/A';
    
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Show feedback message
function showFeedback(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.style.display = 'block';
    
    // Reset UI elements
    validateCodeBtn.classList.remove('loading');
    validateCodeBtn.disabled = false;
    if (startScanBtn) {
        startScanBtn.classList.remove('loading');
        startScanBtn.disabled = false;
    }
}

// Navigation buttons
homeBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
});

redeemAnotherBtn.addEventListener('click', () => {
    // Reset UI
    document.getElementById('redeem-code').value = '';
    document.getElementById('code-feedback').style.display = 'none';
    document.getElementById('scan-feedback').style.display = 'none';
    document.getElementById('reward-feedback').style.display = 'none';
    document.getElementById('wheel-result').style.display = 'none';
    
    // Reset reward option
    document.querySelectorAll('.reward-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    rewardOption = null;
    
    // Show redeem container
    successContainer.style.display = 'none';
    resultsContainer.style.display = 'none';
    wheelContainer.style.display = 'none';
    redeemContainer.style.display = 'block';
    
    // Reset to enter tab
    tabEnterBtn.click();
});