const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Store hashed password here
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