// c:\Users\uSeR\OneDrive\เดสก์ท็อป\dev\webproject\static\js\admin_control.js

// DOM Elements
const emailsTableBody = document.getElementById('emails-table')?.querySelector('tbody');
const adminsTableBody = document.getElementById('admins-table')?.querySelector('tbody');

const emailModal = document.getElementById('email-modal');
const emailModalCloseBtn = document.getElementById('email-modal-close');
const emailEditForm = document.getElementById('email-edit-form');
const emailSectionMessage = document.getElementById('email-section-message');
const emailModalMessage = document.getElementById('email-modal-message');

const adminModal = document.getElementById('admin-modal');
const adminModalCloseBtn = document.getElementById('admin-modal-close');
const addAdminBtn = document.getElementById('add-admin-btn');
const adminForm = document.getElementById('admin-form');
const adminModalTitle = document.getElementById('admin-modal-title');
const adminPasswordInput = document.getElementById('admin-password');
const adminSectionMessage = document.getElementById('admin-section-message');
const adminModalMessage = document.getElementById('admin-modal-message');


// Utility Functions for Messages
function displayMessage(element, message, type = 'error') {
    if (!element) return;
    element.textContent = message;
    element.className = `message-area ${type}-message`; // error-message or success-message
}

function clearMessage(element) {
    if (!element) return;
    element.textContent = '';
    element.className = 'message-area';
}


// --- Token Management and API Calls ---
async function fetchDataWithToken(url, options = {}) {
    const token = localStorage.getItem('access_token');
    if (!token) {
        console.error('No access token found.');
        displayMessage(emailSectionMessage, 'Authentication error: No token. Please login again.');
        // Potentially redirect to login: window.location.href = '/login';
        throw new Error('No access token found.');
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    try {
        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            let errorMessage = `API Error (Status: ${response.status})`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
            } catch (jsonError) {
                errorMessage = await response.text() || `API Error (Status: ${response.status}) and could not parse error response.`;
            }
            console.error(`Fetch error for ${url}:`, errorMessage);
            throw new Error(errorMessage);
        }
        // Handle cases where response might be empty (e.g., for DELETE)
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return await response.json();
        } else {
            return await response.text(); // Or handle as appropriate
        }
    } catch (networkError) {
        console.error(`Network error or issue with fetch for ${url}:`, networkError);
        throw new Error(`Network error: ${networkError.message}`);
    }
}


// --- Email Management ---
async function fetchEmails() {
    if (!emailsTableBody) return;
    try {
        const emails = await fetchDataWithToken('/api/emails');
        emailsTableBody.innerHTML = ''; // Clear existing rows
        if (emails && emails.length > 0) {
            emails.forEach(email => {
                // Ensure email._id exists and is a string
                const currentEmailId = String(email._id || '');
                if (!currentEmailId) {
                    console.error("Email object is missing an _id or it's invalid:", email);
                    return; // Skip this email if ID is missing
                }

                const row = emailsTableBody.insertRow();
                row.insertCell().textContent = email.team || 'N/A';
                row.insertCell().textContent = email.email || 'N/A';
                row.insertCell().textContent = email.approver_email || ''; // Display approver email or empty
                
                const actionsCell = row.insertCell();
                const editButton = document.createElement('button');
                editButton.classList.add('btn', 'btn-edit');
                editButton.textContent = 'Edit';
                editButton.dataset.id = currentEmailId; // Store ID here
                editButton.onclick = () => openEditEmailModal(currentEmailId); // Pass ID directly
                actionsCell.appendChild(editButton);
            });
        } else {
            emailsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No email configurations found.</td></tr>';
        }
        clearMessage(emailSectionMessage);
    } catch (error) {
        console.error('Error fetching emails:', error);
        displayMessage(emailSectionMessage, `Error loading emails: ${error.message}`);
    }
}

function openEditEmailModal(emailId) {
    if (typeof emailId !== 'string' || !emailId) {
        console.error("Invalid or missing emailId for opening modal:", emailId);
        displayMessage(emailModalMessage, "Error: Cannot edit. Invalid email identifier.", 'error');
        return;
    }
    console.log("Opening edit modal for email ID:", emailId);

    // Find the row in the table to get current values
    const row = emailsTableBody.querySelector(`button[data-id='${emailId}']`)?.closest('tr');
    if (!row) {
        console.error("Could not find table row for email ID:", emailId);
        displayMessage(emailModalMessage, "Error: Could not find email data to edit.", 'error');
        return;
    }

    document.getElementById('edit-team').value = row.cells[0].textContent;
    document.getElementById('edit-email').value = row.cells[1].textContent;
    document.getElementById('edit-approver-email').value = row.cells[2].textContent;
    document.getElementById('edit-email-id').value = emailId; // Set the ID in the hidden field

    emailModal.style.display = 'block';
    clearMessage(emailModalMessage);
}

if (emailEditForm) {
    emailEditForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessage(emailModalMessage);

        const emailId = document.getElementById('edit-email-id').value;
        if (!emailId) {
            displayMessage(emailModalMessage, 'Error: Email ID is missing. Cannot update.', 'error');
            return;
        }

        const team = document.getElementById('edit-team').value;
        const newEmail = document.getElementById('edit-email').value;
        const newApproverEmail = document.getElementById('edit-approver-email').value;

        console.log(`Attempting to update email ID: ${emailId} with team: ${team}, email: ${newEmail}, approver: ${newApproverEmail}`);

        try {
            await fetchDataWithToken(`/api/emails/${emailId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    team: team,
                    email: newEmail,
                    approver_email: newApproverEmail
                })
            });
            emailModal.style.display = 'none';
            Swal.fire('Success!', 'Email updated successfully.', 'success');
            fetchEmails(); // Refresh the list
            displayMessage(emailSectionMessage, 'Email updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating email:', error);
            displayMessage(emailModalMessage, `Update failed: ${error.message}`, 'error');
            Swal.fire('Error!', `Failed to update email: ${error.message}`, 'error');
        }
    });
}

if (emailModalCloseBtn) {
    emailModalCloseBtn.addEventListener('click', () => {
        emailModal.style.display = 'none';
        clearMessage(emailModalMessage);
    });
}

// --- Admin Management ---
async function fetchAdmins() {
    if (!adminsTableBody) return;
    try {
        const admins = await fetchDataWithToken('/api/admins');
        adminsTableBody.innerHTML = '';
        if (admins && admins.length > 0) {
            admins.forEach(admin => {
                const row = adminsTableBody.insertRow();
                row.insertCell().textContent = admin.username;
                row.insertCell().textContent = admin.role;
                const actionsCell = row.insertCell();
                const editBtn = document.createElement('button');
                editBtn.className = 'btn btn-edit';
                editBtn.textContent = 'Edit';
                editBtn.dataset.id = admin._id;
                editBtn.dataset.username = admin.username;
                editBtn.dataset.role = admin.role;
                editBtn.dataset.team = admin.team; // Assuming admin has a team
                editBtn.onclick = () => openEditAdminModal(admin._id, admin.username, admin.role, admin.team);
                actionsCell.appendChild(editBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-danger';
                deleteBtn.textContent = 'Delete';
                deleteBtn.dataset.id = admin._id;
                deleteBtn.onclick = () => confirmDeleteAdmin(admin._id);
                actionsCell.appendChild(deleteBtn);
            });
        } else {
             adminsTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No admins found.</td></tr>';
        }
        clearMessage(adminSectionMessage);
    } catch (error) {
        console.error('Error fetching admins:', error);
        displayMessage(adminSectionMessage, `Error loading admins: ${error.message}`);
    }
}

function openEditAdminModal(adminId, username, role, team) {
    adminModalTitle.textContent = adminId ? 'Edit Admin' : 'Add Admin';
    adminPasswordInput.required = !adminId; // Password required only for new admin
    adminForm.reset(); // Reset form first
    document.getElementById('admin-id').value = adminId || '';
    document.getElementById('admin-username').value = username || '';
    document.getElementById('admin-role').value = role || 'admin';
    document.getElementById('admin-team').value = team || 'ด้านบุคลากร'; // Default or existing team
    if (adminId) {
         document.getElementById('admin-username').readOnly = true; // Username usually not editable
    } else {
         document.getElementById('admin-username').readOnly = false;
    }
    adminModal.style.display = 'block';
    clearMessage(adminModalMessage);
}

if (addAdminBtn) {
    addAdminBtn.addEventListener('click', () => {
        openEditAdminModal(null, '', 'admin', 'ด้านบุคลากร'); // Open for adding new admin
    });
}

async function confirmDeleteAdmin(adminId) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "This action cannot be undone!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        deleteAdmin(adminId);
    }
}

async function deleteAdmin(adminId) {
    clearMessage(adminModalMessage);
    try {
        await fetchDataWithToken(`/api/admins/${adminId}`, { method: 'DELETE' });
        Swal.fire('Deleted!', 'Admin has been deleted.', 'success');
        fetchAdmins(); // Refresh the list
        displayMessage(adminSectionMessage, 'Admin deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting admin:', error);
        displayMessage(adminModalMessage, `Delete failed: ${error.message}`, 'error');
        Swal.fire('Error!', `Failed to delete admin: ${error.message}`, 'error');
    }
}


if (adminForm) {
    adminForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessage(adminModalMessage);

        const adminId = document.getElementById('admin-id').value;
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;
        const role = document.getElementById('admin-role').value;
        const team = document.getElementById('admin-team').value;

        const method = adminId ? 'PUT' : 'POST';
        const url = adminId ? `/api/admins/${adminId}` : '/api/admins';
        
        const body = { username, role, team };
        if (method === 'POST' || (method === 'PUT' && password)) { // Password only if new or being changed
            body.password = password;
        }
         if (method === 'PUT') { // For PUT, username might not be in body if not editable
            // If username is part of the Pydantic model for update and you don't want to send it
            // or if the backend doesn't expect it for PUT, you might remove it.
            // However, if your backend PUT expects username (even if readonly on form), keep it.
            // For now, let's assume username is not part of the PUT payload if it's not editable.
            // If your Pydantic model for PUT requires username, you should send it.
            // delete body.username; // Example: if username is not part of PUT payload
        }


        try {
            await fetchDataWithToken(url, {
                method: method,
                body: JSON.stringify(body)
            });
            adminModal.style.display = 'none';
            Swal.fire('Success!', `Admin ${adminId ? 'updated' : 'added'} successfully.`, 'success');
            fetchAdmins(); // Refresh the list
            displayMessage(adminSectionMessage, `Admin ${adminId ? 'updated' : 'added'} successfully!`, 'success');
        } catch (error) {
            console.error('Error saving admin:', error);
            displayMessage(adminModalMessage, `Save failed: ${error.message}`, 'error');
            Swal.fire('Error!', `Failed to save admin: ${error.message}`, 'error');
        }
    });
}

if (adminModalCloseBtn) {
    adminModalCloseBtn.addEventListener('click', () => {
        adminModal.style.display = 'none';
        clearMessage(adminModalMessage);
    });
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target == emailModal) {
        emailModal.style.display = "none";
        clearMessage(emailModalMessage);
    }
    if (event.target == adminModal) {
        adminModal.style.display = "none";
        clearMessage(adminModalMessage);
    }
}

// Initial data fetch
// Ensure these functions are called only after the DOM is fully loaded.
// Wrapping them in DOMContentLoaded is a good practice if this script is in <head> or loaded early.
document.addEventListener('DOMContentLoaded', () => {
    if (emailsTableBody) fetchEmails();
    if (adminsTableBody) fetchAdmins();
});
