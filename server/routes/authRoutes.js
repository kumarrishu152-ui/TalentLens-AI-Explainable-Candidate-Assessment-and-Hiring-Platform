const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const auth = require('../middleware/auth'); // Import middleware

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, getMe); // Protected route

module.exports = router;