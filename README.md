
Postman Setup:
Create a new "Collection" in Postman (e.g., "Car Rental API").
You can set up "Environment Variables" in Postman for baseURL (http://localhost:3001/api), customerToken, and adminToken to make requests easier. For now, we'll manually copy-paste tokens.
1. Register User:
Request Type: POST
URL: {{baseURL}}/auth/register (or http://localhost:3001/api/auth/register)
Body:
Select raw and choose JSON from the dropdown.
Example 1: Register a Customer
{
    "name": "Test Customer One",
    "email": "customer1@example.com",
    "password": "password123"
}
Use code with caution.
Json
Example 2: Register an Admin (if your logic allows direct role assignment, otherwise register as customer then update role in DB manually for testing)
{
    "name": "Admin User One",
    "email": "admin1@example.com",
    "password": "adminpassword",
    "role": "admin" 
}
Use code with caution.
Json
Action: Click "Send".
Expected Response (201 Created):
{
    "id": 1, // or some other ID
    "name": "Test Customer One",
    "email": "customer1@example.com",
    "role": "customer",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImN1c3RvbWVyIiwiaWF0IjoxNzA5NzMxNzE5LCJleHAiOjE3MTIzMjM3MTl9.xxxxxxxxxxxxxxxxxxxx" // A long JWT string
}
Use code with caution.
Json
Action: Copy the token value from the response for the customer. You'll need it for subsequent requests as this customer. Do the same if you registered an admin.
2. Login User:
Request Type: POST
URL: {{baseURL}}/auth/login
Body:
raw, JSON
Example: Login as the Customer created above
{
    "email": "customer1@example.com",
    "password": "password123"
}
Use code with caution.
Json
Action: Click "Send".
Expected Response (200 OK):
{
    "id": 1,
    "name": "Test Customer One",
    "email": "customer1@example.com",
    "role": "customer",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImN1c3RvbWVyIiwiaWF0IjoxNzA5NzMxNzU1LCJleHAiOjE3MTIzMjM3NTV9.yyyyyyyyyyyyyyyyyyyy" // A new token will be issued
}
Use code with caution.
Json
Action: Copy this new token. It's good practice to use the token from the login response.
3. Access Protected Route (e.g., Create Car - should fail for customer):
Request Type: POST
URL: {{baseURL}}/cars
Headers:
Add a new header:
Key: Authorization
Value: Bearer YOUR_CUSTOMER_TOKEN (Paste the token you copied from the customer's login/registration, prefixed with "Bearer " and a space).
Body:
raw, JSON
Example Car Data:
{
    "make": "Toyota",
    "model": "Camry",
    "year": 2023,
    "license_plate": "CUST-001",
    "daily_rate": 55.00,
    "status": "available"
}
Use code with caution.
Json
Action: Click "Send".
Expected Response (403 Forbidden):
{
    "msg": "User role 'customer' is not authorized to access this route"
}
Use code with caution.
Json
4. Access Protected Route (e.g., Create Car - should succeed for admin):
Action: First, Login as your admin user (e.g., admin1@example.com) using step 2 and get the admin's token.
Request Type: POST
URL: {{baseURL}}/cars
Headers:
Key: Authorization
Value: Bearer YOUR_ADMIN_TOKEN (Paste the admin's token).
Body:
raw, JSON
Example Car Data:
{
    "make": "Honda",
    "model": "Civic",
    "year": 2022,
    "license_plate": "ADM-CAR-01",
    "daily_rate": 50.00,
    "status": "available"
}
Use code with caution.
Json
Action: Click "Send".
Expected Response (201 Created):
{
    "id": 1, // or next available car ID
    "make": "Honda",
    "model": "Civic",
    "year": 2022,
    "license_plate": "ADM-CAR-01",
    "daily_rate": "50.00", // Note: may come back as string from DB
    "status": "available",
    // ... other fields like created_at, updated_at if your backend returns them
}
Use code with caution.
Json
5. Get My User Info:
Action: Use either the customer's token or the admin's token.
Request Type: GET
URL: {{baseURL}}/auth/me
Headers:
Key: Authorization
Value: Bearer YOUR_TOKEN (customer's or admin's)
Action: Click "Send".
Expected Response (200 OK):
If using customer token:
{
    "id": 1,
    "name": "Test Customer One",
    "email": "customer1@example.com",
    "role": "customer"
}
Use code with caution.
Json
If using admin token:
{
    "id": 2, // or admin's ID
    "name": "Admin User One",
    "email": "admin1@example.com",
    "role": "admin"
}
Use code with caution.
Json
6. Create a Booking (as customer):
Action: Ensure you have the customer's token. You also need a car_id of an existing, available car (e.g., the Honda Civic with ID 1 created by the admin).
Request Type: POST
URL: {{baseURL}}/bookings
Headers:
Key: Authorization
Value: Bearer YOUR_CUSTOMER_TOKEN
Body:
raw, JSON
Example Booking Data (assuming car ID 1 exists and is available):
{
    "car_id": 1,
    "start_date": "2025-07-10",
    "end_date": "2025-07-12",
    "total_cost": 100.00 
}
Use code with caution.
Json
(Note: Your backend logic for /api/bookings will use req.user.name for customer_name if you implemented it that way, so you don't need to send customer_name in the body here.)
Action: Click "Send".
Expected Response (201 Created):
{
    "id": 1, // booking ID
    "car_id": 1,
    "customer_name": "Test Customer One", // This should be from req.user.name
    "start_date": "2025-07-10T00:00:00.000Z", // Date format may vary
    "end_date": "2025-07-12T00:00:00.000Z",
    "total_cost": "100.00",
    "status": "pending" // or "confirmed" depending on your booking logic
    // ... other fields
}
Use code with caution.
Json
Check Database: Verify the car with id=1 now has its status changed to rented (if your booking logic handles this).
7. Get My Bookings (as customer):
Action: Use the customer's token.
Request Type: GET
URL: {{baseURL}}/bookings/mybookings
Headers:
Key: Authorization
Value: Bearer YOUR_CUSTOMER_TOKEN
Action: Click "Send".
Expected Response (200 OK):
An array of booking objects made by "Test Customer One".
[
    {
        "id": 1,
        "car_id": 1,
        "customer_name": "Test Customer One",
        "start_date": "2025-07-10T00:00:00.000Z",
        "end_date": "2025-07-12T00:00:00.000Z",
        "total_cost": "100.00",
        "status": "pending", // or "confirmed"
        "make": "Honda",    // Joined from cars table
        "model": "Civic",   // Joined from cars table
        "license_plate": "ADM-CAR-01" // Joined from cars table
        // ...
    }
    // ... other bookings by this customer
]
Use code with caution.
Json
8. (Optional) Get All Bookings (as admin):
Action: Use the admin's token.
Request Type: GET
URL: {{baseURL}}/bookings
Headers:
Key: Authorization
Value: Bearer YOUR_ADMIN_TOKEN
Action: Click "Send".
Expected Response (200 OK):
An array of all booking objects in the system.
Remember to replace YOUR_CUSTOMER_TOKEN and YOUR_ADMIN_TOKEN with the actual tokens you obtain from the login/registration responses. If any step fails with a 500 error, check your backend server console for detailed error messages. If you get a 401 or 403, it's likely an issue with the token or authorization logic.
 selam data as customer 
 post http://localhost:3001/api/auth/register
 {
  "name": "selam hora",
  "email": "selam@gmail.com",
  "password": "bash1234",
  "role": "customer"
}
responce
{
    "id": 8,
    "name": "selam hora",
    "email": "selam@gmail.com",
    "role": "customer",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OCwicm9sZSI6ImN1c3RvbWVyIiwiaWF0IjoxNzQ3OTEwMzY4LCJleHAiOjE3NTA1MDIzNjh9.DeGQ9FwRsXHpX3wgFQaqL_m7NO4AfRZtysqOJd-ONGI"
}
for login selam post http://localhost:3001/api/auth/login
requst 
{
  "email": "selam@gmail.com",
  "password": "bash1234"
}
responce
{
    "id": 8,
    "name": "selam hora",
    "email": "selam@gmail.com",
    "role": "customer",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OCwicm9sZSI6ImN1c3RvbWVyIiwiaWF0IjoxNzQ3OTEwNTY2LCJleHAiOjE3NTA1MDI1NjZ9.XOmECOek34D0QpV2fyxIXsep-gJOM4f1dYay3sqR6Rw"
}

for super admin data 
{
  "email": "superadmin@example.com",
  "password": "verysecureadminpassword"
}
response 
{
    "id": 5,
    "name": "Super Admin",
    "email": "superadmin@example.com",
    "role": "admin",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzQ3OTEwNzMzLCJleHAiOjE3NTA1MDI3MzN9.4KhujInGavSeBmqT7puVsdHe56E_4AIVDk7yRprhlog"
}
for cars avilablity 
get http://localhost:3001/api/cars
requst send 
responce 
    {
        "id": 4,
        "make": "Ford",
        "model": "Mustang",
        "year": 2024,
        "license_plate": "ADMIN-002",
        "daily_rate": "150.00",
        "status": "rented",
        "last_known_latitude": null,
        "last_known_longitude": null,
        "created_at": "2025-05-21T22:02:56.000Z",
        "updated_at": "2025-05-22T05:32:51.000Z",
        "image_url": null
    },
    {
        "id": 1,
        "make": "Toyota",
        "model": "Camry",
        "year": 2022,
        "license_plate": "DD-123-XYZ",
        "daily_rate": "50.00",
        "status": "available",
        "last_known_latitude": null,
        "last_known_longitude": null,
        "created_at": "2025-05-21T19:12:03.000Z",
        "updated_at": "2025-05-21T19:12:03.000Z",
        "image_url": null
    },
    {
        "id": 2,
        "make": "Honda",
        "model": "Civic",
        "year": 2021,
        "license_plate": "DD-456-ABC",
        "daily_rate": "45.00",
        "status": "available",
        "last_known_latitude": null,
        "last_known_longitude": null,
        "created_at": "2025-05-21T19:12:03.000Z",
        "updated_at": "2025-05-21T19:12:03.000Z",
        "image_url": null
    },
    {
        "id": 3,
        "make": "Ford",
        "model": "Explorer",
        "year": 2023,
        "license_plate": "DD-789-LMN",
        "daily_rate": "75.00",
        "status": "rented",
        "last_known_latitude": null,
        "last_known_longitude": null,
        "created_at": "2025-05-21T19:12:03.000Z",
    }


    to see all users 
    http://localhost:3001/api/users get 


    
    {
        "id": 1,
        "name": "Dave",
        "email": "dawit@gmail.com",
        "role": "customer"
    },
    {
        "id": 2,
        "name": "Test Customer",
        "email": "customer@example.com",
        "role": "customer"
    },
    {
        "id": 3,
        "name": "yakob",
        "email": "yakob@example.com",
        "role": "customer"
    },
    {
        "id": 4,
        "name": "kinde One",
        "email": "kinde@example.com",
        "role": "customer"
    },
    {
        "id": 5,
        "name": "Super Admin",
        "email": "superadmin@example.com",
        "role": "admin"
    },
    {
        "id": 6,
        "name": "remedan it",
        "email": "remedan@example.com",
        "role": "customer"
    },
    {
        "id": 7,
        "name": "yakob",
        "email": "yakob@gmail.com",
        "role": "customer"
    },
    {
        "id": 8,
        "name": "selam hora",
        "email": "selam@gmail.com",
        "role": "customer"
    }
