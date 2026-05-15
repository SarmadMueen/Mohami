import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/layout/Layout';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';
import Link from 'next/link';
import Head from 'next/head';
import { FiPlus, FiSearch, FiArrowRight, FiArrowLeft, FiEye } from 'react-icons/fi';
import { FaUserFriends, FaBuilding, FaBars, FaTimes } from 'react-icons/fa';
import { AiOutlineFileText } from 'react-icons/ai';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useSubscription } from '../../context/SubscriptionContext';

const AllClientsPage = () => {
  const { isReadOnly, loading: subLoading } = useSubscription();
  const [activeTab, setActiveTab] = useState('clients');

  // Clients state
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);

  // Attorneys state
  const [attorneys, setAttorneys] = useState([]);
  const [filteredAttorneys, setFilteredAttorneys] = useState([]);
  const [showAttorneyPopup, setShowAttorneyPopup] = useState(false);
  const [attorneyFormData, setAttorneyFormData] = useState({
    clientName: '',
    AttorneyNumber: '',
    contractType: '',
    startDate: null,
    endDate: null,
    notes: '',
    fileInput: null,
    fileUrl: '',
  });

  // Contracts state
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [showContractPopup, setShowContractPopup] = useState(false);
  const [contractFormData, setContractFormData] = useState({
    contractNumber: '',
    clientName: '',
    contractType: '',
    startDate: null,
    endDate: null,
    contractAmount: '',
    notes: '',
    fileInput: null,
    fileUrl: '',
  });

  // Common state
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedLegalForm, setSelectedLegalForm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [hasMounted, setHasMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clientNames, setClientNames] = useState([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [folders, setFolders] = useState(["docs", "main", "session_register"]);
  const [selectedAttachmentFolder, setSelectedAttachmentFolder] = useState("main");
  const [selectedContractFolder, setSelectedContractFolder] = useState("main");
  const attorneyFileInputRef = useRef(null);
  const contractFileInputRef = useRef(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Helper function to get admin_id
  const getAdminId = async () => {
    const user = supabase.auth.user();
    if (!user) return null;

    const userId = user.id;

    // Robust Metadata Fetch: 
    // Try to find a row where this user is the "primary user" (user_id) OR the "assigned lawyer" (new_lawyer_id).
    // This covers cases where the lawyer's Auth ID is stored in new_lawyer_id but the row has the Admin's user_id.
    const { data: metaList, error: metaError } = await supabase
      .from("user_metadata")
      .select("role, admin_user_id, new_lawyer_id, user_id")
      .or(`user_id.eq.${userId},new_lawyer_id.eq.${userId}`);

    if (metaError) {
      console.error("Metadata error:", metaError.message);
      return null;
    }

    if (!metaList || metaList.length === 0) return null;

    // Prefer the row where I am explicitly the 'new_lawyer_id'
    const lawyerRow = metaList.find(m => m.new_lawyer_id === userId);
    const userRow = metaList.find(m => m.user_id === userId);

    const targetMeta = lawyerRow || userRow || metaList[0];

    if (targetMeta) {
      // If I found a row where I am the lawyer, my admin is the 'admin_user_id' in that row.
      // If I am the admin (userRow), 'admin_user_id' might be self or null.
      return targetMeta.admin_user_id || targetMeta.user_id;
    }
    return userId;
  };

  // Fetch client names for dropdowns (same logic as add-case.js)
  useEffect(() => {
    const fetchClientNames = async () => {
      try {
        const user = supabase.auth.user();
        if (!user) return;

        const userId = user.id;
        const { data: userMetadataList, error: metaError } = await supabase
          .from("user_metadata")
          .select("role, admin_user_id, new_lawyer_id")
          .eq("user_id", userId);

        if (metaError) throw new Error("Metadata error: " + metaError.message);
        if (!userMetadataList || userMetadataList.length === 0) return;

        const userMetadata = userMetadataList[0];
        const { role, admin_user_id, new_lawyer_id } = userMetadata;
        let query = supabase.from("clients_data").select("id, client_name");

        if (role === "Admin" || role === "الفئة 1") {
          query = query.eq("admin_id", admin_user_id);
        } else if (role === "Lawyer" || role === "الفئة 2") {
          query = query.or(`admin_id.eq.${admin_user_id},lawyer_id.eq.${new_lawyer_id || userId}`);
        }

        const { data: clients, error: clientError } = await query;
        if (clientError) throw clientError;
        setClientNames(clients || []);
      } catch (error) {
        console.error('Error fetching client names:', error.message);
        setClientNames([]);
      }
    };

    if (hasMounted) {
      fetchClientNames();
    }
  }, [hasMounted]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const user = supabase.auth.user();
        if (!user) throw new Error('User not logged in');

        // Determine Firm Scope (Admin ID)
        const firmAdminId = await getAdminId();
        // Fallback to user.id if getAdminId returns null (though getAdminId handles fallback mostly)
        const effectiveAdminId = firmAdminId || user.id;

        // Construct Query:
        // 1. Clients belonging to Firm Admin (admin_id = effectiveAdminId)
        // 2. Clients where Lawyer is Firm Admin (lawyer_id = effectiveAdminId)
        // 3. Clients where I am the Lawyer (lawyer_id = user.id)
        // 4. Clients where I am the Admin (admin_id = user.id) - redundant if I am admin, but safe
        const queryCondition = `admin_id.eq.${effectiveAdminId},lawyer_id.eq.${effectiveAdminId},admin_id.eq.${user.id},lawyer_id.eq.${user.id}`;

        // Fetch clients
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients_data')
          .select('*')
          .or(queryCondition);

        if (clientsError) throw clientsError;

        // Fetch cases count for each client
        const clientIds = clientsData.map(c => c.id);
        const clientNames = clientsData.map(c => c.client_name).filter(Boolean);

        let casesCountMap = {};
        if (clientIds.length > 0 || clientNames.length > 0) {
          const { data: casesData, error: casesError } = await supabase
            .from('cases')
            .select('client_name, id')
            .or(queryCondition); // Use same firm-wide scope for cases

          if (!casesError && casesData) {
            casesData.forEach(caseItem => {
              const clientName = caseItem.client_name;
              if (clientName) {
                casesCountMap[clientName] = (casesCountMap[clientName] || 0) + 1;
              }
            });
          }
        }

        // Enrich clients with cases count and contacts count
        const enrichedClients = clientsData.map(client => ({
          ...client,
          casesCount: casesCountMap[client.client_name] || 0,
          contactsCount: client.connection_name ? 1 : 0
        }));

        setClients(enrichedClients);
        setFilteredClients(enrichedClients);
      } catch (error) {
        console.error('Error fetching clients:', error.message);
      } finally {
        setLoading(false);
      }
    };

    if (hasMounted && activeTab === 'clients') {
      fetchClients();
    }
  }, [hasMounted, activeTab]);

  // Fetch attorneys
  useEffect(() => {
    const fetchAttorneys = async () => {
      try {
        setLoading(true);
        const adminId = await getAdminId();
        if (!adminId) {
          setAttorneys([]);
          setFilteredAttorneys([]);
          return;
        }

        const { data: attorneyData, error: attorneyError } = await supabase
          .from('attorney')
          .select('*')
          .eq('admin_id', adminId);

        if (attorneyError) throw attorneyError;

        setAttorneys(attorneyData || []);
        setFilteredAttorneys(attorneyData || []);
      } catch (error) {
        console.error('Error fetching attorneys:', error.message);
        setAttorneys([]);
        setFilteredAttorneys([]);
      } finally {
        setLoading(false);
      }
    };

    if (hasMounted && activeTab === 'attorney') {
      fetchAttorneys();
    }
  }, [hasMounted, activeTab]);

  // Fetch contracts
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setLoading(true);
        const adminId = await getAdminId();
        if (!adminId) {
          setContracts([]);
          setFilteredContracts([]);
          return;
        }

        const { data: contractData, error: contractError } = await supabase
          .from('contract')
          .select('*')
          .eq('admin_id', adminId);

        if (contractError) throw contractError;

        setContracts(contractData || []);
        setFilteredContracts(contractData || []);
      } catch (error) {
        console.error('Error fetching contracts:', error.message);
        setContracts([]);
        setFilteredContracts([]);
      } finally {
        setLoading(false);
      }
    };

    if (hasMounted && activeTab === 'contracts') {
      fetchContracts();
    }
  }, [hasMounted, activeTab]);

  // Filter clients
  useEffect(() => {
    if (activeTab !== 'clients') return;

    let filtered = [...clients];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((client) =>
        [client.client_name, client.id, client.legal_form, client.address]
          .map((field) => field?.toString().toLowerCase())
          .some((field) => field?.includes(query))
      );
    }

    // Legal form filter
    if (selectedLegalForm) {
      filtered = filtered.filter(client => client.legal_form === selectedLegalForm);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.client_name?.localeCompare(b.client_name, 'ar') || 0;
      } else {
        return b.client_name?.localeCompare(a.client_name, 'ar') || 0;
      }
    });

    setFilteredClients(filtered);
    setCurrentPage(1);
  }, [searchQuery, selectedLegalForm, sortOrder, clients, activeTab]);

  // Filter attorneys
  useEffect(() => {
    if (activeTab !== 'attorney') return;

    let filtered = [...attorneys];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((attorney) =>
        [attorney.client_name, attorney.attorney_number, attorney.contract_type]
          .map((field) => field?.toString().toLowerCase())
          .some((field) => field?.includes(query))
      );
    }
    filtered.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.client_name?.localeCompare(b.client_name, 'ar') || 0;
      } else {
        return b.client_name?.localeCompare(a.client_name, 'ar') || 0;
      }
    });
    setFilteredAttorneys(filtered);
    setCurrentPage(1);
  }, [searchQuery, sortOrder, attorneys, activeTab]);

  // Filter contracts
  useEffect(() => {
    if (activeTab !== 'contracts') return;

    let filtered = [...contracts];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((contract) =>
        [contract.client_name, contract.contract_number, contract.contract_type]
          .map((field) => field?.toString().toLowerCase())
          .some((field) => field?.includes(query))
      );
    }
    filtered.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.client_name?.localeCompare(b.client_name, 'ar') || 0;
      } else {
        return b.client_name?.localeCompare(a.client_name, 'ar') || 0;
      }
    });
    setFilteredContracts(filtered);
    setCurrentPage(1);
  }, [searchQuery, sortOrder, contracts, activeTab]);

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('ar-EG', options);
    } catch {
      return dateString;
    }
  };

  const getFolderDisplayName = (folderName) => {
    const names = {
      docs: "المستندات",
      main: "المجلد الرئيسي",
      session_register: "محاضر الجلسات",
    };
    return names[folderName] || folderName;
  };

  const handleImageClick = (imageUrl) => {
    if (imageUrl) setSelectedImageUrl(imageUrl);
  };

  const handleClosePopup = () => {
    setSelectedImageUrl('');
  };

  // Handle attorney file upload
  const handleAttorneyFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedAttachmentFolder) {
      alert("يرجى اختيار مجلد أولاً");
      e.target.value = "";
      return;
    }

    try {
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = `${selectedAttachmentFolder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { publicURL } = await supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      // Update form data with the file URL
      setAttorneyFormData({ ...attorneyFormData, fileInput: file, fileUrl: publicURL });
    } catch (error) {
      console.error('Error uploading file:', error.message);
      alert('حدث خطأ في تحميل الملف: ' + error.message);
      e.target.value = "";
    }
  };

  // Handle attorney form submission
  const handleAttorneySubmit = async (e) => {
    e.preventDefault();
    try {
      const adminId = await getAdminId();
      if (!adminId) throw new Error('لم يتم العثور على معرف المسؤول');

      const formatDateToString = (date) => {
        if (!date) return null;
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const { data: insertedData, error } = await supabase.from('attorney').insert([
        {
          client_name: attorneyFormData.clientName.trim(),
          attorney_number: attorneyFormData.AttorneyNumber.trim(),
          contract_type: attorneyFormData.contractType,
          start_date: formatDateToString(attorneyFormData.startDate),
          end_date: formatDateToString(attorneyFormData.endDate),
          notes: attorneyFormData.notes.trim(),
          attach_1: attorneyFormData.fileUrl || null,
          admin_id: adminId,
        },
      ]).select();

      if (error) throw error;

      setShowAttorneyPopup(false);
      setAttorneyFormData({
        clientName: '',
        AttorneyNumber: '',
        contractType: '',
        startDate: null,
        endDate: null,
        notes: '',
        fileInput: null,
        fileUrl: '',
      });
      setSelectedAttachmentFolder("main");

      // Refresh attorneys list
      const { data: attorneyData } = await supabase
        .from('attorney')
        .select('*')
        .eq('admin_id', adminId);
      setAttorneys(attorneyData || []);
      setFilteredAttorneys(attorneyData || []);
    } catch (error) {
      console.error('Error inserting attorney:', error.message);
      alert('حدث خطأ في إضافة التوكيل: ' + error.message);
    }
  };

  // Handle contract file upload
  const handleContractFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedContractFolder) {
      alert("يرجى اختيار مجلد أولاً");
      e.target.value = "";
      return;
    }

    try {
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = `${selectedContractFolder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { publicURL } = await supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      // Update form data with the file URL
      setContractFormData({ ...contractFormData, fileInput: file, fileUrl: publicURL });
    } catch (error) {
      console.error('Error uploading file:', error.message);
      alert('حدث خطأ في تحميل الملف: ' + error.message);
      e.target.value = "";
    }
  };

  // Handle contract form submission
  const handleContractSubmit = async (e) => {
    e.preventDefault();
    try {
      const adminId = await getAdminId();
      if (!adminId) throw new Error('لم يتم العثور على معرف المسؤول');

      const formatDateToString = (date) => {
        if (!date) return null;
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const { data: insertedData, error } = await supabase.from('contract').insert([
        {
          contract_number: contractFormData.contractNumber.trim(),
          client_name: contractFormData.clientName.trim(),
          contract_type: contractFormData.contractType,
          start_date: formatDateToString(contractFormData.startDate),
          end_date: formatDateToString(contractFormData.endDate),
          contract_amount: contractFormData.contractAmount.trim(),
          notes: contractFormData.notes.trim(),
          attach_1: contractFormData.fileUrl || null,
          attach_2: null,
          attach_3: null,
          attach_4: null,
          admin_id: adminId,
        },
      ]).select();

      if (error) throw error;

      setShowContractPopup(false);
      setContractFormData({
        contractNumber: '',
        clientName: '',
        contractType: '',
        startDate: null,
        endDate: null,
        contractAmount: '',
        notes: '',
        fileInput: null,
        fileUrl: '',
      });
      setSelectedContractFolder("main");

      // Refresh contracts list
      const { data: contractData } = await supabase
        .from('contract')
        .select('*')
        .eq('admin_id', adminId);
      setContracts(contractData || []);
      setFilteredContracts(contractData || []);
    } catch (error) {
      console.error('Error inserting contract:', error.message);
      alert('حدث خطأ في إضافة العقد: ' + error.message);
    }
  };

  // Get unique legal forms for filter dropdown
  const legalForms = [...new Set(clients.map(c => c.legal_form).filter(Boolean))];

  // Pagination
  const getCurrentData = () => {
    if (activeTab === 'clients') return filteredClients;
    if (activeTab === 'attorney') return filteredAttorneys;
    if (activeTab === 'contracts') return filteredContracts;
    return [];
  };

  const currentData = getCurrentData();
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = currentData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(currentData.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (!hasMounted) return null;

  return (
    <>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>
      <Layout>
        <div className="clients-page">
          {/* Mobile Menu Button */}
          <div className="mobile-menu-wrapper">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>

          <div className="clients-container">
            <div className="clients-layout">
              {/* Sidebar */}
              <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                  <div className="sidebar-icon-wrapper">
                    <FaUserFriends className="sidebar-icon" />
                  </div>
                  <h2 className="sidebar-title">الموكلين</h2>
                  <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
                    <FaTimes />
                  </button>
                </div>

                <nav className="sidebar-nav">
                  <button
                    className={`nav-item ${activeTab === 'clients' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('clients');
                      setSidebarOpen(false);
                      setCurrentPage(1);
                    }}
                  >
                    <FaUserFriends className="nav-icon" />
                    <span>قائمة الموكلين</span>
                  </button>
                  <button
                    className={`nav-item ${activeTab === 'attorney' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('attorney');
                      setSidebarOpen(false);
                      setCurrentPage(1);
                    }}
                  >
                    <FaBuilding className="nav-icon" />
                    <span>الوكالات</span>
                  </button>
                  <button
                    className={`nav-item ${activeTab === 'contracts' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('contracts');
                      setSidebarOpen(false);
                      setCurrentPage(1);
                    }}
                  >
                    <AiOutlineFileText className="nav-icon" />
                    <span>العقود</span>
                  </button>
                </nav>
              </div>

              {/* Separator */}
              <div className="separator"></div>

              {/* Mobile Tab Navigation */}
              <div className="mobile-tab-nav">
                <button
                  className={`mobile-tab ${activeTab === 'clients' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('clients'); setCurrentPage(1); }}
                >
                  <FaUserFriends style={{ fontSize: '14px' }} />
                  <span>الموكلين</span>
                </button>
                <button
                  className={`mobile-tab ${activeTab === 'attorney' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('attorney'); setCurrentPage(1); }}
                >
                  <FaBuilding style={{ fontSize: '14px' }} />
                  <span>الوكالات</span>
                </button>
                <button
                  className={`mobile-tab ${activeTab === 'contracts' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('contracts'); setCurrentPage(1); }}
                >
                  <AiOutlineFileText style={{ fontSize: '14px' }} />
                  <span>العقود</span>
                </button>
              </div>

              {/* Content Area */}
              <div className="content-area">
                <div className="clients-content">
                  {/* Search Bar */}
                  <form className="search-bar-container" onSubmit={handleSearch}>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="البحث برقم الملف, رقم الدعوى, الموكل"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" className="search-button">
                      بحث
                    </button>
                  </form>

                  {/* Action Button */}
                  <div className="action-button-wrapper">
                    {activeTab === 'clients' && (
                      <Link href="/client/add_cl">
                        <a
                          className="add-client-button"
                          style={{
                            opacity: isReadOnly || subLoading ? 0.5 : 1,
                            cursor: isReadOnly || subLoading ? 'not-allowed' : 'pointer',
                            pointerEvents: isReadOnly || subLoading ? 'none' : 'auto'
                          }}
                        >
                          <FiPlus />
                          <span>موكل جديد</span>
                        </a>
                      </Link>
                    )}
                    {activeTab === 'attorney' && (
                      <button
                        className="add-client-button"
                        onClick={() => setShowAttorneyPopup(true)}
                        disabled={isReadOnly || subLoading}
                        style={{
                          opacity: isReadOnly || subLoading ? 0.5 : 1,
                          cursor: isReadOnly || subLoading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <FiPlus />
                        <span>إضافة توكيل</span>
                      </button>
                    )}
                    {activeTab === 'contracts' && (
                      <button className="add-client-button" onClick={() => setShowContractPopup(true)}>
                        <FiPlus />
                        <span>إضافة عقد</span>
                      </button>
                    )}
                  </div>

                  {/* Render Content */}
                  {loading ? (
                    <div className="loading-text">جاري تحميل البيانات...</div>
                  ) : (
                    <>
                      {activeTab === 'clients' && (
                        <>
                          <table>
                            <thead>
                              <tr>
                                <th>رمز الموكل</th>
                                <th>اسم الموكل</th>
                                <th>الشكل القانوني</th>
                                <th>العنوان</th>
                                <th>مجموع جهات الاتصال</th>
                                <th>مجموع القضايا وملفات التنفيذ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentItems.length > 0 ? (
                                currentItems.map((client) => (
                                  <tr key={client.id} className="case-row">
                                    <td>{client.id || '-'}</td>
                                    <td>
                                      <Link href={`/client/view-client?id=${client.id}`}>
                                        <a className="client-link">{client.client_name || '-'}</a>
                                      </Link>
                                    </td>
                                    <td>{client.legal_form || '-'}</td>
                                    <td>{client.address || '-'}</td>
                                    <td>{client.contactsCount || 0}</td>
                                    <td>{client.casesCount || 0}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="6">لا توجد بيانات لعرضها</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                          <div className="mobile-cards">
                            {currentItems.length > 0 ? currentItems.map((client) => (
                              <Link key={client.id} href={`/client/view-client?id=${client.id}`}>
                                <a className="mobile-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                                  <div className="mobile-card-header">
                                    <span className="mobile-card-name">{client.client_name || '-'}</span>
                                    <span className="mobile-card-id">#{client.id}</span>
                                  </div>
                                  <div className="mobile-card-row">
                                    <span className="mobile-card-label">الشكل القانوني</span>
                                    <span className="mobile-card-value">{client.legal_form || '-'}</span>
                                  </div>
                                  <div className="mobile-card-row">
                                    <span className="mobile-card-label">العنوان</span>
                                    <span className="mobile-card-value">{client.address || '-'}</span>
                                  </div>
                                  <div className="mobile-card-row">
                                    <span className="mobile-card-label">القضايا</span>
                                    <span className="mobile-card-value">{client.casesCount || 0}</span>
                                  </div>
                                </a>
                              </Link>
                            )) : (
                              <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>لا توجد بيانات لعرضها</div>
                            )}
                          </div>
                        </>
                      )}

                      {activeTab === 'attorney' && (
                        <>
                          <table>
                            <thead>
                              <tr>
                                <th>اسم الموكل</th>
                                <th>نوع التوكيل</th>
                                <th>رقم التوكيل</th>
                                <th>تاريخ البدء</th>
                                <th>تاريخ الانتهاء</th>
                                <th>الملاحظات</th>
                                <th>المرفقات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentItems.length > 0 ? (
                                currentItems.map((attorney) => (
                                  <tr key={attorney.id} className="case-row">
                                    <td>{attorney.client_name || '-'}</td>
                                    <td>{attorney.contract_type || '-'}</td>
                                    <td>{attorney.attorney_number || '-'}</td>
                                    <td>{formatDate(attorney.start_date)}</td>
                                    <td>{formatDate(attorney.end_date)}</td>
                                    <td>{attorney.notes || '-'}</td>
                                    <td>
                                      {attorney.attach_1 ? (
                                        <button
                                          onClick={() => handleImageClick(attorney.attach_1)}
                                          className="view-attachment-btn"
                                        >
                                          <FiEye />
                                          عرض
                                        </button>
                                      ) : (
                                        '-'
                                      )}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="7">لا توجد بيانات لعرضها</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                          <div className="mobile-cards">
                            {currentItems.length > 0 ? currentItems.map((attorney) => (
                              <div key={attorney.id} className="mobile-card">
                                <div className="mobile-card-header">
                                  <span className="mobile-card-name">{attorney.client_name || '-'}</span>
                                  <span className="mobile-card-id">{attorney.contract_type || '-'}</span>
                                </div>
                                <div className="mobile-card-row">
                                  <span className="mobile-card-label">رقم التوكيل</span>
                                  <span className="mobile-card-value">{attorney.attorney_number || '-'}</span>
                                </div>
                                <div className="mobile-card-row">
                                  <span className="mobile-card-label">من</span>
                                  <span className="mobile-card-value">{formatDate(attorney.start_date)}</span>
                                </div>
                                <div className="mobile-card-row">
                                  <span className="mobile-card-label">إلى</span>
                                  <span className="mobile-card-value">{formatDate(attorney.end_date)}</span>
                                </div>
                                {attorney.attach_1 && (
                                  <button
                                    onClick={() => handleImageClick(attorney.attach_1)}
                                    className="view-attachment-btn"
                                    style={{ alignSelf: 'flex-start' }}
                                  >
                                    <FiEye /> عرض المرفق
                                  </button>
                                )}
                              </div>
                            )) : (
                              <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>لا توجد بيانات لعرضها</div>
                            )}
                          </div>
                        </>
                      )}

                      {activeTab === 'contracts' && (
                        <>
                          <table>
                            <thead>
                              <tr>
                                <th>اسم الموكل</th>
                                <th>نوع العقد</th>
                                <th>رقم العقد</th>
                                <th>مبلغ العقد</th>
                                <th>تاريخ البدء</th>
                                <th>تاريخ الانتهاء</th>
                                <th>الملاحظات</th>
                                <th>المرفقات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentItems.length > 0 ? (
                                currentItems.map((contract) => (
                                  <tr key={contract.id} className="case-row">
                                    <td>{contract.client_name || '-'}</td>
                                    <td>{contract.contract_type || '-'}</td>
                                    <td>{contract.contract_number || '-'}</td>
                                    <td>{contract.contract_amount || '-'}</td>
                                    <td>{formatDate(contract.start_date)}</td>
                                    <td>{formatDate(contract.end_date)}</td>
                                    <td>{contract.notes || '-'}</td>
                                    <td>
                                      <div className="attachments-cell">
                                        {contract.attach_1 && (
                                          <button
                                            onClick={() => handleImageClick(contract.attach_1)}
                                            className="view-attachment-btn"
                                          >
                                            <FiEye />
                                            1
                                          </button>
                                        )}
                                        {contract.attach_2 && (
                                          <button
                                            onClick={() => handleImageClick(contract.attach_2)}
                                            className="view-attachment-btn"
                                          >
                                            <FiEye />
                                            2
                                          </button>
                                        )}
                                        {contract.attach_3 && (
                                          <button
                                            onClick={() => handleImageClick(contract.attach_3)}
                                            className="view-attachment-btn"
                                          >
                                            <FiEye />
                                            3
                                          </button>
                                        )}
                                        {contract.attach_4 && (
                                          <button
                                            onClick={() => handleImageClick(contract.attach_4)}
                                            className="view-attachment-btn"
                                          >
                                            <FiEye />
                                            4
                                          </button>
                                        )}
                                        {!contract.attach_1 && !contract.attach_2 && !contract.attach_3 && !contract.attach_4 && '-'}
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="8">لا توجد بيانات لعرضها</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                          <div className="mobile-cards">
                            {currentItems.length > 0 ? currentItems.map((contract) => (
                              <div key={contract.id} className="mobile-card">
                                <div className="mobile-card-header">
                                  <span className="mobile-card-name">{contract.client_name || '-'}</span>
                                  <span className="mobile-card-id">{contract.contract_type || '-'}</span>
                                </div>
                                <div className="mobile-card-row">
                                  <span className="mobile-card-label">رقم العقد</span>
                                  <span className="mobile-card-value">{contract.contract_number || '-'}</span>
                                </div>
                                <div className="mobile-card-row">
                                  <span className="mobile-card-label">المبلغ</span>
                                  <span className="mobile-card-value">{contract.contract_amount || '-'}</span>
                                </div>
                                <div className="mobile-card-row">
                                  <span className="mobile-card-label">من</span>
                                  <span className="mobile-card-value">{formatDate(contract.start_date)}</span>
                                </div>
                                <div className="mobile-card-row">
                                  <span className="mobile-card-label">إلى</span>
                                  <span className="mobile-card-value">{formatDate(contract.end_date)}</span>
                                </div>
                                {(contract.attach_1 || contract.attach_2 || contract.attach_3 || contract.attach_4) && (
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {contract.attach_1 && <button onClick={() => handleImageClick(contract.attach_1)} className="view-attachment-btn"><FiEye /> 1</button>}
                                    {contract.attach_2 && <button onClick={() => handleImageClick(contract.attach_2)} className="view-attachment-btn"><FiEye /> 2</button>}
                                    {contract.attach_3 && <button onClick={() => handleImageClick(contract.attach_3)} className="view-attachment-btn"><FiEye /> 3</button>}
                                    {contract.attach_4 && <button onClick={() => handleImageClick(contract.attach_4)} className="view-attachment-btn"><FiEye /> 4</button>}
                                  </div>
                                )}
                              </div>
                            )) : (
                              <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>لا توجد بيانات لعرضها</div>
                            )}
                          </div>
                        </>
                      )}

                      {totalPages > 1 && (
                        <div className="pagination-container">
                          <div className="pagination-info">
                            عرض {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, currentData.length)} من {currentData.length} {activeTab === 'clients' ? 'موكل' : activeTab === 'attorney' ? 'توكيل' : 'عقد'}
                          </div>
                          <div className="pagination-controls">
                            <button
                              onClick={() => paginate(currentPage - 1)}
                              disabled={currentPage === 1}
                              className="pagination-button"
                            >
                              <FiArrowRight />
                            </button>
                            {[...Array(totalPages)].map((_, index) => {
                              const pageNumber = index + 1;
                              if (
                                pageNumber === 1 ||
                                pageNumber === totalPages ||
                                (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                              ) {
                                return (
                                  <button
                                    key={pageNumber}
                                    onClick={() => paginate(pageNumber)}
                                    className={`pagination-button ${currentPage === pageNumber ? 'active' : ''}`}
                                  >
                                    {pageNumber}
                                  </button>
                                );
                              } else if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                                return <span key={pageNumber} className="pagination-ellipsis">...</span>;
                              }
                              return null;
                            })}
                            <button
                              onClick={() => paginate(currentPage + 1)}
                              disabled={currentPage === totalPages}
                              className="pagination-button"
                            >
                              <FiArrowLeft />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attorney Popup */}
        {showAttorneyPopup && (
          <div className="popup-overlay-reminder" onClick={() => setShowAttorneyPopup(false)}>
            <div className="reminder-popup-container" onClick={(e) => e.stopPropagation()}>
              <div className="reminder-popup-header">
                <div className="reminder-header-content">
                  <div className="reminder-header-icon-wrapper">
                    <span className="reminder-header-icon">📄</span>
                  </div>
                  <h2>إضافة توكيل</h2>
                </div>
                <button
                  type="button"
                  className="reminder-close-btn-right"
                  onClick={() => setShowAttorneyPopup(false)}
                  aria-label="إغلاق"
                >
                  ×
                </button>
              </div>
              <div className="reminder-popup-content">
                <form onSubmit={handleAttorneySubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="clientName">
                        اسم الموكل <span className="required-asterisk">*</span>
                      </label>
                      <select
                        name="clientName"
                        value={attorneyFormData.clientName}
                        onChange={(e) => setAttorneyFormData({ ...attorneyFormData, clientName: e.target.value })}
                        className="reminder-form-input reminder-form-select"
                        required
                      >
                        <option value="">اختر اسم الموكل</option>
                        {clientNames && clientNames.length > 0 ? (
                          clientNames.map((c) => (
                            <option key={c.id} value={c.client_name}>
                              {c.client_name}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>لا توجد عملاء متاحين</option>
                        )}
                      </select>
                    </div>
                    <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="AttorneyNumber">
                        رقم التوكيل <span className="required-asterisk">*</span>
                      </label>
                      <input
                        type="text"
                        name="AttorneyNumber"
                        value={attorneyFormData.AttorneyNumber}
                        onChange={(e) => setAttorneyFormData({ ...attorneyFormData, AttorneyNumber: e.target.value })}
                        className="reminder-form-input"
                        placeholder="أدخل رقم التوكيل"
                        required
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="contractType">
                        نوع التوكيل <span className="required-asterisk">*</span>
                      </label>
                      <select
                        name="contractType"
                        value={attorneyFormData.contractType}
                        onChange={(e) => setAttorneyFormData({ ...attorneyFormData, contractType: e.target.value })}
                        className="reminder-form-input reminder-form-select"
                        required
                      >
                        <option value="">اختر نوع التوكيل</option>
                        <option value="وكالة تجارية">وكالة تجارية</option>
                        <option value="وكالة خاصة">وكالة خاصة</option>
                      </select>
                    </div>
                    <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="startDate">
                        تاريخ البدء <span className="required-asterisk">*</span>
                      </label>
                      <DatePicker
                        selected={attorneyFormData.startDate}
                        onChange={(date) => setAttorneyFormData({ ...attorneyFormData, startDate: date })}
                        dateFormat="yyyy-MM-dd"
                        className="reminder-form-input reminder-date-input"
                        required
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="endDate">
                        تاريخ الانتهاء <span className="required-asterisk">*</span>
                      </label>
                      <DatePicker
                        selected={attorneyFormData.endDate}
                        onChange={(date) => setAttorneyFormData({ ...attorneyFormData, endDate: date })}
                        dateFormat="yyyy-MM-dd"
                        className="reminder-form-input reminder-date-input"
                        required
                      />
                    </div>
                  </div>
                  <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="notes">ملاحظات</label>
                    <textarea
                      name="notes"
                      value={attorneyFormData.notes}
                      onChange={(e) => setAttorneyFormData({ ...attorneyFormData, notes: e.target.value })}
                      className="reminder-form-textarea"
                      placeholder="أضف ملاحظات إضافية"
                      rows="3"
                    />
                  </div>
                  <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                    <label>تحميل ملف</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <select
                        value={selectedAttachmentFolder || "main"}
                        onChange={(e) => setSelectedAttachmentFolder(e.target.value)}
                        className="reminder-form-input reminder-form-select"
                        style={{ flex: '0 0 200px', margin: 0 }}
                      >
                        <option value="main">المجلد الرئيسي</option>
                        {folders.filter(f => f !== "main").map((folder) => (
                          <option key={folder} value={folder}>
                            {getFolderDisplayName(folder)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedAttachmentFolder) {
                            alert("يرجى اختيار مجلد أولاً");
                            return;
                          }
                          attorneyFileInputRef.current?.click();
                        }}
                        style={{
                          padding: '9px 16px',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          whiteSpace: 'nowrap',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
                          transition: 'all 0.2s',
                        }}
                      >
                        تحميل مرفق
                      </button>
                      <input
                        type="file"
                        ref={attorneyFileInputRef}
                        style={{ display: 'none' }}
                        accept=".jpg,.jpeg,.png,.pdf,.docx"
                        onChange={handleAttorneyFileChange}
                      />
                    </div>
                    {attorneyFormData.fileUrl && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#059669' }}>
                        ✓ تم تحميل الملف بنجاح
                      </div>
                    )}
                  </div>
                  <div className="reminder-button-container">
                    <button
                      type="button"
                      className="reminder-cancel-button"
                      onClick={() => setShowAttorneyPopup(false)}
                    >
                      إلغاء
                    </button>
                    <button type="submit" className="reminder-add-button">
                      <span className="reminder-button-icon">📄</span>
                      إضافة التوكيل
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Contract Popup */}
        {showContractPopup && (
          <div className="popup-overlay-reminder" onClick={() => setShowContractPopup(false)}>
            <div className="reminder-popup-container" onClick={(e) => e.stopPropagation()}>
              <div className="reminder-popup-header">
                <div className="reminder-header-content">
                  <div className="reminder-header-icon-wrapper">
                    <span className="reminder-header-icon">📋</span>
                  </div>
                  <h2>إضافة عقد</h2>
                </div>
                <button
                  type="button"
                  className="reminder-close-btn-right"
                  onClick={() => setShowContractPopup(false)}
                  aria-label="إغلاق"
                >
                  ×
                </button>
              </div>
              <div className="reminder-popup-content">
                <form onSubmit={handleContractSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="contractNumber">
                        رقم العقد <span className="required-asterisk">*</span>
                      </label>
                      <input
                        type="text"
                        name="contractNumber"
                        value={contractFormData.contractNumber}
                        onChange={(e) => setContractFormData({ ...contractFormData, contractNumber: e.target.value })}
                        className="reminder-form-input"
                        placeholder="أدخل رقم العقد"
                        required
                      />
                    </div>
                    <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="clientName">
                        اسم الموكل <span className="required-asterisk">*</span>
                      </label>
                      <select
                        name="clientName"
                        value={contractFormData.clientName}
                        onChange={(e) => setContractFormData({ ...contractFormData, clientName: e.target.value })}
                        className="reminder-form-input reminder-form-select"
                        required
                      >
                        <option value="">اختر اسم الموكل</option>
                        {clientNames && clientNames.length > 0 ? (
                          clientNames.map((c) => (
                            <option key={c.id} value={c.client_name}>
                              {c.client_name}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>لا توجد عملاء متاحين</option>
                        )}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="contractType">
                        نوع العقد <span className="required-asterisk">*</span>
                      </label>
                      <select
                        name="contractType"
                        value={contractFormData.contractType}
                        onChange={(e) => setContractFormData({ ...contractFormData, contractType: e.target.value })}
                        className="reminder-form-input reminder-form-select"
                        required
                      >
                        <option value="">اختر نوع العقد</option>
                        <option value="عقد عمل">عقد عمل</option>
                        <option value="عقد خدمة">عقد خدمة</option>
                        <option value="عقد آخر">عقد آخر</option>
                      </select>
                    </div>
                    <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="contractAmount">مبلغ العقد</label>
                      <input
                        type="text"
                        name="contractAmount"
                        value={contractFormData.contractAmount}
                        onChange={(e) => setContractFormData({ ...contractFormData, contractAmount: e.target.value })}
                        className="reminder-form-input"
                        placeholder="أدخل مبلغ العقد"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="startDate">
                        تاريخ البدء <span className="required-asterisk">*</span>
                      </label>
                      <DatePicker
                        selected={contractFormData.startDate}
                        onChange={(date) => setContractFormData({ ...contractFormData, startDate: date })}
                        dateFormat="yyyy-MM-dd"
                        className="reminder-form-input reminder-date-input"
                        required
                      />
                    </div>
                    <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="endDate">
                        تاريخ الانتهاء <span className="required-asterisk">*</span>
                      </label>
                      <DatePicker
                        selected={contractFormData.endDate}
                        onChange={(date) => setContractFormData({ ...contractFormData, endDate: date })}
                        dateFormat="yyyy-MM-dd"
                        className="reminder-form-input reminder-date-input"
                        required
                      />
                    </div>
                  </div>
                  <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="notes">ملاحظات</label>
                    <textarea
                      name="notes"
                      value={contractFormData.notes}
                      onChange={(e) => setContractFormData({ ...contractFormData, notes: e.target.value })}
                      className="reminder-form-textarea"
                      placeholder="أضف ملاحظات إضافية"
                      rows="3"
                    />
                  </div>
                  <div className="reminder-form-group" style={{ marginBottom: 0 }}>
                    <label>تحميل ملف</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <select
                        value={selectedContractFolder || "main"}
                        onChange={(e) => setSelectedContractFolder(e.target.value)}
                        className="reminder-form-input reminder-form-select"
                        style={{ flex: '0 0 200px', margin: 0 }}
                      >
                        <option value="main">المجلد الرئيسي</option>
                        {folders.filter(f => f !== "main").map((folder) => (
                          <option key={folder} value={folder}>
                            {getFolderDisplayName(folder)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedContractFolder) {
                            alert("يرجى اختيار مجلد أولاً");
                            return;
                          }
                          contractFileInputRef.current?.click();
                        }}
                        style={{
                          padding: '9px 16px',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          whiteSpace: 'nowrap',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
                          transition: 'all 0.2s',
                        }}
                      >
                        تحميل مرفق
                      </button>
                      <input
                        type="file"
                        ref={contractFileInputRef}
                        style={{ display: 'none' }}
                        accept=".jpg,.jpeg,.png,.pdf,.docx"
                        onChange={handleContractFileChange}
                      />
                    </div>
                    {contractFormData.fileUrl && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#059669' }}>
                        ✓ تم تحميل الملف بنجاح
                      </div>
                    )}
                  </div>
                  <div className="reminder-button-container">
                    <button
                      type="button"
                      className="reminder-cancel-button"
                      onClick={() => setShowContractPopup(false)}
                    >
                      إلغاء
                    </button>
                    <button type="submit" className="reminder-add-button">
                      <span className="reminder-button-icon">📋</span>
                      إضافة العقد
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Image Popup */}
        {selectedImageUrl && (
          <div className="image-popup-overlay" onClick={handleClosePopup}>
            <div className="image-popup-content" onClick={(e) => e.stopPropagation()}>
              <span className="close-btn" onClick={handleClosePopup}>&times;</span>
              <img src={selectedImageUrl} alt="Attachment" />
            </div>
          </div>
        )}

        <style jsx>{`
          :root {
            --primary-blue: #4A90E2;
            --success-green: #10B981;
            --warning-orange: #F59E0B;
            --border-radius: 16px;
            --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
          }

          .clients-page {
            direction: rtl;
            min-height: auto;
            background: #ffffff;
            padding: 0;
            font-family: 'Cairo', 'Almarai', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }

          .clients-container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 20px;
          }

          .clients-layout {
            display: flex;
            background: transparent;
            min-height: auto;
          }

          /* Mobile Menu Wrapper */
          .mobile-menu-wrapper {
            display: none;
            padding: 16px 20px;
          }

          .mobile-menu-btn {
            background: none;
            border: none;
            font-size: 22px;
            color: var(--primary-blue);
            cursor: pointer;
            padding: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          /* Sidebar */
          .sidebar {
            width: 260px;
            flex-shrink: 0;
            background: transparent;
            padding: 24px;
            height: fit-content;
            position: sticky;
            top: 0;
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .sidebar-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding-bottom: 20px;
            border-bottom: 1px solid #E8EAED;
            position: relative;
          }

          .sidebar-close-btn {
            display: none;
            position: absolute;
            left: 0;
            background: none;
            border: none;
            font-size: 20px;
            color: #6B7280;
            cursor: pointer;
            padding: 4px;
          }

          .sidebar-icon-wrapper {
            width: 36px;
            height: 36px;
            background: var(--primary-blue);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .sidebar-icon {
            font-size: 18px;
            color: white;
          }

          .sidebar-title {
            font-size: 0.9375rem;
            font-weight: 600;
            color: #202124;
            margin: 0;
            letter-spacing: -0.01em;
          }

          .sidebar-nav {
            display: flex;
            flex-direction: column;
            gap: 2px;
            flex: 1;
          }

          .nav-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 14px;
            background: transparent;
            border: none;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 500;
            color: #5F6368;
            cursor: pointer;
            text-align: right;
            font-family: inherit;
            transition: all 0.15s ease;
            position: relative;
            text-decoration: none;
          }

          .nav-item:hover {
            background: #F1F3F4;
            color: #202124;
          }

          .nav-item.active {
            background: #E8F0FE;
            color: var(--primary-blue);
            font-weight: 600;
          }

          .nav-item.active::before {
            content: '';
            position: absolute;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 3px;
            height: 20px;
            background: var(--primary-blue);
            border-radius: 2px 0 0 2px;
          }

          .nav-icon {
            font-size: 0.9375rem;
            flex-shrink: 0;
            color: inherit;
          }

          /* Separator */
          .separator {
            width: 1px;
            background: #E8EAED;
            flex-shrink: 0;
          }

          /* Content Area */
          .content-area {
            flex: 1;
            background: transparent;
            padding: 24px;
            min-height: 400px;
            overflow-x: auto;
          }

          .clients-content {
            width: 100%;
            animation: fadeIn 0.3s ease-out;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Mobile tab nav - hidden on desktop */
          .mobile-tab-nav {
            display: none;
          }

          /* Mobile cards - hidden on desktop */
          .mobile-cards {
            display: none;
          }

          /* Search Bar */
          .search-bar-container {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            direction: rtl;
            max-width: 600px;
          }

          .search-input {
            flex: 1;
            padding: 12px 20px;
            border: 1px solid #e5e7eb;
            border-radius: 24px;
            font-size: 0.9375rem;
            background: #ffffff;
            color: #1f2937;
            outline: none;
            transition: all 0.2s ease;
            font-family: 'Cairo', 'Almarai', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }

          .search-input:focus {
            border-color: #1a73e8;
            box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
          }

          .search-input::placeholder {
            color: #9ca3af;
          }

          .search-button {
            padding: 12px 24px;
            background: #1a73e8;
            color: white;
            border: none;
            border-radius: 0;
            font-size: 0.9375rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
            font-family: 'Cairo', 'Almarai', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            height: fit-content;
            display: flex;
            align-items: center;
          }

          .search-button:hover {
            background: #1557b0;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(26, 115, 232, 0.3);
          }

          .search-button:active {
            transform: translateY(0);
          }

          /* Action Button */
          .action-button-wrapper {
            margin-bottom: 20px;
          }

          .add-client-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: #ffffff;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            text-decoration: none;
            white-space: nowrap;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.9rem;
            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
          }

          .add-client-button:hover {
            /* Hover effect disabled */
          }

          /* Table */
          table {
            width: 100%;
            border-collapse: collapse;
            background-color: transparent;
            border-radius: 0;
            overflow: visible;
            box-shadow: none;
            border: none;
          }

          thead {
            background: #f9fafb;
            border-bottom: 2px solid #e5e7eb;
            border-top: 1px solid #e5e7eb;
          }

          th {
            padding: 18px 24px;
            text-align: right;
            font-weight: 700;
            color: #1f2937;
            font-size: 0.9375rem;
            white-space: nowrap;
            letter-spacing: -0.01em;
            text-transform: none;
          }

          td {
            padding: 16px 24px;
            text-align: right;
            border-bottom: 1px solid #f3f4f6;
            color: #374151;
            font-size: 0.9375rem;
            line-height: 1.6;
            font-weight: 400;
          }

          tbody tr {
            background-color: #ffffff;
            transition: all 0.15s ease;
          }

          tbody tr:hover {
            background-color: #f9fafb;
          }

          tbody tr:nth-child(even) {
            background-color: #fafbfc;
          }

          tbody tr:nth-child(even):hover {
            background-color: #f3f4f6;
          }

          tbody tr:last-child td {
            border-bottom: none;
          }

          .case-row {
            cursor: pointer;
          }

          .client-link {
            color: #1a73e8;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s ease;
          }

          .client-link:hover {
            color: #1557b0;
            text-decoration: underline;
          }

          .view-attachment-btn {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 6px 12px;
            background: #1a73e8;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s ease;
          }

          .view-attachment-btn:hover {
            background: #1557b0;
          }

          .attachments-cell {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .loading-text {
            text-align: center;
            padding: 40px 20px;
            color: #6b7280;
            font-size: 0.9375rem;
          }

          /* Pagination */
          .pagination-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-top: 1px solid #e5e7eb;
            background: #f9fafb;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 20px;
          }

          .pagination-info {
            color: #6b7280;
            font-size: 0.875rem;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .pagination-controls {
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .pagination-button {
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            background: #ffffff;
            color: #374151;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
            font-family: 'Cairo', 'Almarai', sans-serif;
            transition: all 0.2s ease;
            min-width: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .pagination-button:hover:not(:disabled) {
            background: #f3f4f6;
            border-color: #9ca3af;
          }

          .pagination-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .pagination-button.active {
            background: #3b82f6;
            color: #ffffff;
            border-color: #3b82f6;
          }

          .pagination-ellipsis {
            padding: 8px 4px;
            color: #6b7280;
            font-size: 0.875rem;
          }

          /* Responsive Design */
          @media (max-width: 1024px) {
            .clients-container {
              padding: 16px;
            }

            .clients-layout {
              flex-direction: column;
              background: transparent;
              box-shadow: none;
            }

            .separator {
              width: 100%;
              height: 1px;
              margin: 0;
            }

            .sidebar {
              position: fixed;
              top: 0;
              right: 0;
              height: 100vh;
              width: 320px;
              z-index: 1000;
              transform: translateX(100%);
              transition: transform 0.3s ease;
              box-shadow: var(--shadow-lg);
              overflow-y: auto;
              background: white;
              border-radius: 0;
            }

            .sidebar.open {
              transform: translateX(0);
            }

            .sidebar-close-btn {
              display: block;
            }

            .mobile-menu-wrapper {
              display: block;
            }

            .content-area {
              padding: 20px;
            }
          }

          @media (max-width: 768px) {
            .clients-page {
              min-height: auto;
              padding-bottom: 0;
            }

            .clients-container {
              padding: 8px;
            }

            .clients-layout {
              min-height: auto;
              flex-direction: column;
            }

            .mobile-menu-wrapper {
              display: none !important;
            }

            .sidebar {
              display: none !important;
            }

            .separator {
              display: none !important;
            }

            .mobile-tab-nav {
              display: flex;
              gap: 0;
              background: #f3f4f6;
              border-radius: 12px;
              padding: 4px;
              margin-bottom: 12px;
            }

            .mobile-tab {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              padding: 10px 8px;
              border: none;
              background: transparent;
              color: #6b7280;
              font-size: 13px;
              font-weight: 600;
              font-family: 'Cairo', 'Almarai', sans-serif;
              border-radius: 10px;
              cursor: pointer;
              transition: all 0.2s ease;
              white-space: nowrap;
            }

            .mobile-tab.active {
              background: #ffffff;
              color: #1a73e8;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            .content-area {
              padding: 0 4px;
              min-height: auto;
            }

            .search-bar-container {
              max-width: 100%;
              gap: 8px;
              margin-bottom: 12px;
            }

            .search-input {
              padding: 10px 14px;
              font-size: 16px;
              border-radius: 10px;
            }

            .search-button {
              padding: 10px 16px;
              font-size: 14px;
              border-radius: 10px;
            }

            .add-client-button {
              width: 100%;
              justify-content: center;
              padding: 12px;
              font-size: 14px;
              border-radius: 10px;
            }

            .action-button-wrapper {
              margin-bottom: 12px;
            }

            /* Hide table, show cards */
            table {
              display: none;
            }

            .mobile-cards {
              display: flex;
              flex-direction: column;
              gap: 10px;
            }

            .mobile-card {
              background: #fff;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 14px;
              display: flex;
              flex-direction: column;
              gap: 8px;
            }

            .mobile-card-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }

            .mobile-card-name {
              font-size: 15px;
              font-weight: 700;
              color: #1a73e8;
            }

            .mobile-card-id {
              font-size: 12px;
              color: #9ca3af;
              background: #f3f4f6;
              padding: 2px 8px;
              border-radius: 6px;
            }

            .mobile-card-row {
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              color: #374151;
            }

            .mobile-card-label {
              font-weight: 600;
              color: #6b7280;
            }

            .mobile-card-value {
              font-weight: 500;
            }

            .pagination-container {
              padding: 12px;
              margin-top: 8px;
            }

            .pagination-info {
              font-size: 0.8125rem;
              width: 100%;
              text-align: center;
            }

            .pagination-controls {
              width: 100%;
              justify-content: center;
            }

            .pagination-button {
              min-width: 36px;
              min-height: 36px;
            }
          }

          /* Reminder Popup Styles (matching إضافة تذكير جديد) */
          .popup-overlay-reminder {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
          }

          .reminder-popup-container {
            background: #ffffff;
            width: 90%;
            max-width: 600px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            direction: rtl;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }

          .reminder-popup-header {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
          }

          .reminder-header-content {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
            justify-content: flex-start;
            direction: rtl;
          }

          .reminder-header-icon-wrapper {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .reminder-header-icon {
            font-size: 20px;
            filter: brightness(0) invert(1);
          }

          .reminder-popup-header h2 {
            color: #ffffff !important;
            font-size: 20px;
            font-weight: 700;
            margin: 0;
            text-align: left;
            background: none !important;
            padding: 0;
          }

          .reminder-close-btn-right {
            background: none;
            border: none;
            font-size: 28px;
            color: #ffffff;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
            transition: opacity 0.2s ease;
          }

          .reminder-close-btn-right:hover {
            opacity: 0.8;
          }

          .reminder-popup-content {
            padding: 16px 20px;
          }

          .reminder-form-group {
            display: flex;
            flex-direction: column;
            margin-bottom: 12px;
            gap: 5px;
          }

          .reminder-form-group label {
            color: #000000;
            font-weight: 600;
            font-size: 14px;
            text-align: right !important;
            display: block;
            width: 100%;
            direction: rtl;
          }

          .required-asterisk {
            color: #e11d48;
            font-weight: 700;
            margin-right: 4px;
          }

          .reminder-form-input {
            width: 100%;
            padding: 9px 12px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.2s;
            background-color: #ffffff;
            color: #333;
            box-sizing: border-box;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .reminder-form-input::placeholder {
            color: #9ca3af;
          }

          .reminder-form-input:focus {
            border-color: #3b82f6;
            outline: none;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .reminder-date-input {
            width: 100%;
            cursor: pointer;
            color: #000000 !important;
            background-color: #ffffff !important;
            -webkit-text-fill-color: #000000 !important;
          }

          .reminder-date-input::-webkit-calendar-picker-indicator {
            cursor: pointer;
            opacity: 1;
            position: absolute;
            right: 8px;
            width: 20px;
            height: 20px;
            margin: 0;
            padding: 0;
            z-index: 2;
          }

          .reminder-date-input:valid {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
          }

          .reminder-date-input::-webkit-datetime-edit-text,
          .reminder-date-input::-webkit-datetime-edit-month-field,
          .reminder-date-input::-webkit-datetime-edit-day-field,
          .reminder-date-input::-webkit-datetime-edit-year-field {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
            opacity: 1 !important;
          }

          .reminder-date-input::-webkit-datetime-edit {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
          }

          .reminder-form-textarea {
            width: 100%;
            padding: 9px 12px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            resize: none !important;
            font-size: 14px;
            font-family: inherit;
            transition: all 0.2s;
            background-color: #ffffff;
            color: #333;
            box-sizing: border-box;
            min-height: 70px;
            max-height: 100px;
            overflow-y: auto;
          }

          .reminder-form-textarea::placeholder {
            color: #9ca3af;
          }

          .reminder-form-textarea:focus {
            border-color: #3b82f6;
            outline: none;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .reminder-form-textarea::-webkit-resizer {
            display: none !important;
          }

          .reminder-form-select {
            width: 100%;
            padding: 9px 12px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            background-color: #fff;
            font-size: 14px;
            color: #333;
            appearance: none;
            background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
            background-repeat: no-repeat;
            background-position: left 12px center;
            background-size: 16px;
            cursor: pointer;
            transition: all 0.2s;
            box-sizing: border-box;
            padding-left: 36px;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }

          .reminder-form-select:focus {
            border-color: #3b82f6;
            outline: none;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .reminder-button-container {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #e0e0e0;
          }

          .reminder-add-button {
            padding: 10px 20px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: #ffffff;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 700;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
          }

          .reminder-add-button:hover {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            transform: translateY(-1px);
          }

          .reminder-button-icon {
            font-size: 18px;
            filter: brightness(0) invert(1);
          }

          .reminder-cancel-button {
            padding: 10px 20px;
            background-color: #ffffff;
            color: #000000;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 700;
            transition: all 0.2s;
          }

          .reminder-cancel-button:hover {
            background-color: #f9fafb;
            border-color: #d1d5db;
          }

          /* DatePicker global styles */
          :global(.react-datepicker-wrapper) {
            width: 100%;
          }

          :global(.react-datepicker__input-container input) {
            width: 100% !important;
            padding: 9px 12px !important;
            border: 1px solid #e0e0e0 !important;
            border-radius: 8px !important;
            font-size: 14px !important;
            background-color: #ffffff !important;
            color: #333 !important;
            font-family: 'Cairo', 'Almarai', sans-serif !important;
          }

          :global(.react-datepicker__input-container input:focus) {
            outline: none !important;
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
          }

          /* Image Popup */
          .image-popup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            padding: 20px;
          }

          .image-popup-content {
            position: relative;
            max-width: 90%;
            max-height: 90%;
          }

          .image-popup-content img {
            max-width: 100%;
            max-height: 90vh;
            border-radius: 8px;
          }

          .close-btn {
            position: absolute;
            top: -40px;
            right: 0;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: none;
            font-size: 32px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }

          .close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
          }

          @media (max-width: 768px) {
            .reminder-popup-container {
              width: 95%;
              max-width: 100%;
            }

            .reminder-popup-content {
              padding: 12px 16px;
            }

            .reminder-popup-content form > div[style*="grid"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </Layout>
    </>
  );
};

export default withAuth(AllClientsPage, ['can_view_clients']);
