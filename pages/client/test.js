/* eslint-disable no-unused-vars */


import React, { useState } from 'react';
import ClientList from '../../components/clients/ClientList';
import Layout from '../../components/layout/Layout';
import AddNewClient from '../../components/clients/AddNewClient';
import { supabase } from '../../lib/initSupabase';
import { useRouter } from 'next/router';
import withAuth from '../../lib/withAuth';

const ClientIndex = () => {
  const [showAddClient, setShowAddClient] = useState(false);
  const router = useRouter();

  const handleOpenModal = () => {
    setShowAddClient(true);
  };

  const handleCloseModal = () => {
    setShowAddClient(false);
  };

  const handleClientAdded = () => {
    handleCloseModal();
    router.reload();
  };

  return (
    <Layout>
      <div className="clients-container">
        <div className="add-client-button-container">
          <button className="add-client-button" onClick={handleOpenModal}>
            Add New Client
          </button>
        </div>
        <ClientList />
      </div>
      {showAddClient && (
        <AddNewClient onClose={handleCloseModal} onClientAdded={handleClientAdded} />
      )}

    { /* eslint-disable-next-line react/no-unknown-property */ }


      <style jsx>{`
        .clients-container {
          padding: 1rem;
        }

        .add-client-button-container {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 1rem;
        }

        .add-client-button {
          background-color: #1e88e5;
          color: #fff;
          border: none;
          border-radius: 4px;
          padding: 12px 20px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .add-client-button:hover {
          background-color: #0d47a1;
        }
      `}</style>
       {/* eslint-enable react/no-unknown-property */}
       
    </Layout>
  );
};

export default withAuth(ClientIndex);