import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, PlusCircle, LogOut } from 'lucide-react'; 
import { useAuth } from '../context/AuthContext'; 
import VoiceInput from './VoiceInput';

const Navbar = () => {
  const { user, logout } = useAuth(); 
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleVoiceCommand = (spokenCommand) => {
    const command = spokenCommand.toLowerCase();
    if (command.includes('new job') || command.includes('create job') || command.includes('job setup')) {
      navigate('/create-job');
    } else if (command.includes('dashboard') || command.includes('candidates') || command.includes('home')) {
      navigate('/');
    } else if (command.includes('sign out') || command.includes('log out')) {
      handleLogout();
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-primary-600 p-2 rounded-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 hidden sm:block">
              TalentLens AI
            </span>
          </Link>

          {/* Right Side Actions - Only show if user is logged in */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {user ? (
              <>
                <Link 
                    to="/create-job" 
                    className="flex items-center space-x-2 text-slate-600 hover:text-primary-600 font-medium transition-colors px-3 py-2 rounded-md hover:bg-slate-50"
                >
                    <PlusCircle className="w-5 h-5" />
                    <span className="hidden md:inline">New Job Config</span>
                </Link>

                <VoiceInput
                  label="Voice command: dashboard, new job, or sign out"
                  onTranscript={handleVoiceCommand}
                  className="hidden sm:inline-flex"
                />

                {/* Divider */}
                <div className="h-6 w-px bg-slate-300 mx-2"></div>

                {/* Sign Out Button */}
                <button 
                  onClick={handleLogout}
                  className="flex items-center space-x-2 text-slate-500 hover:text-red-600 transition-colors px-2 py-2"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
