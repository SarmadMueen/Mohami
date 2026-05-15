
/* eslint-disable no-unused-vars */


import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/initSupabase';
import ClientModal from '../../components/clients/ClientModal';
import withAuth from '../../lib/withAuth';

const centerStyle = {
  display: 'flex',
  justifyContent: 'center',
};

const tableStyle = {
  maxWidth: '80%',
  margin: '20px auto',
  background: '#f1f1f1', // Light-colored background
  borderCollapse: 'collapse',
  borderRadius: '8px',
  boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
};

const headerCellStyle = {
  fontWeight: 'bold',
  background: '#3498db', // Header background color
  color: '#fff',
  padding: '10px',
  textAlign: 'left',
};

const cellStyle = {
  padding: '10px',
  borderBottom: '1px solid #ddd',
};

const ClientList = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [isClientAdded, setIsClientAdded] = useState(false);

  useEffect(() => {
    fetchClients();
  }, [isClientAdded]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.from('clients').select();
      if (error) {
        throw new Error('Error fetching clients');
      }
      setClients(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleModify = (client) => {
    setSelectedClient(client);
  };

  const handleCloseModal = () => {
    setSelectedClient(null);
  };

  const handleSaveModal = async (updatedClient) => {
    try {
      const { data, error } = await supabase.from('clients').update(updatedClient).eq('id', updatedClient.id);

      if (error) {
        throw new Error('Error updating client');
      }

      setIsClientAdded(true);
      setSelectedClient(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddClient = () => {
    setShowAddClientModal(true);
  };

  const handleCloseAddClientModal = () => {
    setShowAddClientModal(false);
  };

  const handleSaveAddClientModal = async (newClient) => {
    try {
      const { data, error } = await supabase.from('clients').insert([newClient]);

      if (error) {
        throw new Error('Error adding new client');
      }

      setIsClientAdded(true);
      setShowAddClientModal(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={centerStyle}>
      <div className="card-box">
        <div className="table-responsive">
          <table className="table table-bordered text-center table-sm" style={tableStyle}>
            <thead>
              <tr>
                <th style={headerCellStyle}>الموكل</th>
                <th style={headerCellStyle}>البريد الالكتروني</th>
                <th style={headerCellStyle}>رقم الجوال</th>
                <th style={headerCellStyle}>الجنسية</th>
                <th style={headerCellStyle}>العنوان</th>
                {/* <th style={headerCellStyle}>رقم طوارئ</th>
                <th style={headerCellStyle}>عدد القضايا</th>
                <th style={headerCellStyle}>المبلغ الاجمالي</th>
                <th style={headerCellStyle}>المبلغ المدفوع</th>
                <th style={headerCellStyle}>المبلغ الباقي</th> */}
                <th style={headerCellStyle}>وكالة</th>
                <th style={headerCellStyle}>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td style={cellStyle}>{client.first_name}</td>
                  <td style={cellStyle}>{client.email}</td>
                  <td style={cellStyle}>{client.phone}</td>
                  <td style={cellStyle}>{client.country_id}</td>
                  <td style={cellStyle}>{client.address}</td>
                  {/* <td style={cellStyle}>{client.emergency_contact}</td> */}
                  {/* <td style={cellStyle}>{client.number_of_cases}</td> */}
                  {/* <td style={cellStyle}>{client.total_amount}</td>
                  <td style={cellStyle}>{client.paid_amount}</td>
                  <td style={cellStyle}>{client.total_amount - client.paid_amount}</td> */}
                  <td style={cellStyle}>
                    {client.image_url ? (
                      <a href={client.image_url} target="_blank" rel="noopener noreferrer">
                        Download
                      </a>
                    ) : (
                      'No image'
                    )}
                  </td>
                  <td style={cellStyle}>
                    <button onClick={() => handleModify(client)}>Modify</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selectedClient && (
        <ClientModal
          client={selectedClient}
          showModal={true}
          onClose={handleCloseModal}
          onSave={handleSaveModal}
        />
      )}
    </div>
  );
};

export default withAuth(ClientList);
