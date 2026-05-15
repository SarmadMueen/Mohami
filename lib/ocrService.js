// OCR Service using Google Cloud Vision API
// Supports Arabic and English text extraction from PDF and images
// Returns structured HTML preserving document layout


/**
 * Convert Vision API fullTextAnnotation to structured HTML
 * Preserves paragraphs, block structure, text direction, and approximate font sizes
 */
function annotationToStructuredHTML(annotation) {
  if (!annotation || !annotation.pages || annotation.pages.length === 0) {
    return annotation?.text || '';
  }

  let html = '';

  for (const page of annotation.pages) {
    const pageWidth = page.width || 1;
    const pageHeight = page.height || 1;

    if (!page.blocks) continue;

    for (const block of page.blocks) {
      if (block.blockType === 'TABLE') {
        html += buildTableHTML(block);
        continue;
      }

      if (!block.paragraphs) continue;

      for (const paragraph of block.paragraphs) {
        const paraText = extractParagraphText(paragraph);
        if (!paraText.trim()) continue;

        // Detect text properties
        const isRTL = detectParagraphDirection(paragraph);
        const fontSize = estimateFontSize(paragraph, pageHeight);
        const alignment = estimateAlignment(block, pageWidth);

        // Build style
        let style = `direction: ${isRTL ? 'rtl' : 'ltr'}; text-align: ${alignment};`;
        
        // Determine tag based on font size
        let tag = 'p';
        if (fontSize === 'large') {
          tag = 'h2';
          style += ' font-weight: 700; font-size: 22px;';
        } else if (fontSize === 'medium') {
          tag = 'h3';
          style += ' font-weight: 600; font-size: 18px;';
        } else {
          style += ' font-size: 15px; line-height: 1.8;';
        }

        // Build paragraph HTML with word-level formatting
        const innerHTML = buildFormattedParagraph(paragraph);
        html += `<${tag} style="${style}">${innerHTML}</${tag}>\n`;
      }
    }
  }

  return html;
}

/**
 * Extract plain text from a paragraph
 */
function extractParagraphText(paragraph) {
  let text = '';
  if (!paragraph.words) return text;
  for (const word of paragraph.words) {
    for (const symbol of word.symbols || []) {
      text += symbol.text || '';
      if (symbol.property?.detectedBreak) {
        const breakType = symbol.property.detectedBreak.type;
        if (breakType === 'SPACE' || breakType === 'SURE_SPACE') {
          text += ' ';
        } else if (breakType === 'EOL_SURE_SPACE' || breakType === 'LINE_BREAK') {
          text += ' ';
        }
      }
    }
    text += ' ';
  }
  return text.trim();
}

/**
 * Build formatted paragraph HTML preserving bold/italic from word confidence
 */
function buildFormattedParagraph(paragraph) {
  if (!paragraph.words) return '';
  
  let html = '';
  for (const word of paragraph.words) {
    let wordText = '';
    let isBold = false;
    let isItalic = false;

    for (const symbol of word.symbols || []) {
      wordText += symbol.text || '';
      // Check for detected font weight from symbol properties
      if (symbol.property?.detectedFonts) {
        for (const font of symbol.property.detectedFonts) {
          if (font.fontType === 'BOLD' || font.fontType === 'HEAVY') isBold = true;
          if (font.fontType === 'ITALIC') isItalic = true;
        }
      }
      // Add break characters
      if (symbol.property?.detectedBreak) {
        const breakType = symbol.property.detectedBreak.type;
        if (breakType === 'SPACE' || breakType === 'SURE_SPACE') {
          wordText += ' ';
        } else if (breakType === 'EOL_SURE_SPACE') {
          wordText += ' ';
        } else if (breakType === 'LINE_BREAK') {
          wordText += '<br/>';
        }
      }
    }

    // Wrap with formatting tags if detected
    let formattedWord = wordText;
    if (isBold) formattedWord = `<strong>${formattedWord}</strong>`;
    if (isItalic) formattedWord = `<em>${formattedWord}</em>`;
    
    html += formattedWord + ' ';
  }

  return html.trim();
}

/**
 * Detect if paragraph is RTL (Arabic) or LTR
 */
function detectParagraphDirection(paragraph) {
  const text = extractParagraphText(paragraph);
  const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
  return arabicChars > text.length * 0.3;
}

/**
 * Estimate font size category from paragraph symbols
 */
function estimateFontSize(paragraph, pageHeight) {
  if (!paragraph.words || paragraph.words.length === 0) return 'normal';
  
  // Calculate average symbol height relative to page
  let totalHeight = 0;
  let count = 0;

  for (const word of paragraph.words) {
    if (word.boundingBox && word.boundingBox.vertices && word.boundingBox.vertices.length >= 4) {
      const v = word.boundingBox.vertices;
      const height = Math.abs((v[3].y || 0) - (v[0].y || 0));
      if (height > 0) {
        totalHeight += height;
        count++;
      }
    }
  }

  if (count === 0) return 'normal';
  const avgHeight = totalHeight / count;
  const relativeSize = avgHeight / pageHeight;

  // Thresholds for heading detection
  if (relativeSize > 0.04) return 'large';    // ~h2
  if (relativeSize > 0.028) return 'medium';   // ~h3
  return 'normal';
}

/**
 * Estimate text alignment from block bounding box position
 */
function estimateAlignment(block, pageWidth) {
  if (!block.boundingBox || !block.boundingBox.vertices || block.boundingBox.vertices.length < 4) {
    return 'right'; // Default RTL
  }

  const v = block.boundingBox.vertices;
  const leftEdge = Math.min(v[0].x || 0, v[3].x || 0);
  const rightEdge = Math.max(v[1].x || 0, v[2].x || 0);
  const blockWidth = rightEdge - leftEdge;
  const centerX = (leftEdge + rightEdge) / 2;

  // If block is narrow and centered
  if (blockWidth < pageWidth * 0.5) {
    const pageCenterX = pageWidth / 2;
    if (Math.abs(centerX - pageCenterX) < pageWidth * 0.1) {
      return 'center';
    }
  }

  // Check if text is closer to right side (RTL) or left side (LTR)
  if (leftEdge > pageWidth * 0.4 && rightEdge > pageWidth * 0.8) {
    return 'right';
  }
  if (leftEdge < pageWidth * 0.2 && rightEdge < pageWidth * 0.6) {
    return 'left';
  }

  return 'right'; // Default for Arabic documents
}

/**
 * Build HTML for table blocks (basic support)
 */
function buildTableHTML(block) {
  // Basic table rendering — Vision API table support is limited
  let html = '<table style="width: 100%; border-collapse: collapse; margin: 12px 0; direction: rtl;">';
  if (block.paragraphs) {
    for (const paragraph of block.paragraphs) {
      const text = extractParagraphText(paragraph);
      if (text.trim()) {
        html += `<tr><td style="border: 1px solid #d1d5db; padding: 8px;">${text}</td></tr>`;
      }
    }
  }
  html += '</table>';
  return html;
}

/**
 * Call Vision API for PDF and return raw response
 */
async function callVisionAPIPDF(pdfBuffer) {
  const base64PDF = pdfBuffer.toString('base64');

  const response = await fetch(
    `https://vision.googleapis.com/v1/files:annotate?key=${process.env.GOOGLE_CLOUD_VISION_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          inputConfig: {
            content: base64PDF,
            mimeType: 'application/pdf',
          },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          imageContext: { languageHints: ['ar', 'en'] },
        }],
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.json();
    console.error('Vision API PDF error:', JSON.stringify(errorBody, null, 2));
    throw new Error(`Google Vision API error: ${errorBody.error?.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Call Vision API for image and return raw response
 */
async function callVisionAPIImage(imageBuffer) {
  const base64Image = imageBuffer.toString('base64');

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_VISION_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          imageContext: { languageHints: ['ar', 'en'] },
        }],
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.json();
    console.error('Vision API image error:', JSON.stringify(errorBody, null, 2));
    throw new Error(`Google Vision API error: ${errorBody.error?.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Extract text from a PDF file — returns both plain text and structured HTML
 */
async function extractTextFromPDF(pdfBuffer) {
  const data = await callVisionAPIPDF(pdfBuffer);

  let plainText = '';
  let structuredHTML = '';

  if (data.responses && data.responses.length > 0) {
    const fileResponse = data.responses[0];
    if (fileResponse.responses) {
      for (const pageResponse of fileResponse.responses) {
        if (pageResponse.fullTextAnnotation) {
          plainText += (pageResponse.fullTextAnnotation.text || '') + '\n';
          structuredHTML += annotationToStructuredHTML(pageResponse.fullTextAnnotation);
          structuredHTML += '<div style="page-break-after: always; margin: 24px 0; border-bottom: 1px dashed #cbd5e1;"></div>\n';
        }
      }
    }
  }

  return { text: plainText.trim(), html: structuredHTML.trim() };
}

/**
 * Extract text from an image file — returns both plain text and structured HTML
 */
async function extractTextFromImage(imageBuffer, mimeType) {
  const data = await callVisionAPIImage(imageBuffer);

  let plainText = '';
  let structuredHTML = '';

  if (data.responses && data.responses.length > 0) {
    const annotation = data.responses[0].fullTextAnnotation;
    if (annotation) {
      plainText = annotation.text || '';
      structuredHTML = annotationToStructuredHTML(annotation);
    }
  }

  return { text: plainText, html: structuredHTML };
}

/**
 * Detect the primary language of the extracted text
 */
function detectLanguage(text) {
  if (!text) return 'unknown';
  
  const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  
  if (arabicChars > latinChars) return 'ar';
  if (latinChars > arabicChars) return 'en';
  return 'unknown';
}

/**
 * Main function to extract text from a file
 * @returns {Promise<{text: string, html: string, language: string}>}
 */
async function extractText(fileBuffer, fileType, mimeType) {
  if (!process.env.GOOGLE_CLOUD_VISION_API_KEY) {
    throw new Error('GOOGLE_CLOUD_VISION_API_KEY is not configured');
  }

  let result = { text: '', html: '' };
  
  if (fileType === 'pdf') {
    result = await extractTextFromPDF(fileBuffer);
  } else if (fileType === 'image') {
    result = await extractTextFromImage(fileBuffer, mimeType);
  } else {
    throw new Error(`Unsupported file type for OCR: ${fileType}`);
  }

  const language = detectLanguage(result.text);
  
  return {
    text: result.text,
    html: result.html,
    language,
  };
}

module.exports = {
  extractText,
  extractTextFromPDF,
  extractTextFromImage,
  detectLanguage,
};
