// js/auth.js
let currentUser = null; // Holds { id, name, email, role, token (optional here if always from localStorage) }

async function attemptLogin(email, password) {
    try {
        const data = await loginUser({ email, password }); // from api.js
        if (data.token) {
            localStorage.setItem('authToken', data.token);
            // Set currentUser from the login response directly
            currentUser = { id: data.id, name: data.name, email: data.email, role: data.role };
            console.log("Login successful, currentUser:", currentUser);
            updateUIAfterAuthStateChange(); // Notify UI to update
            return { success: true, user: currentUser };
        } else {
            throw new Error("Login successful, but no token received.");
        }
    } catch (error) {
        console.error("Login attempt failed:", error);
        logoutUser(); // Clear any partial auth state
        return { success: false, message: error.message || "Login failed due to an unknown error." };
    }
}

async function attemptRegister(name, email, password, role = 'customer') {
    try {
        const data = await registerUser({ name, email, password, role }); // from api.js
        if (data.token) {
            localStorage.setItem('authToken', data.token);
            currentUser = { id: data.id, name: data.name, email: data.email, role: data.role };
            console.log("Registration successful, currentUser:", currentUser);
            updateUIAfterAuthStateChange();
            return { success: true, user: currentUser };
        } else {
            throw new Error("Registration successful, but no token received.");
        }
    } catch (error) {
        console.error("Registration attempt failed:", error);
        logoutUser();
        return { success: false, message: error.message || "Registration failed due to an unknown error." };
    }
}

async function fetchAndSetCurrentUser() {
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            // getCurrentUser() from api.js sends the token in headers
            const userData = await getCurrentUser();
            currentUser = userData; // userData should be { id, name, email, role }
            console.log("Session restored, currentUser:", currentUser);
        } catch (error) {
            console.warn("Failed to fetch current user (token might be expired/invalid):", error.message);
            logoutUser(); // Important to clear invalid state
        }
    } else {
        currentUser = null;
    }
    updateUIAfterAuthStateChange(); // Always update UI based on current auth state
}

function logoutUser() {
    localStorage.removeItem('authToken');
    currentUser = null;
    console.log("User logged out.");
    updateUIAfterAuthStateChange();
    navigateToView('home'); // Or specific login page
}

function getToken() {
    return localStorage.getItem('authToken');
}

function isLoggedIn() {
    return !!getToken() && !!currentUser; // Check both token in storage and currentUser object
}

function isAdmin() {
    return isLoggedIn() && currentUser && currentUser.role === 'admin';
}

function getCurrentUserDetails() {
    return currentUser;
}