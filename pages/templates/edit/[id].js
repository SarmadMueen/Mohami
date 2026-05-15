import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/initSupabase';
import Layout from '../../../components/layout/Layout';
import withAuth from '../../../lib/withAuth';
import {
  Bold, Italic, Underline, AlignCenter,
  AlignRight, AlignLeft, List, ListOrdered,
  Type, Text, Undo, Redo, Save, Printer,
  IndentIcon, OutdentIcon, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, Search
} from 'lucide-react';

const fonts = [
  { label: 'Arial', value: 'Arial' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Cairo', value: 'Cairo' },
  { label: 'Almarai', value: 'Almarai' },
  { label: 'Traditional Arabic', value: 'Traditional Arabic' },
  { label: 'Arabic Typesetting', value: 'Arabic Typesetting' },
  { label: 'Tahoma', value: 'Tahoma' },
  { label: 'Georgia', value: 'Georgia' },
];

const TemplateEditPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const editorRef = useRef(null);
  const timeoutRef = useRef(null);

  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [originalCollapsed, setOriginalCollapsed] = useState(false);
  const [letterheadDesign, setLetterheadDesign] = useState(null);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!id) return;

      try {
        const { data, error: dbError } = await supabase
          .from('templates')
          .select('*')
          .eq('id', id)
          .single();

        if (dbError) throw dbError;
        if (!data) throw new Error('Template not found');

        setTemplate(data);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message || 'Failed to load template');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchTemplate();
  }, [id]);

  useEffect(() => {
    const fetchLetterheadDesign = async () => {
      try {
        const user = supabase.auth.user();
        if (!user) return;

        const { data, error } = await supabase
          .from('user_metadata')
          .select('letterhead_design')
          .or(`admin_user_id.eq.${user.id},new_lawyer_id.eq.${user.id},user_id.eq.${user.id}`)
          .limit(1);

        if (!error && data && data.length > 0 && data[0].letterhead_design) {
          setLetterheadDesign(data[0].letterhead_design);
        }
      } catch (error) {
        console.error('Error fetching letterhead design:', error);
      }
    };

    fetchLetterheadDesign();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isEditorFocused && (e.ctrlKey || e.metaKey)) {
        switch (e.key.toLowerCase()) {
          case 'b': e.preventDefault(); formatText('bold'); break;
          case 'i': e.preventDefault(); formatText('italic'); break;
          case 'u': e.preventDefault(); formatText('underline'); break;
          case 's': e.preventDefault(); handleSave(); break;
          case 'z':
            e.preventDefault();
            formatText(e.shiftKey ? 'redo' : 'undo');
            break;
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditorFocused]);

  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleFontChange = (e) => formatText('fontName', e.target.value);

  const generateLetterheadHTML = () => {
    if (!letterheadDesign) return '';
    const design = letterheadDesign;
    let letterheadHTML = '';

    // Bar Association Logo SVG
    const barAssociationLogo = `
      <svg width="80" height="100" viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .logo-shield { fill: none; stroke: #DC2626; stroke-width: 2; }
            .logo-text { font-size: 6px; fill: ${design.primaryColor || '#1E3A8A'}; font-weight: bold; }
            .logo-figure { fill: ${design.primaryColor || '#1E3A8A'}; }
          </style>
        </defs>
        <path class="logo-shield" d="M40 5 L70 15 L70 50 Q70 70 40 85 Q10 70 10 50 L10 15 Z"/>
        <text x="40" y="20" text-anchor="middle" class="logo-text">IRAQI BAR</text>
        <text x="40" y="28" text-anchor="middle" class="logo-text">ASSOCIATION</text>
        <text x="40" y="40" text-anchor="middle" class="logo-text">نقابة المحامين</text>
        <text x="40" y="48" text-anchor="middle" class="logo-text">العراقيين</text>
        <circle cx="40" cy="60" r="8" class="logo-figure"/>
        <text x="40" y="75" text-anchor="middle" class="logo-text">1933</text>
      </svg>
    `;

    // Header
    if (design.showHeader) {
      letterheadHTML += `
        <div style="
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 60px;
          direction: ltr;
          margin-bottom: ${design.headerPaddingBottom || 15}px;
          padding-top: ${design.headerPaddingTop || 20}px;
          padding-bottom: ${design.headerPaddingBottom || 15}px;
          border-bottom: 3px solid ${design.secondaryColor || '#22C55E'};
        ">
          <div style="text-align: left; min-width: 0;">
            <div style="font-size: 11px; font-weight: 600; color: ${design.primaryColor || '#1E3A8A'}; text-transform: uppercase; margin-bottom: 6px;">LAWYER</div>
            <div style="font-size: ${design.fontSizeHeader || 18}px; font-weight: 700; color: ${design.primaryColor || '#1E3A8A'}; text-transform: uppercase; white-space: nowrap;">
              ${design.lawyerNameEn || ''}
            </div>
          </div>
          <div style="display: flex; align-items: center; justify-content: center; padding: 0 10px;">
            ${design.customLogoUrl ?
              `<img src="${design.customLogoUrl}" style="max-width: 100px; max-height: 100px; object-fit: contain;" alt="Logo" onerror="this.style.display='none'" />` :
              (design.showBarAssociationLogo ? barAssociationLogo : '')
            }
          </div>
          <div style="text-align: right; min-width: 0;">
            <div style="font-size: 11px; font-weight: 600; color: ${design.primaryColor || '#1E3A8A'}; margin-bottom: 6px;">المحامي</div>
            <div style="font-size: ${design.fontSizeHeader || 18}px; font-weight: 700; color: ${design.primaryColor || '#1E3A8A'}; white-space: nowrap;">
              ${design.lawyerNameAr || ''}
            </div>
          </div>
        </div>
      `;
    }

    // Footer
    let footerHTML = '';
    if (design.showFooter) {
      footerHTML = `
        <div style="
          margin-top: auto;
          padding-top: ${design.footerPaddingTop || 15}px;
          border-top: 3px solid ${design.secondaryColor || '#22C55E'};
          font-size: ${design.fontSizeFooter || 12}px;
          color: #1E293B;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        ">
          <div style="text-align: right;">
            ${(design.addresses || []).filter(addr => addr && addr.trim()).map(addr => `
              <div style="margin-bottom: 2px;">${addr}</div>
            `).join('')}
            ${design.email ? `<div style="margin-top: 4px;">${design.email}</div>` : ''}
          </div>
          ${(design.phoneNumbers || []).filter(phone => phone && phone.trim()).length > 0 ? `
            <div style="direction: ltr; text-align: left;">
              <span style="font-weight: 500;">Mobile: </span>
              <span style="color: #DC2626; font-weight: 600;">
                ${(design.phoneNumbers || []).filter(phone => phone && phone.trim()).join(' - ')}
              </span>
            </div>
          ` : ''}
        </div>
      `;
    }

    return { header: letterheadHTML, footer: footerHTML };
  };

  const handleSave = async () => {
    if (!editorRef.current || !template) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const { header, footer } = generateLetterheadHTML();
      const contentToSave = header + editorRef.current.innerHTML + footer;
      const { error: saveErr } = await supabase
        .from('templates')
        .update({ content: contentToSave, updated_at: new Date().toISOString() })
        .eq('id', template.id);

      if (saveErr) throw saveErr;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError('فشل في حفظ التغييرات');
    } finally {
      setSaving(false);
    }
  };

  const handleInput = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {}, 100);
  };

  const printPreview = () => {
    if (!editorRef.current) return;
    const { header, footer } = generateLetterheadHTML();
    const newWindow = window.open('', '_blank');
    newWindow.document.write(`
      <html>
        <head>
          <title>معاينة الطباعة</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Almarai:wght@300;400;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { display: flex; justify-content: center; background: white; min-height: 100vh; }
            .A4-page {
              width: 21cm; min-height: 29.7cm;
              padding: 2cm; direction: rtl; text-align: right;
              font-family: 'Cairo', 'Almarai', serif;
              font-size: 16px; line-height: 1.8;
              display: flex;
              flex-direction: column;
            }
            .letterhead-header {
              flex-shrink: 0;
            }
            .letterhead-content {
              flex: 1;
              min-height: 0;
            }
            .letterhead-footer {
              flex-shrink: 0;
              margin-top: auto;
            }
            @media print {
              @page { size: A4; margin: 0; }
              body { display: block; }
              .A4-page { width: 100%; padding: 2cm; display: flex; flex-direction: column; }
            }
          </style>
        </head>
        <body>
          <div class="A4-page">
            <div class="letterhead-header">${header}</div>
            <div class="letterhead-content">${editorRef.current.innerHTML}</div>
            <div class="letterhead-footer">${footer}</div>
          </div>
        </body>
      </html>
    `);
    newWindow.document.close();
    newWindow.print();
  };

  const getOriginalFilePreview = () => {
    if (!template) return null;
    const fileType = template.file_type;
    const filePath = template.file_path;

    if (fileType === 'image') {
      return (
        <div className="original-preview-image">
          <img
            src={filePath}
            alt="Original document"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          />
        </div>
      );
    }

    if (fileType === 'pdf') {
      return (
        <div className="original-preview-pdf">
          <iframe
            src={filePath}
            title="Original PDF"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      );
    }

    if (fileType === 'docx') {
      return (
        <div className="original-preview-docx">
          <div className="docx-notice">
            <Type size={32} />
            <p>ملف Word - المحتوى المحول معروض في المحرر</p>
          </div>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <Layout>
        <div className="edit-page-loading" dir="rtl">
          <div className="loading-spinner" />
          <p>جاري تحميل القالب...</p>
        </div>
        <style jsx>{`
          .edit-page-loading {
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; min-height: 60vh; gap: 16px;
            font-family: 'Cairo', 'Almarai', sans-serif; color: #64748b;
          }
          .loading-spinner {
            width: 40px; height: 40px; border: 3px solid #e2e8f0;
            border-top-color: #3b82f6; border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </Layout>
    );
  }

  if (error && !template) {
    return (
      <Layout>
        <div className="edit-page-error" dir="rtl">
          <p>{error}</p>
          <button onClick={() => router.push('/templates')}>العودة إلى القوالب</button>
        </div>
        <style jsx>{`
          .edit-page-error {
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; min-height: 60vh; gap: 16px;
            font-family: 'Cairo', 'Almarai', sans-serif; color: #dc2626;
          }
          button {
            padding: 10px 24px; background: #3b82f6; color: white;
            border: none; border-radius: 8px; cursor: pointer;
            font-family: 'Cairo', 'Almarai', sans-serif; font-size: 14px;
          }
        `}</style>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="edit-page-container">
        <div className="edit-page" dir="rtl">
          {/* Top Bar */}
          <div className="edit-topbar">
          <div className="topbar-left">
            <button onClick={() => router.push('/templates')} className="back-btn">
              <ChevronRight size={18} />
              <span>القوالب</span>
            </button>
            <h1 className="template-title">{template?.display_title || 'تعديل القالب'}</h1>
          </div>
          <div className="topbar-center">
            <div className="toolbar-group">
              <button title="تراجع" onClick={() => formatText('undo')} className="tb"><Undo size={18} /></button>
              <button title="إعادة" onClick={() => formatText('redo')} className="tb"><Redo size={18} /></button>
              <div className="tb-divider" />
              <button title="غامق" onClick={() => formatText('bold')} className="tb"><Bold size={18} /></button>
              <button title="مائل" onClick={() => formatText('italic')} className="tb"><Italic size={18} /></button>
              <button title="تسطير" onClick={() => formatText('underline')} className="tb"><Underline size={18} /></button>
              <div className="tb-divider" />
              <button title="محاذاة لليمين" onClick={() => formatText('justifyRight')} className="tb"><AlignRight size={18} /></button>
              <button title="توسيط" onClick={() => formatText('justifyCenter')} className="tb"><AlignCenter size={18} /></button>
              <button title="محاذاة لليسار" onClick={() => formatText('justifyLeft')} className="tb"><AlignLeft size={18} /></button>
              <div className="tb-divider" />
              <button title="تباعد" onClick={() => formatText('indent')} className="tb"><IndentIcon size={18} /></button>
              <button title="تقليل" onClick={() => formatText('outdent')} className="tb"><OutdentIcon size={18} /></button>
              <div className="tb-divider" />
              <button title="قائمة مرقمة" onClick={() => formatText('insertOrderedList')} className="tb"><ListOrdered size={18} /></button>
              <button title="قائمة نقطية" onClick={() => formatText('insertUnorderedList')} className="tb"><List size={18} /></button>
              <div className="tb-divider" />
              <select onChange={handleFontChange} className="tb-select" defaultValue="Cairo">
                {fonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <select onChange={(e) => formatText('fontSize', e.target.value)} className="tb-select" defaultValue="3">
                <option value="1">صغير جداً</option>
                <option value="2">صغير</option>
                <option value="3">عادي</option>
                <option value="4">كبير</option>
                <option value="5">كبير جداً</option>
                <option value="6">ضخم</option>
              </select>
            </div>
          </div>
          <div className="topbar-right">
            {saveSuccess && <span className="save-indicator">✓ تم الحفظ</span>}
            <button onClick={handleSave} disabled={saving} className="save-btn">
              <Save size={16} />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ'}</span>
            </button>
            <button onClick={printPreview} className="print-btn">
              <Printer size={16} />
              <span>طباعة</span>
            </button>
          </div>
        </div>

        {/* Main Content: Side by Side */}
        <div className={`edit-panels ${originalCollapsed ? 'collapsed' : ''}`}>
          {/* Original File Panel */}
          {template?.file_type !== 'docx' && (
            <div className={`panel original-panel ${originalCollapsed ? 'hidden' : ''}`}>
              <div className="panel-body">
                {getOriginalFilePreview()}
              </div>
            </div>
          )}

          {/* Editor Panel */}
          <div className="panel editor-panel">
            <div className="panel-body editor-body">
              <div className="editor-wrapper" dir="rtl">
                {letterheadDesign && (
                  <div 
                    className="letterhead-header" 
                    dangerouslySetInnerHTML={{ __html: generateLetterheadHTML().header }}
                  />
                )}
                <div
                  ref={editorRef}
                  className="editor-content"
                  contentEditable
                  onInput={handleInput}
                  onFocus={() => setIsEditorFocused(true)}
                  onBlur={() => setIsEditorFocused(false)}
                  dangerouslySetInnerHTML={{ __html: template?.content || '' }}
                  dir="rtl"
                />
                {letterheadDesign && (
                  <div 
                    className="letterhead-footer" 
                    dangerouslySetInnerHTML={{ __html: generateLetterheadHTML().footer }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      <style jsx global>{`
        .edit-page-container {
          width: 100%;
          max-width: 100%;
          background: #f8fafc;
          padding: 10px;
          box-sizing: border-box;
        }

        .edit-page {
          min-height: 100vh;
          background: #f1f5f9;
          display: flex;
          flex-direction: column;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        /* Top Bar */
        .edit-topbar {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 16px; background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          position: sticky; top: 0; z-index: 20;
          gap: 16px;
        }
        .topbar-left { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .topbar-center { flex: 1; display: flex; justify-content: center; }
        .topbar-right { gap: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .back-btn {
          display: flex; align-items: center; gap: 6px;
          background: white; border: 2px solid #e2e8f0; border-radius: 8px;
          padding: 6px 12px; color: #1e293b; cursor: pointer;
          font-family: 'Cairo', sans-serif; font-size: 13px; font-weight: 700; transition: all 0.2s;
        }
        .back-btn:hover { background: #f8fafc; border-color: #3b82f6; color: #2563eb; }
        .template-title { font-size: 16px; font-weight: 600; color: #1e293b; margin: 0; }
        .save-indicator { color: #16a34a; font-size: 12px; font-weight: 500; }
        .save-btn, .print-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 20px; border-radius: 6px;
          font-size: 16px; font-weight: 500; cursor: pointer; transition: all 0.2s;
          font-family: 'Cairo', sans-serif; min-width: 120px; white-space: nowrap;
        }
        .save-btn {
          background: #2563eb; color: white; border: none;
          box-shadow: 0 1px 3px rgba(37,99,235,0.3);
        }
        .save-btn:hover:not(:disabled) { background: #1d4ed8; }
        .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .print-btn {
          background: white; color: #475569; border: 1px solid #e2e8f0;
        }
        .print-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
        .toggle-original-btn {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; padding: 0; border-radius: 6px;
          font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s;
          font-family: 'Cairo', sans-serif;
          background: white; color: #475569; border: 1px solid #e2e8f0;
        }
        .toggle-original-btn:hover { background: #f8fafc; border-color: #cbd5e1; color: #334155; }
        .toggle-original-btn.active { background: #f0f7ff; border-color: #3b82f6; color: #2563eb; }

        /* Toolbar */
        .edit-toolbar {
          display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 24px;
          background: #ffffff; border-bottom: 1px solid #e2e8f0;
          position: sticky; top: 53px; z-index: 15;
        }
        .toolbar-group { display: flex; align-items: center; gap: 4px; }
        .tb {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; background: white;
          border: 1px solid #e5e7eb; border-radius: 6px;
          cursor: pointer; color: #475569; transition: all 0.15s;
          font-weight: 700;
        }
        .tb:hover { background: #f0f7ff; border-color: #3b82f6; color: #2563eb; }
        .tb-divider { width: 1px; height: 24px; background: #e2e8f0; margin: 0 4px; }
        .tb-select {
          padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 6px;
          font-size: 12px; color: #475569; cursor: pointer; height: 36px;
          font-weight: 700;
          font-family: 'Cairo', sans-serif;
        }

        /* Panels */
        .edit-panels {
          display: flex; flex: 1; gap: 0; min-height: 0;
          height: calc(100vh - 60px);
        }
        .edit-panels.collapsed .original-panel { display: none; }

        .panel {
          display: flex; flex-direction: column;
          background: white; overflow: hidden;
        }
        .original-panel {
          width: 45%; min-width: 350px;
          border-left: 1px solid #e2e8f0;
        }
        .editor-panel { width: 55%; max-width: 800px; min-width: 400px; }
        .original-panel.hidden { display: none; }

        .panel-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 16px; background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          flex-shrink: 0;
        }
        .panel-header h3 {
          font-size: 14px; font-weight: 600; color: #334155; margin: 0;
        }
        .panel-hint {
          font-size: 12px; color: #94a3b8; font-weight: 400;
        }
        .panel-controls { display: flex; align-items: center; gap: 6px; }
        .zoom-btn, .collapse-btn {
          display: flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; background: white;
          border: 1px solid #e2e8f0; border-radius: 6px;
          cursor: pointer; color: #64748b; transition: all 0.15s;
        }
        .zoom-btn:hover, .collapse-btn:hover {
          background: #f0f7ff; border-color: #3b82f6; color: #2563eb;
        }
        .zoom-label {
          font-size: 11px; color: #64748b; min-width: 32px; text-align: center;
        }
        .expand-btn {
          display: flex; align-items: center; justify-content: center;
          width: 28px; background: #f8fafc; border: none;
          border-left: 1px solid #e2e8f0; cursor: pointer;
          color: #64748b; transition: all 0.15s; flex-shrink: 0;
        }
        .expand-btn:hover { background: #f0f7ff; color: #2563eb; }

        .panel-body {
          flex: 1; overflow-y: auto; overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .panel-body::-webkit-scrollbar {
          width: 6px;
        }
        .panel-body::-webkit-scrollbar-track {
          background: transparent;
        }
        .panel-body::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 3px;
        }
        .panel-body::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }

        /* Original file previews */
        .original-preview-image {
          padding: 16px; display: flex; justify-content: center;
          min-height: 100%;
        }
        .original-preview-image img {
          max-width: 100%; height: auto;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 4px;
          transition: transform 0.2s;
        }
        .original-preview-pdf {
          width: 100%; height: 100%;
        }
        .original-preview-docx {
          display: flex; align-items: center; justify-content: center;
          min-height: 200px; color: #94a3b8;
        }
        .docx-notice {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          text-align: center; padding: 32px;
        }
        .docx-notice p { font-size: 14px; }

        /* Editor */
        .editor-body { padding: 0; overflow-y: auto; overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .editor-body::-webkit-scrollbar {
          width: 6px;
        }
        .editor-body::-webkit-scrollbar-track {
          background: transparent;
        }
        .editor-body::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 3px;
        }
        .editor-body::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
        .editor-wrapper {
          display: flex; flex-direction: column;
          min-height: 100%;
          background: white;
        }
        .letterhead-header {
          flex-shrink: 0;
        }
        .letterhead-footer {
          flex-shrink: 0;
          margin-top: auto;
        }
        .editor-content {
          min-height: 0; padding: 32px 40px;
          direction: rtl; text-align: right;
          font-family: 'Cairo', 'Almarai', serif;
          font-size: 16px; line-height: 1.8;
          outline: none; background: white;
          flex: 1;
        }
        .editor-content:focus {
          box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
        .editor-content h2 { margin: 16px 0 8px; }
        .editor-content h3 { margin: 12px 0 6px; }
        .editor-content p { margin: 4px 0; }
        .editor-content table {
          border-collapse: collapse; width: 100%; margin: 12px 0;
        }
        .editor-content td, .editor-content th {
          border: 1px solid #d1d5db; padding: 8px;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .original-panel { width: 40%; }
          .editor-panel { width: 60%; }
        }

        @media (max-width: 900px) {
          .edit-page-container {
            max-width: 88%;
            margin: 0 auto;
          }
          .edit-panels { flex-direction: column-reverse; height: auto; }
          .original-panel { width: 100%; min-width: 0; max-height: 40vh; border-left: none; border-top: 1px solid #e2e8f0; }
          .editor-panel { min-height: 50vh; }
          .edit-toolbar { padding: 8px 12px; }
          .edit-topbar { padding: 10px 12px; }
          .template-title { font-size: 15px; }
        }

        @media (max-width: 768px) {
          .edit-page-container {
            max-width: 90%;
            margin: 0 auto;
          }
          .edit-page {
            min-height: 100vh;
            height: 100vh;
            overflow: hidden;
          }
          .edit-topbar {
            flex-direction: column; padding: 10px; gap: 8px;
            position: relative; top: auto; flex-shrink: 0; margin-top: 10px;
          }
          .topbar-left { gap: 8px; width: 100%; justify-content: space-between; flex-shrink: 0; }
          .topbar-center {
            width: 100%; justify-content: flex-start;
            flex-shrink: 0; display: flex; margin-top: 10px;
          }
          .topbar-right { width: 100%; justify-content: center; flex-shrink: 0; display: flex; }
          .toolbar-group {
            flex-wrap: wrap; gap: 4px; justify-content: flex-start;
            padding: 4px 0; display: flex;
            align-content: flex-start;
          }
          .tb { width: 36px; height: 36px; flex-shrink: 0; }
          .tb svg { width: 18px; height: 18px; }
          .tb-divider { height: 18px; margin: 0 4px; }
          .tb-select { height: 36px; font-size: 12px; padding: 4px 10px; min-width: 80px; flex-shrink: 0; }
          .back-btn { padding: 6px 10px; font-size: 12px; }
          .template-title { font-size: 13px; }
          .save-btn, .print-btn { padding: 8px 20px; font-size: 16px; gap: 8px; min-width: 120px; white-space: nowrap; }
          .save-btn svg, .print-btn svg { width: 18px; height: 18px; }
          .save-btn span, .print-btn span { font-size: 16px; }
          .editor-panel { min-width: 0; flex: 1; width: 100%; }
          .original-panel { min-width: 0; display: none; }
          .edit-panels { flex-direction: column; height: calc(100vh - 170px); overflow: hidden; }
        }

        @media (max-width: 640px) {
          .edit-page-container {
            max-width: 92%;
            margin: 0 auto;
          }
          .edit-topbar { padding: 8px; gap: 6px; margin-top: 10px; }
          .topbar-center { margin-top: 8px; }
          .back-btn { padding: 6px 8px; font-size: 12px; }
          .back-btn svg { width: 16px; height: 16px; }
          .template-title { font-size: 13px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
          .toolbar-group { gap: 3px; align-content: flex-start; }
          .tb { width: 34px; height: 34px; }
          .tb svg { width: 17px; height: 17px; }
          .tb-divider { display: none; }
          .tb-select { height: 34px; font-size: 12px; padding: 4px 8px; min-width: 75px; }
          .editor-content { padding: 20px 16px; font-size: 15px; line-height: 2; }
          .panel-body { padding: 0; }
          .save-indicator { font-size: 11px; }
          .save-btn, .print-btn {
            padding: 10px 20px;
            font-size: 15px;
            gap: 8px;
            min-width: 140px;
            white-space: nowrap;
          }
        }

        @media (max-width: 480px) {
          .edit-page-container {
            max-width: 94%;
            margin: 0 auto;
          }
          .edit-topbar { padding: 6px; gap: 4px; margin-top: 10px; }
          .topbar-center { margin-top: 6px; }
          .template-title { font-size: 12px; max-width: 100px; font-weight: 600; }
          .save-btn, .print-btn { padding: 8px 20px; font-size: 16px; gap: 8px; min-width: 120px; white-space: nowrap; }
          .toolbar-group { gap: 2px; align-content: flex-start; }
          .tb { width: 32px; height: 32px; }
          .tb svg { width: 16px; height: 16px; }
          .tb-select { min-width: 70px; font-size: 11px; height: 32px; padding: 4px 6px; }
          .back-btn { padding: 6px 8px; font-size: 11px; }
          .editor-content { padding: 18px 14px; font-size: 15px; line-height: 2; }
        }

        /* Mobile app safe areas */
        @supports (padding-top: env(safe-area-inset-top)) {
          .edit-page {
            padding-top: env(safe-area-inset-top);
          }
        }
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .edit-page {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
      `}</style>
    </Layout>
  );
};

export default withAuth(TemplateEditPage, [], true);
