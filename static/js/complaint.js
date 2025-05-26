// static/js/complaint.js
'use strict';

// --- DOM Element References ---
// We'll get these inside DOMContentLoaded

// --- Data for Tooltips ---
const teamDescriptions = {
    "ด้านบุคลากร": "การร้องเรียนเกี่ยวกับบุคลากรของสถาบัน เช่น พฤติกรรมที่ไม่เหมาะสม การทุจริต หรือการประพฤติมิชอบในการปฏิบัติงาน",
    "การบริการงานวิจัย": "การร้องเรียนเกี่ยวกับการทำวิจัย เช่น การละเมิดจริยธรรมวิจัย การละเมิดลิขสิทธิ์ หรือความเดือดร้อนจากการให้บริการของสำนักวิจัยและพัฒนา",
    "การบริการวิชาการ": "การร้องเรียนจากผู้รับบริการวิชาการ เช่น บริษัทหรือหน่วยงาน ที่ได้รับผลกระทบจากบริการของสถาบัน เช่น พฤติกรรมของวิทยากรหรือผู้ให้บริการ",
    "การบริหารจัดการของ PIM": "การร้องเรียนเกี่ยวกับสภาพแวดล้อม ระบบสาธารณูปโภค อาคารสถานที่ ห้องเรียน เครือข่ายอินเทอร์เน็ต หรือกิจกรรมที่ส่งผลกระทบต่อชุมชนรอบข้าง",
    "การบริการแก่นักศึกษา": "การร้องเรียนเกี่ยวกับการรับนักศึกษา การเรียนการสอน การให้คำปรึกษา หรือพฤติกรรมของนักศึกษาที่ส่งผลกระทบต่อสถาบัน",
    "อื่นๆ": "เรื่องร้องเรียนที่ไม่เข้าข่ายประเภทอื่น ๆ ที่ระบุไว้",
    "": "กรุณาเลือกประเภทข้อร้องเรียนจากรายการ" // คำอธิบายสำหรับ default option
};

// --- Helper Functions ---

/**
 * Redirects the user to a predefined external site.
 */
function redirectToExternalSite() {
    window.location.href = "https://www.google.com/";
}

/**
 * Toggles the visibility and requirement of the details textarea and enables/disables the otherType input
 * based on the selected team.
 */
function toggleDetailsTextArea() {
    const teamSelect = document.querySelector('select[name="team"]');
    const detailsLabel = document.querySelector('label[for="details"]');
    const detailsTextArea = document.getElementById('details');
    const otherTypeInput = document.querySelector('input[name="otherType"]');

    if (!teamSelect || !detailsLabel || !detailsTextArea || !otherTypeInput) {
        console.warn("Required elements for toggling details not found.");
        return;
    }

    const isPersonnelTeam = teamSelect.value === "ด้านบุคลากร";
    const isOtherTeam = teamSelect.value === "อื่นๆ";

    // detailsLabel.classList.toggle('hidden', isPersonnelTeam);
    // detailsLabel.classList.toggle('visible', !isPersonnelTeam);
    // detailsTextArea.classList.toggle('hidden', isPersonnelTeam);
    // detailsTextArea.classList.toggle('visible', !isPersonnelTeam);
    // detailsTextArea.required = !isPersonnelTeam;

    otherTypeInput.disabled = !isOtherTeam;
    if (!isOtherTeam) {
        otherTypeInput.value = "";
    }
}

/**
 * Updates the tooltip text based on the selected team.
 */
function updateTeamTooltip() {
    const teamSelect = document.getElementById('team-select');
    const teamTooltip = document.getElementById('team-tooltip');

    if (!teamSelect || !teamTooltip) {
        console.warn("Team select or tooltip element not found.");
        return;
    }

    const selectedValue = teamSelect.value;
    const description = teamDescriptions[selectedValue] || "ไม่พบคำอธิบาย"; // Fallback
    teamTooltip.textContent = description;
}


// --- Main Initialization and Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const modal = document.getElementById("termsModal");
    const closeModalSpan = document.querySelector("#termsModal .close");
    const termsCheckbox = document.getElementById("termsAgree");
    const agreeBtn = document.getElementById("agreeBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const complaintForm = document.getElementById("complaint-form");
    const teamSelect = document.getElementById('team-select'); // ใช้ getElementById

    // --- Modal Logic ---
    if (modal && closeModalSpan && termsCheckbox && agreeBtn && cancelBtn) {
        modal.style.display = "block";
        closeModalSpan.onclick = function () {
            modal.style.display = "none";
            redirectToExternalSite();
        };
        cancelBtn.onclick = function () {
            modal.style.display = "none";
            redirectToExternalSite();
        };
        termsCheckbox.addEventListener("change", function () {
            agreeBtn.disabled = !this.checked;
            agreeBtn.classList.toggle("enabled", this.checked);
        });
        agreeBtn.onclick = function () {
            if (termsCheckbox.checked) {
                modal.style.display = "none";
            } else {
                Swal.fire('ข้อควรทราบ', 'กรุณายอมรับข้อกำหนดและเงื่อนไขก่อนดำเนินการต่อ', 'warning');
            }
        };
    } else {
        console.error("Modal elements not found. Modal functionality disabled.");
    }

    // --- Complaint Form Logic ---
    if (complaintForm) {
        complaintForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (modal && modal.style.display !== 'none' && !termsCheckbox.checked) {
                Swal.fire('ข้อควรทราบ', 'กรุณายอมรับข้อกำหนดและเงื่อนไขก่อนส่งข้อร้องเรียน', 'warning');
                return;
            }
            Swal.fire({ title: 'กำลังส่งเรื่องร้องเรียน...', html: 'กรุณารอสักครู่', allowEscapeKey: false, allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
            const formData = new FormData(complaintForm);
            const phone = formData.get("phonecontact")?.trim();
            const email = formData.get("mailcontact")?.trim();
            let combinedContact = '';
            if (phone && email) combinedContact = `โทรศัพท์: ${phone}, อีเมล: ${email}`;
            else if (phone) combinedContact = `โทรศัพท์: ${phone}`;
            else if (email) combinedContact = `อีเมล: ${email}`;
            formData.set("contact", combinedContact);
            const otherType = formData.get("otherType");
            const selectedTeam = formData.get("team");
            let details = formData.get("details") || "";
            if (selectedTeam === "อื่นๆ" && otherType && otherType.trim() !== "") {
                details += `\n(ประเภทอื่นๆ: ${otherType.trim()})`;
                formData.set("details", details);
            }
            try {
                const response = await fetch("/submit-complaint", { method: "POST", body: formData });
                Swal.close();
                if (response.ok) {
                    Swal.fire({ icon: 'success', title: 'ส่งเรื่องร้องเรียนเรียบร้อยแล้ว!', text: 'เราได้รับเรื่องร้องเรียนของคุณแล้ว', confirmButtonText: 'ตกลง', timer: 3000, timerProgressBar: true }).then(() => {
                        complaintForm.reset();
                        toggleDetailsTextArea();
                        updateTeamTooltip(); // อัปเดต tooltip หลัง reset form
                    });
                } else {
                    let errorText = 'เกิดข้อผิดพลาดในการส่งเรื่องร้องเรียน กรุณาลองใหม่อีกครั้ง';
                    try { const errorData = await response.json(); if (errorData && errorData.detail) errorText = errorData.detail; } catch (jsonError) {}
                    Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด!', text: errorText, confirmButtonText: 'ตกลง' });
                }
            } catch (error) {
                Swal.close();
                console.error("Form submission error:", error);
                Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด!', text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง', confirmButtonText: 'ตกลง' });
            }
        });
    } else {
        console.error("Complaint form not found.");
    }

    // --- Team Select Logic (รวม Tooltip) ---
    if (teamSelect) {
        // Initial calls on page load
        toggleDetailsTextArea();
        updateTeamTooltip(); // <<-- เรียกครั้งแรกเพื่อแสดง tooltip ของ default option
        // Add event listeners
        teamSelect.addEventListener('change', () => {
            toggleDetailsTextArea();
            updateTeamTooltip(); // <<-- เรียกเมื่อมีการเลือก option ใหม่
        });
    } else {
        console.warn("Team select dropdown not found.");
    }

}); // End of DOMContentLoaded
