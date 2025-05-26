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
    // Function to set correction field value or placeholder
    function setCorrectionField(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (value === undefined || value === null || value === '') {
            field.value = ""; // Clear existing value
            // Set the placeholder text to "โปรดกรอกรายละเอียด"
            field.placeholder = "โปรดกรอกรายละเอียด";
        } else {
            field.value = value;
            field.placeholder = ""; // clear placeholder
        }
    }
    setCorrectionField("correction1", complaint.correction1);
    setCorrectionField("correction2", complaint.correction2);
    setCorrectionField("correction3", complaint.correction3);
    setCorrectionField("correction4", complaint.correction4);
    setCorrectionField("correction5", complaint.correction5);
    setCorrectionField("inspector-name1", complaint.inspector_name1);
    setCorrectionField("inspector-name2", complaint.inspector_name2);
    setCorrectionField("inspector-name3", complaint.inspector_name3);
    setCorrectionField("inspector-name4", complaint.inspector_name4);
    setCorrectionField("inspector-name5", complaint.inspector_name5);
    // document.getElementById("correction1").value = complaint.correction1;
    // document.getElementById("correction2").value = complaint.correction2;
    // document.getElementById("correction3").value = complaint.correction3;
    // document.getElementById("correction4").value = complaint.correction4;
    // document.getElementById("correction5").value = complaint.correction5;
    // document.getElementById("inspector-name1").value = complaint.inspector_name1;
    // document.getElementById("inspector-name2").value = complaint.inspector_name2;
    // document.getElementById("inspector-name3").value = complaint.inspector_name3;
    // document.getElementById("inspector-name4").value = complaint.inspector_name4;
    // document.getElementById("inspector-name5").value = complaint.inspector_name5;
    document.getElementById("inspection-date1").value = complaint.inspection_date1;
    document.getElementById("inspection-date2").value = complaint.inspection_date2;
    document.getElementById("inspection-date3").value = complaint.inspection_date3;
    document.getElementById("inspection-date4").value = complaint.inspection_date4;
    document.getElementById("inspection-date5").value = complaint.inspection_date5;
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
    // Display approver recommendation if it exists
    const recommendationDisplay = document.getElementById('approver-recommendation-display');
    if (complaint.approver_recommendation) {
        recommendationDisplay.textContent = complaint.approver_recommendation;
    } else {
        recommendationDisplay.textContent = "ไม่มีคำแนะนำ"; // or leave it empty
    }

    // Check if essential management data exists to enable/disable export button
    const hasManagementData = complaint.correction1 || complaint.inspector_name1 || complaint.inspection_date1 ||
                              complaint.correction2 || complaint.inspector_name2 || complaint.inspection_date2 ||
                              complaint.recipients?.length > 0 || complaint.severity_level; // Add more checks if needed

    const exportPdfButton = document.getElementById("export-pdf-btn");
    if (!hasManagementData) {
        exportPdfButton.classList.add("btn-disabled");
        exportPdfButton.disabled = true;
    } else {
        exportPdfButton.classList.remove("btn-disabled");
        exportPdfButton.disabled = false;
    }
}
document.addEventListener("DOMContentLoaded", function() {
    // Initially disable the export button and set up its tooltip functionality
    const exportPdfButton = document.getElementById("export-pdf-btn");
    if (exportPdfButton) {
        exportPdfButton.addEventListener("click", exportToPdf);
    }
    // Load complaint data first, then admin name.
    // loadComplaint will now handle the initial state of the export button.
    loadComplaint().then(loadAdminName);
});

// เพิ่มผู้รับเรื่อง
function addRecipient() {
    const name = document.getElementById("recipient-name").value;
    const email = document.getElementById("recipient-email").value;
    const department = document.getElementById("recipient-department").value;
    const role = document.getElementById("recipient-role").value;

    if (name && email && department && role) {
        recipients.push({ name, email, department, role });  // เพิ่มข้อมูลลงในอาร์เรย์
        updateRecipientsTable();  // อัปเดตตาราง
        clearRecipientInputs();  // ล้างช่อง input
    } else {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
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
            <td>
                <button type="button" onclick="removeRecipient(${index})">ลบ</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// ล้างช่อง input ผู้รับเรื่อง
function clearRecipientInputs() {
    document.getElementById("recipient-name").value = "";
    document.getElementById("recipient-email").value = "";
    document.getElementById("recipient-department").value = "";
    document.getElementById("recipient-role").value = ""; // ล้างช่องใหม่
}

// ส่งคำร้องไปยังหน่วยงาน (เสนออนุมัติ)
document.querySelector("button[type='submit']").addEventListener("click", async (e) => {
    e.preventDefault(); // Prevent default form submission

    // ดึงค่าระดับความรุนแรง
    const severityLevel = document.querySelector('input[name="severity"]:checked')?.value;
    if (!severityLevel) {
        Swal.fire({
            icon: 'warning',
            title: 'กรุณาเลือกระดับความรุนแรง!',
            text: 'โปรดเลือกระดับความรุนแรงก่อนส่งเรื่องร้องเรียน',
            confirmButtonText: 'ตกลง',
        });
        return;
    }
    // ดึงข้อมูลผู้รับเรื่องจากตาราง
    const recipients = [];
    const rows = document.querySelectorAll("#recipients-table tbody tr");
    rows.forEach(row => {
        const name = row.cells[0].textContent;
        const email = row.cells[1].textContent;
        const department = row.cells[2].textContent;
        const role = row.cells[3].textContent;
        recipients.push({ name, email, department, role });
    });

    // Validate all correction fields are filled
    let allCorrectionFieldsFilled = true;
    const correctionFields = [
        "correction1", "inspector-name1", "inspection-date1",
        "correction2", "inspector-name2", "inspection-date2",
        "correction3", "inspector-name3", "inspection-date3",
        "correction4", "inspector-name4", "inspection-date4",
        "correction5", "inspector-name5", "inspection-date5",
    ];
    for (const fieldId of correctionFields) {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            allCorrectionFieldsFilled = false;
            Swal.fire({
                icon: 'warning',
                title: 'กรุณากรอกข้อมูลให้ครบถ้วน!',
                text: 'โปรดกรอกข้อมูลในส่วน Correction ให้ครบถ้วนก่อนส่ง',
                confirmButtonText: 'ตกลง',
            });
            break; 
        }
    }

    if (!allCorrectionFieldsFilled) {
        return; // Stop submission if fields are not filled
    }

    const correction1 = document.getElementById("correction1").value;
    const inspectorName1 = document.getElementById("inspector-name1").value;
    const inspectionDate1 = document.getElementById("inspection-date1").value;

    const correction2 = document.getElementById("correction2").value;
    const inspectorName2 = document.getElementById("inspector-name2").value;
    const inspectionDate2 = document.getElementById("inspection-date2").value;

    const correction3 = document.getElementById("correction3").value;
    const inspectorName3 = document.getElementById("inspector-name3").value;
    const inspectionDate3 = document.getElementById("inspection-date3").value;

    const correction4 = document.getElementById("correction4").value;
    const inspectorName4 = document.getElementById("inspector-name4").value;
    const inspectionDate4 = document.getElementById("inspection-date4").value;

    const correction5 = document.getElementById("correction5").value;
    const inspectorName5 = document.getElementById("inspector-name5").value;
    const inspectionDate5 = document.getElementById("inspection-date5").value;

    // สร้าง payload สำหรับส่งไปยัง backend
    const payload = {
        severity_level: severityLevel,
        recipients: recipients, // แปลงเป็น JSON string
        // add code here
        correction1: correction1,
        inspector_name1: inspectorName1,
        inspection_date1: inspectionDate1,
        correction2: correction2,
        inspector_name2: inspectorName2,
        inspection_date2: inspectionDate2,
        correction3: correction3,
        inspector_name3: inspectorName3,
        inspection_date3: inspectionDate3,
        correction4: correction4,
        inspector_name4: inspectorName4,
        inspection_date4: inspectionDate4,
        correction5: correction5,
        inspector_name5: inspectorName5,
        inspection_date5: inspectionDate5,
        status: "Forwarded", // Set status approval request
    };

    // ส่งข้อมูลไปยัง backend
    try {
        const response = await fetch(`/admin/forward-complaint/${complaintId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json", // ระบุว่าเราส่งข้อมูลเป็น JSON
            },
            body: JSON.stringify(payload), // แปลง payload เป็น JSON string
        });

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'ส่งเรื่องร้องเรียนเพื่ออนุมัติเรียบร้อยแล้ว!',
                text: 'เราได้ส่งเรื่องร้องเรียนไปยังผู้มีอำนาจอนุมัติแล้ว',
                confirmButtonText: 'ตกลง',
                timer: 3000, // Automatically close after 3 seconds
                timerProgressBar: true,
            }).then(() => {
                document.getElementById("export-pdf-btn").classList.remove("btn-disabled");
                document.getElementById("export-pdf-btn").disabled = false;
                window.location.href = "/forwardeds"; // ไปยังหน้ารายการคำร้องที่รออนุมัติ
            });
        } else {
            const errorData = await response.json();
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด!',
                text: `เกิดข้อผิดพลาด: ${errorData.detail || "ไม่สามารถส่งข้อมูลได้"}`,
                confirmButtonText: 'ตกลง',
            });
        }
    } catch (error) {
        console.error("Error submitting form:", error);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด!',
            text: 'เกิดข้อผิดพลาดในการส่งเรื่องร้องเรียน กรุณาลองใหม่อีกครั้ง',
            confirmButtonText: 'ตกลง',
        });
    }
});

  // ส่งข้อมูลแบบร่างไปยัง backend (บันทึกข้อมูล)
document.querySelector("button[type='submit1']").addEventListener("click", async (e) => {
    e.preventDefault(); // Prevent default form submission

    // ดึงค่าระดับความรุนแรง
    const severityLevel = document.querySelector('input[name="severity"]:checked')?.value;
     // ดึงข้อมูลผู้รับเรื่องจากตาราง
    const recipients = [];
    const rows = document.querySelectorAll("#recipients-table tbody tr");
    rows.forEach(row => {
        const name = row.cells[0].textContent;
        const email = row.cells[1].textContent;
        const department = row.cells[2].textContent;
        const role = row.cells[3].textContent;
        recipients.push({ name, email, department, role });
    });

    const correction1 = document.getElementById("correction1").value;
    const inspectorName1 = document.getElementById("inspector-name1").value;
    const inspectionDate1 = document.getElementById("inspection-date1").value;

    const correction2 = document.getElementById("correction2").value;
    const inspectorName2 = document.getElementById("inspector-name2").value;
    const inspectionDate2 = document.getElementById("inspection-date2").value;

    const correction3 = document.getElementById("correction3").value;
    const inspectorName3 = document.getElementById("inspector-name3").value;
    const inspectionDate3 = document.getElementById("inspection-date3").value;

    const correction4 = document.getElementById("correction4").value;
    const inspectorName4 = document.getElementById("inspector-name4").value;
    const inspectionDate4 = document.getElementById("inspection-date4").value;

    const correction5 = document.getElementById("correction5").value;
    const inspectorName5 = document.getElementById("inspector-name5").value;
    const inspectionDate5 = document.getElementById("inspection-date5").value;

    // สร้าง payload สำหรับส่งไปยัง backend
    const payload = {
        severity_level: severityLevel,
        recipients: recipients, // แปลงเป็น JSON string
        // add code here
        correction1: correction1,
        inspector_name1: inspectorName1,
        inspection_date1: inspectionDate1,
        correction2: correction2,
        inspector_name2: inspectorName2,
        inspection_date2: inspectionDate2,
        correction3: correction3,
        inspector_name3: inspectorName3,
        inspection_date3: inspectionDate3,
        correction4: correction4,
        inspector_name4: inspectorName4,
        inspection_date4: inspectionDate4,
        correction5: correction5,
        inspector_name5: inspectorName5,
        inspection_date5: inspectionDate5,
    };

    // ส่งข้อมูลไปยัง backend 
    try {
        const response = await fetch(`/admin/save-complaint/${complaintId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json", // ระบุว่าเราส่งข้อมูลเป็น JSON
            },
            body: JSON.stringify(payload), // แปลง payload เป็น JSON string
        });

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'บันทึกข้อมูลสำเร็จ!',
                text: 'บันทึกข้อมูลเรียบร้อยแล้ว',
                confirmButtonText: 'ตกลง',
                timer: 3000, // Automatically close after 3 seconds
                timerProgressBar: true,
            }).then(() => {
                // form.reset(); //reset form - อาจจะไม่ต้องการ reset ถ้าผู้ใช้ยังต้องการแก้ไขต่อ
                document.getElementById("export-pdf-btn").classList.remove("btn-disabled");
                document.getElementById("export-pdf-btn").disabled = false;
            });
        } else {
            const errorData = await response.json();
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด!',
                text: `เกิดข้อผิดพลาด: ${errorData.detail || "ไม่สามารถบันทึกข้อมูลได้"}`,
                confirmButtonText: 'ตกลง',
            });
        }
    } catch (error) {
        console.error("Error saving data:", error);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด!',
            text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง',
            confirmButtonText: 'ตกลง',
        });
    }
});

// ลบผู้รับเรื่อง
function removeRecipient(index) {
    recipients.splice(index, 1);  // ลบข้อมูลออกจากอาร์เรย์
    updateRecipientsTable();  // อัปเดตตาราง
}

// ยกเลิกคำร้อง
document.querySelector("button[type='submit2']").addEventListener("click", async (e) => {
    e.preventDefault(); // Prevent default form submission

    Swal.fire({
        title: 'เหตุผลในการยกเลิกคำร้อง',
        input: 'textarea',
        inputPlaceholder: 'กรุณาระบุเหตุผล',
        inputAttributes: {
            'aria-label': 'กรุณาระบุเหตุผล'
        },
        showCancelButton: true,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก',
    }).then(async (result) => {
        if (result.isConfirmed) {
            const cancellationReason = result.value;
            // const approverRecommendation = document.getElementById('approver-recommendation').value;
            if (!cancellationReason.trim()) {
                Swal.fire({
                    icon: 'warning',
                    title: 'กรุณาระบุเหตุผล!',
                    text: 'โปรดระบุเหตุผลในการยกเลิกคำร้อง',
                    confirmButtonText: 'ตกลง',
                });
                return; // Exit if no reason provided
            }
            const approverRecommendation = document.getElementById('approver-recommendation-display').textContent;
            try {
                const response = await fetch(`/admin/cancel-complaint/${complaintId}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: `cancellation_reason=${encodeURIComponent(cancellationReason)}&approver_recommendation=${encodeURIComponent(approverRecommendation)}`,// send recommendation
                });

                if (response.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: 'ยกเลิกคำร้องสำเร็จ!',
                        text: 'คำร้องถูกยกเลิกแล้ว',
                        confirmButtonText: 'ตกลง',
                        timer: 3000,
                        timerProgressBar: true,
                    }).then(() => {
                        window.location.href = "/cancelled_complaints"; // Redirect to cancelled complaints page
                    });
                } else {
                    const errorData = await response.json();
                    Swal.fire({
                        icon: 'error',
                        title: 'เกิดข้อผิดพลาด!',
                        text: `เกิดข้อผิดพลาด: ${errorData.detail || "ไม่สามารถยกเลิกคำร้องได้"}`,
                        confirmButtonText: 'ตกลง',
                    });
                }
            } catch (error) {
                console.error("Error cancelling complaint:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด!',
                    text: 'เกิดข้อผิดพลาดในการยกเลิกคำร้อง กรุณาลองใหม่อีกครั้ง',
                    confirmButtonText: 'ตกลง',
                });
            }
        }
    });
});

async function exportToPdf() {
    try {
        const exportButton = document.getElementById("export-pdf-btn");
        if (exportButton.classList.contains("btn-disabled")) {
            // ไม่ต้องทำอะไรถ้าปุ่มถูก disable (tooltip จะแสดงผลเอง)
            return;
        }
        Swal.fire({
            title: 'กำลังสร้าง PDF...',
            text: 'กรุณารอสักครู่',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const response = await fetch(`/admin/export-pdf/${complaintId}`, {
            method: 'POST', 
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
        });

        if (response.ok) {
            const blob = await response.blob();
            const filenameHeader = response.headers.get('Content-Disposition');
            let filename = `complaint_${complaintId}.pdf`; // Default filename
            if (filenameHeader) {
                const filenameMatch = filenameHeader.match(/filename="?([^"]+)"?/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            Swal.close();
            Swal.fire({
                icon: 'success',
                title: 'ดาวน์โหลด PDF สำเร็จ!',
                showConfirmButton: false,
                timer: 1500
            });
        } else {
            Swal.close();
            const errorData = await response.json().catch(() => ({ detail: 'ไม่สามารถสร้าง PDF ได้ กรุณาตรวจสอบว่าข้อมูลคำร้องสมบูรณ์' }));
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด!',
                text: `เกิดข้อผิดพลาดในการสร้าง PDF: ${errorData.detail}`,
                confirmButtonText: 'ตกลง',
            });
        }
    } catch (error) {
        Swal.close();
        console.error("Error exporting to PDF:", error);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด!',
            text: 'เกิดข้อผิดพลาดในการสร้าง PDF กรุณาลองใหม่อีกครั้ง',
            confirmButtonText: 'ตกลง',
        });
    }
}