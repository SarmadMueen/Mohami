/* eslint-disable react/prop-types */


import React, { useState } from 'react';

const ModifyLawyerPopup = ({ lawyer, onSave, onCancel }) => {
  const [modifiedLawyer, setModifiedLawyer] = useState({ ...lawyer });

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setModifiedLawyer((prevLawyer) => ({ ...prevLawyer, [name]: value }));
  };

  const handleSaveClick = () => {
    onSave(modifiedLawyer);
  };

  return (
    <div className="popup">
      <h2>Edit Lawyer</h2>
      <div className="field">
        <label className="label">Lawyer Name:</label>
        <input
          type="text"
          name="lawyer_name"
          value={modifiedLawyer.lawyer_name}
          onChange={handleInputChange}
          className="input"
        />
      </div>
      <div className="field">
        <label className="label">Mobile No:</label>
        <input
          type="text"
          name="mobile_no"
          value={modifiedLawyer.mobile_no}
          onChange={handleInputChange}
          className="input"
        />
      </div>
      {/* ... (similarly, add the rest of the fields here) */}
      <button onClick={handleSaveClick}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
};

export default ModifyLawyerPopup;
