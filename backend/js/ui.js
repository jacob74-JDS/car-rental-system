// js/ui.js
const mainViewContainer = document.getElementById('main-view-container');
const modalContainer = document.getElementById('modal-container');
const mainNavElement = document.querySelector('.main-nav');       // Changed to mainNavElement
const userActionsContainer = document.querySelector('.user-actions');

function displayMessageInModal(modalFormId, message, type = 'info', duration = 4000) {
    const formElement = document.getElementById(modalFormId);
    if (!formElement) {
        console.warn(`displayMessageInModal: Element with ID "${modalFormId}" not found.`);
        return;
    }
    // Find or create a message element within the form or its modal
    let messageEl = formElement.querySelector('.modal-form-message'); // Specific class for modal messages
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.className = 'modal-form-message message'; // Add 'message' for general styling
        // Try to insert it before the first button or at the end of the form
        const submitButton = formElement.querySelector('button[type="submit"]');
        if (submitButton) {
            formElement.insertBefore(messageEl, submitButton);
        } else {
            formElement.appendChild(messageEl);
        }
    }

    messageEl.textContent = message;
    messageEl.className = `modal-form-message message ${type}`; // Reset and apply type
    messageEl.style.display = 'block';

    if (duration > 0) {
        setTimeout(() => {
            if (messageEl) { // Check if still exists (modal might have closed)
                 messageEl.style.display = 'none';
                 messageEl.textContent = '';
            }
        }, duration);
    }
}


function updateUIAfterAuthStateChange() {
    if (!mainNavElement || !userActionsContainer) {
        console.error("Navigation elements not found in ui.js");
        return;
    }
    mainNavElement.innerHTML = ''; // Clear existing nav
    userActionsContainer.innerHTML = '';

    // Common links
    mainNavElement.innerHTML += `<li><a href="#" data-view="home">Dashboard</a></li>`;
    mainNavElement.innerHTML += `<li><a href="#" data-view="carsList">Available Cars</a></li>`;

    if (isLoggedIn()) {
        const user = getCurrentUserDetails();
        mainNavElement.innerHTML += `<li><a href="#" data-view="myBookings">My Bookings</a></li>`;
        if (isAdmin()) {
            mainNavElement.innerHTML += `<li><a href="#" data-view="adminCars">Manage Cars (Admin)</a></li>`;
            mainNavElement.innerHTML += `<li><a href="#" data-view="adminBookings">Manage Bookings (Admin)</a></li>`;
        }
        userActionsContainer.innerHTML = `
            <span class="user-greeting">Welcome, ${user.name}! (${user.role})</span>
            <button id="logout-btn" class="nav-button">Logout</button>
        `;
        document.getElementById('logout-btn').addEventListener('click', () => {
            logoutUser(); // from auth.js
        });
    } else {
        userActionsContainer.innerHTML = `
            <a href="#" data-view="login" class="nav-link">Login</a>
            <a href="#" data-view="register" class="nav-link">Register</a>
        `;
    }
    addNavEventListeners(); // from app.js
}

function renderCarCard(car) {
    const defaultImageUrl = 'assets/images/default-car.png'; // Make sure this asset exists
    // Construct full image URL if stored as relative path from backend's /public
    let imageUrl = car.image_url ? car.image_url : defaultImageUrl;
    if (car.image_url && !car.image_url.startsWith('http') && !car.image_url.startsWith('/public')) {
        imageUrl = API_BASE_URL.replace('/api', '') + (car.image_url.startsWith('/') ? '' : '/') + car.image_url;
    } else if (car.image_url && car.image_url.startsWith('/public')) {
         imageUrl = API_BASE_URL.replace('/api', '') + car.image_url;
    }


    let actionButtons = '';
    if (car.status === 'available' && isLoggedIn()) {
        actionButtons += `<button class="book-now-btn primary-btn">Book Now</button>`;
    } else if (car.status === 'available' && !isLoggedIn()) {
        actionButtons += `<button class="login-to-book-btn action-btn">Login to Book</button>`;
    }

    if (isAdmin()) {
        actionButtons += `<button class="edit-car-btn action-btn">Edit</button>`;
        actionButtons += `<button class="delete-car-btn danger-btn">Delete</button>`;
    }

    return `
        <div class="car-card" data-car-id="${car.id}">
            <img src="${imageUrl}" alt="${car.make} ${car.model}" onerror="this.onerror=null; this.src='${defaultImageUrl}';">
            <div class="car-card-body">
                <h3>${car.make} ${car.model} <span class="car-year">(${car.year})</span></h3>
                <p class="car-license">License: ${car.license_plate}</p>
                <p class="car-rate">Rate: <strong>$${parseFloat(car.daily_rate).toFixed(2)}</strong>/day</p>
                <p class="car-status">Status: <span class="status-badge status-${car.status.toLowerCase()}">${car.status}</span></p>
                <div class="car-actions">
                    ${actionButtons}
                </div>
            </div>
        </div>
    `;
}

function renderBookingCard(booking) {
    const user = getCurrentUserDetails(); // Get logged-in user details for comparison
    let actionButtons = '';

    if (isAdmin()) {
        actionButtons += `
            <div class="admin-booking-actions">
                <select class="booking-status-select">
                    <option value="pending" ${booking.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="confirmed" ${booking.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="completed" ${booking.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="cancelled" ${booking.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
                <button class="update-booking-status-btn primary-btn small-btn">Update Status</button>
            </div>`;
    }

    // Allow delete/cancel if admin OR if it's the user's own booking (backend enforces specific rules e.g. only pending)
    if (isLoggedIn() && (isAdmin() || (user && user.id === booking.user_id))) {
        actionButtons += `<button class="delete-booking-btn danger-btn small-btn">Cancel/Delete Booking</button>`;
    }

    return `
        <div class="booking-card" data-booking-id="${booking.id}">
            <h3>Booking ID: ${booking.id}</h3>
            <p><strong>Car:</strong> ${booking.make || 'N/A'} ${booking.model || ''} (Plate: ${booking.license_plate || 'N/A'})</p>
            <p><strong>Customer:</strong> ${booking.customer_actual_name || booking.customer_name || (user && booking.user_id === user.id ? user.name : 'N/A')}
               ${isAdmin() && booking.customer_email ? `(${booking.customer_email})` : ''}
            </p>
            <p><strong>Dates:</strong> ${new Date(booking.start_date).toLocaleDateString()} to ${new Date(booking.end_date).toLocaleDateString()}</p>
            <p><strong>Total Cost:</strong> $${parseFloat(booking.total_cost).toFixed(2)}</p>
            <p><strong>Status:</strong> <span class="status-badge status-${booking.status.toLowerCase()}">${booking.status}</span></p>
            <div class="booking-actions">
                ${actionButtons}
            </div>
        </div>
    `;
}

function openModal(title, contentHtml, modalId = 'generic-modal') {
    const existingModal = document.getElementById(modalId);
    if (existingModal) { // Remove if already exists to avoid duplicates
        existingModal.remove();
    }

    const modalDiv = document.createElement('div');
    modalDiv.id = modalId;
    modalDiv.className = 'modal-content-wrapper'; // For styling the content part
    modalDiv.innerHTML = `
        <button class="modal-close-btn" aria-label="Close modal">×</button>
        <h2>${title}</h2>
        ${contentHtml}
    `;
    modalContainer.innerHTML = ''; // Clear previous modal
    modalContainer.appendChild(modalDiv);
    modalContainer.classList.remove('hidden');

    // Add event listener to the new close button
    modalContainer.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    // Optional: Close modal if overlay is clicked
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) { // Clicked on overlay, not content
            closeModal();
        }
    });
}

function closeModal() {
    modalContainer.classList.add('hidden');
    modalContainer.innerHTML = ''; // Clear content
}