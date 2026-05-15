import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/initSupabase';
import { useRouter } from 'next/router';
import { FiFileText, FiDollarSign, FiSearch } from 'react-icons/fi';
import { FaFileContract } from 'react-icons/fa';

const LegalServicesFees = () => {
  const [feesData, setFeesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const router = useRouter();

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

  useEffect(() => {
    if (!userId) return;

    const fetchLegalServicesFees = async () => {
      try {
        setLoading(true);

        // Get user metadata to determine admin_id and role
        const { data: userMetadataList, error: metaError } = await supabase
          .from('user_metadata')
          .select('role, admin_user_id, new_lawyer_id')
          .eq('user_id', userId);

        if (metaError) {
          console.error('Error fetching user metadata:', metaError);
          setLoading(false);
          return;
        }

        if (!userMetadataList || userMetadataList.length === 0) {
          console.log('No user metadata found');
          setLoading(false);
          return;
        }

        const userMetadata = userMetadataList[0];
        const { role, admin_user_id, new_lawyer_id } = userMetadata;

        // Build query based on role (similar to add-consultation.js)
        let query = supabase
          .from('consultations')
          .select('id, consultation_title, consultation_type, consultation_date, consultation_fees, client_name, lawyer_id, admin_id, created_at')
          .order('created_at', { ascending: false });

        if (role === 'Admin' || role === 'الفئة 1') {
          query = query.eq('admin_id', admin_user_id || userId);
        } else if (role === 'Lawyer' || role === 'الفئة 2') {
          query = query.or(`admin_id.eq.${admin_user_id || userId},lawyer_id.eq.${new_lawyer_id || userId}`);
        } else {
          // Fallback: try both admin_id and lawyer_id
          query = query.or(`admin_id.eq.${userId},lawyer_id.eq.${userId}`);
        }

        const { data: allConsultations, error: consultationsError } = await query;

        console.log('Fetched consultations:', allConsultations);
        console.log('Consultations error:', consultationsError);
        console.log('User role:', role);
        console.log('Admin ID:', admin_user_id);
        console.log('Lawyer ID:', new_lawyer_id);

        const allFees = [];

        // Process consultations - filter those with fees > 0
        if (allConsultations && !consultationsError) {
          allConsultations.forEach(consultation => {
            const fees = parseFloat(consultation.consultation_fees) || 0;
            // Only include consultations with fees > 0
            if (fees > 0) {
              allFees.push({
                id: consultation.id,
                type: 'استشارة قانونية',
                title: consultation.consultation_title || 'بدون عنوان',
                date: consultation.consultation_date || consultation.created_at,
                fees: fees,
                client_name: consultation.client_name || '-',
                service_id: consultation.id,
                service_type: 'consultation'
              });
            }
          });
        }

        // Fetch contract reviews with fees
        // First, get all contract reviews for the user, then filter by fees
        let contractReviewsQuery = supabase
          .from('contract_reviews')
          .select('id, contract_title, review_date, contract_fees, case_reference_id, client_id, created_at, admin_id, lawyer_id, created_by')
          .order('created_at', { ascending: false });

        // Apply role-based filtering - try multiple approaches
        try {
          if (role === 'Admin' || role === 'الفئة 1' || role === 'admin' || role === 'Admin') {
            // Admin can see all reviews where they are the admin or created by them
            if (admin_user_id) {
              contractReviewsQuery = contractReviewsQuery.or(`admin_id.eq.${admin_user_id},created_by.eq.${userId}`);
            } else {
              contractReviewsQuery = contractReviewsQuery.or(`admin_id.eq.${userId},created_by.eq.${userId}`);
            }
          } else if (role === 'Lawyer' || role === 'الفئة 2' || role === 'lawyer' || role === 'Lawyer') {
            // Lawyer can see reviews where they are the lawyer or admin_id matches their admin
            const conditions = [];
            if (new_lawyer_id) conditions.push(`lawyer_id.eq.${new_lawyer_id}`);
            if (admin_user_id) conditions.push(`admin_id.eq.${admin_user_id}`);
            conditions.push(`created_by.eq.${userId}`);
            contractReviewsQuery = contractReviewsQuery.or(conditions.join(','));
          } else {
            // Fallback: try all possible matches
            contractReviewsQuery = contractReviewsQuery.or(`admin_id.eq.${userId},lawyer_id.eq.${userId},created_by.eq.${userId}`);
          }
        } catch (queryError) {
          console.error('Error building contract reviews query:', queryError);
          // Fallback to simple query
          contractReviewsQuery = supabase
            .from('contract_reviews')
            .select('id, contract_title, review_date, contract_fees, case_reference_id, client_id, created_at, admin_id, lawyer_id, created_by')
            .or(`admin_id.eq.${userId},lawyer_id.eq.${userId},created_by.eq.${userId}`)
            .order('created_at', { ascending: false });
        }

        const { data: contractReviews, error: contractReviewsError } = await contractReviewsQuery;

        console.log('Fetched contract reviews:', contractReviews);
        console.log('Contract reviews error:', contractReviewsError);
        console.log('Contract reviews count:', contractReviews?.length || 0);
        console.log('User role for contract reviews:', role);
        console.log('Admin user ID:', admin_user_id);
        console.log('New lawyer ID:', new_lawyer_id);

        // Process contract reviews - filter those with fees > 0
        if (contractReviews && !contractReviewsError) {
          console.log('Processing contract reviews, total count:', contractReviews.length);
          contractReviews.forEach(review => {
            // Handle different fee formats: null, undefined, string, number
            let fees = 0;
            if (review.contract_fees !== null && review.contract_fees !== undefined) {
              fees = parseFloat(review.contract_fees);
              if (isNaN(fees)) {
                fees = 0;
              }
            }
            
            console.log('Review fee check:', {
              id: review.id,
              title: review.contract_title,
              contract_fees: review.contract_fees,
              parsed_fees: fees
            });
            
            // Only include contract reviews with fees > 0
            if (fees > 0) {
              console.log('✓ Adding contract review fee:', {
                id: review.id,
                title: review.contract_title,
                fees: fees
              });
              allFees.push({
                id: review.id,
                type: 'مراجعة عقد',
                title: review.contract_title || 'بدون عنوان',
                date: review.review_date || review.created_at,
                fees: fees,
                client_name: review.client_id || '-',
                service_id: review.id,
                service_type: 'contract_review'
              });
            } else {
              console.log('✗ Skipping contract review with no fees:', review.id, 'fees value:', review.contract_fees, 'parsed:', fees);
            }
          });
        } else if (contractReviewsError) {
          console.error('Error fetching contract reviews:', contractReviewsError);
          console.error('Error details:', JSON.stringify(contractReviewsError, null, 2));
        } else {
          console.log('No contract reviews found or error occurred');
        }

        // Fetch document reviews with fees
        let documentReviewsQuery = supabase
          .from('document_reviews')
          .select('id, document_title, review_date, document_fees, case_reference_id, client_id, created_at, admin_id, lawyer_id, created_by')
          .order('created_at', { ascending: false });

        // Apply role-based filtering - try multiple approaches
        try {
          if (role === 'Admin' || role === 'الفئة 1' || role === 'admin' || role === 'Admin') {
            // Admin can see all reviews where they are the admin or created by them
            if (admin_user_id) {
              documentReviewsQuery = documentReviewsQuery.or(`admin_id.eq.${admin_user_id},created_by.eq.${userId}`);
            } else {
              documentReviewsQuery = documentReviewsQuery.or(`admin_id.eq.${userId},created_by.eq.${userId}`);
            }
          } else if (role === 'Lawyer' || role === 'الفئة 2' || role === 'lawyer' || role === 'Lawyer') {
            // Lawyer can see reviews where they are the lawyer or admin_id matches their admin
            const conditions = [];
            if (new_lawyer_id) conditions.push(`lawyer_id.eq.${new_lawyer_id}`);
            if (admin_user_id) conditions.push(`admin_id.eq.${admin_user_id}`);
            conditions.push(`created_by.eq.${userId}`);
            documentReviewsQuery = documentReviewsQuery.or(conditions.join(','));
          } else {
            // Fallback: try all possible matches
            documentReviewsQuery = documentReviewsQuery.or(`admin_id.eq.${userId},lawyer_id.eq.${userId},created_by.eq.${userId}`);
          }
        } catch (queryError) {
          console.error('Error building document reviews query:', queryError);
          // Fallback to simple query
          documentReviewsQuery = supabase
            .from('document_reviews')
            .select('id, document_title, review_date, document_fees, case_reference_id, client_id, created_at, admin_id, lawyer_id, created_by')
            .or(`admin_id.eq.${userId},lawyer_id.eq.${userId},created_by.eq.${userId}`)
            .order('created_at', { ascending: false });
        }

        const { data: documentReviews, error: documentReviewsError } = await documentReviewsQuery;

        console.log('Fetched document reviews:', documentReviews);
        console.log('Document reviews error:', documentReviewsError);
        console.log('Document reviews count:', documentReviews?.length || 0);

        // Process document reviews - filter those with fees > 0
        if (documentReviews && !documentReviewsError) {
          console.log('Processing document reviews, total count:', documentReviews.length);
          documentReviews.forEach(review => {
            // Handle different fee formats: null, undefined, string, number
            let fees = 0;
            if (review.document_fees !== null && review.document_fees !== undefined) {
              fees = parseFloat(review.document_fees);
              if (isNaN(fees)) {
                fees = 0;
              }
            }
            
            console.log('Document review fee check:', {
              id: review.id,
              title: review.document_title,
              document_fees: review.document_fees,
              parsed_fees: fees
            });
            
            // Only include document reviews with fees > 0
            if (fees > 0) {
              console.log('✓ Adding document review fee:', {
                id: review.id,
                title: review.document_title,
                fees: fees
              });
              allFees.push({
                id: review.id,
                type: 'مراجعة أوراق قانونية',
                title: review.document_title || 'بدون عنوان',
                date: review.review_date || review.created_at,
                fees: fees,
                client_name: review.client_id || '-',
                service_id: review.id,
                service_type: 'document_review'
              });
            } else {
              console.log('✗ Skipping document review with no fees:', review.id, 'fees value:', review.document_fees, 'parsed:', fees);
            }
          });
        } else if (documentReviewsError) {
          console.error('Error fetching document reviews:', documentReviewsError);
          console.error('Error details:', JSON.stringify(documentReviewsError, null, 2));
        } else {
          console.log('No document reviews found or error occurred');
        }

        console.log('Processed fees:', allFees);

        // Sort by date (newest first)
        allFees.sort((a, b) => new Date(b.date) - new Date(a.date));

        setFeesData(allFees);
      } catch (error) {
        console.error('Error fetching legal services fees:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLegalServicesFees();
  }, [userId]);

  const getCurrencyText = (currency) => {
    if (currency === 'IQD') return 'دينار';
    if (currency === 'USD') return 'دولار';
    if (currency === 'SAR') return 'ريال';
    return 'دينار';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getServiceIcon = (serviceType) => {
    if (serviceType === 'consultation') return <FiFileText />;
    if (serviceType === 'contract_review') return <FaFileContract />;
    if (serviceType === 'document_review') return <FiSearch />;
    return <FiFileText />;
  };

  const getServiceRoute = (serviceType, serviceId) => {
    if (serviceType === 'consultation') return `/services/view-consultation?id=${serviceId}`;
    if (serviceType === 'contract_review') return `/services/view-contract-review?id=${serviceId}`;
    if (serviceType === 'document_review') return `/services/view-document-review?id=${serviceId}`;
    return '#';
  };

  const totalFees = feesData.reduce((sum, fee) => sum + fee.fees, 0);

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
        <title>رسوم الخدمات القانونية</title>
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
          .total {
            margin-top: 20px;
            font-weight: bold;
            font-size: 16px;
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
          <h2>رسوم الخدمات القانونية</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>نوع الخدمة</th>
              <th>عنوان الخدمة</th>
              <th>اسم العميل</th>
              <th>قيمة الرسوم</th>
            </tr>
          </thead>
          <tbody>
            ${feesData.map((fee) => `
              <tr>
                <td>${formatDate(fee.date)}</td>
                <td>${fee.type}</td>
                <td>${fee.title}</td>
                <td>${fee.client_name}</td>
                <td>${fee.fees.toFixed(2)} ${getCurrencyText('IQD')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total">إجمالي الرسوم: ${totalFees.toFixed(2)} دينار</div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="legal-services-fees-container">
      <div className="fees-header">
        <h2>رسوم الخدمات القانونية</h2>
        <button onClick={handlePrint} className="print-button">طباعة التقرير</button>
      </div>
      {/* Table Container */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>جاري التحميل...</p>
          </div>
        ) : feesData.length === 0 ? (
          <div className="empty-state">
            <FiDollarSign className="empty-icon" />
            <p>لا توجد رسوم متاحة</p>
          </div>
        ) : (
          <>
            <table className="fees-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>نوع الخدمة</th>
                  <th>عنوان الخدمة</th>
                  <th>اسم العميل</th>
                  <th>قيمة الرسوم</th>
                </tr>
              </thead>
              <tbody>
                {feesData.map((fee, index) => (
                  <tr key={`${fee.service_type}-${fee.id}`}>
                    <td data-label="التاريخ">{formatDate(fee.date)}</td>
                    <td data-label="نوع الخدمة">
                      <div className="service-type-cell">
                        {getServiceIcon(fee.service_type)}
                        <span>{fee.type}</span>
                      </div>
                    </td>
                    <td data-label="عنوان الخدمة">
                      <a 
                        href={getServiceRoute(fee.service_type, fee.service_id)}
                        className="service-title-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {fee.title}
                      </a>
                    </td>
                    <td data-label="اسم العميل">{fee.client_name}</td>
                    <td data-label="قيمة الرسوم" className="amount-cell">
                      {fee.service_type === 'consultation' ? (
                        <div className="fee-display">
                          <span className="fee-label">رسوم الاستشارة:</span>
                          <span className="fee-value">
                            {fee.fees.toFixed(2)} {getCurrencyText('IQD')}
                          </span>
                        </div>
                      ) : fee.service_type === 'contract_review' ? (
                        <div className="fee-display">
                          <span className="fee-label">رسوم المراجعة:</span>
                          <span className="fee-value">
                            {fee.fees.toFixed(2)} {getCurrencyText('IQD')}
                          </span>
                        </div>
                      ) : fee.service_type === 'document_review' ? (
                        <div className="fee-display">
                          <span className="fee-label">رسوم المراجعة:</span>
                          <span className="fee-value">
                            {fee.fees.toFixed(2)} {getCurrencyText('IQD')}
                          </span>
                        </div>
                      ) : (
                        <span>{fee.fees.toFixed(2)} {getCurrencyText('IQD')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td colSpan="4" style={{ textAlign: 'center', fontWeight: '700' }}>
                    الإجمالي
                  </td>
                  <td className="amount-cell" style={{ fontWeight: '700', fontSize: '1rem' }}>
                    {totalFees.toFixed(2)} {getCurrencyText('IQD')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </div>

      <style jsx>{`
        .legal-services-fees-container {
          width: 100%;
          direction: rtl;
          font-family: 'Almarai', 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .fees-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 20px 24px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
          border: 1px solid #e5e7eb;
        }

        .fees-header h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .print-button {
          padding: 12px 24px;
          background: #10b981;
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
          background: #059669;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }


        /* Table Container */
        .table-container {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }

        .fees-table {
          width: 100%;
          border-collapse: collapse;
        }

        .fees-table thead {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-bottom: 2px solid #e5e7eb;
        }

        .fees-table th {
          padding: 18px 24px;
          text-align: right;
          font-weight: 700;
          color: #1f2937;
          font-size: 0.9375rem;
          white-space: nowrap;
          letter-spacing: -0.01em;
          font-family: 'Almarai', 'Cairo', sans-serif;
        }

        .fees-table td {
          padding: 16px 24px;
          text-align: right;
          border-bottom: 1px solid #f3f4f6;
          color: #374151;
          font-size: 0.9375rem;
          line-height: 1.6;
          font-weight: 400;
          font-family: 'Almarai', 'Cairo', sans-serif;
        }

        .fees-table tbody tr {
          background-color: #ffffff;
          transition: background-color 0.15s ease;
        }

        .fees-table tbody tr:hover {
          background-color: #f9fafb;
        }

        .fees-table tbody tr:nth-child(even) {
          background-color: #fafbfc;
        }

        .fees-table tbody tr:nth-child(even):hover {
          background-color: #f3f4f6;
        }

        .fees-table tbody tr:last-child td {
          border-bottom: none;
        }

        .service-type-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .service-title-link {
          color: #2563EB;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .service-title-link:hover {
          color: #1e40af;
          text-decoration: underline;
        }

        .amount-cell {
          font-weight: 600;
          color: #1f2937;
        }

        .fee-display {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: flex-end;
        }

        .fee-label {
          font-size: 0.8125rem;
          color: #64748b;
          font-weight: 500;
        }

        .fee-value {
          font-size: 0.9375rem;
          color: #1f2937;
          font-weight: 700;
        }

        .total-row {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%) !important;
          border-top: 3px solid #1e40af;
        }

        .total-row td {
          font-weight: 700;
          color: #1e40af;
          padding: 18px 24px;
        }

        /* Loading & Empty States */
        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          text-align: center;
          gap: 16px;
          color: #9ca3af;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e8eaed;
          border-top-color: #2563EB;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-icon {
          width: 48px;
          height: 48px;
          color: #cbd5e1;
          opacity: 0.5;
        }

        .loading-state p, .empty-state p {
          margin: 0;
          font-size: 1rem;
          font-weight: 500;
          color: #6b7280;
          font-family: 'Almarai', 'Cairo', sans-serif;
        }

        @media (max-width: 768px) {
          .table-container {
            border-radius: 0;
            box-shadow: none;
            border: none;
            overflow: visible;
            background: transparent;
          }

          .fees-table {
            display: block;
          }

          .fees-table thead {
            display: none;
          }

          .fees-table tbody {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .fees-table tfoot {
            display: block;
            margin-top: 12px;
          }

          .fees-table tfoot tr {
            display: flex;
            justify-content: space-between;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px 14px;
          }

          .fees-table tfoot td {
            border: none;
            padding: 0;
          }

          .fees-table tfoot td[colspan] {
            flex: 1;
          }

          .fees-table tr {
            display: flex;
            flex-direction: column;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          }

          .fees-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 7px 0;
            border-bottom: 1px solid #f3f4f6;
            font-size: 14px;
            white-space: normal;
          }

          .fees-table td:last-child {
            border-bottom: none;
          }

          .fees-table td::before {
            content: attr(data-label);
            font-size: 13px;
            font-weight: 700;
            color: #6b7280;
            flex-shrink: 0;
            margin-left: 12px;
            font-family: 'Cairo', 'Almarai', sans-serif;
          }
        }
      `}</style>
    </div>
  );
};

export default LegalServicesFees;

