const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
    // Link to User Model
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    name: { type: String, required: true },
    email: { type: String, required: true },
    skills: [String],
    years_experience: { type: Number, required: true },
    education_tier: { type: Number, default: 2 }, // 1=Top, 2=Mid, 3=Low
    summary: { type: String },
    resume_text: { type: String }, // Raw text from PDF
    
    // --- NEW: HR Feedback Loop ---
    // Stores the manual rating (1-10) given by the recruiter
    hr_rating: { 
        type: Number, 
        min: 1, 
        max: 10,
        default: null 
    },

    prediction: {
        success_score: Number,
        analysis: String,
        chart_url: String // Base64 string from Python
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Candidate', CandidateSchema);