// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
// const bodyParser = require('body-parser'); // express.json() is preferred

const authRoutes = require('./routes/auth');
const carRoutes = require('./routes/cars');
const bookingRoutes = require('./routes/bookings');
 const userRoutes = require('./routes/users'); // If you create user management routes

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // To parse JSON bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded bodies

// Serve static files (like uploaded images)
app.use('/public', express.static('public')); // if /public/uploads/cars/image.png, access via http://localhost:3001/public/uploads/cars/image.png

// Define Routes
app.get('/', (req, res) => {
    res.send('Welcome to the Car Rental API V2!');
});
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/bookings', bookingRoutes);
 app.use('/api/users', userRoutes);


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));