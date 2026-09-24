const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Store hashed password here
    displayName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    headline: { type: String, default: '' },
    bio: { type: String, default: '' },
    skills: { type: String, default: '' },
    companyName: { type: String, default: '' },
    companyWebsite: { type: String, default: '' },
    industry: { type: String, default: '' },
    role: {
        type: String,
        enum: ['recruiter', 'candidate'],
        default: 'recruiter'
    },

    geminiApiKey: {
        iv: { type: String },
        content: { type: String }
    },
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
