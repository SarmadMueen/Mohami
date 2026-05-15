/* eslint-disable @next/next/no-img-element */


import React, { useState, useEffect } from 'react';
import ClientModal from './ClientModal';
import { supabase } from '../../lib/initSupabase';

const centerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  padding: '20px',
};

const tableStyle = {
  borderCollapse: 'collapse',
  border: '1px solid black',
  color: 'black',
  width: '80%',
  margin: '0 auto',
  background: '#fff',
};

const headerCellStyle = {
  border: '1px solid black',
  padding: '8px',
  textAlign: 'center',
  fontSize: '14px',
  fontWeight: 'bold',
};

const cellStyle = {
  border: '1px solid black',
  padding: '8px',
  textAlign: 'center',
  fontSize: '14px',
};

const ParentComponent = () => {
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data: clients, error } = await supabase.from('clients').select('*').order('first_name', true);

      if (error) {
        console.error('Error fetching clients:', error);
        return;
      }

      setClients(clients);
    } catch (error) {
      console.error(error);
    }
  };

  const handleModifyClient = (client) => {
    setSelectedClient(client);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setSelectedClient(null);
    setShowModal(false);
  };

  const handleSaveModal = async (modifiedClient) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          // ... (same as before)
        })
        .eq('id', modifiedClient.id);

      if (error) {
        throw new Error('Error updating client data');
      }

      // After updating the client data, fetch the updated clients again to reflect the changes in the table
      fetchClients();

      console.log('Modified client:', modifiedClient);
      handleCloseModal();
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
                <th style={headerCellStyle}>#</th>
                <th style={headerCellStyle}>First Name</th>
                <th style={headerCellStyle}>Email</th>
                <th style={headerCellStyle}>Phone</th>
                <th style={headerCellStyle}>Address</th>
                <th style={headerCellStyle}>Country ID</th>
                <th style={headerCellStyle}>Emergency Contact</th>
                <th style={headerCellStyle}>Number of Cases</th>
                <th style={headerCellStyle}>Total Amount</th>
                <th style={headerCellStyle}>Paid Amount</th>
                <th style={headerCellStyle}>Remaining Amount</th>
                <th style={headerCellStyle}>Power of Attorney</th>
                <th style={headerCellStyle}>Date of Creation</th>
                <th style={headerCellStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, index) => (
                <tr key={client.id}>
                  <td style={cellStyle}>{index + 1}</td>
                  <td style={cellStyle}>{client.first_name}</td>
                  <td style={cellStyle}>{client.email}</td>
                  <td style={cellStyle}>{client.phone}</td>
                  <td style={cellStyle}>{client.address}</td>
                  <td style={cellStyle}>{client.country_id}</td>
                  <td style={cellStyle}>{client.emergency_contact}</td>
                  <td style={cellStyle}>{client.number_of_cases}</td>
                  <td style={cellStyle}>{client.total_amount}</td>
                  <td style={cellStyle}>{client.paid_amount}</td>
                  <td style={cellStyle}>{client.remaining_amount}</td>
                  <td style={cellStyle}>
                    {client.warrant_of_attorney && <img src={client.warrant_of_attorney} alt="Power of Attorney" style={{ maxWidth: '100px' }} />}
                  </td>
                  <td style={cellStyle}>{client.date_of_creation}</td>
                  <td style={cellStyle}>
                    <button className="btn btn-primary" onClick={() => handleModifyClient(client)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && <ClientModal client={selectedClient} showModal={showModal} onClose={handleCloseModal} onSave={handleSaveModal} />}
    </div>
  );
};

export default ParentComponent;
