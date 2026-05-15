import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/initSupabase';
import { useRouter } from 'next/router';

import withAuth from '../../lib/withAuth';


const FeesTab = () => {
  const [userId, setUserId] = useState(null);
  const [feesData, setFeesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch user details on component mount
  useEffect(() => {
    const fetchUserDetails = async () => {
      const user = supabase.auth.user();
      if (user) {
        setUserId(user.id);
      } else {
        router.push('/login');
      }
    };
    fetchUserDetails();
  }, [router]);

  // Fetch fees data after userId is set
  useEffect(() => {
    if (!userId) return;

    const fetchFeesData = async () => {
      try {
        setLoading(true);

        // Fetch expenses related to the logged-in user or admin
        const { data: expensesData, error } = await supabase
          .from('expenses')
          .select('created_at, expenses_type, expenses_info, case_id, expenses_amount, lawyer_id, admin_id')
          .or(`admin_id.eq.${userId},lawyer_id.eq.${userId}`);

        if (error) {
          console.error('Error fetching expenses:', error);
          setLoading(false);
          return;
        }

        if (!expensesData.length) {
          setFeesData([]); // If no expenses found, set empty array
          setLoading(false);
          return;
        }

        // Fetch lawyer names for each expense
        const feesWithLawyerNames = await Promise.all(
          expensesData.map(async (expense) => {
            const { data: userMetadata, error: userMetadataError } = await supabase
              .from('user_metadata')
              .select('username')
              .eq('new_lawyer_id', expense.lawyer_id)
              .single();

            if (userMetadataError) {
              console.error('Error fetching user metadata:', userMetadataError);
              return { ...expense, username: 'Unknown' };
            }

            return { ...expense, username: userMetadata.username };
          })
        );

        setFeesData(feesWithLawyerNames);
      } catch (error) {
        console.error('Error fetching fees data:', error);
      } finally {
        setLoading(false); // Set loading to false when done
      }
    };

    fetchFeesData();
  }, [userId]);

  const handlePrint = () => {
    console.log('Print clicked - loading:', loading, 'feesData.length:', feesData.length);

    if (loading || feesData.length === 0) {
      alert('الرجاء انتظار تحميل البيانات قبل الطباعة');
      return;
    }

    console.log('Proceeding to print with', feesData.length, 'fees');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for printing');
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>تقرير الرسوم</title>
        <style>
          body {
            font-family: 'Cairo', 'Almarai', sans-serif;
            direction: rtl;
            margin: 20px;
            padding: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #000;
            padding: 10px;
            text-align: center;
            font-size: 12px;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .header h2 {
            margin: 0;
            font-size: 18px;
          }
          .date {
            text-align: left;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="date">${todayStr}</div>
        <div class="header">
          <h2>تقرير الرسوم</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>رقم الدعوى</th>
              <th>تفاصيل</th>
              <th>نوع الرسوم</th>
              <th>قيمة الرسوم</th>
              <th>المستخدم</th>
            </tr>
          </thead>
          <tbody>
            ${feesData.map((fee) => `
              <tr>
                <td>${new Date(fee.created_at).toLocaleDateString()}</td>
                <td>${fee.case_id}</td>
                <td>${fee.expenses_info}</td>
                <td>${fee.expenses_type}</td>
                <td>${fee.expenses_amount}</td>
                <td>${fee.username}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fees-tab-content">
      <div className="fees-header">
        <h2>الرسوم</h2>
        <button onClick={handlePrint} className="print-button">معاينة الطباعة</button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : feesData.length === 0 ? (
        <p>لا توجد بيانات</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>رقم الدعوى</th>
              <th>تفاصيل</th>
              <th>نوع الرسوم</th>
              <th>قيمة الرسوم</th>
              <th>المستخدم</th>
            </tr>
          </thead>
          <tbody>
            {feesData.map((fee, index) => (
              <tr key={index}>
                <td>{new Date(fee.created_at).toLocaleDateString()}</td>
                <td>{fee.case_id}</td>
                <td>{fee.expenses_info}</td>
                <td>{fee.expenses_type}</td>
                <td>{fee.expenses_amount}</td>
                <td>{fee.username}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <style jsx>{`
        .fees-tab-content {
          padding: 20px;
        }

        .fees-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .fees-header h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .print-button {
          padding: 12px 24px;
          background: #3b82f6;
          color: white;
          border: none;
          font-size: 0.9375rem;
          cursor: pointer;
          border-radius: 4px;
          font-family: 'Cairo', 'Almarai', sans-serif;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .print-button:hover {
          background: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }

        th {
          background-color: #f2f2f2;
        }

        tr:hover {
          background-color: #f1f1f1;
        }
      `}</style>
    </div>
  );
};


export default withAuth(FeesTab, ['can_add_fees']);
