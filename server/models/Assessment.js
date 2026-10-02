const mongoose = require('mongoose');

const AssessmentSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
  recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  durationMinutes: { type: Number, min: 5, max: 240, default: 30 },
  passingScore: { type: Number, min: 0, max: 100, default: 70 },
  questions: [{
    prompt: { type: String, required: true },
    options: { type: [String], validate: values => values.length >= 2 },
    correctAnswer: { type: Number, required: true, min: 0 }
  }],
  createdAt: { type: Date, default: Date.now }
});
AssessmentSchema.index({ applicationId: 1, createdAt: -1 });
module.exports = mongoose.model('Assessment', AssessmentSchema);
