import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/layout/Layout';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';
import Head from 'next/head';
import { Camera as CapacitorCamera, CameraSource, CameraDirection, CameraResultType } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { FiSearch, FiArrowRight, FiArrowLeft, FiCamera, FiUpload, FiCheck, FiX, FiChevronLeft, FiCrop, FiSliders, FiEdit3, FiAperture, FiMaximize, FiSun, FiRefreshCw } from 'react-icons/fi';
import { FaUserFriends, FaBuilding, FaFolder } from 'react-icons/fa';
import { Archive, FileText, Scale, Users, Calendar, Upload, Camera, ChevronRight, Paperclip } from 'lucide-react';
import Cropper from 'react-cropper';

const QuickArchivePage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  
  // Client selection state
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingClients, setLoadingClients] = useState(true);
  
  // Case selection state
  const [cases, setCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  
  // Document upload state
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('main');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [cameraMode, setCameraMode] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [folders, setFolders] = useState(['main']);
  
  // Image editing state
  const [isEditing, setIsEditing] = useState(false);
  const [processedImage, setProcessedImage] = useState(null);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  
  
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const cropperRef = useRef(null);
  
  // Default folders that should always be available
  const defaultFolders = [
    "main",
    "evidence",
    "judgments",
    "execution",
    "accounts",
    "documents",
    "session_minutes",
    "opponent_files",
    "private_files",
  ];

  // Get Arabic display name for folder
  const getFolderDisplayName = (folderName) => {
    const names = {
      main: "المجلد الرئيسي",
      evidence: "الاثباتات",
      judgments: "الاحكام",
      execution: "التنفيذ",
      accounts: "الحسابات",
      documents: "المستندات",
      session_minutes: "محاضر الجلسات",
      opponent_files: "ملفات الخصم",
      private_files: "ملفات خاصة",
      docs: "المستندات",
      session_register: "محاضر الجلسات",
    };
    return names[folderName] || folderName;
  };

  // Fetch folders for the selected case
  const fetchFolders = async (caseNumber) => {
    try {
      let dbFolders = [];

      if (caseNumber) {
        const { data, error } = await supabase
          .from("attachments")
          .select("folder_name")
          .eq("case_number", caseNumber)
          .not("folder_name", "is", null);

        if (!error && data && data.length > 0) {
          dbFolders = [...new Set(data.map((item) => item.folder_name))].filter(Boolean);
        }
      }

      // Merge default folders with database folders
      const allFolders = [...new Set([...defaultFolders, ...dbFolders])];

      // Sort: default folders first (in defined order), then others alphabetically
      const sortedFolders = allFolders.sort((a, b) => {
        const aIsDefault = defaultFolders.includes(a);
        const bIsDefault = defaultFolders.includes(b);

        if (aIsDefault && !bIsDefault) return -1;
        if (!aIsDefault && bIsDefault) return 1;
        if (aIsDefault && bIsDefault) {
          return defaultFolders.indexOf(a) - defaultFolders.indexOf(b);
        }
        return a.localeCompare(b);
      });

      setFolders(sortedFolders);
    } catch (error) {
      console.error("Error fetching folders:", error);
      setFolders(defaultFolders);
    }
  };

  // Helper function to get admin_id
  const getAdminId = async () => {
    const user = supabase.auth.user();
    if (!user) return null;

    const userId = user.id;

    const { data: metaList, error: metaError } = await supabase
      .from("user_metadata")
      .select("role, admin_user_id, new_lawyer_id, user_id")
      .or(`user_id.eq.${userId},new_lawyer_id.eq.${userId}`);

    if (metaError) {
      console.error("Metadata error:", metaError.message);
      return null;
    }

    if (!metaList || metaList.length === 0) return null;

    const lawyerRow = metaList.find(m => m.new_lawyer_id === userId);
    const userRow = metaList.find(m => m.user_id === userId);

    const targetMeta = lawyerRow || userRow || metaList[0];

    if (targetMeta) {
      return targetMeta.admin_user_id || targetMeta.user_id;
    }
    return userId;
  };

  // Fetch clients on mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoadingClients(true);
        const user = supabase.auth.user();
        if (!user) throw new Error('User not logged in');

        const firmAdminId = await getAdminId();
        const effectiveAdminId = firmAdminId || user.id;

        const queryCondition = `admin_id.eq.${effectiveAdminId},lawyer_id.eq.${effectiveAdminId},admin_id.eq.${user.id},lawyer_id.eq.${user.id}`;

        const { data: clientsData, error: clientsError } = await supabase
          .from('clients_data')
          .select('*')
          .or(queryCondition);

        if (clientsError) throw clientsError;

        setClients(clientsData || []);
        setFilteredClients(clientsData || []);
      } catch (error) {
        console.error('Error fetching clients:', error.message);
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  // Filter clients based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = clients.filter((client) =>
      [client.client_name, client.id, client.legal_form, client.address]
        .map((field) => field?.toString().toLowerCase())
        .some((field) => field?.includes(query))
    );
    setFilteredClients(filtered);
  }, [searchQuery, clients]);

  // Fetch cases when client is selected
  useEffect(() => {
    const fetchCases = async () => {
      if (!selectedClient) return;

      try {
        setLoadingCases(true);
        const user = supabase.auth.user();
        if (!user) throw new Error('User not logged in');

        const firmAdminId = await getAdminId();
        const effectiveAdminId = firmAdminId || user.id;

        const queryCondition = `admin_id.eq.${effectiveAdminId},lawyer_id.eq.${effectiveAdminId},admin_id.eq.${user.id},lawyer_id.eq.${user.id}`;

        const { data: casesData, error: casesError } = await supabase
          .from('cases')
          .select('*')
          .eq('client_name', selectedClient.client_name)
          .or(queryCondition);

        if (casesError) throw casesError;

        setCases(casesData || []);
        setFilteredCases(casesData || []);
      } catch (error) {
        console.error('Error fetching cases:', error.message);
      } finally {
        setLoadingCases(false);
      }
    };

    fetchCases();
  }, [selectedClient]);

  // Filter cases based on search
  useEffect(() => {
    if (!selectedClient) return;

    if (!searchQuery.trim()) {
      setFilteredCases(cases);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = cases.filter((caseItem) =>
      [caseItem.case_number, caseItem.caseType, caseItem.caseState]
        .map((field) => field?.toString().toLowerCase())
        .some((field) => field?.includes(query))
    );
    setFilteredCases(filtered);
  }, [searchQuery, cases, selectedClient]);

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setSearchQuery('');
    setCurrentStep(2);
  };

  const handleCaseSelect = (caseItem) => {
    setSelectedCase(caseItem);
    setSearchQuery('');
    setCurrentStep(3);
    fetchFolders(caseItem.case_number);
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setSelectedClient(null);
      setSelectedCase(null);
      setSearchQuery('');
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setSelectedCase(null);
      setSearchQuery('');
      setCurrentStep(2);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        // Create object URL for image preview
        const imageUrl = URL.createObjectURL(file);
        setSelectedFile(file);
        setCapturedImage(imageUrl);
        setProcessedImage(imageUrl);
        setIsEditing(true);
      } else {
        // Handle PDF files without editing
        setSelectedFile(file);
        setCapturedImage(null);
      }
    }
  };

  const handleCameraCaptureDirect = async () => {
    try {
      // Native: takePhoto opens the camera only (no album/camera prompt).
      // Web: getPhoto must use CameraSource.Camera ('CAMERA'); lowercase 'camera' does not match and native/web fall back to PROMPT ("From Photos" / "Take Picture").
      let webPath;
      if (Capacitor.isNativePlatform()) {
        const image = await CapacitorCamera.takePhoto({
          quality: 90,
          correctOrientation: true,
          saveToGallery: false,
          cameraDirection: CameraDirection.Rear,
          editable: 'no',
        });
        webPath = image.webPath;
      } else {
        const image = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
          direction: CameraDirection.Rear,
          saveToGallery: false,
          correctOrientation: true,
          webUseInput: true,
        });
        webPath = image.webPath;
      }

      // Convert URI to File object for upload
      const response = await fetch(webPath);
      const blob = await response.blob();
      const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });

      setSelectedFile(file);
      setCapturedImage(webPath);
      setProcessedImage(webPath);
      setIsEditing(true);
    } catch (error) {
      console.error('Camera capture error:', error);
      alert('فشل فتح الكاميرا. يرجى التحقق من الأذونات.');
    }
  };

  const retakePhoto = async () => {
    setIsEditing(false);
    setCapturedImage(null);
    setProcessedImage(null);
    setSelectedFile(null);
    await handleCameraCaptureDirect();
  };

  const handleCrop = () => {
    if (typeof cropperRef.current?.cropper !== 'undefined') {
      const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas();
      const croppedDataUrl = croppedCanvas.toDataURL('image/jpeg', 0.9);
      setProcessedImage(croppedDataUrl);

      croppedCanvas.toBlob((blob) => {
        const file = new File([blob], `cropped_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedFile(file);
        setCapturedImage(croppedDataUrl);
        setIsEditing(false);
      }, 'image/jpeg', 0.9);
    }
  };

  const resetToOriginal = () => {
    if (capturedImage) {
      setProcessedImage(capturedImage);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('يرجى اختيار ملف');
      return;
    }

    // Use provided title or generate default
    const title = documentTitle.trim() || `مستند ${new Date().toLocaleDateString('ar-EG')}`;

    try {
      setUploading(true);
      
      const fileName = `${Date.now()}_${selectedFile.name.replace(/\s+/g, '_')}`;
      const filePath = `${selectedFolder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { publicURL } = await supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('attachments')
        .insert({
          case_number: selectedCase.case_number,
          file_url: publicURL,
          folder_name: selectedFolder,
          file_name: selectedFile.name,
          created_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      setUploadSuccess(true);
      setTimeout(() => {
        // Reset form
        setDocumentTitle('');
        setDocumentDescription('');
        setSelectedFile(null);
        setCapturedImage(null);
        setUploadSuccess(false);
        // Go back to step 1 for next upload
        setSelectedClient(null);
        setSelectedCase(null);
        setCurrentStep(1);
      }, 2000);

    } catch (error) {
      console.error('Error uploading document:', error.message);
      alert('حدث خطأ أثناء رفع المستند: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const getClientInitials = (name) => {
    if (!name) return '؟';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return parts[0][0] + parts[1][0];
    return parts[0][0];
  };

  const steps = [
    { number: 1, label: 'اختيار الموكل', icon: Users },
    { number: 2, label: 'اختيار القضية', icon: Scale },
    { number: 3, label: 'رفع المستند', icon: FileText },
  ];

  return (
    <>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css" />
        <title>ارشفة فورية - محامي برو</title>
      </Head>
      <Layout>
        <div className="quick-archive-page">
          <div className="step-indicator">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.number === currentStep;
              const isCompleted = step.number < currentStep;
              return (
                <React.Fragment key={step.number}>
                  <div className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                    <div className="step-circle-wrap">
                      {isActive && <div className="step-pulse-ring" />}
                      <div className="step-number">
                        {isCompleted ? <FiCheck size={16} /> : <Icon size={16} />}
                      </div>
                    </div>
                    <span className="step-label">{step.label}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`step-connector ${step.number < currentStep ? 'completed' : ''}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {currentStep > 1 && (
            <div className="breadcrumb-bar">
              <span className="breadcrumb-item clickable" onClick={() => { setSelectedClient(null); setSelectedCase(null); setSearchQuery(''); setCurrentStep(1); }}>
                <Users size={14} />
                <span>الموكلين</span>
              </span>
              {selectedClient && (
                <>
                  <ChevronRight size={14} className="breadcrumb-sep" />
                  <span className={`breadcrumb-item ${currentStep === 2 ? 'active' : 'clickable'}`} onClick={() => { if (currentStep > 2) { setSelectedCase(null); setSearchQuery(''); setCurrentStep(2); } }}>
                    {selectedClient.client_name}
                  </span>
                </>
              )}
              {selectedCase && (
                <>
                  <ChevronRight size={14} className="breadcrumb-sep" />
                  <span className="breadcrumb-item active">
                    {selectedCase.case_number}
                  </span>
                </>
              )}
            </div>
          )}

          <div className="step-content-wrap">
            {/* Step 1: Client Selection */}
            {currentStep === 1 && (
              <div className="dashboard-card">
                <div className="card-header-modern header-blue">
                  <div className="card-header-icon-box" style={{ background: '#dbeafe' }}>
                    <Users size={15} style={{ color: '#2563eb' }} />
                  </div>
                  <h2 className="card-title-modern">اختيار الموكل</h2>
                  {filteredClients.length > 0 && (
                    <span className="result-count">{filteredClients.length} موكل</span>
                  )}
                </div>
                <div className="card-body">
                  <div className="search-bar">
                    <FiSearch className="search-icon" />
                    <input
                      type="text"
                      placeholder="البحث عن موكل بالاسم، الصفة القانونية..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button className="search-clear" onClick={() => setSearchQuery('')}><FiX size={16} /></button>
                    )}
                  </div>

                  {loadingClients ? (
                    <div className="loading-state">
                      <div className="loading-spinner" />
                      <span>جاري تحميل الموكلين...</span>
                    </div>
                  ) : (
                    <div className="client-list">
                      {filteredClients.length > 0 ? (
                        filteredClients.map((client) => (
                          <div
                            key={client.id}
                            className="item-card"
                            onClick={() => handleClientSelect(client)}
                          >
                            <div className="avatar-circle">
                              {getClientInitials(client.client_name)}
                            </div>
                            <div className="item-info">
                              <h3 className="item-name">{client.client_name}</h3>
                              <div className="item-meta">
                                {client.legal_form && <span className="meta-badge">{client.legal_form}</span>}
                                {client.address && <span className="meta-text">{client.address}</span>}
                              </div>
                            </div>
                            <FiChevronLeft className="item-arrow" />
                          </div>
                        ))
                      ) : (
                        <div className="empty-state">
                          <Users size={40} />
                          <span>لا يوجد موكلين</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Case Selection */}
            {currentStep === 2 && (
              <div className="dashboard-card">
                <div className="card-header-modern header-green">
                  <div className="card-header-icon-box" style={{ background: '#d1fae5' }}>
                    <Scale size={15} style={{ color: '#059669' }} />
                  </div>
                  <h2 className="card-title-modern">اختيار القضية</h2>
                  {filteredCases.length > 0 && (
                    <span className="result-count">{filteredCases.length} قضية</span>
                  )}
                </div>
                <div className="card-body">
                  <div className="search-bar">
                    <FiSearch className="search-icon" />
                    <input
                      type="text"
                      placeholder="البحث عن قضية بالرقم، النوع..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button className="search-clear" onClick={() => setSearchQuery('')}><FiX size={16} /></button>
                    )}
                  </div>

                  {loadingCases ? (
                    <div className="loading-state">
                      <div className="loading-spinner" />
                      <span>جاري تحميل القضايا...</span>
                    </div>
                  ) : (
                    <div className="case-list">
                      {filteredCases.length > 0 ? (
                        filteredCases.map((caseItem) => (
                          <div
                            key={caseItem.id}
                            className="item-card"
                            onClick={() => handleCaseSelect(caseItem)}
                          >
                            <div className="case-icon-circle">
                              <Scale size={18} />
                            </div>
                            <div className="item-info">
                              <h3 className="item-name">{caseItem.case_number}</h3>
                              <div className="item-meta">
                                {caseItem.caseType && <span className="meta-badge badge-green">{caseItem.caseType}</span>}
                                {caseItem.caseState && <span className="meta-badge badge-amber">{caseItem.caseState}</span>}
                              </div>
                            </div>
                            <FiChevronLeft className="item-arrow" />
                          </div>
                        ))
                      ) : (
                        <div className="empty-state">
                          <Scale size={40} />
                          <span>لا يوجد قضايا لهذا الموكل</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Document Upload */}
            {currentStep === 3 && (
              <div className="dashboard-card">
                <div className="card-header-modern header-purple">
                  <div className="card-header-icon-box" style={{ background: '#dbeafe' }}>
                    <Paperclip size={15} style={{ color: '#2563eb' }} />
                  </div>
                  <h2 className="card-title-modern">رفع المستند</h2>
                </div>
                <div className="card-body">
                  <div className="upload-form">
                    <div className="form-group">
                      <label>عنوان المستند *</label>
                      <input
                        type="text"
                        value={documentTitle}
                        onChange={(e) => setDocumentTitle(e.target.value)}
                        placeholder="أدخل عنوان المستند"
                      />
                    </div>

                    <div className="form-group">
                      <label>وصف المستند</label>
                      <textarea
                        value={documentDescription}
                        onChange={(e) => setDocumentDescription(e.target.value)}
                        placeholder="أدخل وصف المستند (اختياري)"
                        rows={3}
                      />
                    </div>

                    <div className="form-group">
                      <label>المجلد</label>
                      <div className="folder-pills">
                        {folders.map((folder) => (
                          <button
                            key={folder}
                            className={`folder-pill ${selectedFolder === folder ? 'active' : ''}`}
                            onClick={() => setSelectedFolder(folder)}
                          >
                            <FaFolder size={12} />
                            <span>{getFolderDisplayName(folder)}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="upload-zone-row">
                      <div
                        className="upload-zone"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={28} />
                        <span className="upload-zone-title">اختيار ملف</span>
                      </div>
                      <div
                        className="upload-zone camera-zone"
                        onClick={handleCameraCaptureDirect}
                      >
                        <Camera size={28} />
                        <span className="upload-zone-title">التقاط صورة</span>
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      accept="image/*,.pdf"
                      style={{ display: 'none' }}
                    />

                    {capturedImage && (
                      <div className="file-preview-card" onClick={() => setIsEditing(true)} style={{ cursor: 'pointer' }}>
                        <img src={capturedImage} alt="Captured document" className="preview-thumb" />
                        <div className="preview-info">
                          <span className="preview-name">{selectedFile?.name}</span>
                          <span className="preview-badge">صورة ملتقطة</span>
                        </div>
                        <button className="preview-remove" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setCapturedImage(null); }}><FiX size={18} /></button>
                      </div>
                    )}

                    {selectedFile && !capturedImage && (
                      <div className="file-preview-card">
                        <div className="preview-file-icon"><FileText size={24} /></div>
                        <div className="preview-info">
                          <span className="preview-name">{selectedFile.name}</span>
                          <span className="preview-badge">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                        </div>
                        <button className="preview-remove" onClick={() => setSelectedFile(null)}><FiX size={18} /></button>
                      </div>
                    )}

                    {/* Image Editing Modal with Interactive Crop */}
                    {isEditing && (
                      <div className="image-editing-modal">
                        <div className="editing-modal-content">
                          <div className="modal-image-container cropper-container">
                            <Cropper
                              ref={cropperRef}
                              src={processedImage}
                              style={{ height: '100%', width: '100%' }}
                              guides={false}
                              viewMode={1}
                              minCropBoxWidth={100}
                              minCropBoxHeight={100}
                              background={false}
                              responsive={true}
                              autoCropArea={0.8}
                              checkOrientation={false}
                              zoomable={false}
                              movable={true}
                              scalable={false}
                              rotatable={false}
                            />
                          </div>
                          <div className="modal-toolbar bottom-toolbar">
                            <button
                              className="modal-toolbar-btn cancel-btn"
                              onClick={() => setIsEditing(false)}
                            >
                              <FiX size={14} />
                              <span>إلغاء</span>
                            </button>
                            <button
                              className="modal-toolbar-btn retake-btn"
                              onClick={retakePhoto}
                            >
                              <FiCamera size={14} />
                              <span>إعادة</span>
                            </button>
                            <button
                              className="modal-toolbar-btn crop-btn"
                              onClick={handleCrop}
                            >
                              <FiCrop size={14} />
                              <span>قص</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="form-actions">
                      <button className="back-button" onClick={handleBack}>
                        <FiArrowRight size={16} />
                        <span>رجوع</span>
                      </button>
                      <button
                        className="upload-button"
                        onClick={handleUpload}
                        disabled={!selectedFile || uploading}
                      >
                        {uploading ? (
                          <>
                            <div className="btn-spinner" />
                            <span>جاري الرفع...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={18} />
                            <span>رفع المستند</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {uploadSuccess && (
            <div className="success-overlay">
              <div className="success-modal">
                <div className="success-check-circle">
                  <FiCheck size={36} />
                </div>
                <h3>تم رفع المستند بنجاح!</h3>
                <p>سيتم الانتقال للصفحة الرئيسية...</p>
              </div>
            </div>
          )}
        </div>

        <style jsx>{`
          /* ===== PAGE CONTAINER ===== */
          .quick-archive-page {
            padding: 12px 16px;
            max-width: 960px;
            margin: 0 auto;
            direction: rtl;
            font-family: 'Cairo', sans-serif;
            min-height: auto;
            color: #1E293B;
          }

          @media (min-width: 769px) {
            .quick-archive-page {
              background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
            }
          }

          /* ===== STEP INDICATOR ===== */
          .step-indicator {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 0 !important;
            margin-bottom: 12px;
            padding: 10px 16px;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border: 1px solid #f1f5f9;
          }

          .step-item {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 8px;
            opacity: 0.45;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            padding: 6px 10px;
            border-radius: 12px;
            flex-shrink: 0;
          }

          .step-item.active {
            opacity: 1;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
          }
          .step-item.completed {
            opacity: 1;
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
          }

          .step-circle-wrap {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .step-pulse-ring {
            position: absolute;
            width: 42px;
            height: 42px;
            border-radius: 50%;
            border: 2px solid #3b82f6;
            animation: pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }

          @keyframes pulseRing {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 0; transform: scale(1.25); }
          }

          .step-number {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            color: #94a3b8;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            z-index: 1;
          }

          .step-item.active .step-number {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            box-shadow: 0 3px 10px rgba(59, 130, 246, 0.3);
          }

          .step-item.completed .step-number {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3);
          }

          .step-label {
            font-size: 13px;
            font-weight: 700;
            color: #94a3b8;
            transition: color 0.3s ease;
            white-space: nowrap;
          }

          .step-item.active .step-label { color: #2563eb; }
          .step-item.completed .step-label { color: #059669; }

          .step-connector {
            flex: 1;
            height: 2px;
            background: #e2e8f0;
            border-radius: 2px;
            margin: 0 6px;
            transition: background 0.5s ease;
            max-width: 80px;
            min-width: 20px;
          }

          .step-connector.completed {
            background: linear-gradient(90deg, #10b981 0%, #3b82f6 100%);
          }

          /* ===== BREADCRUMB ===== */
          .breadcrumb-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: #ffffff;
            border-radius: 12px;
            margin-bottom: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
            font-size: 19px;
            font-weight: 700;
            color: #64748b;
          }

          .breadcrumb-item {
            display: flex;
            align-items: center;
            gap: 5px;
          }

          .breadcrumb-item.clickable {
            cursor: pointer;
            color: #3b82f6;
            transition: color 0.2s;
          }

          .breadcrumb-item.clickable:hover { color: #1d4ed8; }

          .breadcrumb-item.active {
            color: #1e293b;
            font-weight: 700;
          }

          .breadcrumb-sep { color: #cbd5e1; flex-shrink: 0; }

          /* ===== DASHBOARD CARD ===== */
          .step-content-wrap {
            animation: fadeUp 0.35s ease;
          }

          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .dashboard-card {
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border: 1px solid #f1f5f9;
            transition: box-shadow 0.3s ease;
          }

          .dashboard-card:hover {
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          }

          .card-header-modern {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            border-bottom: 1px solid #f1f5f9;
          }

          .header-blue {
            background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 50%, #f8fafc 100%);
            border-bottom-color: #bfdbfe;
          }

          .header-green {
            background: linear-gradient(135deg, #bbf7d0 0%, #dcfce7 50%, #f0fdf4 100%);
            border-bottom-color: #86efac;
          }

          .header-purple {
            background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 50%, #f8fafc 100%);
            border-bottom-color: #3b82f6;
          }

          .card-header-icon-box {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          }

          .card-title-modern {
            font-size: 15px;
            font-weight: 800;
            color: #000000;
            margin: 0;
            flex: 1;
          }

          .result-count {
            font-size: 12px;
            font-weight: 700;
            color: #64748b;
            background: #f1f5f9;
            padding: 3px 10px;
            border-radius: 20px;
          }

          .card-body {
            padding: 12px 16px 16px 16px;
          }

          /* ===== SEARCH BAR ===== */
          .search-bar {
            display: flex;
            align-items: center;
            gap: 0;
            background: #F8FAFC;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
            height: 40px;
            margin-bottom: 12px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .search-bar:focus-within {
            border-color: #3b82f6;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
            background: #ffffff;
          }

          .search-icon {
            color: #3b82f6;
            font-size: 18px;
            margin-right: 16px;
            flex-shrink: 0;
          }

          .search-bar input {
            flex: 1;
            border: none;
            background: transparent;
            font-size: 15px;
            font-family: 'Cairo', sans-serif;
            outline: none;
            height: 100%;
            padding: 0 12px;
            color: #1E293B;
            font-weight: 500;
          }

          .search-bar input::placeholder { color: #94a3b8; }

          .search-clear {
            background: none;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            padding: 0 14px;
            display: flex;
            align-items: center;
            height: 100%;
            transition: all 0.2s;
            border-radius: 8px;
            margin-left: 4px;
          }

          .search-clear:hover {
            color: #ef4444;
            background: #fef2f2;
          }

          /* ===== ITEM CARDS (Client / Case) ===== */
          .client-list,
          .case-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 420px;
            overflow-y: auto;
            padding-left: 4px;
          }

          .client-list::-webkit-scrollbar,
          .case-list::-webkit-scrollbar {
            width: 5px;
          }
          .client-list::-webkit-scrollbar-track,
          .case-list::-webkit-scrollbar-track {
            background: transparent;
          }
          .client-list::-webkit-scrollbar-thumb,
          .case-list::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
          }

          .item-card {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            background: #ffffff;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 2px solid #f1f5f9;
          }

          .item-card:hover {
            background: #f8fafc;
            border-color: #3b82f6;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.12);
            transform: translateY(-2px);
          }

          .item-card:active {
            transform: translateY(0);
          }

          .avatar-circle {
            width: 46px;
            height: 46px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
            font-weight: 700;
            flex-shrink: 0;
            letter-spacing: -0.5px;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
          }

          .case-icon-circle {
            width: 46px;
            height: 46px;
            border-radius: 50%;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
          }

          .item-info {
            flex: 1;
            min-width: 0;
          }

          .item-name {
            font-size: 18px;
            font-weight: 700;
            color: #1e293b;
            margin: 0 0 2px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .item-meta {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
          }

          .meta-badge {
            font-size: 11px;
            font-weight: 600;
            color: #3b82f6;
            background: #eff6ff;
            padding: 2px 8px;
            border-radius: 6px;
          }

          .meta-badge.badge-green {
            color: #059669;
            background: #ecfdf5;
          }

          .meta-badge.badge-amber {
            color: #d97706;
            background: #fffbeb;
          }

          .meta-text {
            font-size: 12px;
            color: #94a3b8;
          }

          .item-arrow {
            color: #cbd5e1;
            font-size: 18px;
            flex-shrink: 0;
            transition: transform 0.2s, color 0.2s;
          }

          .item-card:hover .item-arrow {
            color: #3b82f6;
            transform: translateX(-3px);
          }

          /* ===== LOADING & EMPTY STATES ===== */
          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 32px 16px;
            color: #94a3b8;
            font-size: 14px;
            font-weight: 600;
          }

          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #e2e8f0;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 32px 16px;
            color: #cbd5e1;
            font-size: 15px;
            font-weight: 600;
          }

          /* ===== UPLOAD FORM ===== */
          .upload-form {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .form-group label {
            font-weight: 700;
            color: #374151;
            font-size: 13px;
          }

          .form-group input,
          .form-group textarea {
            padding: 0 18px;
            height: 50px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            font-size: 15px;
            font-family: 'Cairo', sans-serif;
            outline: none;
            transition: all 0.25s ease;
            background: #ffffff;
            color: #1e293b;
            font-weight: 500;
          }

          .form-group textarea {
            height: auto;
            padding: 14px 18px;
            resize: vertical;
            min-height: 100px;
          }

          .form-group input:focus,
          .form-group textarea:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
            background: #fafbff;
          }

          .form-group input::placeholder,
          .form-group textarea::placeholder {
            color: #94a3b8;
            font-weight: 400;
          }

          /* ===== FOLDER PILLS ===== */
          .folder-pills {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .folder-pill {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 20px;
            border: 1.5px solid #e2e8f0;
            background: #ffffff;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            font-family: 'Cairo', sans-serif;
            transition: all 0.2s ease;
          }

          .folder-pill:hover {
            border-color: #93c5fd;
            background: #eff6ff;
            color: #2563eb;
          }

          .folder-pill.active {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border-color: transparent;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
          }

          /* ===== UPLOAD ZONES ===== */
          .upload-zone-row {
            display: flex;
            gap: 10px;
          }

          .upload-zone {
            flex: 1;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 16px;
            background: #f8fafc;
            border: 2.5px dashed #cbd5e1;
            border-radius: 14px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            color: #64748b;
          }

          .upload-zone:active {
            transform: translateY(-1px);
          }

          .camera-zone {
            border-color: #3b82f6;
            color: #2563eb;
          }

          .upload-zone-title {
            font-size: 15px;
            font-weight: 700;
          }

          .upload-zone-hint {
            font-size: 12px;
            opacity: 0.75;
          }

          /* ===== FILE PREVIEW ===== */
          .file-preview-card {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 14px;
            background: #eff6ff;
            border: 1.5px solid #3b82f6;
            border-radius: 10px;
            animation: fadeUp 0.3s ease;
          }

          .preview-thumb {
            width: 48px;
            height: 48px;
            object-fit: cover;
            border-radius: 8px;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          }

          .preview-file-icon {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ecfdf5;
            border-radius: 10px;
            color: #10b981;
            flex-shrink: 0;
          }

          .preview-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
          }

          .preview-name {
            font-size: 13px;
            font-weight: 700;
            color: #1e293b;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .preview-badge {
            font-size: 11px;
            font-weight: 600;
            color: #059669;
          }

          .preview-remove {
            background: none;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            padding: 6px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            transition: all 0.2s;
          }

          .preview-remove:hover {
            color: #ef4444;
            background: #fef2f2;
          }

          /* ===== ACTION BUTTONS ===== */
          .form-actions {
            display: flex;
            gap: 12px;
            margin-top: 8px;
          }

          .back-button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 0 24px;
            height: 50px;
            background: #ffffff;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 700;
            color: #64748b;
            font-family: 'Cairo', sans-serif;
            transition: all 0.25s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
          }

          .back-button:hover {
            background: #f1f5f9;
            border-color: #cbd5e1;
            transform: translateY(-1px);
          }

          .back-button:active {
            transform: translateY(0);
          }

          .upload-button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            height: 46px;
            padding: 8px 20px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            color: white;
            font-family: 'Cairo', 'Almarai', sans-serif;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
            max-width: 300px;
            width: auto;
          }

          .upload-button:hover:not(:disabled) {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
          }

          .upload-button:active:not(:disabled) {
            transform: translateY(0) scale(0.98);
          }

          .upload-button:disabled {
            cursor: not-allowed;
          }

          .btn-spinner {
            width: 18px;
            height: 18px;
            border: 2.5px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
          }

          /* ===== SUCCESS OVERLAY ===== */
          .success-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.5);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: fadeIn 0.25s ease;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .success-modal {
            background: #ffffff;
            border-radius: 20px;
            padding: 40px 48px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            animation: scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.85); }
            to { opacity: 1; transform: scale(1); }
          }

          .success-check-circle {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            margin: 0 auto 20px auto;
            box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
          }

          .success-modal h3 {
            font-size: 20px;
            font-weight: 800;
            color: #1e293b;
            margin: 0 0 8px 0;
          }

          .success-modal p {
            font-size: 14px;
            color: #64748b;
            margin: 0;
          }

          /* ===== RESPONSIVE ===== */
          @media (max-width: 768px) {
            .quick-archive-page {
              padding: 8px 12px 0 12px;
              background: #ffffff;
              min-height: 100vh;
            }

            .step-indicator {
              padding: 10px 10px;
              gap: 0;
              border-radius: 14px;
              margin-bottom: 12px;
            }

            .step-item {
              padding: 6px 8px;
              gap: 6px;
            }

            .step-label { font-size: 12px; }

            .step-number {
              width: 34px;
              height: 34px;
            }

            .step-pulse-ring {
              width: 40px;
              height: 40px;
            }

            .step-connector {
              max-width: 40px;
              min-width: 18px;
              margin: 0 4px;
            }

            .breadcrumb-bar {
              font-size: 18px;
              font-weight: 700;
              padding: 8px 10px;
              border-radius: 12px;
              margin-bottom: 12px;
            }

            .dashboard-card {
              border-radius: 14px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
            }

            .dashboard-card:hover {
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
            }

            .step-indicator {
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
            }

            .card-header-modern {
              padding: 8px 12px;
            }

            .card-header-icon-box {
              width: 32px;
              height: 32px;
            }

            .card-title-modern {
              font-size: 14px;
            }

            .result-count {
              font-size: 11px;
              padding: 3px 10px;
            }

            .card-body {
              padding: 12px 12px 12px 12px;
            }

            .search-bar {
              height: 40px;
              margin-bottom: 12px;
            }

            .search-icon {
              font-size: 16px;
              margin-right: 14px;
            }

            .search-bar input {
              font-size: 14px;
            }

            .item-card {
              padding: 10px 10px;
              border-radius: 12px;
            }

            .avatar-circle,
            .case-icon-circle {
              width: 44px;
              height: 44px;
              font-size: 15px;
            }

            .item-name {
              font-size: 18px;
            }

            .meta-badge {
              font-size: 11px;
              padding: 3px 8px;
            }

            .item-arrow {
              font-size: 16px;
            }

            .client-list,
            .case-list {
              max-height: 380px;
            }

            .form-group label {
              font-size: 13px;
            }

            .form-group input,
            .form-group textarea {
              height: 48px;
              font-size: 14px;
              border-radius: 12px;
            }

            .form-group textarea {
              padding: 12px 16px;
              min-height: 90px;
            }

            .folder-pills {
              gap: 8px;
            }

            .folder-pill {
              padding: 10px 14px;
              font-size: 12px;
              border-radius: 20px;
            }

            .upload-zone-row {
              flex-direction: column;
              gap: 12px;
            }

            .upload-zone {
              padding: 24px 16px;
              border-radius: 14px;
            }

            .upload-zone-title {
              font-size: 14px;
            }

            .upload-zone-hint {
              font-size: 11px;
            }

            .file-preview-card {
              padding: 12px 14px;
              border-radius: 12px;
            }

            .preview-thumb {
              width: 48px;
              height: 48px;
            }

            .preview-file-icon {
              width: 48px;
              height: 48px;
            }

            .preview-name {
              font-size: 13px;
            }

            .preview-badge {
              font-size: 11px;
            }

            .form-actions {
              flex-direction: column-reverse;
              gap: 12px;
              margin-top: 8px;
            }

            .back-button,
            .upload-button {
              width: 100%;
              max-width: none;
              height: 46px;
              font-size: 14px;
              border-radius: 8px;
            }

            .success-modal {
              margin: 0 20px;
              padding: 36px 28px;
              border-radius: 18px;
              max-width: calc(100vw - 40px);
            }

            .success-check-circle {
              width: 68px;
              height: 68px;
            }

            .success-modal h3 {
              font-size: 18px;
            }

            .success-modal p {
              font-size: 14px;
            }

            .loading-state {
              padding: 40px 24px;
            }

            .empty-state {
              padding: 40px 24px;
            }
          }

          @media (max-width: 480px) {
            .quick-archive-page {
              padding: 6px 10px 0 10px;
            }

            .step-indicator {
              padding: 10px 8px;
            }

            .step-item {
              padding: 6px 8px;
              gap: 6px;
            }

            .step-label {
              font-size: 10px;
            }

            .step-number {
              width: 28px;
              height: 28px;
            }

            .step-pulse-ring {
              width: 34px;
              height: 34px;
            }

            .step-connector {
              max-width: 25px;
              min-width: 10px;
              margin: 0 2px;
            }

            .breadcrumb-bar {
              font-size: 16px;
              font-weight: 700;
              padding: 8px 10px;
            }

            .card-header-modern {
              padding: 8px 12px;
            }

            .card-title-modern {
              font-size: 13px;
            }

            .card-body {
              padding: 12px 12px 16px 12px;
            }

            .search-bar {
              height: 40px;
            }

            .item-card {
              padding: 12px 10px;
            }

            .avatar-circle,
            .case-icon-circle {
              width: 36px;
              height: 36px;
              font-size: 13px;
            }

            .item-name {
              font-size: 16px;
            }

            .folder-pill {
              padding: 6px 10px;
              font-size: 11px;
            }

            .upload-zone {
              padding: 18px 12px;
            }

            .upload-zone-title {
              font-size: 12px;
            }

            .back-button,
            .upload-button {
              height: 46px;
              font-size: 14px;
            }
          }

          /* ===== IMAGE EDITING SCREEN ===== */
          .image-editing-screen {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #1e293b;
            z-index: 10000;
            display: flex;
            flex-direction: column;
          }

          .editing-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: #0f172a;
            border-bottom: 1px solid #334155;
            z-index: 10;
          }

          .editing-header h3 {
            color: white;
            font-size: 18px;
            font-weight: 700;
            margin: 0;
            font-family: 'Cairo', sans-serif;
          }

          .close-edit-btn {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: #334155;
            border: none;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.2s;
            z-index: 10;
          }

          .close-edit-btn:hover {
            background: #475569;
          }

          .image-preview-container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: #0f172a;
            position: relative;
            overflow: hidden;
          }

          .editing-image {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 8px;
            position: relative;
            z-index: 1;
          }

          .editing-toolbar {
            display: flex;
            gap: 8px;
            padding: 16px 20px;
            background: #0f172a;
            border-top: 1px solid #334155;
            overflow-x: auto;
            position: relative;
            z-index: 20;
            flex-shrink: 0;
          }

          .toolbar-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            min-width: 70px;
            padding: 12px 8px;
            background: #334155;
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
            font-family: 'Cairo', sans-serif;
          }

          .toolbar-btn:hover {
            background: #475569;
            transform: translateY(-2px);
          }

          .toolbar-btn span {
            font-size: 11px;
            font-weight: 600;
          }

          .toolbar-btn.confirm-btn {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          }

          .toolbar-btn.confirm-btn:hover {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          }

          .editing-grid-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 5;
          }

          .editing-grid-overlay .grid-line {
            position: absolute;
            background: rgba(59, 130, 246, 0.5);
          }

          .editing-grid-overlay .grid-line.horizontal {
            left: 0;
            right: 0;
            height: 1px;
          }

          .editing-grid-overlay .grid-line.horizontal:nth-child(1) { top: 33.33%; }
          .editing-grid-overlay .grid-line.horizontal:nth-child(2) { top: 66.66%; }

          .editing-grid-overlay .grid-line.vertical {
            top: 0;
            bottom: 0;
            width: 1px;
          }

          .editing-grid-overlay .grid-line.vertical:nth-child(3) { left: 33.33%; }
          .editing-grid-overlay .grid-line.vertical:nth-child(4) { left: 66.66%; }

          /* ===== INLINE IMAGE EDITING SECTION ===== */
          .image-editing-section {
            background: #f8fafc;
            border: 2px solid #3b82f6;
            border-radius: 12px;
            margin-bottom: 20px;
            overflow: hidden;
          }

          .editing-section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: #3b82f6;
          }

          .editing-section-header h3 {
            color: white;
            font-size: 14px;
            font-weight: 700;
            margin: 0;
            font-family: 'Cairo', sans-serif;
          }

          .close-edit-section-btn {
            width: 28px;
            height: 28px;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.2s;
          }

          .close-edit-section-btn:hover {
            background: rgba(255, 255, 255, 0.3);
          }

          .image-preview-section {
            padding: 16px;
            display: flex;
            justify-content: center;
            background: #f1f5f9;
          }

          .editing-image-section {
            max-width: 100%;
            max-height: 300px;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .editing-toolbar-section {
            display: flex;
            gap: 8px;
            padding: 12px 16px;
            background: white;
            border-top: 1px solid #e2e8f0;
            overflow-x: auto;
          }

          .toolbar-btn-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            min-width: 60px;
            padding: 8px 6px;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            color: #475569;
            cursor: pointer;
            transition: all 0.2s;
            font-family: 'Cairo', sans-serif;
            flex-shrink: 0;
          }

          .toolbar-btn-section:hover {
            background: #e2e8f0;
            border-color: #cbd5e1;
            transform: translateY(-1px);
          }

          .toolbar-btn-section span {
            font-size: 10px;
            font-weight: 600;
          }

          .toolbar-btn-section.confirm-btn-section {
            background: #3b82f6;
            border-color: #3b82f6;
            color: white;
          }

          .toolbar-btn-section.confirm-btn-section:hover {
            background: #2563eb;
            border-color: #2563eb;
          }

          /* ===== IMAGE EDITING MODAL ===== */
          .image-editing-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            z-index: 99999;
            display: flex;
            flex-direction: column;
          }

          .editing-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: rgba(15, 23, 42, 0.9);
            border-bottom: 1px solid #334155;
            z-index: 10;
          }

          .editing-modal-header h3 {
            color: white;
            font-size: 16px;
            font-weight: 700;
            margin: 0;
            font-family: 'Cairo', sans-serif;
          }

          .close-modal-btn {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: #334155;
            border: none;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.2s;
          }

          .close-modal-btn:hover {
            background: #475569;
          }

          .editing-modal-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            position: relative;
          }

          .modal-image-container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            padding-top: 100px;
            background: #0f172a;
            position: relative;
          }

          .modal-editing-image {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 8px;
          }

          .modal-toolbar {
            display: flex;
            gap: 12px;
            padding: 12px;
            background: rgba(15, 23, 42, 0.95);
            border-bottom: 1px solid #334155;
            justify-content: center;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            z-index: 20;
          }

          .modal-toolbar.bottom-toolbar {
            position: absolute;
            bottom: 0;
            top: auto;
            border-bottom: none;
            border-top: 1px solid #334155;
            padding-bottom: calc(12px + env(safe-area-inset-bottom, 50px));
          }

          .modal-toolbar-btn {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 3px;
            min-width: 45px;
            padding: 6px 10px;
            background: rgba(51, 65, 85, 0.9);
            border: 1px solid #475569;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
            font-family: 'Cairo', sans-serif;
            backdrop-filter: blur(10px);
          }

          .modal-toolbar-btn:hover {
            background: rgba(71, 85, 105, 0.9);
            border-color: #64748b;
            transform: translateY(-2px);
          }

          .modal-toolbar-btn span {
            font-size: 10px;
            font-weight: 600;
          }

          .modal-toolbar-btn.confirm-modal-btn {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            border-color: #3b82f6;
          }

          .modal-toolbar-btn.confirm-modal-btn:hover {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            border-color: #2563eb;
          }

          .modal-toolbar-btn.crop-btn {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            border-color: #3b82f6;
            min-width: 55px;
          }

          .modal-toolbar-btn.crop-btn:hover {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            border-color: #2563eb;
          }

          .modal-toolbar-btn.cancel-btn {
            background: rgba(51, 65, 85, 0.9);
            border-color: #ef4444;
          }

          .modal-toolbar-btn.cancel-btn:hover {
            background: rgba(239, 68, 68, 0.9);
            border-color: #dc2626;
          }

          .modal-toolbar-btn.retake-btn {
            background: rgba(51, 65, 85, 0.9);
            border-color: #3b82f6;
          }

          .modal-toolbar-btn.retake-btn:hover {
            background: rgba(59, 130, 246, 0.9);
            border-color: #2563eb;
          }

          .cropper-container {
            width: 100%;
            height: 90vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #0f172a;
            min-height: 400px;
            max-height: 850px;
          }

          .cropper-container > div {
            max-width: 100%;
            max-height: 100%;
          }

          /* CropperJS handle styling */
          .cropper-view-box,
          .cropper-face {
            outline: none;
          }

          .cropper-point {
            background-color: #3b82f6;
          }

          .cropper-point.point-se {
            width: 20px;
            height: 20px;
          }

          .cropper-point.point-sw {
            width: 20px;
            height: 20px;
          }

          .cropper-point.point-ne {
            width: 20px;
            height: 20px;
          }

          .cropper-point.point-nw {
            width: 20px;
            height: 20px;
          }

          .cropper-line {
            background-color: rgba(59, 130, 246, 0.5);
          }

          .cropper-grid {
            border-color: rgba(59, 130, 246, 0.3);
          }
        `}</style>
      </Layout>
    </>
  );
};

export default withAuth(QuickArchivePage);
