/* eslint-disable react/prop-types */


import React from 'react';

const AttachmentViewer = ({ attachments }) => {
  return (
    <div>
      {Array.isArray(attachments) && attachments.length > 0 && (
        <div>
          المرفقات:
          <ul>
            {attachments.map((attachment, index) => (
              <li key={index}>
                <a href={attachment} target="_blank" rel="noopener noreferrer">
                  عرض المرفق {index + 1}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AttachmentViewer;
