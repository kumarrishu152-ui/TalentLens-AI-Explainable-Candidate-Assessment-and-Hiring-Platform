const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth'); 
const requireRole = require('../middleware/requireRole');
const {
    createJobConfig, 
    getActiveConfig,
    getPublicJobs,
    updateJobConfig,
    rollbackJobConfig,
    parseBenchmarks
} = require('../controllers/jobConfigController');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Apply 'auth' middleware to all routes
router.post('/', auth, requireRole('recruiter'), upload.array('benchmark_resumes', 12), createJobConfig);
router.post('/parse-benchmarks', auth, requireRole('recruiter'), upload.array('benchmark_resumes', 12), parseBenchmarks);
router.get('/active', auth, requireRole('recruiter'), getActiveConfig);
router.get('/public', auth, requireRole('candidate'), getPublicJobs);

// Feature 3: Route to update weights/filters of the active config
router.put('/active', auth, requireRole('recruiter'), updateJobConfig);
router.post('/rollback', auth, requireRole('recruiter'), rollbackJobConfig);

module.exports = router;
