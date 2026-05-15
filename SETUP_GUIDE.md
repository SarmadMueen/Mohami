# Lawyer Template Upload with OCR - Setup Guide

## Overview
This feature enables lawyers to upload their own templates (PDF, DOCX, images) with professional OCR text extraction for Arabic and English.

## Prerequisites

### 1. Google Cloud Vision API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Vision API:
   - Navigate to APIs & Services > Library
   - Search for "Cloud Vision API"
   - Click "Enable"
4. Create API credentials:
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "API Key"
   - Copy the API key
5. Add the API key to your environment variables (see below)

### 2. Database Migration

Run the following SQL migrations in order:

```bash
# 1. Add user_id and ownership tracking to templates table
psql -U your_user -d your_database -f database/migrations/add_user_id_to_templates.sql

# 2. Update RLS policies for templates table
psql -U your_user -d your_database -f database/migrations/update_templates_rls_policies.sql

# 3. Update storage policies for templates bucket
psql -U your_user -d your_database -f database/migrations/update_templates_storage_policies.sql
```

Or run them in Supabase SQL Editor directly.

### 3. Environment Configuration

Add the following to your `.env.local` file:

```env
GOOGLE_CLOUD_VISION_API_KEY=your_google_cloud_vision_api_key_here
MAX_TEMPLATE_FILE_SIZE=26214400
```

## Features

### Template Upload
- **File Types**: PDF, DOCX, JPG, PNG
- **Max Size**: 25MB per file
- **OCR**: Automatic text extraction for PDF and images
- **Language**: Supports Arabic and English

### Template Management
- Lawyers can upload their own templates
- Lawyers can view all templates (admin + other lawyers')
- Lawyers can only delete their own templates
- Filter tabs: All Templates, My Templates, System Templates
- Ownership badge shows "خاص بي" (Private to me) for lawyer-uploaded templates

### Access Control
- Row Level Security (RLS) policies ensure lawyers can only modify their own templates
- Admins have full access to all templates
- Storage policies enforce folder-based access control

## File Structure

```
lawyer-{user_id}/
  ├── timestamp_random.docx
  ├── timestamp_random.pdf
  └── timestamp_random.jpg
```

## API Endpoints

### POST /api/templates/upload

Upload a new template with OCR processing.

**Request:**
```json
{
  "file": {
    "name": "document.pdf",
    "type": "application/pdf",
    "data": "base64_encoded_file"
  },
  "skip_ocr": false,
  "display_title": "Custom Title (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "template": {
    "id": "...",
    "file_name": "lawyer-{user_id}/timestamp_random.pdf",
    "file_path": "https://...",
    "display_title": "Custom Title",
    "content": "<html>...</html>",
    "ocr_extracted_text": "Extracted text...",
    "file_type": "pdf",
    "user_id": "...",
    "is_admin_uploaded": false
  }
}
```

## Testing

### Manual Testing Checklist

1. **Upload DOCX File**
   - Navigate to `/templates/upload`
   - Upload a DOCX file
   - Verify it appears in template library
   - Verify ownership badge shows "قالي"
   - Test editing the template

2. **Upload PDF with Arabic Text**
   - Upload a PDF containing Arabic text
   - Verify OCR extraction works
   - Check extracted text accuracy
   - Verify template is usable in editor

3. **Upload PDF with English Text**
   - Upload a PDF containing English text
   - Verify OCR extraction works
   - Check extracted text accuracy

4. **Upload Image with Text**
   - Upload JPG/PNG with text
   - Verify OCR extraction works
   - Check language detection

5. **Skip OCR Option**
   - Upload PDF with "Skip OCR" checked
   - Verify OCR is not performed
   - Verify template is still created

6. **Delete Own Template**
   - Upload a template
   - Click delete button
   - Verify template is removed
   - Verify storage file is deleted

7. **Filter Tabs**
   - Test "All Templates" filter
   - Test "My Templates" filter
   - Test "System Templates" filter

8. **Access Control**
   - Verify lawyers cannot delete admin templates
   - Verify lawyers cannot delete other lawyers' templates
   - Verify admin can delete all templates

## Cost Considerations

Google Cloud Vision API pricing:
- First 1,000 units/month: Free
- $1.50 per 1,000 units thereafter
- 1 unit = 1 image or 1 PDF page

To monitor usage:
- Check Google Cloud Console > APIs & Services > Dashboard
- Consider implementing usage limits per lawyer

## Troubleshooting

### OCR Not Working
- Verify `GOOGLE_CLOUD_VISION_API_KEY` is set
- Check API key has Vision API enabled
- Verify network connectivity to Google Cloud

### Upload Failing
- Check file size is under 25MB
- Verify file type is supported
- Check Supabase storage policies
- Review browser console for errors

### Templates Not Showing
- Verify database migration was successful
- Check RLS policies are applied
- Verify user is authenticated
- Check browser console for errors

## Security Notes

- API keys should never be committed to git
- Use environment variables for sensitive data
- RLS policies are enforced at database level
- Storage policies prevent unauthorized access
- File size limits prevent DoS attacks

## Future Enhancements

- Template sharing between lawyers
- Template categories and tags
- Search by OCR-extracted content
- Batch OCR re-processing
- Template versioning
- Usage analytics
