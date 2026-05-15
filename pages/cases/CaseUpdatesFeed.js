import React, { useState, useEffect } from 'react';
import { FiPrinter, FiMessageSquare, FiEdit, FiPaperclip } from 'react-icons/fi';
import { supabase } from '../../lib/initSupabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const CaseUpdatesFeed = ({ caseDetails, onAddUpdate, onAddReminder, onPrintReady }) => {
  const [caseUpdates, setCaseUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  // State for managing the edit popup and its data
  const [editingUpdate, setEditingUpdate] = useState(null);
  const [editAttachmentFile, setEditAttachmentFile] = useState(null);
  const [selectedEditAttachmentFolder, setSelectedEditAttachmentFolder] = useState("main");
  const editFileInputRef = React.useRef(null);

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

  const fetchCaseUpdates = async () => {
    if (!caseDetails?.case_number) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let query = supabase
        .from('case_update')
        .select('*')
        .eq('case_number', caseDetails.case_number);

      if (caseDetails.admin_id) {
        query = query.eq('admin_id', caseDetails.admin_id);
      }

      const { data, error } = await query
        .order('update_date', { ascending: false });

      if (error) throw error;
      setCaseUpdates(data || []);
    } catch (error) {
      console.error('Error fetching case updates:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseUpdates();
  }, [caseDetails]);

  const handleOpenEditPopup = (updateToEdit) => {
    setEditingUpdate(updateToEdit);
    setEditAttachmentFile(null); // Reset file on open
    setSelectedEditAttachmentFolder("main"); // Reset folder selection
  };

  const handleCloseEditPopup = () => {
    setEditingUpdate(null);
    setEditAttachmentFile(null);
    setSelectedEditAttachmentFolder("main");
  };

  const handleEditDataChange = (e) => {
    const { name, value } = e.target;
    setEditingUpdate(prevState => ({ ...prevState, [name]: value }));
  };

  const handleEditFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedEditAttachmentFolder) {
      alert("يرجى اختيار مجلد أولاً");
      e.target.value = "";
      return;
    }

    try {
      const fileName = `${Date.now()}_update_${file.name}`;
      const filePath = `${selectedEditAttachmentFolder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Error uploading attachment:", uploadError.message);
        alert('حدث خطأ أثناء تحميل المرفق: ' + uploadError.message);
        e.target.value = "";
        return;
      }

      const { publicURL } = supabase.storage
        .from("images")
        .getPublicUrl(filePath);

      // Insert a row into the "attachments" table
      const attachmentToInsert = {
        file_name: file.name,
        file_url: publicURL,
        case_number: caseDetails.case_number,
        created_at: new Date().toISOString(),
        folder_name: selectedEditAttachmentFolder,
      };

      const { error: insertError } = await supabase
        .from("attachments")
        .insert([attachmentToInsert]);

      if (insertError) {
        console.error("Error inserting attachment row:", insertError.message);
        e.target.value = "";
        return;
      }

      // Update editingUpdate with the new attachment URL
      setEditingUpdate(prevState => ({ ...prevState, attachment_url: publicURL }));
      setEditAttachmentFile(file);

      alert('تم تحميل المرفق بنجاح!');

    } catch (err) {
      console.error("Unexpected error uploading attachment:", err);
      alert('حدث خطأ غير متوقع أثناء تحميل المرفق.');
    } finally {
      e.target.value = "";
    }
  };

  const handleSaveUpdate = async (e) => {
    e.preventDefault();
    if (!editingUpdate) return;

    // Use the already uploaded attachment URL from editingUpdate
    // (file is uploaded immediately when selected via handleEditFileSelect)
    const updatedAttachmentUrl = editingUpdate.attachment_url || null;

    const { id, update_date, update_details } = editingUpdate;
    const { error } = await supabase
      .from('case_update')
      .update({
        update_date,
        update_details,
        attachment_url: updatedAttachmentUrl,
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating data:', error.message);
      alert(`خطأ في تحديث التحديث: ${error.message}`);
    } else {
      alert('تم تحديث التحديث بنجاح');
      handleCloseEditPopup();
      fetchCaseUpdates();
    }
  };

  const handleDeleteUpdate = async (updateId) => {
    try {
      const { error } = await supabase
        .from('case_update')
        .delete()
        .eq('id', updateId);

      if (error) {
        console.error('Error deleting update:', error);
        alert(`خطأ في حذف التحديث: ${error.message}`);
        return;
      }

      alert('تم حذف التحديث بنجاح');
      fetchCaseUpdates();
    } catch (error) {
      console.error('Error:', error);
      alert(`حدث خطأ غير متوقع: ${error.message}`);
    }
  };

  const handleAddReminder = (update) => {
    if (onAddReminder) {
      onAddReminder({
        reminderTitle: `تذكير: تحديث القضية`,
        reminderDate: update.update_date || '',
        reminderNote: `تذكير بخصوص التحديث: ${update.update_details || ''}`
      });
    }
  };

  const handlePrint = async () => {
    const reportElement = document.getElementById('updates-container');
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
      pdf.save(`case-${caseDetails.case_number ? caseDetails.case_number.replace(/^.*_/, '') : 'updates'}.pdf`);
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
        hasData: caseUpdates.length > 0
      });
    }
  }, [handlePrint, isPrinting, caseUpdates.length, onPrintReady]);

  const formatDate = (dateString) => {
    if (!dateString) return 'No Date';
    return new Date(dateString).toLocaleDateString('ar-EG', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric',
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
    return <div className="loading-message" style={{ padding: '32px', textAlign: 'center' }}>جاري تحميل التحديثات...</div>;
  }

  return (
    <>
      {/* Empty State */}
      {caseUpdates.length === 0 && (
        <div
          className="no-expenses-container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            width: '100%',
            margin: '20px auto 0',
            direction: 'ltr',
            padding: '40px 40px',
            minHeight: '200px'
          }}
        >
          <p
            className="no-expenses-message"
            style={{
              margin: '0 0 24px',
              textAlign: 'center',
              width: '100%',
              direction: 'rtl',
              fontSize: '1.2rem',
              color: '#6c757d',
              lineHeight: '1.6',
              maxWidth: '500px'
            }}
          >
            لم يتم العثور على أي تحديثات متعلقة بهذه الدعوى.
          </p>
          <button
            onClick={() => {
              if (onAddUpdate) {
                onAddUpdate();
              }
            }}
            className="btn btn-primary add-fee-button-empty"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              padding: '14px 32px',
              fontSize: '1.05rem',
              fontWeight: '600',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
              direction: 'rtl'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
              e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
              e.target.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <i className="fas fa-plus" style={{ marginLeft: '8px' }}></i>
            إضافة تحديث
          </button>
        </div>
      )}

      {/* Updates List */}
      {caseUpdates.length > 0 && (
        <div className="updates-tab-content-wrapper" style={{ padding: '0 32px 32px 32px', backgroundColor: '#ffffff', minHeight: '100%', flex: 1 }}>
          <div id="updates-container" className="updates-container">
            {caseUpdates.map((update) => (
              <div key={update.id} className="update-card">
                <div className="update-header">
                  <div className="update-user">
                    <img
                      src="https://placehold.co/50x50"
                      alt={`${update.user_name || 'مستخدم'} avatar`}
                      className="user-avatar"
                    />
                    <div className="user-info">
                      <p className="user-name">{update.user_name || 'مستخدم'}</p>
                      {update.update_date && (
                        <p className="creation-date">
                          {new Date(update.update_date).toLocaleDateString('ar-EG', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                          {' الساعة '}
                          {new Date(update.update_date).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="update-header-actions">
                    <button
                      className="update-header-icon-btn"
                      onClick={() => handleAddReminder(update)}
                      title="إضافة تذكير"
                    >
                      🔔
                    </button>
                    <button
                      className="update-header-icon-btn"
                      onClick={() => handleOpenEditPopup(update)}
                      title="تعديل"
                    >
                      ✏️
                    </button>
                    <button
                      className="update-header-icon-btn"
                      onClick={() => {
                        if (confirm('هل أنت متأكد من حذف التحديث؟')) {
                          handleDeleteUpdate(update.id);
                        }
                      }}
                      title="حذف"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="update-details">
                  <div className="update-info-list">
                    {(update.update_date || update.attachment_url) && (
                      <div className="update-info-row update-info-multi">
                        {update.update_date && (
                          <div className="update-info-item-inline">
                            <span className="update-info-label-inline">تاريخ التحديث:</span>
                            <span className="update-info-text-inline">
                              {new Date(update.update_date).toLocaleDateString('ar-EG', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                        {update.attachment_url && (
                          <div className="update-info-item-inline">
                            <span className="update-info-label-inline">مرفقات التحديث:</span>
                            <div className="update-attachments-inline">
                              <a
                                href={update.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="update-attachment-link-inline"
                                title="عرض الملف"
                              >
                                <span className="attachment-icon">📎</span>
                                <span className="attachment-name">{getFileNameFromUrl(update.attachment_url)}</span>
                                <span className="attachment-view-icon">👁️</span>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {update.update_details && (
                      <div className="update-info-row">
                        <span className="update-info-label">تفاصيل التحديث:</span>
                        <span className="update-info-text">{update.update_details}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingUpdate && (
        <div className="popup-overlay-reminder">
          <div className="reminder-popup-container">
            <div className="reminder-popup-header" style={{ backgroundColor: '#3b82f6' }}>
              <div className="reminder-header-content">
                <h2 style={{ color: '#ffffff' }}>تعديل التحديث</h2>
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
            <div className="reminder-popup-content">
              <form onSubmit={handleSaveUpdate}>
                <div className="reminder-form-group">
                  <label htmlFor="update_date">
                    تاريخ التحديث <span className="required-asterisk">*</span>
                  </label>
                  <input
                    className="reminder-form-input reminder-date-input"
                    type="date"
                    id="update_date"
                    name="update_date"
                    value={formatDateForInput(editingUpdate.update_date)}
                    onChange={handleEditDataChange}
                    onClick={(e) => {
                      e.target.showPicker?.();
                    }}
                    required
                  />
                </div>
                <div className="reminder-form-group">
                  <label htmlFor="update_details">
                    تفاصيل التحديث <span className="required-asterisk">*</span>
                  </label>
                  <textarea
                    className="reminder-form-textarea"
                    id="update_details"
                    name="update_details"
                    rows="4"
                    value={editingUpdate.update_details}
                    onChange={handleEditDataChange}
                    placeholder="اكتب تفاصيل التحديث هنا..."
                    required
                  />
                </div>
                <div className="reminder-form-group">
                  <label>تغيير المرفق (اختياري)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <select
                      className="reminder-form-input reminder-form-select"
                      value={selectedEditAttachmentFolder || "main"}
                      onChange={(e) => setSelectedEditAttachmentFolder(e.target.value)}
                      style={{ flex: '0 0 200px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
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
                        if (!selectedEditAttachmentFolder) {
                          alert("يرجى اختيار مجلد أولاً");
                          return;
                        }
                        editFileInputRef.current.click();
                      }}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
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
                  {editAttachmentFile && (
                    <small style={{ fontSize: '12px', color: '#10b981', display: 'block', marginTop: '8px', fontWeight: '600' }}>
                      ✓ تم تحميل الملف: {editAttachmentFile.name}
                    </small>
                  )}
                  {editingUpdate.attachment_url && !editAttachmentFile && (
                    <small style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginTop: '8px' }}>
                      الملف الحالي: {getFileNameFromUrl(editingUpdate.attachment_url)}
                    </small>
                  )}
                </div>
                <div className="reminder-button-container">
                  <button
                    type="button"
                    className="reminder-cancel-button"
                    onClick={handleCloseEditPopup}
                  >
                    إلغاء
                  </button>
                  <button type="submit" className="reminder-add-button">
                    حفظ
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .updates-tab-content-wrapper { 
          padding: 24px; 
          background-color: #ffffff !important; 
          width: 100%;
          min-height: 100%;
          flex: 1;
          font-family: 'Almarai', 'Segoe UI', Tahoma, sans-serif; 
          direction: rtl; 
        }
        .section-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 20px; 
          padding-bottom: 12px; 
          border-bottom: 1px solid #e5e7eb; 
        }
        .section-heading { 
          font-size: 1.5rem; 
          font-weight: 700; 
          color: #1f2937; 
          margin: 0; 
        }
        .updates-container { 
          display: flex; 
          flex-direction: column; 
          gap: 16px; 
        }
        .update-card { 
          background-color: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          gap: 0;
          width: 100%;
          overflow: hidden;
        }
        .update-header { 
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        .update-user {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .user-avatar { 
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid #eee;
          flex-shrink: 0;
        }
        .user-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .user-name { 
          font-weight: 600;
          font-size: 0.8rem;
          color: #2d3748;
          margin: 0;
        }
        .creation-date { 
          font-size: 0.7rem;
          color: #718096;
          margin: 0;
        }
        .update-header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .update-header-icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
          padding: 6px;
          color: #9ca3af;
          border-radius: 4px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .update-header-icon-btn:hover {
          background: #f3f4f6;
          color: #374151;
        }
        .update-details {
          padding: 16px 20px;
        }
        .update-info-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .update-info-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .update-info-row:last-child {
          border-bottom: none;
        }
        .update-info-label {
          font-weight: 700;
          font-size: 14px;
          color: #1f2937;
          min-width: 140px;
          flex-shrink: 0;
        }
        .update-info-text {
          font-weight: 400;
          font-size: 14px;
          color: #1f2937;
          line-height: 1.6;
          flex: 1;
          word-wrap: break-word;
          white-space: pre-wrap;
        }
        .update-info-row.update-info-multi {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          align-items: center;
          margin-top: 8px;
        }
        .update-info-item-inline {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 0 1 auto;
          min-width: fit-content;
        }
        .update-info-label-inline {
          font-weight: 700;
          font-size: 14px;
          color: #1f2937;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .update-info-text-inline {
          font-weight: 400;
          font-size: 14px;
          color: #1f2937;
          line-height: 1.5;
          word-wrap: break-word;
          flex: 1;
        }
        .update-attachments-inline {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 4px;
        }
        .update-attachment-link-inline {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background-color: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          color: #3b82f6;
          font-size: 0.85rem;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .update-attachment-link-inline:hover {
          background-color: #eef2ff;
          border-color: #3b82f6;
        }
        .attachment-icon {
          font-size: 14px;
        }
        .attachment-name {
          font-weight: 500;
        }
        .attachment-view-icon {
          font-size: 12px;
          opacity: 0.7;
        }
        .print-button { 
          display: inline-flex; 
          align-items: center; 
          gap: 8px; 
          background-color: #3b82f6; 
          color: white; 
          border: none; 
          padding: 8px 16px; 
          font-size: 0.9rem; 
          font-weight: 600; 
          border-radius: 6px; 
          cursor: pointer; 
          transition: background-color 0.3s ease; 
        }
        .print-button:hover { 
          background-color: #2563eb; 
        }
        .print-button:disabled { 
          background-color: #9ca3af; 
          cursor: not-allowed; 
        }
        
        /* Popup Styles - Using reminder popup styles */
        .popup-overlay-reminder {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(4px);
        }
        .reminder-popup-container {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .reminder-popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          background: #ffffff;
          border-radius: 12px 12px 0 0;
        }
        .reminder-header-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .reminder-header-content h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
        }
        .reminder-close-btn-right {
          background: none;
          border: none;
          font-size: 28px;
          color: #6b7280;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .reminder-close-btn-right:hover {
          background: #f3f4f6;
          color: #1f2937;
        }
        .reminder-popup-content {
          padding: 24px;
        }
        .reminder-form-group {
          margin-bottom: 20px;
        }
        .reminder-form-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }
        .reminder-form-input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          color: #1f2937;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .reminder-form-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .reminder-form-textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          color: #1f2937;
          resize: none;
          font-family: inherit;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .reminder-form-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .reminder-form-select {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          color: #1f2937;
          background: #ffffff;
          cursor: pointer;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .reminder-form-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .required-asterisk {
          color: #ef4444;
          margin-right: 4px;
        }
        .reminder-button-container {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }
        .reminder-cancel-button {
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .reminder-cancel-button:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }
        .reminder-add-button {
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
        }
        .reminder-add-button:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
          transform: translateY(-1px);
        }

        @media print { 
          .print-hide { 
            display: none !important; 
          } 
          .update-card { 
            box-shadow: none !important; 
            border: 1px solid #ccc !important; 
            page-break-inside: avoid; 
          } 
        }

        @media (max-width: 768px) {
          .updates-tab-content-wrapper {
            padding: 8px !important;
          }
          .update-card {
            box-shadow: none !important;
            border-radius: 8px !important;
            border: 1px solid #e2e8f0 !important;
            margin-bottom: 12px !important;
          }
          .update-header {
            padding: 10px 12px !important;
          }
          .update-details {
            padding: 12px 14px !important;
          }
          .update-info-label {
            min-width: 100px !important;
            font-size: 13px !important;
          }
          .update-info-text {
            font-size: 13px !important;
          }
          .update-info-row.update-info-multi {
            gap: 12px !important;
          }
        }
      `}</style>
    </>
  );
};

export default CaseUpdatesFeed;