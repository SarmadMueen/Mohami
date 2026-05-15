import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/initSupabase';
import Layout from '../../components/layout/Layout';
import withAuth from '../../lib/withAuth';
import { checkStorageLimit } from '../../lib/storageUtils';
import 'react-datepicker/dist/react-datepicker.css';
import DatePicker from 'react-datepicker';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import 'suneditor/dist/css/suneditor.min.css';
import mammoth from 'mammoth';
import { format } from 'date-fns';
import { useRouter } from 'next/router';
import { FiSave, FiBriefcase, FiUser, FiUsers, FiDollarSign, FiFileText, FiEdit3, FiPlusCircle, FiChevronDown, FiArrowLeft, FiTrash2, FiSearch, FiBookOpen, FiX } from 'react-icons/fi';
import ContactPicker from '../../components/ContactPicker';

const SunEditor = dynamic(() => import("suneditor-react"), {
    ssr: false,
});

const AddCasePage = () => {
    // --- All of your original state and logic is preserved ---
    const initialCaseState = {
        client_name: '', client_type: '', client_adult_child: '', opponentName: '',
        opponentPhone: '', opponentAddress: '', opponentLawyer: '', opponentLawyerPhone: '',
        opponent_type: '',
        caseType: '', caseLawyer: '', Governorate: '', legalArticle: '', case_number_in_court: '',
        sponsorName: '', caseStage: '', caseType2: '', courtAddress: '', policeStation: '',
        caseDate: '', totalAmount: '', paidAmount: '', remainingAmount: '', caseSubject: '',
        Notes: '', blockNumber: '', contractPeriod: '', contractValue: '', governorate_id: '',
        legal_form: '', id_number: '', location: '', currency: 'IQD', criminalProceduresArticle: '',
        // --- الشرعية extra fields ---
        sect: '', competent_court: '', marriage_contract_date: '', marriage_contract_number: '',
        marriage_contract_location: '', divorce_type: '', separation_type: '', deferred_dowry: '',
        iddah_period_from_divorce: '', alimony_type: '', alimony_duration_required: '',
        alimony_estimation_basis: '', custody_years: '', request_visit_custodian: '',
        birth_date: '', birth_location: '', guardianship_type: '', request_appoint_guardian: '',
        current_guardian_status: '', number_of_heirs: '', kinship_degrees: '',
        approximate_estate_value: '', will_type: '', dispute_details: '',
        // --- الجزائية extra fields ---
        crime_type: '', victim_classification: '', has_injuries: '', has_weapon: '',
        incident_location: '', eyewitnesses: '', material_evidence: '',
        violation_date: '', violation_time: '', violation_type: '',
        traffic_violation_number: '', estimated_fine: '', misdemeanor_type: '',
        damage_nature: '', has_criminal_record: '', report_number: '', report_date: '',
        civil_compensation_request: '', misdemeanor_transfer_request: '',
        violation_cancellation_request: '', has_previous_appeal: '', vehicle_type: '',
        // --- المدنية extra fields ---
        obligation_type: '', obligation_source: '', contract_type: '', contract_date: '',
        contract_duration_from: '', contract_duration_to: '', property_type: '', property_number: '',
        property_address: '', register_number: '', register_page: '', document_date: '',
        registration_office: '', real_right_type: '', movable_type: '', plate_number: '',
        movable_location: '', debt_value: '', contractual_penalties: '', compensation_value: ''
    };

    const router = useRouter();
    const [newCase, setNewCase] = useState({ ...initialCaseState });
    const [clientTypes, setClientTypes] = useState([]);
    const [clientLegalSearchQuery, setClientLegalSearchQuery] = useState('');
    const [filteredClientLegalTypes, setFilteredClientLegalTypes] = useState([]);
    const [isClientLegalDropdownOpen, setIsClientLegalDropdownOpen] = useState(false);
    const clientLegalDropdownRef = useRef(null);
    const [opponentLegalSearchQuery, setOpponentLegalSearchQuery] = useState('');
    const [filteredOpponentLegalTypes, setFilteredOpponentLegalTypes] = useState([]);
    const [isOpponentLegalDropdownOpen, setIsOpponentLegalDropdownOpen] = useState(false);
    const opponentLegalDropdownRef = useRef(null);
    const [isAddLegalTypeModalOpen, setIsAddLegalTypeModalOpen] = useState(false);
    const [legalTypeArabic, setLegalTypeArabic] = useState('');
    const [isSavingLegalType, setIsSavingLegalType] = useState(false);
    const [legalTypeTarget, setLegalTypeTarget] = useState('client');
    const [courts, setCourts] = useState([]);
    const [clientNames, setClientNames] = useState([]);
    const [userId, setUserId] = useState(null);
    const [latestCaseNumber, setLatestCaseNumber] = useState(0);
    const [lawyerNames, setLawyerNames] = useState([]);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [caseDate, setCaseDate] = useState(new Date());
    const [editorContent, setEditorContent] = useState('');
    const [policeStations, setPoliceStations] = useState([]);
    const [caseTypes, setCaseTypes] = useState([]);
    const [caseStages, setCaseStages] = useState([]);
    const [caseStates, setCaseStates] = useState([]);
    const [allCaseType2, setAllCaseType2] = useState([]);
    const [adminId, setAdminId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [idCardImage, setIdCardImage] = useState(null);
    const [activeTab, setActiveTab] = useState(0);

    // --- STATE FOR DRAFTS (المسودات) ---
    const [drafts, setDrafts] = useState([]);
    const [showDrafts, setShowDrafts] = useState(false);

    // --- NEW STATE FOR IMPROVED ADDITIONAL OPTIONS ---
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const optionsDropdownRef = useRef(null);

    // --- STATE FOR CASE TYPE 2 ADD NEW VALUE MODAL ---
    const [isAddCaseType2ModalOpen, setIsAddCaseType2ModalOpen] = useState(false);
    const [caseType2Arabic, setCaseType2Arabic] = useState('');
    const [isSavingCaseType2, setIsSavingCaseType2] = useState(false);
    const [isCaseType2DropdownOpen, setIsCaseType2DropdownOpen] = useState(false);
    const caseType2DropdownRef = useRef(null);
    const [caseType2SearchQuery, setCaseType2SearchQuery] = useState('');
    const [filteredCaseType2, setFilteredCaseType2] = useState([]);

    // --- STATE FOR CASE STAGE ADD NEW VALUE MODAL ---
    const [isAddCaseStageModalOpen, setIsAddCaseStageModalOpen] = useState(false);
    const [caseStageArabic, setCaseStageArabic] = useState('');
    const [isSavingCaseStage, setIsSavingCaseStage] = useState(false);
    const [isCaseStageDropdownOpen, setIsCaseStageDropdownOpen] = useState(false);
    const caseStageDropdownRef = useRef(null);
    const [caseStageSearchQuery, setCaseStageSearchQuery] = useState('');
    const [filteredCaseStages, setFilteredCaseStages] = useState([]);

    // --- STATE FOR COURT ADD NEW VALUE MODAL ---
    const [isAddCourtModalOpen, setIsAddCourtModalOpen] = useState(false);
    const [courtArabic, setCourtArabic] = useState('');
    const [isSavingCourt, setIsSavingCourt] = useState(false);
    const [isCourtDropdownOpen, setIsCourtDropdownOpen] = useState(false);
    const courtDropdownRef = useRef(null);
    const [courtSearchQuery, setCourtSearchQuery] = useState('');
    const [filteredCourts, setFilteredCourts] = useState([]);

    // --- STATE FOR PENAL CODE MODAL ---
    const [isPenalCodeModalOpen, setIsPenalCodeModalOpen] = useState(false);
    const [penalCodes, setPenalCodes] = useState([]);
    const [filteredPenalCodes, setFilteredPenalCodes] = useState([]);
    const [penalSearchQuery, setPenalSearchQuery] = useState('');
    const [isPenalLoading, setIsPenalLoading] = useState(false);
    
    // --- STATE FOR PERSONAL STATUS MODAL ---
    const [isPersonalStatusModalOpen, setIsPersonalStatusModalOpen] = useState(false);
    const [personalStatusCodes, setPersonalStatusCodes] = useState([]);
    const [filteredPersonalStatusCodes, setFilteredPersonalStatusCodes] = useState([]);
    const [personalStatusSearchQuery, setPersonalStatusSearchQuery] = useState('');
    const [isPersonalStatusLoading, setIsPersonalStatusLoading] = useState(false);

    // --- STATE FOR CIVIL LAW MODAL ---
    const [isCivilLawModalOpen, setIsCivilLawModalOpen] = useState(false);
    const [civilLawCodes, setCivilLawCodes] = useState([]);
    const [filteredCivilLawCodes, setFilteredCivilLawCodes] = useState([]);
    const [civilLawSearchQuery, setCivilLawSearchQuery] = useState('');
    const [isCivilLawLoading, setIsCivilLawLoading] = useState(false);
    
    // --- STATE FOR CRIMINAL PROCEDURES MODAL ---
    const [isCriminalProceduresModalOpen, setIsCriminalProceduresModalOpen] = useState(false);
    const [criminalProceduresCodes, setCriminalProceduresCodes] = useState([]);
    const [filteredCriminalProceduresCodes, setFilteredCriminalProceduresCodes] = useState([]);
    const [criminalProceduresSearchQuery, setCriminalProceduresSearchQuery] = useState('');
    const [isCriminalProceduresLoading, setIsCriminalProceduresLoading] = useState(false);
    const [showClientRequiredMsg, setShowClientRequiredMsg] = useState(false);

    // --- List of all possible additional options ---
    const allAdditionalOptions = React.useMemo(() => {
        const caseType = newCase.caseType?.trim();
        const base = [
            'رقم الحظر',       // Block Number
            'فترة العقد',      // Contract Period
            'قيمة العقد',      // Contract Value
        ];
        const shariaOptions = [
            'المذهب', 'المحكمة المختصة', 'تاريخ عقد الزواج', 'رقم عقد الزواج',
            'مكان عقد الزواج', 'نوع الطلاق', 'نوع التفريق', 'المهر المؤجل',
            'فترة العدة (من تاريخ الطلاق)', 'نوع النفقة', 'مدة النفقة المطلوبة',
            'أساس تقدير النفقة', 'سنوات حضانة الأولاد', 'طلب زيارة المحضون',
            'تاريخ الولادة', 'مكان الولادة', 'نوع الولاية', 'طلب نصب وصي / قيم',
            'حالة الوصي الحالي', 'عدد الورثة', 'درجات القرابة',
            'قيمة التركة التقريبية', 'نوع الوصية', 'تفاصيل النزاع'
        ];
        const criminalOptions = [
            'نوع الجناية', 'تصنيف الضحية', 'وجود إصابات', 'وجود سلاح',
            'مكان الحادث', 'شهود العيان', 'تاريخ المخالفة', 'وقت المخالفة',
            'أدلة مادية', 'نوع الجنحة', 'وجود سابقة جنائية', 'طبيعة الضرر',
            'رقم المحضر', 'تاريخ المحضر', 'مركز الشرطة',
            'طلب تعويض مدني', 'طلب ترحيل الجنحة',
            'نوع المخالفة', 'رقم مخالفة المرور', 'نوع المركبة',
            'غرامة مقدرة', 'طلب إلغاء المخالفة', 'وجود استئناف سابق'
        ];
        const civilOptions = [
            'نوع الالتزام', 'مصدر الالتزام', 'نوع العقد', 'تاريخ العقد',
            'مدة العقد (من – إلى)', 'نوع العقار', 'رقم العقار', 'عنوان العقار',
            'رقم السجل', 'الصفحة', 'تاريخ السند', 'دائرة التسجيل العقاري',
            'نوع الحق العيني', 'نوع المنقول', 'رقم اللوحة', 'مكان المنقول',
            'قيمة الدين', 'الغرامات الاتفاقية', 'قيمة التعويض'
        ];
        if (caseType === 'الشرعية') return [...base, ...shariaOptions];
        if (caseType === 'الجزائية') return [...base, ...criminalOptions];
        if (caseType === 'المدنية') return [...base, ...civilOptions];
        return base;
    }, [newCase.caseType]);

    // --- Options that auto-appear for each caseType ---
    const caseTypeOptionsMap = {
        'الشرعية': true,
        'الجزائية': true,
        'المدنية': true
    };

    // --- Clear selectedOptions when caseType changes ---
    useEffect(() => {
        setSelectedOptions([]);
    }, [newCase.caseType]);

    const iraqiGovernorates = [
        "الأنبار", "بابل", "بغداد", "البصرة", "دهوك", "القادسية", "ديالى",
        "ذي قار", "السليمانية", "أربيل", "كركوك", "كربلاء", "المثنى",
        "ميسان", "نينوى", "واسط",
    ];

    // --- All of your original useEffect hooks for fetching data are preserved ---
    useEffect(() => {
        const fetchAdminId = async () => {
            try {
                const user_id_logged = supabase.auth.user().id;
                const { data: adminData, error: adminError } = await supabase
                    .from('user_metadata')
                    .select('admin_user_id, user_id, new_lawyer_id')
                    .or(`user_id.eq.${user_id_logged},new_lawyer_id.eq.${user_id_logged}`);
                if (adminError) { console.error('Error fetching admin data:', adminError.message); return; }
                if (!adminData || adminData.length === 0) { console.error('Admin data is empty or not found.'); return; }

                // Pick the best row: prefer the one where I am the lawyer
                const lawyerRow = adminData.find(m => m.new_lawyer_id === user_id_logged);
                const userRow = adminData.find(m => m.user_id === user_id_logged);
                const targetMeta = lawyerRow || userRow || adminData[0];
                
                setAdminId(targetMeta.admin_user_id || targetMeta.user_id);
            } catch (error) {
                console.error('Error fetching admin ID:', error.message);
            }
        };
        fetchAdminId();
    }, []);

    // Helper to extract the numeric portion from a case_number (handles 'LAW_005', '005', 'LAW_NaN', etc.)
    const parseCaseNumber = (caseNumberStr) => {
        if (!caseNumberStr) return 0;
        // If it contains '_', take the part after the last underscore
        if (caseNumberStr.includes('_')) {
            const parts = caseNumberStr.split('_');
            const num = parseInt(parts[parts.length - 1]);
            return isNaN(num) ? 0 : num;
        }
        // Otherwise try parsing the whole string as a number
        const num = parseInt(caseNumberStr);
        return isNaN(num) ? 0 : num;
    };

    // Function to split article content if it contains multiple articles (same as penal-code.js)
    const splitArticleContent = (articleContent, articleNumber) => {
        if (!articleContent) return [{ articleNumber, content: articleContent }];
        const articlePattern = /(?:المادة|مادة)\s+(\d+)/g;
        const articles = [];
        let matches = [];
        let match;
        while ((match = articlePattern.exec(articleContent)) !== null) {
            matches.push({ index: match.index, articleNumber: match[1], fullMatch: match[0] });
        }
        if (matches.length === 0) return [{ articleNumber, content: articleContent }];
        const uniqueArticleNumbers = [...new Set(matches.map(m => m.articleNumber))];
        if (uniqueArticleNumbers.length === 1 && uniqueArticleNumbers[0] === articleNumber) {
            return [{ articleNumber, content: articleContent }];
        }
        let currentArticleNumber = articleNumber;
        let startIndex = 0;
        matches.forEach((matchItem) => {
            if (matchItem.index > startIndex) {
                const content = articleContent.substring(startIndex, matchItem.index).trim();
                const cleanContent = content.replace(/^(?:المادة|مادة)\s+\d+\s*/, '').trim();
                if (cleanContent) articles.push({ articleNumber: currentArticleNumber, content: cleanContent });
            }
            currentArticleNumber = matchItem.articleNumber;
            startIndex = matchItem.index;
        });
        if (startIndex < articleContent.length) {
            let content = articleContent.substring(startIndex).trim();
            content = content.replace(/^(?:المادة|مادة)\s+\d+\s*/, '').trim();
            if (content) articles.push({ articleNumber: currentArticleNumber, content: content });
        }
        if (articles.length === 0) return [{ articleNumber, content: articleContent }];
        return articles;
    };

    // Fetch Penal Codes
    useEffect(() => {
        const fetchPenalCodesData = async () => {
            try {
                setIsPenalLoading(true);
                const { data, error } = await supabase
                    .from('legal_codes')
                    .select('*')
                    .eq('law_type', 'عقوبات')
                    .order('article_number', { ascending: true });
                if (error) {
                    console.error('Error fetching penal codes:', error);
                } else {
                    const processedCodes = [];
                    (data || []).forEach(code => {
                        const splitArticles = splitArticleContent(code.article_content, code.article_number);
                        splitArticles.forEach((article, index) => {
                            processedCodes.push({
                                ...code,
                                id: `${code.id}-${index}`,
                                article_number: article.articleNumber,
                                article_content: article.content
                            });
                        });
                    });
                    processedCodes.sort((a, b) => (parseInt(a.article_number) || 0) - (parseInt(b.article_number) || 0));
                    setPenalCodes(processedCodes);
                    setFilteredPenalCodes(processedCodes);
                }
            } catch (error) {
                console.error('Error fetching penal codes:', error);
            } finally {
                setIsPenalLoading(false);
            }
        };
        fetchPenalCodesData();
    }, []);

    // Effect for searching Penal Codes
    useEffect(() => {
        if (penalSearchQuery.trim() === '') {
            setFilteredPenalCodes(penalCodes);
        } else {
            const lowerQuery = penalSearchQuery.toLowerCase();
            const filtered = penalCodes.filter(code => 
                code.article_content?.toLowerCase().includes(lowerQuery) ||
                code.article_number?.includes(penalSearchQuery) ||
                code.law_name_ar?.toLowerCase().includes(lowerQuery)
            );
            setFilteredPenalCodes(filtered);
        }
    }, [penalSearchQuery, penalCodes]);

    // Fetch Personal Status Law Codes
    useEffect(() => {
        const fetchPersonalStatusCodesData = async () => {
            try {
                setIsPersonalStatusLoading(true);
                const { data, error } = await supabase
                    .from('legal_articles')
                    .select('*')
                    .eq('law_id', 'law_188_1959');
                if (error) {
                    console.error('Error fetching personal status codes:', error);
                } else {
                    const processedCodes = [];
                    (data || []).forEach(code => {
                        const splitArticles = splitArticleContent(code.article_text, code.article_no);
                        splitArticles.forEach((article, index) => {
                            processedCodes.push({
                                ...code,
                                id: `${code.id}-${index}`,
                                article_no: article.articleNumber,
                                article_text: article.content
                            });
                        });
                    });
                    processedCodes.sort((a, b) => (parseInt(a.article_no) || 0) - (parseInt(b.article_no) || 0));
                    setPersonalStatusCodes(processedCodes);
                    setFilteredPersonalStatusCodes(processedCodes);
                }
            } catch (error) {
                console.error('Error fetching personal status codes:', error);
            } finally {
                setIsPersonalStatusLoading(false);
            }
        };
        fetchPersonalStatusCodesData();
    }, []);

    // Effect for searching Personal Status Codes
    useEffect(() => {
        if (personalStatusSearchQuery.trim() === '') {
            setFilteredPersonalStatusCodes(personalStatusCodes);
        } else {
            const lowerQuery = personalStatusSearchQuery.toLowerCase();
            const filtered = personalStatusCodes.filter(code => 
                code.article_text?.toLowerCase().includes(lowerQuery) ||
                code.article_no?.toString().includes(personalStatusSearchQuery) ||
                code.law_title?.toLowerCase().includes(lowerQuery)
            );
            setFilteredPersonalStatusCodes(filtered);
        }
    }, [personalStatusSearchQuery, personalStatusCodes]);

    // Fetch Civil Law Codes
    useEffect(() => {
        const fetchCivilLawCodesData = async () => {
            try {
                setIsCivilLawLoading(true);
                const { data, error } = await supabase
                    .from('civil_law')
                    .select('*')
                    .order('article_number', { ascending: true });
                if (error) {
                    console.error('Error fetching civil law codes:', error);
                } else {
                    const processedCodes = [];
                    (data || []).forEach(code => {
                        if (!code.article_content) {
                            processedCodes.push({
                                ...code,
                                article_number: String(code.article_number || '')
                            });
                            return;
                        }
                        const articleNumberStr = String(code.article_number || '');
                        const splitArticles = splitArticleContent(code.article_content, articleNumberStr);
                        splitArticles.forEach((article, index) => {
                            processedCodes.push({
                                ...code,
                                id: `${code.id}-${index}`,
                                article_number: article.articleNumber,
                                article_content: article.content || code.article_content
                            });
                        });
                    });
                    processedCodes.sort((a, b) => (parseInt(a.article_number) || 0) - (parseInt(b.article_number) || 0));
                    setCivilLawCodes(processedCodes);
                    setFilteredCivilLawCodes(processedCodes);
                }
            } catch (error) {
                console.error('Error fetching civil law codes:', error);
            } finally {
                setIsCivilLawLoading(false);
            }
        };
        fetchCivilLawCodesData();
    }, []);

    // Effect for searching Civil Law Codes
    useEffect(() => {
        if (civilLawSearchQuery.trim() === '') {
            setFilteredCivilLawCodes(civilLawCodes);
        } else {
            const lowerQuery = civilLawSearchQuery.toLowerCase();
            const filtered = civilLawCodes.filter(code => 
                code.article_content?.toLowerCase().includes(lowerQuery) ||
                code.article_number?.includes(civilLawSearchQuery) ||
                code.law_name_ar?.toLowerCase().includes(lowerQuery)
            );
            setFilteredCivilLawCodes(filtered);
        }
    }, [civilLawSearchQuery, civilLawCodes]);

    // Fetch Criminal Procedures Codes
    useEffect(() => {
        const fetchCriminalProceduresCodesData = async () => {
            try {
                setIsCriminalProceduresLoading(true);
                const { data, error } = await supabase
                    .from('criminal_procedures_law')
                    .select('*')
                    .order('article_number', { ascending: true });
                if (error) {
                    console.error('Error fetching criminal procedures law codes:', error);
                } else {
                    const processedCodes = [];
                    (data || []).forEach(code => {
                        if (!code.article_content) {
                            processedCodes.push({
                                ...code,
                                article_number: String(code.article_number || '')
                            });
                            return;
                        }
                        const articleNumberStr = String(code.article_number || '');
                        const splitArticles = splitArticleContent(code.article_content, articleNumberStr);
                        splitArticles.forEach((article, index) => {
                            processedCodes.push({
                                ...code,
                                id: `${code.id}-${index}`,
                                article_number: article.articleNumber,
                                article_content: article.content || code.article_content
                            });
                        });
                    });
                    processedCodes.sort((a, b) => (parseInt(a.article_number) || 0) - (parseInt(b.article_number) || 0));
                    setCriminalProceduresCodes(processedCodes);
                    setFilteredCriminalProceduresCodes(processedCodes);
                }
            } catch (error) {
                console.error('Error fetching criminal procedures law codes:', error);
            } finally {
                setIsCriminalProceduresLoading(false);
            }
        };
        fetchCriminalProceduresCodesData();
    }, []);

    // Effect for searching Criminal Procedures Codes
    useEffect(() => {
        if (criminalProceduresSearchQuery.trim() === '') {
            setFilteredCriminalProceduresCodes(criminalProceduresCodes);
        } else {
            const lowerQuery = criminalProceduresSearchQuery.toLowerCase();
            const filtered = criminalProceduresCodes.filter(code => 
                code.article_content?.toLowerCase().includes(lowerQuery) ||
                code.article_number?.includes(criminalProceduresSearchQuery) ||
                code.law_name_ar?.toLowerCase().includes(lowerQuery)
            );
            setFilteredCriminalProceduresCodes(filtered);
        }
    }, [criminalProceduresSearchQuery, criminalProceduresCodes]);

    useEffect(() => {
        async function fetchCaseType2Options() {
            try {
                const { data, error } = await supabase.from('case_options').select('id, case_type_2, case_type_parent');
                if (error) throw error;
                if (data) {
                    // Deduplicate by case_type_2 + case_type_parent
                    const seen = new Set();
                    const deduped = data.filter(row => {
                        if (!row.case_type_2) return false;
                        const key = `${row.case_type_2}__${row.case_type_parent || ''}`;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });
                    setAllCaseType2(deduped);
                    setFilteredCaseType2(deduped);
                }
            } catch (error) { console.error('Error fetching case_type_2:', error.message); }
        }
        fetchCaseType2Options();
    }, []);

    // Effect for filtering case type 2
    useEffect(() => {
        if (caseType2SearchQuery.trim() === '') {
            setFilteredCaseType2(allCaseType2);
        } else {
            const lowerQuery = caseType2SearchQuery.toLowerCase();
            const filtered = allCaseType2.filter(item => 
                item.case_type_2?.toLowerCase().includes(lowerQuery)
            );
            setFilteredCaseType2(filtered);
        }
    }, [caseType2SearchQuery, allCaseType2]);

    useEffect(() => {
        const fetchClientTypes = async () => {
            try {
                const { data, error } = await supabase.from('case_options').select('client_type');
                if (error) throw error;
                if (data) {
                    // Remove duplicates using Set
                    const types = [...new Set(data.map(item => item.client_type).filter(Boolean))];
                    setClientTypes(types);
                    setFilteredClientLegalTypes(types);
                    setFilteredOpponentLegalTypes(types);
                }
            } catch (error) { console.error('Error fetching client types:', error.message); }
        };
        fetchClientTypes();
    }, []);

    // Effect for filtering client legal types
    useEffect(() => {
        if (clientLegalSearchQuery.trim() === '') {
            setFilteredClientLegalTypes(clientTypes);
        } else {
            const lowerQuery = clientLegalSearchQuery.toLowerCase();
            setFilteredClientLegalTypes(clientTypes.filter(t => t.toLowerCase().includes(lowerQuery)));
        }
    }, [clientLegalSearchQuery, clientTypes]);

    // Effect for filtering opponent legal types
    useEffect(() => {
        if (opponentLegalSearchQuery.trim() === '') {
            setFilteredOpponentLegalTypes(clientTypes);
        } else {
            const lowerQuery = opponentLegalSearchQuery.toLowerCase();
            setFilteredOpponentLegalTypes(clientTypes.filter(t => t.toLowerCase().includes(lowerQuery)));
        }
    }, [opponentLegalSearchQuery, clientTypes]);

    // Close client legal dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (clientLegalDropdownRef.current && !clientLegalDropdownRef.current.contains(event.target)) {
                setIsClientLegalDropdownOpen(false);
                setClientLegalSearchQuery('');
            }
        };
        if (isClientLegalDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isClientLegalDropdownOpen]);

    // Close opponent legal dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (opponentLegalDropdownRef.current && !opponentLegalDropdownRef.current.contains(event.target)) {
                setIsOpponentLegalDropdownOpen(false);
                setOpponentLegalSearchQuery('');
            }
        };
        if (isOpponentLegalDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpponentLegalDropdownOpen]);

    useEffect(() => {
        async function fetchPoliceStations() {
            try {
                const { data, error } = await supabase.from("case_options").select("id, policeStation");
                if (error) throw error;
                if (data) {
                    const filteredStations = data.map((row) => row.policeStation).filter(Boolean);
                    setPoliceStations(filteredStations);
                }
            } catch (error) { console.error("Error fetching police stations:", error.message); }
        }
        fetchPoliceStations();
    }, []);

    useEffect(() => {
        async function fetchCourts() {
            try {
                const { data, error } = await supabase.from('case_options').select('id, courts');
                if (error) throw error;
                if (data) {
                    const courtOptions = data.map((row) => row.courts).filter(Boolean);
                    setCourts(courtOptions);
                    setFilteredCourts(courtOptions);
                }
            } catch (error) { console.error('Error fetching courts:', error.message); }
        }
        fetchCourts();
    }, []);

    // Effect for filtering courts
    useEffect(() => {
        if (courtSearchQuery.trim() === '') {
            setFilteredCourts(courts);
        } else {
            const lowerQuery = courtSearchQuery.toLowerCase();
            const filtered = courts.filter(court => 
                court.toLowerCase().includes(lowerQuery)
            );
            setFilteredCourts(filtered);
        }
    }, [courtSearchQuery, courts]);

    useEffect(() => {
        if (!adminId) return;
        const fetchLawyersToAssign = async () => {
            try {
                // Fetch all users belonging to this firm (admin + lawyers), exclude client_portal
                const { data, error } = await supabase
                    .from('user_metadata')
                    .select('username')
                    .or(`user_id.eq.${adminId},admin_user_id.eq.${adminId}`)
                    .neq('role', 'client_portal');

                if (error) {
                    console.error('Error fetching firm lawyers:', error);
                    setLawyerNames([]);
                } else {
                    // Extract unique usernames
                    const uniqueNames = [...new Set(data.map(u => u.username).filter(Boolean))];
                    setLawyerNames(uniqueNames);
                }
            } catch (error) { console.error('Error:', error.message); }
        };
        fetchLawyersToAssign();
    }, [adminId]);

    useEffect(() => {
        async function fetchCaseStates() {
            try {
                const { data, error } = await supabase.from('case_options').select('id, case_state');
                if (error) throw error;
                if (data) {
                    const caseStateOptions = data.map((row) => row.case_state).filter(Boolean);
                    setCaseStates(caseStateOptions);
                }
            } catch (error) { console.error('Error fetching case states:', error.message); }
        }
        fetchCaseStates();
    }, []);

    useEffect(() => {
        async function fetchCaseTypes() {
            try {
                const { data, error } = await supabase.from('case_options').select('id, case_type');
                if (error) throw error;
                if (data) {
                    const caseTypeOptions = data.map((row) => row.case_type).filter(Boolean);
                    setCaseTypes(caseTypeOptions);
                    if (caseTypeOptions.length > 0 && !newCase.caseType) {
                        setNewCase(prev => ({ ...prev, caseType: caseTypeOptions[0] }));
                    }
                }
            } catch (error) { console.error('Error fetching case types:', error.message); }
        }
        fetchCaseTypes();
    }, []);

    useEffect(() => {
        async function fetchCaseStages() {
            try {
                const { data, error } = await supabase.from('case_options').select('id, case_stage');
                if (error) throw error;
                if (data) {
                    const caseStageOptions = data.map((row) => row.case_stage).filter(Boolean);
                    setCaseStages(caseStageOptions);
                    setFilteredCaseStages(caseStageOptions);
                }
            } catch (error) { console.error('Error fetching case stages:', error.message); }
        }
        fetchCaseStages();
    }, []);

    // Effect for filtering case stages
    useEffect(() => {
        if (caseStageSearchQuery.trim() === '') {
            setFilteredCaseStages(caseStages);
        } else {
            const lowerQuery = caseStageSearchQuery.toLowerCase();
            const filtered = caseStages.filter(stage => 
                stage.toLowerCase().includes(lowerQuery)
            );
            setFilteredCaseStages(filtered);
        }
    }, [caseStageSearchQuery, caseStages]);

    useEffect(() => {
        if (!adminId) return;
        async function fetchLatestCaseNumber() {
            try {
                // Fetch ALL case numbers for this admin to find the true max
                const { data, error } = await supabase.from('cases').select('case_number').eq('admin_id', adminId);
                if (error) throw new Error('Error fetching case numbers');
                if (data && data.length > 0) {
                    // Parse all case numbers and find the maximum
                    let maxNum = 0;
                    data.forEach(row => {
                        const num = parseCaseNumber(row.case_number);
                        if (num > maxNum) maxNum = num;
                    });
                    setLatestCaseNumber(maxNum);
                } else {
                    setLatestCaseNumber(0);
                }
            } catch (error) { console.error(error); }
        }
        fetchLatestCaseNumber();
    }, [adminId]);

    useEffect(() => {
        const fetchClientNames = async () => {
            try {
                const user = supabase.auth.user();
                const userId = user.id;
                const { data: userMetadataList, error: metaError } = await supabase
                    .from("user_metadata")
                    .select("role, admin_user_id, new_lawyer_id, user_id")
                    .or(`user_id.eq.${userId},new_lawyer_id.eq.${userId}`);

                if (metaError) throw new Error("Metadata error: " + metaError.message);
                if (!userMetadataList || userMetadataList.length === 0) return;

                // Prefer the row where I am explicitly the 'new_lawyer_id'
                const lawyerRow = userMetadataList.find(m => m.new_lawyer_id === userId);
                const userRow = userMetadataList.find(m => m.user_id === userId);
                const userMetadata = lawyerRow || userRow || userMetadataList[0];

                const { role, admin_user_id, new_lawyer_id } = userMetadata;
                let query = supabase.from("clients_data").select("id, client_name");

                if (role === "Admin" || role === "الفئة 1") {
                    query = query.eq("admin_id", admin_user_id);
                } else if (role === "Lawyer" || role === "الفئة 2") {
                    query = query.or(`admin_id.eq.${admin_user_id},lawyer_id.eq.${new_lawyer_id || userId}`);
                }

                const { data: clients, error: clientError } = await query;
                if (clientError) throw clientError;
                const fetchedClients = clients || [];
                setClientNames(fetchedClients);
                
                // If this is a new lawyer/admin with no clients yet, redirect to add client
                if (fetchedClients.length === 0) {
                    setShowClientRequiredMsg(true);
                    setTimeout(() => {
                        setShowClientRequiredMsg(false);
                        router.push('/client/add_cl');
                    }, 3000);
                }
            } catch (error) {
                console.error(error.message);
                setClientNames([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchClientNames();
    }, []);

    useEffect(() => {
        async function loadDocxContent() {
            try {
                const response = await fetch('/templates/c.docx');
                const buffer = await response.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
                setEditorContent(result.value);
            } catch (error) { console.error('Error loading and converting content:', error); }
        }
        loadDocxContent();
    }, []);

    useEffect(() => {
        const fetchUserInfo = async () => {
            setIsLoading(true);
            try {
                const user = supabase.auth.user();
                if (!user) throw new Error("User not logged in.");
                const uid = user.id;
                setUserId(uid);
                const { data: userMetadataList, error } = await supabase
                    .from("user_metadata")
                    .select("role, admin_user_id, user_id, new_lawyer_id")
                    .or(`user_id.eq.${uid},new_lawyer_id.eq.${uid}`);
                if (error || !userMetadataList || userMetadataList.length === 0) throw new Error("User metadata not found.");
                
                // Pick the best row: prefer the one where I am the lawyer
                const lawyerRow = userMetadataList.find(m => m.new_lawyer_id === uid);
                const userRow = userMetadataList.find(m => m.user_id === uid);
                const userMetadata = lawyerRow || userRow || userMetadataList[0];
                
                setUserRole(userMetadata.role);
                const resolvedAdminId = userMetadata.role === "Admin" ? userMetadata.admin_user_id : userMetadata.new_lawyer_id;
                setAdminId(resolvedAdminId);
            } catch (error) {
                console.error("Error fetching user info:", error.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUserInfo();
    }, []);

    // --- NEW: Hook to handle clicks outside the dropdown ---
    useEffect(() => {
        function handleClickOutside(event) {
            if (optionsDropdownRef.current && !optionsDropdownRef.current.contains(event.target)) {
                setIsOptionsOpen(false);
            }
            if (caseType2DropdownRef.current && !caseType2DropdownRef.current.contains(event.target)) {
                setIsCaseType2DropdownOpen(false);
            }
            if (caseStageDropdownRef.current && !caseStageDropdownRef.current.contains(event.target)) {
                setIsCaseStageDropdownOpen(false);
            }
            if (courtDropdownRef.current && !courtDropdownRef.current.contains(event.target)) {
                setIsCourtDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [optionsDropdownRef, caseType2DropdownRef, caseStageDropdownRef, courtDropdownRef]);


    // --- All of your original handler functions are preserved ---
    const handleInputChange = async (e) => {
        const { name, value } = e.target;
        setNewCase(prevState => {
            const updatedState = { ...prevState, [name]: value };
            // Auto-calculate remaining amount when totalAmount or paidAmount changes
            if (name === 'totalAmount' || name === 'paidAmount') {
                const total = parseFloat(updatedState.totalAmount || 0);
                const paid = parseFloat(updatedState.paidAmount || 0);
                updatedState.remainingAmount = (total - paid).toFixed(2);
            }
            // Reset caseType2 when caseType changes
            if (name === 'caseType') {
                updatedState.caseType2 = '';
            }
            return updatedState;
        });

        if (name === 'client_name' && value) {
            setIsLoading(true);
            try {
                const { data } = await supabase
                    .from('clients_data')
                    .select('type, legal_form, id_number, governorate_id')
                    .eq('client_name', value)
                    .single();

                if (data) {
                    setNewCase(prevState => ({
                        ...prevState,
                        client_name: value,
                        legal_form: data.type || '', // الشكل القانوني from type field
                        id_number: data.id_number || '', // رقم الهوية from id_number field
                        governorate_id: data.governorate_id || '',
                        client_adult_child: data.legal_form || '' // صفة الموكل from legal_form field
                    }));
                }
            } catch (error) {
                console.error('Error fetching client details:', error.message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            const requiredFields = ['client_name'];
            const missingFields = requiredFields.filter(field => !newCase[field]);
            if (missingFields.length > 0) {
                alert('Please fill out all required fields: ' + missingFields.join(', '));
                return;
            }
            setIsSubmitting(true);
            const user = supabase.auth.user();
            if (!user) throw new Error('No authenticated user found');

            // 1. Fetch Admin/Lawyer hierarchy data to know which firm we belong to
            const { data: adminList, error: adminError } = await supabase
                .from('user_metadata')
                .select('admin_user_id, user_id, new_lawyer_id, role')
                .or(`user_id.eq.${user.id},new_lawyer_id.eq.${user.id}`);

            if (adminError) throw adminError;

            // Logic to determine the correct Admin Data row
            let adminData = null;
            if (adminList && adminList.length > 0) {
                // Prioritize finding the row where I am the lawyer
                const lawyerRow = adminList.find(m => m.new_lawyer_id === user.id);
                if (lawyerRow) {
                    adminData = lawyerRow;
                } else {
                    // Fallback to row where I am the user
                    adminData = adminList.find(m => m.user_id === user.id);
                }
            }

            // Determine Firm Admin ID for Sequential Numbering and Limits
            let firmAdminId = user.id; // Default to self (if Admin and valid)

            if (adminData) {
                // If I found a row where I am the lawyer, the admin_user_id IS my firm admin
                if (adminData.new_lawyer_id === user.id && adminData.admin_user_id) {
                    firmAdminId = adminData.admin_user_id;
                }
                // If I found a row where I am the user (Admin role usually)
                else if (adminData.user_id === user.id) {
                    firmAdminId = adminData.admin_user_id || user.id;
                }
            }

            // 2. Check Storage Limits before uploading
            if (idCardImage) {
                const storageCheck = await checkStorageLimit(firmAdminId);
                if (!storageCheck.allowed) {
                    throw new Error('سعة التخزين ممتلئة. يرجى ترقية الباقة أو حذف بعض الملفات.');
                }
            }

            // 3. Perform Uploads
            const newCaseNumber = (latestCaseNumber + 1).toString().padStart(3, '0');
            let idCardImageUrl = '';
            if (idCardImage) {
                const idCardImageFileName = `${Date.now()}_id_card_${idCardImage.name.replace(/\s+/g, '_')}`;
                const idCardImagePath = `images/${idCardImageFileName}`;
                const { error: uploadError } = await supabase.storage.from('images').upload(idCardImagePath, idCardImage);
                if (uploadError) throw uploadError;
                const { data: urlData } = await supabase.storage.from('images').getPublicUrl(idCardImagePath);
                idCardImageUrl = urlData.publicURL; // handle publicUrl vs publicURL safely below based on version output
            }
            if (idCardImageUrl === undefined) {
                const { data: urlDataFallback } = await supabase.storage.from('images').getPublicUrl(idCardImagePath);
                idCardImageUrl = urlDataFallback.publicUrl;
            }

            const htmlContentBlob = new Blob([editorContent], { type: 'text/html' });
            const htmlFileName = `${Date.now()}_contract.html`;
            const htmlPath = `html_files/${htmlFileName}`;
            const { error: htmlUploadError } = await supabase.storage.from('images').upload(htmlPath, htmlContentBlob);
            if (htmlUploadError) throw htmlUploadError;
            const { data: htmlUrlData } = await supabase.storage.from('images').getPublicUrl(htmlPath);

            const { data: lawyerData, error: lawyerError } = await supabase
                .from('user_metadata')
                .select('user_id, new_lawyer_id, role')
                .eq('username', newCase.caseLawyer)
                .limit(1)
                .maybeSingle();
            if (lawyerError) throw lawyerError;

            // Determine correct lawyer ID: if lawyerData has new_lawyer_id use it, otherwise use user_id (for admin)
            const targetLawyerId = lawyerData?.new_lawyer_id || lawyerData?.user_id;

            const caseDataToInsert = {
                client_name: newCase.client_name, client_type: newCase.client_type, legal_form: newCase.legal_form,
                governorate_id: newCase.governorate_id, id_number: newCase.id_number, client_adult_child: newCase.client_adult_child,
                case_number: newCaseNumber, opponentName: newCase.opponentName, opponentPhone: newCase.opponentPhone,
                opponentAddress: newCase.opponentAddress, opponentLawyer: newCase.opponentLawyer, opponentLawyerPhone: newCase.opponentLawyerPhone,
                opponent_type: newCase.opponent_type,
                client_id_img_url: idCardImageUrl, contract: htmlUrlData.publicURL || htmlUrlData.publicUrl, caseType: newCase.caseType,
                caseLawyer: newCase.caseLawyer, Governorate: newCase.Governorate, legalArticle: newCase.legalArticle,
                case_number_in_court: newCase.case_number_in_court, sponsorName: newCase.sponsorName,
                caseStage: newCase.caseStage, caseState: newCase.caseState, courtAddress: newCase.courtAddress,
                policeStation: newCase.policeStation, location: newCase.location, caseDate: format(caseDate, 'yyyy-MM-dd'),
                caseType2: newCase.caseType2, caseSubject: newCase.caseSubject, Notes: newCase.Notes,
                block_number: newCase.blockNumber, contract_period: newCase.contractPeriod, caseLawyerId: user.id,
                totalAmount: newCase.totalAmount !== "" ? parseFloat(newCase.totalAmount) : null,
                paidAmount: newCase.paidAmount !== "" ? parseFloat(newCase.paidAmount) : null,
                remainingAmount: newCase.remainingAmount !== "" ? parseFloat(newCase.remainingAmount) : null,
                contractValue: newCase.contractValue !== "" ? parseFloat(newCase.contractValue) : null,
                currency: newCase.currency || 'IQD',
                lawyer_id: targetLawyerId, role: lawyerData?.role, admin_id: firmAdminId,
                created_at: new Date().toISOString(),
                criminal_procedures_article_number: newCase.criminalProceduresArticle,
                // --- الشرعية extra fields ---
                sect: newCase.sect || null,
                competent_court: newCase.competent_court || null,
                marriage_contract_date: newCase.marriage_contract_date || null,
                marriage_contract_number: newCase.marriage_contract_number || null,
                marriage_contract_location: newCase.marriage_contract_location || null,
                divorce_type: newCase.divorce_type || null,
                separation_type: newCase.separation_type || null,
                deferred_dowry: newCase.deferred_dowry || null,
                iddah_period_from_divorce: newCase.iddah_period_from_divorce || null,
                alimony_type: newCase.alimony_type || null,
                alimony_duration_required: newCase.alimony_duration_required || null,
                alimony_estimation_basis: newCase.alimony_estimation_basis || null,
                custody_years: newCase.custody_years || null,
                request_visit_custodian: newCase.request_visit_custodian || null,
                birth_date: newCase.birth_date || null,
                birth_location: newCase.birth_location || null,
                guardianship_type: newCase.guardianship_type || null,
                request_appoint_guardian: newCase.request_appoint_guardian || null,
                current_guardian_status: newCase.current_guardian_status || null,
                number_of_heirs: newCase.number_of_heirs || null,
                kinship_degrees: newCase.kinship_degrees || null,
                approximate_estate_value: newCase.approximate_estate_value || null,
                will_type: newCase.will_type || null,
                dispute_details: newCase.dispute_details || null,
                // --- الجزائية extra fields ---
                crime_type: newCase.crime_type || null,
                victim_classification: newCase.victim_classification || null,
                has_injuries: newCase.has_injuries || null,
                has_weapon: newCase.has_weapon || null,
                incident_location: newCase.incident_location || null,
                eyewitnesses: newCase.eyewitnesses || null,
                material_evidence: newCase.material_evidence || null,
                violation_date: newCase.violation_date || null,
                violation_time: newCase.violation_time || null,
                violation_type: newCase.violation_type || null,
                traffic_violation_number: newCase.traffic_violation_number || null,
                estimated_fine: newCase.estimated_fine || null,
                misdemeanor_type: newCase.misdemeanor_type || null,
                damage_nature: newCase.damage_nature || null,
                has_criminal_record: newCase.has_criminal_record || null,
                report_number: newCase.report_number || null,
                report_date: newCase.report_date || null,
                civil_compensation_request: newCase.civil_compensation_request || null,
                misdemeanor_transfer_request: newCase.misdemeanor_transfer_request || null,
                violation_cancellation_request: newCase.violation_cancellation_request || null,
                has_previous_appeal: newCase.has_previous_appeal || null,
                vehicle_type: newCase.vehicle_type || null,
                // --- المدنية extra fields ---
                obligation_type: newCase.obligation_type || null,
                obligation_source: newCase.obligation_source || null,
                contract_type: newCase.contract_type || null,
                contract_date: newCase.contract_date || null,
                contract_duration_from: newCase.contract_duration_from || null,
                contract_duration_to: newCase.contract_duration_to || null,
                property_type: newCase.property_type || null,
                property_number: newCase.property_number || null,
                property_address: newCase.property_address || null,
                register_number: newCase.register_number || null,
                register_page: newCase.register_page || null,
                document_date: newCase.document_date || null,
                registration_office: newCase.registration_office || null,
                real_right_type: newCase.real_right_type || null,
                movable_type: newCase.movable_type || null,
                plate_number: newCase.plate_number || null,
                movable_location: newCase.movable_location || null,
                debt_value: newCase.debt_value || null,
                contractual_penalties: newCase.contractual_penalties || null,
                compensation_value: newCase.compensation_value || null
            };

            // RETRY LOOP FOR CASE INSERTION (Handle Unique Constraint Violations)
            let insertedCase = null;
            let retryCount = 0;
            const MAX_RETRIES = 5;

            while (retryCount < MAX_RETRIES) {
                try {
                    const { data, error: insertError } = await supabase.from('cases').insert([caseDataToInsert]).select().single();
                    if (insertError) {
                        if (insertError.code === '23505') { // Unique constraint violation
                            console.warn(`Case number ${caseDataToInsert.case_number} already exists. Retrying with new number...`);
                            retryCount++;
                            const { data: latestNumData, error: numError } = await supabase.from('cases').select('case_number').eq('admin_id', firmAdminId);
                            if (numError) throw numError;
                            let maxNum = 0;
                            (latestNumData || []).forEach(row => {
                                const num = parseCaseNumber(row.case_number);
                                if (num > maxNum) maxNum = num;
                            });
                            caseDataToInsert.case_number = (maxNum + 1).toString().padStart(3, '0');
                            continue;
                        }
                        throw insertError;
                    }
                    insertedCase = data;
                    break;
                } catch (error) {
                    console.error(`Attempt ${retryCount + 1} failed:`, error);
                    if (retryCount >= MAX_RETRIES - 1) {
                        throw error;
                    }
                    retryCount++;
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }

            if (!insertedCase) {
                throw new Error('Failed to insert case after multiple retries.');
            }

            // --- AUTO-CREATE CLIENT FOLDER ---
            // Automatically create a folder for the client in the 'images' bucket
            if (insertedCase && insertedCase.client_name) {
                try {
                    const clientFolderName = insertedCase.client_name.trim();
                    const safeFolderName = clientFolderName.replace(/[\/\\]/g, '-');
                    
                    if (safeFolderName) {
                        const placeholderFilePath = `${safeFolderName}/.keep`;
                        const placeholderFile = new File([""], ".keep", { type: "text/plain" });

                        // 1. Upload to storage bucket
                        const { error: uploadError } = await supabase.storage
                            .from('images')
                            .upload(placeholderFilePath, placeholderFile);

                        if (uploadError && !uploadError.message.includes('already exists')) {
                            console.error('Storage upload error for client folder:', uploadError);
                        } else {
                            // 2. Insert into `attachments` table to make it appear in the UI dropdown
                            const attachmentToInsert = {
                                file_name: ".keep",
                                file_url: "",
                                case_number: insertedCase.case_number,
                                created_at: new Date().toISOString(),
                                folder_name: safeFolderName,
                            };

                            const { error: dbError } = await supabase
                                .from('attachments')
                                .insert([attachmentToInsert]);
                                
                            if (dbError) {
                                console.error('Database insert error for client folder:', dbError);
                            }
                        }
                    }
                } catch (folderError) {
                    console.error('Error auto-creating client folder:', folderError);
                }
            }

            setShowSuccessMessage(true);
            setTimeout(() => {
                setShowSuccessMessage(false);
                setNewCase(initialCaseState);
                router.push('/cases/CasesTable');
            }, 2000);
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            alert('Error submitting case: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- HELPER AND HANDLER FUNCTIONS FOR ADDITIONAL OPTIONS ---
    const getOptionFieldName = (option) => {
        const englishTranslations = {
            'رقم الحظر': 'blockNumber',
            'فترة العقد': 'contractPeriod',
            'قيمة العقد': 'contractValue',
            'المذهب': 'sect',
            'المحكمة المختصة': 'competent_court',
            'تاريخ عقد الزواج': 'marriage_contract_date',
            'رقم عقد الزواج': 'marriage_contract_number',
            'مكان عقد الزواج': 'marriage_contract_location',
            'نوع الطلاق': 'divorce_type',
            'نوع التفريق': 'separation_type',
            'المهر المؤجل': 'deferred_dowry',
            'فترة العدة (من تاريخ الطلاق)': 'iddah_period_from_divorce',
            'نوع النفقة': 'alimony_type',
            'مدة النفقة المطلوبة': 'alimony_duration_required',
            'أساس تقدير النفقة': 'alimony_estimation_basis',
            'سنوات حضانة الأولاد': 'custody_years',
            'طلب زيارة المحضون': 'request_visit_custodian',
            'تاريخ الولادة': 'birth_date',
            'مكان الولادة': 'birth_location',
            'نوع الولاية': 'guardianship_type',
            'طلب نصب وصي / قيم': 'request_appoint_guardian',
            'حالة الوصي الحالي': 'current_guardian_status',
            'عدد الورثة': 'number_of_heirs',
            'درجات القرابة': 'kinship_degrees',
            'قيمة التركة التقريبية': 'approximate_estate_value',
            'نوع الوصية': 'will_type',
            'تفاصيل النزاع': 'dispute_details',
            // --- الجزائية fields ---
            'نوع الجناية': 'crime_type',
            'تصنيف الضحية': 'victim_classification',
            'وجود إصابات': 'has_injuries',
            'وجود سلاح': 'has_weapon',
            'مكان الحادث': 'incident_location',
            'شهود العيان': 'eyewitnesses',
            'تاريخ المخالفة': 'violation_date',
            'وقت المخالفة': 'violation_time',
            'أدلة مادية': 'material_evidence',
            'نوع الجنحة': 'misdemeanor_type',
            'وجود سابقة جنائية': 'has_criminal_record',
            'طبيعة الضرر': 'damage_nature',
            'رقم المحضر': 'report_number',
            'تاريخ المحضر': 'report_date',
            'مركز الشرطة': 'policeStation',
            'طلب تعويض مدني': 'civil_compensation_request',
            'طلب ترحيل الجنحة': 'misdemeanor_transfer_request',
            'نوع المخالفة': 'violation_type',
            'رقم مخالفة المرور': 'traffic_violation_number',
            'نوع المركبة': 'vehicle_type',
            'غرامة مقدرة': 'estimated_fine',
            'طلب إلغاء المخالفة': 'violation_cancellation_request',
            'وجود استئناف سابق': 'has_previous_appeal',
            // --- المدنية fields ---
            'نوع الالتزام': 'obligation_type',
            'مصدر الالتزام': 'obligation_source',
            'نوع العقد': 'contract_type',
            'تاريخ العقد': 'contract_date',
            'مدة العقد (من – إلى)': 'contract_duration_from',
            'نوع العقار': 'property_type',
            'رقم العقار': 'property_number',
            'عنوان العقار': 'property_address',
            'رقم السجل': 'register_number',
            'الصفحة': 'register_page',
            'تاريخ السند': 'document_date',
            'دائرة التسجيل العقاري': 'registration_office',
            'نوع الحق العيني': 'real_right_type',
            'نوع المنقول': 'movable_type',
            'رقم اللوحة': 'plate_number',
            'مكان المنقول': 'movable_location',
            'قيمة الدين': 'debt_value',
            'الغرامات الاتفاقية': 'contractual_penalties',
            'قيمة التعويض': 'compensation_value',
        };
        return englishTranslations[option] || option.charAt(0).toLowerCase() + option.slice(1).replace(/\s+/g, '');
    };

    const handleAddOption = (option) => {
        if (!selectedOptions.includes(option)) {
            setSelectedOptions([...selectedOptions, option]);
        }
        setIsOptionsOpen(false); // Close dropdown after selection
    };

    const handleRemoveOption = (optionToRemove) => {
        setSelectedOptions(selectedOptions.filter(option => option !== optionToRemove));
        const fieldName = getOptionFieldName(optionToRemove);
        setNewCase(prevCase => {
            const updatedCase = { ...prevCase };
            updatedCase[fieldName] = ''; // Clear the value
            return updatedCase;
        });
    };

    // --- HANDLERS FOR CASE TYPE 2 ADD NEW VALUE ---
    const handleAddCaseType2Click = () => {
        setIsAddCaseType2ModalOpen(true);
        setIsCaseType2DropdownOpen(false);
    };

    const handleCloseCaseType2Modal = () => {
        setIsAddCaseType2ModalOpen(false);
        setCaseType2Arabic('');
        setCaseType2SearchQuery('');
    };

    const handleSaveCaseType2 = async () => {
        try {
            if (!caseType2Arabic) {
                alert('يرجى إدخال قيمة النظام');
                return;
            }

            setIsSavingCaseType2(true);

            const { error } = await supabase
                .from('case_options')
                .insert([{ case_type_2: caseType2Arabic, case_type_parent: newCase.caseType || null }]);

            if (error) {
                console.error('Error inserting case_type_2:', error.message);
                alert('حدث خطأ أثناء إضافة القيمة: ' + error.message);
                return;
            }

            // Refresh the caseType2 list
            const { data, error: fetchError } = await supabase.from('case_options').select('id, case_type_2, case_type_parent');
            if (!fetchError && data) {
                const seen = new Set();
                const deduped = data.filter(row => {
                    if (!row.case_type_2) return false;
                    const key = `${row.case_type_2}__${row.case_type_parent || ''}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                setAllCaseType2(deduped);
                setFilteredCaseType2(deduped);
            }
            // Set the newly added value as selected
            setNewCase(prevState => ({ ...prevState, caseType2: caseType2Arabic }));
            handleCloseCaseType2Modal();
        } catch (error) {
            console.error('Error:', error.message);
            alert('حدث خطأ: ' + error.message);
        } finally {
            setIsSavingCaseType2(false);
        }
    };

    // --- HANDLERS FOR LEGAL TYPE (الصفة القانونية) ADD NEW VALUE ---
    const handleAddLegalTypeClick = (target) => {
        setLegalTypeTarget(target);
        setIsAddLegalTypeModalOpen(true);
        if (target === 'client') {
            setIsClientLegalDropdownOpen(false);
            setClientLegalSearchQuery('');
        } else {
            setIsOpponentLegalDropdownOpen(false);
            setOpponentLegalSearchQuery('');
        }
    };

    const handleCloseLegalTypeModal = () => {
        setIsAddLegalTypeModalOpen(false);
        setLegalTypeArabic('');
    };

    const handleSaveLegalType = async () => {
        try {
            if (!legalTypeArabic) {
                alert('يرجى إدخال قيمة النظام');
                return;
            }
            setIsSavingLegalType(true);

            const { error } = await supabase
                .from('case_options')
                .upsert([{ client_type: legalTypeArabic }], { returning: 'minimal' });

            if (error) {
                console.error('Error inserting client_type:', error.message);
                alert('حدث خطأ أثناء إضافة القيمة: ' + error.message);
            } else {
                // Refresh client types list
                const { data: newData, error: fetchError } = await supabase.from('case_options').select('client_type');
                if (!fetchError && newData) {
                    const types = [...new Set(newData.map(item => item.client_type).filter(Boolean))];
                    setClientTypes(types);
                    setFilteredClientLegalTypes(types);
                    setFilteredOpponentLegalTypes(types);
                }
                // Set the newly added value to the correct field
                if (legalTypeTarget === 'client') {
                    setNewCase(prev => ({ ...prev, client_type: legalTypeArabic }));
                } else {
                    setNewCase(prev => ({ ...prev, opponent_type: legalTypeArabic }));
                }
                handleCloseLegalTypeModal();
            }
        } catch (error) {
            console.error('Error:', error.message);
            alert('حدث خطأ: ' + error.message);
        } finally {
            setIsSavingLegalType(false);
        }
    };

    // --- HANDLERS FOR CASE STAGE ADD NEW VALUE ---
    const handleAddCaseStageClick = () => {
        setIsAddCaseStageModalOpen(true);
        setIsCaseStageDropdownOpen(false);
    };

    const handleCloseCaseStageModal = () => {
        setIsAddCaseStageModalOpen(false);
        setCaseStageArabic('');
        setCaseStageSearchQuery('');
    };

    const handleSaveCaseStage = async () => {
        try {
            if (!caseStageArabic) {
                alert('يرجى إدخال قيمة النظام');
                return;
            }

            setIsSavingCaseStage(true);

            const { error } = await supabase
                .from('case_options')
                .upsert([{ case_stage: caseStageArabic }], { returning: 'minimal' });

            if (error) {
                console.error('Error inserting case_stage:', error.message);
                alert('حدث خطأ أثناء إضافة القيمة: ' + error.message);
                return;
            }

            // Refresh the caseStages list
            const { data, error: fetchError } = await supabase.from('case_options').select('id, case_stage');
            if (!fetchError && data) {
                const caseStageOptions = data.map((row) => row.case_stage).filter(Boolean);
                setCaseStages(caseStageOptions);
                setFilteredCaseStages(caseStageOptions);
                // Set the newly added value as selected
                setNewCase(prevState => ({ ...prevState, caseStage: caseStageArabic }));
            }

            handleCloseCaseStageModal();
        } catch (error) {
            console.error('Error:', error.message);
            alert('حدث خطأ: ' + error.message);
        } finally {
            setIsSavingCaseStage(false);
        }
    };

    // --- HANDLERS FOR COURT ADD NEW VALUE ---
    const handleAddCourtClick = () => {
        setIsAddCourtModalOpen(true);
        setIsCourtDropdownOpen(false);
        setCourtSearchQuery('');
    };

    const handleCloseCourtModal = () => {
        setIsAddCourtModalOpen(false);
        setCourtArabic('');
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (courtDropdownRef.current && !courtDropdownRef.current.contains(event.target)) {
                setIsCourtDropdownOpen(false);
                setCourtSearchQuery('');
            }
        };

        if (isCourtDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isCourtDropdownOpen]);

    const handleSaveCourt = async () => {
        try {
            if (!courtArabic) {
                alert('يرجى إدخال قيمة النظام');
                return;
            }

            setIsSavingCourt(true);

            const { error } = await supabase
                .from('case_options')
                .upsert([{ courts: courtArabic }], { returning: 'minimal' });

            if (error) {
                console.error('Error inserting courts:', error.message);
                alert('حدث خطأ أثناء إضافة القيمة: ' + error.message);
            } else {
                // Refresh courts list
                const { data: newData, error: fetchError } = await supabase.from('case_options').select('id, courts');
                if (!fetchError && newData) {
                    const courtOptions = newData.map((row) => row.courts).filter(Boolean);
                    setCourts(courtOptions);
                    setFilteredCourts(courtOptions);
                }
                setNewCase(prev => ({ ...prev, courtAddress: courtArabic }));
                handleCloseCourtModal();
            }
        } catch (error) {
            console.error('Error:', error.message);
            alert('حدث خطأ: ' + error.message);
        } finally {
            setIsSavingCourt(false);
        }
    };

    // --- DRAFTS (المسودات) FUNCTIONS ---
    useEffect(() => {
        if (!adminId) return;

        // Load drafts from Supabase instead of localStorage
        const loadDraftsFromDb = async () => {
            try {
                // Fetch all drafts for this firm
                const { data, error } = await supabase
                    .from('case_drafts')
                    .select('*')
                    .eq('admin_id', adminId)
                    .order('created_at', { ascending: false });

                if (error) {
                    // Fallback to localStorage if table doesn't exist yet (to prevent breaking the page)
                    console.warn('Supabase case_drafts table not found or error, falling back to localStorage:', error.message);
                    const savedDrafts = localStorage.getItem('case_drafts');
                    if (savedDrafts) {
                        const parsedDrafts = JSON.parse(savedDrafts);
                        parsedDrafts.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
                        setDrafts(parsedDrafts);
                    }
                    return;
                }

                if (data) {
                    // Filter: show only drafts by Admin or "الفئة 1" as requested
                    const filtered = data.filter(draft => 
                        draft.creator_role === 'Admin' || draft.creator_role === 'الفئة 1'
                    );
                    setDrafts(filtered);
                }
            } catch (err) {
                console.error('Error loading drafts:', err);
            }
        };
        loadDraftsFromDb();
    }, [adminId]);

    const saveDraft = async () => {
        if (!adminId) {
            alert('يرجى الانتظار حتى تحميل بيانات الحساب');
            return;
        }

        try {
            const draftDataContent = {
                ...newCase,
                editorContent,
                caseDate: caseDate.toISOString(),
                selectedOptions: selectedOptions // Include selected additional options
            };

            const newDraft = {
                admin_id: adminId,
                created_by: userId,
                creator_role: userRole,
                data: draftDataContent,
                created_at: new Date().toISOString()
            };

            // Attempt to save to Supabase
            const { data, error } = await supabase
                .from('case_drafts')
                .insert([newDraft]);

            if (error) {
                // Fallback to localStorage
                console.warn('Falling back to localStorage for draft save:', error.message);
                const draftDataLocal = {
                    id: Date.now().toString(),
                    data: draftDataContent,
                    createdAt: new Date().toISOString(),
                    creator_role: userRole, // Store role in local too for consistent filtering
                    admin_id: adminId
                };
                const existingDrafts = JSON.parse(localStorage.getItem('case_drafts') || '[]');
                existingDrafts.unshift(draftDataLocal);
                const trimmedDrafts = existingDrafts.slice(0, 50);
                localStorage.setItem('case_drafts', JSON.stringify(trimmedDrafts));
                
                // Still update UI (show all local for now if database failed)
                setDrafts(trimmedDrafts.filter(d => d.creator_role === 'Admin' || d.creator_role === 'الفئة 1'));
                alert('تم حفظ المسودة محلياً بنجاح');
            } else {
                // Refresh list from DB
                const { data: refreshedData } = await supabase
                    .from('case_drafts')
                    .select('*')
                    .eq('admin_id', adminId)
                    .order('created_at', { ascending: false });

                if (refreshedData) {
                    setDrafts(refreshedData.filter(draft => 
                        draft.creator_role === 'Admin' || draft.creator_role === 'الفئة 1'
                    ));
                }
                alert('تم حفظ المسودة بنجاح');
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            alert('حدث خطأ أثناء حفظ المسودة');
        }
    };

    const loadDraft = (draft) => {
        try {
            // Check if draft has 'data' property (DB structure) or is the old structure
            const actualData = draft.data;
            const { editorContent: savedContent, caseDate: savedDate, selectedOptions: savedOptions, ...caseData } = actualData;
            
            setNewCase(caseData);
            setEditorContent(savedContent || '');
            if (savedOptions) {
                setSelectedOptions(savedOptions);
            }
            if (savedDate) {
                setCaseDate(new Date(savedDate));
            }
            setShowDrafts(false);
            // Scroll to top of form
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error('Error loading draft:', error);
            alert('حدث خطأ أثناء تحميل المسودة');
        }
    };

    const deleteDraft = async (draftId) => {
        try {
            if (confirm('هل أنت متأكد من حذف هذه المسودة؟')) {
                // Try deleting from Supabase
                const { error } = await supabase
                    .from('case_drafts')
                    .delete()
                    .eq('id', draftId);

                if (error) {
                    // Try local fallback
                    const existingDrafts = JSON.parse(localStorage.getItem('case_drafts') || '[]');
                    const filteredDrafts = existingDrafts.filter(d => d.id !== draftId);
                    localStorage.setItem('case_drafts', JSON.stringify(filteredDrafts));
                    setDrafts(filteredDrafts.filter(d => d.creator_role === 'Admin' || d.creator_role === 'الفئة 1'));
                } else {
                    // Update list
                    setDrafts(prev => prev.filter(d => d.id !== draftId));
                }
            }
        } catch (error) {
            console.error('Error deleting draft:', error);
            alert('حدث خطأ أثناء حذف المسودة');
        }
    };

    const formatDraftDate = (dateString) => {
        try {
            const date = new Date(dateString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours() % 12 || 12).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const ampm = date.getHours() >= 12 ? 'م' : 'ص';
            return `${day}-${month}-${year} الساعة ${hours}:${minutes} ${ampm}`;
        } catch (error) {
            return dateString;
        }
    };

    const CustomInput = React.forwardRef(({ value, onClick, placeholder }, ref) => (
        <input
            className="custom-input date-input"
            onClick={onClick}
            ref={ref}
            value={value}
            readOnly
            placeholder={placeholder || "اختر التاريخ"}
            type="text"
        />
    ));
    CustomInput.displayName = 'CustomInput';

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Layout>
                <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', direction: 'rtl' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#64748b' }}>جاري التحميل...</div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="page-container">
                <form id="case-form" onSubmit={handleSubmit}>
                    <div className="form-grid">
                        {/* --- Single form-section with tabs --- */}
                        <div className="form-section span-5">
                            {/* Section Title with Buttons on the same line */}
                            <div className="section-title-with-actions">
                                <h2 className="section-title-top"><FiBriefcase /> تفاصيل الدعوى</h2>
                                <div className="section-actions-container">
                                    <button
                                        type="button"
                                        onClick={saveDraft}
                                        className="save-draft-button"
                                        title="حفظ المسودة"
                                    >
                                        <FiSave /> حفظ المسودة
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowDrafts(!showDrafts)}
                                        className="drafts-toggle-button"
                                        title="عرض المسودات"
                                    >
                                        المسودات {drafts.length > 0 && <span className="drafts-count">({drafts.length})</span>}
                                    </button>
                                    <button type="submit" className="save-button" disabled={isSubmitting || isLoading}>
                                        <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ الدعوى'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Drafts Hint */}
                            <div className="drafts-hint">
                                <p className="drafts-hint-text">
                                    <strong>المسودات:</strong> احفظ بيانات الدعوى مؤقتاً لاستخدامها لاحقاً وتعبئة الحقول بسرعة. يمكنك حفظ عدة مسودات واسترجاعها عند الحاجة.
                                </p>
                            </div>

                            {/* Drafts Section */}
                            {showDrafts && (
                                <div className="drafts-section">
                                    <h3 className="drafts-title">المسودات</h3>
                                    {drafts.length === 0 ? (
                                        <div className="drafts-empty">لا توجد مسودات محفوظة</div>
                                    ) : (
                                        <div className="drafts-list">
                                            {drafts.map((draft) => (
                                                <div key={draft.id} className="draft-item">
                                                    <div className="draft-content">
                                                        <span className="draft-date">{formatDraftDate(draft.created_at || draft.createdAt)}</span>
                                                    </div>
                                                    <div className="draft-actions">
                                                        <button
                                                            type="button"
                                                            onClick={() => loadDraft(draft)}
                                                            className="draft-action-btn load-btn"
                                                            title="تحميل المسودة"
                                                        >
                                                            <FiArrowLeft />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteDraft(draft.id)}
                                                            className="draft-action-btn delete-btn"
                                                            title="حذف المسودة"
                                                        >
                                                            <FiTrash2 />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* --- Tab Navigation --- */}
                            <div className="form-tabs">
                                <button
                                    type="button"
                                    className={`form-tab ${activeTab === 0 ? 'active' : ''}`}
                                    onClick={() => setActiveTab(0)}
                                >
                                    <FiBriefcase /> تفاصيل الدعوى
                                </button>
                                <button
                                    type="button"
                                    className={`form-tab ${activeTab === 1 ? 'active' : ''}`}
                                    onClick={() => setActiveTab(1)}
                                >
                                    <FiUser /> بيانات الموكل والخصم
                                </button>
                                <button
                                    type="button"
                                    className={`form-tab ${activeTab === 2 ? 'active' : ''}`}
                                    onClick={() => setActiveTab(2)}
                                >
                                    <FiEdit3 /> الملاحظات والعقد
                                </button>
                            </div>

                            {/* --- Tab 1: Case Details --- */}
                            <div className="tab-panel" style={{ display: activeTab === 0 ? 'block' : 'none' }}>
                                <div className="section-grid col-5" style={{ gap: '12px 20px' }}>
                                    <div className="form-field">
                                        <label>نوع الملف</label>
                                        <select name="caseType" value={newCase.caseType} onChange={handleInputChange}>
                                            <option value="">اختر نوع الملف</option>
                                            {caseTypes.map((type, index) => (<option key={index} value={type}>{type}</option>))}
                                        </select>
                                    </div>
                                    <div className="form-field">
                                        <label>نوع الدعوى <span style={{ color: 'red' }}>*</span></label>
                                        <div className="custom-dropdown-wrapper" ref={caseType2DropdownRef}>
                                            <div
                                                className="custom-dropdown-select"
                                                onClick={() => setIsCaseType2DropdownOpen(!isCaseType2DropdownOpen)}
                                            >
                                                <span>{newCase.caseType2 || 'اختر نوع الدعوى'}</span>
                                                <FiChevronDown className={`dropdown-chevron ${isCaseType2DropdownOpen ? 'open' : ''}`} />
                                            </div>
                                            {isCaseType2DropdownOpen && (
                                                <div className="custom-dropdown-menu">
                                                    <div className="custom-dropdown-search">
                                                        <FiSearch className="search-icon" />
                                                        <input
                                                            type="text"
                                                            placeholder="بحث..."
                                                            value={caseType2SearchQuery}
                                                            onChange={(e) => setCaseType2SearchQuery(e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                    <div
                                                        className="custom-dropdown-item add-new-item"
                                                        onClick={handleAddCaseType2Click}
                                                    >
                                                        <FiPlusCircle /> إضافة قيمة جديدة
                                                    </div>
                                                    <div
                                                        className="custom-dropdown-item"
                                                        onClick={() => {
                                                            setNewCase(prev => ({ ...prev, caseType2: '' }));
                                                            setIsCaseType2DropdownOpen(false);
                                                            setCaseType2SearchQuery('');
                                                        }}
                                                    >
                                                        اختر نوع الدعوى
                                                    </div>
                                                    {filteredCaseType2
                                                        .filter(item => !newCase.caseType || item.case_type_parent === newCase.caseType)
                                                        .map((item, index) => (
                                                        <div
                                                            key={index}
                                                            className={`custom-dropdown-item ${newCase.caseType2 === item.case_type_2 ? 'selected' : ''}`}
                                                            onClick={() => {
                                                                setNewCase(prev => ({ ...prev, caseType2: item.case_type_2 }));
                                                                setIsCaseType2DropdownOpen(false);
                                                                setCaseType2SearchQuery('');
                                                            }}
                                                        >
                                                            {item.case_type_2}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label>حالة الدعوى</label>
                                        <select name="caseState" value={newCase.caseState} onChange={handleInputChange}>
                                            <option value="">اختر الحالة...</option>
                                            {caseStates.map((state, index) => (<option key={index} value={state}>{state}</option>))}
                                        </select>
                                    </div>
                                    <div className="form-field">
                                        <label>الرقم المرجعي</label>
                                        <input type="text" name="sponsorName" value={newCase.sponsorName} onChange={handleInputChange} placeholder="الرقم المرجعي للموكل" />
                                    </div>
                                    <div className="form-field">
                                        <label>موضوع القضية</label>
                                        <input
                                            type="text"
                                            name="caseSubject"
                                            value={newCase.caseSubject || ''}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>قيمة الدعوى</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="number"
                                                name="totalAmount"
                                                value={newCase.totalAmount || ''}
                                                onChange={handleInputChange}
                                                placeholder="قيمة المطالبة"
                                                style={{ flex: 1 }}
                                                step="0.01"
                                            />
                                            <select
                                                name="currency"
                                                value={newCase.currency}
                                                onChange={handleInputChange}
                                                style={{ width: '120px' }}
                                            >
                                                <option value="IQD">دينار عراقي</option>
                                                <option value="USD">دولار أمريكي</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label>مرحلة الدعوى</label>
                                        <div className="custom-dropdown-wrapper" ref={caseStageDropdownRef}>
                                            <div
                                                className="custom-dropdown-select"
                                                onClick={() => setIsCaseStageDropdownOpen(!isCaseStageDropdownOpen)}
                                            >
                                                <span>{newCase.caseStage || 'اختر المرحلة...'}</span>
                                                <FiChevronDown className={`dropdown-chevron ${isCaseStageDropdownOpen ? 'open' : ''}`} />
                                            </div>
                                            {isCaseStageDropdownOpen && (
                                                <div className="custom-dropdown-menu">
                                                    <div className="custom-dropdown-search">
                                                        <FiSearch className="search-icon" />
                                                        <input
                                                            type="text"
                                                            placeholder="بحث..."
                                                            value={caseStageSearchQuery}
                                                            onChange={(e) => setCaseStageSearchQuery(e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                    <div
                                                        className="custom-dropdown-item add-new-item"
                                                        onClick={handleAddCaseStageClick}
                                                    >
                                                        <FiPlusCircle /> إضافة قيمة جديدة
                                                    </div>
                                                    <div
                                                        className="custom-dropdown-item"
                                                        onClick={() => {
                                                            setNewCase(prev => ({ ...prev, caseStage: '' }));
                                                            setIsCaseStageDropdownOpen(false);
                                                            setCaseStageSearchQuery('');
                                                        }}
                                                    >
                                                        اختر المرحلة...
                                                    </div>
                                                    {filteredCaseStages.map((stage, index) => (
                                                        <div
                                                            key={index}
                                                            className={`custom-dropdown-item ${newCase.caseStage === stage ? 'selected' : ''}`}
                                                            onClick={() => {
                                                                setNewCase(prev => ({ ...prev, caseStage: stage }));
                                                                setIsCaseStageDropdownOpen(false);
                                                                setCaseStageSearchQuery('');
                                                            }}
                                                        >
                                                            {stage}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label>المحكمة</label>
                                        <div className="custom-dropdown-wrapper" ref={courtDropdownRef}>
                                            <div
                                                className="custom-dropdown-select"
                                                onClick={() => setIsCourtDropdownOpen(!isCourtDropdownOpen)}
                                            >
                                                <span>{newCase.courtAddress || 'اختر المحكمة...'}</span>
                                                <FiChevronDown className={`dropdown-chevron ${isCourtDropdownOpen ? 'open' : ''}`} />
                                            </div>
                                            {isCourtDropdownOpen && (
                                                <div className="custom-dropdown-menu">
                                                    <div className="custom-dropdown-search">
                                                        <FiSearch className="search-icon" />
                                                        <input
                                                            type="text"
                                                            placeholder="بحث..."
                                                            value={courtSearchQuery}
                                                            onChange={(e) => setCourtSearchQuery(e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                    <div
                                                        className="custom-dropdown-item add-new-item"
                                                        onClick={handleAddCourtClick}
                                                    >
                                                        <FiPlusCircle /> إضافة قيمة جديدة
                                                    </div>
                                                    <div
                                                        className="custom-dropdown-item"
                                                        onClick={() => {
                                                            setNewCase(prev => ({ ...prev, courtAddress: '' }));
                                                            setIsCourtDropdownOpen(false);
                                                            setCourtSearchQuery('');
                                                        }}
                                                    >
                                                        اختر المحكمة...
                                                    </div>
                                                    {filteredCourts.filter(c => c).map((court, index) => (
                                                        <div
                                                            key={index}
                                                            className={`custom-dropdown-item ${newCase.courtAddress === court ? 'selected' : ''}`}
                                                            onClick={() => {
                                                                setNewCase(prev => ({ ...prev, courtAddress: court }));
                                                                setIsCourtDropdownOpen(false);
                                                                setCourtSearchQuery('');
                                                            }}
                                                        >
                                                            {court}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label>المدنية/المحافظة</label>
                                        <select name="Governorate" value={newCase.Governorate} onChange={handleInputChange}>
                                            <option value="">اختر المدينة...</option>
                                            {iraqiGovernorates.map(g => (<option key={g} value={g}>{g}</option>))}
                                        </select>
                                    </div>
                                    <div className="form-field">
                                        <label>تاريخ التكليف</label>
                                        <DatePicker selected={caseDate} onChange={(date) => setCaseDate(date)} dateFormat="yyyy-MM-dd" customInput={<CustomInput placeholder="تاريخ التكليف" />} />
                                    </div>
                                    <div className="form-field">
                                        <label>المحامي المكلف</label>
                                        <select name="caseLawyer" value={newCase.caseLawyer} onChange={handleInputChange}>
                                            <option value="">اختر...</option>
                                            {lawyerNames.map((lawyer) => (<option key={lawyer} value={lawyer}>{lawyer}</option>))}
                                        </select>
                                    </div>
                                    <div className="form-field">
                                        <label>رقم الدعوى في المحكمة</label>
                                        <input type="text" name="case_number_in_court" value={newCase.case_number_in_court} onChange={handleInputChange} placeholder="رقم الدعوى في المحكمة" />
                                    </div>
                                    {newCase.caseType === 'الجزائية' ? (
                                        <>
                                            <div className="form-field">
                                                <label>المادة القانونية (قانون العقوبات)</label>
                                                <div 
                                                    className="input-with-icon-wrapper" 
                                                    onClick={() => setIsPenalCodeModalOpen(true)}
                                                >
                                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                        <FiBookOpen style={{ position: 'absolute', right: '12px', color: '#64748b' }} />
                                                        <input 
                                                            type="text" 
                                                            readOnly 
                                                            value={newCase.legalArticle} 
                                                            placeholder="اختر المادة من قانون العقوبات..." 
                                                            style={{ 
                                                                cursor: 'pointer',
                                                                paddingRight: '36px',
                                                                width: '100%',
                                                                height: '50px',
                                                                border: '1px solid #d1d5db',
                                                                borderRadius: '8px',
                                                                fontSize: '0.9375rem',
                                                                backgroundColor: '#f8fafc'
                                                            }} 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="form-field">
                                                <label>المادة القانونية (أصول المحاكمات الجزائية)</label>
                                                <div 
                                                    className="input-with-icon-wrapper" 
                                                    onClick={() => setIsCriminalProceduresModalOpen(true)}
                                                >
                                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                        <FiBookOpen style={{ position: 'absolute', right: '12px', color: '#64748b' }} />
                                                        <input 
                                                            type="text" 
                                                            readOnly 
                                                            value={newCase.criminalProceduresArticle} 
                                                            placeholder="اختر المادة من قانون أصول المحاكمات الجزائية..." 
                                                            style={{ 
                                                                cursor: 'pointer',
                                                                paddingRight: '36px',
                                                                width: '100%',
                                                                height: '50px',
                                                                border: '1px solid #d1d5db',
                                                                borderRadius: '8px',
                                                                fontSize: '0.9375rem',
                                                                backgroundColor: '#f8fafc'
                                                            }} 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : newCase.caseType === 'الشرعية' ? (
                                        <div className="form-field">
                                            <label>المادة القانونية (قانون الأحوال الشخصية)</label>
                                            <div 
                                                className="input-with-icon-wrapper" 
                                                onClick={() => setIsPersonalStatusModalOpen(true)}
                                            >
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                    <FiBookOpen style={{ position: 'absolute', right: '12px', color: '#64748b' }} />
                                                    <input 
                                                        type="text" 
                                                        readOnly 
                                                        value={newCase.legalArticle} 
                                                        placeholder="اختر المادة من قانون الأحوال الشخصية..." 
                                                        style={{ 
                                                            cursor: 'pointer',
                                                            paddingRight: '36px',
                                                            width: '100%',
                                                            height: '50px',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: '8px',
                                                            fontSize: '0.9375rem',
                                                            backgroundColor: '#f8fafc'
                                                        }} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : newCase.caseType === 'المدنية' ? (
                                        <div className="form-field">
                                            <label>المادة القانونية (القانون المدني)</label>
                                            <div 
                                                className="input-with-icon-wrapper" 
                                                onClick={() => setIsCivilLawModalOpen(true)}
                                            >
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                    <FiBookOpen style={{ position: 'absolute', right: '12px', color: '#64748b' }} />
                                                    <input 
                                                        type="text" 
                                                        readOnly 
                                                        value={newCase.legalArticle} 
                                                        placeholder="اختر المادة من القانون المدني..." 
                                                        style={{ 
                                                            cursor: 'pointer',
                                                            paddingRight: '36px',
                                                            width: '100%',
                                                            height: '50px',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: '8px',
                                                            fontSize: '0.9375rem',
                                                            backgroundColor: '#f8fafc'
                                                        }} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="form-field">
                                            <label>المادة القانونية</label>
                                            <input type="text" name="legalArticle" value={newCase.legalArticle} onChange={handleInputChange} placeholder="المادة القانونية" />
                                        </div>
                                    )}

                                    {/* Selected extra option fields rendered inline */}
                                    {selectedOptions.map(option => {
                                        const fieldName = getOptionFieldName(option);
                                        return (
                                            <div className="form-field with-remove" key={option}>
                                                <label>{option}</label>
                                                <div className="input-wrapper">
                                                    <input
                                                        type="text"
                                                        name={fieldName}
                                                        value={newCase[fieldName] || ''}
                                                        onChange={handleInputChange}
                                                        autoComplete="off"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="remove-option-btn"
                                                        title={`إزالة حقل ${option}`}
                                                        onClick={() => handleRemoveOption(option)}
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* --- Extra Options as Pill Buttons --- */}
                                {newCase.caseType && caseTypeOptionsMap[newCase.caseType] && (
                                    <div className="extra-options-section span-5">
                                        <h2 className="section-title sub-section-title"><FiPlusCircle /> خيارات اخرى لإضافتها للملف</h2>
                                        <div className="option-pills-grid">
                                            {allAdditionalOptions.map(option => (
                                                <button
                                                    key={option}
                                                    type="button"
                                                    className={`option-pill ${selectedOptions.includes(option) ? 'active' : ''}`}
                                                    onClick={() => {
                                                        if (selectedOptions.includes(option)) {
                                                            handleRemoveOption(option);
                                                        } else {
                                                            handleAddOption(option);
                                                        }
                                                    }}
                                                >
                                                    <span className="pill-icon">{selectedOptions.includes(option) ? '✓' : '○'}</span>
                                                    <span>{option}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}


                            </div>

                            {/* --- Tab 2: Client & Opponent --- */}
                            <div className="tab-panel" style={{ display: activeTab === 1 ? 'block' : 'none' }}>
                                <div className="section-grid col-2" style={{ gap: '12px 24px' }}>
                                    <div>
                                        <h2 className="section-title sub-section-title"><FiUser /> بيانات الموكل</h2>
                                        <div className="section-grid col-2" style={{ gap: '10px 16px' }}>
                                            <div className="form-field span-2"><label htmlFor="client_name">اسم الموكل</label><select id="client_name" name="client_name" value={newCase.client_name} onChange={handleInputChange} disabled={isLoading} required><option value="">{isLoading ? "..." : "اختر"}</option>{clientNames.map((c) => (<option key={c.id} value={c.client_name}>{c.client_name}</option>))}</select></div>
                                            <div className="form-field"><label>نوع الموكل</label><input type="text" name="client_adult_child" value={newCase.client_adult_child} readOnly placeholder="-" /></div>
                                            <div className="form-field">
                                                <label>الصفة القانونية</label>
                                                <div className="custom-dropdown-wrapper" ref={clientLegalDropdownRef}>
                                                    <div className="custom-dropdown-select" onClick={() => setIsClientLegalDropdownOpen(!isClientLegalDropdownOpen)}>
                                                        <span>{newCase.client_type || 'اختر...'}</span>
                                                        <FiChevronDown className={`dropdown-chevron ${isClientLegalDropdownOpen ? 'open' : ''}`} />
                                                    </div>
                                                    {isClientLegalDropdownOpen && (
                                                        <div className="custom-dropdown-menu">
                                                            <div className="custom-dropdown-search">
                                                                <FiSearch className="search-icon" />
                                                                <input type="text" placeholder="بحث..." value={clientLegalSearchQuery} onChange={(e) => setClientLegalSearchQuery(e.target.value)} onClick={(e) => e.stopPropagation()} />
                                                            </div>
                                                            <div className="custom-dropdown-item add-new-item" onClick={() => handleAddLegalTypeClick('client')}>
                                                                <FiPlusCircle /> إضافة صفة قانونية جديدة
                                                            </div>
                                                            <div className="custom-dropdown-item" onClick={() => { setNewCase(prev => ({ ...prev, client_type: '' })); setIsClientLegalDropdownOpen(false); setClientLegalSearchQuery(''); }}>
                                                                اختر...
                                                            </div>
                                                            {filteredClientLegalTypes.map((t, i) => (
                                                                <div key={i} className={`custom-dropdown-item ${newCase.client_type === t ? 'selected' : ''}`} onClick={() => { setNewCase(prev => ({ ...prev, client_type: t })); setIsClientLegalDropdownOpen(false); setClientLegalSearchQuery(''); }}>
                                                                    {t}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="form-field"><label>الشكل القانوني</label><input type="text" name="legal_form" value={newCase.legal_form} readOnly placeholder="-" /></div>
                                            <div className="form-field"><label>رقم الهوية</label><input type="text" name="id_number" value={newCase.id_number} readOnly placeholder="-" /></div>
                                        </div>
                                    </div>
                                    <div>
                                        <h2 className="section-title sub-section-title"><FiUsers /> بيانات الخصم</h2>
                                        <div className="section-grid col-2" style={{ gap: '10px 16px' }}>
                                            <div className="form-field span-2"><label>اسم الخصم</label><input type="text" name="opponentName" value={newCase.opponentName} onChange={handleInputChange} /></div>
                                            <div className="form-field">
                                                <label>الصفة القانونية</label>
                                                <div className="custom-dropdown-wrapper" ref={opponentLegalDropdownRef}>
                                                    <div className="custom-dropdown-select" onClick={() => setIsOpponentLegalDropdownOpen(!isOpponentLegalDropdownOpen)}>
                                                        <span>{newCase.opponent_type || 'اختر...'}</span>
                                                        <FiChevronDown className={`dropdown-chevron ${isOpponentLegalDropdownOpen ? 'open' : ''}`} />
                                                    </div>
                                                    {isOpponentLegalDropdownOpen && (
                                                        <div className="custom-dropdown-menu">
                                                            <div className="custom-dropdown-search">
                                                                <FiSearch className="search-icon" />
                                                                <input type="text" placeholder="بحث..." value={opponentLegalSearchQuery} onChange={(e) => setOpponentLegalSearchQuery(e.target.value)} onClick={(e) => e.stopPropagation()} />
                                                            </div>
                                                            <div className="custom-dropdown-item add-new-item" onClick={() => handleAddLegalTypeClick('opponent')}>
                                                                <FiPlusCircle /> إضافة صفة قانونية جديدة
                                                            </div>
                                                            <div className="custom-dropdown-item" onClick={() => { setNewCase(prev => ({ ...prev, opponent_type: '' })); setIsOpponentLegalDropdownOpen(false); setOpponentLegalSearchQuery(''); }}>
                                                                اختر...
                                                            </div>
                                                            {filteredOpponentLegalTypes.map((t, i) => (
                                                                <div key={i} className={`custom-dropdown-item ${newCase.opponent_type === t ? 'selected' : ''}`} onClick={() => { setNewCase(prev => ({ ...prev, opponent_type: t })); setIsOpponentLegalDropdownOpen(false); setOpponentLegalSearchQuery(''); }}>
                                                                    {t}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="form-field"><label>هاتف الخصم</label><ContactPicker value={newCase.opponentPhone} onChange={(val) => handleInputChange({ target: { name: 'opponentPhone', value: val } })} placeholder="07XX XXX XXXX" /></div>
                                            <div className="form-field span-2"><label>عنوان الخصم</label><input type="text" name="opponentAddress" value={newCase.opponentAddress} onChange={handleInputChange} /></div>
                                            <div className="form-field"><label>محامي الخصم</label><input type="text" name="opponentLawyer" value={newCase.opponentLawyer} onChange={handleInputChange} /></div>
                                            <div className="form-field"><label>هاتف محامي الخصم</label><ContactPicker value={newCase.opponentLawyerPhone} onChange={(val) => handleInputChange({ target: { name: 'opponentLawyerPhone', value: val } })} placeholder="07XX XXX XXXX" /></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- Tab 3: Notes & Contract --- */}
                            <div className="tab-panel" style={{ display: activeTab === 2 ? 'block' : 'none' }}>
                                <div className="notes-contract-container">
                                    <div className="notes-section">
                                        <h2 className="section-title sub-section-title"><FiEdit3 /> ملاحظات</h2>
                                        <div className="form-field">
                                            <textarea name="Notes" value={newCase.Notes} onChange={handleInputChange} rows="5" />
                                        </div>
                                    </div>
                                    <div className="contract-section">
                                        <h2 className="section-title sub-section-title"><FiFileText /> العقد</h2>
                                        <div className="editor-container">
                                            <SunEditor setContents={editorContent} onChange={setEditorContent} height="180px" setOptions={{ buttonList: [['font', 'fontSize', 'formatBlock'], ['bold', 'underline', 'italic', 'strike'], ['fontColor', 'hiliteColor', 'removeFormat'], ['align', 'horizontalRule', 'list', 'table'], ['link', 'image', 'video'], ['undo', 'redo', 'fullScreen', 'print']], rtl: true }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Modal for adding new case type 2 */}
                {isAddCaseType2ModalOpen && (
                    <div className="modal-overlay" onClick={handleCloseCaseType2Modal}>
                        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                            <h2 className="modal-title">قيمة جديدة - نوع الدعوى</h2>
                            <div className="modal-content-inline">
                                <div className="modal-input-group-inline">
                                    <label className="modal-label">
                                        أضافة نوع دعوى <span className="required-asterisk">*</span>
                                    </label>
                                    <div className="input-with-icon-wrapper">
                                        <svg className="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M8 1V15M1 8H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                        <input
                                            type="text"
                                            className="modal-input"
                                            value={caseType2Arabic}
                                            onChange={(e) => setCaseType2Arabic(e.target.value)}
                                            placeholder="قيمة النظام الجديدة (العربية)"
                                        />
                                    </div>
                                </div>
                                <div className="modal-actions-inline">
                                    <button
                                        type="button"
                                        className="modal-button modal-button-primary"
                                        onClick={handleSaveCaseType2}
                                        disabled={!caseType2Arabic || isSavingCaseType2}
                                    >
                                        {isSavingCaseType2 ? 'جاري الحفظ...' : 'إضافة'}
                                    </button>
                                    <button
                                        type="button"
                                        className="modal-button modal-button-secondary"
                                        onClick={handleCloseCaseType2Modal}
                                        disabled={isSavingCaseType2}
                                    >
                                        إغلاق
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal for adding new case stage */}
                {isAddCaseStageModalOpen && (
                    <div className="modal-overlay" onClick={handleCloseCaseStageModal}>
                        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                            <h2 className="modal-title">قيمة جديدة - مرحلة الدعوى</h2>
                            <div className="modal-content-inline">
                                <div className="modal-input-group-inline">
                                    <label className="modal-label">
                                        أضافة مرحلة دعوى <span className="required-asterisk">*</span>
                                    </label>
                                    <div className="input-with-icon-wrapper">
                                        <svg className="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M8 1V15M1 8H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                        <input
                                            type="text"
                                            className="modal-input"
                                            value={caseStageArabic}
                                            onChange={(e) => setCaseStageArabic(e.target.value)}
                                            placeholder="قيمة النظام الجديدة (العربية)"
                                        />
                                    </div>
                                </div>
                                <div className="modal-actions-inline">
                                    <button
                                        type="button"
                                        className="modal-button modal-button-primary"
                                        onClick={handleSaveCaseStage}
                                        disabled={!caseStageArabic || isSavingCaseStage}
                                    >
                                        {isSavingCaseStage ? 'جاري الحفظ...' : 'إضافة'}
                                    </button>
                                    <button
                                        type="button"
                                        className="modal-button modal-button-secondary"
                                        onClick={handleCloseCaseStageModal}
                                        disabled={isSavingCaseStage}
                                    >
                                        إغلاق
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal for adding new court */}
                {isAddCourtModalOpen && (
                    <div className="modal-overlay" onClick={handleCloseCourtModal}>
                        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                            <h2 className="modal-title">قيمة جديدة - المحكمة</h2>
                            <div className="modal-content-inline">
                                <div className="modal-input-group-inline">
                                    <label className="modal-label">
                                        أضافة محكمة <span className="required-asterisk">*</span>
                                    </label>
                                    <div className="input-with-icon-wrapper">
                                        <svg className="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M8 1V15M1 8H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                        <input
                                            type="text"
                                            className="modal-input"
                                            value={courtArabic}
                                            onChange={(e) => setCourtArabic(e.target.value)}
                                            placeholder="قيمة النظام الجديدة (العربية)"
                                        />
                                    </div>
                                </div>
                                <div className="modal-actions-inline">
                                    <button
                                        type="button"
                                        className="modal-button modal-button-primary"
                                        onClick={handleSaveCourt}
                                        disabled={!courtArabic || isSavingCourt}
                                    >
                                        {isSavingCourt ? 'جاري الحفظ...' : 'إضافة'}
                                    </button>
                                    <button
                                        type="button"
                                        className="modal-button modal-button-secondary"
                                        onClick={handleCloseCourtModal}
                                        disabled={isSavingCourt}
                                    >
                                        إغلاق
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal for adding new legal type (الصفة القانونية) */}
                {isAddLegalTypeModalOpen && (
                    <div className="modal-overlay" onClick={handleCloseLegalTypeModal}>
                        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                            <h2 className="modal-title">قيمة جديدة - الصفة القانونية ({legalTypeTarget === 'client' ? 'الموكل' : 'الخصم'})</h2>
                            <div className="modal-content-inline">
                                <div className="modal-input-group-inline">
                                    <label className="modal-label">
                                        أضافة صفة قانونية <span className="required-asterisk">*</span>
                                    </label>
                                    <div className="input-with-icon-wrapper">
                                        <svg className="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M8 1V15M1 8H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                        <input
                                            type="text"
                                            className="modal-input"
                                            value={legalTypeArabic}
                                            onChange={(e) => setLegalTypeArabic(e.target.value)}
                                            placeholder="قيمة النظام الجديدة (العربية)"
                                        />
                                    </div>
                                </div>
                                <div className="modal-actions-inline">
                                    <button
                                        type="button"
                                        className="modal-button modal-button-primary"
                                        onClick={handleSaveLegalType}
                                        disabled={!legalTypeArabic || isSavingLegalType}
                                    >
                                        {isSavingLegalType ? 'جاري الحفظ...' : 'إضافة'}
                                    </button>
                                    <button
                                        type="button"
                                        className="modal-button modal-button-secondary"
                                        onClick={handleCloseLegalTypeModal}
                                        disabled={isSavingLegalType}
                                    >
                                        إغلاق
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Penal Code Selection Modal */}
                {isPenalCodeModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsPenalCodeModalOpen(false)}>
                        <div className="modal-container" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 className="modal-title" style={{ margin: 0 }}>اختر المادة القانونية (قانون العقوبات)</h2>
                                <button onClick={() => setIsPenalCodeModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                    <FiX size={24} />
                                </button>
                            </div>
                            
                            <div style={{ position: 'relative', marginBottom: '20px' }}>
                                <FiSearch size={20} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder="ابحث برقم المادة أو النص..."
                                    value={penalSearchQuery}
                                    onChange={(e) => setPenalSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '14px 48px 14px 16px',
                                        fontSize: '15px',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '10px',
                                        outline: 'none',
                                        background: 'white'
                                    }}
                                />
                            </div>

                            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
                                {isPenalLoading ? (
                                    <div style={{ textAlign: 'center', padding: '40px' }}>جاري التحميل...</div>
                                ) : filteredPenalCodes.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>لا توجد مواد تطابق البحث</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {filteredPenalCodes.map((code) => (
                                            <div
                                                key={code.id}
                                                onClick={() => {
                                                    handleInputChange({ target: { name: 'legalArticle', value: `المادة ${code.article_number} - ${code.article_content.substring(0, 100)}${code.article_content.length > 100 ? '...' : ''}` } });
                                                    setIsPenalCodeModalOpen(false);
                                                }}
                                                style={{
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    padding: '16px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    background: 'white'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white'; }}
                                            >
                                                <div style={{ fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>
                                                    المادة {code.article_number}
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
                                                    {code.article_content}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Personal Status Code Selection Modal */}
                {isPersonalStatusModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsPersonalStatusModalOpen(false)}>
                        <div className="modal-container" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 className="modal-title" style={{ margin: 0 }}>اختر المادة القانونية (قانون الأحوال الشخصية)</h2>
                                <button onClick={() => setIsPersonalStatusModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                    <FiX size={24} />
                                </button>
                            </div>
                            
                            <div style={{ position: 'relative', marginBottom: '20px' }}>
                                <FiSearch size={20} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder="ابحث برقم المادة أو النص..."
                                    value={personalStatusSearchQuery}
                                    onChange={(e) => setPersonalStatusSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '14px 48px 14px 16px',
                                        fontSize: '15px',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '10px',
                                        outline: 'none',
                                        background: 'white'
                                    }}
                                />
                            </div>

                            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
                                {isPersonalStatusLoading ? (
                                    <div style={{ textAlign: 'center', padding: '40px' }}>جاري التحميل...</div>
                                ) : filteredPersonalStatusCodes.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>لا توجد مواد تطابق البحث</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {filteredPersonalStatusCodes.map((code) => (
                                            <div
                                                key={code.id}
                                                onClick={() => {
                                                    const contentPreview = code.article_text ? code.article_text.substring(0, 100) + (code.article_text.length > 100 ? '...' : '') : '';
                                                    handleInputChange({ target: { name: 'legalArticle', value: `المادة ${code.article_no} - ${contentPreview}` } });
                                                    setIsPersonalStatusModalOpen(false);
                                                }}
                                                style={{
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    padding: '16px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    background: 'white'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.background = '#fef2f2'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white'; }}
                                            >
                                                <div style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: '8px' }}>
                                                    المادة {code.article_no}
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
                                                    {code.article_text}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Civil Law Code Selection Modal */}
                {isCivilLawModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsCivilLawModalOpen(false)}>
                        <div className="modal-container" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 className="modal-title" style={{ margin: 0 }}>اختر المادة القانونية (القانون المدني)</h2>
                                <button onClick={() => setIsCivilLawModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                    <FiX size={24} />
                                </button>
                            </div>
                            
                            <div style={{ position: 'relative', marginBottom: '20px' }}>
                                <FiSearch size={20} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder="ابحث برقم المادة أو النص..."
                                    value={civilLawSearchQuery}
                                    onChange={(e) => setCivilLawSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '14px 48px 14px 16px',
                                        fontSize: '15px',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '10px',
                                        outline: 'none',
                                        background: 'white'
                                    }}
                                />
                            </div>

                            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
                                {isCivilLawLoading ? (
                                    <div style={{ textAlign: 'center', padding: '40px' }}>جاري التحميل...</div>
                                ) : filteredCivilLawCodes.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>لا توجد مواد تطابق البحث</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {filteredCivilLawCodes.map((code) => (
                                            <div
                                                key={code.id}
                                                onClick={() => {
                                                    const contentPreview = code.article_content ? code.article_content.substring(0, 100) + (code.article_content.length > 100 ? '...' : '') : '';
                                                    handleInputChange({ target: { name: 'legalArticle', value: `المادة ${code.article_number} - ${contentPreview}` } });
                                                    setIsCivilLawModalOpen(false);
                                                }}
                                                style={{
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    padding: '16px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    background: 'white'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = '#ecfdf5'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white'; }}
                                            >
                                                <div style={{ fontWeight: 'bold', color: '#059669', marginBottom: '8px' }}>
                                                    المادة {code.article_number}
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
                                                    {code.article_content}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Criminal Procedures Code Selection Modal */}
                {isCriminalProceduresModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsCriminalProceduresModalOpen(false)}>
                        <div className="modal-container" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 className="modal-title" style={{ margin: 0 }}>اختر المادة القانونية (قانون أصول المحاكمات الجزائية)</h2>
                                <button onClick={() => setIsCriminalProceduresModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                    <FiX size={24} />
                                </button>
                            </div>
                            
                            <div style={{ position: 'relative', marginBottom: '20px' }}>
                                <FiSearch size={20} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder="ابحث برقم المادة أو النص..."
                                    value={criminalProceduresSearchQuery}
                                    onChange={(e) => setCriminalProceduresSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '14px 48px 14px 16px',
                                        fontSize: '15px',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '10px',
                                        outline: 'none',
                                        background: 'white'
                                    }}
                                />
                            </div>

                            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
                                {isCriminalProceduresLoading ? (
                                    <div style={{ textAlign: 'center', padding: '40px' }}>جاري التحميل...</div>
                                ) : filteredCriminalProceduresCodes.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>لا توجد مواد تطابق البحث</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {filteredCriminalProceduresCodes.map((code) => (
                                            <div
                                                key={code.id}
                                                onClick={() => {
                                                    const contentPreview = code.article_content ? code.article_content.substring(0, 100) + (code.article_content.length > 100 ? '...' : '') : '';
                                                    handleInputChange({ target: { name: 'criminalProceduresArticle', value: `المادة ${code.article_number} - ${contentPreview}` } });
                                                    setIsCriminalProceduresModalOpen(false);
                                                }}
                                                style={{
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    padding: '16px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    background: 'white'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#a855f7'; e.currentTarget.style.background = '#faf5ff'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white'; }}
                                            >
                                                <div style={{ fontWeight: 'bold', color: '#a855f7', marginBottom: '8px' }}>
                                                    المادة {code.article_number}
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
                                                    {code.article_content}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                .page-container {
                    padding: 24px 24px 32px 24px;
                    background: transparent;
                    font-family: 'Almarai', 'Cairo', sans-serif;
                    direction: rtl;
                    max-width: 100%;
                    margin: 0;
                    min-height: 100vh;
                    width: 100%;
                }

                /* Section Title with Actions Container */
                .section-title-with-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                    padding-bottom: 8px;
                    border-bottom: 2px solid #2563EB;
                    gap: 20px;
                    min-height: 60px;
                }

                /* Section Title at Top */
                .section-title-top {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #1f2937;
                    margin: 0;
                    font-family: 'Almarai', 'Cairo', sans-serif;
                    flex: 1;
                }

                .section-title-top svg {
                    color: #2563EB;
                    width: 24px;
                    height: 24px;
                }

                /* Actions Container */
                .section-actions-container {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                    flex-wrap: nowrap;
                    flex-shrink: 0;
                    justify-content: flex-end;
                }

                .section-title-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    padding-bottom: 12px;
                    border-bottom: 2px solid #e5e7eb;
                }

                .section-title-container .save-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    background: #2563EB;
                    color: white;
                    padding: 14px 24px;
                    border-radius: 12px;
                    font-family: 'Almarai', 'Cairo', sans-serif;
                    font-weight: 700;
                    font-size: 1.25rem;
                    letter-spacing: -0.01em;
                    text-decoration: none;
                    transition: none;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35), 0 2px 6px rgba(37, 99, 235, 0.2);
                    width: 180px;
                    height: 48px;
                    margin: 0;
                    white-space: nowrap;
                }
                
                .section-title-container .save-button:hover:not(:disabled) {
                    background: #2563EB;
                    transform: none;
                    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35), 0 2px 6px rgba(37, 99, 235, 0.2);
                }
                
                .save-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    background: #2563EB;
                    color: white;
                    padding: 14px 24px;
                    border-radius: 12px;
                    font-family: 'Almarai', 'Cairo', sans-serif;
                    font-weight: 700;
                    font-size: 1.25rem;
                    letter-spacing: -0.01em;
                    text-decoration: none;
                    transition: none;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35), 0 2px 6px rgba(37, 99, 235, 0.2);
                    width: 180px;
                    height: 48px;
                    white-space: nowrap;
                }
                .save-button:hover:not(:disabled) {
                    transform: none;
                    background: #2563EB;
                    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35), 0 2px 6px rgba(37, 99, 235, 0.2);
                }
                .save-button:active:not(:disabled) {
                    transform: none;
                    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35), 0 2px 6px rgba(37, 99, 235, 0.2);
                }
                .save-button:disabled {
                    background: #9ca3af;
                    cursor: not-allowed;
                    box-shadow: none;
                    transform: none;
                }

                /* Drafts Section Styles - Logo Inspired Colors */
                .save-draft-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 10px 18px;
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: none;
                    font-family: 'Almarai', 'Cairo', sans-serif;
                    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2);
                }

                .save-draft-button:hover {
                    background: #10b981;
                    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2);
                    transform: none;
                    color: white;
                }

                .drafts-toggle-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding: 10px 18px;
                    background: #22D3EE;
                    color: #0F172A;
                    border: none;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: none;
                    font-family: 'Almarai', 'Cairo', sans-serif;
                    box-shadow: 0 2px 6px rgba(34, 211, 238, 0.2);
                }

                .drafts-toggle-button:hover {
                    background: #22D3EE;
                    box-shadow: 0 2px 6px rgba(34, 211, 238, 0.2);
                    transform: none;
                }

                .drafts-count {
                    background: rgba(255, 255, 255, 0.3);
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 0.75rem;
                }

                /* Drafts Hint */
                .drafts-hint {
                    margin-bottom: 20px;
                    padding: 14px 18px;
                    background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%);
                    border: 1px solid #BAE6FD;
                    border-radius: 10px;
                    border-right: 4px solid #22D3EE;
                }

                .drafts-hint-text {
                    margin: 0;
                    font-size: 0.875rem;
                    color: #0F172A;
                    line-height: 1.6;
                    font-family: 'Almarai', 'Cairo', sans-serif;
                }

                .drafts-hint-text strong {
                    color: #2563EB;
                    font-weight: 700;
                }

                .drafts-section {
                    margin-top: 24px;
                    margin-bottom: 24px;
                    padding: 20px;
                    background: #ffffff;
                    border-radius: 12px;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                }

                .drafts-title {
                    font-size: 1.125rem;
                    font-weight: 700;
                    color: #1f2937;
                    margin-bottom: 16px;
                    font-family: 'Almarai', 'Cairo', sans-serif;
                }

                .drafts-empty {
                    text-align: center;
                    padding: 32px;
                    color: #6b7280;
                    font-size: 0.875rem;
                }

                .drafts-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .draft-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 14px 16px;
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                }

                .draft-item:hover {
                    background: #f3f4f6;
                    border-color: #d1d5db;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                }

                .draft-content {
                    flex: 1;
                }

                .draft-date {
                    font-size: 0.875rem;
                    color: #374151;
                    font-weight: 500;
                    font-family: 'Almarai', 'Cairo', sans-serif;
                }

                .draft-actions {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }

                .draft-action-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 1rem;
                }

                .draft-action-btn.load-btn {
                    background: #2563EB;
                    color: white;
                    transition: none;
                }

                .draft-action-btn.load-btn:hover {
                    background: #2563EB;
                    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
                    transform: none;
                }

                .draft-action-btn.delete-btn {
                    background: #ef4444;
                    color: white;
                    transition: none;
                }

                .draft-action-btn.delete-btn:hover {
                    background: #ef4444;
                    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
                    transform: none;
                }

                @media (max-width: 768px) {
                    .section-title-with-actions {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 12px;
                        margin-bottom: 16px;
                    }

                    .section-title-top {
                        font-size: 18px;
                        width: 100%;
                    }

                    .section-actions-container {
                        flex-direction: column;
                        width: 100%;
                    }

                    .section-title-container {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 12px;
                    }

                    .section-title-container > div {
                        width: 100%;
                        flex-direction: column;
                    }

                    .save-draft-button,
                    .drafts-toggle-button,
                    .save-button {
                        width: 100%;
                    }

                    .draft-item {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 12px;
                    }

                    .draft-actions {
                        width: 100%;
                        justify-content: flex-end;
                    }
                }

                /* Tab Navigation */
                .form-tabs {
                    display: flex;
                    gap: 0;
                    margin-bottom: 28px;
                    border-bottom: 2px solid #e5e7eb;
                    overflow-x: auto;
                    overflow-y: hidden;
                    -webkit-overflow-scrolling: touch;
                }
                
                .form-tabs::-webkit-scrollbar {
                    display: none;
                }

                .form-tab {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 14px 24px;
                    border: none;
                    background: none;
                    font-family: 'Almarai', 'Cairo', sans-serif;
                    font-size: 0.9375rem;
                    font-weight: 600;
                    color: #6b7280;
                    cursor: pointer;
                    position: relative;
                    white-space: nowrap;
                    transition: color 0.2s ease;
                }

                .form-tab::after {
                    content: '';
                    position: absolute;
                    bottom: -2px;
                    right: 0;
                    left: 0;
                    height: 3px;
                    background: transparent;
                    border-radius: 3px 3px 0 0;
                    transition: background 0.2s ease;
                }

                .form-tab:hover {
                    color: #374151;
                }

                .form-tab.active {
                    color: #2563EB;
                }

                .form-tab.active::after {
                    background: #2563EB;
                }

                .form-tab svg {
                    width: 18px;
                    height: 18px;
                }

                .tab-panel {
                    padding-top: 4px;
                    overflow: visible;
                }

                @media (max-width: 768px) {
                    .form-tabs {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        margin-bottom: 16px;
                        border-bottom: none;
                        overflow-x: visible;
                    }

                    .form-tab {
                        padding: 14px 16px;
                        font-size: 14px;
                        min-height: 48px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        background: #ffffff;
                    }

                    .form-tab::after {
                        display: none;
                    }

                    .form-tab.active {
                        background: #eff6ff;
                        border-color: #3b82f6;
                    }
                }

                .form-grid {
                    display: grid;
                    gap: 16px;
                    grid-template-columns: 1fr;
                    max-width: 100%;
                    width: 100%;
                }

                /* Make the first form section (تفاصيل الدعوى) wider */
                .form-section:first-of-type {
                    padding: 24px 32px;
                }

                .form-section {
                    background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
                    padding: 24px 28px;
                    border-radius: 16px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
                    border: 1px solid rgba(229, 231, 235, 0.8);
                    width: 100%;
                    max-width: 100%;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: visible;
                }
                .form-section::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 4px;
                    height: 100%;
                    background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .form-section:hover {
                    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1), 0 3px 6px rgba(0, 0, 0, 0.06);
                }
                .form-section:hover::before {
                    opacity: 1;
                }

                .section-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 1.375rem;
                    font-weight: 700;
                    color: #111827;
                    margin: 0;
                    padding: 0;
                    border-bottom: none;
                    letter-spacing: -0.01em;
                }
                .section-title svg {
                    color: #3b82f6;
                    width: 22px;
                    height: 22px;
                }
                
                .sub-section-title {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 18px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #e5e7eb;
                }
                .sub-section-title svg {
                    color: #3b82f6;
                    width: 18px;
                    height: 18px;
                }
                
                .section-grid {
                    display: grid;
                    gap: 20px 24px;
                }
                .col-2 { grid-template-columns: repeat(2, 1fr); }
                .col-3 { grid-template-columns: repeat(3, 1fr); }
                .col-4 { grid-template-columns: repeat(4, 1fr); }
                .col-5 { grid-template-columns: repeat(5, 1fr); }

                .form-field {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }

                .form-field label {
                    font-weight: 600;
                    color: #374151;
                    font-size: 0.875rem;
                    margin-bottom: 4px;
                    letter-spacing: -0.01em;
                }

                .form-field input, .form-field select, .form-field textarea, .custom-input {
                    width: 100%;
                    padding: 12px 16px;
                    border: 1.5px solid #d1d5db;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-family: inherit;
                    background-color: #ffffff;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    color: #1f2937;
                    line-height: 1.5;
                    height: 50px;
                }

                .custom-input.date-input {
                    cursor: pointer;
                }
                
                .form-field textarea {
                    height: auto;
                    min-height: 120px;
                    resize: vertical;
                    padding: 12px 16px;
                    line-height: 1.6;
                }

                .form-field input::placeholder, .form-field select option:first-child {
                    color: #9ca3af;
                }

                .form-field input:focus, .form-field select:focus, .form-field textarea:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
                    background-color: #ffffff;
                }

                .form-field select {
                    cursor: pointer;
                    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
                    background-position: left 10px center;
                    background-repeat: no-repeat;
                    background-size: 14px;
                    padding-left: 32px;
                    appearance: none;
                }
                
                .form-field input[readonly], .calculated-field {
                    background-color: #f9fafb;
                    cursor: not-allowed;
                    color: #6b7280;
                    border-color: #e5e7eb;
                }

                .form-field input[readonly]:focus, .calculated-field:focus {
                    border-color: #e5e7eb;
                    box-shadow: none;
                }
                
                .editor-container {
                    border: 1.5px solid #d1d5db;
                    border-radius: 8px;
                    overflow: hidden;
                    transition: all 0.2s ease;
                }
                .editor-container:focus-within {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
                }

                /* DatePicker styling to match other fields */
                :global(.react-datepicker-wrapper) {
                    width: 100%;
                }

                :global(.react-datepicker__input-container input) {
                    width: 100% !important;
                    padding: 12px 16px !important;
                    border: 1.5px solid #d1d5db !important;
                    border-radius: 8px !important;
                    font-size: 0.875rem !important;
                    height: 50px !important;
                    background-color: #ffffff !important;
                }

                :global(.react-datepicker__input-container input:focus) {
                    outline: none !important;
                    border-color: #3b82f6 !important;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
                }
                
                .extra-options-section {
                    border-top: 2px solid #e5e7eb;
                    padding-top: 24px;
                    margin-top: 28px;
                }

                .extra-options-section .sub-section-title {
                    margin-bottom: 16px;
                }

                .option-pills-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 10px;
                    margin-bottom: 24px;
                }

                .option-pill {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    background: #f8fafc;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 8px;
                    color: #000000;
                    font-size: 0.78rem;
                    font-weight: 700;
                    font-family: 'Cairo', 'Almarai', sans-serif;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    text-align: right;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .option-pill .pill-icon {
                    flex-shrink: 0;
                    font-size: 0.75rem;
                    color: #94a3b8;
                    width: 18px;
                    height: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    border: 1.5px solid #cbd5e1;
                    transition: all 0.15s ease;
                }

                .option-pill:hover {
                    background: #eff6ff;
                    border-color: #93c5fd;
                    color: #1e40af;
                }
                .option-pill:hover .pill-icon {
                    border-color: #93c5fd;
                    color: #3b82f6;
                }

                .option-pill.active {
                    background: #eff6ff;
                    border-color: #3b82f6;
                    color: #1e40af;
                }
                .option-pill.active .pill-icon {
                    background: #3b82f6;
                    border-color: #3b82f6;
                    color: white;
                    font-size: 0.625rem;
                }

                .selected-fields-grid {
                    min-height: 50px;
                    margin-bottom: 20px;
                    border-top: 1px dashed #d1d5db;
                    padding-top: 20px;
                }

                .additional-options-container {
                    border-top: 2px solid #e5e7eb;
                    padding-top: 24px;
                    margin-top: 28px;
                }

                .additional-options-header {
                    display: flex;
                    justify-content: flex-start;
                    align-items: center;
                    margin-bottom: 16px;
                    flex-wrap: wrap;
                    gap: 12px;
                }

                .additional-options-header .sub-section-title {
                    margin-bottom: 0;
                    border-bottom: none;
                    padding-bottom: 0;
                }

                .notes-contract-container {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .notes-section, .contract-section {
                    width: 100%;
                }

                .span-2 { grid-column: span 2; }
                .span-3 { grid-column: span 3; }
                .span-4 { grid-column: span 4; }
                .span-5 { grid-column: span 5; }

                /* --- Styles for Additional Options --- */
                .additional-fields-grid {
                    min-height: 50px;
                    margin-bottom: 20px;
                }

                .form-field.with-remove .input-wrapper {
                    position: relative;
                }

                .remove-option-btn {
                    position: absolute;
                    top: 50%;
                    left: 8px;
                    transform: translateY(-50%);
                    background: transparent;
                    border: none;
                    font-size: 1.5rem;
                    color: #9ca3af;
                    cursor: pointer;
                    padding: 0 4px;
                    line-height: 1;
                    transition: color 0.2s ease;
                }
                .remove-option-btn:hover {
                    color: #ef4444;
                }

                .form-field.with-remove input {
                    padding-left: 36px;
                }

                @media (max-width: 1400px) {
                    .option-pills-grid {
                        grid-template-columns: repeat(4, 1fr);
                    }
                }
                @media (max-width: 1100px) {
                    .option-pills-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }
                @media (max-width: 768px) {
                    .option-pills-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                @media (max-width: 480px) {
                    .option-pills-grid {
                        grid-template-columns: 1fr;
                    }
                }

                /* Custom Dropdown for Case Type 2 */
                .custom-dropdown-wrapper {
                    position: relative;
                    width: 100%;
                }

                .custom-dropdown-select {
                    width: 100%;
                    padding: 10px 14px;
                    min-height: 40px;
                    border: 1.5px solid #d1d5db;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-family: inherit;
                    background-color: #ffffff;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: #1f2937;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .custom-dropdown-select:hover {
                    border-color: #3b82f6;
                }

                .custom-dropdown-select:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
                }

                .dropdown-chevron {
                    width: 16px;
                    height: 16px;
                    transition: transform 0.2s ease;
                    color: #6b7280;
                }

                .dropdown-chevron.open {
                    transform: rotate(180deg);
                }

                .custom-dropdown-menu {
                    position: absolute;
                    top: calc(100% + 4px);
                    right: 0;
                    left: 0;
                    background: white;
                    border: 1.5px solid #d1d5db;
                    border-radius: 8px;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    z-index: 1000;
                    max-height: 220px;
                    overflow-y: auto;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                .custom-dropdown-menu::-webkit-scrollbar {
                    display: none;
                }

                .custom-dropdown-item {
                    padding: 8px 14px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    color: #1f2937;
                    transition: background-color 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .custom-dropdown-item:hover {
                    background-color: #1e3a8a;
                    color: white;
                }

                .custom-dropdown-item.selected {
                    background-color: #3b82f6;
                    color: white;
                }

                .custom-dropdown-item.add-new-item {
                    color: #3b82f6;
                    font-weight: 500;
                }

                /* Add border-bottom when add-new-item is at top (caseType2, caseStage) */
                .custom-dropdown-menu > .custom-dropdown-item.add-new-item:first-child {
                    border-bottom: 1px solid #e5e7eb;
                }

                /* Add border-top when add-new-item is at bottom (court) */
                .custom-dropdown-menu > .custom-dropdown-item.add-new-item:last-child {
                    border-top: 1px solid #e5e7eb;
                }

                .custom-dropdown-item.add-new-item:hover {
                    background-color: #1e3a8a;
                    color: white;
                }

                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                    padding: 20px;
                }

                .modal-container {
                    background: white;
                    border-radius: 12px;
                    width: 100%;
                    max-width: 600px;
                    padding: 32px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    direction: rtl;
                }

                .modal-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #111827;
                    margin: 0 0 24px 0;
                    text-align: center;
                    font-family: 'Almarai', 'Cairo', sans-serif;
                }

                .modal-content {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    margin-bottom: 24px;
                }

                .modal-input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .modal-label {
                    font-weight: 600;
                    color: #374151;
                    font-size: 0.875rem;
                    font-family: 'Almarai', 'Cairo', sans-serif;
                }

                .required-asterisk {
                    color: #ef4444;
                }

                .input-with-icon-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .input-icon {
                    position: absolute;
                    right: 12px;
                    width: 16px;
                    height: 16px;
                    color: #9ca3af;
                    pointer-events: none;
                }

                .modal-input {
                    width: 100%;
                    padding: 12px 40px 12px 16px;
                    border: 1.5px solid #d1d5db;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-family: inherit;
                    background-color: #ffffff;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    color: #1f2937;
                }

                .modal-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
                }

                .modal-input::placeholder {
                    color: #9ca3af;
                }

                .modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }

                .modal-button {
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: none;
                    font-family: 'Almarai', 'Cairo', sans-serif;
                }

                .modal-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .modal-button-primary {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                    box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35), 0 2px 6px rgba(59, 130, 246, 0.2);
                }

                .modal-button-primary:hover:not(:disabled) {
                    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4), 0 3px 8px rgba(59, 130, 246, 0.25);
                }

                .modal-button-secondary {
                    background: white;
                    color: #3b82f6;
                    border: 1.5px solid #3b82f6;
                }

                .modal-button-secondary:hover:not(:disabled) {
                    background: #f3f4f6;
                }

                /* Ensure col-5 always shows 5 columns in case details section */
                .form-section .section-grid.col-5 {
                    grid-template-columns: repeat(5, 1fr) !important;
                }

                @media (max-width: 1600px) {
                    .form-grid { grid-template-columns: repeat(3, 1fr); }
                    .span-4, .span-5 { grid-column: span 3; }
                    .col-4 { grid-template-columns: repeat(3, 1fr); }
                    /* Keep col-5 at 5 columns even on smaller screens for case details */
                    .form-section .section-grid.col-5 {
                        grid-template-columns: repeat(5, 1fr) !important;
                    }
                }

                @media (max-width: 1200px) {
                    .form-grid { grid-template-columns: repeat(2, 1fr); }
                    .span-3, .span-4, .span-5 { grid-column: span 2; }
                    .col-3, .col-4 { grid-template-columns: repeat(2, 1fr); }
                    /* Keep col-5 at 5 columns for case details */
                    .form-section .section-grid.col-5 {
                        grid-template-columns: repeat(5, 1fr) !important;
                    }
                }

                @media (max-width: 768px) {
                    .page-container { padding: 8px; }
                    .header { flex-direction: column; align-items: stretch; gap: 12px; margin-bottom: 16px; }
                    .form-grid, .section-grid { grid-template-columns: 1fr; gap: 12px; }
                    .span-2, .span-3, .span-4, .span-5 { grid-column: span 1; }
                    .col-2, .col-3, .col-4 { grid-template-columns: 1fr; }
                    /* On mobile, force single column layout */
                    .form-section .section-grid.col-5 {
                        grid-template-columns: 1fr !important;
                        gap: 12px;
                    }
                    /* Reduce form section padding for mobile */
                    .form-section:first-of-type {
                        padding: 16px 12px;
                    }
                    .form-section {
                        padding: 16px 12px;
                    }
                    /* Form field mobile optimization */
                    .form-field {
                        margin-bottom: 12px;
                    }
                    .form-field label {
                        font-size: 13px;
                        margin-bottom: 6px;
                    }
                    .form-field input, .form-field select, .form-field textarea, .custom-input {
                        padding: 12px 14px;
                        font-size: 15px;
                        min-height: 48px;
                    }
                    .form-field select {
                        padding-left: 32px;
                    }
                    /* Custom dropdown mobile optimization */
                    .custom-dropdown-select {
                        padding: 12px 14px;
                        min-height: 48px;
                        font-size: 15px;
                    }
                    .custom-dropdown-menu {
                        max-height: 200px;
                        overflow-y: auto;
                    }
                    .custom-dropdown-item {
                        padding: 12px 14px;
                        min-height: 48px;
                        font-size: 14px;
                    }
                    /* Button mobile optimization */
                    .save-draft-button,
                    .drafts-toggle-button,
                    .save-button {
                        padding: 14px 20px;
                        min-height: 48px;
                        font-size: 15px;
                        width: 100%;
                    }
                    /* DatePicker mobile optimization */
                    :global(.react-datepicker-wrapper) {
                        width: 100%;
                    }
                    :global(.react-datepicker__input-container input) {
                        width: 100% !important;
                        padding: 12px 14px !important;
                        font-size: 15px !important;
                        min-height: 48px !important;
                    }
                }

                @media (max-width: 480px) {
                    .page-container { padding: 4px; }
                    .form-section .section-grid.col-5 {
                        grid-template-columns: 1fr !important;
                    }
                }

                .client-required-overlay {
                    position: fixed;
                    top: 0;
                    right: 0;
                    left: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100000;
                    backdrop-filter: blur(4px);
                }
                .client-required-modal {
                    background: white;
                    padding: 32px;
                    border-radius: 20px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                    direction: rtl;
                    animation: modalFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .client-required-icon {
                    font-size: 48px;
                    margin-bottom: 16px;
                }
                .client-required-modal h3 {
                    font-size: 20px;
                    font-weight: 700;
                    color: #1e293b;
                    margin-bottom: 12px;
                    font-family: 'Cairo', sans-serif;
                }
                .client-required-modal p {
                    font-size: 15px;
                    color: #64748b;
                    line-height: 1.6;
                    font-family: 'Cairo', sans-serif;
                }
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>

            {showClientRequiredMsg && (
                <div className="client-required-overlay">
                    <div className="client-required-modal">
                        <div className="client-required-icon">⚠️</div>
                        <h3>يرجى إضافة موكل أولاً</h3>
                        <p>يجب إضافة موكل واحد على الأقل قبل البدء بإضافة القضايا. جاري تحويلك لصفحة إضافة موكل...</p>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default withAuth(AddCasePage, ['can_add_cases'], true);
