document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const response = await fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData.toString()
    });
    const result = await response.json();
    // const token = data.access_token;
    if (response.ok) {
        localStorage.setItem("access_token", result.token);
        window.location.href = result.redirect_url; // Redirect to the new URL
    } else {
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด!',
            text: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
            confirmButtonText: 'ตกลง',
        });
    }
});