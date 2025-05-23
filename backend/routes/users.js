
// car-rental-backend/routes/users.js (or a new admin.js)
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/authMiddleware');

// @route   PUT api/users/promote/:userId
// @desc    Promote a user to admin
// @access  Private (Admin only)
router.put('/promote/:userId', protect, authorize('admin'), async (req, res) => {
    const userIdToPromote = req.params.userId;

    try {
        const [users] = await db.query('SELECT id, role FROM users WHERE id = ?', [userIdToPromote]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (users[0].role === 'admin') {
            return res.status(400).json({ msg: 'User is already an admin' });
        }

        const [result] = await db.query('UPDATE users SET role = "admin" WHERE id = ?', [userIdToPromote]);

        if (result.affectedRows === 0) {
            // Should not happen if user was found earlier
            return res.status(500).json({ msg: 'Failed to update user role, user might have been deleted concurrently' });
        }

        res.json({ msg: 'User successfully promoted to admin', userId: userIdToPromote });

    } catch (err) {
        console.error('Error promoting user:', err.message);
        res.status(500).json({ msg: 'Server error while promoting user' });
    }
});

// (Optional: Endpoint to list users for admin to select from)
router.get('/', protect, authorize('admin'), async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, name, email, role FROM users');
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});


module.exports = router;