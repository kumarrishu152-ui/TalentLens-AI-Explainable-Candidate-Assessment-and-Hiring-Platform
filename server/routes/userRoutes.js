const express = require('express');
const router = express.Router();
const { saveApiKey, resetJob, getTopCandidates, updateProfile } = require('../controllers/userController');

const auth = require('../middleware/auth'); 

// Setup Key
router.post('/setup-key', auth, saveApiKey);
router.put('/profile', auth, updateProfile);

// Reset Job
router.delete('/reset-job', auth, resetJob);

// Leaderboard
router.get('/top-candidates', auth, getTopCandidates);

module.exports = router;
