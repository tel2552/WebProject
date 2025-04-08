// admin_admit_complaint.js
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
    const response = await fetch(`/admin/get-complaint/${complaintId}`);
    const complaint = await response.json();
    
    document.getElementById("name").value = complaint.name;
    document.getElementById("title").value = complaint.title;
    document.getElementById("details").value = complaint.details;
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
