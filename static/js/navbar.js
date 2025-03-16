// ฟังก์ชันเปิด-ปิด Navbar และเปลี่ยนไอคอน
function toggleNavbar() {
    const navbar = document.getElementById("navbar-container");
    const menuToggle = document.querySelector(".menu-toggle");

    navbar.classList.toggle("show");

    // เช็คว่าตอนนี้เมนูเปิดหรือปิด แล้วเปลี่ยนไอคอน
    if (navbar.classList.contains("show")) {
        menuToggle.innerHTML = "✖"; // เปลี่ยนเป็นไอคอนปิด
    } else {
        menuToggle.innerHTML = "☰"; // เปลี่ยนกลับเป็นไอคอนเมนู
    }
}

// ซ่อน Navbar เมื่อคลิกที่ลิงก์ และเปลี่ยนไอคอนกลับ
document.querySelectorAll(".navbar a").forEach(link => {
    link.addEventListener("click", () => {
        const navbar = document.getElementById("navbar-container");
        const menuToggle = document.querySelector(".menu-toggle");

        navbar.classList.remove("show");
        menuToggle.innerHTML = "☰"; // กลับเป็นไอคอนเมนู
    });
});

async function logout() {
    try {
        localStorage.removeItem("access_token");
        const response = await fetch("/logout", { method: "GET" });

        if (response.ok) {
            Swal.fire({
                icon: "success",
                title: "ออกจากระบบเรียบร้อยแล้ว",
                showConfirmButton: false,
                timer: 1500,
            }).then(() => {
                window.location.href = "/";
            });
        } else {
            const error = await response.json();
            Swal.fire({
                icon: "error",
                title: `Error: ${error.detail}`,
                showConfirmButton: true,
            });
        }
    } catch (error) {
        console.error("Error during logout:", error);
        Swal.fire({
            icon: "error",
            title: "Failed to logout",
            showConfirmButton: true,
        });
    }
}

async function checkUserRole() {
    const cachedRole = localStorage.getItem("userRole");
    const adminControlLink = document.getElementById("admin-control-link");
    if (!adminControlLink) return;

    if (cachedRole) {
        updateAdminControlLink(cachedRole);
        return;
    }

    try {
        const token = localStorage.getItem("access_token");
        if (!token) {
            adminControlLink.classList.add("hidden");
            return;
        }

        const response = await fetch("/admin/get-userrole", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
            const data = await response.json();
            const userRole = data.role;
            localStorage.setItem("userRole", userRole); // Cache the role
            updateAdminControlLink(userRole);
        } else {
            adminControlLink.classList.add("hidden");
            adminControlLink.removeEventListener("click", preventDefaultAndRedirect);
            adminControlLink.addEventListener("click", preventDefaultAndAlert);
        }
    } catch (error) {
        console.error("Error fetching user role:", error);
        adminControlLink.classList.add("hidden");
        adminControlLink.removeEventListener("click", preventDefaultAndRedirect);
        adminControlLink.addEventListener("click", preventDefaultAndAlert);
    }
}

function updateAdminControlLink(userRole) {
    const adminControlLink = document.getElementById("admin-control-link");
    if (userRole === "alladmin") {
        adminControlLink.classList.remove("hidden");
        adminControlLink.href = "/admin_control";
        adminControlLink.removeEventListener("click", preventDefaultAndAlert);
        adminControlLink.addEventListener("click", preventDefaultAndRedirect);
    } else {
        adminControlLink.classList.add("hidden");
        adminControlLink.removeEventListener("click", preventDefaultAndRedirect);
        adminControlLink.addEventListener("click", preventDefaultAndAlert);
    }
}


document.addEventListener("DOMContentLoaded", () => {
    console.log("Navbar script loaded successfully!");
    checkUserRole();
});

function preventDefaultAndRedirect(event) {
    event.preventDefault();
    window.location.href = document.getElementById("admin-control-link").href;
}

function preventDefaultAndAlert(event) {
    event.preventDefault();
    Swal.fire({
        icon: "warning",
        title: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้",
        showConfirmButton: true,
    });
}
