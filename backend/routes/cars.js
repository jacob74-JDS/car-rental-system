// routes/cars.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/authMiddleware');
const uploadCarImage = require('../middleware/uploadMiddleware'); // If using image uploads

// GET all cars (with basic search/filter)
// Example: /api/cars?search=Toyota&status=available
router.get('/', async (req, res) => {
    const { search, status, make, model, minRate, maxRate } = req.query;
    let query = 'SELECT * FROM cars WHERE 1=1'; // Start with a true condition
    const queryParams = [];

    if (search) {
        query += ' AND (make LIKE ? OR model LIKE ? OR license_plate LIKE ?)';
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
    }
    if (status) {
        query += ' AND status = ?';
        queryParams.push(status);
    }
    if (make) {
        query += ' AND make LIKE ?';
        queryParams.push(`%${make}%`);
    }
    if (model) {
        query += ' AND model LIKE ?';
        queryParams.push(`%${model}%`);
    }
    if (minRate) {
        query += ' AND daily_rate >= ?';
        queryParams.push(parseFloat(minRate));
    }
    if (maxRate) {
        query += ' AND daily_rate <= ?';
        queryParams.push(parseFloat(maxRate));
    }
    query += ' ORDER BY created_at DESC';

    try {
        const [rows] = await db.query(query, queryParams);
        res.json(rows);
    } catch (err) {
        console.error("Error fetching cars:", err.message);
        res.status(500).send('Server Error');
    }
});

// GET a single car by ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM cars WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ msg: 'Car not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error("Error fetching car:", err.message);
        res.status(500).send('Server Error');
    }
});

// POST create a new car - Admin only
// If using image uploads, the route handler changes
router.post(
    '/',
    protect,
    authorize('admin'),
    // uploadCarImage, // Uncomment if using multer for direct upload
    async (req, res) => {
        // If using multer: req.file will contain image info, req.body for other fields
        // console.log('File for car upload:', req.file);
        // console.log('Body for car upload:', req.body);

        const { make, model, year, license_plate, daily_rate, status, image_url_manual } = req.body;

        if (!make || !model || !year || !license_plate || !daily_rate) {
            return res.status(400).json({ msg: 'Please include make, model, year, license plate, and daily rate' });
        }

        let finalImageUrl = image_url_manual || null; // If manually providing URL

        // If using multer for file upload:
        // if (req.file) {
        //     finalImageUrl = `/public/uploads/cars/${req.file.filename}`;
        // }

        try {
            const newCar = {
                make, model, year: parseInt(year), license_plate,
                daily_rate: parseFloat(daily_rate),
                status: status || 'available',
                image_url: finalImageUrl
            };
            const [result] = await db.query('INSERT INTO cars SET ?', newCar);
            // Fetch the newly created car to return it
            const [insertedCar] = await db.query('SELECT * FROM cars WHERE id = ?', [result.insertId]);
            res.status(201).json(insertedCar[0]);
        } catch (err) {
            console.error("Error creating car:", err.message);
            if (err.code === 'ER_DUP_ENTRY' && err.sqlMessage.includes('license_plate')) {
                return res.status(400).json({ msg: 'License plate already exists.' });
            }
            res.status(500).send('Server Error');
        }
    }
);


// PUT update a car - Admin only
router.put(
     '/:id',
     protect,
     authorize('admin'),
     // uploadCarImage, // If you allow image update
     async (req, res) => {
         const { make, model, year, license_plate, daily_rate, status, image_url_manual } = req.body;
         const carId = req.params.id;

         try {
             // Check if car exists
             const [existingCars] = await db.query('SELECT * FROM cars WHERE id = ?', [carId]);
             if (existingCars.length === 0) {
                 return res.status(404).json({ msg: 'Car not found' });
             }

             let finalImageUrl = existingCars[0].image_url; // Keep existing if not updated
             if (image_url_manual !== undefined) { // If manual URL is explicitly passed (even if empty string to clear it)
                 finalImageUrl = image_url_manual || null;
             }
             // If using multer for file upload:
             // if (req.file) {
             //     finalImageUrl = `/public/uploads/cars/${req.file.filename}`;
             //     // Optionally delete old image file here
             // }


             const fieldsToUpdate = {
                 make: make || existingCars[0].make,
                 model: model || existingCars[0].model,
                 year: year ? parseInt(year) : existingCars[0].year,
                 license_plate: license_plate || existingCars[0].license_plate,
                 daily_rate: daily_rate ? parseFloat(daily_rate) : existingCars[0].daily_rate,
                 status: status || existingCars[0].status,
                 image_url: finalImageUrl
             };

             await db.query('UPDATE cars SET ? WHERE id = ?', [fieldsToUpdate, carId]);
             const [updatedCar] = await db.query('SELECT * FROM cars WHERE id = ?', [carId]);
             res.json(updatedCar[0]);
         } catch (err) {
             console.error("Error updating car:", err.message);
             if (err.code === 'ER_DUP_ENTRY' && err.sqlMessage.includes('license_plate')) {
                 return res.status(400).json({ msg: 'License plate already exists for another car.' });
             }
             res.status(500).send('Server Error');
         }
     }
 );

// DELETE a car - Admin only
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        // Optionally, delete associated image file if stored locally before deleting DB record
        const [result] = await db.query('DELETE FROM cars WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: 'Car not found' });
        }
        res.json({ msg: 'Car removed' });
    } catch (err) {
        console.error("Error deleting car:", err.message);
         if (err.code === 'ER_ROW_IS_REFERENCED_2') { // Foreign key constraint (bookings exist)
             return res.status(400).json({ msg: 'Cannot delete car. It has existing bookings.' });
         }
        res.status(500).send('Server Error');
    }
});

module.exports = router;