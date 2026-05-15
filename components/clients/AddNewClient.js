

/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */

import React, { useState } from 'react';
import { supabase } from '../../lib/initSupabase';
import withAuth from '../../lib/withAuth';

const AddNewClient = ({ onClose, onClientAdded }) => {
  const initialClientState = {
    first_name: '',
    email: '',
    id_number: '',
    address: '',
    governorate_id: '',
    phone: null,
    notes: null,
    country_id:''
  };

  const governorates = [
    'بغداد',
    'أربيل',
    'الانبار',
    'بابل',
    'بصرة',
    'دهوك',
    'ذي قار',
    'ديالى',
    'كربلاء',
    'كركوك',
    'ميسان',
    'النجف',
    'نينوى',
    'واسط',
  ];

  const [newClient, setNewClient] = useState(initialClientState);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewClient((prevClient) => ({ ...prevClient, [name]: value }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const validateForm = () => {
    if (!newClient.first_name || !newClient.email) {
      alert('Please fill in the required fields: First Name and Email');
      return false;
    }

    return true;
  };

  const handleSaveClick = async () => {
    try {
      if (!validateForm()) {
        return;
      }

      let imageURL = '';
      if (selectedImage) {
        const fileName = `${Date.now()}_${selectedImage.name}`;
        const filePath = `images/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, selectedImage);

        if (uploadError) {
          throw new Error('Error uploading image');
        }

        const { publicURL } = await supabase.storage.from('images').getPublicUrl(filePath);
        imageURL = publicURL;
      }

      const { data: clientData, error: clientError } = await supabase.from('clients').insert([
        { ...newClient, image_url: imageURL },
      ]);

      if (clientError) {
        console.error('Error inserting client data:', clientError);
        throw new Error('Error inserting client data');
      }

      console.log('Inserted client:', clientData[0]);

      onClientAdded();

      setNewClient(initialClientState);
      setSelectedImage(null);
    } catch (error) {
      console.error(error);
      alert('An error occurred while saving the client.');
    }
  };

  return (
    <div className="modal-container">
      <div className="modal-content">
        <h2>إضافة موكل جديد</h2>
        <div className="grid-container" style={{ direction: 'rtl' }}>
          <div style={{ direction: 'rtl' }}>
            <label style={{ direction: 'rtl' }}>أسم الموكل:</label>
            <input
              type="text"
              name="first_name"
              value={newClient.first_name}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label style={{ direction: 'rtl' }}>البريد الإلكتروني:</label>
            <input
              type="text"
              name="email"
              value={newClient.email}
              onChange={handleInputChange}
            />
          </div>
          <div style={{ direction: 'rtl' }}>
            <label>رقم الإقامة / الهوية / جواز السفر:</label>
            <input
              type="text"
              name="id_number"
              value={newClient.id_number}
              onChange={handleInputChange}
            />
          </div>


          <div style={{ direction: 'rtl' }}>
            <label>الجنسية  :</label>
            <input
              type="text"
              name="country_id"
              value={newClient.country_id}
              onChange={handleInputChange}
            />
          </div>


          <div style={{ direction: 'rtl' }}>
            <label style={{ direction: 'rtl' }}>العنوان:</label>
            <input
              type="text"
              name="address"
              value={newClient.address}
              onChange={handleInputChange}
            />
          </div>
          <div style={{ direction: 'rtl' }}>
            <label style={{ direction: 'rtl' }}>المحافظة:</label>
            <select
              name="governorate_id"
              value={newClient.governorate_id}
              onChange={handleInputChange}
            >
              <option value="">اختر المحافظة</option>
              {governorates.map((governorate) => (
                <option key={governorate} value={governorate}>
                  {governorate}
                </option>
              ))}
            </select>
          </div>
          <div style={{ direction: 'rtl' }}>
            <label>رقم الجوال:</label>
            <input
              type="text"
              name="phone"
              value={newClient.phone || ''}
              onChange={handleInputChange}
            />
          </div>
          <div style={{ direction: 'rtl' }}>
            <label style={{ direction: 'rtl' }}>وكالة:</label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".jpg,.jpeg,.png,.pdf"
            />
          </div>
        </div>
        <div style={{ direction: 'rtl' }}>
          <label style={{ direction: 'rtl' }}>ملاحظات:</label>
          <textarea
            name="notes"
            value={newClient.notes || ''}
            onChange={handleInputChange}
          />
        </div>
        <div className="buttons">
          <button onClick={handleSaveClick}>حفظ</button>
          <button onClick={onClose}>إلغاء</button>
        </div>
      </div>

      { /* eslint-disable-next-line react/no-unknown-property */ }


      <style jsx>{`
        .modal-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .modal-content {
          background: white;
          padding: 20px;
          border-radius: 5px;
          box-shadow: 0px 2px 10px rgba(0, 0, 0, 0.2);
          max-width: 800px;
          width: 100%;
        }

        h2 {
          text-align: center;
        }

        .grid-container {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 20px;
        }

        label {
          display: block;
        }

        select,
        input[type='text'],
        textarea {
          width: 100%;
          padding: 8px;
          border-radius: 5px;
          border: 1px solid #ccc;
          font-size: 16px;
        }

        .buttons {
          text-align: right;
          margin-top: 20px;
        }

        button {
          margin: 0 5px;
          padding: 10px 16px;
          border-radius: 5px;
          border: none;
          cursor: pointer;
          background: #007bff;
          color: white;
          font-size: 16px;
        }
      `}</style>
       {/* eslint-enable react/no-unknown-property */}
       
    </div>
  );
};

export default withAuth(AddNewClient);
