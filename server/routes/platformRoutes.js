const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const controller = require('../controllers/platformController');

const router = express.Router();
router.use(auth);
router.get('/jobs', requireRole('candidate'), controller.listJobs);
router.patch('/jobs/:id', requireRole('recruiter'), controller.updateJob);
router.get('/jobs/:jobId/rankings', requireRole('recruiter'), controller.rankApplicants);
router.post('/applications/:applicationId/interviews', requireRole('recruiter'), controller.scheduleInterview);
router.get('/interviews', requireRole('candidate', 'recruiter', 'admin'), controller.myInterviews);
router.get('/analytics', requireRole('recruiter', 'admin'), controller.analytics);
module.exports = router;
