import axios from 'axios';


const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the JWT token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: a 401 means the saved token is missing, stale (e.g. the server
// secret changed), or expired. Clear the session and return to the login page instead of
// letting every request surface a raw "Token is not valid" error.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthCall && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

export const candidateAPI = {
  generateAssessmentQuestions: async (data) => (await api.post('/assessments/generate-questions', data)).data,
  createAssessment: async (data) => (await api.post('/assessments', data)).data,
  getMyAssessments: async () => (await api.get('/assessments/mine')).data,
  submitAssessment: async (id, answers, proctoring) => (await api.post(`/assessments/${id}/submit`, { answers, proctoring })).data,
  reportAssessmentViolation: async (id, payload) => (await api.post(`/assessments/${id}/violation`, payload)).data,
  resetAssessment: async (id) => (await api.post(`/assessments/${id}/reset`)).data,
  getInterviews: async () => (await api.get('/platform/interviews')).data,
  getAnalytics: async () => (await api.get('/platform/analytics')).data,
  getRankings: async (jobId) => (await api.get(`/platform/jobs/${jobId}/rankings`)).data,
  scheduleInterview: async (applicationId, data) => (await api.post(`/platform/applications/${applicationId}/interviews`, data)).data,
  updateJob: async (jobId, data) => (await api.patch(`/platform/jobs/${jobId}`, data)).data,
  // Upload and parse resume
  uploadResume: async (file) => {
    const formData = new FormData();
    formData.append('resume', file);
    
    const response = await api.post('/candidates/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get all candidates
  getAllCandidates: async () => {
    const response = await api.get('/candidates');
    return response.data;
  },

  // Get single candidate by ID
  getCandidateById: async (id) => {
    const response = await api.get(`/candidates/${id}`);
    return response.data;
  },

  // Generate prediction for candidate
  generatePrediction: async (id) => {
    const response = await api.post(`/candidates/${id}/predict`);
    return response.data;
  },

  // --- NEW: Rate Candidate (1-10) ---
  rateCandidate: async (id, rating) => {
    const response = await api.post(`/candidates/${id}/rate`, { rating });
    return response.data;
  },

  startVerificationTest: async (id) => {
    const response = await api.post(`/candidates/${id}/verification-test/start`);
    return response.data;
  },

  submitVerificationTest: async (id, answers, proctoring) => {
    const response = await api.post(`/candidates/${id}/verification-test/submit`, { answers, proctoring });
    return response.data;
  },
  reportVerificationViolation: async (id, payload) => {
    const response = await api.post(`/candidates/${id}/verification-test/violation`, payload);
    return response.data;
  },
  resetVerificationTest: async (candidateDocId) => {
    const response = await api.post(`/candidates/${candidateDocId}/verification-test/reset`);
    return response.data;
  },

  // Delete candidate
  deleteCandidate: async (id) => {
    const response = await api.delete(`/candidates/${id}`);
    return response.data;
  },

  // --- JOB CONFIGURATION ENDPOINTS ---

  // Create & Train
  createJobConfig: async (data) => {
    const response = await api.post('/job-config', data);
    return response.data;
  },

  // Parse Benchmarks without saving yet
  parseBenchmarks: async (formData) => {
    const response = await api.post('/job-config/parse-benchmarks', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Get Active Config (Weights & Filters)
  getActiveJobConfig: async () => {
    const response = await api.get('/job-config/active');
    return response.data;
  },

  // Get live jobs created by recruiters for candidate dashboard
  getPublicJobs: async () => {
    const response = await api.get('/job-config/public');
    return response.data;
  },

  applyToJob: async (payload) => {
    const response = await api.post('/candidates/apply', payload);
    return response.data;
  },

  getMyApplications: async () => {
    const response = await api.get('/candidates/my-applications');
    return response.data;
  },

  getMyProfile: async () => {
    const response = await api.get('/candidates/my-profile');
    return response.data;
  },

  getRecruiterApplications: async () => {
    const response = await api.get('/candidates/applications');
    return response.data;
  },

  updateApplicationStatus: async (id, status) => {
    const response = await api.patch(`/candidates/applications/${id}/status`, { status });
    return response.data;
  },

  // Update Config (Feature 3: Tweak Weights)
  updateJobConfig: async (data) => {
    const response = await api.put('/job-config/active', data);
    return response.data;
  },

  // Rollback Job Config
  rollbackJobConfig: async () => {
    const response = await api.post('/job-config/rollback');
    return response.data;
  }
};

// User & Auth APIs
export const userAPI = {
  login: async (username, password, role = 'recruiter') => {
    const response = await api.post('/auth/login', { username, password, role });
    return response.data;
  },
  register: async (username, password, role = 'recruiter', profile = {}) => {
    const response = await api.post('/auth/register', { username, password, role, ...profile });
    return response.data;
  },
  saveApiKey: async (apiKey) => {
    const response = await api.post('/user/setup-key', { apiKey });
    return response.data;
  },
  resetJob: async () => {
    const response = await api.delete('/user/reset-job');
    return response.data;
  },
  getTopCandidates: async () => {
    const response = await api.get('/user/top-candidates');
    return response.data;
  },
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (profile) => {
    const response = await api.put('/user/profile', profile);
    return response.data;
  }
};

export const agentAPI = {
  chat: async (payload) => {
    const response = await api.post('/agents/chat', payload);
    return response.data;
  }
};

export default api;
