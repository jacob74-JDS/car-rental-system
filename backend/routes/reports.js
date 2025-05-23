
// routes/reports.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Report 1: Total Revenue Over a Period
// GET /api/reports/revenue?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/revenue', async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ msg: 'Please provide startDate and endDate parameters (YYYY-MM-DD)' });
    }

    try {
        // Sum total_cost for 'completed' or 'confirmed' bookings within the date range
        const [rows] = await db.query(
            `SELECT SUM(total_cost) AS totalRevenue
             FROM bookings
             WHERE status IN ('completed', 'confirmed') 
             AND created_at >= ? AND created_at <= ?`, // Or use start_date of booking if more relevant
            [startDate + ' 00:00:00', endDate + ' 23:59:59']
        );
        res.json(rows[0] || { totalRevenue: 0 });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Report 2: Most Popular Cars (by number of bookings)
// GET /api/reports/popular-cars?limit=5
router.get('/popular-cars', async (req, res) => {
    const limit = parseInt(req.query.limit) || 5; // Default to top 5

    try {
        const [rows] = await db.query(
            `SELECT c.id, c.make, c.model, c.license_plate, COUNT(b.id) AS bookingCount
             FROM cars c
             JOIN bookings b ON c.id = b.car_id
             WHERE b.status IN ('completed', 'confirmed') -- Consider which statuses count
             GROUP BY c.id, c.make, c.model, c.license_plate
             ORDER BY bookingCount DESC
             LIMIT ?`,
            [limit]
        );
        res.json(rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Report 3: Car Utilization Report (e.g., days rented vs. available in a period)
// This is more complex and might require daily snapshots or more detailed availability tracking.
// For a simpler version, let's show number of days each car was booked in a period.
// GET /api/reports/car-utilization?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/car-utilization', async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ msg: 'Please provide startDate and endDate parameters (YYYY-MM-DD)' });
    }
    try {
        // Calculate total days booked for each car within the period
        // DATEDIFF(LEAST(b.end_date, ?), GREATEST(b.start_date, ?)) + 1 gives days within range
        const [rows] = await db.query(
            `SELECT 
                c.id, 
                c.make, 
                c.model, 
                c.license_plate, 
                SUM(DATEDIFF(
                    LEAST(b.end_date, DATE(?)),  -- Use end of query period if booking extends beyond
                    GREATEST(b.start_date, DATE(?)) -- Use start of query period if booking starts before
                ) + 1) AS totalDaysBooked
             FROM cars c
             JOIN bookings b ON c.id = b.car_id
             WHERE b.status IN ('completed', 'confirmed')
               AND b.start_date <= DATE(?)  -- Booking overlaps with the end of the period
               AND b.end_date >= DATE(?)    -- Booking overlaps with the start of the period
             GROUP BY c.id, c.make, c.model, c.license_plate
             ORDER BY totalDaysBooked DESC`,
            [endDate, startDate, endDate, startDate] // Parameters for LEAST, GREATEST, and WHERE clause
        );
        res.json(rows);
    } catch (err) {
        console.error("Car Utilization Error:", err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;