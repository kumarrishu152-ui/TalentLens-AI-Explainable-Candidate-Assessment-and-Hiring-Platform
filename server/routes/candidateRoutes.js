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
    updatePipelineStatus,
    startVerificationTest,
    submitVerificationTest
} = require('../controllers/candidateController');

// Configure Multer to store file in memory for immediate parsing
const storage = multer.memoryStorage();
const allowedResumeTypes = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        const allowedExtension = /\.(pdf|docx)$/i.test(file.originalname);
        if (allowedResumeTypes.has(file.mimetype) || allowedExtension) return callback(null, true);
        callback(new Error('Only PDF and DOCX resumes are supported.'));
    }
});

// Apply 'auth' middleware to ALL routes here
router.post('/upload', auth, upload.single('resume'), uploadResume);
router.post('/:id/predict', auth, predictCandidate);

// Rate Candidate Route
router.post('/:id/rate', auth, rateCandidate);

// Pipeline status updates
router.patch('/:id/status', auth, updatePipelineStatus);
router.post('/:id/verification-test/start', auth, startVerificationTest);
router.post('/:id/verification-test/submit', auth, submitVerificationTest);

router.get('/', auth, getAllCandidates);
router.get('/:id', auth, getCandidateById);
router.delete('/:id', auth, deleteCandidate);

module.exports = router;
