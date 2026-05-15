/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';
import Link from 'next/link';
import Head from 'next/head';
import { FiPlus, FiSearch, FiFilter, FiArrowRight, FiArrowLeft, FiEye } from 'react-icons/fi';
import { HiOutlineSortAscending } from 'react-icons/hi';
import { FaBuilding, FaUserPlus } from 'react-icons/fa';
import { AiOutlineFileText } from 'react-icons/ai';
import { useRouter } from 'next/router';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const AttorneyPage = () => {
  const [attorneys, setAttorneys] = useState([]);
  const [filteredAttorneys, setFilteredAttorneys] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedContractType, setSelectedContractType] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    AttorneyNumber: '',
    clientName: '',
    startDate: null,
    endDate: null,
    contractType: '',
    notes: '',
    fileInput: null,
  });
  const [clientNames, setClientNames] = useState([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchClientNames = async () => {
      try {
        const user = supabase.auth.user();
        if (!user) return;

        const userId = user.id;
        
        // Get user metadata to determine admin_id
        const { data: userMetadata, error: metaError } = await supabase
          .from('user_metadata')
          .select('role, admin_user_id, new_lawyer_id')
          .eq('user_id', userId)
          .single();

        if (metaError) {
          console.error('Error fetching user metadata:', metaError);
          return;
        }

        if (!userMetadata) return;

        // Determine admin_id based on user role
        let adminId = null;
        
        if (userMetadata.role === 'الفئة 1') {
          // For الفئة 1 (admin), use their admin_user_id (which is their own user_id)
          adminId = userMetadata.admin_user_id || userId;
        } else if (userMetadata.role === 'الفئة 2') {
          // For الفئة 2 (lawyer), use their admin_user_id to get clients created by admin and lawyers under same admin
          adminId = userMetadata.admin_user_id;
        } else {
          // Fallback: try to find admin_user_id
          adminId = userMetadata.admin_user_id || userId;
        }

        if (!adminId) {
          console.error('Could not determine admin_id');
          return;
        }

        // Fetch clients created by this admin (الفئة 1) and lawyers created by the same admin
        // All these clients will have the same admin_id
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients_data')
          .select('client_name')
          .eq('admin_id', adminId);

        if (clientsError) {
          console.error('Error fetching clients:', clientsError);
          throw clientsError;
        }

        const names = clientsData.map((client) => client.client_name).filter(Boolean);
        const uniqueNames = [...new Set(names)]; // Remove duplicates
        console.log('Fetched client names:', uniqueNames);
        console.log('Admin ID used:', adminId);
        console.log('Clients data:', clientsData);
        setClientNames(uniqueNames);
      } catch (error) {
        console.error('Error fetching client names:', error.message);
        setClientNames([]);
      }
    };

    fetchClientNames();
  }, []);

  useEffect(() => {
    const fetchAttorneys = async () => {
      try {
        setLoading(true);
        const currentUser = supabase.auth.user();
        if (!currentUser) throw new Error('User not logged in');

        const userId = currentUser.id;

        // Get user metadata to determine admin_id
        const { data: userMetadata, error: metaError } = await supabase
          .from('user_metadata')
          .select('role, admin_user_id, new_lawyer_id')
          .eq('user_id', userId)
          .single();

        if (metaError) {
          console.error('Error fetching user metadata:', metaError);
          setAttorneys([]);
          setFilteredAttorneys([]);
          return;
        }

        if (!userMetadata) {
          setAttorneys([]);
          setFilteredAttorneys([]);
          return;
        }

        // Determine admin_id based on user role
        let adminId = null;
        
        if (userMetadata.role === 'الفئة 1') {
          // For الفئة 1 (admin), use their admin_user_id (which is their own user_id)
          adminId = userMetadata.admin_user_id || userId;
        } else if (userMetadata.role === 'الفئة 2') {
          // For الفئة 2 (lawyer), use their admin_user_id
          adminId = userMetadata.admin_user_id;
        } else {
          // Fallback: try to find admin_user_id
          adminId = userMetadata.admin_user_id || userId;
        }

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
      } finally {
        setLoading(false);
      }
    };

    fetchAttorneys();
  }, []);

  useEffect(() => {
    let filtered = [...attorneys];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((attorney) =>
        [attorney.client_name, attorney.attorney_number, attorney.contract_type]
          .map((field) => field?.toString().toLowerCase())
          .some((field) => field?.includes(query))
      );
    }

    if (selectedContractType) {
      filtered = filtered.filter(attorney => attorney.contract_type === selectedContractType);
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
  }, [searchQuery, selectedContractType, sortOrder, attorneys]);

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    setFormData({ ...formData, fileInput: file });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const currentUser = supabase.auth.user();
      if (!currentUser) throw new Error('User not logged in');

      const userId = currentUser.id;

      // Get user metadata to determine admin_id
      const { data: userMetadata, error: metaError } = await supabase
        .from('user_metadata')
        .select('role, admin_user_id, new_lawyer_id')
        .eq('user_id', userId)
        .single();

      if (metaError) {
        throw new Error('خطأ في جلب بيانات المستخدم: ' + metaError.message);
      }

      if (!userMetadata) {
        throw new Error('لم يتم العثور على بيانات المستخدم');
      }

      // Determine admin_id based on user role
      let adminId = null;
      
      if (userMetadata.role === 'الفئة 1') {
        // For الفئة 1 (admin), use their admin_user_id (which is their own user_id)
        adminId = userMetadata.admin_user_id || userId;
      } else if (userMetadata.role === 'الفئة 2') {
        // For الفئة 2 (lawyer), use their admin_user_id
        adminId = userMetadata.admin_user_id;
      } else {
        // Fallback: try to find admin_user_id
        adminId = userMetadata.admin_user_id || userId;
      }

      if (!adminId) {
        throw new Error('لم يتم العثور على معرف المسؤول');
      }

      let fileUrl = '';
      if (formData.fileInput) {
        const fileName = `${Date.now()}_${formData.fileInput.name.replace(/\s+/g, '_')}`;
        const filePath = `images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, formData.fileInput);

        if (uploadError) throw uploadError;

        const { publicURL } = await supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        fileUrl = publicURL;
      }

      // Format dates as strings (text format for database)
      const formatDateToString = (date) => {
        if (!date) return null;
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const attorneyData = {
        start_date: formatDateToString(formData.startDate),
        end_date: formatDateToString(formData.endDate),
        client_name: formData.clientName.trim(),
        attorney_number: formData.AttorneyNumber.trim(),
        contract_type: formData.contractType,
        notes: formData.notes.trim(),
        admin_id: adminId,
        client_id: userId,
        attach_1: fileUrl || null,
        created_at: new Date().toISOString(),
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('attorney')
        .insert([attorneyData])
        .select();

      if (insertError) throw insertError;

      setShowPopup(false);
      setFormData({
        AttorneyNumber: '',
        clientName: '',
        startDate: null,
        endDate: null,
        contractType: '',
        notes: '',
        fileInput: null,
      });
      
      // Refresh the list
      const { data: attorneyDataNew, error: attorneyErrorNew } = await supabase
        .from('attorney')
        .select('*')
        .eq('admin_id', adminId);

      if (!attorneyErrorNew && attorneyDataNew) {
        setAttorneys(attorneyDataNew);
        setFilteredAttorneys(attorneyDataNew);
      }
    } catch (error) {
      console.error('Error inserting attorney:', error.message);
      alert('حدث خطأ في إضافة التوكيل: ' + error.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('ar-EG', options);
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImageUrl(imageUrl);
  };

  const handleClosePopup = () => {
    setSelectedImageUrl('');
  };

  const contractTypes = [...new Set(attorneys.map(a => a.contract_type).filter(Boolean))];

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAttorneys = filteredAttorneys.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAttorneys.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>
      <Layout>
        <div className="page-container">
          <div className="header-section">
            <div className="search-container">
              <form onSubmit={handleSearch} className="search-form">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="البحث باسم الموكل, رقم التوكيل"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button type="submit" className="search-button">
                  بحث
                </button>
              </form>
            </div>
            <div className="action-buttons">
              <Link href="/client/add_cl">
                <a className="add-client-button">
                  <FiPlus />
                  <span>موكل جديد</span>
                </a>
              </Link>
              <Link href="/client/contracts">
                <a className="add-client-button">
                  <AiOutlineFileText />
                  <span>العقود</span>
                </a>
              </Link>
              <a className="add-client-button" onClick={() => setShowPopup(true)}>
                <FaBuilding />
                <span>إضافة توكيل</span>
              </a>
            </div>
          </div>

          <div className="filter-bar-container">
            <div className="filter-bar">
              <div className={`filter-item-wrapper ${selectedContractType ? 'active' : ''}`}>
                <select
                  value={selectedContractType}
                  onChange={(e) => setSelectedContractType(e.target.value)}
                  className="filter-select"
                >
                  <option value="">نوع التوكيل</option>
                  {contractTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <FiFilter className="filter-icon" />
              </div>
              <div className={`filter-item-wrapper ${sortOrder ? 'active' : ''}`}>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="filter-select"
                >
                  <option value="desc">ترتيب الجدول</option>
                  <option value="asc">تصاعدي</option>
                  <option value="desc">تنازلي</option>
                </select>
                <HiOutlineSortAscending className="filter-icon" />
              </div>
            </div>
          </div>

          <div className="table-container">
            {loading ? (
              <div className="loading-text">جاري تحميل البيانات...</div>
            ) : (
              <>
                <table className="attorneys-table">
                  <thead>
                    <tr>
                      <th className="table-header">اسم الموكل</th>
                      <th className="table-header">نوع التوكيل</th>
                      <th className="table-header">رقم التوكيل</th>
                      <th className="table-header">تاريخ البدء</th>
                      <th className="table-header">تاريخ الانتهاء</th>
                      <th className="table-header">الملاحظات</th>
                      <th className="table-header">المرفقات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentAttorneys.length > 0 ? (
                      currentAttorneys.map((attorney, index) => (
                        <tr key={index} className="table-row">
                          <td className="table-cell">{attorney.client_name || '-'}</td>
                          <td className="table-cell">{attorney.contract_type || '-'}</td>
                          <td className="table-cell">{attorney.attorney_number || '-'}</td>
                          <td className="table-cell">{formatDate(attorney.start_date)}</td>
                          <td className="table-cell">{formatDate(attorney.end_date)}</td>
                          <td className="table-cell">{attorney.notes || '-'}</td>
                          <td className="table-cell">
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
                        <td colSpan="7" className="no-results">
                          لا توجد نتائج مطابقة
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="pagination-container">
                    <div className="pagination-info">
                      عرض {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredAttorneys.length)} من {filteredAttorneys.length} توكيل
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

          {showPopup && (
            <div className="popup-overlay" onClick={() => setShowPopup(false)}>
              <div className="popup-container-wide" onClick={(e) => e.stopPropagation()}>
                <div className="popup-header">
                  <h3 className="popup-title">إضافة توكيل</h3>
                  <button className="close-popup-btn" onClick={() => setShowPopup(false)}>×</button>
                </div>
                <div className="separator"></div>
                <form onSubmit={handleSubmit}>
                  <div className="popup-content">
                    <div className="input-wrapper">
                      <label htmlFor="AttorneyNumber">رقم التوكيل</label>
                      <input
                        type="text"
                        id="AttorneyNumber"
                        name="AttorneyNumber"
                        value={formData.AttorneyNumber}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="input-wrapper">
                      <label htmlFor="clientName">اسم الموكل</label>
                      <select
                        name="clientName"
                        value={formData.clientName}
                        onChange={handleInputChange}
                        className="custom-dropdown"
                      >
                        <option value="">اختر اسم الموكل</option>
                        {clientNames && clientNames.length > 0 ? (
                          clientNames.map((name, index) => (
                            <option key={index} value={name}>
                              {name}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>لا توجد عملاء متاحين</option>
                        )}
                      </select>
                    </div>

                    <div className="input-wrapper">
                      <label htmlFor="contractType">نوع التوكيل</label>
                      <select
                        id="contractType"
                        name="contractType"
                        value={formData.contractType}
                        onChange={handleInputChange}
                        className="custom-dropdown"
                      >
                        <option value="">اختر نوع التوكيل</option>
                        <option value="وكالة تجارية">وكالة تجارية</option>
                        <option value="وكالة خاصة">وكالة خاصة</option>
                      </select>
                    </div>

                    <div className="input-wrapper">
                      <label htmlFor="startDate">تاريخ البدء</label>
                      <DatePicker
                        id="startDate"
                        selected={formData.startDate}
                        onChange={(date) => setFormData({ ...formData, startDate: date })}
                        className="date-picker"
                        dateFormat="yyyy-MM-dd"
                      />
                    </div>

                    <div className="input-wrapper">
                      <label htmlFor="endDate">تاريخ الانتهاء</label>
                      <DatePicker
                        id="endDate"
                        selected={formData.endDate}
                        onChange={(date) => setFormData({ ...formData, endDate: date })}
                        className="date-picker"
                        dateFormat="yyyy-MM-dd"
                      />
                    </div>

                    <div className="input-wrapper">
                      <label htmlFor="notes">ملاحظات</label>
                      <textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        className="notes-textarea"
                      />
                    </div>

                    <div className="input-wrapper">
                      <label htmlFor="fileInput">تحميل ملف</label>
                      <input
                        type="file"
                        id="fileInput"
                        name="fileInput"
                        accept=".jpg,.jpeg,.png,.pdf,.docx"
                        onChange={handleFileInputChange}
                      />
                    </div>

                    <div className="form-buttons">
                      <button type="submit" className="submit-button">
                        إضافة
                      </button>
                      <button type="button" className="close-button" onClick={() => setShowPopup(false)}>
                        إغلاق
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {selectedImageUrl && (
            <div className="image-popup-overlay" onClick={handleClosePopup}>
              <div className="image-popup-content" onClick={(e) => e.stopPropagation()}>
                <span className="close-btn" onClick={handleClosePopup}>&times;</span>
                <img src={selectedImageUrl} alt="Attachment" />
              </div>
            </div>
          )}
        </div>

        <style jsx>{`
          .page-container {
            direction: rtl;
            max-width: 1400px;
            margin: 0 auto;
            padding: 24px;
            font-family: 'Cairo', 'Almarai', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }

          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            gap: 16px;
            flex-wrap: wrap;
          }

          .search-container {
            max-width: 400px;
            min-width: 300px;
          }

          .search-form {
            display: flex;
            align-items: center;
            gap: 0;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          }

          .search-form .search-icon {
            position: absolute;
            right: 12px;
            color: #9ca3af;
            font-size: 18px;
            pointer-events: none;
            z-index: 1;
          }

          .search-input {
            flex: 1;
            padding: 12px 40px 12px 16px;
            border: none;
            outline: none;
            font-size: 0.9375rem;
            font-family: 'Cairo', 'Almarai', sans-serif;
            color: #1f2937;
            background: transparent;
          }

          .search-input::placeholder {
            color: #9ca3af;
          }

          .search-button {
            padding: 12px 24px;
            background: #3b82f6;
            color: #ffffff;
            border: none;
            font-size: 0.9375rem;
            font-weight: 600;
            font-family: 'Cairo', 'Almarai', sans-serif;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
          }

          .search-button:hover {
            background: #3b82f6;
          }

          .action-buttons {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
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

          .filter-bar-container {
            background-color: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 24px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            overflow-x: auto;
          }

          .filter-bar {
            display: flex;
            gap: 8px;
            flex-wrap: nowrap;
            align-items: center;
          }

          .filter-item-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            border-radius: 6px;
            border: 1px solid #d1d5db;
            background-color: #ffffff;
            transition: all 0.2s ease;
            min-width: 140px;
            max-width: 180px;
            flex: 0 0 auto;
          }

          .filter-item-wrapper:hover {
            border-color: #3b82f6;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
          }

          .filter-item-wrapper.active {
            border-color: #3b82f6;
          }

          .filter-select {
            flex: 1;
            padding: 8px 28px 8px 12px;
            border: none;
            border-radius: 6px;
            background-color: transparent;
            font-size: 0.875rem;
            color: #1f2937;
            font-weight: 400;
            font-family: 'Cairo', 'Almarai', sans-serif;
            cursor: pointer;
            appearance: none;
            outline: none;
            text-align: right;
          }

          .filter-icon {
            position: absolute;
            right: 8px;
            color: #9ca3af;
            font-size: 14px;
            pointer-events: none;
          }

          .filter-item-wrapper.active .filter-icon {
            color: #3b82f6;
          }

          .table-container {
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            border: 1px solid #e5e7eb;
          }

          .attorneys-table {
            width: 100%;
            border-collapse: collapse;
          }

          .table-header {
            padding: 16px 20px;
            text-align: right;
            font-weight: 700;
            color: #1f2937;
            font-size: 0.9375rem;
            background: #f9fafb;
            border-bottom: 2px solid #e5e7eb;
            white-space: nowrap;
          }

          .table-row {
            background-color: #ffffff;
            transition: all 0.15s ease;
            border-bottom: 1px solid #f3f4f6;
          }

          .table-row:hover {
            background-color: #f9fafb;
          }

          .table-row:nth-child(even) {
            background-color: #fafbfc;
          }

          .table-cell {
            padding: 16px 20px;
            text-align: right;
            color: #374151;
            font-size: 0.9375rem;
            line-height: 1.6;
            font-weight: 400;
          }

          .view-attachment-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: #3b82f6;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .view-attachment-btn:hover {
            background: #2563eb;
          }

          .no-results {
            text-align: center;
            color: #9ca3af;
            padding: 40px 20px;
            font-size: 0.9375rem;
          }

          .loading-text {
            text-align: center;
            padding: 40px 20px;
            color: #6b7280;
            font-size: 0.9375rem;
          }

          .pagination-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-top: 1px solid #e5e7eb;
            background: #f9fafb;
            flex-wrap: wrap;
            gap: 12px;
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

          .popup-overlay {
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

          .popup-container-wide {
            background-color: #ffffff;
            border-radius: 12px;
            padding: 24px;
            width: 90%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }

          .popup-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }

          .popup-title {
            font-size: 20px;
            font-weight: 700;
            color: #1f2937;
            margin: 0;
          }

          .close-popup-btn {
            background: none;
            border: none;
            font-size: 28px;
            color: #6b7280;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .close-popup-btn:hover {
            color: #1f2937;
          }

          .separator {
            height: 1px;
            background-color: #e5e7eb;
            margin-bottom: 20px;
          }

          .popup-content {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .input-wrapper {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .input-wrapper label {
            font-size: 0.875rem;
            font-weight: 600;
            color: #374151;
          }

          .input-wrapper input,
          .input-wrapper select,
          .input-wrapper textarea {
            padding: 10px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 0.9375rem;
            font-family: 'Cairo', 'Almarai', sans-serif;
            color: #1f2937;
            outline: none;
            transition: border-color 0.2s ease;
          }

          .input-wrapper input:focus,
          .input-wrapper select:focus,
          .input-wrapper textarea:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .date-picker {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
          }

          .notes-textarea {
            resize: vertical;
            min-height: 100px;
          }

          .form-buttons {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 8px;
          }

          .submit-button,
          .close-button {
            padding: 10px 24px;
            border: none;
            border-radius: 6px;
            font-size: 0.9375rem;
            font-weight: 600;
            font-family: 'Cairo', 'Almarai', sans-serif;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .submit-button {
            background: #3b82f6;
            color: #ffffff;
          }

          .submit-button:hover {
            background: #2563eb;
          }

          .close-button {
            background: #f3f4f6;
            color: #374151;
          }

          .close-button:hover {
            background: #e5e7eb;
          }

          .image-popup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
          }

          .image-popup-content {
            position: relative;
            max-width: 90%;
            max-height: 90%;
          }

          .image-popup-content img {
            max-width: 100%;
            max-height: 90vh;
            display: block;
            border-radius: 8px;
          }

          .close-btn {
            position: absolute;
            top: -40px;
            right: 0;
            font-size: 32px;
            color: #ffffff;
            cursor: pointer;
            background: rgba(0, 0, 0, 0.5);
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
          }

          .close-btn:hover {
            background: rgba(0, 0, 0, 0.7);
          }

          @media (max-width: 768px) {
            .page-container {
              padding: 16px;
            }

            .header-section {
              flex-direction: column;
              align-items: stretch;
            }

            .search-container {
              min-width: 100%;
            }

            .table-container {
              overflow-x: auto;
            }

            .attorneys-table {
              min-width: 800px;
            }

            .pagination-container {
              flex-direction: column;
              align-items: stretch;
            }

            .pagination-controls {
              justify-content: center;
            }
          }
        `}</style>
      </Layout>
    </>
  );
};

export default withAuth(AttorneyPage, ['can_view_clients']);
