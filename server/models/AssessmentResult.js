const mongoose = require('mongoose');

const AssessmentResultSchema = new mongoose.Schema({
  assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true, index: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  answers: [{ type: Number }],
  // Proctoring summary captured in the browser (camera + mic) during the attempt.
  proctoring: {
    enabled: { type: Boolean, default: false },
    permissioned: { type: Boolean, default: false },
    cameraStreamHealthy: { type: Boolean, default: true },
    micStreamHealthy: { type: Boolean, default: true },
    suspiciousEventCount: { type: Number, default: 0 },
    terminated: { type: Boolean, default: false },
    terminateReason: { type: String, default: '' },
    restarts: { type: Number, default: 0 },
    events: [{
      type: { type: String },
      at: { type: Number },
      detail: { type: String }
    }]
  },
  score: { type: Number, min: 0, max: 100, required: true },
  passed: { type: Boolean, required: true },
  submittedAt: { type: Date, default: Date.now }
});
AssessmentResultSchema.index({ assessmentId: 1, candidateId: 1 }, { unique: true });
module.exports = mongoose.model('AssessmentResult', AssessmentResultSchema);
