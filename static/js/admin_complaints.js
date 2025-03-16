// admin_complaints.js
async function fetchComplaints() {
    try {
        const response = await fetch("/admin/get-complaints");
        const complaints = await response.json();

        const tableBody = document.getElementById("complaints-table");
        tableBody.innerHTML = ""; // Clear existing rows

        // Fetch user role and team
        const userRole = await getUserRole();
        const userTeam = await getUserTeam();

        complaints.forEach(complaint => {
            // Show only "Pending" complaints
            if (complaint.status === "Pending") {
                // Filter by team if user is "admin"
                if (userRole === "admin" && complaint.team !== userTeam) {
                    return; // Skip to the next complaint
                }

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${complaint.title}</td>
                    <td>${complaint.details}</td>
                    <td>${complaint.name}</td>
                    <td>${complaint.date}</td>
                    <td>${complaint.contact}</td>
                    <td>${complaint.team}</td>
                    <td class="status ${complaint.status === 'Admit' ? 'status-admit' : 'status-pending'}">
                        ${complaint.status}
                    </td>
                    <td>
                        <form action="/admin/admit-complaint/${complaint._id}" method="get">
                            <button type="submit" class="btn btn-success">Mark as Admit</button>
                        </form>
                    </td>
                `;

                tableBody.appendChild(row);
            }
        });
        // Sort the table after loading data
        sortTable();
    } catch (error) {
        console.error("Failed to fetch complaints:", error);
    }
}

async function sortTable() {
    const table = document.getElementById("complaints-table");
    const rows = Array.from(table.rows);
    const sortOrder = document.getElementById("sort-options").value;

    rows.sort((a, b) => {
        const dateA = new Date(a.cells[3].textContent); // คอลัมน์วันที่
        const dateB = new Date(b.cells[3].textContent);

        return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    table.innerHTML = ""; // ล้างตารางก่อนแสดงผลใหม่
    rows.forEach(row => table.appendChild(row));
}

fetchComplaints();
