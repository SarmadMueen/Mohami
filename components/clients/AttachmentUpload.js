/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/initSupabase';

const AttachmentUpload = ({ caseNumber }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [editingAttachment, setEditingAttachment] = useState(null);
  const [newFile, setNewFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
  };

  const fetchAttachments = async () => {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('case_number', caseNumber);

    if (error) {
      console.error('Error fetching attachments:', error);
      return;
    }

    setAttachments(data);
  };

  useEffect(() => {
    fetchAttachments();
  }, [caseNumber]);

  const handleUpload = async () => {
    if (!selectedFile) {
      return;
    }

    try {
      // Upload the selected file to Supabase Storage
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const filePath = `images/${fileName}`;

      // Get file extension and determine content-type
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      const getContentType = (ext) => {
        const mimeTypes = {
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'pdf': 'application/pdf',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'txt': 'text/plain',
          'rtf': 'application/rtf',
        };
        return mimeTypes[ext] || selectedFile.type || 'application/octet-stream';
      };

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, selectedFile, {
          contentType: getContentType(fileExtension),
        });

      if (uploadError) {
        console.error('Error uploading attachment:', uploadError.message);
        return;
      }

      // Generate a public URL for the uploaded file
      const { publicURL } = await supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      // Insert file details into the 'attachments' table
      const attachmentToInsert = {
        file_name: selectedFile.name,
        file_url: publicURL,
        case_number: caseNumber,
        created_at: new Date().toISOString(),
      };

      const { data: insertedAttachment, error: insertError } = await supabase
        .from('attachments')
        .insert([attachmentToInsert]);

      if (insertError) {
        throw insertError;
      }

      // Clear the selected file and update the attachments list
      setSelectedFile(null);

      // Fetch the updated attachments
      await fetchAttachments();

      // Indicate successful upload
      console.log('Attachment uploaded successfully!');
    } catch (error) {
      console.error('Error uploading attachment:', error);
    }
  };


  
  const handleEdit = (attachment) => {
    setEditingAttachment(attachment);
    setNewFile(null); // Clear the new file input
  };

  const handleUpdateAttachment = async () => {
    if (!newFile || !editingAttachment) {
      return;
    }

    try {
      // Upload the selected file to Supabase Storage
      const fileName = `${Date.now()}_${newFile.name}`;
      const filePath = `images/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, newFile);

      if (uploadError) {
        console.error('Error uploading attachment:', uploadError.message);
        return;
      }

      // Generate a public URL for the uploaded file
      const { publicURL } = await supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      // Update the attachment in the 'attachments' table
      const updatedAttachment = {
        file_name: newFile.name,
        file_url: publicURL,
      };

      const { data: updatedData, error: updateError } = await supabase
        .from('attachments')
        .update(updatedAttachment)
        .eq('id', editingAttachment.id);

      if (updateError) {
        throw updateError;
      }

      // Update the attachments list
      const updatedAttachments = attachments.map((attachment) =>
        attachment.id === editingAttachment.id ? updatedData[0] : attachment
      );
      setAttachments(updatedAttachments);

      // Close the edit popup
      setEditingAttachment(null);
    } catch (error) {
      console.error('Error updating attachment:', error);
    }
  };


  const handleDelete = async (attachment) => {
    try {
      // Delete the attachment from Supabase Storage
      const { error: deleteError } = await supabase.storage
        .from('images')
        .remove([attachment.file_url]);

      if (deleteError) {
        console.error('Error deleting attachment from storage:', deleteError.message);
        return;
      }

      // Delete the attachment from the 'attachments' table
      const { error: deleteAttachmentError } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id);

      if (deleteAttachmentError) {
        console.error('Error deleting attachment from database:', deleteAttachmentError.message);
        return;
      }

      // Fetch the updated attachments
      await fetchAttachments();

      console.log('Attachment deleted successfully!');
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  };

  

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
      <div>
        <table className="attachment-table">
          <thead>
            <tr>
              <th>اسم الملف</th>
              <th>عرض ملف</th>
              <th>إجراء</th>
              <th>تاريخ الإنشاء</th>
            </tr>
          </thead>
          <tbody>
            {attachments.map((attachment) => (
              <tr key={attachment.id}>
                <td>{attachment.file_name}</td>
                <td>
                  <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                    <button className="view-button">عرض الملف</button>
                  </a>
                </td>
                <td>
                  <button className="edit-button" onClick={() => handleEdit(attachment)}>
                    تعديل
                  </button>
                  <button className="delete-button" onClick={() => handleDelete(attachment)}>حذف</button>
                </td>
                <td>{attachment.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingAttachment && (
        <div className="edit-popup-overlay">
          <div className="edit-popup">
            <div className="edit-popup-content">
              <h2>تعديل المرفق</h2>
              <form>
                <div className="form-group">
                  <input type="file" id="newFile" onChange={(e) => setNewFile(e.target.files[0])} />
                </div>
                <div className="buttons">
                  <button className="save-button" type="button" onClick={handleUpdateAttachment}>حفظ التغييرات</button>
                  <button className="cancel-button" type="button" onClick={() => setEditingAttachment(null)}>إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

{ /* eslint-disable react/no-unknown-property */ }

      <style jsx>{`
        .attachment-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        .attachment-table th,
        .attachment-table td {
          border: 1px solid #e0e0e0;
          padding: 10px;
          text-align: center;
        }

        .attachment-table th {
          background-color: #f0f0f0;
        }

        .view-button,
        .action-button {
          background-color: #0070f3;
          color: #fff;
          border: none;
          padding: 5px 10px;
          cursor: pointer;
        }
        .edit-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 999;
        }
        
        .edit-popup {
          background-color: #fff;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
          padding: 20px;
          width: 400px;
          text-align: center;
        }
        
        .edit-popup-content {
          padding: 20px;
        }
        
        .edit-popup-content h2 {
          font-size: 24px;
          margin-bottom: 20px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          font-size: 16px;
          display: block;
          margin-bottom: 10px;
        }
        
        .form-group input[type="file"] {
          width: 100%;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        
        .buttons {
          display: flex;
          justify-content: center;
        }
        
        .save-button,
        .cancel-button {
          background-color: #0070f3;
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s;
          margin: 0 10px;
        }
        
        .cancel-button {
          background-color: #ff3b30;
        }
        
        .save-button:hover,
        .cancel-button:hover {
          background-color: #0056b3;
        }
        .action-button {
          background-color: #ff3b30;
          margin-left: 5px;
        }

        

        .view-button:hover,
        .action-button:hover {
          background-color: #0056b3;
        }

        .edit-popup {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: #fff;
          padding: 20px;
          box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2);
          z-index: 1000;
        }
      `}</style>

       {/* eslint-enable react/no-unknown-property */}

       
    </div>
  );
};

export default AttachmentUpload;
