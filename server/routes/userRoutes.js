// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { saveApiKey, resetJob, getTopCandidates } = require('../controllers/userController');
// Placeholder for your JWT middleware
const auth = require('../middleware/auth'); 

// Feature 1: Setup Key
router.post('/setup-key', auth, saveApiKey);

// Feature 2: Reset Job
router.delete('/reset-job', auth, resetJob);

// Feature 3: Leaderboard
router.get('/top-candidates', auth, getTopCandidates);

module.exports = router;