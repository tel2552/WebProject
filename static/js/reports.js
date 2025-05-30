import { getUserRole, getUserTeam, fetchDataWithToken } from './token-manager.js'; // Import ฟังก์ชันที่จำเป็น

/**
 * Fetches complaints with status "Admit", filters by team if needed, and populates the table.
 */
async function fetchAdmitComplaints() {
    const tableBody = document.getElementById("complaints-table");
    if (!tableBody) {
        console.error("Complaints table body not found!");
        return;
    }
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">กำลังโหลดข้อมูล...</td></tr>'; // แสดงสถานะกำลังโหลด (แก้ไข colspan)

    try {
        // ใช้ Promise.all เพื่อดึงข้อมูล role, team และ complaints พร้อมกันเพื่อประสิทธิภาพ
        // fetchDataWithToken จะจัดการเรื่อง token และ header ให้เอง
        const [userRole, userTeam, complaints] = await Promise.all([
            getUserRole(), // ใช้ฟังก์ชันจาก token-manager
            getUserTeam(), // ใช้ฟังก์ชันจาก token-manager
            fetchDataWithToken("/admin/get-complaints") // ใช้ fetchDataWithToken สำหรับดึง complaints
            // *** หมายเหตุ: ตรวจสอบให้แน่ใจว่า endpoint '/admin/get-complaints' คืนค่า complaints ทั้งหมดที่ต้องการ ***
            // *** หรือถ้าต้องการเฉพาะ Admit อาจจะต้องปรับ endpoint หรือกรองฝั่ง client ***
        ]);

        // ตรวจสอบว่า getUserRole/getUserTeam ทำงานสำเร็จหรือไม่ (อาจคืน null ถ้ามีปัญหา)
        if (userRole === null || userTeam === null) {
             // getUserData ใน token-manager ควรจะ log error ไปแล้ว
             // อาจแสดงข้อความในตารางเพิ่มเติม
             tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">ไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาลองใหม่</td></tr>'; // (แก้ไข colspan)
             // อาจแสดง Swal เพิ่มเติมถ้าต้องการ
             // Swal.fire('Error', 'Could not load user information.', 'error');
             return; // หยุดการทำงานถ้าข้อมูล user ไม่ครบ
        }

        tableBody.innerHTML = ""; // เคลียร์สถานะ loading/error

        let hasData = false;
        complaints.forEach(complaint => {
            // กรองเฉพาะ status "Admit" จาก backend
            const originalStatus = complaint.status ? complaint.status.toLowerCase() : '';
            if (originalStatus === "admit") {
                // กรองตามทีม ถ้า user เป็น "admin" และมี team กำหนดไว้
                if (userRole === "admin" && userTeam && complaint.team !== userTeam) {
                    return; // ข้าม complaint นี้ไป ไม่ตรงกับทีมของ admin
                }

                hasData = true;
                const row = tableBody.insertRow();

                // Sanitize ข้อมูลก่อนแสดงผล (ตัวอย่างเบื้องต้น)
                const title = complaint.title || '';
                // const details = complaint.details || ''; // add <td>${escapeHTML(details)}</td> ใน row ถ้าต้องการ details
                const name = complaint.name || '';
                const date = complaint.date ? new Date(complaint.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'; // จัดรูปแบบวันที่เป็นภาษาไทย
                const contact = complaint.contact || '';
                const team = complaint.team || 'N/A';
                // const status = complaint.status || 'N/A'; // สถานะเดิมจาก backend
                const displayStatus = 'On Process'; // ชื่อสถานะที่ต้องการให้แสดงผล
                const complaintId = complaint._id; // สมมติว่า MongoDB ObjectId อยู่ใน _id

                row.innerHTML = `
                    <td>${escapeHTML(title)}</td>
                    <td>${escapeHTML(name)}</td>
                    <td>${escapeHTML(date)}</td>
                    <td>${escapeHTML(contact)}</td>
                    <td>${escapeHTML(team)}</td>
                    <td class="status status-on-process">${escapeHTML(displayStatus)}</td>
                    <td>
                        ${complaintId ? `
                        <form action="/admin/forward-complaint/${complaintId}" method="get" style="margin: 0;">
                            <button type="submit" class="btn-update">อัปเดต</button>
                        </form>
                        ` : 'N/A'}
                    </td>
                `;
            }
        });

        if (!hasData) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">ไม่พบคำร้องเรียน (สถานะ "Admit" ซึ่งแสดงผลเป็น "On Process")</td></tr>'; // (แก้ไข colspan และข้อความ)
        }

        // เรียงลำดับตารางหลังจากใส่ข้อมูลแล้ว
        sortTable();

    } catch (error) {
        // Catch error จาก Promise.all หรือ fetchDataWithToken (แก้ไข colspan)
        console.error("เกิดข้อผิดพลาดในการดึงหรือประมวลผลข้อมูลคำร้อง:", error);
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">เกิดข้อผิดพลาด: ${error.message || 'ไม่สามารถโหลดข้อมูลได้'}</td></tr>`;
        // แสดง SweetAlert แจ้งผู้ใช้
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: `ไม่สามารถโหลดข้อมูลคำร้องเรียนได้: ${error.message || 'กรุณาลองใหม่อีกครั้ง'}`,
        });
    }
}

/**
 * Sorts the complaints table based on the selected date order.
 */
function sortTable() {
    const tableBody = document.getElementById("complaints-table");
    if (!tableBody) return;

    const rows = Array.from(tableBody.rows);
    const sortOrder = document.getElementById("sort-options").value;

    rows.sort((a, b) => {
        // หา cell ของวันที่ (สมมติว่าเป็นคอลัมน์ที่ 4, index 3)
        const dateCellIndex = 3;
        // ต้องแปลงวันที่จาก format ที่แสดงผลกลับเป็น Date object ก่อนเทียบ
        // สมมติว่า format คือ 'dd mmm yyyy' (เช่น '15 พ.ค. 2567') อาจจะต้อง parse แบบ custom
        // หรือเก็บค่า date ดั้งเดิม (เช่น ISO string) ไว้ใน data attribute ของ cell/row เพื่อการ sort ที่ง่ายขึ้น
        // ตัวอย่าง: เก็บใน data attribute
        // const dateA = new Date(a.dataset.isoDate || 0);
        // const dateB = new Date(b.dataset.isoDate || 0);

        // --- วิธีที่ง่ายกว่า: ใช้ textContent และปล่อยให้ Date() พยายาม parse ---
        // (อาจไม่แม่นยำ 100% กับทุก format แต่ใช้ได้กับหลายกรณี)
        // เราต้องแน่ใจว่า textContent ใน cell ที่ 3 เป็น format ที่ Date() อ่านได้
        // จากโค้ดด้านบน เราใช้ toLocaleDateString ซึ่งอาจจะ parse กลับมายาก
        // **แนะนำ:** เก็บ ISO date string ไว้ใน data attribute ตอนสร้าง row
        // เช่น: row.dataset.isoDate = complaint.date;
        // แล้วใช้:
        // const dateA = new Date(a.dataset.isoDate || 0);
        // const dateB = new Date(b.dataset.isoDate || 0);

        // --- แก้ไขชั่วคราว: พยายาม parse จาก textContent (อาจต้องปรับปรุง) ---
        // ดึง text content จาก cell ที่ 4 (index 3)
        const dateTextA = a.cells[dateCellIndex]?.textContent || '';
        const dateTextB = b.cells[dateCellIndex]?.textContent || '';

        // พยายามแปลง text เป็น Date object (อาจต้องปรับปรุง parser ถ้า format ซับซ้อน)
        const dateA = parseThaiDate(dateTextA);
        const dateB = parseThaiDate(dateTextB);

        // จัดการกรณีวันที่ไม่ถูกต้อง
        if (!dateA || !dateB || isNaN(dateA) || isNaN(dateB)) {
            console.warn("Invalid date found during sorting:", dateTextA, dateTextB);
            return 0; // ไม่เปลี่ยนลำดับถ้าวันที่ผิดพลาด
        }

        return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    // ล้างและเพิ่มแถวที่เรียงลำดับแล้ว
    tableBody.innerHTML = "";
    rows.forEach(row => tableBody.appendChild(row));
}

/**
 * Helper function to parse Thai short month date string.
 * Needs improvement for robustness.
 * @param {string} dateString - e.g., "15 พ.ค. 2567"
 * @returns {Date|null}
 */
function parseThaiDate(dateString) {
    if (!dateString || dateString === 'N/A') return null;
    const months = {
        'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3, 'พ.ค.': 4, 'มิ.ย.': 5,
        'ก.ค.': 6, 'ส.ค.': 7, 'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11
    };
    const parts = dateString.split(' ');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = months[parts[1]];
        const year = parseInt(parts[2], 10) - 543; // Convert BE to AD
        if (!isNaN(day) && month !== undefined && !isNaN(year)) {
            return new Date(year, month, day);
        }
    }
    // Fallback attempt if format is different or Date() can parse it directly
    const parsedDate = new Date(dateString);
    return !isNaN(parsedDate) ? parsedDate : null;
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
document.addEventListener("DOMContentLoaded", fetchAdmitComplaints);

// --- ทางเลือก: ใช้ Event Listener แทน onchange ใน HTML ---
// document.addEventListener("DOMContentLoaded", () => {
//     const sortSelect = document.getElementById('sort-options');
//     if (sortSelect) {
//         sortSelect.addEventListener('change', sortTable);
//     }
//     fetchAdmitComplaints();
// });
