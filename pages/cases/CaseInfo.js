import React, { useState, useEffect } from 'react';
import { FiExternalLink, FiInfo } from 'react-icons/fi'; // Using react-icons for the icons
import { supabase } from '../../lib/initSupabase';
import Link from 'next/link';

const CaseInfo = ({ caseDetails }) => {
  const [clientId, setClientId] = useState(null);

  useEffect(() => {
    const fetchClientId = async () => {
      if (caseDetails?.client_name) {
        try {
          const { data, error } = await supabase
            .from('clients_data')
            .select('id')
            .eq('client_name', caseDetails.client_name)
            .single();
          
          if (!error && data) {
            setClientId(data.id);
          }
        } catch (error) {
          console.error('Error fetching client ID:', error);
        }
      }
    };

    fetchClientId();
  }, [caseDetails?.client_name]);

  if (!caseDetails) {
    return <p>No case details available.</p>; // Handle null caseDetails gracefully
  }

  // Helper function to render status tags
  const renderStatusTag = (text, color) => (
    <span className={`status-tag ${color}`}>
      {text}
    </span>
  );

  return (
    <>
      <div className="parties-container">
        <div>
          <h3 className="section-heading">أطراف الدعوى</h3>
        </div>
        <table className="parties-table">
          <thead>
            <tr>
              <th>الطرف</th>
              <th>الشكل القانوني</th>
              <th>الاسم بالعربية</th>
              <th>الاسم بالانجليزية</th>
              <th>الصفة القانونية</th>
              <th>معلومات الإتصال</th>
            </tr>
          </thead>
          <tbody>
            {/* Client Row */}
            <tr>
              <td><span className="party-client">موكل</span></td>
              <td>{caseDetails.legal_form || 'فرد'}</td>
              <td>{caseDetails.client_name || 'ميلاد'}</td>
              <td>{'Ahmed'}</td>
              <td>{renderStatusTag(caseDetails.client_adult_child || 'مطعون ضده', 'yellow')}</td>
              <td>
                {clientId ? (
                  <Link href={`/client/view-client?id=${clientId}`}>
                    <a className="icon-button-link">
                      <FiExternalLink />
                    </a>
                  </Link>
                ) : (
                  <button className="icon-button" disabled>
                  <FiExternalLink />
                </button>
                )}
              </td>
            </tr>
            {/* Opponent Row */}
            <tr>
              <td><span className="party-opponent">خصم</span></td>
              <td>{caseDetails.opponent_legal_form || 'بنك دولي'}</td>
              <td>{caseDetails.opponentName || 'اسم الخصم'}</td>
              <td>{'SAA'}</td>
              <td>{renderStatusTag(caseDetails.caseState || 'نهاية', 'red')}</td>
              <td>
                <button className="icon-button">
                  <FiInfo />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .parties-container {
          background-color: transparent; /* Transparent to integrate with parent container */
          padding: 0 32px 24px 32px; /* Match container padding, add bottom padding */
          border-radius: 0; /* No border radius - part of integrated container */
          width: 100%;
          direction: rtl;
        }

        .main-title {
          font-family: 'Almarai', sans-serif; /* <-- FONT FAMILY UPDATED HERE */
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 20px;
          text-align: right;
        }

        .parties-table {
          width: 100%;
          border-collapse: collapse;
          text-align: right;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; /* Default font for the rest of the table */
        }

        .parties-table th,
        .parties-table td {
          padding: 16px 12px;
          font-size: 0.95rem;
          color: #374151;
          vertical-align: middle;
        }

        .parties-table thead {
          background-color: #f9fafb;
        }

        .parties-table th {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.875rem;
          background-color: #f9fafb;
          padding: 14px 16px;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          border-bottom: 2px solid #e5e7eb;
        }

        .parties-table tbody tr {
          border-bottom: 1px solid #f3f4f6;
          transition: background-color 0.15s ease;
        }

        .parties-table tbody tr:hover {
          background-color: #f9fafb;
        }

        .parties-table tbody tr:last-child {
          border-bottom: none;
        }
        
        .party-client, .party-opponent {
          font-weight: 700;
        }

        .party-client {
          color: #3b82f6; /* Blue */
        }

        .party-opponent {
          color: #ef4444; /* Red */
        }

        .status-tag {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.8rem;
          text-align: center;
        }

        .status-tag.yellow {
          background-color: #fef9c3;
          color: #ca8a04;
        }

        .status-tag.red {
          background-color: #fee2e2;
          color: #dc2626;
        }

        .icon-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          color: #6b7280;
          transition: all 0.2s ease;
        }

        .icon-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .icon-button-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          font-size: 1.25rem;
          color: #3b82f6;
          transition: all 0.2s ease;
          text-decoration: none;
          border-radius: 4px;
        }

        .icon-button-link:hover {
          color: #2563eb;
          background-color: #eff6ff;
        }

.section-heading {
  font-size: 1.2rem; /* Adjusted for consistency */
  font-weight: bold;
  color: #333;
  border-bottom: 2px solid #0070f3;
  padding-bottom: 5px;
  margin: 0; /* Removes extra margin */
}
        .icon-button:hover {
          color: #1f2937;
        }

        @media (max-width: 768px) {
          .parties-container {
            padding: 0 16px 16px 16px;
          }

          .parties-table {
            border-collapse: separate;
            border-spacing: 0 12px;
          }

          .parties-table thead {
            display: none;
          }

          .parties-table tbody tr {
            display: block;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            overflow: hidden;
            background: #ffffff;
          }

          .parties-table tbody td {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 10px 12px;
            font-size: 0.9rem;
            border-bottom: 1px solid #f1f5f9;
          }

          .parties-table tbody td:last-child {
            border-bottom: none;
          }

          .parties-table tbody td::before {
            font-weight: 700;
            color: #64748b;
            flex-shrink: 0;
          }

          .parties-table tbody td:nth-child(1)::before { content: 'الطرف'; }
          .parties-table tbody td:nth-child(2)::before { content: 'الشكل القانوني'; }
          .parties-table tbody td:nth-child(3)::before { content: 'الاسم بالعربية'; }
          .parties-table tbody td:nth-child(4)::before { content: 'الاسم بالانجليزية'; }
          .parties-table tbody td:nth-child(5)::before { content: 'الصفة القانونية'; }
          .parties-table tbody td:nth-child(6)::before { content: 'معلومات الإتصال'; }

          .status-tag {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </>
  );
};

export default CaseInfo;
