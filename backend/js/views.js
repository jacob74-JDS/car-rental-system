// js/views.js

function showLoading(container = mainViewContainer) {
    container.innerHTML = `<section id="loading-view" class="view full-center"><p class="loading-text">Loading...</p></section>`;
}
function displayErrorView(message, container = mainViewContainer) {
    container.innerHTML = `<section class="view full-center"><p class="message error">${message}</p></section>`;
}

// --- HOME / DASHBOARD VIEW ---
async function loadHomePage() {
    showLoading();
    const user = getCurrentUserDetails();
    let dashboardHtml = `
        <section id="dashboard-view" class="view">
            <h1>${user ? `Welcome, ${user.name}!` : 'Welcome to Awesome Car Rentals!'}</h1>
            <div class="search-bar-container main-search">
                <input type="text" id="home-search-input" placeholder="Search by make, model...">
                <button id="home-search-btn" class="primary-btn">Search Cars</button>
            </div>`;

    if (isAdmin()) {
        try {
            const cars = await getCars();
            const bookings = await getAllBookingsAdmin(); // Admin gets all
            dashboardHtml += `
                <div class="admin-dashboard-stats">
                    <div class="stat-card"><h3>Total Cars</h3><p>${cars.length}</p></div>
                    <div class="stat-card"><h3>Available Cars</h3><p>${cars.filter(c => c.status === 'available').length}</p></div>
                    <div class="stat-card"><h3>Active Bookings</h3><p>${bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length}</p></div>
                </div>`;
        } catch (e) {
            dashboardHtml += `<p class="message error">Could not load admin dashboard statistics.</p>`;
        }
    } else if (isLoggedIn()) {
        dashboardHtml += `<p>Use the navigation to find available cars or view your bookings.</p>`;
    } else {
        dashboardHtml += `<p>Please <a href="#" data-view="login">login</a> or <a href="#" data-view="register">register</a> to book a car.</p>`;
    }

    dashboardHtml += `<h2>Featured Cars</h2><div id="featured-cars-container" class="cars-grid">Loading featured cars...</div></section>`;
    mainViewContainer.innerHTML = dashboardHtml;

    document.getElementById('home-search-btn')?.addEventListener('click', () => {
        const searchTerm = document.getElementById('home-search-input').value;
        navigateToView('carsList', { search: searchTerm });
    });

    try {
        const featuredCars = await getCars({ status: 'available', _limit: 4 }); // Assuming backend supports _limit or similar
        const featuredContainer = document.getElementById('featured-cars-container');
        if (featuredCars.length > 0) {
            featuredContainer.innerHTML = featuredCars.map(renderCarCard).join('');
            addCarCardEventListeners('#featured-cars-container');
        } else {
            featuredContainer.innerHTML = "<p>No featured cars available at the moment.</p>";
        }
    } catch (error) {
        document.getElementById('featured-cars-container').innerHTML = `<p class="message error">Could not load featured cars.</p>`;
    }
}

// --- CARS LISTING VIEW (for customers) ---
async function loadCarsListPage(queryParams = {}) {
    showLoading();
    const currentSearch = queryParams.search || '';
    const currentStatus = queryParams.status || '';

    mainViewContainer.innerHTML = `
        <section id="cars-list-view" class="view">
            <h1>Our Vehicle Fleet</h1>
            <div class="filters-container">
                <input type="text" id="cars-search-input-filter" placeholder="Search make, model..." value="${currentSearch}">
                <select id="cars-status-filter-select">
                    <option value="">All Statuses</option>
                    <option value="available" ${currentStatus === 'available' ? 'selected' : ''}>Available</option>
                    <!-- Customers typically only care about available cars -->
                </select>
                <button id="cars-apply-filter-btn" class="primary-btn">Apply Filters</button>
            </div>
            <div id="cars-list-grid-container" class="cars-grid"></div>
        </section>
    `;

    document.getElementById('cars-apply-filter-btn').addEventListener('click', () => {
        const search = document.getElementById('cars-search-input-filter').value;
        const status = document.getElementById('cars-status-filter-select').value;
        loadCarsListPage({ search, status });
    });

    try {
        const cars = await getCars(queryParams);
        const container = document.getElementById('cars-list-grid-container');
        if (cars.length === 0) {
            container.innerHTML = "<p>No cars found matching your criteria.</p>";
        } else {
            container.innerHTML = cars.map(renderCarCard).join('');
            addCarCardEventListeners('#cars-list-grid-container');
        }
    } catch (error) {
        displayErrorView(`Failed to load cars: ${error.message}`, document.getElementById('cars-list-grid-container'));
    }
}

// --- LOGIN VIEW ---
function loadLoginPage() {
    if (isLoggedIn()) { navigateToView('home'); return; } // Redirect if already logged in
    mainViewContainer.innerHTML = `
        <section id="login-page-view" class="view auth-form-container">
            <h2>Login to Your Account</h2>
            <form id="login-form-main">
                <div class="form-group">
                    <label for="login-email-main">Email Address:</label>
                    <input type="email" id="login-email-main" required autocomplete="email">
                </div>
                <div class="form-group">
                    <label for="login-password-main">Password:</label>
                    <input type="password" id="login-password-main" required autocomplete="current-password">
                </div>
                <button type="submit" class="primary-btn full-width-btn">Login</button>
                <div id="login-page-message" class="message"></div>
            </form>
            <p class="auth-switch">Don't have an account? <a href="#" data-view="register">Register here</a></p>
        </section>
    `;
    document.getElementById('login-form-main').addEventListener('submit', handleLoginSubmit); // from app.js
    addNavEventListeners(); // For the "Register here" link
}

// --- REGISTER VIEW ---
function loadRegisterPage() {
    if (isLoggedIn()) { navigateToView('home'); return; }
    mainViewContainer.innerHTML = `
        <section id="register-page-view" class="view auth-form-container">
            <h2>Create Your Account</h2>
            <form id="register-form-main">
                <div class="form-group">
                    <label for="register-name-main">Full Name:</label>
                    <input type="text" id="register-name-main" required autocomplete="name">
                </div>
                <div class="form-group">
                    <label for="register-email-main">Email Address:</label>
                    <input type="email" id="register-email-main" required autocomplete="email">
                </div>
                <div class="form-group">
                    <label for="register-password-main">Password:</label>
                    <input type="password" id="register-password-main" required autocomplete="new-password">
                </div>
                <!-- Role selection could be here if admin registers users with roles -->
                <button type="submit" class="primary-btn full-width-btn">Register</button>
                <div id="register-page-message" class="message"></div>
            </form>
            <p class="auth-switch">Already have an account? <a href="#" data-view="login">Login here</a></p>
        </section>
    `;
    document.getElementById('register-form-main').addEventListener('submit', handleRegisterSubmit); // from app.js
    addNavEventListeners(); // For the "Login here" link
}

// --- ADMIN: MANAGE CARS VIEW ---
async function loadAdminCarsPage() {
    if (!isAdmin()) {
        displayErrorView("Access Denied: You must be an admin to view this page.");
        navigateToView('home'); // Or a specific access denied page
        return;
    }
    showLoading();
    mainViewContainer.innerHTML = `
        <section id="admin-cars-view" class="view">
            <div class="view-header">
                <h2>Manage Cars (Admin)</h2>
                <button id="show-add-car-modal-btn" class="primary-btn">Add New Car</button>
            </div>
            <div id="admin-cars-list-container" class="cars-grid"></div>
        </section>
    `;
    document.getElementById('show-add-car-modal-btn').addEventListener('click', () => showAdminCarFormModal()); // from app.js

    try {
        const cars = await getCars(); // Admin gets all cars, no filters by default
        const container = document.getElementById('admin-cars-list-container');
        if (cars.length === 0) {
            container.innerHTML = "<p>No cars found in the system. Add one!</p>";
        } else {
            container.innerHTML = cars.map(renderCarCard).join('');
            addCarCardEventListeners('#admin-cars-list-container'); // from app.js
        }
    } catch (error) {
        displayErrorView(`Failed to load cars for admin: ${error.message}`, document.getElementById('admin-cars-list-container'));
    }
}

// --- MY BOOKINGS VIEW (Customer) ---
async function loadMyBookingsPage() {
    if (!isLoggedIn()) {
        displayErrorView("Please login to view your bookings.");
        navigateToView('login');
        return;
    }
    showLoading();
    mainViewContainer.innerHTML = `
        <section id="my-bookings-view" class="view">
            <h2>My Bookings</h2>
            <div id="my-bookings-grid-container" class="bookings-grid"></div>
        </section>
    `;
    try {
        const bookings = await getMyBookings(); // from api.js
        const container = document.getElementById('my-bookings-grid-container');
        if (bookings.length === 0) {
            container.innerHTML = "<p>You haven't made any bookings yet.</p>";
        } else {
            container.innerHTML = bookings.map(renderBookingCard).join('');
            addBookingCardEventListeners('#my-bookings-grid-container'); // from app.js
        }
    } catch (error) {
        displayErrorView(`Failed to load your bookings: ${error.message}`, document.getElementById('my-bookings-grid-container'));
    }
}

// --- ADMIN: MANAGE ALL BOOKINGS VIEW ---
async function loadAdminBookingsPage() {
    if (!isAdmin()) {
        displayErrorView("Access Denied: You must be an admin to view this page.");
        navigateToView('home');
        return;
    }
    showLoading();
    mainViewContainer.innerHTML = `
        <section id="admin-bookings-view" class="view">
            <h2>Manage All Bookings (Admin)</h2>
            <div id="admin-bookings-grid-container" class="bookings-grid"></div>
        </section>
    `;
    try {
        const bookings = await getAllBookingsAdmin(); // from api.js
        const container = document.getElementById('admin-bookings-grid-container');
        if (bookings.length === 0) {
            container.innerHTML = "<p>There are no bookings in the system currently.</p>";
        } else {
            container.innerHTML = bookings.map(renderBookingCard).join('');
            addBookingCardEventListeners('#admin-bookings-grid-container'); // from app.js
        }
    } catch (error) {
        displayErrorView(`Failed to load all bookings for admin: ${error.message}`, document.getElementById('admin-bookings-grid-container'));
    }
}
// js/views.js

// ... (other view functions like showLoading, displayErrorView, loadHomePage etc.) ...

// --- ADMIN: MANAGE CARS VIEW ---
async function loadAdminCarsPage() {
    if (!isAdmin()) { // from auth.js
        displayErrorView("Access Denied: You must be an admin to view this page.");
        navigateToView('home'); // Or a specific access denied page
        return;
    }
    showLoading(); // from ui.js or views.js

    // HTML for the Add New Car form
    const addNewCarFormHtml = `
        <div class="add-car-form-container card">
            <h3>Add New Car to Fleet</h3>
            <form id="inline-admin-add-car-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="inline-car-make">Make:</label>
                        <input type="text" id="inline-car-make" required>
                    </div>
                    <div class="form-group">
                        <label for="inline-car-model">Model:</label>
                        <input type="text" id="inline-car-model" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="inline-car-year">Year:</label>
                        <input type="number" id="inline-car-year" required>
                    </div>
                    <div class="form-group">
                        <label for="inline-car-license">License Plate:</label>
                        <input type="text" id="inline-car-license" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="inline-car-rate">Daily Rate ($):</label>
                        <input type="number" step="0.01" id="inline-car-rate" required>
                    </div>
                    <div class="form-group">
                        <label for="inline-car-status">Initial Status:</label>
                        <select id="inline-car-status">
                            <option value="available" selected>Available</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="rented">Rented (Unusual for new car)</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="inline-car-image-url">Image URL (Optional):</label>
                    <input type="text" id="inline-car-image-url" placeholder="e.g., /public/uploads/cars/mycar.jpg or https://...">
                </div>
                <!-- For actual file upload, you would use type="file" and FormData -->
                <!--
                <div class="form-group">
                    <label for="inline-car-image-file">Upload Image (Optional):</label>
                    <input type="file" id="inline-car-image-file" accept="image/*">
                </div>
                -->
                <button type="submit" class="primary-btn">Add Car to Fleet</button>
                <div id="inline-admin-add-car-message" class="message" style="margin-top: 10px;"></div>
            </form>
        </div>
    `;

    mainViewContainer.innerHTML = `
        <section id="admin-cars-view" class="view">
            <div class="view-header">
                <h2>Manage Cars (Admin)</h2>
                <!-- The "Add New Car" button could toggle visibility of the form below,
                     or the form can always be visible. For simplicity, always visible here. -->
            </div>
            ${addNewCarFormHtml}
            <hr style="margin: 30px 0;">
            <h3>Existing Cars in Fleet</h3>
            <div id="admin-cars-list-container" class="cars-grid">
                <p class="loading-text">Loading existing cars...</p>
            </div>
        </section>
    `;

    // Add event listener to the newly created inline form
    document.getElementById('inline-admin-add-car-form').addEventListener('submit', handleInlineAdminAddCarSubmit);

    // Load and display existing cars
    try {
        const cars = await getCars(); // from api.js - Admin gets all cars
        const container = document.getElementById('admin-cars-list-container');
        if (cars.length === 0) {
            container.innerHTML = "<p>No cars currently in the system. Add one using the form above!</p>";
        } else {
            container.innerHTML = cars.map(renderCarCard).join(''); // from ui.js
            addCarCardEventListeners('#admin-cars-list-container'); // from app.js (for edit/delete buttons on cards)
        }
    } catch (error) {
        displayErrorView(`Failed to load existing cars: ${error.message}`, document.getElementById('admin-cars-list-container'));
    }
}