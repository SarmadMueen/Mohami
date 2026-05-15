import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { supabase } from '../../lib/initSupabase';
import { useRouter } from 'next/router'; // Import the useRouter hook
import withAuth from '../../lib/withAuth';
import Link from 'next/link';

import { AiOutlineUser, AiOutlineMail, AiOutlinePhone, AiOutlineHome, AiOutlineIdcard, AiOutlineFileText } from 'react-icons/ai';

const ClientInfo = () => {

    const router = useRouter(); 
  const [clientInfo, setClientInfo] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const handleEditClick = (clientId) => {
    router.push(`/client/edit_client?id=${clientId}`);
  };

  useEffect(() => {
    const fetchClientInfo = async () => {
      try {
        const { id } = router.query; // Get client ID from URL
        
        if (!id) {
          console.error('No client ID in URL');
          return;
        }
        
        const { data, error } = await supabase
          .from('clients_data')
          .select('*')
          .eq('id', id) // Fetch based on client 'id'
          .single(); // Assuming you want a single result
  
        if (error) {
          throw error;
        }
  
        setClientInfo(data);
        setLastUpdated(data.created_at);
      } catch (error) {
        console.error('Error fetching client info:', error.message);
      }
    };
  
    fetchClientInfo();
  }, [router.query]);
  
  
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', options);
  };

  // Mapping English titles to Arabic translations and icons
  const titleMappings = {
    client_name: { translation: 'اسم العميل', icon: <AiOutlineUser size={24} /> },
    email: { translation: 'البريد الإلكتروني', icon: <AiOutlineMail size={24} /> },
    phone: { translation: 'رقم الجوال', icon: <AiOutlinePhone size={24} /> },
    address: { translation: 'العنوان', icon: <AiOutlineHome size={24} /> },
    governorate_id: { translation: 'المحافظة', icon: <AiOutlineIdcard size={24} /> },
    notes: { translation: 'ملاحظات', icon: <AiOutlineFileText size={24} /> },
    id_number: { translation: 'رقم الهوية', icon: <AiOutlineIdcard size={24} /> },
    legal_form: { translation: 'الشكل القانوني', icon: <AiOutlineFileText size={24} /> },
    image_url: { translation: 'صورة العميل', icon: null } // Add image URL field
  };


  const handleEditClient = () => {
    router.push('/client/edit_client'); // Redirect to edit_client page
  };


  return (
    <Layout>
      <div className="container">
        <div className="form-title">
          <h4>معلومات العميل</h4>
          <p>اخر تحديث: {lastUpdated && formatDate(lastUpdated)}</p>
          <div className="divider"></div>
           <div className="edit-client-button"> {/* Add a container for the edit client button */}
          <button onClick={handleEditClient}>تعديل معلومات العميل</button> {/* Add a button to edit client information */}
        </div>
        </div>

        <div className="client-grid">
  {clientInfo ? (
    Object.entries(clientInfo).map(([key, value], index) => (
      // Exclude fields containing 'id' and render fields with non-empty values
      !key.toLowerCase().includes('id') && value !== '' && (
        <React.Fragment key={index}>
          <div className="field">
            <div className="title">
              {titleMappings[key] && (
                <>
                  {titleMappings[key].icon}
                  <span className="icon-title">{titleMappings[key].translation}:</span>
                </>
              )}
            </div>
            <div className="content">
              {key === 'image_url' ? (
                <a href={value} target="_blank" rel="noopener noreferrer">
                  عرض الصورة
                </a>
              ) : (
                value
              )}
            </div>
          </div>
        </React.Fragment>
      )
    ))
  ) : (
    <p>لا توجد معلومات عميل متاحة</p>
  )}
</div>

      </div>

      <style jsx>{`
        .container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          direction: rtl;
          background-color: #fff;
          border: 1px solid #ccc;
          padding: 10px;
          border-radius: 5px;
          box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
          width: 94%;
          max-width: 1110px;
          margin: 20px auto;
          margin-top: 100px; 
          margin-right: 100px; 
          justify-content: center;
          align-items: flex-start;
        }

        .form-title {
          text-align: right;
          grid-column: 1 / -1; /* Span all columns */
        }

        .form-title h4 {
          margin-bottom: 10px;
          font-size: 1.5rem;
          color: #0070f3;
        }

        .divider {
          border-bottom: 1px solid #0070f3;
          margin-bottom: 10px;
        }

        .client-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          grid-column: 1 / -1;
        }

        .field {
          display: flex;
          flex-direction: column;
        }

        .title {
          font-weight: bold;
          margin-bottom: 5px;
          display: flex;
          align-items: center;
        }

        .icon-title {
          margin-right: 5px;
        }

        .content {
          margin-bottom: 20px;
        }

        .content a {
          word-break: break-all; 
        }
      `}</style>

    </Layout>
  );
};

export default withAuth(ClientInfo);
