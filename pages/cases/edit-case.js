import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/initSupabase';
import Layout from '../../components/layout/Layout';
import withAuth from '../../lib/withAuth';
import 'react-datepicker/dist/react-datepicker.css';
import DatePicker from 'react-datepicker';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import 'suneditor/dist/css/suneditor.min.css';
import mammoth from 'mammoth';
import { format } from 'date-fns';
import { useRouter } from 'next/router';
import { FiSave, FiBriefcase, FiUser, FiUsers, FiDollarSign, FiFileText, FiEdit3, FiPlusCircle, FiChevronDown } from 'react-icons/fi';

const SunEditor = dynamic(() => import("suneditor-react"), {
    ssr: false,
});

const EditCasePage = () => {
    const initialCaseState = {
        client_name: '', client_type: '', client_adult_child: '', opponentName: '',
        opponentPhone: '', opponentAddress: '', opponentLawyer: '', opponentLawyerPhone: '',
        caseType: '', caseLawyer: '', Governorate: '', legalArticle: '', case_number_in_court: '',
        penal_code_article_id: '', penal_code_article_number: '',
        criminal_procedures_article_id: '', criminal_procedures_article_number: '',
        personal_status_article_id: '', personal_status_article_number: '',
        sponsorName: '', caseStage: '', caseType2: '', courtAddress: '', policeStation: '',
        caseDate: '', totalAmount: '', paidAmount: '', remainingAmount: '', caseSubject: '',
        Notes: '', blockNumber: '', contractPeriod: '', contractValue: '', governorate_id: '',
        legal_form: '', id_number: '', caseState: '', currency: 'IQD',
        // Civil case specific fields (المدنية)
        obligation_type: '', obligation_source: '', contract_type: '', contract_date: '',
        contract_duration_from: '', contract_duration_to: '', property_type: '', property_number: '',
        property_address: '', register_number: '', register_page: '', document_date: '',
        registration_office: '', real_right_type: '', movable_type: '', plate_number: '',
        movable_location: '', debt_value: '', contractual_penalties: '', compensation_value: '',
        // Criminal case specific fields (الجزائية)
        crime_type: '', victim_classification: '', has_injuries: '', has_weapon: '',
        incident_location: '', eyewitnesses: '', violation_date: '', violation_time: '',
        material_evidence: '', misdemeanor_type: '', has_criminal_record: '', damage_nature: '',
        report_number: '', report_date: '', civil_compensation_request: '', misdemeanor_transfer_request: '',
        violation_type: '', traffic_violation_number: '', vehicle_type: '', estimated_fine: '',
        violation_cancellation_request: '', has_previous_appeal: '',
        // Sharia case specific fields (الشرعية)
        sect: '', competent_court: '', marriage_contract_date: '', marriage_contract_number: '',
        marriage_contract_location: '', divorce_type: '', separation_type: '', deferred_dowry: '',
        iddah_period_from_divorce: '', alimony_type: '', alimony_duration_required: '', alimony_estimation_basis: '',
        custody_years: '', request_visit_custodian: '', birth_date: '', birth_location: '',
        guardianship_type: '', request_appoint_guardian: '', current_guardian_status: '', number_of_heirs: '',
        kinship_degrees: '', approximate_estate_value: '', will_type: '', dispute_details: ''
    };

    const router = useRouter();
    const { caseId } = router.query;
    const [caseData, setCaseData] = useState({ ...initialCaseState });
    const [clientTypes, setClientTypes] = useState([]);
    const [courts, setCourts] = useState([]);
    const [clientNames, setClientNames] = useState([]);
    const [userId, setUserId] = useState(null);
    const [lawyerNames, setLawyerNames] = useState([]);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [caseDate, setCaseDate] = useState(new Date());
    const [editorContent, setEditorContent] = useState('');
    const [policeStations, setPoliceStations] = useState([]);
    const [caseTypes, setCaseTypes] = useState([]);
    const [caseStages, setCaseStages] = useState([]);
    const [caseStates, setCaseStates] = useState([]);
    const [caseType2, setCaseType2] = useState([]);
    const [adminId, setAdminId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [idCardImage, setIdCardImage] = useState(null);
    const [existingCaseNumber, setExistingCaseNumber] = useState('');

    const [selectedOptions, setSelectedOptions] = useState([]);
    const optionsDropdownRef = useRef(null);

    // --- STATE FOR PENAL CODE ARTICLES (قانون العقوبات) ---
    const [penalCodeArticles, setPenalCodeArticles] = useState([]);
    const [isPenalCodeModalOpen, setIsPenalCodeModalOpen] = useState(false);
    const [penalCodeSearchQuery, setPenalCodeSearchQuery] = useState('');

    // --- STATE FOR CRIMINAL PROCEDURES LAW ARTICLES (قانون أصول المحاكمات الجزائية) ---
    const [criminalProceduresArticles, setCriminalProceduresArticles] = useState([]);
    const [isCriminalProceduresModalOpen, setIsCriminalProceduresModalOpen] = useState(false);
    const [criminalProceduresSearchQuery, setCriminalProceduresSearchQuery] = useState('');

    // --- STATE FOR PERSONAL STATUS LAW ARTICLES (قانون الأحوال الشخصية) ---
    const [personalStatusArticles, setPersonalStatusArticles] = useState([]);
    const [isPersonalStatusModalOpen, setIsPersonalStatusModalOpen] = useState(false);
    const [personalStatusSearchQuery, setPersonalStatusSearchQuery] = useState('');

    // --- List of all possible additional options ---
    const baseAdditionalOptions = [
        'رقم الحظر',       // Block Number
        'فترة العقد',      // Contract Period
        'قيمة العقد',      // Contract Value
    ];

    const civilCaseOptions = [
        'نوع الالتزام',           // Obligation Type
        'مصدر الالتزام',          // Obligation Source
        'نوع العقد',              // Contract Type
        'تاريخ العقد',            // Contract Date
        'مدة العقد (من – إلى)',   // Contract Duration (From - To)
        'نوع العقار',             // Property Type
        'رقم العقار',             // Property Number
        'عنوان العقار',           // Property Address
        'رقم السجل',              // Register Number
        'الصفحة',                 // Register Page
        'تاريخ السند',            // Document Date
        'دائرة التسجيل العقاري',  // Registration Office
        'نوع الحق العيني',        // Real Right Type
        'نوع المنقول',            // Movable Type
        'رقم اللوحة',             // Plate Number
        'مكان المنقول',          // Movable Location
        'قيمة الدين',             // Debt Value
        'الغرامات الاتفاقية',     // Contractual Penalties
        'قيمة التعويض'            // Compensation Value
    ];

    const criminalCaseOptions = [
        'نوع الجناية',            // Crime Type
        'تصنيف الضحية',           // Victim Classification
        'وجود إصابات',            // Has Injuries
        'وجود سلاح',              // Has Weapon
        'مكان الحادث',            // Incident Location
        'شهود العيان',            // Eyewitnesses
        'تاريخ المخالفة',         // Violation Date
        'وقت المخالفة',           // Violation Time
        'أدلة مادية',             // Material Evidence
        'نوع الجنحة',             // Misdemeanor Type
        'وجود سابقة جنائية',      // Has Criminal Record
        'طبيعة الضرر',            // Damage Nature
        'رقم المحضر',             // Report Number
        'تاريخ المحضر',           // Report Date
        'طلب تعويض مدني',         // Civil Compensation Request
        'طلب ترحيل الجنحة',       // Misdemeanor Transfer Request
        'نوع المخالفة',           // Violation Type
        'رقم مخالفة المرور',      // Traffic Violation Number
        'نوع المركبة',            // Vehicle Type
        'غرامة مقدرة',            // Estimated Fine
        'طلب إلغاء المخالفة',     // Violation Cancellation Request
        'وجود استئناف سابق'       // Has Previous Appeal
    ];

    const shariaCaseOptions = [
        'المذهب',                 // Sect
        'المحكمة المختصة',        // Competent Court
        'تاريخ عقد الزواج',       // Marriage Contract Date
        'رقم عقد الزواج',         // Marriage Contract Number
        'مكان عقد الزواج',        // Marriage Contract Location
        'نوع الطلاق',             // Divorce Type
        'نوع التفريق',            // Separation Type
        'المهر المؤجل',           // Deferred Dowry
        'فترة العدة (من تاريخ الطلاق)', // Iddah Period (From Divorce Date)
        'نوع النفقة',             // Alimony Type
        'مدة النفقة المطلوبة',     // Alimony Duration Required
        'أساس تقدير النفقة',       // Alimony Estimation Basis
        'سنوات حضانة الأولاد',     // Custody Years
        'طلب زيارة المحضون',       // Request Visit Custodian
        'تاريخ الولادة',           // Birth Date
        'مكان الولادة',           // Birth Location
        'نوع الولاية',            // Guardianship Type
        'طلب نصب وصي / قيم',      // Request Appoint Guardian
        'حالة الوصي الحالي',       // Current Guardian Status
        'عدد الورثة',             // Number of Heirs
        'درجات القرابة',          // Kinship Degrees
        'قيمة التركة التقريبية',   // Approximate Estate Value
        'نوع الوصية',             // Will Type
        'تفاصيل النزاع'           // Dispute Details
    ];

    const allAdditionalOptions = React.useMemo(() => {
        const caseType = caseData.caseType?.trim();
        if (caseType === 'المدنية') {
            return [...baseAdditionalOptions, ...civilCaseOptions];
        } else if (caseType === 'الجزائية') {
            return [...baseAdditionalOptions, ...criminalCaseOptions];
        } else if (caseType === 'الشرعية') {
            return [...baseAdditionalOptions, ...shariaCaseOptions];
        }
        return baseAdditionalOptions;
    }, [caseData.caseType]);

    const iraqiGovernorates = [
        "الأنبار", "بابل", "بغداد", "البصرة", "دهوك", "القادسية", "ديالى",
        "ذي قار", "السليمانية", "أربيل", "كركوك", "كربلاء", "المثنى",
        "ميسان", "نينوى", "واسط",
    ];

    // Fetch existing case data
    useEffect(() => {
        if (!router.isReady || !caseId) return;

        const fetchCaseData = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('cases')
                    .select('*')
                    .eq('id', caseId)
                    .single();

                if (error) throw error;

                if (data) {
                    const loadedCaseData = {
                        client_name: data.client_name || '',
                        client_type: data.client_type || '',
                        client_adult_child: data.client_adult_child || '',
                        opponentName: data.opponentName || '',
                        opponentPhone: data.opponentPhone || '',
                        opponentAddress: data.opponentAddress || '',
                        opponentLawyer: data.opponentLawyer || '',
                        opponentLawyerPhone: data.opponentLawyerPhone || '',
                        caseType: data.caseType || '',
                        caseLawyer: data.caseLawyer || '',
                        Governorate: data.Governorate || '',
                        legalArticle: data.legalArticle || '',
                        case_number_in_court: data.case_number_in_court || '',
                        penal_code_article_id: data.penal_code_article_id || '',
                        penal_code_article_number: data.penal_code_article_number || '',
                        criminal_procedures_article_id: data.criminal_procedures_article_id || '',
                        criminal_procedures_article_number: data.criminal_procedures_article_number || '',
                        personal_status_article_id: data.personal_status_article_id || '',
                        personal_status_article_number: data.personal_status_article_number || '',
                        sponsorName: data.sponsorName || '',
                        caseStage: data.caseStage || '',
                        caseState: data.caseState || '',
                        caseType2: data.caseType2 || '',
                        courtAddress: data.courtAddress || '',
                        policeStation: data.policeStation || '',
                        caseSubject: data.caseSubject || '',
                        Notes: data.Notes || '',
                        blockNumber: data.block_number || '',
                        contractPeriod: data.contract_period || '',
                        contractValue: data.contractValue || '',
                        governorate_id: data.governorate_id || '',
                        legal_form: data.legal_form || '',
                        id_number: data.id_number || '',
                        totalAmount: data.totalAmount !== null && data.totalAmount !== undefined ? String(data.totalAmount) : '',
                        paidAmount: data.paidAmount !== null && data.paidAmount !== undefined ? String(data.paidAmount) : '',
                        remainingAmount: data.remainingAmount !== null && data.remainingAmount !== undefined ? String(data.remainingAmount) : '',
                        currency: data.currency || 'IQD',
                        // Civil
                        obligation_type: data.obligation_type || '',
                        obligation_source: data.obligation_source || '',
                        contract_type: data.contract_type || '',
                        contract_date: data.contract_date || '',
                        contract_duration_from: data.contract_duration_from || '',
                        contract_duration_to: data.contract_duration_to || '',
                        property_type: data.property_type || '',
                        property_number: data.property_number || '',
                        property_address: data.property_address || '',
                        register_number: data.register_number || '',
                        register_page: data.register_page || '',
                        document_date: data.document_date || '',
                        registration_office: data.registration_office || '',
                        real_right_type: data.real_right_type || '',
                        movable_type: data.movable_type || '',
                        plate_number: data.plate_number || '',
                        movable_location: data.movable_location || '',
                        debt_value: data.debt_value || '',
                        contractual_penalties: data.contractual_penalties || '',
                        compensation_value: data.compensation_value || '',
                        // Criminal
                        crime_type: data.crime_type || '',
                        victim_classification: data.victim_classification || '',
                        has_injuries: data.has_injuries || '',
                        has_weapon: data.has_weapon || '',
                        incident_location: data.incident_location || '',
                        eyewitnesses: data.eyewitnesses || '',
                        violation_date: data.violation_date || '',
                        violation_time: data.violation_time || '',
                        material_evidence: data.material_evidence || '',
                        misdemeanor_type: data.misdemeanor_type || '',
                        has_criminal_record: data.has_criminal_record || '',
                        damage_nature: data.damage_nature || '',
                        report_number: data.report_number || '',
                        report_date: data.report_date || '',
                        civil_compensation_request: data.civil_compensation_request || '',
                        misdemeanor_transfer_request: data.misdemeanor_transfer_request || '',
                        violation_type: data.violation_type || '',
                        traffic_violation_number: data.traffic_violation_number || '',
                        vehicle_type: data.vehicle_type || '',
                        estimated_fine: data.estimated_fine || '',
                        violation_cancellation_request: data.violation_cancellation_request || '',
                        has_previous_appeal: data.has_previous_appeal || '',
                        // Sharia
                        sect: data.sect || '',
                        competent_court: data.competent_court || '',
                        marriage_contract_date: data.marriage_contract_date || '',
                        marriage_contract_number: data.marriage_contract_number || '',
                        marriage_contract_location: data.marriage_contract_location || '',
                        divorce_type: data.divorce_type || '',
                        separation_type: data.separation_type || '',
                        deferred_dowry: data.deferred_dowry || '',
                        iddah_period_from_divorce: data.iddah_period_from_divorce || '',
                        alimony_type: data.alimony_type || '',
                        alimony_duration_required: data.alimony_duration_required || '',
                        alimony_estimation_basis: data.alimony_estimation_basis || '',
                        custody_years: data.custody_years || '',
                        request_visit_custodian: data.request_visit_custodian || '',
                        birth_date: data.birth_date || '',
                        birth_location: data.birth_location || '',
                        guardianship_type: data.guardianship_type || '',
                        request_appoint_guardian: data.request_appoint_guardian || '',
                        current_guardian_status: data.current_guardian_status || '',
                        number_of_heirs: data.number_of_heirs || '',
                        kinship_degrees: data.kinship_degrees || '',
                        approximate_estate_value: data.approximate_estate_value || '',
                        will_type: data.will_type || '',
                        dispute_details: data.dispute_details || ''
                    };

                    setCaseData(loadedCaseData);
                    setExistingCaseNumber(data.case_number || '');

                    if (data.caseDate) {
                        setCaseDate(new Date(data.caseDate));
                    }

                    // Set selected options based on existing data - more robust scanning
                    const options = [];
                    const allOptionsToCheck = [
                        ...baseAdditionalOptions,
                        ...civilCaseOptions,
                        ...criminalCaseOptions,
                        ...shariaCaseOptions
                    ];

                    allOptionsToCheck.forEach(opt => {
                        const field = getOptionFieldName(opt);
                        if (field && (data[field] || (field === 'contract_duration_from' && data['contract_duration_from']))) {
                            if (!options.includes(opt)) options.push(opt);
                        }
                    });

                    setSelectedOptions(options);

                    // Load contract content if exists
                    if (data.contract) {
                        try {
                            const response = await fetch(data.contract);
                            const html = await response.text();
                            setEditorContent(html);
                        } catch (err) {
                            console.error('Error loading contract:', err);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching case data:', error.message);
                alert('خطأ في تحميل بيانات القضية');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCaseData();
    }, [router.isReady, caseId]);

    useEffect(() => {
        const fetchAdminId = async () => {
            try {
                const user_id_logged = supabase.auth.user().id;
                const { data: adminData, error: adminError } = await supabase
                    .from('user_metadata')
                    .select('admin_user_id')
                    .eq('user_id', user_id_logged)
                    .single();
                if (adminError) { console.error('Error fetching admin data:', adminError.message); return; }
                if (!adminData) { console.error('Admin data is empty or not found.'); return; }
                setAdminId(adminData.admin_user_id);
            } catch (error) {
                console.error('Error fetching admin ID:', error.message);
            }
        };
        fetchAdminId();
    }, []);

    useEffect(() => {
        async function fetchCaseType2Options() {
            try {
                const { data, error } = await supabase.from('case_options').select('id, case_type_2');
                if (error) throw error;
                if (data) {
                    const caseType2Options = data.map((row) => row.case_type_2).filter(Boolean);
                    setCaseType2(caseType2Options);
                }
            } catch (error) { console.error('Error fetching case_type_2:', error.message); }
        }
        fetchCaseType2Options();
    }, []);

    useEffect(() => {
        const fetchClientTypes = async () => {
            try {
                const { data, error } = await supabase.from('case_options').select('client_type');
                if (error) throw error;
                if (data) {
                    // Remove duplicates using Set
                    const types = [...new Set(data.map(item => item.client_type).filter(Boolean))];
                    setClientTypes(types);
                }
            } catch (error) { console.error('Error fetching client types:', error.message); }
        };
        fetchClientTypes();
    }, []);

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
                }
            } catch (error) { console.error('Error fetching courts:', error.message); }
        }
        fetchCourts();
    }, []);

    useEffect(() => {
        const fetchLawyersCreatedByAdmin = async () => {
            try {
                const user = supabase.auth.user();
                if (!user) return;
                const userId = user.id;

                const { data: metaList, error: metaError } = await supabase
                    .from("user_metadata")
                    .select("role, admin_user_id, new_lawyer_id, user_id")
                    .or(`user_id.eq.${userId},new_lawyer_id.eq.${userId}`);

                if (metaError) throw metaError;

                let effectiveAdminId = userId;
                if (metaList && metaList.length > 0) {
                    const lawyerRow = metaList.find(m => m.new_lawyer_id === userId);
                    const userRow = metaList.find(m => m.user_id === userId);
                    const targetMeta = lawyerRow || userRow || metaList[0];
                    effectiveAdminId = targetMeta.admin_user_id || targetMeta.user_id;
                }

                const { data, error } = await supabase
                    .from('user_metadata')
                    .select('username, email, user_id, admin_user_id')
                    .or(`admin_user_id.eq.${effectiveAdminId},user_id.eq.${effectiveAdminId}`)
                    .neq('role', 'client_portal');

                if (error) {
                    console.error('Error fetching lawyers:', error);
                    setLawyerNames([]);
                } else {
                    const uniqueNames = [...new Set(data.map(u => u.username).filter(Boolean))];
                    setLawyerNames(uniqueNames);
                }
            } catch (error) { console.error('Error:', error.message); }
        };
        fetchLawyersCreatedByAdmin();
    }, []);

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
                }
            } catch (error) { console.error('Error fetching case stages:', error.message); }
        }
        fetchCaseStages();
    }, []);

    useEffect(() => {
        const fetchClientNames = async () => {
            try {
                const user = supabase.auth.user();
                if (!user) return;
                const userId = user.id;

                const { data: metaList, error: metaError } = await supabase
                    .from("user_metadata")
                    .select("role, admin_user_id, new_lawyer_id, user_id")
                    .or(`user_id.eq.${userId},new_lawyer_id.eq.${userId}`);

                if (metaError) throw metaError;

                let adminId = userId;
                let lawyerId = null;

                if (metaList && metaList.length > 0) {
                    const lawyerRow = metaList.find(m => m.new_lawyer_id === userId);
                    const userRow = metaList.find(m => m.user_id === userId);
                    const targetMeta = lawyerRow || userRow || metaList[0];
                    adminId = targetMeta.admin_user_id || targetMeta.user_id;
                    lawyerId = targetMeta.new_lawyer_id;
                }

                let query = supabase.from("clients_data").select("id, client_name");
                const conditions = [];
                if (adminId) conditions.push(`admin_id.eq.${adminId}`);
                if (lawyerId) conditions.push(`lawyer_id.eq.${lawyerId}`);
                conditions.push(`lawyer_id.eq.${userId}`);
                conditions.push(`admin_id.eq.${userId}`);

                if (conditions.length > 0) {
                    query = query.or(conditions.join(','));
                }

                const { data: clients, error: clientError } = await query;
                if (clientError) throw clientError;
                setClientNames(clients || []);
            } catch (error) {
                console.error("Fetch clients error:", error.message);
                setClientNames([]);
            }
        };
        fetchClientNames();
    }, []);

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const user = supabase.auth.user();
                if (!user) throw new Error("User not logged in.");
                const uid = user.id;
                setUserId(uid);
                const { data: userMetadata, error } = await supabase
                    .from("user_metadata")
                    .select("role, admin_user_id, new_lawyer_id")
                    .eq("user_id", uid)
                    .single();
                if (error || !userMetadata) throw new Error("User metadata not found.");
                setUserRole(userMetadata.role);
                const resolvedAdminId = userMetadata.role === "Admin" ? userMetadata.admin_user_id : userMetadata.new_lawyer_id;
                setAdminId(resolvedAdminId);
            } catch (error) {
                console.error("Error fetching user info:", error.message);
            }
        };
        fetchUserInfo();
    }, []);

    // No longer needed as dropdown is replaced by grid of cards
    // useEffect(() => {
    //     function handleClickOutside(event) {
    //         if (optionsDropdownRef.current && !optionsDropdownRef.current.contains(event.target)) {
    //             setIsOptionsOpen(false);
    //         }
    //     }
    //     document.addEventListener("mousedown", handleClickOutside);
    //     return () => {
    //         document.removeEventListener("mousedown", handleClickOutside);
    //     };
    // }, [optionsDropdownRef]);

    // --- EFFECTS FOR LEGAL ARTICLES ---
    useEffect(() => {
        if (caseData.caseType === 'الجزائية') {
            fetchPenalCodeArticles();
            fetchCriminalProceduresArticles();
        } else if (caseData.caseType === 'الشرعية') {
            fetchPersonalStatusArticles();
        }
    }, [caseData.caseType]);

    const fetchPenalCodeArticles = async () => {
        try {
            const { data, error } = await supabase
                .from('legal_codes')
                .select('id, article_number, article_content, law_name_ar')
                .eq('law_type', 'عقوبات')
                .order('article_number', { ascending: true });
            if (error) throw error;
            const processed = [];
            (data || []).forEach(code => {
                const split = splitArticleContent(code.article_content, code.article_number);
                split.forEach((art, idx) => {
                    processed.push({
                        id: `${code.id}-${idx}`,
                        original_id: code.id,
                        article_number: art.articleNumber,
                        article_content: art.content,
                        law_name_ar: code.law_name_ar || 'قانون العقوبات العراقي'
                    });
                });
            });
            processed.sort((a, b) => (parseInt(a.article_number) || 0) - (parseInt(b.article_number) || 0));
            setPenalCodeArticles(processed);
        } catch (error) { console.error('Error fetching penal code:', error); }
    };

    const fetchCriminalProceduresArticles = async () => {
        try {
            const { data, error } = await supabase
                .from('criminal_procedures_law')
                .select('id, article_number, article_content, law_name_ar')
                .order('article_number', { ascending: true });
            if (error) throw error;
            const processed = [];
            (data || []).forEach(code => {
                const split = splitArticleContent(code.article_content, code.article_number);
                split.forEach((art, idx) => {
                    processed.push({
                        id: `${code.id}-${idx}`,
                        original_id: code.id,
                        article_number: art.articleNumber,
                        article_content: art.content,
                        law_name_ar: code.law_name_ar || 'قانون أصول المحاكمات الجزائية العراقي'
                    });
                });
            });
            processed.sort((a, b) => (parseInt(a.article_number) || 0) - (parseInt(b.article_number) || 0));
            setCriminalProceduresArticles(processed);
        } catch (error) { console.error('Error fetching criminal procedures:', error); }
    };

    const fetchPersonalStatusArticles = async () => {
        try {
            const { data, error } = await supabase
                .from('legal_articles')
                .select('id, article_no, article_text, law_title')
                .eq('law_id', 'law_188_1959')
                .order('article_no', { ascending: true });
            if (error) throw error;
            const processed = [];
            (data || []).forEach(code => {
                const split = splitArticleContent(code.article_text, code.article_no);
                split.forEach((art, idx) => {
                    processed.push({
                        id: `${code.id}-${idx}`,
                        original_id: code.id,
                        article_no: art.articleNumber,
                        article_text: art.content,
                        law_title: code.law_title || 'قانون الأحوال الشخصية العراقي'
                    });
                });
            });
            processed.sort((a, b) => (parseInt(a.article_no) || 0) - (parseInt(b.article_no) || 0));
            setPersonalStatusArticles(processed);
        } catch (error) { console.error('Error fetching personal status:', error); }
    };

    const splitArticleContent = (content, articleNumber) => {
        if (!content) return [{ articleNumber, content: content }];
        const articlePattern = /(?:المادة|مادة)\s+(\d+)/g;
        const articles = [];
        let matches = [];
        let match;
        while ((match = articlePattern.exec(content)) !== null) {
            matches.push({ index: match.index, articleNumber: match[1], fullMatch: match[0] });
        }
        if (matches.length === 0) return [{ articleNumber, content: content }];
        const uniqueArticleNumbers = [...new Set(matches.map(m => m.articleNumber))];
        if (uniqueArticleNumbers.length === 1 && uniqueArticleNumbers[0] === articleNumber) return [{ articleNumber, content: content }];

        let currentArticleNumber = articleNumber;
        let startIndex = 0;
        matches.forEach((m) => {
            if (m.index > startIndex) {
                const text = content.substring(startIndex, m.index).trim();
                const cleanText = text.replace(/^(?:المادة|مادة)\s+\d+\s*/, '').trim();
                if (cleanText) articles.push({ articleNumber: currentArticleNumber, content: cleanText });
            }
            currentArticleNumber = m.articleNumber;
            startIndex = m.index;
        });
        if (startIndex < content.length) {
            let text = content.substring(startIndex).trim();
            text = text.replace(/^(?:المادة|مادة)\s+\d+\s*/, '').trim();
            if (text) articles.push({ articleNumber: currentArticleNumber, content: text });
        }
        return articles.length === 0 ? [{ articleNumber, content: content }] : articles;
    };

    const handleSelectPenalCodeArticle = (article) => {
        setCaseData(prev => ({
            ...prev,
            penal_code_article_id: article.original_id || article.id,
            penal_code_article_number: article.article_number,
            legalArticle: `المادة ${article.article_number} - ${article.law_name_ar}`
        }));
        setIsPenalCodeModalOpen(false);
    };

    const handleSelectCriminalProceduresArticle = (article) => {
        setCaseData(prev => ({
            ...prev,
            criminal_procedures_article_id: article.original_id || article.id,
            criminal_procedures_article_number: article.article_number
        }));
        setIsCriminalProceduresModalOpen(false);
    };

    const handleSelectPersonalStatusArticle = (article) => {
        setCaseData(prev => ({
            ...prev,
            personal_status_article_id: article.original_id || article.id,
            personal_status_article_number: article.article_no,
            legalArticle: `المادة ${article.article_no} - ${article.law_title}`
        }));
        setIsPersonalStatusModalOpen(false);
    };

    const handleInputChange = async (e) => {
        const { name, value } = e.target;
        setCaseData(prevState => ({ ...prevState, [name]: value }));

        if (name === 'client_name' && value) {
            setIsLoading(true);
            try {
                const { data } = await supabase
                    .from('clients_data')
                    .select('legal_form, id_number, governorate_id, client_adult_child')
                    .eq('client_name', value)
                    .single();

                if (data) {
                    setCaseData(prevState => ({
                        ...prevState,
                        client_name: value,
                        legal_form: data.legal_form || '',
                        id_number: data.id_number || '',
                        governorate_id: data.governorate_id || '',
                        client_adult_child: data.client_adult_child || '',
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

        if (!caseId) {
            alert('خطأ: لم يتم تحديد القضية');
            return;
        }

        try {
            const requiredFields = ['client_name', 'client_type', 'client_adult_child'];
            const missingFields = requiredFields.filter(field => !caseData[field]);
            if (missingFields.length > 0) {
                alert('الرجاء ملء جميع الحقول المطلوبة: ' + missingFields.join(', '));
                return;
            }

            setIsLoading(true);
            const user = supabase.auth.user();
            if (!user) throw new Error('No authenticated user found');

            let idCardImageUrl = caseData.client_id_img_url || '';
            if (idCardImage) {
                const idCardImageFileName = `${Date.now()}_id_card_${idCardImage.name}`;
                const idCardImagePath = `images/${idCardImageFileName}`;
                const { error: uploadError } = await supabase.storage.from('images').upload(idCardImagePath, idCardImage);
                if (uploadError) throw uploadError;
                const { data: urlData } = await supabase.storage.from('images').getPublicUrl(idCardImagePath);
                idCardImageUrl = urlData.publicUrl;
            }

            let contractUrl = caseData.contract || '';
            if (editorContent) {
                const htmlContentBlob = new Blob([editorContent], { type: 'text/html' });
                const htmlFileName = `${Date.now()}_contract.html`;
                const htmlPath = `html_files/${htmlFileName}`;
                const { error: htmlUploadError } = await supabase.storage.from('images').upload(htmlPath, htmlContentBlob);
                if (htmlUploadError) throw htmlUploadError;
                const { data: htmlUrlData } = await supabase.storage.from('images').getPublicUrl(htmlPath);
                contractUrl = htmlUrlData.publicURL;
            }

            const { data: lawyerData, error: lawyerError } = await supabase
                .from('user_metadata')
                .select('new_lawyer_id, role')
                .eq('username', caseData.caseLawyer)
                .limit(1)
                .maybeSingle();
            if (lawyerError) throw lawyerError;

            const caseDataToUpdate = {
                client_name: caseData.client_name,
                client_type: caseData.client_type,
                legal_form: caseData.legal_form,
                governorate_id: caseData.governorate_id,
                id_number: caseData.id_number,
                client_adult_child: caseData.client_adult_child,
                opponentName: caseData.opponentName,
                opponentPhone: caseData.opponentPhone,
                opponentAddress: caseData.opponentAddress,
                opponentLawyer: caseData.opponentLawyer,
                opponentLawyerPhone: caseData.opponentLawyerPhone,
                client_id_img_url: idCardImageUrl,
                contract: contractUrl,
                caseType: caseData.caseType,
                caseLawyer: caseData.caseLawyer,
                Governorate: caseData.Governorate,
                legalArticle: caseData.legalArticle,
                case_number_in_court: caseData.case_number_in_court,
                sponsorName: caseData.sponsorName,
                caseStage: caseData.caseStage,
                caseState: caseData.caseState,
                courtAddress: caseData.courtAddress,
                policeStation: caseData.policeStation,
                caseDate: format(caseDate, 'yyyy-MM-dd'),
                caseType2: caseData.caseType2,
                caseSubject: caseData.caseSubject,
                Notes: caseData.Notes,
                block_number: caseData.blockNumber,
                contract_period: caseData.contractPeriod,
                totalAmount: caseData.totalAmount !== "" ? parseFloat(caseData.totalAmount) : null,
                paidAmount: caseData.paidAmount !== "" ? parseFloat(caseData.paidAmount) : null,
                remainingAmount: caseData.remainingAmount !== "" ? parseFloat(caseData.remainingAmount) : null,
                contractValue: caseData.contractValue !== "" ? parseFloat(caseData.contractValue) : null,
                currency: caseData.currency || 'IQD',
                // Civil
                obligation_type: caseData.obligation_type || null,
                obligation_source: caseData.obligation_source || null,
                contract_type: caseData.contract_type || null,
                contract_date: caseData.contract_date || null,
                contract_duration_from: caseData.contract_duration_from || null,
                contract_duration_to: caseData.contract_duration_to || null,
                property_type: caseData.property_type || null,
                property_number: caseData.property_number || null,
                property_address: caseData.property_address || null,
                register_number: caseData.register_number || null,
                register_page: caseData.register_page || null,
                document_date: caseData.document_date || null,
                registration_office: caseData.registration_office || null,
                real_right_type: caseData.real_right_type || null,
                movable_type: caseData.movable_type || null,
                plate_number: caseData.plate_number || null,
                movable_location: caseData.movable_location || null,
                debt_value: caseData.debt_value !== "" ? parseFloat(caseData.debt_value) : null,
                contractual_penalties: caseData.contractual_penalties || null,
                compensation_value: caseData.compensation_value !== "" ? parseFloat(caseData.compensation_value) : null,
                // Criminal
                crime_type: caseData.crime_type || null,
                victim_classification: caseData.victim_classification || null,
                has_injuries: caseData.has_injuries || null,
                has_weapon: caseData.has_weapon || null,
                incident_location: caseData.incident_location || null,
                eyewitnesses: caseData.eyewitnesses || null,
                violation_date: caseData.violation_date || null,
                violation_time: caseData.violation_time || null,
                material_evidence: caseData.material_evidence || null,
                misdemeanor_type: caseData.misdemeanor_type || null,
                has_criminal_record: caseData.has_criminal_record || null,
                damage_nature: caseData.damage_nature || null,
                report_number: caseData.report_number || null,
                report_date: caseData.report_date || null,
                civil_compensation_request: caseData.civil_compensation_request || null,
                misdemeanor_transfer_request: caseData.misdemeanor_transfer_request || null,
                violation_type: caseData.violation_type || null,
                traffic_violation_number: caseData.traffic_violation_number || null,
                vehicle_type: caseData.vehicle_type || null,
                estimated_fine: caseData.estimated_fine !== "" ? parseFloat(caseData.estimated_fine) : null,
                violation_cancellation_request: caseData.violation_cancellation_request || null,
                has_previous_appeal: caseData.has_previous_appeal || null,
                // Sharia
                sect: caseData.sect || null,
                competent_court: caseData.competent_court || null,
                marriage_contract_date: caseData.marriage_contract_date || null,
                marriage_contract_number: caseData.marriage_contract_number || null,
                marriage_contract_location: caseData.marriage_contract_location || null,
                divorce_type: caseData.divorce_type || null,
                separation_type: caseData.separation_type || null,
                deferred_dowry: caseData.deferred_dowry !== "" ? parseFloat(caseData.deferred_dowry) : null,
                iddah_period_from_divorce: caseData.iddah_period_from_divorce || null,
                alimony_type: caseData.alimony_type || null,
                alimony_duration_required: caseData.alimony_duration_required || null,
                alimony_estimation_basis: caseData.alimony_estimation_basis || null,
                custody_years: caseData.custody_years !== "" ? parseInt(caseData.custody_years) : null,
                request_visit_custodian: caseData.request_visit_custodian || null,
                birth_date: caseData.birth_date || null,
                birth_location: caseData.birth_location || null,
                guardianship_type: caseData.guardianship_type || null,
                request_appoint_guardian: caseData.request_appoint_guardian || null,
                current_guardian_status: caseData.current_guardian_status || null,
                number_of_heirs: caseData.number_of_heirs !== "" ? parseInt(caseData.number_of_heirs) : null,
                kinship_degrees: caseData.kinship_degrees || null,
                approximate_estate_value: caseData.approximate_estate_value !== "" ? parseFloat(caseData.approximate_estate_value) : null,
                will_type: caseData.will_type || null,
                dispute_details: caseData.dispute_details || null,
                // Penal code article fields (for الجزائية cases)
                penal_code_article_id: caseData.penal_code_article_id || null,
                penal_code_article_number: caseData.penal_code_article_number || null,
                // Criminal procedures law article fields (for الجزائية cases)
                criminal_procedures_article_id: caseData.criminal_procedures_article_id || null,
                criminal_procedures_article_number: caseData.criminal_procedures_article_number || null,
                // Personal status law article fields (for الشرعية cases)
                personal_status_article_id: caseData.personal_status_article_id || null,
                personal_status_article_number: caseData.personal_status_article_number || null,
                lawyer_id: lawyerData?.new_lawyer_id,
                role: lawyerData?.role,
            };

            const { error: updateError } = await supabase
                .from('cases')
                .update(caseDataToUpdate)
                .eq('id', caseId);

            if (updateError) throw updateError;

            setShowSuccessMessage(true);
            setTimeout(() => {
                setShowSuccessMessage(false);
                router.push('/cases/CasesTable');
            }, 2000);
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            alert('خطأ في تحديث القضية: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const getOptionFieldName = (option) => {
        const englishTranslations = {
            'رقم الحظر': 'blockNumber',
            'فترة العقد': 'contractPeriod',
            'قيمة العقد': 'contractValue',
            // Civil case fields
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
            // Criminal case fields (الجزائية)
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
            'طلب تعويض مدني': 'civil_compensation_request',
            'طلب ترحيل الجنحة': 'misdemeanor_transfer_request',
            'نوع المخالفة': 'violation_type',
            'رقم مخالفة المرور': 'traffic_violation_number',
            'نوع المركبة': 'vehicle_type',
            'غرامة مقدرة': 'estimated_fine',
            'طلب إلغاء المخالفة': 'violation_cancellation_request',
            'وجود استئناف سابق': 'has_previous_appeal',
            // Sharia case fields (الشرعية)
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
        };
        return englishTranslations[option] || option.charAt(0).toLowerCase() + option.slice(1).replace(/\s+/g, '');
    };

    const handleAddOption = (option) => {
        if (!selectedOptions.includes(option)) {
            setSelectedOptions([...selectedOptions, option]);
        }
    };

    const handleRemoveOption = (optionToRemove) => {
        setSelectedOptions(selectedOptions.filter(option => option !== optionToRemove));
        const fieldName = getOptionFieldName(optionToRemove);
        setCaseData(prevCase => {
            const updatedCase = { ...prevCase };
            updatedCase[fieldName] = '';
            // Special handling for contract_duration_from/to
            if (optionToRemove === 'مدة العقد (من – إلى)') {
                updatedCase['contract_duration_from'] = '';
                updatedCase['contract_duration_to'] = '';
            }
            return updatedCase;
        });
    };

    const CustomInput = React.forwardRef(({ value, onClick }, ref) => (
        <input className="custom-input" onClick={onClick} ref={ref} value={value} readOnly />
    ));
    CustomInput.displayName = 'CustomInput';

    return (
        <Layout>
            <div className="page-container">
                {showSuccessMessage && (
                    <div className="success-message">
                        <p>✅ تم تحديث القضية بنجاح!</p>
                    </div>
                )}

                {(!router.isReady || !caseId || isLoading) ? (
                    <div style={{ textAlign: 'center', padding: '40px', fontSize: '1.2rem', minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p>جاري التحميل...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="page-header">
                            <div>
                            </div>
                            <button type="submit" className="save-button" disabled={isLoading}>
                                <FiSave />
                                <span>{isLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                            </button>
                        </div>

                        <div className="form-grid">
                            {/* Case Details Section */}
                            <div className="form-section span-5">
                                <h2 className="section-title"><FiBriefcase /> تعديل معلومات الدعوى</h2>

                                <div className="section-grid col-5">
                                    <div className="form-field">
                                        <label>نوع الملف</label>
                                        <select name="caseType" value={caseData.caseType} onChange={handleInputChange}>
                                            <option value="">اختر</option>
                                            {caseTypes.map((type, index) => (
                                                <option key={index} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-field">
                                        <label>نوع الدعوى</label>
                                        <select name="caseType2" value={caseData.caseType2} onChange={handleInputChange}>
                                            <option value="">اختر</option>
                                            {caseType2.map((type, index) => (
                                                <option key={index} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-field">
                                        <label>محامي القضية</label>
                                        <select name="caseLawyer" value={caseData.caseLawyer} onChange={handleInputChange}>
                                            <option value="">اختر</option>
                                            {lawyerNames.map((lawyer) => (
                                                <option key={lawyer} value={lawyer}>{lawyer}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-field">
                                        <label>مرحلة الدعوى</label>
                                        <select name="caseStage" value={caseData.caseStage} onChange={handleInputChange}>
                                            <option value="">اختر</option>
                                            {caseStages.map((stage, index) => (
                                                <option key={index} value={stage}>{stage}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-field">
                                        <label>حالة الدعوى</label>
                                        <select name="caseState" value={caseData.caseState} onChange={handleInputChange}>
                                            <option value="">اختر</option>
                                            {caseStates.map((state, index) => (
                                                <option key={index} value={state}>{state}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-field">
                                        <label>تاريخ القضية</label>
                                        <DatePicker
                                            selected={caseDate}
                                            onChange={(date) => setCaseDate(date)}
                                            dateFormat="yyyy-MM-dd"
                                            customInput={<input className="custom-input" />}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>عنوان المحكمة</label>
                                        <select name="courtAddress" value={caseData.courtAddress} onChange={handleInputChange}>
                                            <option value="">اختر</option>
                                            {courts.filter(c => c).map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-field">
                                        <label>الدائرة</label>
                                        <select name="policeStation" value={caseData.policeStation} onChange={handleInputChange}>
                                            <option value="">اختر</option>
                                            {policeStations.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-field">
                                        <label>المحافظة</label>
                                        <select name="Governorate" value={caseData.Governorate} onChange={handleInputChange}>
                                            <option value="">اختر</option>
                                            {iraqiGovernorates.map(g => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-field">
                                        <label>رقم الدعوى</label>
                                        <input
                                            type="text"
                                            name="case_number_in_court"
                                            value={caseData.case_number_in_court}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>المادة القانونية</label>
                                        <div className="input-wrapper" style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="text"
                                                name="legalArticle"
                                                value={caseData.legalArticle}
                                                onChange={handleInputChange}
                                                placeholder="المادة القانونية..."
                                                style={{ flex: 1 }}
                                            />
                                            {caseData.caseType === 'الجزائية' && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="select-article-btn penal"
                                                        onClick={() => setIsPenalCodeModalOpen(true)}
                                                        title="اختر من قانون العقوبات"
                                                    >
                                                        عقوبات
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="select-article-btn criminal-proc"
                                                        onClick={() => setIsCriminalProceduresModalOpen(true)}
                                                        title="اختر من قانون أصول المحاكمات الجزائية"
                                                    >
                                                        أصول
                                                    </button>
                                                </>
                                            )}
                                            {caseData.caseType === 'الشرعية' && (
                                                <button
                                                    type="button"
                                                    className="select-article-btn sharia"
                                                    onClick={() => setIsPersonalStatusModalOpen(true)}
                                                >
                                                    الأحوال الشخصية
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label>موضوع القضية</label>
                                        <input
                                            type="text"
                                            name="caseSubject"
                                            value={caseData.caseSubject}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>اسم الكفيل</label>
                                        <input
                                            type="text"
                                            name="sponsorName"
                                            value={caseData.sponsorName}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>قيمة الدعوى</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="number"
                                                name="totalAmount"
                                                value={caseData.totalAmount || ''}
                                                onChange={handleInputChange}
                                                placeholder="قيمة المطالبة"
                                                style={{ flex: 1 }}
                                                step="0.01"
                                            />
                                            <select
                                                name="currency"
                                                value={caseData.currency || 'IQD'}
                                                onChange={handleInputChange}
                                                style={{ width: '120px', flexShrink: 0 }}
                                            >
                                                <option value="IQD">دينار عراقي</option>
                                                <option value="USD">دولار أمريكي</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Additional Options Section - Moved below case details fields */}
                                <div className="additional-options-container span-5" style={{ marginTop: '12px', marginBottom: '0', borderTop: '2px solid #e5e7eb', paddingTop: '10px' }}>
                                    <h2 className="section-title sub-section-title" style={{ marginBottom: '0', paddingBottom: '0' }}>
                                        <FiPlusCircle /> خيارات اخرى لإضافتها للملف
                                    </h2>

                                    <div className="section-grid col-5 additional-fields-grid" style={{ marginTop: '0', marginBottom: '0' }}>
                                        {selectedOptions.map(option => {
                                            const fieldName = getOptionFieldName(option);
                                            const isDate = option.includes('تاريخ') || option.includes('مدة');
                                            const isNumber = option.includes('قيمة') || option.includes('مبلغ') || option.includes('رقم') || option.includes('صفحة') || option.includes('عدد') || option.includes('سنوات');

                                            // Specialized Inputs
                                            let inputElement;

                                            if (option === 'المذهب') {
                                                inputElement = (
                                                    <select name={fieldName} value={caseData[fieldName] || ''} onChange={handleInputChange}>
                                                        <option value="">اختر المذهب</option>
                                                        <option value="جعفري">جعفري</option>
                                                        <option value="حنبلي">حنبلي</option>
                                                        <option value="شافعي">شافعي</option>
                                                        <option value="مالكي">مالكي</option>
                                                        <option value="حنفي">حنفي</option>
                                                    </select>
                                                );
                                            } else if (option === 'وجود سلاح' || option === 'وجود إصابات' || option === 'وجود سابقة جنائية' || option === 'طلب تعويض مدني' || option === 'طلب ترحيل الجنحة' || option === 'طلب إلغاء المخالفة' || option === 'وجود استئناف سابق' || option === 'طلب زيارة المحضون' || option === 'طلب نصب وصي / قيم') {
                                                inputElement = (
                                                    <select name={fieldName} value={caseData[fieldName] || ''} onChange={handleInputChange}>
                                                        <option value="">اختر</option>
                                                        <option value="نعم">نعم</option>
                                                        <option value="لا">لا</option>
                                                    </select>
                                                );
                                            } else if (isDate && option !== 'مدة العقد (من – إلى)') {
                                                inputElement = (
                                                    <DatePicker
                                                        selected={caseData[fieldName] ? new Date(caseData[fieldName]) : null}
                                                        onChange={(date) => handleInputChange({ target: { name: fieldName, value: date ? date.toISOString() : '' } })}
                                                        dateFormat="yyyy/MM/dd"
                                                        customInput={<input className="custom-input" />}
                                                        placeholderText="YYYY/MM/DD"
                                                    />
                                                );
                                            } else if (option === 'مدة العقد (من – إلى)') {
                                                inputElement = (
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <DatePicker
                                                            selected={caseData.contract_duration_from ? new Date(caseData.contract_duration_from) : null}
                                                            onChange={(date) => handleInputChange({ target: { name: 'contract_duration_from', value: date ? date.toISOString() : '' } })}
                                                            dateFormat="yyyy/MM/dd"
                                                            customInput={<input className="custom-input" />}
                                                            placeholderText="من"
                                                        />
                                                        <DatePicker
                                                            selected={caseData.contract_duration_to ? new Date(caseData.contract_duration_to) : null}
                                                            onChange={(date) => handleInputChange({ target: { name: 'contract_duration_to', value: date ? date.toISOString() : '' } })}
                                                            dateFormat="yyyy/MM/dd"
                                                            customInput={<input className="custom-input" />}
                                                            placeholderText="إلى"
                                                        />
                                                    </div>
                                                );
                                            } else {
                                                inputElement = (
                                                    <input
                                                        type={isNumber ? "number" : "text"}
                                                        name={fieldName}
                                                        value={caseData[fieldName] || ''}
                                                        onChange={handleInputChange}
                                                        autoComplete="off"
                                                    />
                                                );
                                            }

                                            return (
                                                <div className="form-field with-remove" key={option}>
                                                    <label>{option}</label>
                                                    <div className="input-wrapper">
                                                        {inputElement}
                                                        <button
                                                            type="button"
                                                            className="remove-option-btn"
                                                            onClick={() => handleRemoveOption(option)}
                                                            title="إزالة الحقل"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}    </div>

                                    <div className="options-grid">
                                        {allAdditionalOptions.map(option => {
                                            const isSelected = selectedOptions.includes(option);
                                            return (
                                                <div
                                                    key={option}
                                                    className={`option-title-card ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => !isSelected && handleAddOption(option)}
                                                    style={{ cursor: isSelected ? 'not-allowed' : 'pointer' }}
                                                >
                                                    <span className="option-title-text">{option}</span>
                                                    {!isSelected && <FiPlusCircle className="option-add-icon" />}
                                                    {isSelected && <span className="option-check-icon">✓</span>}
                                                </div>
                                            );
                                        })}
                                        {allAdditionalOptions.length === 0 && (
                                            <div className="options-empty-message">يرجى اختيار نوع ملف لعرض الخيارات المتاحة</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Client & Opponent Section */}
                            <div className="form-section span-5">
                                <div className="section-grid col-2">
                                    <div>
                                        <h2 className="section-title sub-section-title"><FiUser /> بيانات الموكل</h2>
                                        <div className="section-grid col-2">
                                            <div className="form-field">
                                                <label htmlFor="client_name">اسم الموكل</label>
                                                <select
                                                    id="client_name"
                                                    name="client_name"
                                                    value={caseData.client_name}
                                                    onChange={handleInputChange}
                                                    disabled={isLoading}
                                                    required
                                                >
                                                    <option value="">{isLoading ? "..." : "اختر"}</option>
                                                    {clientNames.map((c) => (
                                                        <option key={c.id} value={c.client_name}>{c.client_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-field">
                                                <label>الصفة</label>
                                                <select
                                                    name="client_type"
                                                    value={caseData.client_type}
                                                    onChange={handleInputChange}
                                                    required
                                                >
                                                    <option value="">اختر</option>
                                                    {clientTypes.map((t, i) => (
                                                        <option key={i} value={t}>{t}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-field">
                                                <label>صفة الموكل</label>
                                                <input
                                                    type="text"
                                                    name="client_adult_child"
                                                    value={caseData.client_adult_child}
                                                    readOnly
                                                    placeholder="-"
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label>الشكل القانوني</label>
                                                <input
                                                    type="text"
                                                    name="legal_form"
                                                    value={caseData.legal_form}
                                                    readOnly
                                                    placeholder="-"
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label>رقم الهوية</label>
                                                <input
                                                    type="text"
                                                    name="id_number"
                                                    value={caseData.id_number}
                                                    readOnly
                                                    placeholder="-"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h2 className="section-title sub-section-title"><FiUsers /> بيانات الخصم</h2>
                                        <div className="section-grid col-2">
                                            <div className="form-field">
                                                <label>اسم الخصم</label>
                                                <input
                                                    type="text"
                                                    name="opponentName"
                                                    value={caseData.opponentName}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label>هاتف الخصم</label>
                                                <input
                                                    type="text"
                                                    name="opponentPhone"
                                                    value={caseData.opponentPhone}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label>عنوان الخصم</label>
                                                <input
                                                    type="text"
                                                    name="opponentAddress"
                                                    value={caseData.opponentAddress}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label>محامي الخصم</label>
                                                <input
                                                    type="text"
                                                    name="opponentLawyer"
                                                    value={caseData.opponentLawyer}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label>هاتف محامي الخصم</label>
                                                <input
                                                    type="text"
                                                    name="opponentLawyerPhone"
                                                    value={caseData.opponentLawyerPhone}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contract & Notes Sections */}
                            <div className="form-section span-5">
                                <div className="section-grid col-2">
                                    <div>
                                        <h2 className="section-title sub-section-title"><FiFileText /> العقد</h2>
                                        <div className="editor-container">
                                            <SunEditor
                                                setContents={editorContent}
                                                onChange={setEditorContent}
                                                height="400px"
                                                setOptions={{
                                                    buttonList: [
                                                        ['font', 'fontSize', 'formatBlock'],
                                                        ['bold', 'underline', 'italic', 'strike'],
                                                        ['fontColor', 'hiliteColor', 'removeFormat'],
                                                        ['align', 'horizontalRule', 'list', 'table'],
                                                        ['link', 'image', 'video'],
                                                        ['undo', 'redo', 'fullScreen', 'print']
                                                    ],
                                                    rtl: true
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <h2 className="section-title sub-section-title"><FiEdit3 /> ملاحظات</h2>
                                        <div className="form-field">
                                            <textarea
                                                name="Notes"
                                                value={caseData.Notes}
                                                onChange={handleInputChange}
                                                rows="15"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                )}


                {/* Modal for selecting Penal Code Article */}
                {isPenalCodeModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsPenalCodeModalOpen(false)}>
                        <div className="modal-container big" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header penal">
                                <h3>اختر المادة من قانون العقوبات العراقي</h3>
                                <button onClick={() => setIsPenalCodeModalOpen(false)} className="close-btn">×</button>
                            </div>
                            <div className="modal-search">
                                <input
                                    type="text"
                                    placeholder="ابحث في المواد (رقم المادة أو المحتوى)..."
                                    value={penalCodeSearchQuery}
                                    onChange={(e) => setPenalCodeSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="modal-items-list">
                                {penalCodeArticles.length === 0 ? (
                                    <div className="loading-message">جاري تحميل المواد...</div>
                                ) : penalCodeArticles
                                    .filter(article =>
                                        !penalCodeSearchQuery ||
                                        article.article_number?.includes(penalCodeSearchQuery) ||
                                        article.article_content?.toLowerCase().includes(penalCodeSearchQuery.toLowerCase())
                                    ).length === 0 ? (
                                    <div className="no-results">لا توجد نتائج</div>
                                ) : (
                                    penalCodeArticles
                                        .filter(article =>
                                            !penalCodeSearchQuery ||
                                            article.article_number?.includes(penalCodeSearchQuery) ||
                                            article.article_content?.toLowerCase().includes(penalCodeSearchQuery.toLowerCase())
                                        )
                                        .map((article) => (
                                            <div key={article.id} className="article-item" onClick={() => handleSelectPenalCodeArticle(article)}>
                                                <div className="article-header">
                                                    <span className="article-number">المادة {article.article_number}</span>
                                                    <span className="law-name">{article.law_name_ar}</span>
                                                </div>
                                                <div className="article-text">{article.article_content}</div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal for selecting Criminal Procedures Law Article */}
                {isCriminalProceduresModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsCriminalProceduresModalOpen(false)}>
                        <div className="modal-container big" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header criminal-proc">
                                <h3>اختر المادة من قانون أصول المحاكمات الجزائية العراقي</h3>
                                <button onClick={() => setIsCriminalProceduresModalOpen(false)} className="close-btn">×</button>
                            </div>
                            <div className="modal-search">
                                <input
                                    type="text"
                                    placeholder="ابحث في المواد (رقم المادة أو المحتوى)..."
                                    value={criminalProceduresSearchQuery}
                                    onChange={(e) => setCriminalProceduresSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="modal-items-list">
                                {criminalProceduresArticles.length === 0 ? (
                                    <div className="loading-message">جاري تحميل المواد...</div>
                                ) : criminalProceduresArticles
                                    .filter(article =>
                                        !criminalProceduresSearchQuery ||
                                        article.article_number?.includes(criminalProceduresSearchQuery) ||
                                        article.article_content?.toLowerCase().includes(criminalProceduresSearchQuery.toLowerCase())
                                    ).length === 0 ? (
                                    <div className="no-results">لا توجد نتائج</div>
                                ) : (
                                    criminalProceduresArticles
                                        .filter(article =>
                                            !criminalProceduresSearchQuery ||
                                            article.article_number?.includes(criminalProceduresSearchQuery) ||
                                            article.article_content?.toLowerCase().includes(criminalProceduresSearchQuery.toLowerCase())
                                        )
                                        .map((article) => (
                                            <div key={article.id} className="article-item" onClick={() => handleSelectCriminalProceduresArticle(article)}>
                                                <div className="article-header">
                                                    <span className="article-number">المادة {article.article_number}</span>
                                                </div>
                                                <div className="article-text">{article.article_content}</div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal for selecting Personal Status Law Article */}
                {isPersonalStatusModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsPersonalStatusModalOpen(false)}>
                        <div className="modal-container big" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header sharia">
                                <h3>اختر المادة من قانون الأحوال الشخصية العراقي</h3>
                                <button onClick={() => setIsPersonalStatusModalOpen(false)} className="close-btn">×</button>
                            </div>
                            <div className="modal-search">
                                <input
                                    type="text"
                                    placeholder="ابحث في المواد (رقم المادة أو المحتوى)..."
                                    value={personalStatusSearchQuery}
                                    onChange={(e) => setPersonalStatusSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="modal-items-list">
                                {personalStatusArticles.length === 0 ? (
                                    <div className="loading-message">جاري تحميل المواد...</div>
                                ) : personalStatusArticles
                                    .filter(article =>
                                        !personalStatusSearchQuery ||
                                        article.article_no?.toString().includes(personalStatusSearchQuery) ||
                                        article.article_text?.toLowerCase().includes(personalStatusSearchQuery.toLowerCase())
                                    ).length === 0 ? (
                                    <div className="no-results">لا توجد نتائج</div>
                                ) : (
                                    personalStatusArticles
                                        .filter(article =>
                                            !personalStatusSearchQuery ||
                                            article.article_no?.toString().includes(personalStatusSearchQuery) ||
                                            article.article_text?.toLowerCase().includes(personalStatusSearchQuery.toLowerCase())
                                        )
                                        .map((article) => (
                                            <div key={article.id} className="article-item" onClick={() => handleSelectPersonalStatusArticle(article)}>
                                                <div className="article-header">
                                                    <span className="article-number">المادة {article.article_no}</span>
                                                </div>
                                                <div className="article-text">{article.article_text}</div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                .page-container {
                    padding: 0 24px 32px 24px;
                    padding-top: 8px;
                    background: transparent;
                    font-family: 'Almarai', 'Cairo', sans-serif;
                    direction: rtl;
                    max-width: 100%;
                    margin: 0;
                    min-height: 100vh;
                    width: 100%;
                }

                .success-message {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background-color: #10b981;
                    color: white;
                    padding: 16px 24px;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
                    z-index: 9999;
                    animation: slideIn 0.3s ease-out;
                }

                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                    width: 100%;
                    padding: 0 4px;
                }

                .page-title {
                    font-size: 1.75rem;
                    font-weight: 800;
                    color: #1a202c;
                    margin: 0;
                }

                .case-number-display {
                    margin: 8px 0 0 0;
                    font-size: 0.95rem;
                    color: #6b7280;
                    font-weight: 600;
                }

                .save-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                    padding: 14px 32px;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 1.375rem;
                    text-decoration: none;
                    transition: none;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35), 0 2px 6px rgba(59, 130, 246, 0.2);
                    min-width: 160px;
                    height: 48px;
                }
                .save-button:hover:not(:disabled) {
                    transform: none;
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35), 0 2px 6px rgba(59, 130, 246, 0.2);
                }
                .save-button:disabled {
                    background: #9ca3af;
                    cursor: not-allowed;
                    box-shadow: none;
                    transform: none;
                }

                .form-grid {
                    display: grid;
                    gap: 20px;
                    grid-template-columns: 1fr;
                    max-width: 100%;
                    width: 100%;
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
                .form-section:first-of-type {
                    padding: 24px 28px;
                }

                .section-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 1.375rem;
                    font-weight: 700;
                    color: #111827;
                    margin: 0 0 18px 0;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #e5e7eb;
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
                    margin-bottom: 12px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid #e5e7eb;
                }
                .sub-section-title svg {
                    color: #3b82f6;
                    width: 18px;
                    height: 18px;
                }
                
                .section-grid {
                    display: grid;
                    gap: 16px 20px;
                }
                .col-2 { grid-template-columns: repeat(2, 1fr); }
                .col-3 { grid-template-columns: repeat(3, 1fr); }
                .col-4 { grid-template-columns: repeat(4, 1fr); }
                .col-5 { grid-template-columns: repeat(5, 1fr); }

                .form-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .form-field label {
                    font-weight: 600;
                    color: #374151;
                    font-size: 0.875rem;
                    margin-bottom: 6px;
                    letter-spacing: -0.01em;
                }

                .form-field input, .form-field select, .form-field textarea, .custom-input {
                    width: 100%;
                    padding: 10px 14px;
                    border: 1.5px solid #d1d5db;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-family: inherit;
                    background-color: #ffffff;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    color: #1f2937;
                    line-height: 1.5;
                    height: 42px;
                    overflow: visible;
                }

                .form-field input:focus, .form-field select:focus, .form-field textarea:focus, .custom-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
                    background-color: #ffffff;
                }
                
                .form-field input[readonly] {
                    background-color: #f9fafb;
                    cursor: not-allowed;
                }

                .form-field textarea {
                    height: auto;
                    min-height: 120px;
                    resize: vertical;
                    padding: 12px 16px;
                    line-height: 1.6;
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
                
                .additional-options-container {
                    border-top: 2px solid #e5e7eb;
                    padding-top: 10px;
                    margin-top: 12px;
                    position: relative;
                    overflow: visible;
                }

                .span-2 { grid-column: span 2; }
                .span-3 { grid-column: span 3; }
                .span-4 { grid-column: span 4; }
                .span-5 { grid-column: span 5; }

                .additional-fields-grid {
                    min-height: 50px;
                    margin-bottom: 0;
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

                .add-option-wrapper {
                    position: relative;
                    margin-top: 0;
                    z-index: 10;
                }

                .add-option-button {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
                    color: #374151;
                    border: 1.5px solid #d1d5db;
                    padding: 12px 20px;
                    border-radius: 10px;
                    font-weight: 600;
                    font-size: 0.9375rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    width: auto;
                }
                .add-option-button:hover:not(:disabled) {
                    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                    border-color: #3b82f6;
                    color: #3b82f6;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
                }
                .add-option-button:disabled {
                    cursor: not-allowed;
                    opacity: 0.6;
                }
                .add-option-button .chevron-icon {
                    transition: transform 0.2s ease-in-out;
                }
                .add-option-button .chevron-icon.open {
                    transform: rotate(180deg);
                }

                .options-dropdown {
                    position: absolute;
                    top: calc(100% + 4px);
                    right: 0;
                    background-color: white;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    z-index: 1001;
                    width: 280px;
                    max-height: 250px;
                    overflow-y: auto;
                }

                .options-dropdown-item {
                    padding: 10px 16px;
                    font-size: 0.9rem;
                    color: #1f2937;
                    cursor: pointer;
                    border-bottom: 1px solid #f3f4f6;
                    transition: background-color 0.2s ease;
                }
                .options-dropdown-item:last-child {
                    border-bottom: none;
                }
                .options-dropdown-item:hover {
                    background-color: #f9fafb;
                }
                .options-dropdown-item.disabled {
                    color: #9ca3af;
                    cursor: not-allowed;
                    background-color: transparent;
                }

                .select-article-btn {
                    padding: 8px 12px;
                    border: none;
                    border-radius: 6px;
                    color: white;
                    font-weight: 600;
                    font-size: 0.8rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    white-space: nowrap;
                }
                .select-article-btn.penal { background: #1e40af; }
                .select-article-btn.criminal-proc { background: #7c3aed; }
                .select-article-btn.sharia { background: #dc2626; }
                .select-article-btn:hover { opacity: 0.9; transform: translateY(-1px); }

                .options-grid {
                    display: grid;
                    grid-template-columns: repeat(5, minmax(0, 1fr));
                    gap: 8px;
                    margin-top: 16px;
                }

                .option-title-card {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 6px 8px;
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                    border: 2px solid #e2e8f0;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    min-height: 40px;
                    max-width: 100%;
                }

                .option-title-card:hover {
                    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                    border-color: #3b82f6;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
                }

                .option-title-card.selected {
                    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
                    border-color: #3b82f6;
                    opacity: 0.8;
                    cursor: not-allowed;
                }

                .option-check-icon {
                    font-size: 1rem;
                    color: #10b981;
                    margin-right: 6px;
                    flex-shrink: 0;
                    font-weight: bold;
                }

                .option-title-text {
                    font-size: 0.875rem;
                    font-weight: 700;
                    color: #374151;
                    text-align: right;
                    flex: 1;
                    line-height: 1.4;
                    word-break: break-word;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    letter-spacing: -0.01em;
                }

                .option-add-icon {
                    font-size: 0.875rem;
                    color: #3b82f6;
                    margin-right: 6px;
                    flex-shrink: 0;
                }

                .option-title-card:hover .option-add-icon {
                    color: #2563eb;
                    transform: scale(1.1);
                }

                .options-empty-message {
                    text-align: center;
                    padding: 32px;
                    color: #6b7280;
                    font-size: 0.9375rem;
                    background: #f9fafb;
                    border-radius: 10px;
                    border: 1px dashed #d1d5db;
                    grid-column: span 5;
                }

                /* Modal Overlay */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    bottom: 0;
                    right: 0;
                    left: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .modal-container.big {
                    width: 90%;
                    max-width: 900px;
                    max-height: 85vh;
                    background: white;
                    border-radius: 16px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                }

                .modal-header {
                    padding: 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: white;
                }
                .modal-header.penal { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); }
                .modal-header.criminal-proc { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); }
                .modal-header.sharia { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); }

                .modal-header h3 { margin: 0; font-size: 1.25rem; font-weight: 700; }
                .close-btn { 
                    background: rgba(255, 255, 255, 0.2); 
                    border: none; 
                    color: white; 
                    font-size: 1.5rem; 
                    cursor: pointer;
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .modal-search { padding: 16px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
                .modal-search input {
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px solid #e5e7eb;
                    border-radius: 10px;
                    font-size: 1rem;
                    outline: none;
                }

                .modal-items-list { flex: 1; overflow-y: auto; padding: 20px; background: #fafbfc; }
                .article-item {
                    padding: 20px;
                    border: 2px solid #e5e7eb;
                    border-radius: 12px;
                    margin-bottom: 16px;
                    cursor: pointer;
                    background: white;
                    transition: all 0.2s;
                }
                .article-item:hover {
                    border-color: #3b82f6;
                    background: #f8fafc;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
                    transform: translateY(-2px);
                }

                .article-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
                .article-number {
                    background: #3b82f6;
                    color: white;
                    padding: 4px 12px;
                    border-radius: 6px;
                    font-weight: 700;
                }
                .law-name { color: #6b7280; font-size: 0.8rem; font-style: italic; }
                .article-text { line-height: 1.6; color: #374151; font-size: 0.95rem; }

                .loading-message, .no-results { text-align: center; padding: 40px; color: #6b7280; }

                @media (max-width: 1600px) {
                    .form-grid { grid-template-columns: repeat(3, 1fr); }
                    .span-4, .span-5 { grid-column: span 3; }
                    .col-4 { grid-template-columns: repeat(3, 1fr); }
                    .form-section .section-grid.col-5 {
                        grid-template-columns: repeat(5, 1fr) !important;
                    }
                }

                @media (max-width: 1200px) {
                    .form-grid { grid-template-columns: repeat(2, 1fr); }
                    .span-3, .span-4, .span-5 { grid-column: span 2; }
                    .col-3, .col-4 { grid-template-columns: repeat(2, 1fr); }
                    .form-section .section-grid.col-5 {
                        grid-template-columns: repeat(5, 1fr) !important;
                    }
                }

                @media (max-width: 768px) {
                    .page-container { padding: 16px; }
                    .page-header { flex-direction: column; align-items: stretch; gap: 16px; }
                    .form-grid, .section-grid { grid-template-columns: 1fr; }
                    .span-2, .span-3, .span-4, .span-5 { grid-column: span 1; }
                    .col-2, .col-3, .col-4 { grid-template-columns: 1fr; }
                    .form-section .section-grid.col-5 {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                }

                @media (max-width: 480px) {
                    .form-section .section-grid.col-5 {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </Layout>
    );
};

export default withAuth(EditCasePage, ['can_edit_cases'], true);
