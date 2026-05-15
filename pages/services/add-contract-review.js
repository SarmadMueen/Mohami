import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FiFileText, FiPlus, FiSearch, FiChevronDown, FiChevronLeft, FiChevronRight, FiArrowLeft, FiUpload } from 'react-icons/fi';
import Link from 'next/link';

const AddContractReviewPage = () => {
    const router = useRouter();
    const { edit } = router.query;
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [cases, setCases] = useState([]);
    const [contractReviews, setContractReviews] = useState([]);
    const [filteredContractReviews, setFilteredContractReviews] = useState([]);
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
    const [selectedContractType, setSelectedContractType] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');
    const [showStatusFilter, setShowStatusFilter] = useState(false);
    const [showContractTypeFilter, setShowContractTypeFilter] = useState(false);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    const [formData, setFormData] = useState({
        case_reference_id: '',
        contract_title: '',
        contract_type: '',
        review_date: '',
        status: '',
        contract_fees: '',
        opposing_party: '',
        governing_jurisdiction: '',
        requires_registration: false,
        key_risks_issues: '',
        recommendation: '',
        document_upload_url: ''
    });

    // Status options
    const statusOptions = ['تمت المراجعة', 'يحتاج تفاوض', 'موافقة', 'رفض'];
    const contractTypeOptions = ['إيجار', 'عمل', 'بيع تجاري', 'شراكة', 'خدمات', 'تسليم مفتاح', 'أخرى'];

    useEffect(() => {
        setMounted(true);
        fetchCases();
        fetchContractReviews();
        
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
                .from('contract_reviews')
                .select('*')
                .eq('id', reviewId)
                .single();

            if (error) throw error;

            if (data) {
                // Format date for input field (YYYY-MM-DD)
                const reviewDate = data.review_date 
                    ? new Date(data.review_date).toISOString().split('T')[0]
                    : '';

                setFormData({
                    case_reference_id: data.case_reference_id || '',
                    contract_title: data.contract_title || '',
                    contract_type: data.contract_type || '',
                    review_date: reviewDate,
                    status: data.status || '',
                    contract_fees: data.contract_fees ? data.contract_fees.toString() : '',
                    opposing_party: data.opposing_party || '',
                    governing_jurisdiction: data.governing_jurisdiction || '',
                    requires_registration: data.requires_registration || false,
                    key_risks_issues: data.key_risks_issues || '',
                    recommendation: data.recommendation || '',
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
        filterContractReviews();
    }, [contractReviews, searchQuery, selectedStatus, selectedContractType, selectedDate, sortOrder]);

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
                setShowContractTypeFilter(false);
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

    const fetchContractReviews = async () => {
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

            let query = supabase.from('contract_reviews').select('*');

            if (role === 'lawyer' && new_lawyer_id) {
                query = query.eq('lawyer_id', userId);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            setContractReviews(data || []);
        } catch (error) {
            console.error('Error fetching contract reviews:', error);
        } finally {
            setFetchingReviews(false);
        }
    };

    const filterContractReviews = () => {
        let filtered = [...contractReviews];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(review =>
                (review.contract_title && review.contract_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (review.case_reference_id && review.case_reference_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (review.opposing_party && review.opposing_party.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        // Status filter
        if (selectedStatus) {
            filtered = filtered.filter(review => review.status === selectedStatus);
        }

        // Contract type filter
        if (selectedContractType) {
            filtered = filtered.filter(review => review.contract_type === selectedContractType);
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

        setFilteredContractReviews(filtered);
        setCurrentPage(1);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Helper function to get folder storage name (English name for Storage)
    const getFolderStorageName = (displayName) => {
        const mapping = {
            "مراجعة عقود": "contract_review",
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
        return mapping[displayName] || displayName;
    };

    // Helper function to get folder display name
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
            contract_review: "مراجعة عقود",
            docs: "المستندات",
            main: "المجلد الرئيسي",
            session_register: "محاضر الجلسات",
            "مراجعة عقود": "مراجعة عقود"
        };
        return names[folderName] || folderName;
    };

    const fetchFoldersForCase = async (caseNumber) => {
        try {
            if (!caseNumber) {
                setFolders([]);
                return;
            }

            const defaultFolders = [
                "evidence",
                "judgments",
                "execution",
                "accounts",
                "documents",
                "session_minutes",
                "opponent_files",
                "private_files"
            ];

            const folderSet = new Set();
            
            defaultFolders.forEach(folder => folderSet.add(folder));
            folderSet.add('مراجعة عقود');

            try {
                const { data: attachmentsData, error: attachmentsError } = await supabase
                    .from('attachments')
                    .select('folder_name')
                    .eq('case_number', caseNumber);

                if (!attachmentsError && attachmentsData) {
                    const dbFolders = [...new Set(attachmentsData.map(item => item.folder_name))].filter(Boolean);
                    dbFolders.forEach(folder => {
                        if (folder) {
                            folderSet.add(folder);
                        }
                    });
                }
            } catch (attachmentErr) {
                console.error('Error fetching folders from attachments:', attachmentErr);
            }

            const allFolders = Array.from(folderSet);
            const sortedFolders = allFolders.sort((a, b) => {
                const aIsDefault = defaultFolders.includes(a);
                const bIsDefault = defaultFolders.includes(b);
                
                if (a === 'مراجعة عقود') return -1;
                if (b === 'مراجعة عقود') return 1;
                
                if (aIsDefault && !bIsDefault) return -1;
                if (!aIsDefault && bIsDefault) return 1;
                if (aIsDefault && bIsDefault) {
                    return defaultFolders.indexOf(a) - defaultFolders.indexOf(b);
                }
                return a.localeCompare(b);
            });

            setFolders(sortedFolders);

            if (!selectedFolder && sortedFolders.includes('مراجعة عقود')) {
                setSelectedFolder('مراجعة عقود');
            }
        } catch (error) {
            console.error('Error fetching folders:', error);
            setFolders(['مراجعة عقود']);
            setSelectedFolder('مراجعة عقود');
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

            const storageFolderName = getFolderStorageName(selectedFolder);
            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const filePath = `${formData.case_reference_id}/${storageFolderName}/${fileName}`;

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

            const { publicURL } = supabase.storage
                .from('images')
                .getPublicUrl(filePath);

            if (!publicURL) {
                throw new Error('فشل في الحصول على رابط الملف');
            }

            try {
                const attachmentToInsert = {
                    file_name: file.name,
                    file_url: publicURL,
                    case_number: formData.case_reference_id,
                    folder_name: selectedFolder,
                    created_at: new Date().toISOString(),
                };

                const { error: insertError } = await supabase
                    .from('attachments')
                    .insert([attachmentToInsert]);

                if (insertError) {
                    console.error('Error inserting attachment:', insertError);
                }
            } catch (insertErr) {
                console.error('Error adding attachment to database:', insertErr);
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
            const { role } = userMetadata;

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
                contract_title: formData.contract_title,
                contract_type: formData.contract_type,
                review_date: formData.review_date,
                status: formData.status,
                contract_fees: parseFloat(formData.contract_fees) || 0,
                opposing_party: formData.opposing_party || null,
                governing_jurisdiction: formData.governing_jurisdiction || null,
                requires_registration: formData.requires_registration,
                key_risks_issues: formData.key_risks_issues,
                recommendation: formData.recommendation,
                document_upload_url: formData.document_upload_url,
                file_name: uploadFileName || null,
                folder_name: selectedFolder || null,
                lawyer_id: role === 'lawyer' ? userId : null,
                admin_id: role === 'admin' ? userId : null,
                created_by: userId,
                updated_by: userId,
                client_id: clientId,
                case_type: caseType,
                is_review_completed: formData.status === 'موافقة' || formData.status === 'رفض' ? true : false
            };

            if (isEditMode && editingReviewId) {
                const { error } = await supabase
                    .from('contract_reviews')
                    .update(reviewData)
                    .eq('id', editingReviewId);

                if (error) throw error;

                alert('تم تحديث المراجعة بنجاح');
                setShowForm(false);
                fetchContractReviews();
            } else {
                // Generate reference number
                const { data: lastReview, error: refError } = await supabase
                    .from('contract_reviews')
                    .select('reference_number')
                    .not('reference_number', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(1);

                let nextRefNumber = 'CONT-1';
                if (!refError && lastReview && lastReview.length > 0 && lastReview[0].reference_number) {
                    const lastRef = lastReview[0].reference_number;
                    const match = lastRef.match(/CONT-(\d+)/);
                    if (match) {
                        const lastNum = parseInt(match[1]);
                        const nextNum = lastNum + 1;
                        nextRefNumber = 'CONT-' + String(nextNum);
                    }
                }

                reviewData.reference_number = nextRefNumber;

                const { error } = await supabase
                    .from('contract_reviews')
                    .insert([reviewData]);

                if (error) throw error;

                await fetchContractReviews();
                
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const defaultDate = `${year}-${month}-${day}`;
                
                setFormData({
                    case_reference_id: '',
                    contract_title: '',
                    contract_type: '',
                    review_date: defaultDate,
                    status: '',
                    contract_fees: '',
                    opposing_party: '',
                    governing_jurisdiction: '',
                    requires_registration: false,
                    key_risks_issues: '',
                    recommendation: '',
                    document_upload_url: ''
                });

                setShowForm(false);
                setUploadedFile(null);
                setUploadFileName('');
                setSelectedFolder('');
            }
        } catch (error) {
            console.error('Error adding contract review:', error);
            alert('حدث خطأ أثناء إضافة مراجعة العقد: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Pagination logic
    const totalPages = Math.ceil(filteredContractReviews.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentReviews = filteredContractReviews.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    if (!mounted) {
        return null;
    }

    // Show form only if explicitly requested
    if (showForm) {
        return (
            <Layout>
                <Head>
                    <title>{isEditMode ? 'تعديل مراجعة عقد' : 'إضافة مراجعة عقد'} - مكتب المحامي</title>
                </Head>
                <div className="contract-review-form-page">
                    <style jsx>{`
                        .contract-review-form-page {
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
                            gap: 0.625rem;
                            padding: 0.875rem 1.75rem;
                            background: #ffffff;
                            color: #475569;
                            border: 2px solid #e2e8f0;
                            border-radius: 12px;
                            font-size: 0.9375rem;
                            font-weight: 600;
                            cursor: pointer;
                            margin-bottom: 1.5rem;
                            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                            font-family: 'Cairo', 'Almarai', sans-serif;
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                        }

                        .back-button:hover {
                            background: #f8fafc;
                            border-color: #cbd5e1;
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                            transform: translateX(-2px);
                        }

                        .page-header {
                            margin-bottom: 2rem;
                        }

                        .page-title {
                            font-size: 2rem;
                            font-weight: 800;
                            background: linear-gradient(135deg, #2563EB 0%, #1e40af 100%);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            background-clip: text;
                            margin: 0;
                            font-family: 'Cairo', 'Almarai', sans-serif;
                            letter-spacing: -0.02em;
                        }

                        .form-container {
                            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                            border-radius: 20px;
                            padding: 2.5rem;
                            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04);
                            border: 1px solid rgba(226, 232, 240, 0.8);
                        }

                        .form-section {
                            margin-bottom: 2.5rem;
                            padding: 1.5rem;
                            background: #ffffff;
                            border-radius: 16px;
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                            border: 1px solid #f1f5f9;
                        }

                        .form-section:last-of-type {
                            margin-bottom: 0;
                        }

                        .section-title {
                            font-size: 1.375rem;
                            font-weight: 700;
                            background: linear-gradient(135deg, #2563EB 0%, #1e40af 100%);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            background-clip: text;
                            margin-bottom: 1.75rem;
                            padding-bottom: 1rem;
                            border-bottom: 3px solid;
                            border-image: linear-gradient(135deg, #2563EB 0%, #1e40af 100%) 1;
                            font-family: 'Cairo', 'Almarai', sans-serif;
                            position: relative;
                        }

                        .section-title::after {
                            content: '';
                            position: absolute;
                            bottom: -3px;
                            right: 0;
                            width: 60px;
                            height: 3px;
                            background: linear-gradient(135deg, #2563EB 0%, #1e40af 100%);
                            border-radius: 2px;
                        }

                        .form-grid {
                            display: grid;
                            grid-template-columns: repeat(4, 1fr);
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
                            font-weight: 600;
                            color: #1e293b;
                            margin-bottom: 0.625rem;
                            font-family: 'Cairo', 'Almarai', sans-serif;
                            display: flex;
                            align-items: center;
                            gap: 0.25rem;
                        }

                        .required-asterisk {
                            color: #ef4444;
                            font-weight: 700;
                            font-size: 1rem;
                        }

                        .form-input,
                        .form-select,
                        .form-textarea {
                            padding: 0.875rem 1.125rem;
                            border: 2px solid #e2e8f0;
                            border-radius: 12px;
                            font-size: 0.9375rem;
                            font-family: 'Cairo', 'Almarai', sans-serif;
                            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                            background: #ffffff;
                            color: #1e293b;
                        }

                        .form-input:hover,
                        .form-select:hover,
                        .form-textarea:hover {
                            border-color: #cbd5e1;
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                        }

                        .form-input:focus,
                        .form-select:focus,
                        .form-textarea:focus {
                            outline: none;
                            border-color: #2563EB;
                            box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1), 0 4px 12px rgba(37, 99, 235, 0.15);
                            transform: translateY(-1px);
                        }

                        .form-input::placeholder,
                        .form-textarea::placeholder {
                            color: #94a3b8;
                            opacity: 0.8;
                        }

                        .form-select {
                            cursor: pointer;
                            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%232563EB' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
                            background-repeat: no-repeat;
                            background-position: right 1rem center;
                            padding-right: 2.5rem;
                            appearance: none;
                        }

                        .form-select option {
                            padding: 0.75rem;
                            background: #ffffff;
                            color: #1e293b;
                        }

                        .form-textarea {
                            resize: vertical;
                            min-height: 140px;
                            line-height: 1.6;
                        }

                        .form-checkbox {
                            display: flex;
                            align-items: center;
                            gap: 0.75rem;
                            cursor: pointer;
                            padding: 0.75rem;
                            background: #f8fafc;
                            border-radius: 10px;
                            border: 2px solid #e2e8f0;
                            transition: all 0.3s;
                        }

                        .form-checkbox:hover {
                            background: #f1f5f9;
                            border-color: #cbd5e1;
                        }

                        .form-checkbox input {
                            width: 20px;
                            height: 20px;
                            cursor: pointer;
                            accent-color: #2563EB;
                        }

                        .form-checkbox input:checked + span {
                            color: #1e40af;
                            font-weight: 600;
                        }

                        .file-upload-wrapper {
                            display: flex;
                            flex-direction: column;
                            gap: 0.75rem;
                        }

                        .file-upload-button {
                            display: inline-flex;
                            align-items: center;
                            gap: 0.625rem;
                            padding: 0.875rem 1.75rem;
                            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                            color: #475569;
                            border: 2px solid #e2e8f0;
                            border-radius: 12px;
                            font-size: 0.9375rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                            font-family: 'Cairo', 'Almarai', sans-serif;
                            width: fit-content;
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                        }

                        .file-upload-button:hover {
                            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
                            border-color: #cbd5e1;
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                            transform: translateY(-2px);
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
                            gap: 0.75rem;
                            padding: 1.125rem 2.5rem;
                            background: linear-gradient(135deg, #2563EB 0%, #1e40af 100%);
                            color: #ffffff;
                            border: none;
                            border-radius: 12px;
                            font-size: 1.0625rem;
                            font-weight: 700;
                            cursor: pointer;
                            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                            font-family: 'Cairo', 'Almarai', sans-serif;
                            margin-top: 2rem;
                            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
                            position: relative;
                            overflow: hidden;
                        }

                        .submit-button::before {
                            content: '';
                            position: absolute;
                            top: 0;
                            left: -100%;
                            width: 100%;
                            height: 100%;
                            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                            transition: left 0.5s;
                        }

                        .submit-button:hover:not(:disabled) {
                            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
                            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
                            transform: translateY(-2px);
                        }

                        .submit-button:hover:not(:disabled)::before {
                            left: 100%;
                        }

                        .submit-button:active:not(:disabled) {
                            transform: translateY(0);
                        }

                        .submit-button:disabled {
                            opacity: 0.6;
                            cursor: not-allowed;
                            transform: none;
                        }

                        @media (max-width: 1200px) {
                            .form-grid {
                                grid-template-columns: repeat(3, 1fr);
                            }
                        }

                        @media (max-width: 1024px) {
                            .form-grid {
                                grid-template-columns: repeat(2, 1fr);
                            }

                            .form-grid.three-columns {
                                grid-template-columns: repeat(2, 1fr);
                            }

                            .form-container {
                                padding: 2rem;
                            }

                            .form-section {
                                padding: 1.25rem;
                            }
                        }

                        @media (max-width: 768px) {
                            .form-grid {
                                grid-template-columns: 1fr;
                                gap: 1.25rem;
                            }

                            .form-grid.three-columns {
                                grid-template-columns: 1fr;
                            }

                            .form-container {
                                padding: 1.5rem;
                                border-radius: 16px;
                            }

                            .form-section {
                                padding: 1rem;
                                margin-bottom: 2rem;
                            }

                            .section-title {
                                font-size: 1.125rem;
                                margin-bottom: 1.25rem;
                            }
                        }
                    `}</style>

                    <button className="back-button" onClick={() => setShowForm(false)}>
                        <FiArrowLeft />
                        العودة إلى القائمة
                    </button>

                    <div className="page-header">
                        <h1 className="page-title">{isEditMode ? 'تعديل مراجعة عقد' : 'مراجعة عقد جديدة'}</h1>
                    </div>

                    <div className="form-container">
                        <form onSubmit={handleSubmit}>
                            <div className="form-section">
                                <h2 className="section-title">معلومات العقد</h2>
                                <div className="form-grid">
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
                                            عنوان العقد
                                        </label>
                                        <input
                                            type="text"
                                            name="contract_title"
                                            className="form-input"
                                            value={formData.contract_title}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="عنوان العقد"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            <span className="required-asterisk">*</span>
                                            نوع العقد
                                        </label>
                                        <select
                                            name="contract_type"
                                            className="form-select"
                                            value={formData.contract_type}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">اختر نوع العقد...</option>
                                            {contractTypeOptions.map((type) => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
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
                                            name="contract_fees"
                                            className="form-input"
                                            value={formData.contract_fees}
                                            onChange={handleInputChange}
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h2 className="section-title">معلومات الطرف الآخر</h2>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">
                                            الطرف الآخر (الخصم)
                                        </label>
                                        <input
                                            type="text"
                                            name="opposing_party"
                                            className="form-input"
                                            value={formData.opposing_party}
                                            onChange={handleInputChange}
                                            placeholder="اسم الطرف الآخر"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            القانون الحاكم
                                        </label>
                                        <input
                                            type="text"
                                            name="governing_jurisdiction"
                                            className="form-input"
                                            value={formData.governing_jurisdiction}
                                            onChange={handleInputChange}
                                            placeholder="مثل: القانون المدني العراقي"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            <span className="required-asterisk">*</span>
                                            هل يتطلب تسجيل؟
                                        </label>
                                        <div className="form-checkbox">
                                            <input
                                                type="checkbox"
                                                name="requires_registration"
                                                checked={formData.requires_registration}
                                                onChange={handleInputChange}
                                            />
                                            <span>نعم، يتطلب تسجيل في وزارة التجارة/العدل</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h2 className="section-title">نتائج المراجعة</h2>
                                
                                <div className="form-group full-width">
                                    <label className="form-label">
                                        <span className="required-asterisk">*</span>
                                        المخاطر الرئيسية / القضايا
                                    </label>
                                    <textarea
                                        name="key_risks_issues"
                                        className="form-textarea"
                                        value={formData.key_risks_issues}
                                        onChange={handleInputChange}
                                        placeholder="اذكر المخاطر الرئيسية والقضايا القانونية..."
                                        rows={6}
                                        required
                                    />
                                </div>

                                <div className="form-group full-width">
                                    <label className="form-label">
                                        <span className="required-asterisk">*</span>
                                        التوصية
                                    </label>
                                    <textarea
                                        name="recommendation"
                                        className="form-textarea"
                                        value={formData.recommendation}
                                        onChange={handleInputChange}
                                        placeholder="التوصية النهائية (موافقة، رفض، تعديل بند محدد، إلخ)..."
                                        rows={6}
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
                <title>مراجعة العقود - مكتب المحامي</title>
            </Head>
            <div className="contract-reviews-page">
                <style jsx>{`
                    .contract-reviews-page {
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

                    .search-input {
                        flex: 1;
                        max-width: 500px;
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
                        cursor: pointer;
                    }

                    .reviews-table tbody tr:last-child td {
                        border-bottom: none;
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

                    .status-needs-negotiation {
                        background: #fef3c7;
                        color: #92400e;
                    }

                    .status-approved {
                        background: #dbeafe;
                        color: #1e40af;
                    }

                    .status-rejected {
                        background: #fee2e2;
                        color: #991b1b;
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

                        .search-input {
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
                    <Link href="/services/legal-services">الخدمات القانونية</Link> / مراجعة العقود
                </div>

                {!showForm && (
                    <>
                        {fetchingReviews ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                جاري تحميل البيانات...
                            </div>
                        ) : (
                            <>
                                {contractReviews.length === 0 ? (
                                    <div className="empty-state-container">
                                        <div className="empty-state-icon">📋</div>
                                        <h2 className="empty-state-title">لا توجد مراجعات عقود</h2>
                                        <p className="empty-state-message">
                                            ابدأ بإضافة مراجعة عقد جديدة لتتبع وتحليل العقود القانونية
                                        </p>
                                        <button className="empty-state-button" onClick={() => setShowForm(true)}>
                                            <FiPlus />
                                            إضافة مراجعة عقد
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
                                                    className={`filter-button ${selectedContractType ? 'active' : ''}`}
                                                    onClick={() => setShowContractTypeFilter(!showContractTypeFilter)}
                                                >
                                                    نوع العقد
                                                    {selectedContractType && <span> ({selectedContractType})</span>}
                                                    <FiChevronDown style={{ marginRight: '0.25rem' }} />
                                                </button>
                                                {showContractTypeFilter && (
                                                    <div className="filter-dropdown">
                                                        {contractTypeOptions.map((type) => (
                                                            <button
                                                                key={type}
                                                                className={`filter-option ${selectedContractType === type ? 'selected' : ''}`}
                                                                onClick={() => {
                                                                    setSelectedContractType(selectedContractType === type ? '' : type);
                                                                    setShowContractTypeFilter(false);
                                                                }}
                                                            >
                                                                {type}
                                                            </button>
                                                        ))}
                                                        {selectedContractType && (
                                                            <button
                                                                className="filter-option clear-filter"
                                                                onClick={() => {
                                                                    setSelectedContractType('');
                                                                    setShowContractTypeFilter(false);
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
                                                            <th>عنوان العقد</th>
                                                            <th>نوع العقد</th>
                                                            <th>تاريخ المراجعة</th>
                                                            <th>الحالة</th>
                                                            <th>الطرف الآخر</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {currentReviews.map((review) => (
                                                            <tr key={review.id} onClick={() => router.push(`/services/view-contract-review?id=${review.id}`)}>
                                                                <td>{review.id?.toString().slice(0, 8) || '-'}</td>
                                                                <td>{review.case_reference_id || '-'}</td>
                                                                <td>{review.contract_title || '-'}</td>
                                                                <td>{review.contract_type || '-'}</td>
                                                                <td>
                                                                    {review.review_date
                                                                        ? new Date(review.review_date).toLocaleDateString('ar-EG')
                                                                        : '-'}
                                                                </td>
                                                                <td>
                                                                    <span className={`status-badge status-${review.status?.toLowerCase().replace(/\s+/g, '-') || 'reviewed'}`}>
                                                                        {review.status || '-'}
                                                                    </span>
                                                                </td>
                                                                <td>{review.opposing_party || '-'}</td>
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

export default withAuth(AddContractReviewPage, [], true);

