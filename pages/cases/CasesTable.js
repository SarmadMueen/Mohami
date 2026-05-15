
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/initSupabase';
import Layout from '../../components/layout/Layout';
import withAuth from '../../lib/withAuth';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiPlusCircle, FiSearch, FiChevronDown, FiFilter } from "react-icons/fi";
import { useSubscription } from '../../context/SubscriptionContext';

const CasesTable = () => {
    // --- All of your original state and logic is preserved ---
    const router = useRouter();
    const { isReadOnly, loading: subLoading } = useSubscription();
    const [casesData, setCasesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredCases, setFilteredCases] = useState([]);
    const [selectedCaseState, setSelectedCaseState] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [sortByDate, setSortByDate] = useState('desc');
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedGovernorate, setSelectedGovernorate] = useState('');
    const [selectedAssignedUser, setSelectedAssignedUser] = useState('');
    const [selectedClientGroup, setSelectedClientGroup] = useState('');
    const [selectedSortOrder, setSelectedSortOrder] = useState('desc');
    const [userPermissions, setUserPermissions] = useState(null);
    const [casesWithSessions, setCasesWithSessions] = useState([]);
    const [isActiveCasesExpanded, setIsActiveCasesExpanded] = useState(true);
    const [isCompletedCasesExpanded, setIsCompletedCasesExpanded] = useState(true);
    const [hasClients, setHasClients] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showNoClientMessage, setShowNoClientMessage] = useState(false);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, index) => currentYear - index);
    const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

    // Helper function to get lawyer avatar color
    const getLawyerAvatarColor = (name) => {
        if (!name) return '#9ca3af';
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };

    // Helper function to get lawyer initial
    const getLawyerInitial = (name) => {
        if (!name) return '?';
        // Get first Arabic or English character
        const firstChar = name.trim().charAt(0);
        return firstChar.toUpperCase();
    };

    // Fetch user permissions
    useEffect(() => {
        const fetchUserPermissions = async () => {
            try {
                const user = supabase.auth.user();
                if (!user) return;

                const { data: userMetadata, error: metadataError } = await supabase
                    .from('user_metadata')
                    .select('role')
                    .eq('email', user.email)
                    .single();

                if (metadataError || !userMetadata) {
                    console.error('Error fetching user metadata:', metadataError);
                    return;
                }

                const { data: permissionData, error: permissionError } = await supabase
                    .from('permission_profiles')
                    .select('*')
                    .eq('profile_name', userMetadata.role)
                    .single();

                if (permissionError || !permissionData) {
                    console.error('Error fetching permissions:', permissionError);
                    return;
                }

                setUserPermissions(permissionData);
            } catch (error) {
                console.error('Error fetching user permissions:', error);
            }
        };

        fetchUserPermissions();
    }, []);

    useEffect(() => {
        // Your original, working data fetching logic with next session dates
        async function fetchCasesData() {
            setLoading(true);
            try {
                const user = supabase.auth.user();
                if (!user) throw new Error('User not logged in');
                const userId = user.id;

                const { data: userMetadata, error: userMetadataError } = await supabase
                    .from('user_metadata')
                    .select('admin_user_id, new_lawyer_id, role')
                    .or(`new_lawyer_id.eq.${userId}, admin_user_id.eq.${userId}, user_id.eq.${userId}`)
                    .limit(1);

                if (userMetadataError) throw new Error('Error fetching user metadata');

                let actualAdminId = userId;
                let actualLawyerId = userId;
                let role = 'Admin';

                if (userMetadata && userMetadata.length > 0) {
                    const row = userMetadata.find(m => m.new_lawyer_id === userId) || userMetadata[0];
                    if (row.admin_user_id) {
                        actualAdminId = row.admin_user_id;
                    }
                    if (row.new_lawyer_id) {
                        actualLawyerId = row.new_lawyer_id;
                    }
                    if (row.role) {
                        role = row.role;
                    }
                }

                const isAdmin = role === 'Admin' || role === 'الفئة 1' || actualAdminId === userId;
                setIsAdmin(isAdmin);

                const { data: lawyerData, error: lawyerError } = await supabase
                    .from('user_metadata')
                    .select('new_lawyer_id')
                    .eq('admin_user_id', actualAdminId);

                const lawyerIds = lawyerData?.map(meta => meta.new_lawyer_id).filter(Boolean) || [];

                let cases = [];

                if (isAdmin) {
                    const { data, error } = await supabase.from('cases').select('*').eq('admin_id', actualAdminId);
                    if (error) throw new Error('Error fetching admin cases');
                    cases = data;
                } else {
                    // Start: Logic for Sub-Lawyer (Category 1)
                    // If I am a lawyer, I should see ONLY cases where:
                    // 1. I am assigned (lawyer_id/caseLawyerId = Me)

                    let queryCondition = `lawyer_id.eq.${actualLawyerId},caseLawyerId.eq.${actualLawyerId}`;

                    const { data, error } = await supabase.from('cases').select('*').or(queryCondition);
                    if (error) throw new Error('Error fetching lawyer cases');
                    cases = data;
                }

                // Fetch next session dates for all cases
                const caseNumbers = cases.map(c => c.case_number).filter(Boolean);
                let sessionsMap = {};

                if (caseNumbers.length > 0) {
                    const { data: sessions, error: sessionsError } = await supabase
                        .from('sessions')
                        .select('case_number, next_session_date, next_session_req')
                        .in('case_number', caseNumbers)
                        .not('next_session_date', 'is', null)
                        .order('next_session_date', { ascending: true });

                    if (!sessionsError && sessions) {
                        // Get the earliest next session date for each case
                        sessions.forEach(session => {
                            if (!sessionsMap[session.case_number] ||
                                new Date(session.next_session_date) < new Date(sessionsMap[session.case_number].date)) {
                                sessionsMap[session.case_number] = {
                                    date: session.next_session_date,
                                    req: session.next_session_req
                                };
                            }
                        });
                    }
                }

                // Enrich cases with next session dates
                const enrichedCases = cases.map(caseItem => ({
                    ...caseItem,
                    nextSessionDate: sessionsMap[caseItem.case_number]?.date || null,
                    nextSessionReq: sessionsMap[caseItem.case_number]?.req || null
                }));

                setCasesData(enrichedCases);

                // Check if user has any clients
                let clientsCount = 0;
                if (isAdmin) {
                    const { count, error: clientsError } = await supabase
                        .from('clients_data')
                        .select('*', { count: 'exact', head: true })
                        .eq('admin_id', actualAdminId);
                    if (!clientsError) clientsCount = count;
                } else {
                    // For lawyers, check if their Admin OR they themselves have added clients
                    const { count, error: clientsError } = await supabase
                        .from('clients_data')
                        .select('*', { count: 'exact', head: true })
                        .or(`admin_id.eq.${actualAdminId},lawyer_id.eq.${actualLawyerId}`);
                    if (!clientsError) clientsCount = count;
                }
                setHasClients(clientsCount > 0);
            } catch (error) {
                console.error('Error fetching cases:', error.message);
            } finally {
                setLoading(false);
            }
        }
        fetchCasesData();
    }, []);

    // Enhanced filtering and sorting logic
    const filterCases = useCallback(() => {
        let processedData = [...casesData];

        // Search query
        if (searchQuery) {
            processedData = processedData.filter((caseItem) =>
                Object.values(caseItem).some((value) =>
                    value && value.toString().toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }

        // Filter by case state (جميع الحالات)
        if (selectedCaseState) {
            processedData = processedData.filter((caseItem) => caseItem.caseState === selectedCaseState);
        }

        // Filter by category (جميع الفئات) - using client_type
        if (selectedCategory) {
            processedData = processedData.filter((caseItem) => caseItem.client_type === selectedCategory);
        }

        // Filter by governorate (المدنية/المحافظة)
        if (selectedGovernorate) {
            processedData = processedData.filter((caseItem) => caseItem.Governorate === selectedGovernorate);
        }

        // Filter by assigned user/lawyer (المستخدم المُكلف)
        if (selectedAssignedUser) {
            processedData = processedData.filter((caseItem) => caseItem.caseLawyer === selectedAssignedUser);
        }

        // Filter by client group (مجموعة الموكل) - using client_name for now
        if (selectedClientGroup) {
            processedData = processedData.filter((caseItem) => caseItem.client_name === selectedClientGroup);
        }

        // Filter by year (سنة التكليف)
        if (selectedYear) {
            processedData = processedData.filter((caseItem) => {
                if (!caseItem.caseDate) return false;
                return new Date(caseItem.caseDate).getFullYear() === parseInt(selectedYear);
            });
        }

        // Filter by month (تاريخ التكليف)
        if (selectedMonth) {
            processedData = processedData.filter((caseItem) => {
                if (!caseItem.caseDate) return false;
                return (new Date(caseItem.caseDate).getMonth() + 1) === parseInt(selectedMonth);
            });
        }

        // Sort by case number (ترتيب حسب رقم الملف)
        processedData.sort((a, b) => {
            const getNum = (item) => {
                let val = item.case_number;
                if (!val) return 0;
                val = val.toString().replace(/^.*_/, '');
                const clean = val.replace(/[^0-9]/g, '');
                return parseInt(clean) || 0;
            };

            const numA = getNum(a);
            const numB = getNum(b);

            return selectedSortOrder === 'asc' ? numA - numB : numB - numA;
        });

        setFilteredCases(processedData);
    }, [casesData, searchQuery, selectedCaseState, selectedCategory, selectedGovernorate, selectedAssignedUser, selectedClientGroup, selectedYear, selectedMonth, selectedSortOrder]);

    useEffect(() => {
        filterCases();
    }, [filterCases]);

    const handleSearchInputChange = (event) => {
        setSearchQuery(event.target.value);
    };

    const handleCaseStateChange = (event) => {
        setSelectedCaseState(event.target.value);
    };

    const getStatusClass = (status) => {
        if (!status) return 'status-default';
        const lowerStatus = status.toLowerCase();
        // Orange statuses (قيد العمل)
        if (lowerStatus.includes('قيد العمل') || lowerStatus.includes('قيد الدراسة') || lowerStatus.includes('قيد التداول')) return 'status-orange';
        // Pink statuses (متعثرة)
        if (lowerStatus.includes('متعثرة') || lowerStatus.includes('متوقفة')) return 'status-pink';
        // Green statuses (مكتملة)
        if (lowerStatus.includes('مكتملة') || lowerStatus.includes('مغلقة') || lowerStatus.includes('منتهية')) return 'status-green';
        // Yellow statuses
        if (lowerStatus.includes('طالب الأمر') || lowerStatus.includes('ضمعون ضده') || lowerStatus.includes('مفتوحة')) return 'status-yellow';
        // Light blue statuses
        if (lowerStatus.includes('مستفتى') || lowerStatus.includes('مدعي') || lowerStatus.includes('open')) return 'status-light-blue';
        // Blue statuses
        if (lowerStatus.includes('مؤجلة للحكم') || lowerStatus.includes('حكم')) return 'status-blue';
        // Gray statuses
        if (lowerStatus.includes('تنفيذ') || lowerStatus.includes('closed')) return 'status-gray';
        return 'status-default';
    };

    // Check if case is completed
    const isCaseCompleted = (caseItem) => {
        if (!caseItem.caseState) return false;
        const lowerStatus = caseItem.caseState.toLowerCase();
        return lowerStatus.includes('مكتملة') || lowerStatus.includes('مغلقة') || lowerStatus.includes('منتهية');
    };

    // Split cases into active and completed
    const activeCases = filteredCases.filter(c => !isCaseCompleted(c));
    const completedCases = filteredCases.filter(c => isCaseCompleted(c));

    const getPriorityClass = (priority) => {
        if (!priority) return 'priority-medium';
        const lowerPriority = priority.toLowerCase();
        if (lowerPriority.includes('عالية') || lowerPriority.includes('high')) return 'priority-high';
        if (lowerPriority.includes('منخفضة') || lowerPriority.includes('low')) return 'priority-low';
        return 'priority-medium';
    };

    const getPriorityColor = (priority) => {
        const lowerPriority = priority?.toLowerCase() || '';
        if (lowerPriority.includes('عالية') || lowerPriority.includes('high')) return '#8b5cf6'; // Purple
        if (lowerPriority.includes('منخفضة') || lowerPriority.includes('low')) return '#3b82f6'; // Blue
        if (lowerPriority.includes('متوسطة') || lowerPriority.includes('medium')) return '#8b5cf6'; // Purple
        return '#8b5cf6'; // Default purple
    };

    const formatCaseNumber = (caseNumber) => {
        if (!caseNumber) return '---';
        // Strip any prefix (e.g., 'LAW_', 'UUID_') and return only the part after the last underscore
        return caseNumber.toString().replace(/^.*_/, '');
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        } catch {
            return '-';
        }
    };

    const getCurrencyText = (currency) => {
        if (!currency || currency === "IQD") return "د.ع";
        if (currency === "USD") return "دولار";
        if (currency === "EUR") return "يورو";
        return currency;
    };

    return (
        <Layout>
            <div className="page-container">
                {/* Top Utility Bar - Search bar on left, add case button on right */}
                <div className="utility-bar" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="utility-bar-left" style={{ flex: 1, marginTop: '0' }}>
                        <div className="search-container-utility" style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', width: '100%' }}>
                            <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                                <FiSearch className="search-icon-utility" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '1.2rem', zIndex: 2 }} />
                                <input
                                    type="text"
                                    placeholder="البحث في القضايا..."
                                    value={searchQuery}
                                    onChange={handleSearchInputChange}
                                    className="search-input-utility"
                                    style={{
                                        width: '100%',
                                        padding: '12px 45px 12px 16px',
                                        borderRadius: '0',
                                        border: '1px solid #cbd5e1',
                                        outline: 'none',
                                        transition: 'all 0.3s ease',
                                        boxShadow: 'none',
                                        fontSize: '0.95rem',
                                        backgroundColor: '#f8fafc',
                                        color: '#0f172a',
                                        margin: 0
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.backgroundColor = '#ffffff';
                                        e.target.style.borderColor = '#3b82f6';
                                    }}
                                    onBlur={(e) => {
                                        if(!e.target.value) e.target.style.backgroundColor = '#f8fafc';
                                        e.target.style.borderColor = '#cbd5e1';
                                    }}
                                />
                            </div>
                            <button
                                onClick={filterCases}
                                className="search-button-utility"
                                style={{
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0',
                                    padding: '10px 24px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: '700',
                                    transition: 'all 0.2s ease',
                                    boxShadow: 'none',
                                    height: '46px',
                                    margin: 0
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#1d4ed8';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = '#2563eb';
                                }}
                            >
                                <span style={{ fontSize: '1rem', letterSpacing: '0.5px' }}>بحث</span>
                            </button>
                        </div>
                    </div>
                    {((userPermissions && userPermissions.can_add_cases) || isAdmin) && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                if (!hasClients) {
                                    setShowNoClientMessage(true);
                                    setTimeout(() => {
                                        router.push('/client/add_cl');
                                    }, 2000);
                                } else {
                                    router.push('/cases/add-case');
                                }
                            }}
                            className="new-case-button"
                            style={{
                                width: 'auto',
                                marginTop: '0',
                                opacity: isReadOnly || subLoading ? 0.5 : 1,
                                cursor: isReadOnly || subLoading ? 'not-allowed' : 'pointer'
                            }}
                            disabled={isReadOnly || subLoading}
                        >
                            <FiPlusCircle />
                            <span>قضية جديدة</span>
                        </button>
                    )}
                </div>

                {/* Filter Toggle & Bar */}
                <div className="filter-section">
                    <button 
                        className={`filter-toggle-btn ${isFiltersOpen ? 'active' : ''}`}
                        onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                    >
                        <div className="filter-toggle-left">
                            <FiFilter />
                            <span>تصنيف</span>
                        </div>
                        <FiChevronDown style={{ transform: isFiltersOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                    </button>

                    {isFiltersOpen && (
                        <div className="filter-bar-container">
                            <div className="filter-bar">
                        <div className={`filter-item-wrapper ${selectedSortOrder ? 'active' : ''}`}>
                            <select
                                value={selectedSortOrder}
                                onChange={(e) => setSelectedSortOrder(e.target.value)}
                                className="filter-select"
                            >
                                <option value="desc">ترتيب الجدول</option>
                                <option value="desc">الأحدث أولاً</option>
                                <option value="asc">الأقدم أولاً</option>
                            </select>
                            <FiSearch className="filter-icon" />
                        </div>
                        <div className={`filter-item-wrapper ${selectedYear ? 'active' : ''}`}>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="filter-select"
                            >
                                <option value="">سنة التكليف</option>
                                {years.map(year => <option key={year} value={year}>{year}</option>)}
                            </select>
                            <FiSearch className="filter-icon" />
                        </div>
                        <div className={`filter-item-wrapper ${selectedMonth ? 'active' : ''}`}>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="filter-select"
                            >
                                <option value="">تاريخ التكليف</option>
                                {months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
                            </select>
                            <FiSearch className="filter-icon" />
                        </div>
                        <div className={`filter-item-wrapper ${selectedClientGroup ? 'active' : ''}`}>
                            <select
                                value={selectedClientGroup}
                                onChange={(e) => setSelectedClientGroup(e.target.value)}
                                className="filter-select"
                            >
                                <option value="">مجموعة الموكل</option>
                                {[...new Set(casesData.map(c => c.client_name).filter(Boolean))].map(client => (
                                    <option key={client} value={client}>{client}</option>
                                ))}
                            </select>
                            <FiSearch className="filter-icon" />
                        </div>
                        <div className={`filter-item-wrapper ${selectedAssignedUser ? 'active' : ''}`}>
                            <select
                                value={selectedAssignedUser}
                                onChange={(e) => setSelectedAssignedUser(e.target.value)}
                                className="filter-select"
                            >
                                <option value="">المستخدم المُكلف</option>
                                {[...new Set(casesData.map(c => c.caseLawyer).filter(Boolean))].map(lawyer => (
                                    <option key={lawyer} value={lawyer}>{lawyer}</option>
                                ))}
                            </select>
                            <FiSearch className="filter-icon" />
                        </div>
                        <div className={`filter-item-wrapper ${selectedGovernorate ? 'active' : ''}`}>
                            <select
                                value={selectedGovernorate}
                                onChange={(e) => setSelectedGovernorate(e.target.value)}
                                className="filter-select"
                            >
                                <option value="">المدنية/المحافظة</option>
                                {[...new Set(casesData.map(c => c.Governorate).filter(Boolean))].map(gov => (
                                    <option key={gov} value={gov}>{gov}</option>
                                ))}
                            </select>
                            <FiSearch className="filter-icon" />
                        </div>
                        <div className={`filter-item-wrapper ${selectedCaseState ? 'active' : ''}`}>
                            <select
                                value={selectedCaseState}
                                onChange={(e) => setSelectedCaseState(e.target.value)}
                                className="filter-select"
                            >
                                <option value="">جميع الحالات</option>
                                {[...new Set(casesData.map(c => c.caseState).filter(Boolean))].map(state => (
                                    <option key={state} value={state}>{state}</option>
                                ))}
                            </select>
                            <FiSearch className="filter-icon" />
                        </div>
                        <div className={`filter-item-wrapper ${selectedCategory ? 'active' : ''}`}>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="filter-select"
                            >
                                <option value="">جميع الفئات</option>
                                {[...new Set(casesData.map(c => c.client_type).filter(Boolean))].map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                            <FiSearch className="filter-icon" />
                        </div>
                    </div>
                        </div>
                    )}
                </div>

                {/* Active Cases Section */}
                <div className="cases-section">
                    <div
                        className="section-header section-header-active"
                        onClick={() => setIsActiveCasesExpanded(!isActiveCasesExpanded)}
                    >
                        <div className="section-header-left">
                            <FiChevronDown style={{ transform: isActiveCasesExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                            <h2 className="section-title">القضايا النشطة</h2>
                            <span className="section-count">{activeCases.length}</span>
                        </div>
                    </div>
                    {isActiveCasesExpanded && (
                        <div className="cases-table-container">
                            {loading ? (
                                <p className="loading-text">جاري تحميل البيانات...</p>
                            ) : activeCases.length > 0 ? (
                                <>
                                    <table className="cases-table">
                                        <thead>
                                            <tr>
                                                <th className="table-header">رقم الملف</th>
                                                <th className="table-header">رقم الدعوى</th>
                                                <th className="table-header">الموكل</th>
                                                <th className="table-header">المحكمة</th>
                                                <th className="table-header">نوع الدعوى</th>
                                                <th className="table-header">المحامي</th>
                                                <th className="table-header">الحالة</th>
                                                <th className="table-header">قيمة الدعوى</th>
                                                <th className="table-header">الجلسة القادمة</th>
                                                <th className="table-header">متطلبات الجلسة القادمة</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeCases.map((caseItem) => (
                                                <tr
                                                    key={caseItem.id}
                                                    className="table-row clickable-row"
                                                    onClick={() => router.push(`/cases/CaseDetailsPage?caseId=${caseItem.id}`)}
                                                >
                                                    <td className="file-number-cell" data-label="رقم الملف">
                                                        <Link href={`/cases/CaseDetailsPage?caseId=${caseItem.id}`}>
                                                            <a className="file-number link-text" onClick={(e) => e.stopPropagation()}>
                                                                {formatCaseNumber(caseItem.case_number)}
                                                            </a>
                                                        </Link>
                                                    </td>
                                                    <td className="case-number-cell" data-label="رقم الدعوى">
                                                        <Link href={`/cases/CaseDetailsPage?caseId=${caseItem.id}`}>
                                                            <a className="court-number link-text" onClick={(e) => e.stopPropagation()}>
                                                                {caseItem.case_number_in_court || '-'}
                                                            </a>
                                                        </Link>
                                                    </td>
                                                    <td className="client-cell" data-label="الموكل">{caseItem.client_name || '-'}</td>
                                                    <td className="court-cell" data-label="المحكمة">{caseItem.courtAddress || '-'}</td>
                                                    <td className="case-type-cell" data-label="نوع الدعوى">{caseItem.caseType || '-'}</td>
                                                    <td className="lawyer-cell" data-label="المحامي">
                                                        <div className="lawyer-info">
                                                            <div
                                                                className="lawyer-avatar"
                                                                style={{ backgroundColor: getLawyerAvatarColor(caseItem.caseLawyer) }}
                                                            >
                                                                {getLawyerInitial(caseItem.caseLawyer)}
                                                            </div>
                                                            <span className="lawyer-name">{caseItem.caseLawyer || '-'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="status-cell" data-label="الحالة">
                                                        <span className={`status-badge ${getStatusClass(caseItem.caseState)}`}>
                                                            {caseItem.caseState || 'غير محدد'}
                                                        </span>
                                                    </td>
                                                    <td className="amount-cell" data-label="قيمة الدعوى">
                                                        {caseItem.totalAmount ? parseInt(caseItem.totalAmount).toLocaleString('ar-IQ') + ' ' + getCurrencyText(caseItem.currency) : '-'}
                                                    </td>
                                                    <td className="next-session-cell" data-label="الجلسة القادمة">
                                                        {caseItem.nextSessionDate ? formatDate(caseItem.nextSessionDate) : '-'}
                                                    </td>
                                                    <td className="next-session-req-cell" data-label="متطلبات الجلسة">
                                                        <span className="req-text">{caseItem.nextSessionReq || '-'}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="section-footer">
                                        <span className="section-total">المجموع: {activeCases.length} قضية</span>
                                        <div className="status-indicators">
                                            {[...new Set(activeCases.map(c => c.caseState).filter(Boolean))].slice(0, 3).map((status, idx) => (
                                                <span
                                                    key={idx}
                                                    className="status-indicator"
                                                    style={{
                                                        backgroundColor: getStatusClass(status) === 'status-orange' ? '#f97316' :
                                                            getStatusClass(status) === 'status-pink' ? '#ec4899' : '#10b981'
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="no-data-cell">لا توجد قضايا نشطة</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Completed Cases Section */}
                <div className="cases-section">
                    <div
                        className="section-header section-header-completed"
                        onClick={() => setIsCompletedCasesExpanded(!isCompletedCasesExpanded)}
                    >
                        <div className="section-header-left">
                            <FiChevronDown style={{ transform: isCompletedCasesExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                            <h2 className="section-title">القضايا المكتملة</h2>
                            <span className="section-count">{completedCases.length}</span>
                        </div>
                    </div>
                    {isCompletedCasesExpanded && (
                        <div className="cases-table-container">
                            {loading ? (
                                <p className="loading-text">جاري تحميل البيانات...</p>
                            ) : completedCases.length > 0 ? (
                                <>
                                    <table className="cases-table">
                                        <thead>
                                            <tr>
                                                <th className="table-header">رقم الملف</th>
                                                <th className="table-header">رقم الدعوى</th>
                                                <th className="table-header">الموكل</th>
                                                <th className="table-header">المحكمة</th>
                                                <th className="table-header">نوع الدعوى</th>
                                                <th className="table-header">المحامي</th>
                                                <th className="table-header">الحالة</th>
                                                <th className="table-header">قيمة الدعوى</th>
                                                <th className="table-header">تاريخ الإغلاق</th>
                                                <th className="table-header">النتيجة</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {completedCases.map((caseItem) => (
                                                <tr
                                                    key={caseItem.id}
                                                    className="table-row clickable-row"
                                                    onClick={() => router.push(`/cases/CaseDetailsPage?caseId=${caseItem.id}`)}
                                                >
                                                    <td className="file-number-cell" data-label="رقم الملف">
                                                        <Link href={`/cases/CaseDetailsPage?caseId=${caseItem.id}`}>
                                                            <a className="file-number link-text" onClick={(e) => e.stopPropagation()}>
                                                                {formatCaseNumber(caseItem.case_number)}
                                                            </a>
                                                        </Link>
                                                    </td>
                                                    <td className="case-number-cell" data-label="رقم الدعوى">
                                                        <Link href={`/cases/CaseDetailsPage?caseId=${caseItem.id}`}>
                                                            <a className="court-number link-text" onClick={(e) => e.stopPropagation()}>
                                                                {caseItem.case_number_in_court || '-'}
                                                            </a>
                                                        </Link>
                                                    </td>
                                                    <td className="client-cell" data-label="الموكل">{caseItem.client_name || '-'}</td>
                                                    <td className="court-cell" data-label="المحكمة">{caseItem.courtAddress || '-'}</td>
                                                    <td className="case-type-cell" data-label="نوع الدعوى">{caseItem.caseType || '-'}</td>
                                                    <td className="lawyer-cell" data-label="المحامي">
                                                        <div className="lawyer-info">
                                                            <div
                                                                className="lawyer-avatar"
                                                                style={{ backgroundColor: getLawyerAvatarColor(caseItem.caseLawyer) }}
                                                            >
                                                                {getLawyerInitial(caseItem.caseLawyer)}
                                                            </div>
                                                            <span className="lawyer-name">{caseItem.caseLawyer || '-'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="status-cell" data-label="الحالة">
                                                        <span className={`status-badge ${getStatusClass(caseItem.caseState)}`}>
                                                            {caseItem.caseState || 'غير محدد'}
                                                        </span>
                                                    </td>
                                                    <td className="amount-cell" data-label="قيمة الدعوى">
                                                        {caseItem.totalAmount ? parseInt(caseItem.totalAmount).toLocaleString('ar-IQ') + ' ' + getCurrencyText(caseItem.currency) : '-'}
                                                    </td>
                                                    <td className="closure-date-cell" data-label="تاريخ الإغلاق">
                                                        {caseItem.caseDate ? formatDate(caseItem.caseDate) : '-'}
                                                    </td>
                                                    <td className="result-cell" data-label="النتيجة">
                                                        <span className="result-text">حكم لصالح الموكل</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="section-footer">
                                        <span className="section-total">المجموع: {completedCases.length} قضية</span>
                                    </div>
                                </>
                            ) : (
                                <div className="no-data-cell">لا توجد قضايا مكتملة</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showNoClientMessage && (
                <div className="no-client-modal">
                    <div className="no-client-content">
                        <h3>يجب إضافة موكل أولاً</h3>
                        <p>سيتم توجيهك إلى صفحة إضافة موكل جديد...</p>
                    </div>
                </div>
            )}
            <style jsx global>{`
    body {
        overflow-x: hidden !important;
    }
    `}</style>

            <style jsx>{`
    .no-client-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .no-client-content {
        background-color: white;
        padding: 30px 50px;
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        animation: fadeIn 0.3s ease-out;
    }

    .no-client-content h3 {
        margin: 0 0 10px 0;
        color: #ef4444;
        font-size: 1.25rem;
        font-weight: 700;
    }

    .no-client-content p {
        margin: 0;
        color: #4b5563;
        font-size: 1rem;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .page-container {
        padding: 24px;
        background-color: transparent;
        font-family: 'Cairo', 'Almarai', sans-serif;
        direction: rtl;
        overflow-x: hidden;
        max-width: 100vw;
        box-sizing: border-box;
        min-height: 100vh;
    }

    /* Utility Bar */
    .utility-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background-color: transparent;
        padding: 0;
        border-radius: 0;
        margin-bottom: 20px;
        margin-top: 20px;
        gap: 16px;
        flex-wrap: wrap;
        box-shadow: none;
        border: none;
    }

    .utility-bar-left {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .utility-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        background-color: transparent;
        border: none;
        border-radius: 6px;
        color: #374151;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: 'Cairo', 'Almarai', sans-serif;
    }

    .utility-btn:hover {
        background-color: #e5e7eb;
    }

    .utility-icon {
        font-size: 16px;
    }

    .search-container-utility {
        position: relative;
        display: flex;
        align-items: center;
    }

    .search-input-utility {
        padding: 8px 20px 8px 50px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background-color: #ffffff;
        font-size: 0.95rem;
        width: 450px;
        font-family: 'Cairo', 'Almarai', sans-serif;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
    }

    .search-input-utility:focus {
        outline: none;
        border: 1px solid #3b82f6;
        box-shadow: 0 0 0 1px #3b82f6, 0 4px 12px rgba(59, 130, 246, 0.15);
    }

    .search-icon-utility {
        position: absolute;
        left: 16px;
        right: auto;
        color: #3b82f6;
        font-size: 20px;
        pointer-events: none;
    }

    .new-case-button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: #ffffff;
        padding: 8px 20px;
        border-radius: 8px;
        font-weight: 600;
        text-decoration: none;
        white-space: nowrap;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.875rem;
        font-family: 'Cairo', 'Almarai', sans-serif;
        box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
    }

    .new-case-button:hover {
        background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
    }

    /* Filter Bar */
    .filter-section {
        margin-bottom: 20px;
    }

    .filter-toggle-btn {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        background-color: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 14px 20px;
        font-family: 'Cairo', 'Almarai', sans-serif;
        font-size: 1rem;
        font-weight: 700;
        color: #1e293b;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .filter-toggle-btn:hover {
        background-color: #f8fafc;
        border-color: #cbd5e1;
    }

    .filter-toggle-btn.active {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        border-bottom: 1px solid #f1f5f9;
        box-shadow: none;
    }

    .filter-toggle-left {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #2563eb;
    }

    .filter-bar-container {
        background-color: #ffffff;
        border-radius: 0 0 12px 12px;
        padding: 16px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        border: 1px solid #e2e8f0;
        border-top: none;
        overflow-x: auto;
        animation: slideDown 0.3s ease-out forwards;
        transform-origin: top;
    }

    @keyframes slideDown {
        from { opacity: 0; transform: scaleY(0.95); }
        to { opacity: 1; transform: scaleY(1); }
    }

    .filter-bar {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
    }

    .filter-item-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        background-color: #ffffff;
        transition: all 0.2s ease;
        min-width: 160px;
        flex: 0 0 auto;
    }

    .filter-item-wrapper:hover {
        border-color: #cbd5e1;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
    }

    .filter-item-wrapper.active {
        border-color: #2563eb;
        background-color: #eff6ff;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
    }

    .filter-select {
        flex: 1;
        padding: 8px 32px 8px 12px;
        border: none;
        border-radius: 8px;
        background-color: transparent;
        font-size: 0.875rem;
        color: #1e293b;
        font-weight: 500;
        font-family: 'Cairo', 'Almarai', sans-serif;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        outline: none;
        text-align: right;
    }

    .filter-select:focus {
        outline: none;
    }

    .filter-icon {
        position: absolute;
        right: 10px;
        color: #9ca3af;
        font-size: 14px;
        pointer-events: none;
        flex-shrink: 0;
    }

    .filter-item-wrapper:hover .filter-icon {
        color: #3b82f6;
    }

    .filter-item-wrapper.active .filter-icon {
        color: #3b82f6;
    }

    /* Cases Sections */
    .cases-section {
        background-color: #ffffff;
        border-radius: 12px;
        margin-bottom: 20px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        border: 1px solid #e2e8f0;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px 24px;
        cursor: pointer;
        user-select: none;
        transition: all 0.2s ease;
    }

    .section-header:hover {
        background-color: #f8fafc;
    }

    .section-header-active {
        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        border-bottom: 2px solid #2563eb;
    }

    .section-header-completed {
        background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        border-bottom: 2px solid #10b981;
    }

    .section-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .section-title {
        font-size: 1.125rem;
        font-weight: 700;
        color: #1e293b;
        margin: 0;
        letter-spacing: -0.01em;
    }

    .section-count {
        background-color: rgba(0, 0, 0, 0.08);
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.875rem;
        font-weight: 600;
        color: #1e293b;
    }

    .cases-table-container {
        overflow-x: auto;
    }

    .cases-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: auto;
    }

    .table-header {
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        padding: 16px 20px;
        font-size: 0.875rem;
        font-weight: 700;
        color: #1e293b;
        text-align: right;
        border-bottom: 2px solid #e2e8f0;
        white-space: nowrap;
        letter-spacing: -0.01em;
    }

    .cases-table td {
        padding: 16px 20px;
        border-bottom: 1px solid #f1f5f9;
        font-size: 0.875rem;
        color: #475569;
        vertical-align: middle;
        background-color: #ffffff;
        line-height: 1.6;
    }

    .table-row {
        transition: all 0.2s ease;
    }

    .table-row:hover {
        background-color: #f8fafc;
    }

    .table-row:last-child td {
        border-bottom: none;
    }

    .clickable-row {
        cursor: pointer;
    }

    .clickable-row:hover {
        background-color: #f0f9ff !important;
    }

    /* Table Cells */
    .file-number-cell {
        font-weight: 600;
    }

    .file-number {
        color: #1e293b;
    }

    .link-text {
        color: #2563eb;
        text-decoration: none;
        transition: all 0.2s ease;
        font-weight: 700;
        font-size: 0.875rem;
    }

    .link-text:hover {
        color: #1d4ed8;
        text-decoration: underline;
    }

    .case-number-cell,
    .case-type-cell,
    .next-session-cell,
    .closure-date-cell {
        color: #475569;
        font-weight: 500;
    }

    .lawyer-info {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .lawyer-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-weight: 700;
        font-size: 0.875rem;
        flex-shrink: 0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        border: 2px solid #ffffff;
    }

    .lawyer-name {
        color: #1e293b;
        font-weight: 500;
    }

    .status-badge {
        display: inline-block;
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
        border: 1px solid transparent;
        transition: all 0.2s ease;
    }

    .status-orange {
        background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
        color: #ea580c;
        border-color: #fb923c;
    }

    .status-pink {
        background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
        color: #ec4899;
        border-color: #f472b6;
    }

    .status-green {
        background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
        color: #059669;
        border-color: #34d399;
    }

    .status-yellow {
        background: linear-gradient(135deg, #fef9c3 0%, #fef08a 100%);
        color: #ca8a04;
        border-color: #facc15;
    }

    .status-light-blue {
        background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
        color: #2563eb;
        border-color: #60a5fa;
    }

    .status-blue {
        background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
        color: #1d4ed8;
        border-color: #3b82f6;
    }

    .status-gray {
        background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
        color: #4b5563;
        border-color: #d1d5db;
    }

    .status-default {
        background: linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%);
        color: #6b7280;
        border-color: #d4d4d4;
    }

    .priority-badge {
        display: inline-block;
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 0.75rem;
        font-weight: 600;
        color: #ffffff;
        white-space: nowrap;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .notes-text,
    .req-text {
        color: #64748b;
        max-width: 150px;
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.8125rem;
    }

    .client-cell,
    .court-cell {
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .amount-cell {
        font-weight: 600;
        color: #059669;
        white-space: nowrap;
    }

    .result-text {
        color: #059669;
        font-weight: 600;
        font-size: 0.875rem;
    }

    .section-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 24px;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border-top: 1px solid #e2e8f0;
    }

    .section-total {
        font-size: 0.875rem;
        color: #475569;
        font-weight: 600;
    }

    .status-indicators {
        display: flex;
        gap: 6px;
    }

    .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }

    .no-data-cell {
        text-align: center;
        padding: 80px 20px;
        color: #64748b;
        font-size: 1rem;
        font-weight: 500;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    }

    .loading-text {
        text-align: center;
        padding: 80px 20px;
        color: #64748b;
        font-size: 1rem;
        font-weight: 500;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    }

    @media (max-width: 1024px) {
        .page-container {
            padding: 16px;
        }

        .cases-table-container {
            overflow-x: auto;
        }

        .cases-table {
            min-width: 1500px;
        }
    }

    @media (max-width: 768px) {
        /* General Mobile Layout */
        .page-container {
            padding: 12px;
            background-color: #f8fafc;
            padding-top: 2px;
        }

        .utility-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
            padding: 8px 12px;
            margin-top: 0px;
            margin-bottom: 8px;
        }

        .utility-bar-left {
            width: 100%;
        }

        .search-container-utility {
            width: 100%;
        }

        .search-input-utility {
            width: 100%;
        }

        .new-case-button {
            width: 100%;
        }

        .new-case-button {
            width: 100%;
            justify-content: center;
        }

        /* Filter Bar - Horizontal Scroll */
        .filter-toggle-btn {
            padding: 12px 16px;
            font-size: 0.95rem;
        }

        .filter-bar-container {
            padding: 12px;
            border-radius: 0 0 8px 8px;
            margin-bottom: 12px;
        }

        .filter-bar {
            flex-direction: column; /* Changed to list */
            flex-wrap: nowrap;
            overflow-x: hidden;
            gap: 10px;
        }
        
        .filter-bar::-webkit-scrollbar {
            display: none;
        }

        .filter-item-wrapper {
            min-width: 100%; /* Take full width on mobile */
            flex-shrink: 0;
        }

        /* Cases Section Header */
        .section-header {
            padding: 12px 16px;
        }

        .section-title {
            font-size: 1rem;
        }

        /* Responsive Table Card Layout */
        .cases-table-container {
            overflow: visible; /* Allow cards to flow */
        }

        .cases-table {
            display: block;
            min-width: 100%; /* Reset min-width */
        }
        
        .cases-table thead {
            display: none; /* Hide standard table header */
        }
        
        .cases-table tbody {
            display: block;
            width: 100%;
        }
        
        .cases-table tr {
            display: block;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            margin-bottom: 16px;
            padding: 16px;
            position: relative;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        
        .cases-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            text-align: left;
            padding: 8px 0;
            border-bottom: 1px solid #f8fafc;
            width: 100%;
            box-sizing: border-box;
        }
        
        .cases-table td:last-child {
            border-bottom: none;
        }

        /* Cell Content Labels using data-label attribute */
        .cases-table td::before {
            content: attr(data-label);
            font-size: 0.85rem;
            font-weight: 800;
            color: #0F172A; /* Dark black */
            margin-left: 12px; /* Margin for RTL */
            flex-shrink: 0;
            font-family: 'Cairo', sans-serif;
        }

        /* Specific Cell Styling for Card Look */
        
        /* Hide unwanted columns on mobile */
        .cases-table td.case-type-cell,
        .cases-table td.lawyer-cell,
        .cases-table td.amount-cell,
        .cases-table td.next-session-cell,
        .cases-table td.next-session-req-cell,
        .cases-table td.closure-date-cell,
        .cases-table td.result-cell {
            display: none !important;
        }

        /* File Number - Main Card Title */
        .cases-table td.file-number-cell {
            padding-top: 0;
            padding-bottom: 12px;
            border-bottom: 1px solid #f1f5f9;
            margin-bottom: 8px;
            justify-content: flex-start; /* Align right (RTL start) */
        }
        
        .cases-table td.file-number-cell::before {
            display: none; /* Hide label for file number */
        }
        
        .file-number {
            font-size: 1.125rem;
            font-weight: 800;
            color: #1e293b;
        }

        /* Status Badge - Keep visible in mobile card rows */
        .cases-table td.status-cell {
            position: static;
            width: 100%;
            padding: 8px 0;
            border-bottom: 1px solid #f8fafc;
            justify-content: space-between;
            align-items: center;
        }
        
        .cases-table td.status-cell::before {
            display: inline-block; /* Show الحالة label on mobile */
        }

        .cases-table td.status-cell .status-badge {
            font-weight: 700;
            font-size: 0.8rem;
            padding: 6px 12px;
            box-shadow: none;
            border: 1px solid transparent;
            backdrop-filter: none;
        }

        /* Hide Case Number in Court if it's the same or confusing, or keep it */
        .cases-table td.case-number-cell {
            /* Optional: Make specific cells stand out */
        }

        /* Fix truncated text in card view */
        .client-cell, .court-cell {
            max-width: none; /* remove truncation */
        }

        /* Ensure clickable rows work properly on mobile */
        .cases-table tr.clickable-row {
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .cases-table tr.clickable-row:active {
            transform: scale(0.98);
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .cases-table tr.clickable-row:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border-color: #3b82f6;
        }

        /* Ensure links are clearly clickable on mobile */
        .link-text {
            display: inline-block;
            padding: 4px 0;
            min-height: 24px;
            text-decoration: underline !important;
            color: #2563eb !important;
        }

        .cases-table td.file-number-cell, 
        .cases-table td.case-number-cell {
            z-index: 2;
            position: relative;
        }
    }
`}</style>
        </Layout>
    );
};

export default withAuth(CasesTable, ['can_view_cases']);
