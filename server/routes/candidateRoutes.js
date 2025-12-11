const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth'); // Import Auth Middleware

const { 
    uploadResume, 
    predictCandidate, 
    getAllCandidates, 
    getCandidateById,
    deleteCandidate,
    rateCandidate // <--- Import the new Rate function
} = require('../controllers/candidateController');

// Configure Multer to store file in memory for immediate parsing
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Apply 'auth' middleware to ALL routes here
router.post('/upload', auth, upload.single('resume'), uploadResume);
router.post('/:id/predict', auth, predictCandidate);

// New: Rate Candidate Route (Triggers Tuning when buffer is full)
router.post('/:id/rate', auth, rateCandidate);

router.get('/', auth, getAllCandidates);
router.get('/:id', auth, getCandidateById);
router.delete('/:id', auth, deleteCandidate);

module.exports = router;