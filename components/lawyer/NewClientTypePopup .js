
/* eslint-disable react/prop-types */

import React from 'react';

function NewClientTypePopup({ show, onClose, onSave }) {
  if (!show) return null;

  return (
    <div className="popup">
      <div className="popup-content">
        <span className="close" onClick={onClose}>
          &times;
        </span>
        <label style={{ direction: 'rtl' }}>نوع الموكل الجديد:</label>
        <input type="text" name="newClientType" onChange={onSave} />
        <button onClick={onClose}>إلغاء</button>
        <button onClick={onSave}>حفظ</button>
      </div>
    </div>
  );
}

export default NewClientTypePopup;
