import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import CandidateDashboard from './pages/CandidateDashboard';
import CandidateDetails from './pages/CandidateDetails';
import JobSetup from './pages/JobSetup';
import SetupModal from './components/SetupModal';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === 'candidate' ? '/candidate' : '/recruiter'} replace />;
  }
  return children;
};

const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'candidate' ? '/candidate' : '/recruiter'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50">
          <Navbar />
          <SetupModal />

          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RootRedirect />} />

            <Route path="/recruiter" element={
              <ProtectedRoute allowedRole="recruiter">
                <Dashboard />
              </ProtectedRoute>
            } />

            <Route path="/candidate" element={
              <ProtectedRoute allowedRole="candidate">
                <CandidateDashboard />
              </ProtectedRoute>
            } />

            <Route path="/candidate/:id" element={
              <ProtectedRoute allowedRole="recruiter">
                <CandidateDetails />
              </ProtectedRoute>
            } />

            <Route path="/create-job" element={
              <ProtectedRoute allowedRole="recruiter">
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