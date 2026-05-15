import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/initSupabase';
import Layout from '../../components/layout/Layout';
import withAuth from '../../lib/withAuth';
import { useRouter } from 'next/router';

import { TiFolderAdd } from "react-icons/ti";

/* eslint-disable react/no-unknown-property */
const AddClientPage = () => {
    const [clients, setClients] = useState([]);
    const [casesData, setCasesData] = useState([]);
    const router = useRouter();
  
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
    
        fetchClientsData();
        fetchCasesData();
      }, []);

  
  return (
    <Layout>

<div className="total-cases-container">
        {casesData.length === 0 ? (
          <div className="no-cases-found">
            <p>لم يتم العثور على موكل. الرجاء اختيار الزر أدناه لاضافة موكل جديد.</p>

            {clients.length === 0 && (
        <div className="add-client-button-container">
          <Link href="/client/add_cl">
            <a className="add-client-button">إضافة موكل</a>
          </Link>
        </div>
      )}

          </div>
        ) : (
          <div className="total-cases">
            مجموع القضايا {casesData.length}
          </div>

          
        )}
      </div>

    
                  
      { /* eslint-disable-next-line react/no-unknown-property */ }

      <style jsx>{`
        .cases-table-container {
          margin: 20px;
          overflow-x: auto;
          border: 1px solid #0070f3;
          width: 100%;
          max-width: 1400px; 
          margin-left:50px;
          align-items: center;
        }
        .total-cases-container {
            background-color: #ffffff;
            border-radius: 4px;
            box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
            padding: 20px;
            margin: 20px auto;
            max-width: 1400px !important;
            margin-top: 190px !important;
            height:200px;
        }

        .add-client-button-container {
            display: flex;
            justify-content: center;
            margin-top: 20px;
          }
  
          .add-client-button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #0078D7;
            color: #FFF;
            font-size: 18px;
            font-weight: bold;
            text-decoration: none;
            border-radius: 3px;
            transition: background-color 0.3s;
          }
          
          .add-client-button:hover {
            background-color: #0056B3;
          }

        .cases-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

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
          margin-top: 190px; 
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
          height: 60px;
          padding: 0;
          border: 1px solid #ccc;
          border-radius: 3px;
          box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
          margin-top: 90px; 
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
            .total-cases-container {
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1), 0px 0px 10px rgba(0, 0, 0, 0.1); /* Shadow over all sides */
                padding: 20px;
                margin: 20px auto;
                max-width: 1200px; /* Adjust the max-width as needed */
              }
              
            
            .total-cases {
              font-size: 18px; /
              color: #333; 
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

export default withAuth(AddClientPage, [], true);
