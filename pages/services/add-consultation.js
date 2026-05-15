import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FiFileText, FiUser, FiPlus, FiSearch, FiChevronDown, FiChevronLeft, FiChevronRight, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';

const AddConsultationPage = () => {
    const router = useRouter();
    const { edit } = router.query;
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [clientNames, setClientNames] = useState([]);
    const [consultationTypes, setConsultationTypes] = useState([]);
    const [consultations, setConsultations] = useState([]);
    const [filteredConsultations, setFilteredConsultations] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingConsultationId, setEditingConsultationId] = useState(null);
    const [fetchingConsultations, setFetchingConsultations] = useState(true);
    const [lawyers, setLawyers] = useState([]);
    const [showTypeFilter, setShowTypeFilter] = useState(false);
    const [showConsultantFilter, setShowConsultantFilter] = useState(false);
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [showYearFilter, setShowYearFilter] = useState(false);
    
    // Search and filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [selectedMethod, setSelectedMethod] = useState(''); // Not used in filtering, just for UI
    const [selectedConsultant, setSelectedConsultant] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    const [formData, setFormData] = useState({
        consultation_title: '',
        consultation_type: '',
        consultation_date: '',
        consultation_fees: '',
        case_facts: '',
        legal_discussion: '',
        legal_opinion: '',
        client_name: ''
    });

    useEffect(() => {
        setMounted(true);
        fetchClients();
        fetchConsultationTypes();
        fetchConsultations();
        
        // Set default date to current date
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const defaultDate = `${year}-${month}-${day}`;
        
        setFormData(prev => ({
            ...prev,
            consultation_date: prev.consultation_date || defaultDate
        }));
    }, []);

    // Handle edit mode
    useEffect(() => {
        if (edit) {
            setIsEditMode(true);
            setEditingConsultationId(edit);
            setShowForm(true);
            fetchConsultationForEdit(edit);
        }
    }, [edit]);

    useEffect(() => {
        filterConsultations();
    }, [consultations, searchQuery, selectedType, selectedConsultant, selectedDate, selectedYear, sortOrder]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.filter-dropdown-wrapper')) {
                setShowTypeFilter(false);
                setShowConsultantFilter(false);
                setShowDateFilter(false);
                setShowYearFilter(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        // Extract unique types from consultations
        if (consultations.length > 0) {
            const uniqueTypes = [...new Set(consultations.map(c => c.consultation_type).filter(Boolean))];
            if (uniqueTypes.length > 0) {
                setConsultationTypes(prev => {
                    const combined = [...new Set([...prev, ...uniqueTypes])];
                    return combined;
                });
            }
        }
    }, [consultations]);

    useEffect(() => {
        // Fetch lawyers from consultations
        const fetchLawyers = async () => {
            try {
                const userIds = [...new Set(
                    consultations
                        .map(c => [c.lawyer_id, c.admin_id])
                        .flat()
                        .filter(Boolean)
                )];

                if (userIds.length === 0) return;

                const { data: lawyersData, error } = await supabase
                    .from('user_metadata')
                    .select('user_id, username, new_lawyer_id, admin_user_id')
                    .in('user_id', userIds)
                    .or(`new_lawyer_id.in.(${userIds.join(',')}),admin_user_id.in.(${userIds.join(',')})`);

                if (error) throw error;
                setLawyers(lawyersData || []);
            } catch (error) {
                console.error('Error fetching lawyers:', error);
            }
        };

        if (consultations.length > 0) {
            fetchLawyers();
        }
    }, [consultations]);

    const fetchClients = async () => {
        try {
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
            
            let query = supabase.from('clients_data').select('id, client_name');

            if (role === 'Admin') {
                query = query.eq('admin_id', admin_user_id);
            } else if (role === 'Lawyer') {
                query = query.or(`admin_id.eq.${admin_user_id},lawyer_id.eq.${new_lawyer_id || userId}`);
            }
            
            const { data: clients, error: clientError } = await query;
            if (clientError) throw clientError;
            
            setClientNames(clients || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
            setClientNames([]);
        }
    };

    const fetchConsultationTypes = async () => {
        try {
            const { data, error } = await supabase
                .from('consultation_types')
                .select('type_name');

            if (error) {
                // If table doesn't exist, use default types
                setConsultationTypes(['استشارة قانونية', 'استشارة تجارية', 'استشارة مدنية']);
                return;
            }

            const types = data.map(item => item.type_name);
            setConsultationTypes(types.length > 0 ? types : ['استشارة قانونية', 'استشارة تجارية', 'استشارة مدنية']);
        } catch (error) {
            console.error('Error fetching consultation types:', error);
            setConsultationTypes(['استشارة قانونية', 'استشارة تجارية', 'استشارة مدنية']);
        }
    };

    const fetchConsultations = async () => {
        try {
            setFetchingConsultations(true);
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
            
            let query = supabase
                .from('consultations')
                .select('*')
                .order('created_at', { ascending: false });

            if (role === 'Admin') {
                query = query.eq('admin_id', admin_user_id);
            } else if (role === 'Lawyer') {
                query = query.or(`admin_id.eq.${admin_user_id},lawyer_id.eq.${new_lawyer_id || userId}`);
            }
            
            const { data: consultationsData, error: consultationsError } = await query;
            if (consultationsError) throw consultationsError;
            
            setConsultations(consultationsData || []);
        } catch (error) {
            console.error('Error fetching consultations:', error);
            setConsultations([]);
        } finally {
            setFetchingConsultations(false);
        }
    };

    const filterConsultations = () => {
        let filtered = [...consultations];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(consultation =>
                (consultation.client_name && consultation.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (consultation.consultation_title && consultation.consultation_title.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        // Type filter (نوع الإستشارة)
        if (selectedType) {
            filtered = filtered.filter(consultation => consultation.consultation_type === selectedType);
        }

        // Consultant filter (المستشار)
        if (selectedConsultant) {
            filtered = filtered.filter(consultation => 
                consultation.lawyer_id === selectedConsultant || 
                consultation.admin_id === selectedConsultant
            );
        }

        // Date filter (تاريخ الإستشارة)
        if (selectedDate) {
            filtered = filtered.filter(consultation => {
                if (!consultation.consultation_date) return false;
                const consultationDate = new Date(consultation.consultation_date).toISOString().split('T')[0];
                return consultationDate === selectedDate;
            });
        }

        // Year filter (سنة الإستشارة)
        if (selectedYear) {
            filtered = filtered.filter(consultation => {
                if (!consultation.consultation_date) return false;
                const consultationYear = new Date(consultation.consultation_date).getFullYear().toString();
                return consultationYear === selectedYear;
            });
        }

        // Sort (ترتيب الجدول)
        if (sortOrder === 'asc') {
            filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        } else {
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        setFilteredConsultations(filtered);
        setCurrentPage(1);
    };

    // Get available years from consultations
    const getAvailableYears = () => {
        const years = consultations
            .map(c => {
                if (!c.consultation_date) return null;
                return new Date(c.consultation_date).getFullYear();
            })
            .filter(Boolean);
        return [...new Set(years)].sort((a, b) => b - a);
    };

    // Get lawyer name by ID
    const getLawyerName = (lawyerId, adminId) => {
        if (!lawyerId && !adminId) return 'غير محدد';
        
        const lawyer = lawyers.find(l => 
            l.user_id === lawyerId || 
            l.user_id === adminId ||
            l.new_lawyer_id === lawyerId ||
            l.admin_user_id === adminId
        );
        
        return lawyer ? lawyer.username : 'غير محدد';
    };

    const fetchConsultationForEdit = async (consultationId) => {
        try {
            const { data, error } = await supabase
                .from('consultations')
                .select('*')
                .eq('id', consultationId)
                .single();

            if (error) throw error;

            if (data) {
                // Format date for input field (YYYY-MM-DD)
                const consultationDate = data.consultation_date 
                    ? new Date(data.consultation_date).toISOString().split('T')[0]
                    : '';

                setFormData({
                    consultation_title: data.consultation_title || '',
                    consultation_type: data.consultation_type || '',
                    consultation_date: consultationDate,
                    consultation_fees: data.consultation_fees ? data.consultation_fees.toString() : '',
                    case_facts: data.case_facts || '',
                    legal_discussion: data.legal_discussion || '',
                    legal_opinion: data.legal_opinion || '',
                    client_name: data.client_name || ''
                });
            }
        } catch (error) {
            console.error('Error fetching consultation for edit:', error);
            alert('حدث خطأ أثناء جلب بيانات الاستشارة');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const user = supabase.auth.user();
            if (!user) throw new Error('User not logged in');
            
            const userId = user.id;
            
            const { data: userMetadata } = await supabase
                .from('user_metadata')
                .select('admin_user_id, new_lawyer_id')
                .or(`new_lawyer_id.eq.${userId}, admin_user_id.eq.${userId}`)
                .limit(1);

            if (!userMetadata || userMetadata.length === 0) {
                throw new Error('User metadata not found');
            }

            const isAdmin = userMetadata.some(meta => meta.admin_user_id === userId);
            const adminId = isAdmin ? userId : userMetadata[0].admin_user_id;
            const lawyerId = isAdmin ? null : userMetadata[0].new_lawyer_id;

            // Get consultation date
            const consultationDate = formData.consultation_date || new Date().toISOString().split('T')[0];

            const consultationData = {
                consultation_title: formData.consultation_title,
                consultation_type: formData.consultation_type,
                consultation_date: consultationDate,
                consultation_time: '00:00',
                consultation_fees: parseFloat(formData.consultation_fees) || 0,
                case_facts: formData.case_facts || '',
                legal_discussion: formData.legal_discussion || '',
                legal_opinion: formData.legal_opinion || '',
                client_name: formData.client_name || null,
                updated_at: new Date().toISOString()
            };

            if (isEditMode && editingConsultationId) {
                // Update existing consultation
                const { error } = await supabase
                    .from('consultations')
                    .update(consultationData)
                    .eq('id', editingConsultationId);

                if (error) throw error;

                alert('تم تحديث الاستشارة بنجاح');
                router.push(`/services/view-consultation?id=${editingConsultationId}`);
            } else {
                // Generate reference number
                const { data: lastConsultation, error: refError } = await supabase
                    .from('consultations')
                    .select('reference_number')
                    .not('reference_number', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(1);

                let nextRefNumber = 'CONS-000001';
                if (!refError && lastConsultation && lastConsultation.length > 0 && lastConsultation[0].reference_number) {
                    const lastRef = lastConsultation[0].reference_number;
                    const match = lastRef.match(/CONS-(\d+)/);
                    if (match) {
                        const lastNum = parseInt(match[1]);
                        const nextNum = lastNum + 1;
                        nextRefNumber = 'CONS-' + String(nextNum).padStart(6, '0');
                    }
                }

                // Insert new consultation
                consultationData.admin_id = adminId;
                consultationData.lawyer_id = lawyerId;
                consultationData.reference_number = nextRefNumber;
                consultationData.created_at = new Date().toISOString();

                const { error } = await supabase
                    .from('consultations')
                    .insert([consultationData]);

                if (error) throw error;

                alert('تم إضافة الاستشارة القانونية بنجاح');
                
                await fetchConsultations();
                
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const defaultDate = `${year}-${month}-${day}`;
                
                setFormData({
                    consultation_title: '',
                    consultation_type: '',
                    consultation_date: defaultDate,
                    consultation_fees: '',
                    case_facts: '',
                    legal_discussion: '',
                    legal_opinion: '',
                    client_name: ''
                });
                
                setShowForm(false);
            }
        } catch (error) {
            console.error('Error saving consultation:', error);
            alert(`حدث خطأ أثناء ${isEditMode ? 'تحديث' : 'إضافة'} الاستشارة: ` + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentConsultations = filteredConsultations.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredConsultations.length / itemsPerPage);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
    };

    if (!mounted) return null;

    if (showForm) {
        return (
            <Layout>
                <Head>
                    <title>إضافة استشارة قانونية - مكتب المحامي</title>
                </Head>
                <div className="add-consultation-page">
                    <style jsx>{`
                        .add-consultation-page {
                            min-height: 100vh;
                            background: transparent;
                            padding: 2rem 1.5rem;
                            direction: rtl;
                            max-width: 1200px;
                            margin: 0 auto;
                        }

                        .page-header {
                            margin-bottom: 2rem;
                        }

                        .page-title {
                            font-size: 2rem;
                            font-weight: 700;
                            color: #2563EB;
                            margin: 0;
                            font-family: 'Cairo', 'Almarai', sans-serif;
                        }

                        .form-container {
                            background: #ffffff;
                            border-radius: 12px;
                            padding: 2rem;
                            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                            border: 1px solid #e5e7eb;
                            max-width: 900px;
                            margin: 0 auto;
                        }

                        .form-section {
                            margin-bottom: 2rem;
                        }

                        .section-title {
                            font-size: 1.25rem;
                            font-weight: 700;
                            color: #1a1a1a;
                            margin-bottom: 1.25rem;
                            padding-bottom: 0.75rem;
                            border-bottom: 2px solid #f1f5f9;
                            font-family: 'Cairo', 'Almarai', sans-serif;
                        }

                        .form-grid {
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 1.25rem;
                            margin-bottom: 1.25rem;
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
                            font-size: 0.875rem;
                            font-weight: 600;
                            color: #475569;
                            margin-bottom: 0.5rem;
                            font-family: 'Cairo', 'Almarai', sans-serif;
                        }

                        .required-asterisk {
                            color: #ef4444;
                            margin-right: 0.25rem;
                        }

                        .form-input,
                        .form-select,
                        .form-textarea {
                            padding: 0.625rem 0.875rem;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            font-size: 0.9375rem;
                            font-family: 'Cairo', 'Almarai', sans-serif;
                            transition: all 0.2s;
                            background: #ffffff;
                            color: #1a1a1a;
                            width: 100%;
                        }

                        .form-textarea {
                            min-height: 120px;
                            resize: vertical;
                            line-height: 1.6;
                        }

                        .form-input:focus,
                        .form-select:focus,
                        .form-textarea:focus {
                            outline: none;
                            border-color: #3b82f6;
                            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                        }

                        .client-select-wrapper {
                            display: flex;
                            gap: 1rem;
                            align-items: flex-end;
                        }

                        .client-select-wrapper .form-select {
                            flex: 1;
                        }

                        .new-client-button {
                            display: inline-flex;
                            align-items: center;
                            gap: 0.5rem;
                            padding: 0.625rem 1.25rem;
                            background: #2563EB;
                            color: #ffffff;
                            border: none;
                            border-radius: 8px;
                            font-size: 0.9375rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s;
                            font-family: 'Cairo', 'Almarai', sans-serif;
                            white-space: nowrap;
                        }

                        .new-client-button:hover {
                            background: #1e40af;
                            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
                        }

                        .submit-button {
                            width: 100%;
                            padding: 0.875rem 1.5rem;
                            background: #2563EB;
                            color: #ffffff;
                            border: none;
                            border-radius: 8px;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s;
                            font-family: 'Cairo', 'Almarai', sans-serif;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            gap: 0.5rem;
                            margin-top: 1rem;
                        }

                        .submit-button:hover:not(:disabled) {
                            background: #1e40af;
                            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
                        }

                        .submit-button:disabled {
                            opacity: 0.6;
                            cursor: not-allowed;
                        }

                        .back-button {
                            display: inline-flex;
                            align-items: center;
                            gap: 0.5rem;
                            padding: 0.5rem 1rem;
                            background: #f1f5f9;
                            color: #475569;
                            border: none;
                            border-radius: 8px;
                            font-weight: 500;
                            cursor: pointer;
                            margin-bottom: 1rem;
                            font-family: 'Cairo', 'Almarai', sans-serif;
                        }

                        .back-button:hover {
                            background: #e2e8f0;
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
                            router.push(`/services/view-consultation?id=${editingConsultationId}`);
                        } else {
                            setShowForm(false);
                        }
                    }}>
                        <FiArrowLeft />
                        {isEditMode ? 'العودة إلى عرض الاستشارة' : 'العودة إلى القائمة'}
                    </button>

                    <div className="page-header">
                        <h1 className="page-title">{isEditMode ? 'تعديل استشارة قانونية' : 'استشارة قانونية جديدة'}</h1>
                    </div>

                    <div className="form-container">
                        <form onSubmit={handleSubmit}>
                            <div className="form-section">
                                <h2 className="section-title">اختر الموكل</h2>
                                <div className="form-grid">
                                    <div className="form-group full-width">
                                        <div className="client-select-wrapper">
                                            <select
                                                name="client_name"
                                                className="form-select"
                                                value={formData.client_name}
                                                onChange={handleInputChange}
                                            >
                                                <option value="">اختر الموكل...</option>
                                                {clientNames.map((client) => (
                                                    <option key={client.id} value={client.client_name}>
                                                        {client.client_name}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                className="new-client-button"
                                                onClick={() => router.push('/client/add_cl')}
                                            >
                                                <FiUser />
                                                عميل جديد
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h2 className="section-title">معلومات الإستشارة</h2>
                                <div className="form-grid three-columns">
                                    <div className="form-group">
                                        <label className="form-label">
                                            <span className="required-asterisk">*</span>
                                            عنوان الاستشارة
                                        </label>
                                        <input
                                            type="text"
                                            name="consultation_title"
                                            className="form-input"
                                            value={formData.consultation_title}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="عنوان الاستشارة"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            <span className="required-asterisk">*</span>
                                            نوع الإستشارة
                                        </label>
                                        <select
                                            name="consultation_type"
                                            className="form-select"
                                            value={formData.consultation_type}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">اختر...</option>
                                            {consultationTypes.map((type, index) => (
                                                <option key={index} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            <span className="required-asterisk">*</span>
                                            تاريخ الإستشارة
                                        </label>
                                        <input
                                            type="date"
                                            name="consultation_date"
                                            className="form-input"
                                            value={formData.consultation_date}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">
                                            <span className="required-asterisk">*</span>
                                            رسوم الإستشارة
                                        </label>
                                        <input
                                            type="number"
                                            name="consultation_fees"
                                            className="form-input"
                                            value={formData.consultation_fees}
                                            onChange={handleInputChange}
                                            required
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h2 className="section-title">تفاصيل الإستشارة</h2>
                                
                                <div className="form-group full-width">
                                    <label className="form-label">وقائع القضية</label>
                                    <textarea
                                        name="case_facts"
                                        className="form-textarea"
                                        value={formData.case_facts}
                                        onChange={handleInputChange}
                                        placeholder="أدخل وقائع القضية..."
                                        rows={6}
                                    />
                                </div>

                                <div className="form-group full-width">
                                    <label className="form-label">المناقشة القانونية</label>
                                    <textarea
                                        name="legal_discussion"
                                        className="form-textarea"
                                        value={formData.legal_discussion}
                                        onChange={handleInputChange}
                                        placeholder="أدخل المناقشة القانونية..."
                                        rows={6}
                                    />
                                </div>

                                <div className="form-group full-width">
                                    <label className="form-label">الرأي القانوني</label>
                                    <textarea
                                        name="legal_opinion"
                                        className="form-textarea"
                                        value={formData.legal_opinion}
                                        onChange={handleInputChange}
                                        placeholder="أدخل الرأي القانوني..."
                                        rows={6}
                                    />
                                </div>
                            </div>

                            <button type="submit" className="submit-button" disabled={loading}>
                                <FiFileText />
                                {loading 
                                    ? (isEditMode ? 'جاري التحديث...' : 'جاري الحفظ...') 
                                    : (isEditMode ? 'تحديث الاستشارة' : 'إضافة الاستشارة')
                                }
                            </button>
                        </form>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <Head>
                <title>جميع الإستشارات - مكتب المحامي</title>
            </Head>
            <div className="consultations-page">
                <style jsx>{`
                    .consultations-page {
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

                    .search-button {
                        padding: 0.75rem 1.5rem;
                        background: #2563EB;
                        color: #ffffff;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                        white-space: nowrap;
                    }

                    .search-button:hover {
                        background: #1e40af;
                    }

                    .add-new-button {
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.75rem 1.5rem;
                        background: #ffffff;
                        color: #2563EB;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                        white-space: nowrap;
                    }

                    .add-new-button:hover {
                        background: #f8fafc;
                        border-color: #2563EB;
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

                    .date-filter-input {
                        width: 100%;
                        padding: 0.625rem 0.75rem;
                        border: 1px solid #e2e8f0;
                        border-radius: 6px;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                        font-size: 0.875rem;
                    }

                    .filter-count {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        min-width: 20px;
                        height: 20px;
                        padding: 0 0.375rem;
                        background: #2563EB;
                        color: #ffffff;
                        border-radius: 10px;
                        font-size: 0.75rem;
                        font-weight: 600;
                        margin-right: 0.25rem;
                    }

                    .filter-button svg.rotated {
                        transform: rotate(180deg);
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

                    .date-filter-input {
                        width: 100%;
                        padding: 0.625rem 0.75rem;
                        border: 1px solid #e2e8f0;
                        border-radius: 6px;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                        font-size: 0.875rem;
                    }

                    .filter-count {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        min-width: 20px;
                        height: 20px;
                        padding: 0 0.375rem;
                        background: #2563EB;
                        color: #ffffff;
                        border-radius: 10px;
                        font-size: 0.75rem;
                        font-weight: 600;
                        margin-right: 0.25rem;
                    }

                    .filter-button svg.rotated {
                        transform: rotate(180deg);
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

                    .table-container {
                        background: #ffffff;
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                        border: 1px solid #e5e7eb;
                    }

                    .consultations-table {
                        width: 100%;
                        border-collapse: collapse;
                    }

                    .consultations-table thead {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }

                    .consultations-table th {
                        padding: 1rem;
                        text-align: right;
                        color: #ffffff;
                        font-weight: 600;
                        font-size: 0.9375rem;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                    }

                    .consultations-table td {
                        padding: 1rem;
                        border-bottom: 1px solid #f1f5f9;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                    }

                    .consultations-table tbody tr:hover {
                        background: #f8fafc;
                    }

                    .client-name-cell {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    }

                    .client-icon {
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        background: #e2e8f0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #64748b;
                    }

                    .status-badge {
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.375rem 0.75rem;
                        border-radius: 20px;
                        font-size: 0.875rem;
                        font-weight: 500;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                    }

                    .status-badge.completed {
                        background: #d1fae5;
                        color: #065f46;
                    }

                    .action-button {
                        background: none;
                        border: none;
                        color: #2563EB;
                        cursor: pointer;
                        font-size: 1.25rem;
                        padding: 0.5rem;
                        display: flex;
                        align-items: center;
                    }

                    .action-button:hover {
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
                        border-radius: 6px;
                        cursor: pointer;
                        font-family: 'Cairo', 'Almarai', sans-serif;
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

                    .total-count {
                        text-align: center;
                        margin-top: 1rem;
                        color: #64748b;
                        font-family: 'Cairo', 'Almarai', sans-serif;
                    }

                    @media (max-width: 768px) {
                        .page-header {
                            flex-direction: column;
                            align-items: stretch;
                        }

                        .header-left {
                            flex-direction: column;
                        }

                        .search-container {
                            max-width: 100%;
                        }

                        .filters-row {
                            overflow-x: auto;
                            flex-wrap: nowrap;
                            padding-bottom: 0.5rem;
                        }

                        .consultations-table {
                            font-size: 0.875rem;
                        }

                        .consultations-table th,
                        .consultations-table td {
                            padding: 0.75rem 0.5rem;
                        }
                    }
                `}</style>

                <div className="breadcrumbs">
                    <Link href="/"><a>الرئيسية</a></Link> {' > '}
                    <Link href="/services/legal-services"><a>الإستشارات</a></Link> {' > '}
                    <span>جميع الإستشارات</span>
                </div>

                <div className="page-header">
                    <div className="header-left">
                        <div className="search-container">
                            <input
                                type="text"
                                className="search-input"
                                placeholder="البحث باسم العميل أو عنوان الاستشارة"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button type="button" className="search-button" onClick={filterConsultations}>
                                <FiSearch />
                                بحث
                            </button>
                        </div>
                    </div>
                    <button className="add-new-button" onClick={() => setShowForm(true)}>
                        <FiPlus />
                        استشارة جديدة
                    </button>
                </div>

                <div className="filters-row">
                    <div className="filter-dropdown-wrapper">
                        <button 
                            className={`filter-button ${selectedType ? 'active' : ''}`}
                            onClick={() => setShowTypeFilter(!showTypeFilter)}
                        >
                            <FiSearch />
                            نوع الإستشارة
                            {selectedType && <span className="filter-count">1</span>}
                            <FiChevronDown className={showTypeFilter ? 'rotated' : ''} />
                        </button>
                        {showTypeFilter && (
                            <div className="filter-dropdown">
                                <button 
                                    className={`filter-option ${!selectedType ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedType('');
                                        setShowTypeFilter(false);
                                    }}
                                >
                                    الكل
                                </button>
                                {consultationTypes.map((type, index) => (
                                    <button
                                        key={index}
                                        className={`filter-option ${selectedType === type ? 'selected' : ''}`}
                                        onClick={() => {
                                            setSelectedType(type);
                                            setShowTypeFilter(false);
                                        }}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button 
                        className="filter-button"
                        disabled
                        style={{ opacity: 0.6, cursor: 'not-allowed' }}
                        title="غير متوفر حالياً"
                    >
                        <FiSearch />
                        طريقة الإستشارة
                    </button>

                    <div className="filter-dropdown-wrapper">
                        <button 
                            className={`filter-button ${selectedConsultant ? 'active' : ''}`}
                            onClick={() => setShowConsultantFilter(!showConsultantFilter)}
                        >
                            <FiSearch />
                            المستشار
                            {selectedConsultant && <span className="filter-count">1</span>}
                            <FiChevronDown className={showConsultantFilter ? 'rotated' : ''} />
                        </button>
                        {showConsultantFilter && (
                            <div className="filter-dropdown">
                                <button 
                                    className={`filter-option ${!selectedConsultant ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedConsultant('');
                                        setShowConsultantFilter(false);
                                    }}
                                >
                                    الكل
                                </button>
                                {lawyers.map((lawyer, index) => (
                                    <button
                                        key={index}
                                        className={`filter-option ${selectedConsultant === lawyer.user_id ? 'selected' : ''}`}
                                        onClick={() => {
                                            setSelectedConsultant(lawyer.user_id);
                                            setShowConsultantFilter(false);
                                        }}
                                    >
                                        {lawyer.username}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="filter-dropdown-wrapper">
                        <button 
                            className={`filter-button ${selectedDate ? 'active' : ''}`}
                            onClick={() => setShowDateFilter(!showDateFilter)}
                        >
                            <FiSearch />
                            تاريخ الإستشارة
                            {selectedDate && <span className="filter-count">1</span>}
                            <FiChevronDown className={showDateFilter ? 'rotated' : ''} />
                        </button>
                        {showDateFilter && (
                            <div className="filter-dropdown">
                                <input
                                    type="date"
                                    className="date-filter-input"
                                    value={selectedDate}
                                    onChange={(e) => {
                                        setSelectedDate(e.target.value);
                                        setShowDateFilter(false);
                                    }}
                                />
                                {selectedDate && (
                                    <button
                                        className="filter-option clear-filter"
                                        onClick={() => {
                                            setSelectedDate('');
                                            setShowDateFilter(false);
                                        }}
                                    >
                                        إزالة الفلتر
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="filter-dropdown-wrapper">
                        <button 
                            className={`filter-button ${selectedYear ? 'active' : ''}`}
                            onClick={() => setShowYearFilter(!showYearFilter)}
                        >
                            <FiSearch />
                            سنة الإستشارة
                            {selectedYear && <span className="filter-count">1</span>}
                            <FiChevronDown className={showYearFilter ? 'rotated' : ''} />
                        </button>
                        {showYearFilter && (
                            <div className="filter-dropdown">
                                <button 
                                    className={`filter-option ${!selectedYear ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedYear('');
                                        setShowYearFilter(false);
                                    }}
                                >
                                    الكل
                                </button>
                                {getAvailableYears().map((year) => (
                                    <button
                                        key={year}
                                        className={`filter-option ${selectedYear === year.toString() ? 'selected' : ''}`}
                                        onClick={() => {
                                            setSelectedYear(year.toString());
                                            setShowYearFilter(false);
                                        }}
                                    >
                                        {year}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button 
                        className={`filter-button ${sortOrder === 'desc' ? 'active' : ''}`}
                        onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                    >
                        <FiSearch />
                        ترتيب الجدول
                    </button>
                </div>

                {fetchingConsultations ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        جاري التحميل...
                    </div>
                ) : (
                    <>
                        <div className="table-container">
                            <table className="consultations-table">
                                <thead>
                                    <tr>
                                        <th>الرقم المرجعي</th>
                                        <th>تاريخ التسجيل</th>
                                        <th>اسم العميل</th>
                                        <th>نوع الإستشارة</th>
                                        <th>طريقة الإستشارة</th>
                                        <th>المستشار</th>
                                        <th>الحالة</th>
                                        <th>التفاصيل</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentConsultations.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                                لا توجد استشارات
                                            </td>
                                        </tr>
                                    ) : (
                                        currentConsultations.map((consultation, index) => (
                                            <tr key={consultation.id}>
                                                <td>{indexOfFirstItem + index + 1}</td>
                                                <td>{formatDate(consultation.created_at)}</td>
                                                <td>
                                                    <div className="client-name-cell">
                                                        <div className="client-icon">
                                                            <FiUser />
                                                        </div>
                                                        {consultation.client_name || 'غير محدد'}
                                                    </div>
                                                </td>
                                                <td>{consultation.consultation_type}</td>
                                                <td>إستشارة مباشرة</td>
                                                <td>{getLawyerName(consultation.lawyer_id, consultation.admin_id)}</td>
                                                <td>
                                                    <span className="status-badge completed">
                                                        مكتملة
                                                        <FiChevronDown />
                                                    </span>
                                                </td>
                                                <td>
                                                    <button 
                                                        className="action-button"
                                                        onClick={() => router.push(`/services/view-consultation?id=${consultation.id}`)}
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
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <>
                                <div className="pagination">
                                    <button 
                                        className="pagination-button"
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                    >
                                        البداية
                                    </button>
                                    <button 
                                        className="pagination-button"
                                        onClick={() => setCurrentPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        <FiChevronRight />
                                    </button>
                                    <button className="pagination-button active">
                                        {currentPage}
                                    </button>
                                    <button 
                                        className="pagination-button"
                                        onClick={() => setCurrentPage(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                    >
                                        <FiChevronLeft />
                                    </button>
                                    <button 
                                        className="pagination-button"
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                    >
                                        النهاية
                                    </button>
                                </div>
                                <div className="total-count">
                                    مجموع الإستشارات {filteredConsultations.length}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
};

export default withAuth(AddConsultationPage, [], true);
