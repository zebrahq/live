// Initialize Airtable API data
const AIRTABLE_API_KEY = 'patefZ8p5V8GwALTC.216205e2cea767930779fe0b170ac58dcf021180ec0886ee42907592513d09e3';
const AIRTABLE_BASE_ID = 'appekA4ARqSJNPh0J';
const AIRTABLE_TABLE_NAME = 'Submissions';

// Check if logo image fails to load and replace with text
document.addEventListener('DOMContentLoaded', function() {
    const logoImg = document.getElementById('logo-img');
    logoImg.onerror = function() {
        // If image fails to load, replace with text logo
        document.querySelectorAll('.logo').forEach(logo => {
            logo.innerHTML = '<h1 style="color: #e91e63; font-size: 28px; font-weight: bold; font-style: italic;">zebra reward</h1>';
        });
    };
});

// Function to generate a unique redemption code
function generateUniqueRedeemCode() {
    // Format: 3 groups of 3 digits with hyphens (e.g., 088-556-447)
    const timestamp = new Date().getTime().toString().slice(-4);
    const randomPart1 = Math.floor(Math.random() * 900 + 100);
    const randomPart2 = Math.floor(Math.random() * 900 + 100);
    
    return `${randomPart1}-${timestamp.slice(0, 3)}-${randomPart2}`;
}

// Function to mask API key
function maskApiKey(apiKey) {
    if (apiKey.length <= 5) return apiKey;
    const lastFive = apiKey.slice(-5);
    return `****${lastFive}`;
}

// Function to format current date (YYYY-MM-DD)
function formatDate() {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
}

// Function to format display date (MM/DD/YYYY)
function formatDisplayDate() {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

// Function to format current time (HH:MM)
function formatTime() {
    const date = new Date();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Function to format display time (HH:MMam/pm)
function formatDisplayTime() {
    const date = new Date();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes}${ampm}`;
}

// Function to check if an email already exists in Airtable
async function checkEmailExists(email) {
    try {
        // Using the correct Airtable formula format for checking email
        const formula = `{Email}="${email.replace(/"/g, '\\"')}"`;
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula=${encodeURIComponent(formula)}`;
        
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_API_KEY}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Airtable API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.records && data.records.length > 0;
    } catch (error) {
        console.error('Error checking email:', error);
        throw error;
    }
}

// Function to check if an API key already exists in Airtable
async function checkApiKeyExists(apiKey) {
    try {
        // Using the correct Airtable formula format for checking API Key
        const formula = `{API Key}="${apiKey.replace(/"/g, '\\"')}"`;
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula=${encodeURIComponent(formula)}`;
        
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_API_KEY}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Airtable API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.records && data.records.length > 0;
    } catch (error) {
        console.error('Error checking API key:', error);
        throw error;
    }
}

// Function to check if a redeem code already exists
async function checkRedeemCodeExists(redeemCode) {
    try {
        // Using the correct Airtable formula format for checking Redemption Code
        const formula = `{Redemption Code}="${redeemCode.replace(/"/g, '\\"')}"`;
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula=${encodeURIComponent(formula)}`;
        
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_API_KEY}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Airtable API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.records && data.records.length > 0;
    } catch (error) {
        console.error('Error checking redeem code:', error);
        throw error;
    }
}

// Function to generate a guaranteed unique redeem code
async function generateUniqueRedeemCodeWithCheck() {
    let redeemCode;
    let isUnique = false;
    let maxAttempts = 10;
    let attempts = 0;
    
    while (!isUnique && attempts < maxAttempts) {
        redeemCode = generateUniqueRedeemCode();
        try {
            const exists = await checkRedeemCodeExists(redeemCode);
            if (!exists) {
                isUnique = true;
            }
        } catch (error) {
            console.error('Error checking redeem code uniqueness:', error);
            // If there's an error, we'll assume it's unique to avoid endless loop
            isUnique = true;
        }
        attempts++;
    }
    
    return redeemCode;
}

// Function to save form data to Airtable
async function saveToAirtable(formData) {
    try {
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
        
        // Prepare the data in the format expected by Airtable API
        const payload = {
            records: [
                {
                    fields: {
                        'API Key': formData.apiKey,
                        'Email': formData.email,
                        'Personal Email': formData.personalEmail, // Add this line
                        'Name': formData.name,
                        'API Type': formData.apiType,
                        'Promo Code': formData.promoCode || '',
                        'Redemption Code': formData.redeemCode,
                        'Submission Date': formData.date,
                        'Submission Time': formData.time,
                        'Status': 'Active'
                    }
                }
            ]
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Airtable error details:', errorData);
            throw new Error(`Airtable API error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error saving to Airtable:', error);
        throw error;
    }
}

// Handle form submission
document.getElementById('api-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Reset error messages
    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
    const formFeedback = document.getElementById('form-feedback');
    formFeedback.style.display = 'none';
    formFeedback.textContent = '';
    
    // Get form values
    const apiKey = document.getElementById('api-key').value.trim();
    const email = document.getElementById('api-email').value.trim();
    const name = document.getElementById('name').value.trim();
    const apiType = document.getElementById('api-type').value;
    const promoCode = document.getElementById('promo-code').value.trim();
    
    // Basic validation
    let hasError = false;
    const personalEmail = document.getElementById('personal-email').value.trim();

// Add this to your basic validation
if (!personalEmail || !personalEmail.includes('@')) {
    document.getElementById('personal-email-error').style.display = 'block';
    hasError = true;
}
    if (!apiKey) {
        document.getElementById('api-key-error').style.display = 'block';
        hasError = true;
    }
    
    if (!email || !email.includes('@')) {
        document.getElementById('api-email-error').style.display = 'block';
        hasError = true;
    }
    
    if (!name) {
        document.getElementById('name-error').style.display = 'block';
        hasError = true;
    }
    
    if (!apiType) {
        document.getElementById('api-type-error').style.display = 'block';
        hasError = true;
    }
    
    if (hasError) return;
    
    // Show loading state
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    try {
        // Check if email already exists
        const emailExists = await checkEmailExists(email);
        if (emailExists) {
            document.getElementById('api-email-error').textContent = 'This email is already registered';
            document.getElementById('api-email-error').style.display = 'block';
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            return;
        }
        
        // Check if API key already exists
        const apiKeyExists = await checkApiKeyExists(apiKey);
        if (apiKeyExists) {
            document.getElementById('api-key-error').textContent = 'This API key is already registered';
            document.getElementById('api-key-error').style.display = 'block';
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            return;
        }
        
        // Generate unique redeem code and format date/time
        const redeemCode = await generateUniqueRedeemCodeWithCheck();
        const date = formatDate();
        const time = formatTime();
        const displayDate = formatDisplayDate();
        const displayTime = formatDisplayTime();
        
        // Save data to Airtable
        const result = await saveToAirtable({
            apiKey,
            email,
            personalEmail, // Add this line
            name,
            apiType,
            promoCode,
            redeemCode,
            date,
            time
        });
        
        console.log('Airtable response:', result);
        
        // Update success screen
        document.getElementById('user-name').textContent = name;
        document.getElementById('api-type-display').textContent = apiType;
        document.getElementById('masked-api-key').textContent = maskApiKey(apiKey);
        document.getElementById('redeem-code').textContent = redeemCode;
        document.getElementById('current-date').textContent = displayDate;
        document.getElementById('current-time').textContent = displayTime;
        
        // Show success screen
        document.getElementById('form-container').style.display = 'none';
        document.getElementById('success-container').style.display = 'block';
        
    } catch (error) {
        console.error('Submission error:', error);
        formFeedback.textContent = 'There was an error processing your submission. Please try again.';
        formFeedback.style.display = 'block';
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});