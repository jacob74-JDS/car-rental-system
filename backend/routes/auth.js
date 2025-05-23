// car-rental-backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // Your database connection pool
const { protect } = require('../middleware/authMiddleware'); // For the "/me" route

// Utility to generate JWT
const generateToken = (id, role) => {
    // Ensure JWT_SECRET is loaded from .env
    if (!process.env.JWT_SECRET) {
        console.error("FATAL ERROR: JWT_SECRET is not defined in .env. Server cannot sign tokens securely.");
        // In a production environment, you might want to throw an error or prevent the server from starting.
        // For this example, jwt.sign will fail if JWT_SECRET is undefined, and the catch block will handle it.
    }
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d', // Token expiration (e.g., 30 days)
    });
};

// @route   POST api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
    console.log('POST /api/auth/register - Request Body:', req.body);
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        console.log('Registration validation failed: Missing required fields.');
        return res.status(400).json({ msg: 'Please enter all fields: name, email, password' });
    }

    try {
        // Check if user already exists
        console.log(`Checking database for existing user with email: ${email}`);
        const [existingUsers] = await db.query('SELECT email FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            console.log(`User with email ${email} already exists.`);
            return res.status(400).json({ msg: 'User already exists with this email' });
        }
        console.log(`No existing user found with email ${email}. Proceeding with registration.`);

        // Hash password
        console.log('Hashing provided password...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        console.log('Password hashed successfully.');

        // Determine role - default to 'customer' if not provided or invalid
        const validRoles = ['customer', 'admin'];
        const userRole = role && validRoles.includes(role.toLowerCase()) ? role.toLowerCase() : 'customer';
        console.log(`User role set to: ${userRole}`);

        // Insert user into database
        console.log('Inserting new user into the database...');
        const [result] = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, userRole]
        );
        const userId = result.insertId;
        console.log(`User inserted successfully. New User ID: ${userId}`);

        // Get the newly created user (without password) for the response
        console.log(`Fetching details for newly created user (ID: ${userId})...`);
        const [newUserRows] = await db.query('SELECT id, name, email, role FROM users WHERE id = ?', [userId]);
        console.log('Fetched new user data from DB:', newUserRows);

        if (newUserRows.length > 0) {
            const user = newUserRows[0];
            console.log('New user details:', user);
            console.log('Generating JWT for the new user...');
            const token = generateToken(user.id, user.role);
            console.log('JWT generated. Sending 201 response.');
            
            res.status(201).json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: token,
            });
        } else {
            // This indicates a serious issue if INSERT succeeded but SELECT failed
            console.error(`CRITICAL ERROR: User was inserted (ID: ${userId}) but could not be retrieved immediately.`);
            res.status(500).json({ msg: 'Error creating user: User record not found after insert.' });
        }

    } catch (err) {
        console.error('!!! ERROR DURING /auth/register PROCESS !!!:', err);
        if (err.code === 'ER_DUP_ENTRY') { // Specific check for MySQL duplicate entry
             return res.status(400).json({ msg: 'User already exists with this email (database constraint).' });
        }
        // Generic server error for other issues
        res.status(500).json({ msg: 'Server error during registration process.' });
    }
});


// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    console.log('POST /api/auth/login - Request Body:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
        console.log('Login validation failed: Missing email or password.');
        return res.status(400).json({ msg: 'Please provide email and password' });
    }

    try {
        // Check for user in the database
        console.log(`Attempting to find user in database with email: ${email}`);
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]); // Select all fields to get hashed password
        
        if (users.length === 0) {
            console.log(`Login attempt failed: No user found with email ${email}.`);
            return res.status(400).json({ msg: 'Invalid credentials (user not found)' });
        }
        const user = users[0];
        console.log(`User found: ID ${user.id}, Email: ${user.email}`);

        // Check password
        console.log(`Comparing provided password with stored hash for user ID: ${user.id}`);
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            console.log(`Password mismatch for user ID: ${user.id}.`);
            return res.status(400).json({ msg: 'Invalid credentials (password incorrect)' });
        }

        console.log(`Password matched for user ID: ${user.id}. Generating JWT...`);
        const token = generateToken(user.id, user.role);
        console.log('JWT generated. Sending 200 response.');

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: token,
        });

    } catch (err) {
        console.error('!!! ERROR DURING /auth/login PROCESS !!!:', err);
        res.status(500).json({ msg: 'Server error during login process.' });
    }
});

// @route   GET api/auth/me
// @desc    Get current logged-in user's details (requires token)
// @access  Private
router.get('/me', protect, (req, res) => {
    // req.user is populated by the 'protect' middleware after verifying the token
    console.log(`GET /api/auth/me request for user ID: ${req.user ? req.user.id : 'UNKNOWN (req.user not set)'}`);
    
    if (!req.user) { // This should ideally be caught by 'protect' middleware sending 401
        console.error("Error in /me route: req.user is undefined even after 'protect' middleware. This indicates an issue in middleware or token.");
        return res.status(500).json({ msg: "Server error: Authenticated user data not found." });
    }

    res.json({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
    });
});


module.exports = router;