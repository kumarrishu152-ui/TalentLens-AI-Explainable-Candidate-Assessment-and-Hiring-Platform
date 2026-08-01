const mongoose = require('mongoose');

const JobConfigSchema = new mongoose.Schema({
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
  targetDegree: {
    type: String, // 'Bachelors', 'Masters', 'PhD', 'None'
    default: 'Bachelors'
  },
  targetField: {
    type: String,
    default: ''
  },
  // Soft Weights for High-level Categories
  experienceWeight: {
    type: Number, // 0-100
    default: 40
  },
  skillsWeight: {
    type: Number, // 0-100
    default: 40
  },
  educationWeight: {
    type: Number, // 0-100
    default: 20
  },
  // Detailed Per-Tag Skills Configuration
  skillsList: [{
    tag: { type: String, required: true },
    category: { type: String, default: 'Tool' }, // 'Language', 'Framework', 'Tool', 'Practice', 'Soft-Skill'
    weight: { type: Number, default: 50 }, // 100 for Must-have, 50 for Important, 20 for Nice-to-have
    importance: { type: String, default: 'Important' }, // 'Must-have', 'Important', 'Nice-to-have'
    source: { type: String, default: 'manual' }, // 'manual', 'benchmark', 'learned'
    sampleSize: { type: Number, default: 0 },
    embedding: [Number]
  }],
  // Benchmark Profile computed from Gold Standard Resumes
  goldStandardBenchmark: {
      avgYearsExperience: { type: Number, default: 5 },
      topSkills: [String], 
      educationDegreeTarget: { type: String, default: 'Bachelors' },
      educationFieldTarget: { type: String, default: '' }
  },
  // Versioning History for Rollback support
  versionHistory: [{
    timestamp: { type: Date, default: Date.now },
    experienceWeight: Number,
    skillsWeight: Number,
    targetDegree: String,
    targetField: String,
    skillsList: [{
      tag: String,
      category: String,
      weight: Number,
      importance: String,
      source: String,
      sampleSize: Number
    }]
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('JobConfig', JobConfigSchema);