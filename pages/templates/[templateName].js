import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/initSupabase';
import Layout from '../../components/layout/Layout';
import withAuth from '../../lib/withAuth';
import {
  Bold, Italic, Underline, AlignCenter,
  AlignRight, List, ListOrdered,
  Type, Text, Undo, Redo,
  IndentIcon, OutdentIcon
} from 'lucide-react';

const fonts = [
  { label: 'Arial', value: 'Arial' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Tahoma', value: 'Tahoma' },
  { label: 'Traditional Arabic', value: 'Traditional Arabic' },
  { label: 'Arabic Typesetting', value: 'Arabic Typesetting' }
];

const TemplateEditorPage = () => {
  const router = useRouter();
  const { templateName } = router.query;
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const editorRef = useRef(null);
  const timeoutRef = useRef(null);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [letterheadDesign, setLetterheadDesign] = useState(null);

  // Regex to match variables for highlighting (parentheses, dots, dashes, underscores)
  // Pattern breakdown:
  // - \({1,}[^()]+\){1,} : matches parentheses with content like ((text)) or (text)
  // - \.{2,} : matches 2 or more dots like .., ..., etc.
  // - -{2,} : matches 2 or more dashes like --, ---, ----, ---------- (ANY number of dashes)
  // - _{2,} : matches 2 or more underscores like __, ___, ____, ________________ (ANY number of underscores)
  // - -(?![\w\s]) : matches single dash not followed by word char or space
  // - \.(?![\w\s]) : matches single dot not followed by word char or space
  // - \(\-\-\) : matches (--)
  // The -{2,} and _{2,} patterns use greedy matching, so they will match the longest sequence
  // This means ---------- or ________________ will be matched as one complete sequence
  const variableRegex = /(\({1,}[^()]+\){1,}|\.{2,}|-{2,}|_{2,}|-(?![\w\s])|\.(?![\w\s])|\(--\))/g;

  useEffect(() => {
    const fetchTemplateContent = async () => {
      if (!templateName) return;

      try {
        const { data, error } = await supabase
          .from('templates')
          .select('content')
          .eq('file_name', templateName)
          .single();

        if (error) throw error;

        if (data && data.content) {
          setContent(data.content);
        } else {
          setError('Template not found or empty content');
        }
      } catch (error) {
        setError('Failed to fetch template');
      } finally {
        setLoading(false);
      }
    };

    if (templateName) {
      fetchTemplateContent();
    }
  }, [templateName]);

  // Fetch letterhead design
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
    if (!loading && content && editorRef.current) {
      // Set initial RTL direction
      editorRef.current.style.direction = 'rtl';
      editorRef.current.style.textAlign = 'right';
      highlightVariables();
    }
  }, [loading, content]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isEditorFocused && (e.ctrlKey || e.metaKey)) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            formatText('bold');
            break;
          case 'i':
            e.preventDefault();
            formatText('italic');
            break;
          case 'u':
            e.preventDefault();
            formatText('underline');
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              formatText('redo');
            } else {
              formatText('undo');
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditorFocused]);

  const highlightVariables = () => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    let range = null;
    if (selection.rangeCount > 0) {
      range = selection.getRangeAt(0).cloneRange();
    }

    const textNodes = [];
    const treeWalker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => !node.parentElement.classList.contains('template-variable')
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
      }
    );

    let node;
    while ((node = treeWalker.nextNode())) {
      textNodes.push(node);
    }

    textNodes.forEach(node => {
      const text = node.textContent;
      // Use the main variableRegex which includes:
      // - -{2,} to match any number of dashes (2+): --, ---, ----, ----------, etc.
      // - _{2,} to match any number of underscores (2+): __, ___, ____, ________________, etc.
      // Both patterns use greedy matching to capture the longest sequence
      // This will match sequences like ---------- or ________________ as a single unit
      // Note: matchAll returns an iterator, so we convert it to an array for processing
      const matches = Array.from(text.matchAll(variableRegex));

      if (matches.length > 0) {
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        matches.forEach(match => {
          if (match.index > lastIndex) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
          }

          const span = document.createElement('span');
          span.className = 'template-variable';
          span.textContent = match[0];
          span.setAttribute('data-variable', 'true');
          fragment.appendChild(span);

          lastIndex = match.index + match[0].length;
        });

        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        node.parentNode.replaceChild(fragment, node);
      }
    });

    if (range) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const handleInput = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => highlightVariables(), 100);
  };

  const handleEditorClick = (e) => {
    const target = e.target;
    if (target.getAttribute('data-variable') === 'true') {
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const handleSave = async () => {
    if (!editorRef.current) return;

    try {
      const contentToSave = editorRef.current.innerHTML;
      const { error } = await supabase
        .from('templates')
        .update({ content: contentToSave })
        .eq('file_name', templateName);

      if (error) throw error;
      alert('تم حفظ النموذج بنجاح!');
    } catch (error) {
      alert('فشل في حفظ النموذج');
    }
  };

  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleFontChange = (e) => {
    formatText('fontName', e.target.value);
  };

  const printPreview = () => {
    if (editorRef.current) {
      const newWindow = window.open('', '_blank');

      // Generate letterhead HTML if design exists
      let letterheadHTML = '';
      let barAssociationLogo = '';
      let scalesOfJustice = '';
      if (letterheadDesign) {
        const design = letterheadDesign;

        // Bar Association Logo SVG
        barAssociationLogo = `
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

        // Scales of Justice SVG
        scalesOfJustice = `
          <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <style>
                .scales-outline { fill: none; stroke: ${design.middleDecorationColor || '#A78BFA'}; stroke-width: 3; opacity: 0.8; }
                .scales-inner { fill: none; stroke: ${design.middleDecorationColor || '#A78BFA'}; stroke-width: 2; opacity: 0.6; }
                .scales-base { fill: ${design.middleDecorationColor || '#A78BFA'}; opacity: 0.7; }
                .scales-chain { stroke: ${design.middleDecorationColor || '#A78BFA'}; stroke-width: 2; fill: none; opacity: 0.8; }
                .scales-pan { fill: ${design.middleDecorationColor || '#A78BFA'}; stroke: ${design.middleDecorationColor || '#A78BFA'}; stroke-width: 2; opacity: 0.6; }
              </style>
            </defs>
            <circle cx="100" cy="100" r="90" class="scales-outline"/>
            <circle cx="100" cy="100" r="85" class="scales-inner"/>
            <rect x="95" y="80" width="10" height="40" class="scales-base"/>
            <line x1="70" y1="100" x2="50" y2="100" class="scales-chain"/>
            <ellipse cx="50" cy="120" rx="20" ry="5" class="scales-pan"/>
            <line x1="130" y1="100" x2="150" y2="100" class="scales-chain"/>
            <ellipse cx="150" cy="120" rx="20" ry="5" class="scales-pan"/>
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


      }

      // Footer
      let footerHTML = '';
      if (letterheadDesign && letterheadDesign.showFooter) {
        const design = letterheadDesign;
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

      newWindow.document.write(`
        <html>
          <head>
            <title>Print Preview</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              html, body {
                height: auto;
                width: 100%;
                margin: 0;
                padding: 0;
              }
              
              body {
                display: flex;
                justify-content: center;
                align-items: flex-start;
                background: white;
              }
              
              /* A4 page container */
              .A4-page {
                width: 21cm;
                min-height: 29.7cm;
                display: flex;
                flex-direction: column;
                padding: ${letterheadDesign ? '1.5cm 2cm' : '2cm'};
                margin: 0;
                border: none;
                box-shadow: none;
                background-color: white;
                font-size: ${letterheadDesign?.fontSizeBody || 16}px;
                direction: rtl;
                text-align: right;
                line-height: 1.6;
                font-family: '${letterheadDesign?.fontFamily || 'Cairo'}', 'Almarai', 'Times New Roman', serif;
              }
              
              .template-content {
                margin: 20px 0;
              }
              
              /* Print-specific styles */
              @media print {
                @page {
                  size: A4;
                  margin: 0;
                }
                
                html, body {
                  width: 100%;
                  height: auto;
                  margin: 0;
                  padding: 0;
                  background: white;
                }
                
                body {
                  display: block;
                }
                
                  .A4-page {
                    width: 100%;
                    min-height: 29.7cm;
                    height: auto;
                    display: flex;
                    flex-direction: column;
                    padding: ${letterheadDesign ? '1.5cm 2cm' : '2cm'};
                    margin: 0;
                    page-break-after: auto;
                    page-break-inside: avoid;
                    overflow: visible;
                    print-color-adjust: exact;
                    -webkit-print-color-adjust: exact;
                  }
              }
            </style>
          </head>
          <body>
            <div class="A4-page">
              ${letterheadHTML}
              
              <div style="position: relative; flex: 1; display: flex; flex-direction: column;">
                ${letterheadDesign && letterheadDesign.showMiddleDecoration ? `
                  <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 0;
                    opacity: 0.6;
                    pointer-events: none;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  ">
                    ${letterheadDesign.middleDecorationType === 'scales' ? scalesOfJustice : ''}
                    ${letterheadDesign.middleDecorationType === 'logo' && letterheadDesign.watermarkLogoUrl ? `
                      <img src="${letterheadDesign.watermarkLogoUrl}" style="max-width: 350px; max-height: 350px; opacity: 0.2;" alt="Watermark" />
                    ` : ''}
                  </div>
                ` : ''}
                
                <div class="template-content" style="position: relative; z-index: 1; flex: 1;">
                  ${editorRef.current.innerHTML}
                </div>
              </div>
              
              ${footerHTML}
            </div>
          </body>
        </html>
      `);
      newWindow.document.close();
      newWindow.print();
    }
  };


  return (
    <Layout>
      <div className="template-editor-page">
        <div className="page-header">
          <h1 className="page-title">تعديل نموذج تلقائي</h1>
        </div>

        <div className="editor-wrapper">
          <div className="editor-container">
            <div className="action-buttons">
              <button onClick={handleSave} className="action-btn action-btn-primary">حفظ التغييرات</button>
              <button onClick={printPreview} className="action-btn action-btn-secondary">معاينة قبل الطباعة</button>
            </div>
            <div className="toolbar">
              <div className="toolbar-row">
                <div className="toolbar-group flex items-center gap-1">
                  <button title="تراجع" onClick={() => formatText('undo')} className="toolbar-btn">
                    <Undo size={16} />
                  </button>
                  <button title="إعادة" onClick={() => formatText('redo')} className="toolbar-btn">
                    <Redo size={16} />
                  </button>
                  <div className="toolbar-divider" />
                  <button title="غامق" onClick={() => formatText('bold')} className="toolbar-btn">
                    <Bold size={16} />
                  </button>
                  <button title="مائل" onClick={() => formatText('italic')} className="toolbar-btn">
                    <Italic size={16} />
                  </button>
                  <button title="تسطير" onClick={() => formatText('underline')} className="toolbar-btn">
                    <Underline size={16} />
                  </button>
                  <div className="toolbar-divider" />
                  <button title="محاذاة لليمين" onClick={() => formatText('justifyRight')} className="toolbar-btn">
                    <AlignRight size={16} />
                  </button>
                  <button title="توسيط" onClick={() => formatText('justifyCenter')} className="toolbar-btn">
                    <AlignCenter size={16} />
                  </button>
                  <div className="toolbar-divider" />
                  <button title="تباعد السطور" onClick={() => formatText('indent')} className="toolbar-btn">
                    <IndentIcon size={16} />
                  </button>
                  <button title="تقليل التباعد" onClick={() => formatText('outdent')} className="toolbar-btn">
                    <OutdentIcon size={16} />
                  </button>
                </div>
              </div>

              <div className="toolbar-row">
                <div className="toolbar-group flex items-center gap-1">
                  <button title="قائمة مرقمة" onClick={() => formatText('insertOrderedList')} className="toolbar-btn">
                    <ListOrdered size={16} />
                  </button>
                  <button title="قائمة نقطية" onClick={() => formatText('insertUnorderedList')} className="toolbar-btn">
                    <List size={16} />
                  </button>
                  <div className="toolbar-divider" />
                  <div className="toolbar-group flex items-center gap-2">
                    <Type size={16} className="text-gray-500" />
                    <select onChange={handleFontChange} className="toolbar-select" defaultValue="Arial">
                      {fonts.map((font) => (
                        <option key={font.value} value={font.value}>{font.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="toolbar-divider" />
                  <div className="toolbar-group flex items-center gap-2">
                    <Text size={16} className="text-gray-500" />
                    <select onChange={(e) => formatText('fontSize', e.target.value)} className="toolbar-select" defaultValue="3">
                      <option value="1">صغير جداً</option>
                      <option value="2">صغير</option>
                      <option value="3">عادي</option>
                      <option value="4">كبير</option>
                      <option value="5">كبير جداً</option>
                      <option value="6">ضخم</option>
                      <option value="7">ضخم جداً</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div
              ref={editorRef}
              className="editor-content A4-page"
              contentEditable
              onInput={handleInput}
              onClick={handleEditorClick}
              onFocus={() => setIsEditorFocused(true)}
              onBlur={() => setIsEditorFocused(false)}
              dangerouslySetInnerHTML={{ __html: content }}
              dir="rtl"
            />

            {error && (
              <div className="save-button-container" style={{ marginTop: '1rem' }}>
                <p className="error-message">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>



      <style jsx global>{`
        .template-editor-page {
          min-height: 100vh;
          background: #f1f5f9;
          padding: 1rem 1.5rem;
          direction: rtl;
        }

        .page-header {
          max-width: 1400px;
          margin: 0 auto 1rem auto;
          padding: 0 1rem;
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #2563EB;
          margin: 0;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        .editor-wrapper {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        .editor-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          gap: 1rem;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Cairo', 'Almarai', sans-serif;
          border: none;
        }

        .action-btn-primary {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25);
        }

        .action-btn-primary:hover {
          background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
        }

        .action-btn-secondary {
          background: white;
          color: #475569;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .action-btn-secondary:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }

        .editor {
          min-height: 200px;
          padding: 16px;
          font-size: 1rem;
          line-height: 1.5;
        }

        .toolbar {
          display: flex;
          flex-direction: column;
          background: linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%);
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px 16px;
          gap: 8px;
          position: sticky;
          top: 0;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.08);
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
        }

        .toolbar-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .toolbar-divider {
          width: 1px;
          height: 28px;
          background: linear-gradient(to bottom, transparent, #d1d5db, transparent);
          margin: 0 6px;
          align-self: center;
        }

        .toolbar-group {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 10px;
          border-right: 1px solid #e5e7eb;
        }

        .toolbar-group:first-child {
          border-right: none;
        }

        .toolbar-group:last-child {
          border-right: none;
        }

        .toolbar-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          color: #475569;
          min-width: 36px;
          height: 36px;
          font-size: 14px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .toolbar-btn:hover {
          background: linear-gradient(to bottom, #f8f9fa, #ffffff);
          border-color: #2563eb;
          color: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(37, 99, 235, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .toolbar-btn:active {
          transform: translateY(0);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .toolbar-btn.active {
          background: linear-gradient(to bottom, #eff6ff, #dbeafe);
          border-color: #3b82f6;
          color: #1e40af;
          box-shadow: inset 0 2px 4px rgba(59, 130, 246, 0.2);
        }

        .toolbar-select {
          min-width: 110px;
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: linear-gradient(to bottom, #ffffff, #f8f9fa);
          font-size: 13px;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          height: 36px;
          font-weight: 500;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .toolbar-select:hover {
          border-color: #2563eb;
          background: linear-gradient(to bottom, #ffffff, #f1f5f9);
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
        }

        .toolbar-select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
          background: #ffffff;
        }

        .toolbar-btn-primary {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: #ffffff;
          border-color: #2563eb;
          font-weight: 600;
          padding: 8px 16px;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25);
        }

        .toolbar-btn-primary:hover {
          background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
          color: #ffffff;
          border-color: #1e40af;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
        }

        .toolbar-btn-primary:active {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25);
        }

        .A4-page {
          width: 21cm;
          min-height: 25cm; /* Restoring A4 feel while staying slightly compact */
          padding: 1.8cm; /* Restoring professional padding */
          margin: 0 auto;
          border: 2px solid #e5e7eb;
          background-color: #ffffff;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
          overflow: auto;
          font-size: 16px;
          direction: rtl;
          text-align: right;
          line-height: 1.8;
          border-radius: 12px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: 'Cairo', 'Almarai', 'Times New Roman', serif;
        }

        .A4-page:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .template-variable {
          color: #f97316;
          font-weight: bold;
          background-color: #fff7ed;
          padding: 1px 3px;
          border-radius: 3px;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .template-variable:hover {
          background-color: #ffedd5;
        }

        @media (max-width: 1024px) {
          .A4-page {
            width: 100%;
            padding: 2cm 1.5cm;
          }

          .toolbar {
            top: 0px;
            max-width: 100%;
          }

          .save-button-container {
            max-width: 100%;
          }
        }

        @media (max-width: 768px) {
          .template-editor-page {
            padding: 0.75rem 0.5rem;
            margin-top: 0;
          }

          :global(.main-content) {
            padding-top: calc(100px + env(safe-area-inset-top, 0px)) !important;
          }

          .page-header {
            padding: 0 0.5rem;
            margin-bottom: 12px;
          }

          .page-title {
            font-size: 1.25rem;
          }

          .toolbar {
            padding: 8px 10px;
            gap: 6px;
            border-radius: 8px;
            position: sticky;
            top: 0;
            z-index: 10;
          }

          .toolbar-row {
            gap: 6px;
          }

          .toolbar-group {
            flex-wrap: wrap;
            gap: 4px;
            padding: 0 4px;
            border-right: none;
          }

          .toolbar-divider {
            display: none;
          }

          .toolbar-btn {
            padding: 8px;
            min-width: 34px;
            height: 34px;
            font-size: 11px;
            border-radius: 6px;
          }

          .toolbar-btn svg {
            width: 17px;
            height: 17px;
          }

          .toolbar-btn-primary {
            padding: 6px 10px;
            font-size: 11px;
          }

          .toolbar-select {
            min-width: 80px;
            padding: 4px 8px;
            font-size: 11px;
            height: 30px;
          }

          .A4-page {
            padding: 1rem !important;
            min-height: 55vh !important;
            font-size: 14px;
            margin-bottom: 0 !important;
            border-radius: 8px;
            border: 1px solid #e2e8f0 !important;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06) !important;
            width: calc(100% - 8px) !important;
            margin: 0 auto !important;
          }

          /* Force zero-gap against bottom nav */
          :global(.main-content) {
            padding-bottom: 0px !important;
            margin-bottom: 60px !important;
          }

          .template-editor-page {
            padding-bottom: 0px !important;
            margin-bottom: 0px !important;
            min-height: auto !important;
          }

          .editor-container {
            gap: 8px !important;
          }
        }

        @media (max-width: 640px) {
          .template-editor-page {
            padding: 0.5rem 0.25rem;
            margin-top: 0;
          }

          :global(.main-content) {
            padding-top: calc(100px + env(safe-area-inset-top, 0px)) !important;
          }

          .page-title {
            font-size: 1.1rem;
          }

          .toolbar {
            padding: 6px 6px;
            gap: 4px;
          }

          .toolbar-row {
            gap: 4px;
          }

          .toolbar-btn {
            padding: 7px;
            min-width: 32px;
            height: 32px;
          }

          .toolbar-btn svg {
            width: 16px;
            height: 16px;
          }

          .toolbar-btn-primary {
            padding: 5px 8px;
            font-size: 10px;
          }

          .toolbar-select {
            min-width: 65px;
            padding: 3px 6px;
            font-size: 10px;
            height: 28px;
          }

          .A4-page {
            padding: 0.75rem !important;
            min-height: 55vh !important;
            font-size: 13px;
            line-height: 1.6;
            width: calc(100% - 6px) !important;
            margin: 0 auto !important;
            border-radius: 6px;
            border: 1px solid #e2e8f0 !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
          }
        }

        @media (max-width: 480px) {
          .toolbar {
            padding: 6px 6px;
            gap: 4px;
          }

          .toolbar-row {
            gap: 4px;
          }
          .template-editor-page {
            margin-top: 0;
          }

          :global(.main-content) {
            padding-top: calc(100px + env(safe-area-inset-top, 0px)) !important;
          }

          .toolbar-btn {
            padding: 6px;
            min-width: 30px;
            height: 30px;
          }

          .toolbar-btn svg {
            width: 15px;
            height: 15px;
          }

          .toolbar-btn-primary {
            padding: 4px 6px;
            font-size: 10px;
          }

          .toolbar-select {
            min-width: 55px;
            font-size: 9px;
            height: 26px;
          }

          .A4-page {
            padding: 0.5rem !important;
            min-height: 55vh !important;
            font-size: 13px;
            width: calc(100% - 4px) !important;
          }
        }

        /* Mobile app safe areas */
        @supports (padding-top: env(safe-area-inset-top)) {
          .template-editor-page {
            padding-top: calc(0.75rem + env(safe-area-inset-top));
          }
        }
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .template-editor-page {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }

        @media print {
          .toolbar {
            display: none;
          }

          .save-button-container {
            display: none;
          }
          
          .A4-page {
            margin: 0;
            padding: 1cm;
            border: none;
            box-shadow: none;
            width: 100%;
            height: auto;
          }
        }

        blockquote {
          margin: 1em 0;
          padding: 0.5em 1em;
          border-right: 4px solid #e5e7eb;
          background-color: #f9fafb;
        }

        .editor-content ul, .editor-content ol {
          padding-right: 1.5em;
          margin: 0.5em 0;
        }
      .text-center {
        text-align: center;
      }

      .text-sm {
        font-size: 0.875rem; /* smaller than the default */
      }

      @media print {
        .text-sm {
          font-size: 0.75rem; /* even smaller for print, if necessary */
        }
      }

        .editor-content ul li {
          list-style-type: disc;
        }

        .editor-content ol li {
          list-style-type: decimal;
        }

         .guide-panel {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .guide-section {
          padding: 1rem;
          background: #f9fafb;
          border-left: 4px solid #e5e7eb;
          border-radius: 8px;
        }


      `}</style>
    </Layout>
  );
};

export default withAuth(TemplateEditorPage, ['can_edit_template'], true);