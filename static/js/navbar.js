// navbar.js
import { getAccessToken, removeAccessToken, getUserData } from './token-manager.js'; // Import getUserData เพิ่ม

// --- Logout Function ---
const logoutLink = document.getElementById("logout-link");
if (logoutLink) {
    logoutLink.addEventListener("click", (event) => {
        event.preventDefault();
        logout();
    });
}

async function logout() {
    try {
        // ใช้ GET หรือ POST ตามที่ backend กำหนด, ถ้ามีการจัดการ session/token ฝั่ง server อาจจะใช้ POST
        const response = await fetch("/logout", { method: "GET" }); // หรือ POST
        // ไม่จำเป็นต้อง parse JSON ถ้า backend ไม่ได้ส่ง JSON กลับมาตอน logout สำเร็จ
        // const data = await response.json();

        if (response.ok) {
            // ลบข้อมูลที่เกี่ยวกับ user ออกจาก localStorage
            localStorage.removeItem("userData");
            // localStorage.removeItem("userRole"); // ไม่จำเป็นถ้าใช้ userData
            removeAccessToken(); // ลบ token

            Swal.fire({
                icon: "success",
                title: "ออกจากระบบเรียบร้อยแล้ว",
                showConfirmButton: false,
                timer: 1500,
            }).then(() => {
                window.location.href = "/login"; // ไปหน้า login
            });
        } else {
            // ลองอ่าน error message ถ้ามี
            let errorMessage = "ออกจากระบบไม่สำเร็จ";
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch (e) {
                // ไม่ใช่ JSON response
                errorMessage = `ออกจากระบบไม่สำเร็จ (HTTP ${response.status})`;
            }
            console.error("Logout failed:", errorMessage);
            Swal.fire({
                icon: "error",
                title: errorMessage,
                showConfirmButton: true,
            });
             // แม้จะ logout ไม่สำเร็จฝั่ง server ก็ควรลบ token ฝั่ง client
             removeAccessToken();
             localStorage.removeItem("userData");
             // อาจจะ redirect ไปหน้า login เลยก็ได้
             // window.location.href = "/login";
        }
    } catch (error) {
        console.error("Error during logout:", error);
        Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาดในการออกจากระบบ",
            text: "กรุณาลองใหม่อีกครั้ง",
            showConfirmButton: true,
        });
         // ลบ token และ cache เผื่อกรณี network error
         removeAccessToken();
         localStorage.removeItem("userData");
    }
}

// --- Navbar Toggle Function ---
function toggleNavbar() {
    const navbar = document.getElementById("navbar-container");
    const menuToggle = document.querySelector(".menu-toggle");

    if (!navbar || !menuToggle) return; // ป้องกัน error ถ้า element ไม่มี

    navbar.classList.toggle("show");

    menuToggle.textContent = navbar.classList.contains("show") ? "✖" : "☰";
}

// --- Hide Navbar on Link Click ---
document.querySelectorAll(".navbar a").forEach(link => {
    link.addEventListener("click", () => {
        const navbar = document.getElementById("navbar-container");
        const menuToggle = document.querySelector(".menu-toggle");
        if (navbar && menuToggle && navbar.classList.contains("show")) {
            navbar.classList.remove("show");
            menuToggle.textContent = "☰";
        }
    });
});

// --- DOMContentLoaded Event Listener ---
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Navbar script loaded successfully!");

    //แสดง Navbar ตอนโหลดหน้าเว็บ
    const navbar = document.getElementById("navbar-container");
    if (navbar) {
        navbar.classList.add("show");
    }

    // Add event listener for the toggle button
    const toggleButton = document.querySelector(".menu-toggle");
    if (toggleButton) {
        toggleButton.addEventListener("click", toggleNavbar);
    }

    // --- ตรวจสอบและซ่อนลิงก์ Admin Control ---
    const adminControlLink = document.getElementById('admin-control-link');
    if (adminControlLink) { // ตรวจสอบก่อนว่า element มีอยู่จริง
        try {
            console.log("Checking user role for Admin Control link...");
            const userData = await getUserData(); // เรียกใช้ getUserData() ที่ import มา
            if (userData && userData.role === 'admin' && 'superadmin') {
                // ถ้ามีข้อมูล และ role เป็น 'alladmin' ให้แสดงลิงก์
                adminControlLink.style.display = 'none'; // หรือ 'block', 'inline-block' ตาม default CSS
                console.log("Admin control link hidden for role:", userData.role);
            } else {
                // ถ้าไม่มีข้อมูล หรือ role ไม่ใช่ 'alladmin'
                    console.log("Your role is not in condition to Admin control link hidden.", userData.role);
                }
        } catch (error) {
            // กรณีเกิด error ตอนเรียก getUserData (เช่น token หมดอายุ หรือ network error)
            console.error("Error checking user role for navbar:", error);
        }
    } else {
        console.warn("Element with ID 'admin-control-link' not found.");
    }

    // --- ตรวจสอบและซ่อนลิงก์ superadmin control link ---
    const superadminControlLinks = document.querySelectorAll('.superadmin-control-link'); // ใช้ querySelectorAll เพราะอาจมีหลายลิงก์

    // ตรวจสอบว่ามี element ที่ต้องการควบคุมหรือไม่ ก่อนดำเนินการต่อ
    if (superadminControlLinks.length > 0) { // ตรวจสอบว่าหา element เจออย่างน้อย 1 อัน
        try {
            console.log("Checking user role for Superadmin Control links..."); // เปลี่ยน log message ให้ชัดเจน
            const userData = await getUserData(); // เรียกใช้ getUserData()
            if (userData && userData.role === 'superadmin') {
                // --- กรณีเป็น Superadmin: แสดงลิงก์ ---
                superadminControlLinks.forEach(link => {
                    link.style.display = 'none'; // ใช้ค่าว่างเพื่อให้แสดงผลตาม CSS เดิม (อาจจะเป็น block, inline-block, etc.)
                    // หรือกำหนด display ที่ต้องการโดยตรง เช่น 'block' หรือ 'inline-block'
                    // link.style.display = 'block';
                });
                console.log("Superadmin control links HIDDEN for role:", userData.role); // แก้ไข Log ให้ตรงกับการทำงาน
            } else {
                // กรณี fetch ข้อมูลไม่ได้ หรือไม่มี token
                console.log("Your role is not in condition to Superadmin control links HIDDEN.", userData.role); // แก้ไข Log ให้ตรงกับการทำงาน
                }
        } catch (error) {
            // --- กรณีเกิด Error ตอน fetch ข้อมูล: ซ่อนลิงก์ (เป็น Fallback) ---
            console.error("Error checking user role for navbar (superadmin links):", error); // Log error ให้ชัดเจน
            }
    } else {
        // --- กรณีไม่พบ Element ที่มี class นี้เลย ---
        console.warn("No elements with class 'superadmin-control-link' found on this page."); // แจ้งเตือนหากไม่เจอ element
    }
});
