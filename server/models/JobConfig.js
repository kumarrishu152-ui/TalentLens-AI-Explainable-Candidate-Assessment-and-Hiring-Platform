const mongoose = require('mongoose');

const JobConfigSchema = new mongoose.Schema({
  // CHANGED: Removed 'unique: true' to allow multiple historical configs per user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobTitle: {
    type: String,
    required: true
  },
  // Hard Filters
  minExperience: {
    type: Number,
    default: 0
  },
  tier1Only: {
    type: Boolean,
    default: false
  },
  // Soft Weights
  experienceWeight: {
    type: Number, // 0-100
    default: 33
  },
  skillsWeight: {
    type: Number,
    default: 33
  },
  educationWeight: {
    type: Number,
    default: 33
  },
  // Feature 2: Gold Standard Benchmark
  goldStandardBenchmark: {
      avgYearsExperience: { type: Number, default: 5 },
      topSkills: [String], 
      educationTierTarget: { type: Number, default: 2 } 
  },
  // Feature 3: HR Controls
  scoringWeights: { // This groups the weights nicely for the UI
      experienceWeight: { type: Number, default: 30 },
      skillsWeight: { type: Number, default: 40 },
      educationWeight: { type: Number, default: 20 },
      prevCompanyWeight: { type: Number, default: 10 }
  },
  
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('JobConfig', JobConfigSchema);