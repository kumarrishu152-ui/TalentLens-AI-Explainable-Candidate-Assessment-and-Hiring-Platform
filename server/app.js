require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Import Routes
const candidateRoutes = require('./routes/candidateRoutes');
const jobConfigRoutes = require('./routes/jobConfigRoutes');
const authRoutes = require('./routes/authRoutes'); // <--- NEW
const userRoutes = require('./routes/userRoutes'); // <--- NEW (For key setup/reset)

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database
connectDB();

// Register Routes
app.use('/api/candidates', candidateRoutes);
app.use('/api/job-config', jobConfigRoutes);
app.use('/api/auth', authRoutes); // <--- This fixes your 404
app.use('/api/user', userRoutes); // <--- This enables Key Setup & Reset

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));