// middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');
 // Set storage engine
 const storage = multer.diskStorage({
     destination: './public/uploads/cars/', // Ensure this folder exists
     filename: function(req, file, cb) {
         cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
     }
 });

 // Init upload
 const uploadCarImage = multer({
     storage: storage,
     limits: { fileSize: 2000000 }, // Limit file size (e.g., 2MB)
     fileFilter: function(req, file, cb) {
         checkFileType(file, cb);
     }
 }).single('carImage'); // 'carImage' should be the name of the file input field

 // Check file type
 function checkFileType(file, cb) {
     const filetypes = /jpeg|jpg|png|gif/;
     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
     const mimetype = filetypes.test(file.mimetype);

     if (mimetype && extname) {
         return cb(null, true);
     } else {
         cb('Error: Images Only (jpeg, jpg, png, gif)!');
     }
 }
 module.exports = uploadCarImage;
 