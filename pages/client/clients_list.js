// pages/client_list.js
// Fixed import paths for deployment

import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';

const ClientList = () => {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const user = supabase.auth.user();
      if (user) {
        const { data: clientsData, error } = await supabase
          .from('clients')
          .select('*')
          .eq('lawyer_id', user.id); // Filter clients by lawyer_id
        if (error) {
          throw error;
        }
        setClients(clientsData || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error.message);
    }
  };

  return (
    <Layout>
      <div className="client-list-container">
        <h2>قائمة الموكلين</h2>
        <table>
          <thead>
            <tr>
              <th>رمز الموكل</th>
              <th>اسم الموكل</th>
              <th>الشكل القانوني</th>
              <th>العنوان</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>{client.id}</td>
                <td>{client.first_name}</td>
                <td>{client.legal_form}</td>
                <td>{client.address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style jsx>{`
        .client-list-container {
          padding: 20px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        th, td {
          padding: 10px;
          border: 1px solid #ddd;
          text-align: center;
        }

        th {
          background-color: #f2f2f2;
        }
      `}</style>
    </Layout>
  );
};

export default withAuth(ClientList);
