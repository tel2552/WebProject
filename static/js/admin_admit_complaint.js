// ดึงข้อมูลคำร้องจาก URL (เช่น /forward-complaint/{id})
const complaintId = window.location.pathname.split("/").pop();

async function loadAdminName() {
    try {
        const token = localStorage.getItem('access_token'); // get from access_token.
        if (!token){
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด!',
                text: "คุณยังไม่ได้เข้าสู่ระบบ",
                confirmButtonText: 'ตกลง',
            }).then(()=>{
                window.location.href = "/"; 
            });
            return;
        }
        const response = await fetch('/admin/get-username', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            const data = await response.json();
            document.getElementById('admin_name').value = data.username;
        } else {
            console.error('Failed to fetch admin name');
            document.getElementById('admin_name').value = 'ไม่สามารถโหลดชื่อผู้ใช้ได้';
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('admin_name').value = 'ไม่สามารถโหลดชื่อผู้ใช้ได้';
    }
}

async function loadComplaint() {
    try {
        const response = await fetch(`/admin/get-complaint/${complaintId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const complaint = await response.json();

        // ฟังก์ชัน helper สำหรับการตั้งค่า value ของ element อย่างปลอดภัย
        const setValue = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value || ''; // ถ้า value เป็น null/undefined ให้ใช้ ''
            } else {
                console.warn(`Element with ID '${id}' not found.`);
            }
        };

        // แสดงข้อมูลเดิมของผู้ร้องเรียน
        setValue("name", complaint.name);
        setValue("title", complaint.title);
        setValue("details", complaint.details);

        // แสดงข้อมูลเพิ่มเติมที่ดึงมา
        setValue("original_date_display", complaint.date); 

        // Backend ส่ง "contact" ซึ่งเป็นข้อมูลการติดต่อหลัก
        const contactInfo = complaint.contact || '';
        let email = "";
        let phone = "";

        if (contactInfo) {
            const parts = contactInfo.split(',').map(part => part.trim());
            parts.forEach(part => {
                if (part.startsWith("อีเมล:")) {
                    email = part.substring("อีเมล:".length).trim();
                } else if (part.startsWith("โทรศัพท์:")) {
                    phone = part.substring("โทรศัพท์:".length).trim();
                } else {
                    // Fallback for cases where it might be just an email or just a phone without prefix
                    // This part tries to guess if it's an email if no prefix was found yet for email
                    if (!email && part.includes('@')) {
                        email = part;
                    } else if (!phone) { // If phone is not yet found, assume it's a phone
                        phone = part;
                    }
                }
            });
        }
        setValue("original_email_display", email);
        setValue("original_phone_display", phone);
        setValue("original_team_display", complaint.team); // สมมติ backend ส่ง 'team' (ประเภทเรื่องเดิม)

        // ตั้งค่า default ให้กับ select box ของ Admin ด้วยประเภทเรื่องเดิม (ถ้ามี)
        // และให้ Admin สามารถเลือกเปลี่ยนได้
        const departmentSelect = document.getElementById('department');
        if (departmentSelect) {
            if (complaint.team) {
                departmentSelect.value = complaint.team;
            }
            // ถ้า complaint.team ไม่มีค่า หรือไม่ตรงกับ option ใด, browser จะเลือก option แรก หรือ option ที่มี selected attribute
        }
    } catch (error) {
        console.error('Failed to load complaint data:', error);
        Swal.fire('เกิดข้อผิดพลาด', `ไม่สามารถโหลดข้อมูลคำร้องเรียนได้: ${error.message}`, 'error');
        // อาจจะ disable form หรือแสดงข้อความบนหน้าเว็บ
    }
}
document.addEventListener("DOMContentLoaded", function() {
    loadComplaint();
    loadAdminName();
});

// ส่งคำร้องไปยังหน่วยงาน
document.getElementById("correction-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const department = document.getElementById("department").value;
    let additionalInfo = document.getElementById("additional-info").value;

    // ถ้า additionalInfo ว่าง ให้แทนด้วย "-"
    if (!additionalInfo.trim()) {
        additionalInfo = "-";
    }

    const formData = new FormData();
    formData.append("department", department);
    formData.append("additional_info", additionalInfo);

    const response = await fetch(`/admin/admit-complaint/${complaintId}`, {
        method: "POST",
        body: formData  
    });

    if (response.ok) {
        Swal.fire({
            icon: 'success',
            title: 'ส่งเรื่องร้องเรียนเรียบร้อยแล้ว!',
            text: 'เราได้รับเรื่องร้องเรียนของคุณแล้ว',
            confirmButtonText: 'ตกลง',
            timer: 3000,
            timerProgressBar: true,
        }).then(() => {
            window.location.href = "/admin_complaints"; 
        });
    } else {
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด!',
            text: 'เกิดข้อผิดพลาดในการส่งเรื่องร้องเรียน กรุณาลองใหม่อีกครั้ง',
            confirmButtonText: 'ตกลง',
        });
    }
});
