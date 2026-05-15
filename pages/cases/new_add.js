import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/initSupabase';
import Layout from '../../components/layout/Layout';
import withAuth from '../../lib/withAuth';
import { useRouter } from 'next/router';
import { useSubscription } from '../../context/SubscriptionContext';

import { TiFolderAdd } from "react-icons/ti";

/* eslint-disable react/no-unknown-property */
const TotalCasesContainer = () => {
  const { isReadOnly, loading: subLoading } = useSubscription();
  const [clients, setClients] = useState([]);
  const [casesData, setCasesData] = useState([]);

  useEffect(() => {
    async function fetchClientsData() {
      try {
        // Fetch clients data
        const { data: clientsData, error } = await supabase.from('clients_data').select('*');
        if (error) {
          throw error;
        }
        setClients(clientsData);
      } catch (error) {
        console.error('Error fetching clients data:', error.message);
      }
    }

    fetchClientsData();
  }, []);

  useEffect(() => {
    async function fetchCasesData() {
      try {
        // Fetch cases data
        const { data: casesData, error } = await supabase.from('cases').select('*');
        if (error) {
          throw error;
        }
        setCasesData(casesData);
      } catch (error) {
        console.error('Error fetching cases data:', error.message);
      }
    }

    fetchCasesData();
  }, []);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCases, setFilteredCases] = useState([]);
  const [selectedCaseState, setSelectedCaseState] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [sortByDate, setSortByDate] = useState('asc'); // Initialize sortByDate state
  const [selectedYear, setSelectedYear] = useState('');

  

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, index) => currentYear - index);


  const handleMonthChange = (event) => {
    const selectedMonth = event.target.value;
    setSelectedMonth(selectedMonth);
  
    // Filter cases based on the selected month
    const filteredCases = casesData.filter((caseItem) => {
      // Extract the month and year from the case date
      const caseDate = new Date(caseItem.caseDate);
      const caseMonth = caseDate.getMonth() + 1; // Adding 1 because getMonth() returns 0-indexed month
      const caseYear = caseDate.getFullYear();
  
      // Split the selected date to get the year and month
      const [selectedYear, selectedMonthNumber] = selectedMonth.split('-');
  
      // Compare the extracted month and year with the selected month and year
      return caseMonth === parseInt(selectedMonthNumber) && caseYear === parseInt(selectedYear);
    });
  
    setFilteredCases(filteredCases);
  };
  
  




  const months = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر"
  ];
    
  

  const handleSortByDateChange = (event) => {
    const selectedSortOrder = event.target.value;
    setSortByDate(selectedSortOrder);
    sortCasesByDate(selectedSortOrder);
  };


  const handleYearChange = (event) => {
    const selectedYear = event.target.value;
    setSelectedYear(selectedYear);
    filterCases(selectedYear, selectedMonth);
  };



  // Function to sort cases based on date
  const sortCasesByDate = (order) => {
    const sortedCases = [...filteredCases]; // Make a copy of filtered cases array

    // Sort the cases based on caseDate field
    sortedCases.sort((a, b) => {
      const dateA = new Date(a.caseDate);
      const dateB = new Date(b.caseDate);
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });

    // Update the state with sorted cases
    setFilteredCases(sortedCases);
  };


  const handleCaseStateChange = (event) => {
    setSelectedCaseState(event.target.value);
  };
  const filterCases = () => {
    let filtered = casesData;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((caseItem) =>
        Object.values(caseItem).some((value) =>
          value && value.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Filter by selected case state
    if (selectedCaseState) {
      filtered = filtered.filter((caseItem) =>
        caseItem.caseState === selectedCaseState
      );
    }

    setFilteredCases(filtered);
  };

  useEffect(() => {
    setFilteredCases(casesData);
  }, [casesData]);
  
  useEffect(() => {
    filterCases();
  }, [searchQuery, selectedCaseState, casesData]);

  const handleSearchInputChange = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
  
    const filtered = casesData.filter((caseItem) =>
      Object.values(caseItem).some((value) =>
        value && value.toString().toLowerCase().includes(query.toLowerCase())
      )
    );
  
    setFilteredCases(filtered);
  };
  

  
  return (
    <Layout>

              
      <div className="save-bar">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search cases..."
            value={searchQuery}
            onChange={handleSearchInputChange}
          />
        </div>

        
        <Link href="/cases/add-case">
          <a
            className={`ribbon-button ${
              router.pathname === '/cases/add-case' ? 'active' : ''
            }`}
            style={{
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              marginRight: '20px',
            }}
          >
            <div className="text" style={{ marginRight: '5px', textDecoration: 'none' }}>
              إضافة دعوى
            </div>
            <div style={{ textDecoration: 'none' }}>
              <TiFolderAdd size={30} />
            </div>
          </a>
        </Link>
      </div>
      <div className="save-bar2">
        
  <div className="dropdown-container">
    
    <label htmlFor="caseStateDropdown"> حالة الدعوى</label>
    <select
      id="caseStateDropdown"
      value={selectedCaseState}
      onChange={handleCaseStateChange}>
          <option value="">اختر حالة الدعوى</option>
          {Array.from(new Set(casesData.map((caseItem) => caseItem.caseState))).map((caseState) => (
            <option key={caseState} value={caseState}>{caseState}</option>
          ))}
        </select>
      </div>
      <div className="vertical-line"></div>

      <div className="dropdown-container">
      <label htmlFor="monthDropdown"> تاريخ التكليف</label>
      <select
        id="monthDropdown"
        value={selectedMonth}
        onChange={handleMonthChange}>
        <option value="">اختر شهر القضية</option>
        {months.map((month, index) => (
          <option key={index} value={`2024-${index + 1 < 10 ? '0' : ''}${index + 1}`}>{month}</option>
        ))}
      </select>
      
    </div>
 <div className="vertical-line"></div>
  <div className="dropdown-container">
    <label htmlFor="sortByDate"> ترتيب الجدول</label>
    <select
      id="sortByDate"
      value={sortByDate}
      onChange={handleSortByDateChange}
    >
      <option value="asc">تصاعدياً</option>
      <option value="desc">تنازلياً</option>
    </select>
  </div>
  <div className="dropdown-container">
    <label htmlFor="monthDropdown">اختر الشهر</label>
    <select
      id="monthDropdown"
      value={selectedMonth}
      onChange={handleMonthChange}
    >
      <option value="">اختر الشهر</option>
      {months.map((month, index) => (
        <option key={index} value={index + 1}>{month}</option>
      ))}
    </select>
  </div>

  <div className="dropdown-container">
    <label htmlFor="yearDropdown">اختر السنة</label>
    <select
      id="yearDropdown"
      value={selectedYear}
      onChange={handleYearChange}
    >
      <option value="">اختر السنة</option>
      {years.map((year, index) => (
        <option key={index} value={year}>{year}</option>
      ))}
    </select>
  </div>


    </div>


      {casesData.length === 0 ? (
        <div className="no-cases-found">
          <p>لم يتم العثور على أي قضايا. الرجاء اختيار الزر أدناه لإنشاء قضية جديدة.</p>
          {clients.length === 0 ? (
            <Link href="/cases/add_pre_client">
              <a
                className="add-case-button"
                style={{
                  opacity: isReadOnly || subLoading ? 0.5 : 1,
                  cursor: isReadOnly || subLoading ? 'not-allowed' : 'pointer',
                  pointerEvents: isReadOnly || subLoading ? 'none' : 'auto'
                }}
              >
                إضافة دعوى
              </a>
            </Link>
          ) : (
            <Link href="/cases/add-case">
              <a
                className="add-case-button"
                style={{
                  opacity: isReadOnly || subLoading ? 0.5 : 1,
                  cursor: isReadOnly || subLoading ? 'not-allowed' : 'pointer',
                  pointerEvents: isReadOnly || subLoading ? 'none' : 'auto'
                }}
              >
                إضافة دعوى
              </a>
            </Link>
          )}
        </div>
      ) : (
        <div className="total-cases">
          مجموع القضايا {casesData.length}
        </div>
      )}
 


                  
      { /* eslint-disable-next-line react/no-unknown-property */ }

      <style jsx>{`
      
        .no-cases-found {
          text-align: center;
          margin-bottom: 10px;
          font-size: 18px;
          color: #333;
        }
        

        .table-header {
          background-color: #0070f3;
          color: #000; 
          font-weight: bold;
          text-align: center;
          padding: 5px; 
          border-top: 2px solid #0057c2;
          border-bottom: 2px solid #0057c2;
        }

        .modify-button,
        .details-button {
          color: #0070f3;
          text-decoration: none;
          font-weight: bold;
          padding: 5px 10px;
          border: 1px solid #0070f3;
          border-radius: 4px;
          transition: background-color 0.3s, color 0.3s;
        }

        .modify-button:hover,
        .details-button:hover {
          background-color: #fff;
          color: #0070f3;
        }

        .cases-table th,
        .cases-table td {
          padding: 10px;
          text-align: center;
          border-bottom: 1px solid #e0e0e0;
          background-color: #fff; 
          white-space: nowrap;
        }

        .cases-table tr:last-child td {
          border-bottom: none;
        }

        .cases-table tr:hover td {
          background-color: #f0f0f0; 
        }

        .form-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 90%; 
          color: #000; 
          margin: 10px auto;
        }
            
        
      .search-container {
        flex: 1; 
        margin-left: 990px; 
      }

      .search-container input[type="text"] {
        width: 90%;
        padding: 8px 12px;
        border: 1px solid #000; 
        border-radius: 2px; 
        font-size: 16px; 
      }

      .search-container input[type="text"]:focus {
        outline: none;
        border-color: #007bff; 
      }

        .save-bar {
          width: 100%;
          margin: 1px auto;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          height: 60px;
          padding: 0;
          border: 1px solid #ccc;
          border-radius: 1px;
          box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
          margin-top: 100px; 
          margin-bottom: 10px; 
          max-width: 1810px; 
          background-color: #fff; 
          margin-left:80px;
        }

              
        .save-bar2 {
          width: 100%;
          margin: 1px auto;
          display: flex;
          justify-content: flex-end;
          height: 80px;
          padding: 0;
          border: 1px solid #ccc;
          border-radius: 3px;
          box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
          margin-top: 10px; 
          max-width: 1810px; 
          background-color: #fff; 
          margin-left:80px;
        }

        @media screen and (max-width: 1600px) {
          .save-bar,
          .save-bar2 {
            max-width: 1400px;
            margin-left: 50px;
          }
        }

        @media screen and (max-width: 1440px) {
          .save-bar,
          .save-bar2 {
            max-width: 1200px;
            margin-left: 40px;
          }
        }

        @media screen and (max-width: 1366px) {
          .save-bar,
          .save-bar2 {
            max-width: 1100px;
            margin-left: 30px;
          }
        }

        @media screen and (max-width: 1280px) {
          .save-bar,
          .save-bar2 {
            max-width: 1000px;
            margin-left: 20px;
          }
        }

        @media screen and (max-width: 1024px) {
          .save-bar,
          .save-bar2 {
            max-width: 800px;
            margin-left: 10px;
          }
        }
        .dropdown-container {
          display: flex;
          margin-top: 10px; 
          flex-direction: column;
          margin-right: 20px;
          align-items: flex-end;
        }
        
        
            .ribbon-button {
              background-color: #fff; 
              color: #000; 
              padding: 2px 5px;
              border-radius: 4px;
              cursor: pointer;
              position: relative;
              font-weight: bold;
              font-size: 14px;
              text-align: center;
              transition: background-color 0.3s, color 0.3s; 
            }
            .add-case-button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #0078D7;
              color: #FFF;
              font-size: 16px;
              font-weight: bold;
              text-decoration: none;
              border-radius: 8px;
              transition: background-color 0.3s;
            }
            
            .add-case-button:hover {
              background-color: #0056B3;
            }
            
            .icon {
              font-size: 20px;
              margin-right: 5px;
            }
            
            .ribbon-button:hover {
              background-color: rgba(0, 0, 0, 0.1); 
            }
            
            .ribbon-button:hover .text {
              color: #000; 
              text-decoration: none; 
            }

            .ribbon-button .text {
              text-align: right; 
            }
        
            .case-state-button {
              display: inline-block;
              padding: 5px 10px;
              background-color: #3498db; 
              color: #fff;
              border-radius: 5px;
              cursor: pointer;
              transition: background-color 0.3s;
            }
            
            .case-state-button:hover {
              background-color: #2980b9; /* Darker shade of blue on hover */
            }
            .vertical-line {
              border-left: 1px solid #ccc; /* Adjust the color and style as needed */
              height: 60px; /* Adjust the height of the separator */
              margin: 0 10px; /* Adjust the margin for spacing */
            }
            
      `}</style>

       {/* eslint-enable react/no-unknown-property */}


    </Layout>
  );
};

export default withAuth(TotalCasesContainer, []);
