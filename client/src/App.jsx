import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import CandidateDetails from './pages/CandidateDetails';
import JobSetup from './pages/JobSetup';
import SetupModal from './components/SetupModal'; // New Component
import Login from './pages/Login'; // You would create this simple form page
import { AuthProvider, useAuth } from './context/AuthContext'; // New Context

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50">
          {/* Conditional Navbar could go here check inside Navbar */}
          <Navbar />
          
          {/* Feature 1: Global Setup Modal for BYOK */}
          <SetupModal />

          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/candidate/:id" element={
              <ProtectedRoute>
                <CandidateDetails />
              </ProtectedRoute>
            } />
            
            <Route path="/create-job" element={
              <ProtectedRoute>
                <JobSetup />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;