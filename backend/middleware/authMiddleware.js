
// car-rental-backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // Assuming your db connection pool is here

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token (excluding password)
            const [rows] = await db.query('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);
            
            if (rows.length === 0) {
                return res.status(401).json({ msg: 'Not authorized, user not found' });
            }
            req.user = rows[0]; // Add user object to the request
            next();
        } catch (error) {
            console.error('Token verification failed:', error.message);
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ msg: 'Not authorized, token failed (invalid signature)' });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ msg: 'Not authorized, token expired' });
            }
            return res.status(401).json({ msg: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ msg: 'Not authorized, no token' });
    }
};

const authorize = (...roles) => { // Pass allowed roles as arguments
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ msg: `User role '${req.user ? req.user.role : 'guest'}' is not authorized to access this route` });
        }
        next();
    };
};

module.exports = { protect, authorize };