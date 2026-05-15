import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/initSupabase';
import { getApiUrl } from '../../lib/api';
import Layout from '../../components/layout/Layout';
import withAuth from '../../lib/withAuth';
import {
  Upload,
  FileText,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Type,
  Eye
} from 'lucide-react';

const TemplateUploadPage = () => {
  const router = useRouter();
  const fileInputRef = useRef(null);
  
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [skipOCR, setSkipOCR] = useState(false);
  const [displayTitle, setDisplayTitle] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/png',
    'image/jpg',
  ];

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = [];
    
    for (const file of selectedFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`نوع الملف غير مدعوم: ${file.name}`);
        return;
      }
      
      if (file.size > MAX_FILE_SIZE) {
        setError(`حجم الملف كبير: ${file.name}. الحد الأقصى 10MB.`);
        return;
      }
      
      validFiles.push(file);
    }
    
    setFiles(prev => [...prev, ...validFiles]);
    setError(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = [];
    
    for (const file of droppedFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`نوع الملف غير مدعوم: ${file.name}`);
        return;
      }
      
      if (file.size > MAX_FILE_SIZE) {
        setError(`حجم الملف كبير: ${file.name}. الحد الأقصى 10MB.`);
        return;
      }
      
      validFiles.push(file);
    }
    
    setFiles(prev => [...prev, ...validFiles]);
    setError(null);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file to upload.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      let lastUploadedId = null;
      // Get session token
      const session = supabase.auth.session();
      if (!session) {
        setError('You must be logged in to upload templates');
        setUploading(false);
        return;
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => ({ ...prev, [i]: 'uploading' }));
        
        const base64Data = await convertFileToBase64(file);
        
        const response = await fetch(getApiUrl('/api/templates/upload'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            file: {
              name: file.name,
              type: file.type,
              data: base64Data,
            },
            skip_ocr: skipOCR,
            display_title: displayTitle || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim(),
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('Upload API error response:', result);
          const errMsg = result.details 
            ? `${result.error}: ${result.details}${result.code ? ` (code: ${result.code})` : ''}`
            : (result.error || 'Upload failed');
          throw new Error(errMsg);
        }

        setUploadProgress(prev => ({ ...prev, [i]: 'completed' }));
        
        // Store last uploaded template ID for redirect
        if (result.template && result.template.id) {
          lastUploadedId = result.template.id;
        }
      }

      setSuccess(true);
      setFiles([]);
      setDisplayTitle('');
      
      // Redirect to editor if we have an ID, otherwise to library
      setTimeout(() => {
        if (lastUploadedId) {
          router.push(`/templates/edit/${lastUploadedId}`);
        } else {
          router.push('/templates');
        }
      }, 1500);
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload template');
      setUploadProgress({});
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'pdf') return <FileText className="text-red-500" />;
    if (ext === 'doc' || ext === 'docx') return <FileText className="text-blue-500" />;
    return <FileText className="text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Layout>
      <div className="upload-page" dir="rtl">
        <div className="upload-container">
          <div className="page-header">
            <h1 className="page-title">رفع قالب جديد</h1>
            <p className="page-subtitle">قم برفع قوالبك الخاصة (PDF، صور، DOCX) مع استخراج النصوص تلقائياً</p>
          </div>

          {error && (
            <div className="error-banner">
              <AlertCircle size={20} />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="close-btn">
                <X size={16} />
              </button>
            </div>
          )}

          {success && (
            <div className="success-banner">
              <Check size={20} />
              <span>تم رفع القالب بنجاح! جاري التوجيه إلى المحرر...</span>
            </div>
          )}

          {uploading && (
            <div className="upload-overlay">
              <RefreshCw size={48} className="spin" />
              <p>جاري رفع الملف...</p>
            </div>
          )}

          <div className={`upload-content ${uploading ? 'hidden' : ''}`}>
            {/* Upload Zone */}
            <div
              className={`upload-zone ${files.length > 0 ? 'has-files' : ''}`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                multiple
              />
              
              <div className="upload-icon">
                <Upload size={32} />
              </div>
              <h3>رفع ملف</h3>
              <div className="upload-info">
                <span>PDF, DOCX, JPG, PNG</span>
                <span>•</span>
                <span>الحد الأقصى 10MB</span>
              </div>
            </div>

            {/* Compact Card: Files + Options + Actions */}
            {files.length > 0 && (
              <div className="upload-card">
                {files.map((file, index) => (
                  <div key={index} className="file-row">
                    <div className="file-info">
                      {getFileIcon(file.name)}
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{formatFileSize(file.size)}</span>
                    </div>
                    <div className="file-status">
                      {uploadProgress[index] === 'uploading' && <RefreshCw size={14} className="spin text-blue-500" />}
                      {uploadProgress[index] === 'completed' && <Check size={14} className="text-green-500" />}
                      {!uploading && (
                        <button onClick={(e) => { e.stopPropagation(); removeFile(index); }} className="remove-btn">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="card-divider" />

                <label className="ocr-toggle">
                  <input type="checkbox" checked={skipOCR} onChange={(e) => setSkipOCR(e.target.checked)} disabled={uploading} />
                  <span>تخطي استخراج النص</span>
                </label>

                <input
                  type="text"
                  value={displayTitle}
                  onChange={(e) => setDisplayTitle(e.target.value)}
                  placeholder="عنوان القالب (اختياري)"
                  disabled={uploading}
                  className="title-input"
                />

                <div className="card-actions">
                  <button onClick={handleUpload} disabled={uploading} className="upload-btn">
                    {uploading ? <><RefreshCw size={16} className="spin" /> جاري الرفع...</> : <><Upload size={16} /> رفع</>}
                  </button>
                  <button onClick={() => router.push('/templates')} disabled={uploading} className="cancel-btn">
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .upload-page {
            padding: 20px;
            min-height: 100vh;
            background: #f8fafc;
          }

          .upload-container {
            max-width: 600px;
            margin: 0 auto;
          }

          .page-header {
            margin-bottom: 20px;
            text-align: center;
          }

          .page-title {
            font-size: 22px;
            font-weight: 700;
            color: #1e293b;
            margin: 0 0 4px 0;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .page-subtitle {
            font-size: 13px;
            color: #64748b;
            margin: 0;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .error-banner, .success-banner {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            border-radius: 10px;
            margin-bottom: 16px;
            font-size: 13px;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .error-banner {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #dc2626;
          }

          .success-banner {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #16a34a;
          }

          .close-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            color: inherit;
            opacity: 0.7;
            transition: opacity 0.2s;
          }

          .close-btn:hover {
            opacity: 1;
          }

          .upload-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.95);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            gap: 16px;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .upload-overlay .spin {
            color: #3b82f6;
          }

          .upload-overlay p {
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
            margin: 0;
          }

          .hidden {
            display: none;
          }

          .upload-content {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .upload-zone {
            border: 2px dashed #cbd5e1;
            border-radius: 12px;
            padding: 24px 16px;
            text-align: center;
            background: #ffffff;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .upload-zone:hover {
            border-color: #3b82f6;
            background: #f0f7ff;
          }

          .upload-zone.has-files {
            padding: 18px 16px;
          }

          .upload-icon {
            margin-bottom: 8px;
            color: #3b82f6;
          }

          .upload-zone h3 {
            font-size: 15px;
            font-weight: 600;
            color: #1e293b;
            margin: 0 0 6px 0;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .upload-info {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 12px;
            color: #94a3b8;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .upload-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .file-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 10px;
            background: #f8fafc;
            border-radius: 8px;
          }

          .file-info {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            min-width: 0;
          }

          .file-name {
            font-size: 13px;
            font-weight: 500;
            color: #1e293b;
            font-family: 'Cairo', 'Almarai', sans-serif;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .file-size {
            font-size: 11px;
            color: #94a3b8;
            white-space: nowrap;
            flex-shrink: 0;
          }

          .file-status {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
            margin-right: 8px;
          }

          .spin {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .remove-btn {
            background: none;
            border: none;
            color: #94a3b8;
            padding: 4px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            transition: color 0.15s;
          }

          .remove-btn:hover {
            color: #dc2626;
          }

          .card-divider {
            height: 1px;
            background: #f1f5f9;
          }

          .ocr-toggle {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            font-weight: 700;
            color: #1e293b;
            cursor: pointer;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .ocr-toggle input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
            accent-color: #3b82f6;
          }

          .title-input {
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 13px;
            font-family: 'Cairo', 'Almarai', sans-serif;
            transition: border-color 0.15s;
            background: #f8fafc;
          }

          .title-input:focus {
            outline: none;
            border-color: #3b82f6;
            background: #fff;
          }

          .title-input:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .card-actions {
            display: flex;
            gap: 8px;
            justify-content: center;
          }

          .upload-btn, .cancel-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 0;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 900;
            cursor: pointer;
            transition: all 0.15s;
            font-family: 'Cairo', 'Almarai', sans-serif;
            width: 100px;
          }

          .upload-btn {
            background: #2563eb;
            color: #ffffff;
            border: none;
          }

          .upload-btn:hover:not(:disabled) {
            background: #1d4ed8;
          }

          .upload-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .cancel-btn {
            background: #fff;
            color: #64748b;
            border: 1px solid #e2e8f0;
          }

          .cancel-btn:hover:not(:disabled) {
            background: #f8fafc;
            color: #475569;
          }

          .cancel-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          @media (max-width: 768px) {
            .upload-page {
              padding: 12px;
            }
          }

          /* Responsive */
        @media (max-width: 1024px) {
          .upload-page { padding: 20px; }
        }

        @media (max-width: 768px) {
          .upload-page { padding: 12px; }

          .page-header {
            margin-bottom: 10px;
            margin-top: 50px;
          }

          .page-title {
            font-size: 22px;
            font-weight: 700;
          }

          .page-subtitle {
            font-size: 14px;
            font-weight: 600;
          }

          .upload-content {
            gap: 10px;
          }

          .upload-zone {
            padding: 20px 12px;
          }

          .upload-zone.has-files {
            padding: 14px 12px;
          }

          .upload-card {
            padding: 10px;
            gap: 8px;
          }

          .file-row {
            padding: 6px 8px;
          }

          .file-name {
            font-size: 12px;
          }

          .card-actions {
            justify-content: center;
            gap: 6px;
          }

          .error-banner, .success-banner {
            font-size: 12px;
            padding: 10px 12px;
          }
        }

        @media (max-width: 640px) {
          .page-title { font-size: 16px; }
          .page-subtitle { font-size: 11px; }
          .upload-zone { padding: 16px 8px; }
          .upload-zone.has-files { padding: 12px 8px; }
          .upload-card { padding: 8px; gap: 6px; }
          .file-row { padding: 4px 6px; }
          .file-name { font-size: 11px; }
          .upload-btn, .cancel-btn { padding: 8px 12px; font-size: 12px; }
        }

        @media (max-width: 400px) {
          .upload-zone h3 {
            font-size: 14px;
          }

          .upload-info {
            font-size: 11px;
          }
        }

        /* Mobile app safe areas */
        @supports (padding-top: env(safe-area-inset-top)) {
          .upload-page {
            padding-top: calc(12px + env(safe-area-inset-top));
            padding-bottom: calc(12px + env(safe-area-inset-bottom));
          }
        }  
        `}</style>
      </div>
    </Layout>
  );
};

export default withAuth(TemplateUploadPage, [], true);
