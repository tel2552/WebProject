// static/js/admin_download.js
import { getUserRole, getUserTeam, fetchDataWithToken } from './token-manager.js'; // Import เพิ่ม fetchDataWithToken

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
const sortOptions = document.getElementById('sort-options'); // เพิ่ม element สำหรับ sort

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
        // console.warn(`Complaint ${complaint._id || complaint.title} missing date for overdue calculation.`);
        return complaint.status || 'Unknown'; // Cannot calculate without date
    }

    try {
        const complaintDate = new Date(complaintDateStr);
        const currentDate = new Date();

        // Set time to 00:00:00 for accurate day difference calculation
        complaintDate.setHours(0, 0, 0, 0);
        currentDate.setHours(0, 0, 0, 0);

        if (isNaN(complaintDate)) {
            // console.warn(`Complaint ${complaint._id || complaint.title} has invalid date: ${complaintDateStr}`);
            return complaint.status || 'Unknown'; // Invalid date
        }

        const timeDifference = currentDate.getTime() - complaintDate.getTime();
        const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
        const limitDays = SEVERITY_LIMITS[severity];

        if (daysDifference > limitDays) {
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
 * Fetches complaints from the server using token manager.
 */
async function fetchAllComplaints() {
    if (complaintsFetched) {
        console.log("Complaints already fetched.");
        // Optionally re-display if needed, or just return
        // displayComplaints(allComplaints);
        return;
    }
    console.log("Fetching complaints...");
    // กำหนด colspan ให้ตรงกับจำนวนคอลัมน์ (No., Title, Name, Date Found, Inspector, Team, Severity, Date Fixed, Correction, Status = 10)
    tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center;">กำลังโหลดข้อมูล...</td></tr>';

    try {
        // *** สำคัญ: ตรวจสอบว่า Endpoint นี้คืนค่า Complaints ทุกสถานะที่จำเป็นสำหรับการคำนวณ Overdue หรือไม่ ***
        // ถ้าคืนเฉพาะ Completed อาจจะต้องใช้ Endpoint อื่น หรือปรับ Backend
        const complaints = await fetchDataWithToken("/admin/get-completed-complaints"); // ใช้ fetchDataWithToken

        if (complaints === null) {
             // fetchDataWithToken คืนค่า null ถ้าไม่มี token (ควรจะ log error ไปแล้ว)
             tableBody.innerHTML = '<tr><td colspan="10" style="color: red; text-align: center;">ไม่พบ Token กรุณาเข้าสู่ระบบใหม่</td></tr>';
             // อาจจะ redirect ไปหน้า login
             // window.location.href = '/login';
             return;
        }

        allComplaints = complaints;
        complaintsFetched = true;
        console.log("Complaints fetched successfully:", allComplaints.length);
        displayComplaints(allComplaints); // แสดงข้อมูลที่ดึงมาครั้งแรก

    } catch (error) {
        console.error("Failed to fetch all complaints:", error);
        tableBody.innerHTML = `<tr><td colspan="10" style="color: red; text-align: center;">เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message || 'กรุณาลองใหม่'}</td></tr>`;
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: `ไม่สามารถโหลดข้อมูลคำร้องเรียนได้: ${error.message || 'กรุณาลองใหม่อีกครั้ง'}`,
        });
    }
}

/**
 * Displays complaints in the table, calculating Overdue status and formatting dates in Thai.
 * @param {Array} complaints - Array of complaint objects to display.
 */
function displayComplaints(complaints) {
    tableBody.innerHTML = ""; // Clear existing rows
    complaintCounter = 0; // Reset counter for numbering

    if (!complaints || complaints.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center;">ไม่พบข้อมูลคำร้องเรียน</td></tr>';
        return;
    }

    console.log(`Displaying ${complaints.length} complaints. User Role: ${userRole}, User Team: ${userTeam}`);

    complaints.forEach((complaint) => {
        // กรองตามทีม ถ้า user เป็น admin
        if (userRole === "admin" && complaint.team !== userTeam) {
            return; // ข้ามรายการนี้
        }

        complaintCounter++;
        const row = tableBody.insertRow();
        // เก็บ ISO date string (วันที่พบปัญหา) ไว้ใน data attribute เพื่อการ sort
        row.dataset.isoDate = complaint.date;

        // --- Calculate Display Status (Handles Overdue) ---
        const displayStatus = getDisplayStatus(complaint);
        const displayStatusLower = displayStatus.toLowerCase();

        // --- Format Dates (Thai Format) ---
        const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
        let formattedDate = '-'; // complaint.date (วันที่พบปัญหา)
        if (complaint.date) {
            try {
                const date = new Date(complaint.date);
                if (!isNaN(date)) formattedDate = date.toLocaleDateString('th-TH', dateOptions);
            } catch (e) { console.error("Error formatting complaint.date:", e); }
        }
        let formattedCompleteDate = '-'; // complaint.complete_date (วันที่แก้ไขปัญหา)
        if (complaint.complete_date) {
             try {
                const completeDate = new Date(complaint.complete_date);
                 if (!isNaN(completeDate)) formattedCompleteDate = completeDate.toLocaleDateString('th-TH', dateOptions);
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
        } else if (displayStatusLower === "overdue") {
             statusClass += " status-overdue";
        }

        // --- Populate Table Cells (Using escapeHTML) ---
        row.insertCell().textContent = complaintCounter;
        row.insertCell().textContent = escapeHTML(complaint.title || '-');
        row.insertCell().textContent = escapeHTML(complaint.name || '-');
        row.insertCell().textContent = escapeHTML(formattedDate);
        row.insertCell().textContent = escapeHTML(complaint.inspector_name2 || '-');
        row.insertCell().textContent = escapeHTML(complaint.team || '-');
        row.insertCell().textContent = escapeHTML(complaint.severity_level || '-');
        row.insertCell().textContent = escapeHTML(formattedCompleteDate);
        row.insertCell().textContent = escapeHTML(complaint.correction2 || '-');
        const statusCell = row.insertCell();
        statusCell.textContent = escapeHTML(displayStatus); // Use calculated display status
        statusCell.className = statusClass; // Apply the determined class
    });

    // เรียงลำดับตารางหลังจากแสดงข้อมูล (ถ้ามี dropdown)
    if (sortOptions) {
        sortTable();
    }
}

/**
 * (Assumes sorting by complaint.date - วันที่พบปัญหา)
 */
function sortTable() {
    if (!tableBody || !sortOptions) return; // ตรวจสอบว่ามี element ที่จำเป็น

    const rows = Array.from(tableBody.rows);
    // ตรวจสอบว่ามีแถวข้อมูลจริงๆ หรือไม่
    if (rows.length === 0 || (rows.length === 1 && rows[0].cells.length === 1 && rows[0].cells[0].colSpan > 1)) {
        return; // ไม่มีข้อมูลให้เรียง
    }

    const sortOrder = sortOptions.value;

    rows.sort((a, b) => {
        // ใช้ ISO date จาก data attribute (complaint.date)
        const dateA = new Date(a.dataset.isoDate || 0);
        const dateB = new Date(b.dataset.isoDate || 0);

        // จัดการกรณีวันที่ไม่ถูกต้อง
        if (isNaN(dateA) || isNaN(dateB)) {
            console.warn("Invalid date found during sorting:", a.dataset.isoDate, b.dataset.isoDate);
            return 0;
        }

        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    // ล้างตารางและเพิ่มแถวที่เรียงลำดับแล้ว
    tableBody.innerHTML = "";
    rows.forEach(row => tableBody.appendChild(row));
}


/**
 * Filters complaints based on search criteria, including calculated Overdue status.
 */
function filterComplaints() {
    console.log("Filtering complaints...");
    const filterText = searchInput.value.toLowerCase().trim();
    const filterSeverity = severityFilter.value;
    const filterTeam = teamFilter.value;
    const filterDateInput = dateFilter.value; // ค่าจาก input date (YYYY-MM-DD)
    const filterStatus = statusFilter.value; // Status filter value ("Overdue", "Pending", etc.)

    console.log("Filters applied:", { filterText, filterSeverity, filterTeam, filterDateInput, filterStatus });

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

        // Format complaint date (วันที่พบปัญหา) เป็น YYYY-MM-DD สำหรับเปรียบเทียบ
        let complaintDateStrYYYYMMDD = '';
         if (complaint.date) {
            try {
                const date = new Date(complaint.date);
                 if (!isNaN(date)) {
                    // สร้าง string YYYY-MM-DD ด้วยตนเองเพื่อหลีกเลี่ยง Timezone issues
                    const year = date.getFullYear();
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    complaintDateStrYYYYMMDD = `${year}-${month}-${day}`;
                 }
            } catch(e) {}
         }

        // --- Apply Filters ---
        const textMatch = !filterText || complaintText.includes(filterText);
        const severityMatch = !filterSeverity || (complaint.severity_level && complaint.severity_level.toLowerCase() === filterSeverity.toLowerCase());
        const teamMatch = !filterTeam || (complaint.team && complaint.team.toLowerCase() === filterTeam.toLowerCase());
        // เปรียบเทียบวันที่แบบ YYYY-MM-DD
        const dateMatch = !filterDateInput || complaintDateStrYYYYMMDD === filterDateInput;

        // Status filter match (compare against calculated display status)
        const statusMatch = !filterStatus || potentialDisplayStatus.toLowerCase() === filterStatus.toLowerCase();

        return textMatch && severityMatch && teamMatch && dateMatch && statusMatch;
    });

    console.log(`Filtering resulted in ${filteredComplaints.length} complaints.`);
    displayComplaints(filteredComplaints); // แสดงผลลัพธ์การกรอง
}

/**
 * Exports the currently displayed table data to an Excel file.
 */
function exportTableToExcel() {
    console.log("Exporting table to Excel...");
    try {
        const table = document.querySelector("table");
        if (!table) {
            console.error("Table element not found for export.");
            return;
        }

        const headerRow = table.querySelector("thead tr");
        if (!headerRow) {
             console.error("Table header not found for export.");
             return;
        }
        const headers = Array.from(headerRow.querySelectorAll("th")).map(th => th.innerText.trim());

        const dataRows = table.querySelectorAll("#complaints-table tr");
        const data = Array.from(dataRows).map(row => {
            const firstCell = row.querySelector("td");
            if (firstCell && firstCell.colSpan === 10) {
                return null; // Skip 'no complaints' row
            }
            return Array.from(row.querySelectorAll("td")).map(td => td.innerText.trim());
        }).filter(row => row !== null);


        if (data.length === 0) {
             console.warn("No data to export.");
             Swal.fire('ไม่มีข้อมูล', 'ไม่พบข้อมูลในตารางที่จะส่งออก', 'warning');
             return;
        }

        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

        const colWidths = headers.map((_, i) => ({
            wch: Math.max(
                headers[i].length,
                ...data.map(row => (row[i] ? row[i].length : 0))
            ) + 2
        }));
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Complaints Report");

        XLSX.writeFile(wb, "complaints_report.xlsx");
        console.log("Excel export successful.");

    } catch (error) {
        console.error("Error exporting to Excel:", error);
        Swal.fire('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดขณะส่งออกข้อมูลไปยัง Excel', 'error');
    }
}

/**
 * Adjusts the visibility of the team filter based on user role.
 */
function checkTeamFilterVisibility() {
    console.log("Checking team filter visibility for role:", userRole);
    if (!teamFilter || !teamFilterLabel) {
        console.warn("Team filter elements not found.");
        return;
    }
    if (userRole === 'admin') {
        teamFilter.style.display = 'none';
        teamFilterLabel.style.display = 'none';
    } else {
        teamFilter.style.display = 'inline-block';
        teamFilterLabel.style.display = 'inline-block';
    }
}

/**
 * Basic HTML escaping function to prevent XSS.
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, function (match) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match];
    });
}

// --- Event Listeners ---
searchButton.addEventListener("click", filterComplaints);
exportButton.addEventListener("click", exportTableToExcel);
searchInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') filterComplaints(); });
dateFilter.addEventListener('keypress', (event) => { if (event.key === 'Enter') filterComplaints(); });
statusFilter.addEventListener('change', filterComplaints);
// เพิ่ม listener สำหรับ dropdown การเรียงลำดับ (ถ้ามี)
if (sortOptions) {
    sortOptions.addEventListener('change', sortTable);
}
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

        // ไม่จำเป็นต้องเรียก sortTable() ที่นี่ เพราะ displayComplaints จะเรียกให้เอง

    } catch (error) {
        console.error("Initialization error:", error);
        tableBody.innerHTML = '<tr><td colspan="10" style="color: red; text-align: center;">เกิดข้อผิดพลาดระหว่างการเริ่มต้น กรุณารีเฟรชหน้า</td></tr>';
    }
});

// ทำให้ sortTable เรียกใช้ได้จาก HTML (ถ้าจำเป็นต้องใช้ onchange)
// window.sortTable = sortTable; // เอาออกถ้าใช้ addEventListener แทน
