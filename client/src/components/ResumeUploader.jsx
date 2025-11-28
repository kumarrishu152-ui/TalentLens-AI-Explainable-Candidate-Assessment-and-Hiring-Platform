import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { candidateAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import GlowCard from './ui/GlowCard';

const ResumeUploader = ({ isOpen, onClose }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    if (selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setStatus(null);
      setMessage('');
    } else {
      setStatus('error');
      setMessage('Please upload a PDF file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setStatus(null);
    setMessage('Parsing resume with AI...');

    try {
      const response = await candidateAPI.uploadResume(file);
      
      setFile(null); 
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setStatus('success');
      setMessage('Resume processed successfully!');
      
      setTimeout(() => {
        const candidateId = response.candidate?._id || response._id;
        navigate(`/candidate/${candidateId}`);
        handleClose();
      }, 1500);
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || 'Failed to process resume');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setStatus(null);
    setMessage('');
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      {/* Replaced standard div with GlowCard for the modal container */}
      <GlowCard className="w-full max-w-lg mx-4 p-6 shadow-2xl z-50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Upload Resume</h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            disabled={uploading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* NESTED GLOW EFFECT FOR DROP ZONE */}
        <div className="relative group">
           {/* The blurry gradient background that appears on hover */}
           <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary-600 to-blue-400 rounded-xl opacity-20 transition duration-500 blur ${dragActive ? 'opacity-50' : 'group-hover:opacity-40'}`}></div>
           
           <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              dragActive 
                ? 'border-primary-500 bg-white' 
                : 'border-slate-300 bg-white hover:bg-slate-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()} // Click anywhere to upload
          >
            {!file ? (
              <>
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">
                  Drag and drop your resume here, or
                </p>
                <button
                  type="button"
                  className="text-primary-600 font-medium hover:text-primary-700"
                >
                  browse files
                </button>
                <p className="text-sm text-slate-500 mt-2">PDF files only</p>
              </>
            ) : (
              <div className="flex items-center justify-center space-x-3">
                <FileText className="w-8 h-8 text-primary-600" />
                <div className="text-left">
                  <p className="font-medium text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleChange}
              className="hidden"
            />
          </div>
        </div>

        {message && (
          <div className={`mt-4 p-4 rounded-lg flex items-center space-x-2 ${
            status === 'success' 
              ? 'bg-green-50 text-green-800' 
              : status === 'error'
              ? 'bg-red-50 text-red-800'
              : 'bg-blue-50 text-blue-800'
          }`}>
            {status === 'success' && <CheckCircle className="w-5 h-5" />}
            {status === 'error' && <AlertCircle className="w-5 h-5" />}
            {!status && <Loader2 className="w-5 h-5 animate-spin" />}
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleClose}
            className="btn-secondary flex-1"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn-primary flex-1 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Upload & Parse</span>
            )}
          </button>
        </div>
      </GlowCard>
    </div>
  );
};

export default ResumeUploader;