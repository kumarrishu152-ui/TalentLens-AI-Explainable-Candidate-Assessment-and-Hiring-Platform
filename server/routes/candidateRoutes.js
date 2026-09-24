const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth'); 
const requireRole = require('../middleware/requireRole');
const { 
    uploadResume, 
    predictCandidate, 
    getAllCandidates, 
    getCandidateById,
    deleteCandidate,
    rateCandidate,
    updatePipelineStatus,
    startVerificationTest,
    submitVerificationTest,
    applyToJob,
    getMyApplications,
    getRecruiterApplications,
    getMyProfile,
    updateApplicationStatus
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
router.post('/apply', auth, requireRole('candidate'), applyToJob);
router.get('/my-applications', auth, requireRole('candidate'), getMyApplications);
router.get('/my-profile', auth, requireRole('candidate'), getMyProfile);
router.get('/applications', auth, requireRole('recruiter'), getRecruiterApplications);
router.patch('/applications/:id/status', auth, requireRole('recruiter'), updateApplicationStatus);
router.post('/:id/predict', auth, requireRole('recruiter'), predictCandidate);

// Rate Candidate Route
router.post('/:id/rate', auth, requireRole('recruiter'), rateCandidate);

// Pipeline status updates
router.patch('/:id/status', auth, requireRole('recruiter'), updatePipelineStatus);
router.post('/:id/verification-test/start', auth, requireRole('candidate'), startVerificationTest);
router.post('/:id/verification-test/submit', auth, requireRole('candidate'), submitVerificationTest);

router.get('/', auth, requireRole('recruiter'), getAllCandidates);
router.get('/:id', auth, requireRole('recruiter'), getCandidateById);
router.delete('/:id', auth, requireRole('recruiter'), deleteCandidate);

module.exports = router;
