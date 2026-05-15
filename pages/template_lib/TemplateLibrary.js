/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */


import React, { useState, useEffect, useRef } from 'react';
import { getApiUrl } from '../../lib/api';
import Layout from '../../components/layout/Layout';
import withAuth from '../../lib/withAuth';
import mammoth from 'mammoth';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import 'suneditor/dist/css/suneditor.min.css'; // Import Sun Editor's CSS File



const SunEditor = dynamic(() => import("suneditor-react"), {
  ssr: false,
});

const templates = [
  {
    docxUrl: '/templates/ابطال بيع عقار لاستعمال وثائق مزورة.docx',
  },
  {
    docxUrl: '/templates/دعوى_تخلية_لهدم_العقار.docx',
  },
  // Add more template objects as needed
];





const extractTitleFromDocxUrl = (docxUrl) => {
  const fileName = docxUrl.split('/').pop();
  const titleWithoutExtension = fileName.replace('.docx', '');
  const titleWithoutHyphen = titleWithoutExtension.replace(/-/g, ' ');
  const titleWithoutUnderscore = titleWithoutHyphen.replace(/_/g, ' ');
  const titleWithoutSpaces = titleWithoutUnderscore.trim();
  return titleWithoutSpaces;
};

templates.forEach((template) => {
  template.title = extractTitleFromDocxUrl(template.docxUrl);
});

const TemplateLibrary = () => {
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTemplates, setFilteredTemplates] = useState(templates);
  const [clearMode, setClearMode] = useState(false);

  // Create a ref for the SunEditor
  const sunEditorRef = useRef();

  const handleSearchChange = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    const filtered = templates.filter((template) =>
      template.title.includes(query)
    );

    setFilteredTemplates(filtered);
  };



  const handleViewClick = async (index) => {
    const template = templates[index];
    const response = await fetch(template.docxUrl);
    const buffer = await response.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
    setSelectedTemplateIndex(index);
    setEditorContent(result.value);

  };

  const handlePrintPreview = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(`
      <html>
      <head>
        <title>Print Preview</title>
        <style>
          body {
            direction: rtl;
            text-align: right;
          }
        </style>
      </head>
      <body>
        ${editorContent}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };




  const handleSave = async () => {
    try {
      const response = await fetch(getApiUrl('/api/saveContent'), {
        method: 'POST',
        body: JSON.stringify({ content: editorContent }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('Content saved successfully');
      } else {
        console.error('Error saving content');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };


  const toggleClearMode = () => {
    setClearMode(!clearMode);
  };

  const openClearModeWindow = () => {
    const clearModeWindow = window.open('', '_blank', 'width=800,height=600');
    clearModeWindow.document.open();
    clearModeWindow.document.write(`
      <html>
      <head>
        <title>Clear Mode</title>
        <style>
          body {
            padding: 20px;
            direction: rtl;
            text-align: right;
          }
        </style>
      </head>
      <body>
        ${editorContent}
      </body>
      </html>
    `);
    clearModeWindow.document.close();
  };


  const renderEditorContent = () => {
    const contentWithInputs = editorContent.replace(/-----/g, '<input type="text" />');
    return { __html: contentWithInputs };
  };



  return (
    <Layout>
      <div className="template-library-container">
        <h2>مكتبة الطلبات واللوائح</h2>

        {/* Search input */}
        <div className="search-container">
          <input
            type="text"
            placeholder="ابحث عن طلب"
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>

        <div className="template-list">
          {filteredTemplates.map((template, index) => (
            <div key={index} className="template-button-container">
              <button
                className="template-button"
                onClick={() => handleViewClick(index)}
              >
                {template.title}
              </button>
            </div>
          ))}
        </div>
        {selectedTemplateIndex !== null && (
          <div className="template-content">
            <h3>تعديل الطلب</h3>
            <div className="editor-wrapper">
              <SunEditor
                setContents={editorContent}
                onChange={(content) => setEditorContent(content)}
                width="900px"
                height="400px"
                // autoFocus
                setOptions={{
                  buttonList: [
                    ['font', 'fontSize', 'formatBlock'],
                    ['bold', 'underline', 'italic', 'strike'],
                    ['fontColor', 'hiliteColor', 'removeFormat'],
                    ['align', 'horizontalRule', 'list', 'table'],
                    ['link', 'image', 'video'],
                    ['undo', 'redo', 'fullScreen'],
                  ],
                  rtl: true, // Set right-to-left direction for the content
                }}
              />

            </div>
          </div>
        )}

        {selectedTemplateIndex !== null && (
          <EditorToolbar
            onPrintPreview={handlePrintPreview}
            onSave={handleSave}
            onToggleClearMode={toggleClearMode}
            onOpenClearModeWindow={openClearModeWindow}
          />
        )}
      </div>
      <style jsx>{`
        .template-library-container {
          padding: 1rem;
        }
        .template-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }
        .template-item {
          border: 1px solid #ccc;
          padding: 1rem;
        }
        .template-content {
          border-top: 1px solid #ccc;
          padding: 1rem 0;
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }
        .editor-actions {
          margin-top: 1rem;
        }
        .quill-wrapper {
          height: 60vh;
        }
        .template-button-container {
          display: inline-block;
          margin: 5px;
          border-radius: 5px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .search-container {
          margin-top: 20px;
          display: flex;
          justify-content: center;
        }
      
        .search-input {
          width: 300px;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 5px;
          font-size: 14px;
          outline: none;
        }

        .search-input:focus {
          border-color: #3498db;
          box-shadow: 0px 0px 6px rgba(52, 152, 219, 0.5);
        }


        .template-button {
          background-color: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          transition: background-color 0.3s ease;
          display: block;
          width: 100%;
          outline: none;
          box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
        }
      
        .template-button:hover {
          background-color: #2980b9;
        }
        .print-preview-button,
        .save-button {
          background-color: #27ae60;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          transition: background-color 0.3s ease;
          display: inline-block;
          margin: 5px;
          box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
          outline: none;
        }
        
        .print-preview-button:hover,
        .save-button:hover {
          background-color: #219d52;
        }
      
        .save-button {
          background-color: #e74c3c;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          transition: background-color 0.3s ease;
          margin-left: 10px;
        }
        .save-button:hover {
          background-color: #c94030;
        }
        .ql-editor {
          text-align: right;
          direction: rtl;
        }

        
  .template-button:focus {
    transform: scale(1.05);
    box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.2);
  }


      `}</style>
    </Layout>
  );
};


const EditorToolbar = ({ onPrintPreview, onSave, onToggleClearMode, onOpenClearModeWindow }) => (
  <div className="editor-toolbar">
    <button className="print-preview-button" onClick={onPrintPreview}>
      معاينة قبل الطباعة
    </button>


    <button className="view-clear-mode-button" onClick={onOpenClearModeWindow}>
      عرض في وضع واضح
    </button>

    { /* eslint-disable-next-line react/no-unknown-property */}

    <style jsx>{`
      .editor-toolbar {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 2px;
        margin-bottom: 1px; /* Reduce the bottom margin */
      }
      .editor-toolbar button {
        background-color: #3498db;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        margin-right: 2px;
      }
      .editor-toolbar button:hover {
        background-color: #2980b9;
      }
    `}</style>
  </div>
);
export default withAuth(TemplateLibrary);