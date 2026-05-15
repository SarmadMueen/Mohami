import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FiFileText, FiPlus, FiSearch, FiChevronDown, FiChevronLeft, FiChevronRight, FiArrowLeft, FiUpload } from 'react-icons/fi';
import Link from 'next/link';

const AddDocumentReviewPage = () => {
    const router = useRouter();
    const { edit } = router.query;
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [cases, setCases] = useState([]);
    const [documentReviews, setDocumentReviews] = useState([]);
    const [filteredDocumentReviews, setFilteredDocumentReviews] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState(null);
    const [fetchingReviews, setFetchingReviews] = useState(true);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploadFileName, setUploadFileName] = useState('');
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState('');
    
    // Search and filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedNextAction, setSelectedNextAction] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');
    const [showStatusFilter, setShowStatusFilter] = useState(false);
    const [showNextActionFilter, setShowNextActionFilter] = useState(false);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    const [formData, setFormData] = useState({
        case_reference_id: '',
        document_title: '',
        review_date: '',
        status: '',
        document_fees: '',
        key_findings: '',
        next_action_required: '',
        action_deadline: '',
        document_upload_url: ''
    });

    // Status options
    const statusOptions = ['مراجعة', 'تحتاج مراجعة', 'موافقة'];
    const nextActionOptions = ['رفع للمحكمة', 'صياغة رد', 'الحصول على التوقيعات', 'أرشفة'];

    useEffect(() => {
        setMounted(true);
        fetchCases();
        fetchDocumentReviews();
        
        // Set default date to current date
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const defaultDate = `${year}-${month}-${day}`;
        
        setFormData(prev => ({
            ...prev,
            review_date: prev.review_date || defaultDate
        }));
    }, []);

    // Handle edit mode
    useEffect(() => {
        if (edit) {
            setIsEditMode(true);
            setEditingReviewId(edit);
            setShowForm(true);
            fetchReviewForEdit(edit);
        }
    }, [edit]);

    const fetchReviewForEdit = async (reviewId) => {
        try {
            const { data, error } = await supabase
                .from('document_reviews')
                .select('*')
                .eq('id', reviewId)
                .single();

            if (error) throw error;

            if (data) {
                // Format date for input field (YYYY-MM-DD)
                const reviewDate = data.review_date 
                    ? new Date(data.review_date).toISOString().split('T')[0]
                    : '';
                
                const actionDeadline = data.action_deadline
                    ? new Date(data.action_deadline).toISOString().split('T')[0]
                    : '';

                setFormData({
                    case_reference_id: data.case_reference_id || '',
                    document_title: data.document_title || '',
                    review_date: reviewDate,
                    status: data.status || '',
                    document_fees: data.document_fees ? data.document_fees.toString() : '',
                    key_findings: data.key_findings || '',
                    next_action_required: data.next_action_required || '',
                    action_deadline: actionDeadline,
                    document_upload_url: data.document_upload_url || ''
                });

                setUploadedFile(data.document_upload_url || null);
                setUploadFileName(data.file_name || '');
                setSelectedFolder(data.folder_name || '');

                // Fetch folders for the case
                if (data.case_reference_id) {
                    fetchFoldersForCase(data.case_reference_id);
                }
            }
        } catch (error) {
            console.error('Error fetching review for edit:', error);
            alert('حدث خطأ أثناء جلب بيانات المراجعة');
        }
    };

    useEffect(() => {
        filterDocumentReviews();
    }, [documentReviews, searchQuery, selectedStatus, selectedNextAction, selectedDate, sortOrder]);

    // Fetch folders when case is selected
    useEffect(() => {
        if (formData.case_reference_id) {
            fetchFoldersForCase(formData.case_reference_id);
        } else {
            setFolders([]);
            setSelectedFolder('');
        }
    }, [formData.case_reference_id]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.filter-dropdown-wrapper')) {
                setShowStatusFilter(false);
                setShowNextActionFilter(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchCases = async () => {
        try {
            const { data, error } = await supabase
                .from('cases')
                .select('case_number, client_name, caseSubject')
                .order('case_number', { ascending: false });
            
            if (error) throw error;
            setCases(data || []);
        } catch (error) {
            console.error('Error fetching cases:', error);
        }
    };

    const fetchDocumentReviews = async () => {
        try {
            setFetchingReviews(true);
            const user = supabase.auth.user();
            if (!user) return;

            const userId = user.id;
            
            const { data: userMetadataList, error: metaError } = await supabase
                .from('user_metadata')
                .select('role, admin_user_id, new_lawyer_id')
                .eq('user_id', userId);

            if (metaError) throw new Error('Metadata error: ' + metaError.message);
            if (!userMetadataList || userMetadataList.length === 0) return;

            const userMetadata = userMetadataList[0];
            const { role, admin_user_id, new_lawyer_id } = userMetadata;

            let query = supabase.from('document_reviews').select('*');

            if (role === 'lawyer' && new_lawyer_id) {
                query = query.eq('lawyer_id', userId);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            setDocumentReviews(data || []);
        } catch (error) {
            console.error('Error fetching document reviews:', error);
        } finally {
            setFetchingReviews(false);
        }
    };

    const filterDocumentReviews = () => {
        let filtered = [...documentReviews];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(review =>
                (review.document_title && review.document_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (review.case_reference_id && review.case_reference_id.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        // Status filter
        if (selectedStatus) {
            filtered = filtered.filter(review => review.status === selectedStatus);
        }

        // Next action filter
        if (selectedNextAction) {
            filtered = filtered.filter(review => review.next_action_required === selectedNextAction);
        }

        // Date filter
        if (selectedDate) {
            filtered = filtered.filter(review => {
                if (!review.review_date) return false;
                const reviewDate = new Date(review.review_date).toISOString().split('T')[0];
                return reviewDate === selectedDate;
            });
        }

        // Sort
        if (sortOrder === 'asc') {
            filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        } else {
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        setFilteredDocumentReviews(filtered);
        setCurrentPage(1);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Helper function to get folder storage name (English name for Storage)
    const getFolderStorageName = (displayName) => {
        const mapping = {
            "مراجعة أوراق": "document_review",
            "الاثباتات": "evidence",
            "الاحكام": "judgments",
            "التنفيذ": "execution",
            "الحسابات": "accounts",
            "المستندات": "documents",
            "محاضر الجلسات": "session_minutes",
            "ملفات الخصم": "opponent_files",
            "ملفات خاصة": "private_files",
            "المجلد الرئيسي": "main"
        };
        // If it's already an English name, return as is
        return mapping[displayName] || displayName;
    };

    // Helper function to get folder display name (same as CaseDetailsPage)
    const getFolderDisplayName = (folderName) => {
        const names = {
            // Default folders
            evidence: "الاثباتات",
            judgments: "الاحكام",
            execution: "التنفيذ",
            accounts: "الحسابات",
            documents: "المستندات",
            session_minutes: "محاضر الجلسات",
            opponent_files: "ملفات الخصم",
            private_files: "ملفات خاصة",
            document_review: "مراجعة أوراق", // Storage name -> Display name
            // Legacy folder names (for backward compatibility)
            docs: "المستندات",
            main: "المجلد الرئيسي",
            session_register: "محاضر الجلسات",
            "مراجعة أوراق": "مراجعة أوراق"
        };
        return names[folderName] || folderName; // Fallback to the folderName itself if no mapping exists
    };

    const fetchFoldersForCase = async (caseNumber) => {
        try {
            if (!caseNumber) {
                setFolders([]);
                return;
            }

            // Default folders that should always be available (same as CaseDetailsPage)
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

            const folderSet = new Set();
            
            // Add default folders
            defaultFolders.forEach(folder => folderSet.add(folder));
            
            // Always add the default folder "مراجعة أوراق"
            folderSet.add('مراجعة أوراق');

            // Fetch all unique folder_name values from attachments table for this case
            try {
                const { data: attachmentsData, error: attachmentsError } = await supabase
                    .from('attachments')
                    .select('folder_name')
                    .eq('case_number', caseNumber);

                if (!attachmentsError && attachmentsData) {
                    // Extract unique folder names from attachments
                    const dbFolders = [...new Set(attachmentsData.map(item => item.folder_name))].filter(Boolean);
                    
                    // Add all folders from database
                    dbFolders.forEach(folder => {
                        if (folder) {
                            folderSet.add(folder);
                        }
                    });
                }
            } catch (attachmentErr) {
                console.error('Error fetching folders from attachments:', attachmentErr);
            }

            // Ensure default folder exists
            await ensureDefaultFolder(caseNumber);

            // Sort folders: default folders first, then others alphabetically
            const allFolders = Array.from(folderSet);
            const sortedFolders = allFolders.sort((a, b) => {
                const aIsDefault = defaultFolders.includes(a);
                const bIsDefault = defaultFolders.includes(b);
                
                // "مراجعة أوراق" should be first
                if (a === 'مراجعة أوراق') return -1;
                if (b === 'مراجعة أوراق') return 1;
                
                if (aIsDefault && !bIsDefault) return -1;
                if (!aIsDefault && bIsDefault) return 1;
                if (aIsDefault && bIsDefault) {
                    return defaultFolders.indexOf(a) - defaultFolders.indexOf(b);
                }
                return a.localeCompare(b);
            });

            setFolders(sortedFolders);

            // Set default folder if not already selected
            if (!selectedFolder && sortedFolders.includes('مراجعة أوراق')) {
                setSelectedFolder('مراجعة أوراق');
            }
        } catch (error) {
            console.error('Error fetching folders:', error);
            // Ensure default folder exists even on error
            await ensureDefaultFolder(caseNumber);
            setFolders(['مراجعة أوراق']);
            setSelectedFolder('مراجعة أوراق');
        }
    };

    const ensureDefaultFolder = async (caseNumber) => {
        try {
            if (!caseNumber) return;

            // Note: In Supabase Storage, folders are created automatically when files are uploaded
            // So we don't need to create a placeholder file. The folder will be created when
            // the first file is uploaded to that path.
            // This function is kept for consistency but doesn't need to do anything.
        } catch (error) {
            console.error('Error ensuring default folder:', error);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!formData.case_reference_id) {
            alert('يرجى اختيار رقم الدعوى أولاً');
            return;
        }

        if (!selectedFolder) {
            alert('يرجى اختيار المجلد أولاً');
            return;
        }

        try {
            setLoading(true);
            const user = supabase.auth.user();
            if (!user) throw new Error('User not authenticated');

            // Get file extension and determine content-type
            const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
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
                return mimeTypes[ext] || file.type || 'application/octet-stream';
            };

            // Build file path: {case_number}/{folder_name}/{fileName}
            // Use English folder name for Storage to avoid issues with Arabic characters
            const storageFolderName = getFolderStorageName(selectedFolder);
            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const filePath = `${formData.case_reference_id}/${storageFolderName}/${fileName}`;

            // Upload to 'images' bucket (same as CaseDetailsPage)
            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: getContentType(fileExtension),
                });

            if (uploadError) {
                console.error('Error uploading file:', uploadError);
                throw new Error(`فشل في تحميل الملف ${file.name}: ${uploadError.message}`);
            }

            // Get public URL
            const { publicURL } = supabase.storage
                .from('images')
                .getPublicUrl(filePath);

            if (!publicURL) {
                throw new Error('فشل في الحصول على رابط الملف');
            }

            // Also insert the attachment into the attachments table
            // This ensures the folder appears in CaseDetailsPage
            try {
                const attachmentToInsert = {
                    file_name: file.name,
                    file_url: publicURL,
                    case_number: formData.case_reference_id,
                    folder_name: selectedFolder, // Keep original folder name with spaces for display
                    created_at: new Date().toISOString(),
                };

                const { error: insertError } = await supabase
                    .from('attachments')
                    .insert([attachmentToInsert]);

                if (insertError) {
                    console.error('Error inserting attachment:', insertError);
                    // Don't throw error, just log it - the file was uploaded successfully
                }
            } catch (insertErr) {
                console.error('Error adding attachment to database:', insertErr);
                // Don't throw error, just log it
            }

            setUploadedFile(publicURL);
            setUploadFileName(file.name);
            setFormData(prev => ({
                ...prev,
                document_upload_url: publicURL
            }));
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('حدث خطأ أثناء رفع الملف: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const user = supabase.auth.user();
            if (!user) throw new Error('User not authenticated');

            const userId = user.id;
            
            const { data: userMetadataList, error: metaError } = await supabase
                .from('user_metadata')
                .select('role, admin_user_id, new_lawyer_id')
                .eq('user_id', userId);

            if (metaError) throw new Error('Metadata error: ' + metaError.message);
            if (!userMetadataList || userMetadataList.length === 0) {
                throw new Error('User metadata not found');
            }

            const userMetadata = userMetadataList[0];
            const { role, admin_user_id, new_lawyer_id } = userMetadata;

            // Fetch case details to get client_id and case_type for tracking
            let clientId = null;
            let caseType = null;
            if (formData.case_reference_id) {
                try {
                    const { data: caseData, error: caseError } = await supabase
                        .from('cases')
                        .select('client_name, caseType')
                        .eq('case_number', formData.case_reference_id)
                        .single();
                    
                    if (!caseError && caseData) {
                        clientId = caseData.client_name || null;
                        caseType = caseData.caseType || null;
                    }
                } catch (caseErr) {
                    console.log('Error fetching case details:', caseErr);
                }
            }

            const reviewData = {
                case_reference_id: formData.case_reference_id,
                document_title: formData.document_title,
                review_date: formData.review_date,
                folder_name: selectedFolder || null,
                status: formData.status,
                document_fees: parseFloat(formData.document_fees) || 0,
                key_findings: formData.key_findings,
                next_action_required: formData.next_action_required,
                action_deadline: formData.action_deadline || null,
                document_upload_url: formData.document_upload_url,
                file_name: uploadFileName || null,
                lawyer_id: role === 'lawyer' ? userId : null,
                admin_id: role === 'admin' ? userId : null,
                created_by: userId,
                updated_by: userId,
                client_id: clientId,
                case_type: caseType,
                is_review_completed: formData.status === 'موافقة' ? true : false
            };

            if (isEditMode && editingReviewId) {
                // Update existing review
                const { error } = await supabase
                    .from('document_reviews')
                    .update(reviewData)
                    .eq('id', editingReviewId);

                if (error) throw error;

                alert('تم تحديث المراجعة بنجاح');
                router.push(`/services/view-document-review?id=${editingReviewId}`);
            } else {
                // Generate reference number
                const { data: lastReview, error: refError } = await supabase
                    .from('document_reviews')
                    .select('reference_number')
                    .not('reference_number', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(1);

                let nextRefNumber = 'DOC-1';
                if (!refError && lastReview && lastReview.length > 0 && lastReview[0].reference_number) {
                    const lastRef = lastReview[0].reference_number;
                    const match = lastRef.match(/DOC-(\d+)/);
                    if (match) {
                        const lastNum = parseInt(match[1]);
                        const nextNum = lastNum + 1;
                        nextRefNumber = 'DOC-' + String(nextNum);
                    }
                }

                reviewData.reference_number = nextRefNumber;

                // Insert new review
                const { error } = await supabase
                    .from('document_reviews')
                    .insert([reviewData]);

                if (error) throw error;

                await fetchDocumentReviews();
                
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const defaultDate = `${year}-${month}-${day}`;
                
                setFormData({
                    case_reference_id: '',
                    document_title: '',
                    review_date: defaultDate,
                    status: '',
                    document_fees: '',
                    key_findings: '',
                    next_action_required: '',
                    action_deadline: '',
                    document_upload_url: ''
                });

                setShowForm(false);
                setUploadedFile(null);
                setUploadFileName('');
                setSelectedFolder('');
            }
            setUploadedFile(null);
            setUploadFileName('');
            setSelectedFolder('');
            
            setShowForm(false);
        } catch (error) {
            console.error('Error adding document review:', error);
            alert('حدث خطأ أثناء إضافة مراجعة الأوراق: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Pagination logic
    const totalPages = Math.ceil(filteredDocumentReviews.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentReviews = filteredDocumentReviews.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    if (!mounted) {
        return null;
    }

    // Show form only if explicitly requested (edit mode or form requested)
    // This prevents the flash of form before reviews are loaded
    if (showForm) {
        return (
            <Layout>
                <Head>
                    <title>إضافة مراجعة أوراق قانونية - مكتب المحامي</title>
                </Head>
                <div className="document-review-form-page">
                    <style jsx>{`
                        .document-review-form-page {
                            min-height: 100vh;
                            background: transparent;
                            padding: 2rem 1.5rem;
                            direction: rtl;
                            max-width: 1200px;
                            margin: 0 auto;
                        }

                        .back-button {
                            display: inline-flex;
                            align-items: center;
                            gap: 0.5rem;
                            padding: 0.75rem 1.5rem;
                            background: #ffffff;
                            color: #475569;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            font-size: 0.9375rem;
                            font-weight: 500;
                            cursor: pointer;
                            margin-bottom: 1.5rem;
                            transition: all 0.2s;
                            font-family: 'Cairo', 'Almarai', sans-serif;
                        }

                        .back-button:hover {
                            background: #f8fafc;
                        }

                        .page-header {
                            margin-bottom: 2rem;
                        }

                        .page-title {
                            font-size: 1.875rem;
                            font-weight: 700;
                            color: #1e293b;
                            margin: 0;
                            font-family: 'Cairo', 'Almarai', sans-serif;
                        }

                        .form-container {
                            background: #ffffff;
                            border-radius: 12px;
                            padding: 2rem;
                            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                        }

                        .form-section {
                            margin-bottom: 2rem;
                        }

                        .form-section:last-of-type {
                            margin-bottom: 0;
                        }

                        .section-title {
                            font-size: 1.25rem;
                            font-weight: 600;
                            color: #1e293b;
                            margin-bottom: 1.5rem;
                            padding-bottom: 0.75rem;
                            border-bottom: 2px solid #e2e8f0;
                            font-family: 'Cairo', 'Almarai', sans-serif;
                        }

                        .form-grid {
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 1.5rem;
                            margin-bottom: 1.5rem;
                        }

                        .form-grid.three-columns {
                            grid-template-columns: repeat(3, 1fr);
                        }

                        .form-group {
                            display: flex;
                            flex-direction: column;
                        }

                        .form-group.full-width {
                            grid-column: 1 / -1;
                        }

                        .form-label {
                            font-size: 0.9375rem;
                            font-weight: 500;
                            color: #475569;
                            margin-bottom: 0.5rem;
                            font-family: 'Cairo', 'Almarai', sans-serif;
                        }

                        .required-asterisk {
                            color: #ef4444;
                            margin-left: 0.25rem;
                        }

                        .form-input,
                        .form-select,
                        .form-textarea {
                            padding: 0.75rem 1rem;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            font-size: 0.9375rem;
                            font-family: 'Cairo', 'Almarai', sans-serif;
                            transition: all 0.2s;
                            background: #ffffff;
                        }

                        .form-input:focus,
                        .form-select:focus,
                        .form-textarea:focus {
                            outline: none;
                            border-color: #3b82f6;
                            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                        }

                        .form-textarea {
                            resize: vertical;
                            min-height: 120px;
                        }

                        .file-upload-wrapper {
                            display: flex;
                            flex-direction: column;
                            gap: 0.75rem;
                        }

                        .file-upload-button {
                            display: inline-flex;
                            align-items: center;
                            gap: 0.5rem;
                            padding: 0.75rem 1.5rem;
                            background: #f8fafc;
                            color: #475569;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            font-size: 0.9375rem;
                            font-weight: 500;
                            cursor: pointer;
                            transition: all 0.2s;
                            font-family: 'Cairo', 'Almarai', sans-serif;
                            width: fit-content;
                        }

                        .file-upload-button:hover {
                            background: #f1f5f9;
                            border-color: #cbd5e1;
                        }

                        .file-upload-input {
                            display: none;
                        }

                        .uploaded-file-name {
                            font-size: 0.875rem;
                            color: #10b981;
                            font-family: 'Cairo', 'Almarai', sans-serif;
                        }

                        .submit-button {
                            display: inline-flex;
                            align-items: center;
                            gap: 0.5rem;
                            padding: 1rem 2rem;
                            background: #2563EB;
                            color: #ffffff;
                            border: none;
                            border-radius: 8px;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s;
                            font-family: 'Cairo', 'Almarai', sans-serif;
                            margin-top: 1.5rem;
                        }

                        .submit-button:hover:not(:disabled) {
                            background: #1e40af;
                        }

                        .submit-button:disabled {
                            opacity: 0.6;
                            cursor: not-allowed;
                        }

                        @media (max-width: 1024px) {
                            .form-grid.three-columns {
                                grid-template-columns: repeat(2, 1fr);
                            }
                        }

                        @media (max-width: 768px) {
                            .form-grid {
                                grid-template-columns: 1fr;
                                gap: 1rem;
                            }

                            .form-grid.three-columns {
                                grid-template-columns: 1fr;
                            }
                        }
                    `}</style>

                    <button className="back-button" onClick={() => {
                        if (isEditMode) {
                            router.push(`/services/view-document-review?id=${editingReviewId}`);
                        } else {
                            setShowForm(false);
                        }
                    }}>
                        <FiArrowLeft />
                        {isEditMode ? 'العودة إلى عرض المراجعة' : 'العودة إلى القائمة'}
                    </button>

                    <div className="page-header">
                        <h1 className="page-title">{isEditMode ? 'تعديل مراجعة أوراق قانونية' : 'مراجعة أوراق قانونية جديدة'}</h1>
                    </div>

                    <div className="form-container">
                        <form onSubmit={handleSubmit}>
                            <div className="form-section">
                                <h2 className="section-title">معلومات المراجعة</h2>
                                <div className="form-grid three-columns">
                                    <div className="form-group">
                                        <label className="form-label">
                                            <span className="required-asterisk">*</span>
                                            رقم الدعوى المرجعي
                                        </label>
                                        <select
                                            name="case_reference_id"
                                            className="form-select"
                                            value={formData.case_reference_id}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">اختر رقم الدعوى...</option>
                                            {cases.map((caseItem) => (
                                                <option key={caseItem.case_number} value={caseItem.case_number}>
                                                    {caseItem.case_number}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            <span className="required-asterisk">*</span>
                                            عنوان/اسم المستند
                                        </label>
                                        <input
                                            type="text"
                                            name="document_title"
                                            className="form-input"
                                            value={formData.document_title}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="عنوان المستند"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            <span className="required-asterisk">*</span>
                                            تاريخ المراجعة
                                        </label>
                                        <input
                                            type="date"
                                            name="review_date"
                                            className="form-input"
                                            value={formData.review_date}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-grid three-columns">
                                    <div className="form-group">
                                        <label className="form-label">
                                            <span className="required-asterisk">*</span>
                                            الحالة
                                        </label>
                                        <select
                                            name="status"
                                            className="form-select"
                                            value={formData.status}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">اختر الحالة...</option>
                                            {statusOptions.map((status) => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            رسوم المراجعة
                                        </label>
                                        <input
                                            type="number"
                                            name="document_fees"
                                            className="form-input"
                                            value={formData.document_fees}
                                            onChange={handleInputChange}
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            <span className="required-asterisk">*</span>
                                            الإجراء المطلوب التالي
                                        </label>
                                        <select
                                            name="next_action_required"
                                            className="form-select"
                                            value={formData.next_action_required}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">اختر الإجراء...</option>
                                            {nextActionOptions.map((action) => (
                                                <option key={action} value={action}>{action}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            تاريخ انتهاء الإجراء
                                        </label>
                                        <input
                                            type="date"
                                            name="action_deadline"
                                            className="form-input"
                                            value={formData.action_deadline}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h2 className="section-title">تفاصيل المراجعة</h2>
                                
                                <div className="form-group full-width">
                                    <label className="form-label">
                                        <span className="required-asterisk">*</span>
                                        النتائج الرئيسية / الملاحظات
                                    </label>
                                    <textarea
                                        name="key_findings"
                                        className="form-textarea"
                                        value={formData.key_findings}
                                        onChange={handleInputChange}
                                        placeholder="أدخل النتائج الرئيسية والملاحظات..."
                                        rows={8}
                                        required
                                    />
                                </div>

                                <div className="form-group full-width">
                                    <label className="form-label">رفع المستند</label>
                                    {formData.case_reference_id ? (
                                        <>
                                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                                <label className="form-label">
                                                    <span className="required-asterisk">*</span>
                                                    اختر المجلد
                                                </label>
                                                <select
                                                    className="form-select"
                                                    value={selectedFolder}
                                                    onChange={(e) => setSelectedFolder(e.target.value)}
                                                    required
                                                >
                                                    <option value="">اختر المجلد...</option>
                                                    {folders.map((folder) => (
                                                        <option key={folder} value={folder}>
                                                            {getFolderDisplayName(folder)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="file-upload-wrapper">
                                                <label className="file-upload-button">
                                                    <FiUpload />
                                                    اختر ملف للرفع
                                                    <input
                                                        type="file"
                                                        className="file-upload-input"
                                                        onChange={handleFileUpload}
                                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                        disabled={!selectedFolder}
                                                    />
                                                </label>
                                                {uploadFileName && (
                                                    <span className="uploaded-file-name">
                                                        ✓ تم رفع الملف: {uploadFileName}
                                                    </span>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <p style={{ color: '#64748b', fontSize: '0.875rem', fontFamily: 'Cairo, Almarai, sans-serif' }}>
                                            يرجى اختيار رقم الدعوى أولاً لعرض المجلدات المتاحة
                                        </p>
                                    )}
                                </div>
                            </div>

                            <button type="submit" className="submit-button" disabled={loading}>
                                <FiFileText />
                                {loading 
                                    ? (isEditMode ? 'جاري التحديث...' : 'جاري الحفظ...') 
                                    : (isEditMode ? 'تحديث المراجعة' : 'إضافة المراجعة')
                                }
                            </button>
                        </form>
                    </div>
                </div>
            </Layout>
        );
    }

    // Show list view with filters and table
    return (
        <Layout>
            <Head>
                <title>مراجعة أوراق قانونية - مكتب المحامي</title>
            </Head>
            <div className="document-reviews-page">
                <style jsx>{`
                    .document-reviews-page {
                        min-height: 100vh;
                        background: transparent;
                        padding: 2rem 1.5rem;
                        direction: rtl;
                        max-width: 1400px;
                        margin: 0 auto;
                    }

                    .breadcrumbs {
                        font-size: 0.875rem;
                        color: #64748b;
                        margin-bottom: 1.5rem;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                    }

                    .breadcrumbs a {
                        color: #2563EB;
                        text-decoration: none;
                    }

                    .breadcrumbs a:hover {
                        text-decoration: underline;
                    }

                    .page-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 1.5rem;
                        gap: 1rem;
                    }

                    .header-left {
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                        flex: 1;
                    }

                    .search-container {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        flex: 1;
                        max-width: 500px;
                    }

                    .search-input {
                        flex: 1;
                        padding: 0.75rem 1rem;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        font-size: 0.9375rem;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                    }

                    .search-input:focus {
                        outline: none;
                        border-color: #3b82f6;
                        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                    }

                    .add-new-button {
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.75rem 1.5rem;
                        background: #2563EB;
                        color: #ffffff;
                        border: none;
                        border-radius: 8px;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                        white-space: nowrap;
                    }

                    .add-new-button:hover {
                        background: #1e40af;
                    }

                    .filters-row {
                        display: flex;
                        gap: 0.75rem;
                        margin-bottom: 1.5rem;
                        flex-wrap: wrap;
                    }

                    .filter-button {
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.625rem 1rem;
                        background: #ffffff;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        font-size: 0.875rem;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                        position: relative;
                    }

                    .filter-button:hover {
                        background: #f8fafc;
                        border-color: #cbd5e1;
                    }

                    .filter-button.active {
                        background: #eff6ff;
                        border-color: #2563EB;
                        color: #2563EB;
                    }

                    .filter-dropdown-wrapper {
                        position: relative;
                    }

                    .filter-dropdown {
                        position: absolute;
                        top: 100%;
                        right: 0;
                        margin-top: 0.5rem;
                        background: #ffffff;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                        z-index: 100;
                        min-width: 200px;
                        max-height: 300px;
                        overflow-y: auto;
                        padding: 0.5rem;
                    }

                    .filter-option {
                        display: block;
                        width: 100%;
                        padding: 0.625rem 0.75rem;
                        text-align: right;
                        border: none;
                        background: transparent;
                        cursor: pointer;
                        border-radius: 6px;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                        font-size: 0.875rem;
                        transition: all 0.2s;
                    }

                    .filter-option:hover {
                        background: #f8fafc;
                    }

                    .filter-option.selected {
                        background: #eff6ff;
                        color: #2563EB;
                        font-weight: 600;
                    }

                    .filter-option.clear-filter {
                        margin-top: 0.5rem;
                        padding-top: 0.75rem;
                        border-top: 1px solid #e2e8f0;
                        color: #ef4444;
                    }

                    .reviews-table {
                        width: 100%;
                        border-collapse: collapse;
                        background: #ffffff;
                        border-radius: 8px;
                        overflow: hidden;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    }

                    .reviews-table thead {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }

                    .reviews-table th {
                        padding: 1rem;
                        text-align: right;
                        font-weight: 600;
                        color: #ffffff;
                        font-size: 0.875rem;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                    }

                    .reviews-table td {
                        padding: 1rem;
                        text-align: right;
                        border-bottom: 1px solid #e2e8f0;
                        color: #475569;
                        font-size: 0.9375rem;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                    }

                    .reviews-table tbody tr:hover {
                        background: #f8fafc;
                    }

                    .reviews-table tbody tr:last-child td {
                        border-bottom: none;
                    }

                    .expand-button {
                        background: none;
                        border: none;
                        cursor: pointer;
                        font-size: 1.25rem;
                        color: #64748b;
                        transition: all 0.2s;
                        padding: 0.5rem;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 4px;
                    }

                    .expand-button:hover {
                        background: #e2e8f0;
                        color: #475569;
                    }

                    .review-details {
                        animation: slideDown 0.3s ease-out;
                    }

                    @keyframes slideDown {
                        from {
                            opacity: 0;
                            transform: translateY(-10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    .review-details h3 {
                        margin-bottom: 1rem;
                        color: #1e293b;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                        font-size: 1.125rem;
                        font-weight: 600;
                    }

                    .status-badge {
                        display: inline-block;
                        padding: 0.375rem 0.75rem;
                        border-radius: 6px;
                        font-size: 0.8125rem;
                        font-weight: 500;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                    }

                    .status-reviewed {
                        background: #dcfce7;
                        color: #166534;
                    }

                    .status-needs-revision {
                        background: #fef3c7;
                        color: #92400e;
                    }

                    .status-approved {
                        background: #dbeafe;
                        color: #1e40af;
                    }

                    .pagination {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: 0.5rem;
                        margin-top: 2rem;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                    }

                    .pagination-button {
                        padding: 0.5rem 1rem;
                        border: 1px solid #e2e8f0;
                        background: #ffffff;
                        color: #475569;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.875rem;
                        transition: all 0.2s;
                    }

                    .pagination-button:hover:not(:disabled) {
                        background: #f8fafc;
                        border-color: #cbd5e1;
                    }

                    .pagination-button:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }

                    .pagination-button.active {
                        background: #2563EB;
                        color: #ffffff;
                        border-color: #2563EB;
                    }

                    .empty-state-container {
                        background: #ffffff;
                        border-radius: 12px;
                        padding: 3rem 2rem;
                        margin-bottom: 2rem;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                        text-align: center;
                    }

                    .empty-state-icon {
                        font-size: 4rem;
                        color: #cbd5e1;
                        margin-bottom: 1.5rem;
                    }

                    .empty-state-title {
                        font-size: 1.5rem;
                        font-weight: 600;
                        color: #1e293b;
                        margin-bottom: 0.75rem;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                    }

                    .empty-state-message {
                        font-size: 1rem;
                        color: #64748b;
                        margin-bottom: 2rem;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                    }

                    .empty-state-button {
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 1rem 2rem;
                        background: #2563EB;
                        color: #ffffff;
                        border: none;
                        border-radius: 8px;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                    }

                    .empty-state-button:hover {
                        background: #1e40af;
                    }

                    .empty-state {
                        text-align: center;
                        padding: 4rem 2rem;
                        color: #64748b;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                    }

                    @media (max-width: 768px) {
                        .page-header {
                            flex-direction: column;
                            align-items: stretch;
                        }

                        .search-container {
                            max-width: 100%;
                        }

                        .reviews-table {
                            font-size: 0.8125rem;
                        }

                        .reviews-table th,
                        .reviews-table td {
                            padding: 0.75rem;
                        }
                    }
                `}</style>

                <div className="breadcrumbs">
                    <Link href="/services/legal-services">الخدمات القانونية</Link> / مراجعة أوراق قانونية
                </div>

                {!showForm && (
                    <>
                        {fetchingReviews ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                جاري تحميل البيانات...
                            </div>
                        ) : (
                            <>
                                {documentReviews.length === 0 ? (
                                    <div className="empty-state-container">
                                        <div className="empty-state-icon">📄</div>
                                        <h2 className="empty-state-title">لا توجد مراجعات أوراق قانونية</h2>
                                        <p className="empty-state-message">
                                            ابدأ بإضافة مراجعة أوراق قانونية جديدة لتتبع وتحليل المستندات القانونية
                                        </p>
                                        <button className="empty-state-button" onClick={() => setShowForm(true)}>
                                            <FiPlus />
                                            إضافة مراجعة أوراق قانونية
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="page-header">
                    <div className="header-left">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="ابحث عن مراجعة..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="add-new-button" onClick={() => setShowForm(true)}>
                        <FiPlus />
                        إضافة مراجعة جديدة
                    </button>
                </div>

                <div className="filters-row">
                    <div className="filter-dropdown-wrapper">
                        <button
                            className={`filter-button ${selectedStatus ? 'active' : ''}`}
                            onClick={() => setShowStatusFilter(!showStatusFilter)}
                        >
                            الحالة
                            {selectedStatus && <span> ({selectedStatus})</span>}
                            <FiChevronDown style={{ marginRight: '0.25rem' }} />
                        </button>
                        {showStatusFilter && (
                            <div className="filter-dropdown">
                                {statusOptions.map((status) => (
                                    <button
                                        key={status}
                                        className={`filter-option ${selectedStatus === status ? 'selected' : ''}`}
                                        onClick={() => {
                                            setSelectedStatus(selectedStatus === status ? '' : status);
                                            setShowStatusFilter(false);
                                        }}
                                    >
                                        {status}
                                    </button>
                                ))}
                                {selectedStatus && (
                                    <button
                                        className="filter-option clear-filter"
                                        onClick={() => {
                                            setSelectedStatus('');
                                            setShowStatusFilter(false);
                                        }}
                                    >
                                        إلغاء الفلتر
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="filter-dropdown-wrapper">
                        <button
                            className={`filter-button ${selectedNextAction ? 'active' : ''}`}
                            onClick={() => setShowNextActionFilter(!showNextActionFilter)}
                        >
                            الإجراء التالي
                            {selectedNextAction && <span> ({selectedNextAction})</span>}
                            <FiChevronDown style={{ marginRight: '0.25rem' }} />
                        </button>
                        {showNextActionFilter && (
                            <div className="filter-dropdown">
                                {nextActionOptions.map((action) => (
                                    <button
                                        key={action}
                                        className={`filter-option ${selectedNextAction === action ? 'selected' : ''}`}
                                        onClick={() => {
                                            setSelectedNextAction(selectedNextAction === action ? '' : action);
                                            setShowNextActionFilter(false);
                                        }}
                                    >
                                        {action}
                                    </button>
                                ))}
                                {selectedNextAction && (
                                    <button
                                        className="filter-option clear-filter"
                                        onClick={() => {
                                            setSelectedNextAction('');
                                            setShowNextActionFilter(false);
                                        }}
                                    >
                                        إلغاء الفلتر
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <input
                        type="date"
                        className="filter-button"
                        placeholder="تاريخ المراجعة"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        style={{ padding: '0.625rem 1rem' }}
                    />
                    <button
                        className={`filter-button ${sortOrder === 'asc' ? 'active' : ''}`}
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                        {sortOrder === 'asc' ? 'الأقدم أولاً' : 'الأحدث أولاً'}
                    </button>
                </div>

                                        {currentReviews.length === 0 ? (
                                            <div className="empty-state">لا توجد مراجعات</div>
                                        ) : (
                                            <>
                                                <table className="reviews-table">
                                                    <thead>
                                                        <tr>
                                                            <th>الرقم المرجعي</th>
                                                            <th>رقم الدعوى</th>
                                                            <th>عنوان المستند</th>
                                                            <th>تاريخ المراجعة</th>
                                                            <th>الحالة</th>
                                                            <th>الإجراء التالي</th>
                                                            <th>تاريخ انتهاء الإجراء</th>
                                                            <th>التفاصيل</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {currentReviews.map((review) => (
                                                            <tr key={review.id}>
                                                                <td>{review.id?.toString().slice(0, 8) || '-'}</td>
                                                                <td>{review.case_reference_id || '-'}</td>
                                                                <td>{review.document_title || '-'}</td>
                                                                <td>
                                                                    {review.review_date
                                                                        ? new Date(review.review_date).toLocaleDateString('ar-EG')
                                                                        : '-'}
                                                                </td>
                                                                <td>
                                                                    <span className={`status-badge status-${review.status?.toLowerCase().replace(' ', '-') || 'reviewed'}`}>
                                                                        {review.status || '-'}
                                                                    </span>
                                                                </td>
                                                                <td>{review.next_action_required || '-'}</td>
                                                                <td>
                                                                    {review.action_deadline
                                                                        ? new Date(review.action_deadline).toLocaleDateString('ar-EG')
                                                                        : '-'}
                                                                </td>
                                                                <td>
                                                                    <button
                                                                        className="expand-button"
                                                                        onClick={() => router.push(`/services/view-document-review?id=${review.id}`)}
                                                                        style={{
                                                                            background: 'none',
                                                                            border: 'none',
                                                                            cursor: 'pointer',
                                                                            fontSize: '1.25rem',
                                                                            color: '#64748b',
                                                                            transition: 'all 0.2s',
                                                                            padding: '0.5rem',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            borderRadius: '4px'
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.currentTarget.style.background = '#e2e8f0';
                                                                            e.currentTarget.style.color = '#475569';
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.currentTarget.style.background = 'none';
                                                                            e.currentTarget.style.color = '#64748b';
                                                                        }}
                                                                    >
                                                                        <FiChevronLeft />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>

                                                {totalPages > 1 && (
                                                    <div className="pagination">
                                                        <button
                                                            className="pagination-button"
                                                            onClick={() => handlePageChange(1)}
                                                            disabled={currentPage === 1}
                                                        >
                                                            البداية
                                                        </button>
                                                        <button
                                                            className="pagination-button"
                                                            onClick={() => handlePageChange(currentPage - 1)}
                                                            disabled={currentPage === 1}
                                                        >
                                                            <FiChevronRight />
                                                        </button>
                                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                                            <button
                                                                key={page}
                                                                className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                                                                onClick={() => handlePageChange(page)}
                                                            >
                                                                {page}
                                                            </button>
                                                        ))}
                                                        <button
                                                            className="pagination-button"
                                                            onClick={() => handlePageChange(currentPage + 1)}
                                                            disabled={currentPage === totalPages}
                                                        >
                                                            <FiChevronLeft />
                                                        </button>
                                                        <button
                                                            className="pagination-button"
                                                            onClick={() => handlePageChange(totalPages)}
                                                            disabled={currentPage === totalPages}
                                                        >
                                                            النهاية
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
};

export default withAuth(AddDocumentReviewPage, [], true);

