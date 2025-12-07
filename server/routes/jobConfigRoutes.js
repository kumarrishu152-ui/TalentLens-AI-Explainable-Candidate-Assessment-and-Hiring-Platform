const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth'); // Import Auth Middleware
const { 
    createJobConfig, 
    getActiveConfig, 
    updateJobConfig // <--- Import the new update function
} = require('../controllers/jobConfigController');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Apply 'auth' middleware to all routes
router.post('/', auth, upload.array('benchmark_resumes', 12), createJobConfig);
router.get('/active', auth, getActiveConfig);

// Feature 3: Route to update weights/filters of the active config
router.put('/active', auth, updateJobConfig);

module.exports = router;