const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
    // Link to User Model
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    name: { type: String, required: true },
    email: { type: String, required: true },
    skills: [String],
    skillEmbeddings: [{
        tag: String,
        embedding: [Number]
    }],
    years_experience: { type: Number, required: true },
    
    // Degree details (mitigating university prestige bias)
    education_degree: { type: String, default: 'Bachelors' }, // 'Bachelors', 'Masters', 'PhD', 'None'
    education_field: { type: String, default: '' }, // e.g. 'Computer Science'
    
    summary: { type: String },
    resume_text: { type: String }, // Raw text from PDF
    
    // ATS Pipeline State
    pipelineStatus: {
        type: String,
        enum: ['New', 'Screening', 'Interview', 'Offer', 'Rejected'],
        default: 'New'
    },

    // Multi-Reviewer Ratings (prevents single-reviewer rating override)
    hr_ratings: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reviewerName: { type: String },
        rating: { type: Number, min: 1, max: 10 }
    }],
    
    // Cached aggregate rating
    hr_rating: { 
        type: Number, 
        default: null 
    },

    prediction: {
        success_score: Number,
        analysis: String,
        chart_url: String, // SVG-based base64 URI
        explainability: [{
            type: { type: String }, // 'match', 'mismatch', 'bonus', 'penalty'
            tag: String,
            scoreEffect: Number, // positive or negative value
            reason: String
        }],
        skillEvidence: [{
            tag: String,
            quote: String // Verifiable quote from resume proving skill
        }],
        duplicateFound: { type: Boolean, default: false },
        authenticityFlag: { type: Boolean, default: false }, // Triggered by keyword stuffing
        disqualified: { type: Boolean, default: false },
        missingMustHaves: [String]
    },
    createdAt: { type: Date, default: Date.now }
});

// Update single hr_rating to reflect average of multi-reviewer ratings before saving
CandidateSchema.pre('save', function (next) {
    if (this.hr_ratings && this.hr_ratings.length > 0) {
        const sum = this.hr_ratings.reduce((acc, curr) => acc + curr.rating, 0);
        this.hr_rating = Math.round((sum / this.hr_ratings.length) * 10) / 10;
    }
    next();
});

module.exports = mongoose.model('Candidate', CandidateSchema);