// routes/bookings.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET all bookings - Admin only
router.get('/', protect, authorize('admin'), async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT b.*, c.make, c.model, c.license_plate, u.name as customer_actual_name, u.email as customer_email
            FROM bookings b
            JOIN cars c ON b.car_id = c.id
            LEFT JOIN users u ON b.user_id = u.id  -- Join with users table
            ORDER BY b.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error("Error fetching all bookings (admin):", err.message);
        res.status(500).send('Server Error');
    }
});

// GET current user's bookings
router.get('/mybookings', protect, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT b.*, c.make, c.model, c.license_plate
            FROM bookings b
            JOIN cars c ON b.car_id = c.id
            WHERE b.user_id = ?
            ORDER BY b.start_date DESC
        `, [req.user.id]); // Use logged-in user's ID
        res.json(rows);
    } catch (err) {
        console.error("Error fetching my bookings:", err.message);
        res.status(500).send('Server Error');
    }
});


// GET a single booking by ID - Admin OR the user who made the booking
router.get('/:id', protect, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT b.*, c.make, c.model, c.license_plate, u.name as customer_actual_name
            FROM bookings b
            JOIN cars c ON b.car_id = c.id
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.id = ?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ msg: 'Booking not found' });
        }
        const booking = rows[0];

        if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
            return res.status(403).json({ msg: 'Not authorized to view this booking' });
        }
        res.json(booking);
    } catch (err) {
        console.error("Error fetching single booking:", err.message);
        res.status(500).send('Server Error');
    }
});

// POST create a new booking - Authenticated users
router.post('/', protect, async (req, res) => {
    const { car_id, start_date, end_date, total_cost } = req.body; // status is usually handled by logic
    const user_id = req.user.id; // Logged-in user's ID
    const customer_name_from_token = req.user.name; // For legacy customer_name field, if still used

    if (!car_id || !user_id || !start_date || !end_date || total_cost === undefined) {
        return res.status(400).json({ msg: 'Please include car_id, start_date, end_date, and total_cost' });
    }
    if (new Date(start_date) >= new Date(end_date)) {
        return res.status(400).json({ msg: 'End date must be after start date' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [carRows] = await connection.query('SELECT * FROM cars WHERE id = ? FOR UPDATE', [car_id]); // FOR UPDATE to lock row
        if (carRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ msg: 'Car not found' });
        }
        const car = carRows[0];
        if (car.status !== 'available') {
            await connection.rollback();
            return res.status(400).json({ msg: `Car ${car.make} ${car.model} is not available.` });
        }

        // Check for overlapping bookings (more robust check)
        const [overlappingBookings] = await connection.query(
            `SELECT id FROM bookings
             WHERE car_id = ? AND status IN ('pending', 'confirmed') AND NOT (end_date <= ? OR start_date >= ?)`,
            [car_id, start_date, end_date]
        );
        if (overlappingBookings.length > 0) {
            await connection.rollback();
            return res.status(400).json({ msg: 'Car is already booked for the selected dates or overlaps.' });
        }

        const newBooking = {
            car_id, user_id, customer_name: customer_name_from_token, // Store both if needed, or just user_id
            start_date, end_date,
            total_cost: parseFloat(total_cost),
            status: 'confirmed' // Or 'pending' if admin approval is needed
        };
        const [result] = await connection.query('INSERT INTO bookings SET ?', newBooking);

        // Update car status to 'rented'
        await connection.query('UPDATE cars SET status = "rented" WHERE id = ?', [car_id]);

        await connection.commit();
        // Fetch the created booking with joined details to return
        const [createdBooking] = await connection.query(`
             SELECT b.*, c.make, c.model, c.license_plate
             FROM bookings b
             JOIN cars c ON b.car_id = c.id
             WHERE b.id = ?`, [result.insertId]);
        res.status(201).json(createdBooking[0]);

    } catch (err) {
        await connection.rollback();
        console.error("Error creating booking:", err.message);
        res.status(500).send('Server Error during booking process');
    } finally {
        if (connection) connection.release();
    }
});

// PUT update a booking (e.g., status change by admin)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
    const { status } = req.body; // Admin can primarily change status
    const bookingId = req.params.id;

    if (!status) {
        return res.status(400).json({ msg: 'Please provide a status to update.' });
    }
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ msg: 'Invalid status value.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [bookingRows] = await connection.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        if (bookingRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ msg: 'Booking not found' });
        }
        const oldBooking = bookingRows[0];

        await connection.query('UPDATE bookings SET status = ? WHERE id = ?', [status, bookingId]);

        // If booking is 'completed' or 'cancelled', and car was 'rented' due to this booking,
        // check if car should become 'available' (no other 'confirmed' bookings for it)
        if ((status === 'completed' || status === 'cancelled') && oldBooking.status === 'confirmed') {
            const [otherConfirmedBookings] = await connection.query(
                "SELECT COUNT(*) as count FROM bookings WHERE car_id = ? AND status = 'confirmed' AND id != ?",
                [oldBooking.car_id, bookingId] // Exclude current booking if it's being changed
            );
            if (otherConfirmedBookings[0].count === 0) {
                await connection.query('UPDATE cars SET status = "available" WHERE id = ?', [oldBooking.car_id]);
            }
        } else if (status === 'confirmed' && oldBooking.status !== 'confirmed') {
             // If changing TO confirmed, ensure car is marked as rented
              await connection.query('UPDATE cars SET status = "rented" WHERE id = ?', [oldBooking.car_id]);
        }


        await connection.commit();
        const [updatedBooking] = await connection.query('SELECT * FROM bookings WHERE id = ?', [bookingId]); // Fetch updated
        res.json(updatedBooking[0]);

    } catch (err) {
        await connection.rollback();
        console.error("Error updating booking:", err.message);
        res.status(500).send('Server Error');
    } finally {
        if (connection) connection.release();
    }
});

// DELETE a booking - Admin or customer (if booking is 'pending' or similar rule)
router.delete('/:id', protect, async (req, res) => {
    const bookingId = req.params.id;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [bookingRows] = await connection.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        if (bookingRows.length === 0) {
            await connection.rollback(); return res.status(404).json({ msg: 'Booking not found' });
        }
        const bookingToDelete = bookingRows[0];

        // Authorization: Admin or the user who owns the booking
        if (req.user.role !== 'admin' && bookingToDelete.user_id !== req.user.id) {
            await connection.rollback();
            return res.status(403).json({ msg: 'Not authorized to delete this booking' });
        }
        // Optional: Add more rules e.g., customer can only delete if status is 'pending'
        // if (req.user.role === 'customer' && bookingToDelete.status !== 'pending') {
        //    await connection.rollback();
        //    return res.status(403).json({ msg: 'Customers can only cancel pending bookings.' });
        // }


        await connection.query('DELETE FROM bookings WHERE id = ?', [bookingId]);

        // If the deleted booking was 'confirmed', check if car should become 'available'
        if (bookingToDelete.status === 'confirmed') {
            const [otherConfirmedBookings] = await connection.query(
                "SELECT COUNT(*) as count FROM bookings WHERE car_id = ? AND status = 'confirmed'",
                [bookingToDelete.car_id]
            );
            if (otherConfirmedBookings[0].count === 0) {
                await connection.query('UPDATE cars SET status = "available" WHERE id = ?', [bookingToDelete.car_id]);
            }
        }
        await connection.commit();
        res.json({ msg: 'Booking removed successfully' });
    } catch (err) {
        await connection.rollback();
        console.error("Error deleting booking:", err.message);
        res.status(500).send('Server Error');
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;