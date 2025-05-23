// js/app.js

// Store the current active view and its parameters for potential refresh
let currentView = { name: 'home', params: {} };

document.addEventListener('DOMContentLoaded', async () => {
    await fetchAndSetCurrentUser(); // Check for existing token and fetch user on load
    // Initial navigation based on URL hash or default
    const hash = window.location.hash.substring(1); // Remove #
    const [viewNameFromHash, paramsString] = hash.split('?');
    let initialParams = {};
    if (paramsString) {
        initialParams = Object.fromEntries(new URLSearchParams(paramsString));
    }

    if (viewNameFromHash && typeof window[`load${capitalizeFirstLetter(viewNameFromHash)}Page`] === 'function') {
        navigateToView(viewNameFromHash, initialParams);
    } else {
        navigateToView('home'); // Default view
    }
    addNavEventListeners(); // For nav links generated by updateUIAfterAuthStateChange
    window.addEventListener('hashchange', handleHashChange); // Listen for hash changes for navigation
});

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function handleHashChange() {
    const hash = window.location.hash.substring(1);
    const [viewNameFromHash, paramsString] = hash.split('?');
    let params = {};
    if (paramsString) {
        params = Object.fromEntries(new URLSearchParams(paramsString));
    }
    console.log("Hash changed, navigating to:", viewNameFromHash, "with params:", params);
    navigateToView(viewNameFromHash || 'home', params, false); // false to not update hash again
}

function navigateToView(viewName, params = {}, updateHash = true) {
    console.log(`Navigating to view: ${viewName} with params:`, params);
    currentView = { name: viewName, params: params }; // Store current view

    if (updateHash) {
        const paramString = new URLSearchParams(params).toString();
        window.location.hash = `${viewName}${paramString ? '?' + paramString : ''}`;
    }
    
    // Dynamically call the load function for the view
    const loadFunctionName = `load${capitalizeFirstLetter(viewName)}Page`;
    if (typeof window[loadFunctionName] === 'function') {
        window[loadFunctionName](params); // Call function from views.js (they are global)
    } else {
        console.warn("Unknown view or load function not found:", viewName, `(expected ${loadFunctionName})`);
        loadHomePage(); // Fallback to home
    }
}

function addNavEventListeners() {
    // Use event delegation on a stable parent for dynamically added links
    const navContainer = document.querySelector('.app-header'); // Or specific nav/user-actions containers
    if (!navContainer) return;

    navContainer.addEventListener('click', (e) => {
        const link = e.target.closest('a[data-view], button[data-view]');
        if (link && link.dataset.view) {
            e.preventDefault();
            const viewName = link.dataset.view;
            // For logout button, auth.js's logoutUser already calls navigateToView
            if (link.id !== 'logout-btn') { // Avoid double navigation for logout
                navigateToView(viewName);
            }
        }
    });
}

// --- Global Event Handlers for Forms (Called from views.js after forms are rendered) ---
async function handleLoginSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.querySelector('#login-email-main').value;
    const password = form.querySelector('#login-password-main').value;
    const messageElId = 'login-page-message'; // ID of the message div in the login form's HTML

    displayMessageInModal(form.id, 'Attempting login...', 'info', 0); // Use form's ID for message el

    const result = await attemptLogin(email, password); // from auth.js
    if (result.success) {
        displayMessageInModal(form.id, 'Login successful! Redirecting...', 'success');
        setTimeout(() => navigateToView('home'), 1000);
    } else {
        displayMessageInModal(form.id, result.message || 'Login failed. Please check your credentials.', 'error');
    }
}

async function handleRegisterSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.querySelector('#register-name-main').value;
    const email = form.querySelector('#register-email-main').value;
    const password = form.querySelector('#register-password-main').value;
    const messageElId = 'register-page-message';

    displayMessageInModal(form.id, 'Attempting registration...', 'info', 0);

    const result = await attemptRegister(name, email, password); // from auth.js
    if (result.success) {
        displayMessageInModal(form.id, 'Registration successful! Please login.', 'success');
        setTimeout(() => navigateToView('login'), 1500); // Redirect to login after registration
    } else {
        displayMessageInModal(form.id, result.message || 'Registration failed. Please try again.', 'error');
    }
}

// --- Car Card Event Listener Setup Function ---
function addCarCardEventListeners(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.warn(`Car card container not found: ${containerSelector}`);
        return;
    }

    // Remove old listeners if any (simple way, could be more targeted)
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);


    newContainer.addEventListener('click', async (e) => {
        const carCard = e.target.closest('.car-card');
        if (!carCard) return;
        const carId = carCard.dataset.carId;

        if (e.target.classList.contains('book-now-btn')) {
            if (!isLoggedIn()) {
                alert("Please log in to book a car.");
                navigateToView('login');
                return;
            }
            try {
                const car = await getCarById(carId);
                showAdminCarBookingModal(car); // Updated to a more generic name
            } catch (error) {
                alert(`Error fetching car details: ${error.message}`);
            }
        } else if (e.target.classList.contains('login-to-book-btn')) {
            alert("Please log in to book this car.");
            navigateToView('login');
        } else if (e.target.classList.contains('edit-car-btn')) {
            if (!isAdmin()) { alert("Access Denied."); return; }
            try {
                const car = await getCarById(carId);
                showAdminCarFormModal(car); // from ui.js or app.js for editing
            } catch (error) {
                alert(`Error fetching car details for edit: ${error.message}`);
            }
        } else if (e.target.classList.contains('delete-car-btn')) {
            if (!isAdmin()) { alert("Access Denied."); return; }
            if (confirm(`Are you sure you want to delete car ID ${carId}? This action cannot be undone.`)) {
                try {
                    await deleteCar(carId); // from api.js
                    alert('Car deleted successfully.');
                    // Refresh the current view if it displays cars
                    if (currentView.name === 'adminCars') loadAdminCarsPage();
                    else if (currentView.name === 'carsList') loadCarsListPage(currentView.params);
                    else if (currentView.name === 'home') loadHomePage();
                } catch (error) {
                    alert(`Error deleting car: ${error.message}`);
                }
            }
        }
    });
}

// --- Booking Card Event Listener Setup Function ---
function addBookingCardEventListeners(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.warn(`Booking card container not found: ${containerSelector}`);
        return;
    }
    // Remove old listeners (simple way)
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);

    newContainer.addEventListener('click', async (e) => {
        const bookingCard = e.target.closest('.booking-card');
        if (!bookingCard) return;
        const bookingId = bookingCard.dataset.bookingId;

        if (e.target.classList.contains('update-booking-status-btn')) {
            if (!isAdmin()) { alert("Access Denied."); return; }
            const statusSelect = bookingCard.querySelector('.booking-status-select');
            if (!statusSelect) return;
            const newStatus = statusSelect.value;
            if (confirm(`Update booking ${bookingId} to status "${newStatus}"?`)) {
                try {
                    await updateBookingAdmin(bookingId, { status: newStatus }); // from api.js
                    alert('Booking status updated successfully.');
                    if (currentView.name === 'adminBookings') loadAdminBookingsPage();
                    else if (currentView.name === 'myBookings') loadMyBookingsPage(); // If status affects user view
                } catch (error) {
                    alert(`Error updating booking status: ${error.message}`);
                }
            }
        } else if (e.target.classList.contains('delete-booking-btn')) {
            if (!isLoggedIn()) { alert("Please login."); navigateToView('login'); return; }
            // Backend will do final authorization check (customer vs admin rules)
            if (confirm(`Are you sure you want to cancel/delete booking ID ${bookingId}?`)) {
                try {
                    await deleteBooking(bookingId); // from api.js
                    alert('Booking deleted/cancelled successfully.');
                    if (currentView.name === 'adminBookings') loadAdminBookingsPage();
                    else if (currentView.name === 'myBookings') loadMyBookingsPage();
                } catch (error) {
                    alert(`Error deleting/cancelling booking: ${error.message}`);
                }
            }
        }
    });
}


// --- Modal Form Handlers (CRUD Operations) ---

// CAR FORM (ADD/EDIT) - Called by Admin
function showAdminCarFormModal(carToEdit = null) {
    const isEditing = !!carToEdit;
    const modalTitle = isEditing ? 'Edit Car Details' : 'Add New Car';
    const submitButtonText = isEditing ? 'Save Changes' : 'Add Car';

    const formHtml = `
        <form id="modal-admin-car-form">
            <input type="hidden" id="modal-car-id-admin" value="${isEditing ? carToEdit.id : ''}">
            <div class="form-group"><label for="modal-car-make-admin">Make:</label><input type="text" id="modal-car-make-admin" value="${carToEdit?.make || ''}" required></div>
            <div class="form-group"><label for="modal-car-model-admin">Model:</label><input type="text" id="modal-car-model-admin" value="${carToEdit?.model || ''}" required></div>
            <div class="form-group"><label for="modal-car-year-admin">Year:</label><input type="number" id="modal-car-year-admin" value="${carToEdit?.year || ''}" required></div>
            <div class="form-group"><label for="modal-car-license-admin">License Plate:</label><input type="text" id="modal-car-license-admin" value="${carToEdit?.license_plate || ''}" required></div>
            <div class="form-group"><label for="modal-car-rate-admin">Daily Rate:</label><input type="number" step="0.01" id="modal-car-rate-admin" value="${carToEdit?.daily_rate || ''}" required></div>
            <div class="form-group">
                <label for="modal-car-status-admin">Status:</label>
                <select id="modal-car-status-admin">
                    <option value="available" ${carToEdit?.status === 'available' ? 'selected' : ''}>Available</option>
                    <option value="rented" ${carToEdit?.status === 'rented' ? 'selected' : ''}>Rented</option>
                    <option value="maintenance" ${carToEdit?.status === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                </select>
            </div>
            <div class="form-group">
                <label for="modal-car-image-url-admin">Image URL:</label>
                <input type="text" id="modal-car-image-url-admin" value="${carToEdit?.image_url || ''}" placeholder="e.g., /public/uploads/cars/mycar.jpg">
            </div>
            <!-- For actual file upload, you would use type="file" and FormData -->
            <button type="submit" class="primary-btn">${submitButtonText}</button>
            <div id="modal-admin-car-message" class="modal-form-message message"></div>
        </form>
    `;
    openModal(modalTitle, formHtml, 'admin-car-modal');
    document.getElementById('modal-admin-car-form').addEventListener('submit', handleAdminCarFormSubmit);
}

async function handleAdminCarFormSubmit(event) {
    event.preventDefault();
    if (!isAdmin()) { alert("Unauthorized."); return; }

    const form = event.target;
    const carId = form.querySelector('#modal-car-id-admin').value;
    const isEditing = !!carId;
    const messageElId = 'modal-admin-car-message'; // Use this for displayMessageInModal

    // For URL based image, get it from the text input
    const carDataPayload = {
        make: form.querySelector('#modal-car-make-admin').value,
        model: form.querySelector('#modal-car-model-admin').value,
        year: parseInt(form.querySelector('#modal-car-year-admin').value),
        license_plate: form.querySelector('#modal-car-license-admin').value,
        daily_rate: parseFloat(form.querySelector('#modal-car-rate-admin').value),
        status: form.querySelector('#modal-car-status-admin').value,
        image_url_manual: form.querySelector('#modal-car-image-url-admin').value // Backend expects image_url_manual
    };

    // --- If using FormData for file upload (example, ensure api.js and backend match) ---
    // const formData = new FormData(form); // Simpler way to get all fields IF names match backend
    // const imageFile = form.querySelector('#your-file-input-id').files[0];
    // if (imageFile) formData.append('carImage', imageFile);
    // if (carId) formData.append('id', carId); // If editing
    // const payloadToSend = formData; // Then pass this to createCar/updateCar (ensure api.js sends as FormData)
    const payloadToSend = carDataPayload; // Using JSON payload for now

    displayMessageInModal(form.id, 'Processing...', 'info', 0);

    try {
        let savedCar;
        if (isEditing) {
            savedCar = await updateCar(carId, payloadToSend); // from api.js
            displayMessageInModal(form.id, `Car "${savedCar.make} ${savedCar.model}" updated successfully!`, 'success');
        } else {
            savedCar = await createCar(payloadToSend); // from api.js
            displayMessageInModal(form.id, `Car "${savedCar.make} ${savedCar.model}" added successfully!`, 'success');
        }
        setTimeout(() => {
            closeModal();
            if (currentView.name === 'adminCars') loadAdminCarsPage();
            else if (currentView.name === 'home') loadHomePage(); // Refresh if on dashboard
        }, 1500);
    } catch (error) {
        displayMessageInModal(form.id, error.message || 'Operation failed. Please check console.', 'error');
    }
}


// BOOKING FORM (CUSTOMER) - Called from Car Card 'Book Now'
function showAdminCarBookingModal(car) { // Renamed for clarity, was showBookingModal
    if (!car) {
        alert("Cannot book: Car details are missing.");
        return;
    }
    const loggedInUser = getCurrentUserDetails();
    if (!loggedInUser) {
        alert("Please login to make a booking.");
        navigateToView('login');
        return;
    }

    dailyRateForModalBooking = parseFloat(car.daily_rate); // Ensure this is set

    const formHtml = `
        <form id="modal-customer-booking-form">
            <h4>Car: ${car.make} ${car.model}</h4>
            <p>Daily Rate: $${dailyRateForModalBooking.toFixed(2)}</p>
            <input type="hidden" id="modal-booking-car-id-cust" value="${car.id}">
            <div class="form-group">
                <label for="modal-booking-customer-name-cust">Your Name (Booking As):</label>
                <input type="text" id="modal-booking-customer-name-cust" value="${loggedInUser.name}" required readonly>
            </div>
            <div class="form-group">
                <label for="modal-booking-start-date-cust">Start Date:</label>
                <input type="date" id="modal-booking-start-date-cust" required>
            </div>
            <div class="form-group">
                <label for="modal-booking-end-date-cust">End Date:</label>
                <input type="date" id="modal-booking-end-date-cust" required>
            </div>
            <p><strong>Total Estimated Cost: <span id="modal-booking-calculated-cost-cust">$0.00</span></strong></p>
            <input type="hidden" id="modal-booking-total-cost-hidden-cust">
            <button type="submit" class="primary-btn">Confirm Booking</button>
            <div id="modal-customer-booking-message" class="modal-form-message message"></div>
        </form>
    `;
    openModal(`Book: ${car.make} ${car.model}`, formHtml, 'customer-booking-modal');

    const startDateEl = document.getElementById('modal-booking-start-date-cust');
    const endDateEl = document.getElementById('modal-booking-end-date-cust');
    const costDisplayEl = document.getElementById('modal-booking-calculated-cost-cust');
    const costHiddenEl = document.getElementById('modal-booking-total-cost-hidden-cust');

    function updateBookingCostModal() {
        const start = startDateEl.value;
        const end = endDateEl.value;
        if (start && end) {
            const date1 = new Date(start);
            const date2 = new Date(end);
            if (date2 > date1) {
                const timeDiff = Math.abs(date2.getTime() - date1.getTime());
                // +1 because if you book for 1 day (e.g. 10th to 11th), it's 1 day rental.
                const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
                const totalCost = diffDays * dailyRateForModalBooking;
                costDisplayEl.textContent = `$${totalCost.toFixed(2)}`;
                costHiddenEl.value = totalCost.toFixed(2);
                return;
            }
        }
        costDisplayEl.textContent = '$0.00';
        costHiddenEl.value = '0';
    }
    startDateEl.addEventListener('change', updateBookingCostModal);
    endDateEl.addEventListener('change', updateBookingCostModal);
    updateBookingCostModal(); // Initial calculation

    document.getElementById('modal-customer-booking-form').addEventListener('submit', handleCustomerBookingFormSubmit);
}

async function handleCustomerBookingFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const messageElId = 'modal-customer-booking-message';
    displayMessageInModal(form.id, 'Submitting your booking...', 'info', 0);

    const bookingData = {
        car_id: parseInt(form.querySelector('#modal-booking-car-id-cust').value),
        start_date: form.querySelector('#modal-booking-start-date-cust').value,
        end_date: form.querySelector('#modal-booking-end-date-cust').value,
        total_cost: parseFloat(form.querySelector('#modal-booking-total-cost-hidden-cust').value),
        // user_id is automatically added by backend via token
    };

    if (bookingData.total_cost <= 0) {
        displayMessageInModal(form.id, 'Invalid booking period. Please select valid dates.', 'error');
        return;
    }

    try {
        const newBooking = await createBooking(bookingData); // from api.js
        displayMessageInModal(form.id, `Booking successful! Your Booking ID: ${newBooking.id}. Check "My Bookings".`, 'success');
        setTimeout(() => {
            closeModal();
            // Refresh views
            if (currentView.name === 'carsList') loadCarsListPage(currentView.params);
            if (currentView.name === 'home') loadHomePage();
            navigateToView('myBookings'); // Navigate to user's bookings page
        }, 2000);
    } catch (error) {
        displayMessageInModal(form.id, error.message || 'Booking failed. The car might no longer be available or there was a server issue.', 'error');
    }
}
// js/app.js

// ... (other functions like handleLoginSubmit, handleRegisterSubmit, etc.) ...

async function handleInlineAdminAddCarSubmit(event) {
    event.preventDefault();
    if (!isAdmin()) { // from auth.js
        alert("Unauthorized action. Admin access required.");
        return;
    }

    const form = event.target; // The form element itself
    const messageEl = form.querySelector('#inline-admin-add-car-message'); // Message div within this form

    // Function to display message specifically for this form
    function showInlineFormMessage(msg, type = 'info', duration = 4000) {
        if (!messageEl) return;
        messageEl.textContent = msg;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';
        if (duration > 0) {
            setTimeout(() => {
                if (messageEl) {
                    messageEl.style.display = 'none';
                    messageEl.textContent = '';
                }
            }, duration);
        }
    }

    showInlineFormMessage('Adding car to fleet...', 'info', 0); // No auto-hide for processing

    // For URL based image, get it from the text input
    const carDataPayload = {
        make: form.querySelector('#inline-car-make').value,
        model: form.querySelector('#inline-car-model').value,
        year: parseInt(form.querySelector('#inline-car-year').value),
        license_plate: form.querySelector('#inline-car-license').value,
        daily_rate: parseFloat(form.querySelector('#inline-car-rate').value),
        status: form.querySelector('#inline-car-status').value,
        image_url_manual: form.querySelector('#inline-car-image-url').value // Backend expects image_url_manual
    };

    // --- If using FormData for file upload (for the inline form) ---
    // const formData = new FormData(form); // This gets all fields from the form with 'name' attributes
    // // Ensure your input fields in the HTML have 'name' attributes matching backend expectations if using this.
    // // Example: <input type="text" id="inline-car-make" name="make" required>
    // const imageFile = form.querySelector('#inline-car-image-file')?.files[0];
    // if (imageFile) {
    //     formData.append('carImage', imageFile); // 'carImage' from multer middleware
    // } else {
    //     // If image_url_manual is a field in your FormData (from a text input with name="image_url_manual")
    //     // it will be included. If not, and you want to send it only if no file, add explicitly:
    //     if (!imageFile && form.querySelector('#inline-car-image-url').value) {
    //        formData.append('image_url_manual', form.querySelector('#inline-car-image-url').value);
    //     }
    // }
    // const payloadToSend = formData;
    const payloadToSend = carDataPayload; // Using JSON payload for now

    try {
        const newCar = await createCar(payloadToSend); // from api.js
        showInlineFormMessage(`Car "${newCar.make} ${newCar.model}" added successfully!`, 'success');
        form.reset(); // Reset the inline form fields

        // Refresh the list of existing cars on the same page
        // We can specifically target the existing cars container for update or reload the whole view
        const carsListContainer = document.getElementById('admin-cars-list-container');
        if (carsListContainer) {
            carsListContainer.innerHTML = '<p class="loading-text">Refreshing car list...</p>'; // Show loading
            const cars = await getCars();
            if (cars.length === 0) {
                carsListContainer.innerHTML = "<p>No cars currently in the system.</p>";
            } else {
                carsListContainer.innerHTML = cars.map(renderCarCard).join('');
                addCarCardEventListeners('#admin-cars-list-container'); // Re-attach listeners
            }
        }
        if(document.getElementById('dashboard-view')){ // Update dashboard stats if this view is the dashboard
             loadHomePage(); // Or a more targeted stats update function
        }


    } catch (error) {
        showInlineFormMessage(error.message || 'Failed to add car. Please check details and try again.', 'error');
    }
}

// The existing showAdminCarFormModal (for MODAL edit/add) and handleAdminCarFormSubmit
// can remain for editing cars when an "Edit" button on a car card is clicked.
// You would call showAdminCarFormModal(carToEdit) from the edit button's event listener.