// js/api.js
const API_BASE_URL = 'http://localhost:3001/api'; // Ensure your backend is running here

async function request(endpoint, method = 'GET', data = null, requiresAuth = false, isFormData = false) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {};

    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    const token = localStorage.getItem('authToken');
    if (requiresAuth && token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = { method, headers };

    if (data) {
        if (isFormData) {
            config.body = data; // FormData object
        } else if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
            config.body = JSON.stringify(data);
        }
    }

    try {
        const response = await fetch(url, config);
        // Try to parse JSON regardless of status, as error responses might also be JSON
        const responseData = await response.json().catch(() => ({ // Provide a default if JSON parsing fails (e.g. for empty 204 response)
            _rawResponse: response // Store raw response if parsing failed
        }));

        if (!response.ok) {
            const errorMessage = responseData.msg || responseData.message || `HTTP error! Status: ${response.status}`;
            console.error(`API Error (${response.status}) on ${method} ${url}:`, responseData);
            const error = new Error(errorMessage);
            error.status = response.status;
            error.data = responseData;
            throw error;
        }
        return responseData;
    } catch (error) {
        console.error(`Network or parsing error on ${method} ${url}:`, error);
        // Re-throw with a more generic message or the original one, including status if available
        const newError = new Error(error.message || 'A network error occurred. Please try again.');
        newError.status = error.status || 500; // Default to 500 if no status on error
        newError.data = error.data || {};
        throw newError;
    }
}

// --- Auth API ---
const loginUser = (credentials) => request('/auth/login', 'POST', credentials);
const registerUser = (userData) => request('/auth/register', 'POST', userData);
const getCurrentUser = () => request('/auth/me', 'GET', null, true);

// --- Cars API ---
const getCars = (queryParams = {}) => {
    const queryString = new URLSearchParams(queryParams).toString();
    return request(`/cars${queryString ? '?' + queryString : ''}`, 'GET');
};
const getCarById = (id) => request(`/cars/${id}`, 'GET');
// For createCar/updateCar with image file upload:
// const createCar = (formData) => request('/cars', 'POST', formData, true, true); // isFormData = true
// const updateCar = (id, formData) => request(`/cars/${id}`, 'PUT', formData, true, true); // isFormData = true
// For createCar/updateCar with image URL:
const createCar = (carData) => request('/cars', 'POST', carData, true);
const updateCar = (id, carData) => request(`/cars/${id}`, 'PUT', carData, true);
const deleteCar = (id) => request(`/cars/${id}`, 'DELETE', null, true);

// --- Bookings API ---
const createBooking = (bookingData) => request('/bookings', 'POST', bookingData, true);
const getMyBookings = () => request('/bookings/mybookings', 'GET', null, true);
const getAllBookingsAdmin = () => request('/bookings', 'GET', null, true); // Admin specific
const updateBookingAdmin = (id, statusData) => request(`/bookings/${id}`, 'PUT', statusData, true);
const deleteBooking = (id) => request(`/bookings/${id}`, 'DELETE', null, true); // Customer can delete their own (if rules allow) or admin