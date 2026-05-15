import React, { useState } from 'react';

const ContractPopup = () => {
  const [showPopup, setShowPopup] = useState(false);

  const handleClick = () => {
    setShowPopup(true);
  };

  const handleClose = () => {
    setShowPopup(false);
  };

  return (
    <div>
      <span onClick={handleClick}>العقود</span>

      {showPopup && (
        <div className="popup-container">
          <div className="popup">
            <div className="popup-header">
              <h2>العقود</h2>
              <button className="close-btn" onClick={handleClose}>
                &times;
              </button>
            </div>
            <div className="popup-body">
              <table>
                <thead>
                  <tr>
                    <th>رقم العقد</th>
                    {/* Add more table headers as needed */}
                  </tr>
                </thead>
                <tbody>
                  {/* Add table rows with contract data */}
                  <tr>
                    <td>1</td>
                    {/* Add more table data cells as needed */}
                  </tr>
                  {/* Repeat the above row for each contract */}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractPopup;