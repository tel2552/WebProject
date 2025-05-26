// token-manager.js
/**
 * Retrieves the access token from local storage.
 * @returns {string|null} The access token or null if not found.
 */
export function getAccessToken() {
    return localStorage.getItem('access_token');
}

/**
 * Checks if an access token exists in local storage.
 * @returns {boolean} True if an access token exists, false otherwise.
 */
export function hasAccessToken() {
    return !!getAccessToken();
}

/**
 * Removes the access token from local storage.
 */
export function removeAccessToken() {
    localStorage.removeItem('access_token');
}

/**
 * Fetches data from a URL with the access token in the Authorization header.
 * @param {string} url - The URL to fetch data from.
 * @param {object} [options={}] - Optional fetch options.
 * @returns {Promise<object|null>} The fetched data or null if an error occurs.
 * @throws {Error} Throws an error if the fetch fails or the response is not ok.
 */
export async function fetchDataWithToken(url, options = {}) {
    const token = getAccessToken();
    if (!token) {
        console.error('No access token found.');
        return null;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const response = await fetch(url, {
        ...options,
        headers: {
            ...headers,
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch data');
    }

    return await response.json();
}

/**
 * Fetches user data from the server (both role and team).
 * @returns {Promise<object|null>} The user data or null if an error occurs.
 */
export async function getUserData() {
    const cachedData = localStorage.getItem('userData');
    if (cachedData) {
        return JSON.parse(cachedData);
    }

    try {
        // เรียก API ทั้งสองแบบพร้อมกัน
        const [roleData, teamData] = await Promise.all([
            fetchDataWithToken('/admin/get-userrole'),
            fetchDataWithToken('/admin/get-userteam')
        ]);

        if (roleData && teamData) {
            const userData = {
                role: roleData.role,
                team: teamData.team
            };
            // เก็บข้อมูลลง localStorage
            localStorage.setItem('userData', JSON.stringify(userData));
            return userData;
        }

        return null;
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

/**
 * Gets the user's role.
 * @returns {Promise<string|null>} The user's role or null if an error occurs.
 */
export async function getUserRole() {
    const userData = await getUserData();
    return userData ? userData.role : null;
}

/**
 * Gets the user's team.
 * @returns {Promise<string|null>} The user's team or null if an error occurs.
 */
export async function getUserTeam() {
    const userData = await getUserData();
    return userData ? userData.team : null;
}

