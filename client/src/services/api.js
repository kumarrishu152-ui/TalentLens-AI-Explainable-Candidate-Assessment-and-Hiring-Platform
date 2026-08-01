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

export const candidateAPI = {
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
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },
  register: async (username, password) => {
    const response = await api.post('/auth/register', { username, password });
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
  }
};

export default api;