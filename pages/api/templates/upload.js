// API endpoint for lawyer template upload with OCR processing
import { createClient } from '@supabase/supabase-js';
import mammoth from 'mammoth';
import { extractText } from '../../../lib/ocrService';
import { checkSubscription } from '../../../lib/checkSubscription';

// Use service role key to bypass RLS (same pattern as other API routes)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb', // 25MB max file size
    },
  },
};

export default async function handler(req, res) {
  // Handle CORS preflight for mobile app (origin: https://localhost)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication using authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized - No auth header' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify token and get user (Supabase v1 API)
    const { user, error: authError } = await supabaseAdmin.auth.api.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    // Check subscription status
    const { isReadOnly } = await checkSubscription(
      user.id,
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    if (isReadOnly) {
      return res.status(403).json({
        error: 'الاشتراك غير فعال. يرجى تجديد الاشتراك أولاً.',
        code: 'SUBSCRIPTION_INACTIVE'
      });
    }

    const { file, skip_ocr, display_title } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Parse file info from the base64 or multipart data
    // For simplicity, assuming file is sent as base64 with metadata
    const { name, type, data: fileData } = file;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Only PDF, DOCX, JPG, and PNG files are allowed.' 
      });
    }

    // Determine file type for database
    let fileType = 'docx';
    if (type === 'application/pdf') fileType = 'pdf';
    else if (type.startsWith('image/')) fileType = 'image';

    // Convert base64 to buffer
    const buffer = Buffer.from(fileData, 'base64');

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = name.split('.').pop();
    const fileName = `lawyer-${user.id}/${timestamp}_${randomStr}.${extension}`;

    // Upload to Supabase storage (as authenticated user)
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('templates')
      .upload(fileName, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: type,
        metadata: { 
          originalName: name,
          userId: user.id,
        },
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file to storage', details: uploadError.message });
    }

    // Get public URL
    const { publicURL } = supabaseAdmin
      .storage
      .from('templates')
      .getPublicUrl(fileName);

    // Process file based on type
    let content = '';
    let ocrExtractedText = '';

    if (fileType === 'docx') {
      // Convert DOCX to HTML using mammoth
      try {
        const { value } = await mammoth.convertToHtml({ arrayBuffer: buffer });
        content = value || '';
      } catch (conversionError) {
        console.error('DOCX conversion error:', conversionError);
        content = '';
      }
    } else if (fileType === 'pdf' || fileType === 'image') {
      // Perform OCR if not skipped
      if (!skip_ocr) {
        try {
          console.log(`Starting OCR for ${fileType} file: ${name}, size: ${buffer.length} bytes`);
          const { text, html, language } = await extractText(buffer, fileType, type);
          ocrExtractedText = text;
          console.log(`OCR extracted ${text.length} characters, language: ${language}`);
          // Use structured HTML if available, fallback to plain text
          if (html && html.trim()) {
            content = html;
          } else if (text && text.trim()) {
            content = text.split('\n').filter(line => line.trim()).map(line => `<p>${line}</p>`).join('');
          } else {
            content = '<p>لم يتم العثور على نص في الملف</p>';
          }
        } catch (ocrError) {
          console.error('OCR error details:', ocrError.message);
          // Don't fail the upload if OCR fails
          ocrExtractedText = '';
          content = `<p>فشل استخراج النص: ${ocrError.message}</p>`;
        }
      } else {
        content = '<p>OCR was skipped for this file.</p>';
      }
    }

    // Determine display title
    const finalDisplayTitle = display_title || name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim();

    // Insert into database (using admin client to bypass RLS)
    const { data: insertedData, error: dbError } = await supabaseAdmin
      .from('templates')
      .insert([{
        file_name: fileName,
        file_path: publicURL || '',
        content: content,
        display_title: finalDisplayTitle,
        user_id: user.id,
        is_admin_uploaded: false,
        ocr_extracted_text: ocrExtractedText,
        file_type: fileType,
        updated_at: new Date().toISOString(),
      }]);

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Clean up storage if database insert fails
      await supabaseAdmin.storage.from('templates').remove([fileName]);
      return res.status(500).json({ 
        error: 'Failed to save template metadata', 
        details: dbError.message,
        code: dbError.code,
      });
    }

    // Supabase v1 returns inserted rows directly
    const insertedTemplate = Array.isArray(insertedData) ? insertedData[0] : insertedData;

    return res.status(200).json({
      success: true,
      template: insertedTemplate,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      error: 'An unexpected error occurred during upload',
      details: error.message,
    });
  }
}
