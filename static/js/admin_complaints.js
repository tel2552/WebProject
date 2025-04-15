// static/js/admin_complaints.js
import { fetchDataWithToken, getUserRole, getUserTeam } from './token-manager.js';

/**
 * Fetches complaints, filters for "Pending" status and user's team (if applicable),
 * and populates the table.
 */
async function fetchPendingComplaints() {
    const tableBody = document.getElementById('complaints-table');
    if (!tableBody) {
        console.error("Complaints table body not found!");
        return;
    }
    // กำหนด colspan ให้ตรงกับจำนวนคอลัมน์ (Title, Name, Date, Contact, Team, Status, Update = 7)
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">กำลังโหลดข้อมูล...</td></tr>';

    try {
        // ดึงข้อมูล role, team, และ complaints พร้อมกัน
        const [userRole, userTeam, complaints] = await Promise.all([
            getUserRole(),
            getUserTeam(),
            fetchDataWithToken('/admin/get-complaints') // Endpoint เดิมที่ดึงข้อมูลทั้งหมด
        ]);

        // ตรวจสอบข้อมูลผู้ใช้
        if (userRole === null || userTeam === null) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">ไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาลองใหม่</td></tr>';
            return;
        }

        // กรองข้อมูล
        const filteredComplaints = complaints.filter(complaint => {
            // กรองตามทีม ถ้าเป็น admin
            if (userRole === "admin" && complaint.team !== userTeam) {
                return false;
            }
            // กรองเฉพาะสถานะ Pending
            return complaint.status && complaint.status.toLowerCase() === 'pending';
        });

        displayComplaints(filteredComplaints); // ส่งข้อมูลที่กรองแล้วไปแสดงผล

    } catch (error) {
        console.error('Error fetching or processing complaints:', error);
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">เกิดข้อผิดพลาด: ${error.message || 'ไม่สามารถโหลดข้อมูลได้'}</td></tr>`;
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: `ไม่สามารถโหลดข้อมูลคำร้องเรียนได้: ${error.message || 'กรุณาลองใหม่อีกครั้ง'}`,
        });
    }
}

/**
 * Displays the filtered complaints in the table.
 * @param {Array} complaints - Array of complaint objects to display.
 */
function displayComplaints(complaints) {
    const tableBody = document.getElementById('complaints-table');
    tableBody.innerHTML = ''; // เคลียร์แถวเดิม (รวมถึง loading/error message)

    if (!complaints || complaints.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">ไม่พบคำร้องเรียนที่รอการดำเนินการ (สถานะ Pending)</td></tr>';
        return;
    }

    let hasData = false; // ใช้ตรวจสอบว่ามีข้อมูลแสดงผลจริงหรือไม่ (เผื่อกรณี filter แล้วไม่เหลือ)
    complaints.forEach(complaint => {
        hasData = true;
        const row = tableBody.insertRow();
        // เก็บ ISO date string ไว้ใน data attribute เพื่อการ sort ที่แม่นยำ
        row.dataset.isoDate = complaint.date;

        // Sanitize และจัดรูปแบบข้อมูล
        const title = complaint.title || '';
        const name = complaint.name || '';
        // จัดรูปแบบวันที่เป็นภาษาไทย
        const date = complaint.date ? new Date(complaint.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
        const contact = complaint.contact || '';
        const team = complaint.team || 'N/A';
        const status = complaint.status || 'N/A';
        const complaintId = complaint._id;

        // สร้าง Cell ต่างๆ พร้อม escapeHTML
        row.insertCell().textContent = escapeHTML(title);
        // row.insertCell().textContent = escapeHTML(details); // ถ้าจะเปิดแสดงรายละเอียด
        row.insertCell().textContent = escapeHTML(name);
        row.insertCell().textContent = escapeHTML(date); // แสดงวันที่ภาษาไทย
        row.insertCell().textContent = escapeHTML(contact);
        row.insertCell().textContent = escapeHTML(team);

        // Cell สถานะพร้อม class
        const statusCell = row.insertCell();
        statusCell.textContent = escapeHTML(status);
        statusCell.classList.add('status');
        // ใช้ toLowerCase เพื่อความแน่นอนในการเทียบ status
        const statusLower = status.toLowerCase();
        if (statusLower === 'resolved') {
            statusCell.classList.add('status-resolved');
        } else if (statusLower === 'pending') {
            statusCell.classList.add('status-pending');
        } else if (statusLower === 'admit') {
            statusCell.classList.add('status-admit');
        } else if (statusLower === 'forwarded') {
            statusCell.classList.add('status-forwarded');
        } else if (statusLower === 'complete') {
            statusCell.classList.add('status-complete');
        } else if (statusLower === 'overdue') { // เพิ่มเผื่อถ้ามีการคำนวณ Overdue
            statusCell.classList.add('status-overdue');
        }


        // Cell ปุ่ม Update
        const updateCell = row.insertCell();
        if (complaintId) {
            updateCell.innerHTML = `<a href="/admin/admit-complaint/${escapeHTML(complaintId)}"><button class="btn-update">อัปเดต</button></a>`;
        } else {
            updateCell.textContent = 'N/A';
        }
    });

    // เรียงลำดับตารางหลังจากแสดงข้อมูลแล้ว
    sortTable();
}

/**
 * Sorts the complaints table based on the selected date order using ISO date from data attribute.
 */
function sortTable() {
    const tableBody = document.getElementById('complaints-table');
    if (!tableBody) return;

    const rows = Array.from(tableBody.rows);
    // ตรวจสอบว่ามีแถวข้อมูลจริงๆ หรือไม่ (ไม่ใช่แถว 'No data')
    if (rows.length === 0 || (rows.length === 1 && rows[0].cells.length === 1 && rows[0].cells[0].colSpan > 1)) {
        return; // ไม่มีข้อมูลให้เรียง
    }

    const sortOrder = document.getElementById('sort-options').value;

    rows.sort((a, b) => {
        // ใช้ ISO date จาก data attribute เพื่อความแม่นยำ
        const dateA = new Date(a.dataset.isoDate || 0);
        const dateB = new Date(b.dataset.isoDate || 0);

        // จัดการกรณีวันที่ไม่ถูกต้อง
        if (isNaN(dateA) || isNaN(dateB)) {
            console.warn("Invalid date found during sorting:", a.dataset.isoDate, b.dataset.isoDate);
            return 0; // ไม่เปลี่ยนลำดับถ้าวันที่ผิดพลาด
        }

        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    // ล้างตารางและเพิ่มแถวที่เรียงลำดับแล้ว
    tableBody.innerHTML = "";
    rows.forEach(row => tableBody.appendChild(row));
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
            "'": '&#39;' // หรือ &apos;
        }[match];
    });
}


// --- Initialization ---

// ทำให้ sortTable เรียกใช้ได้จาก HTML (ผ่าน onchange)
window.sortTable = sortTable;

// เรียก fetch ข้อมูลเมื่อ DOM โหลดเสร็จ
document.addEventListener('DOMContentLoaded', fetchPendingComplaints); // เปลี่ยนชื่อฟังก์ชันที่เรียก

// --- ทางเลือก: ใช้ Event Listener แทน onchange ใน HTML ---
// document.addEventListener("DOMContentLoaded", () => {
//     const sortSelect = document.getElementById('sort-options');
//     if (sortSelect) {
//         sortSelect.addEventListener('change', sortTable);
//     }
//     fetchPendingComplaints();
// });
