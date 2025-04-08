// admin_complaints.js
import { fetchDataWithToken, getUserRole, getUserTeam } from './token-manager.js';

async function fetchComplaints() {
    try {
        const complaints = await fetchDataWithToken('/admin/get-complaints');
        const userRole = await getUserRole();
        const userTeam = await getUserTeam();
        const filteredComplaints = complaints.filter(complaint => {
            if (userRole === "admin" && complaint.team !== userTeam) {
                return false; // Skip to the next complaint
            }
            return true; // Include the complaint
        }).filter(complaint => complaint.status === 'Pending'); // Filter for Pending status
        displayComplaints(filteredComplaints);
    } catch (error) {
        console.error('Error fetching complaints:', error);
    }
}

function displayComplaints(complaints) {
    const tableBody = document.getElementById('complaints-table');
    tableBody.innerHTML = ''; // Clear existing rows

    complaints.forEach(complaint => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = complaint.title;
        row.insertCell().textContent = complaint.details;
        row.insertCell().textContent = complaint.name;
        // Format the date
        const date = new Date(complaint.date);
        const formattedDate = date.toLocaleDateString('en-CA'); // Format to YYYY-MM-DD, change your format here
        row.insertCell().textContent = formattedDate;
        row.insertCell().textContent = complaint.contact;
        // row.insertCell().textContent = `Phone: ${complaint.phonecontact}, Email: ${complaint.mailcontact}`;
        row.insertCell().textContent = complaint.team;

        const statusCell = row.insertCell();
        statusCell.textContent = complaint.status;
        statusCell.classList.add('status');
        if (complaint.status === 'Resolved') {
            statusCell.classList.add('status-resolved');
        } else if (complaint.status === 'Pending') {
            statusCell.classList.add('status-pending');
        } else if (complaint.status === 'Admit') {
            statusCell.classList.add('status-admit');
        }

        const updateCell = row.insertCell();
        updateCell.innerHTML = `<a href="/admin/admit-complaint/${complaint._id}"><button class="btn-update">อัปเดต</button></a>`;
    });
}

function sortTable() {
    const sortOption = document.getElementById('sort-options').value;
    const tableBody = document.getElementById('complaints-table');
    const rows = Array.from(tableBody.rows);

    rows.sort((a, b) => {
        const dateA = new Date(a.cells[3].textContent);
        const dateB = new Date(b.cells[3].textContent);

        if (sortOption === 'newest') {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });

    tableBody.append(...rows);
}

// Call fetchComplaints when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchComplaints();
});
