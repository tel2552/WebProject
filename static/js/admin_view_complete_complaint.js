// ดึงข้อมูลคำร้องจาก URL (เช่น /forward-complaint/{id})
const complaintId = window.location.pathname.split("/").pop();

// เก็บรายชื่อผู้รับเรื่อง
let recipients = [];

// โหลดชื่อผู้ใช้
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

// โหลดข้อมูลคำร้อง
async function loadComplaint() {
    const response = await fetch(`/admin/get-complaint/${complaintId}`);
    const complaint = await response.json();
    
    document.getElementById("name").value = complaint.name;
    document.getElementById("title").value = complaint.title;
    document.getElementById("details").value = complaint.details;
    document.getElementById("department").value = complaint.team;
    document.getElementById("additional-info").value = complaint.additional_info;
    document.getElementById("correction1").value = complaint.correction1;
    document.getElementById("correction2").value = complaint.correction2;
    document.getElementById("correction3").value = complaint.correction3;
    document.getElementById("correction4").value = complaint.correction4;
    document.getElementById("correction5").value = complaint.correction5;
    document.getElementById("inspector-name1").value = complaint.inspector_name1;
    document.getElementById("inspector-name2").value = complaint.inspector_name2;
    document.getElementById("inspector-name3").value = complaint.inspector_name3;
    document.getElementById("inspector-name4").value = complaint.inspector_name4;
    document.getElementById("inspector-name5").value = complaint.inspector_name5;
    document.getElementById("inspection-date1").value = complaint.inspection_date1;
    document.getElementById("inspection-date2").value = complaint.inspection_date2;
    document.getElementById("inspection-date3").value = complaint.inspection_date3;
    document.getElementById("inspection-date4").value = complaint.inspection_date4;
    document.getElementById("inspection-date5").value = complaint.inspection_date5;
    document.getElementById("approver-recommendation").value = complaint.approver_recommendation;
    // Load and display recipients
    if (complaint.recipients && complaint.recipients.length > 0) {
      recipients = complaint.recipients; // Update the global recipients array
      updateRecipientsTable(); // Call the function to update the table
    }
    // Pre-select the severity radio button
    const severityLevel = complaint.severity_level;
    const severityRadioButton = document.querySelector(`input[name="severity"][value="${severityLevel}"]`);
    if (severityRadioButton) {
        severityRadioButton.checked = true;
    }
}
// อัปเดตตารางผู้รับเรื่อง
function updateRecipientsTable() {
    const tableBody = document.querySelector("#recipients-table tbody");
    tableBody.innerHTML = "";  // ล้างตารางเก่า

    recipients.forEach((recipient, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${recipient.name}</td>
            <td>${recipient.email}</td>
            <td>${recipient.department}</td>
            <td>${recipient.role}</td> <!-- แสดงข้อมูลในช่องใหม่ -->
        `;
        tableBody.appendChild(row);
    });
}

loadAdminName();
loadComplaint();