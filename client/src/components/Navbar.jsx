import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, PlusCircle, LogOut } from 'lucide-react'; 
import { useAuth } from '../context/AuthContext'; 

const Navbar = () => {
  const { user, logout } = useAuth(); 
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
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
              RecruitAI
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
            ) : (
              <Link to="/login" className="text-primary-600 font-bold hover:underline">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;