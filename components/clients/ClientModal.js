
/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */


import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/initSupabase';
import { useRouter } from 'next/router';
import withAuth from '../../lib/withAuth';



const modalStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  background: 'rgba(0, 0, 0, 0.6)',
};

const modalContentStyle = {
  position: 'relative',
  background: '#fff',
  padding: '20px',
  width: '80%', // Increase width for better grid layout
  borderRadius: '8px',
  boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
};

const closeButtonStyle = {
  position: 'absolute',
  top: '10px',
  right: '10px',
  cursor: 'pointer',
  fontSize: '20px',
};

const labelStyle = {
  fontWeight: 'bold',
};

const inputStyle = {
  width: '100%', // Use 100% width to make it occupy the entire cell in the grid
  padding: '6px', // Reduced padding for smaller textboxes
  fontSize: '14px',
  marginBottom: '10px', // Adjusted margin for spacing between grid cells
  border: '1px solid #ccc',
  borderRadius: '4px',
};

const formStyle = {
  marginBottom: 0,
  display: 'grid', // Use CSS grid to create a grid layout
  gridTemplateColumns: 'repeat(3, 1fr)', // 3 columns in the grid
  gap: '10px', // Adjusted gap for spacing between grid cells
};

const ClientModal = ({ client, showModal, onClose, onSave }) => {
  const [newClient, setNewClient] = useState(client);
  const [selectedImage, setSelectedImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageURL, setImageURL] = useState('');
  const router = useRouter();

  useEffect(() => {
    setNewClient(client); // Reset the form state whenever the client prop changes
  }, [client]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setNewClient((prevClient) => ({
      ...prevClient,
      [id]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      alert('Please select an image.');
      return;
    }

    try {
      const fileName = `${Date.now()}_${selectedImage.name}`;
      const filePath = `images/${fileName}`;

      const { data, error } = await supabase.storage.from('images').upload(filePath, selectedImage);

      if (error) {
        throw new Error('Error uploading image');
      }

      // Get the public URL of the uploaded image
      const { publicURL } = await supabase.storage.from('images').getPublicUrl(filePath);

      // Update the imageURL state with the public URL
      setImageURL(publicURL);

      // Update the client's image_url field with the new URL
      setNewClient((prevClient) => ({
        ...prevClient,
        image_url: publicURL,
      }));
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveImage = async () => {
    try {
      // Remove the image from Supabase storage
      await supabase.storage.remove(`images/${client.image_url.split('/').pop()}`);

      // Update the imageURL state and client's image_url field with an empty string
      setImageURL('');
      setNewClient((prevClient) => ({
        ...prevClient,
        image_url: '',
      }));
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveClick = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Save the modified client data, including the image URL
      await onSave(newClient);

      setSaving(false);
      onClose(); // Close the modal after saving
      router.reload(); // Auto-reload the page to show the updated client list
    } catch (error) {
      console.error(error);
      setSaving(false);
    }
  };

  return (
    showModal && (
      <div style={modalStyle}>
        <div style={modalContentStyle}>
          <span style={closeButtonStyle} onClick={onClose}>
            &#10005;
          </span>
          <h2 style={{ marginBottom: '20px' }}>Edit Client</h2>
          <form style={formStyle} onSubmit={handleSaveClick}>
            <div>
              <label style={labelStyle}>الموكل:</label>
              <input type="text" id="first_name" value={newClient.first_name} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>البريد الالكتروني:</label>
              <input type="text" id="email" value={newClient.email} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>رقم الجوال:</label>
              <input type="text" id="phone" value={newClient.phone} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>الجنسية:</label>
              <input type="text" id="country_id" value={newClient.country_id} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>العنوان:</label>
              <input type="text" id="address" value={newClient.address} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>رقم طوارئ:</label>
              <input type="text" id="emergency_contact" value={newClient.emergency_contact} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>الاجمالي المبلغ:</label>
              <input type="number" id="total_amount" value={newClient.total_amount} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>المدفوع المبلغ:</label>
              <input type="number" id="paid_amount" value={newClient.paid_amount} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>الوكالة:</label>
              <input type="file" id="image" onChange={handleFileChange} accept=".jpg,.jpeg,.png,.pdf" style={inputStyle} />
              <button type="button" onClick={handleUpload}>Upload</button>
              {imageURL && (
                <div>
                  <button type="button" onClick={handleRemoveImage}>Remove Image</button>
                </div>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </form>
        </div>
      </div>
    )
  );
};

export default withAuth  (ClientModal);
