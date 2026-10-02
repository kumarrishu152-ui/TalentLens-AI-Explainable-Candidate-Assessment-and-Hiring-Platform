require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Import Routes
const candidateRoutes = require('./routes/candidateRoutes');
const jobConfigRoutes = require('./routes/jobConfigRoutes');
const authRoutes = require('./routes/authRoutes'); 
const userRoutes = require('./routes/userRoutes');
const agentRoutes = require('./routes/agentRoutes');
const platformRoutes = require('./routes/platformRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Simple health endpoint for checking that the API is running in a browser.
app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'TalentLens AI API is running' });
});

// Database
connectDB();

// Register Routes
app.use('/api/candidates', candidateRoutes);
app.use('/api/job-config', jobConfigRoutes);
app.use('/api/auth', authRoutes); 
app.use('/api/user', userRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/assessments', assessmentRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
