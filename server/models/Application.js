const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', default: null },
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobConfig',
    default: null
  },
  jobTitle: {
    type: String,
    required: true
  },
  company: {
    type: String,
    default: ''
  },
  salary: {
    type: String,
    default: 'Competitive'
  },
  status: {
    type: String,
    enum: ['Submitted', 'Reviewed', 'Interview', 'Offer', 'Rejected'],
    default: 'Submitted'
  },
  candidateName: {
    type: String,
    default: ''
  },
  candidateEmail: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Application', ApplicationSchema);
