import React from 'react';
import Layout from '../../components/layout/Layout';
import withAuth from '../../lib/withAuth';

const LawyerMain = () => {
  return (
    <Layout>
      <div style={{ padding: '20px' }}>
        <h1>Lawyer Main Page</h1>
        <p>This page is under construction.</p>
      </div>
    </Layout>
  );
};

export default withAuth(LawyerMain);
