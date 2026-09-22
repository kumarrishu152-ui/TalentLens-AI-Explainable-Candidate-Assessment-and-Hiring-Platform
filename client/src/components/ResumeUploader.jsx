import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Loader2, CheckCircle, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { candidateAPI } from '../services/api';
import GlowCard from './ui/GlowCard';

const ResumeUploader = ({ isOpen, onClose, onUploadComplete }) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    // Permit selecting the same file again after removing it or retrying it.
    e.target.value = '';
  };

  const addFiles = (selectedFiles) => {
    const selected = Array.from(selectedFiles);
    const validFiles = selected.filter(file =>
      file.type === 'application/pdf'
      || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      || /\.(pdf|docx)$/i.test(file.name)
    );
    if (validFiles.length < selected.length) {
      alert('Only PDF and DOCX files are supported.');
    }
    
    const newItems = validFiles.map(f => ({
      id: Math.random().toString(36).substring(2, 9),
      name: f.name,
      size: f.size,
      status: 'queued',
      errorMsg: '',
      rawFile: f
    }));
    
    setFiles(prev => {
      const existing = new Set(prev.map(file => `${file.name}-${file.size}-${file.rawFile.lastModified}`));
      return [...prev, ...newItems.filter(file => !existing.has(`${file.name}-${file.size}-${file.rawFile.lastModified}`))];
    });
  };

  const handleRemove = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUpload = async () => {
    const toUpload = files.filter(f => f.status === 'queued' || f.status === 'error');
    if (toUpload.length === 0) return;

    setUploading(true);

    // Parse one file at a time to avoid Gemini rate-limit errors during bulk uploads.
    for (const item of toUpload) {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'parsing', errorMsg: '' } : f));
      
      try {
        await candidateAPI.uploadResume(item.rawFile);
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'success' } : f));
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to parse resume';
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', errorMsg } : f));
      }
    }

    setUploading(false);
  };

  const handleClose = () => {
    const hasSuccess = files.some(f => f.status === 'success');
    setFiles([]);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
    if (hasSuccess) {
      onUploadComplete?.();
    }
  };

  const queuedOrFailedCount = files.filter(f => f.status === 'queued' || f.status === 'error').length;
  const isRetry = files.some(f => f.status === 'error');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <GlowCard className="w-full max-w-xl mx-4 p-6 shadow-2xl z-50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Upload Resumes</h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            disabled={uploading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Drop Zone */}
        <div className="relative group mb-6">
          <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary-600 to-blue-400 rounded-xl opacity-20 transition duration-500 blur ${dragActive ? 'opacity-50' : 'group-hover:opacity-40'}`}></div>
          
          <div
            className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
              dragActive 
                ? 'border-primary-500 bg-white' 
                : 'border-slate-300 bg-white hover:bg-slate-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600 text-sm">
              Drag and drop PDF or DOCX resumes here, or <span className="text-primary-600 font-medium">browse files</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">Select one or multiple PDF or DOCX files (up to 10 MB each)</p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              onChange={handleChange}
              className="hidden"
            />
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mb-6 max-h-60 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100 bg-slate-50/50 p-2">
            {files.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-md mb-2 shadow-sm border border-slate-100 last:mb-0">
                <div className="flex items-center space-x-3 overflow-hidden mr-4">
                  <FileText className="w-6 h-6 text-primary-500 flex-shrink-0" />
                  <div className="text-left overflow-hidden">
                    <p className="font-medium text-slate-900 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-slate-500">{(item.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  {item.status === 'queued' && (
                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">Queued</span>
                  )}
                  {item.status === 'parsing' && (
                    <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full flex items-center space-x-1">
                      <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                      <span>Parsing...</span>
                    </span>
                  )}
                  {item.status === 'success' && (
                    <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 rounded-full flex items-center space-x-1">
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                      <span>Success</span>
                    </span>
                  )}
                  {item.status === 'error' && (
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-semibold px-2.5 py-1 bg-red-50 text-red-700 rounded-full flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                        <span>Failed</span>
                      </span>
                      <p className="text-[10px] text-red-500 mt-1 max-w-[200px] text-right truncate" title={item.errorMsg}>
                        {item.errorMsg}
                      </p>
                    </div>
                  )}

                  {!uploading && item.status !== 'success' && (
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Controls */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleClose}
            className="btn-secondary flex-1"
            disabled={uploading}
          >
            {files.some(f => f.status === 'success') ? 'Finish' : 'Cancel'}
          </button>
          <button
            onClick={handleUpload}
            disabled={queuedOrFailedCount === 0 || uploading}
            className="btn-primary flex-1 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Bulk...</span>
              </>
            ) : (
              <>
                {isRetry ? <RefreshCw className="w-4 h-4" /> : null}
                <span>{isRetry ? 'Retry Failed' : `Upload & Parse (${queuedOrFailedCount})`}</span>
              </>
            )}
          </button>
        </div>
      </GlowCard>
    </div>
  );
};

export default ResumeUploader;
