import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Lock, User } from 'lucide-react';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import GlowCard from '../components/ui/GlowCard';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = isLogin 
        ? await userAPI.login(username, password)
        : await userAPI.register(username, password);
      
      login(data.token, data.user); 
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || "Authentication failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <GlowCard className="w-full max-w-md p-8 shadow-xl">
        <div className="flex justify-center mb-6">
          <div className="bg-primary-600 p-3 rounded-xl">
            <Brain className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-8">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-slate-50"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-slate-50"
              required
            />
          </div>
          
          <button className="w-full btn-primary py-3 font-bold text-lg">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center mt-6 text-slate-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary-600 font-bold hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </GlowCard>
    </div>
  );
};

export default Login;