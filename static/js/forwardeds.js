// static/js/forwardeds.js
import { getUserRole, getUserTeam, fetchDataWithToken } from './token-manager.js'; // Import ฟังก์ชันที่จำเป็น

/**
 * Fetches complaints with status "Forwarded" or "Complete", filters by team if needed, and populates the table.
 */
async function fetchForwardedAndCompleteComplaints() {
    const tableBody = document.getElementById("complaints-table");
    if (!tableBody) {
        console.error("Complaints table body not found!");
        return;
    }
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">กำลังโหลดข้อมูล...</td></tr>'; // แสดงสถานะกำลังโหลด

    try {
        // ใช้ Promise.all เพื่อดึงข้อมูล role, team และ complaints พร้อมกัน
        const [userRole, userTeam, complaints] = await Promise.all([
            getUserRole(), // ใช้ฟังก์ชันจาก token-manager
            getUserTeam(), // ใช้ฟังก์ชันจาก token-manager
            fetchDataWithToken("/admin/get-complaints") // ใช้ fetchDataWithToken สำหรับดึง complaints
        ]);

        // ตรวจสอบว่า getUserRole/getUserTeam ทำงานสำเร็จหรือไม่
        if (userRole === null || userTeam === null) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red;">ไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาลองใหม่</td></tr>';
            // Swal.fire('Error', 'Could not load user information.', 'error'); // อาจแสดง Swal เพิ่มเติม
            return;
        }

        tableBody.innerHTML = ""; // เคลียร์สถานะ loading/error

        let hasData = false;
        complaints.forEach(complaint => {
            // กรองเฉพาะสถานะ "Forwarded" หรือ "Complete"
            const statusLower = complaint.status ? complaint.status.toLowerCase() : '';
            if (statusLower === "forwarded" || statusLower === "complete") {

                // กรองตามทีม ถ้า user เป็น "admin" และมี team กำหนดไว้
                if (userRole === "admin" && userTeam && complaint.team !== userTeam) {
                    return; // ข้าม complaint นี้ไป ไม่ตรงกับทีมของ admin
                }

                hasData = true;
                const row = tableBody.insertRow();
                // เก็บ ISO date string ไว้ใน data attribute เพื่อการ sort ที่แม่นยำ
                row.dataset.isoDate = complaint.date;

                // Sanitize ข้อมูล
                const title = complaint.title || '';
                // const details = complaint.details || ''; // add <td>${escapeHTML(details)}</td> ใน row ถ้าต้องการ details
                const name = complaint.name || '';
                const date = complaint.date ? new Date(complaint.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
                const contact = complaint.contact || '';
                const team = complaint.team || 'N/A';
                const status = complaint.status || 'N/A';
                const complaintId = complaint._id;

                let actionButton = '';
                if (statusLower === "forwarded") {
                    // เฉพาะ superadmin หรือ alladmin ที่สามารถกด Approve ได้
                    if (userRole === 'superadmin' || userRole === 'alladmin') {
                        actionButton = `
                            <form action="/admin/complete-complaint/${complaintId}" method="get" style="margin: 0;">
                                <button type="submit" class="btn-update">Approve</button>
                            </form>
                        `;
                    } else {
                        // Admin ทั่วไปเห็นแต่ไม่มีปุ่ม หรือแสดงข้อความว่าไม่มีสิทธิ์
                        actionButton = `<span style="color: grey; font-style: italic;">รออนุมัติ</span>`;
                    }
                } else if (statusLower === "complete") {
                    // ทุก role ที่เห็นรายการนี้ สามารถกด View ได้
                    actionButton = `
                        <form action="/admin/view-complete-complaint/${complaintId}" method="get" style="margin: 0;">
                            <button type="submit" class="btn-success">View</button>
                        </form>
                    `;
                }

                // กำหนด class ตามสถานะ
                let statusClass = "status";
                if (statusLower === "forwarded") {
                    statusClass += " status-forwarded";
                } else if (statusLower === "complete") {
                    statusClass += " status-complete";
                }

                row.innerHTML = `
                    <td>${escapeHTML(title)}</td>
                    <td>${escapeHTML(name)}</td>
                    <td>${escapeHTML(date)}</td>
                    <td>${escapeHTML(contact)}</td>
                    <td>${escapeHTML(team)}</td>
                    <td class="${statusClass}">${escapeHTML(status)}</td>
                    <td>${actionButton}</td>
                `;
            }
        });

        if (!hasData) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">ไม่พบคำร้องเรียนที่รออนุมัติหรือดำเนินการเสร็จสิ้น</td></tr>';
        }

        // เรียงลำดับตารางหลังจากใส่ข้อมูลแล้ว
        sortTable();

    } catch (error) {
        // Catch error จาก Promise.all หรือ fetchDataWithToken
        console.error("เกิดข้อผิดพลาดในการดึงหรือประมวลผลข้อมูลคำร้อง:", error);
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">เกิดข้อผิดพลาด: ${error.message || 'ไม่สามารถโหลดข้อมูลได้'}</td></tr>`;
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: `ไม่สามารถโหลดข้อมูลคำร้องเรียนได้: ${error.message || 'กรุณาลองใหม่อีกครั้ง'}`,
        });
    }
}

/**
 * Sorts the complaints table based on the selected date order using ISO date from data attribute.
 */
function sortTable() {
    const tableBody = document.getElementById("complaints-table");
    if (!tableBody) return;

    const rows = Array.from(tableBody.rows);
    const sortOrder = document.getElementById("sort-options").value;

    rows.sort((a, b) => {
        // ใช้ ISO date จาก data attribute เพื่อความแม่นยำ
        const dateA = new Date(a.dataset.isoDate || 0);
        const dateB = new Date(b.dataset.isoDate || 0);

        // จัดการกรณีวันที่ไม่ถูกต้อง (เผื่อไว้)
        if (isNaN(dateA) || isNaN(dateB)) {
            console.warn("Invalid date found during sorting:", a.dataset.isoDate, b.dataset.isoDate);
            return 0;
        }

        return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    // ล้างและเพิ่มแถวที่เรียงลำดับแล้ว
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
            "'": '&#39;'
        }[match];
    });
}

// --- Initialization ---

// ทำให้ sortTable เรียกใช้ได้จาก HTML (ผ่าน onchange)
window.sortTable = sortTable;

// เรียก fetch ข้อมูลเมื่อ DOM โหลดเสร็จ
document.addEventListener("DOMContentLoaded", fetchForwardedAndCompleteComplaints);
