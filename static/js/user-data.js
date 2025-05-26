// async function getUserData() {
//     const cachedData = localStorage.getItem('userData');
//     if (cachedData) {
//         return JSON.parse(cachedData);
//     }

//     try {
//         const token = localStorage.getItem('access_token');
//         if (!token) {
//             console.error('No access token found.');
//             return null;
//         }

//         const response = await fetch('/admin/get-userrole', {
//             method: 'GET',
//             headers: {
//                 'Authorization': `Bearer ${token}`
//             }
//         });

//         if (response.ok) {
//             const data = await response.json();
//             localStorage.setItem('userData', JSON.stringify(data));
//             return data;
//         } else {
//             console.error('Failed to fetch user data:', response.statusText);
//             return null;
//         }
//     } catch (error) {
//         console.error('Error fetching user data:', error);
//         return null;
//     }
// }

// async function getUserRole() {
//     const userData = await getUserData();
//     return userData ? userData.role : null;
// }

// async function getUserTeam() {
//     const userData = await getUserData();
//     return userData ? userData.team : null;
// }
