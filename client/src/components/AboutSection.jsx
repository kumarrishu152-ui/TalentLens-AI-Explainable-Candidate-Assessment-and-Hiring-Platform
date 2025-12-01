import React from 'react';
import { Github, Linkedin, Mail, Heart, Code } from 'lucide-react';
import GlowCard from './ui/GlowCard';

const AboutSection = () => {
  return (
    <GlowCard className="mt-12 p-8 text-center bg-gradient-to-b from-white to-slate-50">
      <div className="flex flex-col items-center justify-center space-y-4">
        
        {/* Title / Name */}
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
            Created by <span className="text-primary-600">Arya Dasgupta</span>
          </h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Built with MERN Stack + Python & Gemini AI to revolutionize the recruitment process.
          </p>
        </div>

        {/* Social Links */}
        <div className="flex items-center justify-center gap-6 mt-4">
          {/* LinkedIn */}
          <a 
            href="https://www.linkedin.com/in/aryadasgupta2004/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-1"
          >
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-blue-200 group-hover:scale-110">
              <Linkedin className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-400 group-hover:text-blue-600 transition-colors">LinkedIn</span>
          </a>

          {/* GitHub */}
          <a 
            href="https://github.com/AryaXDG" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-1"
          >
            <div className="p-3 bg-slate-100 text-slate-700 rounded-full group-hover:bg-slate-800 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-slate-300 group-hover:scale-110">
              <Github className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-400 group-hover:text-slate-800 transition-colors">GitHub</span>
          </a>

          {/* Email */}
          <a 
            href="mailto:aryadasgupta2004@gmail.com"
            className="group flex flex-col items-center gap-1"
          >
            <div className="p-3 bg-red-50 text-red-600 rounded-full group-hover:bg-red-500 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-red-200 group-hover:scale-110">
              <Mail className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-400 group-hover:text-red-600 transition-colors">Email</span>
          </a>
        </div>

        {/* Footer Note */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-6 pt-6 border-t border-slate-100 w-full justify-center">
          <Code className="w-3 h-3" />
          <span>Developed with</span>
          <Heart className="w-3 h-3 text-red-400 fill-red-400 animate-pulse" />
          <span>for Placement Season 2026</span>
        </div>

      </div>
    </GlowCard>
  );
};

export default AboutSection;