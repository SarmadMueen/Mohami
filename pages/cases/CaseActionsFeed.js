import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiPrinter, FiEdit, FiPaperclip, FiCalendar } from 'react-icons/fi';
import { supabase } from '../../lib/initSupabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const CaseActionsFeed = ({ caseDetails, onPrintReady, highlightedActionId, refreshTrigger }) => {
  // --- State Management ---
  const [actionsData, setActionsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [editAttachmentFile, setEditAttachmentFile] = useState(null);
  const [selectedAttachmentFolder, setSelectedAttachmentFolder] = useState("main");
  const editFileInputRef = useRef(null);

  // Default folders
  const defaultFolders = [
    "evidence",           // الاثباتات
    "judgments",          // الاحكام
    "execution",          // التنفيذ
    "accounts",           // الحسابات
    "documents",          // المستندات
    "session_minutes",    // محاضر الجلسات
    "opponent_files",     // ملفات الخصم
    "private_files"       // ملفات خاصة
  ];

  // Folder display name mapping
  const getFolderDisplayName = (folderName) => {
    const names = {
      evidence: "الاثباتات",
      judgments: "الاحكام",
      execution: "التنفيذ",
      accounts: "الحسابات",
      documents: "المستندات",
      session_minutes: "محاضر الجلسات",
      opponent_files: "ملفات الخصم",
      private_files: "ملفات خاصة",
      main: "المجلد الرئيسي",
      docs: "المستندات",
      session_register: "محاضر الجلسات",
    };
    return names[folderName] || folderName;
  };

  // --- Data Fetching ---
  const fetchActionData = useCallback(async () => {
    if (!caseDetails?.case_number) {
      setLoading(false);
      setActionsData([]);
      return;
    }
    setLoading(true);
    try {
      let query = supabase
        .from('actions')
        .select('*')
        .eq('case_number', caseDetails.case_number);

      if (caseDetails.admin_id) {
        query = query.eq('admin_id', caseDetails.admin_id);
      }

      const { data, error } = await query
        .order('actiondate', { ascending: false })
        .order('id', { ascending: false }); // Secondary sort by ID

      if (error) throw error;
      console.log('CaseActionsFeed fetched data:', data);
      setActionsData(data || []);
    } catch (error) {
      console.error('Error fetching actions data:', error.message);
    } finally {
      setLoading(false);
    }
  }, [caseDetails]);

  useEffect(() => {
    fetchActionData();
  }, [fetchActionData, refreshTrigger]);

  // --- Edit Popup and Save Logic ---
  const handleOpenEditPopup = (actionToEdit) => {
    setEditingAction(actionToEdit);
    setEditAttachmentFile(null);
    setSelectedAttachmentFolder("main"); // Reset folder selection
  };

  const handleCloseEditPopup = () => {
    setEditingAction(null);
  };

  const handleEditDataChange = (e) => {
    const { name, value } = e.target;
    setEditingAction(prevState => ({ ...prevState, [name]: value }));
  };

  const handleEditFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // If somehow folder is empty, re-check before proceeding
    if (!selectedAttachmentFolder) {
      alert("يرجى اختيار مجلد أولاً");
      e.target.value = "";
      return;
    }

    try {
      // Build a path like "docs/1678451234_myimage.jpg"
      const fileName = `${Date.now()}_action_${file.name}`;
      const filePath = `${selectedAttachmentFolder}/${fileName}`;

      // 1) Upload into Supabase Storage under bucket "images"
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Error uploading attachment:", uploadError.message);
        e.target.value = "";
        return;
      }

      // 2) Get the public URL of that file
      const { publicURL } = supabase.storage
        .from("images")
        .getPublicUrl(filePath);

      // 3) Update editingAction with the new attachment URL
      setEditingAction((prev) => ({
        ...prev,
        attachment: publicURL
      }));

      // Also store the file for reference
      setEditAttachmentFile(file);

      console.log("Attachment uploaded successfully into:", selectedAttachmentFolder);
    } catch (err) {
      console.error("Unexpected error uploading attachment:", err);
    } finally {
      // Clear the <input type="file"> so that selecting the same file again will still fire onChange
      e.target.value = "";
    }
  };

  const handleSaveAction = async (e) => {
    e.preventDefault();
    if (!editingAction) return;

    // Use the already uploaded attachment URL from editingAction
    // (file is uploaded immediately when selected via handleEditFileSelect)
    const updatedAttachmentUrl = editingAction.attachment || null;

    const { id, actiondate, actiontype, actionstatus, actiondetails, follow_up_date } = editingAction;
    const { error } = await supabase
      .from('actions')
      .update({
        actiondate,
        actiontype,
        actionstatus,
        actiondetails,
        follow_up_date,
        attachment: updatedAttachmentUrl,
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating action:', error.message);
    } else {
      handleCloseEditPopup();
      fetchActionData();
    }
  };

  // --- PDF Export Logic ---
  const handlePrint = async () => {
    const reportElement = document.getElementById('actions-container-for-pdf');
    if (!reportElement) return;
    setIsPrinting(true);
    try {
      const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      pdf.save(`case-${caseDetails.case_number}-actions.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setIsPrinting(false);
    }
  };

  // Expose print handler to parent
  useEffect(() => {
    if (onPrintReady) {
      onPrintReady({
        handlePrint,
        isPrinting,
        hasData: actionsData.length > 0 && actionsData.some(action => action.case_number === (caseDetails?.case_number || ''))
      });
    }
  }, [handlePrint, isPrinting, actionsData, caseDetails?.case_number, onPrintReady]);

  // --- Helper Functions ---
  const formatDate = (dateString) => {
    if (!dateString) return 'No Date';
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const getFileNameFromUrl = (url) => {
    if (!url) return '';
    try {
      const path = new URL(url).pathname;
      return decodeURIComponent(path.substring(path.lastIndexOf('/') + 1));
    } catch (e) {
      return url.substring(url.lastIndexOf('/') + 1);
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };


  if (loading) {
    return <div className="loading-message">جاري تحميل الإجراءات...</div>;
  }

  return (
    <>
      <div className="content-wrapper">
        <div id="actions-container-for-pdf" className="actions-container">
          {actionsData.length > 0 ? (
            actionsData.map((action) => (
              <div
                key={action.id}
                className={`action-card ${highlightedActionId === action.id ? 'highlighted-action' : ''}`}
                data-action-id={action.id}
              >
                <div className="action-header">
                  <div className="user-info">
                    <img src={'https://placehold.co/50x50'} alt="User Avatar" className="user-avatar" />
                    <div>
                      <p className="user-name">{action.lawyer_name || 'System User'}</p>
                      <p className="creation-date">{formatDate(action.actiondate)}</p>
                    </div>
                  </div>
                  <div className="action-icons print-hide">
                    <button onClick={() => handleOpenEditPopup(action)} className="icon-btn" title="تعديل"><FiEdit /></button>
                  </div>
                </div>
                <div className="action-body">
                  <div className="main-details">
                    <div className="detail-item"><span>تاريخ الإجراء:</span><p>{formatDate(action.actiondate)}</p></div>
                    <div className="detail-item"><span>نوع الإجراء:</span><p>{action.actiontype || '-'}</p></div>
                    <div className="detail-item"><span>حالة الإجراء:</span><p>{action.actionstatus || '-'}</p></div>
                  </div>
                  <div className="action-specifics">
                    <h4>تفاصيل الإجراء</h4>
                    <p className="details-text">{action.actiondetails || '-'}</p>
                  </div>
                </div>
                <div className="action-footer">
                  {action.follow_up_date && (
                    <div className="footer-item follow-up-date"><FiCalendar /><span>تاريخ المتابعة: {formatDate(action.follow_up_date)}</span></div>
                  )}
                  {action.attachment && (
                    <a href={action.attachment} target="_blank" rel="noopener noreferrer" className="footer-item attachment-link"><FiPaperclip /><span>{getFileNameFromUrl(action.attachment)}</span></a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-data-message-card"><p className="no-data-message">لا توجد إجراءات لعرضها.</p></div>
          )}
        </div>
      </div>

      {editingAction && (
        <div className="popup-overlay">
          <div className="reminder-popup-container">
            <div className="reminder-popup-header" style={{ backgroundColor: '#3b82f6' }}>
              <div className="reminder-header-content">
                <h2 style={{ color: '#ffffff' }}>تعديل الإجراء</h2>
              </div>
              <button
                type="button"
                className="reminder-close-btn-right"
                onClick={handleCloseEditPopup}
                aria-label="إغلاق"
                style={{ color: '#ffffff' }}
              >
                ×
              </button>
            </div>
            <div className="reminder-popup-content" style={{ padding: '12px 20px' }}>
              <form onSubmit={handleSaveAction} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="actiondate" style={{ fontSize: '15px', marginBottom: '4px' }}>
                    تاريخ الإجراء <span className="required-asterisk">*</span>
                  </label>
                  <input
                    className="reminder-form-input reminder-date-input"
                    type="date"
                    id="actiondate"
                    name="actiondate"
                    value={formatDateForInput(editingAction.actiondate)}
                    onChange={handleEditDataChange}
                    onClick={(e) => {
                      e.target.showPicker?.();
                    }}
                    required
                    style={{ padding: '10px 12px', fontSize: '15px' }}
                  />
                </div>

                <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="actiontype" style={{ fontSize: '15px', marginBottom: '4px' }}>
                    نوع الإجراء <span className="required-asterisk">*</span>
                  </label>
                  <input
                    className="reminder-form-input"
                    type="text"
                    id="actiontype"
                    name="actiontype"
                    value={editingAction.actiontype || ''}
                    onChange={handleEditDataChange}
                    style={{ padding: '10px 12px', fontSize: '15px' }}
                  />
                </div>

                <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="actionstatus" style={{ fontSize: '15px', marginBottom: '4px' }}>
                    حالة الإجراء <span className="required-asterisk">*</span>
                  </label>
                  <input
                    className="reminder-form-input"
                    type="text"
                    id="actionstatus"
                    name="actionstatus"
                    value={editingAction.actionstatus || ''}
                    onChange={handleEditDataChange}
                    style={{ padding: '10px 12px', fontSize: '15px' }}
                  />
                </div>

                <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="actiondetails" style={{ fontSize: '15px', marginBottom: '4px' }}>
                    تفاصيل الإجراء <span className="required-asterisk">*</span>
                  </label>
                  <textarea
                    className="reminder-form-textarea"
                    id="actiondetails"
                    name="actiondetails"
                    rows={4}
                    value={editingAction.actiondetails || ''}
                    onChange={handleEditDataChange}
                    required
                    style={{
                      padding: '10px 12px',
                      fontSize: '15px',
                      minHeight: '80px',
                      resize: 'none',
                      userSelect: 'text'
                    }}
                    onDragStart={(e) => e.preventDefault()}
                    onDrag={(e) => e.preventDefault()}
                  />
                </div>

                <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="follow_up_date" style={{ fontSize: '15px', marginBottom: '4px' }}>
                    تاريخ المتابعة
                  </label>
                  <input
                    className="reminder-form-input reminder-date-input"
                    type="date"
                    id="follow_up_date"
                    name="follow_up_date"
                    value={formatDateForInput(editingAction.follow_up_date)}
                    onChange={handleEditDataChange}
                    onClick={(e) => {
                      e.target.showPicker?.();
                    }}
                    style={{ padding: '10px 12px', fontSize: '15px' }}
                  />
                </div>

                <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '15px', marginBottom: '4px' }}>
                    تغيير المرفق (اختياري)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <select
                      className="reminder-form-input reminder-form-select"
                      value={selectedAttachmentFolder || "main"}
                      onChange={(e) => setSelectedAttachmentFolder(e.target.value)}
                      style={{ flex: '0 0 200px', margin: 0, padding: '10px 12px', fontSize: '15px' }}
                    >
                      <option value="main">المجلد الرئيسي</option>
                      {defaultFolders.filter(f => f !== "main").map((folder) => (
                        <option key={folder} value={folder}>
                          {getFolderDisplayName(folder)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedAttachmentFolder) {
                          alert("يرجى اختيار مجلد أولاً");
                          return;
                        }
                        editFileInputRef.current.click();
                      }}
                      style={{
                        padding: '10px 16px',
                        fontSize: '15px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
                        transition: 'all 0.2s',
                        height: '38px',
                      }}
                    >
                      تحميل مرفق
                    </button>
                    <input
                      type="file"
                      ref={editFileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleEditFileSelect}
                    />
                  </div>
                  {editingAction.attachment && !editAttachmentFile && (
                    <small style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginTop: '8px' }}>
                      الملف الحالي: {getFileNameFromUrl(editingAction.attachment)}
                    </small>
                  )}
                  {editAttachmentFile && (
                    <small style={{ fontSize: '12px', color: '#059669', display: 'block', marginTop: '8px', fontWeight: '600' }}>
                      ✓ تم تحميل الملف: {editAttachmentFile.name}
                    </small>
                  )}
                </div>

                <div className="reminder-button-container" style={{ marginTop: '8px', paddingTop: '12px' }}>
                  <button
                    type="button"
                    className="reminder-cancel-button"
                    onClick={handleCloseEditPopup}
                    style={{ padding: '10px 18px', fontSize: '15px' }}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="reminder-add-button"
                    style={{ padding: '10px 18px', fontSize: '15px' }}
                  >
                    حفظ التغييرات
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Professional Styles for Actions Feed */
        .content-wrapper { 
          padding: 0 !important; 
          background-color: transparent !important; 
          font-family: 'Cairo', 'Almarai', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important; 
          direction: rtl; 
          width: 100%; 
          margin: 0;
        }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; }
        /* Removed .section-heading - using parent component's style */
        .actions-container { 
          display: flex; 
          flex-direction: column; 
          gap: 20px; 
          padding: 0 !important;
          margin: 0;
        }
        .action-card, .card { background-color: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); }
        .action-header, .card-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; }
        .user-info { display: flex; align-items: center; gap: 12px; }
        .user-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
        .user-name { font-weight: 600; color: #111827; margin: 0; font-size: 0.9rem; }
        .creation-date { font-size: 0.8rem; color: #6b7280; margin: 0; }
        .action-icons { display: flex; gap: 8px; }
        .icon-btn { background: none; border: none; font-size: 1.25rem; color: #6b7280; cursor: pointer; transition: color 0.2s ease, background-color 0.2s ease; padding: 6px; border-radius: 50%; display: flex; align-items: center; }
        .icon-btn:hover { color: #1f2937; background-color: #e5e7eb; }
        .action-body, .card-body { display: flex; padding: 20px 24px; }
        .main-details { flex: 1; min-width: 300px; padding-left: 24px; border-left: 1px solid #e5e7eb; }
        .detail-item { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; }
        .detail-item:last-child { margin-bottom: 0; }
        .detail-item span { font-size: 0.875rem; color: #6b7280; font-weight: 600; flex-shrink: 0; }
        .detail-item p { margin: 0; font-size: 0.95rem; color: #111827; font-weight: 500; }
        .action-specifics { flex: 1; padding-right: 24px; }
        .action-specifics h4 { font-size: 1rem; color: #374151; margin: 0 0 10px 0; }
        .details-text, .action-specifics p { color: #374151; line-height: 1.6; white-space: pre-wrap; }
        .action-footer, .card-footer { display: flex; justify-content: flex-end; align-items: center; gap: 24px; padding: 12px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; }
        .footer-item { display: inline-flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: 500; }
        .follow-up-date { color: #1d4ed8; background-color: #eef2ff; padding: 6px 12px; border-radius: 6px; }
        .attachment-link { color: #059669; text-decoration: none; }
        .attachment-link:hover { text-decoration: underline; }
        .print-button { display: inline-flex; align-items: center; gap: 8px; background-color: #3b82f6; color: white; border: none; padding: 8px 16px; font-size: 0.9rem; font-weight: 600; border-radius: 6px; cursor: pointer; transition: background-color 0.3s ease; }
        .print-button:hover { background-color: #2563eb; }
        .print-button:disabled { background-color: #9ca3af; cursor: not-allowed; }
        .no-data-message-card, .loading-message { text-align: center; font-size: 1rem; color: #6b7280; padding: 40px; background-color: #fff; border-radius: 12px; border: 1px solid #e5e7eb; }
        
        /* Popup Styles - Matching reminder popup style */
        .popup-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .reminder-popup-container { background: #fff; width: 90%; max-width: 480px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); overflow: hidden; direction: rtl; }
        .reminder-popup-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e5e7eb; }
        .reminder-header-content { display: flex; align-items: center; gap: 12px; }
        .reminder-header-content h2 { margin: 0; font-size: 16px; font-weight: 700; line-height: 1.2; }
        .reminder-close-btn-right { background: none; border: none; font-size: 24px; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: all 0.2s; }
        .reminder-close-btn-right:hover { background-color: rgba(255, 255, 255, 0.2); }
        .reminder-popup-content { padding: 20px; }
        .reminder-form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
        .reminder-form-group label { font-weight: 600; color: #374151; font-size: 13px; }
        .required-asterisk { color: #ef4444; margin-right: 4px; }
        .reminder-form-input, .reminder-form-textarea, .reminder-form-select { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; font-family: inherit; transition: border-color 0.2s, box-shadow 0.2s; }
        .reminder-form-input:focus, .reminder-form-textarea:focus, .reminder-form-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        .reminder-form-textarea { resize: none; min-height: 80px; user-select: text; }
        .reminder-form-textarea::-webkit-resizer { display: none; }
        .reminder-form-select { cursor: pointer; }
        .reminder-button-container { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
        .reminder-cancel-button { background: #f3f4f6; color: #374151; padding: 8px 18px; border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s; }
        .reminder-cancel-button:hover { background: #e5e7eb; }
        .reminder-add-button { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #fff; padding: 8px 18px; border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3); }
        .reminder-add-button:hover { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); transform: translateY(-1px); }

        .highlighted-action {
          background-color: #f0f9ff !important;
          border: 2px solid #3b82f6 !important;
          animation: pulse-border 2s infinite;
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2) !important;
          transition: all 0.5s ease;
        }
        @keyframes pulse-border {
          0% { border-color: #3b82f6; }
          50% { border-color: #93c5fd; }
          100% { border-color: #3b82f6; }
        }

        @media print { .print-hide { display: none !important; } .action-card { box-shadow: none !important; border: 1px solid #ccc !important; page-break-inside: avoid; } .section-header { display: none !important; } }

        @media (max-width: 768px) {
          .action-card {
            box-shadow: none !important;
            border-radius: 8px !important;
            border: 1px solid #e2e8f0;
          }
          .action-header {
            padding: 10px 12px !important;
          }
          .action-body {
            padding: 12px 14px !important;
            flex-direction: column !important;
            gap: 12px;
          }
          .main-details {
            padding-left: 0 !important;
            border-left: none !important;
            min-width: 0 !important;
            margin-bottom: 8px;
          }
          .action-specifics {
            padding-right: 0 !important;
            width: 100%;
          }
          .user-name {
            font-size: 0.85rem;
          }
          .creation-date {
            font-size: 0.75rem;
          }
          .action-footer {
            padding: 10px 14px !important;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: flex-start;
          }
          .detail-item span {
            font-size: 0.8rem;
          }
          .detail-item p {
            font-size: 0.85rem;
          }
          .details-text {
            font-size: 0.85rem;
          }
        }
      `}</style>
    </>
  );
};

export default CaseActionsFeed;