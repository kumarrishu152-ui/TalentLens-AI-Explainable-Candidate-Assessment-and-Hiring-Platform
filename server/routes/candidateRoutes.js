const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth'); 
const { 
    uploadResume, 
    predictCandidate, 
    getAllCandidates, 
    getCandidateById,
    deleteCandidate,
    rateCandidate,
    updatePipelineStatus
} = require('../controllers/candidateController');

// Configure Multer to store file in memory for immediate parsing
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Apply 'auth' middleware to ALL routes here
router.post('/upload', auth, upload.single('resume'), uploadResume);
router.post('/:id/predict', auth, predictCandidate);

// Rate Candidate Route
router.post('/:id/rate', auth, rateCandidate);

// Pipeline status updates
router.patch('/:id/status', auth, updatePipelineStatus);

router.get('/', auth, getAllCandidates);
router.get('/:id', auth, getCandidateById);
router.delete('/:id', auth, deleteCandidate);

module.exports = router;