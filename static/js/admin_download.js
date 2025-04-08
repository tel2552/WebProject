// admin_download.js
import { getUserRole, getUserTeam } from './token-manager.js'; // Import จาก token-manager.js

// --- DOM Element References ---
const searchInput = document.getElementById('searchInput');
const severityFilter = document.getElementById('severityFilter');
const teamFilter = document.getElementById('teamFilter');
const teamFilterLabel = document.getElementById('teamFilterLabel');
const dateFilter = document.getElementById('dateFilter');
const searchButton = document.getElementById('searchButton');
const exportButton = document.getElementById('exportButton');
const tableBody = document.getElementById("complaints-table");
const statusFilter = document.getElementById('statusFilter');

// --- State Variables ---
let allComplaints = [];
let complaintCounter = 0;
let complaintsFetched = false;
let userRole = null;
let userTeam = null;

// --- Constants for Overdue Calculation ---
const SEVERITY_LIMITS = { // Days allowed
    medium: 15,
    high: 7,
    critical: 3,
    low: Infinity // No limit for low severity
};
const OVERDUE_ELIGIBLE_STATUSES = ["pending", "admit", "resolved"]; // Statuses that can become Overdue

// --- Helper Function for Overdue Calculation ---
/**
 * Calculates if a complaint is overdue and returns its display status.
 * @param {object} complaint - The complaint object.
 * @returns {string} - The status to display ('Overdue' or original status).
 */
function getDisplayStatus(complaint) {
    const originalStatus = complaint.status ? complaint.status.toLowerCase() : 'unknown';
    const severity = complaint.severity_level ? complaint.severity_level.toLowerCase() : 'unknown';
    const complaintDateStr = complaint.date; // Assuming 'date' is the creation/problem date field

    // Only calculate overdue for eligible statuses and known severities with limits
    if (!OVERDUE_ELIGIBLE_STATUSES.includes(originalStatus) || severity === 'low' || !SEVERITY_LIMITS[severity]) {
        return complaint.status || 'Unknown'; // Return original status
    }

    if (!complaintDateStr) {
        console.warn(`Complaint ${complaint._id || complaint.title} missing date for overdue calculation.`);
        return complaint.status || 'Unknown'; // Cannot calculate without date
    }

    try {
        const complaintDate = new Date(complaintDateStr);
        const currentDate = new Date();

        // Set time to 00:00:00 for accurate day difference calculation
        complaintDate.setHours(0, 0, 0, 0);
        currentDate.setHours(0, 0, 0, 0);

        if (isNaN(complaintDate)) {
            console.warn(`Complaint ${complaint._id || complaint.title} has invalid date: ${complaintDateStr}`);
            return complaint.status || 'Unknown'; // Invalid date
        }

        const timeDifference = currentDate.getTime() - complaintDate.getTime();
        const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
        const limitDays = SEVERITY_LIMITS[severity];

        // console.log(`Complaint ${complaint.title}: Status=${originalStatus}, Severity=${severity}, Date=${complaintDateStr}, DaysDiff=${daysDifference}, Limit=${limitDays}`);

        if (daysDifference > limitDays) {
            // console.log(`Complaint ${complaint.title} is OVERDUE`);
            return "Overdue";
        } else {
            return complaint.status || 'Unknown'; // Not overdue, return original
        }
    } catch (error) {
        console.error(`Error calculating overdue status for complaint ${complaint._id || complaint.title}:`, error);
        return complaint.status || 'Unknown'; // Return original on error
    }
}


// --- Core Functions ---

/**
 * Fetches complaints from the server. (Assuming endpoint returns all relevant statuses)
 */
async function fetchAllComplaints() {
    if (complaintsFetched) {
        console.log("Complaints already fetched.");
        return;
    }
    console.log("Fetching complaints...");
    try {
        // *** IMPORTANT: Ensure this endpoint returns complaints with ALL statuses you need ***
        // If it only returns 'completed', you need a different endpoint or modify the backend.
        const response = await fetch("/admin/get-completed-complaints"); // Or a different endpoint?
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const complaints = await response.json();
        allComplaints = complaints;
        complaintsFetched = true;
        console.log("Complaints fetched successfully:", allComplaints.length);
        displayComplaints(allComplaints); // Display initially fetched complaints
    } catch (error) {
        console.error("Failed to fetch all complaints:", error);
        tableBody.innerHTML = '<tr><td colspan="10" style="color: red; text-align: center;">Failed to load complaints. Please try again later.</td></tr>';
    }
}

/**
 * Displays complaints in the table, calculating Overdue status.
 * @param {Array} complaints - Array of complaint objects to display.
 */
function displayComplaints(complaints) {
    tableBody.innerHTML = ""; // Clear existing rows
    complaintCounter = 0; // Reset counter for numbering

    if (!complaints || complaints.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No complaints found.</td></tr>';
        return;
    }

    console.log(`Displaying ${complaints.length} complaints. User Role: ${userRole}, User Team: ${userTeam}`);

    complaints.forEach((complaint) => {
        // Filter based on user role and team (if applicable)
        if (userRole === "admin" && complaint.team !== userTeam) {
            return; // Skip this complaint if user is admin and team doesn't match
        }

        complaintCounter++;
        const row = tableBody.insertRow();

        // --- Calculate Display Status (Handles Overdue) ---
        const displayStatus = getDisplayStatus(complaint);
        const displayStatusLower = displayStatus.toLowerCase();

        // --- Format Dates ---
        let formattedDate = '-'; // complaint.date (วันที่พบปัญหา)
        if (complaint.date) {
            try {
                const date = new Date(complaint.date);
                if (!isNaN(date)) formattedDate = date.toLocaleDateString('en-CA');
            } catch (e) { console.error("Error formatting complaint.date:", e); }
        }
        let formattedCompleteDate = '-'; // complaint.complete_date (วันที่แก้ไขปัญหา)
        if (complaint.complete_date) {
             try {
                const completeDate = new Date(complaint.complete_date);
                 if (!isNaN(completeDate)) formattedCompleteDate = completeDate.toLocaleDateString('en-CA');
            } catch (e) { console.error("Error formatting complete_date:", e); }
        }

        // --- Determine Status CSS Class ---
        let statusClass = "status"; // Base class
        if (displayStatusLower === "forwarded") {
            statusClass += " status-forwarded";
        } else if (displayStatusLower === "complete") {
            statusClass += " status-complete";
        } else if (displayStatusLower === "admit") {
            statusClass += " status-admit";
        } else if (displayStatusLower === "pending") {
             statusClass += " status-pending";
        } else if (displayStatusLower === "resolved") {
             statusClass += " status-resolved";
        } else if (displayStatusLower === "overdue") { // New class for Overdue
             statusClass += " status-overdue";
        }

        // --- Populate Table Cells ---
        row.insertCell().textContent = complaintCounter;
        row.insertCell().textContent = complaint.title || '-';
        row.insertCell().textContent = complaint.name || '-';
        row.insertCell().textContent = formattedDate; // วันที่พบปัญหา
        row.insertCell().textContent = complaint.inspector_name2 || '-';
        row.insertCell().textContent = complaint.team || '-';
        row.insertCell().textContent = complaint.severity_level || '-';
        row.insertCell().textContent = formattedCompleteDate; // วันที่แก้ไขปัญหา
        row.insertCell().textContent = complaint.correction2 || '-';
        const statusCell = row.insertCell();
        statusCell.textContent = displayStatus; // Use calculated display status
        statusCell.className = statusClass; // Apply the determined class
    });
}

/**
 * Filters complaints based on search criteria, including calculated Overdue status.
 */
function filterComplaints() {
    console.log("Filtering complaints...");
    const filterText = searchInput.value.toLowerCase().trim();
    const filterSeverity = severityFilter.value;
    const filterTeam = teamFilter.value;
    const filterDate = dateFilter.value; // Filter for complaint.date (วันที่พบปัญหา)
    const filterStatus = statusFilter.value; // Status filter value ("Overdue", "Pending", etc.)

    console.log("Filters applied:", { filterText, filterSeverity, filterTeam, filterDate, filterStatus });

    const filteredComplaints = allComplaints.filter(complaint => {
        // --- Calculate potential display status for filtering ---
        const potentialDisplayStatus = getDisplayStatus(complaint);

        // Combine searchable text fields
        const complaintText = [
            complaint.title,
            complaint.name,
            complaint.inspector_name2,
            complaint.team,
            complaint.correction2,
            potentialDisplayStatus // Include calculated status in search text
        ].filter(Boolean).join(' ').toLowerCase();

        // Format complaint date (วันที่พบปัญหา) for comparison
        let complaintDateStr = '';
         if (complaint.date) {
            try {
                const date = new Date(complaint.date);
                 if (!isNaN(date)) complaintDateStr = date.toLocaleDateString('en-CA');
            } catch(e) {}
         }

        // --- Apply Filters ---
        const textMatch = !filterText || complaintText.includes(filterText);
        const severityMatch = !filterSeverity || (complaint.severity_level && complaint.severity_level.toLowerCase() === filterSeverity.toLowerCase());
        const teamMatch = !filterTeam || (complaint.team && complaint.team.toLowerCase() === filterTeam.toLowerCase());
        const dateMatch = !filterDate || complaintDateStr === filterDate; // Match against complaint.date

        // Status filter match (compare against calculated display status)
        const statusMatch = !filterStatus || potentialDisplayStatus.toLowerCase() === filterStatus.toLowerCase();

        return textMatch && severityMatch && teamMatch && dateMatch && statusMatch;
    });

    console.log(`Filtering resulted in ${filteredComplaints.length} complaints.`);
    displayComplaints(filteredComplaints);
}

/**
 * Exports the currently displayed table data to an Excel file.
 */
function exportTableToExcel() {
    // ... (Keep the existing exportTableToExcel function - it exports what's currently displayed) ...
    console.log("Exporting table to Excel...");
    try {
        const table = document.querySelector("table");
        if (!table) {
            console.error("Table element not found for export.");
            return;
        }

        // Get headers
        const headerRow = table.querySelector("thead tr");
        if (!headerRow) {
             console.error("Table header not found for export.");
             return;
        }
        const headers = Array.from(headerRow.querySelectorAll("th")).map(th => th.innerText.trim());

        // Get data rows (currently visible in the tbody)
        const dataRows = table.querySelectorAll("#complaints-table tr");
        const data = Array.from(dataRows).map(row => {
            // Check if it's a 'no complaints' row
            const firstCell = row.querySelector("td");
            if (firstCell && firstCell.colSpan === 10) {
                return null; // Skip 'no complaints' row
            }
            // Make sure to get the text content, including the potentially modified 'Overdue' status
            return Array.from(row.querySelectorAll("td")).map(td => td.innerText.trim());
        }).filter(row => row !== null); // Remove null entries (skipped rows)


        if (data.length === 0) {
             console.warn("No data to export.");
             Swal.fire('No Data', 'There is no data in the table to export.', 'warning');
             return;
        }

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

        // --- Optional: Adjust column widths ---
        const colWidths = headers.map((_, i) => ({
            wch: Math.max(
                headers[i].length, // Header length
                ...data.map(row => (row[i] ? row[i].length : 0)) // Max data length in column
            ) + 2 // Add a little padding
        }));
        ws['!cols'] = colWidths;

        // Create workbook and add worksheet
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Complaints Report");

        // Write and save file
        XLSX.writeFile(wb, "complaints_report.xlsx");
        console.log("Excel export successful.");

    } catch (error) {
        console.error("Error exporting to Excel:", error);
        Swal.fire('Export Error', 'An error occurred while exporting the data to Excel.', 'error');
    }
}

/**
 * Adjusts the visibility of the team filter based on user role.
 */
function checkTeamFilterVisibility() {
    // ... (Keep the existing checkTeamFilterVisibility function) ...
    console.log("Checking team filter visibility for role:", userRole);
    if (!teamFilter || !teamFilterLabel) {
        console.warn("Team filter elements not found.");
        return;
    }
    if (userRole === 'admin') {
        teamFilter.style.display = 'none';
        teamFilterLabel.style.display = 'none';
    } else {
        // Show for 'superadmin', 'alladmin', or any other role
        teamFilter.style.display = 'inline-block'; // Use inline-block or block as appropriate
        teamFilterLabel.style.display = 'inline-block';
    }
}

// --- Event Listeners ---
searchButton.addEventListener("click", filterComplaints);
exportButton.addEventListener("click", exportTableToExcel);
searchInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') filterComplaints(); });
dateFilter.addEventListener('keypress', (event) => { if (event.key === 'Enter') filterComplaints(); });
statusFilter.addEventListener('change', filterComplaints);
// Optional: Add change listeners for other filters if desired
// severityFilter.addEventListener('change', filterComplaints);
// teamFilter.addEventListener('change', filterComplaints);


// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Admin Download page loaded. Initializing...");
    try {
        // Fetch user data first
        console.log("Fetching user role and team...");
        [userRole, userTeam] = await Promise.all([
            getUserRole(),
            getUserTeam()
        ]);
        console.log(`User data fetched: Role=${userRole}, Team=${userTeam}`);

        // Adjust UI based on role
        checkTeamFilterVisibility();

        // Then fetch complaints
        await fetchAllComplaints();

    } catch (error) {
        console.error("Initialization error:", error);
        tableBody.innerHTML = '<tr><td colspan="10" style="color: red; text-align: center;">An error occurred during initialization. Please refresh the page.</td></tr>';
    }
});
